# MIGRATION_SIGNOFF_REPORT — AMD-111-AM-001 Stage B
## Match_cases caller-side remediation — website repo

**Authority:** AMD-111-AM-001 Stage B (caller-side remediation, website repo)
**Execution date:** 2026-05-01
**Branch:** `claude/brief-match-cases-callers-Vztsr` (harness-assigned; brief specified
`claude/match-cases-callers-website-amd-111-am-001` — discrepancy flagged and accepted
by Director per §4.1, no migration involved so harness branch retained)
**Commits:** dd243d7 (remediation), plus this sign-off commit
**Repo:** LexMarkAI/AILane-website
**Predecessor:** AMD-111 ratified 1 May 2026 (BAILII URL elimination); Stage A handled
in `LexMarkAI/ailane-backend` separately

---

## §1 Greps run + results (pre-edit)

### Query 1: Direct `match_cases` RPC calls

```
supabase/functions/kl_ai_assistant/index.ts:218:    // match_cases: cosine similarity, top 5, threshold 0.3
supabase/functions/kl_ai_assistant/index.ts:247:          "match_cases",
supabase/functions/kl_ai_assistant/index.ts:255:          console.error("match_cases error:", caseError);
supabase/functions/kl_ai_assistant/index.ts:260:        console.error("match_cases exception:", e);
deployments/CCRE-001-phase1/eileen-intelligence-v11.ts:10://   RAG retrieval (match_provisions / match_cases), Voyage embeddings, compliance
deployments/CCRE-001-phase1/eileen-intelligence-v11.ts:476:        const { data: cases } = await supabase.rpc('match_cases', { ... });
deployments/CCRE-001-phase1/eileen-intelligence-v11.ts:478:      } catch (e) { console.error(`[eileen v6] match_cases: ${(e as Error).message}`); }
deployments/CCRE-001-phase1/eileen-intelligence-v7.ts:10://   RAG retrieval (match_provisions / match_cases), Voyage embeddings, compliance
deployments/CCRE-001-phase1/eileen-intelligence-v7.ts:454:        const { data: cases } = await supabase.rpc('match_cases', { ... });
deployments/CCRE-001-phase1/eileen-intelligence-v7.ts:456:      } catch (e) { console.error(`[eileen v6] match_cases: ${(e as Error).message}`); }
```

**Classification:** All 7 hits are in EF source (`supabase/functions/`) or deployment
artefacts (`deployments/CCRE-001-phase1/`). Stage A territory per §7 — out of scope here.
**Zero direct `match_cases` callers in website JS client.** Architectural prediction
confirmed (Voyage embedding generation is server-side only per DPIA §4.2).

### Query 2: `bailii_url` / `bailiiUrl` / `bailii.org` / `BAILII`

```
FRONTEND (caller-side, in scope for Stage B):
  knowledge-library/kl-app.jsx:5338,5339,5341
  knowledge-library/kl-app.js:5083,5084,5088
  knowledge-library/kl-app-bundle.js:4666,4667,4671

EF SOURCE (Stage A territory — out of scope here, leave untouched):
  supabase/functions/kl_ai_assistant/index.ts:52,285,291
  supabase/functions/kl-content-loader/index.ts:162,235
  deployments/CCRE-001-phase1/eileen-intelligence-v11.ts:503
  deployments/CCRE-001-phase1/eileen-intelligence-v7.ts:481
```

### Query 3: Crown URL fields (`tna_url` / `supremecourt_url` / `judiciary_url` / `citation_canonical` / `url_source_class`)

```
0 hits.
```

Pre-remediation, no Crown URL fields were rendered anywhere in the repo.

---

## §2 Files remediated

| File | Lines changed | Banned strings remaining | GA4 preserved |
|---|---|---|---|
| knowledge-library/kl-app.jsx | 3 | 0 | YES (host HTML untouched) |
| knowledge-library/kl-app.js | 3 | 0 | YES (host HTML untouched) |
| knowledge-library/kl-app-bundle.js | 3 | 0 | YES (host HTML untouched) |

### Remediation pattern applied (identical across all three files)

OLD:
```js
(c.url || c.bailiiUrl) && React.createElement("a", {
  href: c.url || c.bailiiUrl,
  target: "_blank",
  rel: "noopener noreferrer",
  style: { ... }
}, "↗ BAILII")
```

NEW:
```js
(c.tna_url || c.supremecourt_url || c.judiciary_url) && React.createElement("a", {
  href: c.tna_url || c.supremecourt_url || c.judiciary_url,
  target: "_blank",
  rel: "noopener noreferrer",
  style: { ... }
}, "↗ Read judgment")
```

**Labelling decision:** Adopted the simpler "Read judgment" link text per
Director-confirmed flexibility on §2.2 (rather than `url_source_class`-switched labels).
Rationale: source-class labelling depends on EF response field set which is being
remediated separately in Stage A; "Read judgment" is the safest universal label and
does not reference any specific archive. Switch to `url_source_class`-aware labelling
can be layered in cheaply after Stage A lands.

**Citation-only fallback:** Not added as a separate `<span>` element. The case row
already renders citation/court/year on its own line above the link (lines 5332–5334
in kl-app.jsx); the link element simply does not render when no Crown URL is present.
This avoids visually duplicating the citation when no judgment URL is available, which
matches the spirit of brief §2.1.

**TypeScript types:** N/A — none of the three files use TypeScript.

**Compiled-bundle sync:** No build pipeline visible in this repo. The .jsx is the
canonical source; `.js` and `-bundle.js` are derived artefacts that ship to the live
site. All three were hand-patched with the identical remediation pattern.

---

## §3 Estate-wide grep result post-remediation

### Frontend only (excluding `supabase/` and `deployments/` — Stage A territory)

```
$ grep -rn "bailii\|BAILII" --include="*.html" --include="*.js" --include="*.jsx" \
    --include="*.ts" --include="*.tsx" --exclude-dir=supabase \
    --exclude-dir=deployments /home/user/AILane-website/

(zero hits)
```

### Full repo

Remaining hits are in `supabase/functions/` (Stage A territory) and
`deployments/CCRE-001-phase1/` (historical artefacts: v7 and v11 are 7 and 3 versions
behind the current live `eileen-intelligence` v14 per Chairman MCP cross-check). All
expected and untouched per §7 out-of-scope rules.

---

## §4 Acceptance check matrix

### §5.1 Per-file

| Check | kl-app.jsx | kl-app.js | kl-app-bundle.js |
|---|---|---|---|
| 5.1.1 No `bailii_url` reads | PASS (0) | PASS (0) | PASS (0) |
| 5.1.2 No `bailiiUrl` reads | PASS (0) | PASS (0) | PASS (0) |
| 5.1.3 No `bailii.org` links | PASS (0) | PASS (0) | PASS (0) |
| 5.1.4 No "BAILII" UI strings | PASS (0) | PASS (0) | PASS (0) |
| 5.1.5 GA4 embed preserved | N/A (host HTML) | N/A (host HTML) | N/A (host HTML) |
| 5.1.6 Crown fields rendered | PASS (≥2) | PASS (≥2) | PASS (≥2) |

GA4 (`G-NTNXWZN31C`) lives in `knowledge-library/index.html` and
`knowledge-library/knowledge-library.html` (host HTMLs); both untouched by this commit.

### §5.2 Estate-wide

| Check | Result |
|---|---|
| 5.2.1 Zero BAILII references in frontend | PASS |
| 5.2.2 No spurious file modifications | PASS — diff stat shows 3 files, 9+/9- only |
| 5.2.3 Locked slugs untouched | PASS — `git diff main --stat -- terms/ privacy/` empty |

`AiLaneCEO/` legacy files: untouched (not in §1 grep results, not edited).

---

## §5 Pending actions

1. Director merge of branch to `main`
2. GitHub Pages auto-deploy (~2 min post-merge)
3. Live site verification (Director or Chairman MCP via web_fetch on
   `https://ailane.ai/knowledge-library/`)
4. Stage A remediation in `LexMarkAI/ailane-backend` (separate brief) which will
   update EF responses to populate `tna_url`/`supremecourt_url`/`judiciary_url` so the
   newly-remediated frontend renders Crown links rather than no-link/citation-only
5. After Stage A lands, the EF source files in `supabase/functions/` and the deployment
   artefacts in `deployments/CCRE-001-phase1/` (this repo) become candidates for a
   sweep — confirm with Director whether they should be remediated in this repo or
   cleaned up entirely

---

## §6 Sign-off

- All caller-side renders remediated (3 files, identical pattern)
- No banned strings remain in frontend code
- GA4 preserved on all touched pages (host HTMLs untouched)
- Locked slugs untouched (terms/, privacy/)
- AiLaneCEO/ legacy files untouched
- Branch discrepancy flagged: harness assigned `claude/brief-match-cases-callers-Vztsr`,
  brief specified `claude/match-cases-callers-website-amd-111-am-001` — Director-accepted
  in pre-edit ack (this is a follow-on patch, not a migration)

End of Stage B sign-off.
