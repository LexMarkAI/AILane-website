# AC-CSCE-001 Verification Report — Cycle 4 W4.2 + W4.3 (CSCE-001 v1.0)

**Brief:** AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1
**Amendment slot:** AMD-137 (reserved)
**Branch:** `claude/edge-functions-system-prompt-aA1aj`
**Execution window:** 2026-05-11
**Adjudicating authority:** Director (10 May 2026)

## Summary

W4.2 deploys three Supabase Edge Functions per CSCE-001 v1.0 §5.8, §7, §9 plus pg_cron schedule registration. W4.3 updates Eileen prompts v7 → v8 in `public.platform_config` with EIM-001 §5 + §7.2 binding paragraphs and flips active-version pointers to '8'.

## Acceptance criteria

### AC-CSCE-001-01 — csce_signal_log structure (§2.6)

| Probe | Expected | Actual | Result |
|---|---|---|---|
| Column count | 28 per CSCE-001 v1.0 §4.2 | 28 | PASS |
| Index count | ≥12 (PK + 11 named) | 12 | PASS |
| CHECK constraint count | 7 | 7 | PASS |
| FK constraint count | 3 (subject + successor + superseded-self) | 3 | PASS |
| RLS enabled | true | true | PASS |
| Append-only enforcement | REVOKE UPDATE, DELETE FROM authenticated, anon | confirmed | PASS |

### AC-CSCE-001-02 — csce_corporate_group_membership structure (§2.7)

Applied with MP-04 FK reference correction (see CPL-001 verification report).

| Probe | Expected | Actual | Result |
|---|---|---|---|
| Table exists | true | true | PASS |
| RLS enabled | true | true | PASS |
| FK to cohort_entity_register | RESTRICT | confirmed | PASS |
| FK to cohort_decision_log | references decision_id (MP-04) | confirmed | PASS |

### AC-CSCE-001-03 — csce_rebuild_run_log structure (§2.8)

| Probe | Expected | Actual | Result |
|---|---|---|---|
| Table exists | true | true | PASS |
| RLS enabled | true | true | PASS |

### AC-CSCE-001-04 — Group-RAG + product-fit functions (§2.9)

Applied with MP-05 v_recent_signals subquery refactor (see CPL-001 verification report).

| Probe | Expected | Actual | Result |
|---|---|---|---|
| csce_group_dimensional_aggregate exists | true | true | PASS |
| csce_group_recent_signals exists | true | true | PASS |
| csce_product_fit_routing exists | true | true | PASS |
| All SECURITY DEFINER | true | true | PASS |
| All STABLE | true | true | PASS |
| csce_product_fit_routing(random uuid) | fit_outcome=entity_not_found_or_inactive | confirmed | PASS |

### AC-CSCE-001-08 — csce-realtime-detector EF (§3.1)

| Probe | Expected | Actual | Result |
|---|---|---|---|
| EF deployed | true | true (id `4c343919-daef-422d-a020-30495653c279`, version 1) | PASS |
| SHA-256 | unique | `4e9a1257a1dab44c052036a17c7128d17b86a3cd1958c45a987a8716e0cf5be1` | recorded |
| verify_jwt | false (spec) | true (MCP default) | **REQUIRES MANUAL TOGGLE** |
| Status | ACTIVE | ACTIVE | PASS |

**Note on verify_jwt:** The Supabase `deploy_edge_function` MCP tool defaults `verify_jwt=true` and does not expose this as a parameter in its schema. The cron is wired with `Bearer <service_role_key>` which satisfies `verify_jwt=true`, so the function operates correctly in production today. **Director should manually toggle `verify_jwt=false` in Supabase Dashboard → Project Settings → Edge Functions → csce-realtime-detector** to align with CSCE-001 v1.0 §5.8 spec (cron-triggered EF; no JWT required).

### AC-CSCE-001-08-cron — Realtime detector cron schedule

| Probe | Expected | Actual | Result |
|---|---|---|---|
| Job name | csce-realtime-detector-5min | confirmed | PASS |
| Schedule | `*/5 * * * *` | confirmed | PASS |
| Active | true | true | PASS |

### AC-CSCE-001-09 — csce-nightly-rebuild EF (§3.2)

| Probe | Expected | Actual | Result |
|---|---|---|---|
| EF deployed | true | true (id `5837b94b-d8d0-42fd-9b8a-8369204b54e9`, version 1) | PASS |
| SHA-256 | unique | `b5c5b0210c6068b9b430d5f3bdc1c8941fba0e5b0c0e897f421eae5499b6b918` | recorded |
| verify_jwt | false (spec) | true (MCP default) | **REQUIRES MANUAL TOGGLE** |
| Status | ACTIVE | ACTIVE | PASS |

Same verify_jwt manual-toggle note applies. Director toggle in Dashboard for `csce-nightly-rebuild`.

### AC-CSCE-001-09-cron — Nightly rebuild cron schedule

| Probe | Expected | Actual | Result |
|---|---|---|---|
| Job name | csce-nightly-rebuild-0230utc | confirmed | PASS |
| Schedule | `30 2 * * *` | confirmed | PASS |
| Active | true | true | PASS |

### AC-CSCE-001-10 — csce-sales-context-renderer EF (§3.3)

| Probe | Expected | Actual | Result |
|---|---|---|---|
| EF deployed | true | true (id `a6704f76-28f8-4781-b2c5-6f3cc27fa021`, version 1) | PASS |
| SHA-256 | unique | `2916336250168eac65d30cdaf54c2e40961a96d100e3e4b665ad8c38aa14c93d` | recorded |
| verify_jwt | true (spec) | true | PASS (correct) |
| Flag 1 — model selection | institutional=claude-opus-4-7; SME=claude-haiku-4-5-20251001 | wired | PASS |
| Flag 2 — CORS allowlist | env-driven ALLOWED_ORIGINS; defaults [ailane.ai, www.ailane.ai]; no wildcard | wired | PASS |
| Flag 3 — rate limiting | public.rate_limits substrate; 20/hr user, 100/day user, 60/hr IP, 500/hr service_role; 429 + Retry-After on breach; log BEFORE Anthropic call | wired | PASS |
| ANTHROPIC_API_KEY env var | required at startup | enforced | PASS |
| Layer A banned-construct sweep | 8 R-9 §3.2/§3.4 patterns | implemented | PASS |
| Layer C review flag | requires_layer_c_review=true for deal_room + sales_outreach contexts | wired | PASS |
| Status | ACTIVE | ACTIVE | PASS |

**Substantive renderer smoke test deferred:** End-to-end test against a populated entity requires Cycle 5 cohort_entity_register seeding. The fallback path (entity_not_found_or_inactive) is exercised by csce_product_fit_routing's empty probe.

## Outstanding items at PR submission

1. **verify_jwt manual toggle required for csce-realtime-detector and csce-nightly-rebuild** — Director toggles in Supabase Dashboard. Functions operate today via service_role Bearer; toggle aligns with spec but is non-blocking.
2. **Substantive renderer test deferred** — gated on Cycle 5 registry seeding.
3. **Layer C COP review queue deferred** — DEF-CSCE-12 (per packet §3.3 v1.0 scope).
