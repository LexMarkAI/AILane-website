"""
Ailane Coroner PFD Scraper
===========================
Scrapes Prevention of Future Deaths reports from judiciary.uk.
Filters for employment/workplace relevance and writes to coroner_pfd_reports.

Constitutional Authority: ACEI Art. III (EVI), CCI Art. III

Usage:
  python coroner_pfd_scraper.py                    # Scrape latest page only
  python coroner_pfd_scraper.py --all              # Full historical scrape
  python coroner_pfd_scraper.py --since 2024-01-01 # From date onwards
  python coroner_pfd_scraper.py --limit 50         # Max reports to process
"""

import os, sys, re, time, argparse, hashlib, logging, requests
from datetime import datetime, timezone
from urllib.parse import urljoin
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
    'User-Agent': 'Ailane-PFDScraper/1.0 (regulatory-intelligence; contact@ailane.ai)'
}

BASE_URL = 'https://www.judiciary.uk/prevention-of-future-death-reports/'

EMPLOYMENT_KEYWORDS = [
    'employer', 'employee', 'workplace', 'work-related', 'occupational',
    'health and safety', 'working conditions', 'factory', 'construction site',
    'warehouse', 'industrial', 'manual handling', 'fall from height',
    'machinery', 'chemical exposure', 'asbestos', 'work at height',
    'lone working', 'night shift', 'agency worker', 'contractor',
    'risk assessment', 'training', 'supervision', 'ppe',
    'riddor', 'hse', 'health and safety executive'
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


def sb_upsert(table, data):
    """Upsert a record to Supabase."""
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/{table}',
        headers=SB_HEADERS,
        json=data
    )
    r.raise_for_status()


# --- Parsing ---

def parse_listing_page(html):
    """Parse a PFD listing page and return report entries."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    entries = []

    # PFD reports are listed as article/post entries
    for article in soup.select('article, .entry-summary, .post'):
        entry = {}
        # Title and link
        title_el = article.select_one('h2 a, h3 a, .entry-title a')
        if not title_el:
            continue
        entry['title'] = title_el.get_text(strip=True)
        entry['url'] = title_el.get('href', '')

        # Date
        date_el = article.select_one('time, .entry-date, .posted-on time')
        if date_el:
            date_str = date_el.get('datetime', '') or date_el.get_text(strip=True)
            entry['date_str'] = date_str
        else:
            entry['date_str'] = ''

        # Categories/tags
        cats = []
        for cat_el in article.select('.entry-categories a, .tag-links a, a[rel="tag"]'):
            cats.append(cat_el.get_text(strip=True))
        entry['categories'] = cats

        entries.append(entry)

    # Find next page link
    next_link = None
    next_el = soup.select_one('a.next, .nav-previous a, .pagination .next a, a.facetwp-page-next')
    if not next_el:
        # Try WP standard pagination
        for a in soup.select('.pagination a, .nav-links a'):
            if 'next' in a.get_text(strip=True).lower() or 'next' in a.get('class', []):
                next_el = a
                break
    if next_el:
        next_link = next_el.get('href')

    return entries, next_link


def parse_report_page(html, url):
    """Parse an individual PFD report page for detailed metadata."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    data = {}

    content = soup.select_one('.entry-content, .post-content, article')
    if not content:
        content = soup

    full_text = content.get_text(separator=' ', strip=True).lower()

    # Extract structured fields from the content
    text_block = content.get_text(separator='\n', strip=True)

    # Deceased name - often in title or first lines
    data['deceased_name'] = extract_field(text_block, [
        r'(?:name of )?deceased[:\s]+([^\n]+)',
        r'in(?:to)? the death of[:\s]+([^\n]+)',
    ])

    # Coroner name
    data['coroner_name'] = extract_field(text_block, [
        r'coroner(?:\'s)? name[:\s]+([^\n]+)',
        r'(?:senior )?coroner[:\s]+([^\n]+)',
    ])

    # Coroner area
    data['coroner_area'] = extract_field(text_block, [
        r'coroner(?:\'s)? area[:\s]+([^\n]+)',
        r'area[:\s]+([^\n]+)',
    ])

    # Addressee
    data['addressee'] = extract_field(text_block, [
        r'addressed to[:\s]+([^\n]+)',
        r'sent to[:\s]+([^\n]+)',
        r'addressee[:\s]+([^\n]+)',
    ])

    # PDF links
    pdf_links = []
    for a in content.select('a[href]'):
        href = a.get('href', '')
        if href.endswith('.pdf') or '/uploads/' in href:
            pdf_links.append(href)

    data['report_pdf_url'] = pdf_links[0] if pdf_links else None
    data['response_pdf_url'] = pdf_links[1] if len(pdf_links) > 1 else None

    # Check employment relevance
    data['employment_related'] = any(kw in full_text for kw in EMPLOYMENT_KEYWORDS)

    # Recommendations
    data['recommendations'] = extract_field(text_block, [
        r'recommendation[s]?[:\s]+([^\n](?:.*\n)*?(?=\n\n|\Z))',
        r'matters of concern[:\s]+([^\n](?:.*\n)*?(?=\n\n|\Z))',
    ])

    # Circumstances
    data['circumstances_summary'] = extract_field(text_block, [
        r'circumstances[:\s]+([^\n](?:.*\n)*?(?=\n\n|\Z))',
        r'brief summary[:\s]+([^\n](?:.*\n)*?(?=\n\n|\Z))',
    ])

    data['content_hash'] = hashlib.sha256(text_block.encode()).hexdigest()

    return data


def extract_field(text, patterns):
    """Try multiple regex patterns, return first match or None."""
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()[:500]
    return None


def slugify(text):
    """Convert text to URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return text[:80]


def parse_date(date_str):
    """Parse various date formats, return ISO date string or None."""
    if not date_str:
        return None
    # Try ISO format first
    for fmt in ['%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%d', '%d/%m/%Y', '%d %B %Y', '%B %d, %Y', '%d %b %Y']:
        try:
            return datetime.strptime(date_str.strip()[:30], fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    # Try extracting date from string
    m = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
    if m:
        return m.group(1)
    return None


# --- Main scraping logic ---

def scrape_listing(url, limit=None, since_date=None, scrape_all=False):
    """Scrape PFD listing pages and individual reports."""
    reports = []
    page_url = url
    page_num = 0

    while page_url:
        page_num += 1
        log.info(f"Fetching listing page {page_num}: {page_url}")

        try:
            resp = fetch_with_retry(page_url)
        except Exception as e:
            log.error(f"[FAIL] Could not fetch listing page {page_num}: {e}")
            break

        entries, next_link = parse_listing_page(resp.text)
        log.info(f"  Found {len(entries)} entries on page {page_num}")

        if not entries:
            break

        stop_paging = False
        for entry in entries:
            if limit and len(reports) >= limit:
                stop_paging = True
                break

            report_date = parse_date(entry.get('date_str', ''))

            # Check since_date filter
            if since_date and report_date:
                if report_date < since_date:
                    stop_paging = True
                    break

            # Build source identifier
            deceased = entry.get('title', 'unknown')
            date_part = report_date or 'unknown'
            source_id = f"PFD-{date_part}-{slugify(deceased)}"

            report = {
                'source_identifier': source_id,
                'report_date': report_date,
                'deceased_name': entry.get('title'),
                'categories': entry.get('categories', []),
                'source_url': entry.get('url', ''),
                'scraped_at': datetime.now(timezone.utc).isoformat(),
            }

            # Fetch individual report page for detail
            detail_url = entry.get('url')
            if detail_url:
                time.sleep(1)  # Rate limit: 1s between requests
                try:
                    detail_resp = fetch_with_retry(detail_url)
                    detail = parse_report_page(detail_resp.text, detail_url)
                    # Merge detail fields (don't overwrite non-None listing fields)
                    for k, v in detail.items():
                        if v is not None:
                            report[k] = v
                    # Use detail deceased_name if found
                    if detail.get('deceased_name'):
                        report['deceased_name'] = detail['deceased_name']
                        # Rebuild source_id with better name
                        report['source_identifier'] = f"PFD-{date_part}-{slugify(detail['deceased_name'])}"
                except requests.exceptions.HTTPError as e:
                    status = e.response.status_code if e.response else None
                    if status in (404, 410):
                        log.warning(f"  [SKIP] Report page gone ({status}): {detail_url}")
                        continue
                    log.warning(f"  [FAIL] HTTP {status} fetching report: {detail_url}")
                except Exception as e:
                    log.warning(f"  [FAIL] Error fetching report detail: {e}")

            reports.append(report)
            log.info(f"  [OK] [{len(reports)}] {report.get('deceased_name', '?')[:50]} | emp={report.get('employment_related', False)}")

        if stop_paging:
            break

        # Continue pagination
        if not scrape_all and page_num >= 1 and not since_date:
            # Default mode: only first page
            break

        if next_link:
            page_url = urljoin(url, next_link)
            time.sleep(1)  # Rate limit between pages
        else:
            break

    return reports


def save_reports(reports):
    """Upsert reports to Supabase."""
    inserted = 0
    failed = 0
    for report in reports:
        try:
            sb_upsert('coroner_pfd_reports', report)
            inserted += 1
        except Exception as e:
            failed += 1
            log.error(f"  [FAIL] DB write error for {report.get('source_identifier', '?')}: {e}")
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
                'scraper_name': 'coroner-pfd-reports',
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
    p = argparse.ArgumentParser(description='Ailane Coroner PFD Scraper')
    p.add_argument('--all', action='store_true', help='Full historical scrape (all pages)')
    p.add_argument('--since', type=str, default=None, help='Scrape reports from date onwards (YYYY-MM-DD)')
    p.add_argument('--limit', type=int, default=None, help='Max reports to process')
    args = p.parse_args()

    since_date = args.since  # Already a string in YYYY-MM-DD format

    log.info("=" * 60)
    log.info("AILANE CORONER PFD SCRAPER")
    log.info(f"  Mode: {'all pages' if args.all else 'latest page'}")
    if since_date:
        log.info(f"  Since: {since_date}")
    if args.limit:
        log.info(f"  Limit: {args.limit}")
    log.info("=" * 60)

    start_time = datetime.now(timezone.utc)

    try:
        reports = scrape_listing(
            BASE_URL,
            limit=args.limit,
            since_date=since_date,
            scrape_all=args.all
        )

        log.info(f"Scraped {len(reports)} reports. Saving to database...")
        inserted, failed = save_reports(reports)

        stats = {
            'collected': len(reports),
            'inserted': inserted,
            'failed': failed,
            'skipped': 0,
            'employment_related': sum(1 for r in reports if r.get('employment_related')),
        }

        log.info(f"Complete - {inserted} [OK], {failed} [FAIL], "
                 f"{stats['employment_related']} employment-related")

    except Exception as e:
        log.error(f"[FAIL] Scraper error: {e}")
        stats = {'collected': 0, 'inserted': 0, 'failed': 1, 'skipped': 0, 'error': str(e)}

    end_time = datetime.now(timezone.utc)
    log_scraper_run(stats, start_time, end_time)


if __name__ == '__main__':
    main()
