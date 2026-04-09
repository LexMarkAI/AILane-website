#!/usr/bin/env python3
"""
ACAS Early Conciliation Statistics Scraper — Ailane Intelligence Pipeline
Scrapes quarterly EC bulletins from acas.org.uk and upserts to public.acas_early_conciliation_stats
"""

import os
import sys
import re
import time
import hashlib
import argparse
import logging
import tempfile
from datetime import datetime, timezone
from urllib.parse import urljoin
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
INDEX_URL = 'https://www.acas.org.uk/about-us/service-statistics/early-conciliation/'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(stream=sys.stdout)]
)
log = logging.getLogger(__name__)


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


def content_hash(text):
    """SHA-256 hash of content for dedup."""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


# --- Bulletin discovery ---

def discover_bulletins(index_url):
    """Scrape the ACAS EC statistics index page to find quarterly bulletin links."""
    log.info(f"Fetching ACAS EC statistics index: {index_url}")
    resp = fetch_with_retry(index_url)
    soup = BeautifulSoup(resp.text, 'html.parser')

    bulletins = []

    # Look for links to bulletin pages or ODS/XLSX/CSV downloads
    for a in soup.select('a[href]'):
        href = a.get('href', '')
        text = a.get_text(strip=True)

        # Match links to quarterly bulletins or spreadsheet downloads
        is_bulletin = False
        is_download = False

        # Check for quarter/period references in text
        quarter_match = re.search(
            r'(Q[1-4]|quarter\s*[1-4]|january|april|july|october)[\s\-]*'
            r'(to|[-/])?\s*'
            r'(march|june|september|december)?\s*'
            r'(\d{4}(?:\s*[-/]\s*\d{2,4})?)',
            text, re.IGNORECASE
        )

        # Check for spreadsheet downloads
        if re.search(r'\.(ods|xlsx?|csv)(\?|$)', href, re.IGNORECASE):
            is_download = True
        elif quarter_match or re.search(r'early\s+conciliation', text, re.IGNORECASE):
            is_bulletin = True
        elif re.search(r'statistic', text, re.IGNORECASE) and re.search(r'\d{4}', text):
            is_bulletin = True

        if is_bulletin or is_download:
            full_url = urljoin(index_url, href)
            bulletins.append({
                'url': full_url,
                'text': text,
                'is_download': is_download,
                'quarter_match': quarter_match.group(0) if quarter_match else None,
            })

    # Deduplicate by URL
    seen = set()
    unique = []
    for b in bulletins:
        if b['url'] not in seen:
            seen.add(b['url'])
            unique.append(b)

    log.info(f"Found {len(unique)} bulletin links/downloads")
    return unique


def find_downloads_on_page(page_url):
    """Follow a bulletin page link and find ODS/XLSX/CSV downloads."""
    time.sleep(RATE_LIMIT_SECONDS)
    log.info(f"  Checking bulletin page for downloads: {page_url}")

    try:
        resp = fetch_with_retry(page_url)
    except Exception as e:
        log.warning(f"  [FAIL] Could not fetch bulletin page: {e}")
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')
    downloads = []

    for a in soup.select('a[href]'):
        href = a.get('href', '')
        if re.search(r'\.(ods|xlsx?|csv)(\?|$)', href, re.IGNORECASE):
            full_url = urljoin(page_url, href)
            downloads.append({
                'url': full_url,
                'text': a.get_text(strip=True),
                'filename': href.split('/')[-1].split('?')[0],
            })

    return downloads


# --- Period parsing ---

def parse_period_label(text):
    """Extract period start/end dates from bulletin text or filename."""
    text = text.lower().strip()

    # Try "Q1 2024-25" pattern
    m = re.search(r'q([1-4])\s*(\d{4})(?:\s*[-/]\s*(\d{2,4}))?', text, re.IGNORECASE)
    if m:
        quarter = int(m.group(1))
        year = int(m.group(2))
        # Financial year quarters: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
        quarter_starts = {1: (4, 1), 2: (7, 1), 3: (10, 1), 4: (1, 1)}
        quarter_ends = {1: (6, 30), 2: (9, 30), 3: (12, 31), 4: (3, 31)}

        start_month, start_day = quarter_starts[quarter]
        end_month, end_day = quarter_ends[quarter]

        # Adjust year for Q4 (Jan-Mar is in the second year of the financial year)
        start_year = year if quarter != 4 else year + 1
        end_year = start_year

        label = f"Q{quarter}-{year}-{(year+1) % 100:02d}" if m.group(3) else f"Q{quarter}-{year}"

        return {
            'period_start': f"{start_year}-{start_month:02d}-{start_day:02d}",
            'period_end': f"{end_year}-{end_month:02d}-{end_day:02d}",
            'period_label': label,
        }

    # Try "April to June 2024" or "April - June 2024" pattern
    months = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12,
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
        'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9,
        'oct': 10, 'nov': 11, 'dec': 12,
    }
    m = re.search(
        r'(' + '|'.join(months.keys()) + r')\s*(?:to|[-/])\s*'
        r'(' + '|'.join(months.keys()) + r')\s*(\d{4})',
        text, re.IGNORECASE
    )
    if m:
        start_month = months[m.group(1).lower()]
        end_month = months[m.group(2).lower()]
        year = int(m.group(3))
        start_year = year
        end_year = year
        if start_month > end_month:
            start_year = year - 1

        import calendar
        end_day = calendar.monthrange(end_year, end_month)[1]

        label = f"{m.group(1).capitalize()}-{m.group(2).capitalize()}-{year}"
        return {
            'period_start': f"{start_year}-{start_month:02d}-01",
            'period_end': f"{end_year}-{end_month:02d}-{end_day:02d}",
            'period_label': label,
        }

    # Try just a year
    m = re.search(r'(\d{4})(?:\s*[-/]\s*(\d{2,4}))?', text)
    if m:
        year = int(m.group(1))
        return {
            'period_start': f"{year}-04-01",
            'period_end': f"{year + 1}-03-31",
            'period_label': f"FY-{year}-{(year+1) % 100:02d}",
        }

    return None


# --- Spreadsheet parsing ---

def parse_ods_file(filepath, source_url, period_info):
    """Parse an ODS/XLSX file and extract EC statistics metrics."""
    records = []

    try:
        import pandas as pd
    except ImportError:
        log.error("pandas not available — cannot parse spreadsheet files")
        return records

    try:
        # Try ODS first, then XLSX
        if filepath.endswith('.ods'):
            try:
                sheets = pd.read_excel(filepath, engine='odf', sheet_name=None)
            except Exception:
                sheets = pd.read_excel(filepath, sheet_name=None)
        else:
            sheets = pd.read_excel(filepath, sheet_name=None)
    except Exception as e:
        log.error(f"  [FAIL] Could not read spreadsheet: {e}")
        return records

    period_start = period_info.get('period_start', '')
    period_end = period_info.get('period_end', '')
    period_label = period_info.get('period_label', '')

    for sheet_name, df in sheets.items():
        if df.empty:
            continue

        log.info(f"    Processing sheet: {sheet_name} ({len(df)} rows)")

        # Convert all columns to strings for pattern matching
        df = df.fillna('')
        df = df.astype(str)

        # Try to identify metric rows
        # ACAS bulletins typically have metric names in column A and values in subsequent columns
        for _, row in df.iterrows():
            values = [str(v).strip() for v in row.values]

            # Skip empty rows or header rows
            if not any(v and v != 'nan' for v in values):
                continue

            metric_name = values[0] if values else ''
            if not metric_name or metric_name == 'nan':
                continue

            # Skip obvious headers
            if metric_name.lower() in ('', 'nan', 'metric', 'measure', 'indicator'):
                continue

            # Look for numeric values in subsequent columns
            for i, val in enumerate(values[1:], 1):
                numeric_val = parse_numeric(val)
                if numeric_val is not None:
                    # Determine if this is a percentage
                    is_pct = '%' in val or (0 <= numeric_val <= 100 and 'rate' in metric_name.lower())

                    record = {
                        'source_identifier': f"ACAS-EC-{period_label}-{content_hash(f'{metric_name}:{i}')}",
                        'period_start': period_start,
                        'period_end': period_end,
                        'period_label': period_label,
                        'metric_name': metric_name[:200],
                        'metric_value': numeric_val if not is_pct else None,
                        'percentage': numeric_val if is_pct else None,
                        'source_url': source_url,
                        'scraped_at': datetime.now(timezone.utc).isoformat(),
                        'metadata': {
                            'sheet_name': sheet_name,
                            'column_index': i,
                        }
                    }

                    # Try to detect track type from metric name or sheet name
                    combined = f"{sheet_name} {metric_name}".lower()
                    if 'fast track' in combined:
                        record['track_type'] = 'fast_track'
                    elif 'standard' in combined:
                        record['track_type'] = 'standard'
                    elif 'open' in combined:
                        record['track_type'] = 'open'

                    # Detect case type
                    if 'unfair dismissal' in combined:
                        record['case_type'] = 'unfair_dismissal'
                    elif 'discrimination' in combined:
                        record['case_type'] = 'discrimination'
                    elif 'wages' in combined or 'pay' in combined:
                        record['case_type'] = 'wages'
                    elif 'redundancy' in combined:
                        record['case_type'] = 'redundancy'

                    records.append(record)
                    break  # Take only the first numeric value per row

    return records


def parse_numeric(text):
    """Parse a numeric value from text."""
    if not text:
        return None
    cleaned = re.sub(r'[£$%,\s]', '', str(text).strip())
    if not cleaned or cleaned == 'nan':
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


# --- Main scraping logic ---

def scrape_acas_ec(scrape_all=False, latest_only=False, limit=None):
    """Scrape ACAS Early Conciliation statistics."""
    records = []
    bulletins = discover_bulletins(INDEX_URL)

    if not bulletins:
        log.warning("No bulletins found on ACAS statistics page")
        return records

    if latest_only:
        bulletins = bulletins[:1]
    elif limit:
        bulletins = bulletins[:limit]

    processed = 0
    for bulletin in bulletins:
        if limit and processed >= limit:
            break

        # Parse period info from the bulletin text
        period_text = bulletin.get('quarter_match') or bulletin.get('text', '')
        period_info = parse_period_label(period_text)

        if not period_info:
            # Try the URL filename
            period_info = parse_period_label(bulletin.get('url', ''))

        if not period_info:
            log.warning(f"  [SKIP] Could not parse period from: {bulletin.get('text', '?')[:60]}")
            continue

        # Get downloads
        if bulletin.get('is_download'):
            downloads = [{'url': bulletin['url'], 'filename': bulletin['url'].split('/')[-1]}]
        else:
            downloads = find_downloads_on_page(bulletin['url'])

        if not downloads:
            log.warning(f"  [SKIP] No downloadable files for: {bulletin.get('text', '?')[:60]}")
            continue

        # Process each download
        for dl in downloads:
            time.sleep(RATE_LIMIT_SECONDS)
            log.info(f"  Downloading: {dl.get('filename', dl['url'][-40:])}")

            try:
                resp = requests.get(dl['url'], headers=HTTP_HEADERS, timeout=60)
                resp.raise_for_status()
            except Exception as e:
                log.warning(f"  [FAIL] Could not download: {e}")
                continue

            # Save to temp file
            suffix = os.path.splitext(dl.get('filename', 'file.ods'))[1] or '.ods'
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(resp.content)
                tmp_path = tmp.name

            try:
                new_records = parse_ods_file(tmp_path, dl['url'], period_info)
                records.extend(new_records)
                log.info(f"    Extracted {len(new_records)} metrics from {dl.get('filename', '?')}")
            finally:
                os.unlink(tmp_path)

            processed += 1

    return records


def save_records(records):
    """Upsert records to Supabase."""
    inserted = 0
    failed = 0
    for record in records:
        try:
            sb_upsert('acas_early_conciliation_stats', record)
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
                'scraper_name': 'acas-ec-stats',
                'source_name': 'ACAS Early Conciliation',
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
    p = argparse.ArgumentParser(description='Ailane ACAS Early Conciliation Statistics Scraper')
    p.add_argument('--all', action='store_true', help='Scrape all available quarters')
    p.add_argument('--latest', action='store_true', help='Most recent quarter only')
    p.add_argument('--limit', type=int, default=None, help='Limit number of quarters to process')
    args = p.parse_args()

    log.info("=" * 60)
    log.info("AILANE ACAS EARLY CONCILIATION STATISTICS SCRAPER")
    if args.latest:
        log.info("  Mode: latest quarter only")
    elif args.all:
        log.info("  Mode: all available quarters")
    else:
        log.info("  Mode: default (all)")
    if args.limit:
        log.info(f"  Limit: {args.limit} quarters")
    log.info("=" * 60)

    start_time = datetime.now(timezone.utc)

    try:
        records = scrape_acas_ec(
            scrape_all=args.all or not args.latest,
            latest_only=args.latest,
            limit=args.limit
        )

        log.info(f"Scraped {len(records)} metrics. Saving to database...")
        inserted, failed = save_records(records)

        stats = {
            'collected': len(records),
            'inserted': inserted,
            'failed': failed,
            'skipped': 0,
        }

        log.info(f"Complete - {inserted} [OK], {failed} [FAIL]")

    except Exception as e:
        log.error(f"[FAIL] Scraper error: {e}")
        stats = {'collected': 0, 'inserted': 0, 'failed': 1, 'skipped': 0, 'error': str(e)}

    end_time = datetime.now(timezone.utc)
    log_scraper_run(stats, start_time, end_time)


if __name__ == '__main__':
    main()
