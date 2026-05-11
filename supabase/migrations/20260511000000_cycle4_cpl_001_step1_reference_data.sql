-- AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1 §2.1 W4.1.1 — CPL-001 STEP 1: Reference data
-- Applied: 2026-05-11 via apply_migration MCP
-- AMD-137 (reserved)

-- §5.4.1 — uk_canonical_regions
CREATE TABLE public.uk_canonical_regions (
  region_code           text           PRIMARY KEY,
  region_label          text           NOT NULL,
  itl_level             text           NOT NULL DEFAULT 'ITL Level 1',
  is_pan_uk_token       boolean        NOT NULL DEFAULT false,
  effective_from_date   date           NOT NULL,
  effective_to_date     date           NULL,
  source_authority      text           NOT NULL DEFAULT 'ONS / R-7 v1.0 §4.1',
  recorded_at           timestamptz    NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.uk_canonical_regions IS
  'CPL-001 v1.0 §11.1 (R-7 v1.0 substrate) — canonical 12-region UK schema (ITL Level 1) plus pan-UK token.';

INSERT INTO public.uk_canonical_regions (region_code, region_label, is_pan_uk_token, effective_from_date) VALUES
  ('north-east',                'North East',                false, '2026-05-09'),
  ('north-west',                'North West',                false, '2026-05-09'),
  ('yorkshire-and-the-humber',  'Yorkshire and The Humber',  false, '2026-05-09'),
  ('east-midlands',             'East Midlands',             false, '2026-05-09'),
  ('west-midlands',             'West Midlands',             false, '2026-05-09'),
  ('east-of-england',           'East of England',           false, '2026-05-09'),
  ('london',                    'London',                    false, '2026-05-09'),
  ('south-east',                'South East',                false, '2026-05-09'),
  ('south-west',                'South West',                false, '2026-05-09'),
  ('wales',                     'Wales',                     false, '2026-05-09'),
  ('scotland',                  'Scotland',                  false, '2026-05-09'),
  ('northern-ireland',          'Northern Ireland',          false, '2026-05-09'),
  ('pan-UK',                    'Pan-UK (full 12-region set)', true, '2026-05-09');

ALTER TABLE public.uk_canonical_regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ucr_authenticated_read ON public.uk_canonical_regions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY ucr_service_role_all ON public.uk_canonical_regions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- §5.4.2 — uk_canonical_regions_aliases
CREATE TABLE public.uk_canonical_regions_aliases (
  id                     uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_value            text           NOT NULL,
  canonical_region_code  text           NULL,
  alias_class            text           NOT NULL,
  flag_reason            text           NULL,
  source_authority       text           NOT NULL DEFAULT 'R-7 v1.0 companion CSV',
  recorded_at            timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT chk_ucra_alias_class CHECK (alias_class IN (
    'city_to_itl_1', 'casing_variant', 'historic_county_to_itl_1',
    'modern_county_to_itl_1', 'foreign_non_uk', 'unmappable',
    'too_coarse', 'explicitly_unknown'
  )),
  CONSTRAINT chk_ucra_canonical_or_flag CHECK (
    (canonical_region_code IS NOT NULL AND flag_reason IS NULL)
    OR
    (canonical_region_code IS NULL AND flag_reason IS NOT NULL)
  ),
  CONSTRAINT fk_ucra_canonical
      FOREIGN KEY (canonical_region_code)
      REFERENCES public.uk_canonical_regions(region_code)
      ON DELETE RESTRICT,
  CONSTRAINT uq_ucra_alias UNIQUE (alias_value)
);
CREATE INDEX idx_ucra_canonical_region ON public.uk_canonical_regions_aliases(canonical_region_code) WHERE canonical_region_code IS NOT NULL;
CREATE INDEX idx_ucra_alias_class ON public.uk_canonical_regions_aliases(alias_class);
COMMENT ON TABLE public.uk_canonical_regions_aliases IS
  'CPL-001 v1.0 §11.2 (R-7 v1.0 substrate) — 1,048 legacy-value mappings. Aliases seed deferred to Cycle 5.';
ALTER TABLE public.uk_canonical_regions_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY ucra_authenticated_read ON public.uk_canonical_regions_aliases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY ucra_service_role_all ON public.uk_canonical_regions_aliases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- §5.4.3 — uk_jurisdiction_canonicalisation_lookup
CREATE TABLE public.uk_jurisdiction_canonicalisation_lookup (
  id                     uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_value           text           NOT NULL UNIQUE,
  canonical_outcome      jsonb          NOT NULL,
  recorded_at            timestamptz    NOT NULL DEFAULT now()
);
CREATE INDEX idx_ujcl_canonical_outcome_gin
  ON public.uk_jurisdiction_canonicalisation_lookup USING gin (canonical_outcome);
COMMENT ON TABLE public.uk_jurisdiction_canonicalisation_lookup IS
  'CPL-001 v1.0 §11.2 (R-7 v1.0 substrate) — operational lookup. Population deferred to Cycle 5.';
ALTER TABLE public.uk_jurisdiction_canonicalisation_lookup ENABLE ROW LEVEL SECURITY;
CREATE POLICY ujcl_authenticated_read ON public.uk_jurisdiction_canonicalisation_lookup
  FOR SELECT TO authenticated USING (true);
CREATE POLICY ujcl_service_role_all ON public.uk_jurisdiction_canonicalisation_lookup
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- §5.1 — cohort_size_band_thresholds
CREATE TABLE public.cohort_size_band_thresholds (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_family               text           NOT NULL,
  evidence_basis              text           NOT NULL,
  size_band                   text           NOT NULL,
  threshold_lower             numeric(18,2)  NULL,
  threshold_upper             numeric(18,2)  NULL,
  threshold_unit              text           NOT NULL,
  source_authority            text           NULL,
  recorded_at                 timestamptz    NOT NULL DEFAULT now(),
  superseded_by_decision_id   uuid           NULL,
  notes                       text           NULL,
  CONSTRAINT chk_csbt_size_band CHECK (size_band IN ('Mega', 'Large', 'Upper-mid', 'Mid', 'SMB')),
  CONSTRAINT chk_csbt_cohort_family CHECK (cohort_family IN (
    'A','B-Top','B-Brokers','C-Top','D1','D2','E','F','G','H','I','J'
  )),
  CONSTRAINT chk_csbt_thresholds_ordered CHECK (
    threshold_lower IS NULL OR threshold_upper IS NULL OR threshold_lower < threshold_upper
  ),
  CONSTRAINT uq_csbt_cohort_evidence_band UNIQUE (cohort_family, evidence_basis, size_band)
);
CREATE INDEX idx_csbt_cohort_evidence
  ON public.cohort_size_band_thresholds(cohort_family, evidence_basis);
COMMENT ON TABLE public.cohort_size_band_thresholds IS
  'CPL-001 v1.0 §5.1 — size-band thresholds per cohort and evidence basis per R-2 v1.0 §4.2.7.';

INSERT INTO public.cohort_size_band_thresholds
  (cohort_family, evidence_basis, size_band, threshold_lower, threshold_upper, threshold_unit, source_authority)
VALUES
  ('A', 'turnover-2024', 'Mega',      1000000000, NULL,         'GBP', 'R-2 v1.0 §4.2.4'),
  ('A', 'turnover-2024', 'Large',      250000000, 1000000000,    'GBP', 'R-2 v1.0 §4.2.4'),
  ('A', 'turnover-2024', 'Upper-mid',   50000000,  250000000,    'GBP', 'R-2 v1.0 §4.2.4'),
  ('A', 'turnover-2024', 'Mid',         10000000,   50000000,    'GBP', 'R-2 v1.0 §4.2.4'),
  ('A', 'turnover-2024', 'SMB',         NULL,        10000000,   'GBP', 'R-2 v1.0 §4.2.4');

ALTER TABLE public.cohort_size_band_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY csbt_authenticated_read ON public.cohort_size_band_thresholds
  FOR SELECT TO authenticated USING (true);
CREATE POLICY csbt_service_role_all ON public.cohort_size_band_thresholds
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- §5.2 — cohort_segment_registry
CREATE TABLE public.cohort_segment_registry (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_code                text           NOT NULL UNIQUE,
  segment_kind                text           NOT NULL,
  cohort_family               text           NULL,
  segment_label               text           NOT NULL,
  parent_segment_code         text           NULL,
  source_authority            text           NULL,
  recorded_at                 timestamptz    NOT NULL DEFAULT now(),
  superseded_by_decision_id   uuid           NULL,
  notes                       text           NULL,
  CONSTRAINT chk_csr_segment_kind CHECK (segment_kind IN ('sic-2007', 'g2-overlay')),
  CONSTRAINT chk_csr_g2_overlay_cohort CHECK (
    (segment_kind = 'g2-overlay' AND cohort_family IS NOT NULL)
    OR
    (segment_kind = 'sic-2007' AND cohort_family IS NULL)
  ),
  CONSTRAINT chk_csr_cohort_family_v1_0 CHECK (
    cohort_family IS NULL OR cohort_family IN (
      'A','B-Top','B-Brokers','C-Top','D1','D2','E','F','G','H','I','J'
    )
  )
);
CREATE INDEX idx_csr_cohort_family ON public.cohort_segment_registry(cohort_family) WHERE cohort_family IS NOT NULL;
CREATE INDEX idx_csr_segment_kind ON public.cohort_segment_registry(segment_kind);
COMMENT ON TABLE public.cohort_segment_registry IS
  'CPL-001 v1.0 §5.2 — D4 segment taxonomy per R-2 v1.0 §4.4.';
ALTER TABLE public.cohort_segment_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY csr_authenticated_read ON public.cohort_segment_registry
  FOR SELECT TO authenticated USING (true);
CREATE POLICY csr_service_role_all ON public.cohort_segment_registry
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- §5.3 — regulatory_profile_taxonomy
CREATE TABLE public.regulatory_profile_taxonomy (
  taxonomy_value              text           PRIMARY KEY,
  description                 text           NOT NULL,
  attestation_authority       text           NOT NULL,
  effective_from_date         date           NOT NULL,
  effective_to_date           date           NULL,
  superseded_by_decision_id   uuid           NULL,
  recorded_at                 timestamptz    NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.regulatory_profile_taxonomy IS
  'CPL-001 v1.0 §5.3 — D6 regulatory profile taxonomy per R-2 v1.0 §4.6.7.';

INSERT INTO public.regulatory_profile_taxonomy
  (taxonomy_value, description, attestation_authority, effective_from_date)
VALUES
  ('FCA-authorised',         'FCA-authorised firm holding direct Part 4A permission', 'FCA Register', '2026-05-09'),
  ('FCA-authorised-AR',      'FCA Appointed Representative under principal firm',     'FCA Register', '2026-05-09'),
  ('FCA-authorised-EMI',     'FCA Electronic Money Institution',                       'FCA Register', '2026-05-09'),
  ('FCA-Mutuals-registered', 'Registered under the FCA Mutuals Public Register',       'FCA Mutuals Public Register', '2026-05-09'),
  ('listed-Main-Market-Premium', 'Listed on LSE Main Market Premium segment',          'LSE',          '2026-05-09'),
  ('listed-AIM',             'Listed on LSE AIM',                                      'LSE',          '2026-05-09'),
  ('SRA-regulated',          'SRA-regulated solicitors firm',                          'SRA',          '2026-05-09'),
  ('public-body-statutory',  'Public-sector body operating under statutory framework', 'gov.uk',       '2026-05-09'),
  ('charity-regulator-CCEW', 'Registered with Charity Commission for England and Wales', 'CCEW',       '2026-05-09'),
  ('unregulated-commercial', 'Commercial entity holding no regulator-attested status', 'self-attested', '2026-05-09');

ALTER TABLE public.regulatory_profile_taxonomy ENABLE ROW LEVEL SECURITY;
CREATE POLICY rpt_authenticated_read ON public.regulatory_profile_taxonomy
  FOR SELECT TO authenticated USING (true);
CREATE POLICY rpt_service_role_all ON public.regulatory_profile_taxonomy
  FOR ALL TO service_role USING (true) WITH CHECK (true);
