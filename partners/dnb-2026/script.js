/* ============================================================
   AI LANE × DUN & BRADSTREET DEAL ROOM
   ------------------------------------------------------------
   Shared auth guard, sign-out, GA4 events.
   Brief: AILANE-CC-BRIEF-DEAL-ROOM-PHASE-1A-001 v1.1
   Auth pattern: RULE 26 / RULE 2 (JWT decode + raw fetch).
   No Edge Function calls. No Eileen logic. Phase 1A static only.
   ============================================================ */

(function () {
  var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NDQ5MDIsImV4cCI6MjA1NzEyMDkwMn0.LMfOjHp97P9MKaOeaK3GI2JCQ7kj5Kxpuq6llLD-1H0';
  var DIRECTOR_EMAIL = 'mark@ailane.ai';
  var ALLOWED_TIER = 'institutional';

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

  async function checkAccess(session) {
    var token = session && session.access_token;
    if (!token) return redirectToLogin();
    var payload = decodeJwt(token);
    if (!payload || !payload.sub) return redirectToLogin();

    var email = payload.email || '';
    var tier = await fetchSubscriptionTier(token, payload.sub);

    var allowed = (tier === ALLOWED_TIER) || (email === DIRECTOR_EMAIL);
    if (!allowed) return redirectToLogin();

    window.__dealRoomUser = { id: payload.sub, email: email, tier: tier || 'director-fallback', token: token };
    revealPage();
  }

  function revealPage() {
    var emailEl = document.getElementById('dr-user-email');
    if (emailEl && window.__dealRoomUser) emailEl.textContent = window.__dealRoomUser.email;
    document.body.style.visibility = 'visible';
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

  document.addEventListener('DOMContentLoaded', function () {
    bindSignOut();
    bindDocumentClicks();
  });

  startGuard();
})();
