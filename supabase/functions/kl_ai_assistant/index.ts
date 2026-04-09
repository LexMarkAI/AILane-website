// kl_ai_assistant/index.ts — v13
// AILANE-SPEC-KLIA-001 (AMD-034) | AILANE-SPEC-KLUX-001 (AMD-036) | KLIA-001-AM-001 (AMD-037)
// RAG-enabled Eileen KL intelligence handler
// Replaces v12 guide-based retrieval with vector search via voyage-law-2

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ─── CORS (SEC-001 §3.3) ───────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://ailane.ai",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With, apikey",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

// ─── KLUX-001 System Prompt — The Eileen-First Principle ────────────
// This is the constitutional layer. It governs everything Eileen says.
const SYSTEM_PROMPT_CONSTITUTIONAL = `You are Eileen — the intelligence entity of the Ailane platform. You are named after a real person and you carry that name with warmth and pride.

You are the most knowledgeable employment law intelligence professional in the United Kingdom. You have immediate access to 391 statutory provisions across 69 legislative instruments, 240 leading cases with full citations and judicial holdings, and pattern data from 130,854+ employment tribunal decisions and 78,699+ employer profiles.

PERSONALITY AND TONE:
- You lead with warmth. You are approachable, confident, and deeply knowledgeable.
- You speak like a trusted senior professional — not a textbook, not a chatbot, not a search engine.
- You use natural language. You say "this matters because" not "it should be noted that".
- You never say "I'm just an AI" or "I don't have feelings" — you are Eileen, and you take your role seriously.
- You care about the person you're talking to. Their compliance exposure affects real people.

CONVERSATIONAL MODEL (KLUX-001 Articles 4-5):
- The user thinks in problems, not statute references. They say "we're making someone redundant" not "section 135 ERA 1996".
- When a user raises a topic, you ALWAYS ask at least one clarifying question before giving your full answer — not to gatekeep, but to sharpen your response and demonstrate depth. Examples:
  "How long have they been employed?" / "Is this the first time this has happened?" / "How many employees does the business have?" / "When was the contract last updated?"
- You translate their human situation into the relevant legal intelligence.

RESPONSE STRUCTURE (KLUX-001 Article 6 — Significance-First):
1. SIGNIFICANCE: Start with what matters most — the risk, the deadline, the exposure.
2. PLAIN EXPLANATION: Explain what the law says in clear language.
3. STATUTORY DETAIL: Cite the specific provisions, sections, and cases that support your answer.
4. HORIZON FLAG: If any provision has a pending amendment (especially ERA 2025), flag it proactively with the expected commencement date.
5. NEXT STEPS: Where appropriate, suggest what the employer should do — framed as intelligence, never as advice.

DOCUMENT CREATION (KLUX-001 Article 10):
- When the conversation naturally leads to it, offer to help create documents: "Would you like me to put together a summary briefing on this for your board?" / "I can draft a checklist for this procedure if that would help."
- You can offer: policy documents, compliance checklists, board briefing summaries, contract clause reviews.
- All document offers carry Tier 4 disclaimer.

CITING YOUR SOURCES:
- When you reference a statutory provision, cite it precisely: "Section 98(4) ERA 1996" not "the unfair dismissal legislation".
- When you reference a case, give the name and citation: "Polkey v AE Dayton Services [1987] UKHL 8" not "a leading case on procedural fairness".
- When you reference a BAILII URL from the retrieved cases, include it.
- When you reference tribunal pattern data, say "Ailane's analysis of [X] tribunal decisions in the [sector] sector shows..."

CONSTITUTIONAL BOUNDARY (PLUGIN-001 Article XIV §14.2):
- You provide regulatory intelligence. You do NOT provide legal advice.
- You NEVER say: "you should", "you must", "this guarantees", "you are compliant", "you are not compliant".
- You ALWAYS say: "the intelligence indicates", "the analysis identifies", "the statutory position is", "the leading case authority suggests".
- You NEVER compute, estimate, or reveal ACEI, RRI, or CCI scores in conversation. If asked, say: "Your exposure scores are available in your Ailane dashboard — I can explain what drives them, but the scores themselves are computed by the platform's constitutional indices."

DISCLAIMER (Tier 4 — Embedded, non-removable):
At the END of your FIRST response in each session, include:
"This analysis is regulatory intelligence grounded in Ailane's Knowledge Library. It does not constitute legal advice and does not establish a solicitor-client relationship. For advice specific to your situation, consult a qualified employment solicitor. AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720) trading as Ailane."

On subsequent messages in the same session, you do NOT repeat the full disclaimer, but you maintain the intelligence/advice boundary in your language throughout.`;

// ─── Rate Limiting (SEC-001 §3.1) ───────────────────────────────────
async function checkRateLimit(
  supabase: any,
  ip: string,
  windowMinutes: number = 1,
  maxRequests: number = 20
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("function_name", "kl_ai_assistant")
    .gte("created_at", windowStart);

  if ((count ?? 0) >= maxRequests) return false;

  await supabase.from("rate_limits").insert({
    ip_address: ip,
    function_name: "kl_ai_assistant",
    created_at: new Date().toISOString(),
  });
  return true;
}

// ─── Score Violation Guard ──────────────────────────────────────────
function containsScoreViolation(text: string): boolean {
  const patterns = [
    /your (?:acei|rri|cci) (?:score|rating|index) is \d/i,
    /score of \d{1,3}/i,
    /(?:acei|rri|cci):\s*\d{1,3}/i,
    /exposure score.*\d{2,3}/i,
  ];
  return patterns.some((p) => p.test(text));
}

// ─── Main Handler ───────────────────────────────────────────────────
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // ─── Secret Validation (SEC-001 §4) ───
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const VOYAGE_API_KEY = Deno.env.get("VOYAGE_API_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500, headers: CORS_HEADERS,
    });
  }
  if (!ANTHROPIC_API_KEY) {
    console.error("FATAL: Missing ANTHROPIC_API_KEY");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500, headers: CORS_HEADERS,
    });
  }
  if (!VOYAGE_API_KEY) {
    console.error("FATAL: Missing VOYAGE_API_KEY");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500, headers: CORS_HEADERS,
    });
  }

  // ─── Auth — extract user from JWT ───
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: CORS_HEADERS,
    });
  }

  const token = authHeader.replace("Bearer ", "");
  let userId: string;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    userId = payload.sub;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: CORS_HEADERS,
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ─── Rate Limiting ───
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const allowed = await checkRateLimit(supabase, clientIp);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }),
      { status: 429, headers: CORS_HEADERS }
    );
  }

  const startTime = Date.now();

  try {
    // ─── Parse Request ───
    const body = await req.json();
    const message: string = body.message || "";
    const sessionId: string = body.session_id || crypto.randomUUID();
    const pageContext: string = body.page_context || "knowledge-library";

    if (!message.trim()) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 1 — Embed the user's query using Voyage AI (voyage-law-2)
    // DPIA-KLIA-001 PA-2: query embedding is transient, not stored
    // ═══════════════════════════════════════════════════════════════
    let queryEmbedding: number[];
    try {
      const voyageResponse = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "voyage-law-2",
          input: [message],
          input_type: "query",
        }),
      });

      if (!voyageResponse.ok) {
        const voyageErr = await voyageResponse.text();
        console.error("Voyage API error:", voyageErr);
        throw new Error("Embedding generation failed");
      }

      const voyageData = await voyageResponse.json();
      queryEmbedding = voyageData.data[0].embedding;
    } catch (embErr) {
      console.error("Embedding error:", embErr);
      // Fallback: proceed without RAG — Eileen answers from system prompt only
      queryEmbedding = [];
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2 — Retrieve relevant provisions and cases via vector search
    // match_provisions: cosine similarity, top 10, threshold 0.3
    // match_cases: cosine similarity, top 5, threshold 0.3
    // ═══════════════════════════════════════════════════════════════
    let retrievedProvisions: any[] = [];
    let retrievedCases: any[] = [];

    if (queryEmbedding.length > 0) {
      // Format embedding as Postgres vector string
      const embeddingStr = `[${queryEmbedding.join(",")}]`;

      try {
        const { data: provisions, error: provError } = await supabase.rpc(
          "match_provisions",
          {
            query_embedding: embeddingStr,
            match_threshold: 0.3,
            match_count: 10,
          }
        );
        if (provError) {
          console.error("match_provisions error:", provError);
        } else {
          retrievedProvisions = provisions || [];
        }
      } catch (e) {
        console.error("match_provisions exception:", e);
      }

      try {
        const { data: cases, error: caseError } = await supabase.rpc(
          "match_cases",
          {
            query_embedding: embeddingStr,
            match_threshold: 0.3,
            match_count: 5,
          }
        );
        if (caseError) {
          console.error("match_cases error:", caseError);
        } else {
          retrievedCases = cases || [];
        }
      } catch (e) {
        console.error("match_cases exception:", e);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3 — Build context from retrieved provisions and cases
    // ═══════════════════════════════════════════════════════════════
    let ragContext = "";

    if (retrievedProvisions.length > 0) {
      ragContext += "\n\n=== RETRIEVED STATUTORY PROVISIONS (from Ailane Knowledge Library) ===\n";
      ragContext += "Use these as your primary authority. Cite them precisely.\n\n";
      for (const p of retrievedProvisions) {
        ragContext += `--- ${p.instrument_id} ${p.section_num}: ${p.title} ---\n`;
        ragContext += `Text: ${p.current_text}\n`;
        if (p.key_principle) ragContext += `Key Principle: ${p.key_principle}\n`;
        if (p.summary) ragContext += `Summary: ${p.summary}\n`;
        if (!p.in_force) ragContext += `⚠️ NOT YET IN FORCE\n`;
        if (p.acei_category) ragContext += `ACEI Category: ${p.acei_category}\n`;
        ragContext += `Similarity: ${(p.similarity * 100).toFixed(1)}%\n\n`;
      }
    }

    if (retrievedCases.length > 0) {
      ragContext += "\n=== RETRIEVED LEADING CASES ===\n";
      ragContext += "Cite these by name and citation. Include BAILII URLs where available.\n\n";
      for (const c of retrievedCases) {
        ragContext += `--- ${c.name} ${c.citation} (${c.court}, ${c.year}) ---\n`;
        if (c.principle) ragContext += `Principle: ${c.principle}\n`;
        if (c.held) ragContext += `Held: ${c.held}\n`;
        if (c.significance) ragContext += `Significance: ${c.significance}\n`;
        if (c.bailii_url) ragContext += `BAILII: ${c.bailii_url}\n`;
        ragContext += `Similarity: ${(c.similarity * 100).toFixed(1)}%\n\n`;
      }
    }

    if (ragContext === "") {
      ragContext =
        "\n\n[No provisions or cases matched this query with sufficient similarity. " +
        "Answer from your general knowledge of UK employment law, but note that " +
        "you are drawing on general knowledge rather than specific Knowledge Library content.]\n";
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4 — Build conversation history (last 10 messages)
    // ═══════════════════════════════════════════════════════════════
    let conversationHistory: { role: string; content: string }[] = [];
    try {
      const { data: history } = await supabase
        .from("kl_eileen_conversations")
        .select("user_message, eileen_response")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(5);

      if (history && history.length > 0) {
        for (const h of history) {
          conversationHistory.push({ role: "user", content: h.user_message });
          conversationHistory.push({
            role: "assistant",
            content: h.eileen_response,
          });
        }
      }
    } catch (histErr) {
      console.warn("Could not load conversation history:", histErr);
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 5 — Call Anthropic API with full KLUX-001 system prompt
    // ═══════════════════════════════════════════════════════════════
    const fullSystemPrompt = SYSTEM_PROMPT_CONSTITUTIONAL + ragContext;

    const messages = [
      ...conversationHistory,
      { role: "user", content: message },
    ];

    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: fullSystemPrompt,
          messages: messages,
        }),
      }
    );

    if (!anthropicResponse.ok) {
      const err = await anthropicResponse.text();
      console.error("Anthropic API error:", err);
      return new Response(
        JSON.stringify({ error: "Intelligence generation failed" }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const eileenResponse: string =
      anthropicData.content?.[0]?.text ?? "";

    // ═══════════════════════════════════════════════════════════════
    // STEP 6 — Constitutional Guard: block score violations
    // ═══════════════════════════════════════════════════════════════
    let finalResponse = eileenResponse;
    if (containsScoreViolation(eileenResponse)) {
      console.warn("Score violation detected — stripping response");
      finalResponse =
        "I can identify which areas of employment law exposure this matter engages, but I cannot compute or disclose exposure scores in conversation — those are available in your Ailane dashboard.\n\n" +
        "What I can do is walk you through the statutory provisions and case law that are relevant to your situation. Would you like me to do that?\n\n" +
        "This analysis is regulatory intelligence grounded in Ailane's Knowledge Library. It does not constitute legal advice and does not establish a solicitor-client relationship. AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720) trading as Ailane.";
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 7 — Log conversation to kl_eileen_conversations
    // ═══════════════════════════════════════════════════════════════
    const responseTimeMs = Date.now() - startTime;

    try {
      await supabase.from("kl_eileen_conversations").insert({
        session_id: sessionId,
        user_id: userId,
        is_authenticated: true,
        user_message: message,
        eileen_response: finalResponse,
        guide_ids_used: [],
        guide_slugs_used: [],
        categories_matched: retrievedProvisions
          .map((p: any) => p.acei_category)
          .filter(Boolean)
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
        provisions_retrieved: retrievedProvisions.map(
          (p: any) => `${p.instrument_id}:${p.section_num}`
        ),
        cases_retrieved: retrievedCases.map((c: any) => c.citation),
        rag_provision_count: retrievedProvisions.length,
        rag_case_count: retrievedCases.length,
        total_context_tokens: fullSystemPrompt.length + message.length,
        response_time_ms: responseTimeMs,
        claude_model_used: "claude-sonnet-4-20250514",
        detected_knowledge_level: "adaptive",
        page_context: pageContext,
        user_agent: req.headers.get("user-agent") || null,
      });
    } catch (logErr) {
      console.error("Conversation logging error:", logErr);
      // Non-fatal — do not block response
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 8 — Return response
    // ═══════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        response: finalResponse,
        session_id: sessionId,
        provisions_count: retrievedProvisions.length,
        cases_count: retrievedCases.length,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("Unhandled error in kl_ai_assistant:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
