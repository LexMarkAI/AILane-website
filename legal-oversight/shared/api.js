/* =============================================================================
 * AILANE Deal-Room API Wrappers
 * AILANE-AMD-REG-001 / AMD-107 (Stage F.2 front-end rebuild)
 *
 * Drop into: /legal-oversight/shared/api.js
 *
 * Wrappers for:
 *   - dealroom-document-fetch v2 Edge Function (signed URL resolution)
 *   - dealroom-documents-catalog table queries (catalog listing + templates)
 *   - dealroom_uploads table queries (upload status)
 *   - pricing_quote_function Postgres function (live deal-creator quote)
 *   - pricing_tier + pricing_modifier table queries (deal-creator catalog)
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
  // Eileen v9 — deal-room conversational interface
  // Calls eileen-dealroom Edge Function v9 (verify_jwt=true).
  // Returns: { response, session_id, ef_version: 'v9', document_context_*: ..., ... }
  // ============================================================
  async function askEileen({ clid, messages }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    if (!clid) throw new Error('clid required');
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages must be a non-empty array of {role, content}');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/eileen-dealroom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ clid, messages }),
    });

    let payload;
    try { payload = await response.json(); } catch (e) { payload = { error: 'Invalid response' }; }

    if (!response.ok) {
      const err = new Error(payload?.error || `HTTP ${response.status}`);
      err.detail = payload?.detail || payload?.reason;
      err.status = response.status;
      throw err;
    }
    return payload;
  }

  // ============================================================
  // Counterparty-named conversations — dealroom-conversation-save v1
  // Actions: save | update | list | fetch | soft_delete
  // ============================================================
  async function _callConversationSave(body) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/dealroom-conversation-save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    let payload;
    try { payload = await response.json(); } catch (e) { payload = { error: 'Invalid response', ok: false }; }

    if (!response.ok || payload.ok === false) {
      const err = new Error(payload?.error || `HTTP ${response.status}`);
      err.detail = payload?.details;
      err.status = response.status;
      throw err;
    }
    return payload;
  }

  async function saveConversation({ clid, conversation_name, messages, topic_signals, eileen_session_id, conversation_metadata }) {
    if (!clid) throw new Error('clid required');
    if (!conversation_name || typeof conversation_name !== 'string') throw new Error('conversation_name required');
    if (!Array.isArray(messages)) throw new Error('messages must be an array');
    return _callConversationSave({
      action: 'save',
      clid,
      conversation_name: conversation_name.trim(),
      messages,
      topic_signals: topic_signals || [],
      eileen_session_id: eileen_session_id || null,
      conversation_metadata: conversation_metadata || {},
    });
  }

  async function listConversations(clid) {
    if (!clid) throw new Error('clid required');
    const result = await _callConversationSave({ action: 'list', clid });
    return result.conversations || [];
  }

  async function fetchConversation(conversation_id) {
    if (!conversation_id) throw new Error('conversation_id required');
    const result = await _callConversationSave({ action: 'fetch', conversation_id });
    return result.conversation;
  }

  async function softDeleteConversation(conversation_id) {
    if (!conversation_id) throw new Error('conversation_id required');
    return _callConversationSave({ action: 'soft_delete', conversation_id });
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
    askEileen,
    saveConversation,
    listConversations,
    fetchConversation,
    softDeleteConversation,
    classifyDocument,
    formatPence,
    formatPenceFull,
  };
})();
