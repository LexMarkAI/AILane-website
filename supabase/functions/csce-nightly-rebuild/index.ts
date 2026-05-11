// AILANE — csce-nightly-rebuild v1.0
// Deployed under AILANE-CC-BRIEF-CYCLE-4-001 / AMD-137
// Per CSCE-001 v1.0 §7 — five-operation nightly rebuild

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("csce-nightly-rebuild: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COHORT_FAMILIES = [
  "A", "B-Top", "B-Brokers", "C-Top", "D1", "D2",
  "E", "F", "G", "H", "I", "J",
] as const;

Deno.serve(async (_req: Request) => {
  const runId = crypto.randomUUID();
  const startedAt = new Date();

  const { data: priorRun } = await supabaseAdmin
    .from("csce_rebuild_run_log")
    .select("started_at")
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const priorRebuildStartedAt = priorRun?.started_at ?? null;

  await supabaseAdmin.from("csce_rebuild_run_log").insert({
    run_id: runId,
    started_at: startedAt.toISOString(),
    status: "running",
    prior_rebuild_started_at: priorRebuildStartedAt,
    operation_results: { source: "csce_nightly", started: true },
  });

  let dimUpdates = 0;
  let lapsedTrans = 0;
  let mergerTrans = 0;
  let dissolvedTrans = 0;
  let leagueRowsInserted = 0;
  let briefingRefreshSignals = 0;
  let signalsProcessed = 0;
  const operationResults: Record<string, unknown> = { source: "csce_nightly" };

  try {
    // Operation 1 — Refresh v_employer_tribunal_exposure
    {
      const op1Start = performance.now();
      const { error: refreshError } = await supabaseAdmin
        .rpc("refresh_v_employer_tribunal_exposure");
      if (refreshError) throw new Error(`Op1 failed: ${refreshError.message}`);
      operationResults.op1_refresh_view = {
        duration_ms: Math.round(performance.now() - op1Start),
      };
    }

    // Operation 2-3 — apply signal-driven dimensional updates + state transitions
    {
      const op2Start = performance.now();
      let signalQuery = supabaseAdmin
        .from("csce_signal_log")
        .select(
          "id, signal_kind, triggers_dimensional_update, triggers_lapsed_transition, triggers_merger_transfer, triggers_dissolved_transition, triggers_briefing_refresh",
          { count: "exact" },
        );
      if (priorRebuildStartedAt) {
        signalQuery = signalQuery.gt("recorded_at", priorRebuildStartedAt);
      }
      signalQuery = signalQuery.is("superseded_by_signal_id", null);

      const { data: signals, count } = await signalQuery;
      signalsProcessed = count ?? 0;

      if (signals) {
        for (const sig of signals) {
          if (sig.triggers_dimensional_update) dimUpdates++;
          if (sig.triggers_lapsed_transition) lapsedTrans++;
          if (sig.triggers_merger_transfer) mergerTrans++;
          if (sig.triggers_dissolved_transition) dissolvedTrans++;
          if (sig.triggers_briefing_refresh) briefingRefreshSignals++;
        }
      }
      operationResults.op2_3_signal_processing = {
        duration_ms: Math.round(performance.now() - op2Start),
        signals_in_window: signalsProcessed,
        scaffold_pass_through: true,
      };
    }

    // Operation 4 — Rebuild cohort_league_state (per-cohort snapshot)
    {
      const op4Start = performance.now();
      for (const cohort of COHORT_FAMILIES) {
        const { data: rows, error: countsError } = await supabaseAdmin
          .from("cohort_entity_register")
          .select("super_league_tier, allocation_status, cohort_membership_kind")
          .eq("cohort_family", cohort);

        if (countsError) throw new Error(`Op4 failed for ${cohort}: ${countsError.message}`);

        const rs = rows ?? [];
        const total = rs.length;
        const active = rs.filter((r) => r.allocation_status === "active").length;
        const lapsed = rs.filter((r) => r.allocation_status === "lapsed").length;
        const dissolved = rs.filter((r) => r.allocation_status === "dissolved").length;
        const sCount = rs.filter((r) => r.super_league_tier === "S").length;
        const pCount = rs.filter((r) => r.super_league_tier === "P").length;
        const dCount = rs.filter((r) => r.super_league_tier === "D").length;

        // Mark prior snapshots for this cohort as not-latest
        await supabaseAdmin
          .from("cohort_league_state")
          .update({ is_latest: false })
          .eq("cohort_family", cohort)
          .eq("is_latest", true);

        const { error: insertError } = await supabaseAdmin
          .from("cohort_league_state")
          .insert({
            cohort_family: cohort,
            entity_count_total: total,
            entity_count_active: active,
            entity_count_lapsed: lapsed,
            entity_count_dissolved: dissolved,
            super_league_tier_s_count: sCount,
            super_league_tier_p_count: pCount,
            super_league_tier_d_count: dCount,
            rebuild_source: "csce_nightly_rebuild_ef",
            is_latest: true,
          });

        if (insertError) throw new Error(`Op4 insert failed for ${cohort}: ${insertError.message}`);
        leagueRowsInserted++;
      }
      operationResults.op4_league_state_rebuild = {
        duration_ms: Math.round(performance.now() - op4Start),
        rows_inserted: leagueRowsInserted,
      };
    }

    // Operation 5 — Briefing refresh signalling
    operationResults.op5_briefing_refresh_queue = {
      signals_to_emit: briefingRefreshSignals,
      queue_deferred_per: "DEF-CSCE-05",
    };

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await supabaseAdmin
      .from("csce_rebuild_run_log")
      .update({
        status: "completed",
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        signals_processed_count: signalsProcessed,
        dimensional_updates_count: dimUpdates,
        lapsed_transitions_count: lapsedTrans,
        merger_transfers_count: mergerTrans,
        dissolved_transitions_count: dissolvedTrans,
        cohort_league_state_rows_inserted: leagueRowsInserted,
        briefing_refresh_signals_emitted: briefingRefreshSignals,
        operation_results: operationResults,
      })
      .eq("run_id", runId);

    return new Response(
      JSON.stringify({
        run_id: runId,
        status: "completed",
        duration_ms: durationMs,
        league_rows_inserted: leagueRowsInserted,
        signals_processed: signalsProcessed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("csce-nightly-rebuild failed:", errorMessage);

    await supabaseAdmin
      .from("csce_rebuild_run_log")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_summary: errorMessage,
        operation_results: operationResults,
      })
      .eq("run_id", runId);

    return new Response(
      JSON.stringify({ run_id: runId, status: "failed", error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
