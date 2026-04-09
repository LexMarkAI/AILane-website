// supabase/functions/qtailane-news-poller/index.ts
// QTAiLane Stage 3 — News Evidence Poller
// Polls NewsAPI.org (with GDELT fallback) for headlines, classifies them,
// and ingests via qtailane_ingest_evidence() with automatic deduplication.
// Connector health entry: venue=PAPER, connector_name=evidence-news-poller

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── SOURCE NAME MAPPING ──
// Map incoming article source names to EXACT registered source names.
// If no match, use "Google News Aggregate" (derivative catch-all).
const SOURCE_MAP: Record<string, { name: string; isOriginal: boolean }> = {
  reuters: { name: "Reuters", isOriginal: true },
  "reuters.com": { name: "Reuters", isOriginal: true },
  "associated press": { name: "Associated Press", isOriginal: true },
  "ap news": { name: "Associated Press", isOriginal: true },
  "apnews.com": { name: "Associated Press", isOriginal: true },
  bloomberg: { name: "Bloomberg", isOriginal: true },
  "bloomberg.com": { name: "Bloomberg", isOriginal: true },
  afp: { name: "AFP", isOriginal: true },
  "agence france-presse": { name: "AFP", isOriginal: true },
};

function resolveSource(rawName: string): {
  name: string;
  isOriginal: boolean;
  ancestryChain: string[];
} {
  const key = (rawName || "").toLowerCase().trim();
  const match = SOURCE_MAP[key];
  if (match) return { ...match, ancestryChain: [] };
  return {
    name: "Google News Aggregate",
    isOriginal: false,
    ancestryChain: [rawName || "unknown"],
  };
}

// ── CATEGORY CLASSIFIER (keyword-based) ──
function classifyCategories(text: string): string[] {
  const t = text.toLowerCase();
  const cats: string[] = [];
  if (
    /\b(elect|vote|poll|ballot|president|senator|congress|parliament|labour|tory|democrat|republican|governor|midterm|primary)\b/.test(
      t
    )
  )
    cats.push("ELECTORAL");
  if (
    /\b(fed |federal reserve|rate cut|rate hike|interest rate|monetary policy|central bank|boe|ecb|fomc|inflation target|dovish|hawkish)\b/.test(
      t
    )
  )
    cats.push("CENTRAL_BANK");
  if (
    /\b(war|conflict|sanction|nato|military|ceasefire|troops|invasion|missile|nuclear|territory|annex)\b/.test(
      t
    )
  )
    cats.push("GEOPOLITICAL");
  if (
    /\b(fda|drug approval|clinical trial|phase [123]|pdufa|ema|regulatory approval|mhra)\b/.test(
      t
    )
  )
    cats.push("SCIENTIFIC_REGULATORY");
  if (
    /\b(merger|acquisition|ipo|earnings|quarterly results|revenue|ceo (resign|appoint)|buyout|takeover|deal|sec filing)\b/.test(
      t
    )
  )
    cats.push("CORPORATE_EVENT");
  if (
    /\b(gdp|unemployment|jobs report|non.?farm|cpi|ppi|retail sales|housing start|payroll|economic data|trade balance)\b/.test(
      t
    )
  )
    cats.push("ECONOMIC_DATA");
  return cats.length > 0 ? cats : ["OTHER"];
}

// ── JURISDICTION CLASSIFIER (keyword-based) ──
function classifyJurisdictions(text: string): string[] {
  const t = text.toLowerCase();
  const j: string[] = [];
  if (
    /\b(u\.?s\.?|america|washington|congress|fed |federal reserve|white house|wall street|sec |treasury)\b/.test(
      t
    )
  )
    j.push("US");
  if (
    /\b(u\.?k\.?|britain|british|london|parliament|westminster|boe|ftse|commons|lords|downing)\b/.test(
      t
    )
  )
    j.push("UK");
  if (/\b(eu|europe|european|brussels|ecb|eurozone|euro area)\b/.test(t))
    j.push("EU");
  if (/\b(china|chinese|beijing|pboc|shanghai)\b/.test(t)) j.push("CN");
  if (/\b(japan|japanese|tokyo|boj|nikkei)\b/.test(t)) j.push("JP");
  if (/\b(india|indian|rbi|mumbai)\b/.test(t)) j.push("IN");
  return j.length > 0 ? j : ["GLOBAL"];
}

// ── SENTIMENT ESTIMATOR (keyword-based) ──
function estimateSentiment(text: string): number {
  const t = text.toLowerCase();
  const pos = (
    t.match(
      /\b(surge|jump|gain|rise|rally|boom|strong|beat|record high|breakthrough|approv|optimis|soar)\b/g
    ) || []
  ).length;
  const neg = (
    t.match(
      /\b(crash|plunge|fall|drop|slump|recession|crisis|warn|fear|miss|reject|fail|collapse|plummet|tumble|pessimis)\b/g
    ) || []
  ).length;
  if (pos > neg) return Math.min(0.7, pos * 0.15);
  if (neg > pos) return Math.max(-0.7, -neg * 0.15);
  return 0;
}

// ── SHA-256 HASH ──
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
    const newsApiKey = Deno.env.get("NEWS_API_KEY");

    // Six query topics aligned with qtailane_event_category enum values
    const queries = [
      "federal reserve OR interest rate OR monetary policy",
      "election OR presidential OR parliamentary vote",
      "merger OR acquisition OR IPO OR quarterly earnings",
      "FDA approval OR clinical trial OR drug regulatory",
      "GDP OR unemployment OR inflation data OR jobs report",
      "military conflict OR sanctions OR ceasefire OR geopolitical",
    ];

    for (const query of queries) {
      try {
        let articles: any[] = [];

        if (newsApiKey) {
          // ── NewsAPI path (requires API key) ──
          const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
            query
          )}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${newsApiKey}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            articles = data.articles || [];
          } else {
            errors.push(`NewsAPI ${res.status} for "${query}"`);
          }
        } else {
          // ── GDELT fallback (public, no key needed) ──
          const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
            query
          )}&mode=ArtList&maxrecords=10&format=json`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            articles = (data.articles || []).map((a: any) => ({
              title: a.title,
              description: a.segtitle || a.title,
              url: a.url,
              publishedAt: a.seendate,
              source: { name: a.domain || "GDELT" },
            }));
          } else {
            errors.push(`GDELT ${res.status} for "${query}"`);
          }
        }

        for (const article of articles) {
          const title = article.title || "";
          const desc = (
            article.description ||
            article.content ||
            ""
          ).substring(0, 1900);
          if (!title || title.length < 10) continue;

          const combinedText = `${title} ${desc}`;
          const hash = await sha256(`${title}|${article.url || ""}`);
          const categories = classifyCategories(combinedText);
          const jurisdictions = classifyJurisdictions(combinedText);
          const sentiment = estimateSentiment(combinedText);
          const resolved = resolveSource(article.source?.name || "");

          try {
            const { data: result, error: rpcErr } = await sb.rpc(
              "qtailane_ingest_evidence",
              {
                p_source_name: resolved.name,
                p_title: title.substring(0, 300),
                p_content_summary: desc.substring(0, 2000),
                p_content_hash: hash,
                p_published_at:
                  article.publishedAt || new Date().toISOString(),
                p_categories: categories,
                p_jurisdictions: jurisdictions,
                p_sentiment: sentiment,
                p_narrative_intensity: Math.min(
                  1.0,
                  Math.abs(sentiment) * 1.2 + 0.1
                ),
                p_source_item_id: article.url || null,
                p_is_original: resolved.isOriginal,
                p_ancestry_chain: resolved.ancestryChain,
                p_metadata: {
                  url: article.url,
                  raw_source: article.source?.name,
                },
              }
            );

            if (rpcErr) {
              errors.push(`RPC: ${rpcErr.message}`);
            } else if (result?.status === "ingested") {
              ingested++;
            } else if (result?.status === "duplicate") {
              duplicates++;
            } else if (result?.status === "error") {
              errors.push(`Ingest: ${result.reason}`);
            }
          } catch (itemErr) {
            errors.push(`Item: ${String(itemErr)}`);
          }
        }

        // Rate limit: 1 second between query batches
        await new Promise((r) => setTimeout(r, 1000));
      } catch (queryErr) {
        errors.push(`Query "${query}": ${String(queryErr)}`);
      }
    }

    // Compute narrative stress (global, 60-minute window)
    try {
      await sb.rpc("qtailane_compute_narrative_stress", {
        p_window_minutes: 60,
      });
    } catch (_) {
      /* non-fatal */
    }

    // Update connector health
    const latency = Date.now() - startTime;
    await sb.rpc("qtailane_update_connector_health", {
      p_venue: "PAPER",
      p_connector_name: "evidence-news-poller",
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
        p_connector_name: "evidence-news-poller",
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
