// kl-surveillance-runner/index.ts
// AILANE-SPEC-KLIA-001 Part III §7 — Automated Legislative Surveillance Framework (ALSF)
// Supporting: AILANE-SPEC-ISRF-001 v1.0 (via intelligence_publication_calendar)
// Governed by: AILANE-AMD-REG-001
//
// Orchestrator — does NOT poll external APIs. Consumes the output of existing
// horizon-* Edge Functions (horizon-bill-tracker, horizon-si-monitor,
// horizon-new-bill-scanner) and parliamentary_intelligence pipeline, applies
// Class 1/2/3 triage per brief §4.2, and inserts classified alerts into
// kl_legislative_alerts.
//
// Invoked by pg_cron daily at 07:15 UTC (after horizon-* functions complete
// at 05:00/06:00/07:00). verify_jwt: false — cron function, no user JWT.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ─── Classification rules (brief §4.2, §4.4, §4.5, §4.6) ───
// Class 1 = Critical (24h SLA); Class 2 = High (72h SLA); Class 3 = Standard (7d SLA).
// Title matchers are case-insensitive, run against legislation_title / parliamentary_intelligence.title.
interface TitleRule {
  pattern: RegExp;
  alertClass: 1 | 2 | 3;
  alertType: string;
  affectedInstrument: string | null;
  slaHours: number;
}

const TITLE_RULES: TitleRule[] = [
  // §4.4 — NMW annual uprating SI (Class 1, 24h)
  {
    pattern: /national\s+minimum\s+wage\s*\(amendment\)/i,
    alertClass: 1,
    alertType: "nmw_uprating_si",
    affectedInstrument: "nmwa1998",
    slaHours: 24,
  },
  // §4.6 — Employment Rights (Increase of Limits) Order (Class 1, 24h)
  {
    pattern: /increase\s+of\s+limits/i,
    alertClass: 1,
    alertType: "limits_order",
    affectedInstrument: "era1996",
    slaHours: 24,
  },
  // §4.5 — ERA 2025 commencement order (Class 1, 24h)
  {
    pattern: /employment\s+rights\s+act\s+2025.*commencement|commencement.*employment\s+rights\s+act\s+2025/i,
    alertClass: 1,
    alertType: "era2025_commencement",
    affectedInstrument: "era2025",
    slaHours: 24,
  },
];

// Secondary patterns — other SIs amending tracked instruments (Class 2, 72h).
// Matched only if no Class 1 rule hits.
const TRACKED_INSTRUMENT_PATTERNS: Array<{ pattern: RegExp; instrument: string }> = [
  { pattern: /working\s+time\s+regulations/i, instrument: "wtr1998" },
  { pattern: /transfer\s+of\s+undertakings/i, instrument: "tupe2006" },
  { pattern: /equality\s+act/i, instrument: "eqa2010" },
  { pattern: /health\s+and\s+safety\s+at\s+work/i, instrument: "hswa1974" },
  { pattern: /trade\s+union\s+and\s+labour\s+relations/i, instrument: "tulrca1992" },
  { pattern: /employment\s+rights/i, instrument: "era1996" },
];

const LOOKBACK_HOURS = 24;

serve(async (req: Request) => {
  // ─── Secret validation (SEC-001 §4) ───
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL) {
    console.error("FATAL: Missing SUPABASE_URL");
    return jsonResp(500, { error: "Server configuration error", missing: "SUPABASE_URL" });
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("FATAL: Missing SUPABASE_SERVICE_ROLE_KEY");
    return jsonResp(500, { error: "Server configuration error", missing: "SUPABASE_SERVICE_ROLE_KEY" });
  }

  const runStartedAt = new Date();
  const cutoffIso = new Date(runStartedAt.getTime() - LOOKBACK_HOURS * 3600_000).toISOString();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const summary = {
    run_started_at: runStartedAt.toISOString(),
    lookback_cutoff: cutoffIso,
    sources_scanned: {
      kl_legislative_horizon: 0,
      parliamentary_intelligence: 0,
      kl_horizon_tracking_log: 0,
    },
    alerts_inserted: 0,
    alerts_skipped_duplicate: 0,
    by_class: { class1: 0, class2: 0, class3: 0 },
    by_type: {} as Record<string, number>,
    errors: [] as string[],
  };

  try {
    // Parse optional body — allows manual override of lookback window for backfills.
    let lookbackOverrideHours: number | null = null;
    try {
      if (req.method === "POST") {
        const body = await req.json();
        if (body && typeof body.lookback_hours === "number" && body.lookback_hours > 0 && body.lookback_hours <= 720) {
          lookbackOverrideHours = body.lookback_hours;
        }
      }
    } catch {
      // No/invalid body is fine — cron invocation sends {}.
    }
    const effectiveCutoffIso = lookbackOverrideHours
      ? new Date(runStartedAt.getTime() - lookbackOverrideHours * 3600_000).toISOString()
      : cutoffIso;
    summary.lookback_cutoff = effectiveCutoffIso;

    // ─── STAGE 1 — scan kl_legislative_horizon (new/updated rows) ───
    const { data: horizonRows, error: horizonErr } = await supabase
      .from("kl_legislative_horizon")
      .select(
        "id, legislation_title, legislation_short_name, legislation_type, parliament_stage, source_url, affected_categories, headline_summary, priority, status, parliament_bill_id, legislation_gov_uk_id, auto_tracked, created_at, updated_at, last_status_check",
      )
      .or(`created_at.gte.${effectiveCutoffIso},updated_at.gte.${effectiveCutoffIso}`);

    if (horizonErr) {
      summary.errors.push(`kl_legislative_horizon query: ${horizonErr.message}`);
    } else {
      const rows = horizonRows ?? [];
      summary.sources_scanned.kl_legislative_horizon = rows.length;
      for (const row of rows) {
        try {
          const triage = triageLegislation({
            title: row.legislation_title ?? "",
            legislationType: row.legislation_type ?? "",
            priority: row.priority ?? null,
          });
          const alert = {
            source: "kl_legislative_horizon",
            source_url: row.source_url ?? `horizon://kl_legislative_horizon/${row.id}`,
            alert_class: triage.alertClass,
            alert_type: triage.alertType,
            affected_instrument_id: triage.affectedInstrument,
            affected_sections: [] as string[],
            title: row.legislation_title ?? row.legislation_short_name ?? "(untitled horizon item)",
            summary: row.headline_summary ?? null,
            raw_content: {
              horizon_id: row.id,
              legislation_short_name: row.legislation_short_name,
              legislation_type: row.legislation_type,
              parliament_stage: row.parliament_stage,
              parliament_bill_id: row.parliament_bill_id,
              legislation_gov_uk_id: row.legislation_gov_uk_id,
              affected_categories: row.affected_categories,
              priority: row.priority,
              status: row.status,
              auto_tracked: row.auto_tracked,
            },
            sla_deadline: new Date(runStartedAt.getTime() + triage.slaHours * 3600_000).toISOString(),
          };
          const inserted = await insertAlertIfNew(supabase, alert);
          if (inserted === "inserted") {
            summary.alerts_inserted++;
            summary.by_class[`class${triage.alertClass}` as "class1" | "class2" | "class3"]++;
            summary.by_type[triage.alertType] = (summary.by_type[triage.alertType] ?? 0) + 1;
          } else if (inserted === "duplicate") {
            summary.alerts_skipped_duplicate++;
          }
        } catch (e) {
          summary.errors.push(`horizon row ${row.id}: ${String(e)}`);
        }
      }
    }

    // ─── STAGE 2 — scan parliamentary_intelligence (urgent Bills/readings) ───
    const { data: parlRows, error: parlErr } = await supabase
      .from("parliamentary_intelligence")
      .select("id, source_type, parliament_id, bill_id, bill_stage, title, summary, url, parliament_url, published_date, acei_categories, acei_category_primary, legislative_urgency, ticker_tier, created_at")
      .gte("created_at", effectiveCutoffIso)
      .in("legislative_urgency", ["immediate", "urgent", "high"]);

    if (parlErr) {
      summary.errors.push(`parliamentary_intelligence query: ${parlErr.message}`);
    } else {
      const rows = parlRows ?? [];
      summary.sources_scanned.parliamentary_intelligence = rows.length;
      for (const row of rows) {
        try {
          const triage = triageLegislation({
            title: row.title ?? "",
            legislationType: row.source_type ?? "",
            priority: row.legislative_urgency ?? null,
          });
          const alert = {
            source: "parliamentary_intelligence",
            source_url: row.parliament_url ?? row.url ?? `horizon://parliamentary_intelligence/${row.id}`,
            alert_class: triage.alertClass,
            alert_type: triage.alertType,
            affected_instrument_id: triage.affectedInstrument,
            affected_sections: [] as string[],
            title: row.title ?? "(untitled parliamentary item)",
            summary: row.summary ?? null,
            raw_content: {
              parliamentary_intelligence_id: row.id,
              source_type: row.source_type,
              parliament_id: row.parliament_id,
              bill_id: row.bill_id,
              bill_stage: row.bill_stage,
              acei_categories: row.acei_categories,
              acei_category_primary: row.acei_category_primary,
              legislative_urgency: row.legislative_urgency,
              ticker_tier: row.ticker_tier,
              published_date: row.published_date,
            },
            sla_deadline: new Date(runStartedAt.getTime() + triage.slaHours * 3600_000).toISOString(),
          };
          const inserted = await insertAlertIfNew(supabase, alert);
          if (inserted === "inserted") {
            summary.alerts_inserted++;
            summary.by_class[`class${triage.alertClass}` as "class1" | "class2" | "class3"]++;
            summary.by_type[triage.alertType] = (summary.by_type[triage.alertType] ?? 0) + 1;
          } else if (inserted === "duplicate") {
            summary.alerts_skipped_duplicate++;
          }
        } catch (e) {
          summary.errors.push(`parliamentary_intelligence row ${row.id}: ${String(e)}`);
        }
      }
    }

    // ─── STAGE 3 — scan kl_horizon_tracking_log for positive detections ───
    // Tracker rows flagged as "no change" are ignored; we surface only real finds.
    const { data: logRows, error: logErr } = await supabase
      .from("kl_horizon_tracking_log")
      .select("id, tracker_type, horizon_id, previous_value, new_value, detail, api_source, api_endpoint, created_at")
      .gte("created_at", effectiveCutoffIso);

    if (logErr) {
      summary.errors.push(`kl_horizon_tracking_log query: ${logErr.message}`);
    } else {
      const rows = logRows ?? [];
      summary.sources_scanned.kl_horizon_tracking_log = rows.length;
      for (const row of rows) {
        try {
          if (!isPositiveDetection(row.tracker_type, row.detail)) continue;

          // Resolve title/URL by joining kl_legislative_horizon when horizon_id present.
          let title = `${row.tracker_type ?? "unknown"} positive detection`;
          let sourceUrl: string | null = row.api_endpoint ?? null;
          let affectedInstrument: string | null = null;

          if (row.horizon_id) {
            const { data: linkedRow } = await supabase
              .from("kl_legislative_horizon")
              .select("legislation_title, source_url, legislation_type")
              .eq("id", row.horizon_id)
              .maybeSingle();
            if (linkedRow) {
              title = linkedRow.legislation_title ?? title;
              sourceUrl = linkedRow.source_url ?? sourceUrl;
            }
          }

          const triage = triageLegislation({
            title,
            legislationType: row.tracker_type ?? "",
            priority: null,
          });
          if (row.tracker_type === "bill_stage_check" && row.new_value) {
            // Bill stage advanced — Class 2 unless title-pattern escalated it to Class 1.
            if (triage.alertClass === 3) {
              triage.alertClass = 2;
              triage.alertType = "bill_stage_change";
              triage.slaHours = 72;
            }
          }

          const alert = {
            source: "kl_horizon_tracking_log",
            source_url: sourceUrl ?? `horizon://kl_horizon_tracking_log/${row.id}`,
            alert_class: triage.alertClass,
            alert_type: triage.alertType,
            affected_instrument_id: affectedInstrument ?? triage.affectedInstrument,
            affected_sections: [] as string[],
            title,
            summary: summariseDetail(row.tracker_type, row.detail, row.previous_value, row.new_value),
            raw_content: {
              tracking_log_id: row.id,
              tracker_type: row.tracker_type,
              horizon_id: row.horizon_id,
              previous_value: row.previous_value,
              new_value: row.new_value,
              detail: row.detail,
              api_source: row.api_source,
              api_endpoint: row.api_endpoint,
            },
            sla_deadline: new Date(runStartedAt.getTime() + triage.slaHours * 3600_000).toISOString(),
          };
          const inserted = await insertAlertIfNew(supabase, alert);
          if (inserted === "inserted") {
            summary.alerts_inserted++;
            summary.by_class[`class${triage.alertClass}` as "class1" | "class2" | "class3"]++;
            summary.by_type[triage.alertType] = (summary.by_type[triage.alertType] ?? 0) + 1;
          } else if (inserted === "duplicate") {
            summary.alerts_skipped_duplicate++;
          }
        } catch (e) {
          summary.errors.push(`tracking_log row ${row.id}: ${String(e)}`);
        }
      }
    }

    // ─── STAGE 4 — stamp last_checked_at on intelligence_publication_calendar sources
    // that feed the horizon-* functions. Per ISRF-001, keeps publication cadence fresh.
    const polledSources = [
      "legislation-govuk",
      "parliament-bills",
      "govuk-policy-papers",
    ];
    const { error: calErr } = await supabase
      .from("intelligence_publication_calendar")
      .update({ last_checked_at: runStartedAt.toISOString() })
      .in("source_code", polledSources);
    if (calErr) {
      summary.errors.push(`calendar stamp: ${calErr.message}`);
    }

    console.log(
      `kl-surveillance-runner complete: ${summary.alerts_inserted} alerts inserted ` +
        `(C1=${summary.by_class.class1}, C2=${summary.by_class.class2}, C3=${summary.by_class.class3}), ` +
        `${summary.alerts_skipped_duplicate} duplicates, ${summary.errors.length} errors`,
    );

    return jsonResp(200, {
      status: summary.errors.length === 0 ? "success" : "partial",
      ...summary,
    });
  } catch (err) {
    console.error("Unhandled error in kl-surveillance-runner:", err);
    return jsonResp(500, { status: "error", stage: "unhandled", error: String(err) });
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function jsonResp(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface TriageResult {
  alertClass: 1 | 2 | 3;
  alertType: string;
  affectedInstrument: string | null;
  slaHours: number;
}

function triageLegislation(input: { title: string; legislationType: string; priority: string | null }): TriageResult {
  const title = input.title ?? "";

  // Class 1 — title-pattern rules (brief §4.4–§4.6)
  for (const rule of TITLE_RULES) {
    if (rule.pattern.test(title)) {
      return {
        alertClass: rule.alertClass,
        alertType: rule.alertType,
        affectedInstrument: rule.affectedInstrument,
        slaHours: rule.slaHours,
      };
    }
  }

  // Class 2 — other SIs amending tracked instruments
  for (const tp of TRACKED_INSTRUMENT_PATTERNS) {
    if (tp.pattern.test(title)) {
      return {
        alertClass: 2,
        alertType: "new_si_tracked_instrument",
        affectedInstrument: tp.instrument,
        slaHours: 72,
      };
    }
  }

  // Class 2 — new Bill
  if (/\bbill\b/i.test(title) || /bill_reading/i.test(input.legislationType ?? "")) {
    return {
      alertClass: 2,
      alertType: "new_bill",
      affectedInstrument: null,
      slaHours: 72,
    };
  }

  // Class 2 — higher-court decision (UKSC / EWCA)
  if (/\b(uksc|ewca)\b/i.test(title)) {
    return {
      alertClass: 2,
      alertType: "senior_court_decision",
      affectedInstrument: null,
      slaHours: 72,
    };
  }

  // Class 3 — guidance / default
  return {
    alertClass: 3,
    alertType: "guidance_update",
    affectedInstrument: null,
    slaHours: 168,
  };
}

function isPositiveDetection(trackerType: string | null, detail: unknown): boolean {
  if (!detail || typeof detail !== "object") return false;
  const d = detail as Record<string, unknown>;
  switch (trackerType) {
    case "si_scan":
      // Treat as positive when the scan found relevant entries (no_new_si false/absent
      // and relevant_entries > 0).
      if (d.no_new_si === true) return false;
      if (typeof d.relevant_entries === "number" && d.relevant_entries > 0) return true;
      return d.no_new_si === false;
    case "bill_stage_check":
      if (d.no_change === true) return false;
      return d.no_change === false || d.stage_changed === true;
    case "new_bill_scan":
      return (typeof d.bills_above_threshold === "number" && d.bills_above_threshold > 0) ||
             (typeof d.drafts_created === "number" && d.drafts_created > 0);
    default:
      // Unknown tracker type — be conservative; skip.
      return false;
  }
}

function summariseDetail(trackerType: string | null, detail: unknown, previous: string | null, next: string | null): string | null {
  if (!detail || typeof detail !== "object") return null;
  const d = detail as Record<string, unknown>;
  switch (trackerType) {
    case "si_scan":
      return `SI scan found ${d.relevant_entries ?? "?"} relevant entries for ${d.watch_act ?? "(unknown act)"}.`;
    case "bill_stage_check":
      return `Bill stage change for "${d.api_bill_title ?? "(unknown)"}": ${previous ?? "?"} → ${next ?? d.current_stage ?? "?"}.`;
    case "new_bill_scan":
      return `New-bill scan: ${d.bills_above_threshold ?? 0} bills above threshold (of ${d.total_bills_scanned ?? 0} scanned).`;
    default:
      return null;
  }
}

async function insertAlertIfNew(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  alert: {
    source: string;
    source_url: string;
    alert_class: number;
    alert_type: string;
    affected_instrument_id: string | null;
    affected_sections: string[];
    title: string;
    summary: string | null;
    raw_content: Record<string, unknown>;
    sla_deadline: string;
  },
): Promise<"inserted" | "duplicate" | "error"> {
  // Dedup on source_url — if any existing alert shares it, skip.
  const { data: existing, error: selErr } = await supabase
    .from("kl_legislative_alerts")
    .select("alert_id")
    .eq("source_url", alert.source_url)
    .limit(1);

  if (selErr) {
    console.error(`Dedup check failed for ${alert.source_url}: ${selErr.message}`);
    return "error";
  }
  if (existing && existing.length > 0) return "duplicate";

  const { error: insErr } = await supabase.from("kl_legislative_alerts").insert(alert);
  if (insErr) {
    console.error(`Insert failed for ${alert.source_url}: ${insErr.message}`);
    return "error";
  }
  return "inserted";
}
