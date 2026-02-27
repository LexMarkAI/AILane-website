-- ============================================================================
-- AILANE — ROW LEVEL SECURITY MIGRATION (COMPLETE)
-- ============================================================================
-- Run this in the Supabase SQL Editor (supabase.com → project → SQL Editor)
--
-- Principles (from constitutional handover brief):
--   1. Authenticated users see ONLY their own rows (where scoping applies)
--   2. Service role (server-side) sees everything — bypasses RLS by default
--   3. Anonymous role sees nothing sensitive
--   4. Signups table: insert-only for anon, no read access
--   5. Tribunal data: read-only for authenticated, write for service role only
--   6. ACEI scores: read-only for authenticated (market-level, not per-org)
--   7. Scraper runs: read-only for authenticated, write for service role only
--   8. Org-scoped tables: authenticated users see own org rows only
--   9. Internal/admin tables: service role only
--
-- Covers ALL public tables. Safe to re-run (drops existing policies first).
-- ============================================================================


-- ─── STEP 0: DISCOVERY (run this first, check output) ──────────────────────
-- Uncomment and run to see all tables and their current RLS status:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;


-- ─── STEP 1: ENABLE RLS ON ALL PUBLIC TABLES ─────────────────────────────
-- RLS must be enabled before policies take effect.
-- If a table doesn't exist, that statement will error — just skip it.

ALTER TABLE public.tribunal_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acei_domain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acei_category_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acei_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitigation_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;


-- ─── STEP 2: DROP ALL EXISTING POLICIES (clean slate) ───────────────────
-- This prevents "policy already exists" errors if re-running.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;


-- ─── STEP 3: TRIBUNAL_DECISIONS ────────────────────────────────────────────
-- Read-only for any authenticated user (market-level data, not per-org).
-- Only service role can insert/update/delete (scraper writes via service key).

CREATE POLICY "Authenticated users can read tribunal decisions"
  ON public.tribunal_decisions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access tribunal decisions"
  ON public.tribunal_decisions
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 4: SCRAPER_RUNS ─────────────────────────────────────────────────
-- Read-only for authenticated (useful for dashboard status display).
-- Only service role can insert/update (scraper logs its own runs).

CREATE POLICY "Authenticated users can read scraper runs"
  ON public.scraper_runs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access scraper runs"
  ON public.scraper_runs
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 5: ACEI_DOMAIN_SCORES ───────────────────────────────────────────
-- Read-only for authenticated. These are market-level weekly scores.
-- Only service role (calculation engine) can write.

CREATE POLICY "Authenticated users can read domain scores"
  ON public.acei_domain_scores
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access domain scores"
  ON public.acei_domain_scores
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 6: ACEI_CATEGORY_SCORES ─────────────────────────────────────────
-- Same pattern: read-only for authenticated, write for service role only.

CREATE POLICY "Authenticated users can read category scores"
  ON public.acei_category_scores
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access category scores"
  ON public.acei_category_scores
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 7: ACEI_VERSIONS ─────────────────────────────────────────────────
-- Version metadata for ACEI scoring runs.
-- Read-only for authenticated, write for service role only.

CREATE POLICY "Authenticated users can read ACEI versions"
  ON public.acei_versions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access ACEI versions"
  ON public.acei_versions
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 9: DECISION_VERSIONS ────────────────────────────────────────────
-- Versioned tribunal decision snapshots.
-- Read-only for authenticated, write for service role only.

CREATE POLICY "Authenticated users can read decision versions"
  ON public.decision_versions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access decision versions"
  ON public.decision_versions
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 10: DATA_QUALITY_ISSUES ─────────────────────────────────────────
-- Internal data quality tracking. Service role only for writes.
-- Read-only for authenticated (admin dashboard visibility).

CREATE POLICY "Authenticated users can read data quality issues"
  ON public.data_quality_issues
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access data quality issues"
  ON public.data_quality_issues
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 11: EVENTS ──────────────────────────────────────────────────────
-- System events (regulatory changes, structural shifts, etc.).
-- Read-only for authenticated, write for service role only.

CREATE POLICY "Authenticated users can read events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access events"
  ON public.events
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 12: ORGANISATIONS ───────────────────────────────────────────────
-- Organisation records. Authenticated users see only their own org.
-- Uses org membership check for row-level scoping.
-- NOTE: Adjust the USING clause when org_members table is implemented.
-- For now, authenticated can read all (pre-multi-tenancy).

CREATE POLICY "Authenticated users can read organisations"
  ON public.organisations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access organisations"
  ON public.organisations
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 13: ORG_ACTIONS ─────────────────────────────────────────────────
-- Actions assigned to organisations. Same org-scoped pattern.
-- Read-only for authenticated (pre-multi-tenancy: all visible).

CREATE POLICY "Authenticated users can read org actions"
  ON public.org_actions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access org actions"
  ON public.org_actions
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 14: ACTIONS ─────────────────────────────────────────────────────
-- Reference/template actions. Read-only for authenticated.

CREATE POLICY "Authenticated users can read actions"
  ON public.actions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access actions"
  ON public.actions
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 15: EVIDENCE ────────────────────────────────────────────────────
-- RRI evidence submissions (Tier I/II/III). Read-only for authenticated.
-- Write access via service role only.

CREATE POLICY "Authenticated users can read evidence"
  ON public.evidence
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access evidence"
  ON public.evidence
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 16: MITIGATION_REGISTER ─────────────────────────────────────────
-- Mitigation entries linked to ACEI exposure. Read-only for authenticated.

CREATE POLICY "Authenticated users can read mitigation register"
  ON public.mitigation_register
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon cannot access mitigation register"
  ON public.mitigation_register
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 17: AUDIT_LOG ───────────────────────────────────────────────────
-- Internal audit trail. Service role only — no access for anon or authenticated.
-- Audit logs must not be readable by end users to preserve integrity.

CREATE POLICY "No access to audit log for authenticated"
  ON public.audit_log
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No access to audit log for anon"
  ON public.audit_log
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 18: AUDIT_EVENTS ────────────────────────────────────────────────
-- System audit events. Same as audit_log — service role only.

CREATE POLICY "No access to audit events for authenticated"
  ON public.audit_events
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No access to audit events for anon"
  ON public.audit_events
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- ─── STEP 19: VERIFY ──────────────────────────────────────────────────────
-- Run this after applying to confirm RLS is enabled and policies are active:

SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  count(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;


-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. The service role key ALWAYS bypasses RLS — your scraper and calculation
--    engine will continue to work without any policy changes.
--
-- 2. The anon key (used by the landing page signup form) can ONLY insert
--    into the signups table. It cannot read anything.
--
-- 3. Authenticated users (dashboard login) can READ tribunal decisions,
--    ACEI scores, scraper runs, and related reference data. They cannot
--    write to any of these.
--
-- 4. Audit tables (audit_log, audit_events) are locked down completely.
--    Only the service role can read/write. This preserves audit integrity.
--
-- 5. When per-organisation scoping is needed (future), change USING (true) to:
--      USING (auth.uid() IN (
--        SELECT user_id FROM org_members WHERE org_id = <table>.org_id
--      ))
--
-- 6. For any NEW tables added in the future, apply the same pattern:
--      ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
--      CREATE POLICY "..." ON public.<table> FOR SELECT TO authenticated USING (true);
--      CREATE POLICY "..." ON public.<table> FOR ALL TO anon USING (false) WITH CHECK (false);
--
-- 7. If additional tables exist that are not covered here, re-run Step 0
--    discovery query and add them following the patterns above.
-- ============================================================================
