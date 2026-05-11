-- AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1 §2.5 W4.1.5 — CPL-001 STEP 5: eim_check_grant_binding
-- Applied: 2026-05-11 via apply_migration MCP
-- Note: §2.4 (W4.1.4) aggregations migration pre-applied by Chairman via Path A
-- at 2026-05-11 00:00:10 UTC. Source file for §2.4 pending canonical SQL re-issue
-- (Director SHA-256 target: 238f073ddfabd35a0eb70d25be1f221b05960c8d89789ab652baf6f3c4d62465).

CREATE OR REPLACE FUNCTION public.eim_check_grant_binding(
  grant_object jsonb,
  entity_id    uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $func$
DECLARE
  v_entity              public.cohort_entity_register%ROWTYPE;
  v_competitive_set     jsonb;
  v_geographic_scope    jsonb;
  v_market_segments     jsonb;
  v_term_start          date;
  v_term_end            date;
  v_today               date := CURRENT_DATE;
BEGIN
  SELECT * INTO v_entity FROM public.cohort_entity_register cer
  WHERE cer.id = eim_check_grant_binding.entity_id;

  IF NOT FOUND THEN RETURN false; END IF;

  v_competitive_set  := COALESCE(grant_object -> 'competitive_set', '[]'::jsonb);
  v_geographic_scope := COALESCE(grant_object -> 'geographic_scope', '["pan-UK"]'::jsonb);
  v_market_segments  := COALESCE(grant_object -> 'market_segments', '[]'::jsonb);
  v_term_start       := (grant_object ->> 'term_start_date')::date;
  v_term_end         := (grant_object ->> 'term_end_date')::date;

  IF v_today < v_term_start OR v_today > v_term_end THEN RETURN false; END IF;

  IF NOT (v_competitive_set @> to_jsonb(v_entity.cohort_family)) THEN RETURN false; END IF;

  IF v_geographic_scope = '["pan-UK"]'::jsonb THEN
    IF NOT (v_entity.operating_regions = '["pan-UK"]'::jsonb
            OR (SELECT COUNT(*) FROM jsonb_array_elements_text(v_entity.operating_regions)) = 12) THEN
      RETURN false;
    END IF;
  ELSIF v_entity.operating_regions = '["pan-UK"]'::jsonb THEN
    NULL;
  ELSE
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_geographic_scope) AS grant_region
      WHERE NOT (v_entity.operating_regions @> to_jsonb(grant_region))
    ) THEN RETURN false; END IF;
  END IF;

  IF jsonb_array_length(v_market_segments) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_market_segments) AS grant_segment
      WHERE NOT (v_entity.market_segments @> to_jsonb(grant_segment))
    ) THEN RETURN false; END IF;
  END IF;

  RETURN true;
END;
$func$;

COMMENT ON FUNCTION public.eim_check_grant_binding(jsonb, uuid) IS
  'CPL-001 v1.0 §8 — four-condition grant-binding test per R-2 v1.0 §3.2.';

REVOKE ALL ON FUNCTION public.eim_check_grant_binding(jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eim_check_grant_binding(jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.eim_check_grant_binding(jsonb, uuid) TO authenticated;
