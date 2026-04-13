-- CCRE-001 Phase B §4 — Seed current prompt as v1
-- AILANE-SPEC-CCRE-001 v1.0 (AMD-047)
--
-- RUN ORDER: FIRST (before deploying refactored function).
-- MUST complete before §6 (function deploy).
--
-- Target function: eileen-intelligence (v6 hardcoded → refactored to read from platform_config)
-- Source of truth: the hardcoded SYSTEM_PROMPT_CONSTITUTIONAL from the live v6 source.
-- Extracted to: deployments/CCRE-001-phase1/current-prompt-v1.txt
--
-- ACTION FOR CEO:
-- 1. Open Supabase Dashboard → SQL Editor (project ailane-core / cnbsxwtvazfvzmltkuvx)
-- 2. Open current-prompt-v1.txt, copy its ENTIRE contents
-- 3. Paste the contents between the $prompt$ ... $prompt$ delimiters below (replacing the placeholder)
-- 4. Run the two INSERT statements
-- 5. Run verify.sql to confirm

-- -------------------------------------------------------------
-- Set active version pointer to 1 (v1 will become live immediately
-- upon function redeploy in §6; before that, pointer is dormant).
-- -------------------------------------------------------------

INSERT INTO platform_config (key, value)
VALUES ('eileen_intelligence_active_version', '1');

-- -------------------------------------------------------------
-- Seed v1 = the current hardcoded prompt, verbatim.
-- PASTE contents of current-prompt-v1.txt inside the dollar-quoted block.
-- -------------------------------------------------------------

INSERT INTO platform_config (key, value)
VALUES ('eileen_intelligence_prompt_v1', $prompt$
-- >>>>> PASTE CURRENT-PROMPT-V1.TXT CONTENTS HERE <<<<<
$prompt$);
