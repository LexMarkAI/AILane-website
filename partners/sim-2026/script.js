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
  var CLID = 'sim-2026-001';
  var WORKSPACE_ROOT = '/partners/sim-2026/';

  // ─── Sandbox auth bypass (AMD-111-113 frontend) ─────────
  // The sim-2026-001 surface is a public sandbox harness; pricing RPCs are anon-accessible
  // and the configurator must render immediately on cold load with zero auth flow. Real
  // deal-room CLIDs (any not in SANDBOX_CLIDS) retain the full magic-link auth gate.
  // Auth-required UI (counter-proposal submit, pipeline modal, my-submissions) is hidden
  // entirely in sandbox mode and replaced with a small "[disabled in sandbox]" note.
  var SANDBOX_CLIDS = ['sim-2026-001'];
  var IS_SANDBOX = SANDBOX_CLIDS.indexOf(CLID) !== -1;

  // Helper: build Supabase request headers. In sandbox mode, returns apikey-only headers
  // (no Authorization). In production mode, includes Authorization: Bearer <user.token>
  // when the deal-room user has a token. Pass `extra` to merge additional headers
  // (e.g. 'Accept', 'Prefer'); the helper always sets apikey + Content-Type.
  function getAuthHeaders_(extra) {
    var h = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
    if (!IS_SANDBOX) {
      var user = window.__dealRoomUser;
      if (user && user.token) h['Authorization'] = 'Bearer ' + user.token;
    }
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

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
    if (IS_SANDBOX) {
      // Sandbox: hide auth UI elements (email + sign-out) and surface a small
      // "SANDBOX — no authentication required" badge in their place.
      var emailEl = document.getElementById('dr-user-email');
      if (emailEl) emailEl.style.display = 'none';
      var signoutEl = document.getElementById('dr-signout');
      if (signoutEl) signoutEl.style.display = 'none';
      var headerRight = document.querySelector('.dr-header-right');
      if (headerRight && !document.getElementById('dr-sandbox-badge')) {
        var badge = document.createElement('span');
        badge.id = 'dr-sandbox-badge';
        badge.className = 'dr-sandbox-badge';
        badge.textContent = 'SANDBOX — no authentication required';
        headerRight.appendChild(badge);
      }
    } else {
      var emailEl2 = document.getElementById('dr-user-email');
      if (emailEl2 && window.__dealRoomUser) emailEl2.textContent = window.__dealRoomUser.email;
    }
    document.body.style.visibility = 'visible';
    // ─── Workspace shell injection (Phase 3 brief β §6.4 ordering) ───
    // revealPage is the central post-auth runtime hook called by every
    // sim-2026 page (sandbox path + magic-link path). The five injects
    // below propagate the workspace shell uniformly to every authenticated
    // surface — index, configurator, documents, pathway, status, and the
    // future auth-callback redirect target. Order matters because each
    // anchor depends on the previous element being in the DOM:
    //   subPageNav  → top of <main>
    //   authChip    → .dr-header-right (replaces legacy static UI)
    //   phaseTracker → after .dr-subpage-nav-section || .dr-hero
    //   documentVault → after #dr-phase-tracker (so they stack vertically)
    //   eileenPanel → after subpage-nav (Brief α wires content)
    // ─── AMD-120 PHASE B STOP 1 — universal-skeleton injectors ───
    // injectMenuBar runs first so injectSubPageNav (legacy two-card row)
    // can short-circuit when the menu bar is present. mountAttributionBlock
    // and populateWhatsHappening run after the page-content injectors so
    // they slot in at the bottom of <main>. The injectors are idempotent.
    injectMenuBar();
    injectSubPageNav();
    injectAuthChip();
    mountEileenExplanation();
    injectPhaseTracker();
    injectDocumentVault();
    injectEileenPanel();
    bindEileenPanel();
    applyDocumentGating();
    mountAttributionBlock();
    populateWhatsHappening();
    if (location.pathname.indexOf('/documents/') !== -1) {
      populateDocumentsCatalog(window.__dealRoomUser);
      populateArtefactsView();
    } else if (location.pathname.indexOf('/configurator/') !== -1) {
      populateConfigurator(window.__dealRoomUser);
    }
  }

  function startGuard() {
    // ─── SANDBOX AUTH BYPASS ─────────────────────────────
    // Sandbox CLIDs (sim-2026-001) skip the magic-link gate entirely and render with
    // anon-only Supabase access. Pricing RPCs are anon-accessible; auth-required surfaces
    // (submit / pipeline / my-submissions) are hidden in sandbox via IS_SANDBOX checks.
    if (IS_SANDBOX) {
      if (window.supabase && window.supabase.createClient) {
        window.__dealRoomSb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
      window.__dealRoomUser = { id: null, email: null, tier: 'sandbox', token: null, role: 'sandbox', clid: CLID };
      return revealPage();
    }

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
    // Fix 4 — typewriter animation flags (cancellable on new send)
    var eileenAnimating = false;
    var eileenAnimationCancelled = false;

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

    // Fix 4 — typewriter rendering for Eileen replies (frontend-only; no Anthropic
    // streaming dependency). New bubble gets scroll-to-top of panel rather than
    // auto-scroll-to-bottom, then characters animate at ~40 chars/sec via
    // requestAnimationFrame. Cancellable on new send (prior bubble snaps complete).
    function startEileenTypewriter(fullText) {
      clearEmptyState();
      var bubble = document.createElement('div');
      bubble.className = 'dr-eileen-bubble dr-eileen-eileen';
      bubble.textContent = '';
      transcript.appendChild(bubble);
      // Scroll START of new bubble to top of panel viewport (not auto-scroll-bottom)
      requestAnimationFrame(function () {
        try { bubble.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { /* swallow */ }
      });
      var CHARS_PER_SECOND = 40;
      var charIndex = 0;
      var lastFrame = performance.now();
      eileenAnimating = true;
      eileenAnimationCancelled = false;
      function tick(now) {
        if (eileenAnimationCancelled) {
          bubble.textContent = fullText;
          eileenAnimating = false;
          eileenAnimationCancelled = false;
          return;
        }
        var elapsed = now - lastFrame;
        var charsToAdd = Math.floor(elapsed * CHARS_PER_SECOND / 1000);
        if (charsToAdd > 0) {
          charIndex = Math.min(charIndex + charsToAdd, fullText.length);
          bubble.textContent = fullText.slice(0, charIndex);
          lastFrame = now;
        }
        if (charIndex < fullText.length) {
          requestAnimationFrame(tick);
        } else {
          eileenAnimating = false;
        }
      }
      requestAnimationFrame(tick);
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

      // Fix 4 — cancel any prior typewriter animation so prior bubble snaps to full text
      if (eileenAnimating) eileenAnimationCancelled = true;

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
          // Push to conversation immediately so subsequent sends include prior context
          conversationMessages.push({ role: 'assistant', content: data.response });
          saveStoredTranscript(conversationMessages);
          // Fix 4 — visual: typewriter render the response character-by-character
          startEileenTypewriter(data.response);
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

  // ─── Documents page: dynamic catalog from dealroom_documents_catalog ──
  // AMD-XXX §4.2(e). Live schema field names per Director Decision 1:
  //   document_id, doc_code, name, description, phase, available_from_phase,
  //   kind, version_label, display_order, storage_path, file_size_bytes.
  // Drops is_active filter (column does not exist on this table).
  // Storage_path-driven clickability + size-badge gates (clarifications i+ii):
  //   - Size badge renders ONLY when storage_path && file_size_bytes truthy
  //   - Click handler attaches ONLY when storage_path truthy
  // Director-bypass preserved for phase-locking; sandbox NULL storage_path
  // means non-clickable for everyone (Decision 2 A1 — by design).
  // EF call: { clid, catalog_document_id: doc.document_id, action: 'preview' }
  // populateDocumentsCatalog runs AFTER applyDocumentGating in revealPage()
  // for defensive ordering (gating is no-op on the empty loading state).
  async function populateDocumentsCatalog(user) {
    var grid = document.getElementById('dr-documents-grid');
    if (!grid) return;
    if (!user || !user.token) return;

    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/dealroom_documents_catalog' +
        '?clid=eq.' + encodeURIComponent(CLID) +
        '&deleted_at=is.null' +
        '&select=document_id,doc_code,name,description,phase,available_from_phase,kind,version_label,display_order,storage_path,file_size_bytes' +
        '&order=available_from_phase.asc,display_order.asc',
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + user.token,
            'Accept': 'application/json'
          }
        }
      );
      if (!res.ok) {
        grid.innerHTML = '<div class="dr-doc-empty dr-doc-empty-error">Document catalog temporarily unavailable. Please refresh, or contact <a href="mailto:partnerships@ailane.ai">partnerships@ailane.ai</a>.</div>';
        return;
      }
      var docs = await res.json();
      if (!Array.isArray(docs) || docs.length === 0) {
        grid.innerHTML = '<div class="dr-doc-empty">No documents catalogued for this CLID yet.</div>';
        return;
      }

      // Resolve current phase from partner_clids.gate_state (canonical 7-state)
      var currentPhase = await fetchClidGateState(user.token, CLID);
      var currentIdx = GATE_ORDER.indexOf(currentPhase);
      if (currentIdx === -1) currentIdx = 0;

      // Update "Currently in ..." label using GATE_DISPLAY
      var phaseLabel = document.getElementById('dr-current-phase');
      if (phaseLabel) {
        var letter = GATE_DISPLAY[currentPhase] || currentPhase;
        phaseLabel.textContent = (currentPhase === 'phase_0')
          ? 'Phase 0 — Pre-engagement'
          : 'Phase ' + letter;
      }

      grid.innerHTML = '';
      docs.forEach(function (doc) {
        var releasedPhase = doc.available_from_phase || doc.phase || 'phase_0';
        var releasedIdx = GATE_ORDER.indexOf(releasedPhase);
        var isLocked = (releasedIdx > currentIdx) && (user.role !== 'director');

        var card = document.createElement('article');
        card.className = 'dr-document-card';
        if (isLocked) {
          card.classList.add('dr-doc-locked');
          card.setAttribute('aria-disabled', 'true');
          card.setAttribute('tabindex', '-1');
        }
        card.setAttribute('role', 'listitem');
        card.setAttribute('data-document-ref', doc.doc_code || doc.document_id);
        card.setAttribute('data-released-phase', releasedPhase);

        var phaseDisplay = GATE_DISPLAY[releasedPhase] || releasedPhase;
        var statusBadge;
        if (isLocked) {
          statusBadge = '<span class="dr-doc-status">Released on Phase ' + escapeHtml(phaseDisplay) + ' execution</span>';
        } else if (releasedPhase === 'phase_0') {
          statusBadge = '<span class="dr-doc-status dr-doc-status-available">Available now</span>';
        } else {
          statusBadge = '<span class="dr-doc-status dr-doc-status-available">Available — Phase ' + escapeHtml(phaseDisplay) + '</span>';
        }

        // Size badge (clarification i): only when storage_path AND file_size_bytes both truthy
        var sizeBadge = '';
        if (doc.storage_path && doc.file_size_bytes) {
          var bytes = Number(doc.file_size_bytes);
          var sizeText;
          if (bytes < 1024) {
            sizeText = bytes + ' B';
          } else if (bytes < 1024 * 1024) {
            sizeText = Math.round(bytes / 1024) + ' KB';
          } else {
            sizeText = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
          }
          sizeBadge = '<span class="dr-document-meta-item">' + escapeHtml(sizeText) + '</span>';
        }

        var versionBadge = '<span class="dr-document-meta-item">' + escapeHtml(doc.version_label || 'v1') + '</span>';
        var kindBadge = doc.kind ? '<span class="dr-document-meta-item">' + escapeHtml(doc.kind) + '</span>' : '';

        card.innerHTML =
          '<header class="dr-document-card-header">' +
            '<h3 class="dr-document-title">' + escapeHtml(doc.name || '') + '</h3>' +
            '<span class="dr-document-ref">' + escapeHtml(doc.doc_code || '—') + '</span>' +
          '</header>' +
          '<p class="dr-document-desc">' + escapeHtml(doc.description || '') + '</p>' +
          '<footer class="dr-document-meta">' +
            versionBadge +
            kindBadge +
            sizeBadge +
            statusBadge +
          '</footer>';

        // Click handler (clarification ii): only when storage_path truthy
        if (!isLocked && doc.storage_path) {
          card.style.cursor = 'pointer';
          (function (docRef, docId) {
            card.addEventListener('click', function () {
              downloadDocument(docRef, docId);
            });
          })(doc.doc_code || doc.document_id, doc.document_id);
        }

        grid.appendChild(card);
      });
    } catch (err) {
      console.error('populateDocumentsCatalog error:', err);
      grid.innerHTML = '<div class="dr-doc-empty dr-doc-empty-error">Document catalog could not be loaded. Please try again or contact <a href="mailto:partnerships@ailane.ai">partnerships@ailane.ai</a>.</div>';
    }
  }

  async function downloadDocument(documentRef, catalogDocumentId) {
    try {
      if (window.gtag) {
        window.gtag('event', 'document_download', { clid: CLID, document_ref: documentRef });
      }
    } catch (e) { /* swallow */ }

    var user = window.__dealRoomUser;
    if (!user || !user.token) return;

    try {
      var res = await fetch(SUPABASE_URL + '/functions/v1/dealroom-document-fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + user.token,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          clid: CLID,
          catalog_document_id: catalogDocumentId,
          action: 'preview'
        })
      });
      if (!res.ok) {
        alert('Document temporarily unavailable. Please try again, or contact partnerships@ailane.ai.');
        return;
      }
      var data = await res.json();
      if (data && data.signed_url) {
        window.open(data.signed_url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Document temporarily unavailable. Please try again, or contact partnerships@ailane.ai.');
      }
    } catch (err) {
      console.error('downloadDocument error:', err);
      alert('Document download failed. Please contact partnerships@ailane.ai.');
    }
  }

  // ─── Configurator state (post-AMD-114 four-axis architecture) ─────
  // CONFIG_STATE retained for rationale/timing/urgency only — these are
  // counter-proposal form fields, orthogonal to the pricing scope/modifiers
  // payload (which lives in SCOPE_STATE / MODIFIERS_STATE below).
  // TIERS_META / MODIFIERS_META / FEATURE_FLAGS are populated from the
  // preserved REST table fetches per brief §10.4; FEATURE_FLAGS gates the
  // counter-proposal section in renderCounterProposalSection.
  // Launch-partner truth is sourced from pricing_quote_function_v4.is_launch_partner_applied
  // per AMD-118 Stage A (was: separate get_partner_launch_status RPC pre-AMD-114).
  var CONFIG_STATE = { rationale: '', timing: '', urgency: 'standard' };
  var TIERS_META = [];
  var MODIFIERS_META = [];
  var FEATURE_FLAGS = {};
  var configRecomputeTimer = null;

  // ─── AMD-114 four-axis configurator state ──────────────────────────
  // Source-of-truth for the new four-axis scope-builder payload sent to
  // compute_scope_universe / pricing_quote_function_v4. Replaces the
  // layered enrichment-stack CONFIG_STATE (kept above as transitional
  // scaffolding for submitCounterProposal until the full v4 cutover).
  var SCOPE_STATE = {
    sector:       { l1: [], l2: [] },
    geography:    { level: 'L1', values: [] },
    industry:     { level: 'L1', values: [] },
    intelligence: { acei: [], rri: [], cci: [] }
  };
  var MODIFIERS_STATE = {
    tier:         'institutional',
    refresh:      'quarterly',
    exclusivity:  'none',
    term_years:   1,
    duns_match:   false
  };
  var LAST_UNIVERSE = null;     // most recent compute_scope_universe response
  var LAST_QUOTE_V4 = null;     // most recent pricing_quote_function_v4 response
  var EXPANDED_AXIS = null;     // 'sector' | 'geography' | 'industry' | 'intelligence' | null
  var INTEL_TAB = 'acei';       // 'acei' | 'rri' | 'cci' (CCI deferred this build)
  var CEILINGS_V3 = null;       // get_pricing_ceilings_v3 payload (loaded at mount)
  var quoteRequestSeq = 0;      // monotonic guard for stale RPC results

  // ─── AMD-115 RPC helpers (raw fetch per RULE 26) ───────────────────
  async function callRpcRaw_(fnName, params) {
    var hdrs = getAuthHeaders_({ 'Accept': 'application/json' });
    var res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fnName, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify(params || {})
    });
    if (!res.ok) {
      var errBody = '';
      try { errBody = await res.text(); } catch (e) {}
      var err = new Error('RPC ' + fnName + ' failed: ' + res.status);
      err.status = res.status;
      err.body = errBody;
      err.fnName = fnName;
      throw err;
    }
    return await res.json();
  }
  async function loadCeilingsV3_() { return await callRpcRaw_('get_pricing_ceilings_v3', {}); }
  async function computeScopeUniverse_(scope) { return await callRpcRaw_('compute_scope_universe', { p_scope: scope }); }
  async function quoteV4_(scope, modifiers) {
    return await callRpcRaw_('pricing_quote_function_v4', {
      p_config_snapshot: { scope: scope, modifiers: modifiers }
    });
  }


  async function populateConfigurator(user) {
    var anchor = document.getElementById('dr-configurator-panels');
    if (!anchor) return;
    // In production a token is required; in sandbox the configurator runs anon-only on
    // pricing RPCs (Director: pricing RPCs are anon-accessible). Other auth-required
    // REST calls below are skipped in sandbox.
    if (!IS_SANDBOX && (!user || !user.token)) return;

    // AMD-114 — initialise four-axis scope state (unconstrained baseline) and modifier
    // defaults (Institutional tier, quarterly refresh, no exclusivity, 12-month term).
    SCOPE_STATE = {
      sector:       { l1: [], l2: [] },
      geography:    { level: 'L1', values: [] },
      industry:     { level: 'L1', values: [] },
      intelligence: { acei: [], rri: [], cci: [] }
    };
    MODIFIERS_STATE = {
      tier:         'institutional',
      refresh:      'quarterly',
      exclusivity:  'none',
      term_years:   1,
      duns_match:   false
    };
    LAST_UNIVERSE = null;
    LAST_QUOTE_V4 = null;
    EXPANDED_AXIS = null;
    INTEL_TAB = 'acei';
    // Counter-proposal form fields — orthogonal to the pricing payload.
    CONFIG_STATE = { rationale: '', timing: '', urgency: 'standard' };

    try { if (window.gtag) window.gtag('event', 'configurator_open', { clid: CLID }); } catch (e) { /* swallow */ }

    try {
      var hdrs = getAuthHeaders_({ 'Accept': 'application/json' });
      var sandboxToken = IS_SANDBOX ? null : user.token;
      // REST table fetches preserved per brief §10.4 (pricing_tier, pricing_modifier,
      // dealroom_feature_flags). FEATURE_FLAGS in particular drives the counter-proposal
      // section's gating in renderCounterProposalSection.
      var results = await Promise.all([
        fetch(SUPABASE_URL + '/rest/v1/pricing_tier?select=tier_code,display_name,delta_rate_pence,cumulative_rate_pence,is_enrichment_layer,sort_order&order=sort_order.asc', { headers: hdrs }),
        fetch(SUPABASE_URL + '/rest/v1/pricing_modifier?select=modifier_code,modifier_type,display_name,value_pence,value_pct,applies_to,sort_order&order=sort_order.asc', { headers: hdrs }),
        fetch(SUPABASE_URL + '/rest/v1/dealroom_feature_flags?select=feature_key,enabled', { headers: hdrs }),
        IS_SANDBOX ? Promise.resolve('phase_0') : fetchClidGateState(sandboxToken, CLID),
        loadCeilingsV3_()
      ]);
      if (results[0].ok) TIERS_META = await results[0].json();
      if (results[1].ok) MODIFIERS_META = await results[1].json();
      if (results[2].ok) {
        var flags = await results[2].json();
        FEATURE_FLAGS = {};
        for (var fi = 0; fi < flags.length; fi++) FEATURE_FLAGS[flags[fi].feature_key] = flags[fi].enabled;
      }
      var gateState = results[3] || 'phase_0';
      CEILINGS_V3 = results[4];
      renderConfigurator();
      renderCounterProposalSection(user, gateState);
      // Initial recompute — populates universe pill + per-record + annual on cold load.
      recompute_();
    } catch (err) {
      console.error('populateConfigurator error:', err);
      anchor.innerHTML = '<div class="dr-config-empty-error">Configurator could not be loaded. Please refresh, or contact <a href="mailto:partnerships@ailane.ai">partnerships@ailane.ai</a>.</div>';
    }
  }

  function renderConfigurator() {
    var anchor = document.getElementById('dr-configurator-panels');
    if (!anchor) return;
    // AMD-114 — three-panel architecture (scope-builder + modifiers + live quote)
    // replaces the AMD-088/091/106/108/111-era four-panel surface. Defensive try
    // surfaces render errors to the user rather than silently rendering an
    // incomplete panel set; underlying exception is logged for diagnosis.
    try {
      var html = renderScopeBuilderPanel_() + renderModifiersPanel_() + renderLiveQuotePanel_();
      anchor.innerHTML = html;
      bindScopeBuilderHandlers_();
    } catch (err) {
      console.error('[AMD-114] renderConfigurator threw — panel set may be incomplete:', err);
      anchor.innerHTML = '<div class="dr-config-empty-error">Configurator render error. Please refresh the page; if the issue persists, contact <a href="mailto:partnerships@ailane.ai">partnerships@ailane.ai</a>.</div>';
    }
  }

  // ─── AMD-114 three-panel render scaffolding ────────────────────────
  // Commit 1 stubs: each render function returns its panel skeleton with
  // header + an empty content slot. Subsequent commits populate the
  // axis-row content (Panel 1), modifier controls (Panel 2), and live
  // quote display (Panel 3).
  function renderScopeBuilderPanel_() {
    return '<section class="dr-config-panel dr-scope-builder-panel" aria-labelledby="dr-panel-scope-h">' +
             '<header class="dr-config-panel-header">' +
               '<span class="dr-config-panel-number">Panel 1</span>' +
               '<h2 id="dr-panel-scope-h" class="dr-config-panel-title">Scope builder</h2>' +
               '<button type="button" class="dr-scope-reset-btn" data-scope-reset>Reset all axes</button>' +
             '</header>' +
             '<p class="dr-config-panel-sub">' +
               'Compose your scope across four axes &mdash; sector, geography, industry, intelligence. ' +
               'The universe and per-record price update live as you narrow.' +
             '</p>' +
             '<div class="dr-axis-list" data-axis-list>' + renderAxisList_() + '</div>' +
           '</section>';
  }

  // ─── AMD-114 Panel 1 — axis row framework ──────────────────────────
  function renderAxisList_() {
    return renderSectorAxisRow_() +
           renderGeographyAxisRow_() +
           renderIndustryAxisRow_() +
           renderIntelligenceAxisRow_();
  }

  function getAxisMeta_(axisCode) {
    var ax = (CEILINGS_V3 && CEILINGS_V3.axes) ? CEILINGS_V3.axes[axisCode] : null;
    if (!ax) return null;
    var bumpPct = (ax.curation_bump_pct != null) ? Number(ax.curation_bump_pct) : null;
    var bumpLabel = (bumpPct != null) ? '+' + bumpPct.toFixed(0) + '% bump' : '';
    return { displayName: ax.display_name || axisCode, bumpLabel: bumpLabel, levels: ax.levels || {} };
  }

  function renderUniverseCountsLine_() {
    var u = LAST_UNIVERSE;
    if (!u) return '<span class="dr-axis-counts-loading">&mdash;</span>';
    return 'Identity <strong>' + Number(u.identity_universe || 0).toLocaleString('en-GB') + '</strong> ' +
           '&middot; Enriched <strong>' + Number(u.enriched_universe || 0).toLocaleString('en-GB') + '</strong>';
  }

  function renderAxisRowFrame_(opts) {
    var expanded = (EXPANDED_AXIS === opts.code);
    var expClass = expanded ? ' is-expanded' : '';
    return '<article class="dr-axis-row' + expClass + '" data-axis="' + escapeHtml(opts.code) + '">' +
             '<header class="dr-axis-row-header">' +
               '<div class="dr-axis-row-name">' + escapeHtml(opts.displayName) + '</div>' +
               (opts.bumpLabel ? '<div class="dr-axis-row-bump">' + escapeHtml(opts.bumpLabel) + '</div>' : '') +
               '<button type="button" class="dr-axis-row-toggle" data-axis-toggle="' + escapeHtml(opts.code) + '" aria-expanded="' + (expanded ? 'true' : 'false') + '">' +
                 (expanded ? 'Collapse' : 'Constrain') +
               '</button>' +
             '</header>' +
             '<div class="dr-axis-row-summary">' + escapeHtml(opts.summary) + '</div>' +
             '<div class="dr-axis-row-counts">' + renderUniverseCountsLine_() + '</div>' +
             (expanded ? '<div class="dr-axis-row-expanded">' + (opts.expandedHtml || '') + '</div>' : '') +
           '</article>';
  }

  // ─── Sector axis (L1 + L2 drill-down under Public) ─────────────────
  var SECTOR_L1_LABELS = { private_sector: 'Private', public_body: 'Public', third_sector: 'Third' };

  function humaniseSectorSummary_() {
    var l1 = SCOPE_STATE.sector.l1 || [];
    var l2 = SCOPE_STATE.sector.l2 || [];
    if (l1.length === 0 || l1.length === 3) return 'All sectors (no constraint)';
    if (l1.length === 1) {
      var lbl = SECTOR_L1_LABELS[l1[0]] || l1[0];
      if (l1[0] === 'public_body' && l2.length > 0) {
        return 'Public + ' + l2.length + ' sub-segment' + (l2.length === 1 ? '' : 's');
      }
      return lbl + ' sector';
    }
    return l1.map(function (c) { return SECTOR_L1_LABELS[c] || c; }).join(' + ');
  }

  function renderSectorAxisRow_() {
    var meta = getAxisMeta_('sector') || { displayName: 'Sector', bumpLabel: '+5% bump', levels: {} };
    var summary = humaniseSectorSummary_();
    var expandedHtml = (EXPANDED_AXIS === 'sector') ? renderSectorExpanded_(meta) : '';
    return renderAxisRowFrame_({
      code: 'sector', displayName: meta.displayName, bumpLabel: meta.bumpLabel,
      summary: summary, expandedHtml: expandedHtml
    });
  }

  function renderSectorExpanded_(meta) {
    var L1 = (meta.levels && meta.levels.L1) ? meta.levels.L1 : [];
    var l1Boxes = '';
    for (var i = 0; i < L1.length; i++) {
      var v = L1[i];
      var checked = (SCOPE_STATE.sector.l1.indexOf(v.value_code) !== -1) ? ' checked' : '';
      var meta2 = (v.identity_count != null)
        ? Number(v.identity_count).toLocaleString('en-GB') + ' employers'
        : '';
      l1Boxes += '<label class="dr-axis-checkbox">' +
                   '<input type="checkbox" data-sector-l1-input value="' + escapeHtml(v.value_code) + '"' + checked + '>' +
                   '<span class="dr-axis-checkbox-label">' + escapeHtml(v.display_label || v.value_code) + '</span>' +
                   (meta2 ? '<span class="dr-axis-checkbox-meta">' + escapeHtml(meta2) + '</span>' : '') +
                 '</label>';
    }
    var notice = '';
    if (SCOPE_STATE.sector.l1.length === 3) {
      notice = '<div class="dr-axis-notice">All three sectors selected = unconstrained sector axis.</div>';
    }
    var l2Block = '';
    if (SCOPE_STATE.sector.l1.length === 1 && SCOPE_STATE.sector.l1[0] === 'public_body') {
      var L2all = (meta.levels && meta.levels.L2) ? meta.levels.L2 : [];
      var L2 = [];
      for (var pi = 0; pi < L2all.length; pi++) {
        if (L2all[pi].parent_value_code === 'public_body') L2.push(L2all[pi]);
      }
      var l2Boxes = '';
      for (var j = 0; j < L2.length; j++) {
        var w = L2[j];
        var c = (SCOPE_STATE.sector.l2.indexOf(w.value_code) !== -1) ? ' checked' : '';
        var idC = (w.identity_count != null) ? Number(w.identity_count).toLocaleString('en-GB') : '—';
        var enC = (w.enriched_count != null) ? Number(w.enriched_count).toLocaleString('en-GB') : '—';
        l2Boxes += '<label class="dr-axis-checkbox dr-axis-checkbox-sub">' +
                     '<input type="checkbox" data-sector-l2-input value="' + escapeHtml(w.value_code) + '"' + c + '>' +
                     '<span class="dr-axis-checkbox-label">' + escapeHtml(w.display_label || w.value_code) + '</span>' +
                     '<span class="dr-axis-checkbox-meta">Identity ' + idC + ' &middot; Enriched ' + enC + '</span>' +
                   '</label>';
      }
      l2Block = '<fieldset class="dr-axis-fieldset dr-axis-fieldset-sub">' +
                  '<legend>Public sub-segments</legend>' +
                  '<div class="dr-axis-checkbox-grid">' + (l2Boxes || '<div class="dr-axis-empty">No L2 values returned.</div>') + '</div>' +
                '</fieldset>';
    }
    return '<fieldset class="dr-axis-fieldset">' +
             '<legend>Sector segments</legend>' +
             '<div class="dr-axis-checkbox-grid">' + (l1Boxes || '<div class="dr-axis-empty">Sector L1 catalog unavailable.</div>') + '</div>' +
             notice +
           '</fieldset>' + l2Block;
  }

  // ─── Geography axis (L1 / L2 / L3 drill-down) ──────────────────────
  var GEO_L2_LABELS = { england: 'England', scotland: 'Scotland', wales: 'Wales', ni: 'Northern Ireland' };
  var GEO_L3_LABELS = {
    london: 'London', south_east: 'South East', north_west: 'North West',
    yorkshire_humber: 'Yorkshire and the Humber', west_midlands: 'West Midlands',
    east_midlands: 'East Midlands', south_west: 'South West',
    east_of_england: 'East of England', north_east: 'North East'
  };

  function humaniseGeographySummary_() {
    var g = SCOPE_STATE.geography;
    if (g.level === 'L1' || (g.values || []).length === 0) return 'All UK';
    if (g.level === 'L2') {
      if (g.values.length === 4) return 'All UK countries';
      if (g.values.length === 1) return GEO_L2_LABELS[g.values[0]] || g.values[0];
      return g.values.length + ' countries';
    }
    if (g.level === 'L3') {
      if (g.values.length === 1) return GEO_L3_LABELS[g.values[0]] || g.values[0];
      return 'England (' + g.values.length + ' region' + (g.values.length === 1 ? '' : 's') + ')';
    }
    return 'All UK';
  }

  function renderGeographyAxisRow_() {
    var meta = getAxisMeta_('geography') || { displayName: 'Geography', bumpLabel: '+3% bump', levels: {} };
    var summary = humaniseGeographySummary_();
    var expandedHtml = (EXPANDED_AXIS === 'geography') ? renderGeographyExpanded_(meta) : '';
    return renderAxisRowFrame_({
      code: 'geography', displayName: meta.displayName, bumpLabel: meta.bumpLabel,
      summary: summary, expandedHtml: expandedHtml
    });
  }

  function renderGeographyExpanded_(meta) {
    var g = SCOPE_STATE.geography;
    var levelOpts = [
      { code: 'L1', label: 'L1 — All UK' },
      { code: 'L2', label: 'L2 — Country' },
      { code: 'L3', label: 'L3 — Region (English ITL1)' }
    ];
    var levelChips = '';
    for (var i = 0; i < levelOpts.length; i++) {
      var act = (g.level === levelOpts[i].code) ? ' is-active' : '';
      levelChips += '<button type="button" class="dr-axis-level-chip' + act + '" data-geo-level="' + levelOpts[i].code + '">' + escapeHtml(levelOpts[i].label) + '</button>';
    }
    levelChips += '<button type="button" class="dr-axis-level-chip is-disabled" disabled aria-disabled="true" title="Postcode area drill-down — by-request only">L4 — Coming soon</button>';
    levelChips += '<button type="button" class="dr-axis-level-chip is-disabled" disabled aria-disabled="true" title="Postcode district drill-down — by-request only">L5 — Coming soon</button>';

    var valuesBlock = '';
    if (g.level === 'L2') {
      var L2 = (meta.levels && meta.levels.L2) ? meta.levels.L2 : [];
      var boxes = '';
      for (var j = 0; j < L2.length; j++) {
        var v = L2[j];
        var ch = (g.values.indexOf(v.value_code) !== -1) ? ' checked' : '';
        var idC = (v.identity_count != null) ? Number(v.identity_count).toLocaleString('en-GB') + ' employers' : '';
        boxes += '<label class="dr-axis-checkbox">' +
                   '<input type="checkbox" data-geo-l2-input value="' + escapeHtml(v.value_code) + '"' + ch + '>' +
                   '<span class="dr-axis-checkbox-label">' + escapeHtml(v.display_label || v.value_code) + '</span>' +
                   (idC ? '<span class="dr-axis-checkbox-meta">' + escapeHtml(idC) + '</span>' : '') +
                 '</label>';
      }
      valuesBlock = '<fieldset class="dr-axis-fieldset">' +
                      '<legend>Country</legend>' +
                      '<div class="dr-axis-checkbox-grid">' + (boxes || '<div class="dr-axis-empty">No L2 values returned.</div>') + '</div>' +
                    '</fieldset>';
    } else if (g.level === 'L3') {
      var L3 = (meta.levels && meta.levels.L3) ? meta.levels.L3 : [];
      var b = '';
      for (var k = 0; k < L3.length; k++) {
        var w = L3[k];
        var ch2 = (g.values.indexOf(w.value_code) !== -1) ? ' checked' : '';
        var idC2 = (w.identity_count != null) ? Number(w.identity_count).toLocaleString('en-GB') + ' employers' : '';
        b += '<label class="dr-axis-checkbox">' +
               '<input type="checkbox" data-geo-l3-input value="' + escapeHtml(w.value_code) + '"' + ch2 + '>' +
               '<span class="dr-axis-checkbox-label">' + escapeHtml(w.display_label || w.value_code) + '</span>' +
               (idC2 ? '<span class="dr-axis-checkbox-meta">' + escapeHtml(idC2) + '</span>' : '') +
             '</label>';
      }
      valuesBlock = '<fieldset class="dr-axis-fieldset">' +
                      '<legend>Region (English ITL1)</legend>' +
                      '<button type="button" class="dr-axis-back-link" data-geo-back-l2>« Back to country level</button>' +
                      '<div class="dr-axis-checkbox-grid">' + (b || '<div class="dr-axis-empty">No L3 values returned.</div>') + '</div>' +
                    '</fieldset>';
    }

    return '<div class="dr-axis-level-selector"><span class="dr-axis-level-label">Granularity:</span>' + levelChips + '</div>' + valuesBlock;
  }
  // ─── Industry axis (L1 UK SIC 2007 sections; L2-L4 deferred) ───────
  function humaniseIndustrySummary_() {
    var ind = SCOPE_STATE.industry;
    var vals = ind.values || [];
    if (vals.length === 0) return 'All industries';
    if (vals.length === 1) return 'SIC Section ' + vals[0];
    if (vals.length >= 21) return 'All SIC sections';
    return vals.length + ' SIC sections';
  }

  function renderIndustryAxisRow_() {
    var meta = getAxisMeta_('industry') || { displayName: 'Industry', bumpLabel: '+6% bump', levels: {} };
    var summary = humaniseIndustrySummary_();
    var expandedHtml = (EXPANDED_AXIS === 'industry') ? renderIndustryExpanded_(meta) : '';
    return renderAxisRowFrame_({
      code: 'industry', displayName: meta.displayName, bumpLabel: meta.bumpLabel,
      summary: summary, expandedHtml: expandedHtml
    });
  }

  function renderIndustryExpanded_(meta) {
    var ind = SCOPE_STATE.industry;
    var L1 = (meta.levels && meta.levels.L1) ? meta.levels.L1 : [];
    // Order alphabetically by value_code (single-letter section A..U)
    var sorted = L1.slice().sort(function (a, b) {
      return String(a.value_code || '').localeCompare(String(b.value_code || ''));
    });
    var levelChips =
      '<button type="button" class="dr-axis-level-chip is-active" disabled aria-disabled="true">L1 — SIC Section</button>' +
      '<button type="button" class="dr-axis-level-chip is-disabled" disabled aria-disabled="true" title="SIC Division — Coming soon">L2 — Coming soon</button>' +
      '<button type="button" class="dr-axis-level-chip is-disabled" disabled aria-disabled="true" title="SIC Group — Coming soon">L3 — Coming soon</button>' +
      '<button type="button" class="dr-axis-level-chip is-disabled" disabled aria-disabled="true" title="SIC Class — Institutional tier only; Coming soon">L4 — Coming soon</button>';

    var boxes = '';
    for (var i = 0; i < sorted.length; i++) {
      var v = sorted[i];
      var ch = (ind.values.indexOf(v.value_code) !== -1) ? ' checked' : '';
      var idC = (v.identity_count != null) ? Number(v.identity_count).toLocaleString('en-GB') + ' employers' : '';
      var label = v.value_code + ' — ' + (v.display_label || v.value_code);
      boxes += '<label class="dr-axis-checkbox dr-axis-checkbox-industry">' +
                 '<input type="checkbox" data-industry-l1-input value="' + escapeHtml(v.value_code) + '"' + ch + '>' +
                 '<span class="dr-axis-checkbox-label">' + escapeHtml(label) + '</span>' +
                 (idC ? '<span class="dr-axis-checkbox-meta">' + escapeHtml(idC) + '</span>' : '') +
               '</label>';
    }

    return '<div class="dr-axis-level-selector"><span class="dr-axis-level-label">Granularity:</span>' + levelChips + '</div>' +
           '<fieldset class="dr-axis-fieldset">' +
             '<legend>UK SIC 2007 sections</legend>' +
             '<div class="dr-axis-checkbox-grid dr-axis-checkbox-grid-industry">' + (boxes || '<div class="dr-axis-empty">No L1 values returned.</div>') + '</div>' +
           '</fieldset>';
  }
  // ─── Intelligence axis (ACEI L1 / RRI L2 / CCI deferred) ───────────
  function humaniseIntelligenceSummary_() {
    var i = SCOPE_STATE.intelligence;
    var acei = (i.acei || []), rri = (i.rri || []);
    if (acei.length === 0 && rri.length === 0) return 'All matters';
    var parts = [];
    if (acei.length === 1) {
      var label = aceiDisplayLabel_(acei[0]);
      parts.push(label || acei[0]);
    } else if (acei.length > 1) {
      parts.push(acei.length + ' ACEI categor' + (acei.length === 1 ? 'y' : 'ies'));
    }
    if (rri.length === 1) {
      parts.push(rriDisplayLabel_(rri[0]) || rri[0]);
    } else if (rri.length > 1) {
      parts.push(rri.length + ' RRI band' + (rri.length === 1 ? '' : 's'));
    }
    return parts.join(' + ');
  }

  function aceiDisplayLabel_(code) {
    var meta = getAxisMeta_('intelligence');
    var L1 = (meta && meta.levels && meta.levels.L1) ? meta.levels.L1 : [];
    for (var i = 0; i < L1.length; i++) {
      if (L1[i].value_code === code) return L1[i].display_label || code;
    }
    return code;
  }
  function rriDisplayLabel_(code) {
    var meta = getAxisMeta_('intelligence');
    var L2 = (meta && meta.levels && meta.levels.L2) ? meta.levels.L2 : [];
    for (var i = 0; i < L2.length; i++) {
      if (L2[i].value_code === code) return L2[i].display_label || code;
    }
    return code;
  }

  function renderIntelligenceAxisRow_() {
    var meta = getAxisMeta_('intelligence') || { displayName: 'Intelligence', bumpLabel: '+8% bump', levels: {} };
    var summary = humaniseIntelligenceSummary_();
    var expandedHtml = (EXPANDED_AXIS === 'intelligence') ? renderIntelligenceExpanded_(meta) : '';
    return renderAxisRowFrame_({
      code: 'intelligence', displayName: meta.displayName, bumpLabel: meta.bumpLabel,
      summary: summary, expandedHtml: expandedHtml
    });
  }

  // ACEI numeric extraction: 'acei_1' → 1; used to bind --acei-N token swatches.
  function aceiOrdinal_(code) {
    var m = /^acei_(\d{1,2})$/.exec(code || '');
    return m ? parseInt(m[1], 10) : null;
  }

  function renderIntelligenceExpanded_(meta) {
    var rriDisabled = (MODIFIERS_STATE.tier === 'operational_readiness');
    var tabs = [
      { code: 'acei', label: 'ACEI', disabled: false, tip: 'ACEI categories — universal access.' },
      { code: 'rri',  label: 'RRI',  disabled: rriDisabled, tip: rriDisabled ? 'RRI band selection requires Governance tier.' : 'RRI bands — Governance+ tier.' },
      { code: 'cci',  label: 'CCI',  disabled: true,  tip: 'CCI category drill-down — Coming soon.' }
    ];
    var tabBtns = '';
    for (var t = 0; t < tabs.length; t++) {
      var tab = tabs[t];
      var act = (INTEL_TAB === tab.code && !tab.disabled) ? ' is-active' : '';
      var dis = tab.disabled ? ' is-disabled' : '';
      tabBtns += '<button type="button" class="dr-axis-tab' + act + dis + '" data-intel-tab="' + escapeHtml(tab.code) + '"' +
                  (tab.disabled ? ' disabled aria-disabled="true"' : '') +
                  ' title="' + escapeHtml(tab.tip) + '">' + escapeHtml(tab.label) + '</button>';
    }

    var tabPanel = '';
    var activeTab = (INTEL_TAB === 'rri' && rriDisabled) ? 'acei' : INTEL_TAB;
    if (activeTab === 'acei') {
      var L1 = (meta.levels && meta.levels.L1) ? meta.levels.L1 : [];
      var boxes = '';
      for (var i = 0; i < L1.length; i++) {
        var v = L1[i];
        var ch = (SCOPE_STATE.intelligence.acei.indexOf(v.value_code) !== -1) ? ' checked' : '';
        var ord = aceiOrdinal_(v.value_code);
        var swatch = (ord != null && ord >= 1 && ord <= 12)
          ? '<span class="dr-axis-acei-swatch" style="background:var(--acei-' + ord + ')" aria-hidden="true"></span>'
          : '';
        var enC = (v.enriched_count != null) ? Number(v.enriched_count).toLocaleString('en-GB') : '—';
        boxes += '<label class="dr-axis-checkbox dr-axis-checkbox-acei">' +
                   '<input type="checkbox" data-intel-acei-input value="' + escapeHtml(v.value_code) + '"' + ch + '>' +
                   swatch +
                   '<span class="dr-axis-checkbox-label">' + escapeHtml(v.display_label || v.value_code) + '</span>' +
                   '<span class="dr-axis-checkbox-meta">' + enC + ' enriched</span>' +
                 '</label>';
      }
      tabPanel = '<fieldset class="dr-axis-fieldset">' +
                   '<legend>ACEI categories</legend>' +
                   '<div class="dr-axis-checkbox-grid dr-axis-checkbox-grid-acei">' + (boxes || '<div class="dr-axis-empty">No ACEI values returned.</div>') + '</div>' +
                 '</fieldset>';
    } else if (activeTab === 'rri') {
      var L2 = (meta.levels && meta.levels.L2) ? meta.levels.L2 : [];
      var rriBoxes = '';
      for (var j = 0; j < L2.length; j++) {
        var w = L2[j];
        var ch2 = (SCOPE_STATE.intelligence.rri.indexOf(w.value_code) !== -1) ? ' checked' : '';
        rriBoxes += '<label class="dr-axis-checkbox">' +
                      '<input type="checkbox" data-intel-rri-input value="' + escapeHtml(w.value_code) + '"' + ch2 + '>' +
                      '<span class="dr-axis-checkbox-label">' + escapeHtml(w.display_label || w.value_code) + '</span>' +
                    '</label>';
      }
      tabPanel = '<fieldset class="dr-axis-fieldset">' +
                   '<legend>RRI bands (Governance+)</legend>' +
                   '<div class="dr-axis-checkbox-grid">' + (rriBoxes || '<div class="dr-axis-empty">No RRI values returned.</div>') + '</div>' +
                 '</fieldset>';
    } else if (activeTab === 'cci') {
      tabPanel = '<div class="dr-axis-coming-soon">CCI category drill-down — Coming soon.</div>';
    }

    return '<div class="dr-axis-tab-row" role="tablist">' + tabBtns + '</div>' + tabPanel;
  }

  function renderAxisListDom_() {
    var slot = document.querySelector('[data-axis-list]');
    if (!slot) return;
    slot.innerHTML = renderAxisList_();
    bindAxisListHandlers_();
  }

  function renderModifiersPanel_() {
    return '<section class="dr-config-panel dr-modifiers-panel" aria-labelledby="dr-panel-mods-h">' +
             '<header class="dr-config-panel-header">' +
               '<span class="dr-config-panel-number">Panel 2</span>' +
               '<h2 id="dr-panel-mods-h" class="dr-config-panel-title">Modifiers</h2>' +
               renderClidLine_() +
             '</header>' +
             '<div class="dr-modifiers-content" data-modifiers-content>' + renderModifiersBody_() + '</div>' +
           '</section>';
  }

  function renderModifiersBody_() {
    return renderTierSelector_() +
           renderLaunchPartnerLine_() +
           renderDunsToggle_() +
           renderRefreshChips_() +
           renderExclusivityChips_() +
           renderTermChips_();
  }

  function renderDunsToggle_() {
    var checked = MODIFIERS_STATE.duns_match ? ' checked' : '';
    var stateLabel = MODIFIERS_STATE.duns_match ? 'On' : 'Off';
    return '<div class="dr-modifier-row">' +
             '<div class="dr-modifier-label-block">' +
               '<div class="dr-modifier-label">DUNS match additive</div>' +
               '<div class="dr-modifier-meta">+£3 per identity-record-year. Coverage transparency declared per AMD-103.</div>' +
             '</div>' +
             '<label class="dr-config-toggle-label">' +
               '<input type="checkbox" id="dr-config-duns" class="dr-config-toggle" data-modifier-duns' + checked + '>' +
               '<span class="dr-config-toggle-state">' + stateLabel + '</span>' +
             '</label>' +
           '</div>';
  }

  function renderRefreshChips_() {
    var REFRESH = [
      { code: 'quarterly', label: 'Quarterly · baseline' },
      { code: 'daily',     label: 'Daily · +15%' },
      { code: 'realtime',  label: 'Real-time · +25%' }
    ];
    var chips = '';
    for (var i = 0; i < REFRESH.length; i++) {
      var o = REFRESH[i];
      var act = (MODIFIERS_STATE.refresh === o.code) ? ' is-active' : '';
      chips += '<button type="button" class="dr-radio-option' + act + '" data-refresh="' + escapeHtml(o.code) + '">' + escapeHtml(o.label) + '</button>';
    }
    return '<div class="dr-modifier-row">' +
             '<div class="dr-modifier-label-block">' +
               '<div class="dr-modifier-label">Refresh cadence</div>' +
               '<div class="dr-modifier-meta">Daily and real-time apply additive percentages on the per-record price.</div>' +
             '</div>' +
             '<div class="dr-radio-group">' + chips + '</div>' +
           '</div>';
  }

  function renderExclusivityChips_() {
    var EXCL = [
      { code: 'none',     label: 'Non-exclusive' },
      { code: 'vertical', label: 'Vertical-Exclusive · +60%' },
      { code: 'full_uk',  label: 'Full UK Exclusivity · +60%' }
    ];
    var chips = '';
    for (var i = 0; i < EXCL.length; i++) {
      var o = EXCL[i];
      var act = (MODIFIERS_STATE.exclusivity === o.code) ? ' is-active' : '';
      chips += '<button type="button" class="dr-radio-option' + act + '" data-exclusivity="' + escapeHtml(o.code) + '">' + escapeHtml(o.label) + '</button>';
    }
    return '<div class="dr-modifier-row">' +
             '<div class="dr-modifier-label-block">' +
               '<div class="dr-modifier-label">Exclusivity</div>' +
               '<div class="dr-modifier-meta">Vertical and full UK both apply +60% on the per-record price.</div>' +
             '</div>' +
             '<div class="dr-radio-group">' + chips + '</div>' +
           '</div>';
  }

  function renderTermChips_() {
    var TERM = [
      { code: 1, label: '12 months' },
      { code: 2, label: '24 months · −5%' },
      { code: 3, label: '36 months · −10%' }
    ];
    var chips = '';
    for (var i = 0; i < TERM.length; i++) {
      var o = TERM[i];
      var act = (MODIFIERS_STATE.term_years === o.code) ? ' is-active' : '';
      chips += '<button type="button" class="dr-radio-option' + act + '" data-term="' + o.code + '">' + escapeHtml(o.label) + '</button>';
    }
    return '<div class="dr-modifier-row">' +
             '<div class="dr-modifier-label-block">' +
               '<div class="dr-modifier-label">Term length</div>' +
               '<div class="dr-modifier-meta">Multi-year discount applies on aggregate after layer + modifier composition.</div>' +
             '</div>' +
             '<div class="dr-radio-group">' + chips + '</div>' +
           '</div>';
  }

  function renderModifiersDom_() {
    var slot = document.querySelector('[data-modifiers-content]');
    if (!slot) return;
    slot.innerHTML = renderModifiersBody_();
    bindModifiersHandlers_();
  }

  function renderClidLine_() {
    return '<div class="dr-clid-line">Counter-party: <code>' + escapeHtml(CLID) + '</code></div>';
  }

  // ─── §6.1 Tier selector with PCIE wire-up ──────────────────────────
  var TIER_RANK = { operational_readiness: 0, governance: 1, institutional: 2 };
  function humaniseTier_(code) {
    return ({ operational_readiness: 'Operational Readiness', governance: 'Governance', institutional: 'Institutional' })[code] || code;
  }
  function renderTierSelector_() {
    var tiers = [
      { code: 'operational_readiness', label: 'Operational Readiness' },
      { code: 'governance',            label: 'Governance' },
      { code: 'institutional',         label: 'Institutional' }
    ];
    var chips = '';
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      var act = (MODIFIERS_STATE.tier === t.code) ? ' is-active' : '';
      var instClass = (t.code === 'institutional') ? ' dr-tier-chip-institutional' : '';
      chips += '<button type="button" class="dr-tier-chip' + act + instClass + '" data-tier-set="' + escapeHtml(t.code) + '" aria-pressed="' + (act ? 'true' : 'false') + '">' + escapeHtml(t.label) + '</button>';
    }
    return '<div class="dr-modifier-row dr-modifier-row-tier">' +
             '<div class="dr-modifier-label-block">' +
               '<div class="dr-modifier-label">Tier</div>' +
               '<div class="dr-modifier-meta">PCIE access posture. Governance unlocks RRI bands; Institutional unlocks ACEI + RRI cross-index.</div>' +
             '</div>' +
             '<div class="dr-tier-chip-group" role="group" aria-label="Tier selector">' + chips + '</div>' +
           '</div>';
  }

  function renderLaunchPartnerLine_() {
    var q = LAST_QUOTE_V4;
    if (!q) {
      return '<div class="dr-modifier-row dr-modifier-row-lp">' +
               '<div class="dr-modifier-label-block">' +
                 '<div class="dr-modifier-label">Launch partner</div>' +
                 '<div class="dr-modifier-meta">Authoritatively resolved by pricing_quote_function_v4 against partner_clids.</div>' +
               '</div>' +
               '<div class="dr-lp-status dr-lp-status-pending">Computing first quote…</div>' +
             '</div>';
    }
    var applied = (q.is_launch_partner_applied === true);
    return '<div class="dr-modifier-row dr-modifier-row-lp' + (applied ? ' is-applied' : '') + '">' +
             '<div class="dr-modifier-label-block">' +
               '<div class="dr-modifier-label">Launch partner</div>' +
               (q.launch_partner_resolved_via ? '<div class="dr-modifier-meta">Resolved via <code>' + escapeHtml(q.launch_partner_resolved_via) + '</code></div>' : '') +
             '</div>' +
             '<div class="dr-lp-status">' +
               (applied ? '<strong>Yes</strong> &middot; &minus;10% applied' : '<strong>No</strong>') +
             '</div>' +
           '</div>';
  }

  function findTierViolations_(newTier) {
    var newRank = TIER_RANK[newTier];
    if (newRank == null) newRank = 0;
    var v = { rri: 0 };
    if (newRank < TIER_RANK.governance) {
      v.rri = (SCOPE_STATE.intelligence.rri || []).length;
    }
    return v;
  }
  function clearTierViolations_(newTier) {
    var newRank = TIER_RANK[newTier];
    if (newRank == null) newRank = 0;
    if (newRank < TIER_RANK.governance) {
      SCOPE_STATE.intelligence.rri = [];
      if (INTEL_TAB === 'rri') INTEL_TAB = 'acei';
    }
  }
  function applyTierChange_(newTier) {
    MODIFIERS_STATE.tier = newTier;
    renderModifiersDom_();
    renderAxisListDom_();   // RRI tab gating + tier-gated drill-down rendering refresh
    recomputeDebounced_();
  }
  function handleTierChange_(newTier) {
    if (!newTier || newTier === MODIFIERS_STATE.tier) return;
    var oldRank = TIER_RANK[MODIFIERS_STATE.tier] != null ? TIER_RANK[MODIFIERS_STATE.tier] : 0;
    var newRank = TIER_RANK[newTier] != null ? TIER_RANK[newTier] : 0;
    if (newRank >= oldRank) return applyTierChange_(newTier);   // upward — no clearing
    var violations = findTierViolations_(newTier);
    var total = violations.rri;
    if (total === 0) return applyTierChange_(newTier);
    showModalConfirm_({
      title:         'Lower tier will clear selections',
      bodyHtml:      'Lowering your tier from <strong>' + escapeHtml(humaniseTier_(MODIFIERS_STATE.tier)) + '</strong> to ' +
                     '<strong>' + escapeHtml(humaniseTier_(newTier)) + '</strong> will clear ' +
                     '<strong>' + total + '</strong> intelligence selection' + (total === 1 ? '' : 's') +
                     ' that require Governance tier. Continue?',
      continueLabel: 'Continue and clear',
      cancelLabel:   'Cancel',
      onContinue:    function () {
        clearTierViolations_(newTier);
        applyTierChange_(newTier);
      }
    });
  }

  function bindModifiersHandlers_() {
    var tierBtns = document.querySelectorAll('[data-tier-set]');
    for (var i = 0; i < tierBtns.length; i++) (function (btn) {
      btn.addEventListener('click', function () {
        handleTierChange_(btn.getAttribute('data-tier-set'));
      });
    })(tierBtns[i]);

    var dunsEl = document.querySelector('[data-modifier-duns]');
    if (dunsEl) dunsEl.addEventListener('change', function () {
      MODIFIERS_STATE.duns_match = !!dunsEl.checked;
      renderModifiersDom_();
      recomputeDebounced_();
    });

    var refreshBtns = document.querySelectorAll('.dr-radio-option[data-refresh]');
    for (var r = 0; r < refreshBtns.length; r++) (function (btn) {
      btn.addEventListener('click', function () {
        MODIFIERS_STATE.refresh = btn.getAttribute('data-refresh');
        renderModifiersDom_();
        recomputeDebounced_();
      });
    })(refreshBtns[r]);

    var exclBtns = document.querySelectorAll('.dr-radio-option[data-exclusivity]');
    for (var e = 0; e < exclBtns.length; e++) (function (btn) {
      btn.addEventListener('click', function () {
        MODIFIERS_STATE.exclusivity = btn.getAttribute('data-exclusivity');
        renderModifiersDom_();
        recomputeDebounced_();
      });
    })(exclBtns[e]);

    var termBtns = document.querySelectorAll('.dr-radio-option[data-term]');
    for (var t = 0; t < termBtns.length; t++) (function (btn) {
      btn.addEventListener('click', function () {
        MODIFIERS_STATE.term_years = parseInt(btn.getAttribute('data-term'), 10) || 1;
        renderModifiersDom_();
        recomputeDebounced_();
      });
    })(termBtns[t]);
  }

  function renderLiveQuotePanel_() {
    return '<aside class="dr-quote-rail dr-live-quote-panel" id="dr-config-quote-rail" aria-live="polite" aria-labelledby="dr-panel-quote-h">' +
             '<header class="dr-config-panel-header">' +
               '<span class="dr-config-panel-number">Panel 3</span>' +
               '<h2 id="dr-panel-quote-h" class="dr-config-panel-title">Live quote</h2>' +
             '</header>' +
             '<div class="dr-quote-content" data-quote-content>' +
               '<div class="dr-quote-empty">Compose a scope to see the live quote.</div>' +
             '</div>' +
             '<div class="dr-quote-meta">' +
               '<span class="dr-quote-amd-chip" data-quote-amd-chip>AMD-114 + AMD-115</span>' +
               '<span class="dr-quote-validity">30 days; commitments require contract</span>' +
             '</div>' +
           '</aside>';
  }

  function bindScopeBuilderHandlers_() {
    bindAxisListHandlers_();
    bindModifiersHandlers_();
    var resetBtn = document.querySelector('[data-scope-reset]');
    if (resetBtn) resetBtn.addEventListener('click', handleResetAllAxes_);
  }

  function bindAxisListHandlers_() {
    // Axis row toggle (expand/collapse). Only one axis row expanded at a time.
    var toggles = document.querySelectorAll('[data-axis-toggle]');
    for (var i = 0; i < toggles.length; i++) (function (btn) {
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-axis-toggle');
        EXPANDED_AXIS = (EXPANDED_AXIS === code) ? null : code;
        renderAxisListDom_();
      });
    })(toggles[i]);

    // Sector L1 multi-select
    var l1Inputs = document.querySelectorAll('[data-sector-l1-input]');
    for (var j = 0; j < l1Inputs.length; j++) (function (input) {
      input.addEventListener('change', function () {
        var v = input.value;
        var arr = SCOPE_STATE.sector.l1.slice();
        if (input.checked) { if (arr.indexOf(v) === -1) arr.push(v); }
        else { arr = arr.filter(function (x) { return x !== v; }); }
        SCOPE_STATE.sector.l1 = arr;
        // L2 only meaningful when L1 = exactly ['public_body']; clear otherwise.
        if (!(arr.length === 1 && arr[0] === 'public_body')) {
          SCOPE_STATE.sector.l2 = [];
        }
        renderAxisListDom_();
        recomputeDebounced_();
      });
    })(l1Inputs[j]);

    // Sector L2 multi-select (Public sub-segments)
    var l2Inputs = document.querySelectorAll('[data-sector-l2-input]');
    for (var k = 0; k < l2Inputs.length; k++) (function (input) {
      input.addEventListener('change', function () {
        var v = input.value;
        var arr = SCOPE_STATE.sector.l2.slice();
        if (input.checked) { if (arr.indexOf(v) === -1) arr.push(v); }
        else { arr = arr.filter(function (x) { return x !== v; }); }
        SCOPE_STATE.sector.l2 = arr;
        renderAxisListDom_();
        recomputeDebounced_();
      });
    })(l2Inputs[k]);

    // Geography level selector (L1 / L2 / L3)
    var geoLevelBtns = document.querySelectorAll('[data-geo-level]');
    for (var gl = 0; gl < geoLevelBtns.length; gl++) (function (btn) {
      btn.addEventListener('click', function () {
        var lvl = btn.getAttribute('data-geo-level');
        SCOPE_STATE.geography.level = lvl;
        SCOPE_STATE.geography.values = [];
        renderAxisListDom_();
        recomputeDebounced_();
      });
    })(geoLevelBtns[gl]);

    // Geography L2 country checkboxes
    var geoL2 = document.querySelectorAll('[data-geo-l2-input]');
    for (var g2 = 0; g2 < geoL2.length; g2++) (function (input) {
      input.addEventListener('change', function () {
        var v = input.value;
        var arr = SCOPE_STATE.geography.values.slice();
        if (input.checked) { if (arr.indexOf(v) === -1) arr.push(v); }
        else { arr = arr.filter(function (x) { return x !== v; }); }
        SCOPE_STATE.geography.values = arr;
        renderAxisListDom_();
        recomputeDebounced_();
      });
    })(geoL2[g2]);

    // Geography L3 region checkboxes
    var geoL3 = document.querySelectorAll('[data-geo-l3-input]');
    for (var g3 = 0; g3 < geoL3.length; g3++) (function (input) {
      input.addEventListener('change', function () {
        var v = input.value;
        var arr = SCOPE_STATE.geography.values.slice();
        if (input.checked) { if (arr.indexOf(v) === -1) arr.push(v); }
        else { arr = arr.filter(function (x) { return x !== v; }); }
        SCOPE_STATE.geography.values = arr;
        renderAxisListDom_();
        recomputeDebounced_();
      });
    })(geoL3[g3]);

    // Geography back-to-L2 affordance
    var geoBack = document.querySelector('[data-geo-back-l2]');
    if (geoBack) geoBack.addEventListener('click', function () {
      SCOPE_STATE.geography.level = 'L2';
      SCOPE_STATE.geography.values = [];
      renderAxisListDom_();
      recomputeDebounced_();
    });

    // Industry L1 SIC section checkboxes
    var indL1 = document.querySelectorAll('[data-industry-l1-input]');
    for (var ii = 0; ii < indL1.length; ii++) (function (input) {
      input.addEventListener('change', function () {
        var v = input.value;
        var arr = SCOPE_STATE.industry.values.slice();
        if (input.checked) { if (arr.indexOf(v) === -1) arr.push(v); }
        else { arr = arr.filter(function (x) { return x !== v; }); }
        SCOPE_STATE.industry.values = arr;
        SCOPE_STATE.industry.level = 'L1';
        renderAxisListDom_();
        recomputeDebounced_();
      });
    })(indL1[ii]);

    // Intelligence sub-axis tabs (ACEI / RRI / CCI)
    var intelTabs = document.querySelectorAll('[data-intel-tab]');
    for (var it = 0; it < intelTabs.length; it++) (function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var code = btn.getAttribute('data-intel-tab');
        if (code === 'cci') return;
        if (code === 'rri' && MODIFIERS_STATE.tier === 'operational_readiness') return;
        // §5.6 cross-index gate: switching to RRI while ACEI selections
        // exist requires Institutional. Soft modal; user can clear ACEI
        // and switch, or cancel. (Governance can hold RRI alone — but
        // not ACEI + RRI on the same scope.)
        if (code === 'rri' && MODIFIERS_STATE.tier !== 'institutional' && SCOPE_STATE.intelligence.acei.length > 0) {
          showModalConfirm_({
            title:         'Cross-index intelligence is Institutional',
            bodyHtml:      'Cross-index intelligence selection (ACEI + RRI on the same scope) is an Institutional-tier feature. ' +
                           'Upgrade to combine, or clear your ACEI selection to switch to RRI alone.',
            continueLabel: 'Clear ACEI and switch to RRI',
            cancelLabel:   'Cancel',
            onContinue:    function () {
              SCOPE_STATE.intelligence.acei = [];
              INTEL_TAB = 'rri';
              renderAxisListDom_();
              recomputeDebounced_();
            }
          });
          return;
        }
        INTEL_TAB = code;
        renderAxisListDom_();
      });
    })(intelTabs[it]);

    // Intelligence ACEI checkboxes
    var aceiInputs = document.querySelectorAll('[data-intel-acei-input]');
    for (var ai = 0; ai < aceiInputs.length; ai++) (function (input) {
      input.addEventListener('change', function () {
        var v = input.value;
        var arr = SCOPE_STATE.intelligence.acei.slice();
        if (input.checked) { if (arr.indexOf(v) === -1) arr.push(v); }
        else { arr = arr.filter(function (x) { return x !== v; }); }
        SCOPE_STATE.intelligence.acei = arr;
        renderAxisListDom_();
        recomputeDebounced_();
      });
    })(aceiInputs[ai]);

    // Intelligence RRI checkboxes (Governance+ tier — UI gates the tab; RPC will reject otherwise)
    var rriInputs = document.querySelectorAll('[data-intel-rri-input]');
    for (var ri = 0; ri < rriInputs.length; ri++) (function (input) {
      input.addEventListener('change', function () {
        var v = input.value;
        var arr = SCOPE_STATE.intelligence.rri.slice();
        if (input.checked) { if (arr.indexOf(v) === -1) arr.push(v); }
        else { arr = arr.filter(function (x) { return x !== v; }); }
        SCOPE_STATE.intelligence.rri = arr;
        renderAxisListDom_();
        recomputeDebounced_();
      });
    })(rriInputs[ri]);
  }

  function applyResetAllAxes_() {
    SCOPE_STATE = {
      sector:       { l1: [], l2: [] },
      geography:    { level: 'L1', values: [] },
      industry:     { level: 'L1', values: [] },
      intelligence: { acei: [], rri: [], cci: [] }
    };
    EXPANDED_AXIS = null;
    INTEL_TAB = 'acei';
    renderAxisListDom_();
    recomputeDebounced_();
  }

  // ─── §5.8 ratchet-down narrowing UX ────────────────────────────────
  // When the user removes a constraint AND the current live identity
  // universe is < 5,000 records, intercept with a soft confirmation
  // modal that pre-shows the projected new universe + annual.
  function constraintCount_(scope) {
    var c = 0;
    var l1 = scope.sector.l1 || [];
    if (l1.length > 0 && l1.length < 3) c++;
    if ((scope.sector.l2 || []).length > 0) c++;
    if (scope.geography.level !== 'L1' && (scope.geography.values || []).length > 0) c++;
    if ((scope.industry.values || []).length > 0) c++;
    if ((scope.intelligence.acei || []).length > 0) c++;
    if ((scope.intelligence.rri || []).length > 0) c++;
    return c;
  }

  function shouldShowRatchetModal_(prospectiveScope) {
    if (!LAST_UNIVERSE || LAST_UNIVERSE.identity_universe == null) return false;
    if (Number(LAST_UNIVERSE.identity_universe) >= 5000) return false;
    return constraintCount_(prospectiveScope) < constraintCount_(SCOPE_STATE);
  }

  async function precomputeProjection_(prospectiveScope) {
    try {
      var u = await computeScopeUniverse_(prospectiveScope);
      var q = await quoteV4_(prospectiveScope, composeModifiersPayload_());
      return { universe: u, quote: q };
    } catch (e) {
      return null;
    }
  }

  async function handleResetAllAxes_() {
    var prospective = {
      sector:       { l1: [], l2: [] },
      geography:    { level: 'L1', values: [] },
      industry:     { level: 'L1', values: [] },
      intelligence: { acei: [], rri: [], cci: [] }
    };
    if (!shouldShowRatchetModal_(prospective)) {
      return applyResetAllAxes_();
    }
    var fromU = LAST_UNIVERSE.identity_universe;
    var fromAnnualFmt = LAST_QUOTE_V4
      ? '£' + (LAST_QUOTE_V4.annual_pence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })
      : '—';
    showModalConfirm_({
      title: 'Reset will broaden your scope',
      bodyHtml: 'Reset will broaden your scope from <strong>' + Number(fromU).toLocaleString('en-GB') + '</strong> records ' +
                '(annual <strong>' + escapeHtml(fromAnnualFmt) + '</strong>) to the unconstrained UK estate. ' +
                'Computing projection…',
      continueLabel: 'Continue & reset',
      cancelLabel:   'Cancel',
      onContinue:    applyResetAllAxes_
    });
    // Pre-call RPCs to refine the modal copy with concrete projection values.
    var proj = await precomputeProjection_(prospective);
    if (!proj) return;
    var toU = proj.universe ? proj.universe.identity_universe : null;
    var toAnnualFmt = proj.quote
      ? '£' + (proj.quote.annual_pence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })
      : '—';
    var bodyEl = document.querySelector('[data-modal-body]');
    if (bodyEl) {
      bodyEl.innerHTML = 'Reset will broaden your scope from <strong>' + Number(fromU).toLocaleString('en-GB') + '</strong> records to ' +
                         '<strong>(estimated) ' + (toU != null ? Number(toU).toLocaleString('en-GB') : '?') + '</strong> records, ' +
                         'and the annual quote from <strong>' + escapeHtml(fromAnnualFmt) + '</strong> to ' +
                         '<strong>(estimated) ' + escapeHtml(toAnnualFmt) + '</strong>. Continue?';
    }
  }

  // ─── Generic soft confirmation modal ───────────────────────────────
  // One overlay + card; backdrop click and Cancel both invoke onCancel
  // (or simply close). Continue invokes onContinue then closes.
  function ensureModalStyles_() {
    if (document.getElementById('dr-modal-styles')) return;
    var s = document.createElement('style');
    s.id = 'dr-modal-styles';
    s.textContent =
      '.dr-modal-overlay{position:fixed;inset:0;background:rgba(5,12,24,0.78);display:flex;align-items:center;justify-content:center;z-index:9998;padding:24px;font-family:var(--dr-font-body, "DM Sans", sans-serif);}' +
      '.dr-modal-card{max-width:520px;width:100%;background:var(--dr-bg-card, #0c1525);border:1px solid var(--dr-border-medium, rgba(148,163,184,0.20));border-radius:var(--dr-radius, 12px);padding:28px 28px 22px;color:var(--dr-text, #E2E8F0);box-shadow:0 16px 64px rgba(0,0,0,0.55);}' +
      '.dr-modal-title{font-family:var(--dr-font-display, "DM Serif Display", serif);font-size:20px;color:var(--dr-text-heading, #F1F5F9);margin:0 0 14px;line-height:1.3;}' +
      '.dr-modal-body{font-size:14px;line-height:1.55;color:var(--dr-text-dim, #94A3B8);margin:0 0 20px;}' +
      '.dr-modal-actions{display:flex;justify-content:flex-end;gap:10px;}' +
      '.dr-modal-btn{font-family:var(--dr-font-body, sans-serif);font-size:14px;padding:9px 16px;border-radius:6px;border:1px solid var(--dr-border-medium);background:transparent;color:var(--dr-text);cursor:pointer;}' +
      '.dr-modal-btn:hover{border-color:var(--dr-cyan, #0EA5E9);color:var(--dr-cyan-soft, #22d3ee);}' +
      '.dr-modal-btn-primary{background:var(--dr-cyan, #0EA5E9);border-color:var(--dr-cyan);color:var(--dr-bg, #0a0e1a);font-weight:600;}' +
      '.dr-modal-btn-primary:hover{background:var(--dr-cyan-soft, #22d3ee);color:var(--dr-bg, #0a0e1a);}';
    document.head.appendChild(s);
  }

  function showModalConfirm_(opts) {
    ensureModalStyles_();
    var existing = document.getElementById('dr-modal-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'dr-modal-overlay';
    overlay.className = 'dr-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="dr-modal-card">' +
        '<h3 class="dr-modal-title">' + escapeHtml(opts.title || 'Confirm') + '</h3>' +
        '<div class="dr-modal-body" data-modal-body>' + (opts.bodyHtml || '') + '</div>' +
        '<div class="dr-modal-actions">' +
          '<button type="button" class="dr-modal-btn" data-modal-cancel>' + escapeHtml(opts.cancelLabel || 'Cancel') + '</button>' +
          '<button type="button" class="dr-modal-btn dr-modal-btn-primary" data-modal-continue>' + escapeHtml(opts.continueLabel || 'Continue') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) {
        close();
        if (opts.onCancel) opts.onCancel();
      }
    });
    var cancelBtn = overlay.querySelector('[data-modal-cancel]');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      close();
      if (opts.onCancel) opts.onCancel();
    });
    var contBtn = overlay.querySelector('[data-modal-continue]');
    if (contBtn) contBtn.addEventListener('click', function () {
      close();
      if (opts.onContinue) opts.onContinue();
    });
  }

  // ─── AMD-114 §9 live recompute orchestrator ────────────────────────
  // Sequence per brief §9.3:
  //   1. show loading state on Panel 3
  //   2. compute_scope_universe → universe pill update (axis rows + Panel 3)
  //   3. pricing_quote_function_v4 → per-record + annual + dynamic AMD chip
  //   4. clear loading state
  // Sequence-number guard discards stale results.
  function recomputeDebounced_() {
    clearTimeout(configRecomputeTimer);
    configRecomputeTimer = setTimeout(recompute_, 250);
  }

  async function recompute_() {
    var seq = ++quoteRequestSeq;
    setLiveQuoteLoading_(true);
    try {
      var universe = await computeScopeUniverse_(SCOPE_STATE);
      if (seq !== quoteRequestSeq) return;
      LAST_UNIVERSE = universe;
      renderAxisListDom_();

      var modPayload = composeModifiersPayload_();
      var quote = await quoteV4_(SCOPE_STATE, modPayload);
      if (seq !== quoteRequestSeq) return;
      LAST_QUOTE_V4 = quote;
      renderLiveQuoteContent_(quote);
      renderModifiersDom_();   // refresh LP status from is_launch_partner_applied
    } catch (err) {
      if (seq !== quoteRequestSeq) return;
      var bodyTxt = (err && err.body) ? String(err.body) : '';
      if (bodyTxt.indexOf('zero records') !== -1) {
        renderLiveQuoteZeroRecords_();
      } else {
        renderLiveQuoteError_(err);
      }
      console.error('[AMD-114] recompute error:', err && err.message ? err.message : err);
    } finally {
      if (seq === quoteRequestSeq) setLiveQuoteLoading_(false);
    }
  }

  function composeModifiersPayload_() {
    return {
      tier:        MODIFIERS_STATE.tier,
      refresh:     MODIFIERS_STATE.refresh,
      exclusivity: MODIFIERS_STATE.exclusivity,
      term_years:  MODIFIERS_STATE.term_years,
      duns_match:  MODIFIERS_STATE.duns_match,
      clid:        CLID
    };
  }

  function setLiveQuoteLoading_(isLoading) {
    var rail = document.getElementById('dr-config-quote-rail');
    if (!rail) return;
    if (isLoading) rail.classList.add('is-loading');
    else rail.classList.remove('is-loading');
  }

  function renderLiveQuoteContent_(quote) {
    var slot = document.querySelector('[data-quote-content]');
    if (!slot) return;
    var perPence = Number(quote.per_record_pence || 0);
    var annualPence = Number(quote.annual_pence || 0);
    var bandMin = (quote.annual_band_min_pence != null) ? Number(quote.annual_band_min_pence) : null;
    var bandMax = (quote.annual_band_max_pence != null) ? Number(quote.annual_band_max_pence) : null;
    var perFmt = '£' + (perPence / 100).toFixed(2);
    var annualFmt = '£' + (annualPence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var bandFmt = (bandMin != null && bandMax != null)
      ? 'Band: £' + (bandMin / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 }) + ' – £' + (bandMax / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })
      : '';
    var floorAnnotation = (quote.floor_applied === true) ? ' <span class="dr-quote-floor-annotation">(£750 floor applied)</span>' : '';

    var lpBadge = (quote.is_launch_partner_applied === true)
      ? '<div class="dr-launch-partner-badge" role="status" aria-label="Launch partner status">' +
          '<span class="dr-launch-partner-icon" aria-hidden="true">&check;</span>' +
          '<span class="dr-launch-partner-label">Launch Partner</span>' +
          '<span class="dr-launch-partner-detail">&minus;10% applied</span>' +
        '</div>'
      : '';

    slot.innerHTML =
      '<div class="dr-quote-per-record"><strong>' + escapeHtml(perFmt) + '</strong> <span class="dr-quote-per-record-unit">per record-year</span></div>' +
      '<div class="dr-quote-universe-ribbon">' +
        '<span class="dr-quote-universe-pill"><span class="dr-quote-universe-label">Identity</span> <strong>' + Number(quote.scope_universe || 0).toLocaleString('en-GB') + '</strong></span>' +
        '<span class="dr-quote-universe-pill"><span class="dr-quote-universe-label">Enriched</span> <strong>' + Number(quote.enriched_universe || 0).toLocaleString('en-GB') + '</strong></span>' +
      '</div>' +
      '<div class="dr-quote-annual"><strong>' + annualFmt + '</strong> <span class="dr-quote-annual-unit">/year</span>' + floorAnnotation + '</div>' +
      (bandFmt ? '<div class="dr-quote-band">' + escapeHtml(bandFmt) + '</div>' : '') +
      renderMultipliersRibbon_(quote) +
      renderOverlaysRibbon_(quote) +
      lpBadge +
      renderComputationBreakdown_(quote);

    var chipEl = document.querySelector('[data-quote-amd-chip]');
    if (chipEl && quote.amd_authority) chipEl.textContent = quote.amd_authority;
  }

  // ─── §7.6 multipliers ribbon ───────────────────────────────────────
  function renderMultipliersRibbon_(quote) {
    var vs    = (quote.volume_scarcity_multiplier != null) ? Number(quote.volume_scarcity_multiplier).toFixed(4) : '—';
    var ax    = (quote.axis_bumps_pct  != null) ? Number(quote.axis_bumps_pct)  : 0;
    var depth = (quote.depth_bonus_pct != null) ? Number(quote.depth_bonus_pct) : 0;
    var tier  = (quote.tier_multiplier != null) ? Number(quote.tier_multiplier).toFixed(2) : '—';
    return '<div class="dr-quote-ribbon dr-quote-multipliers-ribbon">' +
             'Volume scarcity &times;' + escapeHtml(String(vs)) +
             ' &middot; Curation +' + ax + '% (axis) +' + depth + '% (depth)' +
             ' &middot; Tier &times;' + escapeHtml(String(tier)) +
           '</div>';
  }

  // ─── §7.7 overlays ribbon ──────────────────────────────────────────
  function renderOverlaysRibbon_(quote) {
    var refresh = (quote.refresh_adjustment_pct     != null) ? Number(quote.refresh_adjustment_pct)     : 0;
    var excl    = (quote.exclusivity_adjustment_pct != null) ? Number(quote.exclusivity_adjustment_pct) : 0;
    var term    = (quote.term_discount_pct          != null) ? Number(quote.term_discount_pct)          : 0;
    var dunsTxt;
    if (quote.duns_additive_pence != null && Number(quote.duns_additive_pence) > 0) {
      dunsTxt = '£' + (Number(quote.duns_additive_pence) / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 });
    } else {
      dunsTxt = '—';
    }
    var lpTxt = (quote.is_launch_partner_applied === true) ? '−10%' : '—';
    return '<div class="dr-quote-ribbon dr-quote-overlays-ribbon">' +
             'Refresh +' + refresh + '%' +
             ' &middot; Exclusivity +' + excl + '%' +
             ' &middot; Term &minus;' + term + '%' +
             ' &middot; DUNS ' + escapeHtml(dunsTxt) +
             ' &middot; Launch ' + escapeHtml(lpTxt) +
           '</div>';
  }

  // ─── §7.4 computation breakdown (expandable accordion) ─────────────
  function renderComputationBreakdown_(quote) {
    var log = (quote.computation_log && Array.isArray(quote.computation_log)) ? quote.computation_log : [];
    if (log.length === 0) return '';
    var rows = '';
    for (var i = 0; i < log.length; i++) rows += renderComputationStep_(log[i]);
    return '<details class="dr-quote-breakdown">' +
             '<summary class="dr-quote-breakdown-summary">How is this calculated?</summary>' +
             '<div class="dr-quote-breakdown-body">' + rows + '</div>' +
           '</details>';
  }

  function renderComputationStep_(entry) {
    var step = entry.step || 'unknown';
    var label = humaniseStepCode_(step);
    var isDiscount = (step === 'term_discount' || step === 'launch_partner_discount');
    var pairs = [];
    for (var k in entry) {
      if (!entry.hasOwnProperty(k) || k === 'step') continue;
      pairs.push(escapeHtml(k) + ': ' + escapeHtml(formatStepField_(k, entry[k], isDiscount)));
    }
    return '<div class="dr-quote-step' + (isDiscount ? ' dr-quote-step-discount' : '') + '" data-step="' + escapeHtml(step) + '">' +
             '<div class="dr-quote-step-label">' + (isDiscount ? '&minus; ' : '') + escapeHtml(label) + '</div>' +
             '<div class="dr-quote-step-fields">' + pairs.join(' &middot; ') + '</div>' +
           '</div>';
  }

  function humaniseStepCode_(step) {
    return ({
      universe_resolved:       'Universe resolved',
      axes_applied:            'Axes applied',
      volume_scarcity:         'Volume scarcity',
      curation_premium:        'Curation premium',
      tier_multiplier:         'Tier multiplier',
      per_record:              'Per-record price',
      scope_subtotal:          'Scope subtotal',
      duns_additive:           'DUNS additive',
      refresh_surcharge:       'Refresh surcharge',
      exclusivity_surcharge:   'Exclusivity surcharge',
      term_discount:           'Term discount',
      launch_partner_discount: 'Launch partner discount',
      floor_check:             'Floor check',
      annual:                  'Annual'
    })[step] || step;
  }

  function formatStepField_(k, v, isDiscount) {
    if (v == null) return '—';
    if (Array.isArray(v)) return '[' + v.length + ' item' + (v.length === 1 ? '' : 's') + ']';
    if (typeof v === 'object') {
      try { return JSON.stringify(v); } catch (e) { return '{…}'; }
    }
    if (typeof v === 'number') {
      if (/_pence$/.test(k) || k === 'value_pence') {
        var pounds = (v / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (isDiscount && v > 0 ? '−£' : '£') + pounds;
      }
      if (/_pct$/.test(k) || k === 'pct_magnitude' || k === 'pct') {
        return (isDiscount && v > 0 ? '−' : '') + v + '%';
      }
      if (/multiplier$/.test(k))  return '×' + Number(v).toFixed(4);
      if (/^count$/.test(k))      return Number(v).toLocaleString('en-GB');
      return String(v);
    }
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    return String(v);
  }

  function renderLiveQuoteError_(err) {
    var slot = document.querySelector('[data-quote-content]');
    if (!slot) return;
    var msg = (err && err.message) ? err.message : 'Unknown error';
    slot.innerHTML = '<div class="dr-quote-error">Could not compute pricing &mdash; ' + escapeHtml(msg) + '. Please try again.</div>';
  }

  function renderLiveQuoteZeroRecords_() {
    var slot = document.querySelector('[data-quote-content]');
    if (!slot) return;
    slot.innerHTML = '<div class="dr-quote-zero">No records match this scope. Relax one constraint to continue.</div>';
  }


  function renderCounterProposalSection(user, gateState) {
    var anchor = document.getElementById('dr-counter-proposal-section');
    if (!anchor) return;
    // Sandbox: counter-proposal submit requires authenticated user + RLS-gated INSERT
    // into partner_counter_proposals. Hide the entire section behind a small note.
    if (IS_SANDBOX) {
      anchor.innerHTML =
        '<header class="dr-section-head">' +
          '<h2>Counter-proposal</h2>' +
        '</header>' +
        '<div class="dr-counter-proposal-placeholder dr-counter-proposal-sandbox-disabled">' +
          'Counter-proposal submission is <strong>disabled in sandbox</strong>. ' +
          'Sign in to a real deal-room engagement to submit configurations.' +
        '</div>';
      return;
    }
    var isDirector = (user && user.role === 'director');
    var currentIdx = GATE_ORDER.indexOf(gateState || 'phase_0');
    var phaseAIdx = GATE_ORDER.indexOf('phase_a');
    var canSubmit = isDirector || (currentIdx >= phaseAIdx);
    var featureEnabled = (FEATURE_FLAGS.counter_proposal_submission_enabled !== false);
    var html = '';
    if (!canSubmit) {
      html = '<header class="dr-section-head">' +
               '<h2>Counter-proposal</h2>' +
               '<p class="dr-section-sub">Submit a configuration as a counter-proposal once the engagement reaches Phase A.</p>' +
             '</header>' +
             '<div class="dr-counter-proposal-placeholder">' +
               'Counter-proposal submission opens at Phase A. Continue reviewing the documents and engaging ' +
               'with Eileen during Phase 0; the Director will advance the workspace to Phase A when ready.' +
             '</div>';
    } else if (!featureEnabled) {
      html = '<header class="dr-section-head"><h2>Counter-proposal</h2></header>' +
             '<div class="dr-counter-proposal-placeholder">' +
               'Counter-proposal submission temporarily disabled. Please engage with Eileen to continue the conversation.' +
             '</div>';
    } else {
      html = '<header class="dr-section-head">' +
               '<h2>Counter-proposal</h2>' +
               '<p class="dr-section-sub">Submit your configuration for Director review. Eileen evaluates against the constitutional framework when you next engage her.</p>' +
             '</header>' +
             '<div class="dr-counter-proposal-form">' +
               '<label class="dr-cp-label">' +
                 '<span>Rationale (optional, 200 chars max)</span>' +
                 '<textarea id="dr-cp-rationale" class="dr-cp-textarea" maxlength="200" placeholder="Why this configuration?"></textarea>' +
               '</label>' +
               '<label class="dr-cp-label">' +
                 '<span>Timing (optional, 200 chars max)</span>' +
                 '<textarea id="dr-cp-timing" class="dr-cp-textarea" maxlength="200" placeholder="e.g. Q3 2026 launch"></textarea>' +
               '</label>' +
               '<label class="dr-cp-label">' +
                 '<span>Urgency</span>' +
                 '<select id="dr-cp-urgency" class="dr-cp-select">' +
                   '<option value="standard">Standard</option>' +
                   '<option value="time-sensitive">Time-sensitive</option>' +
                   '<option value="urgent">Urgent</option>' +
                 '</select>' +
               '</label>' +
               '<button type="button" id="dr-cp-submit" class="dr-cp-submit-btn">Submit counter-proposal</button>' +
               '<div id="dr-cp-status" class="dr-cp-status" aria-live="polite"></div>' +
             '</div>';
    }
    anchor.innerHTML = html;
    if (canSubmit && featureEnabled) {
      var ratEl = document.getElementById('dr-cp-rationale');
      var timEl = document.getElementById('dr-cp-timing');
      var urgEl = document.getElementById('dr-cp-urgency');
      var btnEl = document.getElementById('dr-cp-submit');
      if (ratEl) ratEl.addEventListener('input', function () { CONFIG_STATE.rationale = ratEl.value; });
      if (timEl) timEl.addEventListener('input', function () { CONFIG_STATE.timing = timEl.value; });
      if (urgEl) urgEl.addEventListener('change', function () { CONFIG_STATE.urgency = urgEl.value; });
      if (btnEl) btnEl.addEventListener('click', function () { submitCounterProposal(); });
    }
  }

  async function submitCounterProposal() {
    var user = window.__dealRoomUser;
    var statusEl = document.getElementById('dr-cp-status');
    var btnEl = document.getElementById('dr-cp-submit');
    if (!user || !user.token) {
      if (statusEl) statusEl.innerHTML = '<div class="dr-cp-error">Not signed in.</div>';
      return;
    }
    if (!LAST_QUOTE_V4) {
      if (statusEl) statusEl.innerHTML = '<div class="dr-cp-error">Configure a quote before submitting.</div>';
      return;
    }
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Submitting…'; }
    if (statusEl) statusEl.innerHTML = '';

    // AMD-114 — four-axis config_snapshot. partner_counter_proposals.config_snapshot is
    // jsonb NOT NULL with no shape-coupling CHECK constraint (verified via pg_constraint
    // introspection 4 May 2026); the new payload is accepted as-is.
    var summaryParts = [];
    summaryParts.push(humaniseSectorSummary_());
    summaryParts.push(humaniseGeographySummary_());
    summaryParts.push(humaniseIndustrySummary_());
    summaryParts.push(humaniseIntelligenceSummary_());
    var modSummary = humaniseTier_(MODIFIERS_STATE.tier) + ' / ' +
                     (MODIFIERS_STATE.duns_match ? 'DUNS' : 'no-DUNS') + ' / ' +
                     MODIFIERS_STATE.refresh + ' / ' +
                     (MODIFIERS_STATE.exclusivity === 'none' ? 'non-exclusive' : MODIFIERS_STATE.exclusivity) + ' / ' +
                     (MODIFIERS_STATE.term_years * 12) + ' months';
    var configSummary = summaryParts.join(' · ') + ' · ' + modSummary;
    var minVal = (LAST_QUOTE_V4.annual_band_min_pence != null) ? Math.round(Number(LAST_QUOTE_V4.annual_band_min_pence) / 100) : null;
    var maxVal = (LAST_QUOTE_V4.annual_band_max_pence != null) ? Math.round(Number(LAST_QUOTE_V4.annual_band_max_pence) / 100) : null;
    var payload = {
      clid: CLID,
      submitted_by_user_id: user.id,
      submitted_by_email: user.email,
      proposal_version: 1,
      parent_proposal_id: null,
      config_snapshot: { scope: SCOPE_STATE, modifiers: composeModifiersPayload_() },
      config_summary: configSummary,
      eileen_evaluation: {},
      eileen_evaluation_text: '',
      estimated_annual_value_min: minVal,
      estimated_annual_value_max: maxVal,
      gates_activated: [],
      constitutional_flags: {},
      counterparty_rationale: CONFIG_STATE.rationale || null,
      counterparty_timing: CONFIG_STATE.timing || null,
      urgency_flag: CONFIG_STATE.urgency || 'standard',
      is_simulation: (CLID === 'sim-2026-001'),
      eileen_evaluation_pending: true
    };
    try {
      var res = await fetch(SUPABASE_URL + '/rest/v1/partner_counter_proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + user.token,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        var errTxt = await res.text();
        throw new Error('HTTP ' + res.status + ': ' + errTxt);
      }
      var data = await res.json();
      try {
        if (window.gtag) window.gtag('event', 'counter_proposal_submitted', {
          clid: CLID, urgency: CONFIG_STATE.urgency,
          annual_min: minVal, annual_max: maxVal
        });
      } catch (e) { /* swallow */ }
      if (statusEl) {
        statusEl.innerHTML = '<div class="dr-cp-success">' +
          '<strong>Counter-proposal submitted.</strong> ' +
          'Eileen will evaluate when you next engage her. The Director responds asynchronously through the deal-room.' +
          '</div>';
      }
      CONFIG_STATE.rationale = '';
      CONFIG_STATE.timing = '';
      CONFIG_STATE.urgency = 'standard';
      var ratEl = document.getElementById('dr-cp-rationale');
      var timEl = document.getElementById('dr-cp-timing');
      var urgEl = document.getElementById('dr-cp-urgency');
      if (ratEl) ratEl.value = '';
      if (timEl) timEl.value = '';
      if (urgEl) urgEl.value = 'standard';
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Submit counter-proposal'; }
    } catch (err) {
      console.error('submitCounterProposal error:', err);
      if (statusEl) statusEl.innerHTML = '<div class="dr-cp-error">Submission failed. Please try again or contact partnerships@ailane.ai if the issue persists.</div>';
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Submit counter-proposal'; }
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
    // AMD-120 Phase B STOP 1: short-circuit when the new universal menu bar
    // is present. The 5-item menu replaces this two-card row as the unified
    // sub-page navigation surface (Director ratification, 4 May 2026).
    if (document.getElementById('dr-menu-bar')) return;
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

  // ============================================================
  // PHASE 3 BRIEF β — workspace shell (auth chip + vault + tracker)
  // AILANE-CC-BRIEF-WORKSPACE-DOCS-PHASE-3-001
  // Authority: AMD-094 (privacy) + AMD-103 (provenance) + AMD-106
  // (canonical 7-state phase taxonomy) + AMD-114 (CONFIG-001) +
  // AMD-115/117/118 Stage A.
  // Data sources (per Director-amended §4.4 Path I):
  //   - dealroom_documents_catalog (REST, RLS-gated)
  //   - partner_clids                 (REST, RLS-gated)
  //   - dealroom_uploads              (REST, RLS-gated)
  // EFs:
  //   - dealroom-document-fetch v3    (preview/download)
  //   - dealroom-document-upload v1   (multipart submission)
  // dealroom-pipeline-list v1 is OUT OF SCOPE — implements CPPP/FCR
  // submissions, not a document catalog source.
  // ============================================================

  // ─── Phase 3 — canonical taxonomy + tokens ─────────────────
  var PHASE_RANK = {
    phase_0: 0, phase_a: 1, phase_b: 2, phase_c: 3,
    phase_d: 4, phase_e: 5, phase_f: 6, all_phases: 0
  };
  var PHASE_LABELS = {
    phase_0: 'Pre-engagement',
    phase_a: 'Engagement opened',
    phase_b: 'Engagement signed',
    phase_c: 'Active engagement',
    phase_d: 'Renewal',
    phase_e: 'Wind-down',
    phase_f: 'Closed',
    all_phases: 'Always available'
  };

  // ─── Auth helpers (magic-link via Supabase JS client) ─────
  async function getDealroomSession_() {
    if (!window.__dealRoomSb) return null;
    try {
      var result = await window.__dealRoomSb.auth.getSession();
      return (result && result.data) ? result.data.session : null;
    } catch (e) {
      return null;
    }
  }

  async function startMagicLinkSignin_(email) {
    if (!window.__dealRoomSb) throw new Error('Supabase client not ready');
    try {
      sessionStorage.setItem('dr_auth_return_url', window.location.href);
    } catch (e) { /* sessionStorage may be unavailable; non-fatal */ }
    var redirectTo = window.location.origin + WORKSPACE_ROOT + 'auth-callback/';
    var result = await window.__dealRoomSb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: redirectTo }
    });
    if (result && result.error) {
      throw new Error(result.error.message || 'Could not send magic link.');
    }
    return (result && result.data) || {};
  }

  async function signOutDealroom_() {
    if (!window.__dealRoomSb) return;
    try { await window.__dealRoomSb.auth.signOut(); } catch (e) { /* swallow; reload anyway */ }
    try { sessionStorage.removeItem('dr_auth_return_url'); } catch (e) {}
    window.__dealRoomUser = null;
    window.location.reload();
  }

  function showAuthModal_() {
    var existing = document.getElementById('dr-auth-modal-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'dr-auth-modal-overlay';
    overlay.className = 'dr-auth-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'dr-auth-modal-title');
    overlay.innerHTML =
      '<div class="dr-auth-modal-card">' +
        '<h2 id="dr-auth-modal-title" class="dr-auth-modal-title">Sign in to your dealroom</h2>' +
        '<p class="dr-auth-modal-lede">Enter the email associated with your engagement. We&rsquo;ll send you a magic link.</p>' +
        '<form id="dr-auth-modal-form" class="dr-auth-modal-form" novalidate>' +
          '<label for="dr-auth-modal-email" class="dr-auth-modal-label">Email</label>' +
          '<input type="email" id="dr-auth-modal-email" class="dr-auth-modal-input" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" required>' +
          '<div class="dr-auth-modal-actions">' +
            '<button type="button" class="dr-btn-secondary" data-auth-modal-action="cancel">Cancel</button>' +
            '<button type="submit" class="dr-btn-primary" data-auth-modal-submit>Send magic link</button>' +
          '</div>' +
        '</form>' +
        '<div class="dr-auth-modal-status" data-auth-modal-status aria-live="polite"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    function close() { overlay.remove(); }

    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) close();
    });
    var cancelBtn = overlay.querySelector('[data-auth-modal-action="cancel"]');
    if (cancelBtn) cancelBtn.addEventListener('click', close);

    var form = overlay.querySelector('#dr-auth-modal-form');
    var input = overlay.querySelector('#dr-auth-modal-email');
    var submitBtn = overlay.querySelector('[data-auth-modal-submit]');
    var statusEl = overlay.querySelector('[data-auth-modal-status]');

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var email = (input.value || '').trim();
      if (!email || email.indexOf('@') < 0) {
        statusEl.innerHTML = '<span class="dr-auth-modal-error">Please enter a valid email address.</span>';
        try { input.focus(); } catch (e) {}
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      statusEl.innerHTML = '';
      try {
        await startMagicLinkSignin_(email);
        statusEl.innerHTML = '<span class="dr-auth-modal-success">Check your email &mdash; link sent to <strong>' + escapeHtml(email) + '</strong>. Click the link to continue.</span>';
        submitBtn.textContent = 'Resend magic link';
        submitBtn.disabled = false;
        input.disabled = true;
        try { if (window.gtag) window.gtag('event', 'dealroom_magiclink_sent', { clid: CLID }); } catch (e) {}
      } catch (err) {
        statusEl.innerHTML = '<span class="dr-auth-modal-error">' + escapeHtml((err && err.message) || 'Could not send magic link.') + '</span>';
        submitBtn.textContent = 'Send magic link';
        submitBtn.disabled = false;
      }
    });

    setTimeout(function () { try { input.focus(); } catch (e) {} }, 50);
  }

  // ─── Shell injection ────────────────────────────────────────
  // Each renders skeleton DOM and (for the auth chip) live data;
  // vault/tracker data fetch wired in later commits. Idempotent.

  function injectAuthChip() {
    var anchor = document.querySelector('.dr-header-right') || document.querySelector('.dr-header');
    if (!anchor) return;
    var chip = document.getElementById('dr-auth-chip');
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'dr-auth-chip';
      chip.className = 'dr-auth-chip';
      chip.setAttribute('aria-live', 'polite');
      chip.innerHTML = '<span class="dr-auth-chip-pending">&hellip;</span>';
      anchor.appendChild(chip);
      // Hide legacy static auth UI (Phase-1B-era #dr-user-email + #dr-signout).
      // The chip is the new canonical auth surface.
      var legacyEmail = document.getElementById('dr-user-email');
      if (legacyEmail) legacyEmail.style.display = 'none';
      var legacySignout = document.getElementById('dr-signout');
      if (legacySignout) legacySignout.style.display = 'none';
    }
    setupAuthStateListener_();
    renderAuthChip_(chip);
  }

  async function renderAuthChip_(chip) {
    var session = await getDealroomSession_();
    if (session) {
      var email = (session.user && session.user.email) || 'signed in';
      chip.classList.add('dr-auth-chip-signed-in');
      chip.classList.remove('dr-auth-chip-signed-out');
      chip.innerHTML =
        '<span class="dr-auth-chip-email" title="' + escapeHtml(email) + '">' + escapeHtml(email) + '</span>' +
        '<button type="button" class="dr-auth-chip-btn" data-auth-action="signout">Sign out</button>';
    } else {
      chip.classList.add('dr-auth-chip-signed-out');
      chip.classList.remove('dr-auth-chip-signed-in');
      chip.innerHTML =
        '<button type="button" class="dr-auth-chip-btn dr-auth-chip-btn-primary" data-auth-action="signin">Sign in</button>';
    }
    var btn = chip.querySelector('[data-auth-action]');
    if (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-auth-action');
        if (action === 'signin') showAuthModal_();
        else if (action === 'signout') signOutDealroom_();
      });
    }
  }

  // Global accessor for vault/tracker (and Brief α Eileen panel) to
  // consume current auth state without each module duplicating logic.
  window.__dealRoomAuth = {
    getSession: getDealroomSession_,
    isSignedIn: async function () { return !!(await getDealroomSession_()); },
    showSigninModal: showAuthModal_,
    signOut: signOutDealroom_
  };

  // ─── Auth state propagation ────────────────────────────────
  // Single subscription to supabase.auth.onAuthStateChange. On every
  // SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED / USER_UPDATED:
  //   1. Re-render the auth chip in place
  //   2. Emit a custom DOM event 'dr-auth-state-changed' on window so
  //      the document vault and phase tracker (and Brief α Eileen
  //      panel) can re-render without each module duplicating the
  //      Supabase subscription.
  // Idempotent — bails on second invocation.
  var __authListenerInstalled = false;
  function setupAuthStateListener_() {
    if (__authListenerInstalled) return;
    if (!window.__dealRoomSb || !window.__dealRoomSb.auth) return;
    __authListenerInstalled = true;
    try {
      window.__dealRoomSb.auth.onAuthStateChange(function (event, session) {
        // Re-render the chip if present
        var chip = document.getElementById('dr-auth-chip');
        if (chip) renderAuthChip_(chip);
        // Notify other modules
        try {
          window.dispatchEvent(new CustomEvent('dr-auth-state-changed', {
            detail: { event: event, session: session, isSignedIn: !!session }
          }));
        } catch (e) { /* CustomEvent unsupported on truly ancient browsers; non-fatal */ }
      });
    } catch (e) {
      console.warn('[Phase 3] auth state listener setup failed:', e);
      __authListenerInstalled = false;
    }
  }

  function injectPhaseTracker() {
    var alreadyExists = !!document.getElementById('dr-phase-tracker');
    if (!alreadyExists) {
      var anchor =
        document.querySelector('.dr-subpage-nav-section') ||
        document.querySelector('.dr-main .dr-container .dr-hero');
      if (!anchor) return;
      var section = document.createElement('aside');
      section.id = 'dr-phase-tracker';
      section.className = 'dr-phase-tracker';
      section.setAttribute('aria-label', 'Engagement phase progression');
      section.innerHTML =
        '<header class="dr-phase-tracker-header">' +
          '<h2 class="dr-phase-tracker-title">Engagement Phase</h2>' +
        '</header>' +
        '<div class="dr-phase-tracker-body" data-phase-tracker-body>' +
          '<div class="dr-phase-tracker-pending">Loading phase status&hellip;</div>' +
        '</div>';
      anchor.insertAdjacentElement('afterend', section);
      window.addEventListener('dr-auth-state-changed', refreshPhaseTracker_);
    }
    refreshPhaseTracker_();
  }

  // Refresh the tracker. Reuses window.__dealRoomVaultData when populated
  // within the freshness window (30s) so we don't hit the catalog twice
  // on simultaneous vault+tracker render.
  async function refreshPhaseTracker_() {
    var body = document.querySelector('[data-phase-tracker-body]');
    if (!body) return;
    var session = await getDealroomSession_();
    if (!session) {
      body.innerHTML = '<div class="dr-phase-tracker-unauth"><p>Sign in to view phase status.</p></div>';
      return;
    }
    body.innerHTML = '<div class="dr-phase-tracker-pending">Loading phase status&hellip;</div>';
    try {
      var cached = window.__dealRoomVaultData;
      var fresh = (cached && (Date.now() - (cached.fetchedAt || 0)) < 30000);
      var data = fresh ? cached : await loadVaultData_();
      if (!fresh) window.__dealRoomVaultData = data;
      renderTrackerBody_(data);
    } catch (err) {
      console.error('[Phase 3] tracker load failed:', err);
      body.innerHTML =
        '<div class="dr-phase-tracker-error" role="alert">' +
          '<p>Could not load phase status. ' + escapeHtml((err && err.message) || '') + '</p>' +
          '<button type="button" class="dr-btn-secondary" data-tracker-retry>Retry</button>' +
        '</div>';
      var retryBtn = body.querySelector('[data-tracker-retry]');
      if (retryBtn) retryBtn.addEventListener('click', refreshPhaseTracker_);
    }
  }

  // Determine the next phase that gates advance (lowest rank > current
  // among phases that contain blocking-requirement rows). Skips phases
  // with no blockers (e.g. phase_0 → phase_b in the seed catalog —
  // phase_a has no docs).
  function findNextBlockingPhase_(catalog, currentRank) {
    var ranks = [];
    for (var i = 0; i < catalog.length; i++) {
      var row = catalog[i];
      if (row.kind !== 'requirement') continue;
      if (!row.is_blocking_phase_advance) continue;
      var rank = PHASE_RANK[row.available_from_phase];
      if (rank == null || rank <= currentRank) continue;
      ranks.push(rank);
    }
    if (ranks.length === 0) return null;
    return Math.min.apply(null, ranks);
  }

  function rankToPhaseCode_(rank) {
    var keys = ['phase_0', 'phase_a', 'phase_b', 'phase_c', 'phase_d', 'phase_e', 'phase_f'];
    return keys[rank] || null;
  }

  function renderTrackerBody_(data) {
    var body = document.querySelector('[data-phase-tracker-body]');
    if (!body) return;
    var clidRow = data.clidRow;
    var catalog = data.catalog || [];
    var uploadsByDocId = data.uploadsByDocId || {};
    var currentGateState = (clidRow && clidRow.gate_state) || 'phase_0';
    var currentRank = PHASE_RANK[currentGateState] != null ? PHASE_RANK[currentGateState] : 0;

    // Render 7 chevrons in order phase_0..phase_f
    var phases = ['phase_0', 'phase_a', 'phase_b', 'phase_c', 'phase_d', 'phase_e', 'phase_f'];
    var chevronsHtml = '';
    for (var i = 0; i < phases.length; i++) {
      var p = phases[i];
      var rank = PHASE_RANK[p];
      var state = (rank < currentRank) ? 'completed' : (rank === currentRank) ? 'current' : 'future';
      var icon = (state === 'completed') ? '✓' : (state === 'current') ? '●' : '○';
      // AMD-069 gold reservation: --dr-gold ONLY for Institutional active
      // tier (Panel 2 chip) per Phase 2; tracker uses cyan baseline. The
      // brief §9.3 mentions optional gold for current=phase_c (institutional
      // engagement); kept cyan here for consistency with AMD-069.
      chevronsHtml +=
        '<li class="dr-phase-chevron" data-phase="' + p + '" data-state="' + state + '">' +
          '<span class="dr-phase-chevron-icon" aria-hidden="true">' + icon + '</span>' +
          '<span class="dr-phase-chevron-code">' + p + '</span>' +
          '<span class="dr-phase-chevron-label">' + escapeHtml(PHASE_LABELS[p] || p) + '</span>' +
        '</li>';
    }

    // "What's needed to advance"
    var nextRank = findNextBlockingPhase_(catalog, currentRank);
    var advancePanelHtml = '';
    if (nextRank != null) {
      var nextPhaseCode = rankToPhaseCode_(nextRank);
      var nextPhaseLabel = PHASE_LABELS[nextPhaseCode] || nextPhaseCode;
      var blockers = [];
      for (var b = 0; b < catalog.length; b++) {
        var row = catalog[b];
        if (row.kind !== 'requirement') continue;
        if (!row.is_blocking_phase_advance) continue;
        if (row.available_from_phase !== nextPhaseCode) continue;
        var upload = uploadsByDocId[row.document_id] || null;
        var blockerStatus = upload && upload.status ? upload.status : 'open';
        blockers.push({ row: row, status: blockerStatus });
      }
      var allAccepted = blockers.length > 0 && blockers.every(function (b) { return b.status === 'accepted'; });
      var blockerItems = blockers.map(function (b) {
        var icon = (b.status === 'accepted') ? '✓'
                 : (b.status === 'submitted') ? '⏱'
                 : (b.status === 'declined') ? '!'
                 : '✗';
        return '<li class="dr-phase-blocker" data-status="' + escapeHtml(b.status) + '">' +
                 '<span class="dr-phase-blocker-status-icon" aria-hidden="true">' + icon + '</span>' +
                 '<span class="dr-phase-blocker-name">' + escapeHtml(b.row.name || b.row.doc_code) + '</span>' +
                 '<a href="#" class="dr-phase-blocker-link" data-blocker-doc-id="' + escapeHtml(b.row.document_id) + '">Go to document</a>' +
               '</li>';
      }).join('');

      advancePanelHtml =
        '<section class="dr-phase-tracker-advance">' +
          '<h3 class="dr-phase-tracker-advance-title">Required to advance to <strong>' + nextPhaseCode + '</strong> &mdash; ' + escapeHtml(nextPhaseLabel) + '</h3>' +
          '<ul class="dr-phase-tracker-blockers">' + (blockerItems || '<li class="dr-phase-tracker-empty">No blocking documents found.</li>') + '</ul>' +
          (allAccepted
            ? '<div class="dr-phase-tracker-ready" role="status">' +
                '<p><strong>All required documents accepted.</strong> Director will advance your engagement to ' + nextPhaseCode + ' shortly.</p>' +
              '</div>'
            : '<p class="dr-phase-tracker-blurb">' +
                'Director-controlled. When all required documents are accepted, your engagement advances. ' +
                'There is no automatic advance.' +
              '</p>') +
        '</section>';
    } else {
      // No more blocking phases ahead — engagement is at terminal state or
      // beyond this build's modelled phases.
      advancePanelHtml =
        '<section class="dr-phase-tracker-advance">' +
          '<p class="dr-phase-tracker-blurb">No further blocking documents identified for this phase.</p>' +
        '</section>';
    }

    body.innerHTML =
      '<ol class="dr-phase-tracker-chevrons" aria-label="Engagement phase progression">' + chevronsHtml + '</ol>' +
      advancePanelHtml;

    // Wire 'Go to document' links — smooth-scroll to the matching tile in
    // the document vault and briefly highlight it.
    var blockerLinks = body.querySelectorAll('[data-blocker-doc-id]');
    for (var l = 0; l < blockerLinks.length; l++) (function (link) {
      link.addEventListener('click', function (ev) {
        ev.preventDefault();
        var docId = link.getAttribute('data-blocker-doc-id');
        var tile = document.querySelector('.dr-doc-tile[data-document-id="' + docId + '"]');
        if (!tile) return;
        // Ensure vault is expanded so the tile is visible
        var aside = document.getElementById('dr-document-vault');
        if (aside && aside.dataset.collapsed === 'true') {
          var t = aside.querySelector('[data-vault-toggle]');
          if (t) t.click();
        }
        try { tile.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        catch (e) { tile.scrollIntoView(); }
        tile.classList.add('dr-doc-tile-highlighted');
        setTimeout(function () { tile.classList.remove('dr-doc-tile-highlighted'); }, 2000);
      });
    })(blockerLinks[l]);
  }

  function injectDocumentVault(opts) {
    var alreadyExists = !!document.getElementById('dr-document-vault');
    opts = opts || {};
    // Landing-root match accepts both '/partners/sim-2026/' (GitHub Pages
    // directory URL) AND '/partners/sim-2026/index.html' (direct file path).
    // Sub-pages (configurator/, documents/, pathway/, status/, auth-callback/)
    // get collapsed-by-default vault.
    var rawPath = window.location.pathname;
    var stripped = rawPath.replace(/\/index\.html?$/, '/').replace(/\/+$/, '');
    var pathLandingRoot = (stripped === WORKSPACE_ROOT.replace(/\/+$/, ''));
    var collapsedByDefault = (typeof opts.collapsedByDefault === 'boolean')
      ? opts.collapsedByDefault
      : !pathLandingRoot;
    if (!alreadyExists) {
      var anchor =
        document.getElementById('dr-phase-tracker') ||
        document.querySelector('.dr-subpage-nav-section') ||
        document.querySelector('.dr-main .dr-container .dr-hero');
      if (!anchor) return;
      var aside = document.createElement('aside');
      aside.id = 'dr-document-vault';
      aside.className = 'dr-vault' + (collapsedByDefault ? ' dr-vault-collapsed' : '');
      aside.dataset.collapsed = collapsedByDefault ? 'true' : 'false';
      aside.setAttribute('aria-label', 'Document Vault');
      aside.innerHTML =
        '<header class="dr-vault-header">' +
          '<h2 class="dr-vault-title">Document Vault</h2>' +
          '<button type="button" class="dr-vault-toggle" data-vault-toggle aria-expanded="' + (collapsedByDefault ? 'false' : 'true') + '">' +
            (collapsedByDefault ? '▸' : '▾') +
          '</button>' +
        '</header>' +
        '<div class="dr-vault-body" data-vault-body>' +
          '<div class="dr-vault-pending">Loading documents&hellip;</div>' +
        '</div>';
      anchor.insertAdjacentElement('afterend', aside);
      bindVaultStaticHandlers_();
      // Single subscription to auth-state changes — re-loads vault when
      // session transitions (sign-in / sign-out / token refresh).
      window.addEventListener('dr-auth-state-changed', refreshDocumentVault_);
    }
    // Always (re-)load on inject so navigation back to a workspace page
    // surfaces fresh state. refresh is a no-op until the body is mounted.
    refreshDocumentVault_();
  }

  function bindVaultStaticHandlers_() {
    var toggleBtn = document.querySelector('[data-vault-toggle]');
    if (toggleBtn && !toggleBtn.dataset.bound) {
      toggleBtn.dataset.bound = '1';
      toggleBtn.addEventListener('click', function () {
        var aside = document.getElementById('dr-document-vault');
        if (!aside) return;
        var nowCollapsed = aside.dataset.collapsed !== 'true' ? true : false;
        aside.dataset.collapsed = nowCollapsed ? 'true' : 'false';
        aside.classList.toggle('dr-vault-collapsed', nowCollapsed);
        toggleBtn.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
        toggleBtn.textContent = nowCollapsed ? '▸' : '▾';
      });
    }
  }

  // ─── Vault data loader (REST per amended §4.4 Path I) ──────
  async function callDealroomRest_(path, queryString) {
    // queryString is pre-built (no leading '?'); caller controls encoding so
    // PostgREST or=(...) and complex filters work without URLSearchParams
    // mangling parens or commas.
    var session = await getDealroomSession_();
    if (!session) throw new Error('Not authenticated');
    var url = SUPABASE_URL + '/rest/v1/' + path + (queryString ? '?' + queryString : '');
    var res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + session.access_token,
        Accept: 'application/json'
      }
    });
    if (!res.ok) {
      var errBody = '';
      try { errBody = await res.text(); } catch (e) {}
      var err = new Error('REST ' + path + ' failed: ' + res.status);
      err.status = res.status;
      err.body = errBody;
      throw err;
    }
    return await res.json();
  }

  async function loadVaultData_() {
    var clidParam = encodeURIComponent(CLID);
    var catalogSelect = 'document_id,doc_code,clid,name,description,kind,available_from_phase,is_blocking_phase_advance,version_label,display_order,storage_path,file_size_bytes,mime_type';
    var uploadsSelect = 'upload_id,document_id,version_number,status,uploaded_by_email,original_filename,mime_type,file_size_bytes,created_at,review_notes';
    var clidsSelect = 'clid,counterparty_name,gate_state,is_simulation,is_launch_partner';

    var results = await Promise.all([
      callDealroomRest_('dealroom_documents_catalog',
        'or=(clid.eq.' + clidParam + ',clid.is.null)' +
        '&deleted_at=is.null' +
        '&select=' + catalogSelect +
        '&order=available_from_phase.asc,display_order.asc'),
      callDealroomRest_('partner_clids',
        'clid=eq.' + clidParam + '&select=' + clidsSelect),
      callDealroomRest_('dealroom_uploads',
        'clid=eq.' + clidParam +
        '&deleted_at=is.null' +
        '&status=neq.superseded' +
        '&select=' + uploadsSelect +
        '&order=document_id.asc,version_number.desc')
    ]);

    var catalog = results[0] || [];
    var clidRow = (results[1] && results[1][0]) || null;
    var uploadsRows = results[2] || [];

    // Pick the highest-version live upload per (document_id). Rows are already
    // ordered by document_id ASC then version_number DESC, so first occurrence wins.
    var uploadsByDocId = Object.create(null);
    for (var i = 0; i < uploadsRows.length; i++) {
      var u = uploadsRows[i];
      if (u && u.document_id != null && !uploadsByDocId[u.document_id]) {
        uploadsByDocId[u.document_id] = u;
      }
    }

    return { catalog: catalog, clidRow: clidRow, uploadsByDocId: uploadsByDocId, fetchedAt: Date.now() };
  }

  async function refreshDocumentVault_() {
    var body = document.querySelector('[data-vault-body]');
    if (!body) return;
    var session = await getDealroomSession_();
    if (!session) {
      body.innerHTML =
        '<div class="dr-vault-unauth">' +
          '<p>Sign in to access your dealroom documents.</p>' +
          '<button type="button" class="dr-btn-primary" data-vault-signin>Sign in</button>' +
        '</div>';
      var signinBtn = body.querySelector('[data-vault-signin]');
      if (signinBtn) signinBtn.addEventListener('click', showAuthModal_);
      return;
    }
    body.innerHTML = '<div class="dr-vault-pending">Loading documents&hellip;</div>';
    try {
      var data = await loadVaultData_();
      // Cache for the phase tracker (commit 10) so it doesn't re-query.
      window.__dealRoomVaultData = data;
      renderVaultBody_(data);
    } catch (err) {
      console.error('[Phase 3] vault load failed:', err);
      body.innerHTML =
        '<div class="dr-vault-error" role="alert">' +
          '<p>Could not load documents. ' + escapeHtml((err && err.message) || '') + '</p>' +
          '<button type="button" class="dr-btn-secondary" data-vault-retry>Retry</button>' +
        '</div>';
      var retryBtn = body.querySelector('[data-vault-retry]');
      if (retryBtn) retryBtn.addEventListener('click', refreshDocumentVault_);
    }
  }

  function renderVaultBody_(data) {
    var body = document.querySelector('[data-vault-body]');
    if (!body) return;
    var catalog = data.catalog || [];
    var clidRow = data.clidRow;
    var uploadsByDocId = data.uploadsByDocId || {};

    if (catalog.length === 0) {
      body.innerHTML = '<div class="dr-vault-empty">No documents associated with this engagement yet.</div>';
      return;
    }

    var currentGateState = (clidRow && clidRow.gate_state) || 'phase_0';

    // Partition: templates first; everything else by phase.
    var templates = [];
    var byPhase = Object.create(null);
    for (var i = 0; i < catalog.length; i++) {
      var row = catalog[i];
      if (row.kind === 'template') {
        templates.push(row);
        continue;
      }
      var phase = row.available_from_phase || 'phase_0';
      if (!byPhase[phase]) byPhase[phase] = [];
      byPhase[phase].push(row);
    }

    var html = '';

    // Templates section (always-visible, above phase groups)
    if (templates.length > 0) {
      html += '<section class="dr-vault-templates">' +
                '<h3 class="dr-vault-section-title">Templates</h3>' +
                '<p class="dr-vault-section-blurb">Reference documents available throughout your engagement.</p>' +
                '<div class="dr-vault-template-tiles">' +
                  templates.map(function (t) { return renderDocTile_(t, null, currentGateState); }).join('') +
                '</div>' +
              '</section>';
    }

    // Phase sections in canonical order
    var phaseOrder = ['phase_0', 'phase_a', 'phase_b', 'phase_c', 'phase_d', 'phase_e', 'phase_f', 'all_phases'];
    var phaseSections = '';
    for (var p = 0; p < phaseOrder.length; p++) {
      var phaseCode = phaseOrder[p];
      var docs = byPhase[phaseCode];
      if (!docs || docs.length === 0) continue;
      var isCurrent = (phaseCode === currentGateState);
      var rank = PHASE_RANK[phaseCode] != null ? PHASE_RANK[phaseCode] : 0;
      var currentRank = PHASE_RANK[currentGateState] != null ? PHASE_RANK[currentGateState] : 0;
      var stateAttr = isCurrent ? 'current' : (rank < currentRank ? 'completed' : 'future');
      phaseSections +=
        '<section class="dr-vault-phase" data-phase="' + escapeHtml(phaseCode) + '" data-state="' + stateAttr + '">' +
          '<h3 class="dr-vault-phase-title">' +
            '<span class="dr-vault-phase-code">' + escapeHtml(phaseCode) + '</span> &mdash; ' +
            escapeHtml(PHASE_LABELS[phaseCode] || phaseCode) +
          '</h3>' +
          '<div class="dr-vault-phase-docs">' +
            docs.map(function (d) { return renderDocTile_(d, uploadsByDocId[d.document_id] || null, currentGateState); }).join('') +
          '</div>' +
        '</section>';
    }
    if (phaseSections) {
      html += '<div class="dr-vault-phases">' + phaseSections + '</div>';
    }

    body.innerHTML = html;
    bindDocTileHandlers_();
  }

  // Tile renderer + handlers — basic skeleton in this commit; commits 6-8
  // populate kind-specific actions (release preview/download, template
  // download, requirement upload/replace).
  function renderDocTile_(catalogRow, uploadRow, currentGateState) {
    var kind = catalogRow.kind || 'release';
    var status = computeTileStatus_(catalogRow, uploadRow, currentGateState);
    var statusLabel = tileStatusLabel_(status, uploadRow);
    var versionTag = (uploadRow && uploadRow.version_number > 1) ? ' v' + uploadRow.version_number : '';
    return '<article class="dr-doc-tile" data-document-id="' + escapeHtml(catalogRow.document_id) + '" ' +
                  'data-kind="' + escapeHtml(kind) + '" ' +
                  'data-status="' + escapeHtml(status) + '"' +
                  (uploadRow ? ' data-upload-id="' + escapeHtml(uploadRow.upload_id) + '"' : '') + '>' +
             '<header class="dr-doc-tile-header">' +
               '<span class="dr-doc-tile-kind-badge" data-kind="' + escapeHtml(kind) + '">' + escapeHtml(kind) + '</span>' +
               '<span class="dr-doc-tile-status-pill" data-status="' + escapeHtml(status) + '">' + escapeHtml(statusLabel + versionTag) + '</span>' +
             '</header>' +
             '<h4 class="dr-doc-tile-name">' + escapeHtml(catalogRow.name || catalogRow.doc_code || 'Document') + '</h4>' +
             (catalogRow.description
               ? '<p class="dr-doc-tile-description">' + escapeHtml(catalogRow.description) + '</p>'
               : '') +
             (kind === 'template' ? renderTemplateRelevanceCaption_(catalogRow, currentGateState) : '') +
             '<footer class="dr-doc-tile-actions" data-tile-actions>' +
               renderTileActionsPlaceholder_(kind, status) +
             '</footer>' +
           '</article>';
  }

  function computeTileStatus_(catalogRow, uploadRow, currentGateState) {
    var kind = catalogRow.kind || 'release';
    if (kind === 'template') return 'available';
    if (kind === 'requirement') {
      if (uploadRow && uploadRow.status) return uploadRow.status; // 'open' | 'submitted' | 'accepted' | 'declined'
      return 'open';
    }
    // release: phase-gated
    var requiredPhase = catalogRow.available_from_phase || 'phase_0';
    var requiredRank = PHASE_RANK[requiredPhase] != null ? PHASE_RANK[requiredPhase] : 0;
    var currentRank = PHASE_RANK[currentGateState] != null ? PHASE_RANK[currentGateState] : 0;
    return (currentRank >= requiredRank) ? 'available' : 'locked';
  }

  function tileStatusLabel_(status, uploadRow) {
    switch (status) {
      case 'open':       return 'Open — awaiting upload';
      case 'submitted':  return 'Submitted — awaiting review';
      case 'accepted':   return 'Accepted';
      case 'declined':   return 'Declined — see notes';
      case 'available':  return 'Available';
      case 'locked':     return 'Locked';
      default:           return status || '—';
    }
  }

  function renderTileActionsPlaceholder_(kind, status) {
    if (kind === 'release') {
      if (status === 'available') {
        return '<button type="button" class="dr-btn-secondary dr-doc-action" data-doc-action="preview">Preview</button>' +
               '<button type="button" class="dr-btn-primary dr-doc-action" data-doc-action="download">Download</button>';
      }
      return '<span class="dr-doc-tile-locked-note">Unlocks at later phase</span>';
    }
    if (kind === 'template') {
      // Templates: always available to authenticated partner_contacts (§10.3).
      // Phase-gating is informational (caption only); Download is always enabled.
      return '<button type="button" class="dr-btn-primary dr-doc-action" data-doc-action="download">Download</button>';
    }
    if (kind === 'requirement') {
      // Status-driven action set per brief §7.5.
      switch (status) {
        case 'open':
          return '<button type="button" class="dr-btn-primary dr-doc-action" data-doc-action="upload">Upload</button>';
        case 'submitted':
          return '<button type="button" class="dr-btn-secondary dr-doc-action" data-doc-action="view">View submitted file</button>' +
                 '<button type="button" class="dr-btn-primary dr-doc-action" data-doc-action="replace">Replace</button>';
        case 'accepted':
          return '<button type="button" class="dr-btn-secondary dr-doc-action" data-doc-action="view">View accepted file</button>';
        case 'declined':
          return '<button type="button" class="dr-btn-secondary dr-doc-action" data-doc-action="view-notes">View Director notes</button>' +
                 '<button type="button" class="dr-btn-primary dr-doc-action" data-doc-action="upload">Re-upload</button>';
      }
      return '<span class="dr-doc-tile-locked-note">Status unknown</span>';
    }
    return '';
  }

  // Template tiles render an additional "Becomes relevant at phase_X" caption
  // when available_from_phase is in the future relative to current gate_state.
  // Mounted in renderDocTile_ via a separate branch when kind === 'template'.
  function renderTemplateRelevanceCaption_(catalogRow, currentGateState) {
    var availFrom = catalogRow.available_from_phase || 'phase_0';
    var availRank = PHASE_RANK[availFrom] != null ? PHASE_RANK[availFrom] : 0;
    var currentRank = PHASE_RANK[currentGateState] != null ? PHASE_RANK[currentGateState] : 0;
    if (availRank <= currentRank) return '';
    var label = PHASE_LABELS[availFrom] || availFrom;
    return '<p class="dr-doc-tile-relevance-caption">' +
             'Becomes relevant at <strong>' + escapeHtml(availFrom) + '</strong> &mdash; ' + escapeHtml(label) +
           '</p>';
  }

  function bindDocTileHandlers_() {
    var actionBtns = document.querySelectorAll('.dr-doc-tile [data-doc-action]');
    for (var i = 0; i < actionBtns.length; i++) (function (btn) {
      btn.addEventListener('click', function () {
        var tile = btn.closest('.dr-doc-tile');
        if (!tile) return;
        var action = btn.getAttribute('data-doc-action');
        handleDocAction_(tile, action);
      });
    })(actionBtns[i]);
  }

  // ─── EF helpers (POST JSON with user JWT) ──────────────────
  async function callDealroomEf_(slug, body) {
    var session = await getDealroomSession_();
    if (!session) throw new Error('Not authenticated');
    var res = await fetch(SUPABASE_URL + '/functions/v1/' + slug, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token
      },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) {
      var errBody = '';
      try { errBody = await res.text(); } catch (e) {}
      var err = new Error(slug + ' failed: ' + res.status);
      err.status = res.status;
      err.body = errBody;
      throw err;
    }
    return await res.json();
  }

  // ─── Tile action handlers ──────────────────────────────────
  // Preview (5-min TTL signed URL → new tab) and Download (30-min TTL
  // signed URL → forced download via anchor[download]).
  async function handleDocAction_(tile, action) {
    if (!tile || !action) return;
    if (action === 'preview' || action === 'download') {
      return handleFetchAction_(tile, action);
    }
    if (action === 'view') {
      // Open the latest submitted/accepted upload in a preview tab.
      return handleFetchAction_(tile, 'preview');
    }
    if (action === 'upload' || action === 'replace') {
      return handleUploadAction_(tile);
    }
    if (action === 'view-notes') {
      return handleViewNotesAction_(tile);
    }
    console.warn('[Phase 3] unhandled doc action:', action);
  }

  // Surfaces the Director's review_notes inline when a requirement was declined.
  // Read from the cached vault data (window.__dealRoomVaultData) so we don't
  // need an extra REST round-trip per click.
  function handleViewNotesAction_(tile) {
    var documentId = tile.getAttribute('data-document-id');
    var cached = window.__dealRoomVaultData;
    var uploadRow = cached && cached.uploadsByDocId ? cached.uploadsByDocId[documentId] : null;
    var notesText = (uploadRow && uploadRow.review_notes) || '';
    var existing = tile.querySelector('.dr-doc-tile-notes');
    if (existing) {
      existing.remove();
      return;
    }
    var notesBlock = document.createElement('div');
    notesBlock.className = 'dr-doc-tile-notes';
    notesBlock.setAttribute('role', 'region');
    notesBlock.setAttribute('aria-label', 'Director notes');
    notesBlock.innerHTML =
      '<h5 class="dr-doc-tile-notes-title">Director notes</h5>' +
      '<p class="dr-doc-tile-notes-body">' + escapeHtml(notesText || 'No notes recorded.') + '</p>';
    var actionsBox = tile.querySelector('[data-tile-actions]');
    if (actionsBox) actionsBox.insertAdjacentElement('beforebegin', notesBlock);
    else tile.appendChild(notesBlock);
  }

  // Stub upload handler — opens the OS file picker, validates client-side,
  // and (in commit 9) issues the multipart-with-progress submission to
  // dealroom-document-upload v1.
  function handleUploadAction_(tile) {
    var documentId = tile.getAttribute('data-document-id');
    if (!documentId) return;
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.remove();
      if (!file) return;
      submitRequirementUpload_(tile, file);
    });
    fileInput.click();
  }

  // ─── Upload flow (multipart + XHR progress + version UX) ───
  var UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
  var UPLOAD_PROGRESS_THRESHOLD = 5 * 1024 * 1024; // show progress bar for files > 5 MB
  var UPLOAD_ALLOWED_MIME = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];

  function validateUploadFile_(file) {
    if (!file) return { ok: false, error: 'No file selected.' };
    if (file.size === 0) return { ok: false, error: 'Empty file.' };
    if (file.size > UPLOAD_MAX_BYTES) {
      return { ok: false, error: 'File too large (max 50 MB).' };
    }
    var mime = file.type || '';
    if (UPLOAD_ALLOWED_MIME.indexOf(mime) === -1) {
      return { ok: false, error: 'Unsupported file type. Use PDF, DOCX, DOC, or TXT.' };
    }
    return { ok: true };
  }

  function callDealroomUploadXhr_(formData, onProgress) {
    return new Promise(async function (resolve, reject) {
      var session;
      try { session = await getDealroomSession_(); }
      catch (e) { reject(e); return; }
      if (!session) { reject(new Error('Not authenticated')); return; }
      var xhr = new XMLHttpRequest();
      xhr.open('POST', SUPABASE_URL + '/functions/v1/dealroom-document-upload');
      xhr.setRequestHeader('Authorization', 'Bearer ' + session.access_token);
      // Note: do NOT set Content-Type — the browser sets the multipart
      // boundary header automatically when given a FormData body.
      if (typeof onProgress === 'function' && xhr.upload) {
        xhr.upload.addEventListener('progress', function (ev) {
          if (ev.lengthComputable) {
            onProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        });
      }
      xhr.addEventListener('load', function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch (e) { reject(new Error('Invalid JSON from upload EF')); }
        } else {
          var msg = xhr.responseText || ('HTTP ' + xhr.status);
          var err = new Error('upload failed: ' + msg);
          err.status = xhr.status;
          err.body = xhr.responseText;
          reject(err);
        }
      });
      xhr.addEventListener('error', function () { reject(new Error('Network error during upload')); });
      xhr.addEventListener('abort', function () { reject(new Error('Upload aborted')); });
      xhr.send(formData);
    });
  }

  async function submitRequirementUpload_(tile, file) {
    var documentId = tile.getAttribute('data-document-id');
    if (!documentId) return;
    var actionsBox = tile.querySelector('[data-tile-actions]');
    var prevActionsHtml = actionsBox ? actionsBox.innerHTML : '';

    // Client-side validation (server re-validates as authoritative gate)
    var v = validateUploadFile_(file);
    if (!v.ok) {
      if (actionsBox) {
        actionsBox.innerHTML = '<span class="dr-doc-tile-action-error">' + escapeHtml(v.error) + '</span>';
        setTimeout(function () { actionsBox.innerHTML = prevActionsHtml; bindDocTileHandlers_(); }, 4000);
      }
      return;
    }

    var showProgressBar = file.size > UPLOAD_PROGRESS_THRESHOLD;
    if (actionsBox) {
      if (showProgressBar) {
        actionsBox.innerHTML =
          '<div class="dr-upload-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
            '<div class="dr-upload-progress-bar" data-upload-bar style="width:0%"></div>' +
            '<span class="dr-upload-progress-label" data-upload-label>Uploading 0%</span>' +
          '</div>';
      } else {
        actionsBox.innerHTML = '<span class="dr-doc-tile-actions-pending">Uploading&hellip;</span>';
      }
    }

    var formData = new FormData();
    formData.append('clid', CLID);
    formData.append('catalog_document_id', documentId);
    formData.append('file', file);

    function onProgress(pct) {
      if (!actionsBox) return;
      var bar = actionsBox.querySelector('[data-upload-bar]');
      var label = actionsBox.querySelector('[data-upload-label]');
      if (bar) bar.style.width = pct + '%';
      if (label) label.textContent = 'Uploading ' + pct + '%';
      var progressEl = actionsBox.querySelector('.dr-upload-progress');
      if (progressEl) progressEl.setAttribute('aria-valuenow', String(pct));
    }

    try {
      var res = await callDealroomUploadXhr_(formData, showProgressBar ? onProgress : null);
      try {
        if (window.gtag) window.gtag('event', 'dealroom_document_upload', {
          clid: CLID, document_id: documentId,
          version_number: res && res.version_number,
          status: res && res.status
        });
      } catch (e) {}
      var versionTxt = (res && res.version_number > 1) ? 'v' + res.version_number : '';
      showToast_('Upload received' + (versionTxt ? ' (' + versionTxt + ')' : '') + ' — Director will review.');
      // Refresh the entire vault — this picks up the new upload's status pill
      // (now 'submitted'), the new version_number tag, and any other tile that
      // shifted state (e.g. previous version marked superseded server-side).
      await refreshDocumentVault_();
    } catch (err) {
      console.error('[Phase 3] upload failed:', err);
      var msg = (err && err.message) ? err.message : 'Upload failed.';
      // Sanitize EF body if present for inline display
      if (err && err.body && err.body.length < 200) msg = err.body;
      if (actionsBox) {
        actionsBox.innerHTML =
          '<span class="dr-doc-tile-action-error">' + escapeHtml(msg) + '</span>' +
          '<button type="button" class="dr-btn-secondary dr-doc-action" data-doc-action="upload">Retry</button>';
        bindDocTileHandlers_();
      }
    }
  }

  // ─── Toast (lightweight, transient inline notifier) ────────
  function showToast_(message, opts) {
    opts = opts || {};
    var ttlMs = opts.ttlMs || 3500;
    var existing = document.getElementById('dr-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'dr-toast';
    toast.className = 'dr-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    document.body.appendChild(toast);
    // Trigger CSS transition by adding class on next frame
    requestAnimationFrame(function () { toast.classList.add('dr-toast-visible'); });
    setTimeout(function () {
      toast.classList.remove('dr-toast-visible');
      setTimeout(function () { try { toast.remove(); } catch (e) {} }, 250);
    }, ttlMs);
  }

  async function handleFetchAction_(tile, action) {
    var documentId = tile.getAttribute('data-document-id');
    var uploadId = tile.getAttribute('data-upload-id');
    var actionsBox = tile.querySelector('[data-tile-actions]');
    var prevActionsHtml = actionsBox ? actionsBox.innerHTML : '';
    if (actionsBox) {
      actionsBox.innerHTML = '<span class="dr-doc-tile-actions-pending">' +
        (action === 'preview' ? 'Preparing preview&hellip;' : 'Preparing download&hellip;') +
        '</span>';
    }
    try {
      var body = { clid: CLID, action: action };
      // For requirement uploads, the tile's data-upload-id is the live
      // upload row; that's what dealroom-document-fetch keys off when both
      // catalog_document_id and upload_id are mutually exclusive. Releases
      // and templates use catalog_document_id.
      var kind = tile.getAttribute('data-kind');
      if (kind === 'requirement' && uploadId) {
        body.upload_id = uploadId;
      } else {
        body.catalog_document_id = documentId;
      }
      var res = await callDealroomEf_('dealroom-document-fetch', body);
      if (!res || !res.signed_url) {
        throw new Error('No signed URL returned');
      }
      if (action === 'preview') {
        try { window.open(res.signed_url, '_blank', 'noopener,noreferrer'); }
        catch (e) { window.location.href = res.signed_url; }
      } else { // download
        var a = document.createElement('a');
        a.href = res.signed_url;
        a.download = res.filename || res.name || 'document';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      // Restore action buttons after a short delay so the user sees the
      // pending state momentarily.
      setTimeout(function () {
        if (actionsBox) actionsBox.innerHTML = prevActionsHtml;
        bindDocTileHandlers_();
      }, 250);
      try {
        if (window.gtag) window.gtag('event', 'dealroom_document_' + action, {
          clid: CLID, document_id: documentId, kind: kind || 'release'
        });
      } catch (e) {}
    } catch (err) {
      console.error('[Phase 3] document fetch failed:', err);
      if (actionsBox) {
        actionsBox.innerHTML = '<span class="dr-doc-tile-action-error">' +
          escapeHtml((err && err.message) || 'Could not fetch document.') +
          '</span>';
        // Restore the original buttons after a longer pause so user can read
        // the error.
        setTimeout(function () {
          actionsBox.innerHTML = prevActionsHtml;
          bindDocTileHandlers_();
        }, 4000);
      }
    }
  }

  // ============================================================
  // AMD-120 PHASE B STOP 1 — universal-skeleton helpers
  // AILANE-CC-BRIEF-DEALROOM-V7-PHASE-B-001
  // Director ratification 4 May 2026:
  //   • 5-item menu bar (slugs unchanged; labels per Director — Deal Creator
  //     for /configurator/, Engagement for /status/)
  //   • Eileen-explanation block + Data Source Attribution block (universal,
  //     mounted by mountAttributionBlock; brief §5.5 verbatim text inside
  //     the existing Fix-pack-002 .dr-attribution-block class — option α)
  //   • "What's happening" snapshot (landing-only, four tiles, empty-state
  //     copy in all three cases: localhost-no-auth, prod-zero-rows, prod-401)
  // ============================================================

  // ─── Menu bar (universal, sticky, 5 items) ──────────────────
  function injectMenuBar() {
    if (document.getElementById('dr-menu-bar')) return;
    var header = document.querySelector('.dr-header');
    if (!header) return;

    var path = window.location.pathname.replace(/\/index\.html?$/, '/');
    var workspaceRootStripped = WORKSPACE_ROOT.replace(/\/+$/, '');
    var stripped = path.replace(/\/+$/, '');

    var items = [
      { slug: 'welcome',      label: 'Welcome',      href: WORKSPACE_ROOT,                     match: function () { return stripped === workspaceRootStripped; } },
      { slug: 'documents',    label: 'Documents',    href: WORKSPACE_ROOT + 'documents/',      match: function () { return path.indexOf('/documents/') !== -1; } },
      { slug: 'engagement',   label: 'Engagement',   href: WORKSPACE_ROOT + 'status/',         match: function () { return path.indexOf('/status/') !== -1; } },
      { slug: 'deal-creator', label: 'Deal Creator', href: WORKSPACE_ROOT + 'configurator/',   match: function () { return path.indexOf('/configurator/') !== -1; } },
      { slug: 'pathway',      label: 'Pathway',      href: WORKSPACE_ROOT + 'pathway/',        match: function () { return path.indexOf('/pathway/') !== -1; } }
    ];

    var inner = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var current = it.match() ? ' is-current' : '';
      inner += '<a class="dr-menu-item' + current + '" href="' + it.href + '" data-menu-slug="' + it.slug + '">' +
                 escapeHtml(it.label) +
               '</a>';
    }

    var nav = document.createElement('nav');
    nav.id = 'dr-menu-bar';
    nav.className = 'dr-menu-bar';
    nav.setAttribute('aria-label', 'Deal-room navigation');
    nav.innerHTML = '<div class="dr-menu-bar-inner">' + inner + '</div>';

    header.insertAdjacentElement('afterend', nav);
  }

  // ─── Data Source Attribution block (universal — brief §5.5) ──
  // Reuses the Fix-pack-002 .dr-attribution-block class library
  // (style.css L1845-1899). Idempotent. Mounted before footer
  // by injecting after the last <section> in .dr-container.
  function mountAttributionBlock() {
    if (document.getElementById('dr-attribution-block')) return;
    var container = document.querySelector('.dr-main .dr-container');
    if (!container) return;

    var section = document.createElement('section');
    section.id = 'dr-attribution-block';
    section.className = 'dr-attribution-block';
    section.innerHTML =
      '<h3 class="dr-attribution-title">Data sources</h3>' +
      '<p class="dr-attribution-intro">Eileen draws her answers from three layers maintained by AI Lane Limited:</p>' +
      '<ol class="dr-attribution-list" style="list-style:decimal;">' +
        '<li><strong>Statutory provisions</strong> &mdash; UK legislation under the Open Government Licence v3.0, sourced from legislation.gov.uk and consolidated in the AI Lane Knowledge Library.</li>' +
        '<li><strong>Leading cases</strong> &mdash; Employment Tribunal, Employment Appeal Tribunal, Court of Appeal, and Supreme Court decisions, with held principle and significance maintained in the AI Lane Knowledge Library.</li>' +
        '<li data-source="ailane-original"><strong>Institutional training corpus</strong> &mdash; Curated content from AI Lane Limited&rsquo;s own ratified specifications, governed by the master amendment register AILANE-AMD-REG-001.</li>' +
      '</ol>' +
      '<p class="dr-attribution-footer">Source attribution and version metadata are surfaced inline whenever Eileen quotes a specific provision, case, or specification. Forthcoming-change disclosures (e.g. DUAA 2025 multi-wave commencement) carry a Tier 5 forward disclaimer.</p>';

    container.appendChild(section);
  }

  // ─── "What's happening" snapshot (landing-only) ──────────────
  // Renders 4 tiles: current phase, latest counter-proposal,
  // open FCRs (with shortest SLA), recent Director responses.
  // Empty-state copy is truthful in all three observable cases:
  //   (i)  localhost-without-auth  → 401 from RLS, render empty-state
  //   (ii) production-with-zero-rows → render empty-state
  //   (iii) production-with-rows → replace empty-state with live data
  // Hard network failure (not 401) renders an unobtrusive "Unable to
  // load — please refresh" inline. No console suppression.
  function populateWhatsHappening() {
    var anchor = document.getElementById('dr-whats-happening');
    if (!anchor) return;   // Sub-pages don't render this section
    if (anchor.dataset.populated === '1') return;
    anchor.dataset.populated = '1';

    // Render skeleton with empty-state defaults (production-with-zero-rows
    // is the truthful baseline; live data replaces in place when present)
    anchor.innerHTML =
      '<h2 class="dr-whats-happening-title">What&rsquo;s happening in this deal-room</h2>' +
      '<p class="dr-whats-happening-sub">Live snapshot of the engagement state visible to your team.</p>' +
      '<div class="dr-wh-grid">' +
        '<article class="dr-wh-tile" data-wh-tile="phase">' +
          '<span class="dr-wh-tile-eyebrow">Current phase</span>' +
          '<div class="dr-wh-tile-body">' +
            '<div class="dr-wh-tile-empty">Loading phase status&hellip;</div>' +
          '</div>' +
        '</article>' +
        '<article class="dr-wh-tile" data-wh-tile="proposal">' +
          '<span class="dr-wh-tile-eyebrow">Latest counter-proposal</span>' +
          '<div class="dr-wh-tile-body">' +
            '<div class="dr-wh-tile-empty">No counter-proposals submitted yet. Once a configuration is submitted from Deal Creator, the most recent appears here.</div>' +
          '</div>' +
        '</article>' +
        '<article class="dr-wh-tile" data-wh-tile="fcrs">' +
          '<span class="dr-wh-tile-eyebrow">Open capability requests</span>' +
          '<div class="dr-wh-tile-body">' +
            '<div class="dr-wh-tile-empty">No open capability requests. New off-estate requests Eileen lodges with the Director appear here while under review.</div>' +
          '</div>' +
        '</article>' +
        '<article class="dr-wh-tile" data-wh-tile="responses">' +
          '<span class="dr-wh-tile-eyebrow">Recent Director responses</span>' +
          '<div class="dr-wh-tile-body">' +
            '<div class="dr-wh-tile-empty">No Director responses yet.</div>' +
          '</div>' +
        '</article>' +
      '</div>';

    // Async live-data fetches. Each tile updates independently; one tile's
    // failure does not break the others.
    fetchPhaseTile_();
    fetchLatestProposalTile_();
    fetchOpenFcrsTile_();
    fetchRecentDirectorResponsesTile_();
  }

  function whTileBody_(tileSlug) {
    var tile = document.querySelector('[data-wh-tile="' + tileSlug + '"] .dr-wh-tile-body');
    return tile || null;
  }

  async function fetchPhaseTile_() {
    var body = whTileBody_('phase');
    if (!body) return;
    var user = window.__dealRoomUser;
    var token = (user && user.token) || null;
    if (!token) {
      // Sandbox / no-auth: RLS will 401. Render the truthful empty-state.
      body.innerHTML = '<div class="dr-wh-tile-empty">Phase status unavailable &mdash; sign in to view.</div>';
      return;
    }
    try {
      var phase = await fetchClidGateState(token, CLID);
      var label = (phase === 'phase_0') ? 'Phase 0 — Pre-engagement'
                : 'Phase ' + (GATE_DISPLAY[phase] || phase);
      var human = (PHASE_LABELS[phase] || '').replace(/^./, function (c) { return c; });
      body.innerHTML =
        '<div class="dr-wh-tile-headline">' + escapeHtml(label) + '</div>' +
        (human ? '<div class="dr-wh-tile-meta">' + escapeHtml(human) + '</div>' : '');
    } catch (err) {
      console.error('[STOP 1] phase tile fetch failed:', err);
      body.innerHTML = '<div class="dr-wh-tile-error">Unable to load &mdash; please refresh.</div>';
    }
  }

  async function fetchLatestProposalTile_() {
    var body = whTileBody_('proposal');
    if (!body) return;
    var user = window.__dealRoomUser;
    var token = (user && user.token) || null;
    if (!token) return;   // Empty-state already in DOM
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/partner_counter_proposals' +
          '?clid=eq.' + encodeURIComponent(CLID) +
          '&select=submitted_at,config_summary,estimated_annual_value_min,estimated_annual_value_max,director_response_status,urgency_flag,eileen_evaluation_pending' +
          '&order=submitted_at.desc&limit=1',
        { headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
      );
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return;
        throw new Error('HTTP ' + res.status);
      }
      var rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) return;
      var p = rows[0];
      var dateStr = p.submitted_at ? new Date(p.submitted_at).toLocaleDateString('en-GB') : '';
      var rangeStr = '';
      if (p.estimated_annual_value_min != null && p.estimated_annual_value_max != null) {
        rangeStr = '£' + Number(p.estimated_annual_value_min).toLocaleString('en-GB') +
                   '–£' + Number(p.estimated_annual_value_max).toLocaleString('en-GB');
      }
      var statusStr = p.eileen_evaluation_pending
        ? 'Eileen acknowledged; Director reviewing'
        : (p.director_response_status || 'awaiting Director');
      var summary = (p.config_summary || '').slice(0, 140);
      body.innerHTML =
        '<div class="dr-wh-tile-headline">' + escapeHtml(summary || '(no summary)') + '</div>' +
        (rangeStr ? '<div class="dr-wh-tile-meta">' + escapeHtml(rangeStr) + ' /year &middot; ' + escapeHtml(statusStr) + '</div>'
                  : '<div class="dr-wh-tile-meta">' + escapeHtml(statusStr) + '</div>') +
        (dateStr ? '<div class="dr-wh-tile-meta">Submitted ' + escapeHtml(dateStr) + '</div>' : '');
    } catch (err) {
      console.error('[STOP 1] latest-proposal tile fetch failed:', err);
      body.innerHTML = '<div class="dr-wh-tile-error">Unable to load &mdash; please refresh.</div>';
    }
  }

  async function fetchOpenFcrsTile_() {
    var body = whTileBody_('fcrs');
    if (!body) return;
    var user = window.__dealRoomUser;
    var token = (user && user.token) || null;
    if (!token) return;
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/feature_capability_requests' +
          '?clid=eq.' + encodeURIComponent(CLID) +
          '&director_review_status=eq.pending' +
          '&select=id,request_summary,submitted_at,sla_target_response_at' +
          '&order=sla_target_response_at.asc',
        { headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
      );
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return;
        throw new Error('HTTP ' + res.status);
      }
      var rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) return;
      var count = rows.length;
      var soonest = rows[0];
      var slaStr = '';
      if (soonest && soonest.sla_target_response_at) {
        var msRemaining = new Date(soonest.sla_target_response_at).getTime() - Date.now();
        var workingDays = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
        slaStr = 'Director response due in ' + workingDays + ' day' + (workingDays === 1 ? '' : 's');
      }
      body.innerHTML =
        '<div class="dr-wh-tile-headline">' + count + ' open</div>' +
        (slaStr ? '<div class="dr-wh-tile-meta">' + escapeHtml(slaStr) + '</div>' : '');
    } catch (err) {
      console.error('[STOP 1] open-FCRs tile fetch failed:', err);
      body.innerHTML = '<div class="dr-wh-tile-error">Unable to load &mdash; please refresh.</div>';
    }
  }

  async function fetchRecentDirectorResponsesTile_() {
    var body = whTileBody_('responses');
    if (!body) return;
    var user = window.__dealRoomUser;
    var token = (user && user.token) || null;
    if (!token) return;
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/feature_capability_requests' +
          '?clid=eq.' + encodeURIComponent(CLID) +
          '&director_review_status=in.(accepted,declined,roadmapped)' +
          '&select=id,request_summary,director_review_status,director_response_at' +
          '&order=director_response_at.desc&limit=3',
        { headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
      );
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return;
        throw new Error('HTTP ' + res.status);
      }
      var rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) return;
      var items = rows.map(function (r) {
        var when = r.director_response_at ? new Date(r.director_response_at).toLocaleDateString('en-GB') : '';
        return '<li>' +
                 '<strong>' + escapeHtml((r.request_summary || '').slice(0, 80)) + '</strong>' +
                 '<span class="dr-wh-tile-list-meta">' + escapeHtml(r.director_review_status) + (when ? ' &middot; ' + when : '') + '</span>' +
               '</li>';
      }).join('');
      body.innerHTML = '<ul class="dr-wh-tile-list">' + items + '</ul>';
    } catch (err) {
      console.error('[STOP 1] recent-responses tile fetch failed:', err);
      body.innerHTML = '<div class="dr-wh-tile-error">Unable to load &mdash; please refresh.</div>';
    }
  }

  // ============================================================
  // AMD-120 PHASE B STOP 2 — Documents page Artefacts view
  // AILANE-CC-BRIEF-DEALROOM-V7-PHASE-B-001 §7
  // Universal Eileen-explanation injector (deploys to all sub-pages
  // that don't already carry the static block — Welcome has it static).
  // Filter bar + unified Artefacts list across 5 source tables.
  // Specification clarification needed: brief §7.1 references
  // dealroom_documents_catalog.category column which does not exist on
  // the live schema; standalone counterparty-upload widget deferred
  // accordingly. Existing PR #174 per-tile upload UX preserved.
  // ============================================================

  // ─── Universal Eileen-explanation injector (every sub-page) ──
  // Welcome has the block as static HTML; sub-pages get it via injection.
  // Idempotent (no-op when block already present).
  function mountEileenExplanation() {
    if (document.querySelector('.dr-eileen-explanation')) return;
    var hero = document.querySelector('.dr-main .dr-container .dr-hero');
    if (!hero) return;
    var section = document.createElement('section');
    section.className = 'dr-eileen-explanation';
    section.setAttribute('aria-label', 'About Eileen');
    section.innerHTML =
      '<p>' +
        'Eileen is Ailane&rsquo;s intelligence entity, named after the founder&rsquo;s mother Ellen. She draws on three layers ' +
        '&mdash; UK statutory provisions, leading employment-law cases, and Ailane&rsquo;s own ratified specifications &mdash; ' +
        'to give you regulatory and contractual context for any question you raise. She can produce draft template skeletons, ' +
        'surface live pricing for configurations you propose, and triage off-estate requests to the Director with a 10 ' +
        'UK-working-day SLA. She does not commit to commercial terms, give legal advice, or replace counsel; commitments ' +
        'require a signed contract, and statutory advice requires regulated counsel.' +
      '</p>';
    hero.insertAdjacentElement('afterend', section);
  }

  // ─── Artefacts view (Documents page only) ─────────────────────
  var ARTEFACT_CATEGORIES = [
    { code: 'all',           label: 'All' },
    { code: 'templates',     label: 'Templates' },
    { code: 'proposals',     label: 'Counter-Proposals' },
    { code: 'fcrs',          label: 'FCRs' },
    { code: 'conversations', label: 'Eileen Conversations' },
    { code: 'directorups',   label: 'Director Uploads' }
  ];
  var ARTEFACT_EMPTY_STATES = {
    all:           'No artefacts in this deal-room yet. Templates appear when the Director makes them available; counter-proposals and capability requests appear once submitted; Eileen conversations are filed automatically as you talk to her.',
    templates:     'No templates available for this engagement yet. Templates are reusable document skeletons the Director makes available throughout the engagement.',
    proposals:     'No counter-proposals submitted yet. Compose a configuration in Deal Creator and submit it for Director review.',
    fcrs:          'No capability requests yet. Eileen lodges off-estate requests with the Director when one comes up in conversation; Director responds within 10 UK working days.',
    conversations: 'No saved conversations yet. Conversations with Eileen are filed automatically once the deal-room is signed in.',
    directorups:   'No Director-released documents yet. Documents the Director places into the deal-room appear here, phase-gated.'
  };
  var ARTEFACTS_STATE = { filter: 'all', loaded: false, rows: [] };

  function populateArtefactsView() {
    var anchor = document.getElementById('dr-artefacts-list');
    var bar = document.getElementById('dr-artefacts-filter-bar');
    if (!anchor || !bar) return;
    if (anchor.dataset.populated === '1') return;
    anchor.dataset.populated = '1';

    // Render filter bar (chips)
    var chips = '';
    for (var i = 0; i < ARTEFACT_CATEGORIES.length; i++) {
      var c = ARTEFACT_CATEGORIES[i];
      var active = (ARTEFACTS_STATE.filter === c.code) ? ' is-active' : '';
      chips += '<button type="button" class="dr-artefact-chip' + active + '" role="tab" aria-selected="' + (active ? 'true' : 'false') + '" data-artefact-filter="' + c.code + '">' +
                 escapeHtml(c.label) +
               '</button>';
    }
    bar.innerHTML = chips;
    bindArtefactFilterBar_();

    fetchAllArtefacts_();
  }

  function bindArtefactFilterBar_() {
    var btns = document.querySelectorAll('[data-artefact-filter]');
    for (var i = 0; i < btns.length; i++) (function (btn) {
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-artefact-filter');
        if (!code || code === ARTEFACTS_STATE.filter) return;
        ARTEFACTS_STATE.filter = code;
        // Update chip active states
        var allBtns = document.querySelectorAll('[data-artefact-filter]');
        for (var j = 0; j < allBtns.length; j++) {
          allBtns[j].classList.toggle('is-active', allBtns[j].getAttribute('data-artefact-filter') === code);
          allBtns[j].setAttribute('aria-selected', allBtns[j].getAttribute('data-artefact-filter') === code ? 'true' : 'false');
        }
        renderArtefactsList_();
      });
    })(btns[i]);
  }

  async function fetchAllArtefacts_() {
    var user = window.__dealRoomUser;
    var token = (user && user.token) || null;
    var rows = [];

    if (!token) {
      // Sandbox / no-auth: render the same empty-state copy that authenticated
      // zero-row users see. Truthful in all three observable cases per Chairman
      // STOP 1 modification of deviation 3.
      ARTEFACTS_STATE.loaded = true;
      ARTEFACTS_STATE.rows = [];
      renderArtefactsList_();
      return;
    }

    var hdrs = { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' };
    var clidParam = encodeURIComponent(CLID);

    var fetches = [
      // Templates — kind='template' across all clids (catalog is shared, but visibility is RLS-gated)
      fetch(SUPABASE_URL + '/rest/v1/dealroom_documents_catalog?or=(clid.eq.' + clidParam + ',clid.is.null)&deleted_at=is.null&kind=eq.template&select=document_id,doc_code,name,description,version_label,storage_path,available_from_phase,created_at&order=display_order.asc', { headers: hdrs }),
      // Director Uploads — kind='release' (Director-released catalog rows for this clid)
      fetch(SUPABASE_URL + '/rest/v1/dealroom_documents_catalog?or=(clid.eq.' + clidParam + ',clid.is.null)&deleted_at=is.null&kind=eq.release&select=document_id,doc_code,name,description,version_label,storage_path,available_from_phase,created_at&order=display_order.asc', { headers: hdrs }),
      // Counter-proposals
      fetch(SUPABASE_URL + '/rest/v1/partner_counter_proposals?clid=eq.' + clidParam + '&select=id,config_summary,estimated_annual_value_min,estimated_annual_value_max,director_response_status,urgency_flag,eileen_evaluation_pending,submitted_at,submitted_by_email&order=submitted_at.desc', { headers: hdrs }),
      // FCRs
      fetch(SUPABASE_URL + '/rest/v1/feature_capability_requests?clid=eq.' + clidParam + '&select=id,request_summary,request_category,director_review_status,director_response_text,director_response_at,sla_target_response_at,submitted_at,requester_email&order=submitted_at.desc', { headers: hdrs }),
      // Eileen conversations (RLS auto-filters by user_id)
      fetch(SUPABASE_URL + '/rest/v1/dealroom_eileen_sessions?clid=eq.' + clidParam + '&select=session_id,message_count,prompt_version,created_at,updated_at&order=updated_at.desc', { headers: hdrs })
    ];

    try {
      var responses = await Promise.all(fetches);
      var [tpls, releases, props, fcrs, convs] = await Promise.all(responses.map(function (r) {
        return r.ok ? r.json() : Promise.resolve([]);
      }));

      // Normalise into a unified row shape: { type, name, drafted_by, when, raw }
      (tpls || []).forEach(function (r) {
        rows.push({ type: 'templates', id: r.document_id, name: r.name || r.doc_code, drafted_by: 'Director',
                    when: r.created_at, hasFile: !!r.storage_path, raw: r });
      });
      (releases || []).forEach(function (r) {
        rows.push({ type: 'directorups', id: r.document_id, name: r.name || r.doc_code, drafted_by: 'Director',
                    when: r.created_at, hasFile: !!r.storage_path, raw: r });
      });
      (props || []).forEach(function (r) {
        rows.push({ type: 'proposals', id: r.id, name: r.config_summary || '(unnamed configuration)',
                    drafted_by: 'Counterparty', when: r.submitted_at, hasFile: false, raw: r });
      });
      (fcrs || []).forEach(function (r) {
        rows.push({ type: 'fcrs', id: r.id, name: r.request_summary || r.request_category || '(unnamed request)',
                    drafted_by: 'Eileen', when: r.submitted_at, hasFile: false, raw: r });
      });
      (convs || []).forEach(function (r) {
        var lbl = 'Eileen conversation — ' + (r.message_count || 0) + ' message' + ((r.message_count === 1) ? '' : 's');
        rows.push({ type: 'conversations', id: r.session_id, name: lbl, drafted_by: 'Eileen',
                    when: r.updated_at || r.created_at, hasFile: false, raw: r });
      });

      rows.sort(function (a, b) { return (b.when || '').localeCompare(a.when || ''); });

      ARTEFACTS_STATE.loaded = true;
      ARTEFACTS_STATE.rows = rows;
      renderArtefactsList_();
    } catch (err) {
      console.error('[STOP 2] fetchAllArtefacts failed:', err);
      var anchor = document.getElementById('dr-artefacts-list');
      if (anchor) anchor.innerHTML = '<div class="dr-artefacts-error">Unable to load &mdash; please refresh.</div>';
    }
  }

  function renderArtefactsList_() {
    var anchor = document.getElementById('dr-artefacts-list');
    if (!anchor) return;
    var filter = ARTEFACTS_STATE.filter;
    var filtered = (filter === 'all') ? ARTEFACTS_STATE.rows
                                      : ARTEFACTS_STATE.rows.filter(function (r) { return r.type === filter; });
    if (!ARTEFACTS_STATE.loaded) {
      anchor.innerHTML = '<div class="dr-artefacts-pending">Loading artefacts&hellip;</div>';
      return;
    }
    if (filtered.length === 0) {
      anchor.innerHTML = '<div class="dr-artefacts-empty">' + escapeHtml(ARTEFACT_EMPTY_STATES[filter] || ARTEFACT_EMPTY_STATES.all) + '</div>';
      return;
    }
    var rowsHtml = '';
    for (var i = 0; i < filtered.length; i++) {
      var r = filtered[i];
      var dateStr = r.when ? new Date(r.when).toLocaleDateString('en-GB') : '';
      var catLbl = (function (t) {
        return ({ templates: 'Template', proposals: 'Counter-proposal', fcrs: 'FCR', conversations: 'Eileen conversation', directorups: 'Director upload' })[t] || t;
      })(r.type);
      var actionLabel = r.hasFile ? 'View' : 'Open';
      rowsHtml +=
        '<article class="dr-artefact-row" data-artefact-type="' + escapeHtml(r.type) + '" data-artefact-id="' + escapeHtml(String(r.id)) + '">' +
          '<div class="dr-artefact-row-main">' +
            '<div class="dr-artefact-row-name">' + escapeHtml(r.name) + '</div>' +
            '<div class="dr-artefact-row-meta">' +
              '<span class="dr-artefact-row-cat">' + escapeHtml(catLbl) + '</span>' +
              '<span class="dr-artefact-row-by">Drafted by ' + escapeHtml(r.drafted_by) + '</span>' +
              (dateStr ? '<span class="dr-artefact-row-date">' + escapeHtml(dateStr) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="dr-artefact-row-actions">' +
            '<button type="button" class="dr-btn-secondary dr-artefact-view-btn" data-artefact-view>' + actionLabel + '</button>' +
          '</div>' +
        '</article>';
    }
    anchor.innerHTML = rowsHtml;
    bindArtefactRowHandlers_();
  }

  function bindArtefactRowHandlers_() {
    var btns = document.querySelectorAll('[data-artefact-view]');
    for (var i = 0; i < btns.length; i++) (function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.dr-artefact-row');
        if (!row) return;
        var type = row.getAttribute('data-artefact-type');
        var id = row.getAttribute('data-artefact-id');
        viewArtefact_(type, id);
      });
    })(btns[i]);
  }

  async function viewArtefact_(type, id) {
    var artefact = ARTEFACTS_STATE.rows.find(function (r) { return r.type === type && String(r.id) === String(id); });
    if (!artefact) return;
    if (artefact.hasFile) {
      // Catalog rows with storage_path → signed URL via dealroom-document-fetch EF
      try {
        var user = window.__dealRoomUser;
        if (!user || !user.token) return;
        var res = await fetch(SUPABASE_URL + '/functions/v1/dealroom-document-fetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + user.token,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ clid: CLID, catalog_document_id: id, action: 'preview' })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        if (data && data.signed_url) {
          window.open(data.signed_url, '_blank', 'noopener,noreferrer');
        } else {
          alert('Document temporarily unavailable.');
        }
      } catch (err) {
        console.error('[STOP 2] viewArtefact (file) failed:', err);
        alert('Could not open document. Please try again or contact partnerships@ailane.ai.');
      }
      return;
    }
    // Non-file artefacts → details modal
    var title = '', body = '';
    if (type === 'proposals') {
      var p = artefact.raw;
      var range = (p.estimated_annual_value_min != null && p.estimated_annual_value_max != null)
        ? '£' + Number(p.estimated_annual_value_min).toLocaleString('en-GB') + '–£' + Number(p.estimated_annual_value_max).toLocaleString('en-GB') + ' /year'
        : 'Range not set';
      title = 'Counter-proposal';
      body = '<dl class="dr-artefact-detail-list">' +
               '<dt>Configuration</dt><dd>' + escapeHtml(p.config_summary || '(no summary)') + '</dd>' +
               '<dt>Estimated annual value</dt><dd>' + escapeHtml(range) + '</dd>' +
               '<dt>Status</dt><dd>' + escapeHtml(p.eileen_evaluation_pending ? 'Eileen acknowledged; Director reviewing' : (p.director_response_status || 'awaiting Director')) + '</dd>' +
               '<dt>Urgency</dt><dd>' + escapeHtml(p.urgency_flag || 'standard') + '</dd>' +
               '<dt>Submitted</dt><dd>' + escapeHtml(p.submitted_at ? new Date(p.submitted_at).toLocaleString('en-GB') : '') + '</dd>' +
               '<dt>Submitted by</dt><dd>' + escapeHtml(p.submitted_by_email || '') + '</dd>' +
             '</dl>';
    } else if (type === 'fcrs') {
      var f = artefact.raw;
      var sla = '';
      if (f.sla_target_response_at) {
        var msRem = new Date(f.sla_target_response_at).getTime() - Date.now();
        var days = Math.ceil(msRem / (1000 * 60 * 60 * 24));
        sla = (days >= 0) ? ('Director response due in ' + days + ' day' + (days === 1 ? '' : 's')) : 'SLA elapsed';
      }
      title = 'Feature / capability request';
      body = '<dl class="dr-artefact-detail-list">' +
               '<dt>Request</dt><dd>' + escapeHtml(f.request_summary || '(no summary)') + '</dd>' +
               '<dt>Category</dt><dd>' + escapeHtml(f.request_category || '') + '</dd>' +
               '<dt>Status</dt><dd>' + escapeHtml(f.director_review_status || '') + '</dd>' +
               (sla ? '<dt>SLA</dt><dd>' + escapeHtml(sla) + '</dd>' : '') +
               (f.director_response_text ? '<dt>Director response</dt><dd>' + escapeHtml(f.director_response_text) + '</dd>' : '') +
               '<dt>Submitted</dt><dd>' + escapeHtml(f.submitted_at ? new Date(f.submitted_at).toLocaleString('en-GB') : '') + '</dd>' +
             '</dl>';
    } else if (type === 'conversations') {
      var c = artefact.raw;
      title = 'Eileen conversation';
      body = '<dl class="dr-artefact-detail-list">' +
               '<dt>Messages</dt><dd>' + escapeHtml(String(c.message_count || 0)) + '</dd>' +
               '<dt>Eileen prompt version</dt><dd>' + escapeHtml(c.prompt_version || '') + '</dd>' +
               '<dt>Started</dt><dd>' + escapeHtml(c.created_at ? new Date(c.created_at).toLocaleString('en-GB') : '') + '</dd>' +
               '<dt>Updated</dt><dd>' + escapeHtml(c.updated_at ? new Date(c.updated_at).toLocaleString('en-GB') : '') + '</dd>' +
             '</dl>' +
             '<p class="dr-artefact-detail-note">Conversation transcript view is on the Eileen panel after the next session resumes.</p>';
    } else {
      title = 'Artefact';
      body = '<p>No detail view configured for this artefact type.</p>';
    }
    showArtefactDetailsModal_(title, body);
  }

  function showArtefactDetailsModal_(title, bodyHtml) {
    var existing = document.getElementById('dr-artefact-modal-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'dr-artefact-modal-overlay';
    overlay.className = 'dr-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="dr-modal-card">' +
        '<h3 class="dr-modal-title">' + escapeHtml(title) + '</h3>' +
        '<div class="dr-modal-body">' + bodyHtml + '</div>' +
        '<div class="dr-modal-actions">' +
          '<button type="button" class="dr-modal-btn dr-modal-btn-primary" data-modal-close>Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) close(); });
    var closeBtn = overlay.querySelector('[data-modal-close]');
    if (closeBtn) closeBtn.addEventListener('click', close);
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindSignOut();
    bindDocumentClicks();
  });

  startGuard();
})();
