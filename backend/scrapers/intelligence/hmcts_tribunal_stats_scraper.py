#!/usr/bin/env python3
"""
HMCTS Tribunal Statistics Scraper — Ailane Intelligence Pipeline
Scrapes Employment Tribunal quarterly statistics from gov.uk and upserts to
public.hmcts_tribunal_statistics
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
INDEX_URL = 'https://www.gov.uk/government/statistics/tribunal-statistics-quarterly'

# ACEI category mapping for HMCTS jurisdictions
ACEI_MAPPING = {
    'unfair dismissal': ('unfair_dismissal', 1),
    'unfair dismissal - Loss of office': ('unfair_dismissal', 1),
    'discrimination - race': ('discrimination', 2),
    'discrimination - sex': ('discrimination', 2),
    'discrimination - disability': ('discrimination', 2),
    'discrimination - age': ('discrimination', 2),
    'discrimination - religion': ('discrimination', 2),
    'discrimination - sexual orientation': ('discrimination', 2),
    'discrimination': ('discrimination', 2),
    'race discrimination': ('discrimination', 2),
    'sex discrimination': ('discrimination', 2),
    'disability discrimination': ('discrimination', 2),
    'age discrimination': ('discrimination', 2),
    'religion discrimination': ('discrimination', 2),
    'wages act': ('wages_and_pay', 3),
    'wages': ('wages_and_pay', 3),
    'unlawful deduction from wages': ('wages_and_pay', 3),
    'national minimum wage': ('wages_and_pay', 3),
    'redundancy pay': ('redundancy', 4),
    'redundancy': ('redundancy', 4),
    'tupe': ('tupe', 5),
    'transfer of undertakings': ('tupe', 5),
    'working time': ('working_time', 6),
    'working time directive': ('working_time', 6),
    'breach of contract': ('breach_of_contract', 7),
    'contract of employment': ('breach_of_contract', 7),
    'health and safety': ('health_and_safety', 8),
    'whistleblowing': ('whistleblowing', 9),
    'public interest disclosure': ('whistleblowing', 9),
}

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


# --- Publication discovery ---

def discover_publications(index_url):
    """Scrape the GOV.UK statistics page to find quarterly publication links."""
    log.info(f"Fetching HMCTS tribunal statistics index: {index_url}")
    resp = fetch_with_retry(index_url)
    soup = BeautifulSoup(resp.text, 'html.parser')

    publications = []

    # GOV.UK statistics pages have document sections with attachments
    # Also check for links to specific quarterly publications
    for a in soup.select('a[href]'):
        href = a.get('href', '')
        text = a.get_text(strip=True)

        # Match spreadsheet downloads directly
        if re.search(r'\.(ods|xlsx?|csv)(\?|$)', href, re.IGNORECASE):
            full_url = urljoin(index_url, href)
            publications.append({
                'url': full_url,
                'text': text,
                'is_download': True,
                'filename': href.split('/')[-1].split('?')[0],
            })
            continue

        # Match links to quarterly publication pages
        if (re.search(r'tribunal.*(statistic|quarterly)', text, re.IGNORECASE) or
                re.search(r'(statistic|quarterly).*tribunal', text, re.IGNORECASE) or
                re.search(r'employment.*tribunal', text, re.IGNORECASE)):
            if re.search(r'\d{4}', text):
                full_url = urljoin(index_url, href)
                publications.append({
                    'url': full_url,
                    'text': text,
                    'is_download': False,
                })

    # Also look for attachment sections common on GOV.UK
    for section in soup.select('.attachment, .attachment-details'):
        link = section.select_one('a[href]')
        if link:
            href = link.get('href', '')
            if re.search(r'\.(ods|xlsx?|csv)(\?|$)', href, re.IGNORECASE):
                full_url = urljoin(index_url, href)
                publications.append({
                    'url': full_url,
                    'text': link.get_text(strip=True),
                    'is_download': True,
                    'filename': href.split('/')[-1].split('?')[0],
                })

    # Deduplicate
    seen = set()
    unique = []
    for p in publications:
        if p['url'] not in seen:
            seen.add(p['url'])
            unique.append(p)

    log.info(f"Found {len(unique)} publications/downloads")
    return unique


def find_downloads_on_page(page_url):
    """Follow a publication page link and find ODS/XLSX/CSV downloads."""
    time.sleep(RATE_LIMIT_SECONDS)
    log.info(f"  Checking publication page for downloads: {page_url}")

    try:
        resp = fetch_with_retry(page_url)
    except Exception as e:
        log.warning(f"  [FAIL] Could not fetch publication page: {e}")
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')
    downloads = []

    for a in soup.select('a[href]'):
        href = a.get('href', '')
        text = a.get_text(strip=True)
        if re.search(r'\.(ods|xlsx?|csv)(\?|$)', href, re.IGNORECASE):
            # Prefer ET-related downloads
            combined = f"{text} {href}".lower()
            if ('employment' in combined or 'tribunal' in combined or
                    'et' in combined or not downloads):
                full_url = urljoin(page_url, href)
                downloads.append({
                    'url': full_url,
                    'text': text,
                    'filename': href.split('/')[-1].split('?')[0],
                })

    return downloads


# --- ACEI mapping ---

def map_jurisdiction_to_acei(jurisdiction_text):
    """Map an HMCTS jurisdiction string to ACEI category and number."""
    if not jurisdiction_text:
        return None, None
    text_lower = jurisdiction_text.lower().strip()
    for key, (category, number) in ACEI_MAPPING.items():
        if key in text_lower:
            return category, number
    return None, None


def normalise_jurisdiction(text):
    """Normalise jurisdiction text to a canonical slug."""
    if not text:
        return 'unknown'
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', '_', text)
    return text[:100]


# --- Period parsing ---

def parse_period_from_text(text):
    """Extract period start/end from column header or text."""
    text = str(text).strip()

    # Try "Q1 2024-25" or "Q1 2024"
    m = re.search(r'Q([1-4])\s*(\d{4})(?:\s*[-/]\s*(\d{2,4}))?', text, re.IGNORECASE)
    if m:
        quarter = int(m.group(1))
        year = int(m.group(2))
        quarter_starts = {1: (4, 1), 2: (7, 1), 3: (10, 1), 4: (1, 1)}
        quarter_ends = {1: (6, 30), 2: (9, 30), 3: (12, 31), 4: (3, 31)}

        start_month, start_day = quarter_starts[quarter]
        end_month, end_day = quarter_ends[quarter]
        start_year = year if quarter != 4 else year + 1
        end_year = start_year

        return {
            'period_start': f"{start_year}-{start_month:02d}-{start_day:02d}",
            'period_end': f"{end_year}-{end_month:02d}-{end_day:02d}",
            'period_type': 'quarterly',
        }

    # Try "Apr-Jun 2024" or "April to June 2024"
    months_map = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'june': 6, 'july': 7, 'august': 8, 'september': 9,
        'october': 10, 'november': 11, 'december': 12,
    }
    month_pattern = '|'.join(months_map.keys())
    m = re.search(
        rf'({month_pattern})\s*(?:to|[-/])\s*({month_pattern})\s*(\d{{4}})',
        text, re.IGNORECASE
    )
    if m:
        start_month = months_map[m.group(1).lower()]
        end_month = months_map[m.group(2).lower()]
        year = int(m.group(3))
        start_year = year
        end_year = year
        if start_month > end_month:
            start_year = year - 1

        import calendar
        end_day = calendar.monthrange(end_year, end_month)[1]

        return {
            'period_start': f"{start_year}-{start_month:02d}-01",
            'period_end': f"{end_year}-{end_month:02d}-{end_day:02d}",
            'period_type': 'quarterly',
        }

    # Try annual "2023-24" or "2024"
    m = re.search(r'(\d{4})(?:\s*[-/]\s*(\d{2,4}))', text)
    if m:
        year = int(m.group(1))
        return {
            'period_start': f"{year}-04-01",
            'period_end': f"{year + 1}-03-31",
            'period_type': 'annual',
        }

    return None


# --- Spreadsheet parsing ---

def parse_et_spreadsheet(filepath, source_url):
    """Parse an ET statistics spreadsheet and extract records."""
    records = []

    try:
        import pandas as pd
    except ImportError:
        log.error("pandas not available — cannot parse spreadsheet files")
        return records

    try:
        if filepath.endswith('.ods'):
            try:
                sheets = pd.read_excel(filepath, engine='odf', sheet_name=None)
            except Exception:
                sheets = pd.read_excel(filepath, sheet_name=None)
        elif filepath.endswith('.csv'):
            sheets = {'main': pd.read_csv(filepath)}
        else:
            sheets = pd.read_excel(filepath, sheet_name=None)
    except Exception as e:
        log.error(f"  [FAIL] Could not read spreadsheet: {e}")
        return records

    for sheet_name, df in sheets.items():
        if df.empty:
            continue

        sheet_lower = sheet_name.lower()
        # Focus on ET-relevant sheets
        if not any(kw in sheet_lower for kw in [
            'employment', 'et', 'receipt', 'disposal', 'outstanding',
            'jurisdiction', 'claim', 'hearing', 'single', 'multiple',
            'data', 'table', 'summary'
        ]) and len(sheets) > 3:
            continue

        log.info(f"    Processing sheet: {sheet_name} ({df.shape[0]} rows x {df.shape[1]} cols)")

        df = df.fillna('')
        df = df.astype(str)

        # Try to identify period columns from the header rows
        headers = list(df.columns)
        period_cols = []
        for i, h in enumerate(headers):
            period = parse_period_from_text(str(h))
            if period:
                period_cols.append((i, h, period))

        # If no periods in headers, check the first few rows
        if not period_cols:
            for row_idx in range(min(3, len(df))):
                row_vals = [str(v).strip() for v in df.iloc[row_idx].values]
                for i, v in enumerate(row_vals):
                    period = parse_period_from_text(v)
                    if period:
                        period_cols.append((i, v, period))

        if not period_cols:
            # Fallback: try to extract a period from the sheet name or source URL
            period = parse_period_from_text(sheet_name) or parse_period_from_text(source_url)
            if period:
                # Use all numeric columns with this single period
                for i, h in enumerate(headers[1:], 1):
                    period_cols.append((i, h, period))

        if not period_cols:
            log.debug(f"    No period columns found in sheet: {sheet_name}")
            continue

        # Process data rows
        for _, row in df.iterrows():
            values = [str(v).strip() for v in row.values]
            jurisdiction_text = values[0] if values else ''

            if not jurisdiction_text or jurisdiction_text == 'nan':
                continue
            # Skip obvious headers
            if jurisdiction_text.lower() in ('', 'nan', 'jurisdiction', 'type', 'total', 'category'):
                continue

            jurisdiction_slug = normalise_jurisdiction(jurisdiction_text)
            acei_category, acei_number = map_jurisdiction_to_acei(jurisdiction_text)

            for col_idx, col_header, period in period_cols:
                if col_idx >= len(values):
                    continue

                val_str = values[col_idx]
                numeric_val = parse_numeric(val_str)
                if numeric_val is None:
                    continue

                # Determine what this value represents from sheet context
                claims_received = None
                claims_disposed = None
                disposal_type = None
                disposal_count = None
                median_weeks = None
                median_award = None
                successful_pct = None

                sheet_context = f"{sheet_name} {col_header}".lower()

                if 'receipt' in sheet_context or 'received' in sheet_context:
                    claims_received = int(numeric_val)
                elif 'disposal' in sheet_context or 'disposed' in sheet_context:
                    claims_disposed = int(numeric_val)
                elif 'outstanding' in sheet_context or 'backlog' in sheet_context:
                    claims_received = int(numeric_val)  # Store as received for outstanding
                elif 'week' in sheet_context or 'clearance' in sheet_context:
                    median_weeks = numeric_val
                elif 'award' in sheet_context:
                    median_award = numeric_val
                elif '%' in val_str or 'success' in sheet_context:
                    successful_pct = numeric_val
                else:
                    claims_received = int(numeric_val)

                source_id = (
                    f"HMCTS-ET-{jurisdiction_slug}-{period['period_type']}"
                    f"-{period['period_start']}-{content_hash(f'{col_header}:{sheet_name}')[:8]}"
                )

                record = {
                    'source_identifier': source_id,
                    'period_start': period['period_start'],
                    'period_end': period['period_end'],
                    'period_type': period['period_type'],
                    'jurisdiction': jurisdiction_text[:200],
                    'acei_category': acei_category,
                    'claims_received': claims_received,
                    'claims_disposed': claims_disposed,
                    'disposal_type': disposal_type,
                    'disposal_count': disposal_count,
                    'median_weeks_to_hearing': median_weeks,
                    'successful_at_hearing_pct': successful_pct,
                    'median_award': median_award,
                    'source_url': source_url,
                    'scraped_at': datetime.now(timezone.utc).isoformat(),
                    'metadata': {
                        'sheet_name': sheet_name,
                        'column_header': col_header,
                        'acei_number': acei_number,
                    },
                    'jurisdiction_code': 'GB',
                }

                records.append(record)

    return records


def parse_numeric(text):
    """Parse a numeric value from text."""
    if not text:
        return None
    cleaned = re.sub(r'[£$%,\s]', '', str(text).strip())
    if not cleaned or cleaned == 'nan' or cleaned == '-':
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


# --- Main scraping logic ---

def scrape_hmcts_stats(scrape_all=False, latest_only=False, limit=None):
    """Scrape HMCTS Employment Tribunal statistics."""
    records = []
    publications = discover_publications(INDEX_URL)

    if not publications:
        log.warning("No publications found on GOV.UK statistics page")
        return records

    if latest_only:
        publications = publications[:1]
    elif limit:
        publications = publications[:limit]

    processed = 0
    for pub in publications:
        if limit and processed >= limit:
            break

        # Get downloads
        if pub.get('is_download'):
            downloads = [{'url': pub['url'], 'filename': pub.get('filename', 'data.ods')}]
        else:
            downloads = find_downloads_on_page(pub['url'])

        if not downloads:
            log.warning(f"  [SKIP] No downloadable files for: {pub.get('text', '?')[:60]}")
            continue

        for dl in downloads:
            time.sleep(RATE_LIMIT_SECONDS)
            log.info(f"  Downloading: {dl.get('filename', dl['url'][-40:])}")

            try:
                resp = requests.get(dl['url'], headers=HTTP_HEADERS, timeout=60)
                resp.raise_for_status()
            except Exception as e:
                log.warning(f"  [FAIL] Could not download: {e}")
                continue

            suffix = os.path.splitext(dl.get('filename', 'file.ods'))[1] or '.ods'
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(resp.content)
                tmp_path = tmp.name

            try:
                new_records = parse_et_spreadsheet(tmp_path, dl['url'])
                records.extend(new_records)
                log.info(f"    Extracted {len(new_records)} records from {dl.get('filename', '?')}")
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
            sb_upsert('hmcts_tribunal_statistics', record)
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
                'scraper_name': 'hmcts-tribunal-stats',
                'source_name': 'HMCTS Tribunal Statistics',
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
    p = argparse.ArgumentParser(description='Ailane HMCTS Employment Tribunal Statistics Scraper')
    p.add_argument('--all', action='store_true', help='Scrape all available publications')
    p.add_argument('--latest', action='store_true', help='Most recent publication only')
    p.add_argument('--limit', type=int, default=None, help='Limit number of publications to process')
    args = p.parse_args()

    log.info("=" * 60)
    log.info("AILANE HMCTS EMPLOYMENT TRIBUNAL STATISTICS SCRAPER")
    if args.latest:
        log.info("  Mode: latest publication only")
    elif args.all:
        log.info("  Mode: all available publications")
    else:
        log.info("  Mode: default (all)")
    if args.limit:
        log.info(f"  Limit: {args.limit} publications")
    log.info("=" * 60)

    start_time = datetime.now(timezone.utc)

    try:
        records = scrape_hmcts_stats(
            scrape_all=args.all or not args.latest,
            latest_only=args.latest,
            limit=args.limit
        )

        log.info(f"Scraped {len(records)} records. Saving to database...")
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
