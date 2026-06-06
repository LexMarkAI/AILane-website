// legal-reviewer-auth/index.ts — v1
// AILANE-SPEC-LOVR-001 v1.2 (§2.2 P0) | SEC-001 §3, §4 | AILANE-AMD-REG-001
//
// Authenticates an app-level legal_reviewer credential token (NOT a Supabase JWT) and,
// on success, mints a short-lived (<=30 min) JWT bearing the `legal_reviewer` role claim.
// That JWT is what the front-end uses for subsequent PostgREST calls in later phases:
// PostgREST role-switches to `legal_reviewer`, so RLS + grants apply. No credential material
// is ever returned to the client beyond the short-lived session JWT.
//
// Deployment: Supabase Dashboard / Path A only. verify_jwt = false
//   (this function authenticates an app credential token, not a Supabase JWT; the gateway has
//    no JWT to validate — all validation is in the function body).
//
// Required secrets (Edge Function environment, NOT Vault — RULE 4):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (both auto-injected by Supabase)
//   SUPABASE_JWT_SECRET                       (MUST be set manually in function settings)

import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// ─── CORS (SEC-001 §3.3) — client-facing function ───────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://ailane.ai",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

// Short-lived session JWT lifetime (seconds). LOVR §2.2: <= 30 min.
const SESSION_TTL_SECONDS = 30 * 60;

// ─── Rate limiting (SEC-001: all public Edge Functions) ─────────────
// rate_limits table schema: ip_address, function_name, created_at.
// Credential-verification endpoint — brute-force surface — so this is enforced even though
// it is beyond the brief's explicit behaviour list. Fail-open on infra errors (never block
// the auth path on a rate-limit subsystem fault). 10 attempts / 15 min / IP.
const RL_LIMIT = 10;
const RL_WINDOW_MIN = 15;

async function isRateLimited(
  url: string,
  key: string,
  ip: string,
): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - RL_WINDOW_MIN * 60 * 1000).toISOString();
    const q =
      `${url}/rest/v1/rate_limits?select=created_at` +
      `&ip_address=eq.${encodeURIComponent(ip)}` +
      `&function_name=eq.legal-reviewer-auth` +
      `&created_at=gte.${encodeURIComponent(windowStart)}`;
    const r = await fetch(q, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return false; // fail open
    const rows = await r.json();
    if (Array.isArray(rows) && rows.length >= RL_LIMIT) return true;

    // Record this attempt (fire-and-forget; ignore failures).
    await fetch(`${url}/rest/v1/rate_limits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        ip_address: ip,
        function_name: "legal-reviewer-auth",
        created_at: new Date().toISOString(),
      }),
    });
    return false;
  } catch (_e) {
    return false; // fail open
  }
}

// ─── Credential verification (RULE 2 pattern: raw fetch to RPC with ───
//     service-role bearer; never sb.from() at this layer) ─────────────
interface ReviewerRow {
  reviewer_id: string;
  firm_name: string;
  reviewer_name: string;
  scope: unknown;
}

async function verifyCredential(
  url: string,
  key: string,
  token: string,
): Promise<ReviewerRow | null> {
  const res = await fetch(`${url}/rest/v1/rpc/verify_legal_reviewer_credential`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`verify RPC failed: ${res.status} ${detail}`);
  }
  const rows = (await res.json()) as ReviewerRow[];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
}

// ─── JWT minting (HS256, signed with the project JWT secret) ────────
async function mintSessionJwt(
  jwtSecret: string,
  reviewer: ReviewerRow,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return await create(
    { alg: "HS256", typ: "JWT" },
    {
      role: "legal_reviewer",
      reviewer_id: reviewer.reviewer_id,
      firm_name: reviewer.firm_name,
      exp: getNumericDate(SESSION_TTL_SECONDS),
    },
    key,
  );
}

// ─── Handler ────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
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

  // Secret validation (SEC-001 §4) — log secret NAME, never value.
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !JWT_SECRET) {
    const missing: string[] = [];
    if (!SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!JWT_SECRET) missing.push("SUPABASE_JWT_SECRET");
    console.error("Missing required secrets:", missing.join(", "));
    return new Response(
      JSON.stringify({ error: "Configuration error" }),
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // Parse + validate body
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const token = body?.token;
  if (typeof token !== "string" || token.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Missing credential token" }),
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Rate limit (per client IP)
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (await isRateLimited(SUPABASE_URL, SERVICE_ROLE_KEY, ip)) {
    return new Response(
      JSON.stringify({ error: "Too many attempts. Please wait and try again." }),
      { status: 429, headers: CORS_HEADERS },
    );
  }

  // Verify credential
  let reviewer: ReviewerRow | null;
  try {
    reviewer = await verifyCredential(SUPABASE_URL, SERVICE_ROLE_KEY, token.trim());
  } catch (e) {
    console.error("Credential verification error:", (e as Error).message);
    return new Response(
      JSON.stringify({ error: "Verification unavailable" }),
      { status: 502, headers: CORS_HEADERS },
    );
  }
  if (!reviewer) {
    // Unknown / inactive / expired token — reveal nothing.
    return new Response(
      JSON.stringify({ error: "Invalid or expired credential" }),
      { status: 401, headers: CORS_HEADERS },
    );
  }

  // Mint short-lived legal_reviewer session JWT
  let sessionToken: string;
  try {
    sessionToken = await mintSessionJwt(JWT_SECRET, reviewer);
  } catch (e) {
    console.error("JWT mint error:", (e as Error).message);
    return new Response(
      JSON.stringify({ error: "Session issuance failed" }),
      { status: 500, headers: CORS_HEADERS },
    );
  }

  return new Response(
    JSON.stringify({
      session_token: sessionToken,
      firm_name: reviewer.firm_name,
      reviewer_name: reviewer.reviewer_name,
    }),
    { status: 200, headers: CORS_HEADERS },
  );
});
