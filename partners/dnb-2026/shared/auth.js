/* =============================================================================
 * AILANE Deal-Room Auth Layer
 * AILANE-AMD-REG-001 / AMD-107 (Stage F.2 front-end rebuild)
 *
 * Drop into: /partners/dnb-2026/shared/auth.js
 *
 * Responsibilities:
 *   - Supabase client singleton (window.dealroomSupabase)
 *   - Session resolution + CLID + gate_state lookup
 *   - Magic-link sign-in
 *   - Sign-out
 *   - Email-based authorisation gate (only emails matched to active
 *     partner_contacts rows are admitted into the deal-room)
 *
 * Dependencies (load order):
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="auth.js"></script>
 *   <script src="api.js"></script>
 *
 * AMD-106 v5 taxonomy: gate_state values are phase_0 / phase_a / phase_b /
 * phase_1 / phase_2 / phase_f. Read directly; no client-side translation.
 * ============================================================================= */

(function() {
  'use strict';

  // ----- Configuration ---------------------------------------------------
  const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';

  // ----- Client singleton ------------------------------------------------
  if (!window.supabase) {
    console.error('[dealroom-auth] supabase JS UMD bundle missing. Include @supabase/supabase-js@2 before auth.js.');
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // handle magic-link returns
    },
  });

  window.dealroomSupabase = supabase;
  window.dealroomConfig = { SUPABASE_URL, SUPABASE_ANON_KEY };

  // ----- Session resolution ---------------------------------------------
  // Returns a normalised session object:
  //   { authenticated, authorised, user, contact, clid, counterparty_name,
  //     gate_state, package_selection, is_director }
  async function resolveSession() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session) {
      return { authenticated: false, authorised: false };
    }

    const user = session.user;
    const userEmail = (user.email || '').toLowerCase();
    const isDirector = userEmail === 'mark@ailane.ai';

    // Look up the partner_contact row for this user_id, status='active'.
    const { data: contact, error: contactErr } = await supabase
      .from('partner_contacts')
      .select('contact_id, clid, full_name, role_title, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (contactErr) {
      console.warn('[dealroom-auth] partner_contacts lookup error:', contactErr);
    }

    if (!contact) {
      // Authenticated but not an active partner contact — no deal-room access.
      // Director (mark@ailane.ai) is admitted as administrator without a contact row.
      if (isDirector) {
        return {
          authenticated: true,
          authorised: true,
          user,
          contact: null,
          clid: null,
          counterparty_name: 'Director Access',
          gate_state: 'phase_f', // director sees all phases
          package_selection: null,
          is_director: true,
        };
      }
      return {
        authenticated: true,
        authorised: false,
        user,
        contact: null,
        clid: null,
        gate_state: null,
        is_director: false,
      };
    }

    // Look up the partner_clids row for the resolved CLID.
    const { data: clidRow, error: clidErr } = await supabase
      .from('partner_clids')
      .select('counterparty_name, gate_state, package_selection, pkg4_eligible')
      .eq('clid', contact.clid)
      .single();

    if (clidErr) {
      console.warn('[dealroom-auth] partner_clids lookup error:', clidErr);
    }

    return {
      authenticated: true,
      authorised: true,
      user,
      contact,
      clid: contact.clid,
      counterparty_name: clidRow?.counterparty_name || contact.clid,
      gate_state: clidRow?.gate_state || 'phase_0',
      package_selection: clidRow?.package_selection || null,
      pkg4_eligible: clidRow?.pkg4_eligible || false,
      is_director: isDirector,
    };
  }

  // ----- Magic-link sign-in ---------------------------------------------
  // Sends an OTP magic-link email to the address. The redirect target is the
  // current page URL — Supabase JS handles the URL hash on return.
  async function sendMagicLink(email) {
    if (!email || !/^.+@.+\..+$/.test(email)) {
      return { ok: false, error: { message: 'Please enter a valid email address.' } };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
        shouldCreateUser: false, // do not auto-create users; only existing partner_contacts allowed
      },
    });

    if (error) {
      return { ok: false, error };
    }
    return { ok: true };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // ----- Phase ranking utility ------------------------------------------
  // v5 taxonomy per AMD-106. Higher rank = later phase.
  const PHASE_RANK = {
    phase_0: 0,
    phase_a: 1,
    phase_b: 2,
    phase_1: 3,
    phase_2: 4,
    phase_f: 5,
  };

  const PHASE_LABEL = {
    phase_0: 'Phase 0 — Pre-engagement',
    phase_a: 'Phase A — Discovery (NDA in progress)',
    phase_b: 'Phase B — NDA Executed (MCA in progress)',
    phase_1: 'Phase 1 — Active Engagement',
    phase_2: 'Phase 2 — Expansion',
    phase_f: 'Phase F — Renewal',
  };

  function isPhaseUnlocked(currentPhase, requiredPhase) {
    if (!requiredPhase) return true;
    if (requiredPhase === 'all_phases') return true;
    const cur = PHASE_RANK[currentPhase];
    const req = PHASE_RANK[requiredPhase];
    if (cur === undefined || req === undefined) return false;
    return cur >= req;
  }

  // ----- Page-level guard -----------------------------------------------
  // Mounts a sign-in shell into the document body if no session is present,
  // or if the session is not authorised. Otherwise calls onReady(session).
  // Pages call: dealroomAuth.guard({ requireGate: 'phase_0', onReady: (s) => {...} })
  async function guard({ requireGate, onReady, onSignIn } = {}) {
    const session = await resolveSession();

    if (!session.authenticated) {
      mountSignInShell({ onSignIn });
      return null;
    }

    if (!session.authorised) {
      mountUnauthorisedShell(session);
      return null;
    }

    if (requireGate && !isPhaseUnlocked(session.gate_state, requireGate)) {
      mountPhaseLockedShell(session, requireGate);
      return null;
    }

    if (typeof onReady === 'function') {
      try { await onReady(session); } catch (e) { console.error('[dealroom-auth] onReady error:', e); }
    }
    return session;
  }

  // ----- Sign-in shell (mounted when no session) ------------------------
  function mountSignInShell({ onSignIn } = {}) {
    document.body.innerHTML = `
      <div class="dr-signin-shell">
        <div class="dr-signin-card">
          <div class="dr-signin-header">
            <div class="dr-header-brand-mark">AL</div>
            <div class="dr-signin-title">Ailane Deal-Room</div>
            <div class="dr-signin-subtitle">Sign in to continue. Magic link will be sent to your registered email.</div>
          </div>
          <form id="drSignInForm" autocomplete="off">
            <div class="dr-form-group">
              <label class="dr-label" for="drEmail">Registered email</label>
              <input id="drEmail" class="dr-input" type="email" required placeholder="you@company.com" autofocus>
            </div>
            <button type="submit" class="dr-btn dr-btn-primary dr-btn-lg" style="width:100%">
              <span id="drSignInBtnLabel">Send magic link</span>
            </button>
          </form>
          <div id="drSignInMessage" style="margin-top:18px;"></div>
        </div>
      </div>
    `;

    document.getElementById('drSignInForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = document.getElementById('drEmail').value;
      const btn = document.querySelector('#drSignInForm button');
      const lbl = document.getElementById('drSignInBtnLabel');
      const msg = document.getElementById('drSignInMessage');
      btn.disabled = true;
      lbl.innerHTML = '<span class="dr-spinner"></span> Sending…';
      msg.innerHTML = '';

      const result = await sendMagicLink(email);

      btn.disabled = false;
      lbl.textContent = 'Send magic link';

      if (result.ok) {
        msg.innerHTML = `<div class="dr-notice dr-notice-success">Magic link sent. Check your inbox at <strong>${escapeHtml(email)}</strong> and follow the link to sign in.</div>`;
      } else {
        msg.innerHTML = `<div class="dr-notice dr-notice-danger">${escapeHtml(result.error?.message || 'Sign-in failed. Please check the email address and try again.')}</div>`;
      }
      if (typeof onSignIn === 'function') onSignIn(result);
    });
  }

  function mountUnauthorisedShell(session) {
    document.body.innerHTML = `
      <div class="dr-signin-shell">
        <div class="dr-signin-card">
          <div class="dr-signin-header">
            <div class="dr-header-brand-mark">AL</div>
            <div class="dr-signin-title">Access not provisioned</div>
            <div class="dr-signin-subtitle">The address <strong>${escapeHtml(session.user?.email || '')}</strong> is authenticated but not registered as an active deal-room contact.</div>
          </div>
          <div class="dr-notice dr-notice-info" style="margin-bottom:24px;">If you should have access, contact your engagement counterparty or email <a href="mailto:mark@ailane.ai">mark@ailane.ai</a>.</div>
          <button id="drSignOutBtn" class="dr-btn dr-btn-secondary dr-btn-lg" style="width:100%">Sign out</button>
        </div>
      </div>
    `;
    document.getElementById('drSignOutBtn').addEventListener('click', async () => {
      await signOut();
      window.location.reload();
    });
  }

  function mountPhaseLockedShell(session, requiredPhase) {
    document.body.innerHTML = `
      <div class="dr-signin-shell">
        <div class="dr-signin-card">
          <div class="dr-signin-header">
            <div class="dr-header-brand-mark">AL</div>
            <div class="dr-signin-title">This view is phase-gated</div>
            <div class="dr-signin-subtitle">Access requires <strong>${escapeHtml(PHASE_LABEL[requiredPhase] || requiredPhase)}</strong>. Current state: <strong>${escapeHtml(PHASE_LABEL[session.gate_state] || session.gate_state)}</strong>.</div>
          </div>
          <div class="dr-notice dr-notice-info" style="margin-bottom:24px;">Phase advancement is governed by the engagement roadmap. Contact your counterparty for the gate-advancement schedule.</div>
          <button id="drBackBtn" class="dr-btn dr-btn-primary dr-btn-lg" style="width:100%">Return to documents</button>
        </div>
      </div>
    `;
    document.getElementById('drBackBtn').addEventListener('click', () => {
      window.location.href = '../documents/';
    });
  }

  // ----- Utilities ------------------------------------------------------
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ----- Public API -----------------------------------------------------
  window.dealroomAuth = {
    supabase,
    resolveSession,
    sendMagicLink,
    signOut,
    guard,
    isPhaseUnlocked,
    PHASE_RANK,
    PHASE_LABEL,
    escapeHtml,
  };
})();
