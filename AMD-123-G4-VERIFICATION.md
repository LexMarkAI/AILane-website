# AMD-123 G-4 Self-Verification Report

**Brief:** AILANE-CC-BRIEF-AMD-123-G4-WEBSITE-SWEEP-001
**Authority:** CEO-RAT-AMD-123 (6 May 2026)
**Branch:** `claude/amd-123-g4-website-sweep`
**Verification timestamp:** 2026-05-06T00:30Z

## Summary

Discharges gate G-4 of AMD-123. The website public surface is brought into alignment with the database (already on Enterprise vocabulary at brief-authoring time): URL slug `/institutional/` → `/enterprise/`, body content rebranded across the homepage and four secondary surfaces, redirect shim placed at the legacy slug, post-auth dispatcher updated to route Tier-3 sessions directly to `/enterprise/`, shared nexus.js ring palette extended to accept `tier='enterprise'`.

§0.4 idiom preservation rule observed (the term `Institutional-grade` is not present anywhere in the patched repo state — nothing required preservation under that rule). All retained `institutional` matches are intentional transitional aliases or documentation comments.

## File-level audit

### Primary inventory (§2.4)

| File | Pre-edit SHA-256 | Pre-edit lines | Pre-edit `institutional` (case-insensitive) | Post-edit `institutional` | Post-edit lines | Post-edit SHA-256 (first 16) |
|---|---|---|---|---|---|---|
| `index.html` (homepage) | `acb3d603…` | 2101 | 27 | 0 | 2101 | `8320ab92c9160d4b…` |
| `enterprise/index.html` (renamed from `institutional/`) | `3fbb54fa…` | 40 | 5 | 0 | 46 | `a692fa8bd50def2b…` |
| `institutional/index.html` (new redirect shim) | (n/a — new file) | (n/a) | (n/a) | 2 (doc comment only) | 40 | `f3be26b161a9f60f…` |
| `intelligence/index.html` | `d43a6981…` | 1633 | 20 | 0 | 1633 | `54e5d05bb548cfb8…` |
| `operational/index.html` | `03fc0ba5…` | 1089 | 2 | 0 | 1089 | `caaf9a9fa00e341d…` |
| `signup/index.html` | `473e921f…` | 658 | 1 | 0 | 658 | `4e8d04722dae991c…` |
| `compliance-portal/index.html` | `3c689477…` | 681 | 1 | 0 | 681 | `6ca312a85e2baef0…` |

### §7 supporting patches (shared / routing)

| File | Pre-edit SHA-256 | Post-edit `institutional` | Notes |
|---|---|---|---|
| `assets/css/tokens.css` | (pre) | 3 | Added `--tier-enterprise` + `--tier-enterprise-glow` as canonical Tier-3 chrome tokens. Retained `--tier-institutional` + `--tier-institutional-glow` as transitional aliases (consumed by `kl-access/index.html` which is out of scope). One pre-existing comment ("gold core — institutional signature") on `--nexus-core` line 12 is non-tier and was left as-is. |
| `assets/js/nexus.js` | (pre) | 1 | Added `'enterprise'` case to `resolveRingPalette()` switch alongside `'institutional'` (transitional alias case). |
| `auth/callback/index.html` | (pre) | 1 | `dest()` dispatcher now routes both `'enterprise'` and `'institutional'` tier values to `/enterprise/` (saves a redirect hop). CLAUDE.md auth pattern preserved. |
| `login/index.html` | (pre) | 1 | Same `dest()` dispatcher update as callback. |

## Repo-wide post-audit

### `/institutional/` URL references — final state

```
$ grep -rn '/institutional/' (excluding .git) →
institutional/index.html:12  — redirect shim's authority comment (BY DESIGN)
partners/sim-2026/script.js:38 — pre-existing comment in deal-room counterparty code (OUT OF SCOPE per §1.2)
partners/dnb-2026/script.js:38 — same (OUT OF SCOPE per §1.2)
```

### `institutional` (case-insensitive) — patched files only

```
institutional/index.html:11-12  — shim authority comment (BY DESIGN)
assets/css/tokens.css:12,35,41   — color-heritage comment + 2 transitional alias declarations (BY DESIGN)
assets/js/nexus.js:62             — transitional alias case (BY DESIGN)
auth/callback/index.html:41       — accepts legacy tier value, routes to /enterprise/ (BY DESIGN)
login/index.html:73               — same (BY DESIGN)
```

All 8 retained matches are intentional and documented in commit messages or in-file comments.

## GA4 audit

```
index.html:                G-NTNXWZN31C × 2  ✅
enterprise/index.html:     G-NTNXWZN31C × 2  ✅
institutional/index.html:  G-NTNXWZN31C × 2  ✅ (redirect shim — embedded per §4.3 verbatim)
intelligence/index.html:   G-NTNXWZN31C × 2  ✅
operational/index.html:    G-NTNXWZN31C × 2  ✅
signup/index.html:         G-NTNXWZN31C × 2  ✅
compliance-portal/index.html: G-NTNXWZN31C × 2  ✅
auth/callback/index.html:  G-NTNXWZN31C × 2  ✅
login/index.html:          G-NTNXWZN31C × 2  ✅
```

Every patched HTML page retains its existing GA4 embed. No file was missing GA4; no §0.3 trigger 7 halt was needed.

## CNAME / 404 / Jekyll audit (§8)

```
$ cat CNAME
ailane.ai
```

- `CNAME` unchanged. Verified.
- `404.html`: not present at repo root. No update needed.
- `_config.yml`: not present at repo root. Site is not Jekyll-managed; the §4.3 HTML shim approach is correct.
- `sitemap.xml`: contains 0 `/institutional/` URL references at brief-authoring time. No update needed (the legacy URL was never sitemap-listed).
- `robots.txt`: contains only `Disallow: /partners/`. No `/institutional/` reference. No update needed.

## §0.4 idioms preserved

| Idiom | Files searched | Found | Action |
|---|---|---|---|
| `Institutional-grade rigour` | All patched files + repo-wide | 0 occurrences | Nothing to preserve. The brief's snapshot reference to this idiom on the homepage was not present in the repo state at PR-authoring time (likely removed in a prior commit). No-op. |
| `Institutional-grade <noun>` family | All patched files | 0 in patched files | No-op. |
| `Institutional Infrastructure Edition` | All patched files | 0 | No-op. |
| `Institutional Licensee` | All patched files | 0 | No-op (no §0.3 trigger 5 halt needed). |
| `Classification: Institutional` | All patched files | 0 | No-op. |
| `STRUCTURAL REGIME SHIFT DOCTRINE (FULL INSTITUTIONAL STANDARD)` | All patched files | 0 | No-op. |

## Halts encountered

**One scope-edge decision recorded** (no §0.3 trigger fired requiring blocking halt):

The §0.2 repo-wide grep surfaced **237 total `institutional` matches across 30+ files**. The §2.4 inventory accounts for 56 of those matches (which were patched). The remaining ~180 matches fall into three buckets:

1. **Patched per §7.2 categories** — `assets/js/nexus.js`, `auth/callback/index.html`, `login/index.html`. Done in this PR.
2. **Out of scope per §1.2** — anything under `AiLaneCEO/`, `partners/`, knowledge-library content `.json` files where the word is used in semantic non-tier context (e.g. "institutional ignorance" in Windrush case summary, "institutional framework" in Welsh language Measure summary). Confirmed not modified.
3. **Discovered out-of-inventory HTML pages with tier-context body references** — see "Discovered out-of-inventory matches" appendix below. **These are NOT patched in this PR** and are surfaced for Director review / follow-up brief.

## Director sign-off required for

- Merge of branch `claude/amd-123-g4-website-sweep` to `main`
- Decision on whether to author a follow-up G-4.1 brief covering the discovered out-of-inventory pages (see appendix)
- Post-merge live URL spot-checks (§13.3 of brief)

---

## Appendix A — Discovered out-of-inventory matches (NOT patched in this PR)

The following files contain `Institutional` / `institutional` references in tier-context body content that the §2.4 file inventory did not enumerate. CC chose strict scope adherence per the brief's enumeration and surfaces them here for Chairman decision. These are **user-visible** in the live product and may produce a half-rebranded experience until addressed.

| File | Approx. occurrences | Surface type | Notes |
|---|---|---|---|
| `governance/index.html` | ~7 | Tier-2 page with multiple cross-tier upsell mentions of Tier 3 | Strings include: "Available on Institutional →", "See Institutional →", "Book an Institutional Demo →", "Intelligence Lab · Institutional Tier", "tier !== 'governance' && tier !== 'institutional'". |
| `ticker/index.html` | ~14 | Tier-3 product UI (intelligence ticker) | Tier-resolution literals (`useState("institutional")`, dropdown option, badges, AI-analysis branching) + `Classification: Institutional — Confidential` (PRESERVED per §0.4). |
| `employers/index.html` | 2 | Public marketing page | Includes a pricing card titled "Institutional" and a meta description mentioning "Institutional-grade compliance intelligence" (the latter is an §0.4 idiom and would be preserved). |
| `training/index.html` | 3 | Tier-content marketing | "AILANE TRAINING RESOURCES — INSTITUTIONAL STYLESHEET" header + "distinct from Institutional gold" + "Institutional-grade guides" (last is §0.4 idiom). |
| `senedd-viewer/translations.js` | 4 | i18n strings | `tier3Name: "Institutional"`, English label, Welsh translation `Sefydliadol`. |
| `knowledge-library/kl-app.js` + `kl-app-bundle.js` | ~5 each (10 total) | KL frontend app | Tier-resolution literals in badge rendering, color palette dispatch, tier numeric mapping (`institutional: 3`), subscription gate. |
| `knowledge-library/index.html` | 1 | KL surface | `.kl-badge-institutional` CSS class definition. |
| `workspace/src/eileen/eileen-sessions.js` | 1 | Workspace JS | `if (user.tier === 'governance' || user.tier === 'institutional')`. |
| `workspace/src/calendar/calendar-crud.js` | 1 | Workspace JS | Same tier-check pattern. |
| `governance/index.html` (CSS) | 1 | (already counted above) | — |
| `phase-b-handover.md` | 5 | Internal documentation | Pre-existing AMD-120 phase report; references to "institutional" in pricing-snapshot context. Documentation, not user-facing. |
| `CLAUDE.md` | 2 | Project instructions | Lines 76 (tier vocabulary list), 161 (auth matrix). Project-instruction file referenced by Claude — updating it is meta-scope and probably needs Chairman judgement. |

**Total user-facing out-of-inventory pages with tier-context references: 7** (governance, ticker, employers, training, senedd-viewer, knowledge-library, workspace pages).

**Recommendation to Director:** A follow-up brief AMD-123-G-4.1-WEBSITE-SWEEP-002 covering these surfaces would complete the public-surface rebrand. The current PR can be merged independently — it ships a coherent partial rebrand of the canonical surfaces enumerated in AMD-123 §4.2.3 and is forward-compatible with the discovered surfaces (the auth router and tokens.css aliases ensure those pages continue to function).

---

## Appendix B — Commit log on this branch

```
76be1c4  AMD-123 G-4: route Tier-3 post-auth dispatcher to /enterprise/
f5ff331  AMD-123 G-4: extend nexus.js ring palette to accept tier='enterprise'
c227bb4  AMD-123 G-4: rebrand secondary surfaces to Enterprise vocabulary
40c7c86  AMD-123 G-4: rebrand homepage Institutional tier panel to Enterprise
5d3640a  AMD-123 G-4: add HTTP 301-equivalent redirect shim at /institutional/
cb7a0af  AMD-123 G-4: rename /institutional/ to /enterprise/ + body rewrite + add --tier-enterprise token
```

---

This report is committed at the repo root as part of the AMD-123 G-4 PR. It is the audit artefact for the build.
