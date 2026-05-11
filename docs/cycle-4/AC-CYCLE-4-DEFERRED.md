# AC-CYCLE-4-DEFERRED — Cycle 4 Deferred Items Register

**Brief:** AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1
**Amendment slot:** AMD-137 (reserved)
**Branch:** `claude/edge-functions-system-prompt-aA1aj`

## DEF-CPL-04 — Tribunal-to-Employer Linkage (Cycle 5 substrate)

**Defer rationale:** CPL-001 v1.0 §7.1 specified `v_employer_tribunal_exposure` matview SELECT joining `tribunal_decisions` ↔ `employer_master` via `td.employer_master_id` and `tribunal_enrichment` via `te.tribunal_decision_id`. Schema introspection at Cycle 4 execution (Chairman, 2026-05-10) confirmed:

- `tribunal_decisions` has no FK to `employer_master` (linkage is via raw `respondent_name` text only).
- `tribunal_enrichment` FK to `tribunal_decisions` is `decision_id` (not `tribunal_decision_id` per spec narrative).
- `tribunal_enrichment` has no `severity_weighted_score` column; severity must be composed from `award_total` + components (`basic_award`, `compensatory_award`, `injury_to_feelings`, `aggravated_damages`).

**Cycle 4 implementation:** STUB matview emitting one row per `is_canonical=true` `employer_master` (74,322 rows) with all-zero exposure metrics; refresh wrapper contract preserved.

**Cycle 5 ratification scope:**
1. **Linkage design substrate** — author CSCE-001-AM-NNN or TEL-001 specifying tribunal-respondent → canonical-employer resolution using `match_aliases`, `previous_company_names`, `companies_house_number` cross-references, plus tribunal-side `respondent_postcode_area` + `respondent_employee_count_stated` + `respondent_is_public_body` corroborators.
2. **Severity composite** — define `severity_weighted_score` calculation incorporating `award_total`, component awards, `vento_band`, `multiple_claimants` count.
3. **Linkage table** — `tribunal_employer_link(decision_id uuid, employer_master_id uuid, link_method text, link_confidence numeric, linked_at timestamptz)` with provenance tracking.
4. **Matview body swap** — DROP + CREATE `v_employer_tribunal_exposure` with real join via `tribunal_employer_link`.

**Substrate ratification AMD:** TBD (Cycle 5 AMD slot).

**Estimated Cycle 5 effort:** Linkage canonicalisation is non-trivial (131,600+ tribunal corpus has substantial respondent-name noise); Haiku Batch API run against the corpus is the likely production path.
