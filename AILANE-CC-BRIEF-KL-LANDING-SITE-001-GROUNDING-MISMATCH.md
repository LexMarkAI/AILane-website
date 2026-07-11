# GROUNDING-MISMATCH — AILANE-CC-BRIEF-KL-LANDING-SITE-001

> ## ⚠️ SUPERSEDED IN PART — 11 July 2026
>
> **The build-prohibition findings in this document are superseded by
> AILANE-CC-BRIEF-KL-ENGINE-RECONCILE-SITE-001 (as amended).**
>
> This document was correct that no build command had been committed, and correct
> that a naive rebuild drops live features. Both are now resolved:
>
> - The build command is committed as `knowledge-library/build-engine.sh`. It
>   requires `--bundle`, because `kl-app.jsx` imports `dompurify` (a runtime
>   dependency, inlined into the engine). A build WITHOUT `--bundle` emits
>   `require("dompurify")` and white-screens all three host pages.
> - The divergence was measured as exactly THREE features — `detectKLPass`,
>   `klVaultNavButton`, `KL_SUBSCRIPTION_TIERS` — back-ported into `kl-app.jsx`
>   and guarded by a parity gate that now includes a runtime boot check.
>
> This document's fourth named feature, the Recent-Cases nav, was ALREADY present
> in `kl-app.jsx` (line 40, `HUB_WORKSPACE_FACETS`) and survives a rebuild. That
> claim was stale when merged.
>
> Its architectural findings — shared engine; three pages load `kl-app.js`;
> `knowledge-library/index.html` is a React shell — remain CORRECT and are the
> basis of the reconcile brief. The prohibition on HAND-EDITING `kl-app.js` also
> remains, permanently: it is build output.

**Repo:** `LexMarkAI/AILane-website` (§0.1 repo gate PASSED — `origin` is
`https://github.com/LexMarkAI/AILane-website`).
**Determination:** The brief's §0.2 grounding step reveals that **File A's §0.2
anchors (b), (c), (d), (e) and (g) are materially absent from File A**. Every UI
element the brief targets is rendered by a **shared React engine bundle**
(`knowledge-library/kl-app.js`, compiled from `kl-app.jsx`) that is **also loaded
verbatim by the Operational page (File B)** — which §7 marks READ-ONLY and
"must NEVER modify". No safe, documented build command exists to regenerate the
bundle. The brief is therefore **not executable as written**; per the repo's
established ANCHOR-MISMATCH practice (report, implement nothing, do not
improvise, hand to Director), **no edits were made to `kl-app.jsx`,
`knowledge-library/kl-app.js`, `knowledge-library/index.html`, or any other
shipped file.**
**Base HEAD at time of check:** `5ab7ea5`.
**Decision of record:** Director selected **"Halt & report"** when presented with
the shared-engine conflict.

---

## §0.1 — Repo gate — PASS

`git remote -v` → `origin  https://github.com/LexMarkAI/AILane-website`. Proceeded
immediately to §0.2 without waiting.

## §0.2 — Read-and-report

**File A** (deterministic locator, more-than-one-match rule → path ending
`knowledge-library/index.html`): `knowledge-library/index.html` (860 lines).
**File B** (same method, substituting `operational`): `operational/index.html`
— READ-ONLY, referenced only. **Not modified; does not appear in the diff.**

### The core architectural fact

`knowledge-library/index.html` is a **thin React SPA shell**, not a static page.
Its `<body>` contains only empty mount placeholders:

```html
<div class="kl-topbar"    id="kl-topbar"></div>     <!-- l.690 -->
<div class="kl-sidebar"   id="kl-sidebar"></div>    <!-- l.691 -->
<div class="kl-main"      id="kl-main"></div>        <!-- l.692 -->
<div class="kl-panelrail" id="kl-panelrail"></div>  <!-- l.693 -->
```

These are filled at runtime by `kl-app.js` (`<script src="kl-app.js"></script>`,
l.858), the esbuild output of `kl-app.jsx` (10,872 lines / 537 KB). **The left
menu, the right icon rail, the `Upload contract` button and the header badge row
do not exist in File A** — they are React components inside the bundle.

### Anchor-by-anchor findings

**(a) File A `<head>` — GA4 / CSP / favicon — ALL PRESENT (no §6 action).**
- GA4 (RULE 10): PRESENT, `knowledge-library/index.html:11–18` (`G-NTNXWZN31C`).
- CSP (RULE 22): PRESENT, `index.html:20–21` (exactly one `Content-Security-Policy`).
- Favicon (RULE 35, keyed on `href="/favicon.svg"`): PRESENT, `index.html:679–685`,
  plus single `theme-color` `#0a0e1a` (l.685).
- §6 requires "if PRESENT, leave it alone" → **§6 is already satisfied; no-op.**

**(b) Left sidebar container + `Documents` item under `YOUR WORKSPACE` — ABSENT from File A.**
- File A: empty placeholder `<div class="kl-sidebar" id="kl-sidebar">` (l.691).
- Real menu: the `HUB_WORKSPACE_FACETS` array, `kl-app.jsx:30–54`. The item that
  corresponds to the brief's `Documents` is
  `{ id:'vault', label:'Document Vault', href:'/operational/documents/' }`
  (l.35) — it is an **operational** full-page route, not a KL-scoped in-app target.
  Adjacent items (`Recent Cases`→`/operational/cases/`, `Parliament Live`→
  `/operational/parliament-live/`, `Calendar`→`/operational/calendar/`) likewise
  route to operational surfaces. This single shared array drives BOTH host pages.

**(c) Right-hand icon rail + the panels it opens — ABSENT from File A (elements/JS); CSS-only in File A.**
- File A: empty placeholder `<div class="kl-panelrail" id="kl-panelrail">` (l.693).
- File A `<style>` defines the rail classes only: `.kl-panelrail` (l.140),
  `.kl-panel-rail-btn` / `.kl-panel-rail-icon` (ll.280–295), `.kl-panel-drawer*`
  (ll.298–345), `.kl-notes-panel` / `.kl-clipboard-panel` / `.kl-placeholder-panel`
  (ll.347–422).
- The rail buttons, their four icons, and every drawer/panel they open are
  rendered by React from the bundle (`kl-app.jsx`). The `--kl-panel-rail-width`
  grid column is defined in File A's grid (ll.53, 71) but the content is not.

**(d) `Upload contract` button + JS handler — ABSENT from File A.**
- `kl-app.jsx:2846` → `<span>Upload contract</span>`; compiled into BOTH
  `knowledge-library/kl-app.js:3899` AND `knowledge-library/kl-app-bundle.js:1966`.
- `grep -ni "upload contract" knowledge-library/index.html` → **0 hits** (it was
  never in File A). The brief's §8.2 grep would therefore return a **false PASS**.

**(e) Header row (session-duration pill, `CY` avatar, `PER-SESSION` badge) — ABSENT from File A.**
- File A: empty placeholder `<div class="kl-topbar" id="kl-topbar">` (l.690).
- Real `TopBar` + badge logic: `kl-app.jsx:~3501–3660`
  (`badgeLabel = 'PER-SESSION'` at l.3619; `accessType === 'per_session'` gating
  at ll.3618, 3650). This is where §5's Sign Out would have to be inserted —
  inside the shared bundle, not File A.

**(f) Supabase client variable + auth-guard block — PRESENT in File A.**
- Client var: `sb` (`index.html:733`), created inside the entitlement-gate IIFE
  (ll.730–854) from `SUPABASE_URL` + `SUPABASE_ANON_KEY`.
- Auth-guard (RULE 26 shape): the KL entitlement gate — forwards any auth hash to
  `/auth/callback/` (ll.844–847), then `sb.auth.getSession()` → `verify(session)`
  (JWT decode + raw `fetch` Bearer to `rpc/kl_session_entitlement`, RULE 2) →
  `grant()` (reveal + boot engine) or `showGate()` (purchase/expired gate; never a
  hard login redirect). `sb` is closure-scoped inside this IIFE — it is not in a
  scope reachable by menu/drawer code that the brief imagined adding to File A.

**(g) File B (`operational/index.html`) menu idiom — SAME bundle, SAME menu.**
- File B loads `../knowledge-library/kl-app.js` (`operational/index.html:788`) and
  sets `window.__klMode = 'operational'` (l.728) before boot. Its header comment
  (ll.9–13): *"/operational/ now hosts the SAME engine bundle as
  /knowledge-library/ … rendered in operational mode."* File B has **no distinct
  static menu markup**; it renders the identical `HUB_WORKSPACE_FACETS`. There is
  no separate "estate menu idiom" to copy — it is one shared component.

---

## Why the brief cannot be executed as written

1. **Shared engine.** `kl-app.js` renders three surfaces from one file:
   `/knowledge-library/` (per-session KL, File A), `/operational/` (File B —
   READ-ONLY per §7), and `/operational/documents/`. Deleting the right rail (§3),
   deleting the `Upload contract` button (§4), or rewiring the left menu to
   KL-scoped `kl_*` drawers (§2) **unconditionally** in the shared engine would
   change the protected Operational page — the "operational contamination" §1
   forbids, in reverse. A mode-gated implementation is *conceivable* but is a
   materially larger, higher-risk change than "four changes, all in File A".

2. **No safe, documented build command** to regenerate `kl-app.js` from
   `kl-app.jsx`. This was already adjudicated in-repo — see
   `AILANE-CC-BRIEF-KL-CHECK-ADDON-UI-001-ANCHOR-MISMATCH.md` §0.2(e):
   - `package.json` scripts: only `"test": …`; no `build` / `build:kl` / esbuild.
   - `workspace/build.sh` builds a *different* app and uses `--global-name`/`--minify`
     (RULE 23-forbidden for the KL build). It is not the `kl-app.js` command.
   - Git history (commits `4ae304f`, `605d051`, `d5b49bd`): the served bundle was
     **hand-edited ahead of its source**; the two have **deliberately diverged**;
     a full esbuild rebuild **would drop live features** (`detectKLPass`,
     `klVaultNavButton`, `KL_SUBSCRIPTION_TIERS`, Recent-Cases nav) that are
     themselves §7-excluded. Maintainers deliberately do **not** rebuild.
   - "**Inventing an esbuild command is expressly prohibited.**"

3. **The brief's own §8 verification would misreport.** §8.2/§8.3 grep File A for
   `upload contract` and the rail selectors; because those strings were never in
   File A, they return a **false PASS** while the live UI is untouched. This
   confirms the brief was authored against an incorrect model of File A.

Change-by-change status:

| Brief section | Blocked because |
|---|---|
| §2 Left menu (promote `Documents` + 6 KL-scoped items) | Menu is `HUB_WORKSPACE_FACETS` in the shared bundle; current items route to `/operational/*`. Rewire needs shared-engine edit. |
| §3 Delete right icon rail | Rail elements/handlers/panels are in the shared bundle (File A holds only CSS + an empty placeholder). |
| §4 Delete `Upload contract` button | Button is `kl-app.jsx:2846` → shared bundle. Not in File A. |
| §5 Sign Out + retention modal | `TopBar` header is in the shared bundle (`kl-app.jsx:~3501–3660`). Not in File A. |
| §6 Estate head standard | **Already satisfied** in File A (a). No-op — the one section that *was* File-A-resident needs nothing. |

## Why not the alternatives

- **Editing the shared engine unconditionally** → contaminates File B
  (`/operational/`) and `/operational/documents/`; violates §7 and §1.
- **Inventing an esbuild rebuild** → expressly prohibited; would revert live
  `detectKLPass`/`klVaultNavButton`/`KL_SUBSCRIPTION_TIERS`/Recent-Cases code
  (a real regression on §7-excluded surfaces).
- **Hand-editing both `kl-app.jsx` and `kl-app.js`** (the maintainers' surgical
  practice) mode-gated to per-session → *possible with Director authorisation*,
  but is "improvising" relative to a "four changes, all in File A" brief and edits
  a known-diverged 546 KB bundle by hand. Offered to the Director and **declined**
  in favour of Halt & report.

## What would clear the gate (for the Director)

Any one of:
1. **Re-scope the brief to the shared engine** — authorise surgical, mode-gated
   edits to BOTH `kl-app.jsx` and `kl-app.js` (all four changes rendered only when
   `accessType === 'per_session'` / `!klOperationalMode()`, leaving `/operational/`
   byte-identical at runtime), explicitly waiving "all in File A" and accepting the
   no-rebuild hand-edit practice; **or**
2. **Provide a documented, safe build command** producing
   `knowledge-library/kl-app.js` from `kl-app.jsx` (no `--global-name`, per RULE 23)
   **and** confirm the `kl-app.js ⇄ kl-app.jsx` divergence is reconciled so a
   rebuild will not drop live features; **or**
3. **Narrow the brief** to a self-contained subset (e.g. §5 Sign Out only), still
   implemented mode-gated in the shared engine per (1).

---

## Branch note (CLAUDE.md Branch precedence — Patch B)

- Brief §-named branch (authoritative): `claude/kl-landing-site-001`.
- Harness-assigned branch: `claude/kl-landing-site-001-95jgu7`, with the harness
  directive "NEVER push to a different branch without explicit permission."
- Per Patch B, the harness restriction means the brief branch could not be used;
  this determination is pushed to the **fallback harness branch
  `claude/kl-landing-site-001-95jgu7`**, and the divergence is surfaced here and in
  the completion report rather than applied silently.

## GitHub-side operations (RULE 12 / §9)

Git-only. Branch pushed; no PR created, watched, polled, approved, commented on,
or merged via any transport. A harness-auto-created draft PR (AMD-168) is
acceptable and receives no action from CC. The Director opens/merges from the
compare URL.
