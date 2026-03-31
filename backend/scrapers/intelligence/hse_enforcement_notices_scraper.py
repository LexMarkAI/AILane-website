#!/usr/bin/env python3
"""
HSE Enforcement Notices Scraper — Ailane Intelligence Pipeline
Scrapes improvement and prohibition notices from resources.hse.gov.uk/notices/
and upserts to public.hse_enforcement_notices
"""

import os
import sys
import re
import time
import hashlib
import argparse
import logging
from datetime import datetime, timezone
from urllib.parse import urljoin, urlencode
from dotenv import load_dotenv

# Windows console encoding fix
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

load_dotenv()

import requests
from bs4 import BeautifulSoup

# Supabase service role client
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://cnbsxwtvazfvzmltkuvx.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_KEY:
    raise SystemExit("ERROR: SUPABASE_SERVICE_KEY not set in .env")

SB_HEADERS = {
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

HTTP_HEADERS = {
    'User-Agent': 'AilaneIntelligencePipeline/1.0 (+https://ailane.ai)'
}

RATE_LIMIT_SECONDS = 1.5
NOTICES_BASE = 'https://resources.hse.gov.uk/notices/'
NOTICES_LIST_URL = 'https://resources.hse.gov.uk/notices/notices/notice_list.asp'
NOTICES_DETAIL_URL = 'https://resources.hse.gov.uk/notices/notices/notice_detail.asp'

# Sort-control text patterns (same ASP system as HSE convictions)
SORT_CONTROL_PATTERNS = [
    r'\(ascending',
    r'\(descending',
    r'a to z\)',
    r'z to a\)',
    r'sort by',
    r'order by',
]

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(stream=sys.stdout)]
)
log = logging.getLogger(__name__)


# --- HTTP helpers ---

def fetch_with_retry(url, max_retries=3, params=None, method='get'):
    """Fetch URL with retry on transient errors."""
    for attempt in range(max_retries):
        try:
            if method == 'post':
                r = requests.post(url, headers=HTTP_HEADERS, data=params, timeout=30)
            else:
                r = requests.get(url, headers=HTTP_HEADERS, params=params, timeout=30)
            r.raise_for_status()
            return r
        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout) as e:
            if attempt == max_retries - 1:
                raise
            wait = 5 * (attempt + 1)
            log.warning(f"Network error, retry {attempt+1}/{max_retries} in {wait}s: {e}")
            time.sleep(wait)
        except requests.exceptions.HTTPError:
            raise


def sb_upsert(table, data):
    """Upsert a record to Supabase."""
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/{table}',
        headers=SB_HEADERS,
        json=data
    )
    r.raise_for_status()


def content_hash(text):
    """SHA-256 hash of content for dedup."""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


# --- Parsing helpers ---

def is_sort_control_text(text):
    """Check if text is an ASP sort control string."""
    if not text:
        return True
    text_lower = text.strip().lower()
    for pattern in SORT_CONTROL_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    return False


def parse_date(date_str):
    """Parse various date formats, return ISO date string or None."""
    if not date_str:
        return None
    for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d %B %Y', '%d %b %Y', '%d-%m-%Y', '%B %d, %Y']:
        try:
            return datetime.strptime(date_str.strip()[:30], fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    m = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
    if m:
        return m.group(1)
    return None


def parse_money(text):
    """Extract numeric money value from text."""
    if not text:
        return None
    cleaned = re.sub(r'[^0-9.]', '', text.replace(',', ''))
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def classify_notice_type(text):
    """Classify notice as improvement or prohibition."""
    if not text:
        return 'unknown'
    text_lower = text.lower()
    if 'prohibition' in text_lower:
        return 'prohibition'
    elif 'improvement' in text_lower:
        return 'improvement'
    elif 'deferred' in text_lower:
        return 'deferred_prohibition'
    return 'unknown'


# --- Notice list parsing ---

def parse_notice_list(html):
    """Parse notice_list.asp and extract notice entries."""
    soup = BeautifulSoup(html, 'html.parser')
    notices = []

    # Find the data table (same pattern as HSE convictions ASP)
    tables = soup.select('table')
    data_table = None
    for table in tables:
        rows = table.select('tr')
        for row in rows:
            links = row.select('a[href*="notice_detail"]')
            if links:
                data_table = table
                break
        if data_table:
            break

    if not data_table:
        data_table = soup

    rows = data_table.select('tr') if data_table else []

    header_cells = []
    for row in rows:
        ths = row.select('th')
        if ths:
            header_cells = [th.get_text(strip=True).lower() for th in ths]
            continue

        cells = row.select('td')
        if not cells or len(cells) < 2:
            continue

        notice = {}
        detail_link = None

        # Look for notice detail link
        for cell in cells:
            link = cell.select_one('a[href*="notice_detail"]')
            if link:
                href = link.get('href', '')
                detail_link = urljoin(NOTICES_LIST_URL, href)
                # Extract notice ID
                id_match = re.search(r'ID=(\d+)', href, re.IGNORECASE)
                if id_match:
                    notice['notice_id'] = id_match.group(1)
                break

        if not detail_link:
            continue

        notice['detail_url'] = detail_link

        # Map cells by headers or position
        for i, cell in enumerate(cells):
            text = cell.get_text(strip=True)
            if not text:
                continue

            col_name = header_cells[i] if i < len(header_cells) else f'col_{i}'

            if is_sort_control_text(text):
                continue

            if 'notice' in col_name and 'type' in col_name:
                notice['notice_type'] = classify_notice_type(text)
            elif 'recipient' in col_name or 'name' in col_name or i == 0:
                notice['recipient_name'] = text
            elif 'date' in col_name:
                notice['date_str'] = text
            elif 'type' in col_name:
                notice['notice_type'] = classify_notice_type(text)
            elif 'region' in col_name or 'authority' in col_name:
                notice['region'] = text

        if notice.get('recipient_name') and not is_sort_control_text(notice['recipient_name']):
            notices.append(notice)

    # Find next page link
    next_link = None
    for a in soup.select('a'):
        href = a.get('href', '')
        text = a.get_text(strip=True).lower()
        if ('next' in text or '>>' in text or '>' == text.strip()) and 'notice_list' in href:
            next_link = urljoin(NOTICES_LIST_URL, href)
            break

    return notices, next_link


# --- Notice detail parsing ---

def parse_notice_detail(html, url, notice_id):
    """Parse notice_detail.asp and extract all fields."""
    soup = BeautifulSoup(html, 'html.parser')
    data = {}

    # Parse table rows (label/value pairs)
    for row in soup.select('tr'):
        cells = row.select('td, th')
        if len(cells) >= 2:
            label = cells[0].get_text(strip=True).lower()
            value = cells[1].get_text(strip=True)
            if value and not is_sort_control_text(value):
                map_notice_field(data, label, value)

    # Also try definition lists
    for dt in soup.select('dt'):
        dd = dt.find_next_sibling('dd')
        if dd:
            label = dt.get_text(strip=True).lower()
            value = dd.get_text(strip=True)
            if value and not is_sort_control_text(value):
                map_notice_field(data, label, value)

    # Try strong/b label patterns
    for strong in soup.select('strong, b'):
        label = strong.get_text(strip=True).lower().rstrip(':')
        next_text = strong.next_sibling
        if next_text and isinstance(next_text, str):
            value = next_text.strip().lstrip(':').strip()
            if value and not is_sort_control_text(value):
                map_notice_field(data, label, value)

    # Fallback regex from full text
    full_text = soup.get_text(separator='\n', strip=True)
    if not data.get('recipient_name'):
        m = re.search(r'recipient[:\s]+(.+)', full_text, re.IGNORECASE)
        if m:
            name = m.group(1).strip()[:200]
            if not is_sort_control_text(name):
                data['recipient_name'] = name

    data['content_hash'] = content_hash(full_text)

    return data


def map_notice_field(data, label, value):
    """Map a label-value pair to structured notice fields."""
    if not value or value.lower() in ('n/a', '-', ''):
        return

    if 'recipient' in label or 'name' in label and 'notice' not in label:
        data['recipient_name'] = value[:200]
    elif 'address' in label:
        data['recipient_address'] = value[:500]
    elif 'notice' in label and 'type' in label:
        data['notice_type'] = classify_notice_type(value)
    elif 'notice' in label and ('number' in label or 'ref' in label):
        data['notice_reference'] = value[:100]
    elif 'date' in label and ('issue' in label or 'served' in label):
        data['date_issued'] = parse_date(value)
    elif 'date' in label:
        if 'date_issued' not in data:
            data['date_issued'] = parse_date(value)
    elif 'local authority' in label:
        data['local_authority'] = value[:200]
    elif 'region' in label:
        data['region'] = value[:200]
    elif 'sic' in label:
        data['sic_code'] = value[:10]
    elif 'sector' in label or 'industry' in label:
        data['sector'] = value[:200]
    elif 'legislation' in label or 'act' in label or 'regulation' in label:
        data['legislation_breached'] = value[:500]
    elif 'description' in label or 'detail' in label or 'matter' in label:
        data['description'] = value[:5000]
    elif 'outcome' in label or 'result' in label or 'status' in label:
        data['outcome'] = value[:200]
    elif 'fine' in label or 'penalty' in label:
        data['fine_amount'] = parse_money(value)


# --- Main scraping logic ---

def build_all_notices_url(recent_only=False):
    """Build the URL for fetching all notices or recent notices."""
    # The HSE notices register uses similar ASP to convictions
    # Use a broad search to get all notices sorted by date
    params = {
        'ST': 'N',       # Search type: notices
        'SN': 'F',       # Sort newest first
        'SF': 'DN',      # Sort field: date
    }
    if recent_only:
        # Add date filter for last 12 months
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=365)).strftime('%d/%m/%Y')
        params['EO'] = '>'
        params['SV'] = cutoff

    return f"{NOTICES_LIST_URL}?{urlencode(params)}"


def scrape_notices(scrape_all=False, recent_only=False, limit=None):
    """Scrape HSE enforcement notices."""
    records = []

    # Try direct entry URL first
    if scrape_all:
        entry_url = f"{NOTICES_LIST_URL}?ST=N&SN=F&SF=DN"
    elif recent_only:
        entry_url = build_all_notices_url(recent_only=True)
    else:
        entry_url = f"{NOTICES_LIST_URL}?ST=N&SN=F&SF=DN"

    log.info(f"Fetching HSE enforcement notices from: {entry_url}")

    try:
        resp = fetch_with_retry(entry_url)
    except Exception as e:
        log.error(f"[FAIL] Could not fetch notices list: {e}")
        return records

    page_num = 0
    page_url = None

    while True:
        page_num += 1

        if page_url:
            time.sleep(2)
            try:
                resp = fetch_with_retry(page_url)
            except Exception as e:
                log.error(f"[FAIL] Could not fetch page {page_num}: {e}")
                break

        notices, next_link = parse_notice_list(resp.text)
        log.info(f"  Page {page_num}: found {len(notices)} notices")

        if not notices:
            if page_num == 1:
                log.warning("No notices found on first page — check URL/HTML structure")
            break

        stop_paging = False
        for notice in notices:
            if limit and len(records) >= limit:
                stop_paging = True
                break

            notice_id = notice.get('notice_id', '')
            detail_url = notice.get('detail_url')

            # Fetch detail page
            detail = {}
            if detail_url:
                time.sleep(RATE_LIMIT_SECONDS)
                try:
                    detail_resp = fetch_with_retry(detail_url)
                    detail = parse_notice_detail(detail_resp.text, detail_url, notice_id)
                except requests.exceptions.HTTPError as e:
                    status = e.response.status_code if e.response else None
                    if status in (404, 410):
                        log.warning(f"  [SKIP] Notice page gone ({status}): ID={notice_id}")
                    else:
                        log.warning(f"  [FAIL] HTTP {status} on notice ID={notice_id}")
                    continue
                except Exception as e:
                    log.warning(f"  [FAIL] Error fetching notice ID={notice_id}: {e}")
                    continue

            # Merge listing + detail
            recipient_name = detail.get('recipient_name') or notice.get('recipient_name', 'Unknown')
            if is_sort_control_text(recipient_name):
                continue

            notice_type = detail.get('notice_type') or notice.get('notice_type', 'unknown')
            date_issued = detail.get('date_issued') or parse_date(notice.get('date_str', ''))
            notice_ref = detail.get('notice_reference', '')

            # Build source identifier
            if notice_ref:
                source_id = f"HSE-NOTICE-{notice_ref}"
            elif notice_id:
                source_id = f"HSE-NOTICE-{notice_id}"
            else:
                slug = re.sub(r'[^\w]', '-', recipient_name.lower().strip())[:60]
                source_id = f"HSE-NOTICE-{slug}-{date_issued or 'unknown'}"

            record = {
                'source_identifier': source_id,
                'notice_type': notice_type,
                'date_issued': date_issued,
                'recipient_name': recipient_name,
                'recipient_address': detail.get('recipient_address'),
                'local_authority': detail.get('local_authority'),
                'region': detail.get('region') or notice.get('region'),
                'sic_code': detail.get('sic_code'),
                'sector': detail.get('sector'),
                'legislation_breached': detail.get('legislation_breached'),
                'description': detail.get('description'),
                'outcome': detail.get('outcome'),
                'fine_amount': detail.get('fine_amount'),
                'acei_category': 'health_safety',
                'acei_category_number': 10,
                'source_url': detail_url or entry_url,
                'content_hash': detail.get('content_hash'),
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'metadata': {
                    'notice_id': notice_id,
                    'page_number': page_num,
                },
                'processing_status': 'scraped',
                'jurisdiction_code': 'GB',
            }

            records.append(record)
            log.info(f"  [OK] [{len(records)}] {recipient_name[:40]} | "
                     f"type={notice_type} | date={date_issued or '?'}")

        if stop_paging:
            break

        if next_link:
            page_url = next_link
        else:
            # Try manual PN= increment (ASP pagination pattern)
            current_url = page_url or entry_url
            pn_match = re.search(r'PN=(\d+)', current_url, re.IGNORECASE)
            if pn_match:
                current_pn = int(pn_match.group(1))
                next_pn = current_pn + 1
                page_url = re.sub(r'PN=\d+', f'PN={next_pn}', current_url, flags=re.IGNORECASE)
            elif notices:
                separator = '&' if '?' in entry_url else '?'
                page_url = f"{entry_url}{separator}PN=2"
            else:
                break

    return records


def save_records(records):
    """Upsert records to Supabase."""
    inserted = 0
    failed = 0
    for record in records:
        try:
            sb_upsert('hse_enforcement_notices', record)
            inserted += 1
        except Exception as e:
            failed += 1
            log.error(f"  [FAIL] DB write error for {record.get('source_identifier', '?')}: {e}")
    return inserted, failed


def log_scraper_run(stats, start_time, end_time):
    """Write completion record to scraper_runs."""
    elapsed = (end_time - start_time).total_seconds()
    try:
        requests.post(
            f'{SUPABASE_URL}/rest/v1/scraper_runs',
            headers={
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            json={
                'scraper_name': 'hse-enforcement-notices',
                'source_name': 'HSE Enforcement Notices',
                'started_at': start_time.isoformat(),
                'completed_at': end_time.isoformat(),
                'status': 'completed' if stats.get('failed', 0) == 0 else 'completed_with_errors',
                'records_collected': stats.get('collected', 0),
                'records_inserted': stats.get('inserted', 0),
                'records_skipped': stats.get('skipped', 0),
                'records_failed': stats.get('failed', 0),
                'elapsed_seconds': elapsed,
                'metadata': stats
            }
        )
        log.info(f"Scraper run logged to scraper_runs (elapsed: {elapsed:.1f}s)")
    except Exception as e:
        log.error(f"[FAIL] Could not log scraper run: {e}")


# --- CLI ---

def main():
    p = argparse.ArgumentParser(description='Ailane HSE Enforcement Notices Scraper')
    p.add_argument('--all', action='store_true', help='Scrape all available notices')
    p.add_argument('--recent', action='store_true', help='Last 12 months only')
    p.add_argument('--limit', type=int, default=None, help='Max notices to process')
    args = p.parse_args()

    log.info("=" * 60)
    log.info("AILANE HSE ENFORCEMENT NOTICES SCRAPER")
    if args.recent:
        log.info("  Mode: recent (last 12 months)")
    elif args.all:
        log.info("  Mode: all notices")
    else:
        log.info("  Mode: default (all)")
    if args.limit:
        log.info(f"  Limit: {args.limit}")
    log.info("=" * 60)

    start_time = datetime.now(timezone.utc)

    try:
        records = scrape_notices(
            scrape_all=args.all or not args.recent,
            recent_only=args.recent,
            limit=args.limit
        )

        log.info(f"Scraped {len(records)} notices. Saving to database...")
        inserted, failed = save_records(records)

        improvement_count = sum(1 for r in records if r.get('notice_type') == 'improvement')
        prohibition_count = sum(1 for r in records if r.get('notice_type') == 'prohibition')

        stats = {
            'collected': len(records),
            'inserted': inserted,
            'failed': failed,
            'skipped': 0,
            'improvement_notices': improvement_count,
            'prohibition_notices': prohibition_count,
        }

        log.info(f"Complete - {inserted} [OK], {failed} [FAIL], "
                 f"{improvement_count} improvement, {prohibition_count} prohibition")

    except Exception as e:
        log.error(f"[FAIL] Scraper error: {e}")
        stats = {'collected': 0, 'inserted': 0, 'failed': 1, 'skipped': 0, 'error': str(e)}

    end_time = datetime.now(timezone.utc)
    log_scraper_run(stats, start_time, end_time)


if __name__ == '__main__':
    main()
