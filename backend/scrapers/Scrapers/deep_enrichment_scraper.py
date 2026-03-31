"""
Ailane Deep Tribunal Enrichment Scraper v3 — Phase 2 (PAID)
=============================================================
Reads cached pdf_extracted_text from tribunal_decisions and sends to
Claude Haiku for structured intelligence extraction. No PDF downloads.

Extracts 50+ structured fields per judgment covering:
  - Outcome and full award breakdown (9 components)
  - Claimant profile (gender, age band, protected characteristics)
  - Employment context (length of service, dismissal type, notice)
  - Claim detail (all claims, statutory breaches, ACAS conciliation)
  - Judgment quality signals (credibility findings, sentiment, reductions)
  - Employer conduct flags (process, investigation, appeal)
  - Hearing intelligence (judge, region, format, duration)
  - Estimated legal ecosystem cost (both sides + award)

Usage:
  python deep_enrichment_scraper.py --status
  python deep_enrichment_scraper.py --batch 10
  python deep_enrichment_scraper.py --continuous
  python deep_enrichment_scraper.py --retry-failed
  python deep_enrichment_scraper.py --stats
  python deep_enrichment_scraper.py --decision <uuid>
"""

import os, re, json, time, random, argparse, requests, logging
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/deep_enrichment.log')
    ]
)
log = logging.getLogger(__name__)

# Config
SUPABASE_URL      = os.getenv('SUPABASE_URL', 'https://cnbsxwtvazfvzmltkuvx.supabase.co')
SUPABASE_KEY      = os.getenv('SUPABASE_SERVICE_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
BATCH_SIZE        = int(os.getenv('DEEP_BATCH_SIZE', '25'))
RATE_LIMIT_DELAY  = float(os.getenv('RATE_LIMIT_DELAY', '1.5'))

if not SUPABASE_KEY:
    raise SystemExit("ERROR: SUPABASE_SERVICE_KEY not set in .env")
if not ANTHROPIC_API_KEY:
    raise SystemExit("ERROR: ANTHROPIC_API_KEY not set in .env")

SB = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

# Legal cost rates (Law Society published rates)
COST_RATES = {
    'solicitor':       (1800, 4500),
    'barrister':       (2500, 8000),
    'counsel':         (2500, 8000),
    'trade_union':     (0,    500),
    'mckenzie_friend': (0,    300),
    'hr_manager':      (500,  1500),
    'self':            (0,    200),
    'unknown':         (1500, 3500),
}
PREP_MULTIPLIER = 3.5

def estimate_cost(rep_type, hearing_days):
    days  = max(hearing_days or 1.0, 1.0)
    rates = COST_RATES.get(rep_type or 'unknown', COST_RATES['unknown'])
    return round(((rates[0] + rates[1]) / 2) * days * (1 + PREP_MULTIPLIER), 2)

# Supabase helpers
def sb_get(path, params=None):
    r = requests.get(f'{SUPABASE_URL}/rest/v1/{path}', headers=SB, params=params)
    r.raise_for_status()
    return r.json()

def sb_count(table, params=None):
    h = {**SB, 'Prefer': 'count=exact'}
    p = {**(params or {}), 'select': 'id', 'limit': 1}
    r = requests.get(f'{SUPABASE_URL}/rest/v1/{table}', headers=h, params=p)
    r.raise_for_status()
    return int(r.headers.get('content-range', '0/0').split('/')[-1])

def sb_upsert(table, data):
    h_ins = {**SB, 'Prefer': 'return=minimal'}
    r = requests.post(f'{SUPABASE_URL}/rest/v1/{table}', headers=h_ins, json=data)
    if r.status_code in (400, 409):
        did = data.get('decision_id')
        r = requests.patch(
            f'{SUPABASE_URL}/rest/v1/{table}?decision_id=eq.{did}',
            headers={**SB, 'Prefer': 'return=minimal'},
            json=data
        )
    r.raise_for_status()
    return {}

# Full extraction prompt - 50+ fields
PROMPT = """You are an expert UK employment law analyst. Extract ALL available structured data from this tribunal judgment.

Return ONLY valid JSON matching this schema exactly. Use null for any field not found. Do not add fields not in the schema.

{
  "outcome": "upheld|dismissed|withdrawn|settled|default_judgment|struck_out|partially_upheld|unknown",
  "outcome_raw": "exact phrase used in judgment",

  "award_total": null,
  "basic_award": null,
  "compensatory_award": null,
  "injury_to_feelings": null,
  "aggravated_damages": null,
  "psychiatric_injury": null,
  "interest_awarded": null,
  "notice_pay_award": null,
  "holiday_pay_award": null,
  "arrears_of_pay": null,
  "uplift_award": null,
  "personal_injury_award": null,
  "costs_order_amount": null,
  "costs_order_against": "claimant|respondent|both|none",
  "recoupment_amount": null,
  "settlement_amount": null,
  "cot3_agreement": false,
  "tomlin_order": false,

  "vento_band": "I|II|III|none|unknown",

  "claimant_gender": "male|female|unknown",
  "claimant_age_band": "under_25|25_34|35_44|45_54|55_64|65_plus|unknown",
  "claimant_protected_chars": [],

  "length_of_service_months": null,
  "dismissal_type": "actual_dismissal|constructive_dismissal|redundancy|expiry_fixed_term|retirement|resignation|unknown",
  "notice_paid": null,
  "notice_weeks": null,

  "claims_brought": [],
  "primary_claim": null,
  "statutory_breaches": [],
  "precedent_cases_cited": [],
  "acas_certificate": null,
  "acas_certificate_number": null,

  "judge_found_credible": "claimant|respondent|both|neither|unknown",
  "judgment_sentiment": "strongly_claimant|mildly_claimant|neutral|mildly_respondent|strongly_respondent|unknown",
  "contributory_fault_pct": null,
  "polkey_reduction_pct": null,
  "appeal_mentioned": false,

  "disciplinary_process_followed": null,
  "investigation_conducted": null,
  "appeal_offered": null,
  "without_prejudice_discussed": null,

  "hearing_days": null,
  "hearing_type": "full|preliminary|remedy|default|strike_out|costs|unknown",
  "hearing_format": "in_person|remote|hybrid|on_papers|unknown",
  "judge_name": null,
  "tribunal_region": null,
  "tribunal_office_location": null,

  "claimant_rep_type": "solicitor|barrister|counsel|trade_union|mckenzie_friend|self|unknown",
  "respondent_rep_type": "solicitor|barrister|counsel|hr_manager|self|unknown",

  "remedy_hearing_ordered": false,
  "reinstatement_ordered": false,
  "re_engagement_ordered": false,

  "multiple_claimants": false,
  "number_of_claimants": null,
  "linked_cases": [],

  "extraction_confidence": 0.85
}

EXTRACTION RULES:
- All monetary values: GBP numbers only, no pound sign, no commas
- claimant_protected_chars: array of applicable values from [age, disability, race, sex, religion_belief, pregnancy_maternity, marriage_civil_partnership, sexual_orientation, gender_reassignment]
- claims_brought: array e.g. ["unfair_dismissal", "discrimination_sex", "wages_unlawful_deduction"]
- statutory_breaches: specific Acts cited e.g. ["ERA 1996 s.98", "EqA 2010 s.13", "WTR 1998 reg.13"]
- precedent_cases_cited: case references e.g. ["Iceland Frozen Foods v Jones [1983]", "Polkey v AE Dayton [1988]"]
- length_of_service_months: convert years/months to total months
- judgment_sentiment: your read of whether the judge was sympathetic to claimant or respondent
- If award_total not stated, sum all component awards you find
- extraction_confidence: 0.0-1.0

Return ONLY the JSON object. No other text.

JUDGMENT TEXT:
"""

def llm_extract(text):
    try:
        r = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            json={
                'model': 'claude-haiku-4-5-20251001',
                'max_tokens': 2048,
                'messages': [{'role': 'user', 'content': PROMPT + text[:14000]}]
            },
            timeout=60
        )
        r.raise_for_status()
        raw = r.json()['content'][0]['text'].strip()
        raw = re.sub(r'^```json\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        data = json.loads(raw)
        data['llm_raw_response'] = raw
        return data
    except Exception as e:
        log.error(f"LLM failed: {e}")
        return None

def llm_extract_with_retry(text, max_retries=3):
    for attempt in range(max_retries):
        try:
            return llm_extract(text)
        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout,
                requests.exceptions.ReadTimeout) as e:
            if attempt == max_retries - 1:
                raise
            log.warning(f"Network error, retry {attempt+1}/{max_retries}: {e}")
            time.sleep(5 * (attempt + 1))

def compute_costs(ext):
    days  = ext.get('hearing_days') or 1.0
    c_rep = ext.get('claimant_rep_type') or 'unknown'
    r_rep = ext.get('respondent_rep_type') or 'unknown'
    c_c   = estimate_cost(c_rep, days)
    r_c   = estimate_cost(r_rep, days)
    award = ext.get('award_total') or 0
    costs = ext.get('costs_order_amount') or 0
    return {
        'est_claimant_legal_cost':    c_c,
        'est_respondent_legal_cost':  r_c,
        'est_total_legal_ecosystem':  round(c_c + r_c + award + costs, 2),
        'legal_cost_methodology':     f'estimated_standard_rates: c={c_rep} r={r_rep} days={days} prep={PREP_MULTIPLIER}x',
    }

def process(decision):
    did   = decision['id']
    title = decision.get('title', '')[:60]
    log.info(f"Processing: {title}")
    base  = {
        'decision_id':         did,
        'scrape_status':       'failed',
        'scrape_attempted_at': datetime.now(timezone.utc).isoformat()
    }

    text = decision.get('pdf_extracted_text')
    if not text or len(text.strip()) < 100:
        log.warning(f"  [SKIP] No text cached for {did}, run pdf_text_extractor first")
        return {**base, 'scrape_status': 'no_document', 'scrape_error': 'No cached text, run pdf_text_extractor first'}

    ext = llm_extract_with_retry(text)
    if not ext:
        return {**base, 'scrape_error': 'LLM extraction failed'}

    costs   = compute_costs(ext)
    llm_raw = ext.pop('llm_raw_response', None)

    return {
        **base, **ext, **costs,
        'extraction_method':   'cached_text',
        'llm_raw_response':    llm_raw,
        'scrape_status':       'complete',
        'scrape_completed_at': datetime.now(timezone.utc).isoformat(),
        'scrape_error':        None,
    }

def get_pending(limit, retry_failed=False):
    # Get all processed decision IDs from enrichment table (paginated)
    done = []
    offset = 0
    while True:
        params = {
            'select': 'decision_id',
            'limit': 1000,
            'offset': offset,
        }
        if retry_failed:
            params['scrape_status'] = 'neq.failed'
        batch = sb_get('tribunal_enrichment', params)
        done.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    done_ids = {r['decision_id'] for r in done}
    log.info(f"Already processed: {len(done_ids):,} decisions")

    # Paginate through tribunal_decisions — only those with cached text
    found = []
    offset = 0
    page_size = 1000
    while len(found) < limit:
        page = sb_get('tribunal_decisions', {
            'select': 'id,title,pdf_urls,pdf_extracted_text,source_url,acei_category,decision_date',
            'pdf_urls': 'not.is.null',
            'pdf_extracted_text': 'not.is.null',
            'order': 'decision_date.desc',
            'limit': page_size,
            'offset': offset,
        })
        if not page:
            break
        for d in page:
            if d['id'] not in done_ids:
                found.append(d)
                if len(found) >= limit:
                    break
        offset += page_size
        if len(page) < page_size:
            break  # No more pages
    return found[:limit]

def cmd_status():
    total    = sb_count('tribunal_decisions')
    with_pdf = sb_count('tribunal_decisions', {'pdf_urls': 'not.is.null'})
    with_text = sb_count('tribunal_decisions', {'pdf_extracted_text': 'not.is.null'})
    complete = sb_count('tribunal_enrichment', {'scrape_status': 'eq.complete'})
    failed   = sb_count('tribunal_enrichment', {'scrape_status': 'eq.failed'})
    no_doc   = sb_count('tribunal_enrichment', {'scrape_status': 'eq.no_document'})
    pending  = with_text - complete - failed - no_doc
    pct      = complete / max(with_pdf, 1) * 100
    text_pct = with_text / max(with_pdf, 1) * 100
    print(f"""
+------------------------------------------------------+
|   AILANE DEEP ENRICHMENT v3 - STATUS                 |
+------------------------------------------------------+
|  Total decisions:          {total:>10,}               |
|  With PDF URLs (ready):    {with_pdf:>10,}               |
|  With cached text:         {with_text:>10,}  ({text_pct:.1f}%)   |
|  Complete (enriched):      {complete:>10,}  ({pct:.1f}%)        |
|  Pending (text ready):     {pending:>10,}               |
|  Failed:                   {failed:>10,}               |
|  No document:              {no_doc:>10,}               |
+------------------------------------------------------+""")

def cmd_stats():
    rows = sb_get('tribunal_enrichment', {
        'select': ('outcome,award_total,est_total_legal_ecosystem,'
                   'claimant_rep_type,hearing_days,vento_band,'
                   'claimant_gender,dismissal_type,judgment_sentiment,'
                   'disciplinary_process_followed,acas_certificate,'
                   'contributory_fault_pct,polkey_reduction_pct'),
        'scrape_status': 'eq.complete',
        'limit': 200000,
    })
    if not rows:
        print("No completed enrichments yet.")
        return

    outcomes = {}
    for r in rows:
        o = r.get('outcome') or 'unknown'
        outcomes[o] = outcomes.get(o, 0) + 1

    upheld    = outcomes.get('upheld', 0) + outcomes.get('partially_upheld', 0)
    dismissed = outcomes.get('dismissed', 0)
    total_od  = upheld + dismissed
    win_rate  = upheld / total_od * 100 if total_od > 0 else 0

    awards     = [r['award_total'] for r in rows if r.get('award_total')]
    ecosystem  = [r['est_total_legal_ecosystem'] for r in rows if r.get('est_total_legal_ecosystem')]
    tot_a      = sum(awards)
    tot_e      = sum(ecosystem)
    avg_a      = tot_a / len(awards) if awards else 0
    scale      = 130854 / max(len(rows), 1)

    proc_pct   = sum(1 for r in rows if r.get('disciplinary_process_followed')) / max(len(rows),1) * 100
    acas_pct   = sum(1 for r in rows if r.get('acas_certificate')) / max(len(rows),1) * 100
    gender_f   = sum(1 for r in rows if r.get('claimant_gender') == 'female') / max(len(rows),1) * 100

    print(f"""
+--------------------------------------------------------------+
|   AILANE TRIBUNAL INTELLIGENCE - AGGREGATE STATS v3         |
+--------------------------------------------------------------+
|  Records analysed:         {len(rows):>12,}                    |
|  OUTCOMES                                                   |
|    Upheld / partial:       {upheld:>12,}                    |
|    Dismissed:              {dismissed:>12,}                    |
|    Claimant win rate:      {win_rate:>11.1f}%                    |
|  FINANCIAL (this sample)                                    |
|    Total awards paid:      GBP {tot_a:>14,.0f}              |
|    Average award:          GBP {avg_a:>14,.0f}              |
|    Total ecosystem cost:   GBP {tot_e:>14,.0f}              |
|  PROJECTED (all 130,854 decisions)                          |
|    Est. total awards:      GBP {tot_a*scale:>14,.0f}              |
|    Est. ecosystem cost:    GBP {tot_e*scale:>14,.0f}              |
|  INTELLIGENCE SIGNALS                                       |
|    Proper process followed:{proc_pct:>11.1f}%                    |
|    ACAS conciliation used: {acas_pct:>11.1f}%                    |
|    Female claimants:       {gender_f:>11.1f}%                    |
+--------------------------------------------------------------+""")

def cmd_batch(limit, retry_failed=False):
    pending = get_pending(limit, retry_failed)
    if not pending:
        log.info("No pending decisions found.")
        return
    log.info(f"Batch of {len(pending)}...")
    ok = fail = 0
    for i, dec in enumerate(pending):
        try:
            result = process(dec)
            sb_upsert('tribunal_enrichment', result)
            if result['scrape_status'] == 'complete':
                ok += 1
                log.info(f"  [OK] [{i+1}/{len(pending)}] {result.get('outcome','?')} | GBP {result.get('award_total') or 0:,.0f} | {result.get('claimant_gender','?')} | {dec.get('title','')[:40]}")
            else:
                fail += 1
                log.warning(f"  [FAIL] [{i+1}/{len(pending)}] {result.get('scrape_error','?')}")
        except Exception as e:
            fail += 1
            log.error(f"  [FAIL] [{i+1}/{len(pending)}] {e}")
        time.sleep(RATE_LIMIT_DELAY + random.uniform(0, 0.8))
    log.info(f"Batch done - {ok} [OK], {fail} [FAIL]")

def cmd_continuous():
    log.info("Continuous mode. Ctrl+C to stop.")
    rnd = 0
    while True:
        rnd += 1
        log.info(f"\n-- Round {rnd} --")
        pending = get_pending(BATCH_SIZE)
        if not pending:
            log.info("All decisions enriched. Pipeline complete.")
            break
        cmd_batch(len(pending))
        t = 5 + random.uniform(0, 3)
        log.info(f"Pausing {t:.1f}s...")
        time.sleep(t)

if __name__ == '__main__':
    p = argparse.ArgumentParser(description='Ailane Deep Tribunal Enrichment v3 - Phase 2 (PAID)')
    p.add_argument('--status',       action='store_true')
    p.add_argument('--stats',        action='store_true')
    p.add_argument('--batch',        type=int)
    p.add_argument('--continuous',   action='store_true')
    p.add_argument('--retry-failed', action='store_true', dest='retry_failed')
    p.add_argument('--decision',     type=str)
    args = p.parse_args()

    if args.status:
        cmd_status()
    elif args.stats:
        cmd_stats()
    elif args.decision:
        rows = sb_get('tribunal_decisions', {
            'id': f'eq.{args.decision}',
            'select': 'id,title,pdf_urls,pdf_extracted_text,source_url,acei_category,decision_date',
            'limit': 1
        })
        if rows:
            result = process(rows[0])
            sb_upsert('tribunal_enrichment', result)
            print(json.dumps(
                {k: v for k, v in result.items() if k != 'llm_raw_response'},
                indent=2, default=str
            ))
        else:
            print(f"Not found: {args.decision}")
    elif args.continuous:
        cmd_continuous()
    elif args.batch:
        cmd_batch(args.batch, args.retry_failed)
    else:
        p.print_help()
