# CPL-002 W1 Entry — Execution & Exit-Gate Report

**Authority:** Director consolidated rulings, 10 June 2026 (CORR-001, D-1, O-1, INC-003(a), Stage-1 cadence, D-2 recovery M5a/M5b)
**Amendment refs:** AMD-167 (CPP spec/EFs) · AMD-168 (W1 entry operations)
**Estate:** Supabase project `cnbsxwtvazfvzmltkuvx`
**Executed:** 2026-06-10, ~17:05–17:20 UTC, via Supabase MCP (`execute_sql`; DML + pg_cron only — no DDL)
**Companion record:** `supabase/migrations/20260610174500_cpl_w1_entry_o1_m5a_m5b_crons.sql`

## 1. Operations applied

### 1.1 INC-003 ruling (a) — verified already complete (not re-applied)
Found executed earlier on 10 June 2026 (14:31–14:32 UTC): supersession event
`10f69b64-bf8e-47e7-abd1-e2e89436b3f8` (AMD-168 / INC-003(a)) marks the five
family-A `turnover-2024` threshold rows superseded; five live A
`uk-revenue-2024` rows carry the R-2 v1.0 §4.2.3 ladder (Mega >£200M · Large
£50M–£200M · Upper-mid £15M–£50M · Mid £3M–£15M · SMB <£3M; customer-count
co-criteria in notes); 14 per-entity `size_band_recalibration` decision events;
all 14 A register rows re-banded PROVISIONAL pending R-3 filed-accounts
stratification (AMD-139 §1.4). Verified intact; the M5b seed below did not
touch these rows.

### 1.2 O-1 — junction backfill (89 rows)
- 89 `company_cohort_membership` rows inserted, mirroring the register exactly:
  A 14 · BDR 10 · INT 16 · SOV 49, all `per-entity`, `is_primary=true`.
- Provenance distinct from the propagation EF as ruled:
  `assignment_method='curated'` + `assigned_by='o1_curated_backfill'`
  (the EF writes `classifier` / `cpl_propagation_ef`, and its rollback path
  targets `assigned_by='cpl_propagation_ef'` exclusively — the backfill rows
  are structurally outside any CPP reversal sweep).
- `assignment_method` CHECK introspected first: admits
  `curated | classifier | director_attested | migration_seed`. Note
  `cpl_propagation_ef` is an `assigned_by` value, not an `assignment_method`
  value — distinctness is enforced on both columns.
- 89 `cohort_decision_log` entries (`cohort_assignment`,
  `director_ratification`, `decided_by_role='director'`,
  `amd_ref='AMD-168 / O-1'`), `entity_id` on the `alin_cross_reference` spine
  per estate convention (INC-003(a) events and the propagation EF both use the
  xref id). Every junction row links its decision via `source_decision_id`.
- Register rows untouched (verified — no UPDATE issued against
  `cohort_entity_register`).
- ALIN join coverage was 89/89 before insert; anti-join makes the operation
  idempotent.

### 1.3 M5b — threshold seed (50 rows, R-2 v1.0 §4.2.3 verbatim)
10 families × 5 bands; `source_authority='R-2 v1.0 §4.2.3'` exactly.
Family A excluded (live rows are the INC-003(a) set — same rows, per ruling).
Cohort I excluded (ONS BPE parallel banding per §4.2.6(a); aggregate-only, no
per-entity rows ever).

| Family | evidence_basis | unit | Mega | Large | Upper-mid | Mid | SMB |
|---|---|---|---|---|---|---|---|
| B-Top | uk-gwp-2024 | GBP | >500M | 150–500M | 40–150M | 10–40M | <10M |
| B-Brokers | uk-gwp-placed-2024 | GBP | >200M | 50–200M | 15–50M | 3–15M | <3M |
| C-Top | employment-practice-partners | partners | >200 | 60–200 | 25–60 | 8–25 | <8 |
| D1 | rated-uk-universe | rated-entities | >10K | 3–10K | 1–3K | 200–1K | <200 |
| D2 | sll-portfolio-2024 | GBP | >5B | 1–5B | 250M–1B | 50–250M | <50M |
| E | uk-aum-2024 | GBP | >20B | 5–20B | 1–5B | 250M–1B | <250M |
| F | annual-budget-2024 | GBP | >5B | 1–5B | 200M–1B | 50–200M | <50M |
| G | parent-revenue-2024 | GBP | >10B | 2–10B | 500M–2B | 100–500M | <100M |
| H | research-income-2024 | GBP | >10M | 3–10M | 1–3M | <1M | (qualitative) |
| J | uk-arr-2024 | GBP | >100M | 30–100M | 8–30M | 2–8M | <2M |

Dual-criteria encoding follows the INC-003(a) precedent (numeric primary in
threshold columns, secondary/co-criterion in `notes`; no DDL on the
constitutional table): C-Top Mega/Large UK-revenue criteria; F headcount
bands; H REF 2021 GPA quartiles (SMB = sub-research-active, NULL/NULL window);
J employer-customer counts. `evidence_basis` strings follow the established
kebab-case + reporting-period convention set by the live A rows
(`uk-revenue-2024`); structural-count bases carry no year suffix.

### 1.4 M5a — segment registry seed (57 rows, R-2 v1.0 §4.4.3)
`segment_kind='g2-overlay'` (the table CHECK requires family-scoped rows to be
g2-overlay; `sic-2007` is the family-NULL primitive kind per §4.4.2). Notes on
every row record that the substantive overlay locks at G2.
A 7 · B-Top 3 · B-Brokers 3 · C-Top 5 · D1 4 · D2 3 · E 5 · F 6 · G 5 · H 4 ·
J 12 (J1/J2/J3 sub-families recorded in notes; family CHECK admits only `J`).
**Deferred:** Cohort I `sic_division_*` parallel set — wildcard not enumerated
in the ruling and the ONS BPE division scope (which excludes some SIC
divisions) is not estate-resident; seeding it would have required invention.
Flagged for enumeration alongside the §4.2.6(a) aggregate-banding work.

### 1.5 Stage-1 cron cadence — armed (W1 entered)
| Job | Schedule | State |
|---|---|---|
| `cpl-universe-delta-0130utc` (jobid 61) | 30 1 * * * | **armed** (was inactive) |
| `cpl-propagation-tick-0330utc` (jobid 62) | 30 3 * * * | **armed** (was inactive) — 03:30 only, per ruling |
| `cpl-universe-delta-15min` (jobid 63) | */15 * * * * | **created + armed** — same-day incorporated window (`incorporated_from = incorporated_to = current UTC date`), idempotent upsert on `companies_house_snapshot.company_number` |

`csce-nightly-rebuild` (02:30) untouched; tick remains strictly after it.

## 2. Exit-gate report

Gate labels G-1–G-6 per the ruling; G-2/G-3 definitions are encoded in the
propagation EF and were evaluated live this session. The remaining labels are
reported against the evidence classes named in the AMD-167 artefact set
(AILANE-SPEC-CPL-002 v1.0 is folder-resident, not estate-resident, so those
mappings are stated as applied and are correctable on sight of the spec).

| Gate | Evidence | Result |
|---|---|---|
| **G-1 — identity/spine integrity** | Register 89/89 ALIN-matched to `alin_cross_reference`; junction 89/89 with `uq_ccm_entity_family` intact; one `is_primary` per entity; 89/89 junction rows decision-linked | **PASS** |
| **G-2 — ingest reconciliation** | Supervised tick run `32557894-a98f-4b77-b6d4-a8af88042906`: company_number uniqueness PK-guaranteed; quarantine rate 0.0 (threshold <0.005) | **PASS** |
| **G-3 — league coherence** | Same run: register=junction=league for every family (A 14/14/14 · BDR 10/10/10 · INT 16/16/16 · SOV 49/49/49); `legacy_exception=false` everywhere — the O-1 exception path is closed | **PASS** |
| **G-4 — provenance/decision-log completeness** | Decision log 104 rows (1 INC-003 supersession + 14 re-bands + 89 O-1); every threshold supersession decision-linked; every junction row `source_decision_id`-linked; append-only invariants intact | **PASS** |
| **G-5 — privacy (no natural-person fields)** | Universe EF requests/stores no officers/PSC/director fields (source-verified); universe 0 rows; W2 `bulk_batch` hard-gated behind `CPL_W2_ARMED` (verified refusal path in source); personal-name heuristic flag pass wired (`cpl_flag_personal_names`) | **PASS** (structural) |
| **G-6 — licensing/source compliance** | OGL v3.0 attribution emitted on every universe run (verified in live run output); no proprietary identifiers in the propagation path (AMD-162); CH budget governor 550 req/5min in source | **PASS (qualified)** — see blocker B-1: live CH pulls return 401, so G-6 is exercised on the refusal path only until the key is fixed |

## 3. Blockers, defects, deferrals

**B-1 (BLOCKER, Director-remediable): CH_API_KEY rejected by Companies House
(HTTP 401).** D-1 verified secret *existence*; first live contact (17:12 UTC)
disproved *validity*: advanced-search returned 401 and a single-company
profile probe on a known-valid company number (17035654) also failed.
Diagnosis: key value invalid for the live REST API — typically a sandbox-
environment key, a streaming-API key, or a mis-pasted value. Remediation is
key replacement in the Edge Function secrets (Director/Dashboard); no code
change needed. Per the credentials rule the value was never read or logged.
Crons remain armed per ruling — the pipeline self-heals on key replacement;
until then each 15-min run writes 1 run-log row + 1 quarantine row (~96+97/day
including nightly).

**DEF-CPL-W1-01:** `cpl_ingest_quarantine.source_mode` CHECK omits
`targeted_pull`; quarantine inserts from that mode are dropped silently (EF
does not check the insert error). Surfaced when the B-1 profile probe's
quarantine row vanished. Fix: extend CHECK (DDL, needs ratification) or map
mode→allowed value in the EF.

**DEF-CPL-W1-02:** `cpl_ingest_queue` has no uniqueness on
`(company_number, enqueue_reason)`; the 15-minute same-day window re-enqueues
`classify_pending` duplicates each tick (snapshot upsert is idempotent;
materialisation is guarded, so integrity holds — but the nightly tick will
re-classify duplicates wastefully). Recommend a partial unique index
`(company_number, enqueue_reason) WHERE status='pending'` + EF upsert-ignore.

**DEF-CPL-W1-03:** `pipeline_registry` has no rows for `cpl-universe-delta` /
`cpl-propagation-tick` (ACEI Art. XI registration). Not self-registered —
registry entries carry constitutional fields better set by ruling.

**DEFER-CPL-W1-04:** Cohort I `sic_division_*` segment set (see §1.4).

## 4. M6 — held

SIC-2007→family classifier anchor sets are **tabled in-session for estate-side
verification and Director ratification**; no M6 mapping has been applied. The
deployed classifier (`cpl_classify_company`) continues to park unmapped
companies reason-coded to quarantine, so the armed cadence is safe ahead of M6.
