// ceo-dashboard-data — CEO Command Centre data gateway
// AILANE-CC-BRIEF-CEODASH-001
// Serves all dashboard panel data via a single authenticated endpoint.
// Auth: verify_jwt: true + email/uid validation for CEO-only access.
// Data: queries all schemas using service_role internally.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ailane.ai",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const CEO_EMAIL = "mark@ailane.ai";
const CEO_USER_ID = "eb2ef2cd-10e5-41eb-904a-bb280b0cb149";

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

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed", code: 405 }, 405);
  }

  // --- Auth validation ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing authorization", code: 401 }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  let jwtPayload: { sub?: string; email?: string };
  try {
    jwtPayload = JSON.parse(atob(token.split(".")[1]));
  } catch {
    return jsonResponse({ error: "Invalid token", code: 401 }, 401);
  }

  const userId = jwtPayload.sub;
  const email = jwtPayload.email;

  if (email !== CEO_EMAIL && userId !== CEO_USER_ID) {
    return jsonResponse({ error: "CEO access only", code: 403 }, 403);
  }

  // --- Service-role client for data queries ---
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // --- Section selection ---
  const url = new URL(req.url);
  const section = url.searchParams.get("section") || "all";
  const validSections = [
    "all",
    "financial",
    "platform",
    "pipeline",
    "compliance",
    "ticker",
  ];
  if (!validSections.includes(section)) {
    return jsonResponse(
      { error: "Invalid section. Valid: " + validSections.join(", "), code: 400 },
      400
    );
  }

  const sections: Record<string, unknown> = {};

  try {
    // ── FINANCIAL ──────────────────────────────────────────────
    if (section === "all" || section === "financial") {
      const [txResult, summaryResult, categoryResult, stripeResult] =
        await Promise.all([
          // Recent transactions (last 20)
          supabaseAdmin
            .schema("accounts")
            .from("transactions")
            .select(
              "date, amount, currency, supplier_name, description, category, is_revenue, status, notes, created_at"
            )
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(20),

          // Financial summary via RPC or manual aggregation
          supabaseAdmin
            .schema("accounts")
            .from("transactions")
            .select("amount, is_revenue, date"),

          // Spend by category
          supabaseAdmin
            .schema("accounts")
            .from("transactions")
            .select("category, amount, is_revenue"),

          // Stripe products summary
          supabaseAdmin
            .from("stripe_products")
            .select("product_type, category, is_active"),
        ]);

      // Compute summary from raw rows
      const allTx = summaryResult.data || [];
      const summary = {
        total_transactions: allTx.length,
        total_credits: 0,
        total_debits: 0,
        net_position: 0,
        earliest_date: null as string | null,
        latest_date: null as string | null,
      };
      const dates: string[] = [];
      for (const tx of allTx) {
        if (tx.is_revenue) {
          summary.total_credits += Number(tx.amount) || 0;
        } else {
          summary.total_debits += Number(tx.amount) || 0;
        }
        if (tx.date) dates.push(tx.date);
      }
      summary.net_position = summary.total_credits - summary.total_debits;
      if (dates.length > 0) {
        dates.sort();
        summary.earliest_date = dates[0];
        summary.latest_date = dates[dates.length - 1];
      }

      // Aggregate spend by category
      const catMap: Record<string, { tx_count: number; total: number }> = {};
      for (const tx of categoryResult.data || []) {
        if (!tx.is_revenue && Number(tx.amount) > 0) {
          const cat = tx.category || "uncategorised";
          if (!catMap[cat]) catMap[cat] = { tx_count: 0, total: 0 };
          catMap[cat].tx_count++;
          catMap[cat].total += Number(tx.amount) || 0;
        }
      }
      const spendByCategory = Object.entries(catMap)
        .map(([category, v]) => ({ category, ...v }))
        .sort((a, b) => b.total - a.total);

      // Aggregate stripe products
      const stripeMap: Record<
        string,
        { count: number; active: number; category: string }
      > = {};
      for (const p of stripeResult.data || []) {
        const key = p.product_type || "unknown";
        if (!stripeMap[key])
          stripeMap[key] = { count: 0, active: 0, category: p.category || "" };
        stripeMap[key].count++;
        if (p.is_active) stripeMap[key].active++;
      }
      const stripeSummary = Object.entries(stripeMap).map(
        ([product_type, v]) => ({ product_type, ...v })
      );

      sections.financial = {
        recent_transactions: txResult.data || [],
        summary,
        spend_by_category: spendByCategory,
        stripe_summary: stripeSummary,
      };
    }

    // ── PLATFORM ──────────────────────────────────────────────
    if (section === "all" || section === "platform") {
      const [
        triCount,
        empCount,
        findingsCount,
        uploadsCount,
        legCount,
        regCount,
        orgCount,
        userCount,
        orgBreakdown,
      ] = await Promise.all([
        supabaseAdmin
          .from("tribunal_decisions")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("employer_master")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("compliance_findings")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("compliance_uploads")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("legislation_library")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("regulatory_requirements")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("organisations")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("app_users")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("organisations")
          .select("tier, plan, status"),
      ]);

      const dataEstate = [
        { entity: "tribunal_decisions", count: triCount.count ?? 0 },
        { entity: "employer_master", count: empCount.count ?? 0 },
        { entity: "compliance_findings", count: findingsCount.count ?? 0 },
        { entity: "compliance_uploads", count: uploadsCount.count ?? 0 },
        { entity: "legislation_library", count: legCount.count ?? 0 },
        { entity: "regulatory_requirements", count: regCount.count ?? 0 },
        { entity: "organisations", count: orgCount.count ?? 0 },
        { entity: "app_users", count: userCount.count ?? 0 },
      ];

      // Aggregate org breakdown
      const orgMap: Record<string, number> = {};
      for (const o of orgBreakdown.data || []) {
        const key = [o.tier || "none", o.plan || "none", o.status || "none"].join(
          "|"
        );
        orgMap[key] = (orgMap[key] || 0) + 1;
      }
      const orgBreakdownAgg = Object.entries(orgMap).map(([key, count]) => {
        const [tier, plan, status] = key.split("|");
        return { tier, plan, status, count };
      });

      sections.platform = {
        data_estate: dataEstate,
        org_breakdown: orgBreakdownAgg,
      };
    }

    // ── PIPELINE ──────────────────────────────────────────────
    if (section === "all" || section === "pipeline") {
      const [pipelineResult] = await Promise.all([
        supabaseAdmin
          .from("pipeline_runs")
          .select(
            "pipeline_code, status, started_at, completed_at, records_found, records_new, records_failed, elapsed_seconds, error_message, trigger_type"
          )
          .order("started_at", { ascending: false })
          .limit(30),
      ]);

      sections.pipeline = {
        pipeline_runs: pipelineResult.data || [],
      };
    }

    // ── COMPLIANCE ────────────────────────────────────────────
    if (section === "all" || section === "compliance") {
      const [uploadsResult, severityResult, categoryResult] = await Promise.all([
        supabaseAdmin
          .from("compliance_uploads")
          .select("id, created_at, org_id")
          .order("created_at", { ascending: false })
          .limit(10),
        supabaseAdmin.from("compliance_findings").select("severity"),
        supabaseAdmin.from("compliance_findings").select("clause_category"),
      ]);

      // Aggregate severity
      const sevMap: Record<string, number> = {};
      for (const f of severityResult.data || []) {
        const s = f.severity || "unknown";
        sevMap[s] = (sevMap[s] || 0) + 1;
      }
      const severityDist = Object.entries(sevMap)
        .map(([severity, count]) => ({ severity, count }))
        .sort((a, b) => b.count - a.count);

      // Aggregate clause category
      const catMap2: Record<string, number> = {};
      for (const f of categoryResult.data || []) {
        const c = f.clause_category || "unknown";
        catMap2[c] = (catMap2[c] || 0) + 1;
      }
      const categoryDist = Object.entries(catMap2)
        .map(([clause_category, count]) => ({ clause_category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      sections.compliance = {
        recent_uploads: uploadsResult.data || [],
        severity_distribution: severityDist,
        category_distribution: categoryDist,
      };
    }

    // ── TICKER ────────────────────────────────────────────────
    if (section === "all" || section === "ticker") {
      const [briefingsResult, ceoBriefsResult] = await Promise.all([
        supabaseAdmin
          .from("ticker_briefings")
          .select(
            "id, event_title, generation_status, quality_score, quality_passed, word_count, section_count, tier, generated_at, model_used"
          )
          .order("generated_at", { ascending: false })
          .limit(10),
        supabaseAdmin
          .from("ceo_daily_briefs")
          .select(
            "brief_date, headline, mood, progress_summary, week_focus, financials, metrics_snapshot, key_achievements"
          )
          .order("brief_date", { ascending: false })
          .limit(5),
      ]);

      sections.ticker = {
        briefings: briefingsResult.data || [],
        ceo_briefs: ceoBriefsResult.data || [],
      };
    }

    return jsonResponse({
      generated_at: new Date().toISOString(),
      ceo_user_id: CEO_USER_ID,
      sections,
    });
  } catch (err) {
    console.error("ceo-dashboard-data error:", err);
    return jsonResponse(
      { error: "Internal error assembling dashboard data", code: 500 },
      500
    );
  }
});
