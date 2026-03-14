// compliance-check Edge Function
// AILANE-SPEC-CCA-001 §6.2–§6.4 — Handbook-Aware Compliance Checker
// Constitutional basis: RRI v1.0 Art. V (Policy Alignment pillar)
//
// This function:
// 1. Receives an upload_id from the portal-upload function
// 2. Retrieves the document text and metadata from Supabase
// 3. Runs preScreen() to classify the document
// 4. Routes to the correct Layer B frame and Layer C requirement library
// 5. Sends the four-layer prompt to the Anthropic API
// 6. Stores findings and score in the database

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { HANDBOOK_REQUIREMENTS } from './handbook-requirements.ts';
import { CONTRACT_REQUIREMENTS } from './contract-requirements.ts';
import {
  LAYER_A,
  FRAME_EMPLOYMENT_CONTRACT,
  FRAME_STAFF_HANDBOOK,
  formatRequirementLibrary,
  buildSystemPrompt,
} from './prompt-layers.ts';
import { preScreen } from './pre-screen.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-session',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { upload_id } = await req.json();
    if (!upload_id) {
      return new Response(
        JSON.stringify({ error: 'Missing upload_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Retrieve upload record with extracted text
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .select('id, document_text, document_type, session_id, status')
      .eq('id', upload_id)
      .single();

    if (uploadError || !upload) {
      return new Response(
        JSON.stringify({ error: 'Upload not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const docText: string = upload.document_text;
    const declaredType: string = upload.document_type || 'contract';

    if (!docText || docText.trim().length < 50) {
      await updateUploadStatus(supabase, upload_id, 'error', 'Document text too short or empty');
      return new Response(
        JSON.stringify({ error: 'Document text too short' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── STEP 1: preScreen() — classify and scope-gate ──────────────────
    const { inScope, detectedType, reason } = await preScreen(
      docText,
      declaredType,
      anthropicApiKey,
    );

    if (!inScope) {
      await updateUploadStatus(supabase, upload_id, 'out_of_scope', reason);
      return new Response(
        JSON.stringify({ out_of_scope: true, reason }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── STEP 2: Route based on detectedType ────────────────────────────
    let layerB: string;
    let layerC: string;
    let documentTypeLabel: string;

    switch (detectedType) {
      case 'staff_handbook':
      case 'handbook':
      case 'employee_handbook':
        layerB = FRAME_STAFF_HANDBOOK;
        layerC = formatRequirementLibrary(HANDBOOK_REQUIREMENTS);
        documentTypeLabel = 'staff_handbook';
        break;

      case 'employment_contract':
      case 'contract':
      default:
        layerB = FRAME_EMPLOYMENT_CONTRACT;
        layerC = formatRequirementLibrary(CONTRACT_REQUIREMENTS);
        documentTypeLabel = 'employment_contract';
        break;
    }

    // ── STEP 3: Build four-layer system prompt ─────────────────────────
    const systemPrompt = buildSystemPrompt(layerB, layerC);

    // Layer D — user document content
    const userMessage = `Document type declared by user: "${declaredType}"
Document type detected by pre-screen: "${detectedType}"

DOCUMENT TEXT:
${docText}`;

    // ── STEP 4: Call Anthropic API ─────────────────────────────────────
    await updateUploadStatus(supabase, upload_id, 'analysing');

    const aiResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`Anthropic API error: ${aiResponse.status} — ${errText}`);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.content?.[0]?.text || '';

    // ── STEP 5: Parse AI response ──────────────────────────────────────
    let analysisResult;
    try {
      analysisResult = JSON.parse(aiText);
    } catch {
      // Try to extract JSON from response if wrapped in markdown
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    const findings = analysisResult.findings || [];
    const overallScore = Math.max(0, Math.min(100, Math.round(analysisResult.overall_score || 0)));
    const summary = analysisResult.summary || '';

    // Count findings by severity
    const findingCounts = {
      critical: 0,
      major: 0,
      minor: 0,
      compliant: 0,
    };
    for (const f of findings) {
      const sev = (f.severity || '').toLowerCase();
      if (sev === 'critical') findingCounts.critical++;
      else if (sev === 'major') findingCounts.major++;
      else if (sev === 'minor') findingCounts.minor++;
      else if (sev === 'compliant') findingCounts.compliant++;
    }

    // ── STEP 6: Store results ──────────────────────────────────────────
    // Store individual findings
    const findingRows = findings.map((f: Record<string, string>, idx: number) => ({
      upload_id,
      requirement_id: f.requirement_id || `F-${idx + 1}`,
      clause_ref: f.clause_ref || null,
      severity: f.severity || 'Minor',
      finding: f.finding || '',
      statutory_reference: f.statutory_reference || '',
      remediation: f.remediation || '',
      sort_order: idx,
    }));

    if (findingRows.length > 0) {
      const { error: findingsError } = await supabase
        .from('findings')
        .insert(findingRows);

      if (findingsError) {
        console.error('Error inserting findings:', findingsError);
      }
    }

    // Update upload record with results
    const { error: updateError } = await supabase
      .from('uploads')
      .update({
        status: 'complete',
        overall_score: overallScore,
        finding_counts: findingCounts,
        document_type_detected: documentTypeLabel,
        summary,
        total_requirements: analysisResult.total_requirements || findings.length,
        processed_at: new Date().toISOString(),
      })
      .eq('id', upload_id);

    if (updateError) {
      console.error('Error updating upload:', updateError);
    }

    // Also update the portal session status
    if (upload.session_id) {
      await supabase
        .from('portal_sessions')
        .update({
          session_status: 'complete',
          overall_score: overallScore,
          finding_counts: findingCounts,
        })
        .eq('id', upload.session_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        upload_id,
        document_type: documentTypeLabel,
        overall_score: overallScore,
        finding_counts: findingCounts,
        total_requirements: analysisResult.total_requirements || findings.length,
        summary,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('compliance-check error:', err);

    // Try to update upload status to error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const body = await req.clone().json().catch(() => ({}));
      if (body.upload_id) {
        await updateUploadStatus(supabase, body.upload_id, 'error', String(err));
      }
    } catch {
      // Best-effort error status update
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// Helper to update upload status
async function updateUploadStatus(
  supabase: ReturnType<typeof createClient>,
  uploadId: string,
  status: string,
  processingError?: string,
) {
  const update: Record<string, unknown> = { status };
  if (processingError) update.processing_error = processingError;

  await supabase
    .from('uploads')
    .update(update)
    .eq('id', uploadId);
}
