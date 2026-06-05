/* =============================================================================
 * AILANE Deal-Room — Clickwrap Terms Gate
 * AILANE-AMD-REG-001 / AMD-156 (Deal-Room Data-Protection Layer — frontend)
 * Brief: AILANE-CC-BRIEF-DEALROOM-PRIVACY-001 §2C
 *
 * Standalone, page-pattern-agnostic clickwrap gate. Blocks a deal-room page
 * until the authenticated counterparty accepts the Privacy Notice & Workspace
 * Terms, recording acceptance server-side via the dealroom-accept-terms Edge
 * Function (verify_jwt=true). That EF is the ONLY write path and the sole
 * authority on acceptance state — this module never persists acceptance to
 * browser storage. A module-scoped in-memory flag prevents a duplicate status
 * call within a single page load only; every fresh page load re-queries the EF,
 * so a counterparty who previously accepted an older version is re-prompted
 * automatically (the EF pins current versions server-side).
 *
 * The client sends ONLY { action, clid }. email / ip_address / user_agent /
 * versions / accepted_at are all derived server-side by the EF.
 *
 * Usage (thin per-page glue):
 *   window.dealroomTermsGate.guard({
 *     clid: '<clid>',                 // from the page's existing CLID source
 *     onAccepted: function () { ... } // reveal / render the workspace
 *   });
 *
 * Token/client resolution order (reuses the page's existing session):
 *   1. window.__dealRoomUser.token              (monolith script.js pattern)
 *   2. window.dealroomSupabase.auth.getSession()  (shared-module pattern)
 *   3. window.__dealRoomSb.auth.getSession()      (monolith client fallback)
 * ============================================================================= */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
  var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';
  var EF_URL = SUPABASE_URL + '/functions/v1/dealroom-accept-terms';
  var LEGAL_URL = '/legal/deal-room-privacy/';
  var SUPPORT_EMAIL = 'partnerships@ailane.ai';

  // In-memory only (NOT sessionStorage): prevents a duplicate status call within
  // ONE page load. Resets on every fresh page load, so the EF status call is the
  // authority on each load — per brief §1.2.
  var _guardedThisPage = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function resolveToken() {
    if (window.__dealRoomUser && window.__dealRoomUser.token) return window.__dealRoomUser.token;
    var client = window.dealroomSupabase || window.__dealRoomSb || null;
    if (client && client.auth && client.auth.getSession) {
      try {
        var r = await client.auth.getSession();
        var s = r && r.data ? r.data.session : null;
        if (s && s.access_token) return s.access_token;
      } catch (e) { /* fall through to null */ }
    }
    return null;
  }

  async function callEF(action, clid, token) {
    var res;
    try {
      res = await fetch(EF_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: action, clid: clid })
      });
    } catch (e) {
      return { httpOk: false, status: 0, data: { ok: false, error: 'network' } };
    }
    var data = {};
    try { data = await res.json(); } catch (e) { data = { ok: false, error: 'parse' }; }
    return { httpOk: res.ok, status: res.status, data: data };
  }

  function injectStyles() {
    if (document.getElementById('dr-terms-gate-styles')) return;
    var st = document.createElement('style');
    st.id = 'dr-terms-gate-styles';
    st.textContent =
      '.dr-tg-overlay{position:fixed;inset:0;z-index:2147483600;background:rgba(6,8,15,0.92);' +
      'backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:center;' +
      'justify-content:center;padding:24px;box-sizing:border-box;visibility:visible !important;' +
      'font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#E2E8F0;}' +
      '.dr-tg-card{max-width:540px;width:100%;background:#0d1320;border:1px solid #233047;' +
      'border-radius:14px;padding:34px 32px;box-shadow:0 18px 60px rgba(0,0,0,0.6);box-sizing:border-box;}' +
      '.dr-tg-brand{font-family:"DM Serif Display",Georgia,serif;font-size:26px;color:#F1F5F9;' +
      'letter-spacing:0.02em;margin-bottom:18px;}' +
      '.dr-tg-brand em{font-style:normal;color:#0EA5E9;}' +
      '.dr-tg-brand span{font-size:13px;vertical-align:super;color:#94A3B8;margin-left:1px;}' +
      '.dr-tg-title{font-family:"DM Serif Display",Georgia,serif;font-size:23px;font-weight:400;' +
      'margin:0 0 12px;color:#F1F5F9;line-height:1.3;}' +
      '.dr-tg-lede{font-size:14.5px;line-height:1.6;color:#A8B5C8;margin:0 0 18px;}' +
      '.dr-tg-link-row{margin:0 0 20px;font-size:14px;}' +
      '.dr-tg-link{color:#0EA5E9;text-decoration:none;font-weight:600;}' +
      '.dr-tg-link:hover{text-decoration:underline;}' +
      '.dr-tg-newtab{color:#6B7A91;font-size:12.5px;}' +
      '.dr-tg-check{display:flex;align-items:flex-start;gap:11px;font-size:14px;line-height:1.55;' +
      'color:#CBD5E1;cursor:pointer;background:rgba(255,255,255,0.03);border:1px solid #233047;' +
      'border-radius:10px;padding:14px 16px;margin-bottom:18px;}' +
      '.dr-tg-check input{margin-top:3px;width:17px;height:17px;flex:0 0 auto;accent-color:#0EA5E9;cursor:pointer;}' +
      '.dr-tg-status{font-size:13px;line-height:1.5;min-height:18px;margin-bottom:14px;color:#A8B5C8;}' +
      '.dr-tg-status a{color:#0EA5E9;text-decoration:none;}' +
      '.dr-tg-status-error{color:#F87171;}' +
      '.dr-tg-btn{width:100%;background:#0EA5E9;border:none;border-radius:8px;padding:13px 16px;' +
      'font-family:inherit;font-size:15px;font-weight:600;color:#06080f;cursor:pointer;transition:background 0.15s;}' +
      '.dr-tg-btn:hover:not(:disabled){background:#38BDF8;}' +
      '.dr-tg-btn:disabled{background:#1F3454;color:#6B7A91;cursor:not-allowed;}' +
      '.dr-tg-btn:focus-visible{outline:2px solid #38BDF8;outline-offset:2px;}';
    document.head.appendChild(st);
  }

  // Make every direct child of <body> (except our overlay) inert + aria-hidden so
  // the workspace cannot be used or focused behind the gate, and lock scroll.
  function setWorkspaceInert(on) {
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.id === 'dr-terms-gate-overlay') continue;
      if (on) {
        el.setAttribute('data-dr-gate-inert', '1');
        el.setAttribute('aria-hidden', 'true');
        try { el.inert = true; } catch (e) { /* older browsers — aria-hidden + overlay still block */ }
      } else if (el.getAttribute('data-dr-gate-inert') === '1') {
        el.removeAttribute('data-dr-gate-inert');
        el.removeAttribute('aria-hidden');
        try { el.inert = false; } catch (e) {}
      }
    }
    document.documentElement.style.overflow = on ? 'hidden' : '';
    document.body.style.overflow = on ? 'hidden' : '';
  }

  function dismiss(onAccepted) {
    var overlay = document.getElementById('dr-terms-gate-overlay');
    if (overlay) overlay.remove();
    setWorkspaceInert(false);
    if (typeof onAccepted === 'function') {
      try { onAccepted(); } catch (e) { console.error('[dealroom-terms-gate] onAccepted error:', e); }
    }
    // Gate cleared — now surface the cookie-consent strip (deferred per §2D so the
    // counterparty never faces two overlays simultaneously).
    if (window.ailaneConsent && typeof window.ailaneConsent.present === 'function') {
      try { window.ailaneConsent.present(); } catch (e) { /* swallow */ }
    }
  }

  function showModal(opts) {
    injectStyles();
    var clid = opts.clid;
    var token = opts.token;
    var onAccepted = opts.onAccepted;
    var initialError = !!opts.errored;

    var prev = document.getElementById('dr-terms-gate-overlay');
    if (prev) prev.remove();

    var overlay = document.createElement('div');
    overlay.id = 'dr-terms-gate-overlay';
    overlay.className = 'dr-tg-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'dr-tg-title');
    overlay.innerHTML =
      '<div class="dr-tg-card" role="document">' +
        '<div class="dr-tg-brand">Ai<em>lane</em><span>&reg;</span></div>' +
        '<h1 id="dr-tg-title" class="dr-tg-title">Before you enter this workspace</h1>' +
        '<p class="dr-tg-lede">Before you enter this workspace, please review and accept the Privacy Notice &amp; Workspace Terms.</p>' +
        '<p class="dr-tg-link-row">' +
          '<a class="dr-tg-link" href="' + LEGAL_URL + '" target="_blank" rel="noopener">Read the Privacy Notice &amp; Workspace Terms</a> ' +
          '<span class="dr-tg-newtab">(opens in a new tab)</span>' +
        '</p>' +
        '<label class="dr-tg-check">' +
          '<input type="checkbox" id="dr-tg-checkbox">' +
          '<span>I confirm I have read and accept the Privacy Notice &amp; Workspace Terms on behalf of my organisation.</span>' +
        '</label>' +
        '<div id="dr-tg-status" class="dr-tg-status" aria-live="polite">' +
          (initialError ? 'We couldn&rsquo;t confirm your acceptance status &mdash; please review and accept to continue.' : '') +
        '</div>' +
        '<button id="dr-tg-accept" class="dr-tg-btn" type="button" disabled>Accept &amp; enter</button>' +
      '</div>';

    document.body.appendChild(overlay);
    setWorkspaceInert(true);
    // Monolith pages keep <body> hidden until reveal — the gate must show itself.
    document.body.style.visibility = 'visible';

    var checkbox = overlay.querySelector('#dr-tg-checkbox');
    var acceptBtn = overlay.querySelector('#dr-tg-accept');
    var statusEl = overlay.querySelector('#dr-tg-status');

    checkbox.addEventListener('change', function () {
      acceptBtn.disabled = !checkbox.checked;
    });

    // Focus trap — the gate is blocking; Tab cycles within the card, Escape does
    // not dismiss it.
    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusables = overlay.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled)');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    setTimeout(function () { try { checkbox.focus(); } catch (e) {} }, 30);

    acceptBtn.addEventListener('click', async function () {
      if (!checkbox.checked) return;
      acceptBtn.disabled = true;
      checkbox.disabled = true;
      statusEl.className = 'dr-tg-status';
      statusEl.textContent = 'Recording your acceptance…';

      var r = await callEF('accept', clid, token);
      // Treat both recorded:true and already:true as success (§3).
      var success = r.httpOk && r.data && r.data.ok !== false &&
        (r.data.recorded === true || r.data.already === true || r.data.ok === true);

      if (success) {
        try { if (window.gtag) window.gtag('event', 'dealroom_terms_accepted', { clid: clid }); } catch (e) {}
        dismiss(onAccepted);
      } else {
        statusEl.className = 'dr-tg-status dr-tg-status-error';
        statusEl.innerHTML = 'We couldn&rsquo;t record your acceptance &mdash; please refresh and try again, or contact ' +
          '<a href="mailto:' + SUPPORT_EMAIL + '">' + SUPPORT_EMAIL + '</a>.';
        checkbox.disabled = false;
        acceptBtn.disabled = !checkbox.checked;
      }
    });
  }

  async function guard(opts) {
    opts = opts || {};
    var clid = opts.clid;
    var onAccepted = typeof opts.onAccepted === 'function' ? opts.onAccepted : function () {};

    if (_guardedThisPage) return;
    _guardedThisPage = true;

    var token = await resolveToken();
    if (!token) {
      // No session token yet — the page's own auth layer governs sign-in; do not
      // reveal here. Allow a later retry once auth resolves.
      console.warn('[dealroom-terms-gate] no session token available; deferring to page auth.');
      _guardedThisPage = false;
      return;
    }

    if (!clid) {
      // Cannot resolve acceptance without a clid — fail safe (block, show error),
      // never silently reveal.
      console.error('[dealroom-terms-gate] no clid supplied; blocking with error state.');
      showModal({ clid: clid, token: token, onAccepted: onAccepted, errored: true });
      return;
    }

    var statusRes = await callEF('status', clid, token);
    if (statusRes.httpOk && statusRes.data && statusRes.data.ok !== false && statusRes.data.accepted === true) {
      // Current versions already accepted — reveal, then surface consent strip.
      try { onAccepted(); } catch (e) { console.error('[dealroom-terms-gate] onAccepted error:', e); }
      if (window.ailaneConsent && typeof window.ailaneConsent.present === 'function') {
        try { window.ailaneConsent.present(); } catch (e) {}
      }
      return;
    }

    // accepted:false OR any unexpected/non-OK shape → show the blocking gate.
    var errored = !(statusRes.httpOk && statusRes.data && statusRes.data.ok !== false && statusRes.data.accepted === false);
    showModal({ clid: clid, token: token, onAccepted: onAccepted, errored: errored });
  }

  window.dealroomTermsGate = { guard: guard };
})();
