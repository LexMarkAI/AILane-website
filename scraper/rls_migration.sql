-- ============================================================================
-- AILANE — ROW LEVEL SECURITY MIGRATION
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
--
-- IMPORTANT: Run the discovery query first (Step 0) to confirm your table
-- names match. Adjust table names below if yours differ.
-- ============================================================================


-- ─── STEP 0: DISCOVERY (run this first, check output) ──────────────────────
-- Uncomment and run to see all tables and their current RLS status:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;


-- ─── STEP 1: ENABLE RLS ON ALL TABLES ──────────────────────────────────────
-- RLS must be enabled before policies take effect.
-- If a table doesn't exist, that statement will error — just skip it.

ALTER TABLE public.tribunal_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acei_domain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acei_category_scores ENABLE ROW LEVEL SECURITY;

-- Email signups — adjust name if yours differs (e.g. email_signups, signups, waitlist)
ALTER TABLE public.signups ENABLE ROW LEVEL SECURITY;


-- ─── STEP 2: DROP EXISTING POLICIES (clean slate) ──────────────────────────
-- This prevents "policy already exists" errors if re-running.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'tribunal_decisions',
        'scraper_runs',
        'acei_domain_scores',
        'acei_category_scores',
        'signups'
      )
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

-- Anon gets nothing
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


-- ─── STEP 7: SIGNUPS (email capture) ──────────────────────────────────────
-- Anon can INSERT only (landing page email capture form).
-- No read access for anon or authenticated — only service role can read.
-- This protects the email list from being scraped.

CREATE POLICY "Anon can submit signups"
  ON public.signups
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon cannot read signups"
  ON public.signups
  FOR SELECT
  TO anon
  USING (false);

CREATE POLICY "Authenticated cannot read signups"
  ON public.signups
  FOR SELECT
  TO authenticated
  USING (false);


-- ─── STEP 8: VERIFY ───────────────────────────────────────────────────────
-- Run this after applying to confirm RLS is enabled and policies are active:

SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  count(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'tribunal_decisions',
    'scraper_runs',
    'acei_domain_scores',
    'acei_category_scores',
    'signups'
  )
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
--    ACEI scores, and scraper runs. They cannot write to any of these.
--
-- 4. If you have additional tables not listed here, run the Step 0 discovery
--    query and add the same pattern:
--      ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
--      CREATE POLICY "..." ON public.<table> FOR SELECT TO authenticated USING (true);
--      CREATE POLICY "..." ON public.<table> FOR ALL TO anon USING (false) WITH CHECK (false);
--
-- 5. When per-organisation scoping is needed (future), change USING (true) to:
--      USING (auth.uid() IN (
--        SELECT user_id FROM org_members WHERE org_id = <table>.org_id
--      ))
--
-- 6. For the RRI tables (future build), apply the same pattern as ACEI scores:
--    read-only for authenticated, write for service role only.
-- ============================================================================
