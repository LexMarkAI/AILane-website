/* =============================================================================
 * Charity Onboarding Room — auth guard
 * AILANE-CC-BRIEF-CSO-ROOM-WEB-001 §1 — magic-link gate modelled on the
 * legal-oversight / deal-room reference (signInWithOtp, shouldCreateUser:false,
 * emailRedirectTo the current room page). RULE 26 shape: <body> stays hidden
 * until the auth state is resolved; failures never show error UI — the visitor
 * is silently returned to the in-room magic-link gate. The Supabase client is
 * used for AUTH ONLY; all data access is raw fetch via api.js (RULE 2).
 *
 * Pre-provisioning branch: while config.js still carries the __ANON_KEY__
 * placeholder there is no live auth backend — the room opens in read-only
 * preview with the synthetic banner (a completion state per brief).
 * ============================================================================= */
(function () {
  'use strict';

  var CFG = window.CHARITY_ROOM;
  var client = null;

  if (CFG.PROVISIONED && window.supabase) {
    client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    });
  }
  window.charityRoomSupabase = client;

  function reveal() { document.body.style.visibility = 'visible'; }

  /* getSession → onAuthStateChange fallback with 6s timeout (RULE 26 §3) */
  async function resolveSession() {
    var r = await client.auth.getSession();
    if (r && r.data && r.data.session) return r.data.session;
    return await new Promise(function (resolve) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 6000);
      client.auth.onAuthStateChange(function (_event, session) {
        if (!done && session) { done = true; clearTimeout(t); resolve(session); }
      });
    });
  }

  /* In-room magic-link gate (the §0(b) reference pattern). Failure is silent:
   * no error detail beyond the invitation wording; never an error page. */
  function mountSignInShell() {
    document.body.innerHTML =
      '<div class="gate-shell"><div class="signin">' +
        '<h2>' + CFG.CHARITY_NAME + '</h2>' +
        '<p class="sub">' + CFG.ROOM_LABEL + ' &middot; sign in to continue. ' +
        'We will email you a secure one-tap sign-in link.</p>' +
        '<form id="cg-signin-form" autocomplete="on">' +
          '<div class="field"><label for="cg-email">Your email</label>' +
            '<input id="cg-email" type="email" inputmode="email" autocomplete="email" required ' +
            'placeholder="you@charity.example"></div>' +
          '<button class="btn gold" id="cg-signin-btn" type="submit" style="width:100%">Email me a sign-in link</button>' +
          '<div class="msg info hidden" id="cg-signin-msg" aria-live="polite"></div>' +
        '</form>' +
        '<div class="foot">Access is by invitation. Use the email address your invitation was sent to. ' +
        'Operated by AI Lane Limited &middot; Company No. 17035654 &middot; ICO Reg. No. 00013389720.</div>' +
      '</div></div>';
    reveal();

    document.getElementById('cg-signin-form').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var btn = document.getElementById('cg-signin-btn');
      var msg = document.getElementById('cg-signin-msg');
      var email = (document.getElementById('cg-email').value || '').trim().toLowerCase();
      if (!email) return;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      msg.className = 'msg info hidden';
      var failed = false;
      try {
        var r = await client.auth.signInWithOtp({
          email: email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: window.location.origin + window.location.pathname
          }
        });
        failed = !!r.error;
      } catch (e) { failed = true; }
      btn.disabled = false;
      btn.textContent = 'Email me a sign-in link';
      msg.className = 'msg info';
      msg.textContent = failed
        ? 'We could not start sign-in for that address. Access is by invitation — please use the email your invitation was sent to.'
        : 'Check your email — we have sent a secure sign-in link. It opens this room directly.';
      if (!failed) { try { if (window.gtag) window.gtag('event', 'charity_room_magiclink_sent'); } catch (e2) {} }
    });
  }

  /* Page guard. onReady(state) runs once the room may render.
   * state = { mode: 'live'|'preview', session, email, token } */
  async function guard(onReady) {
    var state = { mode: 'preview', session: null, email: null, token: null };
    window.CHARITY_ROOM_STATE = state;

    if (!CFG.PROVISIONED || !client) {
      /* Pre-provisioning preview — every live surface degrades gracefully */
      reveal();
      if (typeof onReady === 'function') onReady(state);
      return;
    }

    var session = null;
    try { session = await resolveSession(); } catch (e) { session = null; }
    if (!session) { mountSignInShell(); return; }

    /* RULE 2: decode the JWT directly — no client data calls at callback time */
    var email = '';
    try { email = (JSON.parse(atob(session.access_token.split('.')[1])).email || '').toLowerCase(); } catch (e) {}
    if (!email && session.user) email = (session.user.email || '').toLowerCase();

    state.session = session;
    state.email = email;
    state.token = session.access_token;
    state.mode = 'live';

    /* Blocking entry gate (Terms + Privacy) before anything renders */
    window.charityRoomEntryGate.run(state, function (mode) {
      state.mode = mode;
      reveal();
      if (typeof onReady === 'function') onReady(state);
    });
  }

  async function signOut() {
    if (client) { try { await client.auth.signOut(); } catch (e) {} }
    window.location.href = CFG.ROOM_HOME;
  }

  window.charityRoomAuth = { guard: guard, signOut: signOut };
})();
