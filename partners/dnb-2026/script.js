/* ============================================================
   AI LANE × DUN & BRADSTREET DEAL ROOM
   ------------------------------------------------------------
   Shared auth guard, sign-out, GA4 events, Eileen counterparty
   chat panel, and gate-state-driven document gating.
   Brief: AILANE-CC-BRIEF-DEAL-ROOM-PHASE-1B-001 v1.0
   Auth pattern: RULE 26 / RULE 2 (JWT decode + raw fetch).
   ============================================================ */

(function () {
  var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NDQ5MDIsImV4cCI6MjA1NzEyMDkwMn0.LMfOjHp97P9MKaOeaK3GI2JCQ7kj5Kxpuq6llLD-1H0';
  var DIRECTOR_EMAIL = 'mark@ailane.ai';
  var ALLOWED_TIER = 'institutional';
  var CLID = 'dnb-2026-001';

  var GATE_ORDER = ['pre_engagement', 'A', 'B', 'C', 'D', 'E', 'F'];

  function redirectToLogin() {
    window.location.replace('/login/');
  }

  function decodeJwt(token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
  }

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

  async function fetchClidGateState(token, clid) {
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/partner_clids?clid=eq.' + encodeURIComponent(clid) + '&select=gate_state&limit=1',
        { headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_ANON_KEY, 'Accept': 'application/json' } }
      );
      if (!res.ok) return 'pre_engagement';
      var rows = await res.json();
      return (rows && rows[0] && rows[0].gate_state) ? rows[0].gate_state : 'pre_engagement';
    } catch (e) {
      return 'pre_engagement';
    }
  }

  async function checkAccess(session) {
    var token = session && session.access_token;
    if (!token) return redirectToLogin();
    var payload = decodeJwt(token);
    if (!payload || !payload.sub) return redirectToLogin();

    var email = payload.email || '';

    // Path 1 — Director email fallback (RULE 26)
    if (email === DIRECTOR_EMAIL) {
      window.__dealRoomUser = { id: payload.sub, email: email, tier: 'director', token: token, role: 'director', clid: CLID };
      return revealPage();
    }

    // Path 2 — institutional tier
    var tier = await fetchSubscriptionTier(token, payload.sub);
    if (tier === ALLOWED_TIER) {
      window.__dealRoomUser = { id: payload.sub, email: email, tier: tier, token: token, role: 'institutional', clid: CLID };
      return revealPage();
    }

    // Path 3 — partner_contacts row scoped to this CLID
    var contact = await fetchPartnerContact(token, payload.sub, CLID);
    if (contact && contact.status === 'active') {
      window.__dealRoomUser = {
        id: payload.sub,
        email: email,
        tier: tier || 'partner',
        token: token,
        role: 'partner_contact',
        clid: CLID,
        role_title: contact.role_title || null
      };
      return revealPage();
    }

    return redirectToLogin();
  }

  function revealPage() {
    var emailEl = document.getElementById('dr-user-email');
    if (emailEl && window.__dealRoomUser) emailEl.textContent = window.__dealRoomUser.email;
    document.body.style.visibility = 'visible';
    bindEileenPanel();
    applyDocumentGating();
  }

  function startGuard() {
    if (!window.supabase || !window.supabase.createClient) return redirectToLogin();
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.__dealRoomSb = sb;

    (async function () {
      try {
        var result = await sb.auth.getSession();
        var session = result && result.data ? result.data.session : null;
        if (session) return checkAccess(session);

        await new Promise(function (resolve) {
          var done = false;
          var t = setTimeout(function () { if (!done) { done = true; redirectToLogin(); resolve(); } }, 6000);
          sb.auth.onAuthStateChange(function (_event, s) {
            if (done) return;
            if (s) { done = true; clearTimeout(t); checkAccess(s).finally(resolve); }
          });
        });
      } catch (e) {
        redirectToLogin();
      }
    })();
  }

  function bindSignOut() {
    var btn = document.getElementById('dr-signout');
    if (!btn) return;
    btn.addEventListener('click', async function (ev) {
      ev.preventDefault();
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

  // ── Eileen counterparty chat panel ─────────────────────
  function bindEileenPanel() {
    var panel = document.getElementById('dr-eileen-panel');
    var input = document.getElementById('dr-eileen-input');
    var sendBtn = document.getElementById('dr-eileen-send');
    var transcript = document.getElementById('dr-eileen-transcript');
    if (!panel || !input || !sendBtn || !transcript) return;
    if (panel.dataset.bound === '1') return;
    panel.dataset.bound = '1';

    var conversationMessages = [];

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

    async function sendMessage() {
      var text = (input.value || '').trim();
      if (!text) return;
      if (!window.__dealRoomUser || !window.__dealRoomUser.token) return;

      sendBtn.disabled = true;
      appendBubble('user', text);
      input.value = '';
      conversationMessages.push({ role: 'user', content: text });

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

  // ── Gate-state-driven document gating (documents page) ─
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
      var label = (releasedPhase === 'pre_engagement')
        ? 'Released pre-engagement'
        : 'Released on Phase ' + releasedPhase + ' execution';
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

  document.addEventListener('DOMContentLoaded', function () {
    bindSignOut();
    bindDocumentClicks();
  });

  startGuard();
})();
