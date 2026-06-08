# AILANE-CC-BRIEF-CEO-DASH-IA-FOLLOWON-001 — Deal-Room Origination Wiring (Action 1 + Action 2) & Daily-Brief Repoint

`AILANE-CC-BRIEF-CEO-DASH-IA-FOLLOWON-001 · v1.0 · Draft — Pending Director ratification · governed by AILANE-AMD-REG-001`

| Field | Value |
|---|---|
| Brief identifier | AILANE-CC-BRIEF-CEO-DASH-IA-FOLLOWON-001 |
| Parent | AILANE-CC-BRIEF-CEO-DASH-IA-001 v1.2 (§2A Action 2, §6.3 escalation) |
| Author | Executor (CC), raised under the parent brief's §6.3 ("if not wired, raise a follow-on build brief — do NOT fabricate") |
| Date | 8 June 2026 |
| Target repo | LexMarkAI/AILane-website — `AiLaneCEO/` |
| Target data | Supabase ailane-core (cnbsxwtvazfvzmltkuvx) |
| Enhances (must not alter) | AILANE-SPEC-DRPS-001; CBI-001 (AMD-147); the pricing arc + `pricing-quote`; AILANE-SPEC-DDX-001 §5 |

## Why this brief exists

The parent brief's **§0** required the executor to confirm whether the cohort→deal-room **create path** and `pricing-quote` **"best offering"** were already wired, and per **§6.3** to raise a follow-on build brief rather than fabricate logic if they were not. The §0 reconnaissance found they are **not wired**, and that **Action 1** (cohort research + dossier capture) is likewise unwired. The presentation layer was built (cohort leagues merged into Deal Rooms, per-cohort action panel with both actions **staged/Director-gated, never auto-fired**); this brief specifies the back-end wiring to make those two buttons live.

All Edge-Function deploys below are **Path A (Chairman MCP) or repo CI — never CC** (RULE 13). DB policy/DDL changes go via `apply_migration`.

---

## §0 — Verified facts (read-only, 8 June 2026)

- `research_finding_register` exists, empty, has `related_cohort_codes text[]` + `evidence_payload jsonb` + `finding_type` + `recorded_at/recorded_by`. RLS: only `rfr_director_read` (authenticated **SELECT**). **No authenticated INSERT** → the browser cannot write a dossier.
- Edge Function `research-finding-ingest` exists (`verify_jwt:false`) — candidate dossier-writer (service-role); its request contract must be confirmed/extended for cohort dossiers.
- Edge Function `eileen-intelligence` exists (`verify_jwt:false`) — general legal-RAG assistant; **no established contract** for "research a cohort" (counterparty potential/fit, synergies, M&A watch). The external deal-room Eileen is `eileen-dealroom` (counterparty-facing) — distinct; do not reuse for the internal CEO surface.
- CBI-001 instantiation is the SQL function `instantiate_counterparty_from_cohort` (migration `20260515171944`), **not exposed as an HTTP endpoint** to the dashboard.
- `pricing-quote` EF exists (`verify_jwt:true`, v1) but is **never called** from `AiLaneCEO/`.
- `counterparty_profile` carries `pricing_cohort_family, pricing_package_id, four_surfaced_packages, mca_data_scope, canonical_alin, envelope_floor/target/ceiling_pence, envelope_quote_id, …`.
- `ceo_daily_brief` (singular, canonical, 4 rows 06-05…06-08) has **RLS enabled with ZERO policies** → not browser-readable. `ceo_daily_briefs` (plural, stale, 2 rows March) backs the current `/AiLaneCEO/briefs/` archive.
- `eileen_presales_compliance_log` is **service-role only** (no authenticated read) → not surfaced on the Legal page today.

---

## §1 — Action 1: Research a cohort + capture dossier

**Goal:** from the Deal Rooms cohort-origination panel, the Director runs read-only intelligence on a selected cohort and captures it as a dated dossier that can feed Action 2.

1. **New EF `ceo-cohort-research`** (`verify_jwt:true`, Director-only email check, SEC-001 secret validation, CORS `https://ailane.ai`):
   - Input: `{ cohort_family }`.
   - Reads the estate + live sources (`company_event_register`, `forward_exposure_register`, `govuk_news_intelligence`, `parliamentary_intelligence`, cohort register entities) for that family and composes an intelligence summary (counterparty potential & fit, synergies, business prospects, forward-event / M&A watch, latest position). Reuse `eileen-intelligence` internally **only if** a cohort-research prompt/contract is defined; otherwise compose deterministically from the tables above.
   - **Boundary:** identifies/quantifies/contextualises — does not advise (PLUGIN-001 Art XIV §14.2 / Rule 5A); attach the Rule 17 disclaimer tier.
   - Output: the dossier object, and persists it to `research_finding_register` (service-role) with `finding_type='cohort_research'`, `related_cohort_codes={cohort_family}`, `evidence_payload=<summary jsonb>`, `recorded_by='Director'`, `recorded_at=now()`. (Or call `research-finding-ingest` if its contract supports this shape — confirm first.)
2. **Front-end:** wire the staged "Research cohort →" button in `AiLaneCEO/deal-rooms/index.html` (`CohortOrigination`) to POST `ceo-cohort-research`, render the returned summary in a modal/panel, and show the captured dossier id/date. The page can then read dossiers back via `research_finding_register` (authenticated `rfr_director_read` already permits the Director).

---

## §2 — Action 2: Create a bespoke deal room (Director-gated)

**Goal:** originate a counterparty/deal-room for the selected cohort, fed by the Action 1 dossier, with the offer resolved by the existing pricing arc — **orchestration only; do not modify CBI-001 / pricing / DRPS-001 / DDX-001 logic**.

1. **New EF `ceo-cohort-instantiate`** (`verify_jwt:true`, Director-only, explicit confirmation token, ledger entry; **never auto-fired**):
   - Input: `{ cohort_family, dossier_finding_id, confirm:true }`.
   - Calls the existing `instantiate_counterparty_from_cohort(...)` SQL function (CBI-001/AMD-147) to write `counterparty_profile` (`pricing_cohort_family`, `four_surfaced_packages`, `mca_data_scope`, `canonical_alin`, …). Do not duplicate its logic.
   - Calls the existing `pricing-quote` EF for the new profile's `pricing_cohort_family` to resolve the **best package at creation time**, and writes `pricing_package_id` + `envelope_floor/target/ceiling_pence` + `envelope_quote_id` back onto the profile (the "best offering" the moment the room is created).
   - Attaches the Action 1 dossier as room context (link `dossier_finding_id` on the new profile/room; provisioning/serving remains **DRPS-001**).
   - **DDX-001 §5 gate is untouched:** creating/prepping a room is permitted; live real-data **release stays gated** by DDX-001.
   - Writes a ledger/audit row for the create event.
2. **Front-end:** wire the staged "Create deal room →" button to a confirm dialog → POST `ceo-cohort-instantiate`; on success, refresh the Live Counterparties list.

---

## §3 — DD-5: Daily-Brief archive repoint (parent §3)

The canonical `ceo_daily_brief` (singular) is RLS-locked to `service_role`, so the browser cannot read it directly and the `/AiLaneCEO/briefs/` archive still reads the **stale** plural `ceo_daily_briefs`. The landing Daily-Brief tile/modal already shows the canonical brief via `ceo-reg-intel` (service-role). To complete DD-5, choose **one**:

- **(a)** Add a Director-scoped authenticated **SELECT RLS policy** to `ceo_daily_brief` (mirrors `compliance_certification_tracker`'s `cct_auth_read`, but email-gated to the Director), then repoint `AiLaneCEO/briefs/index.html` from `ceo_daily_briefs` → `ceo_daily_brief` and re-map its renderer to the singular schema (`headline, body_markdown, sections, sources, model, status`); or
- **(b)** Add a `ceo-reg-intel?section=brief_archive` (or new EF) that returns the recent singular briefs server-side, and repoint the archive to it.

Then mark `ceo_daily_briefs` deprecated and schedule deletion (parent DD-5).

---

## §4 — Legal page: surface `eileen_presales_compliance_log` (parent §5.2)

It is service-role-only and is currently shown on the Legal page as a note. To surface it: add a Director-only EF (or extend `ceo-legal-data`) that returns recent rows server-side, and wire the Legal page's compliance-oversight section to it.

---

## §5 — Run order & governance

1. Director ratifies this brief.
2. Build/deploy `ceo-cohort-research` (Path A) → wire Action 1 → verify a dossier row is captured.
3. Build/deploy `ceo-cohort-instantiate` (Path A) → wire Action 2 (confirm-gated) → verify a counterparty_profile + envelope is written and DDX-001 release remains gated.
4. Apply DD-5 (a) or (b); surface the pre-sales compliance log (§4).
5. Append an AMD entry; update AILANE-SPEC-EILEEN-005 to reflect the implemented IA (parent §6.4). Executor opens **no PR** (RULE 12); the Director merges.

*Internal implementation instruction; not legal advice. No back-end logic is to be fabricated — every EF contract above is to be defined/confirmed against the existing CBI-001 / pricing / DRPS-001 / DDX-001 specifications before build.*
