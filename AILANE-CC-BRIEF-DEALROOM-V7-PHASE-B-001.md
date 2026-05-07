# AILANE-CC-BRIEF-DEALROOM-V7-PHASE-B-001 v1.0

**Subject:** Stage 3 deal-room frontend — `/partners/dnb-2026/` — Tranche F build
**Authoring authority:** Chairman, AI Lane Limited — under AAD v1.0 Path A
**Issued at:** 7 May 2026
**Discharges:** AMD-121 Tranche F · supports AMD-120 (Eileen v7) · honours AMD-123 G-1/G-2/G-4/G-5 · safe under AMD-126 RLS posture
**Predecessor:** `AILANE-HANDOVER-DEALROOM-V7-PHASE-B-PREP-001` (Chairman handover, 7 May)
**Build branch:** `claude/build-dealroom-frontend-Gp8uJ` (existing harness branch — confirmed by Director 7 May)
**Brief deliverable branch:** `claude/dealroom-brief-handover-Fr7Vs` (this document)
**Final deliverable for CC:** `partners/_shared/` shared library + `partners/dnb-2026/` five universal pages + sim-2026 mounted on `_shared/` + six STOP-gate smoke logs + handover summary

---

## §0 — Opening line for the next CC session

> Execute `AILANE-CC-BRIEF-DEALROOM-V7-PHASE-B-001 v1.0` against branch `claude/build-dealroom-frontend-Gp8uJ`. Read this brief in full before writing any code. Six STOP-gate smoke tests, all gate-blocked. Refactor to `partners/_shared/`. Director's seven layout-drift defects must be remediated. Director's twelve non-negotiables are binding. Live Pipeline renders in three places (5th tile + per-Package sub-section + configurator cadence radio). CC pushes; Director merges. CC opens NO PRs.

---

## §1 — Pre-execution audit (MANDATORY before any code change)

CC's first acts in the build session, in order, before any file write:

1. `git status` — confirm working tree clean
2. `git branch --show-current` — confirm on `claude/build-dealroom-frontend-Gp8uJ`. If not, switch.
3. `find partners/ -type f | sort` — capture baseline
4. `ls -la partners/_shared/` — must return "No such file" (this brief creates it)
5. Read `CLAUDE.md` in full — every rule is binding for this build
6. Read this brief in full — every gate is binding
7. Read `AILANE-HANDOVER-DEALROOM-V7-PHASE-B-PREP-001` for the architectural backdrop (five-layer mail-merge, ALIN identifier system, EF estate)
8. Run §11 SQL pre-flight via Supabase MCP — every row must match the expected counts in §6 below
9. Run `mcp__879546c7-de70-4c9f-b420-8f5e842bce40__list_edge_functions` and confirm the nine deal-room EFs are ACTIVE (slugs in §3 below)
10. Read in full: `partners/sim-2026/script.js` (235 KB), `partners/sim-2026/style.css` (100 KB), `partners/sim-2026/index.html`, `partners/dnb-2026/index.html`, `partners/dnb-2026/script.js`, `partners/dnb-2026/style.css`, `partners/sim-2026/{configurator,documents,pathway,status,auth-callback,terms,privacy}/index.html`
11. Report findings to Director: file sizes, IDs of any inline DOM containers, function names of the existing sim-2026 module exports, the actual structure observed, and the explicit scope-exclusion list (paths in §10 of this brief)
12. Wait for confirmation before STOP 1

Skip any of steps 1–12 and the build is invalid. CC is bound by CLAUDE.md "MANDATORY FIRST STEP — EVERY SESSION".

---

## §2 — Authority chain (joint, all ratified)

| AMD | Subject | Status |
|---|---|---|
| AMD-120 | Eileen Deal-Room v7 specification | Ratified 4 May 2026 — Operative |
| AMD-121 | Deal-Room Template Machinery & Catalogue Architecture (Tranches A–F) | Ratified 5 May 2026 — Tranches A/B/C/E discharged; Tranche F = this brief |
| AMD-122 | ALIN Identifier System + SEC-001 + DPIA Estate v1.4 | Ratified 5 May 2026 — Discharged |
| AMD-123 | Subscriber Tier Rebrand (Institutional → Enterprise) + PCIE/Deal-Room Delineation + AMD-121 Corrigenda | Ratified 6 May 2026 — G-1/G-2/G-4/G-5 closed; G-3 in flight separately |
| AMD-126 | RLS Hardening (16 public tables) + INVOKER→DEFINER Conversion | Ratified 6 May 2026 — FULLY CLOSED, ceremony 22:26:39 UTC |
| AMD-127 | RESERVED — branch naming convention (Director Q3 answer 7 May) — out-of-scope for this build | Not ratified — awaiting authoring |

Governing constitutions: ACEI v1.0, RRI v1.0, CCI v1.0
Governing register: AILANE-AMD-REG-001
Governing Cornerstone: AILANE-SPEC-PLUGIN-001 v1.0 Article XIV (intelligence/advice boundary)
Bound by CDIE-001 §2.2 (deal-room Eileen carve-out), AUDIT-REID-001 (anonymity discipline), JIPA-GRD-001 v1.2 (engagement protocol)

---

## §3 — Backend dependencies (verified via Supabase MCP, 7 May)

### §3.1 Edge Functions (all ACTIVE — confirmed)

| Slug | Version | verify_jwt | Purpose | Frontend usage |
|---|---|---|---|---|
| `eileen-dealroom` | v6 (sha256 `b461f06b97...`) | true | Eileen v7 surface; pricing engine pass-through | `callEileen()` from every page |
| `render-counterparty-document` | v1 (sha256 `1cc15a283b...`) | true | Five-layer mail-merge renderer | NOT called from frontend (server-side only) |
| `dealroom-document-fetch` | v3 | true | Reads catalog + streams `rendered_body` | Documents page primary |
| `dealroom-document-upload` | v1 | true | Uploads to `dealroom_uploads` against blocker slots | Documents + Engagement pages |
| `dealroom-pipeline-list` | v1 | true | Returns `gate_state`, latest counter-proposal, open FCRs, Director responses | Welcome + Engagement pages |
| `dealroom-emergency-magiclink` | v3 | false | Magic-link issuance | NOT called from frontend |
| `cppp-generate-receipt` | v1 | true | Counter-Party Proposal Pipeline receipt | Engagement page (CPPP receipts) |
| `fcr-lodge` | v1 | true | Future Capability Request lodge with 60s replay-window defence | Engagement page (FCR submission) |
| `notification-dispatcher` | v2 | varies | Generic notification broker | NOT called from frontend |

CC must NOT modify any of these EFs. CC must NOT bypass JWT pass-through. Every backend call from frontend goes through `callEileen()` or a parallel helper in `_shared/dealroom.js` that injects the user's JWT.

### §3.2 Tables (all RLS-on post-AMD-126; service-role-only AMD-076 pattern)

Counterparty profile (1 row):
- `counterparty_short_code='dnb-2026'`
- `counterparty_legal_name_formal='Dun & Bradstreet Limited'` (legal entity)
- `primary_identifier_system='DUNS'`
- `four_surfaced_packages=['C-01','C-03','C-04','C-13']`
- `mca_data_scope={"columns":"all"}`
- `gate_state='pre_engagement'` (note: this is a profile-level state distinct from the pipeline gate)

CLID (1 row, plus simulation):
- `dnb-2026-001` — `counterparty_name='Dun & Bradstreet UK & Ireland'` (trading) — `gate_state='phase_0'` — `is_launch_partner=true` — `is_simulation=false` — `director_email='mark@ailane.ai'`
- `sim-2026-001` — `is_simulation=true` — `gate_state='phase_0'` — same Director

**Two distinct `gate_state` fields exist.** `counterparty_profile.gate_state` ('pre_engagement') is the entity-relationship state. `partner_clids.gate_state` ('phase_0') is the deal-room pipeline state. Frontend reads phase from `dealroom-pipeline-list` (which reads `partner_clids`); never read phase from `counterparty_profile`.

Catalog scoped to `dnb-2026-001` (14 active rows):

| Phase | Kind | doc_code | Name | Blocking |
|---|---|---|---|---|
| phase_0 | release | AILANE-DNB-ROADMAP-002 | Engagement Roadmap | no |
| phase_0 | release | AILANE-DNB-PROPOSAL-001 | Commercial Proposal | no |
| phase_0 | release | AILANE-DNB-LAP-OVERVIEW-001 | Legal & Audit Pack Overview | no |
| phase_0 | release | AILANE-DNB-LEGAL-AUDIT-PACK-001 | Legal & Audit Pack | no |
| phase_a | release | AILANE-DNB-NDA-001 | Mutual NDA (template) | no |
| phase_b | release | AILANE-DNB-PILOT-SOW-001 | Pilot SOW (template) | no |
| phase_b | requirement | DNB-NDA-EXEC-001 | Mutual NDA — Executed | YES |
| phase_b | requirement | DNB-AUTHORITY-001 | Counter-signatory Authority | YES |
| phase_c | release | AILANE-DNB-SAMPLE-DATA-001 | Sample Data Export | no |
| phase_c | release | AILANE-DNB-API-CREDS-001 | Live API Stream Credentials | no |
| phase_c | release | AILANE-DNB-SUBPROCESSORS-001 | Sub-Processor Schedule | no |
| phase_c | requirement | DNB-MSA-EXEC-001 | MSA — Executed | YES |
| phase_c | requirement | DNB-DPA-EXEC-001 | DPA — Executed | YES |
| phase_c | requirement | DNB-JCB-ACK-001 | Joint Compliance Briefing — Acknowledgement | YES |

Phase blockers (5 rows in `dealroom_phase_blockers`, all `upload_status='not_uploaded'`, all `is_currently_blocking=true`): two Phase B (NDA, Authority) and three Phase C (MSA, DPA, JCB).

Snapshots in `dealroom_documents_rendered` (4 rows, none superseded, all under AMD-121 authority, all snapshot 2026-05-06 18:56:39 UTC):

| doc_code | template_version | rendered_chars |
|---|---|---|
| AILANE-DNB-ROADMAP-002 | 2.0 | 57,942 |
| AILANE-DNB-LAP-OVERVIEW-001 | 2.0 | 52,934 |
| AILANE-DNB-NDA-001 | 2.0 | 54,668 |
| AILANE-DNB-PILOT-SOW-001 | 2.0 | 49,301 |

The Commercial Proposal (PROPOSAL-001) and Legal & Audit Pack (LEGAL-AUDIT-PACK-001) and Phase C release rows are listed in the catalog but the snapshots in `dealroom_documents_rendered` cover only the four institutional v2.0 release artefacts. Frontend MUST handle the case where a catalog entry has no rendered snapshot (render an empty-state with "Snapshot pending" rather than throwing).

Package catalogue (4 surfaced rows, source of truth — DO NOT HARDCODE):

| catalogue_code | shape_name | tier_band_low_gbp | tier_band_high_gbp | exclusivity_default | term_default_months |
|---|---|---|---|---|---|
| C-01 | Sector Risk Index | 125,000 | 250,000 | none | 12 |
| C-03 | Employer Risk Overlay (CHN-matched) | 1,200,000 | 2,000,000 | vertical_exclusive | 24 |
| C-04 | Insurance & Underwriting Module | 350,000 | 675,000 | vertical_exclusive | 24 |
| C-13 | Strategic Partnership (anchor) | 2,800,000 | 5,500,000 | full_uk_exclusive | 36 |

Director's 5 May handover §5 D2 quoted £1.2M–£1.5M for C-03 and £2.8M–£3.5M for C-13. The DB rows are wider (£1.2M–£2.0M and £2.8M–£5.5M). Per Director non-negotiable NN-2, **read names + bands from `package_catalogue` at render time; do not hardcode**. Bands surface in £'000s (e.g. "£125K–£250K" for C-01, "£1.2M–£2.0M" for C-03) by formatting `tier_band_low_gbp` / `tier_band_high_gbp` client-side.

Partner contacts for `dnb-2026-001` (1 row): Director self-test only (`markglane@gmail.com`). D&B-side contacts will be provisioned post-build by Director.

### §3.3 Five-layer mail-merge architecture (informational only — frontend is Layer 5)

- **Layer 1** `template_pack` — counterparty-agnostic master with `{{PLACEHOLDER}}` substitutions
- **Layer 2** `counterparty_profile` — per-counterparty values
- **Layer 3** `render-counterparty-document` EF — server-side renderer (NOT called from frontend)
- **Layer 4** `dealroom_documents_rendered` — frozen snapshots (audit chain)
- **Layer 5** Frontend (this brief) — thin reader; no live render; no branching on counterparty identity in JS; CLID read from URL path

CLID is read from URL: `getCurrentClid()` parses `window.location.pathname`. Pattern: `/partners/{clid-stem}/...` → `clid = '{clid-stem}-001'`. Two stems are valid this build: `dnb-2026` → `dnb-2026-001`, `sim-2026` → `sim-2026-001`. Hardcode no other mapping.

### §3.4 ALIN identifier note (informational)

74,322 E-ALINs allocated. Cross-reference `alin_cross_reference` joins ALIN ↔ CHN ↔ DUNS. Frontend does NOT call ALIN RPCs in this build — package atomic-unit composition references the cross-reference table via Eileen's narration when the user asks; that's all.

---

## §4 — Frontend baseline (verified 7 May)

```
partners/
  dnb-2026/                       # PARTIAL — to be rebuilt from _shared/
    index.html         (7,221 B)
    pathway-svg.js     (6,699 B)
    pathway/index.html
    script.js          (37,182 B)
    status/index.html
    style.css          (24,606 B)
  sim-2026/                       # FULL Phase B build (5 May) — to be re-mounted on _shared/
    auth-callback/index.html
    configurator/index.html       # to be renamed deal-creator/ per D7
    documents/index.html
    index.html         (8,879 B)
    pathway-svg.js     (6,699 B)
    pathway/index.html
    privacy/index.html
    script.js          (235,191 B)
    status/index.html
    style.css          (100,132 B)
    terms/index.html
  _shared/                        # DOES NOT EXIST — this brief creates it
```

PR history relevant to the substrate: #173 (four-axis scope builder), #174 (workspace shell + document vault + phase tracker), #176/#177/#178 (AMD-123 G-4 Enterprise rebrand site-wide). All in main as of 7 May commit `33cfa81`.

---

## §5 — Director's seven layout-drift defects (ratified 5 May, all must be remediated in `_shared/`)

| ID | Defect | Required correction |
|---|---|---|
| D1 | Phase enum strings (`phase_0`, `phase_a`, etc.) appearing client-facing | `_shared/dealroom.js` exposes `PHASE_LABEL = { phase_0: 'Phase 0 — Pre-engagement', phase_a: 'Phase A — Initial engagement', phase_b: 'Phase B — NDA & Pilot SOW', phase_c: 'Phase C — Pilot delivery', phase_d: 'Phase D — Commercial commitment', phase_e: 'Phase E — Operational launch', phase_f: 'Phase F — Steady state & renewal' }`. NEVER render the raw enum string |
| D2 | Deal Creator missing the four canonical packages | Render four tile-cards with names + DB-derived bands (NOT C-01/C-03/C-04/C-13 codes). Read `shape_name` and bands from `package_catalogue` at fetch time. NN-2 binding |
| D3 | Founder's mother reference | **PERMANENT PROHIBITION.** No client-facing surface, prose, document, output, JS string, comment, attribute, or alt-text. CC must `grep -ri "mother" partners/` before STOP 6 push. Any hit → fix → re-grep |
| D4 | Wrong navigation pattern (sticky horizontal menu) | Replace with FOUR TILE-CARDS (Documents · Engagement · Deal Creator · Pathway) positioned UNDER the intro on every page. `_shared/tile-cards.html` fragment |
| D5 | Missing/wrong Engagement Phase rail | Implement PERMANENT LEFT-SIDE RAIL on every page; seven phases (0→F); green frame on UNLOCKED phases (computed from `gate_state` ordering); click-to-expand description. **No document links per phase** (Director's 5 May refinement). `_shared/phase-rail.html` fragment |
| D6 | Eileen-explanation paragraph wrong content | Rewrite focused on: technical capabilities · RAG integration · question scope · Parliament feed mechanics · verifiable. NO internal architecture exposure. NO references to founder, family, or origin story. NO references to model name or vendor |
| D7 | "Configurator" page slug + title | Rename to "Deal Creator" everywhere — page slug `deal-creator/`, page `<title>`, all UI strings, navigation entries, breadcrumbs, in-page links |

---

## §6 — Director's twelve binding non-negotiables (ratified 5 May)

NN-1. Eileen RAG-enabled on every page, under the menu, with persistence (conversations saved to `eileen_dealroom_conversations`, copyable, savable to Documents)
NN-2. Welcome (`/partners/{clid}/`) IS the Deal Room overview — warm intro + how-Eileen-works explainer + tile-cards + permanent left phase rail + always-visible Eileen panel
NN-3. Universal page skeleton on all five pages: warm intro · Eileen-explainer · four tile-cards · permanent left phase rail · page content · Eileen panel · AMD-098 attribution · deal-room legal links · footer
NN-4. Engagement vs Pathway distinction. Engagement = current state; Pathway = full 6-phase journey explainer (read-only)
NN-5. DMSP-001 v3 institutional content surfaced where Eileen cites it, with `(currently in draft, pending AMD-095 ratification)` qualifier — NOT hidden
NN-6. Pages live under both deal-rooms with identical surfaces. CLID read from URL at runtime, never hardcoded
NN-7. Brand: "Ailane" one word client-facing; "AI Lane Limited" only for legal entity name (footers, legal docs)
NN-8. **Founder's mother NEVER mentioned in any client-facing surface, prose, document, output. Ever. Permanent.** (Same as D3; restated for emphasis)
NN-9. Eileen pronouns: she/her. Never "the AI", "the bot", "the assistant" client-facing
NN-10. Skip sandbox. Configure dnb-2026 directly (`SANDBOX_CLIDS = []` already merged 5 May)
NN-11. Brand/discipline guards: gold `#F59E0B` reserved for Enterprise tier (post-AMD-123) and Nexus L1 only. Tier-baseline cyan `#0EA5E9` for current-phase highlight
NN-12. CC pushes; Director merges. PR titles per ailane-cc-brief skill RULE 12 — **CC opens NO PRs, comments, releases, or any GitHub-side resource**

CLAUDE.md additionally binds:

- GA4 (`G-NTNXWZN31C`) on every HTML page (no exceptions)
- CSP meta tag (the long one — copy verbatim from CLAUDE.md "EVERY HTML PAGE MUST INCLUDE")
- Banned terms: "Flash Check" / "Full Check" / "scan" (as product noun) / "guaranteed" / "fully compliant" / "ensures compliance"
- Tier strings exact case-sensitive: `operational_readiness`, `governance`, `institutional` (DB-side); client-facing rebrand per AMD-123: Operational Readiness · Governance · Enterprise
- Demo entity (any seed values): Northerly Hill Facilities Management Ltd, ref NH-2014-0347 — never Northgate or Meridian
- Private address `4 Min-Y-Mor, Barry, Wales, CF62 6QG` NEVER outputs publicly

---

## §7 — Live Pipeline rendering (Director-confirmed 7 May: ALL THREE places)

Director Q1 answer: **all three placements**. Implement on `partners/{clid}/deal-creator/index.html` exactly as follows:

### 7.1 — Fifth tile alongside the four canonical packages

Render after the C-01/C-03/C-04/C-13 tiles, visually distinguishable (e.g. cyan accent border, "Layered Product" tag in header). Tile contents:

- Header: "Live Pipeline" (h3) + "Layered Product" badge
- Band line: "£150K–£300K depending on cadence" (read from a separate `package_catalogue` row if one is added; else hardcode this string from the Roadmap once and flag for AMD-127 to canonicalise)
- One-line framing: "Refresh matched-employer state for any selected Package on a configurable cadence — daily, weekly, monthly, or quarterly."
- CTA button: "Add to Deal Creator" (toggles configurator selection)

### 7.2 — Collapsible sub-section under EACH Package box

For each of the four Package tile-cards, attach a collapsible `<details>` element (closed by default) labelled "Live Pipeline overlay". When expanded:

- Body: "Live Pipeline overlay would refresh matched-employer state for {{shape_name}} on a configurable cadence (daily / weekly / monthly / quarterly)."
- Pricing impact note: "Adds £150K–£300K to this Package depending on cadence selection in the configurator."

Substitute `{{shape_name}}` from the `package_catalogue` row at render time.

### 7.3 — Configurator cadence radio (modifier panel)

In the Deal Creator configurator (the panel that surfaces six scope axes + five modifiers), add a sixth modifier:

- Label: "Live Pipeline cadence"
- Radio group, exactly five options in this order: `none` · `quarterly` · `monthly` · `weekly` · `daily`
- Default: `none`
- Persist selection in the existing configurator state object alongside the other axes/modifiers
- Eileen narrates the price impact via `[PRICE_QUOTE]` marker on cadence change (debounced 800 ms)

These three places must be in sync: selecting a cadence in (7.3) reflects in (7.1)'s CTA state and in any (7.2) sub-section that's been expanded for the active Package selection.

---

## §8 — Refactor to `partners/_shared/` (Director-confirmed Option B)

Final structure post-build:

```
partners/
  _shared/
    dealroom.css           # extends style.css principles; uses dr- prefix only
    dealroom.js            # ES module: auth + Eileen + helpers + getCurrentClid() + PHASE_LABEL + callEileen() + callDealroomEF(slug, body) + renderTileCards() + renderPhaseRail() + renderEileenPanel()
    eileen-panel.html      # reusable HTML fragment, injected via fetch() + innerHTML
    phase-rail.html        # reusable left-rail fragment
    tile-cards.html        # reusable four-tile-card fragment (template literal placeholders)
  sim-2026/
    index.html             # Welcome — universal skeleton
    documents/index.html
    engagement/index.html
    deal-creator/index.html
    pathway/index.html
    terms/index.html
    privacy/index.html
  dnb-2026/
    index.html             # identical structural pattern to sim-2026
    documents/index.html
    engagement/index.html
    deal-creator/index.html
    pathway/index.html
    terms/index.html
    privacy/index.html
```

CSS prefix discipline: every selector new to `_shared/dealroom.css` MUST be prefixed `.dr-` (deal-room). No bare element selectors except `body, html, *` resets. This guarantees zero collision with sim-2026's existing 100 KB stylesheet during the migration.

JS discipline: `_shared/dealroom.js` is an ES module (`<script type="module">`). It exports the named functions/constants listed above. No global pollution. Existing sim-2026 `script.js` may continue to coexist during the migration; final state is that sim-2026's pages also import from `_shared/dealroom.js` and the per-counterparty `script.js` shrinks to <30 KB of counterparty-specific glue (mostly nothing — the only counterparty-specific values in JS are the CLID stem in the URL, and that comes from `getCurrentClid()`).

HTML fragments: loaded via `fetch('/partners/_shared/eileen-panel.html').then(r => r.text())` and injected. CSP `connect-src 'self'` covers this; no CSP edit needed.

The legacy `partners/sim-2026/configurator/` directory is renamed to `partners/sim-2026/deal-creator/` (D7). The legacy `partners/dnb-2026/{pathway-svg.js, status/}` files remain in place for now (not in scope this build) but the new `dnb-2026/pathway/index.html` supersedes the previous one.

---

## §9 — Branch convention (Director-confirmed 7 May)

This build executes on **`claude/build-dealroom-frontend-Gp8uJ`** (existing harness branch — Director's option (i)).

Per Director Q3 answer, the AILANE branch naming convention `ailane/{AILANE-NNN}/{descriptive-stem}` (parallel to AMD numbers) is reserved under **AMD-127** and applies to future builds. AMD-127 authoring is OUT OF SCOPE for this CC brief. CC may add a `// AMD-127 reserved` comment in `_shared/dealroom.js` as a forward marker; that is the only encoding of the convention in this build.

`ailane-self` counterparty entry and `AILANE-SPEC-CDS-001` (Counterparty Document Set Governance) are NOT encoded in this build per Director's selection of option (a). They remain available for separate Chairman authoring sessions.

---

## §10 — What this brief does NOT do (scope exclusion)

- Does NOT touch Eileen prompt content (v7 final, in `platform_config`)
- Does NOT modify `eileen-dealroom` EF v6 (final, live)
- Does NOT add new RPCs, tables, or columns to Supabase (Phase A schema complete)
- Does NOT modify any other Edge Function
- Does NOT bypass JWT pass-through in any backend call
- Does NOT serve any page or panel without GA4 (`G-NTNXWZN31C`)
- Does NOT touch any of the following paths: `/AiLaneCEO/`, `/intelligence/`, `/login/`, `/signup/`, `/welcome/`, `/complaints/`, `/compliance-portal/`, `/operational/`, `/governance-dashboard/`, `/employers/`, `/knowledge-library/`, `/ticker/`, `/senedd-viewer/`, `/simulator-app/`, `/account/`, `/contract-scan/`, `/contract-check-worker/`, `/training/`, `/workspace/`, `/auth/callback/`, `/i18n/`, `/scraper/`, `/supabase/`, `/.claude/`, root `index.html`
- Does NOT touch ACEI/RRI/CCI constitutional documents or any `AILANE-SPEC-*` file
- Does NOT open PRs, issues, comments, releases, or perform any GitHub-side operation (NN-12 / RULE 12)
- Does NOT self-merge any PR — Director merges every PR
- Does NOT promote sim-2026 → dnb-2026 (Director skipped sandbox; fresh build straight against dnb-2026 from `_shared/`, with sim-2026 re-mounted on `_shared/` for parity)
- Does NOT author AMD-127 or any spec deliverable
- Does NOT modify `partners/dnb-2026/pathway-svg.js` (pre-existing artefact — leave in place)
- Does NOT call `render-counterparty-document` from the browser (server-side only)

---

## §11 — SQL pre-flight reference (CORRECTED schemas)

Run these via Supabase MCP `execute_sql` against project `cnbsxwtvazfvzmltkuvx`. **The SQL in the predecessor handover §13 used stale column names** — these are corrected against `information_schema.columns` (CLAUDE.md DATABASE RULES). All seven queries must succeed before STOP 1.

```sql
-- 1. Confirm v2.0 release snapshots exist and are not superseded
SELECT doc_code, template_version, rendered_chars, snapshotted_at, superseded_at, amd_authority
FROM dealroom_documents_rendered
WHERE counterparty_short_code='dnb-2026'
ORDER BY snapshotted_at DESC;
-- Expect: 4 rows (ROADMAP-002, LAP-OVERVIEW-001, NDA-001, PILOT-SOW-001), all template_version='2.0',
--         all superseded_at IS NULL, all amd_authority='AMD-121'

-- 2. Confirm catalog scoped to D&B
SELECT kind, phase, available_from_phase, doc_code, name, is_blocking_phase_advance, version_label
FROM dealroom_documents_catalog
WHERE clid='dnb-2026-001' AND deleted_at IS NULL
ORDER BY phase NULLS FIRST, kind, display_order;
-- Expect: 14 rows matching §3.2 catalog table

-- 3. Confirm phase blockers
SELECT document_id, name, phase, upload_status, is_blocking_phase_advance, is_currently_blocking
FROM dealroom_phase_blockers
WHERE clid='dnb-2026-001'
ORDER BY phase;
-- Expect: 5 rows, all upload_status='not_uploaded', all is_currently_blocking=true

-- 4. Confirm counterparty profile
SELECT counterparty_legal_name_formal, counterparty_short_code, primary_identifier_system,
       four_surfaced_packages, mca_data_scope, gate_state, pilot_fee_amount_pence
FROM counterparty_profile
WHERE counterparty_short_code='dnb-2026';
-- Expect: 1 row, primary_identifier_system='DUNS', gate_state='pre_engagement'
--         (NOTE: this is the profile-level state; pipeline gate is partner_clids.gate_state)

-- 5. Confirm package_catalogue rows for the four canonical packages (split bands)
SELECT catalogue_code, shape_name, tier_band_low_gbp, tier_band_high_gbp,
       exclusivity_default, term_default_months, gate_visibility,
       atomic_unit_composition, modifier_defaults
FROM package_catalogue
WHERE catalogue_code IN ('C-01','C-03','C-04','C-13') AND active=true
ORDER BY array_position(ARRAY['C-01','C-03','C-04','C-13']::text[], catalogue_code);
-- Expect: 4 rows with bands per §3.2 package table (C-03 high=£2.0M, C-13 high=£5.5M)

-- 6. Confirm partner_clids
SELECT clid, counterparty_name, gate_state, is_launch_partner, is_simulation,
       director_email, package_selection
FROM partner_clids
WHERE clid IN ('dnb-2026-001','sim-2026-001');
-- Expect: 2 rows, both gate_state='phase_0', both is_launch_partner=true,
--         dnb-2026-001 is_simulation=false, sim-2026-001 is_simulation=true

-- 7. Confirm AMD-126 ratification ceremony closed
SELECT amd_number, ratification_id, ratified_at, ceremony_completed_at
FROM amd_ratification_log
WHERE amd_number='AMD-126';
-- Expect: 1 row, ratified_at='2026-05-06 22:03:53.878142+00',
--         ceremony_completed_at='2026-05-06 22:26:39.710494+00'
```

Then call `mcp__879546c7-de70-4c9f-b420-8f5e842bce40__list_edge_functions` and confirm presence (status=ACTIVE) of all nine functions named in §3.1.

---

## §12 — Six STOP gates

Each gate is BLOCKING. CC writes `dnb-handover/STOP-{N}-smoke.md` after each gate and waits for Director acknowledgement (commit + push of the smoke log is the "ask"; Director responds with "STOP {N} ack — proceed"). No gate may be skipped.

### STOP 0 — Tree-state confirmation + pre-execution audit

**Prerequisites:** none
**Build steps:** none (audit only)
**Smoke conditions:**
- `git status` clean on `claude/build-dealroom-frontend-Gp8uJ`
- `find partners/ -type f | sort` matches §4 baseline (within ±1 file tolerance for any uncommitted local artefacts; report any deltas)
- `partners/_shared/` does NOT exist
- §11 SQL pre-flight: all 7 queries return expected counts; one discrepancy or empty result blocks the gate
- All 9 Edge Functions in §3.1 return status=ACTIVE
- `dnb-handover/STOP-0-smoke.md` written with: branch SHA, file count by directory, SQL row counts, EF version SHAs
- Director acks "STOP 0 ack — proceed"

**Failure modes & remediation:**
- Tree mismatch → halt; report to Director; do not proceed
- SQL row count mismatch → halt; do not assume DB drift is benign
- EF status not ACTIVE → halt; Director must redeploy

### STOP 1 — `partners/_shared/` library + D1–D7 remediation

**Prerequisites:** STOP 0 ack
**Build steps:**

1. Create `partners/_shared/` directory
2. Author `partners/_shared/dealroom.css`:
   - `dr-` prefix on every new selector
   - Tier-baseline cyan `#0EA5E9` for current-phase highlight; gold `#F59E0B` reserved (NN-11)
   - Phase rail: vertical, fixed-left, 280 px wide, 7 phase nodes, green frame on unlocked
   - Tile cards: 4-up grid responsive to 2-up at <960 px, 1-up at <640 px
   - Eileen panel: bottom-right, collapsible, fixed position, 420 px wide × 60 vh tall
3. Author `partners/_shared/dealroom.js` as ES module exporting:
   - `getCurrentClid()` — parses `/partners/{stem}/...` → `{stem}-001`
   - `PHASE_LABEL` — D1 mapping
   - `PHASE_ORDER = ['phase_0','phase_a','phase_b','phase_c','phase_d','phase_e','phase_f']`
   - `callEileen(query, opts)` — POST to `eileen-dealroom` EF with JWT injection
   - `callDealroomEF(slug, body)` — generic POST helper for the deal-room EF set
   - `renderTileCards(targetEl)` — fetches `tile-cards.html`, injects, wires nav handlers
   - `renderPhaseRail(targetEl, currentPhase)` — fetches `phase-rail.html`, injects, applies unlocked-state classes by `PHASE_ORDER` ordering
   - `renderEileenPanel(targetEl)` — fetches `eileen-panel.html`, injects, wires conversation persistence (NN-1)
   - `formatBand(low, high)` — formats £'000s strings: 125000 → "£125K", 1200000 → "£1.2M", 5500000 → "£5.5M"
   - `// AMD-127 reserved` comment block referencing the branch convention
4. Author `partners/_shared/eileen-panel.html` — reusable fragment, no `<html>` / `<head>` (injected into pages); includes Eileen-explainer block per D6 (technical capabilities · RAG · question scope · Parliament feed mechanics · verifiable; NO internal architecture, NO origin story, NO model/vendor names)
5. Author `partners/_shared/phase-rail.html` — 7 phase nodes, click-to-expand description per D5; NO document links per phase
6. Author `partners/_shared/tile-cards.html` — 4 tile-cards (Documents · Engagement · Deal Creator · Pathway), positioned UNDER the intro per D4

**Smoke conditions:**
- `_shared/dealroom.js` parses (`node --check` if available; else module-load test from a smoke HTML)
- `_shared/dealroom.css` parses (`stylelint` or visual diff against a smoke harness)
- `getCurrentClid()` test cases: `/partners/dnb-2026/` → `dnb-2026-001`; `/partners/sim-2026/deal-creator/` → `sim-2026-001`; `/partners/dnb-2026/documents/` → `dnb-2026-001`
- `formatBand()` test cases: (125000, 250000) → "£125K–£250K"; (1200000, 2000000) → "£1.2M–£2.0M"; (2800000, 5500000) → "£2.8M–£5.5M"
- `grep -ri "mother" partners/_shared/` returns nothing (D3)
- `grep -ri "configurator" partners/_shared/` returns nothing (D7)
- `grep -ri "phase_0\|phase_a\|phase_b\|phase_c\|phase_d\|phase_e\|phase_f" partners/_shared/eileen-panel.html partners/_shared/tile-cards.html partners/_shared/phase-rail.html` returns only enum tokens behind `data-phase=` attributes; no human-facing prose contains the raw enum (D1)
- All three fragment files contain GA4 placeholder markers (the GA4 script lives in the host page `<head>`, not in fragments — confirm fragments do NOT inject GA4)
- `dnb-handover/STOP-1-smoke.md` written with greps + test outputs + rendered fragment screenshots (text descriptions OK if browser unavailable)
- Director acks "STOP 1 ack — proceed"

**Failure modes & remediation:**
- `mother` grep hit → fix → re-grep → repeat until clean
- `configurator` grep hit → rename → re-grep
- Phase enum leak → wrap in `PHASE_LABEL[...]` lookup → re-grep
- Eileen-explainer fails D6 review → rewrite → seek Director sign-off

### STOP 2 — `dnb-2026/index.html` Welcome page mounted on `_shared/`

**Prerequisites:** STOP 1 ack
**Build steps:**

1. Replace `partners/dnb-2026/index.html` (current 7,221 B) with universal-skeleton page:
   - `<head>`: full CSP meta tag (verbatim from CLAUDE.md), GA4 (G-NTNXWZN31C), `<title>Ailane Deal Room — Dun & Bradstreet UK & Ireland</title>`, link to `_shared/dealroom.css`, Supabase CDN (protected page)
   - Auth guard: `<body style="visibility:hidden">`, getSession + onAuthStateChange + 6s timeout, decode JWT, success → reveal; failure → `window.location.replace('/login/')`
   - `<body>` skeleton (NN-3 universal): warm intro · Eileen-explainer (from `_shared/eileen-panel.html` partial inject) · four tile-cards · permanent left phase rail · page content · Eileen panel · AMD-098 attribution · deal-room legal links · footer
   - Page content for Welcome: live "What's happening" snapshot — fetches `dealroom-pipeline-list` and renders gate_state + open FCRs count + latest counter-proposal headline + recent Director responses
   - Eileen panel always visible (NN-2)
2. Mount `_shared/` imports via ES module
3. Apply `dr-welcome` page-class on `<body>` for any page-specific styling

**Smoke conditions:**
- `/partners/dnb-2026/` renders without console errors
- Phase rail shows phase_0 highlighted (cyan), phase_a–phase_f greyed
- `dealroom-pipeline-list` returns gate_state='phase_0' (matches DB)
- Eileen panel responsive: open / collapse / open
- Sample Eileen query `[TRIAGE]` returns within 8s
- All four tile-cards link to existing destinations (Documents, Engagement, Deal Creator, Pathway) — even if those pages are not yet built (404 OK at this stage; STOPs 3–6 fill them)
- View source: GA4 present, CSP meta present, NO Supabase CDN call before guard, NO auth logic in body content
- `grep -ri "mother\|configurator\|phase_a" partners/dnb-2026/index.html` returns expected D-marker compliance only
- `dnb-handover/STOP-2-smoke.md` written with screenshots + console log + network HAR summary
- Director acks "STOP 2 ack — proceed"

**Failure modes & remediation:**
- Auth guard timeout < 6 s → fix timeout
- CSP violation in console → review CSP meta against the EF endpoints in use
- Pipeline-list empty → confirm `dnb-2026-001` in `partner_clids` (per §11 query 6)

### STOP 3 — `dnb-2026/documents/index.html`

**Prerequisites:** STOP 2 ack
**Build steps:**

1. Author `partners/dnb-2026/documents/index.html`
2. Universal skeleton (mounted on `_shared/`)
3. Page content:
   - Filter bar with chips: All · Templates · Counter-Proposals · FCRs · Eileen Conversations · Director Uploads · Phase Blockers
   - Document list: fetches `dealroom-document-fetch` (lists catalog), filters client-side by chip selection, groups by phase
   - Phase blockers panel (separate visual treatment): renders 5 blocker rows from `dealroom-pipeline-list` blockers payload, with `not_uploaded` red chip, upload widget per row (calls `dealroom-document-upload`), filename validation (PDF/DOCX, ≤25 MB)
   - Click handler on a release/template row: streams `rendered_body` from snapshot store via `dealroom-document-fetch?doc_code=...` and renders into a modal (sandboxed iframe, no script execution)
   - Empty-state for catalog rows without snapshots: render "Snapshot pending" placeholder (Commercial Proposal, Legal & Audit Pack, Phase C release docs are all in this category)
4. Director-only chip class `dr-director-only` for `eileen_triage_class` filter (visible only when JWT decode shows Director email)

**Smoke conditions:**
- All 14 catalog rows visible with correct grouping (4 Phase 0 + 1 Phase A + 1 Phase B template + 5 blockers + 3 Phase C release)
- Click ROADMAP-002 → modal opens → 57,942 chars rendered (verify byte count from `rendered_chars` field)
- Click PROPOSAL-001 → "Snapshot pending" placeholder renders (no snapshot exists)
- Filter chip "Phase Blockers" → shows 5 rows
- Upload widget: dummy file upload → calls `dealroom-document-upload` → server returns 200 (use a smoke account; do NOT upload real D&B documents)
- D3 grep clean
- `dnb-handover/STOP-3-smoke.md` written with screenshots, network log, char counts
- Director acks "STOP 3 ack — proceed"

**Failure modes & remediation:**
- Document modal renders raw HTML → wrap in sandbox iframe with `srcdoc`
- Filter logic miscounts → use `kind` and `phase` from each catalog row exactly
- Upload widget bypasses JWT → fix; injection of `Authorization: Bearer` is mandatory

### STOP 4 — `dnb-2026/engagement/index.html`

**Prerequisites:** STOP 3 ack
**Build steps:**

1. Author `partners/dnb-2026/engagement/index.html`
2. Universal skeleton
3. Page content:
   - Current Phase header: from `dealroom-pipeline-list.gate_state` → `PHASE_LABEL[...]`
   - Open FCRs panel: list with SLA countdown (compute from `feature_capability_requests.lodged_at` + 14-day SLA), click to expand
   - Latest counter-proposal: headline + receipt link via `cppp-generate-receipt`
   - Director responses: timeline of recent `partner_counter_proposals` entries
   - `eileen_triage_class` chip (Director-only, gated by JWT email)
   - Phase blockers panel mirrored from STOP 3 with upload widget (same EF call, `kind='requirement'` filter)
   - FCR submission form: subject + description + impact estimate; calls `fcr-lodge` with 60-second consent replay-window defence (re-prompt user if last submission <60 s ago — AMD-113)
4. Engagement vs Pathway distinction explicit: page header reads "Engagement — current state" (NN-4)

**Smoke conditions:**
- Empty state for FCRs (none lodged yet) renders gracefully
- Empty state for counter-proposals renders gracefully
- Director-only chip hidden for non-Director JWTs (test with two emails)
- FCR submission within 60s of a previous submission → form shows replay-window warning
- Phase blockers upload widget identical behaviour to STOP 3
- D3 grep clean
- `dnb-handover/STOP-4-smoke.md` written
- Director acks "STOP 4 ack — proceed"

**Failure modes & remediation:**
- Director-only chip leaks to non-Director users → fix JWT decode predicate
- FCR replay-window not enforced → fix consent-window check (60 s minimum)
- SLA countdown miscalculates → use `Date.now() - lodged_at` against 14-day window

### STOP 5 — `dnb-2026/deal-creator/index.html` (Tranche F core)

**Prerequisites:** STOP 4 ack
**Build steps:**

1. Author `partners/dnb-2026/deal-creator/index.html` (slug `deal-creator/` per D7, NOT `configurator/`)
2. Universal skeleton
3. Page content (the Tranche F payload):
   - Four canonical Package tile-cards rendered from `package_catalogue` rows where `catalogue_code IN ('C-01','C-03','C-04','C-13')` AND `active=true`. Tile contents: `shape_name` (NOT catalogue_code), `formatBand(tier_band_low_gbp, tier_band_high_gbp)`, `term_default_months`, `exclusivity_default` rendered human-readable
   - Each Package tile has a `<details>` "Live Pipeline overlay" sub-section per §7.2
   - Fifth tile "Live Pipeline" per §7.1 — visually distinguishable, "Layered Product" badge, £150K–£300K band, "Add to Deal Creator" CTA
   - Configurator panel below tiles, with:
     - Six scope axes (PR #173 four-axis was the precursor; this is the canonical six per AMD-121 §4): geographic_scope · vertical_focus · employer_size_band · data_density · refresh_cadence · risk_dimension. Each axis has a select or slider; defaults from `counterparty_profile.mca_data_scope`
     - Five modifiers + one Live Pipeline cadence radio (§7.3) — total six modifier controls
     - Live pricing box: Eileen-narrated `[PRICE_QUOTE]` marker on every change (debounced 800 ms); shows current low/high estimate from cumulative `pricing_tier` ladder evaluated against selected axes/modifiers
   - Selection persistence: `partner_clids.package_selection` updated on "Save" (use a dedicated EF call NOT bypass — if no EF exists for this, queue the update and surface a "Save pending — pipeline write needed" status; do NOT directly write to the table)

**Note on package_selection writes:** The current EF estate (§3.1) does not include a "deal-creator-save" EF. Two options:
- Option A (preferred): persist locally via `localStorage` keyed by CLID + JWT sub; surface "Save pending — backend write requires Tranche-F save EF (not in this build)" disclosure
- Option B: pipe through `dealroom-pipeline-list` if it accepts writes (it does not in v1) — DO NOT use this option
Choose Option A. Flag for AMD-127 (or separate amendment) that a `dealroom-deal-creator-save` EF should be authored next iteration.

**Smoke conditions:**
- Four Package tiles render with DB-derived bands: C-01 "£125K–£250K", C-03 "£1.2M–£2.0M", C-04 "£350K–£675K", C-13 "£2.8M–£5.5M"
- Live Pipeline 5th tile renders with "£150K–£300K depending on cadence"
- Live Pipeline `<details>` sub-section under each Package tile expands and shows correct `shape_name` substitution
- Live Pipeline cadence radio in configurator: 5 options in correct order; default `none`
- Cadence change → Eileen `[PRICE_QUOTE]` debounced narration fires (verify network log)
- Selection persists in `localStorage` across page reloads
- Pricing surface respects `pricing_tier` ladder (verify by changing one axis and observing band update)
- D3 grep clean; D7 grep clean (no "configurator" anywhere user-facing)
- `dnb-handover/STOP-5-smoke.md` written with: full DOM screenshot of tiles + sub-section expanded states + configurator + price quote
- Director acks "STOP 5 ack — proceed"

**Failure modes & remediation:**
- Hardcoded band → fix to read from `package_catalogue` (NN-2)
- Live Pipeline cadence radio order wrong → fix to [none, quarterly, monthly, weekly, daily]
- `[PRICE_QUOTE]` not firing → check Eileen marker grammar in panel JS
- Slug `configurator/` accidentally created → rename to `deal-creator/`

### STOP 6 — `dnb-2026/pathway/index.html` + sim-2026 re-mount + handover

**Prerequisites:** STOP 5 ack
**Build steps:**

1. Author `partners/dnb-2026/pathway/index.html`
2. Universal skeleton
3. Page content:
   - Six-phase explainer (Engagement vs Pathway distinction — NN-4): full read-only narration of Phase 0 → Phase F, what each phase entails, what the Director and counterparty must do at each phase, what Ailane delivers
   - Current phase highlighted in cyan `#0EA5E9` (NOT gold — gold reserved for Enterprise + Nexus L1 per NN-11)
   - DMSP-001 v3 institutional content (NN-5) surfaced where Eileen cites it, with `(currently in draft, pending AMD-095 ratification)` qualifier
4. Author `partners/dnb-2026/terms/index.html` and `partners/dnb-2026/privacy/index.html` as stubs that reuse the existing `partners/sim-2026/{terms,privacy}/index.html` content with deal-room-scoped legal links footer
5. Re-mount sim-2026 on `_shared/`:
   - Rename `partners/sim-2026/configurator/` → `partners/sim-2026/deal-creator/` (D7 applies to sim-2026 too)
   - Replace each sim-2026 page's per-page CSS/JS imports with `_shared/` imports
   - Verify all 7 sim-2026 universal pages render identically post-mount
6. Final D3 grep across `partners/`: `grep -rni "mother" partners/` → must return 0 hits
7. Final D7 grep: `grep -rni "configurator" partners/` → must return 0 user-facing hits
8. Author `dnb-handover/phase-b-handover.md` — final summary: what was built, EF endpoints used, schemas read, schemas written, known gaps (e.g. Option A `localStorage` persistence pending Tranche-F save EF), Director-side actions outstanding

**Smoke conditions:**
- All five universal pages on `partners/dnb-2026/` render: Welcome, Documents, Engagement, Deal Creator, Pathway (+ terms / privacy stubs)
- All seven universal pages on `partners/sim-2026/` render identically (parity test)
- D3 grep across full `partners/` tree returns 0 hits
- D7 grep returns 0 user-facing hits
- All pages pass GA4 presence check (`grep -L "G-NTNXWZN31C" partners/**/*.html` returns nothing)
- All pages pass CSP meta presence check
- `dnb-handover/STOP-6-smoke.md` written
- `dnb-handover/phase-b-handover.md` written
- Branch pushed: `git push -u origin claude/build-dealroom-frontend-Gp8uJ`
- CC reports the merge URL: `https://github.com/LexMarkAI/AILane-website/compare/main...claude/build-dealroom-frontend-Gp8uJ`
- CC stops. CC opens NO PR (NN-12 / RULE 12)

**Failure modes & remediation:**
- D3 grep hit anywhere → fix → re-grep → re-push
- sim-2026 parity break → revert that page's mount → re-mount carefully
- GA4 missing on a page → add CLAUDE.md GA4 block to `<head>` → re-grep
- Phase enum leak in pathway prose → wrap in `PHASE_LABEL` lookup → re-grep

---

## §13 — File estate (post-build)

| File | Purpose |
|---|---|
| `partners/_shared/dealroom.css` | Shared stylesheet, `dr-` prefix |
| `partners/_shared/dealroom.js` | Shared ES module: auth + Eileen + helpers + PHASE_LABEL + getCurrentClid + formatBand |
| `partners/_shared/eileen-panel.html` | Reusable Eileen panel fragment (D6-compliant explainer) |
| `partners/_shared/phase-rail.html` | Reusable left phase rail (D5: 7 phases, no per-phase doc links) |
| `partners/_shared/tile-cards.html` | Reusable four-tile-card fragment (D4) |
| `partners/dnb-2026/index.html` | Welcome (NN-2 — Deal Room overview) |
| `partners/dnb-2026/documents/index.html` | Filter bar + catalog + phase blockers + uploads |
| `partners/dnb-2026/engagement/index.html` | Current state + FCRs + counter-proposals + Director responses |
| `partners/dnb-2026/deal-creator/index.html` | Four Packages + Live Pipeline (3-place) + configurator + live pricing |
| `partners/dnb-2026/pathway/index.html` | Six-phase explainer (read-only) |
| `partners/dnb-2026/terms/index.html` | Terms stub (reuse sim content) |
| `partners/dnb-2026/privacy/index.html` | Privacy stub (reuse sim content) |
| `partners/sim-2026/{index,documents,engagement,deal-creator,pathway,terms,privacy}/index.html` | sim-2026 re-mounted on `_shared/`, identical structure |
| `dnb-handover/STOP-{0..6}-smoke.md` | Smoke logs per gate |
| `dnb-handover/phase-b-handover.md` | Final handover summary |

---

## §14 — Director-side actions outstanding (parked behind this build)

These are NOT for CC. Director discharges post-build:

1. Smoke deployed `/partners/dnb-2026/` against Director self-test contact `markglane@gmail.com`
2. D&B provides counterparty contact names → Director inserts to `partner_contacts` for `dnb-2026-001`
3. Magic-link issued via `dealroom-emergency-magiclink` to each D&B contact
4. Stage 5 gate promotion on first D&B engagement: `UPDATE partner_clids SET gate_state='phase_a' WHERE clid='dnb-2026-001'`
5. AMD-123 G-3 composite spec edits (Chairman authoring session, separate)
6. AMD-127 reservation — branch naming convention + (optionally) `ailane-self` counterparty + (optionally) CDS-001 spec
7. Tranche-F save EF (`dealroom-deal-creator-save`) authoring — addresses STOP 5 Option A localStorage gap
8. Pilot fee £90,000 invoicing per `counterparty_profile.pilot_fee_amount_pence` configuration
9. Tranche C — Contact Nomination form (`AILANE-CONTACT-NOMINATION-001`) authoring (NDA + Pilot SOW already exist at `template_pack` v2.0)

---

## §15 — End-state operational path (post-merge by Director)

1. CC pushes `claude/build-dealroom-frontend-Gp8uJ`; Director merges via GitHub UI
2. Director smokes `/partners/dnb-2026/` end-to-end
3. D&B contact list provisioned to `partner_contacts`
4. Magic-links issued
5. D&B logs in → Stage 5 gate promotion fires
6. D&B reads + signs v2.0 NDA via Documents page → uploads via `dealroom-document-upload`
7. `DNB-NDA-EXEC-001` blocker flips `not_uploaded` → `uploaded`
8. Pilot fee £90K collected
9. Phase progression: B → C → D over engagement window
10. Renewals into Phase F steady state

---

## §16 — Authority and constitutional framing

This brief is authored under AAD v1.0 Path A by the Chairman of AI Lane Limited. It implements jointly:

- AMD-120 (Eileen agent + v7 prompt) — frontend consumes; does NOT modify
- AMD-121 Tranche F (deal-room renderer + four-Package shelf + Live Pipeline + Eileen counterparty-aware narration) — this build discharges Tranche F
- AMD-123 G-1/G-2/G-4/G-5 (Enterprise rebrand, PCIE/Deal-Room delineation) — propagated to client-facing strings; G-3 in flight separately
- AMD-126 (RLS hardening) — frontend reads through service-role-bearing EFs; unaffected by RLS state at the table layer

Bound by ACEI v1.0, RRI v1.0, CCI v1.0, CDIE-001 §2.2 (deal-room Eileen carve-out), AILANE-SPEC-PLUGIN-001 v1.0 Article XIV (intelligence/advice boundary), AUDIT-REID-001 (anonymity discipline; the founder's-mother permanent prohibition is one expression of this), JIPA-GRD-001 v1.2 (engagement protocol).

---

## §17 — Closing instructions for CC

After STOP 6 push completes:

1. Confirm push succeeded: `git log origin/claude/build-dealroom-frontend-Gp8uJ -1 --oneline`
2. Report exactly: branch name pushed, latest commit SHA, merge URL
3. **Do NOT** open a Pull Request. Do NOT run `gh pr create`. Do NOT post any GitHub-side resource. (NN-12 / RULE 12 — binding)
4. Output the merge URL for the Director:
   `https://github.com/LexMarkAI/AILane-website/compare/main...claude/build-dealroom-frontend-Gp8uJ`
5. Stop. Wait for Director's next instruction.

---

**End of brief.**
Governed by AILANE-AMD-REG-001. AI Lane Limited (Co. No. 17035654, ICO Reg. 00013389720, UK Trademark UK00004347220).
