// ceo-cohort-research — Action 1 of AILANE-CC-BRIEF-CEO-DASH-IA-FOLLOWON-001 §1
// Produces a dated cohort-entity research dossier (counterparty potential & fit, synergies,
// business prospects, forward-event / M&A watch, best-fit signal) for a selected
// cohort_entity_register entity, and persists it to research_finding_register.
//
// Orchestration only: reuses cohort_traceability(p_entity_id) + the live intelligence tables;
// NO new pricing/instantiation logic. Intelligence, not advice (PLUGIN-001 Art XIV §14.2 /
// Rule 5A / Rule 17 disclaimer; CCI clinical neutrality).
//
// Deployment: Path A (Chairman MCP deploy_edge_function) or repo CI — NOT CC. verify_jwt=false
// (the function validates the CEO JWT in-body, or an x-cron-key). Secrets (Edge Function env):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, optional CRON_KEY.
// NOTE for the deployer: confirm the ANTHROPIC_API_KEY secret name and the optional
// company-name columns on company_event_register / forward_exposure_register against the live
// schema; the forward-event reads degrade gracefully (empty) if a column is absent.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CEO_EMAIL = "mark@ailane.ai";
const MODEL = "claude-sonnet-4-6";
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ailane.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Secret validation (SEC-001 §4) — log NAME, never value ──
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  for (const [name, val] of [["SUPABASE_URL", SUPABASE_URL], ["SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY], ["ANTHROPIC_API_KEY", ANTHROPIC_API_KEY]] as const) {
    if (!val) { console.error("FATAL: missing " + name); return json({ error: "Server configuration error", missing: name }, 500); }
  }
  const sb = createClient(SUPABASE_URL!, SERVICE_KEY!);

  // ── Auth: CEO JWT (email check) OR x-cron-key ──
  let authorised = false, callerSub: string | null = null;
  const cronKey = Deno.env.get("CRON_KEY");
  const presentedCron = req.headers.get("x-cron-key");
  if (cronKey && presentedCron && presentedCron === cronKey) {
    authorised = true;
  } else {
    const authz = req.headers.get("Authorization") || "";
    const tok = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (tok) {
      const { data: { user } } = await sb.auth.getUser(tok);
      if (user && user.email === CEO_EMAIL) { authorised = true; callerSub = user.id; }
    }
  }
  if (!authorised) return json({ error: "Forbidden — Director only" }, 403);

  // ── Input: { entity_id?: uuid, alin?: string } ──
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* {} */ }
  const entityId = (body.entity_id as string) || null;
  const alin = (body.alin as string) || null;
  if (!entityId && !alin) return json({ error: "entity_id or alin required" }, 400);

  // ── Resolve the cohort entity ──
  let sel = sb.from("cohort_entity_register").select("id, alin, company_name, cohort_family, sic_codes, evidence_tier");
  sel = entityId ? sel.eq("id", entityId) : sel.eq("alin", alin);
  const { data: entity, error: entErr } = await sel.maybeSingle();
  if (entErr) return json({ error: "Entity lookup failed", detail: entErr.message }, 500);
  if (!entity) return json({ error: "Cohort entity not found" }, 404);

  // ── Traceability bundle (existing aggregator; do not duplicate) ──
  const { data: trace, error: trErr } = await sb.rpc("cohort_traceability", { p_entity_id: entity.id });
  if (trErr) console.error("cohort_traceability: " + trErr.message);

  // ── Forward-event / M&A watch (best-effort; graceful if a column is absent) ──
  const name = entity.company_name || "";
  async function safe(table: string, columns: string, nameCol: string | null) {
    try {
      let q = sb.from(table).select(columns).order("created_at", { ascending: false }).limit(8);
      if (nameCol && name) q = q.ilike(nameCol, `%${name}%`);
      const { data } = await q;
      return data || [];
    } catch { return []; }
  }
  const [events, exposure, news, parliament] = await Promise.all([
    safe("company_event_register", "*", "company_name"),
    safe("forward_exposure_register", "*", "company_name"),
    safe("govuk_news_intelligence", "title, summary, url, published_date, created_at", null),
    safe("parliamentary_intelligence", "title, summary, url, published_date, created_at", null),
  ]);

  // ── Synthesis (claude-sonnet-4-6; intelligence-not-advice discipline) ──
  const system = [
    "You are Ailane's institutional intelligence analyst preparing a cohort-entity research dossier for the Director.",
    "DISCIPLINE (binding): identify, quantify and contextualise. Do NOT advise, recommend, instruct, or render legal opinion (PLUGIN-001 Art XIV §14.2 / Rule 5A).",
    "Never use assurance words (guarantee, ensure, fully compliant, etc.). Never label a tribunal outcome correct or incorrect. Maintain CCI clinical neutrality.",
    "Output STRICT JSON ONLY: {\"headline\":string,\"sections\":{\"potential_fit\":string,\"synergies\":string,\"prospects\":string,\"forward_watch\":string,\"best_fit_signal\":string},\"sources\":[{\"title\":string,\"url\":string}]}.",
    "best_fit_signal is a data-grounded package-family indicator (an observation), NOT a recommendation.",
  ].join("\n");
  const payload = { entity, traceability: trace ?? null, forward_events: events, forward_exposure: exposure, govuk_news: news, parliamentary: parliament };
  let dossier: any = null, anthErr: string | null = null;
  try {
    const ar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, system, messages: [{ role: "user", content: "Compose the dossier as STRICT JSON for:\n" + JSON.stringify(payload).slice(0, 60000) }] }),
    });
    if (ar.ok) {
      const aj = await ar.json();
      const text = (aj.content && aj.content[0] && aj.content[0].text) || "";
      const m = text.match(/\{[\s\S]*\}/);
      dossier = m ? JSON.parse(m[0]) : { headline: text.slice(0, 200), sections: {}, sources: [] };
    } else { anthErr = "anthropic " + ar.status; }
  } catch (e) { anthErr = String(e); }
  if (!dossier) dossier = { headline: "Research synthesis unavailable" + (anthErr ? " (" + anthErr + ")" : ""), sections: {}, sources: [] };

  // ── Persist dossier (service-role; research_finding_register) ──
  const findingId = `cohort-research-${entity.alin || entity.id}-${Date.now()}`;
  const { error: insErr } = await sb.from("research_finding_register").insert({
    finding_id: findingId,
    // research_finding_register has NOT-NULL columns without defaults — these four are required
    // (mirrors the deployed v2 fix; their absence was failing the insert silently).
    deliverable_ref: "AILANE-CC-BRIEF-CEO-DASH-IA-FOLLOWON-001",
    deliverable_version: "v1.2",
    deliverable_section: "cohort_research:" + (entity.alin || entity.id),
    evidence_fetched_at: new Date().toISOString(),
    finding_type: "cohort_research_dossier",
    finding_text: dossier.headline || ("Cohort research — " + (entity.company_name || entity.alin)),
    evidence_tier: entity.evidence_tier || "tier_3_derived",
    evidence_payload: { dossier, entity, sources: dossier.sources || [], generated_by: "ceo-cohort-research", model: MODEL, caller_sub: callerSub },
    related_entity_ids: [entity.id],
    related_cohort_codes: entity.cohort_family ? [entity.cohort_family] : [],
    recorded_by: "ceo-cohort-research",
    recorded_at: new Date().toISOString(),
  });
  if (insErr) console.error("research_finding_register insert: " + insErr.message);

  return json({
    entity: { id: entity.id, alin: entity.alin, company_name: entity.company_name, cohort_family: entity.cohort_family },
    headline: dossier.headline || null,
    sections: dossier.sections || {},
    sources: dossier.sources || [],
    dossier_finding_id: insErr ? null : findingId,
    recorded_at: new Date().toISOString(),
    disclaimer: "Intelligence, not advice (PLUGIN-001 Art XIV §14.2). Identifies, quantifies and contextualises only.",
    warnings: [anthErr, insErr ? "dossier_not_persisted: " + insErr.message : null].filter(Boolean),
  });
});
