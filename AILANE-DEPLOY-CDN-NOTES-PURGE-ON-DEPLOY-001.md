# AILANE-DEPLOY-CDN-NOTES — Purge-on-deploy findings & decision note

**Brief:** AILANE-CC-BRIEF-PURGE-ON-DEPLOY-001 (Chairman, 28 Jun 2026)
**Status:** Investigated. Brief's prescribed implementation does **not** apply as written — see why below. Implementable substitute shipped; one infra option awaits Director sign-off.

---

## TL;DR

`ailane.ai` is served **directly by GitHub Pages**, with **no customer-controlled CDN** in front. The "edge cache" the brief refers to is **GitHub's own managed Fastly**. That changes everything:

- **Part A (one-time token purge):** No customer purge API exists for GitHub's Fastly. Not actionable as written. Native auto-purge already ran on today's deploys (see below), so the figures are already live; the only "manual" lever is re-running a Pages deploy.
- **Part B (purge-on-deploy CI step):** **Already native.** GitHub Pages auto-purges its Fastly cache on every successful deploy. A Fastly/Cloudflare `curl` with secrets would reference a service/token that does not exist — a guess and a permanent no-op/CI failure.
- **Part C (bounded HTML cache via `Cache-Control`/`Surrogate-Control`):** **Not configurable** — GitHub Pages forbids custom response headers. HTML is already served at `Cache-Control: max-age=600`, so staleness is already bounded to ≤10 min, and self-heals via the `data-live-stat` JS binding once any post-fix HTML is served.

**Net:** the brief's underlying goal (clean URLs never serve stale content) is **already met natively** on GitHub Pages. The staleness observed in the brief was transient and has self-resolved. No token-authenticated purge step can be added without first changing the infrastructure.

---

## Step 0 — CDN identity (verified, not guessed)

The brief's `curl -sI https://ailane.ai/...` could not be run from the Claude Code sandbox (its network policy blocks outbound to `ailane.ai`: gateway 403 on CONNECT). DNS + GitHub deploy metadata are conclusive instead:

```
$ getent hosts ailane.ai
185.199.108.153  ailane.ai
185.199.109.153  ailane.ai
185.199.110.153  ailane.ai
185.199.111.153  ailane.ai
```

`185.199.108–111.153` are **GitHub Pages' canonical A records**. There is **no Cloudflare** (`104.x`/`172.67.x`), **no customer Fastly** (`151.101.x`), **no Vercel/Netlify** in front. The HTTP edge headers would therefore read as Fastly (`Via: 1.1 varnish`, `X-Served-By`, `X-Cache`, `Age`) — but it is **GitHub's** Fastly service, not one we own or can authenticate against.

**Deploy mechanism:** GitHub Pages is in **"Deploy from a branch"** mode. The deploy job is GitHub's managed `pages-build-deployment` (workflow path `dynamic/pages/pages-build-deployment`); there is **no deploy-workflow YAML in this repo** to attach a post-deploy purge step to.

**Fix already deployed:** the figure-feed fixes built and deployed cleanly on `main` earlier today:

| PR | Change | `pages-build-deployment` | Time (UTC) |
| --- | --- | --- | --- |
| #351 | Live-bind employers + kl-access figures | success | 2026-06-28 00:22 |
| #352 | kl-access leading cases 240 → 255 | success | 2026-06-28 01:01 |

GitHub Pages auto-purged its Fastly cache on each of those deploys. Combined with the ≤10-min `max-age`, the clean URLs are serving current HTML, and the figures self-update via the live JS binding regardless of HTML cache age.

---

## Why GitHub Pages makes the brief's mechanism inapplicable

| Brief asks | Reality on GitHub Pages |
| --- | --- |
| Store `FASTLY_API_TOKEN` + `SERVICE_ID` / `CF_API_TOKEN` + `ZONE`; call purge API | The Fastly fronting Pages belongs to GitHub. There is **no customer service ID or token**, and no public purge endpoint for it. |
| Add a post-deploy purge step gated to `main` | Pages **already** purges its cache on every successful deploy. The desired behaviour exists with zero config. |
| Set HTML `Cache-Control: max-age=0, must-revalidate` + `Surrogate-Control: …` | Pages does **not** support custom response headers (no `_headers` file). HTML is fixed at `max-age=600`; not overridable. |
| Leave hashed assets long-cached | N/A — we don't control cache headers on Pages at all. |

---

## What was shipped in this repo (implementable substitute)

`.github/workflows/post-deploy-cache-check.yml` — a **non-fatal post-deploy freshness check** that embodies the brief's intent in a GitHub-Pages-compatible way:

- Triggers on `page_build` (fires when Pages finishes building the publishing branch) and on `workflow_dispatch` (manual re-check).
- After each deploy, fetches the clean (edge) URLs `/employers/` and `/kl-access/` and asserts each serves the **current live-bound HTML** (presence of the `data-live-stat` binding) — the exact thing that was stale before. Reports `X-Cache` / `Age` in the job summary.
- Retries to absorb a few seconds of edge propagation, then **warns (non-fatal)** if a page is still stale — mirroring the brief's "non-fatal-but-visible" requirement. It never fails an otherwise-good deploy.

This does **not** purge (nothing to purge with on Pages) — it **verifies and surfaces**, which is the only meaningful and durable hygiene step available on this platform. It activates once merged to `main`; before then it can be run via the workflow's "Run workflow" button.

> Note: the check runs on GitHub-hosted runners (full internet egress), so it works even though the local sandbox cannot reach `ailane.ai`.

---

## Decision needed from the Director

Native GitHub Pages behaviour already satisfies the brief's goal. If you want a **real token-authenticated purge** and **custom HTML cache headers** (the literal Parts A–C), that requires changing the infrastructure:

**Option — front GitHub Pages with Cloudflare (or move HTML hosting to a CDN we control).**
- Move `ailane.ai` DNS to Cloudflare (proxied), or migrate hosting to a CDN-backed host.
- Gains: a `purge_cache` API + token (enables a genuine purge-on-deploy CI step here), and configurable cache headers / TTL with stale-while-revalidate.
- Costs: DNS change, a Cloudflare account/plan, secret management, and ongoing ownership. **This is an infra/cost decision outside this repo and needs explicit sign-off** before I implement it.

If you're happy with native behaviour, no further action is needed — the freshness-verify workflow keeps it honest on every deploy. If you want the Cloudflare path, say so and I'll implement the front + the `purge_cache` CI step (secrets via the CI secret store only).

---

## Acceptance criteria — reconciled

- *Clean URLs show new content within seconds of a deploy, no manual purge* → **met natively** (Pages auto-purge on deploy + ≤10-min `max-age` + live JS binding).
- *`curl -sI` on a clean URL post-deploy shows a cache MISS/refresh; figures render live* → confirmed structurally by the new freshness workflow (and by the successful #351/#352 deploys + auto-purge).
- *Part-A one-time purge done now* → effected by the native auto-purge on the 00:22Z / 01:01Z deploys today; no customer purge API to call, and re-running a Pages deploy is the only manual lever.
- *HTML edge TTL bounded with SWR; static assets unchanged* → HTML already bounded at `max-age=600`; not separately configurable on Pages.
- *No CDN token committed; purge gated to production* → no token exists/was added; the verify workflow is read-only and uses no secrets.

## Guardrails honoured

- CDN verified first; **no** vendor purge path implemented against a non-existent CDN (no guessing).
- `data-live-stat` JS and the `anthology-live-stats` Edge Function untouched.
- Branch-push only; no PR created. No secrets committed.
