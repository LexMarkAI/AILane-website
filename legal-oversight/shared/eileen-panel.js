/* =============================================================================
 * AILANE Deal-Room — Eileen Panel
 * AILANE-AMD-REG-001 / AMD-145 §3.6 + AMD-146 (Stage 6 — Eileen counterparty UI)
 *
 * Self-contained drawer + floating trigger for counterparty conversations with
 * Eileen on the deal-room documents page. Calls eileen-dealroom Edge Function v9
 * via window.dealroomApi.askEileen.
 *
 * Public surface:
 *   window.dealroomEileen = {
 *     init({ clid, counterparty_name })         // call once after auth.guard succeeds
 *     open({ document_context, restore })       // open drawer, optionally with seed or saved convo
 *     close()                                   // close drawer
 *     getCurrentMessages()                      // returns the in-memory message log
 *     getCurrentSessionId()                     // last EF-returned session_id (24h rolling)
 *   };
 *
 * Drop into: /legal-oversight/shared/eileen-panel.js
 * Loads AFTER api.js, auth.js. Depends on window.dealroomApi + window.dealroomAuth.
 *
 * The drawer renders into a portal element appended to <body>. CSS lives in
 * shared/dealroom.css under .dr-eileen-* selectors.
 * ============================================================================= */

(function () {
  'use strict';

  if (!window.dealroomApi) {
    console.error('[eileen-panel] window.dealroomApi missing. Load api.js before eileen-panel.js.');
    return;
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const STATE = {
    initialised: false,
    clid: null,
    counterparty_name: '',
    open: false,
    messages: [],                  // [{role: 'user'|'assistant', content: string, ts?: string}]
    currentSessionId: null,        // from EF response (dealroom_eileen_sessions)
    currentConversationId: null,   // if drawer hydrated from a saved conversation
    documentContext: null,         // {doc_code, name} pre-seeded from a card click
    sending: false,                // request in flight
    latencyTimer: null,            // timer handle for latency-line ticker
    latencyStartedAt: null,        // monotonic timestamp of current send
    sessionSeenLatency: new Set(), // dedupe across the session
  };

  // ---------------------------------------------------------------------------
  // Bound DOM references (populated by mount())
  // ---------------------------------------------------------------------------
  const DOM = {
    portal: null,
    backdrop: null,
    drawer: null,
    title: null,
    contextChip: null,
    messageList: null,
    input: null,
    sendBtn: null,
    saveBtn: null,
    closeBtn: null,
    latencyLine: null,
    floatingTrigger: null,
  };

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  function init({ clid, counterparty_name }) {
    if (STATE.initialised) {
      // re-init with updated CLID (e.g., Director switching context) — refresh and keep DOM.
      STATE.clid = clid;
      STATE.counterparty_name = counterparty_name || '';
      return;
    }
    if (!clid) {
      console.error('[eileen-panel] init() requires clid');
      return;
    }
    STATE.clid = clid;
    STATE.counterparty_name = counterparty_name || '';
    mount();
    mountFloatingTrigger();
    STATE.initialised = true;
  }

  function open({ document_context, restore } = {}) {
    if (!STATE.initialised) {
      console.warn('[eileen-panel] open() called before init()');
      return;
    }

    if (restore && restore.messages) {
      STATE.messages = Array.isArray(restore.messages) ? restore.messages.slice() : [];
      STATE.currentConversationId = restore.conversation_id || null;
      STATE.currentSessionId = restore.eileen_session_id || null;
      STATE.documentContext = null;
    } else if (document_context) {
      // New card-initiated conversation: seed first user message
      const seed = composeSeedFromContext(document_context);
      STATE.messages = [{ role: 'user', content: seed, ts: new Date().toISOString() }];
      STATE.currentConversationId = null;
      STATE.currentSessionId = null;
      STATE.documentContext = document_context;
    } else if (!STATE.messages.length) {
      // Fresh conversation, no seed
      STATE.messages = [];
      STATE.currentConversationId = null;
      STATE.currentSessionId = null;
      STATE.documentContext = null;
    }

    renderMessages();
    renderHeader();
    STATE.open = true;
    DOM.portal.classList.add('dr-eileen-open');

    // If a seed message was just placed, dispatch it immediately
    if (document_context && STATE.messages.length === 1 && STATE.messages[0].role === 'user') {
      dispatchSend({ fromSeed: true });
    } else {
      focusInput();
    }
  }

  function close() {
    STATE.open = false;
    DOM.portal.classList.remove('dr-eileen-open');
    clearLatencyTicker();
  }

  function getCurrentMessages() {
    return STATE.messages.slice();
  }

  function getCurrentSessionId() {
    return STATE.currentSessionId;
  }

  // ---------------------------------------------------------------------------
  // DOM construction
  // ---------------------------------------------------------------------------
  function mount() {
    const portal = document.createElement('div');
    portal.className = 'dr-eileen-portal';
    portal.innerHTML = `
      <div class="dr-eileen-backdrop" data-eileen-close="1"></div>
      <aside class="dr-eileen-drawer" role="dialog" aria-modal="true" aria-label="Ask Eileen">
        <header class="dr-eileen-header">
          <div class="dr-eileen-header-text">
            <div class="dr-eileen-title">Ask Eileen</div>
            <div class="dr-eileen-subtitle" data-context-chip></div>
          </div>
          <button class="dr-btn dr-btn-ghost dr-btn-sm" data-eileen-close="1" aria-label="Close">Close ✕</button>
        </header>
        <div class="dr-eileen-messages" data-messages>
          <div class="dr-eileen-empty">
            Start a conversation. Ask Eileen about any document on this page, or about the engagement, the legal framework, or the regulatory landscape. She references Ailane's intelligence estate to give grounded answers.
          </div>
        </div>
        <div class="dr-eileen-latency" data-latency aria-live="polite"></div>
        <footer class="dr-eileen-footer">
          <textarea
            class="dr-eileen-input"
            data-input
            placeholder="Type your question…"
            rows="2"
            maxlength="4000"></textarea>
          <div class="dr-eileen-actions">
            <button class="dr-btn dr-btn-ghost dr-btn-sm" data-save disabled>Save conversation</button>
            <button class="dr-btn dr-btn-primary dr-btn-sm" data-send>Send</button>
          </div>
        </footer>
      </aside>
    `;
    document.body.appendChild(portal);

    DOM.portal = portal;
    DOM.backdrop = portal.querySelector('.dr-eileen-backdrop');
    DOM.drawer = portal.querySelector('.dr-eileen-drawer');
    DOM.title = portal.querySelector('.dr-eileen-title');
    DOM.contextChip = portal.querySelector('[data-context-chip]');
    DOM.messageList = portal.querySelector('[data-messages]');
    DOM.input = portal.querySelector('[data-input]');
    DOM.sendBtn = portal.querySelector('[data-send]');
    DOM.saveBtn = portal.querySelector('[data-save]');
    DOM.latencyLine = portal.querySelector('[data-latency]');

    // Wire close
    portal.querySelectorAll('[data-eileen-close]').forEach((el) => {
      el.addEventListener('click', close);
    });

    // Wire send (button + Enter without shift)
    DOM.sendBtn.addEventListener('click', () => dispatchSend());
    DOM.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        dispatchSend();
      }
    });

    // Wire save
    DOM.saveBtn.addEventListener('click', dispatchSave);
  }

  function mountFloatingTrigger() {
    const trigger = document.createElement('button');
    trigger.className = 'dr-eileen-trigger';
    trigger.setAttribute('aria-label', 'Ask Eileen');
    trigger.innerHTML = `
      <span class="dr-eileen-trigger-dot"></span>
      <span class="dr-eileen-trigger-label">Ask Eileen</span>
    `;
    trigger.addEventListener('click', () => open());
    document.body.appendChild(trigger);
    DOM.floatingTrigger = trigger;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  function renderHeader() {
    if (STATE.documentContext && STATE.documentContext.name) {
      DOM.contextChip.textContent = 'About: ' + STATE.documentContext.name;
      DOM.contextChip.style.display = '';
    } else if (STATE.currentConversationId) {
      DOM.contextChip.textContent = 'Restored conversation';
      DOM.contextChip.style.display = '';
    } else {
      DOM.contextChip.textContent = '';
      DOM.contextChip.style.display = 'none';
    }
  }

  function renderMessages() {
    const esc = window.dealroomAuth.escapeHtml;
    if (!STATE.messages.length) {
      DOM.messageList.innerHTML = `
        <div class="dr-eileen-empty">
          Start a conversation. Ask Eileen about any document on this page, or about the engagement, the legal framework, or the regulatory landscape. She references Ailane's intelligence estate to give grounded answers.
        </div>
      `;
      updateSaveButton();
      return;
    }

    DOM.messageList.innerHTML = STATE.messages.map((m) => {
      const cls = m.role === 'assistant' ? 'dr-eileen-msg-eileen' : 'dr-eileen-msg-user';
      const label = m.role === 'assistant' ? 'Eileen' : 'You';
      return `
        <div class="dr-eileen-msg ${cls}">
          <div class="dr-eileen-msg-label">${esc(label)}</div>
          <div class="dr-eileen-msg-body">${renderBody(m.content)}</div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    requestAnimationFrame(() => {
      DOM.messageList.scrollTop = DOM.messageList.scrollHeight;
    });

    updateSaveButton();
  }

  function renderBody(text) {
    // Minimal safe rendering: escape, then convert [DOCUMENT_LINK markers]
    // (already resolved by EF into markdown links) into clickable HTML <a>.
    // Markdown link syntax: [label](url) — we accept URLs of any scheme produced
    // by the EF (will be HTTPS signed Supabase URLs).
    const esc = window.dealroomAuth.escapeHtml;
    let safe = esc(text || '');
    // Markdown-style links: [label](https://...)
    safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="dr-eileen-link">${label}</a>`;
    });
    // Preserve paragraph breaks
    safe = safe.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');
    return '<p>' + safe + '</p>';
  }

  function updateSaveButton() {
    // Save enabled only when there are at least one user message AND one assistant message
    const hasUser = STATE.messages.some((m) => m.role === 'user');
    const hasAssistant = STATE.messages.some((m) => m.role === 'assistant');
    DOM.saveBtn.disabled = !(hasUser && hasAssistant) || STATE.sending;
  }

  function focusInput() {
    requestAnimationFrame(() => {
      try { DOM.input.focus(); } catch (_e) { /* noop */ }
    });
  }

  // ---------------------------------------------------------------------------
  // Send flow
  // ---------------------------------------------------------------------------
  function composeSeedFromContext(ctx) {
    const name = ctx.name || ctx.doc_code || 'this document';
    const kindLabel = ctx.kind === 'requirement'
      ? "I'd like help understanding what's required for"
      : "I'd like to understand";
    return `${kindLabel} ${name}.`;
  }

  async function dispatchSend({ fromSeed } = {}) {
    if (STATE.sending) return;

    let textToSend;
    if (fromSeed) {
      // The latest message is the seed; do not consume input
      textToSend = STATE.messages[STATE.messages.length - 1].content;
    } else {
      textToSend = (DOM.input.value || '').trim();
      if (!textToSend) return;
      STATE.messages.push({ role: 'user', content: textToSend, ts: new Date().toISOString() });
      DOM.input.value = '';
    }

    STATE.sending = true;
    renderMessages();
    DOM.sendBtn.disabled = true;
    startLatencyTicker(textToSend);

    // Eileen v9 expects messages in {role, content} shape only
    const messagesForApi = STATE.messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const result = await window.dealroomApi.askEileen({
        clid: STATE.clid,
        messages: messagesForApi,
      });

      STATE.currentSessionId = result.session_id || STATE.currentSessionId;
      const assistantText = result.response || '';
      STATE.messages.push({ role: 'assistant', content: assistantText, ts: new Date().toISOString() });
    } catch (e) {
      console.error('[eileen-panel] askEileen failed:', e);
      const errMsg = e?.message || 'Eileen is temporarily unavailable. Please try again.';
      STATE.messages.push({
        role: 'assistant',
        content: '_System: ' + errMsg + '_',
        ts: new Date().toISOString(),
      });
    } finally {
      STATE.sending = false;
      clearLatencyTicker();
      DOM.sendBtn.disabled = false;
      renderMessages();
      focusInput();
    }
  }

  async function dispatchSave() {
    if (DOM.saveBtn.disabled) return;
    const name = window.prompt('Name this conversation:', defaultConversationName());
    if (!name) return;

    DOM.saveBtn.disabled = true;
    try {
      const result = await window.dealroomApi.saveConversation({
        clid: STATE.clid,
        conversation_name: name,
        messages: STATE.messages,
        eileen_session_id: STATE.currentSessionId || undefined,
        conversation_metadata: STATE.documentContext
          ? { seed_document: STATE.documentContext }
          : {},
      });
      STATE.currentConversationId = result.conversation?.conversation_id || null;

      // Refresh saved list on the documents page if the hook is provided
      if (typeof window.dealroomEileenRefreshSavedList === 'function') {
        try { await window.dealroomEileenRefreshSavedList(); } catch (_e) { /* noop */ }
      }

      DOM.saveBtn.textContent = 'Saved ✓';
      setTimeout(() => {
        DOM.saveBtn.textContent = 'Save conversation';
        updateSaveButton();
      }, 1800);
    } catch (e) {
      console.error('[eileen-panel] save failed:', e);
      window.alert('Save failed: ' + (e?.message || 'Unknown error'));
      updateSaveButton();
    }
  }

  function defaultConversationName() {
    if (STATE.documentContext && STATE.documentContext.name) {
      return STATE.documentContext.name + ' — discussion';
    }
    const firstUser = STATE.messages.find((m) => m.role === 'user');
    if (firstUser) {
      return firstUser.content.slice(0, 60);
    }
    return 'Conversation ' + new Date().toLocaleDateString('en-GB');
  }

  // ---------------------------------------------------------------------------
  // Latency-line ticker — wires assets/dealroom/eileen-latency.js
  // ---------------------------------------------------------------------------
  function startLatencyTicker(promptText) {
    STATE.latencyStartedAt = Date.now();

    const tick = () => {
      if (!STATE.sending) return;
      const elapsed = Date.now() - STATE.latencyStartedAt;
      const line = pickLatencyLine(promptText, elapsed);
      DOM.latencyLine.textContent = line;
    };
    tick(); // immediate
    STATE.latencyTimer = setInterval(tick, 600);
  }

  function clearLatencyTicker() {
    if (STATE.latencyTimer) {
      clearInterval(STATE.latencyTimer);
      STATE.latencyTimer = null;
    }
    STATE.latencyStartedAt = null;
    if (DOM.latencyLine) DOM.latencyLine.textContent = '';
  }

  function pickLatencyLine(promptText, elapsedMs) {
    // Delegate to window.eileenLatency if loaded; otherwise fallback to a single line.
    if (typeof window.eileenLatency?.pickLatencyLine === 'function') {
      return window.eileenLatency.pickLatencyLine(promptText, elapsedMs, STATE.sessionSeenLatency);
    }
    return 'Thinking…';
  }

  // ---------------------------------------------------------------------------
  // Expose public API
  // ---------------------------------------------------------------------------
  window.dealroomEileen = {
    init,
    open,
    close,
    getCurrentMessages,
    getCurrentSessionId,
  };
})();
