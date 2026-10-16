/* ============================================================================
   Ailane AI governance controls for Eileen surfaces
   AILANE-CC-BRIEF-AUP-COMPLIANCE-WEBSITE-001 §2–§3 · Governed by AILANE-AMD-REG-001

   One source for the Eileen AI identity label, the individual-matter notice,
   the reviewer sign-off, the worker AI-use note and the pseudonymisation line,
   plus the ai_governance_events writes behind them.

   Loaded two ways:
     • <script src="/assets/js/ailane-ai-governance.js"> on the static Eileen
       pages (operational|governance /calendar/ and /parliament-live/);
     • imported for side effects and bundled by esbuild into
       knowledge-library/kl-app.js and workspace/dist/workspace-bundle.js.
       After editing this file, rebuild BOTH bundles
       (knowledge-library/build-engine.sh, workspace/build.sh).

   Every backend field is optional. A missing or malformed field means the
   element that depends on it is not rendered. Logging failures are silent.
   Writes use the raw fetch + Bearer JWT pattern (RULE 2); the RLS policy
   aige_user_attest permits these three event types for the caller's own row.
   ============================================================================ */
(function () {
  if (typeof window === 'undefined' || window.AilaneAIGov) return;

  var EVENTS_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/ai_governance_events';

  var IDENTITY_TEXT = "You are chatting with Eileen, Ailane's AI assistant. Eileen is an AI system, not a person. Eileen provides regulatory intelligence, not legal advice. Please describe staff by role or as 'Employee A' rather than by name.";
  var REVIEW_BUTTON_TEXT = 'I will review this before any decision';
  var REVIEW_CONFIRM_TEXT = "I confirm that before this information is used in any decision about the individual, it will be reviewed by a person with the authority, training or experience to evaluate it and to reach a different view, after considering the individual's response.";
  var REVIEW_DONE_TEXT = 'Review confirmed ✓';
  var WORKER_BUTTON_TEXT = 'Draft a note telling the worker AI was used';
  // Never pre-filled with a name or any other detail from the chat.
  var WORKER_TEMPLATE = 'Dear [Name],\n' +
    'As part of preparing for [the meeting / the process] on [date], we used Ailane, an AI-assisted regulatory intelligence tool, to help us understand the relevant law and procedure. No decision has been made by the tool. Any decision will be made by [role], who will consider your response and any information you provide. If you would like to know more about how your information is used, please contact [contact].\n' +
    '[Organisation]';

  var STYLE_ID = 'ailane-aigov-styles';
  var CSS = [
    '.aigov-identity { font-size: 12px; line-height: 1.5; color: #94A3B8; }',
    '.aigov-pseudo { font-size: 11.5px; line-height: 1.5; color: #94A3B8; font-style: italic; margin: 0 0 6px; }',
    '.aigov-notice { margin-top: 12px; padding: 12px 14px; border: 1px solid rgba(217,119,6,0.45); border-left: 3px solid #D97706; border-radius: 8px; background: rgba(217,119,6,0.06); color: #E2E8F0; font-size: 13px; line-height: 1.6; text-align: left; }',
    '.aigov-notice-text { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }',
    '.aigov-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }',
    '.aigov-btn { font-family: inherit; font-size: 12.5px; font-weight: 600; line-height: 1.3; padding: 7px 12px; border-radius: 6px; border: 1px solid rgba(148,163,184,0.45); background: transparent; color: #E2E8F0; cursor: pointer; text-align: left; }',
    '.aigov-btn:hover { border-color: #E2E8F0; }',
    '.aigov-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
    '.aigov-btn-primary { background: #E2E8F0; border-color: #E2E8F0; color: #0A0E1A; }',
    '.aigov-btn-primary:hover { background: #FFFFFF; }',
    '.aigov-btn:focus-visible, .aigov-dialog:focus-visible, .aigov-template:focus-visible { outline: 2px solid #38BDF8; outline-offset: 2px; }',
    '.aigov-confirmed { font-size: 12.5px; font-weight: 600; color: #10B981; padding: 7px 0; }',
    '.aigov-err { flex-basis: 100%; font-size: 12px; color: #F87171; margin: 0; }',
    '.aigov-err:empty { display: none; }',
    '.aigov-panel { margin-top: 10px; padding: 12px; border: 1px solid rgba(148,163,184,0.3); border-radius: 8px; background: rgba(15,23,42,0.6); }',
    '.aigov-panel-title { font-size: 12.5px; font-weight: 600; color: #F1F5F9; margin: 0 0 8px; }',
    '.aigov-template { display: block; width: 100%; box-sizing: border-box; min-height: 200px; resize: vertical; font-family: inherit; font-size: 13px; line-height: 1.55; color: #E2E8F0; background: #0A0E1A; border: 1px solid rgba(148,163,184,0.3); border-radius: 6px; padding: 10px; margin: 0; }',
    '.aigov-backdrop { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(5,8,15,0.78); }',
    '.aigov-dialog { width: 100%; max-width: 520px; max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box; padding: 22px; border-radius: 12px; border: 1px solid rgba(148,163,184,0.3); background: #0F172A; color: #E2E8F0; box-shadow: 0 20px 50px rgba(0,0,0,0.5); text-align: left; }',
    '.aigov-dialog-title { font-size: 16px; font-weight: 700; color: #F1F5F9; margin: 0 0 10px; line-height: 1.35; }',
    '.aigov-dialog-text { font-size: 14px; line-height: 1.6; margin: 0 0 18px; }',
    '.aigov-dialog-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }'
  ].join('\n');

  function ensureStyles() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function resolveAuth(auth) {
    try { return typeof auth === 'function' ? auth() : auth; } catch (e) { return null; }
  }

  // JWT sub (RULE 2 decode; base64url-tolerant).
  function subOf(token) {
    try {
      var part = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (part.length % 4) part += '=';
      var payload = JSON.parse(atob(part));
      return payload && typeof payload.sub === 'string' ? payload.sub : null;
    } catch (e) { return null; }
  }

  // Insert one ai_governance_events row as the signed-in user. Resolves true on
  // a 2xx, false on anything else (never throws; unauthenticated ⇒ no request).
  function logEvent(auth, surface, eventType, details) {
    var a = resolveAuth(auth);
    var token = a && a.token;
    var anon = a && a.anon;
    var sub = token ? subOf(token) : null;
    if (!sub || !anon || !surface) return Promise.resolve(false);
    var body = { surface: surface, event_type: eventType, user_id: sub };
    if (details) body.details = details;
    try {
      return fetch(EVENTS_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'apikey': anon,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body)
      }).then(function (r) { return !!(r && r.ok); }, function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  // §2.2 — at most one ai_identity_label_shown row per page load, and only once
  // an authenticated user is present (an unauthenticated render does not use it up).
  var identityLogged = false;
  function logIdentityShown(auth, surface) {
    if (identityLogged) return;
    var a = resolveAuth(auth);
    if (!a || !a.token || !subOf(a.token)) return;
    identityLogged = true;
    logEvent(a, surface, 'ai_identity_label_shown');
  }

  // §2.1 — the persistent, non-dismissible identity line.
  function identityLabel(className) {
    ensureStyles();
    var n = el('div', className || 'aigov-identity', IDENTITY_TEXT);
    n.setAttribute('role', 'note');
    return n;
  }

  // Normalise the optional governance fields of an Eileen response into a small
  // per-answer object (stored with the message so re-renders keep its UI state).
  // Returns null when nothing is renderable.
  function readMeta(data, surface) {
    if (!data || typeof data !== 'object') return null;
    var meta = { surface: surface || null, noticeText: null, pseudonymised: 0, answerRef: null, attested: false, workerOpen: false };
    var has = false;
    if (data.individual_matter === true && typeof data.notice_text === 'string' && data.notice_text.trim()) {
      meta.noticeText = data.notice_text;
      has = true;
    }
    if (typeof data.pseudonymised === 'number' && isFinite(data.pseudonymised) && data.pseudonymised > 0) {
      meta.pseudonymised = Math.floor(data.pseudonymised);
      has = meta.pseudonymised > 0 || has;
    }
    var ref = data.response_id || data.conversation_id || data.id || null;
    if (typeof ref === 'string' || typeof ref === 'number') meta.answerRef = String(ref);
    return has ? meta : null;
  }

  function pseudonymisedText(n) {
    return 'For privacy, we replaced ' + n + " name(s) with labels such as 'Employee A' before analysis.";
  }

  // §3.4 — small line shown above the answer.
  function renderPseudonymised(meta) {
    if (!meta || !(meta.pseudonymised > 0)) return null;
    ensureStyles();
    return el('p', 'aigov-pseudo', pseudonymisedText(meta.pseudonymised));
  }

  // ── In-page confirmation modal (no alert/confirm/prompt; focus trapped) ──
  function focusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll('button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])'),
      function (n) { return !n.disabled && n.offsetParent !== null; }
    );
  }

  var dialogSeq = 0;
  function openConfirm(opts) {
    ensureStyles();
    var returnFocus = opts.returnFocus || document.activeElement;
    var id = 'aigov-dialog-' + (++dialogSeq);
    var backdrop = el('div', 'aigov-backdrop');
    var dialog = el('div', 'aigov-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', id + '-t');
    dialog.setAttribute('aria-describedby', id + '-d');
    dialog.tabIndex = -1;
    var title = el('h2', 'aigov-dialog-title', opts.title);
    title.id = id + '-t';
    var text = el('p', 'aigov-dialog-text', opts.text);
    text.id = id + '-d';
    var actions = el('div', 'aigov-dialog-actions');
    var cancel = el('button', 'aigov-btn', 'Cancel');
    cancel.type = 'button';
    var confirm = el('button', 'aigov-btn aigov-btn-primary', 'Confirm');
    confirm.type = 'button';
    actions.appendChild(cancel);
    actions.appendChild(confirm);
    dialog.appendChild(title);
    dialog.appendChild(text);
    dialog.appendChild(actions);
    backdrop.appendChild(dialog);

    var closed = false;
    function close(confirmed) {
      if (closed) return;
      closed = true;
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      try { if (returnFocus && returnFocus.focus && document.body.contains(returnFocus)) returnFocus.focus(); } catch (e) { /* ignore */ }
      if (confirmed && typeof opts.onConfirm === 'function') opts.onConfirm();
    }
    cancel.addEventListener('click', function () { close(false); });
    confirm.addEventListener('click', function () { close(true); });
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(false); });
    // Keys are handled here and not passed on, so host-page shortcuts
    // (Escape closes a panel, Tab cycles panels) do not act behind the modal.
    backdrop.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        close(false);
        return;
      }
      if (e.key === 'Tab') {
        e.stopPropagation();
        var f = focusables(dialog);
        if (!f.length) { e.preventDefault(); dialog.focus(); return; }
        var first = f[0], last = f[f.length - 1];
        var active = document.activeElement;
        if (e.shiftKey && (active === first || active === dialog)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (active === last || active === dialog)) { e.preventDefault(); first.focus(); }
      }
    });
    // Keep focus inside if it escapes (e.g. a click on the page behind).
    backdrop.addEventListener('focusout', function (e) {
      if (!closed && e.relatedTarget && !dialog.contains(e.relatedTarget)) dialog.focus();
    });
    document.body.appendChild(backdrop);
    dialog.focus();
  }

  function copyText(textarea, button) {
    var value = textarea.value;
    var original = 'Copy';
    function done(ok) {
      if (ok) {
        button.textContent = 'Copied ✓';
      } else {
        try { textarea.focus(); textarea.select(); } catch (e) { /* ignore */ }
        button.textContent = 'Text selected — copy it manually';
      }
      setTimeout(function () { button.textContent = original; }, 2500);
    }
    function fallback() {
      var ok = false;
      try { textarea.focus(); textarea.select(); ok = document.execCommand('copy'); } catch (e) { ok = false; }
      done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () { done(true); }, fallback);
    } else {
      fallback();
    }
  }

  // §3.1–§3.3 — notice box under the answer with the reviewer sign-off and the
  // worker AI-use note. opts.auth is { token, anon } or a function returning it.
  function renderIndividualMatter(meta, opts) {
    if (!meta || typeof meta.noticeText !== 'string' || !meta.noticeText.trim()) return null;
    opts = opts || {};
    ensureStyles();
    var surface = meta.surface;
    var box = el('div', 'aigov-notice');
    box.setAttribute('role', 'note');
    box.appendChild(el('p', 'aigov-notice-text', meta.noticeText));

    var actions = el('div', 'aigov-actions');
    box.appendChild(actions);

    // Button A — reviewer sign-off.
    var reviewSlot = el('span');
    actions.appendChild(reviewSlot);
    function showConfirmed() {
      reviewSlot.innerHTML = '';
      reviewSlot.appendChild(el('span', 'aigov-confirmed', REVIEW_DONE_TEXT));
    }
    var reviewErr = el('p', 'aigov-err');
    reviewErr.setAttribute('role', 'alert');
    if (meta.attested) {
      showConfirmed();
    } else {
      var reviewBtn = el('button', 'aigov-btn', REVIEW_BUTTON_TEXT);
      reviewBtn.type = 'button';
      reviewBtn.addEventListener('click', function () {
        reviewErr.textContent = '';
        openConfirm({
          title: 'Confirm review',
          text: REVIEW_CONFIRM_TEXT,
          returnFocus: reviewBtn,
          onConfirm: function () {
            reviewBtn.disabled = true;
            logEvent(opts.auth, surface, 'reviewer_attestation', { answer_ref: meta.answerRef || null })
              .then(function (ok) {
                if (ok) {
                  meta.attested = true;
                  showConfirmed();
                } else {
                  reviewBtn.disabled = false;
                  reviewErr.textContent = 'We could not record your confirmation. Please try again.';
                  try { reviewBtn.focus(); } catch (e) { /* ignore */ }
                }
              });
          }
        });
      });
      reviewSlot.appendChild(reviewBtn);
    }

    // Button B — worker AI-use note (template only; never pre-filled).
    var workerBtn = el('button', 'aigov-btn', WORKER_BUTTON_TEXT);
    workerBtn.type = 'button';
    workerBtn.setAttribute('aria-expanded', 'false');
    actions.appendChild(workerBtn);
    actions.appendChild(reviewErr);

    var panel = null;
    function buildPanel() {
      var p = el('div', 'aigov-panel');
      var pid = 'aigov-worker-' + (++dialogSeq);
      p.id = pid;
      workerBtn.setAttribute('aria-controls', pid);
      var t = el('p', 'aigov-panel-title', 'Draft note for the worker');
      t.id = pid + '-t';
      p.appendChild(t);
      var ta = el('textarea', 'aigov-template');
      ta.readOnly = true;
      ta.rows = 9;
      ta.value = WORKER_TEMPLATE;
      ta.setAttribute('aria-labelledby', pid + '-t');
      p.appendChild(ta);
      var row = el('div', 'aigov-actions');
      var copyBtn = el('button', 'aigov-btn aigov-btn-primary', 'Copy');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () { copyText(ta, copyBtn); });
      var closeBtn = el('button', 'aigov-btn', 'Close');
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', function () { setOpen(false); try { workerBtn.focus(); } catch (e) { /* ignore */ } });
      row.appendChild(copyBtn);
      row.appendChild(closeBtn);
      p.appendChild(row);
      return p;
    }
    function setOpen(open) {
      meta.workerOpen = open;
      workerBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && !panel) { panel = buildPanel(); box.appendChild(panel); }
      if (panel) panel.hidden = !open;
    }
    workerBtn.addEventListener('click', function () {
      var opening = !meta.workerOpen;
      setOpen(opening);
      if (opening) logEvent(opts.auth, surface, 'worker_ai_notice_generated');
    });
    if (meta.workerOpen) setOpen(true);   // re-render: keep it open, do not re-log

    return box;
  }

  ensureStyles();

  window.AilaneAIGov = {
    IDENTITY_TEXT: IDENTITY_TEXT,
    identityLabel: identityLabel,
    logIdentityShown: logIdentityShown,
    logEvent: logEvent,
    readMeta: readMeta,
    pseudonymisedText: pseudonymisedText,
    renderPseudonymised: renderPseudonymised,
    renderIndividualMatter: renderIndividualMatter,
    ensureStyles: ensureStyles
  };
})();
