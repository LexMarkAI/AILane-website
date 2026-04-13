-- CCRE-001 Phase B — Verification queries
-- AILANE-SPEC-CCRE-001 v1.0 (AMD-047)
--
-- Run the relevant block at each verification gate.
-- Each block is independent — no ordering dependency between blocks.

-- =============================================================
-- §4.3 — Seed verification (after seed-v1.sql)
-- Expected: 2 rows.
--   eileen_intelligence_active_version  → length 1 (the character '1')
--   eileen_intelligence_prompt_v1       → length approx 7,500 chars
-- =============================================================

SELECT key, LENGTH(value) AS value_length
FROM platform_config
WHERE key LIKE 'eileen_intelligence_%'
ORDER BY key;

-- =============================================================
-- §4.4 — Content integrity check for v1
-- All three checks must pass (✓). If any ✗ appears, the seed is
-- corrupt — DELETE FROM platform_config WHERE key = 'eileen_intelligence_prompt_v1';
-- and re-run seed-v1.sql.
-- =============================================================

SELECT
  CASE WHEN value LIKE '%PLUGIN-001%'             THEN 'PLUGIN-001 present'
       ELSE 'MISSING PLUGIN-001' END                               AS check_plugin,
  CASE WHEN value LIKE '%intelligence entity%' OR value LIKE '%Eileen%'
                                                 THEN 'Eileen identity present'
       ELSE 'MISSING Eileen identity' END                          AS check_identity,
  CASE WHEN value LIKE '%NEVER draft%'            THEN 'Drafting refusal present'
       ELSE 'MISSING drafting refusal' END                         AS check_drafting,
  CASE WHEN value LIKE '%KLAC-001-AM-006%'        THEN 'Compliance routing present'
       ELSE 'MISSING compliance routing' END                       AS check_routing,
  CASE WHEN value LIKE '%17035654%'               THEN 'Tier 4 disclaimer present'
       ELSE 'MISSING Tier 4 disclaimer' END                        AS check_disclaimer,
  LENGTH(value)                                                    AS total_length
FROM platform_config
WHERE key = 'eileen_intelligence_prompt_v1';

-- =============================================================
-- §5.1 — v2 verification (after insert-v2.sql)
-- All three CC-specific checks must pass.
-- =============================================================

SELECT
  key,
  LENGTH(value) AS value_length,
  CASE WHEN value LIKE '%CONTRACT CREATOR%'              THEN 'CC section present'
       ELSE 'CC section MISSING' END                                AS cc_check,
  CASE WHEN value LIKE '%PLUGIN-001%'                    THEN 'PLUGIN-001 present'
       ELSE 'PLUGIN-001 MISSING' END                                AS plugin_check,
  CASE WHEN value LIKE '%REQUIREMENT ASSEMBLY ENGINE%'   THEN 'Fundamental principle present'
       ELSE 'MISSING principle' END                                 AS principle_check,
  CASE WHEN value LIKE '%AMD-047%'                       THEN 'AMD-047 ref present'
       ELSE 'AMD-047 ref MISSING' END                               AS amd_check
FROM platform_config
WHERE key = 'eileen_intelligence_prompt_v2';

-- =============================================================
-- §5.1 — Length comparison (v2 must be strictly larger than v1)
-- cc_section_size should be ~8,000-12,000 characters.
-- =============================================================

SELECT
  (SELECT LENGTH(value) FROM platform_config WHERE key = 'eileen_intelligence_prompt_v1') AS v1_length,
  (SELECT LENGTH(value) FROM platform_config WHERE key = 'eileen_intelligence_prompt_v2') AS v2_length,
  (SELECT LENGTH(value) FROM platform_config WHERE key = 'eileen_intelligence_prompt_v2')
    - (SELECT LENGTH(value) FROM platform_config WHERE key = 'eileen_intelligence_prompt_v1') AS cc_section_size;

-- =============================================================
-- Current active version (run any time to check state)
-- =============================================================

SELECT key, value, updated_at
FROM platform_config
WHERE key = 'eileen_intelligence_active_version';
