-- AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1 §2.8 W4.1.8 — CSCE-001 STEP 3: csce_rebuild_run_log
-- Applied: 2026-05-11 via apply_migration MCP

CREATE TABLE public.csce_rebuild_run_log (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                      uuid           NOT NULL UNIQUE,
  started_at                  timestamptz    NOT NULL DEFAULT now(),
  completed_at                timestamptz    NULL,
  status                      text           NOT NULL DEFAULT 'running',
  prior_rebuild_started_at    timestamptz    NULL,
  operation_results           jsonb          NOT NULL DEFAULT '{}'::jsonb,
  signals_processed_count     integer        NULL,
  dimensional_updates_count   integer        NULL,
  lapsed_transitions_count    integer        NULL,
  dissolved_transitions_count integer        NULL,
  merger_transfers_count      integer        NULL,
  cohort_league_state_rows_inserted integer  NULL,
  briefing_refresh_signals_emitted integer   NULL,
  duration_ms                 integer        NULL,
  error_summary               text           NULL,
  CONSTRAINT chk_csrrl_status CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX idx_csrrl_started_at ON public.csce_rebuild_run_log(started_at DESC);
CREATE INDEX idx_csrrl_status ON public.csce_rebuild_run_log(status);

ALTER TABLE public.csce_rebuild_run_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY csrrl_service_role_all ON public.csce_rebuild_run_log
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY csrrl_institutional_read ON public.csce_rebuild_run_log
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'subscription_tier') = 'institutional');
