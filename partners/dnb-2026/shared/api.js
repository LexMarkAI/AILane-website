/* =============================================================================
 * AILANE Deal-Room API Wrappers
 * AILANE-AMD-REG-001 / AMD-107 (Stage F.2 front-end rebuild)
 *
 * Drop into: /partners/dnb-2026/shared/api.js
 *
 * Wrappers for:
 *   - dealroom-document-fetch v2 Edge Function (signed URL resolution)
 *   - dealroom-documents-catalog table queries (catalog listing + templates)
 *   - dealroom_uploads table queries (upload status)
 *   - pricing_quote_function Postgres function (live configurator quote)
 *   - pricing_tier + pricing_modifier table queries (configurator catalog)
 *   - partner_counter_proposals table insert (counter-proposal submission)
 *
 * Depends on dealroom-auth.js (window.dealroomSupabase + window.dealroomConfig).
 * ============================================================================= */

(function() {
  'use strict';

  if (!window.dealroomSupabase) {
    console.error('[dealroom-api] dealroomSupabase missing. Load auth.js before api.js.');
    return;
  }

  const supabase = window.dealroomSupabase;
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.dealroomConfig;

  // ============================================================
  // Document fetch — calls dealroom-document-fetch Edge Function
  // ============================================================
  async function fetchDocumentSignedUrl({ clid, catalog_document_id, upload_id, action = 'preview' }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const body = { clid, action };
    if (catalog_document_id) body.catalog_document_id = catalog_document_id;
    if (upload_id) body.upload_id = upload_id;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/dealroom-document-fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    let payload;
    try { payload = await response.json(); } catch (e) { payload = { error: 'Invalid response' }; }

    if (!response.ok) {
      const err = new Error(payload?.error || `HTTP ${response.status}`);
      err.detail = payload?.detail;
      err.status = response.status;
      throw err;
    }
    return payload;
  }

  // ============================================================
  // Catalog listing — releases + requirements for a CLID
  // ============================================================
  async function listCatalogDocuments(clid) {
    const { data, error } = await supabase
      .from('dealroom_documents_catalog')
      .select(`
        document_id, kind, doc_code, name, description,
        available_from_phase, version_label, mime_type, file_size_bytes,
        is_blocking_phase_advance, display_order, council_review_status,
        storage_path, notes
      `)
      .eq('clid', clid)
      .is('deleted_at', null)
      .order('available_from_phase', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function listTemplates() {
    const { data, error } = await supabase
      .from('dealroom_documents_catalog')
      .select('document_id, kind, doc_code, name, description, available_from_phase, version_label, council_review_status')
      .is('clid', null)
      .eq('kind', 'template')
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // ============================================================
  // Upload status — latest upload per requirement document
  // ============================================================
  async function getLatestUploads(clid) {
    const { data, error } = await supabase
      .from('dealroom_uploads')
      .select('upload_id, document_id, status, original_filename, file_size_bytes, version_number, created_at, reviewed_at')
      .eq('clid', clid)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by document_id, keep latest
    const byDoc = {};
    for (const up of data || []) {
      if (!byDoc[up.document_id]) byDoc[up.document_id] = up;
    }
    return byDoc;
  }

  // ============================================================
  // Pricing model — load tier ladder + modifier set
  // ============================================================
  async function loadPricingTiers() {
    const { data, error } = await supabase
      .from('pricing_tier')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function loadPricingModifiers() {
    const { data, error } = await supabase
      .from('pricing_modifier')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // ============================================================
  // Pricing quote — call pricing_quote_function via PostgREST RPC
  // ============================================================
  async function computeQuote(configSnapshot) {
    const { data, error } = await supabase.rpc('pricing_quote_function', {
      p_config_snapshot: configSnapshot,
    });
    if (error) throw error;
    return data;
  }

  // ============================================================
  // Counter-proposal submission
  // ============================================================
  async function submitCounterProposal({
    clid, configSnapshot, configSummary, counterpartyRationale,
    counterpartyTiming, urgencyFlag, parentProposalId, proposalVersion = 1
  }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const insertRow = {
      clid,
      submitted_by_user_id: session.user.id,
      submitted_by_email: session.user.email,
      proposal_version: proposalVersion,
      parent_proposal_id: parentProposalId || null,
      config_snapshot: configSnapshot,
      config_summary: configSummary || null,
      counterparty_rationale: counterpartyRationale || null,
      counterparty_timing: counterpartyTiming || null,
      urgency_flag: urgencyFlag || false,
      director_response_status: 'pending',
    };

    // estimated_annual_value_min/max are populated server-side or by trigger if present;
    // we send them too if computeQuote was already called by the caller.

    const { data, error } = await supabase
      .from('partner_counter_proposals')
      .insert(insertRow)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function listMyCounterProposals(clid) {
    const { data, error } = await supabase
      .from('partner_counter_proposals')
      .select('id, submitted_at, proposal_version, config_summary, estimated_annual_value_min, estimated_annual_value_max, director_response_status, director_response_text, director_response_at')
      .eq('clid', clid)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ============================================================
  // Phase-gating helpers
  // ============================================================
  function classifyDocument(doc, currentPhase) {
    const required = doc.available_from_phase || (doc.kind === 'template' ? 'all_phases' : 'phase_0');
    const unlocked = window.dealroomAuth.isPhaseUnlocked(currentPhase, required);
    return { ...doc, _unlocked: unlocked, _requiredPhase: required };
  }

  // ============================================================
  // Currency formatting (display layer)
  // ============================================================
  function formatPence(pence, withSymbol = true) {
    if (pence == null) return '—';
    const n = Number(pence) / 100;
    return (withSymbol ? '£' : '') + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatPenceFull(pence, withSymbol = true) {
    if (pence == null) return '—';
    const n = Number(pence) / 100;
    return (withSymbol ? '£' : '') + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ============================================================
  // Public API
  // ============================================================
  window.dealroomApi = {
    fetchDocumentSignedUrl,
    listCatalogDocuments,
    listTemplates,
    getLatestUploads,
    loadPricingTiers,
    loadPricingModifiers,
    computeQuote,
    submitCounterProposal,
    listMyCounterProposals,
    classifyDocument,
    formatPence,
    formatPenceFull,
  };
})();
