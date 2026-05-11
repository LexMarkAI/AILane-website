-- AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1 §2.7 W4.1.7 — CSCE-001 STEP 2: csce_corporate_group_membership
-- Applied: 2026-05-11 via apply_migration MCP
-- MP-04: fk_csgm_superseded_by_decision FK reference patched from
--        cohort_decision_log(id) to cohort_decision_log(decision_id) — the verified PK
--        column name per AMD-127. Packet typo against §2.3's 4 correct decision_id references.
--        Mechanical correction toward verified ground-truth schema.

CREATE TABLE public.csce_corporate_group_membership (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_entity_id            uuid           NOT NULL,
  corporate_group_id          uuid           NOT NULL,
  corporate_group_name        text           NOT NULL,
  ownership_basis             text           NOT NULL,
  effective_from              date           NOT NULL,
  effective_to                date           NULL,
  evidence_tier               text           NOT NULL DEFAULT 'T2',
  evidence_source_authority   text           NULL,
  recorded_at                 timestamptz    NOT NULL DEFAULT now(),
  superseded_by_decision_id   uuid           NULL,
  notes                       text           NULL,
  CONSTRAINT chk_csgm_ownership_basis CHECK (ownership_basis IN (
    'wholly_owned_subsidiary', 'majority_owned', 'minority_owned',
    'common_ubo', 'manual_chairman_attestation'
  )),
  CONSTRAINT chk_csgm_evidence_tier CHECK (evidence_tier IN ('T1', 'T2', 'T3', 'T4', 'T5')),
  CONSTRAINT chk_csgm_effective_dates CHECK (
    effective_to IS NULL OR effective_to > effective_from
  ),
  CONSTRAINT fk_csgm_cohort_entity
      FOREIGN KEY (cohort_entity_id) REFERENCES public.cohort_entity_register(id) ON DELETE RESTRICT,
  -- MP-04 patch
  CONSTRAINT fk_csgm_superseded_by_decision
      FOREIGN KEY (superseded_by_decision_id) REFERENCES public.cohort_decision_log(decision_id) ON DELETE NO ACTION
);

CREATE INDEX idx_csgm_cohort_entity ON public.csce_corporate_group_membership(cohort_entity_id);
CREATE INDEX idx_csgm_corporate_group_id ON public.csce_corporate_group_membership(corporate_group_id);
CREATE INDEX idx_csgm_corporate_group_name ON public.csce_corporate_group_membership(corporate_group_name);

COMMENT ON TABLE public.csce_corporate_group_membership IS
  'CSCE-001 v1.0 §6.1 — operating-entity-to-corporate-group membership resolution.';

ALTER TABLE public.csce_corporate_group_membership ENABLE ROW LEVEL SECURITY;

CREATE POLICY csgm_service_role_all ON public.csce_corporate_group_membership
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY csgm_governance_institutional_read ON public.csce_corporate_group_membership
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'subscription_tier') IN ('governance', 'institutional'));
