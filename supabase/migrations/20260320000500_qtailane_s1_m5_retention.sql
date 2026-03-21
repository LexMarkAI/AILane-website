-- ============================================================
-- QTAILANE STAGE 1 — MIGRATION 5: RETENTION ENFORCEMENT
-- Authority: QTAILANE-GOV-002 §7.4 / GDPR data minimisation
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- MARKET DATA: 90-day rolling retention (raw tick data)
-- Runs daily via pg_cron or Supabase scheduled function.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qtailane_purge_expired_market_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM qtailane_market_data
  WHERE created_at < now() - interval '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the purge to audit trail
  INSERT INTO qtailane_audit_log (action, action_category, severity, actor_type, actor_id, detail)
  VALUES (
    'MARKET_DATA_PURGE',
    'SYSTEM',
    'INFO',
    'SYSTEM',
    'retention_enforcer',
    jsonb_build_object('deleted_count', deleted_count, 'cutoff', now() - interval '90 days')
  );

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule: Enable pg_cron extension if available, or call from Edge Function daily
-- SELECT cron.schedule('qtailane-market-data-purge', '0 3 * * *', 'SELECT qtailane_purge_expired_market_data()');

-- ────────────────────────────────────────────────────────────
-- SCHEMA SEPARATION AUDIT FUNCTION
-- Verifies no cross-schema foreign keys exist.
-- Run nightly or on-demand.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qtailane_schema_separation_audit()
RETURNS TABLE(violation TEXT) AS $$
BEGIN
  -- Check for FKs from qtailane_ tables to non-qtailane_ tables
  RETURN QUERY
  SELECT format('FK VIOLATION: %s.%s references %s.%s via constraint %s',
    tc.table_schema, tc.table_name,
    ccu.table_schema, ccu.table_name,
    tc.constraint_name
  )
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name LIKE 'qtailane_%'
    AND NOT ccu.table_name LIKE 'qtailane_%';

  -- Check for FKs from non-qtailane_ tables to qtailane_ tables
  RETURN QUERY
  SELECT format('FK VIOLATION: %s.%s references %s.%s via constraint %s',
    tc.table_schema, tc.table_name,
    ccu.table_schema, ccu.table_name,
    tc.constraint_name
  )
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND NOT tc.table_name LIKE 'qtailane_%'
    AND ccu.table_name LIKE 'qtailane_%';
END;
$$ LANGUAGE plpgsql;
