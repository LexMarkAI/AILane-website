// supabase/functions/qtailane-daily-summary/index.ts
// QTAiLane Stage 2 — Daily statistical summary computation
// Computes daily summaries before raw data purge. Runs daily at 03:00 UTC.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1. Compute summaries for yesterday
    const { data: summaryResult } = await sb.rpc(
      "qtailane_compute_daily_summaries",
    );

    // 2. Purge expired raw data (>90 days)
    const { data: purgeResult } = await sb.rpc(
      "qtailane_purge_expired_market_data",
    );

    return new Response(
      JSON.stringify({
        status: "ok",
        summaries_computed: summaryResult,
        rows_purged: purgeResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
