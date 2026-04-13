-- CCRE-001 Phase B §5 — Insert v2 (current prompt + Contract Creator)
-- AILANE-SPEC-CCRE-001 v1.0 (AMD-047)
--
-- RUN ORDER: AFTER seed-v1.sql is confirmed (verify.sql §4 passes).
-- Run BEFORE activating v2 via activate-v2.sql (§7).
--
-- v2 = v1 prompt text + Contract Creator section appended.
-- Sources:
--   - deployments/CCRE-001-phase1/current-prompt-v1.txt
--   - deployments/CCRE-001-phase1/contract-creator-section.txt
--
-- ACTION FOR CEO:
-- 1. Open Supabase Dashboard → SQL Editor (project ailane-core / cnbsxwtvazfvzmltkuvx)
-- 2. Open current-prompt-v1.txt, copy its ENTIRE contents
-- 3. Open contract-creator-section.txt, copy its ENTIRE contents
-- 4. Paste BOTH contents between the $prompt$ ... $prompt$ delimiters below,
--    in order (prompt-v1 first, then a blank line, then contract-creator-section)
-- 5. Run the INSERT statement
-- 6. Run verify.sql section "v2 verification" to confirm

-- -------------------------------------------------------------
-- Insert v2 = v1 base prompt + Contract Creator section.
-- The Contract Creator section appends AFTER the Tier 4 disclaimer block in v1.
-- -------------------------------------------------------------

INSERT INTO platform_config (key, value)
VALUES ('eileen_intelligence_prompt_v2', $prompt$
-- >>>>> PASTE CURRENT-PROMPT-V1.TXT CONTENTS HERE <<<<<

-- >>>>> THEN PASTE CONTRACT-CREATOR-SECTION.TXT CONTENTS HERE <<<<<
$prompt$);
