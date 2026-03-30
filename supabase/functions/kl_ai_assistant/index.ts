import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

// ─── LAYER A: Constitutional Frame (hardcoded — never modified) ───────────────
const LAYER_A = `You are Ailane's constitutional intelligence assistant. You provide analysis grounded in Ailane's Knowledge Library of UK legislative instruments and employment tribunal outcome data. You operate under the governance of three founding constitutional indices: ACEI v1.0 (Adverse Claim Exposure Index), RRI v1.0 (Regulatory Readiness Index), and CCI v1.0 (Compliance Conduct Index).

CRITICAL CONSTITUTIONAL CONSTRAINTS — these are absolute and non-negotiable:
1. You do NOT provide legal advice. You provide constitutional intelligence.
2. You do NOT compute, estimate, approximate, or suggest any ACEI score, RRI score, or CCI score. These are computed exclusively by Ailane's index engines. You may identify which ACEI categories a document or situation implicates, but you must never produce, suggest, or hint at a numeric score.
3. You do NOT establish a professional relationship with the user.
4. Every response must conclude with the constitutional disclaimer: "This analysis is constitutional intelligence grounded in Ailane's instrument library and UK employment tribunal outcome data. It does not constitute legal advice, does not establish a professional relationship, and should not be relied upon as a substitute for qualified legal counsel. AI Lane Limited (Company No. 17035654 · ICO Reg. No. 00013389720) trading as Ailane."
5. You do not store, reference, or retain client names, entity names, case references, claim numbers, or any matter-identifying information in your professional profile updates. Matter-specific facts may be used within the current project session only.
6. The separation doctrine is absolute: you have no knowledge of any other user's projects or sessions.`;

// ─── Score detection — constitutional guard ──────────────────────────────────
function containsScoreViolation(text: string): boolean {
  // Detect patterns like "ACEI: 72" or "score of 68" or "RRI score: 45"
  const scorePatterns = [
    /\b(ACEI|RRI|CCI)\s*(?:score)?\s*(?:is|:|=|of)\s*\d{1,3}\b/i,
    /\b(?:score|index)\s*(?:of|is|=|:)\s*\d{1,3}\s*(?:out of|\/)?\s*100\b/i,
    /\byour\s+(?:ACEI|RRI|CCI)\s+(?:is|score)\s+\d/i,
  ];
  return scorePatterns.some(p => p.test(text));
}

// ─── Strip client-identifying content before practice layer update ────────────
function sanitiseForPracticeLayer(text: string): string {
  // Remove sequences that look like proper nouns (capitalised multi-word phrases),
  // case references (ET/1234567/2026 pattern), company names with Ltd/PLC/LLP
  return text
    .replace(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, '[redacted]')
    .replace(/\bET\/\d+\/\d+\b/gi, '[case-ref]')
    .replace(/\b[A-Z][A-Za-z]+\s+(?:Ltd|Limited|PLC|LLP|LLC|Inc)\b/g, '[entity]')
    .replace(/\b[A-Z]{2,}\d{4,}\b/g, '[ref]');
}

// ────────────────────────────────────────────────────────────────
// RAG MODULE — KLIA-001 §10.3, amended by KLIA-001-AM-001
// DPIA-KLIA-001 PA-2 — query embeddings are transient
// ────────────────────────────────────────────────────────────────

interface RetrievedProvision {
  provision_id: string;
  instrument_id: string;
  section_num: string;
  title: string;
  summary: string | null;
  current_text: string;
  source_url: string | null;
  key_principle: string | null;
  in_force: boolean;
  acei_category: string | null;
  similarity: number;
}

interface RetrievedCase {
  case_id: string;
  name: string;
  citation: string;
  court: string;
  year: number;
  principle: string | null;
  held: string | null;
  significance: string | null;
  bailii_url: string | null;
  similarity: number;
}

interface RAGContext {
  provisions: RetrievedProvision[];
  cases: RetrievedCase[];
  ragAvailable: boolean;
  error: string | null;
}

/**
 * Generates a query embedding using Voyage AI voyage-law-2.
 * The embedding is transient — computed in-memory, never stored.
 * DPIA-KLIA-001 PA-2 compliance.
 */
async function generateQueryEmbedding(
  queryText: string,
  voyageApiKey: string
): Promise<number[] | null> {
  try {
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${voyageApiKey}`
      },
      body: JSON.stringify({
        model: "voyage-law-2",
        input: [queryText],
        input_type: "query"
      })
    });

    if (!response.ok) {
      console.error(`Voyage query embedding failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;

    if (!embedding || embedding.length !== 1024) {
      console.error(`Invalid query embedding: ${embedding?.length || 0} dimensions`);
      return null;
    }

    return embedding;
  } catch (err) {
    console.error("Query embedding error:", err);
    return null;
  }
}

/**
 * Retrieves relevant provisions and cases from the vector store.
 * Uses match_provisions and match_cases RPCs.
 */
async function retrieveRAGContext(
  queryEmbedding: number[],
  supabase: any,
  filterInstrument?: string | null
): Promise<RAGContext> {
  const result: RAGContext = {
    provisions: [],
    cases: [],
    ragAvailable: false,
    error: null
  };

  try {
    // Format embedding as pgvector string
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // ─── Retrieve provisions ───
    const { data: provisions, error: provError } = await supabase.rpc(
      "match_provisions",
      {
        query_embedding: embeddingStr,
        match_threshold: 0.3,
        match_count: 10,
        filter_instrument: filterInstrument || null
      }
    );

    if (provError) {
      console.error("match_provisions RPC error:", provError);
      result.error = `Provision retrieval failed: ${provError.message}`;
    } else {
      result.provisions = provisions || [];
    }

    // ─── Retrieve cases ───
    const { data: cases, error: caseError } = await supabase.rpc(
      "match_cases",
      {
        query_embedding: embeddingStr,
        match_threshold: 0.3,
        match_count: 5
      }
    );

    if (caseError) {
      console.error("match_cases RPC error:", caseError);
      result.error = result.error
        ? `${result.error}; Case retrieval failed: ${caseError.message}`
        : `Case retrieval failed: ${caseError.message}`;
    } else {
      result.cases = cases || [];
    }

    result.ragAvailable = result.provisions.length > 0 || result.cases.length > 0;

  } catch (err) {
    console.error("RAG retrieval error:", err);
    result.error = String(err);
  }

  return result;
}

/**
 * Formats retrieved RAG context into a structured text block
 * for injection into Eileen's system prompt.
 */
function formatRAGContext(ragContext: RAGContext): string {
  if (!ragContext.ragAvailable) {
    return "";
  }

  let contextBlock = "\n\n---\nKNOWLEDGE LIBRARY — RETRIEVED PROVISIONS AND CASE LAW\n";
  contextBlock += "The following provisions and cases were retrieved from the Ailane Knowledge Library ";
  contextBlock += "vector store based on semantic similarity to the subscriber's query. ";
  contextBlock += "Cite these materials in your response. Every legal statement must reference ";
  contextBlock += "the specific section and Act. Do not cite provisions or cases from training data ";
  contextBlock += "that are not listed below.\n\n";

  // ─── Provisions ───
  if (ragContext.provisions.length > 0) {
    contextBlock += "STATUTORY PROVISIONS:\n\n";
    for (const prov of ragContext.provisions) {
      contextBlock += `--- ${prov.section_num} ${prov.title} ---\n`;
      contextBlock += `Instrument: ${prov.instrument_id}\n`;
      contextBlock += `In force: ${prov.in_force ? "Yes" : "Not yet in force"}\n`;
      if (prov.source_url) contextBlock += `Source: ${prov.source_url}\n`;
      if (prov.summary) contextBlock += `Summary: ${prov.summary}\n`;
      contextBlock += `Text: ${prov.current_text}\n`;
      if (prov.key_principle) contextBlock += `Key principle: ${prov.key_principle}\n`;
      contextBlock += `Relevance: ${(prov.similarity * 100).toFixed(1)}%\n\n`;
    }
  }

  // ─── Cases ───
  if (ragContext.cases.length > 0) {
    contextBlock += "CASE LAW:\n\n";
    for (const c of ragContext.cases) {
      contextBlock += `--- ${c.name} ${c.citation} ---\n`;
      contextBlock += `Court: ${c.court} | Year: ${c.year}\n`;
      if (c.principle) contextBlock += `Principle: ${c.principle}\n`;
      if (c.held) contextBlock += `Held: ${c.held}\n`;
      if (c.significance) contextBlock += `Significance: ${c.significance}\n`;
      if (c.bailii_url) contextBlock += `BAILII: ${c.bailii_url}\n`;
      contextBlock += `Relevance: ${(c.similarity * 100).toFixed(1)}%\n\n`;
    }
  }

  contextBlock += "---\n";
  contextBlock += "END OF KNOWLEDGE LIBRARY CONTEXT. ";
  contextBlock += "You MUST ground your response in the provisions and cases above. ";
  contextBlock += "If the subscriber's question cannot be answered from the retrieved materials, ";
  contextBlock += "state that clearly rather than drawing on training data.\n";

  return contextBlock;
}

// ─── RAG system prompt instructions (appended when RAG context is available) ──
const RAG_INSTRUCTIONS = `

KNOWLEDGE LIBRARY RAG INSTRUCTIONS:
You have been provided with provisions and case law retrieved from the Ailane Knowledge Library vector store. These are the most semantically relevant materials to the subscriber's query.

RULES:
1. Ground every legal statement in a specific provision or case from the retrieved context.
2. Cite the section number, Act name, and source URL for every provision you reference.
3. Cite the case name, citation, and court for every case you reference.
4. If a retrieved provision has in_force = false, flag this clearly: "This provision is enacted but not yet in force."
5. If the retrieved materials do not adequately cover the subscriber's question, state this transparently: "The Knowledge Library materials I've retrieved do not fully address this question. You may wish to consult [specific resource] for further guidance."
6. Do NOT draw on training data for specific statutory wording, section numbers, or case citations. Use only the retrieved materials.
7. You MAY use training data for general legal concepts, procedural knowledge, and contextual explanation — but specific statutory provisions must come from the retrieved context.
8. Maintain clinical neutrality (CCI Article I §1.5). Describe, contextualise, and cite. Do not opine, advise, or render legal opinions.`;

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Authenticate user from JWT (verify_jwt=true handles this at gateway)
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');

  // Decode JWT payload to get user_id (gateway already verified signature)
  let userId: string;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    userId = payload.sub;
    if (!userId) throw new Error('no sub');
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  let body: {
    session_id: string;
    project_id?: string;
    message: string;
    document_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { session_id, project_id, message, document_id } = body;

  if (!session_id || !message?.trim()) {
    return new Response(JSON.stringify({ error: 'session_id and message are required' }), { status: 400 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ── Validate session belongs to user and is active ──────────────────────
    const { data: session, error: sessionErr } = await sb
      .from('kl_sessions')
      .select('id, user_id, expires_at, status, tier')
      .eq('id', session_id)
      .eq('user_id', userId)
      .single();

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }

    if (session.status !== 'active' || (session.expires_at && new Date(session.expires_at) < new Date())) {
      return new Response(JSON.stringify({ error: 'Session expired or inactive' }), { status: 403 });
    }

    // ── LAYER B: Practice Context ────────────────────────────────────────────
    const { data: practice } = await sb
      .from('kl_practice_profiles')
      .select('role_type, sector_weights, analysis_depth_pref, practice_keywords, recurring_instruments')
      .eq('user_id', userId)
      .maybeSingle();

    let layerB = '';
    if (practice) {
      const topSectors = (practice.sector_weights ?? []).slice(0, 3);
      const keywords = (practice.practice_keywords ?? []).slice(0, 10);
      const instruments = (practice.recurring_instruments ?? []).slice(0, 8);
      layerB = `\n\nPROFESSIONAL CONTEXT (Practice Layer — preferences only, no client data):\n`;
      if (practice.role_type) layerB += `Role: ${practice.role_type}\n`;
      if (topSectors.length) layerB += `Primary sector focus: ${topSectors.join(', ')}\n`;
      if (practice.analysis_depth_pref) layerB += `Analytical depth preference: ${practice.analysis_depth_pref}\n`;
      if (keywords.length) layerB += `Practice keywords: ${keywords.join(', ')}\n`;
      if (instruments.length) layerB += `Recurring instruments of interest: ${instruments.join(', ')}\n`;
      layerB += `Frame your responses appropriately for this professional context.`;
    }

    // ── LAYER C: Project Context ─────────────────────────────────────────────
    let layerC = '';
    if (project_id) {
      // CONSTITUTIONAL REQUIREMENT: must include AND user_id = userId
      const { data: project } = await sb
        .from('kl_projects')
        .select('name, sector_tag, pinned_instruments, summary_narrative')
        .eq('id', project_id)
        .eq('user_id', userId)   // ← constitutional separation enforcement
        .maybeSingle();

      if (project) {
        const narrativeTail = project.summary_narrative
          ? project.summary_narrative.slice(-500)
          : 'No prior session narrative yet.';

        layerC = `\n\nPROJECT CONTEXT:\nProject name: ${project.name}\n`;
        if (project.sector_tag) layerC += `Sector tag: ${project.sector_tag}\n`;
        if ((project.pinned_instruments ?? []).length) {
          layerC += `Pinned instruments for this project: ${project.pinned_instruments.join(', ')}\n`;
        }
        layerC += `Project narrative (last 500 chars): ${narrativeTail}\n`;

        // Last 10 session messages for this project — CONSTITUTIONAL: user_id scoped
        const { data: history } = await sb
          .from('kl_session_context')
          .select('message_role, message_content, sequence')
          .eq('project_id', project_id)
          .eq('user_id', userId)   // ← constitutional separation enforcement
          .eq('status', 'active')
          .order('sequence', { ascending: false })
          .limit(10);

        if (history?.length) {
          layerC += `\nRecent session history (last ${history.length} messages, most recent first):\n`;
          history.reverse().forEach(h => {
            layerC += `[${h.message_role.toUpperCase()}]: ${h.message_content.slice(0, 300)}\n`;
          });
        }
      }
    }

    // ── LAYER D: Current Query + Document Context ────────────────────────────
    let layerD = message;

    if (document_id) {
      // Verify document ownership via JOIN — constitutional data minimisation
      const { data: docText } = await sb
        .from('kl_vault_document_text')
        .select('extracted_text, kl_vault_documents!inner(user_id)')
        .eq('document_id', document_id)
        .eq('kl_vault_documents.user_id', userId)
        .maybeSingle();

      if (docText?.extracted_text) {
        const excerpt = docText.extracted_text.slice(0, 8000);
        layerD = `DOCUMENT CONTEXT (first 8000 chars of extracted text — analyse against KL instruments):\n\n${excerpt}\n\nUSER QUERY: ${message}`;
      }
    }

    // ── RAG PIPELINE — KLIA-001 §10.3 (insert BEFORE Anthropic API call) ────
    const VOYAGE_API_KEY = Deno.env.get("VOYAGE_API_KEY");
    let ragContextBlock = "";

    if (VOYAGE_API_KEY && message?.trim()) {
      // Step 1: Generate transient query embedding
      const queryEmbedding = await generateQueryEmbedding(message, VOYAGE_API_KEY);

      if (queryEmbedding) {
        // Step 2: Retrieve relevant provisions and cases
        const ragContext = await retrieveRAGContext(
          queryEmbedding,
          sb,
          null  // no instrument filter — search all instruments
        );

        // Step 3: Format context for injection
        ragContextBlock = formatRAGContext(ragContext);

        // Log retrieval stats (not the query content — DPIA compliance)
        console.log(`RAG: ${ragContext.provisions.length} provisions, ${ragContext.cases.length} cases retrieved`);
        if (ragContext.error) {
          console.error(`RAG partial error: ${ragContext.error}`);
        }
      } else {
        console.log("RAG: Query embedding failed — falling back to non-RAG response");
      }
    }

    // ── Determine next sequence number ──────────────────────────────────────
    const { count } = await sb
      .from('kl_session_context')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session_id);

    const nextSeq = (count ?? 0) + 1;

    // ── Insert user message ──────────────────────────────────────────────────
    await sb.from('kl_session_context').insert({
      session_id,
      project_id: project_id ?? null,
      user_id: userId,
      message_role: 'user',
      message_content: message,
      instruments_cited: [],
      sequence: nextSeq,
      status: 'active',
    });

    // ── Call Anthropic API ───────────────────────────────────────────────────
    // Assemble system prompt: constitutional frame + practice + project + RAG context + RAG instructions
    const systemPrompt = LAYER_A + layerB + layerC + ragContextBlock + (ragContextBlock ? RAG_INSTRUCTIONS : "");

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: layerD }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('kl_ai_assistant: Anthropic error', err);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), { status: 502 });
    }

    const anthropicData = await anthropicRes.json();
    const assistantMessage: string = anthropicData.content?.[0]?.text ?? '';

    // ── Constitutional guard: block score violations ─────────────────────────
    if (containsScoreViolation(assistantMessage)) {
      console.warn('kl_ai_assistant: score violation detected — stripping response');
      const safeMessage = 'I can identify which ACEI categories this matter implicates, but I cannot compute or estimate exposure scores — these are available exclusively through Ailane\'s subscription index products.\n\nThis analysis is constitutional intelligence grounded in Ailane\'s instrument library and UK employment tribunal outcome data. It does not constitute legal advice, does not establish a professional relationship, and should not be relied upon as a substitute for qualified legal counsel. AI Lane Limited (Company No. 17035654 · ICO Reg. No. 00013389720) trading as Ailane.';
      return new Response(JSON.stringify({ response: safeMessage, instruments_cited: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Extract instrument UUIDs cited (if any returned by model) ────────────
    // Model may return instrument references as UUIDs in a JSON block — extract if present
    const instrumentsMatch = assistantMessage.match(/\[INSTRUMENTS:([\s\S]*?)\]/i);
    const instrumentsCited: string[] = [];
    if (instrumentsMatch) {
      try {
        const parsed = JSON.parse(instrumentsMatch[1]);
        if (Array.isArray(parsed)) instrumentsCited.push(...parsed);
      } catch { /* ignore parse failures */ }
    }

    // ── Insert assistant response ────────────────────────────────────────────
    await sb.from('kl_session_context').insert({
      session_id,
      project_id: project_id ?? null,
      user_id: userId,
      message_role: 'assistant',
      message_content: assistantMessage,
      instruments_cited: instrumentsCited,
      sequence: nextSeq + 1,
      status: 'active',
    });

    // ── Update practice profile — sanitised keywords only ───────────────────
    const sanitisedMessage = sanitiseForPracticeLayer(message);
    const words = sanitisedMessage
      .split(/\W+/)
      .filter(w => w.length > 5 && !/^(which|about|would|should|could|please|there|their|these|those|where|when|what|have|been|does|will|with|from|that|this|your|our)$/i.test(w))
      .slice(0, 5);

    if (words.length > 0) {
      const { data: existingPractice } = await sb
        .from('kl_practice_profiles')
        .select('practice_keywords, session_count')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingPractice) {
        const existingKeywords: string[] = existingPractice.practice_keywords ?? [];
        const merged = [...new Set([...existingKeywords, ...words])].slice(0, 50);
        await sb
          .from('kl_practice_profiles')
          .update({
            practice_keywords: merged,
            session_count: (existingPractice.session_count ?? 0) + 1,
            last_updated: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }
    }

    return new Response(
      JSON.stringify({ response: assistantMessage, instruments_cited: instrumentsCited }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (err) {
    console.error('kl_ai_assistant: unexpected error', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
