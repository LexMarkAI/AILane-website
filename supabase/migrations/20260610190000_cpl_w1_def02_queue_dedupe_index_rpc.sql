-- AILANE — DEF-CPL-W1-02 remediation (Director ruling, 10 June 2026: options 1+2+3 approved)
-- Estate migration: cpl_w1_def02_queue_dedupe_index_rpc (applied 2026-06-10 via apply_migration MCP).
-- Companion: cpl-universe-delta EF v1.1 (deployed same day, verify_jwt=false preserved) switches
-- both classify_pending enqueue sites to the RPC below; cron job 62 body gains classify_limit=3000;
-- janitor job cpl-queue-dedupe-0110utc added as backstop.

-- 1. One-time dedupe: collapse duplicate pending rows, keep the earliest.
DELETE FROM public.cpl_ingest_queue a
USING public.cpl_ingest_queue b
WHERE a.status = 'pending' AND b.status = 'pending'
  AND a.company_number = b.company_number
  AND a.enqueue_reason = b.enqueue_reason
  AND (a.enqueued_at, a.id) > (b.enqueued_at, b.id);

-- 2. Hard backstop: at most one pending row per (company_number, enqueue_reason).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cplq_pending_company_reason
  ON public.cpl_ingest_queue (company_number, enqueue_reason)
  WHERE status = 'pending';

COMMENT ON INDEX public.uq_cplq_pending_company_reason IS
  'DEF-CPL-W1-02: one pending queue row per (company_number, enqueue_reason). Arbiter for cpl_enqueue_classify_pending ON CONFLICT.';

-- 3. Race-proof enqueue: set-based insert that skips already-pending rows.
--    SECURITY INVOKER; EXECUTE granted to service_role only (queue is
--    service-role-only under RLS).
CREATE OR REPLACE FUNCTION public.cpl_enqueue_classify_pending(
  p_company_numbers text[],
  p_load_batch_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $fn$
DECLARE
  v_inserted integer;
BEGIN
  INSERT INTO public.cpl_ingest_queue (company_number, enqueue_reason, load_batch_id)
  SELECT DISTINCT cn, 'classify_pending', p_load_batch_id
  FROM unnest(p_company_numbers) AS cn
  WHERE cn IS NOT NULL AND length(cn) > 0
  ON CONFLICT (company_number, enqueue_reason) WHERE status = 'pending' DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$fn$;

COMMENT ON FUNCTION public.cpl_enqueue_classify_pending(text[], uuid) IS
  'DEF-CPL-W1-02: idempotent classify_pending enqueue used by cpl-universe-delta v1.1. Returns rows actually inserted.';

REVOKE ALL ON FUNCTION public.cpl_enqueue_classify_pending(text[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cpl_enqueue_classify_pending(text[], uuid) FROM anon;
REVOKE ALL ON FUNCTION public.cpl_enqueue_classify_pending(text[], uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cpl_enqueue_classify_pending(text[], uuid) TO service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Cron changes applied via execute_sql the same day (not part of the estate
-- migration history; recorded here for audit reproducibility; jobname-guarded).
-- ───────────────────────────────────────────────────────────────────────────
DO $crons$
DECLARE
  jid bigint;
BEGIN
  -- job 62: raise nightly classify drain to match Stage-1 inflow.
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'cpl-propagation-tick-0330utc';
  IF jid IS NOT NULL THEN
    PERFORM cron.alter_job(jid, command => $cmd$
      SELECT net.http_post(
        url := 'https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/cpl-propagation-tick',
        headers := jsonb_build_object('Content-Type','application/json'),
        body := '{"mode":"tick","classify_limit":3000}'::jsonb,
        timeout_milliseconds := 300000
      );
    $cmd$);
  END IF;

  -- janitor backstop: nightly duplicate-pending collapse at 01:10 UTC,
  -- before the 01:30 nightly delta.
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cpl-queue-dedupe-0110utc') THEN
    PERFORM cron.schedule(
      'cpl-queue-dedupe-0110utc',
      '10 1 * * *',
      $cmd$
        DELETE FROM public.cpl_ingest_queue a
        USING public.cpl_ingest_queue b
        WHERE a.status = 'pending' AND b.status = 'pending'
          AND a.company_number = b.company_number
          AND a.enqueue_reason = b.enqueue_reason
          AND (a.enqueued_at, a.id) > (b.enqueued_at, b.id);
      $cmd$
    );
  END IF;
END
$crons$;
