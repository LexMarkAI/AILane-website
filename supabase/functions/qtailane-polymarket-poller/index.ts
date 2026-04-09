// supabase/functions/qtailane-polymarket-poller/index.ts
// QTAiLane Stage 2 — Polymarket price poller + instrument discovery
// Polls Polymarket API for active contract prices and discovers new contracts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const POLYMARKET_API = "https://clob.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let ingested = 0;
  let discovered = 0;
  let errors: string[] = [];

  try {
    // 1. Fetch active markets from Gamma API (metadata)
    const marketsRes = await fetch(
      `${GAMMA_API}/events?active=true&limit=100`,
    );
    if (!marketsRes.ok) throw new Error(`Gamma API: ${marketsRes.status}`);
    const events = await marketsRes.json();

    const now = new Date().toISOString();

    for (const event of events) {
      if (!event.markets) continue;

      for (const market of event.markets) {
        const slug = market.conditionId || market.questionID;
        if (!slug) continue;

        try {
          // 2. Fetch price from CLOB API
          let price: number | null = null;
          try {
            const priceRes = await fetch(
              `${POLYMARKET_API}/midpoint?token_id=${market.clobTokenIds?.[0]}`,
            );
            if (priceRes.ok) {
              const priceData = await priceRes.json();
              price = parseFloat(priceData.mid || priceData.price || "0");
            }
          } catch (_) {
            // Price fetch failed — skip this market
            continue;
          }

          if (price === null || price === 0) continue;

          // 3. Discover/register instrument if new
          const { data: existing } = await sb
            .from("qtailane_instruments")
            .select("id")
            .eq("venue", "POLYMARKET")
            .eq("instrument_id", slug)
            .maybeSingle();

          if (!existing) {
            // Map category from Polymarket tags
            let category = "OTHER";
            const tags = (event.tags || []).map((t: any) =>
              (t.label || t).toLowerCase(),
            );
            if (
              tags.some(
                (t: string) =>
                  t.includes("election") || t.includes("politic"),
              )
            )
              category = "ELECTORAL";
            else if (
              tags.some(
                (t: string) =>
                  t.includes("fed") ||
                  t.includes("rate") ||
                  t.includes("central bank"),
              )
            )
              category = "CENTRAL_BANK";
            else if (
              tags.some(
                (t: string) =>
                  t.includes("war") ||
                  t.includes("conflict") ||
                  t.includes("geopolit"),
              )
            )
              category = "GEOPOLITICAL";
            else if (
              tags.some(
                (t: string) =>
                  t.includes("fda") ||
                  t.includes("regulat") ||
                  t.includes("scien"),
              )
            )
              category = "SCIENTIFIC_REGULATORY";
            else if (
              tags.some(
                (t: string) =>
                  t.includes("earnings") ||
                  t.includes("merger") ||
                  t.includes("corporate"),
              )
            )
              category = "CORPORATE_EVENT";
            else if (
              tags.some(
                (t: string) =>
                  t.includes("gdp") ||
                  t.includes("inflation") ||
                  t.includes("employment"),
              )
            )
              category = "ECONOMIC_DATA";

            await sb.from("qtailane_instruments").insert({
              venue: "POLYMARKET",
              instrument_id: slug,
              display_name: (
                market.question ||
                event.title ||
                slug
              ).substring(0, 200),
              instrument_type: "BINARY_CONTRACT",
              asset_class: "EVENT",
              event_category: category,
              venue_metadata: {
                event_id: event.id,
                question: market.question,
                end_date: market.endDate || event.endDate,
                clob_token_ids: market.clobTokenIds,
                tags: tags,
              },
              is_active: true,
              is_tradeable: false, // requires manual approval
              last_price: price,
              last_price_at: now,
            });
            discovered++;
          }

          // 4. Ingest price
          const { error: ingestErr } = await sb.rpc(
            "qtailane_ingest_market_data",
            {
              p_venue: "POLYMARKET",
              p_instrument: slug,
              p_timestamp: now,
              p_close: price,
              p_bid: price - 0.005, // estimate spread
              p_ask: price + 0.005,
              p_timeframe: "1m",
            },
          );

          if (ingestErr) {
            errors.push(`${slug}: ${ingestErr.message}`);
          } else {
            ingested++;
          }
        } catch (marketErr) {
          errors.push(`Market ${slug}: ${String(marketErr)}`);
        }

        // Rate limit
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // 5. Update connector health
    const latency = Date.now() - startTime;
    await sb.rpc("qtailane_update_connector_health", {
      p_venue: "POLYMARKET",
      p_connector_name: "polymarket-poller",
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
        status: "ok",
        ingested,
        discovered,
        errors: errors.length,
        latency_ms: latency,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    try {
      await sb.rpc("qtailane_update_connector_health", {
        p_venue: "POLYMARKET",
        p_connector_name: "polymarket-poller",
        p_status: "FAILED",
        p_records_ingested: 0,
        p_error: String(err).substring(0, 500),
      });
    } catch (_) {}

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
