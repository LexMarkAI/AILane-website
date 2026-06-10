# DEF-CPL-W1-02 Remediation + B-1 Closure — 10 June 2026

**Authority:** Director ruling, 10 June 2026 — remediation options 1 (EF anti-join via RPC + raised classify drain), 2 (partial unique index), and 3 (nightly janitor) all approved.
**Estate:** Supabase project `cnbsxwtvazfvzmltkuvx`
**Companion migration:** `supabase/migrations/20260610190000_cpl_w1_def02_queue_dedupe_index_rpc.sql`

## B-1 closure (CH_API_KEY)

The 401-rejected key was replaced by the Director with a new **REST** key
(`cpl-002-propagation-rest-prod`) issued under the **Ailane CPL-002
Propagation** live application in the Companies House developer hub (no IP or
JavaScript-domain restrictions; server-side use only). Verified live:

- Preflight: secrets present, DB reachable.
- `targeted_pull` probe (Company No. 17035654): 1 row ingested, 0 quarantined.
- `daily_delta` (yesterday→today): **5,700 rows ingested, 0 quarantined**, OGL
  attribution emitted. Gate G-6 qualification from the W1 entry report is lifted.
- `credentials_lifecycle` updated: new register row for the CPL-002 key
  (issued 2026-06-10, stored as `CH_API_KEY`); the 28 Feb 2026 row re-scoped to
  the Enrichment Pipeline application with a rotation/possible-revocation note.

## The defect, quantified

`cpl-universe-delta` v1.0 enqueued the **entire fetched window** as
`classify_pending` on every run. Once the key went live, each 15-minute
same-day tick re-enqueued the full day's incorporation window: within ~75
minutes the queue held **24,773 pending rows, 19,055 of them surplus
duplicates** across 2,726 companies — a projected low-hundreds-of-thousands of
junk rows per day against a nightly classify drain of 500.

## Remediation applied (all three approved options)

1. **One-time dedupe** — surplus pending duplicates collapsed (kept earliest
   by `enqueued_at, id`): 19,055 rows removed.
2. **Partial unique index** `uq_cplq_pending_company_reason` on
   `cpl_ingest_queue (company_number, enqueue_reason) WHERE status='pending'`
   — hard backstop; at most one pending row per company per reason.
3. **RPC `cpl_enqueue_classify_pending(text[], uuid)`** — set-based insert with
   `ON CONFLICT … WHERE status='pending' DO NOTHING` against the partial index
   (race-proof under concurrent 15-min/nightly runs). SECURITY INVOKER;
   EXECUTE granted to `service_role` only.
4. **EF v1.1 deployed** (`cpl-universe-delta`, version 4, `verify_jwt=false`
   preserved): both classify-enqueue sites (daily_delta op A, targeted_pull)
   now call the RPC; inserted counts surfaced as `classify_enqueued` in
   `cpl_run_log.operation_results` and the HTTP response. No other behavioural
   change. ezbr_sha256
   `c450d70f824483226a60ac79bbe4f29e99be6e5e32ac048cb347c546bed2ac0f`.
5. **Cron job 62** body now passes `classify_limit: 3000` so the nightly drain
   matches Stage-1 inflow (~2,500–3,000 incorporations/day).
6. **Janitor cron** `cpl-queue-dedupe-0110utc` (01:10 UTC, before the 01:30
   nightly delta): collapses any duplicate pending rows that ever appear.
   Expected steady-state delete count: 0.

## Verification (live, post-deploy)

Two back-to-back supervised same-day `daily_delta` runs (19:29:50 and
19:30:04 UTC): each re-upserted 2,726 rows with **`classify_enqueued: 0`**,
0 quarantined. Queue now exactly mirrors the universe: 5,718 pending /
5,718 universe rows, **0 surplus duplicates**.

## Still open (unchanged, awaiting ruling)

- DEF-CPL-W1-01 — `cpl_ingest_quarantine.source_mode` CHECK omits
  `targeted_pull` (that mode's quarantine writes still drop silently; the new
  `classify_enqueue_failed` quarantine path inherits the same limitation in
  targeted_pull mode).
- DEF-CPL-W1-03 — CPL EFs not yet registered in `pipeline_registry`.
- DEFER-CPL-W1-04 — Cohort I `sic_division_*` segment enumeration.
- M6 SIC→family anchor ratification (proposal tabled 10 June 2026).
- Match-pass arithmetic noted for a future ruling: op1 `match_limit` remains
  at its default 500/night vs ~2,500–3,000/day inflow; rows still classify and
  materialise (at T5 where unmatched), but the unmatched backlog grows until
  raised. Not covered by this ruling; left untouched deliberately.
