# AMD-123 G-4.2 Self-Verification Report

**Brief:** AILANE-CC-BRIEF-AMD-123-G4-2-PRODUCT-AND-WELSH-001
**Authority:** CEO-RAT-AMD-123 (6 May 2026)
**Predecessors:**
- G-4 (merged commit `ba9c8ea` via PR #176)
- G-4.1 (merged commit `b9019e9` via PR #177)

**Branch:** `claude/amd-123-g4-2-product-and-welsh`
**Verification timestamp:** 2026-05-06T02:00Z

## Summary

Discharges the product-surface and Welsh-translation portion of AMD-123 G-4 residual. Director-confirmed Welsh translation `Mentrol` applied across `senedd-viewer/translations.js` and `i18n/translations.js` per §0.7. Five product-surface files patched per §3.1 matrix. Two product-surface files (`contract-scan`, `contract-check-worker`) had only §0.4 idiom matches (no tier-vocabulary changes). One product-surface file (`simulator-app/assets/index-eNsm_bbQ.js`) HALTED per §3.7: source not in this repository; deferred to Director.

Legal pages (`terms/`, `privacy/`, `tribunal-privacy/`, `complaints/`) explicitly NOT touched per §1.3 G-4.3 reservation.

## Discovery output (§2.4)

```
=== Product surface discovery ===
--- kl-access ---
  kl-access/index.html: 6
--- account ---
  account/workspace/index.html: 2
  account/dashboard/index.html: 2
--- operational-demo ---
  operational-demo/index.html: 1
--- contract-scan ---
  contract-scan/index.html: 1
--- contract-check-worker ---
  contract-check-worker/index.html: 1
--- simulator-app ---
  simulator-app/assets/index-eNsm_bbQ.js: 1

=== Welsh translation file inventory ===
--- senedd-viewer/translations.js ---
266:      subheading: "Cuddwybodaeth ar raddfa sefydliadol. Dim ffioedd cudd."
275:      tier3Name: "Sefydliadol"
367:      // "Sefydliadol" preserved verbatim pending Director-approved Welsh
369:      enterprise: "Sefydliadol"
--- i18n/translations.js ---
267:      subheading: "Cuddwybodaeth ar raddfa sefydliadol. Dim ffioedd cudd."
276:      tier3Name: "Sefydliadol"
366:      institutional: "Sefydliadol"
```

Total in-scope files: 9 (7 product surfaces + 2 Welsh translation files).
Total pre-edit `institutional` matches in-scope: 15.
Total pre-edit `Sefydliadol` matches in-scope: 7.

## File-level audit

| File | Pre-edit SHA-256 (first 16) | Pre-edit lines | Pre `inst` | Pre `Sef` | Post `inst` | Post `Sef` | Post lines | Post-edit SHA-256 (first 16) |
|---|---|---|---|---|---|---|---|---|
| kl-access/index.html | `63494bd7ed68cea3` | 1808 | 6 | 0 | 0 | 0 | 1808 | `8887d7b5dd509248` |
| account/workspace/index.html | `a9a4c37fe46ec00a` | 127 | 2 | 0 | 2 (§0.6.2 alias) | 0 | 127 | `2bb181df3017dd7d` |
| account/dashboard/index.html | `fe32727d728921d1` | 321 | 2 | 0 | 2 (§0.6.2 alias) | 0 | 321 | `0b19a36a48ee3d3c` |
| operational-demo/index.html | `64307c8ecaf6811c` | 297 | 1 | 0 | 0 | 0 | 297 | `d95baa4a4f73825b` |
| contract-scan/index.html | `f6df46bb75757caf` | 1806 | 1 | 0 | 1 (§0.4 idiom) | 0 | 1806 | unchanged (no patch — §0.4) |
| contract-check-worker/index.html | `81491f4ecf1f286f` | 1950 | 1 | 0 | 1 (§0.4 idiom) | 0 | 1950 | unchanged (no patch — §0.4) |
| simulator-app/assets/index-eNsm_bbQ.js | `8f09133c2d2b3659` | 9 | 1 (2 occ.) | 0 | 1 (HALT — see §3.7) | 0 | 9 | unchanged (no patch — HALT) |
| senedd-viewer/translations.js | `3c0270fe34816730` | 491 | 2 | 4 | 1 (§0.4 EN idiom) | 1 (§0.4 CY idiom) | 492 | `13e0a4f578cfa932` |
| i18n/translations.js | `08ce5d4b388fb1b3` | 489 | 4 | 3 | 1 (§0.4 EN idiom) | 1 (§0.4 CY idiom) | 489 | `d3a45416d19e1f73` |

All "Post-edit" residual matches are sanctioned: §0.4 preserved idioms, §0.6.2 backward-compat aliases, or the simulator-app HALT.

## Welsh translation patches (§3.8)

| File | Line | Predecessor | Replacement | Mutation applied? | Reason |
|---|---|---|---|---|---|
| senedd-viewer/translations.js | 275 | `Sefydliadol` | `Mentrol` | No | Standalone JS object value; no preceding y/r/i/dy trigger |
| senedd-viewer/translations.js | 369 | `Sefydliadol` | `Mentrol` | No | Standalone JS object value; no mutation trigger. Preceding G-4.1 deferral comment also replaced with G-4.2 closure note documenting the soft-mutation rule (Mentrol → Fentrol if surrounded by mutation triggers — for downstream Welsh prose authors). |
| i18n/translations.js | 90 | `"Institutional"` (EN) | `"Enterprise"` | n/a (English) | EN tier3Name canonicalisation |
| i18n/translations.js | 187 | `institutional: "Institutional"` (EN) | `enterprise: "Enterprise"` | n/a (English) | EN dispatch key + value canonicalisation |
| i18n/translations.js | 276 | `Sefydliadol` (CY) | `Mentrol` | No | Standalone JS object value; no mutation trigger |
| i18n/translations.js | 366 | `institutional: "Sefydliadol"` (CY) | `enterprise: "Mentrol"` | No | Both key and value updated; standalone token |

**§0.7 mutation analysis:** None of the 4 standalone Welsh tier-name occurrences appeared in a position where Welsh soft mutation would apply. Each is a JS object property value used as a discrete display string, not embedded in surrounding Welsh prose. The `Mentrol` form (canonical, unmutated) is correct in all four locations.

**Welsh §0.4 idiom preservation:** The phrase `Cuddwybodaeth ar raddfa sefydliadol` ("Intelligence on an institutional scale") in both files (line 266 senedd-viewer, line 267 i18n) is preserved verbatim. Per §0.4 standing rule, this Welsh phrase describes methodological scale/quality, not the subscriber tier — replacing `sefydliadol` here would change the meaning from "scale of operation" to "tier name", which is incorrect. Also note that the Welsh adjective `sefydliadol` has no soft-mutation form on its own (`s`-initial words don't soft-mutate), so the idiom form is grammatically stable.

## simulator-app HALT (§3.7)

**Status:** Deferred to Director.

**Investigation findings:**
- `simulator-app/` directory contains only built artefacts (`index.html`, `assets/index-BEgjdTKM.css`, `assets/index-eNsm_bbQ.js`).
- No `simulator-app/src/` directory in this repository.
- No build script in `package.json` (only the placeholder `"test"` entry).
- A repo-wide search for "ACEI Exposure Simulator" (the app's title) returns only the built `index.html` — no source.
- The hashed bundle filename suggests Vite/Rollup output, but the build configuration is not in this repo.

**Bundle content (the 2 occurrences via `grep -o`):**
```
{name:"Institutional",price:"Custom",scope:"API access, whit…
…className:"sim-plan-tier",children:"Institutional"})…
```

Both are user-visible: a tier dispatch literal (`name:"Institutional"`) and a React child node label.

**Per §3.7 brief instruction:** "Do not edit the minified bundle by hand — that path leads to source/build divergence." CC has NOT edited the bundle. Halt surfaced for Director.

**Recommendation:** Director provides simulator-app source location (likely a separate repo or working directory) so a successor cycle can patch source + rebuild + commit replacement bundle.

## Repo-wide post-audit (§4)

```
$ grep -rn -i 'sefydliadol' (excl. AiLaneCEO/, .git/) →
senedd-viewer/translations.js:266 — Welsh form of "Institutional-grade intelligence" §0.4 idiom (PRESERVED)
i18n/translations.js:267 — same idiom (PRESERVED)
```

✅ Welsh standalone tier-name `Sefydliadol` reduced to **zero matches** repo-wide (the 2 remaining are §0.4 idiom forms in `raddfa sefydliadol` "scale" context, not tier names).

```
$ grep -rn '/institutional/' (excl. AiLaneCEO/, .git/) →
institutional/index.html:12 — G-4 redirect shim authority comment (BY DESIGN)
partners/sim-2026/script.js:38 — pre-existing comment in deal-room counterparty code (OUT OF SCOPE per §1.2)
partners/dnb-2026/script.js:38 — same
```

✅ No new `/institutional/` URL refs introduced.

**By-file `institutional` aggregate (excluding `.md` verification reports, AiLaneCEO/, partners/, knowledge-library/content/):**

| File | Count | Sanction category |
|---|---|---|
| terms/index.html | 14 | 🔴 G-4.3 deferral (legal pages) |
| privacy/index.html | 5 | 🔴 G-4.3 deferral (legal pages) |
| tribunal-privacy/index.html | 4 | 🔴 G-4.3 deferral (legal pages) |
| complaints/index.html | 2 | 🔴 G-4.3 deferral (legal pages) |
| knowledge-library/kl-app.js | 4 | G-4.1 §0.6.2 backward-compat aliases |
| knowledge-library/kl-app-bundle.js | 4 | G-4.1 §0.6.2 backward-compat aliases |
| ticker/index.html | 3 | G-4.1 §0.4 idioms |
| assets/css/tokens.css | 3 | G-4 transitional aliases |
| workspace/src/* (10 files) | 13 total | G-4.1 §0.6.2 aliases |
| training/index.html | 2 | G-4.1 §0.4 idioms |
| institutional/index.html | 2 | G-4 redirect shim doc |
| account/workspace/index.html | 2 | This PR §0.6.2 aliases |
| account/dashboard/index.html | 2 | This PR §0.6.2 aliases |
| simulator-app/assets/index-eNsm_bbQ.js | 1 (2 occ.) | This PR §3.7 HALT |
| senedd-viewer/translations.js | 1 | EN §0.4 idiom (line 81) |
| i18n/translations.js | 1 | EN §0.4 idiom (line 81) |
| login/index.html | 1 | G-4 backward-compat |
| knowledge-library/index.html | 1 | G-4.1 CSS alias selector |
| governance/index.html | 1 | G-4.1 §0.6.2 alias |
| employers/index.html | 1 | G-4.1 §0.4 idiom |
| contract-scan/index.html | 1 | This PR §0.4 idiom (no patch) |
| contract-check-worker/index.html | 1 | This PR §0.4 idiom (no patch) |
| auth/callback/index.html | 1 | G-4 backward-compat |
| assets/js/nexus.js | 1 | G-4 transitional alias |

✅ Every retained match accounted for under the §4 retention table or the explicit G-4.3 legal-page deferral. No unsanctioned matches.

## Legal pages explicitly deferred (G-4.3 track)

Per §1.3 brief instruction (DO-NOT-TOUCH), these files contain tier-vocabulary matches but were NOT modified in this PR. Pre-flight match counts (informational; for G-4.3 brief author):

| File | Match count |
|---|---|
| terms/index.html | 14 |
| privacy/index.html | 5 |
| tribunal-privacy/index.html | 4 |
| complaints/index.html | 2 |

These remain pending the Tier 3 Fast Legal Memo per Director instruction.

## GA4 audit (§5)

```
kl-access/index.html:                G-NTNXWZN31C × 2  ✅
account/workspace/index.html:        G-NTNXWZN31C × 2  ✅ (verified — JS lookup table file with embedded GA4)
account/dashboard/index.html:        G-NTNXWZN31C × 2  ✅
operational-demo/index.html:         G-NTNXWZN31C × 2  ✅ (verified)
```

All patched HTML files retain their existing GA4 embed. Welsh translation files (senedd-viewer/translations.js, i18n/translations.js) are JS-only — GA4 does not apply. No file lacked GA4; no §0.3 trigger 7 halt needed.

## §6 Local validation

JS syntax check via `node -c` ran clean on both Welsh translation files post-patch:

```
$ node -c senedd-viewer/translations.js  → exit 0 (no output)
$ node -c i18n/translations.js           → exit 0 (no output)
```

## §0.4 idioms preserved this PR

| Idiom | File | Line | Status |
|---|---|---|---|
| `Institutional-grade intelligence. No hidden fees.` (EN subheading) | senedd-viewer/translations.js | 81 | ✅ Preserved |
| `Cuddwybodaeth ar raddfa sefydliadol. Dim ffioedd cudd.` (Welsh form of idiom) | senedd-viewer/translations.js | 266 | ✅ Preserved |
| `Institutional-grade intelligence. No hidden fees.` (EN subheading, duplicate file) | i18n/translations.js | 81 | ✅ Preserved |
| `Cuddwybodaeth ar raddfa sefydliadol. Dim ffioedd cudd.` (Welsh form) | i18n/translations.js | 267 | ✅ Preserved |
| `Built on institutional-grade data` | contract-scan/index.html | 1100 | ✅ Preserved (no patch needed; only match in file) |
| `Powered by institutional-grade data` | contract-check-worker/index.html | 1351 | ✅ Preserved (no patch needed; only match in file) |

## §0.6.2 backward-compat applications

| File | Line | Pattern |
|---|---|---|
| account/workspace/index.html | 60 | `ALLOWED_TIERS` array extended: `[…, 'governance', 'enterprise', 'institutional']` |
| account/workspace/index.html | 61 | `TIER_LABELS` map: enterprise:'Enterprise' canonical + institutional:'Enterprise' alias (renders Enterprise label for legacy tier values) |
| account/dashboard/index.html | 227 | Same as workspace line 60 |
| account/dashboard/index.html | 228 | Same as workspace line 61 |

Internal client-state files (Welsh translation .js, kl-access standalone-token contexts) used clean rename rather than extension because no DB-sourced legacy values flow through them.

## Halts encountered

**One §0.3 halt surfaced and recorded for Director follow-up:**

**§3.7 simulator-app source not in repo** — see "simulator-app HALT (§3.7)" section above. CC has NOT modified the bundle. Director should provide source location for a successor cycle.

**Plus one structural deferral:** legal pages (terms/, privacy/, tribunal-privacy/, complaints/) are intentionally NOT touched per §1.3 brief reservation for the G-4.3 track.

## Cumulative AMD-123 G-4 + G-4.1 + G-4.2 state

After this PR merges:

| Surface | Status |
|---|---|
| Public marketing surface (homepage, /enterprise/, /intelligence/, /operational/, /signup/, /compliance-portal/) | ✅ G-4 |
| Auth dispatcher (auth/callback, login) | ✅ G-4 |
| Shared design tokens (assets/css/tokens.css) | ✅ G-4 |
| Shared rendering JS (assets/js/nexus.js) | ✅ G-4 |
| Inner portals (governance, ticker, employers, training, knowledge-library, workspace, senedd-viewer EN) | ✅ G-4.1 |
| Product surfaces (kl-access, account/workspace, account/dashboard, operational-demo) | ✅ G-4.2 |
| Welsh tier translation (senedd-viewer + i18n: Sefydliadol → Mentrol) | ✅ G-4.2 |
| simulator-app bundle | ⏳ HALT (Director provides source) |
| Legal pages (terms, privacy, tribunal-privacy, complaints) | ⏳ G-4.3 (Tier 3 Fast Legal Memo) |
| Database tier vocabulary | ✅ Pre-G-4 (Chairman) |

**AMD-123 G-4 status:** substantially discharged across all subscriber-facing application surfaces. Full G-4 discharge gates on (a) simulator-app source supply + rebuild and (b) G-4.3 legal-page closure.

---

## Appendix A — Commit log on this branch

```
3ca3f65  AMD-123 G-4.2: rebrand product surfaces + Welsh tier translation to Mentrol
```

Single consolidated commit covering all 6 patched files (5 product surfaces + 2 Welsh translation files; contract-scan and contract-check-worker had only §0.4 idiom matches — no edits). The simulator-app HALT and the contract-scan/contract-check-worker §0.4 retentions are documented in the commit body and this report.

---

This report is committed at the repo root as part of the AMD-123 G-4.2 PR. Together with `AMD-123-G4-VERIFICATION.md` (G-4) and `AMD-123-G4-1-VERIFICATION.md` (G-4.1), it forms the audit artefact for AMD-123 G-4 substantial discharge.
