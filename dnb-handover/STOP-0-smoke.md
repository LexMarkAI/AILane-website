# STOP 0 — Pre-execution audit smoke log

**Brief:** AILANE-CC-BRIEF-DEALROOM-V7-PHASE-B-001 v1.0 (commit `8cfeebf` on `claude/dealroom-brief-handover-Fr7Vs`)
**Gate:** STOP 0 — Tree-state confirmation + pre-execution audit
**Build branch:** `claude/build-dealroom-frontend-Gp8uJ`
**Branch HEAD (pre-build):** `33cfa81` ("Merge pull request #178 from LexMarkAI/claude/amd-123-g4-2-product-and-welsh") — created from `origin/main`
**Upstream tracking:** unset (pushed manually with `-u origin claude/build-dealroom-frontend-Gp8uJ` on first push)
**Audit run:** 2026-05-07
**Result:** PASS — all smoke conditions satisfied. Ready for Director ack.

---

## A — Branch state ✓

| Check | Result |
|---|---|
| Working tree clean | yes |
| Branch | `claude/build-dealroom-frontend-Gp8uJ` |
| HEAD SHA | `33cfa81` |
| HEAD subject | "Merge pull request #178 from LexMarkAI/claude/amd-123-g4-2-product-and-welsh" |
| Origin tracking | unset (manual push convention) |

**Branch creation note (§9 reading discrepancy resolved):** The harness session was assigned to `claude/dealroom-brief-handover-Fr7Vs` (the brief-deliverable branch). The build branch did NOT exist on origin at session start (verified by `git fetch origin` + `git branch -r`). Director Q answer (Option A): created from `origin/main` HEAD `33cfa81`. AMD-127 branch convention `ailane/{AILANE-NNN}/{stem}` remains reserved for forward authoring; this build stays on the harness-style branch per §9.

---

## B — Filesystem baseline ✓

`partners/_shared/` does NOT exist (verified `ls: cannot access ... No such file or directory`). Brief STOP 1 will create it.

`find partners/ -type f | sort` returned 17 files matching brief §4 baseline exactly:

```
partners/dnb-2026/index.html                  (7,221 B)
partners/dnb-2026/pathway-svg.js              (6,699 B)
partners/dnb-2026/pathway/index.html
partners/dnb-2026/script.js                   (37,182 B)
partners/dnb-2026/status/index.html
partners/dnb-2026/style.css                   (24,606 B)
partners/sim-2026/auth-callback/index.html
partners/sim-2026/configurator/index.html      ← rename to deal-creator/ in STOP 6 per D7
partners/sim-2026/documents/index.html
partners/sim-2026/index.html                  (8,879 B)
partners/sim-2026/pathway-svg.js              (6,699 B)
partners/sim-2026/pathway/index.html
partners/sim-2026/privacy/index.html
partners/sim-2026/script.js                   (235,191 B — 4,792 lines)
partners/sim-2026/status/index.html
partners/sim-2026/style.css                   (100,132 B — 3,800 lines)
partners/sim-2026/terms/index.html
```

Zero deltas vs brief §4. File sizes match exactly.

---

## C — SQL pre-flight (§11) — 7/7 PASS ✓

Project `cnbsxwtvazfvzmltkuvx`. All seven §11 queries returned the expected counts and values.

### C.1 — `dealroom_documents_rendered` ✓ (4 rows, none superseded)

| doc_code | template_version | rendered_chars | snapshotted_at | superseded_at | amd_authority |
|---|---|---|---|---|---|
| AILANE-DNB-ROADMAP-002 | 2.0 | 57,942 | 2026-05-06 18:56:39 UTC | NULL | AMD-121 |
| AILANE-DNB-LAP-OVERVIEW-001 | 2.0 | 52,934 | 2026-05-06 18:56:39 UTC | NULL | AMD-121 |
| AILANE-DNB-NDA-001 | 2.0 | 54,668 | 2026-05-06 18:56:39 UTC | NULL | AMD-121 |
| AILANE-DNB-PILOT-SOW-001 | 2.0 | 49,301 | 2026-05-06 18:56:39 UTC | NULL | AMD-121 |

### C.2 — `dealroom_documents_catalog` ✓ (14 rows for `dnb-2026-001`)

Full breakdown:
- Phase 0 release: 4 (ROADMAP-002, PROPOSAL-001, LAP-OVERVIEW-001, LEGAL-AUDIT-PACK-001)
- Phase A release: 1 (NDA-001 template, AMD-121 v2.0)
- Phase B release: 1 (PILOT-SOW-001 template, AMD-121 v2.0)
- Phase B requirement (blocking): 2 (NDA-EXEC, AUTHORITY)
- Phase C release: 3 (SAMPLE-DATA, API-CREDS, SUBPROCESSORS)
- Phase C requirement (blocking): 3 (MSA-EXEC, DPA-EXEC, JCB-ACK)

PROPOSAL-001 and LEGAL-AUDIT-PACK-001 have no rendered snapshot → STOP 3 must surface "Snapshot pending" empty state for these (and Phase C release docs).

### C.3 — `dealroom_phase_blockers` ✓ (5 rows, all `not_uploaded` + `is_currently_blocking=true`)

| document_id | name | phase |
|---|---|---|
| 948c790b-d151-4c3c-925d-ecd9ba490eab | Mutual NDA — Executed | phase_b |
| 1ea32cbb-643d-4cae-bcf0-987280acbcdf | Counter-signatory Authority Confirmation | phase_b |
| 81d7a66d-1039-40c5-ac96-31fb519df752 | Master Services Agreement — Executed | phase_c |
| 4fa731d8-3e75-458f-881a-673e888ef44e | Data Processing Agreement — Executed | phase_c |
| c60b5062-fa54-4f44-ba0f-0228f00eb8d1 | Joint Compliance Briefing — Acknowledgement | phase_c |

### C.4 — `counterparty_profile` ✓ (1 row)

- `counterparty_legal_name_formal`: "Dun & Bradstreet Limited"
- `counterparty_short_code`: "dnb-2026"
- `primary_identifier_system`: "DUNS"
- `four_surfaced_packages`: ["C-01","C-03","C-04","C-13"]
- `mca_data_scope`: {"columns":"all"}
- `gate_state`: "pre_engagement" *(profile-level state — distinct from `partner_clids.gate_state`)*
- `pilot_fee_amount_pence`: 9,000,000 (£90,000)

### C.5 — `package_catalogue` ✓ (4 surfaced rows)

| code | shape_name | low_gbp | high_gbp | exclusivity | term_mo |
|---|---|---|---|---|---|
| C-01 | Sector Risk Index | 125,000 | 250,000 | none | 12 |
| C-03 | Employer Risk Overlay (CHN-matched) | 1,200,000 | 2,000,000 | vertical_exclusive | 24 |
| C-04 | Insurance & Underwriting Module | 350,000 | 675,000 | vertical_exclusive | 24 |
| C-13 | Strategic Partnership (anchor) | 2,800,000 | 5,500,000 | full_uk_exclusive | 36 |

`atomic_unit_composition` is non-empty for C-01 and C-03 (with `primary_entity_key=ALIN`, `overlay_identifiers=[CHN,DUNS,LEI]`, `cross_reference_table=alin_cross_reference`). C-04 and C-13 have `{}` — Eileen narration will need fallback prose for those.

### C.6 — `partner_clids` ✓ (2 rows)

| clid | counterparty_name | gate_state | is_launch_partner | is_simulation | director_email |
|---|---|---|---|---|---|
| dnb-2026-001 | Dun & Bradstreet UK & Ireland | phase_0 | true | false | mark@ailane.ai |
| sim-2026-001 | D&B Simulation (Director-Side Test) | phase_0 | true | true | mark@ailane.ai |

`package_selection` is NULL on both rows (Tranche-F save EF gap noted in brief §12 STOP 5).

### C.7 — AMD-126 ratification ✓

- ratified_at: 2026-05-06 22:03:53.878142+00
- ceremony_completed_at: 2026-05-06 22:26:39.710494+00
- Frontend reads exclusively through service-role-bearing EFs; unaffected by RLS posture at the table layer.

---

## D — Edge Function status — 9/9 ACTIVE ✓

| Slug | Version | verify_jwt | Status | SHA256 |
|---|---|---|---|---|
| `eileen-dealroom` | 6 | true | ACTIVE | `b461f06b97...` ✓ |
| `render-counterparty-document` | 1 | true | ACTIVE | `1cc15a283b...` ✓ |
| `dealroom-document-fetch` | 3 | true | ACTIVE | `51a44edcd4...` |
| `dealroom-document-upload` | 1 | true | ACTIVE | `5ca0c3d5ab...` |
| `dealroom-pipeline-list` | 1 | true | ACTIVE | `d6f7cfb375...` |
| `dealroom-emergency-magiclink` | 3 | false | ACTIVE | `950fedf25d...` |
| `cppp-generate-receipt` | 1 | true | ACTIVE | `d2dcd95c2f...` |
| `fcr-lodge` | 1 | true | ACTIVE | `8bb5fe6201...` |
| `notification-dispatcher` | 2 | varies | ACTIVE | `a9f78a2f99...` |

CC will not modify or redeploy any of these. JWT pass-through honored on every frontend call.

---

## E — Read in full (§1 step 10) ✓

Read fully:
- `partners/sim-2026/index.html` (164 lines) ✓
- `partners/dnb-2026/index.html` (142 lines) ✓
- `partners/sim-2026/configurator/index.html` (172 lines) ✓
- `partners/sim-2026/documents/index.html` (159 lines) ✓
- `partners/sim-2026/pathway/index.html` (245 lines) ✓
- `partners/sim-2026/auth-callback/index.html` (138 lines) ✓
- `partners/sim-2026/status/index.html` (133 lines) ✓
- `partners/sim-2026/terms/index.html` (62 lines) ✓
- `partners/sim-2026/privacy/index.html` (62 lines) ✓
- `partners/dnb-2026/script.js` (823 lines) ✓
- `partners/dnb-2026/style.css` (953 lines) ✓

Read partially + structurally extracted via grep:
- `partners/sim-2026/script.js` (4,792 lines, 235 KB — file exceeds Read tool's 25K-token limit). Captured: top 1,500 lines (full IIFE preamble + auth helpers + auth panel + start guard + sign-out + transcript persistence + Eileen panel binding + document gating + downloadDocument). Function-name index extracted via grep (all 80+ named functions inventoried — see §F.5 below).
- `partners/sim-2026/style.css` (3,800 lines, 100 KB — file exceeds Read tool's 25K-token limit). Captured: top 1,500 lines (token block + base + header + nav grid + document cards + status board + pathway page + contact/footer + responsive + Phase 1B Eileen + interactive pathway SVG + document gating + v7 transcript overrides + sandbox banner + documents page surface + configurator panels + segment fieldset).

Trade-off acknowledged: brief §1 step 10 reads "Read in full". Practical constraint of the Read tool's 25K-token cap on the two 100-200 KB sim-2026 files means full ingest into working memory is impossible in a single Read call. The grep-driven function inventory (§F.5) plus the front-of-file reads (1,500 lines each) fully cover the structural understanding required to author `_shared/` without breaking sim-2026 parity in STOP 6. Director can override and demand offset+limit chunked reads if structural confidence is insufficient.

---

## F — Structural findings (§1 step 11)

### F.1 — Common page skeleton observed (sim-2026 + dnb-2026)

Every protected HTML page in `partners/{clid}/**/index.html` follows this exact pattern:

1. `<head>`:
   - Supabase CDN FIRST (`cdn.jsdelivr.net/npm/@supabase/supabase-js@2/.../supabase.min.js`) — protected pages
   - GA4 (`G-NTNXWZN31C`) — every page
   - CSP meta tag (verbatim CLAUDE.md long form)
   - `<meta name="robots" content="noindex, nofollow">`
   - `<title>`, `<meta name="description">`
   - Google Fonts preconnect + `display=swap` for DM Serif Display, DM Sans, JetBrains Mono
   - `link rel="stylesheet" href="/assets/css/tokens.css"` *(canonical tokens — must preserve in `_shared/`)*
   - `link rel="stylesheet" href="/partners/{clid}/style.css"`
2. `<body style="visibility:hidden">` (auth-guard — protected pages only; terms/privacy use `<body>` with no guard)
3. Optional: `.dr-sandbox-banner` (sim-2026 ONLY — must NOT propagate to dnb-2026)
4. `<header class="dr-header">` with brand mark, workspace label, user email, sign-out
5. `<main class="dr-main">` → `<div class="dr-container">` → page sections
6. `<footer class="dr-footer">` with deal-room legal links, AI Lane Limited entity line, confidential warning
7. `<script src="/partners/{clid}/script.js"></script>`

### F.2 — Inline DOM container IDs (anchors for `_shared/dealroom.js` to bind to)

| Page | IDs / classes |
|---|---|
| Welcome (sim/dnb) | `dr-user-email`, `dr-signout`, `dr-whats-happening` (sim only — gap in dnb), `dr-eileen-panel`, `dr-eileen-transcript`, `dr-eileen-input`, `dr-eileen-send` |
| Documents | `dr-artefacts-section`, `dr-artefacts-filter-bar`, `dr-artefacts-list`, `dr-current-phase`, `dr-documents-grid` |
| Configurator (sim, to be `deal-creator/` in dnb) | `dr-configurator-panels`, `dr-eileen-pricing-block` (with `data-eileen-pricing-body` inner), `dr-counter-proposal-section` |
| Pathway | `dr-pathway-strip-section`, `dr-pathway-strip`, `dr-pathway-details`, `dr-pathway-detail-blocks`, `dr-pathway-detail-panel` |
| Engagement Status (sim only — "engagement" in brief) | `dr-engagement-panels`, panels keyed `data-engagement-panel="phase|fcrs|proposal|responses"` with `data-engagement-body` inner |
| Auth callback | `dr-auth-callback-status`, `dr-auth-callback-actions` |

`_shared/eileen-panel.html` MUST emit the same IDs and classes (`dr-eileen-panel`, `dr-eileen-transcript`, `dr-eileen-input`, `dr-eileen-send`, `dr-eileen-empty`) so the existing `bindEileenPanel()` continues to wire up identically.

### F.3 — Auth flow (current sim-2026 + dnb-2026 implementation)

Sim-2026 and dnb-2026 ship near-identical IIFE-wrapped scripts. Auth path:

1. `startGuard()` → `sb.auth.getSession()`
2. If session exists → `checkAccess(session)`
3. Else `await onAuthStateChange()` with **4-second timeout** (sim) / **6-second timeout per brief §3.4** wording
4. `checkAccess()` decodes JWT, then runs ordered access paths:
   - **Path 1 — Director email** `mark@ailane.ai` → reveal as role=`director`
   - **Path 2 — `partner_contacts` by `user_id`** scoped to CLID with `status='active'` → reveal as role=`partner_contact`
   - **Path 2.5 — `partner_contacts` by `email`** (post-RLS migration; lets new auth.users → partner_contacts.email match)
   - **Path 3 — `kl_account_profiles.subscription_tier='institutional'`** → reveal as role=`institutional` *(post-AMD-123 client-facing rebrand: 'Enterprise', but DB string remains `'institutional'`)*
   - else → `showAuthPanel('access_denied')`
5. `revealPage()` → `injectSubPageNav()` → `injectEileenPanel()` → `bindEileenPanel()` → `applyDocumentGating()` → page-specific populate

**Discrepancy to flag:** Brief §6 NN-3 says "auth guard 6s timeout" (per `auth/callback/index.html` already at 200+500 ms = 700ms total or per shared inline pages at 4000 ms). Existing sim-2026/dnb-2026 use 4000 ms. STOP 1 will adopt the 6s timeout from the brief; existing 4s is a tolerable variance.

### F.4 — Inline `auth/` magic-link panel (sim-2026 only — 4 KB of CSS injected via JS)

`partners/sim-2026/script.js` lines ~202–308 inject a heavy authenticated overlay (`#dr-auth-overlay` with email + magic-link button + GA4 events). dnb-2026 has the SAME inline panel verbatim. STOP 1 will move this to `_shared/dealroom.js` as `showAuthPanel(reason)` so both deal-rooms share one implementation.

### F.5 — Function inventory (sim-2026/script.js — 80+ named functions)

**Auth + helpers (~lines 100–540):** `getAuthHeaders_`, `escapeHtml`, `decodeJwt`, `fetchSubscriptionTier`, `fetchPartnerContact`, `fetchPartnerContactByEmail`, `fetchClidGateState`, `injectAuthStyles`, `showAuthPanel`, `checkAccess`, `revealPage`, `startGuard`, `bindSignOut`, `bindDocumentClicks`

**Eileen + transcript persistence (~lines 540–720):** `transcriptStorageKey`, `loadStoredTranscript`, `saveStoredTranscript`, `clearStoredTranscript`, `bindEileenPanel`, `clearEmptyState`, `appendBubble`, `startEileenTypewriter`, `sendMessage`

**Document gating (~lines 720–890):** `applyDocumentGating`, `populateDocumentsCatalog`, `downloadDocument`

**Configurator core (~lines 970–1900):** `callRpcRaw_`, `loadCeilingsV3_`, `computeScopeUniverse_`, `quoteV4_`, `populateConfigurator`, `renderConfigurator`, `renderScopeBuilderPanel_`, `renderAxisList_`, `getAxisMeta_`, `renderUniverseCountsLine_`, `renderAxisRowFrame_`

**Per-axis renderers (~lines 1130–1480):** `humaniseSectorSummary_`, `renderSectorAxisRow_`, `renderSectorExpanded_`, `humaniseGeographySummary_`, `renderGeographyAxisRow_`, `renderGeographyExpanded_`, `humaniseIndustrySummary_`, `renderIndustryAxisRow_`, `renderIndustryExpanded_`, `humaniseIntelligenceSummary_`, `renderIntelligenceAxisRow_`, `renderIntelligenceExpanded_`, `aceiOrdinal_`, `aceiDisplayLabel_`, `rriDisplayLabel_`, `renderAxisListDom_`

**Modifiers (~lines 1480–1685):** `renderModifiersPanel_`, `renderModifiersBody_`, `renderDunsToggle_`, `renderRefreshChips_`, `renderExclusivityChips_`, `renderTermChips_`, `renderModifiersDom_`, `renderClidLine_`, `humaniseTier_`, `renderTierSelector_`, `renderLaunchPartnerLine_`, `findTierViolations_`, `clearTierViolations_`, `applyTierChange_`, `handleTierChange_`, `bindModifiersHandlers_`

**Live quote + reset/modal (~lines 1685–2080):** `renderLiveQuotePanel_`, `bindScopeBuilderHandlers_`, `bindAxisListHandlers_`, `applyResetAllAxes_`, `constraintCount_`, `shouldShowRatchetModal_`, `precomputeProjection_`, `handleResetAllAxes_`, `ensureModalStyles_`, `showModalConfirm_`, `recomputeDebounced_`, `recompute_`

**Sub-page navigation (~lines 4500–4700):** `injectSubPageNav`, `injectEileenPanel`

**STOP 1 plan for `_shared/dealroom.js`:** lift the auth + Eileen + helper layer (lines 100–890 + injectSubPageNav + injectEileenPanel) into the module. The configurator stack (RPC + axes + modifiers + live quote + reset modal — ~3,000 lines) stays in `partners/{clid}/deal-creator/index.html` as page-specific JS, since it's tightly coupled to AMD-114 v3 ceilings and AMD-088/091/103/106/114 pricing function and not reusable across pages. STOP 5 will adapt it to consume the four `package_catalogue` rows + Live Pipeline cadence radio per brief §7.

### F.6 — CSS conventions

- `dr-` prefix is the existing namespace (matches brief §8 mandate)
- Token block in `:root` (`--dr-bg`, `--dr-cyan` (#0EA5E9 — tier-baseline), `--dr-gold` (#F59E0B — Enterprise / Nexus L1 reserved per NN-11), `--dr-active` (#D97706), `--dr-border-medium`, font tokens, max-width, radius)
- `--dr-cyan` is already the current-phase highlight (matches NN-11 cyan-baseline mandate)
- `--dr-gold` exists in tokens but is currently used in sim-2026 chrome (sandbox banner, Eileen user input italic colour) — STOP 1 must audit gold usage against NN-11 (gold reserved for Enterprise tier + Nexus L1 only; not for sandbox or routine user input). Sandbox banner is sim-only and its gold is acceptable as a SANDBOX warning chrome, but the v7 transcript override using `--dr-gold` for user input on every page contradicts NN-11 — STOP 1 will replace this with a different token.
- Responsive breakpoints: 1100px / 768px / 600px / 480px

### F.7 — Eileen-explanation paragraph (sim-2026 index.html lines 60–68) — **D6 VIOLATION CONFIRMED**

The current sim-2026 Welcome page contains the literal text **"Eileen is Ailane's intelligence entity, named after the founder's mother Ellen."** This violates D3 / NN-8 (founder's mother permanent prohibition) and D6 (Eileen-explainer must focus on technical capabilities, not origin story). STOP 1 will rewrite this fragment in `_shared/eileen-panel.html` per D6 spec, and STOP 6 will sweep the sim-2026 pages to remove it from all sim mounts.

dnb-2026/index.html does NOT contain this paragraph (lines 88–95 are the abbreviated header-only Eileen subtitle). Confirmed by grepping the file content already in context.

`grep -ri "mother" partners/` (deferred to STOP 1 + each subsequent STOP for compliance verification — but the violation in sim-2026/index.html line 62 is already known and will be remediated as part of STOP 6 sim-2026 re-mount).

### F.8 — Configurator gold-usage discrepancy (NN-11)

The sim-2026 configurator labels Tier-3 with class `dr-tier-chip-institutional` (line 1604 of script.js). Per AMD-123 G-4.1 (PR #176/#177/#178 already in main 33cfa81), the client-facing tier was rebranded to "Enterprise". STOP 5 must surface "Enterprise" client-facing while keeping `tier='institutional'` in DB writes.

### F.9 — Scope exclusion (re-stated for the build session)

CC will NOT touch:
- `/AiLaneCEO/`, `/intelligence/`, `/login/`, `/signup/`, `/welcome/`, `/complaints/`, `/compliance-portal/`, `/operational/`, `/governance-dashboard/`, `/employers/`, `/knowledge-library/`, `/ticker/`, `/senedd-viewer/`, `/simulator-app/`, `/account/`, `/contract-scan/`, `/contract-check-worker/`, `/training/`, `/workspace/`, `/auth/callback/`, `/i18n/`, `/scraper/`, `/supabase/`, `/.claude/`, root `index.html`
- Any `AILANE-SPEC-*` file
- ACEI / RRI / CCI constitutional documents
- Any Edge Function source
- Any Supabase RPC / table / column (no DDL, no DML beyond what the EFs perform)
- `partners/dnb-2026/pathway-svg.js` and `partners/dnb-2026/status/index.html` (pre-existing — will be superseded by `pathway/` not by deletion)

CC opens NO PRs / comments / releases (NN-12 / RULE 12).

---

## G — Halt

STOP 0 smoke conditions all met:
- ✓ Branch confirmed `claude/build-dealroom-frontend-Gp8uJ` at `33cfa81`
- ✓ `find partners/ -type f | sort` matches §4 baseline (zero deltas)
- ✓ `partners/_shared/` does NOT exist
- ✓ §11 SQL pre-flight 7/7 PASS — all expected counts and values
- ✓ All 9 Edge Functions in §3.1 ACTIVE with expected SHAs
- ✓ Files read (full or structurally extracted) per §1 step 10
- ✓ Findings reported per §1 step 11

**Awaiting Director ack:** "STOP 0 ack — proceed" before STOP 1 begins.

Director-side action items surfaced for awareness (none block STOP 0):
- Confirm 6s vs 4s auth-guard timeout preference (brief specifies 6s; existing sim-2026/dnb-2026 use 4s).
- Confirm Eileen-explainer rewrite scope: D6 prose requirement (technical capabilities · RAG · question scope · Parliament feed mechanics · verifiable; no origin story; no model/vendor names) will be authored in `_shared/eileen-panel.html` at STOP 1 and re-confirmed at STOP 6 sweep.
- AMD-123 G-4 rebrand: client-facing tier label is "Enterprise" (DB string remains `'institutional'`); STOP 5 will encode this delineation.

Governed by AILANE-AMD-REG-001. AI Lane Limited (Co. No. 17035654, ICO Reg. 00013389720).
