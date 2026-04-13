# CCRE-001 Phase 1 — Deployment Package

**Specification:** AILANE-SPEC-CCRE-001 v1.0 (AMD-047, ratified 13 April 2026)
**Target function:** `eileen-intelligence` (project `ailane-core` / `cnbsxwtvazfvzmltkuvx`)
**Path:** B — Prompt externalised to `platform_config`, Contract Creator added as v2
**Prepared by:** Claude (Phase A findings confirmed by CEO)

---

## Files in this package

| File | Purpose |
|---|---|
| `current-prompt-v1.txt` | Exact text of current hardcoded `SYSTEM_PROMPT_CONSTITUTIONAL` (eileen-intelligence v6). Source of truth for the v1 seed. |
| `contract-creator-section.txt` | Contract Creator workflow section to append for v2. |
| `eileen-intelligence-v7.ts` | Refactored Edge Function source. Replaces hardcoded const with `platform_config` lookup. |
| `seed-v1.sql` | SQL to seed current prompt as v1 and set active version pointer to 1. |
| `insert-v2.sql` | SQL to insert v2 = v1 + Contract Creator section. |
| `activate-v2.sql` | SQL to flip active version pointer to 2 (Contract Creator goes live). |
| `rollback-v1.sql` | SQL to rollback to v1 instantly (emergency use). |
| `verify.sql` | Verification queries for each gate (§4.3, §4.4, §5.1). |

---

## Deployment sequence (CEO execution)

Execute the steps in strict order. Each gate must pass before proceeding.

### GATE 1 — Seed v1 (CCRE-001 §4)

1. Open Supabase Dashboard → SQL Editor (project `ailane-core`).
2. Open `seed-v1.sql` in this folder.
3. Replace the placeholder `-- >>>>> PASTE CURRENT-PROMPT-V1.TXT CONTENTS HERE <<<<<` with the **full contents** of `current-prompt-v1.txt` (keeping it inside the `$prompt$ ... $prompt$` dollar-quoted block).
4. Run the modified SQL.
5. Open `verify.sql` and run the `§4.3 — Seed verification` block.
   - Expected: 2 rows returned.
   - `eileen_intelligence_active_version` value length = 1.
   - `eileen_intelligence_prompt_v1` value length ≈ 7,500 chars.
6. Run the `§4.4 — Content integrity check for v1` block.
   - All 5 checks must return "present" values.
   - If any returns "MISSING", delete the v1 row and redo step 3.

**DO NOT PROCEED until Gate 1 passes.**

### GATE 2 — Insert v2 (CCRE-001 §5)

1. Still in Dashboard → SQL Editor.
2. Open `insert-v2.sql`.
3. Replace the first placeholder with the **full contents of `current-prompt-v1.txt`**.
4. Replace the second placeholder with the **full contents of `contract-creator-section.txt`** (immediately after the first, separated by a blank line — the dollar-quoted block takes a single concatenated string).
5. Run the SQL.
6. In `verify.sql`, run the `§5.1 — v2 verification` block.
   - All 4 checks must return "present".
7. Run the `§5.1 — Length comparison` block.
   - `v2_length` MUST be strictly greater than `v1_length`.
   - `cc_section_size` should be ~8,000–12,000 chars.

**DO NOT PROCEED until Gate 2 passes.**

### GATE 3 — Deploy refactored function (CCRE-001 §6)

Active version pointer is still `'1'`. Deploying the refactored function now will cause it to load v1 from `platform_config` on the first request — behaviour identical to pre-refactor (because v1 is the exact same prompt text).

1. Open Supabase Dashboard → Edge Functions → `eileen-intelligence`.
2. Click **Edit** (or "Deploy new version").
3. Replace the entire function source with the contents of `eileen-intelligence-v7.ts` from this folder.
4. Click **Deploy**.
5. Smoke test via the live KL chat at `https://ailane.ai/knowledge-library/`:
   - Send a normal KL question (CCRE-001 §8 Test 1), e.g.: "What are the key changes in ERA 2025?"
   - Expected: Eileen responds normally. No errors. No Contract Creator language (because v1 is active).
6. Check function logs for the line `[eileen v6] Loaded prompt v1 (<N> chars)` — confirms the platform_config path is live.

**DO NOT PROCEED until Gate 3 smoke test passes.**

### GATE 4 — Activate v2 (CCRE-001 §7)

1. SQL Editor → run `activate-v2.sql`.
2. Second query in the same file confirms `eileen_intelligence_active_version` is now `'2'`.

Contract Creator is now LIVE.

### GATE 5 — Post-deployment verification (CCRE-001 §8)

Execute all 7 tests in the live KL chat:

| # | Input | Expected |
|---|---|---|
| 1 | "What are the key changes in ERA 2025?" | Normal KL answer. No regression. |
| 2 | "I need to create a new employment contract" | Contract Creator Step 1 opens with Tier 4 disclaimer. |
| 3 | "Can you check my existing contract?" | Routes to Compliance Check, NOT Contract Creator. |
| 4 | (In Step 1) "Facilities management company in Cardiff, 45 employees" | Welsh follow-up (Welsh Language Standards, public-facing services). |
| 5 | (In Step 1) "Healthcare provider, staff transferred from NHS" | TUPE follow-up on transfer timing/term preservation. |
| 6 | (During any step) "Can you write the holiday clause for me?" | Constitutional boundary decline. |
| 7 | (During Step 3) "What exactly does ERA 2025 change about written statements?" | Answers, then offers to resume workflow. |

Log each test result. Any failure → execute Gate 6.

### GATE 6 — Rollback (CCRE-001 §7.1) — only if Gate 5 fails

1. SQL Editor → run `rollback-v1.sql`.
2. Wait 30 seconds for any in-flight requests to complete.
3. Re-run Test 1 to confirm normal KL function is restored.
4. Report the failure details (which test failed, error text if any, screenshots of Eileen's response).
5. `v2` row remains in `platform_config` for forensic review and re-activation once fixed.

---

## Architectural benefit (confirmed)

After this deployment, **all future prompt amendments are SQL-only**. No Edge Function redeployment required. To ship v3:

```sql
INSERT INTO platform_config (key, value) VALUES ('eileen_intelligence_prompt_v3', $prompt$...$prompt$);
UPDATE platform_config SET value = '3' WHERE key = 'eileen_intelligence_active_version';
```

Rollback is the same one-line `UPDATE`.

---

## Scope exclusions (from CCRE-001 brief §9)

This package **does not** modify:
- `index.html` (landing page — passive, no auth logic)
- `AiLaneCEO/` folder (protected)
- `compliance-check` Edge Function (v38, production)
- `eileen-presales`, `eileen-training-assistant` Edge Functions
- Any HTML page, including `knowledge-library/`
- `i18n/`, `scraper/`, `supabase/migrations/`, `.claude/`
- Database schema (no DDL, no migrations)

The ONLY write actions are:
1. Two `INSERT`s into `platform_config` (seed v1 + insert v2)
2. One `UPDATE` on `platform_config` to flip active version (§7)
3. One replacement of `eileen-intelligence` Edge Function source via Dashboard (§6)

---

## Spec drift noted (separate to this deployment)

Three governing specs (EILEEN-002 §12.2, KLIA-001 §31.1, Project Audit April 2026) name `kl_ai_assistant` as the live KL endpoint. The KL frontend bundles (`knowledge-library/kl-app.jsx:9`, `kl-app.js:6`, `kl-app-bundle.js:6`) prove the actual endpoint is `eileen-intelligence`. Recommend a corrective AMD entry to align the specs. Does not block this deployment.

---

## Reference — Phase A findings (confirmed 13 April 2026)

| Field | Value |
|---|---|
| Target function | `eileen-intelligence` (v6 deployed, source self-describes as `v5`) |
| Endpoint | `https://cnbsxwtvazfvzmltkuvx.functions.supabase.co/functions/v1/eileen-intelligence` |
| `verify_jwt` | `false` (manual JWT decode in handler) |
| Prompt location | Hardcoded TS `const` (pre-refactor) → `platform_config` (post-refactor) |
| Prompt variable | `SYSTEM_PROMPT_CONSTITUTIONAL` (preserved) |
| Assembly | `SYSTEM_PROMPT_CONSTITUTIONAL + dateContext + ragContext` (preserved) |
| Model | `claude-sonnet-4-6` + 3 fallbacks (preserved) |
| RAG | `match_provisions` (0.3/10), `match_cases` (0.3/5), Voyage `voyage-law-2` (preserved) |
| Rate limit | 20/min per IP on `rate_limits` table (preserved) |
| CORS | `https://ailane.ai` (preserved) |
| Existing guardrails | All 5 present (clause-drafting refusal, PLUGIN-001, KLAC-001-AM-006, Tier 4 disclaimer, intelligence/advice boundary) — preserved verbatim |
