"""
Ailane HSE Prosecution Register Scraper
========================================
Scrapes conviction records from the HSE Prosecution Convictions Register
at resources.hse.gov.uk and writes to hse_prosecutions.

Constitutional Authority: ACEI Art. III (EVI), Art. IV (EII), CCI Art. III

Usage:
  python hse_prosecution_scraper.py                    # Recent (last 12 months)
  python hse_prosecution_scraper.py --historical       # Full historical (1-10 years)
  python hse_prosecution_scraper.py --since 2024-01-01 # From date onwards
  python hse_prosecution_scraper.py --limit 100        # Max records to process
"""

import os, sys, re, time, argparse, hashlib, logging, requests
from datetime import datetime, timezone
from urllib.parse import urljoin, urlencode
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(stream=sys.stdout)]
)
log = logging.getLogger(__name__)

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Config
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
    'User-Agent': 'Ailane-HSEScraper/1.0 (regulatory-intelligence; contact@ailane.ai)'
}

RECENT_URL = 'https://resources.hse.gov.uk/convictions/case/case_list.asp'
HISTORICAL_URL = 'https://resources.hse.gov.uk/convictions/'

FATALITY_KEYWORDS = [
    'death', 'fatal', 'fatality', 'killed', 'died', 'deceased',
    'loss of life', 'corporate manslaughter'
]

DIRECTOR_KEYWORDS = [
    'director', 'individual', 'manager', 'officer', 'person'
]


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


# --- Parsing ---

def parse_case_list(html):
    """Parse the HSE case list page and extract conviction summaries."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    cases = []

    # HSE results are in a table
    table = soup.select_one('table.results, table.dataTable, table')
    if not table:
        # Try parsing rows directly from content
        rows = soup.select('tr')
    else:
        rows = table.select('tr')

    header_cells = []
    for row in rows:
        cells = row.select('th')
        if cells:
            header_cells = [c.get_text(strip=True).lower() for c in cells]
            continue

        cells = row.select('td')
        if not cells or len(cells) < 3:
            continue

        case = {}
        # Try to map cells to known columns
        for i, cell in enumerate(cells):
            text = cell.get_text(strip=True)
            link = cell.select_one('a')

            col_name = header_cells[i] if i < len(header_cells) else f'col_{i}'

            if 'defendant' in col_name or i == 0:
                case['defendant_name'] = text
                if link:
                    case['detail_url'] = urljoin(RECENT_URL, link.get('href', ''))
            elif 'date' in col_name and 'offence' in col_name:
                case['date_of_offence_str'] = text
            elif 'date' in col_name and 'convict' in col_name:
                case['date_of_conviction_str'] = text
            elif 'date' in col_name:
                # Generic date - assign to conviction if empty
                if 'date_of_conviction_str' not in case:
                    case['date_of_conviction_str'] = text
            elif 'offence' in col_name or 'description' in col_name:
                case['offence_description'] = text
            elif 'court' in col_name:
                case['court_name'] = text
            elif 'fine' in col_name or 'penalty' in col_name:
                case['fine_str'] = text
            elif 'cost' in col_name:
                case['costs_str'] = text

        if case.get('defendant_name'):
            cases.append(case)

    # Find next page link
    next_link = None
    for a in soup.select('a'):
        text = a.get_text(strip=True).lower()
        if 'next' in text or '>' == text.strip():
            next_link = urljoin(RECENT_URL, a.get('href', ''))
            break

    return cases, next_link


def parse_case_detail(html, url):
    """Parse an individual HSE case detail page."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    data = {}

    # Extract from table rows or definition lists
    for row in soup.select('tr, dl dt'):
        if row.name == 'tr':
            cells = row.select('td, th')
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True).lower()
                value = cells[1].get_text(strip=True)
                map_detail_field(data, label, value)
        elif row.name == 'dt':
            dd = row.find_next_sibling('dd')
            if dd:
                label = row.get_text(strip=True).lower()
                value = dd.get_text(strip=True)
                map_detail_field(data, label, value)

    # Also try parsing from content paragraphs
    content = soup.get_text(separator='\n', strip=True)
    if not data.get('defendant_name'):
        m = re.search(r'defendant[:\s]+(.+)', content, re.IGNORECASE)
        if m:
            data['defendant_name'] = m.group(1).strip()[:200]

    data['content_hash'] = hashlib.sha256(content.encode()).hexdigest()

    return data


def map_detail_field(data, label, value):
    """Map a label-value pair from case detail page to structured fields."""
    if not value or value.lower() in ('n/a', '-', ''):
        return

    if 'defendant' in label and 'type' not in label:
        data['defendant_name'] = value[:200]
    elif 'defendant' in label and 'type' in label:
        data['defendant_type'] = classify_defendant_type(value)
    elif 'offence date' in label or 'date of offence' in label:
        data['date_of_offence'] = parse_date(value)
    elif 'conviction date' in label or 'date of conviction' in label:
        data['date_of_conviction'] = parse_date(value)
    elif 'court' in label:
        data['court_name'] = value[:200]
    elif 'offence' in label or 'description' in label:
        data['offence_description'] = value[:2000]
    elif 'legislation' in label or 'act' in label or 'regulation' in label:
        data['legislation_breached'] = value[:500]
    elif 'fine' in label:
        data['fine_amount'] = parse_money(value)
    elif 'cost' in label:
        data['costs_amount'] = parse_money(value)
    elif 'custodial' in label or 'prison' in label or 'sentence' in label:
        data['custodial_sentence'] = value[:200]
        if 'suspend' in value.lower():
            data['custodial_suspended'] = True
    elif 'sic' in label:
        data['sic_code'] = value[:10]
    elif 'sector' in label or 'industry' in label:
        data['sector'] = value[:200]
    elif 'local authority' in label or 'region' in label:
        data['local_authority'] = value[:200]
    elif 'case' in label and 'ref' in label:
        data['case_reference'] = value[:100]
    elif 'outcome' in label or 'result' in label:
        data['outcome'] = value[:500]


def classify_defendant_type(text):
    """Classify defendant as company or individual/director."""
    text_lower = text.lower()
    for kw in DIRECTOR_KEYWORDS:
        if kw in text_lower:
            return 'individual'
    if any(w in text_lower for w in ['company', 'ltd', 'limited', 'plc', 'llp', 'corporation', 'organisation']):
        return 'company'
    return text[:50]


def check_fatality(text):
    """Check if offence description indicates a fatality."""
    if not text:
        return False
    text_lower = text.lower()
    return any(kw in text_lower for kw in FATALITY_KEYWORDS)


def parse_money(text):
    """Extract numeric money value from text."""
    if not text:
        return None
    # Remove currency symbols and commas
    cleaned = re.sub(r'[^0-9.]', '', text.replace(',', ''))
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


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


def slugify(text):
    """Convert text to URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return text[:80]


# --- Main scraping logic ---

def build_search_params(historical=False):
    """Build search parameters for the HSE conviction database."""
    params = {
        'ST': 'C',       # Search type: convictions
        'EO': 'LIKE',    # Operator
        'SN': 'F',       # Sort: newest first
        'SF': 'DN',      # Sort field: date
    }
    return params


def scrape_convictions(historical=False, limit=None, since_date=None):
    """Scrape HSE conviction records."""
    records = []
    base_url = HISTORICAL_URL if historical else RECENT_URL
    params = build_search_params(historical)

    log.info(f"Fetching HSE convictions from: {base_url}")

    try:
        resp = fetch_with_retry(base_url, params=params)
    except Exception as e:
        log.error(f"[FAIL] Could not fetch HSE search results: {e}")
        return records

    page_num = 0
    page_url = None  # First page already fetched

    while True:
        page_num += 1

        if page_url:
            time.sleep(2)  # Rate limit: 2s between pages
            try:
                resp = fetch_with_retry(page_url)
            except Exception as e:
                log.error(f"[FAIL] Could not fetch page {page_num}: {e}")
                break

        cases, next_link = parse_case_list(resp.text)
        log.info(f"  Page {page_num}: found {len(cases)} cases")

        if not cases:
            break

        stop_paging = False
        for case in cases:
            if limit and len(records) >= limit:
                stop_paging = True
                break

            # Parse conviction date
            conv_date = parse_date(case.get('date_of_conviction_str', ''))
            offence_date = parse_date(case.get('date_of_offence_str', ''))

            # Check since_date filter
            if since_date and conv_date:
                if conv_date < since_date:
                    stop_paging = True
                    break

            # Fetch detail page if available
            detail_url = case.get('detail_url')
            detail = {}
            if detail_url:
                time.sleep(2)  # Rate limit
                try:
                    detail_resp = fetch_with_retry(detail_url)
                    detail = parse_case_detail(detail_resp.text, detail_url)
                except requests.exceptions.HTTPError as e:
                    status = e.response.status_code if e.response else None
                    if status in (404, 410):
                        log.warning(f"  [SKIP] Case detail page gone ({status})")
                    else:
                        log.warning(f"  [FAIL] HTTP {status} on case detail")
                except Exception as e:
                    log.warning(f"  [FAIL] Error fetching case detail: {e}")

            # Merge listing + detail data
            defendant_name = detail.get('defendant_name') or case.get('defendant_name', 'Unknown')
            case_ref = detail.get('case_reference', '')
            offence_desc = detail.get('offence_description') or case.get('offence_description', '')

            # Build source identifier
            if case_ref:
                source_id = f"HSE-CONV-{case_ref}"
            else:
                source_id = f"HSE-CONV-{slugify(defendant_name)}-{conv_date or offence_date or 'unknown'}"

            # Classify defendant type
            defendant_type = detail.get('defendant_type')
            if not defendant_type:
                defendant_type = classify_defendant_type(defendant_name)

            # Check fatality
            fatality = check_fatality(offence_desc)

            record = {
                'source_identifier': source_id,
                'case_reference': case_ref or None,
                'defendant_name': defendant_name,
                'defendant_type': defendant_type,
                'date_of_offence': offence_date,
                'date_of_conviction': conv_date,
                'court_name': detail.get('court_name') or case.get('court_name'),
                'legislation_breached': detail.get('legislation_breached'),
                'offence_description': offence_desc or None,
                'outcome': detail.get('outcome'),
                'fine_amount': detail.get('fine_amount') or parse_money(case.get('fine_str', '')),
                'costs_amount': detail.get('costs_amount') or parse_money(case.get('costs_str', '')),
                'custodial_sentence': detail.get('custodial_sentence'),
                'custodial_suspended': detail.get('custodial_suspended'),
                'fatality_involved': fatality,
                'sic_code': detail.get('sic_code'),
                'sector': detail.get('sector'),
                'local_authority': detail.get('local_authority'),
                'source_url': detail_url or base_url,
                'content_hash': detail.get('content_hash'),
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'metadata': {
                    'scrape_source': 'historical' if historical else 'recent',
                    'page_number': page_num,
                }
            }

            records.append(record)
            log.info(f"  [OK] [{len(records)}] {defendant_name[:40]} | "
                     f"fine={record.get('fine_amount') or '?'} | "
                     f"fatal={fatality} | type={defendant_type}")

        if stop_paging:
            break

        if next_link:
            page_url = next_link
        else:
            break

    return records


def save_records(records):
    """Upsert records to Supabase."""
    inserted = 0
    failed = 0
    for record in records:
        try:
            sb_upsert('hse_prosecutions', record)
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
                'scraper_name': 'hse-prosecution-register',
                'started_at': start_time.isoformat(),
                'completed_at': end_time.isoformat(),
                'status': 'completed',
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
    p = argparse.ArgumentParser(description='Ailane HSE Prosecution Register Scraper')
    p.add_argument('--historical', action='store_true', help='Full historical scrape (1-10 years)')
    p.add_argument('--since', type=str, default=None, help='From date onwards (YYYY-MM-DD)')
    p.add_argument('--limit', type=int, default=None, help='Max records to process')
    args = p.parse_args()

    log.info("=" * 60)
    log.info("AILANE HSE PROSECUTION REGISTER SCRAPER")
    log.info(f"  Mode: {'historical' if args.historical else 'recent (last 12 months)'}")
    if args.since:
        log.info(f"  Since: {args.since}")
    if args.limit:
        log.info(f"  Limit: {args.limit}")
    log.info("=" * 60)

    start_time = datetime.now(timezone.utc)

    try:
        records = scrape_convictions(
            historical=args.historical,
            limit=args.limit,
            since_date=args.since
        )

        log.info(f"Scraped {len(records)} records. Saving to database...")
        inserted, failed = save_records(records)

        fatality_count = sum(1 for r in records if r.get('fatality_involved'))
        director_count = sum(1 for r in records if r.get('defendant_type') == 'individual')

        stats = {
            'collected': len(records),
            'inserted': inserted,
            'failed': failed,
            'skipped': 0,
            'fatality_involved': fatality_count,
            'director_prosecutions': director_count,
        }

        log.info(f"Complete - {inserted} [OK], {failed} [FAIL], "
                 f"{fatality_count} fatalities, {director_count} director prosecutions")

    except Exception as e:
        log.error(f"[FAIL] Scraper error: {e}")
        stats = {'collected': 0, 'inserted': 0, 'failed': 1, 'skipped': 0, 'error': str(e)}

    end_time = datetime.now(timezone.utc)
    log_scraper_run(stats, start_time, end_time)


if __name__ == '__main__':
    main()
