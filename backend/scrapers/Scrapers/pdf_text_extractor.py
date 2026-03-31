"""
Ailane PDF Text Extractor — Phase 1 (FREE)
============================================
Downloads tribunal PDFs from GOV.UK, extracts text via pdfplumber,
and caches the result in tribunal_decisions.pdf_extracted_text.

Zero Anthropic API cost. Run this BEFORE deep_enrichment_scraper.py.

Usage:
  python pdf_text_extractor.py --limit 100
  python pdf_text_extractor.py --continuous
  python pdf_text_extractor.py --batch-size 50 --limit 500
"""

import os, time, argparse, requests, logging, io
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/pdf_text_extractor.log')
    ]
)
log = logging.getLogger(__name__)

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
def download_pdf(url, max_retries=3):
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
                log.warning(f"Download failed after {max_retries} retries {url}: {e}")
                return None
            log.warning(f"Network error downloading {url}, retry {attempt+1}/{max_retries}: {e}")
            time.sleep(5 * (attempt + 1))
        except Exception as e:
            log.warning(f"Download failed {url}: {e}")
            return None

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

# Queue query — paginated
def get_pending(limit):
    found = []
    offset = 0
    page_size = 1000
    while len(found) < limit:
        page = sb_get('tribunal_decisions', {
            'select': 'id,title,pdf_urls',
            'pdf_urls': 'not.is.null',
            'pdf_extracted_text': 'is.null',
            'order': 'decision_date.desc',
            'limit': page_size,
            'offset': offset,
        })
        if not page:
            break
        found.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return found[:limit]

def process_batch(decisions):
    ok = fail = 0
    total = len(decisions)
    for i, dec in enumerate(decisions):
        did = dec['id']
        title = (dec.get('title') or '')[:60]

        pdf_urls = dec.get('pdf_urls') or []
        pdf_url = pdf_urls[0] if pdf_urls else None
        if not pdf_url:
            fail += 1
            log.warning(f"  [FAIL] [{i+1}/{total}] No PDF URL: {title}")
            continue

        pdf_bytes = download_pdf(pdf_url)
        if not pdf_bytes:
            fail += 1
            log.warning(f"  [FAIL] [{i+1}/{total}] Download failed: {title}")
            continue

        text = extract_text(pdf_bytes)
        if not text or len(text.strip()) < 100:
            fail += 1
            log.warning(f"  [FAIL] [{i+1}/{total}] Insufficient text: {title}")
            continue

        try:
            sb_patch('tribunal_decisions', {'id': f'eq.{did}'}, {
                'pdf_extracted_text': text,
                'pdf_text_extracted_at': datetime.now(timezone.utc).isoformat(),
            })
            ok += 1
            log.info(f"  [OK] [{i+1}/{total}] {len(text):,} chars | {title}")
        except Exception as e:
            fail += 1
            log.error(f"  [FAIL] [{i+1}/{total}] DB write error: {e}")

        time.sleep(1)  # Rate limit: 1s between PDF downloads

    return ok, fail

def cmd_run(limit, batch_size, continuous):
    if continuous:
        log.info("Continuous mode. Ctrl+C to stop.")
        rnd = 0
        while True:
            rnd += 1
            log.info(f"\n-- Round {rnd} --")
            pending = get_pending(batch_size)
            if not pending:
                log.info("All decisions have extracted text. Pipeline complete.")
                break
            log.info(f"Processing {len(pending)} decisions...")
            ok, fail = process_batch(pending)
            log.info(f"Round {rnd} done - {ok} [OK], {fail} [FAIL]")
            time.sleep(3)
    else:
        pending = get_pending(limit)
        if not pending:
            log.info("No pending decisions found.")
            return
        # Process in batches
        total_ok = total_fail = 0
        for start in range(0, len(pending), batch_size):
            batch = pending[start:start + batch_size]
            log.info(f"Batch {start//batch_size + 1}: {len(batch)} decisions...")
            ok, fail = process_batch(batch)
            total_ok += ok
            total_fail += fail
        log.info(f"Complete - {total_ok} [OK], {total_fail} [FAIL]")

if __name__ == '__main__':
    p = argparse.ArgumentParser(description='Ailane PDF Text Extractor - Phase 1 (FREE)')
    p.add_argument('--limit',      type=int, default=1000, help='Max records to process (default: 1000)')
    p.add_argument('--batch-size', type=int, default=100,  dest='batch_size', help='Records per round (default: 100)')
    p.add_argument('--continuous', action='store_true',     help='Loop until all records have text')
    args = p.parse_args()

    cmd_run(args.limit, args.batch_size, args.continuous)
