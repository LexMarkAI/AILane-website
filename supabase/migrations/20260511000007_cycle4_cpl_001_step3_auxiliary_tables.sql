-- AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1 §2.3 W4.1.3 — CPL-001 STEP 3: auxiliary tables
-- Applied: 2026-05-11 via apply_migration MCP
-- AMD-137 (reserved)
-- MP-03 applied: trg_eca_set_updated_at gains SET search_path = public, pg_catalog (RULE 5)

-- §6.2 cohort_decision_log assertion (AMD-127 baseline; no-op guard)
DO $assert_cdl$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='cohort_decision_log'
  ) THEN
    RAISE EXCEPTION 'cohort_decision_log expected at AMD-127 schema but not found';
  END IF;
END
$assert_cdl$;

REVOKE ALL ON public.cohort_decision_log FROM PUBLIC;
REVOKE ALL ON public.cohort_decision_log FROM authenticated;
REVOKE ALL ON public.cohort_decision_log FROM anon;
GRANT SELECT ON public.cohort_decision_log TO authenticated;

-- §6.1 cohort_entity_aliases
CREATE TABLE IF NOT EXISTS public.cohort_entity_aliases (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id                   uuid           NOT NULL,
  alias_value                 text           NOT NULL,
  alias_kind                  text           NOT NULL,
  alias_authority             text           NOT NULL,
  effective_from_date         date           NOT NULL DEFAULT CURRENT_DATE,
  effective_to_date           date           NULL,
  source_decision_id          uuid           NULL,
  recorded_at                 timestamptz    NOT NULL DEFAULT now(),
  notes                       text           NULL,
  CONSTRAINT fk_cea_entity_id
      FOREIGN KEY (entity_id) REFERENCES public.cohort_entity_register(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cea_source_decision
      FOREIGN KEY (source_decision_id) REFERENCES public.cohort_decision_log(decision_id) ON DELETE SET NULL,
  CONSTRAINT chk_cea_alias_kind CHECK (alias_kind IN (
    'predecessor_name', 'casing_variant', 'abbreviation',
    'trading_name', 'historic_name', 'ma_successor_link', 'ma_predecessor_link'
  )),
  CONSTRAINT chk_cea_effective_dates CHECK (
    effective_to_date IS NULL OR effective_to_date >= effective_from_date
  ),
  CONSTRAINT uq_cea_entity_alias UNIQUE (entity_id, alias_value, alias_kind)
);

CREATE INDEX IF NOT EXISTS idx_cea_entity_id        ON public.cohort_entity_aliases(entity_id);
CREATE INDEX IF NOT EXISTS idx_cea_alias_value_ci   ON public.cohort_entity_aliases(LOWER(alias_value));
CREATE INDEX IF NOT EXISTS idx_cea_alias_kind       ON public.cohort_entity_aliases(alias_kind);
CREATE INDEX IF NOT EXISTS idx_cea_effective_window ON public.cohort_entity_aliases(effective_from_date, effective_to_date);

COMMENT ON TABLE public.cohort_entity_aliases IS
  'CPL-001 v1.0 §6.1 — alias tracking. Append-only via service_role; governance tier read.';

ALTER TABLE public.cohort_entity_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_entity_aliases FORCE ROW LEVEL SECURITY;

CREATE POLICY cea_service_role_all ON public.cohort_entity_aliases
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY cea_governance_read ON public.cohort_entity_aliases
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'subscription_tier') IN ('governance', 'institutional'));

REVOKE INSERT, UPDATE, DELETE ON public.cohort_entity_aliases FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cohort_entity_aliases FROM anon;

-- §6.3 eim_cohort_allocations
CREATE TABLE IF NOT EXISTS public.eim_cohort_allocations (
  allocation_id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id                   uuid           NOT NULL,
  cohort_code                 text           NOT NULL,
  package_code                text           NOT NULL,
  scope_kind                  text           NOT NULL,
  geographic_scope            jsonb          NOT NULL DEFAULT '[]'::jsonb,
  market_segments             jsonb          NOT NULL DEFAULT '[]'::jsonb,
  competitive_set             jsonb          NOT NULL DEFAULT '[]'::jsonb,
  exclusivity_kind            text           NOT NULL DEFAULT 'non_exclusive',
  term_start_date             date           NOT NULL,
  term_end_date               date           NOT NULL,
  renewal_behaviour           text           NOT NULL DEFAULT 'manual_review',
  allocation_status           text           NOT NULL DEFAULT 'pending',
  contract_value_gbp          numeric(14,2)  NULL,
  ratification_amd_ref        text           NULL,
  source_decision_id          uuid           NULL,
  superseded_by_decision_id   uuid           NULL,
  lae_attestations            jsonb          NOT NULL DEFAULT '{}'::jsonb,
  jipa_archetype_pending      boolean        NOT NULL DEFAULT false,
  recorded_at                 timestamptz    NOT NULL DEFAULT now(),
  updated_at                  timestamptz    NOT NULL DEFAULT now(),
  notes                       text           NULL,
  CONSTRAINT fk_eca_entity_id
      FOREIGN KEY (entity_id) REFERENCES public.cohort_entity_register(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eca_source_decision
      FOREIGN KEY (source_decision_id) REFERENCES public.cohort_decision_log(decision_id) ON DELETE SET NULL,
  CONSTRAINT fk_eca_superseded_by
      FOREIGN KEY (superseded_by_decision_id) REFERENCES public.cohort_decision_log(decision_id) ON DELETE SET NULL,
  CONSTRAINT chk_eca_cohort_code_v1_0 CHECK (cohort_code IN (
    'A','B-Top','B-Brokers','C-Top','D1','D2','E','F','G','H','I','J'
  )),
  CONSTRAINT chk_eca_scope_kind CHECK (scope_kind IN (
    'per_entity', 'cohort_aggregate', 'regional_corridor', 'sector_corridor', 'enterprise_bespoke'
  )),
  CONSTRAINT chk_eca_exclusivity_kind CHECK (exclusivity_kind IN (
    'exclusive', 'non_exclusive', 'observer', 'enterprise_bespoke'
  )),
  CONSTRAINT chk_eca_renewal_behaviour CHECK (renewal_behaviour IN (
    'auto_renew', 'manual_review', 'fixed_term_lapse', 'evergreen'
  )),
  CONSTRAINT chk_eca_allocation_status CHECK (allocation_status IN (
    'pending', 'active', 'lapsed', 'superseded', 'merged', 'dissolved', 'cancelled'
  )),
  CONSTRAINT chk_eca_term_window CHECK (term_end_date >= term_start_date),
  CONSTRAINT chk_eca_contract_value CHECK (
    contract_value_gbp IS NULL OR contract_value_gbp >= 0
  ),
  CONSTRAINT chk_eca_geographic_scope_array CHECK (jsonb_typeof(geographic_scope) = 'array'),
  CONSTRAINT chk_eca_market_segments_array CHECK (jsonb_typeof(market_segments) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_eca_entity_id              ON public.eim_cohort_allocations(entity_id);
CREATE INDEX IF NOT EXISTS idx_eca_cohort_code            ON public.eim_cohort_allocations(cohort_code);
CREATE INDEX IF NOT EXISTS idx_eca_allocation_status      ON public.eim_cohort_allocations(allocation_status);
CREATE INDEX IF NOT EXISTS idx_eca_active_term            ON public.eim_cohort_allocations(term_start_date, term_end_date) WHERE allocation_status = 'active';
CREATE INDEX IF NOT EXISTS idx_eca_jipa_archetype_pending ON public.eim_cohort_allocations(jipa_archetype_pending) WHERE jipa_archetype_pending = true;
CREATE INDEX IF NOT EXISTS idx_eca_geographic_scope_gin   ON public.eim_cohort_allocations USING gin (geographic_scope);
CREATE INDEX IF NOT EXISTS idx_eca_market_segments_gin    ON public.eim_cohort_allocations USING gin (market_segments);
CREATE INDEX IF NOT EXISTS idx_eca_competitive_set_gin    ON public.eim_cohort_allocations USING gin (competitive_set);

COMMENT ON TABLE public.eim_cohort_allocations IS
  'CPL-001 v1.0 §6.3 + EIM-001 v1.0 §8.1 Stage 7 — operational allocation table. lae_attestations + jipa_archetype_pending per EIM-001 §11.4.3 + §11.5.1.';

ALTER TABLE public.eim_cohort_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY eca_service_role_all ON public.eim_cohort_allocations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY eca_governance_read ON public.eim_cohort_allocations
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'subscription_tier') IN ('governance', 'institutional'));

-- MP-03: search_path pinned
CREATE OR REPLACE FUNCTION public.trg_eca_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $trg$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$trg$;

DROP TRIGGER IF EXISTS trg_eca_updated_at ON public.eim_cohort_allocations;
CREATE TRIGGER trg_eca_updated_at
  BEFORE UPDATE ON public.eim_cohort_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_eca_set_updated_at();

-- §6.4 Deferred FK on cohort_entity_register → cohort_decision_log
DO $add_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_cer_superseded_by_decision'
      AND conrelid = 'public.cohort_entity_register'::regclass
  ) THEN
    ALTER TABLE public.cohort_entity_register
      ADD CONSTRAINT fk_cer_superseded_by_decision
        FOREIGN KEY (superseded_by_decision_id)
        REFERENCES public.cohort_decision_log(decision_id)
        ON DELETE SET NULL;
  END IF;
END
$add_fk$;
