"""
Ailane PDF Text Extractor — Phase 1 (FREE)
============================================
Downloads tribunal PDFs from GOV.UK, extracts text via pdfplumber,
and caches the result in tribunal_decisions.pdf_extracted_text.

Uses pdf_extraction_status column to track state:
  - pending:            not yet attempted (queue source)
  - complete:           text successfully extracted
  - permanently_failed: PDF confirmed unavailable (404/410), never retry
  - no_pdf:             no PDF URL exists for this decision

Zero Anthropic API cost. Run this BEFORE deep_enrichment_scraper.py.

Usage:
  python pdf_text_extractor.py --limit 100
  python pdf_text_extractor.py --continuous
  python pdf_text_extractor.py --batch-size 50 --limit 500
"""

import os, sys, time, argparse, requests, logging, io
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(stream=sys.stdout),
        logging.FileHandler('logs/pdf_text_extractor.log')
    ]
)
log = logging.getLogger(__name__)

# Force UTF-8 on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Config
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://cnbsxwtvazfvzmltkuvx.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_KEY:
    raise SystemExit("ERROR: SUPABASE_SERVICE_KEY not set in .env")

HEADERS = {'User-Agent': 'Ailane-PDFExtractor/1.0 (regulatory-intelligence; contact@ailane.ai)'}
SB = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

# Supabase helpers
def sb_get(path, params=None):
    r = requests.get(f'{SUPABASE_URL}/rest/v1/{path}', headers=SB, params=params)
    r.raise_for_status()
    return r.json()

def sb_patch(table, filter_params, data):
    h = {**SB, 'Prefer': 'return=minimal'}
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/{table}',
        headers=h,
        params=filter_params,
        json=data
    )
    r.raise_for_status()

# PDF download and extraction
def download_with_retry(url, max_retries=3):
    """Download with exponential backoff on transient errors."""
    for attempt in range(max_retries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=30, stream=True)
            r.raise_for_status()
            if int(r.headers.get('Content-Length', 0)) > 15 * 1024 * 1024:
                log.warning(f"PDF too large (>15MB): {url}")
                return None
            return r.content
        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout,
                requests.exceptions.ReadTimeout) as e:
            if attempt == max_retries - 1:
                raise
            wait = 5 * (attempt + 1)
            log.warning(f"Network error, retry {attempt+1}/{max_retries} in {wait}s: {e}")
            time.sleep(wait)
        except requests.exceptions.HTTPError:
            raise  # Don't retry HTTP errors (404/410 handled by caller)

def extract_text(pdf_bytes):
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            parts = [p.extract_text() for p in pdf.pages[:30] if p.extract_text()]
            return '\n'.join(parts) if parts else None
    except ImportError:
        raise SystemExit("Run: pip install pdfplumber")
    except Exception as e:
        log.warning(f"PDF extraction failed: {e}")
        try:
            return pdf_bytes.decode('utf-8', errors='ignore')
        except Exception:
            return None

# Status update helpers
def mark_permanently_failed(decision_id, reason):
    """Mark a decision's PDF as permanently unavailable."""
    sb_patch('tribunal_decisions', {'id': f'eq.{decision_id}'}, {
        'pdf_extraction_status': 'permanently_failed',
        'metadata': {'pdf_failure_reason': reason, 'failed_at': datetime.now(timezone.utc).isoformat()}
    })

def mark_complete(decision_id, extracted_text):
    """Store extracted text and mark as complete."""
    sb_patch('tribunal_decisions', {'id': f'eq.{decision_id}'}, {
        'pdf_extracted_text': extracted_text,
        'pdf_text_extracted_at': datetime.now(timezone.utc).isoformat(),
        'pdf_extraction_status': 'complete'
    })

# Queue query — paginated, uses pdf_extraction_status
def get_pending(offset=0, limit=1000):
    """Fetch decisions needing text extraction, excluding permanent failures."""
    return sb_get('tribunal_decisions', {
        'select': 'id,title,pdf_urls',
        'pdf_extraction_status': 'eq.pending',
        'pdf_urls': 'not.is.null',
        'order': 'scraped_at.desc',
        'offset': offset,
        'limit': limit
    })

def get_all_pending(limit=None):
    """Fetch ALL pending records using offset pagination."""
    all_records = []
    offset = 0
    batch_size = 1000
    while True:
        batch = get_pending(offset=offset, limit=batch_size)
        if not batch:
            break
        all_records.extend(batch)
        if limit and len(all_records) >= limit:
            all_records = all_records[:limit]
            break
        if len(batch) < batch_size:
            break
        offset += batch_size
        log.info(f"Pagination: fetched {len(all_records)} total (offset {offset})")
    return all_records

def process_batch(decisions):
    stats = {'processed': 0, 'complete': 0, 'failed': 0, 'permanently_failed': 0, 'skipped': 0}
    total = len(decisions)
    for i, dec in enumerate(decisions):
        did = dec['id']
        title = (dec.get('title') or '')[:60]

        pdf_urls = dec.get('pdf_urls') or []
        pdf_url = pdf_urls[0] if pdf_urls else None
        if not pdf_url:
            stats['skipped'] += 1
            log.warning(f"  [SKIP] [{i+1}/{total}] No PDF URL: {title}")
            continue

        stats['processed'] += 1

        try:
            pdf_bytes = download_with_retry(pdf_url)
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response else None
            if status_code in (404, 410):
                mark_permanently_failed(did, f"HTTP {status_code}: PDF removed from GOV.UK")
                log.info(f"  [PERM_FAIL] [{i+1}/{total}] HTTP {status_code}: {title}")
                stats['permanently_failed'] += 1
            else:
                log.warning(f"  [FAIL] [{i+1}/{total}] HTTP {status_code}: {title}")
                stats['failed'] += 1
            continue
        except Exception as e:
            log.warning(f"  [FAIL] [{i+1}/{total}] Download error: {title} - {e}")
            stats['failed'] += 1
            continue

        if not pdf_bytes:
            stats['failed'] += 1
            log.warning(f"  [FAIL] [{i+1}/{total}] Download returned empty: {title}")
            continue

        text = extract_text(pdf_bytes)
        if not text or len(text.strip()) < 100:
            stats['failed'] += 1
            log.warning(f"  [FAIL] [{i+1}/{total}] Insufficient text: {title}")
            continue

        try:
            mark_complete(did, text)
            stats['complete'] += 1
            log.info(f"  [OK] [{i+1}/{total}] {len(text):,} chars | {title}")
        except Exception as e:
            stats['failed'] += 1
            log.error(f"  [FAIL] [{i+1}/{total}] DB write error: {e}")

        time.sleep(1)  # Rate limit: 1s between PDF downloads

    return stats

def log_scraper_run(stats, start_time, end_time):
    """Write completion record to scraper_runs."""
    elapsed = (end_time - start_time).total_seconds()
    try:
        requests.post(
            f'{SUPABASE_URL}/rest/v1/scraper_runs',
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            json={
                'scraper_name': 'pdf-text-extractor',
                'started_at': start_time.isoformat(),
                'completed_at': end_time.isoformat(),
                'status': 'completed',
                'records_collected': stats.get('processed', 0),
                'records_inserted': stats.get('complete', 0),
                'records_skipped': stats.get('permanently_failed', 0) + stats.get('skipped', 0),
                'records_failed': stats.get('failed', 0),
                'elapsed_seconds': elapsed,
                'metadata': stats
            }
        )
        log.info(f"Scraper run logged (elapsed: {elapsed:.1f}s)")
    except Exception as e:
        log.error(f"[FAIL] Could not log scraper run: {e}")

def cmd_run(limit, batch_size, continuous):
    start_time = datetime.now(timezone.utc)
    total_stats = {'processed': 0, 'complete': 0, 'failed': 0, 'permanently_failed': 0, 'skipped': 0}

    if continuous:
        log.info("Continuous mode. Ctrl+C to stop.")
        rnd = 0
        while True:
            rnd += 1
            log.info(f"\n-- Round {rnd} --")
            pending = get_all_pending(limit=batch_size)
            if not pending:
                log.info("All decisions have extracted text. Pipeline complete.")
                break
            log.info(f"Processing {len(pending)} decisions...")
            stats = process_batch(pending)
            for k in total_stats:
                total_stats[k] += stats.get(k, 0)
            log.info(f"Round {rnd} done - {stats['complete']} [OK], {stats['failed']} [FAIL], "
                     f"{stats['permanently_failed']} [PERM_FAIL]")
            time.sleep(3)
    else:
        pending = get_all_pending(limit=limit)
        if not pending:
            log.info("No pending decisions found.")
            end_time = datetime.now(timezone.utc)
            log_scraper_run(total_stats, start_time, end_time)
            return
        # Process in batches
        for start in range(0, len(pending), batch_size):
            batch = pending[start:start + batch_size]
            log.info(f"Batch {start//batch_size + 1}: {len(batch)} decisions...")
            stats = process_batch(batch)
            for k in total_stats:
                total_stats[k] += stats.get(k, 0)
        log.info(f"Complete - {total_stats['complete']} [OK], {total_stats['failed']} [FAIL], "
                 f"{total_stats['permanently_failed']} [PERM_FAIL]")

    end_time = datetime.now(timezone.utc)
    log_scraper_run(total_stats, start_time, end_time)

if __name__ == '__main__':
    p = argparse.ArgumentParser(description='Ailane PDF Text Extractor - Phase 1 (FREE)')
    p.add_argument('--limit',      type=int, default=1000, help='Max records to process (default: 1000)')
    p.add_argument('--batch-size', type=int, default=100,  dest='batch_size', help='Records per round (default: 100)')
    p.add_argument('--continuous', action='store_true',     help='Loop until all records have text')
    args = p.parse_args()

    cmd_run(args.limit, args.batch_size, args.continuous)
