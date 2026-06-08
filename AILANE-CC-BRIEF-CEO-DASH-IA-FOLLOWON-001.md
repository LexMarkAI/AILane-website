# AILANE-CC-BRIEF-CEO-DASH-IA-FOLLOWON-001 — Cohort-Origination Wiring (Action 1 Research + Action 2 Create)

`AILANE-CC-BRIEF-CEO-DASH-IA-FOLLOWON-001 · v1.2 · Reconciled to verified function bodies · governed by AILANE-AMD-REG-001`

| Field | Value |
|---|---|
| Identifier | AILANE-CC-BRIEF-CEO-DASH-IA-FOLLOWON-001 |
| Version | **v1.2** — corrected against the ACTUAL `pricing-quote` and `instantiate_counterparty_from_cohort` bodies (CC read the source 8 June; v1.1 had the pricing model inverted). This estate doc is the governance authority; the repo's v1.0 stub is superseded. |
| Parent | AILANE-CC-BRIEF-CEO-DASH-IA-001 v1.2 §2A; advances AILANE-SPEC-EILEEN-005 |
| Arc it ENHANCES (call only, never modify) | `instantiate_counterparty_from_cohort` (CBI-001, AMD-147); `pricing.compute_envelope_v2_wrapper` / `pricing-quote`; AILANE-SPEC-DRPS-001; AILANE-SPEC-DDX-001 §5 |
| Implementation state | Front-end wired + MERGED to main (CC, branch `claude/ceo-dash-cohort-research-001`). Both EF sources authored in `supabase/functions/`; **NOT deployed (Path A — Chairman).** |
| Legal identity | AI Lane Limited — Co. No. 17035654 · ICO Reg. No. 00013389720 |

**Revision note (v1.2 — corrections from CC's source read):**
1. `pricing-quote` does **not** resolve a "best offering / four packages." It **prices a fully-specified config** — inputs `cohort_family`, `package_id`, `scope_jsonb`, `vector` (A/B/C), `exclusivity_tier` (T1–T4), `term_months` → priced envelope. (v1.1 had these as outputs — wrong.)
2. `instantiate_counterparty_from_cohort` does it all internally: every param has a DEFAULT; it builds short_code/clid/workspace, **hardcodes `four_surfaced_packages` per cohort family** (A → `C-01,C-03,C-04,C-13`; BDR → …), prices via `compute_envelope_v2_wrapper`, sets the pilot fee, creates the room at **phase_0**, writes its **own** audit row (`counterparty_auto_population_log`), and is idempotent + tolerant (missing inputs defer the envelope; the counterparty is still created). Returns `jsonb`.
3. It is **Director-only** via `requester_is_director()` (checks `auth.jwt()` email) → EF2 must call the RPC **as the Director** (anon client + the caller's Bearer token), **not** service-role.
4. So **EF2 calls instantiate DIRECTLY** — no separate `pricing-quote` call, no separate audit, no phase setting. DD-W2 "present the four packages" does not map (the four are deterministic per family); the Director's real choice is the **optional pricing config** (vector/tier/term/package, mainly family A; BDR auto-prices from size band; blanks defer the envelope).

## Purpose
Make the two cohort-origination buttons functional by **orchestrating existing functions** — no new pricing, instantiation, or delivery logic. DDX-001 §5 live-delivery gate stays off throughout.

---

## §0 — Verified contracts (read from source 8 June 2026)
- **Cohort key:** `cohort_entity_register.id` (uuid) = `p_entity_id`.
- **Research aggregator (SQL fn):** `cohort_traceability(p_entity_id uuid)` → entity + aliases + decisions + events + findings + AMDs + CSCE.
- **Forward-event tables:** `company_event_register`, `forward_exposure_register`, `govuk_news_intelligence`, `parliamentary_intelligence`.
- **Synthesis model:** `claude-sonnet-4-6`, secret name **`ANTHROPIC_API_KEY`** (confirmed — same as `ceo-eileen-brief` v2).
- **Dossier store:** `research_finding_register` (service-role write; browser read `rfr_director_read`). Attach-to-room target: `dealroom_notes` `{ clid, user_id, note_text }` (DD-W3).
- **Pricing (call only):** `pricing-quote` **prices a fully-specified config** (`cohort_family,package_id,scope_jsonb,vector,exclusivity_tier,term_months`). Not a best-offer resolver.
- **Instantiation (call only):** `instantiate_counterparty_from_cohort(p_entity_id, [13 optional params incl. p_vector,p_exclusivity_tier,p_term_months,p_package_id,p_strategic_value_gbp], p_caller_jwt_sub, p_short_code_override, …)` — prices + surfaces packages + creates room at phase_0 + self-audits internally; returns jsonb; **Director-JWT only**.
- **Delivery gate (untouched):** `dealroom_feature_flags.phase_c_live_delivery_enabled` stays **false** (DDX-001 §5).

---

## §1 — EF1 `ceo-cohort-research` (Action 1) — DEPLOY NOW (DD-W1)
- Auth: CEO `auth.getUser` OR `x-cron-key`; `verify_jwt=false`; house style; CORS `https://ailane.ai`.
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` (already in project).
- Input `{ entity_id }` → `rpc cohort_traceability` + forward-event reads → `claude-sonnet-4-6` (intelligence-not-advice; cite sources; spec-doc Rule 5 / PLUGIN-001 §14.7 prohibited-assurance words; CCI neutrality) → write dossier to `research_finding_register` (`finding_type='cohort_research_dossier'`, `related_entity_ids=[entity_id]`, `related_cohort_codes=[cohort_family]`, `evidence_payload`) → return dossier. **Low risk.**

## §2 — EF2 `ceo-cohort-instantiate` (Action 2) — Director-gated; HOLD per DD-W5
- Auth: CEO only; **anon client + the caller's Director Bearer token** (so `requester_is_director()` passes); `verify_jwt=false` with explicit CEO check.
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
- Input `{ entity_id, confirm:true, vector?, exclusivity_tier?, term_months?, package_id? }`.
- Logic: require `confirm` → `rpc('instantiate_counterparty_from_cohort', { p_entity_id, p_vector?, p_exclusivity_tier?, p_term_months?, p_package_id?, p_caller_jwt_sub:<CEO sub> })` **as the Director** (the RPC prices, surfaces the four packages, creates the room at phase_0, and self-audits) → read the returned `clid` → attach the latest `cohort_research_dossier` as a `dealroom_notes` row → return `{ clid, counterparty_short_code }`.
- Hard rules: `confirm` mandatory; never auto-fire; **does NOT call `pricing-quote` separately, set phase, or write a separate audit** (the RPC does these); `phase_c_live_delivery_enabled` untouched.

## §3 — Front-end (DONE, merged) — both buttons degrade gracefully until the EFs deploy
Action 1 → EF1 → dossier modal. Action 2 → Director-confirm modal with an **optional pricing-config form** (vector/tier/term/package; not a package picker) → EF2. (CC built this; no further front-end work for the happy path.)

## §4 — Deploy & governance
- **EF1: deploy now** (Path A — Chairman). **EF2: hold** until Action 1 is confirmed writing dossiers (DD-W5), then deploy.
- Deploy the **exact source CC authored** (matched to the wired front-end) — the Director provides CC's `supabase/functions/ceo-cohort-research/index.ts` (and `…/ceo-cohort-instantiate/index.ts`) for verbatim Path-A deploy, to avoid an EF↔front-end contract mismatch.
- On completion: AMD entry; update EILEEN-005.

## §5 — Decisions (RESOLVED, corrected)
| Ref | Decision | Resolution |
|---|---|---|
| DD-W1 | Deploy EF1 now | **Yes** |
| DD-W2 | Action 2 offer model | **Optional pricing-config form** (vector/tier/term/package; the four packages are deterministic per cohort family — not a picker) |
| DD-W3 | Dossier attach target | `dealroom_notes` row |
| DD-W4 | New room state | phase_0 (set internally by the RPC) |
| DD-W5 | Deploy EF2 | **Hold** until EF1 confirmed live |

## §6 — Scope exclusions
Call-only on `pricing-quote` / `instantiate_counterparty_from_cohort` / DRPS-001 / DDX-001 / cohort computation / Eileen internals. `phase_c_live_delivery_enabled` untouched. No ringfenced identifier terms (AMD-162) or banned product terms. EFs Path A; front-end branch + compare URL, no PR by CC.

---

## Appendix — implementation cross-reference (as merged to main)
The source CC authored matches §1/§2 exactly and is the verbatim Path-A deploy target (§4):
- EF1: `supabase/functions/ceo-cohort-research/index.ts` (accepts `{ entity_id }` or `{ alin }`).
- EF2: `supabase/functions/ceo-cohort-instantiate/index.ts` (calls the RPC as the Director; `confirm:true` mandatory; dossier → `dealroom_notes`; no separate pricing-quote/audit/phase).
- Front-end: `AiLaneCEO/deal-rooms/index.html` — `EntityActions` (Action 1 → research modal; Action 2 → `CreateRoomModal` confirm step). Both calls degrade gracefully (clear message) until the EFs are deployed.

*Governed by AILANE-AMD-REG-001; advances EILEEN-005. v1.2 reconciles the spec to the verified function bodies (CC source read, 8 June 2026). Internal implementation instruction; not legal advice.*
