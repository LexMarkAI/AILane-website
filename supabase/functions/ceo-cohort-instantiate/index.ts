// ceo-cohort-instantiate — Action 2 of AILANE-CC-BRIEF-CEO-DASH-IA-FOLLOWON-001 §2
// Director-gated. Deploy is HELD per DD-W5 until Action 1 is confirmed working (Path A — NOT CC).
//
// Orchestrates the verified, Director-only RPC public.instantiate_counterparty_from_cohort(...)
// (AMD-147), which INTERNALLY: builds counterparty_profile + the partner_clids room at phase_0,
// hardcodes four_surfaced_packages per cohort family, prices the envelope via
// compute_envelope_v2_wrapper, sets the pilot fee, and writes its own audit row
// (counterparty_auto_population_log). It is idempotent and tolerant (missing pricing inputs
// simply defer the envelope; the counterparty is still created).
//
// EF2 adds ONLY: a CEO fast-fail check, confirm-gating, and the dossier attach (dealroom_notes).
// It DUPLICATES NO pricing/instantiation logic, sets NO phase, and NEVER touches
// phase_c_live_delivery_enabled (DDX-001 §5 — the room is created at phase_0; live delivery stays gated).
//
// requester_is_director() inside the RPC checks auth.jwt() email, so the RPC is invoked with the
// DIRECTOR'S JWT (anon client + the caller's Authorization header), not the service-role key.
// verify_jwt=false (CEO checked in-body). Secrets (Edge Function env):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CEO_EMAIL = "mark@ailane.ai";
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ailane.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Secret validation (SEC-001 §4) ──
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  for (const [name, val] of [["SUPABASE_URL", SUPABASE_URL], ["SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY], ["SUPABASE_ANON_KEY", ANON_KEY]] as const) {
    if (!val) { console.error("FATAL: missing " + name); return json({ error: "Server configuration error", missing: name }, 500); }
  }

  // ── CEO identity fast-fail (the RPC re-checks requester_is_director() authoritatively) ──
  const authz = req.headers.get("Authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return json({ error: "Forbidden — Director only (no token)" }, 403);
  const svc = createClient(SUPABASE_URL!, SERVICE_KEY!);
  const { data: { user } } = await svc.auth.getUser(token);
  if (!user || user.email !== CEO_EMAIL) return json({ error: "Forbidden — Director only" }, 403);
  const directorSub = user.id;

  // ── Input ── never auto-fired: confirm:true is mandatory
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* {} */ }
  if (body.confirm !== true) return json({ error: "confirm:true required — Action 2 is never auto-fired" }, 400);
  const entityId = body.entity_id || null;
  const alin = body.alin || null;
  if (!entityId && !alin) return json({ error: "entity_id or alin required" }, 400);

  // Resolve the entity uuid (the RPC keys on cohort_entity_register.id)
  let q = svc.from("cohort_entity_register").select("id, alin, company_name, cohort_family");
  q = entityId ? q.eq("id", entityId) : q.eq("alin", alin);
  const { data: entity, error: entErr } = await q.maybeSingle();
  if (entErr) return json({ error: "Entity lookup failed", detail: entErr.message }, 500);
  if (!entity) return json({ error: "Cohort entity not found" }, 404);

  // ── Invoke the Director-only RPC AS THE DIRECTOR (requester_is_director() reads auth.jwt()) ──
  const asDirector = createClient(SUPABASE_URL!, ANON_KEY!, { global: { headers: { Authorization: "Bearer " + token } } });
  const { data: result, error: rpcErr } = await asDirector.rpc("instantiate_counterparty_from_cohort", {
    p_entity_id: entity.id,
    p_vector: body.vector ?? null,
    p_exclusivity_tier: body.exclusivity_tier ?? null,
    p_term_months: body.term_months ?? 12,
    p_package_id: body.package_id ?? null,
    p_strategic_value_gbp: body.strategic_value_gbp ?? null,
    p_caller_jwt_sub: directorSub,
  });
  if (rpcErr) return json({ error: "instantiate_counterparty_from_cohort failed", detail: rpcErr.message }, 400);

  const r = (result || {}) as Record<string, any>;
  const clid = r.clid || null;
  const shortCode = r.counterparty_short_code || null;

  // ── Attach the Action 1 dossier as room context (DD-W3: dealroom_notes; service-role) ──
  let dossierAttached = false, dossierWarning: string | null = null;
  if (clid && body.dossier_finding_id) {
    let noteText = `Cohort research dossier ${body.dossier_finding_id} attached at origination.`;
    try {
      const { data: dossier } = await svc.from("research_finding_register")
        .select("finding_text").eq("finding_id", body.dossier_finding_id).maybeSingle();
      if (dossier && dossier.finding_text) noteText += " " + dossier.finding_text;
    } catch { /* best-effort enrichment */ }
    const { error: noteErr } = await svc.from("dealroom_notes").insert({ clid, user_id: directorSub, note_text: noteText });
    if (noteErr) dossierWarning = "dossier_note_failed: " + noteErr.message;
    else dossierAttached = true;
  }

  return json({
    ...r,
    clid,
    counterparty_short_code: shortCode,
    dossier_attached: dossierAttached,
    delivery_note: "Room created at phase_0. Live data delivery stays gated (DDX-001 §5); phase_c_live_delivery_enabled untouched.",
    warnings: [dossierWarning].filter(Boolean),
  });
});
