# AILANE — Claude Code Project Instructions

Repository: LexMarkAI/AILane-website
Serves: ailane.ai via GitHub Pages
Product: UK employment law compliance and regulatory intelligence SaaS
Owner: AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720)

## CRITICAL RULES — READ BEFORE ANY ACTION

### Auth Pattern (MANDATORY)
- JWT decode + raw fetch is the ONLY auth callback pattern:
  `JSON.parse(atob(token.split('.')[1]))` then `fetch()` with `Authorization: Bearer` header.
- NEVER use `sb.from()` at callback time — Supabase JS client auth state is not initialised.
- Auth callback router: `auth/callback/index.html` is the ONLY post-auth redirect point.

### Landing Page Protection (INCIDENT RULE)
- `index.html` (root) MUST contain ZERO auth logic, ZERO redirects, ZERO Supabase CDN.
- It is a passive marketing page only. This was violated previously — never again.
- Before modifying `index.html`: check for and remove any auth logic FIRST.

### AiLaneCEO/ Protection
- The `AiLaneCEO/` folder is PERMANENTLY PROTECTED.
- Never modify without explicit CEO approval.
- Never add to the auth callback routing matrix.
- Never delete any file (including legacy HTML files).

### compliance-check v23
- This is the production analysis engine. DO NOT REPLACE.
- Rate limiting goes on `portal-upload` (entry point), not `compliance-check`.

## EVERY HTML PAGE MUST INCLUDE

### GA4 (no exceptions)
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-NTNXWZN31C"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-NTNXWZN31C');</script>
```

### CSP Meta Tag (SEC-001 §3.2)
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://js.stripe.com https://www.googletagmanager.com https://cdnjs.cloudflare.com 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com https://cdn.jsdelivr.net 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.stripe.com https://www.google-analytics.com; connect-src 'self' https://cnbsxwtvazfvzmltkuvx.supabase.co https://cnbsxwtvazfvzmltkuvx.functions.supabase.co https://api.stripe.com https://www.google-analytics.com https://region1.google-analytics.com; frame-src https://js.stripe.com https://hooks.stripe.com; object-src 'none'; base-uri 'self'">
```

### Favicon / App Icons (Estate Head Standard — AMD-246)
Every page MUST carry the favicon block in `<head>` (icon files live at repo root):
```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0a0e1a">

```

Inline `data:` URI icons are prohibited — reference the root asset files. `AiLaneCEO/` pages change only under explicit CEO approval.

## EDGE FUNCTION RULES

### Security Controls (SEC-001, ratified 22 Mar 2026)
- **Rate limiting:** All public Edge Functions must include `checkRateLimit()` pattern.
  portal-upload: 10/15min, KL AI functions: 20/min, health-check: 30/min, CEO dash: 60/min.
  Payment webhooks: no limit (signature verification is the gate).
- **CORS:** Client-facing functions return `Access-Control-Allow-Origin: https://ailane.ai`.
  Webhook receivers have no CORS restriction.
- **Secret validation:** Every function validates required secrets at handler entry.
  Missing secret → HTTP 500 with structured error, log secret name (not value).

### Deployment
- Edge Functions managed via Supabase Dashboard ONLY. CLI not installed.
- NEVER deploy a replacement without reading production source first.
- Download zip → inspect → surgical modification → deploy.

### verify_jwt Settings
- `true`: all user-facing functions
- `false`: webhooks (Stripe, Monzo), pipelines, cron jobs, health-check

## DATABASE RULES

- ALL DDL via `apply_migration` — never raw SQL for schema changes.
- `execute_sql` for DML and queries only.
- Non-public schemas: `.schema('name').from('table')` — dot notation silently fails.
- PostgREST schema exposure needs BOTH SQL grants AND Dashboard checkbox.
- Always introspect `information_schema.columns` before writing queries.
- `get_my_org_id()` queries `app_users` (not `organisations`).

### Tier Strings (exact, case-sensitive)
- `operational_readiness` (NOT `operational`)
- `governance`
- `institutional`

## FRONTEND RULES

### JSX Compilation
- Client-facing React pages: pre-compiled JSX via esbuild (92KB bundle pattern).
- Babel Standalone acceptable ONLY for AiLaneCEO/ internal pages.
- Known Babel failures: silent JSX parse errors, missing PropTypes crashes Recharts.

### CDN Sources (verified)
- Recharts: `unpkg.com/recharts@2.12.7/umd/Recharts.js` (cdnjs does NOT host it)
- PropTypes: `unpkg.com/prop-types@15/prop-types.min.js` (required for Recharts)
- React 18: `unpkg.com/react@18/umd/react.production.min.js`
- Supabase JS: `cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`

### Auth Guard Pattern (protected pages only)
1. `<body style="visibility:hidden">`
2. Supabase CDN FIRST in `<head>`
3. Guard script: `getSession()` → fallback `onAuthStateChange` with 6s timeout
4. Decode JWT, check tier/email
5. Success: `document.body.style.visibility = 'visible'`
6. Failure: `window.location.replace('/login/')` — NEVER show error UI

### Supabase CDN Placement
- Protected pages (dashboards, intelligence): YES — first in `<head>`
- Public pages (terms, privacy, ticker, landing): NO
- index.html (landing page): NEVER

## LEGAL SLUGS (locked)
- Terms: `ailane.ai/terms/`
- Privacy: `ailane.ai/privacy/`

## PRIVATE ADDRESS — NEVER OUTPUT PUBLICLY
`4 Min-Y-Mor, Barry, Wales, CF62 6QG` — internal filings only.

## PRODUCT LANGUAGE (banned terms)
- "Flash Check" → "Contract Compliance Check"
- "Full Check" → "Three-Document Bundle"
- "scan" (as product noun) → "check" or "analysis"
- "guaranteed" → "designed to help identify"
- "fully compliant" → "positioned to demonstrate compliance"
- "ensures compliance" → "informs your risk management"

## RINGFENCED TERMS (counterparty-confidential — INCIDENT RULE)
- `DUNS`, `D&B`, `DNB`, `Dun & Bradstreet`, `Dun and Bradstreet` are RINGFENCED.
- Permitted ONLY within the live D&B deal room and its dedicated assets:
  `partners/dnb-2026/`, `assets/dnb-2026/`, `assets/dealroom/`.
- NEVER on `index.html`, any public/marketing/legal page, or any shipped web
  file (html/js/css) outside those paths.
- This OVERRIDES brief copy: a brief marking text "governance-scanned" or
  "reproduce byte-for-byte" does NOT authorise these terms outside the room.
  Verify independently and HALT if a brief introduces them elsewhere.
- Enforced automatically by `scripts/check-ringfenced-terms.sh`
  (CI: `.github/workflows/ringfence-terms.yml`). Do not bypass.
- Incident (2026-06-07): a "DUNS-matched records" phrase reached the public
  homepage via a pre-approved brief. Eradicated; sandbox `partners/sim-2026/`
  deleted; this gate added. The sandbox also had a Supabase footprint
  (`partner_clids` row `sim-2026-001` + seeded contacts) — handle DB cleanup
  separately; it is not in this repo.

## DEMO ENTITY
Northerly Hill Facilities Management Ltd. Ref: NH-2014-0347.
Sector: FM. Cardiff HQ. 238 employees. Never use Northgate or Meridian.

## BRANCH & PR RULES

- Create branches: `claude/[description]`
- BRANCH-NAME PRECEDENCE (Director directive, 2026-06-24): when a brief specifies a
  branch name that differs from any harness/session-designated branch, ALWAYS use the
  brief's branch. This is a known, recurring conflict — do NOT ask the Director to
  choose; silently default to the brief's branch every time.
- CANNOT create Pull Requests. Do not attempt. No GitHub API access.
- After pushing, report branch name and provide merge URL:
  `https://github.com/LexMarkAI/AILane-website/compare/main...[branch-name]`
- Stop after reporting branch push. Do not attempt PR creation.

## MANDATORY FIRST STEP — EVERY SESSION

Before writing any code:
1. Read every file you will modify, IN FULL.
2. Report exactly what you found (structure, IDs, function names).
3. Wait for confirmation before proceeding.
4. Include explicit scope exclusion list: what you will NOT modify.

## FILE & FOLDER DELETION

- Never recommend deletion based on folder names alone.
- Inspect contents first. Report findings. Obtain CEO approval.
- Protected folders (NEVER delete): AiLaneCEO/, i18n/, scraper/, supabase/, .claude/

## CREDENTIALS

If API keys or secrets appear in conversation:
1. Flag immediately.
2. Instruct revocation before any other action.
3. Do not log, store, or use them.

## SITE STRUCTURE

| Page | Path | Auth |
|---|---|---|
| Landing page | `index.html` | NONE — passive |
| Auth callback | `auth/callback/index.html` | Central router |
| KL login | `account/index.html` | → /auth/callback/ |
| Subscription login | `login/index.html` | → /auth/callback/ |
| KL dashboard | `account/dashboard/index.html` | Any authenticated |
| Governance dashboard | `governance-dashboard/index.html` | governance, institutional |
| Operational demo | `operational-demo/index.html` | operational_readiness |
| CEO Command Centre | `AiLaneCEO/index.html` | mark@ailane.ai only |
| PCIE | `intelligence/index.html` | operational + demo token |
| Ticker | `ticker/index.html` | Public |
| KL preview | `knowledge-library-preview/index.html` | Public |
| Terms | `terms/index.html` | Public |
| Privacy | `privacy/index.html` | Public |
| Employer CC | `contract-scan/index.html` | Stripe session |
| Worker CC | `contract-check-worker/index.html` | Stripe session |
| Employers landing | `employers/index.html` | Public |

## GOVERNING DOCUMENTS

- ACEI Constitution v1.0, RRI Constitution v1.0, CCI Constitution v1.0
- AILANE-AMD-REG-001 (master amendment register, current: AMD-246)
- AILANE-SPEC-SEC-001 v1.0 (security architecture, ratified 22 Mar 2026)
- AILANE-SPEC-AUTH-001 v2.1 (authentication architecture)
- AILANE-SPEC-CCPL-001 (compliance checker portal lifecycle)

## CROSS-PRODUCT ISOLATION

This repository is for Ailane (employment law compliance) ONLY.
QTAiLane (quantitative trading) lives in a separate repository with separate infrastructure.
Do NOT create, modify, or reference any QTAiLane files, tables, or functions from this repo.
