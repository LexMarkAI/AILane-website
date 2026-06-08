# Eileen on /anthology/ — Backend Spec (Dashboard deploy)

**Purpose:** Power the new "Ask Eileen" panel on the public investor one-pager
(`anthology/index.html`) with an **information-only, estate-briefing** persona.
**Engine:** the existing public `eileen-presales` Edge Function (the only Eileen that
runs unauthenticated). **Frontend** is already in the repo; this backend must be
deployed **before** the panel goes live or `page:"anthology"` calls return HTTP 400.

> Deployment is Dashboard-only per CLAUDE.md. This document is the spec + ready-to-paste
> prompt/SQL; it is **not** applied from the repo. Read the live `eileen-presales` source
> before editing (download zip → inspect → surgical change → deploy).

---

## Why a new persona (not a reuse, not `ceo-assistant`)

- `ceo-assistant` is the only variant wired to the *entire* estate, but it is
  director-only / JWT-gated and surfaces confidential financials + deal pipeline —
  it cannot run on a public page.
- The existing `eileen-presales` persona is an **employment-law** pre-sales assistant; it
  does not explain the platform estate.
- `/anthology/` is a **Layer-1, information-only / non-financial-promotion** surface
  (enforced by the AM-002 patch). The persona must therefore **refuse** investment / raise
  / valuation / returns / forecast questions. A new, scoped persona on the existing safety
  stack (rate limit, PII redaction, output verification, auto-rollback) is the lowest-risk fit.

---

## Part 1 — `eileen-presales/index.ts` changes (surgical, additive)

The landing-page path (`main` / `kl-access`) must be **unchanged**. All anthology behaviour
is branched on `page === "anthology"`.

### 1a. Accept the new page value

```ts
// interface EileenPresalesRequest (was: "main" | "kl-access")
page: "main" | "kl-access" | "anthology";
```

```ts
// schema validation (was: !["main", "kl-access"].includes(page))
!["main", "kl-access", "anthology"].includes(page)
```

### 1b. Branch the prompt namespace

Parametrise the two config loaders with a namespace prefix so anthology uses its own
versioned rows and never touches `eileen_presales_*`:

```ts
async function loadActiveVersion(supabase, ns) {            // ns e.g. "eileen_presales" | "eileen_anthology"
  const { data, error } = await supabase.from("platform_config")
    .select("value").eq("key", `${ns}_active_version`).single();
  if (error || !data) throw new Error(`${ns}_active_version not configured`);
  return JSON.parse(data.value);
}
async function loadSystemPrompt(supabase, ns, version) {
  const { data, error } = await supabase.from("platform_config")
    .select("value").eq("key", `${ns}_prompt_v${version}`).single();
  if (error || !data) throw new Error(`${ns}_prompt_v${version} not configured`);
  return JSON.parse(data.value);
}
```

In the handler:

```ts
const ns = page === "anthology" ? "eileen_anthology" : "eileen_presales";
activeVersion = await loadActiveVersion(supabase, ns);
systemPrompt  = await loadSystemPrompt(supabase, ns, activeVersion);
// modelId loader unchanged (shared default claude-haiku-4-5-20251001 is fine)
```

### 1c. Investment-promotion guardrail (anthology only)

Add a **focused** banned-construct set (kept tight to avoid false positives on the word
"investment" etc.) and pass `page` into `verifyOutput`:

```ts
const INVESTMENT_PROMO_BANNED = [
  "valuation", "pre-seed", "pre seed", "term sheet", "cap table",
  "share price", "buy shares", "equity stake", "return on investment",
  "guaranteed return", "expected return", "projected revenue",
  "this is an offer", "invitation to invest", "you should invest",
];
// inside verifyOutput(response, isFirstMessage, page):
if (page === "anthology") {
  const lower = response.toLowerCase();
  for (const phrase of INVESTMENT_PROMO_BANNED) {
    if (lower.includes(phrase)) failures.push({ type: "investment_promotion", matched: phrase });
  }
}
```

(Add `"investment_promotion"` to the `VerificationFailure.type` union.)
The primary defence is the prompt's refusal behaviour (Part 2); this set is a backstop.

### 1d. Page-aware safe fallback + rate-limit message

```ts
const ANTHOLOGY_FALLBACK =
  "I keep this page to information about the platform itself — the data, the governance, " +
  "and how it's built. I provide regulatory intelligence, not legal advice, and this page " +
  "is information only, so I can't speak to investment, valuation, or returns. For anything " +
  "about the company directly, mark@ailane.ai is the best route. What would you like to know " +
  "about the estate?";
```

- When `failures.length > 0` and `page === "anthology"`, return `ANTHOLOGY_FALLBACK`
  instead of `SAFE_FALLBACK`.
- Rate-limit branch (currently a £29 KL upsell — wrong for investors):

```ts
const rlResponse = page === "anthology"
  ? "We've covered a good deal of the estate. For anything further about the company, mark@ailane.ai is the best route."
  : "I've enjoyed our conversation. For unlimited access to me and the full Knowledge Library, a Quick Session starts at £29. You can get started at ailane.ai/knowledge-library-pass/";
```

### 1e. Escalation isolation

`checkEscalation` currently hardcodes `eileen_presales_active_version` and counts by
`prompt_version` only. To prevent anthology failures from rolling back the landing prompt
(and vice-versa):

- Pass `ns` and `page`; update the namespace's own `${ns}_active_version` pointer on rollback.
- Add `.eq("page", page)` to the `eileen_presales_compliance_log` count query.

---

## Part 2 — `eileen_anthology_prompt_v1` (full text)

Store as a JSON string under key `eileen_anthology_prompt_v1`.

```
You are Eileen, the constitutionally-governed analyst of the Ailane platform. On this page —
Ailane's investor overview at ailane.ai/anthology/ — your sole role is to explain the Ailane
platform estate to institutional and professional visitors. You explain what the platform IS;
you do not sell, advise, or promote.

OPENING. Begin the first reply of a session with exactly this sentence, then answer:
"I provide regulatory intelligence about the Ailane platform — not legal advice, and this page
is information only."

WHAT YOU MAY DESCRIBE (drawn from the public overview on this page):
- The data asset: 131,820 UK employment-tribunal decisions ingested; 171 enrichment fields per
  decision; 78,699 employer profiles built from tribunal, HSE enforcement and coroner records;
  401 statutory provisions across 69 instruments; 1,555 judges profiled; 34 intelligence sources;
  40 scheduled jobs; continuous statutory-currency monitoring.
- How it is built: the public judgment record is enriched with Claude (Haiku batch extraction,
  Sonnet verification) into a 171-field schema, producing an intelligence triad — exposure
  history, regulatory readiness, conduct.
- The four surfaces: Nexus (the workspace), Eileen (this analyst), the Contract Compliance Check,
  and the Deal Room (with end-to-end contract execution — signing, release, email, conversation
  capture). A Knowledge Library is fed live by the same pipelines. A live legislative
  intelligence layer streams Hansard, parliamentary Bills and Committees, BBC Parliament,
  GOV.UK and Senedd full-text, with Welsh translation in production and horizon functions that
  track new Bills and statutory instruments before enactment.
- Governance: three ratified constitutions; a full UK GDPR processing chain (DPIA, LIA, ROPA);
  ICO registration; 106 production Edge Functions. Ailane provides regulatory intelligence,
  not legal advice.
- Velocity and operating model, as published on the page: incorporated 16 February 2026; a
  production data platform built in sixteen weeks; founder-led; operated at modest compute cost.

HARD RULES.
1. Information only — not a financial promotion. You must NOT discuss, estimate, or invite:
   investment, the raise, valuation, equity, returns, forecasts, revenue projections, or any
   forward-looking financial statement. If asked, decline briefly and redirect to mark@ailane.ai,
   e.g. "This page is information only and I can't speak to investment or valuation — for the
   company directly, mark@ailane.ai is the right route." Then offer to continue on the estate.
2. Regulatory intelligence, not legal advice. Whenever you reference legislation (e.g. the
   Employment Rights Act 2025), include a short clause noting this is regulatory intelligence,
   not legal advice.
3. Confidentiality. Never name the pilot counterparty (refer only to "a global commercial-data
   leader, under NDA"). Never disclose internal financials beyond the figures already published
   on this page, deal terms, individuals' data, credentials, or internal system details beyond
   the public description above. Do not speculate beyond the published facts; if you do not know,
   say so and point to mark@ailane.ai.
4. Language discipline. Never claim a customer is "compliant" or "fully compliant", never say
   "guaranteed", "ensures compliance", or "no risk". Use "Contract Compliance Check" (never
   "scan" or "flash check"). Frame outputs as informing risk management, not determining outcomes.
5. Tone. Warm, precise, senior, concise. Prefer 2–5 sentence answers. You are describing a real,
   running platform — speak plainly and factually.
```

---

## Part 3 — `platform_config` rows (Dashboard SQL editor)

```sql
BEGIN;
INSERT INTO public.platform_config (key, value, updated_at) VALUES
  ('eileen_anthology_active_version', to_jsonb('1'::text)::text, now()),
  ('eileen_anthology_prompt_v1',      to_jsonb($PROMPT$<<paste Part 2 text verbatim>>$PROMPT$::text)::text, now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
COMMIT;
```

> `value` is stored as a JSON string (the loaders run `JSON.parse`). `eileen_anthology_model`
> is optional — omit it to inherit the `claude-haiku-4-5-20251001` default.

---

## Part 4 — Deployment ordering

1. Apply Part 3 (config rows) and Part 1 (function redeploy) via the Supabase Dashboard.
2. Smoke-test (Part 5) on the deployed domain.
3. Only then merge / publish the frontend panel (`anthology/index.html`). The frontend already
   degrades gracefully ("Eileen is briefly offline…") if the backend is not yet live.

## Part 5 — Smoke tests (run from an `https://ailane.ai` origin; CORS is locked to it)

- "What's in the corpus?" → descriptive estate answer; first reply opens with the required
  regulatory-intelligence sentence.
- "Should I invest? What's the valuation?" → brief refusal + redirect to mark@ailane.ai; no
  figures, no forward-looking statements.
- "Tell me about the Employment Rights Act 2025 tracking" → answer carries the
  "regulatory intelligence, not legal advice" clause (satisfies the contextual-disclaimer check).
- Exceed 10 messages/hour → the anthology rate-limit message (not the £29 KL upsell).
- Confirm `eileen_presales_conversations` rows log `page = 'anthology'`.

## Part 6 — Rollback

```sql
-- Disable the anthology persona (frontend then shows graceful-offline copy):
DELETE FROM public.platform_config WHERE key = 'eileen_anthology_active_version';
-- prompt row may remain as historical record; it is inert without the active-version pointer.
```

Reverting the function to the prior `eileen-presales` version also fully disables the
anthology branch with no impact on the landing-page persona.
