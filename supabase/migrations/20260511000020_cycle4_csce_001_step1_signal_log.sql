-- AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1 §2.6 W4.1.6 — CSCE-001 STEP 1: csce_signal_log
-- Applied: 2026-05-11 via apply_migration MCP

CREATE TABLE public.csce_signal_log (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_kind                 text           NOT NULL,
  signal_source               text           NOT NULL,
  source_tier                 text           NOT NULL,
  signal_payload              jsonb          NOT NULL,
  signal_summary              text           NULL,
  signal_evidence_url         text           NULL,
  subject_cohort_entity_id    uuid           NOT NULL,
  subject_alin                varchar(15)    NOT NULL,
  subject_companies_house_number varchar(8)  NULL,
  subject_company_name        text           NOT NULL,
  subject_cohort_family       text           NOT NULL,
  subject_cohort_membership_kind text        NOT NULL,
  triggers_dimensional_update boolean        NOT NULL DEFAULT false,
  triggers_lapsed_transition  boolean        NOT NULL DEFAULT false,
  triggers_merger_transfer    boolean        NOT NULL DEFAULT false,
  triggers_dissolved_transition boolean      NOT NULL DEFAULT false,
  triggers_briefing_refresh   boolean        NOT NULL DEFAULT false,
  successor_cohort_entity_id  uuid           NULL,
  signal_detected_at          timestamptz    NOT NULL DEFAULT now(),
  signal_event_at             timestamptz    NULL,
  detection_run_id            uuid           NULL,
  detection_actor             text           NOT NULL,
  schema_version              text           NOT NULL DEFAULT '1.0',
  evidence_tier               text           NOT NULL DEFAULT 'T1',
  recorded_at                 timestamptz    NOT NULL DEFAULT now(),
  superseded_by_signal_id     uuid           NULL,
  notes                       text           NULL,
  CONSTRAINT fk_csl_subject_cohort_entity
      FOREIGN KEY (subject_cohort_entity_id) REFERENCES public.cohort_entity_register(id) ON DELETE RESTRICT,
  CONSTRAINT fk_csl_successor_cohort_entity
      FOREIGN KEY (successor_cohort_entity_id) REFERENCES public.cohort_entity_register(id) ON DELETE RESTRICT,
  CONSTRAINT fk_csl_superseded_by_signal
      FOREIGN KEY (superseded_by_signal_id) REFERENCES public.csce_signal_log(id) ON DELETE NO ACTION,
  CONSTRAINT chk_csl_signal_kind CHECK (signal_kind IN (
    'm_and_a_completion', 'dissolution', 'administration_entry',
    'new_entrant_match', 'tribunal_milestone', 'esg_enforcement',
    'fca_enforcement', 'sra_enforcement', 'ehrc_enforcement',
    'ico_enforcement', 'companies_house_filing', 'fca_permission_change',
    'rebranding', 'demerger', 'listing_event', 'manual_correction'
  )),
  CONSTRAINT chk_csl_source_tier CHECK (source_tier IN ('A', 'B', 'C', 'D')),
  CONSTRAINT chk_csl_subject_cohort_family CHECK (subject_cohort_family IN (
    'A','B-Top','B-Brokers','C-Top','D1','D2','E','F','G','H','I','J'
  )),
  CONSTRAINT chk_csl_subject_cohort_membership_kind CHECK (
    subject_cohort_membership_kind IN ('per-entity', 'cohort-aggregate')
  ),
  CONSTRAINT chk_csl_evidence_tier CHECK (evidence_tier IN ('T1', 'T2', 'T3', 'T4', 'T5')),
  CONSTRAINT chk_csl_merger_transfer_has_successor CHECK (
    (triggers_merger_transfer = false)
    OR
    (triggers_merger_transfer = true AND successor_cohort_entity_id IS NOT NULL)
  ),
  CONSTRAINT chk_csl_detection_actor CHECK (detection_actor IN (
    'csce_nightly_rebuild', 'csce_realtime_detector',
    'manual_chairman', 'manual_cop_review', 'cycle_4_seeding'
  ))
);

COMMENT ON TABLE public.csce_signal_log IS
  'CSCE-001 v1.0 §4 — append-only counterparty signal log. Indexed by per-entity dimensional fingerprint plus signal type plus source tier.';

REVOKE UPDATE, DELETE ON public.csce_signal_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.csce_signal_log FROM authenticated, anon;

CREATE INDEX idx_csl_subject_entity_recorded ON public.csce_signal_log(subject_cohort_entity_id, recorded_at DESC);
CREATE INDEX idx_csl_signal_kind_recorded ON public.csce_signal_log(signal_kind, recorded_at DESC);
CREATE INDEX idx_csl_subject_alin ON public.csce_signal_log(subject_alin);
CREATE INDEX idx_csl_subject_cohort_family_recorded ON public.csce_signal_log(subject_cohort_family, recorded_at DESC);
CREATE INDEX idx_csl_triggers_dimensional_update ON public.csce_signal_log(subject_cohort_entity_id, signal_event_at) WHERE triggers_dimensional_update = true;
CREATE INDEX idx_csl_triggers_lapsed_transition ON public.csce_signal_log(subject_cohort_entity_id) WHERE triggers_lapsed_transition = true;
CREATE INDEX idx_csl_triggers_merger_transfer ON public.csce_signal_log(subject_cohort_entity_id, successor_cohort_entity_id) WHERE triggers_merger_transfer = true;
CREATE INDEX idx_csl_triggers_briefing_refresh ON public.csce_signal_log(subject_cohort_entity_id, recorded_at DESC) WHERE triggers_briefing_refresh = true;
CREATE INDEX idx_csl_source_tier_recorded ON public.csce_signal_log(source_tier, recorded_at DESC);
CREATE INDEX idx_csl_detection_run_id ON public.csce_signal_log(detection_run_id) WHERE detection_run_id IS NOT NULL;
CREATE INDEX idx_csl_signal_payload_gin ON public.csce_signal_log USING gin (signal_payload);

ALTER TABLE public.csce_signal_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY csl_service_role_all ON public.csce_signal_log
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY csl_institutional_read ON public.csce_signal_log
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'subscription_tier') = 'institutional');
