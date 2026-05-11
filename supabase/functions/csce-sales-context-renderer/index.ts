// AILANE — csce-sales-context-renderer v1.0
// Deployed under AILANE-CC-BRIEF-CYCLE-4-001 / AMD-137
// Per CSCE-001 v1.0 §9 — sales-context renderer with R-9 §3 binding
// Director adjudications (10 May 2026):
//   Flag 1 — models: institutional=claude-opus-4-7, SME=claude-haiku-4-5-20251001
//   Flag 2 — CORS: env-driven ALLOWED_ORIGINS allowlist (no wildcard)
//   Flag 3 — rate limiting via public.rate_limits (20/hr user, 100/day user, 60/hr IP, 500/hr service_role)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@^0.30";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  throw new Error("csce-sales-context-renderer: missing required env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY)");
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const ALLOWED_ORIGINS_DEFAULT = ["https://ailane.ai", "https://www.ailane.ai"];
const ALLOWED_ORIGINS_ENV = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map((s) => s.trim()).filter((s) => s.length > 0);
const ALLOWED_ORIGINS = [...new Set([...ALLOWED_ORIGINS_ENV, ...ALLOWED_ORIGINS_DEFAULT])];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "https://ailane.ai";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "false",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

interface RendererRequest {
  counterparty_id: string;
  briefing_variant: "cohort_allocation" | "sector_aggregate_intelligence" | "per_counterparty_risk_exposure" | "cohort_exclusivity_availability" | "ratified_pricing_parameter";
  rendering_context: "deal_room" | "sales_outreach" | "onboarding" | "refresh" | "adhoc";
  audience_profile?: "institutional" | "sme" | "internal_chairman";
}

const BANNED_CONSTRUCT_PATTERNS: Array<{ pattern: RegExp; rule: string }> = [
  { pattern: /\byou are (compliant|fully compliant)\b/i, rule: "R-9 §3.2.6 compliance-state assertion" },
  { pattern: /\bguarantee[ds]?\b.*?\b(compliance|outcome|result)\b/i, rule: "R-9 §3.2.2 outcome guarantee" },
  { pattern: /\b(no risk|zero exposure|eliminates risk)\b/i, rule: "R-9 §3.2.6 absolute-risk assertion" },
  { pattern: /\bact now\b/i, rule: "R-9 §3.2.5 urgency assertion" },
  { pattern: /\blimited time\b(?!\s+per ratified pricing schedule)/i, rule: "R-9 §3.2.5 unsubstantiated scarcity" },
  { pattern: /\byour competitors will\b/i, rule: "R-9 §3.2.4 predictive competitor framing" },
  { pattern: /\bfirst[- ]mover advantage\b/i, rule: "R-9 §3.2.4 predictive competitor framing" },
  { pattern: /\bfree\b(?!\s+(text|to))/i, rule: "R-9 §3.4 'free' substitution required" },
];

function bannedConstructSweep(text: string): { violations: Array<{ rule: string; match: string }>; clean: boolean } {
  const violations: Array<{ rule: string; match: string }> = [];
  for (const { pattern, rule } of BANNED_CONSTRUCT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({ rule, match: match[0] });
    }
  }
  return { violations, clean: violations.length === 0 };
}

function composeEileenSystemPrompt(
  briefingVariant: string,
  renderingContext: string,
): string {
  return `You are Eileen, the AI intelligence entity for AI Lane Limited (Ailane). You are rendering a sales-context briefing under AILANE-SPEC-CSCE-001 v1.0 §9.

OPERATIVE PHRASING STANDARD: AILANE-LEGAL-MEMO-EIM-001-PHRASING-001 v1.0 (R-9) §3 binds your output. Specifically:
- §3.1 PERMITTED constructs: factual present-state ("The framework allocates X to Cohort Y"), intelligence-rendering ("The analysis identifies..."), commercial-context ("Cohort X exclusivity at region R is currently allocated to N of M positions"), Eileen-voice ("Eileen's analysis indicates...").
- §3.2 BANNED constructs you must NEVER use: futurity markers in commercial-context ("will lock", "will acquire"); predictive competitor framing ("your competitors will", "first-mover advantage"); urgency assertions ("act now", "limited time" without substantiation); outcome guarantees ("guaranteed compliance", "guaranteed outcome"); implicit scarcity ("limited slots", "secure before competitors"); comparative-loss framing ("avoid the fate of"); compliance-state assertions ("you are compliant", "no risk", "zero exposure"); investment-advice constructs; counterparty-impersonation constructs.
- §3.4 STANDARD SUBSTITUTIONS: use "The analysis indicates alignment with the identified requirements" not "You are compliant"; use "Designed to support your risk management" not "Guaranteed compliance"; use "The current cohort allocation state is N of M positions held" not "Your competitors will acquire this".

BRIEFING VARIANT: ${briefingVariant} per AILANE-SPEC-EIM-001 v1.0 §7.2.

RENDERING CONTEXT: ${renderingContext} per AILANE-SPEC-CSCE-001 v1.0 §9.4.

Your output is a multi-vector value briefing per EIM-001 v1.0 §7 — counterparty-specific, retrieval-augmented, articulating value across multiple substantive dimensions. Your tone is institutional, factual, present-state. Your length: 250-500 words for standard briefings; up to 800 words for deal_room first-contact contexts.

OUTPUT DISCIPLINE:
- Plain prose. No markdown headings, no bullet points, no bold/italic markers.
- Begin with the cohort allocation statement.
- End with the operative engagement framing for the requested briefing variant.
- Do not invent counterparty details. Use only the joint-state segmentation provided in the user message.
- If joint-state segmentation indicates fit_outcome='entity_not_found_or_inactive', return a single-paragraph response stating "The framework does not currently hold an active engagement allocation for the specified counterparty identifier. Engagement onboarding routes through the AILANE-SPEC-EIM-001 v1.0 §8 seven-stage onboarding flow."`;
}

function composeUserMessage(
  productFitData: Record<string, unknown>,
  briefingVariant: string,
  audienceProfile: string,
): string {
  return `Please render a ${briefingVariant} briefing for the counterparty whose joint-state segmentation is recorded below.

JOINT-STATE SEGMENTATION (from CSCE-001 v1.0 §8 csce_product_fit_routing):

\`\`\`json
${JSON.stringify(productFitData, null, 2)}
\`\`\`

AUDIENCE: ${audienceProfile}

Render the briefing now, conforming strictly to R-9 §3 phrasing standard.`;
}

async function rateLimitCheck(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
  ipAddress: string,
  isServiceRole: boolean,
): Promise<{ allowed: true } | { allowed: false; retryAfter: number; reason: string }> {
  const FN = "csce-sales-context-renderer";
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  if (isServiceRole) {
    const { count: globalHourly } = await supabase
      .from("rate_limits").select("id", { count: "exact", head: true })
      .eq("function_name", FN).eq("identifier", "service_role").gte("created_at", hourAgo);
    if ((globalHourly ?? 0) >= 500) {
      return { allowed: false, retryAfter: 3600, reason: "service_role_global_hourly_limit" };
    }
  } else {
    const { count: userHourly } = await supabase
      .from("rate_limits").select("id", { count: "exact", head: true })
      .eq("function_name", FN).eq("identifier", identifier).gte("created_at", hourAgo);
    if ((userHourly ?? 0) >= 20) {
      return { allowed: false, retryAfter: 3600, reason: "per_user_hourly_limit" };
    }
    const { count: userDaily } = await supabase
      .from("rate_limits").select("id", { count: "exact", head: true })
      .eq("function_name", FN).eq("identifier", identifier).gte("created_at", dayAgo);
    if ((userDaily ?? 0) >= 100) {
      return { allowed: false, retryAfter: 24 * 3600, reason: "per_user_daily_limit" };
    }
    const { count: ipHourly } = await supabase
      .from("rate_limits").select("id", { count: "exact", head: true })
      .eq("function_name", FN).eq("ip_address", ipAddress).gte("created_at", hourAgo);
    if ((ipHourly ?? 0) >= 60) {
      return { allowed: false, retryAfter: 3600, reason: "per_ip_hourly_limit" };
    }
  }
  return { allowed: true };
}

function extractUserIdFromJwt(authHeader: string): string {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const parts = token.split(".");
    if (parts.length !== 3) return "anonymous";
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub ?? "anonymous";
  } catch (_e) {
    return "anonymous";
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing_authorization" }), {
      status: 401,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const userId = extractUserIdFromJwt(authHeader);
  const isServiceRole = authHeader.includes(SUPABASE_SERVICE_ROLE_KEY ?? "___never_match___");
  const rateLimitIdentifier = isServiceRole ? "service_role" : userId;

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const gate = await rateLimitCheck(supabaseAdmin, rateLimitIdentifier, clientIp, isServiceRole);
  if (!gate.allowed) {
    return new Response(
      JSON.stringify({ error: "rate_limited", reason: gate.reason, retry_after: gate.retryAfter }),
      {
        status: 429,
        headers: {
          ...corsHeaders(origin),
          "Retry-After": gate.retryAfter.toString(),
          "Content-Type": "application/json",
        },
      },
    );
  }

  await supabaseAdmin.from("rate_limits").insert({
    ip_address: clientIp,
    function_name: "csce-sales-context-renderer",
    identifier: rateLimitIdentifier,
  });

  let body: RendererRequest;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const { counterparty_id, briefing_variant, rendering_context, audience_profile = "institutional" } = body;

  if (!counterparty_id || !briefing_variant || !rendering_context) {
    return new Response(JSON.stringify({ error: "missing_required_fields" }), {
      status: 400,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const { data: productFitData, error: rpcError } = await supabaseAdmin.rpc("csce_product_fit_routing", {
    p_entity_id: counterparty_id,
    p_query_options: {},
  });

  if (rpcError) {
    return new Response(
      JSON.stringify({ error: "product_fit_routing_failed", detail: rpcError.message }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  const systemPrompt = composeEileenSystemPrompt(briefing_variant, rendering_context);
  const userMessage = composeUserMessage(productFitData ?? {}, briefing_variant, audience_profile);

  const model = audience_profile === "institutional" ? "claude-opus-4-7" : "claude-haiku-4-5-20251001";

  let renderedText: string;
  try {
    const completion = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    renderedText = completion.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("\n");
  } catch (anthropicError) {
    const errMsg = anthropicError instanceof Error ? anthropicError.message : String(anthropicError);
    return new Response(
      JSON.stringify({ error: "anthropic_api_failed", detail: errMsg }),
      { status: 502, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  const sweepResult = bannedConstructSweep(renderedText);

  const requiresLayerCReview = ["deal_room", "sales_outreach"].includes(rendering_context);

  return new Response(
    JSON.stringify({
      rendered_briefing_text: renderedText,
      briefing_metadata: {
        counterparty_id,
        briefing_variant,
        rendering_context,
        audience_profile,
        model_used: model,
        joint_state_segmentation: productFitData,
      },
      rendering_audit_trail: {
        layer_a_sweep_result: sweepResult,
        requires_layer_c_review: requiresLayerCReview,
        review_status: requiresLayerCReview ? "pending_review" : "auto_approved",
        rendered_at: new Date().toISOString(),
      },
    }),
    { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
  );
});
