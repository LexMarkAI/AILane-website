"""
Ailane Coroner PFD Report Deep Enrichment Pass
================================================
Parses the full PFD report text (currently stored entirely in the `addressee`
field) into structured fields: coroner_name, coroner_area, cause_of_death,
circumstances_summary, recommendations, employer_name, systemic_failures,
and response_received.

No external HTTP requests are needed — all data is already in Supabase.
The script reads from the database, parses text in memory, and writes back.

Constitutional Authority: ACEI Art. III (EVI), Art. IV (EII), CCI Art. III

Usage:
  python coroner_enrichment_pass.py --limit 20    # Test first 20 records
  python coroner_enrichment_pass.py --all          # All 2,002 records
  python coroner_enrichment_pass.py --dry-run      # Parse and print without updating
"""

import os, sys, re, time, argparse, json, logging, requests
from datetime import datetime, timezone
from urllib.parse import quote
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

# Company suffixes for employer name detection
COMPANY_SUFFIXES = [
    'ltd', 'limited', 'plc', 'llp', 'inc', 'group', 'holdings',
    'trust', 'council', 'authority', 'nhs', 'corporation', 'cic',
    'partnership', 'co.', 'foundation', 'association', 'board',
]

# Systemic failure categories to extract from coroner concerns
SYSTEMIC_FAILURE_CATEGORIES = [
    ('training', r'\b(training|competenc|qualification|induction)\b'),
    ('supervision', r'\b(supervis|oversight|monitor)\b'),
    ('risk_assessment', r'\b(risk\s+assess|risk\s+manage|hazard\s+identif)\b'),
    ('policy_procedure', r'\b(polic|procedur|guideline|protocol|standard\s+operating)\b'),
    ('communication', r'\b(communicat|handover|information\s+shar|referral)\b'),
    ('staffing', r'\b(staff|workforce|resource|capacity|workload)\b'),
    ('equipment', r'\b(equipment|machinery|tool|device|ppe|protective)\b'),
    ('record_keeping', r'\b(record|document|audit|log)\b'),
    ('medication', r'\b(medicat|prescri|drug|pharmac|dosage)\b'),
    ('safeguarding', r'\b(safeguard|welfare|duty\s+of\s+care|vulnerable)\b'),
    ('maintenance', r'\b(maintenan|inspect|repair|servic)\b'),
    ('emergency_response', r'\b(emergenc|first\s+aid|resuscit|defibrillat|ambulance)\b'),
]


# --- Supabase helpers ---

def sb_fetch_records(limit=1000, offset=0):
    """Fetch PFD records from Supabase."""
    url = f'{SUPABASE_URL}/rest/v1/coroner_pfd_reports'
    params = {
        'select': 'source_identifier,addressee,report_pdf_url,response_pdf_url,'
                  'coroner_name,coroner_area,deceased_name,metadata',
        'order': 'scraped_at.desc',
        'limit': str(limit),
        'offset': str(offset),
    }
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
    """UPDATE an existing PFD record via PATCH."""
    encoded_id = quote(source_identifier, safe='')
    url = f'{SUPABASE_URL}/rest/v1/coroner_pfd_reports?source_identifier=eq.{encoded_id}'
    headers = {**SB_HEADERS, 'Prefer': 'return=minimal'}
    r = requests.patch(url, json=updates, headers=headers, timeout=15)
    if r.status_code in (200, 204):
        return True
    log.error(f"Update failed for {source_identifier}: HTTP {r.status_code} — {r.text[:200]}")
    return False


# --- Text parsing ---

def parse_pfd_report(addressee_text):
    """
    Parse the full PFD report text from the addressee field.

    PFD reports follow a standard template with numbered sections:
    1. CORONER — name and area
    2. CORONER'S LEGAL POWERS — standard boilerplate
    3. INVESTIGATION and INQUEST — conclusion and medical cause of death
    4. CIRCUMSTANCES OF THE DEATH — detailed narrative
    5. CORONER'S CONCERNS — specific concerns about future risk
    6. ACTION SHOULD BE TAKEN — recommendations to prevent future deaths
    """
    if not addressee_text or len(addressee_text) < 50:
        return {}

    text = addressee_text
    result = {}

    # --- Addressee name (first line/block before "REGULATION 28") ---
    addressee_match = re.match(
        r'^(.+?)(?:\s*REGULATION\s*28|\s*REPORT\s+UNDER|\s*THIS\s+REPORT\s+IS)',
        text, re.IGNORECASE | re.DOTALL
    )
    if addressee_match:
        raw_addressee = addressee_match.group(1).strip()
        # Clean: take first meaningful line(s)
        lines = [l.strip() for l in raw_addressee.split('\n') if l.strip()]
        if lines:
            # Join first few lines that form the addressee block
            result['addressee_name'] = ' '.join(lines[:3])[:500]

    # --- Coroner name (Section 1) ---
    coroner_patterns = [
        r'1[\.\s]+CORONER\s+(?:I\s+am\s+)?(.+?)(?:,\s*(?:HM|Area|Senior|Assistant)\s+Coroner|,\s*the\s+(?:HM|Area|Senior|Assistant))',
        r'I\s+am\s+(.+?)(?:,\s*(?:HM|Area|Senior|Assistant|the)\s+Coroner)',
        r'1[\.\s]+CORONER\s+(.+?)(?:\s*2[\.\s]+CORONER)',
    ]
    for pattern in coroner_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            name = m.group(1).strip().rstrip(',.')
            if len(name) < 100:
                result['coroner_name'] = name
            break

    # --- Coroner area ---
    area_patterns = [
        r'(?:coroner\s+area\s+of|area\s+coroner\s+for|coroner\s+for\s+the\s+(?:area\s+of\s+)?|for\s+the\s+coroner\s+area\s+of)\s+(.+?)(?:\.|$)',
        r'(?:HM|Senior|Area|Assistant)\s+Coroner\s+for\s+(.+?)(?:\s*\d[\.\s]+|\s*2[\.\s]+)',
    ]
    for pattern in area_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            area = m.group(1).strip().rstrip(',.')
            if len(area) < 200:
                result['coroner_area'] = area
            break

    # --- Inquest conclusion (Section 3) ---
    conclusion_patterns = [
        r'conclusion\s+of\s+(?:the\s+)?inquest\s+was[:\s]*(.+?)(?:(?:The\s+)?(?:medical\s+)?cause\s+of\s+death|4[\.\s]+CIRCUMSTANCES)',
        r'(?:recorded|returned)\s+a\s+(?:conclusion|narrative\s+(?:conclusion|verdict))\s+(?:of|that)[:\s]*(.+?)(?:(?:The\s+)?(?:medical\s+)?cause\s+of\s+death|4[\.\s]+CIRCUMSTANCES)',
    ]
    for pattern in conclusion_patterns:
        m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if m:
            result['inquest_conclusion'] = m.group(1).strip()[:1000]
            break

    # --- Medical cause of death (Section 3) ---
    cause_patterns = [
        r'(?:medical\s+)?cause\s+of\s+death\s+(?:was|is|given\s+as|recorded\s+as)[:\s]*(.+?)(?:\s*4[\.\s]+CIRCUMSTANCES|\s*CIRCUMSTANCES\s+OF\s+THE\s+DEATH)',
        r'(?:medical\s+)?cause\s+of\s+death[:\s]*\n?\s*(.+?)(?:\s*4[\.\s]+|\s*CIRCUMSTANCES)',
    ]
    for pattern in cause_patterns:
        m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if m:
            cause = m.group(1).strip()
            # Clean up: remove trailing section markers
            cause = re.sub(r'\s*\d+[\.\s]+(?:CIRCUMSTANCES|CORONER).*$', '', cause, flags=re.DOTALL)
            if cause and len(cause) > 3:
                result['cause_of_death'] = cause[:1000]
            break

    # --- Circumstances of death (Section 4) ---
    circumstances_patterns = [
        r'4[\.\s]+CIRCUMSTANCES\s+OF\s+THE\s+DEATH\s*(.+?)(?:\s*5[\.\s]+CORONER|$)',
        r'CIRCUMSTANCES\s+OF\s+THE\s+DEATH[:\s]*(.+?)(?:\s*5[\.\s]+CORONER|$)',
    ]
    for pattern in circumstances_patterns:
        m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if m:
            circumstances = m.group(1).strip()
            if circumstances:
                result['circumstances_summary'] = circumstances[:2000]
            break

    # --- Coroner's concerns (Section 5) ---
    concerns_text = None
    concerns_patterns = [
        r"5[\.\s]+CORONER.?S\s+CONCERNS?\s*(.+?)(?:\s*6[\.\s]+ACTION|$)",
        r"CORONER.?S\s+CONCERNS?[:\s]*(.+?)(?:\s*6[\.\s]+ACTION|$)",
    ]
    for pattern in concerns_patterns:
        m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if m:
            concerns_text = m.group(1).strip()
            break

    # --- Recommendations / Action (Section 6) ---
    action_patterns = [
        r'6[\.\s]+ACTION\s+SHOULD\s+BE\s+TAKEN\s*(.+?)$',
        r'ACTION\s+SHOULD\s+BE\s+TAKEN[:\s]*(.+?)$',
        r'6[\.\s]+ACTION[:\s]*(.+?)$',
    ]
    for pattern in action_patterns:
        m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if m:
            recommendations = m.group(1).strip()
            if recommendations:
                result['recommendations'] = recommendations[:2000]
            break

    # --- Systemic failures (from concerns text) ---
    if concerns_text:
        result['systemic_failures'] = extract_systemic_failures(concerns_text)

    return result


def extract_systemic_failures(concerns_text):
    """
    Extract systemic failure categories from the coroner's concerns section.

    Returns a JSON array of identified failure categories.
    """
    if not concerns_text:
        return []

    text_lower = concerns_text.lower()
    failures = []

    for category, pattern in SYSTEMIC_FAILURE_CATEGORIES:
        if re.search(pattern, text_lower):
            failures.append(category)

    return failures


def extract_employer_name(addressee_text):
    """
    Extract the employer/organisation name from the addressee line.

    The addressee of a PFD report IS the organisation the coroner is writing to
    — typically an employer, NHS trust, care home, prison, or other body.
    """
    if not addressee_text:
        return None

    # Take the first block before "REGULATION 28"
    match = re.match(
        r'^(.+?)(?:\s*REGULATION\s*28|\s*REPORT\s+UNDER|\s*THIS\s+REPORT)',
        addressee_text, re.IGNORECASE | re.DOTALL
    )
    if not match:
        return None

    raw = match.group(1).strip()
    lines = [l.strip() for l in raw.split('\n') if l.strip()]

    if not lines:
        return None

    # The addressee is often the first line or first few lines
    # Look for a line containing a company suffix or organisation indicator
    for line in lines[:5]:
        line_lower = line.lower()
        if any(suffix in line_lower for suffix in COMPANY_SUFFIXES):
            return line[:300]

    # If no company suffix found, try the first non-trivial line
    # (skip lines that are just "Dear Sir/Madam" or similar)
    for line in lines[:3]:
        if len(line) > 5 and not re.match(r'^(dear|to|re:|ref:)', line, re.IGNORECASE):
            return line[:300]

    return lines[0][:300] if lines else None


# --- Main enrichment ---

def enrich_records(limit=None, dry_run=False):
    """Main enrichment pipeline for Coroner PFD reports."""
    log.info("=" * 60)
    log.info("Coroner PFD Report Deep Enrichment Pass")
    log.info("=" * 60)

    # Fetch all records
    all_records = []
    offset = 0
    page_size = 1000

    while True:
        fetch_limit = min(page_size, limit - len(all_records)) if limit else page_size
        records, total = sb_fetch_records(limit=fetch_limit, offset=offset)

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
        log.info("No records found.")
        return

    log.info(f"\nProcessing {len(all_records)} records...")

    stats = {
        'total': len(all_records),
        'enriched': 0,
        'skipped_short': 0,
        'skipped_no_data': 0,
        'failed_update': 0,
        'fields': {
            'addressee_cleaned': 0,
            'employer_name': 0,
            'coroner_name': 0,
            'coroner_area': 0,
            'cause_of_death': 0,
            'circumstances_summary': 0,
            'recommendations': 0,
            'systemic_failures': 0,
            'response_received': 0,
        }
    }

    for i, record in enumerate(all_records):
        source_id = record.get('source_identifier', 'unknown')
        addressee_text = record.get('addressee', '')

        if i > 0 and i % 100 == 0:
            log.info(f"\n--- Progress: {i}/{len(all_records)} ({stats['enriched']} enriched) ---\n")

        if not addressee_text or len(addressee_text) < 50:
            stats['skipped_short'] += 1
            continue

        # Parse the report text
        parsed = parse_pfd_report(addressee_text)

        # Extract employer name
        employer = extract_employer_name(addressee_text)

        # Build update payload
        updates = {}

        # Store raw report text in metadata before overwriting addressee
        metadata = record.get('metadata') or {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except (json.JSONDecodeError, TypeError):
                metadata = {}

        # Preserve original text in metadata
        if 'raw_report_text' not in metadata:
            metadata['raw_report_text'] = addressee_text[:10000]  # Truncate for JSONB
        metadata['enrichment_pass'] = True
        metadata['enrichment_date'] = datetime.now(timezone.utc).isoformat()
        updates['metadata'] = metadata

        # Update addressee with just the name
        if parsed.get('addressee_name'):
            updates['addressee'] = parsed['addressee_name']
            stats['fields']['addressee_cleaned'] += 1

        # Employer name
        if employer:
            updates['employer_name'] = employer
            stats['fields']['employer_name'] += 1

        # Coroner name — only update if better than existing
        if parsed.get('coroner_name'):
            existing = record.get('coroner_name')
            if not existing or len(parsed['coroner_name']) > len(existing):
                updates['coroner_name'] = parsed['coroner_name']
                stats['fields']['coroner_name'] += 1

        # Coroner area — only update if better than existing
        if parsed.get('coroner_area'):
            existing = record.get('coroner_area')
            if not existing or len(parsed['coroner_area']) > len(existing):
                updates['coroner_area'] = parsed['coroner_area']
                stats['fields']['coroner_area'] += 1

        # Cause of death
        if parsed.get('cause_of_death'):
            updates['cause_of_death'] = parsed['cause_of_death']
            stats['fields']['cause_of_death'] += 1

        # Circumstances
        if parsed.get('circumstances_summary'):
            updates['circumstances_summary'] = parsed['circumstances_summary']
            stats['fields']['circumstances_summary'] += 1

        # Recommendations
        if parsed.get('recommendations'):
            updates['recommendations'] = parsed['recommendations']
            stats['fields']['recommendations'] += 1

        # Systemic failures
        if parsed.get('systemic_failures'):
            updates['systemic_failures'] = parsed['systemic_failures']
            stats['fields']['systemic_failures'] += 1

        # Response received flag
        if record.get('response_pdf_url'):
            updates['response_received'] = True
            stats['fields']['response_received'] += 1

        if len(updates) <= 1:  # Only metadata
            stats['skipped_no_data'] += 1
            continue

        if dry_run:
            log.info(f"[{i+1}] {source_id}")
            log.info(f"  Deceased: {record.get('deceased_name', 'N/A')}")
            for k, v in updates.items():
                if k == 'metadata':
                    continue
                display_val = str(v)[:100]
                log.info(f"  {k}: {display_val}")
            stats['enriched'] += 1
            continue

        # Update record
        if sb_update_record(source_id, updates):
            stats['enriched'] += 1
            if i < 5:  # Log details for first few
                log.info(f"[{i+1}] {source_id} — updated {len(updates)-1} fields")
        else:
            stats['failed_update'] += 1

    # Print summary
    log.info(f"\n{'='*60}")
    log.info("ENRICHMENT COMPLETE")
    log.info(f"{'='*60}")
    log.info(f"Total records processed:   {stats['total']}")
    log.info(f"Successfully enriched:     {stats['enriched']}")
    log.info(f"Skipped (short text):      {stats['skipped_short']}")
    log.info(f"Skipped (no data parsed):  {stats['skipped_no_data']}")
    log.info(f"Failed (update):           {stats['failed_update']}")
    log.info(f"\nFields populated:")
    for field, count in stats['fields'].items():
        log.info(f"  {field:30s} {count:>6}")


# --- CLI ---

def main():
    parser = argparse.ArgumentParser(
        description='Coroner PFD Report Deep Enrichment — parse report text into structured fields'
    )
    parser.add_argument('--limit', type=int, default=None,
                        help='Max records to process')
    parser.add_argument('--all', action='store_true',
                        help='Process all records')
    parser.add_argument('--dry-run', action='store_true',
                        help='Parse and print results without updating database')
    args = parser.parse_args()

    limit = None if args.all else (args.limit or 20)
    enrich_records(limit=limit, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
