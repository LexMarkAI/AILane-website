-- AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1 §3.4 — Cron registration
-- Applied: 2026-05-11 via execute_sql MCP
-- Uses app.service_role_key passthrough per existing platform pattern
-- (parallel to portal-session-48h-reminder / portal-session-7day-refund crons)

SELECT cron.schedule(
  'csce-realtime-detector-5min',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/csce-realtime-detector',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $cron$
);

SELECT cron.schedule(
  'csce-nightly-rebuild-0230utc',
  '30 2 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/csce-nightly-rebuild',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
