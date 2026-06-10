-- AILANE — CPL-002 W1 ENTRY: O-1 junction backfill + M5a/M5b seeds + cron arming
-- Director consolidated rulings, 10 June 2026 (AMD-168 / O-1, D-2 recovery M5a+M5b, Stage-1 cadence)
-- Applied: 2026-06-10 via execute_sql MCP (DML + pg_cron registration — NO DDL).
-- This file is the audit-reproducible record; every statement is idempotent
-- (anti-join / ON CONFLICT DO NOTHING / jobname-guarded cron registration).
-- INC-003 ruling (a) — family-A threshold supersession + 14 provisional re-bands —
-- was applied earlier on 10 June 2026 (cohort_decision_log 10f69b64… + 14 entity
-- events, AMD-168 / INC-003(a)) and is NOT repeated here.
-- M6 SIC→family classifier anchors are NOT applied: proposal tabled for
-- estate-side verification and Director ratification first.

-- ───────────────────────────────────────────────────────────────────────────
-- O-1 — additive junction backfill for the 89 pre-CPP curated register rows.
-- Provenance distinct from cpl_propagation_ef (which writes
-- assignment_method='classifier', assigned_by='cpl_propagation_ef'):
-- backfill rows carry assignment_method='curated', assigned_by='o1_curated_backfill'.
-- Register rows untouched. One cohort_decision_log entry per junction row,
-- entity_id on the alin_cross_reference spine (estate convention per
-- INC-003(a) events and the propagation EF).
-- ───────────────────────────────────────────────────────────────────────────
WITH reg AS (
  SELECT r.id AS register_id, r.alin, r.cohort_family, r.cohort_membership_kind,
         r.company_name, r.recorded_at, x.id AS xref_id
  FROM public.cohort_entity_register r
  JOIN public.alin_cross_reference x ON x.alin = r.alin
  WHERE NOT EXISTS (
    SELECT 1 FROM public.company_cohort_membership m
    WHERE m.entity_xref_id = x.id AND m.cohort_family = r.cohort_family
  )
),
dec AS (
  INSERT INTO public.cohort_decision_log
    (decision_type, entity_id, prior_state, new_state, inputs_considered,
     decision_method, decision_rationale_text, evidence_finding_ids,
     decided_by_role, amd_ref)
  SELECT
    'cohort_assignment',
    reg.xref_id,
    NULL,
    jsonb_build_object(
      'alin', reg.alin,
      'cohort_family', reg.cohort_family,
      'membership_kind', reg.cohort_membership_kind,
      'assignment_method', 'curated',
      'assigned_by', 'o1_curated_backfill',
      'is_primary', true
    ),
    jsonb_build_array(
      jsonb_build_object('register_id', reg.register_id),
      jsonb_build_object('alin', reg.alin),
      jsonb_build_object('register_recorded_at', reg.recorded_at),
      jsonb_build_object('ruling', 'O-1 (Director consolidated rulings, 10 June 2026)')
    ),
    'director_ratification',
    'O-1 ruling (Director, 10 June 2026): additive junction backfill for pre-CPP curated register entity '
      || reg.company_name
      || ' — company_cohort_membership row mirrors register cohort_family ' || reg.cohort_family
      || '; register row untouched; provenance distinct from cpl_propagation_ef.',
    '{}'::text[],
    'director',
    'AMD-168 / O-1'
  FROM reg
  RETURNING decision_id, (new_state->>'alin') AS alin
)
INSERT INTO public.company_cohort_membership
  (entity_xref_id, cohort_family, is_primary, membership_kind, assignment_method,
   assigned_by, effective_from, source_decision_id, notes)
SELECT
  reg.xref_id, reg.cohort_family, true, reg.cohort_membership_kind, 'curated',
  'o1_curated_backfill', reg.recorded_at::date, dec.decision_id,
  'O-1 junction backfill (AMD-168 / O-1, Director ruling 10 June 2026); pre-CPP curated entity; register row untouched.'
FROM reg JOIN dec USING (alin);

-- ───────────────────────────────────────────────────────────────────────────
-- M5b — size-band threshold seed, R-2 v1.0 §4.2.3 verbatim (D-2 recovery).
-- Family A excluded: live A rows are the INC-003(a) supersession set.
-- Cohort I excluded: ONS BPE parallel banding per §4.2.6(a) — aggregate-only,
-- no per-entity rows ever.
-- Dual-criteria families (C-Top, F, H, J): numeric primary dimension in
-- threshold columns; secondary/co-criterion recorded in notes per the
-- INC-003(a) precedent (no DDL on the constitutional table).
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.cohort_size_band_thresholds
  (cohort_family, evidence_basis, size_band, threshold_lower, threshold_upper, threshold_unit, source_authority, notes)
VALUES
('B-Top','uk-gwp-2024','Mega',      500000000, NULL,        'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('B-Top','uk-gwp-2024','Large',     150000000, 500000000,   'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('B-Top','uk-gwp-2024','Upper-mid',  40000000, 150000000,   'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('B-Top','uk-gwp-2024','Mid',        10000000,  40000000,   'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('B-Top','uk-gwp-2024','SMB',        NULL,      10000000,   'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('B-Brokers','uk-gwp-placed-2024','Mega',      200000000, NULL,      'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('B-Brokers','uk-gwp-placed-2024','Large',      50000000, 200000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('B-Brokers','uk-gwp-placed-2024','Upper-mid',  15000000,  50000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('B-Brokers','uk-gwp-placed-2024','Mid',         3000000,  15000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('B-Brokers','uk-gwp-placed-2024','SMB',         NULL,      3000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('C-Top','employment-practice-partners','Mega',      200, NULL, 'partners','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: UK revenue >£200M. Dual-criteria band; revenue dimension recorded in notes per INC-003 precedent (no DDL on constitutional table).'),
('C-Top','employment-practice-partners','Large',      60,  200, 'partners','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: UK revenue £30M–£200M.'),
('C-Top','employment-practice-partners','Upper-mid',  25,   60, 'partners','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). No revenue criterion stated for this band in R-2 v1.0 §4.2.3.'),
('C-Top','employment-practice-partners','Mid',         8,   25, 'partners','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). No revenue criterion stated for this band in R-2 v1.0 §4.2.3.'),
('C-Top','employment-practice-partners','SMB',      NULL,    8, 'partners','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). No revenue criterion stated for this band in R-2 v1.0 §4.2.3.'),
('D1','rated-uk-universe','Mega',      10000, NULL,  'rated-entities','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('D1','rated-uk-universe','Large',      3000, 10000, 'rated-entities','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('D1','rated-uk-universe','Upper-mid',  1000,  3000, 'rated-entities','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('D1','rated-uk-universe','Mid',         200,  1000, 'rated-entities','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('D1','rated-uk-universe','SMB',        NULL,   200, 'rated-entities','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('D2','sll-portfolio-2024','Mega',      5000000000, NULL,       'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('D2','sll-portfolio-2024','Large',     1000000000, 5000000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('D2','sll-portfolio-2024','Upper-mid',  250000000, 1000000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('D2','sll-portfolio-2024','Mid',         50000000,  250000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('D2','sll-portfolio-2024','SMB',         NULL,       50000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('E','uk-aum-2024','Mega',      20000000000, NULL,        'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('E','uk-aum-2024','Large',      5000000000, 20000000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('E','uk-aum-2024','Upper-mid',  1000000000,  5000000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('E','uk-aum-2024','Mid',         250000000,  1000000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('E','uk-aum-2024','SMB',         NULL,        250000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('F','annual-budget-2024','Mega',      5000000000, NULL,       'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: headcount >50,000.'),
('F','annual-budget-2024','Large',     1000000000, 5000000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: headcount 10,000–50,000.'),
('F','annual-budget-2024','Upper-mid',  200000000, 1000000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: headcount 2,000–10,000.'),
('F','annual-budget-2024','Mid',         50000000,  200000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: headcount 500–2,000.'),
('F','annual-budget-2024','SMB',         NULL,       50000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: headcount <500.'),
('G','parent-revenue-2024','Mega',      10000000000, NULL,        'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('G','parent-revenue-2024','Large',      2000000000, 10000000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('G','parent-revenue-2024','Upper-mid',   500000000,  2000000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('G','parent-revenue-2024','Mid',         100000000,   500000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('G','parent-revenue-2024','SMB',         NULL,        100000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026).'),
('H','research-income-2024','Mega',      10000000, NULL,     'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Co-criterion per R-2 v1.0 §4.2.3: REF 2021 GPA top quartile.'),
('H','research-income-2024','Large',      3000000, 10000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Co-criterion per R-2 v1.0 §4.2.3: REF 2021 GPA top half.'),
('H','research-income-2024','Upper-mid',  1000000,  3000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Co-criterion per R-2 v1.0 §4.2.3: REF 2021 GPA bottom half.'),
('H','research-income-2024','Mid',        NULL,      1000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Research income <£1M per R-2 v1.0 §4.2.3; no REF GPA criterion stated.'),
('H','research-income-2024','SMB',        NULL,      NULL,    'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Sub-research-active per R-2 v1.0 §4.2.3 — no numeric research-income window; band assigned qualitatively.'),
('J','uk-arr-2024','Mega',      100000000, NULL,      'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: >5,000 employer customers.'),
('J','uk-arr-2024','Large',      30000000, 100000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: 1,000–5,000 employer customers.'),
('J','uk-arr-2024','Upper-mid',   8000000,  30000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: 250–1,000 employer customers.'),
('J','uk-arr-2024','Mid',         2000000,   8000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: 50–250 employer customers.'),
('J','uk-arr-2024','SMB',         NULL,      2000000, 'GBP','R-2 v1.0 §4.2.3','M5b seed (D-2 recovery ruling, Director, 10 June 2026). Secondary criterion per R-2 v1.0 §4.2.3: <50 employer customers.')
ON CONFLICT (cohort_family, evidence_basis, size_band) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- M5a — segment registry seed, R-2 v1.0 §4.4.3 (D-2 recovery). 57 rows.
-- chk_csr_g2_overlay_cohort requires family-scoped rows to be 'g2-overlay';
-- SIC-2007 primitives remain the family-NULL kind (§4.4.2: SIC is the pre-G2
-- placeholder primitive; substantive overlay locks at G2).
-- J1/J2/J3 sub-families recorded in notes (family CHECK admits only 'J').
-- Cohort I 'sic_division_*' parallel set NOT seeded: wildcard not enumerated
-- in the ruling; ONS BPE division scope to be confirmed estate-side.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.cohort_segment_registry
  (segment_code, segment_kind, cohort_family, segment_label, parent_segment_code, source_authority, notes)
SELECT v.code, 'g2-overlay', v.fam, v.label, NULL, 'R-2 v1.0 §4.4.3',
  'M5a seed per R-2 v1.0 §4.4.3 (D-2 recovery ruling, Director, 10 June 2026). Substantive overlay locks at G2 (R-2 v1.0 §4.4.2); pre-G2 segmentation uses SIC-2007 primitives.' || COALESCE(' ' || v.extra, '')
FROM (VALUES
  ('sme_credit','A','SME Credit',NULL),
  ('supplier_risk','A','Supplier Risk',NULL),
  ('enterprise_credit','A','Enterprise Credit',NULL),
  ('kyc','A','KYC',NULL),
  ('fraud_prevention','A','Fraud Prevention',NULL),
  ('consumer_credit','A','Consumer Credit',NULL),
  ('corporate_data_other','A','Corporate Data — Other',NULL),
  ('el','B-Top','Employers'' Liability',NULL),
  ('dno','B-Top','Directors'' & Officers'' Liability',NULL),
  ('pi','B-Top','Professional Indemnity',NULL),
  ('el_distribution','B-Brokers','Employers'' Liability Distribution',NULL),
  ('dno_distribution','B-Brokers','Directors'' & Officers'' Distribution',NULL),
  ('pi_distribution','B-Brokers','Professional Indemnity Distribution',NULL),
  ('magic_circle_employment','C-Top','Magic Circle — Employment Practice',NULL),
  ('silver_circle_employment','C-Top','Silver Circle — Employment Practice',NULL),
  ('claimant_specialist','C-Top','Claimant Specialist',NULL),
  ('regional_employment','C-Top','Regional Employment Practice',NULL),
  ('tribunal_specialist','C-Top','Tribunal Specialist',NULL),
  ('corporate_esg','D1','Corporate ESG',NULL),
  ('sovereign_esg','D1','Sovereign ESG',NULL),
  ('fixed_income_esg','D1','Fixed Income ESG',NULL),
  ('equity_esg','D1','Equity ESG',NULL),
  ('sustainability_linked_loans','D2','Sustainability-Linked Loans',NULL),
  ('green_bonds','D2','Green Bonds',NULL),
  ('transition_finance','D2','Transition Finance',NULL),
  ('mid_market','E','Mid-Market',NULL),
  ('large_buyout','E','Large Buyout',NULL),
  ('growth_equity','E','Growth Equity',NULL),
  ('secondaries','E','Secondaries',NULL),
  ('infrastructure','E','Infrastructure',NULL),
  ('central_government','F','Central Government',NULL),
  ('devolved_administration','F','Devolved Administration',NULL),
  ('local_government','F','Local Government',NULL),
  ('nhs','F','NHS',NULL),
  ('policing_justice','F','Policing & Justice',NULL),
  ('regulator','F','Regulator',NULL),
  ('fm_sector','G','Facilities Management',NULL),
  ('it_outsourcing','G','IT Outsourcing',NULL),
  ('logistics_distribution','G','Logistics & Distribution',NULL),
  ('temp_labour_supply','G','Temporary Labour Supply',NULL),
  ('recruitment','G','Recruitment',NULL),
  ('employment_law_research','H','Employment Law Research',NULL),
  ('labour_economics_research','H','Labour Economics Research',NULL),
  ('industrial_relations','H','Industrial Relations',NULL),
  ('policy_studies','H','Policy Studies',NULL),
  ('hris','J','HRIS','Sub-family J1 per R-2 v1.0 §4.4.3.'),
  ('talent_management','J','Talent Management','Sub-family J1 per R-2 v1.0 §4.4.3.'),
  ('employee_engagement','J','Employee Engagement','Sub-family J1 per R-2 v1.0 §4.4.3.'),
  ('payroll','J','Payroll','Sub-family J1 per R-2 v1.0 §4.4.3.'),
  ('benefits_admin','J','Benefits Administration','Sub-family J1 per R-2 v1.0 §4.4.3.'),
  ('people_analytics','J','People Analytics','Sub-family J1 per R-2 v1.0 §4.4.3.'),
  ('eap','J','Employee Assistance Programme','Sub-family J2 per R-2 v1.0 §4.4.3.'),
  ('mental_health_app','J','Mental Health App','Sub-family J2 per R-2 v1.0 §4.4.3.'),
  ('wellness_platform','J','Wellness Platform','Sub-family J2 per R-2 v1.0 §4.4.3.'),
  ('employer_health_benefits','J','Employer Health Benefits','Sub-family J2 per R-2 v1.0 §4.4.3.'),
  ('outplacement','J','Outplacement','Sub-family J3 per R-2 v1.0 §4.4.3.'),
  ('career_transition','J','Career Transition','Sub-family J3 per R-2 v1.0 §4.4.3.')
) AS v(code, fam, label, extra)
ON CONFLICT (segment_code) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- Stage-1 cron cadence at W1 entry (Director ruling, 10 June 2026):
--   · nightly cpl-universe-delta 01:30 UTC — armed (job pre-registered inactive)
--   · cpl-propagation-tick 03:30 UTC ONLY — armed (job pre-registered inactive)
--   · NEW cpl-universe-delta-15min — same-day incorporated window, idempotent
--     upsert (companies_house_snapshot PK company_number).
-- Jobname-guarded for replay safety on a fresh estate.
-- ───────────────────────────────────────────────────────────────────────────
DO $arm$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'cpl-universe-delta-0130utc';
  IF jid IS NOT NULL THEN PERFORM cron.alter_job(jid, active => true); END IF;

  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'cpl-propagation-tick-0330utc';
  IF jid IS NOT NULL THEN PERFORM cron.alter_job(jid, active => true); END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cpl-universe-delta-15min') THEN
    PERFORM cron.schedule(
      'cpl-universe-delta-15min',
      '*/15 * * * *',
      $cmd$
        SELECT net.http_post(
          url := 'https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/cpl-universe-delta',
          headers := jsonb_build_object('Content-Type','application/json'),
          body := jsonb_build_object(
            'mode','daily_delta',
            'incorporated_from', to_char((now() AT TIME ZONE 'utc')::date,'YYYY-MM-DD'),
            'incorporated_to',   to_char((now() AT TIME ZONE 'utc')::date,'YYYY-MM-DD')
          ),
          timeout_milliseconds := 300000
        );
      $cmd$
    );
  END IF;
END
$arm$;
