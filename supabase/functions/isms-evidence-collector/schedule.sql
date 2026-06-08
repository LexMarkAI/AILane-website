-- ============================================================================
-- isms-evidence-collector — daily pg_cron schedule   (PHASE B — DO NOT AUTO-APPLY)
-- Brief: AILANE-CC-BRIEF-ISMS-EVIDENCE-001 v1.0 §5
--
-- This file is deliberately NOT under supabase/migrations/ so it is never
-- auto-applied. Apply it ONLY after the isms-evidence-collector Edge Function
-- is deployed (Path A / Chairman MCP) and its env secrets are set — applying it
-- before the function exists would schedule a daily POST to a 404. Apply via
-- apply_migration as `isms_evidence_collector_cron` (brief §6 step 4) — NOT by CC.
--
-- Uses the repo's established cron pattern (parallel to the csce / kl-surveillance
-- crons): /functions/v1/<slug> + app.service_role_key passthrough. The function
-- is verify_jwt:false, so the Bearer header is belt-and-braces, not required.
-- (The brief §5 form omits the header and uses the *.functions.supabase.co host;
-- both endpoints resolve — this aligns to house convention.)
-- ============================================================================

select cron.schedule(
  'isms-evidence-collector-daily',
  '17 6 * * *',
  $cron$
  select net.http_post(
    url := 'https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/isms-evidence-collector',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
