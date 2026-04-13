-- CCRE-001 Phase B §7.1 — Rollback to v1 (disable Contract Creator)
-- AILANE-SPEC-CCRE-001 v1.0 (AMD-047)
--
-- RUN IF: any post-activation test (§8 Tests 1-7) fails, or any regression
-- is detected in the live KL chat after v2 activation.
--
-- Effect: next request loads v1 (original pre-CCRE-001 prompt).
-- Contract Creator workflow becomes dormant immediately.
-- No function redeploy required.
--
-- After rollback:
--   - Re-run §8 Test 1 to confirm normal KL function restored
--   - Report failure details to CEO
--   - v2 row remains in platform_config for forensic review and re-activation

UPDATE platform_config
SET value = '1'
WHERE key = 'eileen_intelligence_active_version';

-- Confirm rollback:
SELECT key, value, updated_at
FROM platform_config
WHERE key = 'eileen_intelligence_active_version';
