// supabase/functions/trading-proxy/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IG credentials from Edge Function secrets (set via CLI, never in code)
const IG_API_KEY = Deno.env.get("IG_API_KEY") ?? "";
const IG_USERNAME = Deno.env.get("IG_USERNAME") ?? "";
const IG_PASSWORD = Deno.env.get("IG_PASSWORD") ?? "";
const IG_ACC_NUMBER = Deno.env.get("IG_ACC_NUMBER") ?? "";
const IG_BASE_URL = "https://api.ig.com/gateway/deal";

// Allowed Supabase user ID (Mark only)
const ALLOWED_USER_ID = Deno.env.get("ALLOWED_TRADING_USER_ID") ?? "";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── AUTH: Verify the caller is Mark ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.sub;

    if (ALLOWED_USER_ID && userId !== ALLOWED_USER_ID) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── IG AUTH: Get session tokens ──
    const igAuthResp = await fetch(`${IG_BASE_URL}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Accept": "application/json; charset=UTF-8",
        "X-IG-API-KEY": IG_API_KEY,
        "VERSION": "3",
      },
      body: JSON.stringify({
        identifier: IG_USERNAME,
        password: IG_PASSWORD,
      }),
    });

    if (!igAuthResp.ok) {
      return new Response(JSON.stringify({ error: "IG auth failed", status: igAuthResp.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const igAuthData = await igAuthResp.json();
    const accessToken = igAuthData.oauthToken?.access_token ?? "";
    const cst = igAuthResp.headers.get("CST") ?? "";
    const securityToken = igAuthResp.headers.get("X-SECURITY-TOKEN") ?? "";

    const igHeaders: Record<string, string> = {
      "Content-Type": "application/json; charset=UTF-8",
      "Accept": "application/json; charset=UTF-8",
      "X-IG-API-KEY": IG_API_KEY,
      "VERSION": "2",
    };

    if (accessToken) {
      igHeaders["Authorization"] = `Bearer ${accessToken}`;
      igHeaders["IG-ACCOUNT-ID"] = IG_ACC_NUMBER;
    }
    if (cst) igHeaders["CST"] = cst;
    if (securityToken) igHeaders["X-SECURITY-TOKEN"] = securityToken;

    // ── FETCH POSITIONS ──
    const posResp = await fetch(`${IG_BASE_URL}/positions`, {
      headers: igHeaders,
    });
    const posData = await posResp.json();

    const positions = (posData.positions ?? []).map((pos: any) => {
      const mkt = pos.market ?? {};
      const p = pos.position ?? {};
      const direction = p.direction ?? "BUY";
      const bid = mkt.bid ?? 0;
      const offer = mkt.offer ?? 0;
      const current = direction === "BUY" ? bid : offer;
      const openLevel = p.level ?? 0;
      const size = p.size ?? 0;
      const pnl = direction === "BUY"
        ? (current - openLevel) * size
        : (openLevel - current) * size;

      return {
        epic: mkt.epic ?? "",
        name: mkt.instrumentName ?? "",
        direction,
        size,
        level: openLevel,
        bid: current,
        pnl: Math.round(pnl * 100) / 100,
        flags: [] as string[],
      };
    });

    // Flag concentration (>2 positions on same EPIC)
    const epicCounts: Record<string, number> = {};
    positions.forEach((p: any) => {
      epicCounts[p.epic] = (epicCounts[p.epic] ?? 0) + 1;
    });
    positions.forEach((p: any) => {
      if (epicCounts[p.epic] > 2) p.flags.push("CONCENTRATION");
    });

    // ── BUILD RESPONSE ──
    const totalPnl = positions.reduce((s: number, p: any) => s + p.pnl, 0);
    const result = {
      account: {
        balance: 0,
        profitLoss: totalPnl,
        available: 0,
        deposit: 0,
      },
      positions,
      timestamp: new Date().toISOString(),
    };

    // ── CLOSE IG SESSION ──
    try {
      await fetch(`${IG_BASE_URL}/session`, { method: "DELETE", headers: igHeaders });
    } catch (_) { /* best effort */ }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});