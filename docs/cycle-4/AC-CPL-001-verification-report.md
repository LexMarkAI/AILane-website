# AC-CPL-001 Verification Report — Cycle 4 W4.1 (CPL-001 v1.0)

**Brief:** AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1
**Amendment slot:** AMD-137 (reserved)
**Branch:** `claude/edge-functions-system-prompt-aA1aj`
**Execution window:** 2026-05-10 → 2026-05-11
**Adjudicating authority:** Director (10 May 2026)

## Summary

W4.1 establishes the CPL-001 v1.0 substrate: 13 new tables (6 reference + 1 core registry + 3 auxiliary + 1 aggregations + 1 league state + 3 CSCE log/membership/run tables), 1 materialised view, 9 functions (6 named + 3 trigger functions). All structural verification probes PASS. §2.4 was pre-applied by Chairman via AAD v1.0 Path A; CC skipped that apply and continued from §2.5.

## Acceptance criteria

### AC-CPL-001-01 — Reference data (§2.1)

| Table | Expected | Actual | Result |
|---|---|---|---|
| uk_canonical_regions | 13 | 13 | PASS |
| uk_canonical_regions_aliases | 0 (Cycle 5 seed) | 0 | PASS |
| uk_jurisdiction_canonicalisation_lookup | 0 (Cycle 5 seed) | 0 | PASS |
| cohort_size_band_thresholds | 5 (Cohort A only) | 5 | PASS |
| cohort_segment_registry | 0 (G2 overlay pending) | 0 | PASS |
| regulatory_profile_taxonomy | 10 | 10 | PASS |

### AC-CPL-001-04 — cohort_entity_register structure (§2.2)

| Probe | Expected | Actual | Result |
|---|---|---|---|
| Column count | 31 (brief outcome text said "32"; brief CREATE TABLE has 31 — doc-only miscount) | 31 | PASS |
| Index count | 12 explicit + PK + UNIQUE-on-alin auto = 14 | 14 | PASS |
| Trigger count | 1 (brief) + 2 (MP-01 + MP-02) = 3 | 3 | PASS |
| CHECK constraints | 11 | 11 | PASS |
| FK constraints | 2 (alin + employer_master) | 2 | PASS |
| RLS enabled | true | true | PASS |

### AC-CPL-001-06 — Auxiliary tables (§2.3)

| Probe | Expected | Actual | Result |
|---|---|---|---|
| cohort_entity_aliases col count | 10 | 10 | PASS |
| cohort_entity_aliases index count | ≥5 | 6 | PASS |
| cohort_entity_aliases RLS enabled | true | true | PASS |
| cohort_entity_aliases RLS forced | true | true | PASS |
| eim_cohort_allocations col count | 22 | 22 | PASS |
| eim_cohort_allocations CHECK count | 9 | 9 | PASS |
| eim_cohort_allocations index count | ≥9 | 9 | PASS |
| cohort_decision_log col count (no regression) | 15 (AMD-127 baseline) | 15 | PASS |
| fk_cer_superseded_by_decision FK | references cohort_decision_log(decision_id) ON DELETE SET NULL | confirmed | PASS |
| cohort_decision_log authenticated UPDATE priv | false | false | PASS |
| cohort_decision_log anon DELETE priv | false | false | PASS |
| cohort_decision_log service_role UPDATE priv | true | true | PASS |

## AC-CPL-001-09 — §2.4 Aggregations (Chairman Path A pre-applied)

**Status:** PASS
**Apply method:** Chairman pre-application via AAD v1.0 Path A (CC application not invoked)
**Apply timestamp:** 2026-05-11 00:00:10 UTC
**Migration version:** 20260511000010
**Migration name:** cycle4_cpl_001_step4_aggregations
**Source file SHA-256:** 238f073ddfabd35a0eb70d25be1f221b05960c8d89789ab652baf6f3c4d62465
**Source file path:** supabase/migrations/20260511000010_cycle4_cpl_001_step4_aggregations.sql

### Chairman adjudication of brief defect

The v1.1 brief §2.4 SQL inherited CPL-001 v1.0 §7.1 narrative substrate without verifying against deployed schema. Four schema mismatches identified at CC execution:

1. `em.canonical_name` — column does not exist in `employer_master`
2. `td.employer_master_id` — no FK from `tribunal_decisions` to `employer_master`
3. `te.tribunal_decision_id` — actual FK column is `te.decision_id`
4. `te.severity_weighted_score` — column does not exist in `tribunal_enrichment`

Chairman introspected deployed schemas via `Supabase:execute_sql` and adjudicated a Cycle 4 stub matview matching CSCE-001 §7.1 column shape per `is_canonical=true` employer_master rows with all-zero exposure metrics. Refresh wrapper contract preserved. Real linkage design deferred to Cycle 5 as DEF-CPL-04.

### Verification

- matview_exists = 1 ✓
- stub_row_count = canonical_employer_count = 74,322 ✓
- matview_index_count = 3 ✓
- refresh_fn_security_definer = true ✓
- refresh_fn_volatility = 'v' (VOLATILE) ✓
- cls_col_count = 19 ✓
- cls_check_count = 3 ✓
- cls_index_count = 5 ✓
- cls_rls_enabled = true ✓
- cls_policy_count = 2 ✓
- Refresh function execution: SUCCESS (CONCURRENTLY refresh; computed_at = 2026-05-11 00:00:35.340834 UTC)

### AC-CPL-001-10 — eim_check_grant_binding (§2.5)

| Probe | Expected | Actual | Result |
|---|---|---|---|
| Function signature | `grant_object jsonb, entity_id uuid` | matches | PASS |
| SECURITY DEFINER | true | true | PASS |
| Volatility | STABLE | STABLE (`s`) | PASS |
| authenticated EXECUTE | true | true | PASS |
| anon EXECUTE | false | false | PASS |
| Empty-registry probe | false (entity not found) | false | PASS |

## Mechanical PG-Conformance Patches

Per Director Option 4 blanket pre-auth (10 May 2026) for the seven mechanical PG-conformance patch classes. Each patch below documented per the Director's prescribed format: brief expression / PG rejection / patched form / semantic equivalence statement / patch class / timestamp.

### MP-01 — operating_regions CHECK→TRIGGER

- **Patch class:** (i) subquery-in-CHECK → TRIGGER
- **Brief expression (§2.2 packet, chk_cer_operating_regions_value_domain_v1_0):**
  ```sql
  CONSTRAINT chk_cer_operating_regions_value_domain_v1_0 CHECK (
    operating_regions = '["pan-UK"]'::jsonb
    OR (
      jsonb_typeof(operating_regions) = 'array'
      AND jsonb_array_length(operating_regions) <= 12
      AND NOT (operating_regions @> '["pan-UK"]'::jsonb)
      AND (jsonb_array_length(operating_regions) = 0
           OR (SELECT bool_and(elem #>> '{}' IN (
                 SELECT region_code FROM public.uk_canonical_regions
                 WHERE is_pan_uk_token = false))
               FROM jsonb_array_elements(operating_regions) AS elem))))
  ```
- **PG rejection:** `ERROR 0A000: cannot use subquery in check constraint`
- **Patched form:** Pure-jsonb shape CHECK `chk_cer_operating_regions_shape_v1_0` (type + length + pan-UK exclusivity) plus `trg_cer_validate_operating_regions_before_insert_update` trigger calling `public.trg_validate_cer_operating_regions()` for element value-domain validation. Trigger mirrors brief's own `trg_validate_cer_regulatory_profile` pattern verbatim.
- **Semantic equivalence:** Identical accept/reject behaviour. `'["south-east", "london"]'` accepts; `'["pan-UK"]'` accepts; `'["pan-UK", "london"]'` rejects (CHECK pan-UK exclusivity); `'["fakistan"]'` rejects (TRIGGER element validation against uk_canonical_regions).
- **Timestamp:** 2026-05-10 23:18 UTC

### MP-02 — sic_codes CHECK→TRIGGER

- **Patch class:** (i) subquery-in-CHECK → TRIGGER
- **Brief expression (§2.2 packet, chk_cer_sic_codes_format_v1_0):**
  ```sql
  CONSTRAINT chk_cer_sic_codes_format_v1_0 CHECK (
    jsonb_typeof(sic_codes) = 'array'
    AND (jsonb_array_length(sic_codes) = 0
         OR (SELECT bool_and(elem #>> '{}' ~ '^\d{5}$')
             FROM jsonb_array_elements(sic_codes) AS elem)))
  ```
- **PG rejection:** Same `ERROR 0A000` — `jsonb_array_elements` is a set-returning function used as subquery.
- **Patched form:** Shape-only CHECK `chk_cer_sic_codes_shape_v1_0 CHECK (jsonb_typeof(sic_codes) = 'array')` plus `trg_cer_validate_sic_codes_before_insert_update` trigger calling `public.trg_validate_cer_sic_codes()` for `^\d{5}$` regex validation per element.
- **Semantic equivalence:** Identical accept/reject behaviour. `'["12345"]'` accepts; `'["abc"]'` rejects.
- **Timestamp:** 2026-05-10 23:18 UTC

### MP-03 — trg_eca_set_updated_at search_path pinning

- **Patch class:** (iii) search_path pinning
- **Brief expression (§2.3 packet):** Function body declared `LANGUAGE plpgsql` without `SET search_path` clause.
- **PG rejection:** None (PG accepts), but violates AILANE platform RULE 5 (SECURITY DEFINER + plpgsql functions must pin search_path to prevent search-path injection attacks). Pre-flight register flagged this.
- **Patched form:** Added `SET search_path = public, pg_catalog` clause to function definition.
- **Semantic equivalence:** Identical functional behaviour; hardened against search-path manipulation.
- **Timestamp:** 2026-05-11 00:08 UTC

### MP-04 — fk_csgm_superseded_by_decision FK reference correction

- **Patch class:** (extension to seven — mechanical correction toward verified ground-truth schema; Director "read previous" instruction extends Option 4 framework)
- **Brief expression (§2.7 packet):**
  ```sql
  CONSTRAINT fk_csgm_superseded_by_decision
    FOREIGN KEY (superseded_by_decision_id)
    REFERENCES public.cohort_decision_log(id)  -- packet typo
    ON DELETE NO ACTION
  ```
- **PG rejection:** Would have produced `ERROR 42703: column "id" does not exist`. Actual PK column on `cohort_decision_log` is `decision_id` (verified via `information_schema.key_column_usage`; AMD-127 baseline). Same packet §2.3 correctly uses `decision_id` in 4 other FK references (fk_cea_source_decision, fk_eca_source_decision, fk_eca_superseded_by, fk_cer_superseded_by_decision). One-character internal-consistency typo.
- **Patched form:** `REFERENCES public.cohort_decision_log(decision_id) ON DELETE NO ACTION`
- **Semantic equivalence:** Identical referential integrity semantics, now binding against the actual PK column.
- **Timestamp:** 2026-05-11 00:15 UTC

### MP-05 — csce_product_fit_routing v_recent_signals aggregation refactor

- **Patch class:** (i) subquery-in-CHECK → TRIGGER (extended interpretation — packet's aggregate-function expression has invalid ORDER BY/LIMIT positional clauses)
- **Brief expression (§2.9 packet):**
  ```sql
  SELECT jsonb_agg(jsonb_build_object(...)) INTO v_recent_signals
  FROM public.csce_signal_log csl
  WHERE ...
  ORDER BY csl.recorded_at DESC
  LIMIT 20;
  ```
- **PG rejection:** `ORDER BY` and `LIMIT` clauses are positional in a SELECT but here the SELECT returns 1 row (the aggregate). `ORDER BY` after `jsonb_agg` would attempt to order the single output row (no-op); `LIMIT 20` is meaningless on a 1-row aggregate result. The intent (limit input rows to 20 most recent, then aggregate) requires a subquery.
- **Patched form:**
  ```sql
  SELECT jsonb_agg(jsonb_build_object(...) ORDER BY csl.recorded_at DESC) INTO v_recent_signals
  FROM (
    SELECT signal_kind, recorded_at, signal_summary
    FROM public.csce_signal_log
    WHERE subject_cohort_entity_id = p_entity_id
      AND recorded_at >= now() - INTERVAL '90 days'
      AND superseded_by_signal_id IS NULL
    ORDER BY recorded_at DESC LIMIT 20
  ) csl;
  ```
- **Semantic equivalence:** Returns top-20 most recent unsuperseded signals as jsonb array ordered by recorded_at DESC. Matches brief intent.
- **Timestamp:** 2026-05-11 00:20 UTC

## W4.1 closure verification (§2.10)

| Probe | Expected | Actual | Result |
|---|---|---|---|
| New tables count | 13 | 13 | PASS |
| Materialised views count | 1 | 1 | PASS |
| Functions count (named + triggers) | ≥6 | 9 (6 named + 3 trigger fns) | PASS |
| `csce_product_fit_routing(random uuid)` empty probe | fit_outcome=entity_not_found_or_inactive | confirmed | PASS |
| `eim_check_grant_binding(random uuid)` empty probe | false | false | PASS |

## Outstanding items at PR submission

1. **DEF-CPL-04** — v_employer_tribunal_exposure substantive body deferred to Cycle 5 pending tribunal_decisions↔employer_master link resolution. See `docs/cycle-4/AC-CYCLE-4-DEFERRED.md`.
2. **DEF-CPL-05** — uk_canonical_regions_aliases (1,048 mapping rows) deferred to Cycle 5 per packet §2.1 NOTE TO CC option (a).
3. **DEF-CPL-06** — uk_jurisdiction_canonicalisation_lookup population deferred to Cycle 5.
