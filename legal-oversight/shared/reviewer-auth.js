/* =============================================================================
 * Legal Oversight Room — reviewer-context adapter for the Deal-Room Experience
 * AILANE-CC-BRIEF-LOVR-PARITY-002 §3
 *
 * Provides the SAME public surface the established deal-room page code expects
 * (window.dealroomSupabase / window.dealroomConfig / window.dealroomAuth), but
 * resolves the session from THIS room's magic-link reviewer login (not the
 * counterparty CLID/partner_contacts flow) and pins every page to the SYNTHETIC
 * counterparty rnd-sim-2026-001. A verified SRA reviewer is granted read-only
 * observation of the synthetic deal room server-side (RLS + the deal-room EFs);
 * this adapter never carries a real counterparty.
 *
 * Load order on each Experience page:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="../shared/reviewer-auth.js"></script>   // THIS (replaces dnb auth.js)
 *   <script src="../shared/api.js"></script>
 *   <script src="../shared/eileen-panel.js"></script>
 * ============================================================================= */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';

  // Synthetic counterparty — the ONLY deal room a reviewer ever observes.
  const SYN_CLID = 'rnd-sim-2026-001';
  const SYN_NAME = 'R&D Simulation Ltd';
  const SYN_GATE_STATE = 'phase_0';
  const DIRECTOR_EMAIL = 'mark@ailane.ai';
  const HUB = '/legal-oversight/';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[reviewer-auth] supabase-js UMD bundle missing — load it before reviewer-auth.js');
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  });

  window.dealroomSupabase = supabase;
  window.dealroomConfig = { SUPABASE_URL, SUPABASE_ANON_KEY };

  // Canonical 7-state phase taxonomy (identical to the established room).
  const PHASE_RANK = { phase_0: 0, phase_a: 1, phase_b: 2, phase_c: 3, phase_d: 4, phase_e: 5, phase_f: 6 };
  const PHASE_LABEL = {
    phase_0: 'Phase 0 — Engagement & proposal',
    phase_a: 'Phase A — NDA',
    phase_b: 'Phase B — Pilot & execution',
    phase_c: 'Phase C — Live delivery (gated)',
    phase_d: 'Phase D', phase_e: 'Phase E', phase_f: 'Phase F',
  };
  function isPhaseUnlocked(currentPhase, requiredPhase) {
    if (!requiredPhase) return true;
    if (requiredPhase === 'all_phases') return true;
    const cur = PHASE_RANK[currentPhase], req = PHASE_RANK[requiredPhase];
    if (cur === undefined || req === undefined) return false;
    return cur >= req;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Reviewer session, shaped like the deal-room SESSION the page code expects,
  // but always pinned to the synthetic counterparty.
  async function resolveSession() {
    const { data } = await supabase.auth.getSession();
    const session = data && data.session;
    if (!session) return { authenticated: false, authorised: false };
    const user = session.user;
    const email = (user.email || '').toLowerCase();
    return {
      authenticated: true,
      authorised: true,          // server-side RLS + EFs are the real gate
      user,
      contact: null,
      clid: SYN_CLID,
      counterparty_name: SYN_NAME,
      gate_state: SYN_GATE_STATE,
      is_director: email === DIRECTOR_EMAIL,
      is_reviewer_observer: true,
    };
  }

  async function signOut() { try { await supabase.auth.signOut(); } catch (_e) {} }

  // RULE 26 guard: reveal on a confirmed session; otherwise bounce to the room
  // hub silently (the hub owns sign-in + the acknowledgement gate).
  async function guard({ onReady } = {}) {
    let settled = false;
    const succeed = (s) => { if (settled) return; settled = true; if (typeof onReady === 'function') { try { onReady(s); } catch (e) { console.error('[reviewer-auth] onReady', e); } } };
    const fail = () => { if (settled) return; settled = true; window.location.replace(HUB); };
    try {
      const s = await resolveSession();
      if (s.authenticated) return succeed(s);
      const t = setTimeout(fail, 6000);
      supabase.auth.onAuthStateChange(async (_e, sess) => {
        if (settled || !sess) return;
        clearTimeout(t);
        succeed(await resolveSession());
      });
    } catch (_e) { fail(); }
  }

  window.dealroomAuth = {
    supabase,
    resolveSession,
    signOut,
    guard,
    isPhaseUnlocked,
    PHASE_RANK,
    PHASE_LABEL,
    escapeHtml,
    SYN_CLID,
    SYN_NAME,
  };
})();
