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

# judiciary.uk uses a WordPress search/filter interface for PFD reports.
# The listing URL uses query parameters for pagination, date filters, and category.
# Reports are rendered as <a class="card__link"> elements on the listing page.
# Individual report pages contain metadata in <p> tags with field labels.
LISTING_URL_TEMPLATE = (
    "https://www.judiciary.uk/page/{page}/"
    "?s&pfd_report_type&post_type=pfd&order=relevance"
    "&after-day={after_day}&after-month={after_month}&after-year={after_year}"
    "&before-day={before_day}&before-month={before_month}&before-year={before_year}"
)

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

def get_report_links_from_page(html):
    """Extract report URLs from a listing page.

    judiciary.uk renders PFD search results with <a class="card__link"> elements.
    Each links to an individual report page.

    Returns a list of absolute URLs found on the page.
    """
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    links = soup.find_all('a', class_='card__link')
    return [link.get('href') for link in links if link.get('href')]


def parse_report_page(html, url):
    """Parse an individual PFD report page for metadata.

    judiciary.uk report pages structure metadata in <p> tags containing
    field labels like "Date of report:", "Ref:", "Deceased name:", etc.
    Section content (circumstances, concerns) lives in <strong>-headed blocks.
    PDF links use <a class="govuk-button"> or plain <a> pointing to .pdf files.
    """
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    data = {}

    # --- Extract paragraph-based metadata fields ---
    # Each field appears as a <p> tag containing the label text.
    # Some reports use <br> within paragraphs to separate fields.
    PARA_FIELDS = {
        'ref': ['Ref:'],
        'deceased_name': ['Deceased name:', 'Name of deceased:', "Deceased's name:"],
        'coroner_name': ["Coroner's name:", "Coroner name:", "Coroners name:"],
        'coroner_area': ["Coroner's Area:", "Coroner Area:", "Coroners Area:"],
        'report_date_str': ['Date of report:', 'Date of reports:'],
        'addressee': ['This report is being sent to:', 'Sent to:'],
        'category_str': ['Category:'],
    }

    for field_name, keywords in PARA_FIELDS.items():
        data[field_name] = extract_paragraph_field(soup, keywords)

    # --- Fallback: date from <time> element in article header ---
    if not data.get('report_date_str'):
        time_el = soup.select_one('article header time, time.entry-date')
        if time_el:
            data['report_date_str'] = time_el.get('datetime', '') or time_el.get_text(strip=True)

    # --- Fallback: categories from pill tags (GOV.UK Design System) ---
    if not data.get('category_str'):
        cat_links = soup.select('.pill--single a, a[rel="tag"]')
        if cat_links:
            data['category_str'] = ' | '.join(a.get_text(strip=True) for a in cat_links)

    # --- Extract section-based content (strong-headed blocks) ---
    data['circumstances_summary'] = extract_section_text(soup, [
        'CIRCUMSTANCES OF THE DEATH',
        'CIRCUMSTANCES OF DEATH',
        'CIRCUMSTANCES OF',
    ])

    data['recommendations'] = extract_section_text(soup, [
        "CORONER'S CONCERNS",
        "CORONERS CONCERNS",
        "CORONER CONCERNS",
        "MATTERS OF CONCERN",
    ])

    # --- PDF links ---
    # Try related-content links first (GOV.UK template), then govuk-button, then any .pdf
    pdf_links = []
    for a in soup.select('a.related-content__link'):
        href = a.get('href', '')
        if href:
            pdf_links.append(href)

    if not pdf_links:
        for a in soup.find_all('a', class_='govuk-button'):
            href = a.get('href', '')
            if href:
                pdf_links.append(href)

    if not pdf_links:
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href.lower().endswith('.pdf'):
                pdf_links.append(href)

    data['report_pdf_url'] = pdf_links[0] if pdf_links else None
    data['response_pdf_url'] = pdf_links[1] if len(pdf_links) > 1 else None

    # --- Employment relevance ---
    full_text = soup.get_text(separator=' ', strip=True).lower()
    data['employment_related'] = any(kw in full_text for kw in EMPLOYMENT_KEYWORDS)

    # --- Content hash ---
    data['content_hash'] = hashlib.sha256(full_text.encode()).hexdigest()

    return data


def extract_paragraph_field(soup, keywords):
    """Find a <p> tag containing any of the keywords, return the text after the keyword.

    This matches the judiciary.uk pattern where metadata appears as:
      <p>Coroner name: HHJ Jane Smith</p>
    """
    for keyword in keywords:
        el = soup.find(lambda tag: tag.name == 'p' and keyword in tag.get_text(), recursive=True)
        if el:
            text = el.get_text(strip=True)
            # Remove the keyword prefix to get just the value
            for kw in keywords:
                if kw in text:
                    text = text.split(kw, 1)[-1].strip()
                    break
            if text:
                return text[:500]
    return None


def extract_section_text(soup, header_keywords):
    """Find a <strong> tag matching header keywords and collect subsequent content.

    judiciary.uk structures report sections with <strong> headers followed by
    sibling text content.
    """
    for strong_tag in soup.find_all('strong'):
        header_text = strong_tag.get_text(strip=True)
        if any(kw.lower() in header_text.lower() for kw in header_keywords):
            parts = []
            for sibling in strong_tag.next_siblings:
                if isinstance(sibling, str):
                    text = sibling.strip()
                    if text:
                        parts.append(text)
                else:
                    text = sibling.get_text(separator=' ', strip=True)
                    if text:
                        parts.append(text)
            if parts:
                return ' '.join(parts)[:2000]
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
    date_str = date_str.strip()
    for fmt in ['%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%d', '%d/%m/%Y', '%d %B %Y',
                '%B %d, %Y', '%d %b %Y', '%d-%m-%Y']:
        try:
            return datetime.strptime(date_str[:30], fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    m = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
    if m:
        return m.group(1)
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', date_str)
    if m:
        return f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
    return None


# --- Main scraping logic ---

def build_listing_url(page, since_date=None):
    """Build the judiciary.uk PFD search URL for a given page number."""
    if since_date:
        try:
            dt = datetime.strptime(since_date, '%Y-%m-%d')
            after_day, after_month, after_year = dt.day, dt.month, dt.year
        except ValueError:
            after_day, after_month, after_year = 1, 1, 2013
    else:
        # Default: from inception (July 2013)
        after_day, after_month, after_year = 1, 7, 2013

    now = datetime.now()
    return LISTING_URL_TEMPLATE.format(
        page=page,
        after_day=after_day, after_month=after_month, after_year=after_year,
        before_day=now.day, before_month=now.month, before_year=now.year
    )


def scrape_listing(limit=None, since_date=None, scrape_all=False):
    """Scrape PFD report links from listing pages, then fetch each report."""
    reports = []
    page_num = 0

    while True:
        page_num += 1
        page_url = build_listing_url(page_num, since_date=since_date)
        log.info(f"Fetching listing page {page_num}: {page_url[:100]}...")

        try:
            resp = fetch_with_retry(page_url)
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response else None
            if status == 404:
                log.info(f"  Page {page_num} returned 404 - end of results")
                break
            log.error(f"[FAIL] Could not fetch listing page {page_num}: HTTP {status}")
            break
        except Exception as e:
            log.error(f"[FAIL] Could not fetch listing page {page_num}: {e}")
            break

        report_urls = get_report_links_from_page(resp.text)
        log.info(f"  Found {len(report_urls)} report links on page {page_num}")

        if not report_urls:
            log.info(f"  No more reports found - end of results")
            break

        for report_url in report_urls:
            if limit and len(reports) >= limit:
                break

            time.sleep(1)  # Rate limit: 1s between requests to judiciary.uk

            try:
                detail_resp = fetch_with_retry(report_url)
                detail = parse_report_page(detail_resp.text, report_url)
            except requests.exceptions.HTTPError as e:
                status = e.response.status_code if e.response else None
                if status in (404, 410):
                    log.warning(f"  [SKIP] Report page gone ({status}): {report_url}")
                    continue
                log.warning(f"  [FAIL] HTTP {status} fetching report: {report_url}")
                continue
            except Exception as e:
                log.warning(f"  [FAIL] Error fetching report detail: {e}")
                continue

            # Parse the report date
            report_date = parse_date(detail.get('report_date_str'))

            # Check since_date filter on individual report date
            if since_date and report_date and report_date < since_date:
                continue

            # Build source identifier
            deceased = detail.get('deceased_name') or 'unknown'
            date_part = report_date or 'unknown'
            source_id = f"PFD-{date_part}-{slugify(deceased)}"

            # Parse categories from the category string
            cat_str = detail.get('category_str') or ''
            categories = [c.strip() for c in cat_str.split('|') if c.strip()] if cat_str else []
            if not categories and cat_str:
                categories = [c.strip() for c in cat_str.split(',') if c.strip()]

            report = {
                'source_identifier': source_id,
                'report_date': report_date,
                'deceased_name': detail.get('deceased_name'),
                'coroner_name': detail.get('coroner_name'),
                'coroner_area': detail.get('coroner_area'),
                'categories': categories if categories else None,
                'addressee': detail.get('addressee'),
                'circumstances_summary': detail.get('circumstances_summary'),
                'recommendations': detail.get('recommendations'),
                'report_pdf_url': detail.get('report_pdf_url'),
                'response_pdf_url': detail.get('response_pdf_url'),
                'employment_related': detail.get('employment_related', False),
                'source_url': report_url,
                'content_hash': detail.get('content_hash'),
                'scraped_at': datetime.now(timezone.utc).isoformat(),
            }

            reports.append(report)
            log.info(f"  [OK] [{len(reports)}] {deceased[:50]} | "
                     f"date={report_date} | emp={report.get('employment_related')}")

        if limit and len(reports) >= limit:
            break

        # In default mode (not --all and no --since), only scrape first page
        if not scrape_all and not since_date:
            break

        time.sleep(1)  # Rate limit between listing pages

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

    log.info("=" * 60)
    log.info("AILANE CORONER PFD SCRAPER")
    log.info(f"  Mode: {'all pages' if args.all else 'latest page'}")
    if args.since:
        log.info(f"  Since: {args.since}")
    if args.limit:
        log.info(f"  Limit: {args.limit}")
    log.info("=" * 60)

    start_time = datetime.now(timezone.utc)

    try:
        reports = scrape_listing(
            limit=args.limit,
            since_date=args.since,
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
