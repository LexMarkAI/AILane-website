/**
 * EILEEN PANEL ORCHESTRATOR — KLUI-001 §3.4
 * Ties all Eileen sub-modules together.
 * Nexus avatar, chat UI, context consumer, session manager, voice input.
 * Advisory banner: persistent, non-dismissable (CCI Annex D §D.6).
 */

import './eileen/nexus-avatar.js';
import './eileen/eileen-chat.js';
import './eileen/eileen-context.js';
import './eileen/eileen-sessions.js';
import './eileen/eileen-voice.js';

function AilaneEileenPanel(container, bus) {
  this.bus = bus;
  this.el = null;
  this.nexusHandle = null;
  this._sidebarVisible = true;
  this._sessionManager = null;
  this._chatUI = null;
  this._contextManager = null;
  this._voiceInput = null;
}

AilaneEileenPanel.prototype.mount = function(container) {
  this.el = container;
  this.el.innerHTML = '';
  this.el.style.cssText = 'display:flex;flex-direction:column;height:100%;background:#0a0f1a;color:#e2e8f0;';

  var self = this;
  var user = window.__ailaneUser;
  var tier = user ? user.tier : 'operational';
  var isPerSession = tier === 'per_session';

  // ---- Header ----
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #1e293b;';

  // Nexus avatar (32px, active state)
  var avatarContainer = document.createElement('div');
  avatarContainer.style.cssText = 'flex-shrink:0;width:32px;height:32px;';
  this.nexusHandle = window.__NexusAvatar.create(avatarContainer, 32, true, false);
  header.appendChild(avatarContainer);

  // Eileen label
  var label = document.createElement('span');
  label.style.cssText = 'font-size:15px;font-weight:600;color:#e2e8f0;';
  label.textContent = 'Eileen';
  header.appendChild(label);

  // Tier badge
  var tierBadge = document.createElement('span');
  tierBadge.style.cssText = 'font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600;background:rgba(10,92,82,0.2);color:#14b8a6;';
  tierBadge.textContent = tier === 'per_session' ? 'KL Pass' : tier.charAt(0).toUpperCase() + tier.slice(1);
  header.appendChild(tierBadge);

  // Spacer
  var spacer = document.createElement('div');
  spacer.style.flex = '1';
  header.appendChild(spacer);

  // Sidebar toggle
  if (!isPerSession) {
    var sidebarToggle = document.createElement('button');
    sidebarToggle.style.cssText = 'background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px;';
    sidebarToggle.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    sidebarToggle.setAttribute('aria-label', 'Toggle session sidebar');
    sidebarToggle.addEventListener('click', function() {
      self._sidebarVisible = !self._sidebarVisible;
      var sidebar = self.el.querySelector('.ws-eileen-sidebar');
      if (sidebar) sidebar.style.display = self._sidebarVisible ? 'flex' : 'none';
    });
    header.appendChild(sidebarToggle);
  }

  this.el.appendChild(header);

  // ---- Advisory Banner (PERSISTENT, NON-DISMISSABLE) ----
  var banner = document.createElement('div');
  banner.className = 'ws-eileen-banner';
  banner.setAttribute('role', 'alert');
  banner.textContent = 'Eileen provides regulatory intelligence. She does not provide legal advice. For legal advice, consult a qualified employment solicitor.';
  this.el.appendChild(banner);

  // KL Pass banner
  if (isPerSession) {
    var passBanner = document.createElement('div');
    passBanner.style.cssText = 'padding:8px 14px;background:rgba(56,189,248,0.08);border-bottom:1px solid rgba(56,189,248,0.15);font-size:12px;color:#38bdf8;';
    passBanner.textContent = 'Chat history is not saved in your current plan.';
    this.el.appendChild(passBanner);
  }

  // ---- Main body: sidebar + chat ----
  var body = document.createElement('div');
  body.style.cssText = 'display:flex;flex:1;overflow:hidden;';

  // Session sidebar
  var sidebar = document.createElement('div');
  sidebar.className = 'ws-eileen-sidebar';
  if (isPerSession) sidebar.style.display = 'none';
  body.appendChild(sidebar);

  // Chat column
  var chatCol = document.createElement('div');
  chatCol.style.cssText = 'display:flex;flex-direction:column;flex:1;min-width:0;';

  // Messages container
  var messagesEl = document.createElement('div');
  messagesEl.className = 'ws-eileen-messages';
  messagesEl.setAttribute('role', 'log');
  messagesEl.setAttribute('aria-label', 'Conversation with Eileen');
  chatCol.appendChild(messagesEl);

  // Typing indicator
  var typingEl = document.createElement('div');
  typingEl.className = 'ws-eileen-typing';
  typingEl.style.display = 'none';
  typingEl.setAttribute('aria-live', 'polite');
  typingEl.innerHTML = '<span></span><span></span><span></span>';
  var typingSr = document.createElement('span');
  typingSr.className = 'ws-sr-announcement';
  typingSr.textContent = 'Eileen is thinking\u2026';
  typingEl.appendChild(typingSr);
  chatCol.appendChild(typingEl);

  // Quick action row
  var quickRow = document.createElement('div');
  quickRow.className = 'ws-eileen-quick-row';
  chatCol.appendChild(quickRow);

  // Input row
  var inputRow = document.createElement('div');
  inputRow.className = 'ws-eileen-input-row';

  var inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.className = 'ws-eileen-input';
  inputEl.placeholder = 'Ask Eileen about employment law\u2026';
  inputEl.setAttribute('aria-label', 'Message to Eileen');
  inputRow.appendChild(inputEl);

  // Voice button
  var voiceBtn = document.createElement('button');
  voiceBtn.className = 'ws-eileen-voice-btn';
  voiceBtn.setAttribute('aria-label', 'Voice input');
  voiceBtn.setAttribute('title', 'Speak to Eileen');
  voiceBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
  inputRow.appendChild(voiceBtn);

  // Send button
  var sendBtn = document.createElement('button');
  sendBtn.className = 'ws-eileen-send-btn';
  sendBtn.setAttribute('aria-label', 'Send message');
  sendBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  inputRow.appendChild(sendBtn);

  chatCol.appendChild(inputRow);
  body.appendChild(chatCol);
  this.el.appendChild(body);

  // ---- Initialise sub-modules ----

  // Context bus consumer
  window.__EileenContext.init(this.bus);

  // Session manager
  window.__EileenSessions.init({
    sidebarEl: sidebar,
    onSessionSelect: function(sessionId) {
      window.__EileenChat.setSession(sessionId);
    },
    activeSessionId: null
  });

  // Chat UI
  window.__EileenChat.create({
    bus: this.bus,
    messagesEl: messagesEl,
    inputEl: inputEl,
    sendBtn: sendBtn,
    typingEl: typingEl,
    nexusHandle: this.nexusHandle,
    sessionId: window.__EileenSessions.getActiveSessionId()
  });

  // Voice input
  window.__EileenVoice.init({
    voiceBtn: voiceBtn,
    inputEl: inputEl,
    onTranscript: null // User reviews and presses send
  });

  // Quick actions
  this._renderQuickActions(quickRow, inputEl);

  // Badge logic: clear on panel open
  if (window.__clearRailBadge) window.__clearRailBadge('eileen');

  // Badge logic: set cyan badge on response when panel is not active
  this.bus.on('eileen:response', function() {
    var drawer = window.__ailaneWorkspace ? window.__ailaneWorkspace.drawer : null;
    if (drawer && drawer.activePanel !== 'eileen') {
      if (window.__setRailBadge) window.__setRailBadge('eileen', 'cyan');
    }
  });

  // Emit ready signal
  this.bus.emit('eileen:ready', {});
};

AilaneEileenPanel.prototype._renderQuickActions = function(container, inputEl) {
  container.innerHTML = '';
  var actions = window.__EileenContext.getQuickActions();

  actions.forEach(function(actionText) {
    var pill = document.createElement('button');
    pill.className = 'ws-eileen-quick-action';
    pill.textContent = actionText;
    pill.addEventListener('click', function() {
      window.__EileenChat.submitQuickAction(actionText);
    });
    container.appendChild(pill);
  });

  // Refresh quick actions when context changes
  var self = this;
  var signals = ['vault:document:selected', 'vault:finding:focused', 'calendar:event:selected',
    'planner:step:changed', 'planner:requirement:selected', 'statute:viewed'];
  signals.forEach(function(sig) {
    self.bus.on(sig, function() {
      self._renderQuickActions(container, inputEl);
    });
  });
};

AilaneEileenPanel.prototype.unmount = function() {
  window.__EileenChat.destroy();
  window.__EileenSessions.destroy();
  window.__EileenContext.destroy();
  window.__EileenVoice.destroy();
  if (this.nexusHandle) {
    this.nexusHandle.destroy();
    this.nexusHandle = null;
  }
  if (this.el) this.el.innerHTML = '';
};

// Global registration
window.__PanelEileen = AilaneEileenPanel;
