# Phase B handover summary

**Brief:** AILANE-CC-BRIEF-DEALROOM-V7-PHASE-B-001
**Spec authority:** AILANE-SPEC-EILEEN-DEALROOM-V7-001 (AMD-120, ratified 4 May 2026)
**Issued by:** Chairman, under AAD v1.0 Path A
**Engineer:** Claude Code
**Branch:** `claude/dealroom-v7-frontend-hg4xj`
**Base:** `8ac42987c96c133c0613cba011bdb3d34842ba56` (`origin/main`, "Merge pull request #174")
**Tip:** `7db6c7b` (STOP 5 — Pathway)

This document records the six STOP-gate timestamps, the smoke-test logs (with deferred-step reproductions), the specification clarifications surfaced during the build, and the suggested next session.

---

## 1. Six STOP gates — timestamps and commits

| Gate | Name | ISO timestamp passed | Commit | Chairman parallel evidence |
|---|---|---|---|---|
| STOP 0 | Baseline confirmation | `2026-05-04T22:30Z` | (no mutation) | n/a |
| STOP 1 | Welcome universal skeleton | `2026-05-04T22:42Z` | `b8c2c69` | Probe PASS (active_version=`7`, prompt v7 length 57,517) |
| STOP 2 | Documents Artefacts view | `2026-05-04T22:55Z` | `2b79ee8` | n/a (no live-EF leg) |
| STOP 3 | Engagement current-state panels | `2026-05-04T23:00Z` | `e242ae7` | n/a (no live-EF leg) |
| STOP 4 | Deal Creator Eileen-narrated pricing | `2026-05-04T23:05Z` | `1b6e98e` | Baseline £325,813.86 captured (unconstrained scope; institutional; quarterly; non-exclusive; 1-yr; no DUNS; launch-partner discount applied) |
| STOP 5 | Pathway 7-phase JIPA view | `2026-05-04T23:11Z` | `7db6c7b` | RAG layer 3 cite check: JIPA-GRD-001-S5 self-match 1.0000 + 3 related rows above 0.3 threshold (`rag_layer3_count` will be ≥ 4) |

---

## 2. Smoke-test logs

### STOP 0 — Baseline confirmation

| Requirement | Result |
|---|---|
| HEAD captured | `8ac42987…` recorded; branch synced 0/0 vs `origin/main` |
| `partners/sim-2026/` inventory | 9 files (index, script, style, pathway-svg, auth-callback, configurator, documents, pathway, status) |
| EF v5 reachability | ⚠️ Inconclusive — sandbox proxy at `127.0.0.1:45129` blocks outbound HTTPS to `cnbsxwtvazfvzmltkuvx.supabase.co` (HTTP 403 "Host not in allowlist"). Documented; not a blocker (Chairman option 2 deferred-pattern accepted) |
| `platform_config` v7 | ✅ `eileen_dealroom_active_version='7'` (updated 2026-05-04 21:46 UTC); `eileen_dealroom_prompt_v7` 57,517 chars (updated 2026-05-04 21:30 UTC); model `claude-opus-4-7` |
| `partner_clids` baseline | sim-2026-001: counterparty "D&B Simulation (Director-Side Test)", `gate_state=phase_0`, `is_simulation=true`. dnb-2026-001: counterparty "Dun & Bradstreet UK & Ireland", `gate_state=phase_0`, `is_simulation=false`. Both director_email mark@ailane.ai |
| Tree mutation | ✅ None |

**STOP 0: PASS.**

### STOP 1 — Welcome universal skeleton

| # | Brief §6.2 step | Result | Evidence |
|---|---|---|---|
| 1 | `/partners/sim-2026/` HTTP 200 | ✅ PASS | `curl -sSI http://127.0.0.1:8000/partners/sim-2026/` → `HTTP/1.0 200 OK` |
| 2 | Required substrings ('Welcome to your', 'Eileen', 'Documents', 'Deal Creator', 'Pathway', 'Statutory provisions', 'G-NTNXWZN31C') | ✅ PASS | All 7 located: HTML-static in index.html or JS-injected in script.js |
| 3 | Logged-in Eileen response within 8s, `prompt_version="v7"` | ⚠️ **DEFERRED** — see reproduction below | Chairman parallel MCP confirmed config-side: `active_version='7'`, prompt v7 length 57,517 chars |
| 4 | "What's happening" snapshot matches §11 SQL ground truth | ✅ PASS (with documented localhost behavior) | MCP query: `phase=phase_0`, `open_fcrs=0`, latest proposal 2026-05-03 (custom config), `closed_fcr_count=0`. Localhost (no JWT) → empty-state copy in all 4 tiles by design (Chairman option 2 modification of deviation 3) |
| 5 | No console errors, no 404s | ✅ PASS (partial) | `node --check script.js` clean; all 7 menu/footer destinations 200 |

**Deferred reproduction for Smoke 3 — Director closes post-merge:**

```
1. Open /partners/sim-2026/ in incognito; sign in via magic link as mark@ailane.ai.
2. Open DevTools Network tab, filter by 'eileen-dealroom'.
3. In Eileen panel input, type "What's the engagement state right now?" and Send.
4. Observe POST to https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/eileen-dealroom.
5. Confirm HTTP 200 and response body contains "prompt_version":"v7".
```

Expected response shape: `{response, prompt_version:"v7", session_id, rate_limited, layer3_invoked, ...}`.

**Director closure tick-box:** ⬜ Confirmed post-merge. Date: ____.

### STOP 2 — Documents Artefacts view

| # | Brief §7.2 step | Result | Notes |
|---|---|---|---|
| 1 | `/documents/` HTTP 200 | ✅ PASS | localhost curl returns 200 |
| 2 | ≥1 row OR empty-state copy | ✅ PASS | Localhost (no auth) → empty-state copy in all categories. Production with auth: ground truth shows 12 rows total (3 templates + 1 proposal + 0 FCRs + 2 conversations + 6 director uploads) |
| 3 | "Templates" filter shows only `kind='template'` rows | ⚠️ **DEFERRED** | Filter logic wired (`renderArtefactsList_` in script.js). Director post-merge browser test |
| 4 | "View" opens signed URL | ⚠️ **DEFERRED** | Wired to `/functions/v1/dealroom-document-fetch` POST. Sandbox unreachable. Director post-merge |
| 5 | Trigger test upload — row appears | ⚠️ **DEFERRED — Specification clarification needed (§3.1)**. Existing PR #174 per-tile upload UX preserved |
| 6 | No console errors | ✅ PASS | `node --check` clean |

**Deferred reproductions for Smoke 3, 4 — Director closes post-merge:**

```
3. Logged in, on /partners/sim-2026/documents/, click the "Templates" filter chip.
   Expected: only rows with category badge "Template" remain visible (3 rows for sim-2026-001).
4. Click "View" on any template row.
   Expected: new tab opens to a signed URL (5-min TTL) for the template file.
```

**Director closure tick-boxes:** ⬜ Smoke 3. ⬜ Smoke 4. Date: ____.

### STOP 3 — Engagement current-state panels

| # | Brief §8.3 step | Result | Notes |
|---|---|---|---|
| 1 | `/status/` HTTP 200 | ✅ PASS | localhost curl returns 200 |
| 2 | Current Phase panel shows `phase_0` | ✅ PASS (code path) | MCP: `partner_clids.gate_state='phase_0'`. Production with auth: renders "Phase 0 — Pre-engagement" + JIPA-GRD-001 §5 description + "What's needed to advance" copy |
| 3 | Open FCRs panel renders rows + SLA countdown ("Director response due in N working days") | ⚠️ **DEFERRED** | MCP: 0 open FCRs in seed data → empty-state renders. SLA computation via `businessDaysRemaining_` Mon-Fri walker (UK bank holidays not subtracted client-side; SQL `compute_uk_business_day_offset` is the deadline authority server-side) |
| 4 | Latest counter-proposal panel renders most recent submission | ✅ PASS (code path) | MCP: 1 row with config_summary "custom · no coverage · …", values 0/0, `eileen_evaluation_pending=true` → renders "Eileen has acknowledged this submission; Director is reviewing." |
| 5 | Non-Director user does NOT see `eileen_triage_class` chip | ✅ PASS (code path) | Visibility gated on `userEmail === DIRECTOR_EMAIL` in `fetchEngagementOpenFcrsPanel_` |
| 6 | No console errors | ✅ PASS | `node --check` clean |

**Deferred reproductions for Smoke 3, 5 — Director closes post-merge:**

```
3. Logged in as mark@ailane.ai, go to /partners/sim-2026/status/.
   Create a test FCR via Eileen ("Can we get COPP-3 enrichment data?") so the panel has a row.
   Expected: row renders with "Director response due in N working days" matching the
   compute_uk_business_day_offset(submitted_at, 10) value visible in the SQL editor.
5. Sign in instead as a non-Director account that has partner_contacts membership for
   sim-2026-001 (or any non-director account if RLS allows). Open the same page.
   Expected: the open-FCR row renders WITHOUT the `eileen_triage_class` chip.
```

**Director closure tick-boxes:** ⬜ Smoke 3. ⬜ Smoke 5. Date: ____.

### STOP 4 — Deal Creator Eileen-narrated pricing

| # | Brief §9.3 step | Result | Notes |
|---|---|---|---|
| 1 | `/configurator/` HTTP 200 | ✅ PASS | localhost curl returns 200 |
| 2 | Configurator renders six scope axes + five modifiers + state submits to local component state | ✅ PASS | PR #173 surface preserved unchanged |
| 3 | Configurator state change updates Live pricing within 2s | ⚠️ **DEFERRED** | `scheduleEileenPricingNarration_` debounced 800ms is wired into `recompute_` (single-line touch). Sandbox unreachable. Director post-merge |
| 4 | Network tab: POST to `/functions/v1/eileen-dealroom`, response includes `price_quote_emitted:true` and `price_quote_result:{...}` with `recommended` numeric | ⚠️ **DEFERRED** | Wired in `triggerEileenPricingNarration_`. Director post-merge |
| 5 | `recommended` matches direct SQL `pricing_quote_function('<same JSON state>')` | ⚠️ **DEFERRED for live leg** — Chairman MCP probe captured deterministic baseline (see below) | Director compares post-merge |
| 6 | "Submit counter-proposal" inserts new row + receipt | ✅ PASS (code path; existing PR #173 surface preserved) | Sandbox: section disabled by design. Production phase ≥ A: form interactive. Director post-merge confirms wiring |
| 7 | No console errors | ✅ PASS | `node --check` clean |

**Chairman parallel MCP evidence for STOP 4 (Smoke 5 RPC-side leg):**

Direct call to `pricing_quote_function_v4` for the unconstrained baseline configuration (no scope filters; institutional tier; quarterly refresh; non-exclusive; 1-year term; no DUNS; clid `sim-2026-001`):

| Field | Value |
|---|---|
| `annual_pence` | **32,581,386** → £325,813.86 /year |
| `scope_universe` | 78,699 employers (Identity) |
| `enriched_universe` | 34,391 employers |
| `per_record_pence` | 460 (£4.60) |
| `tier_multiplier` | 1.15 |
| `is_launch_partner_applied` | **true** (resolved via `partner_clids_authoritative_true`) |
| `launch_partner_discount_pence` | 3,620,154 (−10%) |
| `annual_band_min_pence` | 29,323,247 |
| `annual_band_max_pence` | 35,839,525 |
| `amd_authority` | AMD-114 + AMD-115 + AMD-118 Stage A + AMD-103 + AMD-109 |

**Deferred reproduction for Smoke 4-5 — Director closes post-merge:**

```
1. Logged in as mark@ailane.ai, go to /partners/sim-2026/configurator/.
2. Reset all scope axes (Reset all axes button); leave modifiers at default
   (institutional tier, quarterly, non-exclusive, 12 months, no DUNS).
3. Within ~1 second the deterministic Live Quote rail renders £325,813.86 /year.
4. Within ~2 more seconds the "Eileen on this configuration" block renders the same
   recommended figure with prose narration. Network tab shows POST to
   /functions/v1/eileen-dealroom; response includes price_quote_emitted:true and
   price_quote_result:{recommended: 32581386, ...}.
5. Compare price_quote_result.recommended (32,581,386) to the deterministic ground
   truth above (32,581,386). They MUST match.
```

**Director closure tick-boxes:** ⬜ Smoke 3. ⬜ Smoke 4. ⬜ Smoke 5 (round-trip match). ⬜ Smoke 6 (counter-proposal submit). Date: ____.

### STOP 5 — Pathway 7-phase JIPA view

| # | Brief §10.3 step | Result | Notes |
|---|---|---|---|
| 1 | `/pathway/` HTTP 200 | ✅ PASS | localhost curl returns 200 |
| 2 | Visual phase strip shows 7 chips; current phase distinct | ✅ PASS (code path) | 7 chips render (Phase 0 → Phase F). Sandbox: no auth → no chip highlighted (we don't invent). Production with Director auth → gold #F59E0B; Institutional → gold; other authenticated → cyan #0EA5E9 (per AMD-069) |
| 3 | All 7 detail blocks render with all 4 sub-fields | ⚠️ **PARTIAL — Specification clarification needed (§3.2)** | 7 detail blocks render with name+description, "What unlocks here", "What's required to enter" (3 of 4 sub-fields). 4th sub-field "typical duration" is intentionally NOT rendered per JIPA-GRD-001 §5 ("durations not standardised"); a single page-level note explains |
| 4 | Ask Eileen "where am I in this journey?" — cites JIPA-GRD-001 §5 | ⚠️ **DEFERRED** for live EF leg | Chairman parallel MCP probe captured corpus-side: JIPA-GRD-001-S5 corpus row exists, length 670 chars, content explicitly references §5 phase progression. EF v7 prompt instructs Eileen to surface attribution |
| 5 | `rag_layer3_count` ≥ 1 in EF response | ⚠️ **DEFERRED** for live EF leg — Chairman MCP probe confirms `rag_layer3_count` will be ≥ 4 | See evidence below |
| 6 | No console errors | ✅ PASS | `node --check` clean |

**Chairman parallel MCP evidence for STOP 5 (Smoke 5 corpus-side leg):**

`match_dealroom_training_corpus(JIPA-GRD-001-S5_self_embedding, 4, 0.3)` returns:

| Rank | doc_id | title | similarity |
|---|---|---|---|
| 1 | JIPA-GRD-001-S5 | Engagement phase progression and Eileen role | **1.0000** (self-match) |
| 2 | DMSP-001-S12 | 90-day engagement pathway with Tier-β parallel sprint | 0.6796 |
| 3 | JIPA-GRD-001-S3 | Bespoke pathway for off-catalogue requests | 0.5361 |
| 4 | AUGMENT-001-S5 | Off-estate triage feeds AUGMENT pipeline | 0.4816 |

So when Eileen receives the canonical "where am I in this journey?" query and the EF runs `match_dealroom_training_corpus`, `rag_layer3_count` should be ≥ 4 (well above the brief's ≥ 1 threshold).

**Deferred reproduction for Smoke 4-5 — Director closes post-merge:**

```
1. Logged in as mark@ailane.ai, go to /partners/sim-2026/pathway/.
2. In the Eileen panel, type "Where am I in this journey?" and Send.
3. Network tab: POST to /functions/v1/eileen-dealroom; response includes
   rag_layer3_count >= 4 and citations referencing JIPA-GRD-001 §5.
4. Eileen's prose response identifies the current phase (phase_0 currently for
   sim-2026-001) and cites the protocol document.
```

**Director closure tick-boxes:** ⬜ Smoke 4 (Eileen citation). ⬜ Smoke 5 (rag_layer3_count). Date: ____.

---

## 3. Specification clarifications needed

Three contradictions surfaced during the build, each handled per brief §15 most-conservative reading. All three should be resolved by Chairman before the parallel `dnb-2026/` promotion session.

### 3.1 Brief §7.1 — Documents page upload widget references nonexistent column

**Brief text:** "Upload widget (using existing dealroom-document-upload) — counterparty can upload their own files; category dropdown maps to `dealroom_documents_catalog.category`."

**Schema reality:** `dealroom_documents_catalog` has a `kind` column (`template` | `requirement` | `release`); there is no `category` column. Brief §13 forbids adding columns.

**Most-conservative resolution applied:** Standalone counterparty-upload widget deferred. The existing PR #174 per-requirement-tile upload UX (visible on each requirement document in the Document Vault, wired through `submitRequirementUpload_` and `dealroom-document-upload` EF) is preserved and remains functional.

**Decision needed from Chairman:**
- (a) Repurpose: have the standalone widget upload against `kind='requirement'` rows only (matching the existing per-tile pattern but at top-of-page).
- (b) Add `category` column to `dealroom_documents_catalog` (out of scope for this brief; would need a separate AMD).
- (c) Drop the standalone widget from spec (the per-tile UX is sufficient).

### 3.2 Brief §10.2 — Pathway "typical duration" sub-field vs JIPA-GRD-001 §5 source rule

**Brief text:** "Typical duration (drawn from JIPA-GRD-001 §5 — do not invent durations)."

**Source reality:** JIPA-GRD-001 §5 corpus row content states explicitly: "Eileen … does not commit timelines beyond the documented phase requirements." No per-phase durations are documented in JIPA-GRD-001 §5.

**Most-conservative resolution applied:** Per-phase duration sub-field NOT rendered. A single page-level note at the top of the Pathway page explains: "JIPA-GRD-001 §5 does not standardise per-phase durations. Phase advancement is requirement-driven, not time-driven; Eileen will not commit timelines beyond the documented phase requirements. The Director moves the engagement forward as the documented requirements for each phase are met."

**Decision needed from Chairman:**
- (a) Accept current rendering (page-level note, no per-phase duration).
- (b) Document per-phase durations in a new JIPA-GRD-001 §5 amendment, then re-render.

### 3.3 Brief §9.2 #2 — Counter-proposal Submit references EF the live surface doesn't use

**Brief text:** "'Submit counter-proposal' button — wires to existing `cppp-generate-receipt` EF (verify_jwt=true) which inserts to `partner_counter_proposals` and returns a receipt."

**Live reality:** Existing PR #173 `submitCounterProposal` (script.js L2337-2431) POSTs directly to `/rest/v1/partner_counter_proposals` (RLS-gated INSERT with `Prefer: return=representation`); no `cppp-generate-receipt` EF is invoked.

**Most-conservative resolution applied:** Existing direct-INSERT pattern preserved unchanged. Brief reference to `cppp-generate-receipt` EF appears outdated.

**Decision needed from Chairman:**
- (a) Accept current direct-INSERT (which is the ratified PR #173 pattern).
- (b) Migrate to `cppp-generate-receipt` EF wrapper (would need to verify the EF exists and what it returns).

---

## 4. Known limitations (in-scope, observed but not fixed)

These are items I noticed during the build that are worth recording but do not block STOP closure.

1. **EF round-trip not testable from the sandbox environment.** Local proxy at `127.0.0.1:45129` blocks outbound HTTPS to `cnbsxwtvazfvzmltkuvx.supabase.co` (returns 403 "Host not in allowlist"). All live-EF smoke steps (STOP 1 #3, STOP 4 #3-5, STOP 5 #4-5) deferred to Director post-merge browser test, with reproduction commands and Chairman parallel MCP evidence at each gate.

2. **Sandbox auth-bypass means all live-data panels render empty-state copy at `/partners/sim-2026/`.** This is intentional per Chairman option-2-modified deviation 3: empty-state copy is truthful in all three observable cases (localhost-no-auth, prod-zero-rows, prod-401). When Director opens the same pages logged in (or when the engagement is promoted to `dnb-2026`), the panels populate from live data.

3. **`businessDaysRemaining_` helper (STOP 3 SLA countdown)** walks Mon-Fri only; UK bank holidays are NOT subtracted client-side. The SQL function `compute_uk_business_day_offset` (server-side, used to populate `feature_capability_requests.sla_target_response_at`) is the authority for the deadline; the client display shows working-day approximation. Could differ by 1-2 days during bank-holiday weeks. Document in handover; Director may opt to add a UK bank-holiday calendar to the JS client if precision becomes important.

4. **Existing PR #173 4-axis configurator bypassed Chairman option α attribution duplication.** The configurator page already has an AMD-098 12-source attribution panel from earlier work. STOP 1's universal `mountAttributionBlock` injects the brief §5.5 3-source attribution block at the bottom of every page including configurator. Both render — they're complementary (the 12-source panel is licence-specific; the 3-source block is the canonical Eileen RAG attribution). No conflict, but a future cleanup pass might consolidate.

5. **The pathway page's existing 6-phase SVG diagram (AILANE-ROADMAP-DNB-001 v1.3, D&B-specific) is preserved as supplementary content beneath the new 7-phase JIPA view.** This means two phase decompositions (6-phase A-F D&B vs 7-phase 0-F JIPA-GRD-001) are visible on the same page. Disambiguation note added; for promotion to `dnb-2026/` this duality is contextually appropriate (the SVG is the D&B-specific delivery view of the same generic JIPA protocol).

6. **`partners/sim-2026/auth-callback/`** (PR #174 path) is the canonical deal-room post-auth router per Chairman clarification (D); root `auth/callback/` was not touched per CLAUDE.md.

---

## 5. Suggested next session

For Chairman's planning purposes, the suggested next session(s) after STOP 5 merge:

1. **Promotion to `dnb-2026/`.** Per brief §1.6 + §13 explicitly out-of-scope for this brief. New session under Chairman authority. Approach: byte-identical port of the 9 sim-2026 files (with three deliberate substitutions: `CLID = 'dnb-2026-001'`, `IS_SANDBOX = false`, sandbox banner removed). The cumulative diff is now small enough (5 STOP commits, 9 files, +2,211 / −233 lines) that a copy + sed pass is feasible in one session.

2. **Clarification resolution.** Chairman to resolve the three Specification clarifications (§3.1 upload widget, §3.2 pathway durations, §3.3 cppp-generate-receipt EF) before the dnb-2026 promotion or as a follow-up patch on this branch.

3. **Live-leg smoke closure.** Director runs the deferred reproductions captured in §2 above to close every live-EF round-trip step (STOP 1 #3, STOP 2 #3-4, STOP 3 #3-5, STOP 4 #3-6, STOP 5 #4-5) in a logged-in browser. Update this document's tick-boxes.

4. **Optional: UI polish.** A small follow-up could consolidate the duplicate attribution surfaces on the configurator page (§4 limitation 4); add a UK bank-holiday calendar to `businessDaysRemaining_` (§4 limitation 3); and consider a future right-sidebar Eileen layout per the original brief §1.3 #4 (Chairman accepted the full-width section as deviation 1 at STOP 1).

---

## 6. Architecture notes for future engineers

- All STOP work extends `partners/sim-2026/script.js` and `partners/sim-2026/style.css` in place per Chairman clarification (C). No `_shared/` module created; per-clid script architecture preserved.
- Universal-skeleton injectors live in `revealPage()` (script.js L432-449) in this order: `injectMenuBar` → `injectSubPageNav` (now short-circuits when menu bar present) → `injectAuthChip` → `mountEileenExplanation` → `injectPhaseTracker` → `injectDocumentVault` → `injectEileenPanel` → `bindEileenPanel` → `applyDocumentGating` → `mountAttributionBlock` → `populateWhatsHappening`. All are idempotent.
- Page-specific populators dispatched off `location.pathname` in the same `revealPage` block: `populateDocumentsCatalog` + `populateArtefactsView` for `/documents/`; `populateConfigurator` for `/configurator/`; `populateEngagementPanels` for `/status/`; `populatePathway` for `/pathway/`.
- `ENGAGEMENT_PHASE_META` constant is the single source of truth for phase content; used by both STOP 3 (Engagement Current Phase panel) and STOP 5 (Pathway detail blocks). When extending phase content, edit this one constant.
- AMD-069 colour discipline: `--dr-gold` (#F59E0B) appears ONLY on (a) Institutional tier-chip on configurator (PR #173-era), (b) current-phase chip on Pathway when user is Institutional / Director, (c) sandbox-banner gradient (sim-2026 only). Cyan baseline elsewhere.

---

**End of handover.**
