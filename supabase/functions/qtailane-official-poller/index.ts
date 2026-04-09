// supabase/functions/qtailane-official-poller/index.ts
// QTAiLane Stage 3 — Official Source Evidence Poller
// Polls FRED economic releases and UK Parliament bills API.
// All items flagged as is_original: true with zero ancestry chain.
// Connector health entry: venue=PAPER, connector_name=evidence-official-poller

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── SHA-256 ──
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── FRED: Federal Reserve Economic Data ──
// Public API, requires free API key from https://fred.stlouisfed.org/docs/api/api_key.html
// Source name in registry: "FRED (Federal Reserve Economic Data)" (EXACT)
async function fetchFRED(apiKey: string): Promise<any[]> {
  try {
    const url = `https://api.stlouisfed.org/fred/releases/dates?api_key=${apiKey}&file_type=json&limit=20&sort_order=desc&include_release_dates_with_no_data=false`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.release_dates || []).map((r: any) => ({
      source_name: "FRED (Federal Reserve Economic Data)",
      title: `FRED: ${r.release_name}`,
      summary: `Economic data release: ${r.release_name}. Date: ${r.date}. Release ID: ${r.release_id}. This is a scheduled statistical release from the Federal Reserve Economic Data system.`,
      published: r.date ? `${r.date}T12:00:00Z` : new Date().toISOString(),
      categories: ["ECONOMIC_DATA"],
      jurisdictions: ["US"],
      id: `fred-release-${r.release_id}-${r.date}`,
    }));
  } catch (e) {
    console.error("FRED fetch error:", e);
    return [];
  }
}

// ── UK PARLIAMENT: Bills API ──
// Public API, no key required.
// Source name in registry: "UK Parliament" (EXACT)
async function fetchParliament(): Promise<any[]> {
  try {
    const url =
      "https://bills-api.parliament.uk/api/v1/Bills?CurrentHouse=All&SortBy=Updated&SortOrder=Descending&Take=15";
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((b: any) => ({
      source_name: "UK Parliament",
      title: `UK Bill: ${b.shortTitle}`,
      summary: `${b.shortTitle} — House: ${b.currentHouse || "Unknown"}. ${(
        b.longTitle || ""
      ).substring(0, 500)}. Bill ID: ${b.billId}.`,
      published: b.lastUpdate || new Date().toISOString(),
      categories: ["SCIENTIFIC_REGULATORY"],
      jurisdictions: ["UK"],
      id: `uk-bill-${b.billId}`,
    }));
  } catch (e) {
    console.error("Parliament fetch error:", e);
    return [];
  }
}

// ── MAIN ──
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let ingested = 0,
    duplicates = 0,
    errors: string[] = [];

  try {
    const items: any[] = [];

    // FRED (requires FRED_API_KEY secret)
    const fredKey = Deno.env.get("FRED_API_KEY");
    if (fredKey) {
      const fredItems = await fetchFRED(fredKey);
      items.push(...fredItems);
    } else {
      errors.push("FRED_API_KEY not set — FRED source skipped");
    }

    // UK Parliament (public, always available)
    const parlItems = await fetchParliament();
    items.push(...parlItems);

    // Ingest all items
    for (const item of items) {
      try {
        const hash = await sha256(`${item.source_name}|${item.id}`);

        const { data: result, error: rpcErr } = await sb.rpc(
          "qtailane_ingest_evidence",
          {
            p_source_name: item.source_name,
            p_title: (item.title || "").substring(0, 300),
            p_content_summary: (item.summary || "").substring(0, 2000),
            p_content_hash: hash,
            p_published_at: item.published,
            p_categories: item.categories,
            p_jurisdictions: item.jurisdictions,
            p_sentiment: 0.0,
            p_narrative_intensity: 0.15,
            p_source_item_id: item.id,
            p_is_original: true,
            p_ancestry_chain: [],
            p_metadata: {
              fetcher: "qtailane-official-poller",
              source_api: item.source_name,
            },
          }
        );

        if (rpcErr) {
          errors.push(`RPC ${item.id}: ${rpcErr.message}`);
        } else if (result?.status === "ingested") {
          ingested++;
        } else if (result?.status === "duplicate") {
          duplicates++;
        } else if (result?.status === "error") {
          errors.push(`Ingest ${item.id}: ${result.reason}`);
        }
      } catch (itemErr) {
        errors.push(`${item.id}: ${String(itemErr)}`);
      }
    }

    // Update connector health
    const latency = Date.now() - startTime;
    await sb.rpc("qtailane_update_connector_health", {
      p_venue: "PAPER",
      p_connector_name: "evidence-official-poller",
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
        status:
          errors.length === 0
            ? "ok"
            : ingested > 0
            ? "partial"
            : "failed",
        ingested,
        duplicates,
        errors: errors.length,
        error_details: errors.slice(0, 5),
        latency_ms: latency,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    try {
      await sb.rpc("qtailane_update_connector_health", {
        p_venue: "PAPER",
        p_connector_name: "evidence-official-poller",
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
