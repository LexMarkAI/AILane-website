-- AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1 §2.9 W4.1.9 — CSCE-001 STEP 4: group-RAG + product-fit functions
-- Applied: 2026-05-11 via apply_migration MCP
-- MP-05: csce_product_fit_routing v_recent_signals aggregation refactored. Packet had
--        ORDER BY/LIMIT directly on jsonb_agg (invalid PG syntax — aggregate functions
--        do not accept positional ORDER BY/LIMIT). Wrapped in subquery to preserve
--        top-20-most-recent semantics. Semantic equivalence: identical output ordering.

CREATE OR REPLACE FUNCTION public.csce_group_dimensional_aggregate(
  p_corporate_group_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'corporate_group_id', p_corporate_group_id,
    'operating_entity_count', COUNT(DISTINCT csgm.cohort_entity_id),
    'cohort_families_represented',
      jsonb_agg(DISTINCT cer.cohort_family) FILTER (WHERE cer.cohort_family IS NOT NULL),
    'size_bands_represented',
      jsonb_agg(DISTINCT cer.size_band) FILTER (WHERE cer.size_band IS NOT NULL),
    'operating_regions_union',
      (
        SELECT jsonb_agg(DISTINCT region_code)
        FROM (
          SELECT DISTINCT (jsonb_array_elements_text(cer2.operating_regions)) AS region_code
          FROM public.csce_corporate_group_membership csgm2
          JOIN public.cohort_entity_register cer2 ON cer2.id = csgm2.cohort_entity_id
          WHERE csgm2.corporate_group_id = p_corporate_group_id AND csgm2.effective_to IS NULL
        ) regions
      ),
    'market_segments_union',
      (
        SELECT jsonb_agg(DISTINCT segment)
        FROM (
          SELECT DISTINCT (jsonb_array_elements_text(cer2.market_segments)) AS segment
          FROM public.csce_corporate_group_membership csgm2
          JOIN public.cohort_entity_register cer2 ON cer2.id = csgm2.cohort_entity_id
          WHERE csgm2.corporate_group_id = p_corporate_group_id AND csgm2.effective_to IS NULL
        ) segments
      ),
    'tribunal_count_total', SUM(cer.tribunal_count),
    'severity_weighted_total', SUM(cer.severity_weighted),
    'is_repeat_respondent_at_group_level', (SUM(cer.tribunal_count) >= 10),
    'regulatory_profile_union',
      (
        SELECT jsonb_agg(DISTINCT profile)
        FROM (
          SELECT DISTINCT (jsonb_array_elements_text(cer2.regulatory_profile)) AS profile
          FROM public.csce_corporate_group_membership csgm2
          JOIN public.cohort_entity_register cer2 ON cer2.id = csgm2.cohort_entity_id
          WHERE csgm2.corporate_group_id = p_corporate_group_id AND csgm2.effective_to IS NULL
        ) profiles
      )
  ) INTO v_result
  FROM public.csce_corporate_group_membership csgm
  JOIN public.cohort_entity_register cer ON cer.id = csgm.cohort_entity_id
  WHERE csgm.corporate_group_id = p_corporate_group_id AND csgm.effective_to IS NULL;
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.csce_group_dimensional_aggregate FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.csce_group_dimensional_aggregate TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.csce_group_recent_signals(
  p_corporate_group_id uuid,
  p_lookback_days      integer DEFAULT 90,
  p_signal_kinds       text[]  DEFAULT NULL,
  p_max_results        integer DEFAULT 100
)
RETURNS TABLE (
  signal_id           uuid,
  signal_kind         text,
  signal_source       text,
  source_tier         text,
  subject_company_name text,
  subject_alin        varchar(15),
  signal_summary      text,
  signal_payload      jsonb,
  signal_event_at     timestamptz,
  recorded_at         timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT csl.id, csl.signal_kind, csl.signal_source, csl.source_tier,
    csl.subject_company_name, csl.subject_alin, csl.signal_summary,
    csl.signal_payload, csl.signal_event_at, csl.recorded_at
  FROM public.csce_signal_log csl
  JOIN public.csce_corporate_group_membership csgm
    ON csgm.cohort_entity_id = csl.subject_cohort_entity_id
   AND csgm.corporate_group_id = p_corporate_group_id
   AND csgm.effective_to IS NULL
  WHERE csl.recorded_at >= now() - (p_lookback_days || ' days')::interval
    AND (p_signal_kinds IS NULL OR csl.signal_kind = ANY(p_signal_kinds))
    AND csl.superseded_by_signal_id IS NULL
  ORDER BY csl.recorded_at DESC
  LIMIT p_max_results;
$$;

REVOKE EXECUTE ON FUNCTION public.csce_group_recent_signals FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.csce_group_recent_signals TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.csce_product_fit_routing(
  p_entity_id     uuid,
  p_query_options jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_entity                    public.cohort_entity_register%ROWTYPE;
  v_recent_signals            jsonb;
  v_group_aggregate           jsonb;
  v_corporate_group_id        uuid;
  v_recent_signal_kinds       jsonb;
  v_briefing_variants_recommended jsonb;
  v_pricing_anchor_band       text;
  v_exposure_segment          text;
  v_size_band_segment         text;
  v_regulatory_segment        text;
  v_super_league_segment      text;
BEGIN
  SELECT * INTO v_entity FROM public.cohort_entity_register
  WHERE id = p_entity_id AND allocation_status IN ('active', 'pending');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('fit_outcome', 'entity_not_found_or_inactive', 'entity_id', p_entity_id);
  END IF;

  SELECT corporate_group_id INTO v_corporate_group_id
  FROM public.csce_corporate_group_membership
  WHERE cohort_entity_id = p_entity_id AND effective_to IS NULL LIMIT 1;

  -- MP-05: subquery wrapper to apply LIMIT before jsonb_agg
  SELECT jsonb_agg(jsonb_build_object(
    'signal_kind', csl.signal_kind,
    'recorded_at', csl.recorded_at,
    'signal_summary', csl.signal_summary
  ) ORDER BY csl.recorded_at DESC) INTO v_recent_signals
  FROM (
    SELECT signal_kind, recorded_at, signal_summary
    FROM public.csce_signal_log
    WHERE subject_cohort_entity_id = p_entity_id
      AND recorded_at >= now() - INTERVAL '90 days'
      AND superseded_by_signal_id IS NULL
    ORDER BY recorded_at DESC LIMIT 20
  ) csl;

  SELECT jsonb_agg(DISTINCT signal_kind) INTO v_recent_signal_kinds
  FROM public.csce_signal_log
  WHERE subject_cohort_entity_id = p_entity_id
    AND recorded_at >= now() - INTERVAL '90 days'
    AND superseded_by_signal_id IS NULL;

  IF v_corporate_group_id IS NOT NULL THEN
    SELECT public.csce_group_dimensional_aggregate(v_corporate_group_id) INTO v_group_aggregate;
  END IF;

  v_pricing_anchor_band   := v_entity.size_band;
  v_exposure_segment      := v_entity.exposure_band;
  v_size_band_segment     := v_entity.size_band;
  v_regulatory_segment    := COALESCE(v_entity.regulatory_profile->>0, 'unregulated-commercial');
  v_super_league_segment  := COALESCE(v_entity.super_league_tier, 'unstratified');

  v_briefing_variants_recommended := jsonb_build_array();
  v_briefing_variants_recommended := v_briefing_variants_recommended || to_jsonb('cohort_allocation'::text);

  IF v_entity.cohort_family IN ('A','B-Top','B-Brokers','C-Top','D1','D2','E','F','H','J') THEN
    v_briefing_variants_recommended := v_briefing_variants_recommended || to_jsonb('sector_aggregate_intelligence'::text);
  END IF;

  IF v_entity.exposure_band IN ('moderate','material','systemic')
     OR v_entity.cohort_family IN ('A','B-Top','C-Top','E') THEN
    v_briefing_variants_recommended := v_briefing_variants_recommended || to_jsonb('per_counterparty_risk_exposure'::text);
  END IF;

  IF v_entity.cohort_family IN ('A','B-Top','B-Brokers','C-Top','D1','D2','E','J')
     AND v_entity.cohort_membership_kind = 'per-entity' THEN
    v_briefing_variants_recommended := v_briefing_variants_recommended || to_jsonb('cohort_exclusivity_availability'::text);
  END IF;

  v_briefing_variants_recommended := v_briefing_variants_recommended || to_jsonb('ratified_pricing_parameter'::text);

  RETURN jsonb_build_object(
    'fit_outcome', 'resolved',
    'entity_id', p_entity_id,
    'cohort_family', v_entity.cohort_family,
    'cohort_membership_kind', v_entity.cohort_membership_kind,
    'super_league_tier', v_entity.super_league_tier,
    'allocation_status', v_entity.allocation_status,
    'joint_state_segmentation', jsonb_build_object(
      'pricing_anchor_band', v_pricing_anchor_band,
      'exposure_segment', v_exposure_segment,
      'size_band_segment', v_size_band_segment,
      'regulatory_segment', v_regulatory_segment,
      'super_league_segment', v_super_league_segment
    ),
    'recent_signal_kinds_90d', v_recent_signal_kinds,
    'recent_signals_top_20', v_recent_signals,
    'corporate_group_id', v_corporate_group_id,
    'group_dimensional_aggregate', v_group_aggregate,
    'briefing_variants_recommended', v_briefing_variants_recommended,
    'computed_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.csce_product_fit_routing IS
  'CSCE-001 v1.0 §8 — configurator-facing product-fit routing API per R-2 v1.0 §8.3.';

REVOKE EXECUTE ON FUNCTION public.csce_product_fit_routing FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.csce_product_fit_routing TO authenticated, service_role;
