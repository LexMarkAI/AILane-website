"""
Ailane HSE Prosecution Deep Enrichment Pass
=============================================
Re-fetches detail pages for HSE prosecution records and corrects misallocated
fields (court_name, date_of_conviction, legislation_breached, offence_description,
outcome, sic_code, fatality_involved).

The original scraper's detail-page parser mismatched labels to fields because
the Classic ASP detail pages use a different HTML structure than expected.

Constitutional Authority: ACEI Art. III (EVI), Art. IV (EII), CCI Art. III

Usage:
  python hse_enrichment_pass.py --limit 20           # Test first 20 records
  python hse_enrichment_pass.py --all                 # All records needing enrichment
  python hse_enrichment_pass.py --source recent       # Recent register only
  python hse_enrichment_pass.py --source historical   # Historical only
  python hse_enrichment_pass.py --inspect 3           # Dump raw HTML for N detail pages
"""

import os, sys, re, time, argparse, hashlib, logging, json, requests
from datetime import datetime, timezone
from urllib.parse import urljoin, quote
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

# --- Config ---
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://cnbsxwtvazfvzmltkuvx.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_KEY:
    raise SystemExit("ERROR: SUPABASE_SERVICE_KEY not set in .env")

SB_HEADERS = {
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
}

HTTP_HEADERS = {
    'User-Agent': 'Ailane-HSEEnrichment/1.0 (regulatory-intelligence; contact@ailane.ai)'
}

RATE_LIMIT = 1.5  # seconds between detail page fetches

# Labels that indicate a fatality actually occurred (not boilerplate)
# We check whether the offence description or outcome text specifically
# references a death, not just the page template.
FATALITY_KEYWORDS = [
    'death', 'fatal', 'fatality', 'killed', 'died', 'deceased',
    'loss of life', 'corporate manslaughter'
]


# --- HTTP helpers ---

def fetch_with_retry(url, max_retries=3):
    """Fetch URL with retry on transient errors."""
    for attempt in range(max_retries):
        try:
            r = requests.get(url, headers=HTTP_HEADERS, timeout=30)
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


# --- Supabase helpers ---

def sb_fetch_records(filters=None, limit=1000, offset=0):
    """Fetch records from hse_prosecutions that need enrichment."""
    url = f'{SUPABASE_URL}/rest/v1/hse_prosecutions'
    params = {
        'select': 'source_identifier,source_url,defendant_name,legislation_breached,'
                  'offence_description,fatality_involved,metadata',
        'order': 'scraped_at.desc',
        'limit': str(limit),
        'offset': str(offset),
    }
    # Default: records missing court_name or date_of_conviction
    if filters == 'recent':
        params['metadata->>scrape_source'] = 'eq.recent'
    elif filters == 'historical':
        params['metadata->>scrape_source'] = 'eq.historical'

    # Fetch records where enrichment is needed
    params['or'] = '(court_name.is.null,date_of_conviction.is.null,outcome.is.null)'

    headers = {**SB_HEADERS, 'Prefer': 'count=exact'}
    r = requests.get(url, headers=headers, params=params, timeout=30)
    r.raise_for_status()

    total = None
    content_range = r.headers.get('Content-Range', '')
    if '/' in content_range:
        try:
            total = int(content_range.split('/')[-1])
        except ValueError:
            pass

    return r.json(), total


def sb_update_record(source_identifier, updates):
    """UPDATE an existing HSE prosecution record via PATCH."""
    encoded_id = quote(source_identifier, safe='')
    url = f'{SUPABASE_URL}/rest/v1/hse_prosecutions?source_identifier=eq.{encoded_id}'
    headers = {**SB_HEADERS, 'Prefer': 'return=minimal'}
    r = requests.patch(url, json=updates, headers=headers, timeout=15)
    if r.status_code in (200, 204):
        return True
    log.error(f"Update failed for {source_identifier}: HTTP {r.status_code} — {r.text[:200]}")
    return False


# --- HTML Inspection (run first to understand structure) ---

def inspect_detail_pages(urls):
    """Fetch and dump raw HTML structure for manual inspection."""
    from bs4 import BeautifulSoup

    for i, url in enumerate(urls):
        log.info(f"\n{'='*60}\nInspecting page {i+1}: {url}\n{'='*60}")
        try:
            resp = fetch_with_retry(url)
            soup = BeautifulSoup(resp.text, 'html.parser')

            log.info(f"Status: {resp.status_code}, Length: {len(resp.text)}")
            log.info(f"Title: {soup.title.get_text(strip=True) if soup.title else 'N/A'}")

            # Print all table rows with their cell contents
            row_count = 0
            for tr in soup.find_all('tr'):
                cells = tr.find_all(['td', 'th'])
                if cells:
                    row_text = ' | '.join(c.get_text(strip=True)[:80] for c in cells)
                    log.info(f"  ROW: {row_text}")
                    row_count += 1

            # Also check for definition lists
            for dl in soup.find_all('dl'):
                for dt in dl.find_all('dt'):
                    dd = dt.find_next_sibling('dd')
                    if dd:
                        log.info(f"  DL: {dt.get_text(strip=True)[:40]} => {dd.get_text(strip=True)[:80]}")

            # Check for the word 'fatal' in page context
            page_text = soup.get_text(separator=' ', strip=True).lower()
            fatal_contexts = []
            for kw in ['fatal', 'death', 'killed']:
                for m in re.finditer(rf'.{{0,40}}{kw}.{{0,40}}', page_text):
                    fatal_contexts.append(m.group(0).strip())
            if fatal_contexts:
                log.info(f"  FATALITY CONTEXT ({len(fatal_contexts)} matches):")
                for ctx in fatal_contexts[:5]:
                    log.info(f"    ...{ctx}...")
            else:
                log.info("  FATALITY: No fatal/death/killed keywords found on page")

            log.info(f"  Total rows found: {row_count}")

        except Exception as e:
            log.error(f"  Error fetching {url}: {e}")

        if i < len(urls) - 1:
            time.sleep(RATE_LIMIT)


# --- Detail page parsing (corrected) ---

def parse_detail_page(html, url):
    """
    Parse an HSE conviction detail page.

    The Classic ASP pages use <table> layouts with label/value pairs.
    This parser inspects all rows and maps labels to the correct fields,
    fixing the misallocation in the original scraper.
    """
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    data = {}

    # Collect all label-value pairs from table rows
    for tr in soup.find_all('tr'):
        cells = tr.find_all(['td', 'th'])
        if len(cells) >= 2:
            label = cells[0].get_text(strip=True).lower().strip()
            value = cells[1].get_text(strip=True).strip()

            if not value or not label:
                continue

            map_enrichment_field(data, label, value)

    # Also try definition lists
    for dt in soup.find_all('dt'):
        dd = dt.find_next_sibling('dd')
        if dd:
            label = dt.get_text(strip=True).lower().strip()
            value = dd.get_text(strip=True).strip()
            if label and value:
                map_enrichment_field(data, label, value)

    # Fatality detection — only check offence description and outcome text,
    # NOT the entire page (which has boilerplate mentioning "fatal")
    data['fatality_involved'] = check_fatality_targeted(data)

    return data


def map_enrichment_field(data, label, value):
    """
    Map a label-value pair to the correct database field.

    This is the corrected version that handles the actual HSE detail page
    labels properly, avoiding the misallocation issues.
    """
    if not value or value.lower() in ('n/a', '-', '', 'not available'):
        return

    # Normalise label for matching
    label = label.rstrip(':').strip()

    # Court name
    if re.search(r'\bcourt\b', label) and 'cost' not in label:
        data['court_name'] = value[:200]

    # Date of conviction / sentence
    elif re.search(r'(date\s+of\s+convict|conviction\s+date|sentence\s+date|date\s+of\s+sentence)', label):
        parsed = parse_date(value)
        if parsed:
            data['date_of_conviction'] = parsed

    # Date of offence
    elif re.search(r'(date\s+of\s+offence|offence\s+date)', label):
        parsed = parse_date(value)
        if parsed:
            data['date_of_offence'] = parsed

    # SIC code — numeric code, possibly with description
    elif re.search(r'\bsic\b', label):
        # Extract just the numeric part
        sic_match = re.match(r'(\d{2,5})', value.strip())
        if sic_match:
            data['sic_code'] = sic_match.group(1)
        # Store full value as sector if it has a description
        desc_match = re.match(r'\d{2,5}\s*[-–]\s*(.+)', value.strip())
        if desc_match:
            data['sector'] = desc_match.group(1).strip()[:200]

    # Legislation / Act breached
    elif re.search(r'(legislation|act\s+breach|regulation|statutory\s+provision|provision\s+breach|section)', label):
        # Guard: if value looks like a SIC code (pattern: 5 digits - description), skip
        if re.match(r'^\d{5}\s*[-–]', value):
            # This is a SIC code, not legislation — extract it properly
            sic_match = re.match(r'(\d{5})', value)
            if sic_match and 'sic_code' not in data:
                data['sic_code'] = sic_match.group(1)
            desc_match = re.match(r'\d{5}\s*[-–]\s*(.+)', value)
            if desc_match and 'sector' not in data:
                data['sector'] = desc_match.group(1).strip()[:200]
        else:
            data['legislation_breached'] = value[:500]

    # Offence type / description
    elif re.search(r'(offence\s+type|offence\s+desc|description\s+of\s+offence|nature\s+of\s+offence)', label):
        # Guard: if value looks like a date string, skip
        if re.match(r'^\d{2}/\d{2}/\d{4}$', value.strip()):
            # This is a date, not a description — try to use it as date_of_offence
            parsed = parse_date(value)
            if parsed and 'date_of_offence' not in data:
                data['date_of_offence'] = parsed
        else:
            data['offence_description'] = value[:2000]

    # Outcome / result / verdict
    elif re.search(r'(outcome|result|verdict|finding|plea)', label):
        data['outcome'] = value[:500]

    # Fine amount
    elif re.search(r'\bfine\b', label) and 'cost' not in label:
        data['fine_amount'] = parse_money(value)

    # Costs
    elif re.search(r'\bcost', label):
        data['costs_amount'] = parse_money(value)

    # Custodial sentence
    elif re.search(r'(custodial|prison|sentence|imprisonment)', label):
        data['custodial_sentence'] = value[:200]
        if 'suspend' in value.lower():
            data['custodial_suspended'] = True

    # Local authority / region
    elif re.search(r'(local\s+authority|region|area)', label):
        data['local_authority'] = value[:200]

    # Defendant name (for verification)
    elif re.search(r'defendant\s+name', label):
        data['_defendant_name'] = value[:200]

    # Defendant type
    elif re.search(r'defendant\s+type', label):
        data['_defendant_type'] = value[:200]

    # Sector / industry
    elif re.search(r'(sector|industry)', label) and 'sic' not in label:
        data['sector'] = value[:200]


def check_fatality_targeted(data):
    """
    Check for fatality ONLY in offence description and outcome text.

    The original scraper checked the entire page text, which matched
    boilerplate/template text containing 'fatal' — causing 93% false positives.
    """
    texts_to_check = [
        data.get('offence_description', ''),
        data.get('outcome', ''),
    ]
    combined = ' '.join(t for t in texts_to_check if t).lower()
    return any(kw in combined for kw in FATALITY_KEYWORDS)


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


# --- Misallocated data fixer ---

def fix_misallocated_fields(record):
    """
    Check if existing record has misallocated data and extract what we can.

    Returns a dict of corrections from the existing data (before fetching detail page).
    - legislation_breached containing SIC codes → move to sic_code
    - offence_description containing dates → move to date_of_offence
    """
    fixes = {}
    leg = record.get('legislation_breached') or ''
    desc = record.get('offence_description') or ''

    # legislation_breached contains SIC code (pattern: "26511 - ELECTRONIC MEASURE...")
    sic_match = re.match(r'^(\d{2,5})\s*[-–]\s*(.+)$', leg.strip())
    if sic_match:
        fixes['sic_code'] = sic_match.group(1)
        fixes['sector'] = sic_match.group(2).strip()[:200]

    # offence_description contains a date string (pattern: "01/01/1975")
    date_match = re.match(r'^\d{2}/\d{2}/\d{4}$', desc.strip())
    if date_match:
        parsed = parse_date(desc.strip())
        if parsed:
            fixes['date_of_offence'] = parsed

    return fixes


# --- Main enrichment loop ---

def enrich_records(source_filter=None, limit=None):
    """Main enrichment pipeline."""
    log.info("=" * 60)
    log.info("HSE Prosecution Deep Enrichment Pass")
    log.info("=" * 60)

    # Fetch records needing enrichment
    all_records = []
    offset = 0
    page_size = 1000

    while True:
        fetch_limit = min(page_size, limit - len(all_records)) if limit else page_size
        records, total = sb_fetch_records(filters=source_filter, limit=fetch_limit, offset=offset)

        if not records:
            break

        all_records.extend(records)
        log.info(f"Fetched {len(records)} records (total so far: {len(all_records)}"
                 f"{f', estimated total: {total}' if total else ''})")

        if limit and len(all_records) >= limit:
            all_records = all_records[:limit]
            break

        if len(records) < fetch_limit:
            break

        offset += len(records)

    if not all_records:
        log.info("No records found needing enrichment.")
        return

    log.info(f"\nProcessing {len(all_records)} records...")

    stats = {
        'total': len(all_records),
        'enriched': 0,
        'failed_fetch': 0,
        'failed_update': 0,
        'skipped_no_url': 0,
        'fields_fixed': {
            'court_name': 0,
            'date_of_conviction': 0,
            'legislation_breached': 0,
            'offence_description': 0,
            'outcome': 0,
            'sic_code': 0,
            'fatality_corrected': 0,
        }
    }

    for i, record in enumerate(all_records):
        source_id = record.get('source_identifier', 'unknown')
        source_url = record.get('source_url')

        log.info(f"\n[{i+1}/{len(all_records)}] {source_id}")

        if not source_url:
            log.warning(f"  No source_url — skipping")
            stats['skipped_no_url'] += 1
            continue

        # Step 1: Extract any corrections from misallocated existing data
        existing_fixes = fix_misallocated_fields(record)

        # Step 2: Fetch and parse detail page
        try:
            resp = fetch_with_retry(source_url)
            detail_data = parse_detail_page(resp.text, source_url)
        except Exception as e:
            log.error(f"  Fetch failed: {e}")
            stats['failed_fetch'] += 1
            time.sleep(RATE_LIMIT)
            continue

        # Step 3: Merge — detail page data takes priority over existing fixes
        updates = {}

        # Apply existing-data fixes first (lower priority)
        for field, val in existing_fixes.items():
            if val is not None:
                updates[field] = val

        # Apply detail-page data (higher priority — overwrites existing fixes)
        enrichment_fields = [
            'court_name', 'date_of_conviction', 'date_of_offence',
            'legislation_breached', 'offence_description', 'outcome',
            'sic_code', 'sector', 'local_authority',
            'fine_amount', 'costs_amount', 'custodial_sentence', 'custodial_suspended',
        ]
        for field in enrichment_fields:
            if field in detail_data and detail_data[field] is not None:
                updates[field] = detail_data[field]

        # Always update fatality_involved with corrected detection
        updates['fatality_involved'] = detail_data.get('fatality_involved', False)

        # Track which fields were fixed
        if updates.get('court_name'):
            stats['fields_fixed']['court_name'] += 1
        if updates.get('date_of_conviction'):
            stats['fields_fixed']['date_of_conviction'] += 1
        if updates.get('legislation_breached'):
            stats['fields_fixed']['legislation_breached'] += 1
        if updates.get('offence_description'):
            stats['fields_fixed']['offence_description'] += 1
        if updates.get('outcome'):
            stats['fields_fixed']['outcome'] += 1
        if updates.get('sic_code'):
            stats['fields_fixed']['sic_code'] += 1

        was_fatality = record.get('fatality_involved', False)
        now_fatality = updates.get('fatality_involved', False)
        if was_fatality and not now_fatality:
            stats['fields_fixed']['fatality_corrected'] += 1

        if not updates:
            log.info(f"  No new data extracted — skipping update")
            time.sleep(RATE_LIMIT)
            continue

        # Add enrichment metadata
        updates['metadata'] = record.get('metadata') or {}
        if isinstance(updates['metadata'], str):
            try:
                updates['metadata'] = json.loads(updates['metadata'])
            except (json.JSONDecodeError, TypeError):
                updates['metadata'] = {}
        updates['metadata']['enrichment_pass'] = True
        updates['metadata']['enrichment_date'] = datetime.now(timezone.utc).isoformat()

        # Step 4: Update record
        if sb_update_record(source_id, updates):
            log.info(f"  Updated: {', '.join(f'{k}={str(v)[:50]}' for k, v in updates.items() if k != 'metadata')}")
            stats['enriched'] += 1
        else:
            stats['failed_update'] += 1

        time.sleep(RATE_LIMIT)

    # Print summary
    log.info(f"\n{'='*60}")
    log.info("ENRICHMENT COMPLETE")
    log.info(f"{'='*60}")
    log.info(f"Total records processed:   {stats['total']}")
    log.info(f"Successfully enriched:     {stats['enriched']}")
    log.info(f"Failed (fetch):            {stats['failed_fetch']}")
    log.info(f"Failed (update):           {stats['failed_update']}")
    log.info(f"Skipped (no URL):          {stats['skipped_no_url']}")
    log.info(f"\nFields populated:")
    for field, count in stats['fields_fixed'].items():
        log.info(f"  {field:30s} {count:>6}")


# --- CLI ---

def main():
    parser = argparse.ArgumentParser(
        description='HSE Prosecution Deep Enrichment Pass — corrects misallocated detail-page fields'
    )
    parser.add_argument('--limit', type=int, default=None,
                        help='Max records to process')
    parser.add_argument('--all', action='store_true',
                        help='Process all records needing enrichment')
    parser.add_argument('--source', choices=['recent', 'historical'],
                        default=None, help='Filter by scrape source')
    parser.add_argument('--inspect', type=int, default=0, metavar='N',
                        help='Inspect N detail pages (dump raw HTML structure) before enriching')
    args = parser.parse_args()

    if args.inspect > 0:
        # Fetch a few records to get their source URLs
        records, _ = sb_fetch_records(filters=args.source, limit=args.inspect)
        urls = [r['source_url'] for r in records if r.get('source_url')]
        if not urls:
            log.error("No records with source_url found for inspection")
            return
        inspect_detail_pages(urls[:args.inspect])
        return

    limit = None if args.all else (args.limit or 20)
    enrich_records(source_filter=args.source, limit=limit)


if __name__ == '__main__':
    main()
