/* =============================================================================
 * Charity Onboarding Room — Ask Eileen widget (every page)
 * AILANE-CC-BRIEF-CSO-ROOM-WEB-001 §1 — calls EF eileen-charityroom.
 * If the EF is unavailable (404 / network / pre-provisioning) the chip renders
 * "Eileen joins this room at provisioning" — graceful degrade is a completion
 * state, not an error. Conversation is kept in memory only (no storage).
 * ============================================================================= */
(function () {
  'use strict';

  var CFG = window.CHARITY_ROOM;
  var api = window.charityRoomApi;
  var messages = [];
  var busy = false;

  function el(id) { return document.getElementById(id); }

  function mount() {
    if (el('ce-fab')) return;
    var fab = document.createElement('button');
    fab.id = 'ce-fab';
    fab.className = 'eileen-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Ask Eileen');
    fab.innerHTML = '<span>Ask Eileen</span>';
    document.body.appendChild(fab);

    var panel = document.createElement('section');
    panel.id = 'ce-panel';
    panel.className = 'eileen-panel hidden';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Eileen');
    panel.innerHTML =
      '<header class="ep-head">' +
        '<div class="ep-name">Eileen <span style="font-weight:400;color:var(--muted);font-size:13px">&middot; ' +
        api.esc(CFG.ROOM_LABEL) + '</span></div>' +
        '<button class="ep-close" id="ce-close" type="button" aria-label="Close">&#10005;</button>' +
      '</header>' +
      '<div class="ep-body" id="ce-body" aria-live="polite"></div>' +
      '<form class="ep-input" id="ce-form">' +
        '<textarea id="ce-text" rows="1" placeholder="Ask Eileen about this room or your obligations&hellip;" aria-label="Message to Eileen"></textarea>' +
        '<button class="ep-send" id="ce-send" type="submit" aria-label="Send">&#10148;</button>' +
      '</form>' +
      '<div class="ep-foot">Eileen provides regulatory intelligence, not legal advice.</div>';
    document.body.appendChild(panel);

    fab.addEventListener('click', open);
    el('ce-close').addEventListener('click', close);
    el('ce-form').addEventListener('submit', function (e) { e.preventDefault(); send(); });
    el('ce-text').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    render();
  }

  function render() {
    var body = el('ce-body');
    if (!body) return;
    body.innerHTML = '';
    var intro = document.createElement('div');
    intro.className = 'ep-intro';
    intro.textContent = 'Hello — I am Eileen, the Ailane intelligence entity. Ask me about this room, the documents, or your upcoming obligations.';
    body.appendChild(intro);

    var state = window.CHARITY_ROOM_STATE || { mode: 'preview' };
    if (state.mode !== 'live' || !CFG.PROVISIONED) {
      var note = document.createElement('div');
      note.className = 'ep-note';
      note.textContent = 'Eileen joins this room at provisioning.';
      body.appendChild(note);
    }

    messages.forEach(function (m) {
      var d = document.createElement('div');
      d.className = 'ep-msg ' + (m.role === 'user' ? 'ep-user' : 'ep-eileen');
      d.textContent = m.content;
      body.appendChild(d);
    });
    if (busy) {
      var t = document.createElement('div');
      t.className = 'ep-msg ep-eileen';
      t.textContent = '…';
      body.appendChild(t);
    }
    body.scrollTop = body.scrollHeight;
  }

  function open() {
    el('ce-panel').classList.remove('hidden');
    el('ce-fab').classList.add('hidden');
    render();
    try { el('ce-text').focus(); } catch (e) {}
  }

  function close() {
    el('ce-panel').classList.add('hidden');
    el('ce-fab').classList.remove('hidden');
  }

  async function send() {
    if (busy) return;
    var ta = el('ce-text');
    var text = (ta.value || '').trim();
    if (!text) return;

    var state = window.CHARITY_ROOM_STATE || { mode: 'preview' };
    if (state.mode !== 'live' || !CFG.PROVISIONED) {
      /* Pre-provisioning: keep the chip message in view, do not call out */
      render();
      return;
    }

    messages.push({ role: 'user', content: text });
    ta.value = '';
    busy = true;
    render();
    try { if (window.gtag) window.gtag('event', 'charity_room_eileen_message'); } catch (e) {}
    try {
      var data = await api.askEileen(state, messages);
      var reply = (data && typeof data.response === 'string') ? data.response : '';
      messages.push({ role: 'assistant', content: reply || 'No response was returned. Please try again.' });
    } catch (e2) {
      messages.pop();
      ta.value = text;
      busy = false;
      render();
      var body = el('ce-body');
      var note = document.createElement('div');
      note.className = 'ep-note';
      note.textContent = 'Eileen joins this room at provisioning.';
      body.appendChild(note);
      body.scrollTop = body.scrollHeight;
      return;
    }
    busy = false;
    render();
  }

  /* WEB-004 §2 — programmatic ask: open the widget with the question
   * pre-filled and sent. Pre-provisioning / EF-unavailable degrade is
   * unchanged: send() renders the "joins at provisioning" note. */
  function ask(text) {
    mount();
    open();
    var ta = el('ce-text');
    if (ta) ta.value = String(text || '');
    send();
  }

  window.CharityEileen = { mount: mount, open: open, close: close, ask: ask };
  /* Brief-named alias (AILANE-CC-BRIEF-CSO-ROOM-WEB-004 §2) */
  window.AilaneEileen = window.CharityEileen;
})();
