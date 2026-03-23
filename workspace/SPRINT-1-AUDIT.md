# SPRINT 1 PRE-MERGE VERIFICATION AUDIT

**Date:** 23 March 2026
**Branch:** `claude/kl-workspace-sprint1-7QUaO`
**Commit:** `5a7d155`
**Auditor:** Claude Code (read-only audit)
**Base:** `master` (local) / `main` (remote)

---

## 1. FILE INVENTORY

### Files on branch not on main (Sprint 1 commit `5a7d155` only):
- `.gitignore`
- `package.json`
- `package-lock.json`
- `workspace/build.sh`
- `workspace/src/index.js`
- `workspace/src/panel-system.js`
- `workspace/src/panel-vault.js`
- `workspace/src/panel-notes.js`
- `workspace/src/workspace-styles.css`
- `workspace/dist/workspace-bundle.js`
- `workspace/dist/workspace-styles.css`

### Files modified vs master (Sprint 1 commit only):
- `knowledge-library/index.html`
- `governance/index.html`
- `operational/index.html`

### Pre-existing changes (from previously merged PRs #42–#44, NOT from Sprint 1):
- `index.html` — modified by PR #42 (landing page Eileen + forward intelligence)
- `contract-scan/index.html` — modified by PR #43
- `contract-check-worker/index.html` — modified by PR #44
- `training/index.html` — modified by earlier commits

### Scope violation check (Sprint 1 commit only):
- index.html (root) modified: **NO** (pre-existing from PR #42)
- Any AiLaneCEO/ file modified: **NO**
- contract-scan/ modified: **NO** (pre-existing from PR #43)
- contract-check-worker/ modified: **NO** (pre-existing from PR #44)
- auth/callback/ modified: **NO**
- login/ modified: **NO**
- account/index.html modified: **NO**
- terms/ modified: **NO**
- privacy/ modified: **NO**
- ceo-nav.js modified: **NO**

**VERDICT: PASS** — Sprint 1 commit touches only expected files. Pre-existing changes from merged PRs are not Sprint 1 scope.

---

## 2. NODE_MODULES

- node_modules tracked in git: **NO** (empty result from `git ls-files node_modules`)
- .gitignore contains node_modules entry: **YES** — line 1
- package-lock.json committed: **YES**

**VERDICT: PASS**

---

## 3. BUNDLE

- workspace-bundle.js size: **31,876 bytes** (31.1KB)
- Minified (first line length > 500 chars): **YES** (14,501 chars on first line)
- Sourcemap present: **NO** (no .map file)
- dist/workspace-styles.css matches src/workspace-styles.css: **YES** (diff exit 0)

**NOTE:** Sourcemap not present. The build.sh does not include `--sourcemap` flag. This is a minor deviation from the original brief §2 which included `--sourcemap`, but was corrected in Discrepancy 5 which removed it. Not a failure.

**VERDICT: PASS**

---

## 4. AUTH GUARD INTEGRITY

### 4.1 knowledge-library/index.html

Lines added: 38
Lines removed: 1
Lines modified: 1 (the `<head><!-- GA4` line was split into `<head>` + CSP meta + `<!-- GA4` — formatting only, GA4 comment preserved)

Auth guard hide method preserved: **YES** — `visibility:hidden` (unchanged)
Auth guard session check preserved: **YES** — `sb.auth.getSession()` + null check unchanged
Auth guard redirect-on-failure preserved: **YES** — `window.location.replace('/login/')` unchanged
Auth guard reveal-on-success preserved: **YES** — `document.body.style.visibility = 'visible'` unchanged

Workspace globals insertion point: Between session check success (line 432) and visibility reveal
Inserted BEFORE visibility/display reveal: **YES**
Inserted AFTER auth check success: **YES**

Variables used for workspace globals:
  - Anon key variable name: `SUPABASE_ANON` (existing page variable, line 428)
  - Access token variable name: `_wsSession.access_token` (derived from `gs.data.session`)
  - User ID variable name: `_wsPayload.sub` (new, derived from JWT decode)
  - Tier variable name: `_wsTier` (new — kl_account_profiles fetch added because page had no existing tier check)

workspace CSS `<link>` tag added: **YES** — `href="/workspace/dist/workspace-styles.css"`
workspace JS `<script>` tag added: **YES** — `src="/workspace/dist/workspace-bundle.js" defer`

Any existing code DELETED: **NO** — only the `<head><!-- GA4` single-line formatting was split; GA4 comment and script preserved
Any existing code MODIFIED (not just added): **NO** — only formatting split on line 3

### 4.2 governance/index.html

Lines added: 22
Lines removed: 0
Lines modified: 0

Auth guard hide method preserved: **YES** — `visibility:hidden` (unchanged)
Auth guard session check preserved: **YES** — `sb.auth.getSession()` + null check unchanged
Auth guard redirect-on-failure preserved: **YES** — `window.location.replace('/login/')` unchanged
Auth guard reveal-on-success preserved: **YES** — `document.body.style.visibility = 'visible'` unchanged
Auth guard tier check preserved: **YES** — `tier !== 'governance' && tier !== 'institutional'` unchanged

Workspace globals insertion point: After tier check passes (line 453), before visibility reveal
Inserted BEFORE visibility/display reveal: **YES**
Inserted AFTER auth check success: **YES**

Variables used for workspace globals:
  - Anon key variable name: `SUPABASE_ANON` (existing, line 437)
  - Access token variable name: `token` (existing, line 443)
  - User ID variable name: `payload.sub` (existing, line 444)
  - Tier variable name: `tier` (existing, line 450)

workspace CSS `<link>` tag added: **YES** — `href="/workspace/dist/workspace-styles.css"`
workspace JS `<script>` tag added: **YES** — `src="/workspace/dist/workspace-bundle.js" defer`

Any existing code DELETED: **NO**
Any existing code MODIFIED (not just added): **NO**

### 4.3 operational/index.html

Lines added: 22
Lines removed: 0
Lines modified: 0

Auth guard hide method preserved: **YES** — `display:none/block` pattern (unchanged)
Auth guard session check preserved: **YES** — `sb.auth.getSession()` + null check unchanged
Auth guard redirect-on-failure preserved: **YES** — `window.location.replace('/login/')` unchanged
Auth guard reveal-on-success preserved: **YES** — `getElementById('auth-gate').style.display = 'none'` / `getElementById('root').style.display = 'block'` unchanged
Auth guard tier check preserved: **YES** — `tier === 'operational' || tier === 'operational_readiness' || tier === 'governance' || tier === 'institutional'` unchanged

Workspace globals insertion point: Inside tier success block, before display toggle (line 65)
Inserted BEFORE visibility/display reveal: **YES**
Inserted AFTER auth check success: **YES**

Variables used for workspace globals:
  - Anon key variable name: `SUPABASE_ANON` (existing, line 48)
  - Access token variable name: `session.access_token` (existing, line 54)
  - User ID variable name: `userId` (existing, line 55)
  - Tier variable name: `tier` (existing, line 63)

workspace CSS `<link>` tag added: **YES** — `href="/workspace/dist/workspace-styles.css"`
workspace JS `<script>` tag added: **YES** — `src="/workspace/dist/workspace-bundle.js" defer`

Any existing code DELETED: **NO**
Any existing code MODIFIED (not just added): **NO**

### AUTH GUARD VERDICT: **PASS** — All three pages have zero deletions of existing guard logic, zero modifications to existing guard logic, globals inserted at correct insertion points within the success block and before the reveal statement.

---

## 5. WORKSPACE JS AUDIT

### 5.1 EXCLUDED_PATHS
Paths in array (panel-system.js lines 523–542):
- `/`
- `/index.html`
- `/contract-scan/`
- `/contract-check-worker/`
- `/AiLaneCEO/`
- `/auth/callback/`
- `/login/`
- `/account/`
- `/account/dashboard/`
- `/governance-dashboard/`
- `/terms/`
- `/privacy/`
- `/signup/`
- `/complaints/`
- `/welcome/`
- `/employers/`
- `/senedd-viewer/`
- `/knowledge-library-preview/`

Missing required exclusions: **NONE**
Incorrectly excluded workspace pages: **NONE** — `/knowledge-library/`, `/governance/`, `/operational/` are NOT in the list

**VERDICT: PASS**

### 5.2 Primary guard
Checks `window.__ailaneUser` before rendering: **YES** — line 510: `if (!window.__ailaneUser) { ... return; }`
Also checks tier: **YES** — line 516–518: `wsEnabledTiers = ['operational', 'governance', 'institutional']`

**VERDICT: PASS**

### 5.3 Contract Planner tier gate
Tier gate values: `['governance', 'institutional']` (line 163)
Locked state for non-governance users: **YES** — Button opacity set to 0.35 (line 258), click shows upgrade notice via `showUpgradeNotice()` (line 267) which displays "available on the Governance tier" with upgrade link

**VERDICT: PASS**

### 5.4 Preference persistence
Uses raw fetch() with Bearer: **YES** — lines 82–97 (PATCH), lines 108–117 (GET), lines 127–142 (POST)
Uses sb.from(): **NO**
Supabase URL used: `https://cnbsxwtvazfvzmltkuvx.supabase.co` (correct)

**VERDICT: PASS**

### 5.5 Dynamic CSS loading
Dynamic `<link>` creation code present: **NO** — Comment at line 557–558 confirms: "CSS loaded statically via `<link>` in page `<head>` (Discrepancy 8)"

**VERDICT: PASS**

### 5.6 Context bus signals
Signals emitted in panel-system.js:
- `panel:opened` (line 405)
- `panel:closed` (line 417)

Signals emitted in panel-vault.js:
- `vault:document:selected` (line 205)
- `vault:finding:focused` (line 294)

Signals emitted in panel-notes.js:
- `project:selected` (line 138)
- `note:active` (line 202)

Signals listened in panel-system.js:
- `panel:closed` (line 576)
- `panel:opened` (line 577)

---

## 6. VAULT PANEL AUDIT

### 6.1 Data sources
compliance_uploads table name correct: **YES** — `compliance_uploads` (line 50)
kl_vault_documents table name correct: **YES** — `kl_vault_documents` (line 37)
compliance_findings table name correct: **YES** — `compliance_findings` (line 224)
All use raw fetch() with Bearer: **YES** (lines 36–45, 49–58, 222–231)
Any use sb.from(): **NO**

**VERDICT: PASS**

### 6.2 Score badges
Red threshold: `< 45` (line 147)
Amber threshold: `< 75` (line 148, i.e. 45–74)
Green threshold: `>= 75` (line 149)
Grey for unchecked: **YES** — default class `ws-vault-score--grey`, text `?` (lines 144–145)

**VERDICT: PASS**

### 6.3 Forward exposure
Uses is_forward_looking column: **YES** — line 248: `if (f.is_forward_looking) counts.forward++`
Forward marker text: `"ERA 2025 — X forward finding(s) — Not Yet In Force"` (line 269)

**VERDICT: PASS**

### 6.4 Monitored badge
Shield icon or badge present: **YES** — SVG shield icon (line 181), title "Monitored — auto-rescanned" (line 182), class `ws-vault-monitored` with teal colour

**VERDICT: PASS**

---

## 7. NOTES PANEL AUDIT

### 7.1 Data sources
kl_workspace_notes: **YES** — read (line 86), write/PATCH (line 295), create/POST (line 340)
kl_workspace_projects: **YES** — read (line 43), create/POST (line 57, 375)
Uses raw fetch() with Bearer: **YES** (all API calls use Authorization: Bearer + apikey headers)

**VERDICT: PASS**

### 7.2 Auto-save
Debounce timer value: **3000ms** (line 284)
Save indicator — saved colour: green via `ws-autosave--saved` class (CSS line 432: `color: var(--ws-green)` = `#16A34A`)
Save indicator — unsaved colour: amber via `ws-autosave--unsaved` class (CSS line 433: `color: var(--ws-amber)` = `#D97706`)

**VERDICT: PASS**

### 7.3 Project selector
New Project option present: **YES** — option with value `__new__`, text `+ New Project` (lines 123–126)
Creates project with correct columns: **YES** — `user_id`, `org_id`, `name`, `project_type` (lines 385–389)

**VERDICT: PASS**

---

## 8. CSS AUDIT

### 8.1 Gold colour
`#F59E0B` present: **YES** — line 356: `border: 1px solid #F59E0B;` on `.ws-forward-marker`

This is the forward exposure marker border colour. Forward exposure markers indicate legislative provisions not yet in force (ERA 2025). This is NOT an Institutional tier element — it is a data-driven compliance indicator. However, Rule 10 states Gold #F59E0B is "ONLY for Institutional tier elements". The forward marker uses amber (#D97706) for text and background but gold for border.

**FINDING:** `#F59E0B` used on `.ws-forward-marker` border (line 356). This element is a compliance data indicator, not an Institutional tier badge. The colour was specified in the Sprint brief §4 CSS specification. Recommend reviewing whether this constitutes a Rule 10 violation or whether the brief's explicit specification takes precedence.

**VERDICT: FLAG — requires Mark's ruling on whether brief specification overrides Rule 10 for non-tier UI elements**

### 8.2 Responsive
Breakpoint ≤1024px: **YES** — line 499: `@media (max-width: 1024px)`
Breakpoint ≤768px: **YES** — line 507: `@media (max-width: 768px)`
Breakpoint ≥769px: **YES** — line 534: `@media (min-width: 769px)`
Mobile FAB defined: **YES** — lines 510–526: `.ws-fab` with 56px circle, navy background, fixed bottom-right

**VERDICT: PASS**

### 8.3 Reduced motion
prefers-reduced-motion query present: **YES** — line 539
Disables transitions and animations: **YES** — `transition: none !important; animation: none !important;` on `.ws-drawer`, `.ws-rail`, `.ws-rail-btn`, `.ws-vault-item`

**VERDICT: PASS**

### 8.4 Focus indicators
:focus-visible styles present: **YES** — lines 550–557
Applied to: `.ws-rail-btn`, `.ws-drawer-action-btn`, `.ws-vault-item`, `.ws-notes-list-item`, `.ws-notes-toolbar button`

**VERDICT: PASS**

---

## 9. PRODUCT LANGUAGE LOCK

Grep results for banned terms in `workspace/src/`:
- `/contract-scan/` in EXCLUDED_PATHS (panel-system.js:526) — this is a URL path string, NOT a product noun. **NOT a violation.**
- `auto-rescanned` in vault panel tooltip (panel-vault.js:182) — this describes monitoring behaviour as a verb, not a product noun. The banned term is "scan" as a product noun (e.g. "run a scan"). **NOT a strict violation**, but flagged for review.

No instances of: "Flash Check", "Full Check", "guaranteed", "fully compliant", "know exactly", "ensures compliance", `"free"`.

**FINDING:** "auto-rescanned" (panel-vault.js:182) — technically contains "scan" but used as a verb in a tooltip, not as a product noun. Recommend changing to "auto-rechecked" for absolute compliance.

**VERDICT: PASS with advisory** — no product nouns found; one verb usage flagged for optional correction

---

## 10. CSP AUDIT

### 10.1 knowledge-library/
External domains loaded:
- `www.googletagmanager.com` (GA4 script) — IN whitelist
- `fonts.googleapis.com` (font CSS) — IN whitelist
- `cdn.jsdelivr.net` (Supabase JS) — IN whitelist
- `cnbsxwtvazfvzmltkuvx.supabase.co` (REST API fetch targets) — IN whitelist

All covered by standard CSP whitelist: **YES**
CSP meta tag added: **YES** (line 4)

**VERDICT: PASS**

### 10.2 governance/
External domains loaded:
- `www.googletagmanager.com` (GA4 script) — IN whitelist
- `fonts.googleapis.com` (font CSS) — IN whitelist
- `cdn.jsdelivr.net` (Supabase JS) — IN whitelist
- `cnbsxwtvazfvzmltkuvx.supabase.co` (REST API fetch targets) — IN whitelist

All covered by standard CSP whitelist: **YES**
CSP meta tag added: **YES** (line 5)

**VERDICT: PASS**

### 10.3 operational/
External domains loaded:
- `www.googletagmanager.com` (GA4 script) — IN whitelist
- `cdn.jsdelivr.net` (Supabase JS) — IN whitelist
- `unpkg.com` (React 18, React DOM 18, Babel Standalone) — **NOT IN whitelist**
- `fonts.googleapis.com` (font CSS) — IN whitelist

Domains NOT in whitelist: `unpkg.com`
CSP TODO comment present: **YES** (line 5: `<!-- TODO: CSP deployment blocked — page loads scripts from unpkg.com which is not in the standard whitelist. Requires CSP definition update before deployment. -->`)
CSP meta tag added: **NO** (correct — would break page)

**VERDICT: PASS** — correctly deferred CSP with TODO comment

---

## 11. GA4

- knowledge-library/index.html: **PRESENT** at lines 6 and 11
- governance/index.html: **PRESENT** at lines 9 and 10
- operational/index.html: **PRESENT** at lines 10 and 15

**VERDICT: PASS**

---

## 12. PRIVATE ADDRESS

Registered address found: **NO** (grep returned exit code 1 — no matches)

**VERDICT: PASS**

---

## 13. ESBUILD PIPELINE

### build.sh
esbuild command: `npx esbuild workspace/src/index.js --bundle --outfile=workspace/dist/workspace-bundle.js --format=iife --global-name=AilaneWorkspace --minify --target=es2020`
Output file: `workspace/dist/workspace-bundle.js`
Format: `iife`
Minify flag: **YES**
Target: `es2020`

### package.json
esbuild in devDependencies: **YES** — version `^0.27.4`
Any unexpected dependencies: **NO** — only esbuild in devDependencies, no production dependencies

**VERDICT: PASS**

---

## 14. TIER STRINGS

Wrong tier strings found: **NO** — grep for `operational_readiness`, `enterprise`, `"gov"` returned no matches in `workspace/src/`

Tier gate values used for Contract Planner: `['governance', 'institutional']` (panel-system.js:163)
Tier gate values used for workspace-enabled check: `['operational', 'governance', 'institutional']` (panel-system.js:516)

**NOTE:** The operational/index.html auth guard (pre-existing, NOT modified by Sprint 1) uses `tier === 'operational' || tier === 'operational_readiness'` — this is the existing auth guard behaviour from `kl_account_profiles.subscription_tier`. The workspace code itself correctly uses only the CHECK-constrained values.

**VERDICT: PASS**

---

## 15. SUMMARY

| Check | Verdict | Critical? |
|---|---|---|
| §1 File inventory | **PASS** | YES |
| §2 node_modules | **PASS** | YES |
| §3 Bundle | **PASS** | YES |
| §4 Auth guard integrity | **PASS** | CRITICAL |
| §5 Workspace JS | **PASS** | YES |
| §6 Vault panel | **PASS** | YES |
| §7 Notes panel | **PASS** | YES |
| §8 CSS | **FLAG** | NO |
| §9 Product language lock | **PASS with advisory** | YES |
| §10 CSP | **PASS** | YES |
| §11 GA4 | **PASS** | YES |
| §12 Private address | **PASS** | YES |
| §13 esbuild pipeline | **PASS** | YES |
| §14 Tier strings | **PASS** | YES |

### OVERALL VERDICT: **CLEAR TO MERGE**

Two non-blocking findings for Mark's review:

1. **§8.1 Gold colour (#F59E0B)** — Used on `.ws-forward-marker` border (CSS line 356). This was explicitly specified in the Sprint brief §4 CSS specification. The forward exposure marker is a compliance data indicator, not an Institutional tier badge. Mark to confirm this usage is acceptable under Rule 10 or whether the border should change to amber (#D97706).

2. **§9 "auto-rescanned"** — Used in vault panel tooltip (panel-vault.js:182). Not a product noun usage of "scan" — it's a verb describing monitoring behaviour. Recommend changing to "auto-rechecked" for absolute compliance with the product language lock, but this is advisory, not blocking.

---

*Audit conducted read-only. No files modified. No commits made.*
*AILANE-AMD-REG-001 · KLWS-001 v1.0 · KLUI-001 v1.0*
*AI Lane Limited · Company No. 17035654 · ICO Reg. 00013389720*
