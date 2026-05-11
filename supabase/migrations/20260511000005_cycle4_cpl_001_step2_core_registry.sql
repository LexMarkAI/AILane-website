-- AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1 §2.2 W4.1.2 — CPL-001 STEP 2: cohort_entity_register
-- Applied: 2026-05-11 via apply_migration MCP
-- AMD-137 (reserved)
-- MP-01: chk_cer_operating_regions_value_domain CHECK contained subquery to uk_canonical_regions.
--        PostgreSQL rejects (ERRCODE 0A000). Replaced with pure-jsonb shape CHECK plus
--        trg_validate_cer_operating_regions trigger for element value-domain validation.
-- MP-02: chk_cer_sic_codes_format CHECK contained subquery via jsonb_array_elements set-returning fn.
--        PostgreSQL rejects (same ERRCODE). Replaced with shape-only CHECK plus
--        trg_validate_cer_sic_codes trigger for ^\d{5}$ per-element regex validation.

CREATE TABLE public.cohort_entity_register (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  alin                        varchar(15)    NOT NULL UNIQUE,
  employer_master_id          uuid           NULL,
  companies_house_number      varchar(8)     NULL,
  company_name                text           NOT NULL,
  cohort_family               text           NOT NULL,
  cohort_membership_kind      text           NOT NULL DEFAULT 'per-entity',
  size_band                   text           NOT NULL,
  size_band_evidence_basis    text           NULL,
  operating_regions           jsonb          NOT NULL DEFAULT '[]'::jsonb,
  jurisdiction_region_legacy  text           NULL,
  d3_evidence_class           text           NULL,
  market_segments             jsonb          NOT NULL DEFAULT '[]'::jsonb,
  sic_codes                   jsonb          NOT NULL DEFAULT '[]'::jsonb,
  d4_g2_overlay_pending       boolean        NOT NULL DEFAULT true,
  tribunal_count              integer        NOT NULL DEFAULT 0,
  severity_weighted           numeric(12,2)  NOT NULL DEFAULT 0,
  exposure_band               text           NOT NULL DEFAULT 'zero',
  derivative_basis            text           NOT NULL DEFAULT 'none',
  is_repeat_respondent        boolean        GENERATED ALWAYS AS (tribunal_count >= 10) STORED,
  regulatory_profile          jsonb          NOT NULL DEFAULT '[]'::jsonb,
  super_league_tier           text           NULL,
  super_league_tier_basis     text           NULL,
  allocation_status           text           NOT NULL DEFAULT 'active',
  schema_version              text           NOT NULL DEFAULT '1.0',
  evidence_tier               text           NOT NULL DEFAULT 'T5',
  evidence_source_authority   text           NULL,
  recorded_at                 timestamptz    NOT NULL DEFAULT now(),
  ratification_amd_ref        text           NULL,
  superseded_by_decision_id   uuid           NULL,
  notes                       text           NULL,
  CONSTRAINT fk_cer_alin
      FOREIGN KEY (alin) REFERENCES public.alin_cross_reference(alin) ON DELETE RESTRICT,
  CONSTRAINT fk_cer_employer_master
      FOREIGN KEY (employer_master_id) REFERENCES public.employer_master(id) ON DELETE SET NULL,
  CONSTRAINT chk_cer_cohort_family_v1_0 CHECK (cohort_family IN (
    'A','B-Top','B-Brokers','C-Top','D1','D2','E','F','G','H','I','J'
  )),
  CONSTRAINT chk_cer_cohort_membership_kind_v1_0 CHECK (
    cohort_membership_kind IN ('per-entity', 'cohort-aggregate')
  ),
  CONSTRAINT chk_cer_cohort_i_aggregate_only_v1_0 CHECK (
    (cohort_family = 'I' AND cohort_membership_kind = 'cohort-aggregate')
    OR
    (cohort_family <> 'I' AND cohort_membership_kind = 'per-entity')
  ),
  CONSTRAINT chk_cer_size_band_v1_0 CHECK (
    size_band IN ('Mega', 'Large', 'Upper-mid', 'Mid', 'SMB')
  ),
  -- MP-01: shape-only CHECK; element value-domain via trigger
  CONSTRAINT chk_cer_operating_regions_shape_v1_0 CHECK (
    operating_regions = '["pan-UK"]'::jsonb
    OR
    (
      jsonb_typeof(operating_regions) = 'array'
      AND jsonb_array_length(operating_regions) <= 12
      AND NOT (operating_regions @> '["pan-UK"]'::jsonb)
    )
  ),
  -- MP-02: shape-only CHECK; element regex via trigger
  CONSTRAINT chk_cer_sic_codes_shape_v1_0 CHECK (
    jsonb_typeof(sic_codes) = 'array'
  ),
  CONSTRAINT chk_cer_exposure_band_v1_0 CHECK (
    exposure_band IN ('zero', 'low', 'moderate', 'material', 'systemic')
  ),
  CONSTRAINT chk_cer_derivative_basis_v1_0 CHECK (
    derivative_basis IN ('none', 'customer_base', 'portfolio', 'rated_universe')
  ),
  CONSTRAINT chk_cer_super_league_tier_v1_0 CHECK (
    super_league_tier IS NULL OR super_league_tier IN ('S', 'P', 'D')
  ),
  CONSTRAINT chk_cer_allocation_status_v1_0 CHECK (
    allocation_status IN ('active', 'lapsed', 'merged', 'dissolved', 'pending')
  ),
  CONSTRAINT chk_cer_evidence_tier_v1_0 CHECK (
    evidence_tier IN ('T1', 'T2', 'T3', 'T4', 'T5')
  )
);
COMMENT ON TABLE public.cohort_entity_register IS
  'CPL-001 v1.0 §4 — six-dimensional cohort identity registry per R-2 v1.0. v1.1.1 MP-01 + MP-02: operating_regions and sic_codes value-domain enforcement via TRIGGER per PG subquery-in-CHECK restriction.';

-- regulatory_profile element validation trigger
CREATE OR REPLACE FUNCTION public.trg_validate_cer_regulatory_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $func$
DECLARE v_invalid_count int;
BEGIN
  IF jsonb_typeof(NEW.regulatory_profile) = 'array' AND jsonb_array_length(NEW.regulatory_profile) > 0 THEN
    SELECT COUNT(*) INTO v_invalid_count
    FROM jsonb_array_elements_text(NEW.regulatory_profile) AS elem
    WHERE elem NOT IN (SELECT taxonomy_value FROM public.regulatory_profile_taxonomy);
    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'cohort_entity_register.regulatory_profile contains values not in regulatory_profile_taxonomy: %', NEW.regulatory_profile
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_cer_validate_regulatory_profile_before_insert_update
BEFORE INSERT OR UPDATE OF regulatory_profile ON public.cohort_entity_register
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_cer_regulatory_profile();

-- MP-01: operating_regions element validation trigger
CREATE OR REPLACE FUNCTION public.trg_validate_cer_operating_regions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $func$
DECLARE v_invalid_count int;
BEGIN
  IF NEW.operating_regions = '["pan-UK"]'::jsonb THEN RETURN NEW; END IF;
  IF jsonb_array_length(NEW.operating_regions) > 0 THEN
    SELECT COUNT(*) INTO v_invalid_count
    FROM jsonb_array_elements_text(NEW.operating_regions) AS elem
    WHERE elem NOT IN (
      SELECT region_code FROM public.uk_canonical_regions WHERE is_pan_uk_token = false
    );
    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'cohort_entity_register.operating_regions contains region codes not in uk_canonical_regions (non-pan-UK ITL Level 1 set): %', NEW.operating_regions
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_cer_validate_operating_regions_before_insert_update
BEFORE INSERT OR UPDATE OF operating_regions ON public.cohort_entity_register
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_cer_operating_regions();

-- MP-02: sic_codes element regex validation trigger
CREATE OR REPLACE FUNCTION public.trg_validate_cer_sic_codes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $func$
DECLARE v_invalid_count int;
BEGIN
  IF jsonb_array_length(NEW.sic_codes) > 0 THEN
    SELECT COUNT(*) INTO v_invalid_count
    FROM jsonb_array_elements_text(NEW.sic_codes) AS elem
    WHERE elem !~ '^\d{5}$';
    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'cohort_entity_register.sic_codes contains values not matching SIC 2007 5-digit format: %', NEW.sic_codes
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_cer_validate_sic_codes_before_insert_update
BEFORE INSERT OR UPDATE OF sic_codes ON public.cohort_entity_register
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_cer_sic_codes();

CREATE INDEX idx_cer_cohort_family ON public.cohort_entity_register(cohort_family);
CREATE INDEX idx_cer_cohort_family_size_band ON public.cohort_entity_register(cohort_family, size_band);
CREATE INDEX idx_cer_cohort_family_super_league_tier ON public.cohort_entity_register(cohort_family, super_league_tier) WHERE super_league_tier IS NOT NULL;
CREATE INDEX idx_cer_companies_house_number ON public.cohort_entity_register(companies_house_number) WHERE companies_house_number IS NOT NULL;
CREATE INDEX idx_cer_employer_master_id ON public.cohort_entity_register(employer_master_id) WHERE employer_master_id IS NOT NULL;
CREATE INDEX idx_cer_allocation_status ON public.cohort_entity_register(allocation_status);
CREATE INDEX idx_cer_operating_regions_gin ON public.cohort_entity_register USING gin (operating_regions);
CREATE INDEX idx_cer_market_segments_gin ON public.cohort_entity_register USING gin (market_segments);
CREATE INDEX idx_cer_sic_codes_gin ON public.cohort_entity_register USING gin (sic_codes);
CREATE INDEX idx_cer_regulatory_profile_gin ON public.cohort_entity_register USING gin (regulatory_profile);
CREATE INDEX idx_cer_tribunal_count ON public.cohort_entity_register(tribunal_count) WHERE tribunal_count > 0;
CREATE INDEX idx_cer_repeat_respondent ON public.cohort_entity_register(is_repeat_respondent) WHERE is_repeat_respondent = true;

ALTER TABLE public.cohort_entity_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY cer_service_role_all ON public.cohort_entity_register
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY cer_governance_read ON public.cohort_entity_register
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'subscription_tier') IN ('governance', 'institutional'));
