/* =============================================================================
 * AILANE — Deal-Room Shared Serving Module
 * Governed by AILANE-SPEC-DRPS-001 §6 (Serving Limb — 404-status SPA pattern).
 * Design lineage: AILANE-CC-BRIEF-DEALROOM-V7-PHASE-B-001 §8 (the _shared/ design).
 *
 * One dynamic shell serves every counterparty workspace at
 *   ailane.ai/partners/<workspace_slug>/
 * with ZERO per-room commit. A room is live the instant its partner_clids
 * record exists. The only counterparty-specific value in the front end is the
 * slug in the URL, read by getCurrentSlug() / getCurrentClid().
 *
 * Data path (generalised from the proven legacy-room shared layer; this module
 * references NO counterparty by name and carries no room-specific literals):
 *   - room resolution : partner_clids by workspace_path  (authenticated read)
 *   - membership      : partner_contacts (self / by-email); Director bypass
 *   - document estate : dealroom_documents_catalog (RLS-scoped) grouped by phase
 *   - signed URLs     : dealroom-document-fetch  (1-hour, private bucket)
 *   - uploads         : dealroom-document-upload + dealroom_uploads status
 *   - terms gate      : dealroom-accept-terms    (status / accept)
 *   - in-room Eileen   : eileen-dealroom          (catalog-aware intelligence)
 *
 * Auth note (CLAUDE.md): this is NOT an auth-callback surface. The Supabase JS
 * client resolves a session via getSession()/onAuthStateChange BEFORE any
 * .from() read, so client query usage here is compliant.
 *
 * Privacy guard (DRPS-001 §8): no Director personal identity and no registered
 * company address appears on this counterparty surface. Eileen is "she/her",
 * never described as a bot or generic assistant.
 *
 * AMD-127 reserved — branch-naming convention forward marker (per V7 §8).
 * ============================================================================= */

const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';
const DIRECTOR_EMAIL = 'mark@ailane.ai';
const PARTNERS_PREFIX = '/partners/';
const SUPPORT_EMAIL = 'partnerships@ailane.ai';
const LEGAL_URL = '/legal/deal-room-privacy/';

// ---- Phase model (DRPS-001 §7; labels per V7 D1 — never render the raw enum) ----
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
// Grouping order for the document estate (DRPS-001 §6.3 — by phase then display_order).
const PHASE_GROUP_ORDER = ['phase_0', 'phase_a', 'phase_b', 'phase_c', 'phase_d', 'phase_e', 'phase_f', 'all_phases'];

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
    window.__AILANE_DEALROOM__ = Object.assign({ state }, extra || {});
  } catch (e) { /* noop */ }
}

function reveal() {
  document.body.style.visibility = 'visible';
}

// ---------------------------------------------------------------------------
// Slug / client resolution
// ---------------------------------------------------------------------------
function getCurrentSlug() {
  const path = window.location.pathname || '';
  if (!path.startsWith(PARTNERS_PREFIX)) return null;
  const rest = path.slice(PARTNERS_PREFIX.length);
  const slug = rest.split('/').filter(Boolean)[0] || '';
  return slug || null;
}

// Resolved CLID is cached on window after resolveRoom(); exposed per the V7 surface.
function getCurrentClid() {
  return (window.__AILANE_DEALROOM__ && window.__AILANE_DEALROOM__.clid) || null;
}

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
          // Strip magic-link tokens from the URL on success.
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
    .select('clid, counterparty_name, workspace_path, gate_state, package_selection')
    .eq('workspace_path', workspacePath)
    .maybeSingle();
  if (error) { console.warn('[dealroom] room resolve error:', error); return null; }
  return data || null;
}

async function findMembership(sb, userId, email, clid) {
  // Path A — by user_id.
  try {
    const { data } = await sb
      .from('partner_contacts')
      .select('contact_id, full_name, role_title, status, clid')
      .eq('user_id', userId).eq('clid', clid).eq('status', 'active').maybeSingle();
    if (data) return data;
  } catch (e) { /* fall through */ }
  // Path B — by email (RLS partner_contacts_select_by_email).
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
    return {}; // degrade silently — requirements simply show "awaiting upload"
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

// ---------------------------------------------------------------------------
// Shells (sign-in / unauthorised / room-not-found / not-found)
// ---------------------------------------------------------------------------
function cardShell(inner) {
  return `<div class="drx-gate"><div class="drx-gate-card">
      <div class="drx-gate-brand">Ai<em>lane</em></div>
      <div class="drx-gate-eyebrow">Private engagement workspace</div>
      ${inner}
      <p class="drx-gate-foot">AI Lane Limited · Company No. 17035654 · ICO Reg. 00013389720<br>Confidential — pre-contractual workspace.</p>
    </div></div>`;
}

function renderSignIn(app, sb) {
  app.innerHTML = cardShell(`
    <h1 class="drx-gate-title">Welcome to the engagement workspace</h1>
    <p class="drx-gate-lede">Enter your registered email to receive a magic-link sign-in. The link returns you to this workspace.</p>
    <form class="drx-gate-form" data-dealroom-signin novalidate>
      <input type="email" id="drx-email" placeholder="you@company.com" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" required>
      <button type="submit" id="drx-send">Send magic link</button>
    </form>
    <p id="drx-signin-status" class="drx-gate-status" aria-live="polite"></p>
    <p class="drx-gate-help">Trouble signing in? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  `);
  const form = app.querySelector('[data-dealroom-signin]');
  const input = app.querySelector('#drx-email');
  const btn = app.querySelector('#drx-send');
  const status = app.querySelector('#drx-signin-status');
  function setStatus(html, kind) {
    status.innerHTML = html;
    status.className = 'drx-gate-status' + (kind ? ' drx-gate-status-' + kind : '');
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
    <h1 class="drx-gate-title">Access not provisioned</h1>
    <p class="drx-gate-lede">The address <strong>${escapeHtml(email || '')}</strong> is signed in but is not registered against this engagement workspace. Sign in with your registered address, or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <button type="button" id="drx-signout" class="drx-gate-btn-ghost">Sign out</button>
  `);
  app.querySelector('#drx-signout').addEventListener('click', async () => {
    try { await sb.auth.signOut(); } catch (e) {}
    window.location.replace('/');
  });
}

function renderRoomNotFound(app, sb) {
  app.innerHTML = cardShell(`
    <h1 class="drx-gate-title">Workspace not found</h1>
    <p class="drx-gate-lede">No engagement workspace exists at this address. If you were sent a link, please check it, or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <button type="button" id="drx-signout" class="drx-gate-btn-ghost">Sign out</button>
  `);
  const so = app.querySelector('#drx-signout');
  if (so) so.addEventListener('click', async () => { try { await sb.auth.signOut(); } catch (e) {} window.location.replace('/'); });
}

function renderNotFound(app) {
  app.innerHTML = `<div class="drx-gate"><div class="drx-gate-card">
      <div class="drx-gate-brand">Ai<em>lane</em></div>
      <h1 class="drx-gate-title">Page not found</h1>
      <p class="drx-gate-lede">The page you requested doesn't exist. Return to <a href="/">ailane.ai</a>.</p>
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
    return false; // fail safe — block and prompt
  }
}

function renderTermsGate(app, ctx, onAccepted) {
  app.innerHTML = `<div class="drx-gate"><div class="drx-gate-card" role="dialog" aria-modal="true" aria-labelledby="drx-tg-title" data-dealroom-termsgate>
      <div class="drx-gate-brand">Ai<em>lane</em></div>
      <div class="drx-gate-eyebrow">${escapeHtml(ctx.room.counterparty_name || 'Engagement workspace')}</div>
      <h1 id="drx-tg-title" class="drx-gate-title">Before you enter this workspace</h1>
      <p class="drx-gate-lede">Please review and accept the Privacy Notice &amp; Workspace Terms.</p>
      <p class="drx-gate-linkrow"><a class="drx-gate-link" href="${LEGAL_URL}" target="_blank" rel="noopener">Read the Privacy Notice &amp; Workspace Terms</a> <span class="drx-gate-newtab">(opens in a new tab)</span></p>
      <label class="drx-gate-check"><input type="checkbox" id="drx-tg-check"><span>I confirm I have read and accept the Privacy Notice &amp; Workspace Terms on behalf of my organisation.</span></label>
      <p id="drx-tg-status" class="drx-gate-status" aria-live="polite"></p>
      <button type="button" id="drx-tg-accept" class="drx-gate-btn" disabled>Accept &amp; enter</button>
    </div></div>`;
  const check = app.querySelector('#drx-tg-check');
  const btn = app.querySelector('#drx-tg-accept');
  const status = app.querySelector('#drx-tg-status');
  check.addEventListener('change', () => { btn.disabled = !check.checked; });
  btn.addEventListener('click', async () => {
    if (!check.checked) return;
    btn.disabled = true; check.disabled = true;
    status.className = 'drx-gate-status'; status.textContent = 'Recording your acceptance…';
    try {
      const r = await callDealroomEF('dealroom-accept-terms', { action: 'accept', clid: ctx.room.clid }, ctx.session);
      const ok = r && (r.recorded === true || r.already === true || r.ok === true);
      if (!ok) throw new Error('not recorded');
      try { if (window.gtag) window.gtag('event', 'dealroom_terms_accepted'); } catch (e) {}
      onAccepted();
    } catch (e) {
      status.className = 'drx-gate-status drx-gate-status-error';
      status.innerHTML = `We couldn't record your acceptance — please refresh and try again, or contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.`;
      check.disabled = false; btn.disabled = !check.checked;
    }
  });
  setTimeout(() => { try { check.focus(); } catch (e) {} }, 30);
}

// ---------------------------------------------------------------------------
// Workspace render
// ---------------------------------------------------------------------------
function renderPhaseRail(gateState, isDirector) {
  const phases = ['phase_0', 'phase_a', 'phase_b', 'phase_c', 'phase_d', 'phase_e', 'phase_f'];
  const items = phases.map((p) => {
    const unlocked = isDirector || isPhaseUnlocked(gateState, p);
    const current = p === gateState;
    return `<li class="drx-rail-item${unlocked ? ' is-unlocked' : ''}${current ? ' is-current' : ''}">
        <span class="drx-rail-dot">${escapeHtml(phaseShort(p))}</span>
        <span class="drx-rail-label">${escapeHtml(PHASE_LABEL[p])}</span>
      </li>`;
  }).join('');
  return `<aside class="drx-rail" aria-label="Engagement phases">
      <div class="drx-rail-title">Engagement status</div>
      <ol class="drx-rail-list">${items}</ol>
    </aside>`;
}

function renderTileCards() {
  const tiles = [
    { t: 'Documents', d: 'The engagement document estate, released and required, grouped by phase.', a: '#drx-documents' },
    { t: 'Engagement status', d: 'Where this engagement sits across the seven-phase pathway.', a: '#drx-rail-anchor' },
    { t: 'Ask Eileen', d: 'Ailane’s in-room intelligence — grounded in the estate and UK employment law.', a: '#drx-eileen' },
  ];
  return `<div class="drx-tiles">${tiles.map((x) => `
      <a class="drx-tile" href="${x.a}"><div class="drx-tile-title">${escapeHtml(x.t)}</div><div class="drx-tile-desc">${escapeHtml(x.d)}</div></a>`).join('')}</div>`;
}

function groupByPhase(docs) {
  const out = {};
  for (const p of PHASE_GROUP_ORDER) {
    const rows = docs.filter((d) => (d.phase || 'phase_0') === p);
    if (rows.length) out[p] = rows;
  }
  return out;
}

function docCardHtml(doc, ctx) {
  const requiredPhase = doc.available_from_phase || doc.phase || 'phase_0';
  const unlocked = ctx.isDirector || isPhaseUnlocked(ctx.room.gate_state, requiredPhase);
  const kindLabel = doc.kind === 'requirement' ? 'Counterparty requirement' : (doc.kind === 'template' ? 'Template' : 'Release');
  const blocking = doc.is_blocking_phase_advance ? '<span class="drx-badge drx-badge-block">Blocking</span>' : '';
  const code = doc.doc_code ? `<div class="drx-doc-code">${escapeHtml(doc.doc_code)}</div>` : '';
  const sizeText = doc.file_size_bytes ? formatBytes(doc.file_size_bytes) : (doc.kind === 'requirement' ? 'Awaiting upload' : 'Pending publication');
  const version = doc.version_label ? `<span class="drx-doc-version">${escapeHtml(doc.version_label)}</span>` : '';

  let actions = '';
  if (doc.kind === 'requirement') {
    const up = ctx.uploads[doc.document_id];
    if (up) {
      const cls = up.status === 'accepted' ? 'ok' : (up.status === 'rejected' ? 'err' : 'warn');
      actions = `<span class="drx-chip drx-chip-${cls}">${escapeHtml(up.status)}</span>
        <button class="drx-btn drx-btn-sec" data-action="upload" data-doc="${escapeHtml(doc.document_id)}">Upload new version</button>`;
    } else if (!unlocked) {
      actions = `<button class="drx-btn drx-btn-sec" disabled>Locked</button>`;
    } else {
      actions = `<button class="drx-btn drx-btn-pri" data-action="upload" data-doc="${escapeHtml(doc.document_id)}">Upload</button>`;
    }
  } else {
    if (!unlocked) {
      actions = `<button class="drx-btn drx-btn-sec" disabled>Locked — unlocks at ${escapeHtml(PHASE_LABEL[requiredPhase] || requiredPhase)}</button>`;
    } else if (!doc.storage_path) {
      actions = `<button class="drx-btn drx-btn-sec" disabled>Pending publication</button>`;
    } else {
      actions = `<button class="drx-btn drx-btn-pri" data-action="preview" data-doc="${escapeHtml(doc.document_id)}">Open</button>
        <button class="drx-btn drx-btn-sec" data-action="download" data-doc="${escapeHtml(doc.document_id)}">Download</button>`;
    }
  }

  return `<article class="drx-doc${unlocked ? '' : ' is-locked'}">
      <div class="drx-doc-head"><span class="drx-badge">${escapeHtml(kindLabel)}</span>${blocking}</div>
      <div class="drx-doc-title">${escapeHtml(doc.name)}</div>
      ${code}
      <div class="drx-doc-desc">${escapeHtml(doc.description || '')}</div>
      <div class="drx-doc-meta"><span>${escapeHtml(sizeText)}</span>${version}</div>
      <div class="drx-doc-actions">${actions}</div>
    </article>`;
}

function renderDocumentEstate(docs, ctx) {
  if (!docs.length) {
    return `<div class="drx-empty">No documents have been catalogued for this workspace yet. They will appear here as the engagement progresses.</div>`;
  }
  const grouped = groupByPhase(docs);
  let html = '';
  for (const phase of Object.keys(grouped)) {
    html += `<div class="drx-doc-group" data-dealroom-doc-group data-phase="${escapeHtml(phase)}">
        <div class="drx-doc-group-head"><span class="drx-phase-chip">${escapeHtml(PHASE_LABEL[phase] || phase)}</span></div>
        <div class="drx-doc-grid">${grouped[phase].map((d) => docCardHtml(d, ctx)).join('')}</div>
      </div>`;
  }
  return html;
}

function renderEileenPanel() {
  return `<section class="drx-eileen" id="drx-eileen" aria-label="Eileen intelligence entity" data-dealroom-eileen>
      <div class="drx-eileen-head">
        <h2>Eileen</h2>
        <p class="drx-eileen-sub">Ailane intelligence entity · counterparty mode · commercial terms route via <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      </div>
      <div class="drx-eileen-transcript" id="drx-eileen-transcript" aria-live="polite">
        <div class="drx-eileen-empty">Ask about the estate, the engagement pathway, or the underlying UK employment law.</div>
      </div>
      <div class="drx-eileen-inputrow">
        <textarea id="drx-eileen-input" class="drx-eileen-input" rows="2" placeholder="Ask Eileen about the estate, the engagement pathway, or UK employment law…"></textarea>
        <button id="drx-eileen-send" class="drx-btn drx-btn-pri" type="button">Send</button>
      </div>
    </section>`;
}

function renderWorkspace(app, ctx) {
  const counterparty = ctx.room.counterparty_name || 'Partner';
  const phase = ctx.room.gate_state || 'phase_0';
  app.innerHTML = `
    <div class="drx-shell" data-dealroom-workspace>
      <header class="drx-header">
        <div class="drx-header-brand"><span class="drx-brand-mark">Ai<em>lane</em></span><span class="drx-header-room">${escapeHtml(counterparty)} × AI Lane — Deal Room</span></div>
        <div class="drx-header-right">
          <span class="drx-phase-chip">${escapeHtml(PHASE_LABEL[phase] || phase)}</span>
          <span class="drx-user-email">${escapeHtml(ctx.email || '')}</span>
          <a href="#" class="drx-signout" id="drx-signout">Sign out</a>
        </div>
      </header>
      <main class="drx-main">
        <span id="drx-rail-anchor"></span>
        <section class="drx-hero">
          <div class="drx-eyebrow">Private engagement workspace</div>
          <h1>${escapeHtml(counterparty)} engagement workspace</h1>
          <p class="drx-hero-lede">Read the released engagement documents, track gate status across the pathway, and ask Eileen for grounded answers. Confidential — not for distribution beyond ${escapeHtml(counterparty)} without written consent.</p>
        </section>
        ${renderTileCards()}
        <div class="drx-layout">
          ${renderPhaseRail(ctx.room.gate_state, ctx.isDirector)}
          <div class="drx-content">
            <section class="drx-section" id="drx-documents">
              <div class="drx-section-head"><h2>Documents</h2><p>Released documents and counterparty requirements, grouped by engagement phase.</p></div>
              <div id="drx-doclist">${renderDocumentEstate(ctx.docs, ctx)}</div>
            </section>
            ${renderEileenPanel()}
          </div>
        </div>
      </main>
      <footer class="drx-footer">
        <div><strong>AI Lane Limited</strong> · Company No. 17035654 · ICO Reg. 00013389720</div>
        <div><a href="${LEGAL_URL}">Privacy Notice &amp; Workspace Terms</a> · <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></div>
        <div class="drx-footer-fine"><strong>Ailane&reg;</strong> is a registered trademark of AI Lane Limited. Regulatory intelligence, not legal advice.</div>
      </footer>
    </div>
    <div id="drx-modal-root"></div>`;

  app.querySelector('#drx-signout').addEventListener('click', async (ev) => {
    ev.preventDefault();
    try { await ctx.sb.auth.signOut(); } catch (e) {}
    window.location.replace('/');
  });

  bindDocumentActions(app, ctx);
  bindEileen(app, ctx);
}

// ---------------------------------------------------------------------------
// Document actions (preview / download via signed URL; upload via EF)
// ---------------------------------------------------------------------------
function bindDocumentActions(app, ctx) {
  app.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
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
  const root = app.querySelector('#drx-modal-root');
  root.innerHTML = `<div class="drx-modal-back" id="drx-modal-back"><div class="drx-modal" role="dialog" aria-modal="true">
      <div class="drx-modal-head"><div class="drx-modal-title">Upload — ${escapeHtml(doc.name)}</div><button class="drx-btn drx-btn-ghost" id="drx-modal-close">Close ✕</button></div>
      <div class="drx-modal-body">
        <p class="drx-doc-desc">${escapeHtml(doc.description || '')}</p>
        <input type="file" id="drx-file" class="drx-file" accept=".pdf,.docx,.doc,.txt,application/pdf">
        <div id="drx-upload-status" class="drx-gate-status"></div>
      </div>
      <div class="drx-modal-foot"><button class="drx-btn drx-btn-ghost" id="drx-upload-cancel">Cancel</button><button class="drx-btn drx-btn-pri" id="drx-upload-submit">Upload</button></div>
    </div></div>`;
  const close = () => { root.innerHTML = ''; };
  root.querySelector('#drx-modal-close').addEventListener('click', close);
  root.querySelector('#drx-upload-cancel').addEventListener('click', close);
  root.querySelector('#drx-modal-back').addEventListener('click', (e) => { if (e.target.id === 'drx-modal-back') close(); });
  root.querySelector('#drx-upload-submit').addEventListener('click', () => performUpload(app, ctx, documentId));
}

async function performUpload(app, ctx, documentId) {
  const root = app.querySelector('#drx-modal-root');
  const fileInput = root.querySelector('#drx-file');
  const status = root.querySelector('#drx-upload-status');
  const file = fileInput.files[0];
  if (!file) { status.className = 'drx-gate-status drx-gate-status-error'; status.textContent = 'Select a file first.'; return; }
  if (file.size > 50 * 1024 * 1024) { status.className = 'drx-gate-status drx-gate-status-error'; status.textContent = 'File exceeds 50 MB cap.'; return; }
  status.className = 'drx-gate-status'; status.textContent = 'Uploading…';
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
    status.className = 'drx-gate-status drx-gate-status-success';
    status.textContent = `Upload received. Status: ${payload.status || 'pending review'}.`;
    setTimeout(async () => {
      root.innerHTML = '';
      ctx.uploads = await listLatestUploads(ctx.sb, ctx.room.clid);
      app.querySelector('#drx-doclist').innerHTML = renderDocumentEstate(ctx.docs, ctx);
      bindDocumentActions(app, ctx);
    }, 1100);
  } catch (e) {
    status.className = 'drx-gate-status drx-gate-status-error';
    status.textContent = `Upload failed: ${e.message || 'Unknown error'}`;
  }
}

// ---------------------------------------------------------------------------
// In-room Eileen (eileen-dealroom EF)
// ---------------------------------------------------------------------------
function bindEileen(app, ctx) {
  const input = app.querySelector('#drx-eileen-input');
  const sendBtn = app.querySelector('#drx-eileen-send');
  const transcript = app.querySelector('#drx-eileen-transcript');
  if (!input || !sendBtn || !transcript) return;
  const messages = [];

  function append(role, text, extraClass) {
    const empty = transcript.querySelector('.drx-eileen-empty');
    if (empty) empty.remove();
    const bubble = document.createElement('div');
    bubble.className = 'drx-eileen-bubble drx-eileen-' + role + (extraClass ? ' ' + extraClass : '');
    bubble.textContent = text;
    transcript.appendChild(bubble);
    transcript.scrollTop = transcript.scrollHeight;
    return bubble;
  }

  async function send() {
    const text = (input.value || '').trim();
    if (!text) return;
    sendBtn.disabled = true;
    append('user', text);
    input.value = '';
    messages.push({ role: 'user', content: text });
    const thinking = append('eileen', '…', 'is-thinking');
    try {
      const data = await callDealroomEF('eileen-dealroom', { clid: ctx.room.clid, messages }, ctx.session);
      thinking.remove();
      if (data && data.response) {
        messages.push({ role: 'assistant', content: data.response });
        append('eileen', data.response);
      } else {
        append('eileen', 'Connection issue — please try again, or reach the team at ' + SUPPORT_EMAIL + '.', 'is-error');
      }
      try { if (window.gtag) window.gtag('event', 'eileen_dealroom_message'); } catch (e) {}
    } catch (e) {
      thinking.remove();
      append('eileen', 'Connection issue — please try again, or reach the team at ' + SUPPORT_EMAIL + '.', 'is-error');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); send(); } });
}

// ---------------------------------------------------------------------------
// Boot — the 404-status SPA entry point (DRPS-001 §6.1)
// ---------------------------------------------------------------------------
function ensureApp() {
  let app = document.getElementById('dr-app');
  if (!app) { app = document.createElement('div'); app.id = 'dr-app'; document.body.appendChild(app); }
  return app;
}

async function boot() {
  const app = ensureApp();
  const slug = getCurrentSlug();
  setState('booting', { slug });

  // Scope: only /partners/* boots the workspace; anything else is normal not-found.
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

    const ctx = { sb, session, room, isDirector, contact, email, uploads: {}, docs: [] };

    // Terms gate (Director is an administrator, not a counterparty — bypasses).
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
    app.innerHTML = cardShell(`<h1 class="drx-gate-title">Workspace temporarily unavailable</h1>
      <p class="drx-gate-lede">A platform error occurred. Please refresh; if it persists, contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`);
    setState('error', { slug });
    reveal();
  }
}

async function finishWorkspace(app, ctx) {
  // Load the estate, then render. RLS scopes what each identity may see.
  try { ctx.docs = await listCatalog(ctx.sb, ctx.room.clid); } catch (e) { console.warn('[dealroom] catalog error:', e); ctx.docs = []; }
  ctx.uploads = await listLatestUploads(ctx.sb, ctx.room.clid);
  renderWorkspace(app, ctx);
  setState('ready', { slug: getCurrentSlug(), clid: ctx.room.clid });
  reveal();
  if (window.ailaneConsent && typeof window.ailaneConsent.present === 'function') {
    try { window.ailaneConsent.present(); } catch (e) {}
  }
}

// Auto-boot when the DOM is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Public surface (DRPS-001 §6.2 / V7 §8).
export {
  boot, getCurrentSlug, getCurrentClid, callDealroomEF,
  PHASE_LABEL, PHASE_RANK, isPhaseUnlocked,
  renderTileCards, renderPhaseRail, renderEileenPanel, renderDocumentEstate,
};
export default { boot, getCurrentSlug, getCurrentClid };
