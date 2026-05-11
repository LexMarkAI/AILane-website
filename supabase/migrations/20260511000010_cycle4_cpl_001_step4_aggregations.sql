-- AILANE Cycle 4 W4.1.4 — CPL-001 v1.0 §7 STEP 4 Aggregations
-- Chairman Path A pre-application per AAD v1.0; CC commits source post-hoc.
-- v1.1.1 §2.4 corrected per schema-against-reality adjudication (Chairman, 10 May 2026):
--   - canonical_name → normalised_name (employer_master has no canonical_name; canonical row marked via is_canonical boolean)
--   - tribunal_decisions has no FK to employer_master; linkage deferred to Cycle 5 (DEF-CPL-04)
--   - tribunal_enrichment FK to tribunal_decisions is decision_id (not tribunal_decision_id per spec narrative)
--   - tribunal_enrichment has no severity_weighted_score; severity composite design deferred to Cycle 5
-- Matview at Cycle 4 is a STUB: one row per canonical employer_master row with all-zero exposure metrics.
-- Refresh wrapper contract preserved per CSCE-001 §7.4 nightly rebuild Operation 1.

-- =====================================================================
-- §7.1 v_employer_tribunal_exposure — Cycle 4 STUB matview
-- =====================================================================

CREATE MATERIALIZED VIEW public.v_employer_tribunal_exposure AS
SELECT
  em.id                            AS employer_master_id,
  em.normalised_name               AS employer_name,
  0::integer                       AS tribunal_count,
  0::numeric(12,2)                 AS severity_weighted,
  'zero'::text                     AS exposure_band,
  'none'::text                     AS derivative_basis,
  false                            AS is_repeat_respondent,
  NULL::date                       AS most_recent_decision_date,
  now()                            AS computed_at
FROM public.employer_master em
WHERE em.is_canonical = true
WITH DATA;

CREATE UNIQUE INDEX idx_vete_employer_master_id
  ON public.v_employer_tribunal_exposure(employer_master_id);

CREATE INDEX idx_vete_exposure_band
  ON public.v_employer_tribunal_exposure(exposure_band);

CREATE INDEX idx_vete_is_repeat_respondent
  ON public.v_employer_tribunal_exposure(is_repeat_respondent)
  WHERE is_repeat_respondent = true;

COMMENT ON MATERIALIZED VIEW public.v_employer_tribunal_exposure IS
  'CPL-001 v1.0 §7.1 — per-canonical-employer tribunal exposure aggregation. Cycle 4 STUB: tribunal_decisions ↔ employer_master direct linkage is deferred to Cycle 5 (DEF-CPL-04). All rows emit tribunal_count=0 / severity_weighted=0 / exposure_band=zero / is_repeat_respondent=false until Cycle 5 substrate-ratified linkage design (planned: respondent-name canonicalisation via match_aliases + previous_company_names + companies_house_number cross-references; severity composite via tribunal_enrichment award_total + basic_award + compensatory_award + injury_to_feelings + aggravated_damages). Refreshed nightly by CSCE-001 EF; refresh contract preserved.';

-- =====================================================================
-- §7.2 cohort_league_state — per-cohort competitive landscape snapshots
-- =====================================================================

CREATE TABLE public.cohort_league_state (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_family               text           NOT NULL,
  snapshot_at                 timestamptz    NOT NULL DEFAULT now(),
  entity_count_total          integer        NOT NULL DEFAULT 0,
  entity_count_active         integer        NOT NULL DEFAULT 0,
  entity_count_lapsed         integer        NOT NULL DEFAULT 0,
  entity_count_dissolved      integer        NOT NULL DEFAULT 0,
  size_band_distribution      jsonb          NOT NULL DEFAULT '{}'::jsonb,
  super_league_tier_s_count   integer        NOT NULL DEFAULT 0,
  super_league_tier_p_count   integer        NOT NULL DEFAULT 0,
  super_league_tier_d_count   integer        NOT NULL DEFAULT 0,
  exclusivity_available_count integer        NOT NULL DEFAULT 0,
  exclusivity_held_count      integer        NOT NULL DEFAULT 0,
  league_table_position       jsonb          NOT NULL DEFAULT '[]'::jsonb,
  aggregate_metrics           jsonb          NOT NULL DEFAULT '{}'::jsonb,
  rebuild_source              text           NOT NULL DEFAULT 'csce_nightly_rebuild_ef',
  is_latest                   boolean        NOT NULL DEFAULT true,
  recorded_at                 timestamptz    NOT NULL DEFAULT now(),
  notes                       text           NULL,

  CONSTRAINT chk_cls_cohort_family CHECK (cohort_family IN (
    'A','B-Top','B-Brokers','C-Top','D1','D2','E','F','G','H','I','J'
  )),
  CONSTRAINT chk_cls_rebuild_source CHECK (rebuild_source IN (
    'csce_nightly_rebuild_ef',
    'manual_chairman_rebuild',
    'director_attested_rebuild',
    'cycle_5_seeding'
  )),
  CONSTRAINT chk_cls_entity_counts_consistent CHECK (
    entity_count_total = entity_count_active + entity_count_lapsed + entity_count_dissolved
  )
);

CREATE INDEX idx_cls_cohort_family ON public.cohort_league_state(cohort_family);
CREATE INDEX idx_cls_snapshot_at ON public.cohort_league_state(snapshot_at DESC);
CREATE INDEX idx_cls_cohort_family_latest ON public.cohort_league_state(cohort_family, is_latest)
  WHERE is_latest = true;
CREATE UNIQUE INDEX uq_cls_cohort_family_snapshot
  ON public.cohort_league_state(cohort_family, snapshot_at);

COMMENT ON TABLE public.cohort_league_state IS
  'CPL-001 v1.0 §7.2 — per-cohort competitive landscape snapshots. Nightly rebuild by CSCE-001 EF. is_latest flag operative for current-state queries.';

ALTER TABLE public.cohort_league_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY cls_service_role_all ON public.cohort_league_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY cls_governance_read ON public.cohort_league_state
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'subscription_tier') IN ('governance', 'institutional'));

-- =====================================================================
-- §7.3 refresh_v_employer_tribunal_exposure — SECURITY DEFINER refresh wrapper
-- =====================================================================

CREATE OR REPLACE FUNCTION public.refresh_v_employer_tribunal_exposure()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $func$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_employer_tribunal_exposure;
END;
$func$;

COMMENT ON FUNCTION public.refresh_v_employer_tribunal_exposure() IS
  'CPL-001 v1.0 §7.3 — SECURITY DEFINER refresh wrapper. Called by csce-nightly-rebuild EF. Cycle 4 stub matview refresh is a no-op-equivalent (re-emits zero exposure per canonical employer); Cycle 5 will refresh against real linkage data.';

REVOKE ALL ON FUNCTION public.refresh_v_employer_tribunal_exposure() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_v_employer_tribunal_exposure() TO service_role;
