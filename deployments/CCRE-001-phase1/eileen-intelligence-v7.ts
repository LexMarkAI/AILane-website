// eileen-intelligence/index.ts — v9 (CCRE-001 Path B refactor)
// AILANE-SPEC-CCRE-001 v1.0 (AMD-047, ratified 13 April 2026)
//
// CHANGE FROM v5:
//   The hardcoded SYSTEM_PROMPT_CONSTITUTIONAL const has been removed.
//   System prompt is now loaded at request time from platform_config:
//     - key: eileen_intelligence_active_version    → version pointer ("1", "2", ...)
//     - key: eileen_intelligence_prompt_v{N}       → prompt text for version N
//   All other logic is unchanged: CORS, rate limiting, auth (manual JWT decode),
//   RAG retrieval (match_provisions / match_cases), Voyage embeddings, compliance
//   findings context injection, conversation history, score-violation scrubber,
//   kl_eileen_conversations logging, and the Claude model fallback chain.
//
// PRIOR LINEAGE PRESERVED:
//   Constitutional guardrails — no clause drafting, mandatory legal advice referral,
//   remediation disclaimer, language correction.
//   AILANE-SPEC-KLIA-001 (AMD-034) | KLUX-001 (AMD-036) | KLIA-001-AM-001 (AMD-037)
//   | KLAC-001-AM-006 (AMD-043) | CCRE-001 (AMD-047)
//
// ROLLBACK:
//   UPDATE platform_config SET value = '1' WHERE key = 'eileen_intelligence_active_version';
//   (instant; no function redeploy required)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://ailane.ai',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With, apikey',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

const MODEL_CHAIN = [
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'claude-3-5-sonnet-20241022',
  'claude-haiku-4-5-20251001',
];

const SESSION_EXPIRED_RESPONSE = `Your Knowledge Library session has ended. Thank you for spending time with me \u2014 I hope the intelligence was valuable.

If you'd like to continue, you have a few options:
\u2022 **Quick Session** (\u00a329, 2 hours) \u2014 includes 1 Contract Compliance Check
\u2022 **Day Pass** (\u00a349, 24 hours) \u2014 includes 2 checks
\u2022 **Research Week** (\u00a399, 7 days) \u2014 includes 3 checks
\u2022 **Operational** (\u00a3199/month) \u2014 5 monitored contracts with auto-rescan and alerts

You can purchase a new session at [ailane.ai/kl-access/](https://ailane.ai/kl-access/).

---
*This analysis is regulatory intelligence grounded in Ailane's Knowledge Library. It does not constitute legal advice. AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720) trading as Ailane.*`;

async function callClaude(
  apiKey: string,
  system: string,
  messages: Array<{role: string; content: string}>,
  maxTokens: number = 2000,
  abortMs: number = 60000
): Promise<{ text: string; model: string; ms: number }> {
  const t0 = Date.now();
  const errors: string[] = [];
  for (const model of MODEL_CHAIN) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), abortMs);
    try {
      console.log(`[eileen v6] Trying ${model}...`);
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (r.status === 401) { const b = await r.text(); throw new Error(`API key rejected (401): ${b.slice(0, 200)}`); }
      if (r.status === 404 || r.status === 529) { errors.push(`${model}: ${r.status}`); await r.text(); continue; }
      if (!r.ok) { const b = await r.text(); errors.push(`${model}: ${r.status} ${b.slice(0, 150)}`); continue; }
      const d = await r.json();
      const text = d.content?.find((b: any) => b.type === 'text')?.text;
      if (!text) throw new Error(`Empty response from ${model}`);
      console.log(`[eileen v6] \u2713 ${model} in ${Date.now() - t0}ms`);
      return { text, model, ms: Date.now() - t0 };
    } catch (e) {
      clearTimeout(timer);
      if ((e as Error).message?.includes('401')) throw e;
      if ((e as Error).name === 'AbortError') { errors.push(`${model}: aborted after ${abortMs}ms`); continue; }
      errors.push(`${model}: ${(e as Error).message}`);
      continue;
    }
  }
  throw new Error(`All models failed: ${errors.join(' | ')}`);
}

async function checkRateLimit(supabase: ReturnType<typeof createClient>, ip: string): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - 60000).toISOString();
    const { count } = await supabase.from('rate_limits').select('*', { count: 'exact', head: true })
      .eq('ip_address', ip).eq('function_name', 'eileen-intelligence').gte('created_at', windowStart);
    if ((count ?? 0) >= 20) return false;
    await supabase.from('rate_limits').insert({ ip_address: ip, function_name: 'eileen-intelligence', created_at: new Date().toISOString() });
    return true;
  } catch { return true; }
}

async function checkSessionValidity(supabase: ReturnType<typeof createClient>, userId: string): Promise<{ valid: boolean; sessionId?: string; productType?: string }> {
  try {
    const { data: session } = await supabase.from('kl_sessions').select('id, product_type, expires_at')
      .eq('user_id', userId).eq('status', 'active').gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (session) return { valid: true, sessionId: session.id, productType: session.product_type };
  } catch (e) { console.warn(`[eileen v6] Session check: ${(e as Error).message}`); }
  try {
    const { data: profile } = await supabase.from('kl_account_profiles').select('subscription_tier').eq('user_id', userId).maybeSingle();
    if (profile?.subscription_tier && !['per_session', 'none', ''].includes(profile.subscription_tier)) return { valid: true };
  } catch (e) { console.warn(`[eileen v6] Profile check: ${(e as Error).message}`); }
  try {
    const { data: appUser } = await supabase.from('app_users').select('tier').eq('id', userId).maybeSingle();
    if (appUser?.tier && !['per_session', 'none', ''].includes(appUser.tier)) return { valid: true };
  } catch (e) { console.warn(`[eileen v6] app_users check: ${(e as Error).message}`); }
  return { valid: false };
}

function containsScoreViolation(text: string): boolean {
  const patterns = [
    /your (?:acei|rri|cci) (?:score|rating|index) is \d/i,
    /score of \d{1,3}/i,
    /(?:acei|rri|cci):\s*\d{1,3}/i,
    /exposure score.*\d{2,3}/i,
  ];
  return patterns.some((p) => p.test(text));
}

async function buildComplianceFindingsContext(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  try {
    const { data: recentUpload } = await supabase.from('compliance_uploads')
      .select('id, file_name, overall_score, translated_pillar_score, status, created_at')
      .eq('user_id', userId)
      .in('status', ['complete', 'sparse_report'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!recentUpload) return '';

    const analysisAge = Date.now() - new Date(recentUpload.created_at).getTime();
    if (analysisAge > 24 * 60 * 60 * 1000) return '';

    const { data: currentFindings } = await supabase.from('compliance_findings')
      .select('severity, clause_category, clause_text, finding_detail, remediation, statutory_ref, is_forward_looking, forward_effective_date, forward_source_act')
      .eq('upload_id', recentUpload.id)
      .eq('is_forward_looking', false)
      .order('created_at', { ascending: true });

    const { data: forwardFindings } = await supabase.from('compliance_findings')
      .select('severity, clause_category, clause_text, finding_detail, remediation, statutory_ref, is_forward_looking, forward_effective_date, forward_source_act')
      .eq('upload_id', recentUpload.id)
      .eq('is_forward_looking', true)
      .order('created_at', { ascending: true });

    const cf = currentFindings || [];
    const ff = forwardFindings || [];

    if (cf.length === 0 && ff.length === 0) return '';

    const sevCounts: Record<string, number> = {};
    for (const f of cf) sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1;

    let ctx = '\n\n=== RECENT COMPLIANCE ANALYSIS RESULTS (from Ailane Compliance Engine) ===\n';
    ctx += `Document: ${recentUpload.file_name}\n`;
    ctx += `Overall Score: ${recentUpload.overall_score}%\n`;
    ctx += `Status: ${recentUpload.status}\n`;
    ctx += `Summary: ${sevCounts.critical || 0} critical, ${sevCounts.major || 0} major, ${sevCounts.minor || 0} minor, ${sevCounts.compliant || 0} compliant\n\n`;

    const nonCompliant = cf.filter(f => f.severity !== 'compliant');
    if (nonCompliant.length > 0) {
      ctx += 'CURRENT LAW FINDINGS (non-compliant only):\n';
      for (const f of nonCompliant) {
        ctx += `\n[${f.severity.toUpperCase()}] ${f.clause_category} (${f.statutory_ref})\n`;
        ctx += `Clause: ${f.clause_text?.substring(0, 200)}\n`;
        ctx += `Finding: ${f.finding_detail?.substring(0, 300)}\n`;
        if (f.remediation) ctx += `Remediation direction: ${f.remediation.substring(0, 300)}\n`;
      }
    }

    const fwdNonCompliant = ff.filter(f => f.severity !== 'compliant');
    if (fwdNonCompliant.length > 0) {
      ctx += '\nFORWARD LEGISLATIVE HORIZON FINDINGS (non-compliant only):\n';
      for (const f of fwdNonCompliant) {
        ctx += `\n[${f.severity.toUpperCase()} \u2014 Forward] ${f.clause_category} (${f.statutory_ref})\n`;
        ctx += `Effective: ${f.forward_effective_date || 'TBC'} | Source: ${f.forward_source_act || 'ERA 2025'}\n`;
        ctx += `Finding: ${f.finding_detail?.substring(0, 300)}\n`;
        if (f.remediation) ctx += `Remediation direction: ${f.remediation.substring(0, 300)}\n`;
      }
    }

    const compliantCount = cf.filter(f => f.severity === 'compliant').length;
    if (compliantCount > 0) {
      ctx += `\n${compliantCount} requirements were assessed as COMPLIANT (not listed above).\n`;
    }

    ctx += '\nYou have full knowledge of these findings. When the user asks about "the findings", "missing provisions", "the issues", "the results", or refers to their compliance analysis, use this context to give specific, detailed answers. Explain what the statute requires, explain severity ratings, and help the user understand what a qualified employment solicitor would need to address. Remember: you explain the legal standard; you do NOT draft replacement clause text.\n';
    ctx += '=== END COMPLIANCE FINDINGS ===\n';

    console.log(`[eileen v6] Injected compliance context: ${cf.length} current + ${ff.length} forward findings for ${recentUpload.file_name}`);
    return ctx;
  } catch (e) {
    console.warn(`[eileen v6] Compliance context failed: ${(e as Error).message}`);
    return '';
  }
}

// ── TEMPORAL INTENT DETECTION (KLIA-001 §4 / PROC-KLMAINT-001) ──

interface TemporalIntent {
  isTemporalQuery: boolean;
  targetDate: string | null;
  instrumentHint: string | null;
  sectionHint: string | null;
}

function detectTemporalIntent(message: string): TemporalIntent {
  const result: TemporalIntent = { isTemporalQuery: false, targetDate: null, instrumentHint: null, sectionHint: null };
  const msgLower = message.toLowerCase();

  // Explicit year references: "in 2020", "back in 1999"
  const yearMatch = msgLower.match(/(?:in|back in|during|around|as of|before|after|since|from|until)\s+((?:19|20)\d{2})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year < new Date().getFullYear()) {
      result.isTemporalQuery = true;
      result.targetDate = `${year}-04-01`;
    }
  }

  // Explicit date: "on 1 April 2020", "as of 6 January 2019"
  const months: Record<string, string> = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06', july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };
  const dateMatch = msgLower.match(/(?:on|as of|from|before|after|until)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+((?:19|20)\d{2})/);
  if (dateMatch) {
    result.isTemporalQuery = true;
    result.targetDate = `${dateMatch[3]}-${months[dateMatch[2]]}-${dateMatch[1].padStart(2, '0')}`;
  }

  // Historical phrasing without date
  if (!result.isTemporalQuery) {
    const patterns = [/what (?:was|were|did|used to)/, /how (?:has|have) .+ changed/, /original (?:version|text|wording|provision)/, /before (?:the|it was) (?:amended|changed|updated|reformed)/, /history of/, /previous (?:version|rate|amount|threshold|limit)/, /used to be/, /when (?:was|did) .+ (?:change|amend|introduce|increase)/];
    for (const p of patterns) { if (p.test(msgLower)) { result.isTemporalQuery = true; break; } }
  }

  // Instrument hint
  const instrumentMap: Record<string, string> = { 'minimum wage':'nmwa1998', 'national minimum wage':'nmwa1998', 'national living wage':'nmwa1998', 'nmw':'nmwa1998', 'nlw':'nmwa1998', 'employment rights act':'era1996', 'era 1996':'era1996', 'era 2025':'era2025', 'equality act':'eqa2010', 'working time':'wtr1998', 'tupe':'tupe2006', 'unfair dismissal':'era1996', 'qualifying period':'era1996', 'redundancy':'era1996', 'maternity':'mpl1999', 'paternity':'pal2002', 'flexible working':'era1996', 'holiday pay':'wtr1998', 'health and safety':'hswa1974' };
  for (const [phrase, id] of Object.entries(instrumentMap)) { if (msgLower.includes(phrase)) { result.instrumentHint = id; break; } }

  // Section hint: "section 108", "s.108", "reg.16"
  const secMatch = msgLower.match(/(?:section|s\.?|§)\s*(\d+[a-z]?)/);
  if (secMatch) result.sectionHint = `s.${secMatch[1]}`;
  const regMatch = msgLower.match(/(?:regulation|reg\.?)\s*(\d+[a-z]?)/);
  if (regMatch) result.sectionHint = `reg.${regMatch[1]}`;

  return result;
}

async function resolveTemporalContext(supabase: any, intent: TemporalIntent): Promise<string> {
  if (!intent.isTemporalQuery) return '';
  try {
    if (intent.instrumentHint && intent.sectionHint && intent.targetDate) {
      const { data, error } = await supabase.rpc('resolve_provision_at_date', { p_instrument_id: intent.instrumentHint, p_section_num: intent.sectionHint, p_target_date: intent.targetDate });
      if (!error && data && data.length > 0) {
        const v = data[0];
        return '\n\n--- TEMPORAL RESOLUTION (from kl_versions) ---\n' +
          `Instrument: ${v.instrument_id} | Section: ${v.section_num}\n` +
          `Effective from: ${v.effective_from || 'unknown'} | Effective to: ${v.effective_to || 'current'}\n` +
          `Text at ${intent.targetDate}: ${v.text}\n` +
          `Amended by: ${v.amended_by || 'N/A'}\nSource URL: ${v.source_url || 'N/A'}\n` +
          `Policy rationale: ${v.policy_rationale || 'N/A'}\n` +
          `Resolution source: ${v.resolution_source}\nIs current version: ${v.is_current}\n` +
          '--- END TEMPORAL RESOLUTION ---\n';
      }
    }
    if (intent.instrumentHint && intent.targetDate) {
      const { data, error } = await supabase.from('kl_versions').select('*').eq('instrument_id', intent.instrumentHint).lte('effective_from', intent.targetDate).or(`effective_to.is.null,effective_to.gte.${intent.targetDate}`).order('section_num').limit(10);
      if (!error && data && data.length > 0) {
        let ctx = `\n\n--- TEMPORAL RESOLUTION (from kl_versions — ${data.length} records) ---\nInstrument: ${intent.instrumentHint} | Target date: ${intent.targetDate}\n`;
        for (const v of data) { ctx += `\nSection ${v.section_num} (${v.effective_from} to ${v.effective_to || 'current'}):\n  Text: ${v.text?.substring(0, 500)}${(v.text?.length || 0) > 500 ? '...' : ''}\n  Amended by: ${v.amended_by || 'N/A'}\n`; }
        return ctx + '--- END TEMPORAL RESOLUTION ---\n';
      }
    }
    if (intent.isTemporalQuery && !intent.targetDate) {
      return '\n\n--- TEMPORAL CONTEXT NOTE ---\nThe user appears to be asking a historical/temporal question. The kl_versions table contains temporal version records across multiple instruments. If you need a specific historical text, ask the user for the approximate date they are interested in.\n--- END TEMPORAL CONTEXT NOTE ---\n';
    }
  } catch (err) { console.error('Temporal resolution error:', err); }
  return '';
}

// ── EMPLOYMENT LIMITS RUNTIME QUERY (PROC-KLMAINT-001 §5) ──

async function fetchCurrentLimits(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('kl_employment_limits')
      .select('category, name, value, unit, effective_from, source_instrument')
      .is('effective_to', null)
      .order('category')
      .order('name');

    if (error || !data || data.length === 0) return '';

    const unitLabels: Record<string, string> = {
      per_hour: '/hour', per_week: '/week', per_day: '/day',
      per_year: '/year', lump_sum: ''
    };

    let ctx = '\n\n--- CURRENT EMPLOYMENT RATES AND LIMITS (from kl_employment_limits) ---\n';
    ctx += 'These are the authoritative current figures. ALWAYS cite these over training data.\n\n';

    let currentCategory = '';
    for (const row of data) {
      if (row.category !== currentCategory) {
        currentCategory = row.category;
        const label = currentCategory.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        ctx += `\n${label}:\n`;
      }
      ctx += `  ${row.name}: £${row.value}${unitLabels[row.unit] || ''} (from ${row.effective_from}, ${row.source_instrument || 'source pending'})\n`;
    }

    ctx += '\n--- END CURRENT EMPLOYMENT RATES AND LIMITS ---\n';
    return ctx;
  } catch (err) {
    console.error('[eileen v8] Employment limits query error:', err);
    return '';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const ANTHROPIC_API_KEY = (Deno.env.get('ANTHROPIC_API_KEY') || '').trim();
  const VOYAGE_API_KEY = (Deno.env.get('VOYAGE_API_KEY') || '').trim();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: CORS_HEADERS });
  if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: CORS_HEADERS });
  if (!VOYAGE_API_KEY) return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: CORS_HEADERS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
  const token = authHeader.replace('Bearer ', '');
  let userId: string;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    userId = payload.sub;
  } catch { return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: CORS_HEADERS }); }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // --- PROMPT LOADING FROM platform_config (CCRE-001 Path B refactor) ---
  // Replaces hardcoded SYSTEM_PROMPT_CONSTITUTIONAL const.
  // Prompt text lives in platform_config; version pointer gates which one is active.
  // Fail loudly (HTTP 500) if config is missing — never fall back to empty/default.
  // Rollback: UPDATE platform_config SET value = '1' WHERE key = 'eileen_intelligence_active_version';
  const { data: versionRow, error: versionErr } = await supabase
    .from('platform_config')
    .select('value')
    .eq('key', 'eileen_intelligence_active_version')
    .maybeSingle();
  if (versionErr || !versionRow?.value) {
    console.error(`[eileen v6] Missing active_version config: ${versionErr?.message ?? 'not found'}`);
    return new Response(
      JSON.stringify({ error: 'System prompt version not configured (eileen_intelligence_active_version)' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
  const activeVersion = versionRow.value;

  const { data: promptRow, error: promptErr } = await supabase
    .from('platform_config')
    .select('value')
    .eq('key', `eileen_intelligence_prompt_v${activeVersion}`)
    .maybeSingle();
  if (promptErr || !promptRow?.value) {
    console.error(`[eileen v6] Missing prompt v${activeVersion}: ${promptErr?.message ?? 'not found'}`);
    return new Response(
      JSON.stringify({ error: `System prompt v${activeVersion} not found (eileen_intelligence_prompt_v${activeVersion})` }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
  const SYSTEM_PROMPT_CONSTITUTIONAL: string = promptRow.value;
  console.log(`[eileen v6] Loaded prompt v${activeVersion} (${SYSTEM_PROMPT_CONSTITUTIONAL.length} chars)`);
  // --- END PROMPT LOADING ---

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const allowed = await checkRateLimit(supabase, clientIp);
  if (!allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), { status: 429, headers: CORS_HEADERS });

  const sessionCheck = await checkSessionValidity(supabase, userId);
  if (!sessionCheck.valid) {
    console.log(`[eileen v6] Session expired for user ${userId.slice(0, 8)}...`);
    return new Response(JSON.stringify({ response: SESSION_EXPIRED_RESPONSE, session_id: null, provisions_count: 0, cases_count: 0, session_expired: true }), { status: 200, headers: CORS_HEADERS });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const message: string = body.message || '';
    const temporalIntent = detectTemporalIntent(message);
    const sessionId: string = body.session_id || sessionCheck.sessionId || crypto.randomUUID();
    const pageContext: string = body.page_context || 'knowledge-library';
    if (!message.trim()) return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: CORS_HEADERS });

    let queryEmbedding: number[] = [];
    try {
      const voyageResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VOYAGE_API_KEY}` },
        body: JSON.stringify({ model: 'voyage-law-2', input: [message], input_type: 'query' }),
      });
      if (voyageResponse.ok) {
        const voyageData = await voyageResponse.json();
        queryEmbedding = voyageData.data[0].embedding;
      } else {
        console.error(`[eileen v6] Voyage error: ${voyageResponse.status}`);
      }
    } catch (embErr) {
      console.error(`[eileen v6] Voyage exception: ${(embErr as Error).message}`);
    }

    let retrievedProvisions: any[] = [];
    let retrievedCases: any[] = [];
    if (queryEmbedding.length > 0) {
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      try {
        const { data: provisions } = await supabase.rpc('match_provisions', { query_embedding: embeddingStr, match_threshold: 0.3, match_count: 10 });
        if (provisions) retrievedProvisions = provisions;
      } catch (e) { console.error(`[eileen v6] match_provisions: ${(e as Error).message}`); }
      try {
        const { data: cases } = await supabase.rpc('match_cases', { query_embedding: embeddingStr, match_threshold: 0.3, match_count: 5 });
        if (cases) retrievedCases = cases;
      } catch (e) { console.error(`[eileen v6] match_cases: ${(e as Error).message}`); }
    }

    let ragContext = '';
    if (retrievedProvisions.length > 0) {
      ragContext += '\n\n=== RETRIEVED STATUTORY PROVISIONS (from Ailane Knowledge Library) ===\n';
      ragContext += 'Use these as your primary authority. Cite them precisely.\n\n';
      for (const p of retrievedProvisions) {
        ragContext += `--- ${p.instrument_id} ${p.section_num}: ${p.title} ---\n`;
        ragContext += `Text: ${p.current_text}\n`;
        if (p.key_principle) ragContext += `Key Principle: ${p.key_principle}\n`;
        if (p.summary) ragContext += `Summary: ${p.summary}\n`;
        if (!p.in_force) ragContext += `\u26a0\ufe0f NOT YET IN FORCE\n`;
        if (p.acei_category) ragContext += `ACEI Category: ${p.acei_category}\n`;
        ragContext += `Similarity: ${(p.similarity * 100).toFixed(1)}%\n\n`;
      }
    }
    if (retrievedCases.length > 0) {
      ragContext += '\n=== RETRIEVED LEADING CASES ===\n';
      ragContext += 'Cite these by name and citation.\n\n';
      for (const c of retrievedCases) {
        ragContext += `--- ${c.name} ${c.citation} (${c.court}, ${c.year}) ---\n`;
        if (c.principle) ragContext += `Principle: ${c.principle}\n`;
        if (c.held) ragContext += `Held: ${c.held}\n`;
        if (c.significance) ragContext += `Significance: ${c.significance}\n`;
        if (c.bailii_url) ragContext += `BAILII: ${c.bailii_url}\n`;
        ragContext += `Similarity: ${(c.similarity * 100).toFixed(1)}%\n\n`;
      }
    }
    if (ragContext === '') {
      ragContext = '\n\n[No provisions or cases matched with sufficient similarity. Answer from general knowledge of UK employment law.]\n';
    }

    const complianceContext = await buildComplianceFindingsContext(supabase, userId);
    ragContext += complianceContext;

    // Temporal resolution from kl_versions
    const temporalContext = await resolveTemporalContext(supabase, temporalIntent);
    // Current employment rates and limits from kl_employment_limits
    const limitsContext = await fetchCurrentLimits(supabase);

    let conversationHistory: { role: string; content: string }[] = [];
    try {
      const { data: history } = await supabase.from('kl_eileen_conversations')
        .select('user_message, eileen_response').eq('session_id', sessionId)
        .order('created_at', { ascending: true }).limit(5);
      if (history && history.length > 0) {
        for (const h of history) {
          conversationHistory.push({ role: 'user', content: h.user_message });
          conversationHistory.push({ role: 'assistant', content: h.eileen_response });
        }
      }
    } catch (histErr) { console.warn(`[eileen v6] History: ${(histErr as Error).message}`); }

    const currentDate = new Date().toISOString().split('T')[0];
    const dateContext = `\n\nCRITICAL TEMPORAL CONTEXT: Today is ${currentDate}. Key ERA 2025 dates: ACAS Early Conciliation extended to 12 weeks from 1 Dec 2025 (IN FORCE). Day-one paternity/parental leave from 6 Apr 2026 (IN FORCE). Unfair dismissal qualifying period reduces from 2 years to 6 months on 1 Jan 2027. Compensatory award cap removed 1 Jan 2027. Time limit for unfair dismissal claims extends from 3 to 6 months from Oct 2026. SI 2026/310 limits effective 6 Apr 2026: weekly pay cap \u00a3751, max basic award \u00a322,530.\n`;
    const fullSystemPrompt = SYSTEM_PROMPT_CONSTITUTIONAL + dateContext + ragContext + temporalContext + limitsContext;
    const messages = [...conversationHistory, { role: 'user', content: message }];

    const result = await callClaude(ANTHROPIC_API_KEY, fullSystemPrompt, messages, 2000, 60000);

    let finalResponse = result.text;
    if (containsScoreViolation(result.text)) {
      console.warn('[eileen v6] Score violation detected');
      finalResponse = 'I can identify which areas of employment law exposure this matter engages, but I cannot compute or disclose exposure scores in conversation \u2014 those are available in your Ailane dashboard.\n\nWhat I can do is walk you through the statutory provisions and case law that are relevant to your situation. Would you like me to do that?\n\nThis analysis is regulatory intelligence grounded in Ailane\'s Knowledge Library. It does not constitute legal advice and does not establish a solicitor-client relationship. AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720) trading as Ailane.';
    }

    const responseTimeMs = Date.now() - startTime;
    try {
      await supabase.from('kl_eileen_conversations').insert({
        session_id: sessionId, user_id: userId, is_authenticated: true,
        user_message: message, eileen_response: finalResponse,
        guide_ids_used: [], guide_slugs_used: [],
        categories_matched: retrievedProvisions.map((p: any) => p.acei_category).filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
        provisions_retrieved: retrievedProvisions.map((p: any) => `${p.instrument_id}:${p.section_num}`),
        cases_retrieved: retrievedCases.map((c: any) => c.citation),
        rag_provision_count: retrievedProvisions.length, rag_case_count: retrievedCases.length,
        total_context_tokens: fullSystemPrompt.length + message.length,
        response_time_ms: responseTimeMs, claude_model_used: result.model,
        detected_knowledge_level: 'adaptive', page_context: pageContext,
        user_agent: req.headers.get('user-agent') || null,
      });
    } catch (logErr) { console.error(`[eileen v6] Logging: ${(logErr as Error).message}`); }

    return new Response(JSON.stringify({ response: finalResponse, session_id: sessionId, provisions_count: retrievedProvisions.length, cases_count: retrievedCases.length }), { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    const errMsg = (err as Error).message || 'Unknown error';
    console.error(`[eileen v6] FATAL: ${errMsg}`);
    return new Response(JSON.stringify({ error: 'Eileen is temporarily unavailable. Please try again.', detail: errMsg }), { status: 502, headers: CORS_HEADERS });
  }
});
