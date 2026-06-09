/* =============================================================================
 * AILANE — Deal-Room Shared Serving Module  (CANONICAL DEAL-ROOM LAYOUT)
 * Governed by AILANE-SPEC-DRPS-001 §6 (Serving Limb — 404-status SPA pattern).
 * Brief: AILANE-CC-BRIEF-DRPS-LAYOUT-001 v1.0.
 *
 * One dynamic shell serves every counterparty workspace at
 *   ailane.ai/partners/<workspace_slug>/[ documents | status | pathway | deal-creator ]/
 * with ZERO per-room commit, reproducing the Director-confirmed Canonical
 * Deal-Room Layout (CDRL) — the bespoke reference room's "Gen-1" surface
 * (home / status / pathway / deal-creator), generalised. That reference room
 * lives under the sanctioned ringfenced path and is never served by this shell
 * (its own committed files take precedence).
 * A room is live the instant its partner_clids
 * record exists; the only per-room values are the slug in the URL and the
 * room's own data (counterparty_name, gate_state, catalog, blockers, pricing).
 *
 * Path-driven routes (GitHub Pages serves 404.html for each; the shell reads
 * window.location.pathname and renders the matching CDRL page):
 *   /partners/<slug>/                home      (hero + nav cards + Eileen)
 *   /partners/<slug>/documents/      documents (catalog releases + requirements)
 *   /partners/<slug>/status/         status    (canonical phase progression + blockers)
 *   /partners/<slug>/pathway/        pathway   (canonical engagement pathway + diagram)
 *   /partners/<slug>/deal-creator/   deal creator (tier / scope / overlays / live quote)
 *
 * Data path (generalised; references NO counterparty by name, no ringfenced
 * identifiers per AMD-162):
 *   - room resolution : partner_clids by workspace_path  (authenticated read)
 *   - membership      : partner_contacts (self / by-email); Director bypass
 *   - document estate : dealroom_documents_catalog (RLS-scoped) grouped by phase
 *   - blockers        : dealroom_phase_blockers (per-room, fault-tolerant)
 *   - signed URLs     : dealroom-document-fetch  (1-hour, private bucket)
 *   - uploads         : dealroom-document-upload + dealroom_uploads status
 *   - terms gate      : dealroom-accept-terms    (status / accept)
 *   - in-room Eileen   : eileen-dealroom          (catalog-aware intelligence)
 *   - live pricing     : get_pricing_ceilings_v3 + pricing_quote_function_v4 (global RPCs)
 *
 * Status/Pathway content is the CANONICAL engagement pathway (DRPS-001 §7),
 * the same shape for every room; only the room's current position (gate_state)
 * and its real blockers vary. No counterparty-specific dates/narrative are
 * fabricated. A richer per-room status/pathway content model is a later DB
 * limb; the layout is in place and degrades to a clean state until then.
 *
 * Auth note (CLAUDE.md): NOT an auth-callback surface. The Supabase JS client
 * resolves a session via getSession()/onAuthStateChange BEFORE any .from() read,
 * so client query usage here is compliant.
 *
 * Privacy guard (DRPS-001 §8): no Director personal identity, no registered
 * company address on this counterparty surface. Eileen is "she/her".
 * Gold (#F59E0B) is permitted (Director, DRPS-LAYOUT-001).
 * ============================================================================= */

const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';
const DIRECTOR_EMAIL = 'mark@ailane.ai';
const PARTNERS_PREFIX = '/partners/';
const SUPPORT_EMAIL = 'partnerships@ailane.ai';
const LEGAL_URL = '/legal/deal-room-privacy/';

// ---- Phase model (DRPS-001 §7; labels per the canonical pathway) ----
const PHASE_RANK = {
  phase_0: 0, phase_a: 1, phase_b: 2, phase_c: 3, phase_d: 4, phase_e: 5, phase_f: 6,
};
const PHASE_LABEL = {
  phase_0: 'Phase 0 — Pre-engagement',
  phase_a: 'Phase A — Initial engagement',
  phase_b: 'Phase B — NDA & Pilot SOW',
  phase_c: 'Phase C — Pilot delivery',
  phase_d: 'Phase D — Commercial commitment',
  phase_e: 'Phase E — Operational launch',
  phase_f: 'Phase F — Steady state & renewal',
  all_phases: 'All phases',
};
const PHASE_GROUP_ORDER = ['phase_0', 'phase_a', 'phase_b', 'phase_c', 'phase_d', 'phase_e', 'phase_f', 'all_phases'];

// Canonical engagement pathway (global; the same shape for every room — only the
// room's current position varies by gate_state). Neutral lifecycle language; no
// counterparty-specific dates or narrative.
const PHASE_PATHWAY = [
  { code: 'phase_a', letter: 'A', title: 'Initial engagement', summary: 'The engagement roadmap and supporting materials are released to this workspace. Internal routing is acknowledged and the engagement record is opened.' },
  { code: 'phase_b', letter: 'B', title: 'NDA & Pilot SOW', summary: 'A mutual non-disclosure agreement is executed and the Pilot Statement of Work is scoped. NDA execution unlocks subsequent document releases in this workspace.' },
  { code: 'phase_c', letter: 'C', title: 'Pilot delivery', summary: 'The Pilot SOW is signed and pilot delivery proceeds against the agreed scope. A per-engagement DPIA addendum is executed before any data exchange.' },
  { code: 'phase_d', letter: 'D', title: 'Commercial commitment', summary: 'Pilot delivery completes, package selection is confirmed, and Master Commercial Agreement negotiation opens.' },
  { code: 'phase_e', letter: 'E', title: 'Operational launch', summary: 'The Master Commercial Agreement is executed, production rollout begins, and reconciliation and KPI reporting activate.' },
  { code: 'phase_f', letter: 'F', title: 'Steady state & renewal', summary: 'Steady-state operation, with an anniversary renewal cascade and expansion options reviewed at each cycle.' },
];
// Three asynchronous next-step paths (canonical engagement options; not room-specific).
const PATHWAY_PATHS = [
  { title: 'Path A — NDA-first', body: 'The conventional route: a mutual NDA is signed before substantive commercial detail is exchanged. Suits counterparties whose internal process requires NDA execution prior to any working session.' },
  { title: 'Path B — Pilot SOW direct', body: 'For counterparties content to operate under the proposal’s confidentiality covering terms, the Pilot Statement of Work can be the first executed document; NDA terms are absorbed into the SOW.' },
  { title: 'Path C — Q&A first', body: 'Substantive questions are routed via this workspace or to <a href="mailto:' + SUPPORT_EMAIL + '">' + SUPPORT_EMAIL + '</a> ahead of any document execution. Useful where internal review needs orientation before committing to a signing path.' },
];

let _client = null;

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function decodeJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
}

function isPhaseUnlocked(currentPhase, requiredPhase) {
  if (!requiredPhase || requiredPhase === 'all_phases') return true;
  const cur = PHASE_RANK[currentPhase];
  const req = PHASE_RANK[requiredPhase];
  if (cur === undefined || req === undefined) return false;
  return cur >= req;
}

function phaseShort(phase) {
  if (!phase) return '';
  if (phase === 'all_phases') return 'All';
  if (phase === 'phase_0') return '0';
  return (phase.replace('phase_', '') || '').toUpperCase();
}

function formatBytes(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// State beacon for the Layer-B headless readiness runner (DRPS-001 §9).
function setState(state, extra) {
  try {
    document.documentElement.setAttribute('data-dealroom-state', state);
    window.__AILANE_DEALROOM__ = Object.assign({ state }, window.__AILANE_DEALROOM__ || {}, extra || {});
  } catch (e) { /* noop */ }
}

function reveal() { document.body.style.visibility = 'visible'; }

// ---------------------------------------------------------------------------
// Slug / route / client resolution
// ---------------------------------------------------------------------------
const ROUTE_SUBS = ['documents', 'status', 'pathway', 'deal-creator'];

function getCurrentSlug() {
  const path = window.location.pathname || '';
  if (!path.startsWith(PARTNERS_PREFIX)) return null;
  const rest = path.slice(PARTNERS_PREFIX.length);
  const slug = rest.split('/').filter(Boolean)[0] || '';
  return slug || null;
}

function getCurrentRoute() {
  const path = window.location.pathname || '';
  if (!path.startsWith(PARTNERS_PREFIX)) return 'home';
  const parts = path.slice(PARTNERS_PREFIX.length).split('/').filter(Boolean);
  const sub = parts[1] || 'home';
  return ROUTE_SUBS.indexOf(sub) !== -1 ? sub : 'home';
}

// Resolved CLID is cached on window after resolveRoom(); exposed per the V7 surface.
function getCurrentClid() {
  return (window.__AILANE_DEALROOM__ && window.__AILANE_DEALROOM__.clid) || null;
}

function workspaceRoot() { return PARTNERS_PREFIX + (getCurrentSlug() || '') + '/'; }

function waitForSupabase(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (window.supabase && window.supabase.createClient) return resolve();
    const started = Date.now();
    const t = setInterval(() => {
      if (window.supabase && window.supabase.createClient) { clearInterval(t); resolve(); }
      else if (Date.now() - started > timeoutMs) { clearInterval(t); reject(new Error('supabase-js UMD bundle did not load')); }
    }, 40);
  });
}

function getClient() {
  if (_client) return _client;
  _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  });
  return _client;
}

// Resolve session now, or wait briefly for a magic-link return to be consumed.
function resolveSession(sb, waitMs = 4000) {
  return new Promise((resolve) => {
    sb.auth.getSession().then(({ data }) => {
      if (data && data.session) return resolve(data.session);
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; resolve(null); } }, waitMs);
      sb.auth.onAuthStateChange((_event, s) => {
        if (done) return;
        if (s) {
          done = true; clearTimeout(t);
          if (window.location.hash && window.location.hash.indexOf('access_token=') >= 0) {
            try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
          }
          resolve(s);
        }
      });
    }).catch(() => resolve(null));
  });
}

// ---------------------------------------------------------------------------
// Data reads
// ---------------------------------------------------------------------------
async function resolveRoom(sb, slug) {
  const workspacePath = PARTNERS_PREFIX + slug + '/';
  const { data, error } = await sb
    .from('partner_clids')
    .select('clid, counterparty_name, workspace_path, gate_state, package_selection, pkg4_eligible, is_launch_partner')
    .eq('workspace_path', workspacePath)
    .maybeSingle();
  if (error) { console.warn('[dealroom] room resolve error:', error); return null; }
  return data || null;
}

async function findMembership(sb, userId, email, clid) {
  try {
    const { data } = await sb
      .from('partner_contacts')
      .select('contact_id, full_name, role_title, status, clid')
      .eq('user_id', userId).eq('clid', clid).eq('status', 'active').maybeSingle();
    if (data) return data;
  } catch (e) { /* fall through */ }
  if (email) {
    try {
      const { data } = await sb
        .from('partner_contacts')
        .select('contact_id, full_name, role_title, status, clid')
        .eq('email', email).eq('clid', clid).eq('status', 'active').maybeSingle();
      if (data) return data;
    } catch (e) { /* fall through */ }
  }
  return null;
}

async function listCatalog(sb, clid) {
  const { data, error } = await sb
    .from('dealroom_documents_catalog')
    .select('document_id, clid, kind, phase, doc_code, name, description, is_blocking_phase_advance, storage_path, mime_type, file_size_bytes, version_label, display_order, available_from_phase, council_review_status')
    .eq('clid', clid)
    .is('deleted_at', null)
    .order('phase', { ascending: true })
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function listLatestUploads(sb, clid) {
  try {
    const { data, error } = await sb
      .from('dealroom_uploads')
      .select('upload_id, document_id, status, original_filename, file_size_bytes, created_at')
      .eq('clid', clid).is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const byDoc = {};
    for (const up of data || []) { if (!byDoc[up.document_id]) byDoc[up.document_id] = up; }
    return byDoc;
  } catch (e) {
    return {};
  }
}

// Per-room blockers (real data). Fault-tolerant: any error degrades to [] so the
// Status page renders its canonical progression regardless.
async function listPhaseBlockers(sb, clid) {
  try {
    const { data, error } = await sb
      .from('dealroom_phase_blockers')
      .select('clid, phase, name, is_blocking_phase_advance, upload_status, is_currently_blocking')
      .eq('clid', clid);
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

// Generic deal-room Edge Function caller — injects the user JWT (V7 §8 contract).
async function callDealroomEF(slug, body, session) {
  const token = session && session.access_token;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body || {}),
  });
  let payload;
  try { payload = await res.json(); } catch (e) { payload = { error: 'Invalid response' }; }
  if (!res.ok || payload.ok === false) {
    const err = new Error(payload.error || `HTTP ${res.status}`);
    err.detail = payload.detail || payload.details || payload.reason;
    err.status = res.status;
    throw err;
  }
  return payload;
}

// PostgREST RPC helper (deal-creator pricing). Uses the user token when present,
// else anon (the pricing RPCs are anon-readable for browse-only quoting).
async function callRpc(fnName, args, session) {
  const token = (session && session.access_token) || SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ---------------------------------------------------------------------------
// Gate / shell cards (sign-in, terms, room-not-found, unauthorised, not-found)
// ---------------------------------------------------------------------------
function cardShell(inner) {
  return `<div class="dr-gate"><div class="dr-gate-card">
      <div class="dr-gate-brand">Ai<em>lane</em></div>
      <div class="dr-gate-eyebrow">Private engagement workspace</div>
      ${inner}
      <p class="dr-gate-foot">AI Lane Limited · Company No. 17035654 · ICO Reg. 00013389720<br>Confidential — pre-contractual workspace.</p>
    </div></div>`;
}

function renderSignIn(app, sb) {
  app.innerHTML = cardShell(`
    <h1 class="dr-gate-title">Welcome to the engagement workspace</h1>
    <p class="dr-gate-lede">Enter your registered email to receive a magic-link sign-in. The link returns you to this workspace.</p>
    <form class="dr-gate-form" data-dealroom-signin novalidate>
      <input type="email" id="dr-email" placeholder="you@company.com" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" required>
      <button type="submit" id="dr-send">Send magic link</button>
    </form>
    <p id="dr-signin-status" class="dr-gate-status" aria-live="polite"></p>
    <p class="dr-gate-help">Trouble signing in? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  `);
  const form = app.querySelector('[data-dealroom-signin]');
  const input = app.querySelector('#dr-email');
  const btn = app.querySelector('#dr-send');
  const status = app.querySelector('#dr-signin-status');
  function setStatus(html, kind) {
    status.innerHTML = html;
    status.className = 'dr-gate-status' + (kind ? ' dr-gate-status-' + kind : '');
  }
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = (input.value || '').trim();
    if (!email || email.indexOf('@') < 0) { setStatus('Please enter a valid email address.', 'error'); return; }
    btn.disabled = true; btn.textContent = 'Sending…'; setStatus('Sending magic link…');
    try {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + window.location.pathname, shouldCreateUser: true },
      });
      if (error) throw error;
      setStatus(`Magic link sent. Check your inbox at <strong>${escapeHtml(email)}</strong> — the link returns you here.`, 'success');
      btn.textContent = 'Resend magic link'; btn.disabled = false; input.disabled = true;
      try { if (window.gtag) window.gtag('event', 'dealroom_magiclink_sent'); } catch (e) {}
    } catch (e) {
      setStatus(`We couldn't send a magic link right now. Please try again, or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.`, 'error');
      btn.textContent = 'Send magic link'; btn.disabled = false;
    }
  });
  setTimeout(() => { try { input.focus(); } catch (e) {} }, 50);
}

function renderUnauthorised(app, sb, email) {
  app.innerHTML = cardShell(`
    <h1 class="dr-gate-title">Access not provisioned</h1>
    <p class="dr-gate-lede">The address <strong>${escapeHtml(email || '')}</strong> is signed in but is not registered against this engagement workspace. Sign in with your registered address, or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <button type="button" id="dr-signout" class="dr-gate-btn-ghost">Sign out</button>
  `);
  app.querySelector('#dr-signout').addEventListener('click', async () => {
    try { await sb.auth.signOut(); } catch (e) {}
    window.location.replace('/');
  });
}

function renderRoomNotFound(app, sb) {
  app.innerHTML = cardShell(`
    <h1 class="dr-gate-title">Workspace not found</h1>
    <p class="dr-gate-lede">No engagement workspace exists at this address. If you were sent a link, please check it, or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <button type="button" id="dr-signout" class="dr-gate-btn-ghost">Sign out</button>
  `);
  const so = app.querySelector('#dr-signout');
  if (so) so.addEventListener('click', async () => { try { await sb.auth.signOut(); } catch (e) {} window.location.replace('/'); });
}

function renderNotFound(app) {
  app.innerHTML = `<div class="dr-gate"><div class="dr-gate-card">
      <div class="dr-gate-brand">Ai<em>lane</em></div>
      <h1 class="dr-gate-title">Page not found</h1>
      <p class="dr-gate-lede">The page you requested doesn't exist. Return to <a href="/">ailane.ai</a>.</p>
    </div></div>`;
}

// ---------------------------------------------------------------------------
// Terms-and-privacy gate (DRPS-001 §8) — dealroom-accept-terms
// ---------------------------------------------------------------------------
async function termsAlreadyAccepted(ctx) {
  try {
    const r = await callDealroomEF('dealroom-accept-terms', { action: 'status', clid: ctx.room.clid }, ctx.session);
    return r && r.accepted === true;
  } catch (e) {
    return false;
  }
}

function renderTermsGate(app, ctx, onAccepted) {
  app.innerHTML = `<div class="dr-gate"><div class="dr-gate-card" role="dialog" aria-modal="true" aria-labelledby="dr-tg-title" data-dealroom-termsgate>
      <div class="dr-gate-brand">Ai<em>lane</em></div>
      <div class="dr-gate-eyebrow">${escapeHtml(ctx.room.counterparty_name || 'Engagement workspace')}</div>
      <h1 id="dr-tg-title" class="dr-gate-title">Before you enter this workspace</h1>
      <p class="dr-gate-lede">Please review and accept the Privacy Notice &amp; Workspace Terms.</p>
      <p class="dr-gate-linkrow"><a class="dr-gate-link" href="${LEGAL_URL}" target="_blank" rel="noopener">Read the Privacy Notice &amp; Workspace Terms</a> <span class="dr-gate-newtab">(opens in a new tab)</span></p>
      <label class="dr-gate-check"><input type="checkbox" id="dr-tg-check"><span>I confirm I have read and accept the Privacy Notice &amp; Workspace Terms on behalf of my organisation.</span></label>
      <p id="dr-tg-status" class="dr-gate-status" aria-live="polite"></p>
      <button type="button" id="dr-tg-accept" class="dr-gate-btn" disabled>Accept &amp; enter</button>
    </div></div>`;
  const check = app.querySelector('#dr-tg-check');
  const btn = app.querySelector('#dr-tg-accept');
  const status = app.querySelector('#dr-tg-status');
  check.addEventListener('change', () => { btn.disabled = !check.checked; });
  btn.addEventListener('click', async () => {
    if (!check.checked) return;
    btn.disabled = true; check.disabled = true;
    status.className = 'dr-gate-status'; status.textContent = 'Recording your acceptance…';
    try {
      const r = await callDealroomEF('dealroom-accept-terms', { action: 'accept', clid: ctx.room.clid }, ctx.session);
      const ok = r && (r.recorded === true || r.already === true || r.ok === true);
      if (!ok) throw new Error('not recorded');
      try { if (window.gtag) window.gtag('event', 'dealroom_terms_accepted'); } catch (e) {}
      onAccepted();
    } catch (e) {
      status.className = 'dr-gate-status dr-gate-status-error';
      status.innerHTML = `We couldn't record your acceptance — please refresh and try again, or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.`;
      check.disabled = false; btn.disabled = !check.checked;
    }
  });
  setTimeout(() => { try { check.focus(); } catch (e) {} }, 30);
}

// ---------------------------------------------------------------------------
// Shared chrome (header / footer / nav cards / Eileen section)
// ---------------------------------------------------------------------------
function headerHtml(ctx) {
  const root = workspaceRoot();
  return `<header class="dr-header"><div class="dr-header-inner">
      <a href="${root}" class="dr-brand">
        <span class="dr-brand-mark">Ai<em>lane</em></span>
        <span class="dr-workspace-label">${escapeHtml(ctx.room.counterparty_name || 'Partner')} × AI Lane Deal Room</span>
      </a>
      <div class="dr-header-right">
        <span class="dr-user-email" id="dr-user-email">${escapeHtml(ctx.email || '')}</span>
        <a href="#" class="dr-signout" id="dr-signout">Sign out</a>
      </div>
    </div></header>`;
}

function footerHtml() {
  return `<footer class="dr-footer"><div class="dr-container">
      <div class="dr-footer-row">
        <div><strong>AI Lane Limited</strong><br>Company No. 17035654 · ICO Reg. 00013389720</div>
        <div><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></div>
      </div>
      <div class="dr-footer-legal">
        <a href="${LEGAL_URL}">Privacy Notice &amp; Workspace Terms</a><br>
        <strong>Ailane&reg;</strong> is a registered trademark of AI Lane Limited. Regulatory intelligence, not legal advice.<br>
        Operated by AI Lane Limited (Co. 17035654 · ICO 00013389720).
      </div>
      <div class="dr-footer-confidential">
        Confidential — Pre-Contractual workspace; not for further distribution without written consent.
      </div>
    </div></footer>`;
}

// Engagement-status meta string for the nav card (factual current-state).
function engagementMeta(gateState) {
  const label = PHASE_LABEL[gateState] || PHASE_LABEL.phase_0;
  return label.replace('—', '·');
}

const NAV_CARDS = [
  { slug: 'documents',    icon: 'D', title: 'Documents',         desc: 'Released documents and counterparty requirements, grouped by engagement phase.', meta: () => 'Document estate · phase-gated' },
  { slug: 'deal-creator', icon: 'C', title: 'Deal Creator',      desc: 'Compose pricing configurations across tier, scope and commercial overlays. Live deterministic quote; non-binding indications.', meta: () => 'Live pricing · non-binding' },
  { slug: 'status',       icon: 'S', title: 'Engagement Status',  desc: 'Progression across the engagement pathway and the outstanding items for this engagement.', meta: (ctx) => engagementMeta(ctx.room.gate_state) },
  { slug: 'pathway',      icon: 'P', title: 'Pathway',            desc: 'Engagement pathway summary, three asynchronous next-step paths, and the full diagram.', meta: () => 'A → F · Pre-engagement to renewal' },
];

function navCardsHtml(ctx, exclude) {
  const root = workspaceRoot();
  const cards = NAV_CARDS.filter((c) => c.slug !== exclude).map((c) => `
      <a class="dr-nav-card" href="${root}${c.slug}/">
        <div class="dr-nav-card-icon">${c.icon}</div>
        <div class="dr-nav-card-title">${escapeHtml(c.title)}</div>
        <div class="dr-nav-card-desc">${c.desc}</div>
        <div class="dr-nav-card-meta">${escapeHtml(c.meta(ctx))}</div>
      </a>`).join('');
  return cards;
}

function eileenSectionHtml(extraEmpty) {
  const empty = extraEmpty || 'Ask about the estate, the engagement pathway, or the underlying UK employment law.';
  return `<section class="dr-eileen-section" aria-label="Eileen intelligence entity">
      <div class="dr-eileen-header">
        <h2>Eileen</h2>
        <p class="dr-eileen-subtitle">Ailane intelligence entity &middot; counterparty mode &middot; commercial terms route via <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      <div id="dr-eileen-panel" class="dr-eileen-panel">
        <div id="dr-eileen-transcript" class="dr-eileen-transcript" aria-live="polite">
          <div class="dr-eileen-empty">${escapeHtml(empty)}</div>
        </div>
        <div class="dr-eileen-input-row">
          <textarea id="dr-eileen-input" class="dr-eileen-input" rows="2" placeholder="Ask Eileen about the estate, the engagement pathway, or UK employment law..."></textarea>
          <button id="dr-eileen-send" class="dr-eileen-send" type="button">Send</button>
        </div>
      </div>
    </section>`;
}

// Wrap a route's <main> content with shared chrome, then wire shared behaviour.
function paint(app, ctx, mainInner, opts) {
  const o = opts || {};
  app.innerHTML = headerHtml(ctx) +
    `<main class="dr-main"><div class="dr-container${o.containerClass ? ' ' + o.containerClass : ''}">${mainInner}</div></main>` +
    footerHtml();
  bindSignOut(app, ctx);
  bindEileenPanel(ctx);
}

function bindSignOut(app, ctx) {
  const btn = app.querySelector('#dr-signout');
  if (!btn) return;
  btn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    try { clearStoredTranscript(ctx); } catch (e) {}
    try { await ctx.sb.auth.signOut(); } catch (e) {}
    window.location.replace('/');
  });
}

// ---------------------------------------------------------------------------
// In-room Eileen (eileen-dealroom EF) — inline panel, typewriter, sessionStorage
// persistence keyed on (clid, user_id), matching the canonical room behaviour.
// ---------------------------------------------------------------------------
function transcriptStorageKey(ctx) {
  const uid = (ctx && ctx.userId) || 'anon';
  return 'ailane.dealroom.' + (ctx.room.clid) + '.' + uid + '.messages';
}
function loadStoredTranscript(ctx) {
  try {
    const raw = sessionStorage.getItem(transcriptStorageKey(ctx));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}
function saveStoredTranscript(ctx, arr) {
  try { sessionStorage.setItem(transcriptStorageKey(ctx), JSON.stringify(arr)); } catch (e) {}
}
function clearStoredTranscript(ctx) {
  try { sessionStorage.removeItem(transcriptStorageKey(ctx)); } catch (e) {}
}

function bindEileenPanel(ctx) {
  const panel = document.getElementById('dr-eileen-panel');
  const input = document.getElementById('dr-eileen-input');
  const sendBtn = document.getElementById('dr-eileen-send');
  const transcript = document.getElementById('dr-eileen-transcript');
  if (!panel || !input || !sendBtn || !transcript) return;
  if (panel.dataset.bound === '1') return;
  panel.dataset.bound = '1';

  let conversationMessages = loadStoredTranscript(ctx);
  let eileenAnimating = false;
  let eileenAnimationCancelled = false;

  function clearEmptyState() {
    const empty = transcript.querySelector('.dr-eileen-empty');
    if (empty) empty.remove();
  }
  function appendBubble(role, text, extraClass) {
    clearEmptyState();
    const bubble = document.createElement('div');
    bubble.className = 'dr-eileen-bubble dr-eileen-' + role + (extraClass ? ' ' + extraClass : '');
    bubble.textContent = text;
    transcript.appendChild(bubble);
    transcript.scrollTop = transcript.scrollHeight;
    return bubble;
  }
  function startTypewriter(fullText) {
    clearEmptyState();
    const bubble = document.createElement('div');
    bubble.className = 'dr-eileen-bubble dr-eileen-eileen';
    bubble.textContent = '';
    transcript.appendChild(bubble);
    requestAnimationFrame(() => { try { bubble.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {} });
    const CHARS_PER_SECOND = 40;
    let charIndex = 0;
    let lastFrame = performance.now();
    eileenAnimating = true; eileenAnimationCancelled = false;
    function tick(now) {
      if (eileenAnimationCancelled) { bubble.textContent = fullText; eileenAnimating = false; eileenAnimationCancelled = false; return; }
      const elapsed = now - lastFrame;
      const charsToAdd = Math.floor(elapsed * CHARS_PER_SECOND / 1000);
      if (charsToAdd > 0) { charIndex = Math.min(charIndex + charsToAdd, fullText.length); bubble.textContent = fullText.slice(0, charIndex); lastFrame = now; }
      if (charIndex < fullText.length) requestAnimationFrame(tick); else eileenAnimating = false;
    }
    requestAnimationFrame(tick);
  }

  if (conversationMessages.length > 0) {
    conversationMessages.forEach((m) => {
      if (!m || !m.role || !m.content) return;
      appendBubble(m.role === 'user' ? 'user' : 'eileen', m.content);
    });
  }

  async function sendMessage() {
    const text = (input.value || '').trim();
    if (!text) return;
    if (!ctx.session || !ctx.session.access_token) return;
    if (eileenAnimating) eileenAnimationCancelled = true;
    sendBtn.disabled = true;
    appendBubble('user', text);
    input.value = '';
    conversationMessages.push({ role: 'user', content: text });
    saveStoredTranscript(ctx, conversationMessages);
    const thinking = appendBubble('eileen', '…', 'dr-eileen-thinking');
    try {
      const data = await callDealroomEF('eileen-dealroom', { clid: ctx.room.clid, messages: conversationMessages }, ctx.session);
      thinking.remove();
      if (data && data.response) {
        conversationMessages.push({ role: 'assistant', content: data.response });
        saveStoredTranscript(ctx, conversationMessages);
        startTypewriter(data.response);
      } else {
        appendBubble('eileen', 'Connection issue — please try again, or reach the team at ' + SUPPORT_EMAIL + '.', 'dr-eileen-error');
      }
      try { if (window.gtag) window.gtag('event', 'eileen_dealroom_message', { rate_limited: !!(data && data.rate_limited), layer3: !!(data && data.layer3_invoked) }); } catch (e) {}
    } catch (e) {
      thinking.remove();
      appendBubble('eileen', 'Connection issue — please try again, or reach the team at ' + SUPPORT_EMAIL + '.', 'dr-eileen-error');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendMessage(); } });
}

// ---------------------------------------------------------------------------
// Route: HOME
// ---------------------------------------------------------------------------
function renderHome(app, ctx) {
  const counterparty = ctx.room.counterparty_name || 'Partner';
  const main = `
      <section class="dr-hero">
        <div class="dr-eyebrow">Private engagement workspace</div>
        <h1>Welcome to the ${escapeHtml(counterparty)} × AI Lane engagement workspace.</h1>
        <p class="dr-hero-lede">This is the private space for the engagement. From here you can read the released documents, compose a pricing configuration, track gate status across the engagement pathway, and ask Eileen for grounded answers.</p>
      </section>
      <section class="dr-section"><div class="dr-nav-grid">${navCardsHtml(ctx, null)}</div></section>
      ${eileenSectionHtml()}
      <section class="dr-section"><div class="dr-contact">
        <h3>Need to reach Ailane directly?</h3>
        <p>For commercial terms or questions outside Eileen's scope, write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div></section>`;
  paint(app, ctx, main);
}

// ---------------------------------------------------------------------------
// Route: DOCUMENTS  (catalog releases + requirements, Gen-1 card language)
// ---------------------------------------------------------------------------
function groupByPhase(docs, keyFn) {
  const out = {};
  for (const p of PHASE_GROUP_ORDER) {
    const rows = docs.filter((d) => (keyFn(d) || 'phase_0') === p);
    if (rows.length) out[p] = rows;
  }
  return out;
}

function docCardHtml(doc, ctx) {
  const requiredPhase = doc.available_from_phase || doc.phase || 'phase_0';
  const unlocked = ctx.isDirector || isPhaseUnlocked(ctx.room.gate_state, requiredPhase);
  const kindLabel = doc.kind === 'requirement' ? 'Counterparty requirement' : (doc.kind === 'template' ? 'Template' : 'Release');
  const kindPill = doc.kind === 'requirement' ? 'dr-pill-pending' : 'dr-pill-phase0';
  const blocking = doc.is_blocking_phase_advance ? '<span class="dr-pill dr-pill-blocking">Blocking</span>' : '';
  const ref = doc.doc_code ? `<span class="dr-document-ref">${escapeHtml(doc.doc_code)}</span>` : '';
  const sizeText = doc.file_size_bytes ? formatBytes(doc.file_size_bytes) : (doc.kind === 'requirement' ? 'Awaiting upload' : 'Pending publication');
  const version = doc.version_label ? `<span>${escapeHtml(doc.version_label)}</span>` : '';

  let actions = '';
  if (doc.kind === 'requirement') {
    const up = ctx.uploads[doc.document_id];
    if (up) {
      const cls = up.status === 'accepted' ? 'ok' : (up.status === 'rejected' ? 'err' : 'warn');
      actions = `<span class="dr-doc-chip dr-doc-chip-${cls}">${escapeHtml(up.status)}</span>
        <button class="dr-btn dr-btn-secondary dr-btn-sm" data-action="upload" data-doc="${escapeHtml(doc.document_id)}">Upload new version</button>`;
    } else if (!unlocked) {
      actions = `<button class="dr-btn dr-btn-secondary dr-btn-sm" disabled>Locked</button>`;
    } else {
      actions = `<button class="dr-btn dr-btn-primary dr-btn-sm" data-action="upload" data-doc="${escapeHtml(doc.document_id)}">Upload</button>`;
    }
  } else {
    if (!unlocked) {
      actions = `<button class="dr-btn dr-btn-secondary dr-btn-sm" disabled>Locked — unlocks at ${escapeHtml(PHASE_LABEL[requiredPhase] || requiredPhase)}</button>`;
    } else if (!doc.storage_path) {
      actions = `<button class="dr-btn dr-btn-secondary dr-btn-sm" disabled>Pending publication</button>`;
    } else {
      actions = `<button class="dr-btn dr-btn-primary dr-btn-sm" data-action="preview" data-doc="${escapeHtml(doc.document_id)}">Open</button>
        <button class="dr-btn dr-btn-secondary dr-btn-sm" data-action="download" data-doc="${escapeHtml(doc.document_id)}">Download</button>`;
    }
  }

  return `<article class="dr-document-card${unlocked ? '' : ' dr-doc-locked'}">
      <div class="dr-document-card-header">
        <div class="dr-document-title">${escapeHtml(doc.name)}</div>
        <div>${ref}</div>
      </div>
      <div class="dr-document-meta" style="margin-bottom:10px;"><span class="dr-pill ${kindPill}">${escapeHtml(kindLabel)}</span>${blocking}</div>
      <div class="dr-document-desc">${escapeHtml(doc.description || '')}</div>
      <div class="dr-document-meta"><span>${escapeHtml(sizeText)}</span>${version}</div>
      <div class="dr-document-card-actions">${actions}</div>
    </article>`;
}

function documentEstateHtml(ctx) {
  const docs = ctx.docs || [];
  if (!docs.length) {
    return `<div class="dr-empty-state"><strong>No documents catalogued yet</strong>Documents will appear here as the engagement progresses.</div>`;
  }
  const releases = docs.filter((d) => d.kind !== 'requirement');
  const requirements = docs.filter((d) => d.kind === 'requirement');
  let html = '';
  if (releases.length) {
    html += `<div class="dr-section-head"><h2>Releases</h2><span class="dr-section-sub">Documents Ailane delivers to you. Open an unlocked document to view; download for your records.</span></div>`;
    const grouped = groupByPhase(releases, (d) => d.available_from_phase || d.phase);
    for (const phase of Object.keys(grouped)) {
      html += `<div class="dr-doc-group-label"><span class="dr-pill dr-pill-phase0">${escapeHtml(PHASE_LABEL[phase] || phase)}</span></div>`;
      html += grouped[phase].map((d) => docCardHtml(d, ctx)).join('');
    }
  }
  if (requirements.length) {
    html += `<div class="dr-section-head" style="margin-top:40px;"><h2>Counterparty requirements</h2><span class="dr-section-sub">Documents you upload. Status reflects the latest version received.</span></div>`;
    const grouped = groupByPhase(requirements, (d) => d.available_from_phase || d.phase);
    for (const phase of Object.keys(grouped)) {
      html += `<div class="dr-doc-group-label"><span class="dr-pill dr-pill-phase0">${escapeHtml(PHASE_LABEL[phase] || phase)}</span></div>`;
      html += grouped[phase].map((d) => docCardHtml(d, ctx)).join('');
    }
  }
  return html;
}

function renderDocuments(app, ctx) {
  const counterparty = ctx.room.counterparty_name || 'Partner';
  const main = `
      <section class="dr-hero">
        <div class="dr-eyebrow">Documents</div>
        <h1>Documents</h1>
        <p class="dr-hero-lede">All deal-room documents released to ${escapeHtml(counterparty)}, plus counterparty-side upload requirements. Phase-gated documents become available as the engagement advances through its gates.</p>
      </section>
      <section class="dr-section dr-subpage-nav-section"><div class="dr-nav-grid">${navCardsHtml(ctx, 'documents')}</div></section>
      ${eileenSectionHtml()}
      <section class="dr-section" id="dr-doclist">${documentEstateHtml(ctx)}</section>`;
  paint(app, ctx, main);
  bindDocumentActions(app, ctx);
}

function bindDocumentActions(app, ctx) {
  app.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      const docId = btn.getAttribute('data-doc');
      if (action === 'preview' || action === 'download') return openSignedDoc(ctx, docId, action);
      if (action === 'upload') return openUploadModal(app, ctx, docId);
    });
  });
}

async function openSignedDoc(ctx, documentId, action) {
  try {
    const r = await callDealroomEF('dealroom-document-fetch', {
      clid: ctx.room.clid, catalog_document_id: documentId, action: action === 'download' ? 'download' : 'preview',
    }, ctx.session);
    if (!r.signed_url) throw new Error('No signed URL returned');
    // CSP frame-src does not permit Supabase iframes — open / download directly.
    if (action === 'download') {
      const a = document.createElement('a');
      a.href = r.signed_url; a.download = r.filename || 'document.pdf';
      document.body.appendChild(a); a.click(); a.remove();
    } else {
      window.open(r.signed_url, '_blank', 'noopener');
    }
    try { if (window.gtag) window.gtag('event', 'dealroom_document_' + action); } catch (e) {}
  } catch (e) {
    alert(`Could not open the document: ${e.message || 'Unknown error'}${e.detail ? '\n' + e.detail : ''}`);
  }
}

function openUploadModal(app, ctx, documentId) {
  const doc = (ctx.docs || []).find((d) => d.document_id === documentId);
  if (!doc) return;
  let root = app.querySelector('#dr-modal-root');
  if (!root) { root = document.createElement('div'); root.id = 'dr-modal-root'; app.appendChild(root); }
  root.innerHTML = `<div class="dr-modal-back" id="dr-modal-back"><div class="dr-modal" role="dialog" aria-modal="true">
      <div class="dr-modal-head"><div class="dr-modal-title">Upload — ${escapeHtml(doc.name)}</div><button class="dr-btn dr-btn-ghost dr-btn-sm" id="dr-modal-close">Close ✕</button></div>
      <div class="dr-modal-body">
        <p class="dr-document-desc">${escapeHtml(doc.description || '')}</p>
        <input type="file" id="dr-file" class="dr-file" accept=".pdf,.docx,.doc,.txt,application/pdf">
        <div id="dr-upload-status" class="dr-gate-status"></div>
      </div>
      <div class="dr-modal-foot"><button class="dr-btn dr-btn-ghost" id="dr-upload-cancel">Cancel</button><button class="dr-btn dr-btn-primary" id="dr-upload-submit">Upload</button></div>
    </div></div>`;
  const close = () => { root.innerHTML = ''; };
  root.querySelector('#dr-modal-close').addEventListener('click', close);
  root.querySelector('#dr-upload-cancel').addEventListener('click', close);
  root.querySelector('#dr-modal-back').addEventListener('click', (e) => { if (e.target.id === 'dr-modal-back') close(); });
  root.querySelector('#dr-upload-submit').addEventListener('click', () => performUpload(app, ctx, documentId));
}

async function performUpload(app, ctx, documentId) {
  const root = app.querySelector('#dr-modal-root');
  const fileInput = root.querySelector('#dr-file');
  const status = root.querySelector('#dr-upload-status');
  const file = fileInput.files[0];
  if (!file) { status.className = 'dr-gate-status dr-gate-status-error'; status.textContent = 'Select a file first.'; return; }
  if (file.size > 50 * 1024 * 1024) { status.className = 'dr-gate-status dr-gate-status-error'; status.textContent = 'File exceeds 50 MB cap.'; return; }
  status.className = 'dr-gate-status'; status.textContent = 'Uploading…';
  try {
    const fd = new FormData();
    fd.append('file', file); fd.append('document_id', documentId); fd.append('clid', ctx.room.clid);
    const res = await fetch(`${SUPABASE_URL}/functions/v1/dealroom-document-upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ctx.session.access_token}`, 'apikey': SUPABASE_ANON_KEY },
      body: fd,
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || `HTTP ${res.status}`);
    status.className = 'dr-gate-status dr-gate-status-success';
    status.textContent = `Upload received. Status: ${payload.status || 'pending review'}.`;
    setTimeout(async () => {
      root.innerHTML = '';
      ctx.uploads = await listLatestUploads(ctx.sb, ctx.room.clid);
      const list = app.querySelector('#dr-doclist');
      if (list) list.innerHTML = documentEstateHtml(ctx);
      bindDocumentActions(app, ctx);
    }, 1100);
  } catch (e) {
    status.className = 'dr-gate-status dr-gate-status-error';
    status.textContent = `Upload failed: ${e.message || 'Unknown error'}`;
  }
}

// ---------------------------------------------------------------------------
// Route: STATUS  (canonical phase progression from gate_state + real blockers)
// ---------------------------------------------------------------------------
function statusCardsHtml(ctx) {
  const gate = ctx.room.gate_state || 'phase_0';
  const curIdx = PHASE_RANK[gate] === undefined ? 0 : PHASE_RANK[gate];
  return PHASE_PATHWAY.map((p) => {
    const idx = PHASE_RANK[p.code];
    let pill, cls = '';
    if (ctx.isDirector) { pill = '<span class="dr-pill dr-pill-phase0">Director view</span>'; }
    else if (idx < curIdx) { pill = '<span class="dr-pill dr-pill-complete">Complete</span>'; }
    else if (idx === curIdx) { pill = '<span class="dr-pill dr-pill-active">In progress</span>'; cls = ' is-active'; }
    else { pill = '<span class="dr-pill dr-pill-pending">Awaiting</span>'; }
    return `<div class="dr-phase-card${cls}">
        <span class="dr-phase-letter">Phase ${escapeHtml(p.letter)}</span>
        <div class="dr-phase-title">${escapeHtml(p.title)}</div>
        <p class="dr-phase-desc">${escapeHtml(p.summary)}</p>
        ${pill}
      </div>`;
  }).join('');
}

function blockersHtml(ctx) {
  const blockers = (ctx.blockers || []).filter((b) => b.is_blocking_phase_advance);
  if (!blockers.length) {
    return `<div class="dr-empty-state"><strong>No outstanding items recorded</strong>There are no items currently blocking advancement for this engagement.</div>`;
  }
  return `<div class="dr-gate-grid">` + blockers.map((b, i) => {
    const resolved = b.upload_status === 'accepted';
    const active = !!b.is_currently_blocking && !resolved;
    const pill = resolved
      ? '<span class="dr-pill dr-pill-complete">Received</span>'
      : (active ? '<span class="dr-pill dr-pill-pending">Pending evidence</span>' : '<span class="dr-pill dr-pill-omitted">Not yet active</span>');
    return `<div class="dr-gate-card"><div>
        <div class="dr-gate-id">G${i + 1} · ${escapeHtml(PHASE_LABEL[b.phase] || b.phase || '')}</div>
        <div class="dr-gate-title">${escapeHtml(b.name || 'Required item')}</div>
        <div class="dr-gate-desc">Counterparty-side item required to advance this phase.</div>
      </div>${pill}</div>`;
  }).join('') + `</div>`;
}

function renderStatus(app, ctx) {
  const main = `
      <section class="dr-hero">
        <div class="dr-eyebrow">Engagement status</div>
        <h1>Engagement Status</h1>
        <p class="dr-hero-lede">Progression across the engagement pathway, and the outstanding counterparty-side items for this engagement. Current state reflects the live gate recorded for this workspace.</p>
      </section>
      <section class="dr-section dr-subpage-nav-section"><div class="dr-nav-grid">${navCardsHtml(ctx, 'status')}</div></section>
      ${eileenSectionHtml()}
      <section class="dr-section">
        <div class="dr-section-head"><h2>Phase progression</h2><span class="dr-section-sub">A → F across the engagement</span></div>
        <div class="dr-phase-grid">${statusCardsHtml(ctx)}</div>
      </section>
      <section class="dr-section">
        <div class="dr-section-head"><h2>Outstanding items</h2><span class="dr-section-sub">Counterparty-side requirements gating phase advancement</span></div>
        ${blockersHtml(ctx)}
      </section>`;
  paint(app, ctx, main);
}

// ---------------------------------------------------------------------------
// Route: PATHWAY  (canonical engagement pathway + interactive diagram)
// ---------------------------------------------------------------------------
function pathwaySvgHtml(ctx) {
  const gate = ctx.room.gate_state || 'phase_0';
  const curIdx = PHASE_RANK[gate] === undefined ? 0 : PHASE_RANK[gate];
  const boxW = 120, gap = 50, startX = 200, y = 20, h = 80;
  let boxes = '', connectors = '', drops = '', statusRow = '';
  PHASE_PATHWAY.forEach((p, i) => {
    const x = startX + i * (boxW + gap);
    const cx = x + boxW / 2;
    const selected = (PHASE_RANK[p.code] === curIdx) ? ' is-selected' : '';
    boxes += `<g class="dr-pathway-phase${selected}" data-phase="${p.letter}" tabindex="0" role="button" aria-label="Phase ${p.letter} — ${escapeHtml(p.title)}">
        <rect x="${x}" y="${y}" width="${boxW}" height="${h}" rx="8" class="dr-pathway-box"/>
        <text x="${cx}" y="${y + 35}" class="dr-pathway-phase-letter">${p.letter}</text>
        <text x="${cx}" y="${y + 60}" class="dr-pathway-phase-title">${escapeHtml(p.title)}</text>
      </g>`;
    if (i < PHASE_PATHWAY.length - 1) {
      const lineX1 = x + boxW, lineX2 = x + boxW + gap;
      connectors += `<line x1="${lineX1}" y1="${y + h / 2}" x2="${lineX2}" y2="${y + h / 2}" class="dr-pathway-connector" />`;
    }
    drops += `<line x1="${cx}" y1="${y + h}" x2="${cx}" y2="${y + h + 20}" class="dr-pathway-connector" />`;
    const label = (PHASE_RANK[p.code] < curIdx) ? 'Complete' : (PHASE_RANK[p.code] === curIdx ? 'Current' : 'Awaiting');
    statusRow += `<text x="${cx}" y="${y + h + 48}" class="dr-pathway-phase-title">${label}</text>`;
  });
  return `<div class="dr-pathway-svg-container">
      <svg viewBox="0 0 1200 220" xmlns="http://www.w3.org/2000/svg" class="dr-pathway-svg" role="img" aria-label="Engagement pathway diagram, six phases A through F">
        <text x="20" y="55" class="dr-pathway-lane-label">Pathway</text>
        <text x="20" y="${y + h + 48}" class="dr-pathway-lane-label">Status</text>
        ${connectors}${boxes}${drops}${statusRow}
      </svg>
      <div id="dr-pathway-detail-panel" class="dr-pathway-detail-panel" aria-live="polite">
        <p class="dr-pathway-detail-prompt">Click any phase above to see the detail.</p>
      </div>
      <div class="dr-diagram-caption">Figure 1 — Engagement pathway across six phases (A through F). Your engagement's current position is highlighted.</div>
    </div>`;
}

function bindPathwayDiagram() {
  const panel = document.getElementById('dr-pathway-detail-panel');
  if (!panel) return;
  const phases = document.querySelectorAll('.dr-pathway-phase');
  if (!phases.length) return;
  const byLetter = {};
  PHASE_PATHWAY.forEach((p) => { byLetter[p.letter] = p; });
  function show(letter) {
    const p = byLetter[letter];
    if (!p) return;
    panel.innerHTML = `<h3 class="dr-pathway-detail-title"></h3><p class="dr-pathway-detail-desc"></p>`;
    panel.querySelector('.dr-pathway-detail-title').textContent = 'Phase ' + p.letter + ' — ' + p.title;
    panel.querySelector('.dr-pathway-detail-desc').textContent = p.summary;
    phases.forEach((el) => { el.classList.toggle('is-selected', el.getAttribute('data-phase') === letter); });
    try { if (window.gtag) window.gtag('event', 'pathway_phase_expand', { phase: letter }); } catch (e) {}
  }
  phases.forEach((el) => {
    el.addEventListener('click', () => show(el.getAttribute('data-phase')));
    el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); show(el.getAttribute('data-phase')); } });
  });
}

function renderPathway(app, ctx) {
  const summaries = PHASE_PATHWAY.map((p) => `
      <div class="dr-phase-summary">
        <h3>Phase ${escapeHtml(p.letter)} — ${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.summary)}</p>
      </div>`).join('');
  const paths = PATHWAY_PATHS.map((p) => `<div class="dr-path-card"><h3>${escapeHtml(p.title)}</h3><p>${p.body}</p></div>`).join('');
  const main = `
      <section class="dr-hero">
        <div class="dr-eyebrow">Engagement pathway</div>
        <h1>Engagement Pathway</h1>
        <p class="dr-hero-lede">A six-phase pathway from initial engagement through to renewal cascade, with three asynchronous next-step paths to suit different counterparty preferences.</p>
      </section>
      <section class="dr-section dr-subpage-nav-section"><div class="dr-nav-grid">${navCardsHtml(ctx, 'pathway')}</div></section>
      ${eileenSectionHtml()}
      <section class="dr-section">
        <div class="dr-section-head"><h2>Six-phase summary</h2><span class="dr-section-sub">The canonical engagement pathway</span></div>
        ${summaries}
      </section>
      <section class="dr-section">
        <div class="dr-section-head"><h2>Three asynchronous next-step paths</h2></div>
        <div class="dr-paths-grid">${paths}</div>
      </section>
      <section class="dr-section">
        <div class="dr-section-head"><h2>Engagement pathway diagram</h2><span class="dr-section-sub">Click any phase for detail</span></div>
        ${pathwaySvgHtml(ctx)}
      </section>`;
  paint(app, ctx, main);
  bindPathwayDiagram();
}

// ---------------------------------------------------------------------------
// Route: DEAL CREATOR  (live pricing — generalised from the canonical room)
// Product config (tiers/overlays/locks) is global; CLID is the only per-room
// parameter. Quote via pricing_quote_function_v4; ceilings via
// get_pricing_ceilings_v3; gate-state gating via the resolved room.
// ---------------------------------------------------------------------------
const DC_STAGE_0_LOCKED = {
  sector_l3:    'Sector L3 (public granular) is unlocked at NDA execution (Phase B).',
  geography_l4: 'Local Authority granularity is unlocked at NDA execution (Phase B).',
  geography_l5: 'Postcode-district granularity is unlocked at NDA execution; Enterprise tier on-request thereafter (Phase B+).',
  industry_l4:  'SIC L4 (4-digit class) granularity is unlocked at NDA execution (Phase B).',
  intel_rri:    'RRI (Regulatory Risk Intelligence) is unlocked at NDA execution and Governance tier minimum (Phase B+).',
  intel_cci:    'CCI (Constitutional Compliance Intelligence) is unlocked at NDA execution and Enterprise tier (Phase B+).',
};
const DC_OVERLAYS = [
  { key: 'refresh', name: 'refresh', options: [
    { value: 'quarterly', label: 'Quarterly', defaultChecked: true },
    { value: 'daily', label: 'Daily' },
    { value: 'real_time', label: 'Real-time (+25%)', locked: 'Real-time refresh is unlocked at NDA execution (Phase B).' } ] },
  { key: 'exclusivity', name: 'exclusivity', options: [
    { value: 'none', label: 'None', defaultChecked: true },
    { value: 'vertical', label: 'Vertical (+60%)', locked: 'Vertical exclusivity is unlocked at NDA execution (Phase B).' },
    { value: 'full_uk', label: 'Full-UK', locked: 'Full-UK exclusivity is unlocked at NDA execution and Enterprise tier (Phase B+).' } ] },
  { key: 'term', name: 'term', options: [
    { value: '12', label: '12 months' },
    { value: '24', label: '24 months', defaultChecked: true },
    { value: '36', label: '36 months' },
    { value: '60', label: '60 months', locked: 'The 60-month closing concession is available at MCA negotiation closing (Phase D).' } ] },
];
const DC_TIERS = [
  { code: 'identity', label: 'Identity', price: '£4 per employer per year', description: 'Core entity record: name, registered address, current status, sector classification, employee count band, Companies House Number cross-reference where available.', locked: false },
  { code: 'tribunal_exposure', label: 'Tribunal Exposure', price: '£18 per employer per year', description: 'Identity + binary tribunal-decision indicator + counts, dates, jurisdictional summary. Includes the no-adverse-signal declaration with coverage transparency.', locked: false },
  { code: 'outcome_intelligence', label: 'Outcome Intelligence', price: '£33 per employer per year', description: 'Tribunal Exposure + outcome-classified data (claim outcomes, awards, ACEI sector base rates, peer-percentile context).', locked: false },
  { code: 'full_acei', label: 'Full ACEI', price: '£45 per employer per year', description: 'Outcome Intelligence + 12-category ACEI scoring with severity-weighted signals and sector-multiplier overlay.', locked: true },
  { code: 'full_enrichment', label: 'Full Enrichment', price: '£90 per employer per year', description: 'Full ACEI + complete 171-column enrichment estate (representative profiles, hearing-day metrics, judge-canonical fields, citation authority).', locked: true },
  { code: 'premium', label: 'Premium', price: '£140 per employer per year', description: 'Full Enrichment + cross-domain regulatory signal (HSE prosecutions, coroner PFD, corporate-relationship rollup).', locked: true },
];
const DC_FIELDSET_TO_INTERNAL = { identity: 'operational_readiness', tribunal_exposure: 'operational_readiness', outcome_intelligence: 'operational_readiness', full_acei: 'governance', full_enrichment: 'enterprise', premium: 'enterprise' };
const DC_TIER_LABEL = { identity: 'Identity', tribunal_exposure: 'Tribunal Exposure', outcome_intelligence: 'Outcome Intelligence', full_acei: 'Full ACEI', full_enrichment: 'Full Enrichment', premium: 'Premium' };
const DC_STAGE_1_GATES = ['phase_a', 'phase_b', 'phase_c', 'phase_d', 'phase_e', 'phase_f'];

function renderDealCreator(app, ctx) {
  const main = `
      <section class="dr-hero">
        <div class="dr-eyebrow">Deal Creator</div>
        <h1>Deal Creator</h1>
        <p class="dr-hero-lede">Compose pricing configurations across tier, scope, and commercial overlays. Configurations are operative against the current ratification version; quotes recompute on each change.</p>
      </section>
      <section class="dr-section dr-subpage-nav-section"><div class="dr-nav-grid">${navCardsHtml(ctx, 'deal-creator')}</div></section>

      <section id="dc-identifier-baseline" class="dc-identifier-baseline" aria-label="Identifier architecture">
        <div class="dc-identifier-baseline-icon" aria-hidden="true">&#x2299;</div>
        <p class="dc-identifier-baseline-text">All records are ALIN-keyed (Ailane proprietary identifier) with Companies House Number cross-reference where available. Additional cross-reference systems (FCA, Charity Commission, GLEIF) available on request where applicable.</p>
      </section>

      <section id="panel-1-tier" class="dc-panel" data-panel="1" aria-labelledby="panel-1-heading">
        <h2 id="panel-1-heading">Tier</h2>
        <div class="dc-tier-cards" role="radiogroup" aria-label="Field-set tier selection"></div>
      </section>

      <section id="panel-2-scope" class="dc-panel" data-panel="2" aria-labelledby="panel-2-heading">
        <h2 id="panel-2-heading">Scope</h2>
        <div class="dc-scope-axes">
          <div class="dc-axis" data-axis="sector"><h3>Sector</h3><div class="dc-axis-content"></div></div>
          <div class="dc-axis" data-axis="geography"><h3>Geography</h3><div class="dc-axis-content"></div></div>
          <div class="dc-axis" data-axis="industry"><h3>Industry</h3><div class="dc-axis-content"></div></div>
          <div class="dc-axis" data-axis="intelligence"><h3>Intelligence</h3><div class="dc-axis-content"></div></div>
        </div>
        <p class="dc-universe-count">Universe: <span id="universe-count">&mdash;</span> employers</p>
      </section>

      <section id="panel-3-overlays" class="dc-panel" data-panel="3" aria-labelledby="panel-3-heading">
        <h2 id="panel-3-heading">Commercial Overlays</h2>
        <div class="dc-overlay-rows">
          <div class="dc-overlay" data-overlay="refresh"><h3>Refresh cadence</h3><div class="dc-overlay-content"></div></div>
          <div class="dc-overlay" data-overlay="exclusivity"><h3>Exclusivity</h3><div class="dc-overlay-content"></div></div>
          <div class="dc-overlay" data-overlay="term"><h3>Term length</h3><div class="dc-overlay-content"></div></div>
        </div>
      </section>

      <section id="quote-pane" class="dc-quote" aria-live="polite">
        <p class="dc-quote-empty">Select a tier to begin a configuration.</p>
      </section>

      <section id="dc-actions" class="dc-actions">
        <button id="save-configuration" class="dc-btn-primary" type="button" disabled>Save Configuration</button>
        <button id="discuss-with-eileen" class="dc-btn-secondary" type="button">Discuss with Eileen</button>
      </section>
      <p id="dc-save-explanation" class="dc-save-explanation" hidden>
        Save Configuration unlocks at NDA execution (Phase B). At Stage 0, configurations can be composed and discussed freely without commitment. The Director reviews live through your conversation with Eileen.
      </p>

      ${eileenSectionHtml('Ask about the configuration, the pricing surface, the ACEI taxonomy, the engagement pathway, or the underlying UK employment law.')}`;
  paint(app, ctx, main, { containerClass: 'deal-creator-page' });
  initDealCreator(ctx);
}

function initDealCreator(ctx) {
  const clid = ctx.room.clid;
  let ceilings = null;
  let recomputeTimer = null;

  // ----- Panel 1: tiers -----
  const tierWrap = document.querySelector('#panel-1-tier .dc-tier-cards');
  tierWrap.innerHTML = DC_TIERS.map((t) => {
    const id = 'dc-tier-' + t.code;
    const lockedClass = t.locked ? ' dc-tier-card-locked' : '';
    const lockIcon = t.locked ? '<span class="dc-tier-card-lock" aria-label="NDA-gated">&#x1F512;</span>' : '';
    const lockExp = t.locked ? '<p class="dc-tier-card-lock-explanation">Unlocks at NDA execution (Phase B).</p>' : '';
    return `<label class="dc-tier-card${lockedClass}" data-tier="${t.code}" for="${id}">
        <input type="radio" id="${id}" name="field_set_tier" value="${t.code}"${t.locked ? ' disabled' : ''} />
        <div class="dc-tier-card-header"><span class="dc-tier-card-title">${escapeHtml(t.label)}</span><span class="dc-tier-card-price">${escapeHtml(t.price)}</span>${lockIcon}</div>
        <p class="dc-tier-card-description">${escapeHtml(t.description)}</p>${lockExp}
      </label>`;
  }).join('');
  tierWrap.addEventListener('change', (ev) => {
    if (!ev.target || ev.target.name !== 'field_set_tier') return;
    document.querySelectorAll('.dc-tier-card').forEach((c) => c.classList.toggle('is-selected', c.getAttribute('data-tier') === ev.target.value));
    try { if (window.gtag) window.gtag('event', 'deal_creator_tier_selected', { clid, tier: ev.target.value }); } catch (e) {}
    loadCeilings().then(() => { renderScope(); recompute(); });
  });

  // ----- Panel 3: overlays -----
  DC_OVERLAYS.forEach((ov) => {
    const content = document.querySelector('.dc-overlay[data-overlay="' + ov.key + '"] .dc-overlay-content');
    if (!content) return;
    content.innerHTML = ov.options.map((opt) => {
      const id = 'dc-ov-' + ov.name + '-' + opt.value;
      const lock = opt.locked ? ' <span class="lock-icon" aria-label="NDA-gated">🔒</span><small>' + escapeHtml(opt.locked) + '</small>' : '';
      return `<label${opt.locked ? ' class="locked"' : ''} for="${id}"><input type="radio" id="${id}" name="${ov.name}" value="${opt.value}"${opt.defaultChecked ? ' checked' : ''}${opt.locked ? ' disabled' : ''} /><span>${escapeHtml(opt.label)}</span>${lock}</label>`;
    }).join('');
  });
  const ovPanel = document.getElementById('panel-3-overlays');
  ovPanel.addEventListener('change', (ev) => { if (ev.target && ev.target.name) recompute(); });

  // Launch-partner badge from resolved room.
  if (ctx.room.is_launch_partner) {
    const h = ovPanel.querySelector('h2');
    if (h && !ovPanel.querySelector('.dc-launch-partner-badge')) {
      const badge = document.createElement('span');
      badge.className = 'dc-launch-partner-badge';
      badge.textContent = 'Launch-partner — discount applies automatically';
      h.insertAdjacentElement('afterend', badge);
    }
  }

  // Discuss-with-Eileen — pre-fill the inline panel with config context.
  let eileenSeeded = false;
  const discussBtn = document.getElementById('discuss-with-eileen');
  if (discussBtn) discussBtn.addEventListener('click', () => {
    const snap = buildSnapshot();
    const input = document.getElementById('dr-eileen-input');
    if (input && (!eileenSeeded || !(input.value || '').trim())) {
      const summary = snap.modifiers.tier ? buildSummary(snap) : 'No tier selected yet — please pick an access tier above so Eileen can speak to a concrete configuration.';
      input.value = 'About this Deal Creator configuration:\n' + summary + '\n\n';
      eileenSeeded = true;
    }
    if (input) try { input.focus(); } catch (e) {}
    const panel = document.getElementById('dr-eileen-panel');
    if (panel) try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    try { if (window.gtag) window.gtag('event', 'deal_creator_eileen_opened', { clid }); } catch (e) {}
  });

  loadCeilings(); // warm the cache

  // ----- data + helpers -----
  function loadCeilings() {
    if (ceilings) return Promise.resolve(ceilings);
    return callRpc('get_pricing_ceilings_v3', {}, ctx.session).then((r) => {
      if (r.ok && r.data && !r.data.code) ceilings = r.data;
      return ceilings;
    }).catch(() => null);
  }

  function segmentFieldset(legend, name, items, opts) {
    opts = opts || {};
    let html = `<fieldset class="dc-segment-fieldset"><legend>${escapeHtml(legend)}</legend><div class="dc-segment-chips">`;
    items.forEach((item) => {
      const id = 'dc-' + name + '-' + item.value_code;
      const lvl = opts.level ? ` data-level="${opts.level}"` : '';
      let count = '';
      if (opts.countField === 'enriched' && item.enriched_count) count = `<small>${Number(item.enriched_count).toLocaleString()} enriched</small>`;
      else if (item.identity_count) count = `<small>${Number(item.identity_count).toLocaleString()} employers</small>`;
      html += `<label class="dc-segment-chip" for="${id}"><input type="checkbox" id="${id}" name="${name}" value="${escapeHtml(item.value_code)}"${lvl} /><span>${escapeHtml(item.display_label)}</span>${count}</label>`;
    });
    html += '</div>';
    if (opts.hint) html += `<p class="dc-segment-hint">${escapeHtml(opts.hint)}</p>`;
    html += '</fieldset>';
    return html;
  }
  function lockedRow(label, reason) {
    return `<div class="dc-overlay-locked" role="note"><strong>${escapeHtml(label)} <span class="lock-icon" aria-hidden="true">🔒</span></strong><small>${escapeHtml(reason)}</small></div>`;
  }

  function renderScope() {
    if (!ceilings) return;
    const axes = ceilings.axes || {};
    // Sector
    let el = document.querySelector('.dc-axis[data-axis="sector"] .dc-axis-content');
    if (el) {
      const s = axes.sector;
      if (!s) el.innerHTML = '<p class="dc-axis-empty">Sector data unavailable.</p>';
      else {
        let h = '';
        const l1 = (s.levels && s.levels.L1) || [], l2 = (s.levels && s.levels.L2) || [];
        if (l1.length) h += segmentFieldset('Sector L1 (public / private / third)', 'sector_l1', l1, {});
        if (l2.length) h += segmentFieldset('Sector L2 segments (multi-select)', 'sector_l2', l2, { hint: 'Selections compose volume-weighted pricing.' });
        h += lockedRow('Sector L3 (public granular)', DC_STAGE_0_LOCKED.sector_l3);
        el.innerHTML = h;
      }
    }
    // Geography
    el = document.querySelector('.dc-axis[data-axis="geography"] .dc-axis-content');
    if (el) {
      const g = axes.geography;
      if (!g) el.innerHTML = '<p class="dc-axis-empty">Geography data unavailable.</p>';
      else {
        let h = '<p class="dc-axis-hint">Selections at the deepest level win; selecting at L3 supersedes L2 and L1.</p>';
        ['L1', 'L2', 'L3'].forEach((lvl) => {
          const items = (g.levels && g.levels[lvl]) || [];
          if (!items.length) return;
          const legend = lvl === 'L1' ? 'Geography L1 (whole UK)' : (lvl === 'L2' ? 'Geography L2 (4 nations)' : 'Geography L3 (regions / nations)');
          h += segmentFieldset(legend, 'geography', items, { level: lvl });
        });
        h += lockedRow('Geography L4 (Local Authority)', DC_STAGE_0_LOCKED.geography_l4);
        h += lockedRow('Geography L5 (postcode district)', DC_STAGE_0_LOCKED.geography_l5);
        el.innerHTML = h;
      }
    }
    // Industry
    el = document.querySelector('.dc-axis[data-axis="industry"] .dc-axis-content');
    if (el) {
      const ind = axes.industry;
      if (!ind) el.innerHTML = '<p class="dc-axis-empty">Industry data unavailable.</p>';
      else {
        let h = '';
        const l1 = (ind.levels && ind.levels.L1) || [];
        if (l1.length) h += segmentFieldset('SIC L1 (sections, multi-select)', 'industry_l1', l1, {});
        h += lockedRow('SIC L4 (4-digit class)', DC_STAGE_0_LOCKED.industry_l4);
        el.innerHTML = h;
      }
    }
    // Intelligence
    el = document.querySelector('.dc-axis[data-axis="intelligence"] .dc-axis-content');
    if (el) {
      const intel = axes.intelligence;
      if (!intel) el.innerHTML = '<p class="dc-axis-empty">Intelligence data unavailable.</p>';
      else {
        let h = '';
        const l1 = (intel.levels && intel.levels.L1) || [];
        if (l1.length) h += segmentFieldset('ACEI categories (multi-select)', 'intelligence_acei', l1, { countField: 'enriched' });
        h += lockedRow('RRI — Regulatory Risk Intelligence', DC_STAGE_0_LOCKED.intel_rri);
        h += lockedRow('CCI — Constitutional Compliance Intelligence', DC_STAGE_0_LOCKED.intel_cci);
        el.innerHTML = h;
      }
    }
    const scopePanel = document.getElementById('panel-2-scope');
    if (scopePanel && scopePanel.dataset.bound !== '1') {
      scopePanel.dataset.bound = '1';
      scopePanel.addEventListener('change', (ev) => { if (ev.target && ev.target.name) recompute(); });
    }
  }

  function checkedVals(name) {
    return Array.prototype.slice.call(document.querySelectorAll(`input[name="${name}"]:checked`)).map((i) => i.value);
  }
  function getScope() {
    const geoBy = { L1: [], L2: [], L3: [] };
    document.querySelectorAll('input[name="geography"]:checked').forEach((i) => { const l = i.dataset.level; if (geoBy[l]) geoBy[l].push(i.value); });
    let geoLevel = null, geoValues = [];
    if (geoBy.L3.length) { geoLevel = 'L3'; geoValues = geoBy.L3; }
    else if (geoBy.L2.length) { geoLevel = 'L2'; geoValues = geoBy.L2; }
    else if (geoBy.L1.length) { geoLevel = 'L1'; geoValues = geoBy.L1; }
    const ind = checkedVals('industry_l1');
    return {
      sector: { l1: checkedVals('sector_l1'), l2: checkedVals('sector_l2') },
      geography: geoLevel ? { level: geoLevel, values: geoValues } : { level: null, values: [] },
      industry: ind.length ? { level: 'L1', values: ind } : { level: null, values: [] },
      intelligence: { acei: checkedVals('intelligence_acei'), rri: [], cci: [] },
    };
  }
  function getOverlays() {
    const sel = (n) => { const el = document.querySelector(`input[name="${n}"]:checked`); return el ? el.value : null; };
    const term = Number(sel('term') || 24);
    return { refresh: sel('refresh') || 'quarterly', exclusivity: sel('exclusivity') || 'none', term_months: term, term_years: Math.round(term / 12) };
  }
  function getTier() { const el = document.querySelector('input[name="field_set_tier"]:checked'); return el ? el.value : null; }
  function buildSnapshot() {
    const fieldSet = getTier();
    const ov = getOverlays();
    return { scope: getScope(), modifiers: { tier: fieldSet ? DC_FIELDSET_TO_INTERNAL[fieldSet] : null, field_set_tier: fieldSet, refresh: ov.refresh, exclusivity: ov.exclusivity, term_years: ov.term_years, clid } };
  }
  function ceilLabel(axis, level, code) {
    if (!ceilings || !ceilings.axes || !ceilings.axes[axis]) return code;
    const lvl = ceilings.axes[axis].levels && ceilings.axes[axis].levels[level];
    if (!lvl) return code;
    for (const it of lvl) if (it.value_code === code) return it.display_label || code;
    return code;
  }
  function shortLabel(l) { if (!l) return l; const i = l.indexOf(' — '); return i > 0 ? l.substring(0, i) : l; }
  function labelList(axis, level, codes) {
    if (!codes.length) return '';
    const full = codes.map((c) => ceilLabel(axis, level, c));
    return codes.length <= 2 ? full.join(', ') : full.map(shortLabel).join(', ');
  }
  function buildSummary(snap) {
    const parts = [DC_TIER_LABEL[snap.modifiers.field_set_tier] || snap.modifiers.field_set_tier];
    const s = snap.scope;
    if (s.sector.l1.length) parts.push('Sector: ' + s.sector.l1.map((c) => ceilLabel('sector', 'L1', c)).join(', '));
    if (s.sector.l2.length) parts.push('Segments: ' + s.sector.l2.map((c) => ceilLabel('sector', 'L2', c)).join(', '));
    if (s.geography.values && s.geography.values.length) parts.push('Geography ' + s.geography.level + ': ' + s.geography.values.map((c) => ceilLabel('geography', s.geography.level, c)).join(', '));
    if (s.industry.values && s.industry.values.length) parts.push('Industry ' + s.industry.level + ': ' + labelList('industry', s.industry.level, s.industry.values));
    if (s.intelligence.acei.length) parts.push('ACEI: ' + labelList('intelligence', 'L1', s.intelligence.acei));
    return parts.join(' · ');
  }
  function fmtPounds(p) { return typeof p === 'number' ? '£' + Math.round(p / 100).toLocaleString('en-GB') : '—'; }
  function fmtPerRecord(p) {
    if (typeof p !== 'number') return '—';
    const pounds = p / 100;
    if (pounds >= 100 || pounds === Math.round(pounds)) return '£' + Math.round(pounds).toLocaleString('en-GB');
    return '£' + pounds.toLocaleString('en-GB', { maximumFractionDigits: 2 });
  }
  function exclusivityLine(v) {
    if (v === 'vertical') return 'Exclusivity: Vertical — binds the platform from offering equivalent commercial terms to competitors in the same sub-vertical and region for the duration of the engagement.';
    if (v === 'full_uk') return 'Exclusivity: Full-UK — binds the platform from offering equivalent commercial terms to competitors in the United Kingdom for the duration of the engagement.';
    return 'Exclusivity: not elected at this configuration.';
  }

  function setSaveState(snap) {
    const saveBtn = document.getElementById('save-configuration');
    const explain = document.getElementById('dc-save-explanation');
    if (!saveBtn) return;
    const stage1 = DC_STAGE_1_GATES.indexOf(ctx.room.gate_state) !== -1;
    if (stage1) { saveBtn.disabled = false; if (explain) explain.hidden = true; }
    else { saveBtn.disabled = true; if (explain) explain.hidden = false; }
  }

  function renderQuote(quote, snap) {
    const pane = document.getElementById('quote-pane');
    if (!pane) return;
    const ov = snap.modifiers;
    const meta = [
      'Pricing schedule: escalation at the next ratification milestone trigger.',
      exclusivityLine(ov.exclusivity),
      'Refresh cadence: ' + (ov.refresh === 'daily' ? 'Daily' : ov.refresh === 'real_time' ? 'Real-time' : 'Quarterly') + '.',
      'Term: ' + getOverlays().term_months + ' months.',
    ];
    if (quote.is_launch_partner_applied) meta.push('Launch-partner discount: applied — the configured reduction is reflected in the annual figure above.');
    if (quote.floor_applied) meta.push('Pricing floor: the minimum annual fee threshold has been applied at this configuration.');
    const universe = typeof quote.scope_universe === 'number' ? quote.scope_universe.toLocaleString('en-GB') : '—';
    pane.innerHTML = `<div class="dc-quote-summary">
        <div class="dc-quote-config">${escapeHtml(buildSummary(snap))}</div>
        <dl class="dc-quote-figures">
          <div class="dc-quote-row"><dt class="dc-quote-label">Universe</dt><dd class="dc-quote-figure">${escapeHtml(universe)} employers</dd></div>
          <div class="dc-quote-row"><dt class="dc-quote-label">Per record</dt><dd class="dc-quote-figure">${escapeHtml(fmtPerRecord(quote.per_record_pence))}</dd></div>
          <div class="dc-quote-row"><dt class="dc-quote-label">Annual</dt><dd class="dc-quote-figure">${escapeHtml(fmtPounds(quote.annual_pence))}</dd></div>
        </dl>
        <div class="dc-quote-meta">${meta.map((l) => '<p>' + escapeHtml(l) + '</p>').join('')}</div>
      </div>`;
    const countEl = document.getElementById('universe-count');
    if (countEl) countEl.textContent = universe;
    setSaveState(snap);
    try { if (window.gtag) window.gtag('event', 'deal_creator_quote_returned', { clid, tier: snap.modifiers.field_set_tier }); } catch (e) {}
  }
  function renderQuoteEmpty() {
    const pane = document.getElementById('quote-pane');
    if (pane) pane.innerHTML = '<p class="dc-quote-empty">Select a tier to begin a configuration.</p>';
    const saveBtn = document.getElementById('save-configuration'); if (saveBtn) saveBtn.disabled = true;
    const explain = document.getElementById('dc-save-explanation'); if (explain) explain.hidden = true;
  }
  function renderQuoteUnavailable() {
    const pane = document.getElementById('quote-pane');
    if (pane) pane.innerHTML = '<p class="dc-quote-empty">Configuration not yet priced. Adjust your selections to produce a priceable scope.</p>';
    const saveBtn = document.getElementById('save-configuration'); if (saveBtn) saveBtn.disabled = true;
    const explain = document.getElementById('dc-save-explanation'); if (explain) explain.hidden = true;
  }

  function recompute() {
    clearTimeout(recomputeTimer);
    recomputeTimer = setTimeout(() => {
      const snap = buildSnapshot();
      if (!snap.modifiers.tier) { renderQuoteEmpty(); const c = document.getElementById('universe-count'); if (c) c.textContent = '—'; return; }
      callRpc('pricing_quote_function_v4', { p_config_snapshot: snap }, ctx.session).then((r) => {
        if (!r.ok || !r.data || typeof r.data.annual_pence !== 'number') { renderQuoteUnavailable(); return; }
        renderQuote(r.data, snap);
      }).catch(() => renderQuoteUnavailable());
    }, 250);
  }

  try { if (window.gtag) window.gtag('event', 'deal_creator_view', { clid }); } catch (e) {}
}

// ---------------------------------------------------------------------------
// Boot — the 404-status SPA entry point (DRPS-001 §6.1)
// ---------------------------------------------------------------------------
function ensureApp() {
  let app = document.getElementById('dr-app');
  if (!app) { app = document.createElement('div'); app.id = 'dr-app'; document.body.appendChild(app); }
  return app;
}

function renderRoute(app, ctx) {
  const route = getCurrentRoute();
  if (route === 'documents') renderDocuments(app, ctx);
  else if (route === 'status') renderStatus(app, ctx);
  else if (route === 'pathway') renderPathway(app, ctx);
  else if (route === 'deal-creator') renderDealCreator(app, ctx);
  else renderHome(app, ctx);
  setState('ready', { slug: getCurrentSlug(), clid: ctx.room.clid, route });
  reveal();
  if (window.ailaneConsent && typeof window.ailaneConsent.present === 'function') {
    try { window.ailaneConsent.present(); } catch (e) {}
  }
}

async function boot() {
  const app = ensureApp();
  const slug = getCurrentSlug();
  setState('booting', { slug });

  if (!slug) { renderNotFound(app); setState('not-found'); reveal(); return; }

  try {
    await waitForSupabase();
    const sb = getClient();

    const session = await resolveSession(sb);
    if (!session) { renderSignIn(app, sb); setState('signin', { slug }); reveal(); return; }

    const room = await resolveRoom(sb, slug);
    if (!room) { renderRoomNotFound(app, sb); setState('room-not-found', { slug }); reveal(); return; }
    setState('resolving', { slug, clid: room.clid });

    const jwt = decodeJwt(session.access_token) || {};
    const email = (jwt.email || '').toLowerCase();
    const isDirector = email === DIRECTOR_EMAIL;

    let contact = null;
    if (!isDirector) {
      contact = await findMembership(sb, session.user.id, email, room.clid);
      if (!contact) { renderUnauthorised(app, sb, email); setState('unauthorised', { slug, clid: room.clid }); reveal(); return; }
    }

    const ctx = { sb, session, room, isDirector, contact, email, userId: session.user.id, uploads: {}, docs: [], blockers: [] };

    if (!isDirector) {
      const accepted = await termsAlreadyAccepted(ctx);
      if (!accepted) {
        setState('terms-gate', { slug, clid: room.clid });
        renderTermsGate(app, ctx, () => finishWorkspace(app, ctx));
        reveal();
        return;
      }
    }
    await finishWorkspace(app, ctx);
  } catch (e) {
    console.error('[dealroom] boot error:', e);
    app.innerHTML = cardShell(`<h1 class="dr-gate-title">Workspace temporarily unavailable</h1>
      <p class="dr-gate-lede">A platform error occurred. Please refresh; if it persists, contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`);
    setState('error', { slug });
    reveal();
  }
}

async function finishWorkspace(app, ctx) {
  const route = getCurrentRoute();
  // Load only the data the active route needs (RLS scopes what each identity sees).
  if (route === 'documents') {
    try { ctx.docs = await listCatalog(ctx.sb, ctx.room.clid); } catch (e) { console.warn('[dealroom] catalog error:', e); ctx.docs = []; }
    ctx.uploads = await listLatestUploads(ctx.sb, ctx.room.clid);
  } else if (route === 'status') {
    ctx.blockers = await listPhaseBlockers(ctx.sb, ctx.room.clid);
  }
  renderRoute(app, ctx);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Public surface (DRPS-001 §6.2 / V7 §8).
export {
  boot, getCurrentSlug, getCurrentClid, getCurrentRoute, callDealroomEF,
  PHASE_LABEL, PHASE_RANK, isPhaseUnlocked, PHASE_PATHWAY,
};
export default { boot, getCurrentSlug, getCurrentClid, getCurrentRoute };
