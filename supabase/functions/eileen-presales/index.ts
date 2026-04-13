// eileen-presales/index.ts — v1
// AILANE-SPEC-EILEEN-007 v1.0 (AMD-046) | SEC-001 §3 | Phase 1
//
// Pre-sales Eileen — serves unauthenticated visitors on landing pages
// (ailane.ai/ and ailane.ai/kl-access/).
//
// Constitutional infrastructure:
//   - System prompt loaded from platform_config with version pointer
//   - Output verification layer (banned phrases, advisory language,
//     first-message + contextual disclaimers)
//   - PII redaction before storage
//   - Rate limit: 10 messages / visitor_hash / hour
//   - Conversations logged to eileen_presales_conversations
//   - Failures logged to eileen_presales_compliance_log
//   - Auto-rollback on 10+ failures / 24h for same prompt version
//
// Governed by: ACEI v1.0, RRI v1.0, CCI v1.0, PLUGIN-001 Art. XIV.
// Deployment: Supabase Dashboard only. verify_jwt = false.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ─── CORS (SEC-001 §3.3) ────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://ailane.ai",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

// ─── Types ──────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface EileenPresalesRequest {
  page: "main" | "kl-access";
  section: string;
  messages: Message[];
  visitor_hash: string;
}

interface VerificationFailure {
  type: "banned_phrase" | "advisory_language" | "missing_disclaimer" | "missing_contextual";
  matched: string;
}

// ─── Rate Limiting (SEC-001 §3.1) ───────────────────────────────────
// rate_limits table schema: ip_address, function_name, created_at
// Uses visitor_hash as the ip_address value (pre-hashed client-side).
async function checkRateLimit(
  supabase: any,
  visitorHash: string,
  limit: number = 10,
  windowMinutes: number = 60,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", visitorHash)
    .eq("function_name", "eileen-presales")
    .gte("created_at", windowStart);

  if (error) {
    console.error("Rate limit check error:", error.message);
    return false; // Fail open — do not block on infra errors
  }

  if ((count ?? 0) >= limit) return true;

  await supabase.from("rate_limits").insert({
    ip_address: visitorHash,
    function_name: "eileen-presales",
    created_at: new Date().toISOString(),
  });

  return false;
}

// ─── PII Redaction ──────────────────────────────────────────────────
function redactPII(text: string): string {
  let redacted = text.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[EMAIL REDACTED]",
  );
  redacted = redacted.replace(
    /(\+44|0)\s*\d[\d\s\-]{8,12}/g,
    "[PHONE REDACTED]",
  );
  redacted = redacted.replace(
    /[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]/gi,
    "[NI REDACTED]",
  );
  return redacted;
}

// ─── Output Verification (EILEEN-007 §7 — Constitutional Infrastructure) ──
const BANNED_PHRASES = [
  "you are compliant",
  "you are not compliant",
  "this will protect you",
  "guaranteed",
  "certain result",
  "eileen knows",
  "our ai knows",
  "no risk",
  "zero exposure",
  "fully compliant",
  "replaces your solicitor",
  "ensures compliance",
  "legally binding",
  "you should",
  "you must",
];

const ADVISORY_PATTERNS = [
  /\bi advise\b/i,
  /\bmy advice\b/i,
  /\bi recommend that you\b/i,
];

const STATUTE_PATTERNS = [
  /s\.\d+/,
  /[Aa]rticle\s+\d+/,
  /[Aa]ct\s+\d{4}/,
  /ERA\s+2025/,
];

// "you should" / "you must" are permitted in FACTUAL context
// ("you must have a written statement under s.1 ERA 1996") but
// banned in ADVISORY context ("you should terminate the contract").
// Heuristic: factual if immediately followed by "have", "be", "receive",
// "know", "understand", "refer", or followed within 6 words by a statute
// reference (STATUTE_PATTERNS). Otherwise treat as advisory.
function isFactualContext(response: string, phrase: string): boolean {
  const re = new RegExp(
    `\\b${phrase}\\s+(have|be|receive|know|understand|refer|see|consult)\\b`,
    "i",
  );
  if (re.test(response)) return true;

  const idx = response.toLowerCase().indexOf(phrase);
  if (idx === -1) return false;
  const window = response.slice(idx, idx + phrase.length + 80);
  return STATUTE_PATTERNS.some((p) => p.test(window));
}

function verifyOutput(
  response: string,
  isFirstMessage: boolean,
): VerificationFailure[] {
  const failures: VerificationFailure[] = [];
  const lower = response.toLowerCase();

  // CHECK 1 — Banned phrase scan
  for (const phrase of BANNED_PHRASES) {
    if (!lower.includes(phrase)) continue;
    if (
      (phrase === "you should" || phrase === "you must") &&
      isFactualContext(response, phrase)
    ) {
      continue;
    }
    failures.push({ type: "banned_phrase", matched: phrase });
  }

  // CHECK 2 — Advisory language
  for (const pattern of ADVISORY_PATTERNS) {
    if (pattern.test(response)) {
      failures.push({ type: "advisory_language", matched: pattern.source });
    }
  }

  // CHECK 3 — First-message disclaimer
  if (isFirstMessage) {
    if (!lower.includes("i provide regulatory intelligence")) {
      failures.push({
        type: "missing_disclaimer",
        matched: "First-message disclaimer preamble not found",
      });
    }
  }

  // CHECK 4 — Contextual micro-disclaimer on any legislative reference
  const hasStatuteRef = STATUTE_PATTERNS.some((p) => p.test(response));
  if (hasStatuteRef && !isFirstMessage) {
    const hasContextual =
      lower.includes("regulatory intelligence") &&
      lower.includes("not legal advice");
    if (!hasContextual) {
      failures.push({
        type: "missing_contextual",
        matched: "Contextual micro-disclaimer not appended to legislative response",
      });
    }
  }

  return failures;
}

// ─── Safe Fallback ──────────────────────────────────────────────────
const SAFE_FALLBACK =
  "I want to be careful with how I answer that. I provide regulatory intelligence — not legal advice — and the most useful thing I can do here is point you to the exact statutory position rather than make claims about your situation. Could you share a bit more about what you're trying to understand? For advice on a specific matter, a qualified employment solicitor is the right first step.";

// ─── Escalation (EILEEN-007 §7.9) ───────────────────────────────────
async function checkEscalation(supabase: any, promptVersion: string): Promise<void> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const { count, error } = await supabase
    .from("eileen_presales_compliance_log")
    .select("*", { count: "exact", head: true })
    .eq("prompt_version", promptVersion)
    .gte("created_at", twentyFourHoursAgo);

  if (error) {
    console.error("Escalation check error:", error.message);
    return;
  }

  const n = count ?? 0;

  if (n >= 10) {
    // SEVERITY 3 — Automatic rollback
    const m = promptVersion.match(/^v?(\d+)$/);
    const currentVersion = m ? parseInt(m[1], 10) : NaN;
    if (!isNaN(currentVersion) && currentVersion > 1) {
      await supabase
        .from("platform_config")
        .update({ value: JSON.stringify(String(currentVersion - 1)) })
        .eq("key", "eileen_presales_active_version");
      console.error(
        `ESCALATION SEVERITY 3: ${n} failures in 24h for ${promptVersion}. ` +
          `Rolled back to v${currentVersion - 1}.`,
      );
    } else {
      console.error(
        `ESCALATION SEVERITY 3: ${n} failures in 24h for ${promptVersion}. ` +
          `No prior version to roll back to — manual intervention required.`,
      );
    }
    // TODO: Email alert to mark@ailane.ai via Resend (Phase 3).
  } else if (n >= 3) {
    console.warn(
      `ESCALATION SEVERITY 2: ${n} failures in 24h for ${promptVersion}. Review flagged.`,
    );
  }
}

// ─── Platform Config Loading ────────────────────────────────────────
async function loadActiveVersion(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "eileen_presales_active_version")
    .single();

  if (error || !data) throw new Error("eileen_presales_active_version not configured");
  // value is stored as JSON string, e.g. "1"
  return JSON.parse(data.value);
}

async function loadSystemPrompt(supabase: any, version: string): Promise<string> {
  const { data, error } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", `eileen_presales_prompt_v${version}`)
    .single();

  if (error || !data) {
    throw new Error(`eileen_presales_prompt_v${version} not configured`);
  }
  return JSON.parse(data.value);
}

async function loadModelId(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "eileen_presales_model")
    .single();

  if (error || !data) return "claude-haiku-4-5-20251001"; // default
  return JSON.parse(data.value);
}

// ─── Main Handler ───────────────────────────────────────────────────
serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: CORS_HEADERS },
    );
  }

  // Secret validation (SEC-001 §4)
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
    const missing: string[] = [];
    if (!SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
    console.error("Missing required secrets:", missing.join(", "));
    return new Response(
      JSON.stringify({ error: "Configuration error" }),
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // Parse request body
  let body: EileenPresalesRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Validate schema
  const { page, section, messages, visitor_hash } = body ?? ({} as EileenPresalesRequest);
  if (
    !page ||
    !["main", "kl-access"].includes(page) ||
    typeof section !== "string" ||
    !Array.isArray(messages) ||
    messages.length === 0 ||
    typeof visitor_hash !== "string" ||
    visitor_hash.length < 16
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid request schema" }),
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Every message must have role + content
  for (const m of messages) {
    if (
      !m ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string"
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid message in conversation" }),
        { status: 400, headers: CORS_HEADERS },
      );
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Rate limit
  const rateLimited = await checkRateLimit(supabase, visitor_hash);
  if (rateLimited) {
    return new Response(
      JSON.stringify({
        response:
          "I've enjoyed our conversation. For unlimited access to me and the full Knowledge Library, a Quick Session starts at £29. You can get started at ailane.ai/knowledge-library-pass/",
        rate_limited: true,
      }),
      { status: 200, headers: CORS_HEADERS },
    );
  }

  // First-message detection — conversation contains only the initial user turn
  const userMessages = messages.filter((m) => m.role === "user");
  const isFirstMessage = userMessages.length === 1 && messages.length === 1;

  // Load config
  let activeVersion: string;
  let systemPrompt: string;
  let modelId: string;
  try {
    activeVersion = await loadActiveVersion(supabase);
    systemPrompt = await loadSystemPrompt(supabase, activeVersion);
    modelId = await loadModelId(supabase);
  } catch (e) {
    console.error("Config load error:", (e as Error).message);
    return new Response(
      JSON.stringify({ error: "Configuration error" }),
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // Call Anthropic
  let rawResponse: string;
  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 1024,
        system:
          systemPrompt +
          `\n\n## RUNTIME CONTEXT\nPage: ${page}\nSection: ${section}`,
        messages: messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errBody);
      return new Response(
        JSON.stringify({ error: "Upstream model unavailable" }),
        { status: 502, headers: CORS_HEADERS },
      );
    }

    const json = await anthropicRes.json();
    rawResponse = json?.content?.[0]?.text ?? "";
    if (!rawResponse) {
      console.error("Empty Anthropic response:", JSON.stringify(json));
      return new Response(
        JSON.stringify({ error: "Empty model response" }),
        { status: 502, headers: CORS_HEADERS },
      );
    }
  } catch (e) {
    console.error("Anthropic fetch error:", (e as Error).message);
    return new Response(
      JSON.stringify({ error: "Upstream model unavailable" }),
      { status: 502, headers: CORS_HEADERS },
    );
  }

  // Verification layer
  const failures = verifyOutput(rawResponse, isFirstMessage);
  const promptVersion = `v${activeVersion}`;
  const nowIso = new Date().toISOString();

  // Redact PII from user + assistant messages before any logging
  const redactedMessages = messages.map((m) => ({
    role: m.role,
    content: redactPII(m.content),
  }));

  if (failures.length > 0) {
    // Block the unsafe output, return a safe fallback, log failure.
    try {
      await supabase.from("eileen_presales_compliance_log").insert({
        visitor_hash,
        page,
        section,
        prompt_version: promptVersion,
        model_id: modelId,
        failures, // JSONB — array of { type, matched }
        blocked_response: redactPII(rawResponse),
        conversation: redactedMessages,
        created_at: nowIso,
      });
    } catch (e) {
      console.error("Compliance log insert error:", (e as Error).message);
    }

    // Trigger escalation check (fire-and-forget — do not block response)
    checkEscalation(supabase, promptVersion).catch((e) =>
      console.error("Escalation check failed:", (e as Error).message),
    );

    return new Response(
      JSON.stringify({ response: SAFE_FALLBACK, verified: false }),
      { status: 200, headers: CORS_HEADERS },
    );
  }

  // Success — log the conversation turn
  try {
    await supabase.from("eileen_presales_conversations").insert({
      visitor_hash,
      page,
      section,
      prompt_version: promptVersion,
      model_id: modelId,
      messages: [
        ...redactedMessages,
        { role: "assistant", content: redactPII(rawResponse) },
      ],
      is_first_message: isFirstMessage,
      created_at: nowIso,
    });
  } catch (e) {
    console.error("Conversation log insert error:", (e as Error).message);
    // Do not fail the response on logging errors.
  }

  return new Response(
    JSON.stringify({ response: rawResponse, verified: true }),
    { status: 200, headers: CORS_HEADERS },
  );
});
