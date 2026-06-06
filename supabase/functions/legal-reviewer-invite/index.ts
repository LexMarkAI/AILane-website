// legal-reviewer-invite — Director-only reviewer invitation
// Derives from AILANE-SPEC-LOVR-001 v1.3 (draft) §4 | AILANE-AMD-REG-001 | SEC-001 §3, §4
//
// Invites an external legal reviewer using the platform's built-in GoTrue invite email
// (Supabase-configured SMTP) and records the reviewer on the legal_reviewer_contacts allowlist
// (status 'invited'). The reviewer then signs in by magic link via /auth/callback/ and is routed
// to /legal-oversight/. No Resend, no custom sender/secret.
//
// Deployment: Path A (Chairman) or Path B (Director) only — CC does not deploy. verify_jwt = true.
// Director-only: even though the gateway validates the JWT, the body re-checks the email claim and
// returns 403 for any non-Director caller (mirrors ceo-dashboard-data).
//
// Secrets (auto-injected by Supabase): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ailane.ai",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CEO_EMAIL = "mark@ailane.ai";
const CEO_USER_ID = "eb2ef2cd-10e5-41eb-904a-bb280b0cb149";
const REVIEWER_REDIRECT = "https://ailane.ai/auth/callback/";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed", code: 405 }, 405);
  }

  // Secret validation (SEC-001 §4) — log NAME, never value.
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    const missing: string[] = [];
    if (!SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    console.error("Missing required secrets:", missing.join(", "));
    return jsonResponse({ error: "Configuration error", code: 500 }, 500);
  }

  // Director-only gate (decode bearer; mirror ceo-dashboard-data)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing authorization", code: 401 }, 401);
  }
  let claims: { sub?: string; email?: string };
  try {
    claims = JSON.parse(atob(authHeader.replace("Bearer ", "").split(".")[1]));
  } catch {
    return jsonResponse({ error: "Invalid token", code: 401 }, 401);
  }
  if (claims.email !== CEO_EMAIL && claims.sub !== CEO_USER_ID) {
    return jsonResponse({ error: "Forbidden — Director only", code: 403 }, 403);
  }

  // Input
  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body", code: 400 }, 400);
  }
  const email = String(input.email ?? "").trim().toLowerCase();
  const firm_name = typeof input.firm_name === "string" ? input.firm_name.trim() : "";
  const full_name = typeof input.full_name === "string" ? input.full_name.trim() : null;
  const sra_id = typeof input.sra_id === "string" ? input.sra_id.trim() : null;
  const firm_entity_id = typeof input.firm_entity_id === "string" ? input.firm_entity_id.trim() : null;
  const role_title = typeof input.role_title === "string" ? input.role_title.trim() : null;
  if (!email || !/^.+@.+\..+$/.test(email) || !firm_name) {
    return jsonResponse({ error: "email and firm_name are required", code: 400 }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Send the built-in GoTrue invite email and obtain the user id.
  // The SDK sets the GoTrue redirect param correctly for the installed version.
  let userId: string | null = null;
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: REVIEWER_REDIRECT,
    data: { firm_name, full_name, invited_as: "legal_reviewer" },
  });

  if (inviteErr) {
    // Already-registered users cannot be re-invited; resolve their id without sending mail
    // (generateLink does not send). They self-serve sign-in via /legal-oversight/.
    const msg = (inviteErr.message || "").toLowerCase();
    const alreadyRegistered =
      msg.includes("already") || (inviteErr as { code?: string }).code === "email_exists";
    if (!alreadyRegistered) {
      console.error("inviteUserByEmail failed:", inviteErr.message);
      return jsonResponse({ error: "invite_failed", code: 502 }, 502);
    }
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: REVIEWER_REDIRECT },
    });
    if (linkErr || !link?.user?.id) {
      console.error("generateLink fallback failed:", linkErr?.message);
      return jsonResponse({ error: "invite_failed", code: 502 }, 502);
    }
    userId = link.user.id;
  } else {
    userId = invited?.user?.id ?? null;
  }

  // Upsert the allowlist row (service role bypasses RLS). on_conflict on the email column.
  const { data: row, error: upErr } = await admin
    .from("legal_reviewer_contacts")
    .upsert(
      {
        user_id: userId,
        email,
        full_name,
        firm_name,
        sra_id,
        firm_entity_id,
        role_title,
        status: "invited",
        invited_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    )
    .select("contact_id")
    .single();

  if (upErr) {
    console.error("allowlist upsert failed:", upErr.message);
    return jsonResponse({ error: "allowlist_write_failed", code: 502 }, 502);
  }

  // Never return the action link — it travels only by email.
  return jsonResponse({ ok: true, contact_id: row?.contact_id });
});
