"""
Ailane Union Annual Data Extractor
====================================
Downloads and parses publicly available union annual reports to extract
employment case data (ET volumes, outcomes, settlement amounts).

This is a semi-automated process:
1. Download PDF reports from union websites
2. Extract text using pdfplumber / PyPDF2
3. Pattern-match for key metrics
4. UPSERT to union_annual_data table

Constitutional Authority: ACEI Art. III (EVI), Art. IV (EII), CCI Art. III

Usage:
  python union_data_extractor.py --union unison --year 2024
  python union_data_extractor.py --union unite --year 2024
  python union_data_extractor.py --union gmb --year 2024
  python union_data_extractor.py --union nasuwt --year 2024
  python union_data_extractor.py --all
  python union_data_extractor.py --list-pdfs          # Show discovered PDFs
"""

import os, sys, re, time, argparse, hashlib, logging, json, tempfile, requests
from datetime import datetime, timezone
from urllib.parse import quote, urljoin
from pathlib import Path
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
    'Prefer': 'resolution=merge-duplicates',
}

HTTP_HEADERS = {
    'User-Agent': 'Ailane-UnionExtractor/1.0 (regulatory-intelligence; contact@ailane.ai)'
}

RATE_LIMIT = 1.5  # seconds between web requests

# Download directory for PDFs
DOWNLOAD_DIR = Path(__file__).parent / 'downloads' / 'union_reports'

# --- Union configurations ---

UNION_CONFIGS = {
    'unison': {
        'name': 'UNISON',
        'search_urls': [
            'https://www.unison.org.uk/about/what-we-do/annual-report/',
        ],
        'pdf_patterns': [
            r'annual[\-_\s]?report',
            r'legal[\-_\s]?services',
        ],
        'metrics_patterns': {
            'et_cases_total': [
                r'(\d[\d,]*)\s+(?:employment\s+tribunal|ET)\s+cases?',
                r'(?:employment\s+tribunal|ET)\s+cases?\s*[:\-]\s*(\d[\d,]*)',
                r'(?:total|handled)\s+(\d[\d,]*)\s+(?:tribunal|ET)',
            ],
            'cases_settled': [
                r'(\d[\d,]*)\s+(?:cases?\s+)?settled',
                r'settled\s*[:\-]\s*(\d[\d,]*)',
            ],
            'cases_won_at_hearing': [
                r'(\d[\d,]*)\s+(?:cases?\s+)?won\s+at\s+(?:hearing|tribunal)',
                r'won\s+at\s+(?:hearing|tribunal)\s*[:\-]\s*(\d[\d,]*)',
            ],
            'settlement_total': [
                r'[\u00a3\$](\d[\d,.]*)\s*(?:million|m)\s+(?:in\s+)?settlement',
                r'settlement[s]?\s+(?:total|amount|worth)\s*[:\-]\s*[\u00a3\$]?(\d[\d,.]*)',
                r'(?:recovered|secured|won)\s+[\u00a3\$](\d[\d,.]*)\s*(?:million|m)',
            ],
            'success_rate_pct': [
                r'(\d[\d.]*)\s*%?\s+success\s+rate',
                r'success\s+rate\s*[:\-]\s*(\d[\d.]*)\s*%',
            ],
            'pi_settlements': [
                r'[\u00a3\$](\d[\d,.]*)\s*(?:million|m)\s+(?:in\s+)?personal\s+injury',
                r'personal\s+injury\s+settlement[s]?\s*[:\-]\s*[\u00a3\$]?(\d[\d,.]*)',
            ],
        },
    },
    'unite': {
        'name': 'Unite the Union',
        'search_urls': [
            'https://www.unitetheunion.org/',
        ],
        'pdf_patterns': [
            r'annual[\-_\s]?report',
            r'legal[\-_\s]?services',
            r'members[\-_\s]?report',
        ],
        'metrics_patterns': {
            'et_cases_total': [
                r'(\d[\d,]*)\s+(?:employment\s+tribunal|ET)\s+cases?',
                r'(?:handled|supported)\s+(\d[\d,]*)\s+(?:employment|ET)',
            ],
            'success_rate_pct': [
                r'(\d[\d.]*)\s*%?\s+success\s+rate',
            ],
            'settlement_total': [
                r'[\u00a3\$](\d[\d,.]*)\s*(?:million|m)\s+(?:recovered|secured|won)',
                r'(?:recovered|secured|won)\s+[\u00a3\$](\d[\d,.]*)\s*(?:million|m)',
                r'total\s+(?:recovered|compensation)\s*[:\-]\s*[\u00a3\$]?(\d[\d,.]*)',
            ],
        },
    },
    'gmb': {
        'name': 'GMB',
        'search_urls': [
            'https://www.gmb.org.uk/',
        ],
        'pdf_patterns': [
            r'annual[\-_\s]?report',
            r'legal[\-_\s]?report',
        ],
        'metrics_patterns': {
            'et_cases_total': [
                r'(\d[\d,]*)\s+(?:employment\s+tribunal|ET)\s+cases?',
                r'employment\s+cases?\s*[:\-]\s*(\d[\d,]*)',
            ],
            'cases_settled': [
                r'(\d[\d,]*)\s+(?:cases?\s+)?settled',
            ],
            'settlement_total': [
                r'[\u00a3\$](\d[\d,.]*)\s*(?:million|m)',
            ],
        },
    },
    'nasuwt': {
        'name': 'NASUWT',
        'search_urls': [
            'https://www.nasuwt.org.uk/',
        ],
        'pdf_patterns': [
            r'annual[\-_\s]?report',
            r'legal[\-_\s]?services',
            r'casework',
        ],
        'metrics_patterns': {
            'et_cases_total': [
                r'(\d[\d,]*)\s+(?:employment\s+tribunal|ET)\s+cases?',
                r'(\d[\d,]*)\s+employment\s+cases?',
            ],
            'cases_settled': [
                r'(\d[\d,]*)\s+(?:cases?\s+)?settled',
            ],
            'settlement_total': [
                r'[\u00a3\$](\d[\d,.]*)\s*(?:million|m)',
            ],
        },
    },
}

# ACEI category mapping for union data
ACEI_CATEGORIES = {
    'et_cases_total': ('employment_tribunal_volume', 1),
    'cases_settled': ('settlement_outcomes', 2),
    'cases_won_at_hearing': ('tribunal_outcomes', 3),
    'cases_lost': ('tribunal_outcomes', 3),
    'settlement_total': ('financial_outcomes', 4),
    'success_rate_pct': ('outcome_rates', 5),
    'pi_settlements': ('personal_injury', 6),
}


# --- PDF handling ---

def ensure_download_dir():
    """Create download directory if it doesn't exist."""
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


def download_pdf(url, union_name, year):
    """Download a PDF file and return the local path."""
    ensure_download_dir()
    filename = f"{union_name}_{year}_{hashlib.md5(url.encode()).hexdigest()[:8]}.pdf"
    filepath = DOWNLOAD_DIR / filename

    if filepath.exists():
        log.info(f"  PDF already downloaded: {filepath.name}")
        return filepath

    log.info(f"  Downloading PDF from {url[:80]}...")
    try:
        r = requests.get(url, headers=HTTP_HEADERS, timeout=60, stream=True)
        r.raise_for_status()
        with open(filepath, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        log.info(f"  Saved: {filepath.name} ({filepath.stat().st_size:,} bytes)")
        return filepath
    except Exception as e:
        log.error(f"  Download failed: {e}")
        return None


def extract_text_from_pdf(filepath):
    """Extract text from a PDF file using pdfplumber (preferred) or PyPDF2."""
    text = ''

    # Try pdfplumber first (better table and layout handling)
    try:
        import pdfplumber
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + '\n'
        if text.strip():
            log.info(f"  Extracted {len(text):,} chars via pdfplumber ({len(text.split())} words)")
            return text
    except ImportError:
        log.debug("  pdfplumber not available, trying PyPDF2")
    except Exception as e:
        log.warning(f"  pdfplumber failed: {e}, trying PyPDF2")

    # Fallback to PyPDF2
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(str(filepath))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + '\n'
        if text.strip():
            log.info(f"  Extracted {len(text):,} chars via PyPDF2 ({len(text.split())} words)")
            return text
    except ImportError:
        log.error("  Neither pdfplumber nor PyPDF2 installed. Install: pip install pdfplumber PyPDF2")
    except Exception as e:
        log.error(f"  PyPDF2 failed: {e}")

    return text


# --- Metric extraction ---

def parse_numeric(text):
    """Parse a numeric value from text, handling commas and 'million'."""
    if not text:
        return None
    text = text.strip()

    # Handle "X million" or "Xm"
    million_match = re.search(r'([\d,.]+)\s*(?:million|m\b)', text, re.IGNORECASE)
    if million_match:
        val = million_match.group(1).replace(',', '')
        try:
            return float(val) * 1_000_000
        except ValueError:
            pass

    # Standard numeric
    cleaned = re.sub(r'[^\d.]', '', text.replace(',', ''))
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def extract_metrics(text, patterns_dict):
    """
    Extract metrics from text using pattern matching.

    Returns dict of {metric_name: metric_value}.
    """
    results = {}

    for metric_name, patterns in patterns_dict.items():
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                # Take the first match
                raw_value = matches[0] if isinstance(matches[0], str) else matches[0][0]
                value = parse_numeric(raw_value)
                if value is not None:
                    results[metric_name] = value
                    break

    return results


def detect_year_from_text(text):
    """Try to detect the report year from the text content."""
    # Look for "Annual Report YYYY" or "YYYY-YY" or "YYYY/YY"
    patterns = [
        r'annual\s+report\s+(\d{4})',
        r'(\d{4})\s*[-/]\s*\d{2,4}\s+annual',
        r'financial\s+year\s+(\d{4})',
        r'year\s+ending\s+\w+\s+(\d{4})',
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return int(m.group(1))
    return None


# --- PDF discovery ---

def discover_pdfs(union_key, year=None):
    """
    Attempt to discover PDF report URLs from union websites.

    Returns list of {'url': ..., 'title': ..., 'year': ...} dicts.
    """
    config = UNION_CONFIGS[union_key]
    discovered = []

    for search_url in config['search_urls']:
        log.info(f"Searching {search_url} for reports...")
        try:
            r = requests.get(search_url, headers=HTTP_HEADERS, timeout=30)
            r.raise_for_status()

            from bs4 import BeautifulSoup
            soup = BeautifulSoup(r.text, 'html.parser')

            # Find all links to PDFs
            for a in soup.find_all('a', href=True):
                href = a.get('href', '')
                text = a.get_text(strip=True).lower()

                if not href.lower().endswith('.pdf'):
                    continue

                # Check if it matches any of our patterns
                full_url = urljoin(search_url, href)
                is_relevant = False
                for pattern in config['pdf_patterns']:
                    if re.search(pattern, href.lower()) or re.search(pattern, text):
                        is_relevant = True
                        break

                if not is_relevant:
                    continue

                # Try to extract year from URL or text
                detected_year = None
                year_match = re.search(r'20[12]\d', href + ' ' + text)
                if year_match:
                    detected_year = int(year_match.group(0))

                if year and detected_year and detected_year != year:
                    continue

                discovered.append({
                    'url': full_url,
                    'title': a.get_text(strip=True)[:200],
                    'year': detected_year,
                })

        except Exception as e:
            log.error(f"  Error searching {search_url}: {e}")

        time.sleep(RATE_LIMIT)

    return discovered


# --- Supabase ---

def sb_upsert(data):
    """Upsert a record to union_annual_data."""
    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/union_annual_data',
        headers=SB_HEADERS,
        json=data,
    )
    if r.status_code in (200, 201, 204):
        return True
    # Try PATCH on conflict
    if r.status_code in (400, 409):
        sid = data.get('source_identifier')
        if sid:
            encoded_id = quote(sid, safe='')
            url = f'{SUPABASE_URL}/rest/v1/union_annual_data?source_identifier=eq.{encoded_id}'
            headers = {**SB_HEADERS, 'Prefer': 'return=minimal'}
            del headers['Prefer']
            headers['Prefer'] = 'return=minimal'
            r2 = requests.patch(url, json=data, headers=headers, timeout=15)
            if r2.status_code in (200, 204):
                return True
            log.error(f"PATCH fallback failed: {r2.status_code} — {r2.text[:200]}")
    else:
        log.error(f"Upsert failed: HTTP {r.status_code} — {r.text[:200]}")
    return False


# --- Processing pipeline ---

def process_union(union_key, year=None):
    """Process a single union's annual report data."""
    config = UNION_CONFIGS.get(union_key)
    if not config:
        log.error(f"Unknown union: {union_key}. Available: {', '.join(UNION_CONFIGS.keys())}")
        return 0

    log.info(f"\n{'='*60}")
    log.info(f"Processing: {config['name']}" + (f" — Year {year}" if year else ""))
    log.info(f"{'='*60}")

    # Step 1: Discover PDFs
    pdfs = discover_pdfs(union_key, year=year)
    if not pdfs:
        log.warning(f"No PDF reports found for {config['name']}. "
                     "You may need to manually place PDFs in the downloads directory.")
        # Check for manually placed PDFs
        ensure_download_dir()
        manual_pdfs = list(DOWNLOAD_DIR.glob(f"{union_key}_*.pdf"))
        if manual_pdfs:
            log.info(f"Found {len(manual_pdfs)} manually placed PDFs:")
            for p in manual_pdfs:
                log.info(f"  {p.name}")
                pdfs.append({
                    'url': f'file://{p}',
                    'title': p.name,
                    'year': year,
                    'local_path': p,
                })
        else:
            log.info(f"Place PDFs at: {DOWNLOAD_DIR}/{union_key}_<year>.pdf")
            return 0

    log.info(f"Found {len(pdfs)} report(s)")

    records_upserted = 0

    for pdf_info in pdfs:
        pdf_url = pdf_info['url']
        pdf_year = pdf_info.get('year') or year
        pdf_title = pdf_info.get('title', 'Unknown')

        log.info(f"\n  Report: {pdf_title}")

        # Step 2: Download PDF (or use local)
        if 'local_path' in pdf_info:
            filepath = pdf_info['local_path']
        else:
            filepath = download_pdf(pdf_url, union_key, pdf_year or 'unknown')
            if not filepath:
                continue

        # Step 3: Extract text
        text = extract_text_from_pdf(filepath)
        if not text or len(text) < 100:
            log.warning(f"  Insufficient text extracted ({len(text)} chars)")
            continue

        # Try to detect year from text if not known
        if not pdf_year:
            pdf_year = detect_year_from_text(text)
            if pdf_year:
                log.info(f"  Detected year from text: {pdf_year}")
            else:
                log.warning("  Could not determine report year — skipping")
                continue

        # Step 4: Extract metrics
        metrics = extract_metrics(text, config['metrics_patterns'])
        log.info(f"  Extracted {len(metrics)} metrics:")
        for k, v in metrics.items():
            log.info(f"    {k}: {v:,.2f}" if isinstance(v, float) else f"    {k}: {v}")

        if not metrics:
            log.warning("  No metrics extracted — consider manual extraction")
            continue

        # Step 5: Build records and upsert
        now = datetime.now(timezone.utc).isoformat()

        # Create one record per metric
        for metric_name, metric_value in metrics.items():
            acei_cat, acei_num = ACEI_CATEGORIES.get(metric_name, (None, None))

            # Determine metric unit
            metric_unit = 'count'
            if 'pct' in metric_name or 'rate' in metric_name:
                metric_unit = 'percentage'
            elif 'total' in metric_name or 'settlement' in metric_name:
                metric_unit = 'gbp'

            source_id = f"UNION-{config['name'].upper().replace(' ', '_')}-{pdf_year}-{metric_name}"

            record = {
                'source_identifier': source_id,
                'union_name': config['name'],
                'report_year': pdf_year,
                'report_period_start': f'{pdf_year}-01-01',
                'report_period_end': f'{pdf_year}-12-31',
                'metric_name': metric_name,
                'metric_value': metric_value,
                'metric_unit': metric_unit,
                'source_url': pdf_url if not pdf_url.startswith('file://') else None,
                'source_document': pdf_title,
                'extraction_method': 'pattern_matching',
                'acei_category': acei_cat,
                'acei_category_number': acei_num,
                'scraped_at': now,
                'jurisdiction_code': 'GB',
                'metadata': {
                    'pdf_filename': filepath.name if filepath else None,
                    'text_length': len(text),
                    'metrics_extracted': len(metrics),
                    'extraction_date': now,
                },
            }

            # Map aggregate fields where applicable
            if metric_name == 'et_cases_total':
                record['cases_total'] = int(metric_value)
            elif metric_name == 'cases_settled':
                record['cases_settled'] = int(metric_value)
            elif metric_name == 'cases_won_at_hearing':
                record['cases_won_at_hearing'] = int(metric_value)
            elif metric_name == 'settlement_total':
                record['settlement_total'] = metric_value
            elif metric_name == 'success_rate_pct':
                record['success_rate_pct'] = metric_value

            if sb_upsert(record):
                records_upserted += 1
                log.info(f"  Upserted: {source_id}")
            else:
                log.error(f"  Failed to upsert: {source_id}")

    log.info(f"\n  {config['name']}: {records_upserted} records upserted")
    return records_upserted


# --- CLI ---

def main():
    parser = argparse.ArgumentParser(
        description='Union Annual Data Extractor — extract employment case data from union reports'
    )
    parser.add_argument('--union', choices=list(UNION_CONFIGS.keys()),
                        help='Union to process')
    parser.add_argument('--year', type=int, help='Report year to extract')
    parser.add_argument('--all', action='store_true',
                        help='Process all unions')
    parser.add_argument('--list-pdfs', action='store_true',
                        help='List discovered/downloaded PDFs without processing')
    args = parser.parse_args()

    if args.list_pdfs:
        for union_key in UNION_CONFIGS:
            log.info(f"\n--- {UNION_CONFIGS[union_key]['name']} ---")
            pdfs = discover_pdfs(union_key, year=args.year)
            for p in pdfs:
                log.info(f"  {p['year'] or '????'}: {p['url'][:80]} — {p['title'][:60]}")
            # Check local downloads
            ensure_download_dir()
            local = list(DOWNLOAD_DIR.glob(f"{union_key}_*.pdf"))
            if local:
                log.info(f"  Local downloads:")
                for f in local:
                    log.info(f"    {f.name} ({f.stat().st_size:,} bytes)")
        return

    total = 0

    if args.all:
        for union_key in UNION_CONFIGS:
            total += process_union(union_key, year=args.year)
            time.sleep(RATE_LIMIT)
    elif args.union:
        total = process_union(args.union, year=args.year)
    else:
        parser.print_help()
        return

    log.info(f"\n{'='*60}")
    log.info(f"TOTAL RECORDS UPSERTED: {total}")
    log.info(f"{'='*60}")


if __name__ == '__main__':
    main()
