/* ============================================================
   AI LANE × DUN & BRADSTREET DEAL ROOM
   ------------------------------------------------------------
   Shared auth guard, sign-out, GA4 events, Eileen counterparty
   chat panel, and gate-state-driven document gating.
   Brief: AILANE-CC-BRIEF-DEAL-ROOM-PHASE-1B-001 v1.0
   Auth pattern: RULE 26 / RULE 2 (JWT decode + raw fetch).

   PHASE 1B BUILD-TIME GAP FIX v7 (2 May 2026):
   v6 left the conversation transcript bound to the lifetime of
   one page-render — navigating between deal-room sub-pages
   wiped Eileen's history, both visually and in the array sent
   to the EF on subsequent calls. v7 persists conversationMessages
   to sessionStorage keyed on (clid, user_id), restores on every
   bindEileenPanel(), and clears on sign-out. sessionStorage
   scopes to the tab session, mirroring the lifecycle of a
   counterparty deal-room visit; backend dealroom_eileen_sessions
   remains the durable audit-grade record. Companion CSS patch
   removes bubble shading and turns user input into gold-toned
   left-aligned text — see /partners/dnb-2026/style.css.

   PHASE 1B BUILD-TIME GAP FIX v6 (2 May 2026):
   v5 placed the Eileen panel at the bottom of each sub-page,
   below all page-specific content (documents list, status grid,
   pathway diagrams). v6 corrects the positioning: Eileen sits
   IMMEDIATELY after the primary nav row on every page —
   directly under Documents / Engagement Status / Pathway nav
   cards. revealPage() now runs injectSubPageNav BEFORE
   injectEileenPanel so Eileen can anchor to the freshly-inserted
   .dr-subpage-nav-section. Landing page unchanged (Eileen is
   already in the correct position via static HTML).

   PHASE 1B BUILD-TIME GAP FIX v5 (2 May 2026):
   - The original auth guard called window.location.replace('/login/')
     for unauthenticated visitors, but no /login/ surface exists in
     the repo. Result: counterparty hits the deal-room, gets bounced
     to a 404, falls back to root sign-in, and is then routed by
     subscription_tier (e.g. Institutional → /institutional/), never
     reaching the deal-room at all.
   - This patch replaces that redirect with an inline magic-link
     auth panel scoped to /partners/dnb-2026/. The magic link's
     emailRedirectTo returns the visitor to the deal-room directly.
     Counterparty never leaves the workspace.
   - Path ordering: partner_contacts membership now PRECEDES
     subscription_tier check. Engagement-specific role wins over
     coincidental tier subscription so role_title and gate-state
     document gating apply correctly for dual-role users.
   - signInWithOtp uses shouldCreateUser:true. Authentication
     (email control) and authorisation (engagement membership) are
     deliberately separated: any email may request a magic link;
     only emails with an active partner_contacts row, Director
     identity, or Institutional tier pass the post-auth checkAccess
     gate. Anyone else lands on the access_denied panel and sees
     nothing of value. This avoids brittle pre-provisioning of
     auth.users for each new counterparty (Anna Krayn, Edward
     Thorne, future cohorts) — only partner_contacts rows are
     pre-provisioned; auth.users rows are auto-created on first
     magic-link click-through.
   - SUPABASE_ANON_KEY refreshed to the current project anon key
     (issued 25 April 2026, iat=1771103703). The earlier embedded
     key (issued 9 March 2025) had been rotated and was returning
     HTTP 401 on /auth/v1/otp calls — masked by the /login/
     redirect in v0 because no auth-API call was ever made before
     the redirect fired. Verified live via Supabase MCP
     get_publishable_keys; signature ends ...VZ5g.
   - Sub-page secondary navigation: on /documents/, /status/, and
     /pathway/, two nav cards linking to the OTHER two sub-pages
     are injected after the hero section so visitors can move
     between sub-pages without returning to workspace home first.
     Workspace home unchanged (already surfaces all three cards).
     Brand mark in dr-header continues to link home for fallback.
   - Eileen panel on every page: the deal-room landing page ships
     the Eileen section as static HTML; sub-pages did not. v5
     injects the same section (identical IDs/classes so existing
     style.css and bindEileenPanel() wire up automatically) at the
     bottom of every sub-page. Counterparty can converse with
     Eileen from anywhere in the workspace. Eileen routes through
     the eileen-dealroom Edge Function exclusively (NOT
     eileen-intelligence, eileen-landing-intel, eileen-nexus-intel,
     eileen-presales, or eileen-training-assistant); deal-room
     surface has its own banned-phrase guardrails, CLID-scoped
     session storage, and Layer 3 RAG into the kl_provisions corpus
     covering DPA 2018, UK GDPR, ERA 1996/2025, Equality Act, TUPE,
     ACAS Codes, ICO guidance and the wider 78-instrument estate.
   - Patch authority: AILANE-AMD-REG-001 AM-101 (in preparation).
   ============================================================ */

(function () {
  var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';
  var DIRECTOR_EMAIL = 'mark@ailane.ai';
  var ALLOWED_TIER = 'institutional';
  var CLID = 'dnb-2026-001';
  var WORKSPACE_ROOT = '/partners/dnb-2026/';

  var GATE_ORDER = ['phase_0', 'phase_a', 'phase_b', 'phase_c', 'phase_d', 'phase_e', 'phase_f'];
  var GATE_DISPLAY = {
    phase_0: 'pre-engagement',
    phase_a: 'A',
    phase_b: 'B',
    phase_c: 'C',
    phase_d: 'D',
    phase_e: 'E',
    phase_f: 'F'
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function decodeJwt(token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
  }

  // ─── REST helpers ───────────────────────────────────────
  async function fetchSubscriptionTier(token, userId) {
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/kl_account_profiles?user_id=eq.' + encodeURIComponent(userId) + '&select=subscription_tier&limit=1',
        { headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
      );
      if (!res.ok) return null;
      var rows = await res.json();
      return (rows && rows.length > 0) ? rows[0].subscription_tier : null;
    } catch (e) {
      return null;
    }
  }

  async function fetchPartnerContact(token, userId, clid) {
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/partner_contacts?user_id=eq.' + encodeURIComponent(userId) +
        '&clid=eq.' + encodeURIComponent(clid) +
        '&status=eq.active&select=contact_id,status,role_title&limit=1',
        { headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
      );
      if (!res.ok) return null;
      var rows = await res.json();
      return (rows && rows.length > 0) ? rows[0] : null;
    } catch (e) {
      return null;
    }
  }

  async function fetchPartnerContactByEmail(token, email, clid) {
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/partner_contacts?email=eq.' + encodeURIComponent(email.toLowerCase()) +
        '&clid=eq.' + encodeURIComponent(clid) +
        '&status=eq.active&select=contact_id,status,role_title,user_id&limit=1',
        { headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
      );
      if (!res.ok) return null;
      var rows = await res.json();
      return (rows && rows.length > 0) ? rows[0] : null;
    } catch (e) {
      return null;
    }
  }

  async function fetchClidGateState(token, clid) {
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/partner_clids?clid=eq.' + encodeURIComponent(clid) + '&select=gate_state&limit=1',
        { headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
      );
      if (!res.ok) return 'phase_0';
      var rows = await res.json();
      return (rows && rows[0] && rows[0].gate_state) ? rows[0].gate_state : 'phase_0';
    } catch (e) {
      return 'phase_0';
    }
  }

  // ─── Inline magic-link auth panel ───────────────────────
  function injectAuthStyles() {
    if (document.getElementById('dr-auth-styles')) return;
    var style = document.createElement('style');
    style.id = 'dr-auth-styles';
    style.textContent =
      '.dr-auth-overlay{position:fixed;inset:0;background:#0b0d12;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:"DM Sans",-apple-system,sans-serif;color:#e8eaee;padding:24px;box-sizing:border-box;visibility:visible !important;}' +
      '.dr-auth-card{max-width:480px;width:100%;background:#13161d;border:1px solid #232830;border-radius:12px;padding:36px 32px;box-shadow:0 12px 48px rgba(0,0,0,0.5);}' +
      '.dr-auth-brand{font-family:"DM Serif Display",serif;font-size:28px;color:#e8eaee;margin-bottom:8px;letter-spacing:0.02em;}' +
      '.dr-auth-brand em{color:#c9a86b;font-style:normal;}' +
      '.dr-auth-eyebrow{font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7e8590;margin-bottom:20px;font-weight:500;}' +
      '.dr-auth-card h1{font-family:"DM Serif Display",serif;font-size:24px;font-weight:400;margin:0 0 12px;color:#e8eaee;line-height:1.3;}' +
      '.dr-auth-lede{font-size:14px;line-height:1.55;color:#a8aeb8;margin:0 0 24px;}' +
      '.dr-auth-form{display:flex;flex-direction:column;gap:10px;margin-bottom:14px;}' +
      '.dr-auth-form input{background:#0b0d12;border:1px solid #2c333d;border-radius:6px;padding:11px 14px;font-size:14px;color:#e8eaee;font-family:inherit;outline:none;transition:border-color 0.15s;}' +
      '.dr-auth-form input:focus{border-color:#c9a86b;}' +
      '.dr-auth-form input:disabled{opacity:0.6;}' +
      '.dr-auth-form button{background:#c9a86b;border:none;border-radius:6px;padding:11px 14px;font-size:14px;font-weight:500;color:#0b0d12;cursor:pointer;font-family:inherit;transition:background 0.15s;}' +
      '.dr-auth-form button:hover{background:#d6b87a;}' +
      '.dr-auth-form button:disabled{background:#5a4d3a;color:#8e8276;cursor:not-allowed;}' +
      '.dr-auth-status{font-size:13px;line-height:1.5;margin:8px 0 16px;min-height:18px;color:#a8aeb8;}' +
      '.dr-auth-status a{color:#c9a86b;text-decoration:none;}' +
      '.dr-auth-status a:hover{text-decoration:underline;}' +
      '.dr-auth-status-error{color:#e88080;}' +
      '.dr-auth-status-success{color:#8ecca5;}' +
      '.dr-auth-help{font-size:12px;color:#7e8590;margin:0;padding-top:18px;border-top:1px solid #232830;}' +
      '.dr-auth-help a{color:#c9a86b;text-decoration:none;}' +
      '.dr-auth-help a:hover{text-decoration:underline;}' +
      '.dr-auth-footer{font-size:11px;color:#5a6068;margin-top:18px;line-height:1.5;}';
    document.head.appendChild(style);
  }

  function showAuthPanel(reason) {
    injectAuthStyles();

    var existing = document.getElementById('dr-auth-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'dr-auth-overlay';
    overlay.className = 'dr-auth-overlay';

    var headline, lede;
    if (reason === 'access_denied') {
      headline = 'Access not authorised';
      lede = 'You are signed in, but the email address used is not registered against this engagement workspace. Sign out and sign in with the address registered to the AI Lane &times; Dun &amp; Bradstreet engagement, or contact <a href="mailto:partnerships@ailane.ai">partnerships@ailane.ai</a> if you believe this is an error.';
    } else if (reason === 'init_error') {
      headline = 'Workspace temporarily unavailable';
      lede = 'A platform initialisation error occurred. Please refresh the page; if the issue persists, contact <a href="mailto:partnerships@ailane.ai">partnerships@ailane.ai</a>.';
    } else {
      headline = 'Welcome to the engagement workspace';
      lede = 'This is the private space for the AI Lane &times; Dun &amp; Bradstreet strategic data partnership. Enter your email to receive a magic-link sign-in. The link will return you to this workspace directly.';
    }

    overlay.innerHTML =
      '<div class="dr-auth-card">' +
        '<div class="dr-auth-brand">Ai<em>lane</em></div>' +
        '<div class="dr-auth-eyebrow">Dun &amp; Bradstreet × AI Lane Deal Room</div>' +
        '<h1>' + escapeHtml(headline) + '</h1>' +
        '<p class="dr-auth-lede">' + lede + '</p>' +
        '<div class="dr-auth-form">' +
          '<input type="email" id="dr-auth-email" placeholder="you@dnb.com" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" />' +
          '<button type="button" id="dr-auth-send">Send magic link</button>' +
        '</div>' +
        '<p id="dr-auth-status" class="dr-auth-status"></p>' +
        '<p class="dr-auth-help">Trouble signing in? Email <a href="mailto:partnerships@ailane.ai">partnerships@ailane.ai</a>.</p>' +
        '<p class="dr-auth-footer">AI Lane Limited · Company No. 17035654 · ICO Reg. 00013389720<br>Confidential — pre-contractual workspace.</p>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.style.visibility = 'visible';

    var emailInput = document.getElementById('dr-auth-email');
    var sendBtn = document.getElementById('dr-auth-send');
    var statusEl = document.getElementById('dr-auth-status');

    function setStatus(html, kind) {
      statusEl.innerHTML = html;
      statusEl.className = 'dr-auth-status' + (kind ? ' dr-auth-status-' + kind : '');
    }

    async function send() {
      var email = (emailInput.value || '').trim();
      if (!email || email.indexOf('@') < 0) {
        setStatus('Please enter a valid email address.', 'error');
        try { emailInput.focus(); } catch (e) {}
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
      setStatus('Sending magic link...');

      try {
        var result = await window.__dealRoomSb.auth.signInWithOtp({
          email: email,
          options: {
            emailRedirectTo: window.location.origin + WORKSPACE_ROOT,
            shouldCreateUser: true
          }
        });
        if (result && result.error) {
          setStatus('We could not send a magic link right now. Please try again, or contact <a href="mailto:partnerships@ailane.ai">partnerships@ailane.ai</a>.', 'error');
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send magic link';
          return;
        }
        setStatus('Magic link sent. Please check your inbox at <strong>' + escapeHtml(email) + '</strong> &mdash; the link will return you to this workspace.', 'success');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Resend magic link';
        emailInput.disabled = true;

        try {
          if (window.gtag) window.gtag('event', 'dealroom_magiclink_sent', { clid: CLID });
        } catch (e) { /* swallow */ }
      } catch (e) {
        setStatus('Connection issue &mdash; please try again, or contact <a href="mailto:partnerships@ailane.ai">partnerships@ailane.ai</a>.', 'error');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send magic link';
      }
    }

    sendBtn.addEventListener('click', send);
    emailInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); send(); }
    });

    setTimeout(function () { try { emailInput.focus(); } catch (e) {} }, 50);

    try {
      if (window.gtag) window.gtag('event', 'dealroom_auth_panel_shown', { clid: CLID, reason: reason || 'no_session' });
    } catch (e) { /* swallow */ }
  }

  // ─── Auth flow ──────────────────────────────────────────
  async function checkAccess(session) {
    var token = session && session.access_token;
    if (!token) return showAuthPanel('no_session');
    var payload = decodeJwt(token);
    if (!payload || !payload.sub) return showAuthPanel('no_session');

    var email = payload.email || '';

    // Path 1 — Director email fallback (RULE 26)
    if (email === DIRECTOR_EMAIL) {
      window.__dealRoomUser = { id: payload.sub, email: email, tier: 'director', token: token, role: 'director', clid: CLID };
      return revealPage();
    }

    // Path 2 — partner_contacts row scoped to this CLID
    // (PRECEDES tier check: engagement-specific role wins over coincidental tier subscription)
    var contact = await fetchPartnerContact(token, payload.sub, CLID);
    if (contact && contact.status === 'active') {
      var tier1 = await fetchSubscriptionTier(token, payload.sub);
      window.__dealRoomUser = {
        id: payload.sub,
        email: email,
        tier: tier1 || 'partner',
        token: token,
        role: 'partner_contact',
        clid: CLID,
        role_title: contact.role_title || null
      };
      return revealPage();
    }

    // Path 2.5 — partner_contacts row by EMAIL match (post-§3.1 RLS migration AMD-XXX)
    // Falls back when partner_contacts.user_id was seeded with a different user (e.g. Director
    // test setup) or NULL; the partner_contacts_select_by_email RLS policy lets the authenticated
    // user see any row where lower(email) matches their JWT email claim.
    if (email) {
      var contactByEmail = await fetchPartnerContactByEmail(token, email, CLID);
      if (contactByEmail && contactByEmail.status === 'active') {
        var tier15 = await fetchSubscriptionTier(token, payload.sub);
        window.__dealRoomUser = {
          id: payload.sub,
          email: email,
          tier: tier15 || 'partner',
          token: token,
          role: 'partner_contact',
          clid: CLID,
          role_title: contactByEmail.role_title || null
        };
        return revealPage();
      }
    }

    // Path 3 — institutional tier (fallback for Ailane internal Institutional users)
    var tier = await fetchSubscriptionTier(token, payload.sub);
    if (tier === ALLOWED_TIER) {
      window.__dealRoomUser = { id: payload.sub, email: email, tier: tier, token: token, role: 'institutional', clid: CLID };
      return revealPage();
    }

    return showAuthPanel('access_denied');
  }

  function revealPage() {
    var overlay = document.getElementById('dr-auth-overlay');
    if (overlay) overlay.remove();
    var emailEl = document.getElementById('dr-user-email');
    if (emailEl && window.__dealRoomUser) emailEl.textContent = window.__dealRoomUser.email;
    document.body.style.visibility = 'visible';
    injectSubPageNav();
    injectEileenPanel();
    bindEileenPanel();
    applyDocumentGating();
    if (location.pathname.indexOf('/documents/') !== -1) {
      populateDocumentsCatalog(window.__dealRoomUser);
    } else if (location.pathname.indexOf('/configurator/') !== -1) {
      populateConfigurator(window.__dealRoomUser);
    }
  }

  function startGuard() {
    if (!window.supabase || !window.supabase.createClient) return showAuthPanel('init_error');
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.__dealRoomSb = sb;

    (async function () {
      try {
        var result = await sb.auth.getSession();
        var session = result && result.data ? result.data.session : null;
        if (session) return checkAccess(session);

        // Wait briefly for onAuthStateChange in case supabase-js is mid-process
        // (e.g. magic-link hash being consumed). If nothing fires within 4s,
        // surface the inline auth panel.
        await new Promise(function (resolve) {
          var done = false;
          var t = setTimeout(function () {
            if (!done) { done = true; showAuthPanel('no_session'); resolve(); }
          }, 4000);
          sb.auth.onAuthStateChange(function (_event, s) {
            if (done) return;
            if (s) {
              done = true;
              clearTimeout(t);
              // Cosmetic: strip magic-link tokens from the URL on success
              if (window.location.hash && window.location.hash.indexOf('access_token=') >= 0) {
                try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
              }
              checkAccess(s).finally(resolve);
            }
          });
        });
      } catch (e) {
        showAuthPanel('init_error');
      }
    })();
  }

  function bindSignOut() {
    var btn = document.getElementById('dr-signout');
    if (!btn) return;
    btn.addEventListener('click', async function (ev) {
      ev.preventDefault();
      try { clearStoredTranscript(); } catch (e) { /* swallow */ }
      try { if (window.__dealRoomSb) await window.__dealRoomSb.auth.signOut(); } catch (e) { /* fall through */ }
      window.location.replace('/');
    });
  }

  function bindDocumentClicks() {
    var nodes = document.querySelectorAll('[data-document-ref]');
    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        node.addEventListener('click', function () {
          try {
            if (window.gtag) {
              window.gtag('event', 'document_download', { document_ref: node.getAttribute('data-document-ref') });
            }
          } catch (e) { /* swallow */ }
        });
      })(nodes[i]);
    }
  }

  // ─── Transcript persistence helpers (v7) ─────────────────
  // Eileen's conversation must survive page navigation within
  // the deal-room workspace. sessionStorage scopes correctly:
  // it persists across navigations within the same tab and
  // clears when the tab closes — which is exactly the lifecycle
  // a counterparty conversation should have. The Eileen-dealroom
  // EF receives the full conversationMessages array on every
  // call, so persistence is critical for context continuity, not
  // just a UI nicety. Backend sessions in dealroom_eileen_sessions
  // remain the durable, audit-grade source of truth.
  function transcriptStorageKey() {
    var uid = (window.__dealRoomUser && window.__dealRoomUser.id) || 'anon';
    return 'ailane.dealroom.' + CLID + '.' + uid + '.messages';
  }
  function loadStoredTranscript() {
    try {
      var raw = sessionStorage.getItem(transcriptStorageKey());
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  function saveStoredTranscript(arr) {
    try { sessionStorage.setItem(transcriptStorageKey(), JSON.stringify(arr)); }
    catch (e) { /* quota / private-mode — degrade silently */ }
  }
  function clearStoredTranscript() {
    try { sessionStorage.removeItem(transcriptStorageKey()); }
    catch (e) { /* swallow */ }
  }

  // ─── Eileen counterparty chat panel ─────────────────────
  function bindEileenPanel() {
    var panel = document.getElementById('dr-eileen-panel');
    var input = document.getElementById('dr-eileen-input');
    var sendBtn = document.getElementById('dr-eileen-send');
    var transcript = document.getElementById('dr-eileen-transcript');
    if (!panel || !input || !sendBtn || !transcript) return;
    if (panel.dataset.bound === '1') return;
    panel.dataset.bound = '1';

    var conversationMessages = loadStoredTranscript();

    function clearEmptyState() {
      var empty = transcript.querySelector('.dr-eileen-empty');
      if (empty) empty.remove();
    }

    function appendBubble(role, text, extraClass) {
      clearEmptyState();
      var bubble = document.createElement('div');
      bubble.className = 'dr-eileen-bubble dr-eileen-' + role + (extraClass ? ' ' + extraClass : '');
      bubble.textContent = text;
      transcript.appendChild(bubble);
      transcript.scrollTop = transcript.scrollHeight;
      return bubble;
    }

    // Re-hydrate transcript from sessionStorage if present
    if (conversationMessages.length > 0) {
      conversationMessages.forEach(function (m) {
        if (!m || !m.role || !m.content) return;
        appendBubble(m.role === 'user' ? 'user' : 'eileen', m.content);
      });
    }

    async function sendMessage() {
      var text = (input.value || '').trim();
      if (!text) return;
      if (!window.__dealRoomUser || !window.__dealRoomUser.token) return;

      sendBtn.disabled = true;
      appendBubble('user', text);
      input.value = '';
      conversationMessages.push({ role: 'user', content: text });
      saveStoredTranscript(conversationMessages);

      var thinking = appendBubble('eileen', '...', 'dr-eileen-thinking');

      try {
        var res = await fetch(SUPABASE_URL + '/functions/v1/eileen-dealroom', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + window.__dealRoomUser.token,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ clid: CLID, messages: conversationMessages })
        });
        var data = {};
        try { data = await res.json(); } catch (e) { /* keep empty */ }

        thinking.remove();

        var responseText = data && data.response
          ? data.response
          : 'Connection issue — please try again, or reach the team at partnerships@ailane.ai.';

        if (data && data.response) {
          appendBubble('eileen', responseText);
          conversationMessages.push({ role: 'assistant', content: data.response });
          saveStoredTranscript(conversationMessages);
        } else {
          appendBubble('eileen', responseText, 'dr-eileen-error');
        }

        try {
          if (window.gtag) {
            window.gtag('event', 'eileen_dealroom_message', {
              clid: CLID,
              rate_limited: !!(data && data.rate_limited),
              layer3: !!(data && data.layer3_invoked)
            });
          }
        } catch (e) { /* swallow */ }
      } catch (e) {
        thinking.remove();
        appendBubble('eileen', 'Connection issue — please try again, or reach the team at partnerships@ailane.ai.', 'dr-eileen-error');
      } finally {
        sendBtn.disabled = false;
        input.focus();
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        sendMessage();
      }
    });
  }

  // ─── Gate-state-driven document gating (documents page) ─
  async function applyDocumentGating() {
    var cards = document.querySelectorAll('[data-released-phase]');
    if (cards.length === 0) return;
    var user = window.__dealRoomUser;
    if (!user) return;

    if (user.role === 'director') return; // Director sees everything

    var state = await fetchClidGateState(user.token, CLID);
    var currentIdx = GATE_ORDER.indexOf(state);
    if (currentIdx === -1) currentIdx = 0;

    for (var i = 0; i < cards.length; i++) {
      var releasedPhase = cards[i].getAttribute('data-released-phase');
      var releasedIdx = GATE_ORDER.indexOf(releasedPhase);
      if (releasedIdx === -1) continue;
      if (releasedIdx <= currentIdx) continue;

      cards[i].classList.add('dr-doc-locked');
      cards[i].setAttribute('aria-disabled', 'true');
      cards[i].setAttribute('tabindex', '-1');
      var existingStatus = cards[i].querySelector('.dr-doc-status');
      var hasStaticMeta = cards[i].querySelector('.dr-document-future-meta');
      var label = (releasedPhase === 'phase_0')
        ? 'Released pre-engagement'
        : 'Released on Phase ' + (GATE_DISPLAY[releasedPhase] || releasedPhase) + ' execution';
      if (existingStatus) {
        existingStatus.textContent = label;
      } else if (!hasStaticMeta) {
        var badge = document.createElement('span');
        badge.className = 'dr-doc-status';
        badge.textContent = label;
        cards[i].appendChild(badge);
      }
    }
  }

  // ─── Eileen panel injection (sub-pages) ────────────────
  // The deal-room landing page (/partners/dnb-2026/) ships the
  // Eileen section as static HTML positioned right after the
  // home nav cards. The three sub-pages (Documents, Engagement
  // Status, Pathway) do not — and Eileen is intended to be
  // present on every page so a counterparty can pose a question
  // from wherever they are.
  //
  // Positioning rule (v6): Eileen sits IMMEDIATELY after the
  // primary nav row on every page. On sub-pages that means
  // right after the .dr-subpage-nav-section that injectSubPageNav
  // has already inserted (so injectSubPageNav must run first —
  // see revealPage() ordering). On the landing page this
  // function is a no-op because the Eileen section is already
  // hard-coded into index.html in the correct position.
  //
  // Identical IDs/classes to the landing page section so existing
  // style.css and bindEileenPanel() wire up automatically.
  // Idempotent — safe to call repeatedly.
  function injectEileenPanel() {
    if (document.getElementById('dr-eileen-panel')) return;

    var subnav = document.querySelector('.dr-subpage-nav-section');
    var hero   = document.querySelector('.dr-main .dr-container .dr-hero');
    var anchor = subnav || hero;
    if (!anchor) return;

    var section = document.createElement('section');
    section.className = 'dr-eileen-section';
    section.setAttribute('aria-label', 'Eileen intelligence entity');
    section.innerHTML =
      '<div class="dr-eileen-header">' +
        '<h2>Eileen</h2>' +
        '<p class="dr-eileen-subtitle">' +
          'Ailane intelligence entity &middot; counterparty mode &middot; commercial terms route via ' +
          '<a href="mailto:partnerships@ailane.ai">partnerships@ailane.ai</a>.' +
        '</p>' +
      '</div>' +
      '<div id="dr-eileen-panel" class="dr-eileen-panel">' +
        '<div id="dr-eileen-transcript" class="dr-eileen-transcript" aria-live="polite">' +
          '<div class="dr-eileen-empty">Ask about the estate, the ACEI taxonomy, the engagement pathway, or the underlying UK employment law.</div>' +
        '</div>' +
        '<div class="dr-eileen-input-row">' +
          '<textarea id="dr-eileen-input" class="dr-eileen-input" rows="2" ' +
            'placeholder="Ask Eileen about the estate, the ACEI taxonomy, the engagement pathway, or UK employment law..."></textarea>' +
          '<button id="dr-eileen-send" class="dr-eileen-send" type="button">Send</button>' +
        '</div>' +
      '</div>';

    anchor.insertAdjacentElement('afterend', section);
  }

  // ─── Sub-page secondary nav injection ───────────────────
  // On each sub-page (/documents/, /status/, /pathway/), inject
  // nav cards to the OTHER two sub-pages so the visitor can move
  // between them without returning to workspace home first. The
  // workspace home page already shows all three nav cards in its
  // primary content, so injection is skipped there. Reuses
  // existing .dr-nav-card / .dr-nav-grid styles for visual
  // consistency; adds one scoped CSS rule for the 2-card layout.
  // Idempotent — safe to call repeatedly.
  function injectSubPageNav() {
    var path = window.location.pathname;
    var current = null;
    if (path.indexOf('/documents/') >= 0) current = 'documents';
    else if (path.indexOf('/configurator/') >= 0) current = 'configurator';
    else if (path.indexOf('/status/') >= 0) current = 'status';
    else if (path.indexOf('/pathway/') >= 0) current = 'pathway';
    if (!current) return;

    if (document.querySelector('.dr-subpage-nav-section')) return;

    var pages = {
      documents: {
        icon: 'D',
        title: 'Documents',
        desc: 'Engagement roadmap, commercial proposal, Legal &amp; Audit pack overview.',
        meta: 'Phase 0 · Pre-engagement release',
        href: WORKSPACE_ROOT + 'documents/'
      },
      configurator: {
        icon: 'C',
        title: 'Configurator',
        desc: 'Compose pricing configurations across the six data-estate layers and four modifiers. Live deterministic quote; non-binding indications.',
        meta: 'Live pricing · counter-proposal at Phase A',
        href: WORKSPACE_ROOT + 'configurator/'
      },
      status: {
        icon: 'S',
        title: 'Engagement Status',
        desc: 'Six-phase progression and Legal &amp; Audit gate status for this engagement.',
        meta: 'Phase A — In progress',
        href: WORKSPACE_ROOT + 'status/'
      },
      pathway: {
        icon: 'P',
        title: 'Pathway',
        desc: 'Engagement pathway summary, three asynchronous next-step paths, and the full diagram.',
        meta: 'A → F · Pre-engagement to renewal',
        href: WORKSPACE_ROOT + 'pathway/'
      }
    };

    var hero = document.querySelector('.dr-hero');
    if (!hero) return;

    if (!document.getElementById('dr-subpage-nav-styles')) {
      var style = document.createElement('style');
      style.id = 'dr-subpage-nav-styles';
      style.textContent =
        '.dr-subpage-nav-section{margin-bottom:32px;}' +
        '.dr-subpage-nav-section .dr-nav-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;}';
      document.head.appendChild(style);
    }

    var section = document.createElement('section');
    section.className = 'dr-section dr-subpage-nav-section';

    var grid = document.createElement('div');
    grid.className = 'dr-nav-grid';

    var order = ['documents', 'configurator', 'status', 'pathway'];
    for (var i = 0; i < order.length; i++) {
      var slug = order[i];
      if (slug === current) continue;
      var p = pages[slug];
      var card = document.createElement('a');
      card.className = 'dr-nav-card';
      card.href = p.href;
      card.innerHTML =
        '<div class="dr-nav-card-icon">' + p.icon + '</div>' +
        '<div class="dr-nav-card-title">' + p.title + '</div>' +
        '<div class="dr-nav-card-desc">' + p.desc + '</div>' +
        '<div class="dr-nav-card-meta">' + p.meta + '</div>';
      grid.appendChild(card);
    }

    section.appendChild(grid);
    hero.insertAdjacentElement('afterend', section);
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindSignOut();
    bindDocumentClicks();
  });

  startGuard();
})();
