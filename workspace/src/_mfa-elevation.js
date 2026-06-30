/**
 * MFA AAL2 ELEVATION UTILITY
 * AILANE-CC-BRIEF-DOCV-FRONTEND-WIRING-001 · F4
 *
 * Ensures the current Supabase session is elevated to aal2 before a vault write,
 * so the RESTRICTIVE RLS gate on kl_vault_documents
 *   aal2_required_when_enrolled :  ((auth.jwt() ->> 'aal') = 'aal2') OR (NOT user_has_verified_mfa())
 * does not reject the write with "new row violates row-level security policy".
 *
 * ── Architecture note (deviation from the brief §4.1 sample, recorded per §10 #6) ──
 * The brief's sample calls `ensureAal2(this.supabase)`, assuming the panel owns a
 * Supabase JS client. It does NOT: the workspace panels use a raw-REST pattern with
 * window.__ailaneUser { id, token } + window.__SUPABASE_ANON_KEY + fetch(). The
 * Supabase JS UMD library is, however, loaded on every page that hosts the workspace
 * bundle (account/workspace, account/dashboard, governance — all load
 * @supabase/supabase-js@2 and expose window.supabase). We therefore create a
 * lightweight client here that shares the persisted session (default localStorage
 * storageKey `sb-<ref>-auth-token`) so auth.mfa.* operate on the logged-in user.
 * (A benign "Multiple GoTrueClient instances" console warning is expected; the two
 * clients share storage. autoRefreshToken is disabled here to avoid refresh races.)
 *
 * ── Token-refresh fix (critical) ──
 * After a successful verify(), Supabase mints a NEW access_token whose JWT carries
 * aal=aal2 and persists it. The panel's raw-REST writes use window.__ailaneUser.token,
 * which is the OLD (aal1) token captured at auth-guard time. We refresh
 * window.__ailaneUser.token from the elevated session before returning — otherwise the
 * very next vault write still presents an aal1 JWT and RLS rejects it.
 *
 * ── Non-enrolled / not-elevatable users (correctness deviation, recorded per §10 #6) ──
 * The RLS predicate's second disjunct, `OR (NOT user_has_verified_mfa())`, means a user
 * with no verified MFA is permitted to write at aal1. We detect that via
 * getAuthenticatorAssuranceLevel().nextLevel: when nextLevel !== 'aal2' the session
 * cannot (and need not) be elevated, so we proceed instead of throwing. This is a
 * deliberate departure from the brief's literal `throw { code: 'no_factors' }`, which
 * would otherwise block every delete/pack/report for users who have not enrolled in MFA
 * — a worse regression than the bug being fixed. `nextLevel` accounts for all factor
 * types (TOTP, WebAuthn), so non-enrolled users of any kind proceed correctly.
 *
 * Returns a Promise<void> on success.
 * Throws { code: 'mfa_required' | 'mfa_failed' | 'no_factors' } on failure.
 */

const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';

let _client = null;

function _getClient() {
  if (_client) return _client;
  if (!window.supabase || !window.supabase.createClient) {
    throw { code: 'mfa_failed', cause: 'supabase-js library not loaded' };
  }
  const anon = window.__SUPABASE_ANON_KEY;
  if (!anon) throw { code: 'mfa_failed', cause: 'anon key unavailable' };
  _client = window.supabase.createClient(SUPABASE_URL, anon, {
    auth: { autoRefreshToken: false, persistSession: true, detectSessionInUrl: false }
  });
  return _client;
}

// Sync the panel's working token to the current (elevated) session so subsequent
// raw-REST vault writes carry the aal2 JWT.
async function _syncToken(supabase) {
  try {
    const { data } = await supabase.auth.getSession();
    const tok = data && data.session && data.session.access_token;
    if (tok && window.__ailaneUser) window.__ailaneUser.token = tok;
  } catch (e) {
    /* non-fatal: caller keeps its existing token */
  }
}

export async function ensureAal2(supabaseArg) {
  const supabase = supabaseArg || _getClient();

  const { data: aal, error: aalErr } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalErr) throw { code: 'mfa_failed', cause: aalErr };

  // Already elevated — just make sure the panel's working token is the aal2 one.
  if (aal && aal.currentLevel === 'aal2') {
    await _syncToken(supabase);
    return;
  }

  // Not enrolled / cannot be elevated → RLS permits the write at aal1. Proceed.
  if (!aal || aal.nextLevel !== 'aal2') {
    await _syncToken(supabase);
    return;
  }

  // Enrolled but currently aal1 → challenge a verified TOTP factor.
  const { data: factors, error: facErr } = await supabase.auth.mfa.listFactors();
  if (facErr) throw { code: 'mfa_failed', cause: facErr };
  const totpList = (factors && factors.totp) ? factors.totp : [];
  const totp = totpList.find(function (f) { return f.status === 'verified'; });
  if (!totp) throw { code: 'no_factors' }; // e.g. WebAuthn-only enrolment — out of TOTP scope

  const { data: challenge, error: chErr } =
    await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (chErr) throw { code: 'mfa_failed', cause: chErr };

  // Restoration round: window.prompt is acceptable per brief §4.1.
  const code = window.prompt('Enter your 6-digit authentication code to continue:');
  if (!code) throw { code: 'mfa_required' };

  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId: totp.id, challengeId: challenge.id, code: String(code).trim()
  });
  if (vErr) throw { code: 'mfa_failed', cause: vErr };

  // Confirm escalation, then refresh the panel's working token to the new aal2 JWT.
  const { data: aal2 } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal2 || aal2.currentLevel !== 'aal2') throw { code: 'mfa_failed', cause: 'no escalation' };
  await _syncToken(supabase);
}
