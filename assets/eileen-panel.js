/* =============================================================================
 * AILANE — Eileen Cross-Platform Panel
 * AILANE-CC-BRIEF-EILEEN-XPLATFORM-001  ·  Director/CEO area only
 *
 * A single, self-contained, vanilla-JS module that mounts a fixed Nexus
 * launcher + slide-over chat on every CEO page, wired to the existing
 * `ceo-assistant` Edge Function. Conversation continuity is carried across
 * page navigations via sessionStorage and the full transcript is sent on
 * every call (Eileen is stateless between requests; the transcript is how a
 * pending confirmation survives a navigation).
 *
 * No framework, no build step, no Babel-in-browser. Drop-in via:
 *   <link rel="stylesheet" href="/assets/eileen-panel.css">
 *   <script defer src="/assets/eileen-panel.js"></script>
 *
 * Each page declares its location for context-awareness:
 *   window.EILEEN_CONTEXT = { page: "deal_rooms", label: "Data Deal Rooms" };
 *
 * Identity: she is "Eileen" (she/her), visual identity The Nexus. Gold
 * (#F59E0B) is Eileen's identity core only — never a tier or alert signal.
 * ============================================================================= */

(function () {
  'use strict';

  /* Guard against accidental double-load (e.g. include left on two paths). */
  if (window.__eileenPanelBooted) return;
  window.__eileenPanelBooted = true;

  /* ---------------------------------------------------------------------------
   * Config — the EXISTING public values, reused. Not new credentials.
   * The anon key below is the same public (role: anon) key already present in
   * plaintext on every CEO page; the panel reuses the page's live Supabase
   * client when one is exposed and only falls back to these constants when a
   * page ships no client of its own.
   * ------------------------------------------------------------------------- */
  var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';
  var ENDPOINT = SUPABASE_URL + '/functions/v1/ceo-assistant';
  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  var NEXUS_SRC = '/assets/js/nexus.js';
  var SIGNIN_URL = '/account/';
  var STORAGE_KEY = 'ailane_eileen_convo';
  var REQUEST_TIMEOUT_MS = 90000; /* ≥60s; Eileen can run ~45s when consulting tools */
  var GREETING = 'Good day, Director. I have the full intelligence estate to hand — tribunal decisions, employer profiles, legislation, the deal estate and live pipelines, and your financial and operational position. What would you like to know?';

  /* ---------------------------------------------------------------------------
   * State
   * ------------------------------------------------------------------------- */
  var state = {
    open: false,
    sending: false,
    messages: [],          /* [{ role:'user'|'assistant', content:string, ts:number, tools?:[] }] */
    lastContextKey: null,  /* signature of the last context line we injected */
    notice: null,          /* transient {text, signin?, retry?} — never persisted/sent */
    client: null,          /* resolved supabase client */
    clientTried: false,
    lastFocus: null,       /* element to restore focus to on close */
  };

  var DOM = {};            /* populated by build() */

  /* ===========================================================================
   * Safe markdown rendering (§9)
   * Escape-first, then a minimal block/inline transform. Because the entire
   * string is HTML-escaped before any transform runs, no path can inject raw
   * markup; the only HTML emitted is tags we generate and http(s) link hrefs.
   * ========================================================================= */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inline(s) {
    /* Protect inline code spans first. */
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function (_m, c) {
      codes.push(c);
      return '\uE000IC' + (codes.length - 1) + '\uE000';
    });
    /* Links — label is already escaped; only http/https hrefs are accepted. */
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_m, label, url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="eilx-a">' + label + '</a>';
    });
    /* Bold then italic. */
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    s = s.replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?])/g, '$1<em>$2</em>');
    /* Restore code spans. */
    s = s.replace(/\uE000IC(\d+)\uE000/g, function (_m, i) {
      return '<code class="eilx-code">' + codes[+i] + '</code>';
    });
    return s;
  }

  function renderMarkdown(raw) {
    var text = escapeHtml(raw).replace(/\r\n?/g, '\n');

    /* Fenced code blocks → placeholders (content already escaped). */
    var fences = [];
    text = text.replace(/```([\s\S]*?)```/g, function (_m, code) {
      fences.push(code.replace(/^\n/, '').replace(/\n+$/, ''));
      return '\uE000CB' + (fences.length - 1) + '\uE000';
    });

    var blocks = text.split(/\n{2,}/);
    var out = [];

    for (var b = 0; b < blocks.length; b++) {
      var block = blocks[b].replace(/\s+$/, '');
      if (!block.trim()) continue;

      var cb = block.match(/^\uE000CB(\d+)\uE000$/);
      if (cb) { out.push('<pre class="eilx-pre"><code>' + fences[+cb[1]] + '</code></pre>'); continue; }

      var lines = block.split('\n');

      var h = (lines.length === 1) && block.match(/^(#{1,6})\s+(.+)$/);
      if (h) { var lv = h[1].length; out.push('<h' + lv + ' class="eilx-h eilx-h' + lv + '">' + inline(h[2]) + '</h' + lv + '>'); continue; }

      if (lines.length === 1 && /^(-{3,}|\*{3,}|_{3,})$/.test(block)) { out.push('<hr class="eilx-hr">'); continue; }

      if (lines.every(function (l) { return /^&gt;\s?/.test(l); })) {
        var bq = lines.map(function (l) { return inline(l.replace(/^&gt;\s?/, '')); }).join('<br>');
        out.push('<blockquote class="eilx-bq">' + bq + '</blockquote>'); continue;
      }

      if (lines.every(function (l) { return /^\s*[-*+]\s+/.test(l); })) {
        var ul = lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*[-*+]\s+/, '')) + '</li>'; }).join('');
        out.push('<ul class="eilx-ul">' + ul + '</ul>'); continue;
      }

      if (lines.every(function (l) { return /^\s*\d+\.\s+/.test(l); })) {
        var ol = lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*\d+\.\s+/, '')) + '</li>'; }).join('');
        out.push('<ol class="eilx-ol">' + ol + '</ol>'); continue;
      }

      out.push('<p>' + lines.map(inline).join('<br>') + '</p>');
    }
    return out.join('');
  }

  /* ===========================================================================
   * Supabase client + session (§6)
   * Prefer the page's live client; otherwise self-create from the existing
   * public config (sessions persist under the shared project-ref storage key,
   * so a self-created client reads the same session). Never a new anon key.
   * ========================================================================= */
  function findExistingClient() {
    var cands = [window.eileenSupabase, window.supabaseClient, window.AILANE_SB, window.sb];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (c && c.auth && typeof c.auth.getSession === 'function') return c;
    }
    return null;
  }

  function loadScript(src, marker) {
    return new Promise(function (resolve, reject) {
      if (marker && document.querySelector('script[data-eileen="' + marker + '"]')) {
        return resolve();
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      if (marker) s.setAttribute('data-eileen', marker);
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('load:' + src)); };
      document.head.appendChild(s);
    });
  }

  function getClient() {
    if (state.client) return Promise.resolve(state.client);
    var existing = findExistingClient();
    if (existing) { state.client = existing; subscribeSignOut(existing); return Promise.resolve(existing); }

    var ready = (window.supabase && window.supabase.createClient)
      ? Promise.resolve()
      : loadScript(SUPABASE_CDN, 'supabase').catch(function () {});

    return ready.then(function () {
      if (window.supabase && window.supabase.createClient) {
        state.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        subscribeSignOut(state.client);
      }
      return state.client;
    });
  }

  function getToken() {
    return getClient().then(function (client) {
      if (!client) return null;
      return client.auth.getSession().then(function (res) {
        var session = res && res.data && res.data.session;
        return session ? session.access_token : null;
      }).catch(function () { return null; });
    });
  }

  var signOutBound = false;
  function subscribeSignOut(client) {
    if (signOutBound || !client || !client.auth || !client.auth.onAuthStateChange) return;
    signOutBound = true;
    try {
      client.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT') {
          clearConvo();
          if (state.open) renderMessages();
        }
      });
    } catch (e) { /* non-fatal */ }
  }

  /* ===========================================================================
   * Conversation persistence (§8)
   * ========================================================================= */
  function loadConvo() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o && Array.isArray(o.messages)) {
        state.messages = o.messages;
        state.lastContextKey = o.lastContextKey || null;
      }
    } catch (e) { /* ignore corrupt storage */ }
  }

  function saveConvo() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: state.messages,
        lastContextKey: state.lastContextKey
      }));
    } catch (e) { /* quota / disabled storage — degrade to in-memory only */ }
  }

  function clearConvo() {
    state.messages = [];
    state.lastContextKey = null;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  /* ===========================================================================
   * Page context (§7)
   * ========================================================================= */
  function getContext() {
    var c = window.EILEEN_CONTEXT;
    if (c && typeof c === 'object' && c.label) return c;
    return { page: 'ceo', label: 'CEO Command Centre' };
  }

  function contextKey(c) { return [c.page || '', c.label || '', c.clid || ''].join('|'); }

  function contextLine(c) {
    var trail = ['CEO Command Centre'];
    if (c.label && c.label !== 'CEO Command Centre') trail.push(c.label);
    var line = '(Context — I\'m currently viewing: ' + trail.join(' › ');
    if (c.clid) line += ', clid=' + c.clid;
    return line + '.)';
  }

  /* ===========================================================================
   * DOM construction
   * ========================================================================= */
  function build() {
    /* Launcher — fixed Nexus mark, bottom-right. */
    var launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'eilx-launcher';
    launcher.setAttribute('aria-label', 'Open Eileen');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML =
      '<canvas class="eilx-launcher-mark" width="56" height="56" aria-hidden="true"></canvas>' +
      '<span class="eilx-launcher-fallback" aria-hidden="true"></span>';
    launcher.addEventListener('click', toggle);

    /* Panel portal. */
    var portal = document.createElement('div');
    portal.className = 'eilx-portal';
    portal.innerHTML =
      '<div class="eilx-backdrop" data-eilx-close="1"></div>' +
      '<aside class="eilx-panel" role="dialog" aria-modal="true" aria-label="Eileen" aria-hidden="true">' +
        '<header class="eilx-header">' +
          '<canvas class="eilx-header-mark" width="40" height="40" aria-hidden="true"></canvas>' +
          '<div class="eilx-header-text">' +
            '<div class="eilx-name">Eileen</div>' +
            '<div class="eilx-status" data-status aria-live="polite">CEO Command · Gold Clearance</div>' +
          '</div>' +
          '<button type="button" class="eilx-close" data-eilx-close="1" aria-label="Close Eileen">×</button>' +
        '</header>' +
        '<div class="eilx-messages" data-messages tabindex="0"></div>' +
        '<div class="eilx-working" data-working hidden aria-live="polite">' +
          '<span class="eilx-dot"></span><span class="eilx-dot"></span><span class="eilx-dot"></span>' +
          '<span class="eilx-working-label">Eileen is working…</span>' +
        '</div>' +
        '<form class="eilx-inputbar" data-form>' +
          '<textarea class="eilx-input" data-input rows="1" maxlength="6000" ' +
            'placeholder="Ask Eileen…" aria-label="Message to Eileen"></textarea>' +
          '<button type="submit" class="eilx-send" data-send aria-label="Send message">Send</button>' +
        '</form>' +
      '</aside>';

    document.body.appendChild(launcher);
    document.body.appendChild(portal);

    DOM.launcher = launcher;
    DOM.launcherMark = launcher.querySelector('.eilx-launcher-mark');
    DOM.portal = portal;
    DOM.panel = portal.querySelector('.eilx-panel');
    DOM.headerMark = portal.querySelector('.eilx-header-mark');
    DOM.status = portal.querySelector('[data-status]');
    DOM.messages = portal.querySelector('[data-messages]');
    DOM.working = portal.querySelector('[data-working]');
    DOM.form = portal.querySelector('[data-form]');
    DOM.input = portal.querySelector('[data-input]');
    DOM.send = portal.querySelector('[data-send]');

    /* Close affordances. */
    portal.querySelectorAll('[data-eilx-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });

    /* Submit (button + Enter; Shift+Enter = newline). */
    DOM.form.addEventListener('submit', function (e) { e.preventDefault(); onSubmit(); });
    DOM.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); }
    });
    DOM.input.addEventListener('input', autoGrow);

    /* Keyboard: Esc closes, Tab is trapped while open. */
    document.addEventListener('keydown', onGlobalKeydown);

    paintNexusMarks();
  }

  function autoGrow() {
    var el = DOM.input;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  /* Reuse the existing Nexus visual (§0.3 / §10). Loads nexus.js if absent;
     falls back to the CSS gold mark if the module is unavailable. */
  function paintNexusMarks() {
    function paint() {
      if (!(window.AilaneNexus && window.AilaneNexus.createNexus)) {
        DOM.launcher.classList.add('eilx-nofx');
        return;
      }
      try {
        window.AilaneNexus.createNexus(DOM.launcherMark, { size: 56, pageTier: 'ceo_command', showRelationships: true });
        window.AilaneNexus.createNexus(DOM.headerMark, { size: 40, pageTier: 'ceo_command', showRelationships: false });
      } catch (e) {
        DOM.launcher.classList.add('eilx-nofx');
      }
    }
    if (window.AilaneNexus && window.AilaneNexus.createNexus) { paint(); return; }
    loadScript(NEXUS_SRC, 'nexus').then(paint).catch(function () {
      DOM.launcher.classList.add('eilx-nofx');
    });
  }

  /* ===========================================================================
   * Rendering
   * ========================================================================= */
  function messageHtml(m) {
    var who = m.role === 'assistant' ? 'eileen' : 'user';
    var label = m.role === 'assistant' ? 'Eileen' : 'You';
    var body;
    var ctxHtml = '';

    if (m.role === 'user') {
      /* Surface any leading context line as a subtle prefix; keep transcript intact. */
      var cm = m.content.match(/^(\(Context — [^\n]*\))\n\n([\s\S]*)$/);
      if (cm) {
        ctxHtml = '<div class="eilx-ctx">' + escapeHtml(cm[1]) + '</div>';
        body = '<p>' + escapeHtml(cm[2]).replace(/\n/g, '<br>') + '</p>';
      } else {
        body = '<p>' + escapeHtml(m.content).replace(/\n/g, '<br>') + '</p>';
      }
    } else {
      body = renderMarkdown(m.content);
    }

    var tools = '';
    if (m.role === 'assistant' && Array.isArray(m.tools) && m.tools.length) {
      tools = '<div class="eilx-tools">Eileen consulted: ' + escapeHtml(m.tools.join(', ')) + '</div>';
    }

    return '<div class="eilx-msg eilx-msg-' + who + '">' +
      ctxHtml +
      '<div class="eilx-msg-label">' + label + '</div>' +
      '<div class="eilx-msg-body">' + body + '</div>' +
      tools +
      '</div>';
  }

  function renderMessages() {
    if (!state.messages.length) {
      DOM.messages.innerHTML =
        '<div class="eilx-msg eilx-msg-eileen">' +
          '<div class="eilx-msg-label">Eileen</div>' +
          '<div class="eilx-msg-body"><p>' + escapeHtml(GREETING) + '</p></div>' +
        '</div>';
    } else {
      DOM.messages.innerHTML = state.messages.map(messageHtml).join('');
    }
    renderNotice();
    requestAnimationFrame(function () { DOM.messages.scrollTop = DOM.messages.scrollHeight; });
  }

  /* Transient error/notice row — lives outside the transcript so it is never
     persisted to sessionStorage nor re-sent to Eileen. The user's typed turn
     stays in the transcript, so nothing is lost on failure. */
  function renderNotice() {
    if (!state.notice) return;
    var box = document.createElement('div');
    box.className = 'eilx-notice';
    box.setAttribute('role', 'alert');

    var span = document.createElement('span');
    span.textContent = state.notice.text + ' ';
    box.appendChild(span);

    if (state.notice.signin) {
      var a = document.createElement('a');
      a.href = SIGNIN_URL;
      a.className = 'eilx-a';
      a.textContent = 'Sign in again';
      box.appendChild(a);
    }
    if (state.notice.retry) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'eilx-retry';
      btn.textContent = 'Retry';
      btn.addEventListener('click', function () { state.notice = null; dispatch(); });
      box.appendChild(btn);
    }
    DOM.messages.appendChild(box);
  }

  function setSending(on) {
    state.sending = on;
    DOM.working.hidden = !on;
    DOM.send.disabled = on;
    DOM.input.disabled = on;
    DOM.status.textContent = on ? 'Working…' : 'CEO Command · Gold Clearance';
  }

  /* ===========================================================================
   * Send flow (§3, §7, §8, §12)
   * ========================================================================= */
  function onSubmit() {
    var text = (DOM.input.value || '').trim();
    if (!text || state.sending) return;

    /* Inject the page-context line only on first turn or when it changed. */
    var ctx = getContext();
    var key = contextKey(ctx);
    var content = text;
    if (key !== state.lastContextKey) {
      content = contextLine(ctx) + '\n\n' + text;
      state.lastContextKey = key;
    }

    state.messages.push({ role: 'user', content: content, ts: Date.now() });
    DOM.input.value = '';
    autoGrow();
    saveConvo();
    dispatch();
  }

  function dispatch() {
    state.notice = null;
    setSending(true);
    renderMessages();

    getToken().then(function (token) {
      if (!token) { return finishWithError('session'); }
      var payload = { messages: state.messages.map(function (m) { return { role: m.role, content: m.content }; }) };
      return postAssistant(token, payload).then(function (result) {
        if (result.ok) {
          state.messages.push({
            role: 'assistant',
            content: result.data.response || 'I processed that but received an unexpected response.',
            ts: Date.now(),
            tools: Array.isArray(result.data.tools_used) ? result.data.tools_used : null
          });
          state.notice = null;
          saveConvo();
          setSending(false);
          renderMessages();
        } else {
          finishWithError(result.error);
        }
      });
    }).catch(function () { finishWithError('network'); });
  }

  function finishWithError(kind) {
    setSending(false);
    if (kind === '401' || kind === 'session') {
      state.notice = { text: 'Your session has expired — please', signin: true };
    } else if (kind === '403') {
      state.notice = { text: 'Eileen is available to the Director only.' };
    } else if (kind === '400') {
      state.notice = { text: 'That request couldn’t be processed — try rephrasing.' };
    } else {
      /* network / timeout / 5xx / parse — non-destructive, offer retry. */
      state.notice = { text: 'Eileen couldn’t complete that.', retry: true };
    }
    renderMessages();
  }

  function postAssistant(token, payload) {
    return postOnce(token, payload).then(function (res) {
      if (res && res.status === 401) {
        /* Token may have refreshed — retry getSession() once. */
        return getToken().then(function (t2) {
          if (!t2) return { error: '401' };
          return postOnce(t2, payload).then(interpret);
        });
      }
      return interpret(res);
    }, function () { return { error: 'network' }; });
  }

  function postOnce(token, payload) {
    var controller = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, REQUEST_TIMEOUT_MS);
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    }).then(function (res) { clearTimeout(timer); return res; },
      function (err) { clearTimeout(timer); throw err; });
  }

  function interpret(res) {
    if (!res) return { error: 'network' };
    if (res.status === 401) return { error: '401' };
    if (res.status === 403) return { error: '403' };
    if (res.status === 400) return { error: '400' };
    if (!res.ok) return { error: '5xx' };
    return res.json().then(function (data) { return { ok: true, data: data }; },
      function () { return { error: 'parse' }; });
  }

  /* ===========================================================================
   * Open / close / focus management (§4, §11)
   * ========================================================================= */
  function toggle() { state.open ? close() : open(); }

  function open() {
    if (state.open) return;
    state.open = true;
    state.lastFocus = document.activeElement;
    DOM.portal.classList.add('eilx-portal-open');
    DOM.panel.setAttribute('aria-hidden', 'false');
    DOM.launcher.setAttribute('aria-expanded', 'true');
    renderMessages();
    requestAnimationFrame(function () { try { DOM.input.focus(); } catch (e) {} });

    /* Surface a sign-in prompt if there is no session yet (§6). Non-blocking. */
    if (!state.sending) {
      getToken().then(function (t) {
        if (!t && state.open && !state.notice) {
          state.notice = { text: 'Please sign in to talk to Eileen —', signin: true };
          renderMessages();
        }
      });
    }

    /* GA4 usage telemetry (§11). */
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'eileen_panel_open', { page: getContext().page || 'ceo' });
      }
    } catch (e) {}
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    DOM.portal.classList.remove('eilx-portal-open');
    DOM.panel.setAttribute('aria-hidden', 'true');
    DOM.launcher.setAttribute('aria-expanded', 'false');
    if (state.lastFocus && state.lastFocus.focus) {
      try { state.lastFocus.focus(); } catch (e) {}
    } else {
      try { DOM.launcher.focus(); } catch (e) {}
    }
  }

  function onGlobalKeydown(e) {
    if (!state.open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') { trapTab(e); }
  }

  function trapTab(e) {
    var focusables = DOM.panel.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    var list = Array.prototype.filter.call(focusables, function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ===========================================================================
   * Boot
   * ========================================================================= */
  function boot() {
    loadConvo();
    build();
    /* Warm the client so the first send is fast and sign-out wiring is live. */
    getClient();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
