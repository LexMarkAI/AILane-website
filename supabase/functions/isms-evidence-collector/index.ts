// isms-evidence-collector — daily ISMS control-evidence collector
// AILANE-CC-BRIEF-ISMS-EVIDENCE-001 v1.0 §5 (Phase B) | AILANE-SPEC-ISMS-001 §9.6
// Governed by: AILANE-AMD-REG-001 | clause 9.1 monitoring; A.8.15/A.8.16; A.5.22
//
// The in-house substitute for a paid compliance platform's "continuous
// monitoring": writes a daily heartbeat to isms_evidence_log and flags any
// subprocessor certification approaching expiry (<= 60 days) from
// vendor_assurance_register.
//
// Scheduled by pg_cron daily (see ./schedule.sql). verify_jwt = false — this is
// a pipeline/cron function with no user JWT (SEC-001 / brief RULE 4), mirroring
// the sibling cron function kl-surveillance-runner (no rate-limit / CORS).
//
// Deployment: Path A (Chairman MCP deploy_edge_function) or repo CI — NOT CC
// (brief RULE 13). Secrets read from the Edge Function environment:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async () => {
  // ─── Secret validation (SEC-001 §4 / CLAUDE.md) — log NAME, never value ───
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL) {
    console.error("FATAL: Missing SUPABASE_URL");
    return jsonResponse({ error: "Server configuration error", missing: "SUPABASE_URL" }, 500);
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("FATAL: Missing SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse({ error: "Server configuration error", missing: "SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();

  // 1. Daily heartbeat (A.8.16 monitoring activities)
  const rows: Array<Record<string, unknown>> = [{
    evidence_ref: `heartbeat-${now.toISOString().slice(0, 10)}`,
    control_ref: "A.8.16",
    evidence_type: "heartbeat",
    source: "isms-evidence-collector",
    automated: true,
    result: { status: "ok", ts: now.toISOString() },
  }];

  // 2. Certification-expiry watch (A.5.22 supplier monitoring).
  // certifications is jsonb -> the JS client returns it parsed; guard the shape.
  const { data: vendors, error: vendorErr } = await sb
    .from("vendor_assurance_register")
    .select("vendor_name, certifications");

  if (vendorErr) {
    console.error(`vendor_assurance_register query failed: ${vendorErr.message}`);
  } else {
    for (const v of vendors ?? []) {
      const certs = Array.isArray(v.certifications) ? v.certifications : [];
      for (const c of certs) {
        if (!c?.expires) continue;
        const days = Math.round((new Date(c.expires).getTime() - now.getTime()) / 864e5);
        if (days <= 60) {
          rows.push({
            evidence_ref: `cert-expiry-${v.vendor_name}`,
            control_ref: "A.5.22",
            evidence_type: "cert_expiry",
            source: "isms-evidence-collector",
            automated: true,
            result: { vendor: v.vendor_name, standard: c.standard, expires: c.expires, days_remaining: days },
          });
        }
      }
    }
  }

  const { error: insertErr } = await sb.from("isms_evidence_log").insert(rows);
  if (insertErr) {
    console.error(`isms_evidence_log insert failed: ${insertErr.message}`);
    return jsonResponse({ status: "error", inserted: 0, error: insertErr.message }, 500);
  }

  console.log(`isms-evidence-collector complete: inserted ${rows.length} evidence row(s).`);
  return jsonResponse({ status: "success", inserted: rows.length });
});
