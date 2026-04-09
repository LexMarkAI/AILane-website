// supabase/functions/qtailane-ig-poller/index.ts
// QTAiLane Stage 2 — IG Markets price poller connector
// Polls IG REST API for current prices across all active IG instruments
// Runs on cron (every 60s) or on-demand via HTTP
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// IG Markets API endpoints
const IG_API_URL = "https://api.ig.com/gateway/deal"; // LIVE
// const IG_API_URL = "https://demo-api.ig.com/gateway/deal"; // DEMO

interface IGSession {
  cst: string;
  xSecurityToken: string;
  accountId: string;
}

async function igLogin(): Promise<IGSession> {
  const apiKey = Deno.env.get("IG_API_KEY")!;
  const username = Deno.env.get("IG_USERNAME")!;
  const password = Deno.env.get("IG_PASSWORD")!;

  const res = await fetch(`${IG_API_URL}/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IG-API-KEY": apiKey,
      Version: "2",
    },
    body: JSON.stringify({ identifier: username, password: password }),
  });

  if (!res.ok) throw new Error(`IG login failed: ${res.status}`);

  return {
    cst: res.headers.get("CST") || "",
    xSecurityToken: res.headers.get("X-SECURITY-TOKEN") || "",
    accountId: Deno.env.get("IG_ACCOUNT_ID") || "",
  };
}

async function igFetchPrices(
  session: IGSession,
  epics: string[],
): Promise<any> {
  // IG allows up to 50 epics per market request
  const epicStr = epics.join(",");
  const res = await fetch(`${IG_API_URL}/markets?epics=${epicStr}`, {
    headers: {
      "X-IG-API-KEY": Deno.env.get("IG_API_KEY")!,
      CST: session.cst,
      "X-SECURITY-TOKEN": session.xSecurityToken,
      Version: "1",
    },
  });

  if (!res.ok) throw new Error(`IG markets fetch failed: ${res.status}`);
  return res.json();
}

async function igLogout(session: IGSession) {
  try {
    await fetch(`${IG_API_URL}/session`, {
      method: "DELETE",
      headers: {
        "X-IG-API-KEY": Deno.env.get("IG_API_KEY")!,
        CST: session.cst,
        "X-SECURITY-TOKEN": session.xSecurityToken,
      },
    });
  } catch (_) {
    /* best effort logout */
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  let session: IGSession | null = null;
  let ingested = 0;
  let errors: string[] = [];

  try {
    // 1. Get all active IG instruments
    const { data: instruments, error: instErr } = await sb
      .from("qtailane_instruments")
      .select("instrument_id, venue_metadata")
      .eq("venue", "IG_MARKETS")
      .eq("is_active", true)
      .neq("instrument_id", "polymarket-discovery")
      .neq("instrument_id", "kalshi-discovery");

    if (instErr) throw instErr;
    if (!instruments?.length) {
      return new Response(JSON.stringify({ status: "no_instruments" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Login to IG
    session = await igLogin();

    // 3. Fetch prices in batches of 50
    const epics = instruments.map((i: any) => i.instrument_id);
    const batchSize = 50;
    const now = new Date().toISOString();

    for (let i = 0; i < epics.length; i += batchSize) {
      const batch = epics.slice(i, i + batchSize);

      try {
        const data = await igFetchPrices(session, batch);

        if (data?.marketDetails) {
          for (const market of data.marketDetails) {
            const snap = market.snapshot;
            if (!snap) continue;

            const epic = market.instrument?.epic;
            if (!epic) continue;

            // 4. Ingest via database function
            const { error: ingestErr } = await sb.rpc(
              "qtailane_ingest_market_data",
              {
                p_venue: "IG_MARKETS",
                p_instrument: epic,
                p_timestamp: now,
                p_close: snap.offer ?? snap.bid ?? 0,
                p_open: snap.openPrice ?? null,
                p_high: snap.high ?? null,
                p_low: snap.low ?? null,
                p_volume: null, // IG doesn't provide volume on snapshot
                p_bid: snap.bid ?? null,
                p_ask: snap.offer ?? null,
                p_timeframe: "1m",
              },
            );

            if (ingestErr) {
              errors.push(`${epic}: ${ingestErr.message}`);
            } else {
              ingested++;
            }
          }
        }

        // Rate limit: wait between batches
        if (i + batchSize < epics.length) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (batchErr) {
        errors.push(`Batch ${i}: ${String(batchErr)}`);
      }
    }

    // 5. Update connector health
    const latency = Date.now() - startTime;
    await sb.rpc("qtailane_update_connector_health", {
      p_venue: "IG_MARKETS",
      p_connector_name: "ig-price-poller",
      p_status:
        errors.length === 0
          ? "HEALTHY"
          : ingested > 0
            ? "DEGRADED"
            : "FAILED",
      p_records_ingested: ingested,
      p_latency_ms: latency,
      p_error:
        errors.length > 0 ? errors.join("; ").substring(0, 500) : null,
    });

    return new Response(
      JSON.stringify({
        status: errors.length === 0 ? "ok" : "partial",
        ingested,
        errors: errors.length,
        latency_ms: latency,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    // Update connector as FAILED
    try {
      await sb.rpc("qtailane_update_connector_health", {
        p_venue: "IG_MARKETS",
        p_connector_name: "ig-price-poller",
        p_status: "FAILED",
        p_records_ingested: 0,
        p_error: String(err).substring(0, 500),
      });
    } catch (_) {}

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    if (session) await igLogout(session);
  }
});
