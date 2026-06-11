/* =============================================================================
 * Charity Onboarding Room — REST + Edge Function wrappers
 * AILANE-CC-BRIEF-CSO-ROOM-WEB-001 §1 · RULE 2 pattern throughout:
 * raw fetch() with Authorization: Bearer + apikey — never sb.from().
 * Every caller treats a failed call as a graceful-degrade branch, not an error.
 * ============================================================================= */
(function () {
  'use strict';

  var CFG = window.CHARITY_ROOM;

  function headers(state, json) {
    var token = (state && state.token) || CFG.SUPABASE_ANON_KEY;
    var h = {
      'apikey': CFG.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + token
    };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function restGet(state, path) {
    var res = await fetch(CFG.SUPABASE_URL + '/rest/v1/' + path, { headers: headers(state, false) });
    if (!res.ok) {
      var e = new Error('rest ' + res.status);
      e.status = res.status;
      throw e;
    }
    return await res.json();
  }

  async function restPost(state, path, body) {
    var h = headers(state, true);
    h['Prefer'] = 'return=minimal';
    var res = await fetch(CFG.SUPABASE_URL + '/rest/v1/' + path, {
      method: 'POST',
      headers: h,
      body: JSON.stringify(body)
    });
    if (res.status !== 201) {
      var e = new Error('rest ' + res.status);
      e.status = res.status;
      throw e;
    }
    return true;
  }

  /* ── Entry gate — dealroom_terms_acceptance (charity_room_entry) ── */
  function getEntryAcceptance(state) {
    return restGet(state,
      'dealroom_terms_acceptance?select=accepted_at,terms_version,privacy_version' +
      '&clid=eq.' + encodeURIComponent(CFG.CLID) +
      '&email=eq.' + encodeURIComponent(state.email) +
      '&acceptance_method=eq.charity_room_entry&limit=1');
  }

  function postEntryAcceptance(state) {
    return restPost(state, 'dealroom_terms_acceptance', {
      clid: CFG.CLID,
      user_id: state.session && state.session.user ? state.session.user.id : null,
      email: state.email,
      terms_version: CFG.TERMS_VERSION,
      privacy_version: CFG.PRIVACY_VERSION,
      acceptance_method: 'charity_room_entry',
      user_agent: navigator.userAgent
    });
  }

  /* ── Document acceptances (charity_room_document, NDA / Agreement) ── */
  function getDocAcceptances(state) {
    return restGet(state,
      'dealroom_terms_acceptance?select=terms_version,accepted_at' +
      '&clid=eq.' + encodeURIComponent(CFG.CLID) +
      '&email=eq.' + encodeURIComponent(state.email) +
      '&acceptance_method=eq.charity_room_document');
  }

  function postDocAcceptance(state, docCode, versionLabel) {
    return restPost(state, 'dealroom_terms_acceptance', {
      clid: CFG.CLID,
      user_id: state.session && state.session.user ? state.session.user.id : null,
      email: state.email,
      terms_version: docCode + '@' + (versionLabel || 'v1'),
      privacy_version: CFG.PRIVACY_VERSION,
      acceptance_method: 'charity_room_document',
      user_agent: navigator.userAgent
    });
  }

  /* ── Document catalog (dealroom_documents_catalog) ── */
  function getCatalog(state) {
    return restGet(state,
      'dealroom_documents_catalog?select=document_id,kind,doc_code,name,description,available_from_phase,version_label,display_order' +
      '&clid=eq.' + encodeURIComponent(CFG.CLID) +
      '&deleted_at=is.null&order=available_from_phase.asc,display_order.asc');
  }

  /* ── Gate state (partner_clids) ── */
  function getGateState(state) {
    return restGet(state,
      'partner_clids?select=gate_state,counterparty_name' +
      '&clid=eq.' + encodeURIComponent(CFG.CLID) + '&limit=1');
  }

  /* ── Feedback (charity_room_feedback) ── */
  function getFeedback(state) {
    return restGet(state,
      'charity_room_feedback?select=feedback_type,message,context_ref,created_at' +
      '&clid=eq.' + encodeURIComponent(CFG.CLID) +
      '&order=created_at.desc&limit=50');
  }

  function postFeedback(state, type, message, contextRef) {
    return restPost(state, 'charity_room_feedback', {
      clid: CFG.CLID,
      user_id: state.session && state.session.user ? state.session.user.id : null,
      email: state.email,
      feedback_type: type,
      message: message,
      context_ref: contextRef || null
    });
  }

  /* ── Contract Vault (charity_contract_vault + charity-vault bucket) ──
   * Tables/policies arrive via BACKEND-002 + provisioning; every caller
   * treats failure as the "vault opens at provisioning" degrade state.
   * select=* and client-side sorting keep the reads schema-tolerant. */
  function getVault(state) {
    return restGet(state, 'charity_contract_vault?select=*&clid=eq.' + encodeURIComponent(CFG.CLID));
  }

  function postVaultRow(state, row) {
    return restPost(state, 'charity_contract_vault', Object.assign({ clid: CFG.CLID }, row));
  }

  async function uploadVaultFile(state, filename, file) {
    var res = await fetch(CFG.SUPABASE_URL + '/storage/v1/object/' + CFG.VAULT_BUCKET + '/' +
      encodeURIComponent(CFG.CLID) + '/' + encodeURIComponent(filename), {
      method: 'PUT',
      headers: {
        'apikey': CFG.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + ((state && state.token) || CFG.SUPABASE_ANON_KEY),
        'Content-Type': (file && file.type) || 'application/octet-stream'
      },
      body: file
    });
    if (!res.ok) {
      var e = new Error('storage ' + res.status);
      e.status = res.status;
      throw e;
    }
    return true;
  }

  /* ── Statute alerts (charity_statute_alerts — BACKEND-002) ── */
  function getStatuteAlerts(state) {
    return restGet(state, 'charity_statute_alerts?select=*&clid=eq.' + encodeURIComponent(CFG.CLID));
  }

  /* ── Eileen EF (eileen-charityroom) — may not be deployed yet ── */
  async function eileenCall(state, body) {
    var res = await fetch(CFG.EILEEN_EF_URL, {
      method: 'POST',
      headers: headers(state, true),
      body: JSON.stringify(Object.assign({ clid: CFG.CLID }, body))
    });
    if (!res.ok) {
      var e = new Error('eileen ' + res.status);
      e.status = res.status;
      throw e;
    }
    return await res.json();
  }

  function askEileen(state, messages) { return eileenCall(state, { messages: messages }); }
  function getDocumentLinks(state) { return eileenCall(state, { action: 'document_links' }); }
  function getDocumentLink(state, documentId) { return eileenCall(state, { action: 'document_link', document_id: documentId }); }

  /* ── Display helpers ── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return String(iso); }
  }

  /* Statute alert card (charity_statute_alerts) — schema-tolerant mapping;
   * Tier 5 wording on commencement-class alerts (WEB-002 §6/§7). */
  function alertCardHtml(r) {
    var classification = r.classification || r.alert_class || r.category || '';
    var headline = r.headline || r.title || r.summary || '';
    var date = r.alert_date || r.effective_date || r.commencement_date || r.created_at || null;
    var source = r.source_citation || r.citation || r.source || r.provenance || '';
    var state = String(r.state || r.status || '').toLowerCase();
    var isCommencement = String(classification).toLowerCase().indexOf('commencement') !== -1;
    var stateCls = state === 'acknowledged' ? 'green' : (state === 'seen' ? 'cyan' : 'gold');

    var chips = '';
    if (classification) chips += '<span class="chip gold">' + esc(classification) + '</span>';
    if (date) chips += '<span class="chip">' + esc(fmtDate(date)) + '</span>';
    if (state) chips += '<span class="chip ' + stateCls + '">' + esc(state) + '</span>';

    return '<div class="alert-card">' +
      (headline ? '<div class="ah">' + esc(headline) + '</div>' : '') +
      (chips ? '<div class="im">' + chips + '</div>' : '') +
      (source ? '<div class="as">' + esc(source) + '</div>' : '') +
      (isCommencement ? '<div class="as">Subject to change before commencement.</div>' : '') +
      '</div>';
  }

  /* Countdown chip text — computed client-side from a YYYY-MM-DD due date */
  function countdown(dueIso) {
    if (!dueIso) return { text: 'Date set at provisioning', cls: '' };
    var due = new Date(dueIso + 'T00:00:00');
    if (isNaN(due.getTime())) return { text: 'Date set at provisioning', cls: '' };
    var days = Math.ceil((due.getTime() - Date.now()) / 86400000);
    if (days < 0) return { text: 'Due date passed — review', cls: 'red' };
    if (days === 0) return { text: 'Due today', cls: 'red' };
    if (days <= 30) return { text: days + ' day' + (days === 1 ? '' : 's') + ' to go', cls: 'gold' };
    return { text: days + ' days to go', cls: 'green' };
  }

  window.charityRoomApi = {
    restGet: restGet,
    restPost: restPost,
    getEntryAcceptance: getEntryAcceptance,
    postEntryAcceptance: postEntryAcceptance,
    getDocAcceptances: getDocAcceptances,
    postDocAcceptance: postDocAcceptance,
    getCatalog: getCatalog,
    getGateState: getGateState,
    getFeedback: getFeedback,
    postFeedback: postFeedback,
    getVault: getVault,
    postVaultRow: postVaultRow,
    uploadVaultFile: uploadVaultFile,
    getStatuteAlerts: getStatuteAlerts,
    askEileen: askEileen,
    getDocumentLinks: getDocumentLinks,
    getDocumentLink: getDocumentLink,
    esc: esc,
    fmtDate: fmtDate,
    countdown: countdown,
    alertCardHtml: alertCardHtml
  };
})();
