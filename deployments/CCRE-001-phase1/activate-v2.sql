-- CCRE-001 Phase B §7 — Activate v2 (Contract Creator live)
-- AILANE-SPEC-CCRE-001 v1.0 (AMD-047)
--
-- RUN ORDER: ONLY after:
--   1. seed-v1.sql executed and verified
--   2. insert-v2.sql executed and verified
--   3. Refactored eileen-intelligence function deployed via Dashboard (§6)
--   4. Function tested on v1 (Test 1 from §8 — normal KL function preserved)
--
-- Effect: next request to eileen-intelligence loads prompt v2.
-- No function redeploy required — platform_config is read on every request.
--
-- Rollback: see rollback-v1.sql — instant, SQL-only.

UPDATE platform_config
SET value = '2'
WHERE key = 'eileen_intelligence_active_version';

-- Confirm the flip:
SELECT key, value, updated_at
FROM platform_config
WHERE key = 'eileen_intelligence_active_version';
