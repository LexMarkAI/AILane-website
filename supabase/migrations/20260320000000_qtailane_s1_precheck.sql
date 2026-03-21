-- ============================================================
-- QTAILANE STAGE 1 — PRE-MIGRATION CHECK (§0)
-- Authority: QTAILANE-BUILD-001 Stage 1
-- RUN THIS BEFORE ANY MIGRATIONS. Report results.
-- ============================================================

-- 1. Check for existing qtailane_ tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'qtailane_%'
ORDER BY table_name;

-- 2. Check if 'trading' schema exists separately
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'trading';

-- 3. Confirm Ailane core table names (verify separation)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE 'ailane_%' OR table_name LIKE 'app_%' OR table_name LIKE 'org%')
ORDER BY table_name;

-- 4. Confirm project ref (check current database name)
SELECT current_database();
