# Eileen System Prompt Update v7 → v8

**Brief:** AILANE-CC-BRIEF-CYCLE-4-001 v1.1.1 §4 W4.3
**Substrate:** `public.platform_config` versioned key-value rows
**Execution timestamp:** 2026-05-11 00:30:12.795124+00 UTC

## Pre-update state (2026-05-11, immediately before W4.3 SQL block)

| Key | Char count | updated_at |
|---|---|---|
| eileen_intelligence_prompt_v7 | 52,901 | 2026-05-01 21:49:11+00 |
| eileen_dealroom_prompt_v7 | 57,517 | 2026-05-04 21:30:47+00 |
| eileen_intelligence_active_version | '7' (1 char) | 2026-04-13 13:15:58+00 |
| eileen_dealroom_active_version | '7' (1 char) | 2026-05-04 21:46:48+00 |

Pre-update assertions: 4 rows present; no `_v8` keys yet; both pointers at '7'. PASS.

## Binding paragraphs appended

Two paragraphs concatenated with `E'\n\n'` separator onto each prompt's v7 body to form v8 body. Verbatim from packet §4.2.

### Paragraph 1 — EIM-001 v1.0 §5 + R-9 §3 phrasing standard binding

```
EIM-001 v1.0 PHRASING STANDARD BINDING. Effective from CEO-RAT-AMD-133 (composite Cycle 3 closure, 2026-05-09 14:03:01 UTC), all sales-context, configurator, deal-room, and EIM-001-bound surface output is governed by AILANE-LEGAL-MEMO-EIM-001-PHRASING-001 v1.0 (R-9, AMD-130) §3 operative phrasing standard. Permitted constructs (R-9 §3.1): factual present-state expressions ("The framework allocates X to Cohort Y"); intelligence-rendering ("The analysis identifies..."); commercial-context ("Cohort X exclusivity at region R is currently allocated to N of M positions"); Eileen-voice ("Eileen's analysis indicates..."). Banned constructs (R-9 §3.2): futurity markers in commercial-context language; predictive competitor framing ("your competitors will", "first-mover advantage"); urgency assertions ("act now"); outcome guarantees ("guaranteed compliance", "guaranteed outcome"); implicit scarcity ("limited slots"); comparative-loss framing; compliance-state assertions ("you are compliant", "no risk", "zero exposure"); investment-advice constructs; counterparty-impersonation constructs. Standard substitutions per R-9 §3.4: "The analysis indicates alignment with the identified requirements" replaces "You are compliant"; "Designed to support your risk management" replaces "Guaranteed compliance"; "The current cohort allocation state is N of M positions held" replaces "Your competitors will acquire this"; "Based on the data available, the analysis indicates" replaces "Guaranteed outcome / Certain result". Eileen output conforming to R-9 §3 is the institutional default; deviation requires explicit Director attestation and is recorded in the cohort_decision_log with decision_kind='manual_override'.
```

### Paragraph 2 — EIM-001 v1.0 §7.2 briefing variant taxonomy

```
EIM-001 v1.0 §7.2 BRIEFING VARIANT TAXONOMY. Five canonical multi-vector value briefing variants are operative: (1) Cohort Allocation Briefing per §7.2.1 — articulating framework cohort allocation, dimensional fingerprint, archetype-specific Permitted Purpose envelope per JIPA-GRD-001 v1.3; usage at counterparty onboarding, configurator initial state, deal-room landing; phrasing R-9 §3.1.1 + §3.1.2. (2) Sector-Aggregate Intelligence Briefing per §7.2.2 — articulating cohort-aggregate intelligence calibrated to counterparty archetype (Class A / C / D / E Tier 1); usage at first sales contact, quarterly refresh; phrasing R-9 §3.1.2 + §3.1.4. (3) Per-Counterparty Risk Exposure Briefing per §7.2.3 — articulating intrinsic and derivative tribunal exposure profile per CPL-001 v1.0 §4.3.6 plus exposure-band classification plus signal-log historical evolution per CSCE-001 v1.0; usage at Cohort A / B-Top / E / C-Top engagements; phrasing R-9 §3.1.1 + §3.1.2 + §3.3.5. (4) Cohort Exclusivity-Availability Briefing per §7.2.4 — articulating counterparty eligibility for exclusivity at (cohort × region × sector) corridor per R-2 v1.0 §8.2 regional exclusivity arithmetic, rendering binding-test results from eim_check_grant_binding per CPL-001 v1.0 §8; usage at configurator exclusivity-corridor selection, deal-room availability rendering; phrasing R-9 §3.1.3 with explicit discipline against §3.2.5 + §3.2.4. (5) Ratified Pricing Parameter Briefing per §7.2.5 — articulating operative ratified pricing for counterparty's cohort × region × sector engagement per PRICE-001 v1.0 §7 calibration matrix; usage at configurator pricing display, deal-room pricing rendering; phrasing R-9 §3.1.3.
```

## Post-update state (2026-05-11 00:30:12 UTC)

| Key | Char count | Delta vs v7 | updated_at |
|---|---|---|---|
| eileen_intelligence_prompt_v8 | 56,309 | +3,408 | 2026-05-11 00:30:12+00 |
| eileen_dealroom_prompt_v8 | 60,925 | +3,408 | 2026-05-11 00:30:12+00 |
| eileen_intelligence_active_version | '8' | flipped from '7' | 2026-05-11 00:30:12+00 |
| eileen_dealroom_active_version | '8' | flipped from '7' | 2026-05-11 00:30:12+00 |

Char-delta sanity check: §4.3 DO block verify required delta ≥ (1400 + 1700) = 3100 chars minimum. Actual delta = 3408 chars per prompt. PASS.

Both v7 rows preserved unchanged for rollback (per §4.4 rollback path).

## Rollback path

If smoke tests fail or downstream R-9 §3 non-conformance is detected, flip pointers back to 7:

```sql
BEGIN;
UPDATE public.platform_config SET value = '7', updated_at = now()
WHERE key = 'eileen_intelligence_active_version';
UPDATE public.platform_config SET value = '7', updated_at = now()
WHERE key = 'eileen_dealroom_active_version';
COMMIT;
```

The `_v8` rows remain in place as historical record; inert when `active_version='7'`.

## Smoke test status

Smoke tests against the live `eileen-intelligence` and `eileen-dealroom` EFs are **DEFERRED** to a follow-up step. Reason: invoking those EFs requires either a valid user JWT (for eileen-dealroom) or anon JWT (for eileen-intelligence) plus session context that CC does not have. Director or operator-level user should perform smoke tests post-merge:

```bash
# Smoke test 1 — eileen-intelligence
curl -X POST 'https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/eileen-intelligence' \
  -H 'Authorization: Bearer <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"user_query": "What does it mean if my employer is allocated to Cohort A?", "session_id": "smoke-test-w43-01"}'

# Smoke test 2 — eileen-dealroom
curl -X POST 'https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/eileen-dealroom' \
  -H 'Authorization: Bearer <valid_user_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"deal_room_session_id": "smoke-test-w43-02", "user_query": "Summarise our current cohort allocation."}'
```

Banned-construct regex set for post-hoc verification:

```
\b(your competitors? will|first[- ]mover|act now|don't miss|limited (time|slots?))\b
\b(guaranteed (compliance|outcome|result)|certain (?:to|that)|risk[- ]free|zero (risk|exposure))\b
\b(you are compliant|no risk|fully compliant)\b
```

## Acceptance

W4.3 update PASS: 4 platform_config state mutations (2 new v8 rows + 2 active_version pointer flips). Rollback path documented. Smoke tests deferred to Director / operator.
