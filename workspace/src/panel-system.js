/**
 * AILANE KNOWLEDGE LIBRARY — PERSISTENT PANEL SYSTEM
 * KLUI-001 v1.0 · AMD-031 · Sprint 1
 *
 * Architecture:
 * - PanelRail: renders 8 icon buttons, handles click → open/close
 * - PanelDrawer: slide-right container, push/overlay, resize
 * - ContextBus: event emitter for inter-panel communication
 * - PreferenceManager: persists state to sessionStorage + kl_user_preferences
 * - PanelRegistry: lazy-loads panel modules on first open
 */

// ============================================================================
// CONTEXT BUS (KLUI-001 §6)
// ============================================================================
class ContextBus {
  constructor() {
    this._handlers = {};
  }

  on(signal, handler) {
    if (!this._handlers[signal]) this._handlers[signal] = [];
    this._handlers[signal].push(handler);
    return () => this.off(signal, handler);
  }

  off(signal, handler) {
    if (!this._handlers[signal]) return;
    this._handlers[signal] = this._handlers[signal].filter(h => h !== handler);
  }

  emit(signal, payload) {
    if (!this._handlers[signal]) return;
    this._handlers[signal].forEach(h => {
      try { h(payload); } catch(e) { console.error('[ContextBus] Error in ' + signal + ' handler:', e); }
    });
  }
}

// ============================================================================
// PREFERENCE MANAGER (KLUI-001 §5.2)
// ============================================================================
class PreferenceManager {
  constructor() {
    this._cache = {};
    this._saveTimeout = null;
  }

  get(key) {
    if (this._cache[key] !== undefined) return this._cache[key];
    var stored = sessionStorage.getItem('ws_' + key);
    if (stored) {
      try {
        this._cache[key] = JSON.parse(stored);
        return this._cache[key];
      } catch(e) { /* ignore */ }
    }
    return null;
  }

  set(key, value) {
    this._cache[key] = value;
    sessionStorage.setItem('ws_' + key, JSON.stringify(value));
    this._scheduleSave();
  }

  _scheduleSave() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => this._saveToSupabase(), 3000);
  }

  async _saveToSupabase() {
    var user = window.__ailaneUser;
    if (!user || !user.token) return;

    try {
      var prefs = {};
      for (var key of Object.keys(this._cache)) {
        prefs[key] = this._cache[key];
      }

      await fetch(
        'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_user_preferences?user_id=eq.' + user.id,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            preferences: prefs,
            updated_at: new Date().toISOString()
          })
        }
      );
    } catch(e) {
      console.error('[PreferenceManager] Supabase sync failed:', e);
    }
  }

  async loadFromSupabase() {
    var user = window.__ailaneUser;
    if (!user || !user.token) return;

    try {
      var res = await fetch(
        'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_user_preferences?user_id=eq.' + user.id + '&select=preferences',
        {
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      var data = await res.json();
      if (data && data.length > 0 && data[0].preferences) {
        var prefs = data[0].preferences;
        for (var [key, val] of Object.entries(prefs)) {
          this._cache[key] = val;
          sessionStorage.setItem('ws_' + key, JSON.stringify(val));
        }
      } else {
        // First time: create preferences row
        await fetch(
          'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_user_preferences',
          {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + user.token,
              'apikey': window.__SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              user_id: user.id,
              preferences: {}
            })
          }
        );
      }
    } catch(e) {
      console.error('[PreferenceManager] Load failed:', e);
    }
  }
}

// ============================================================================
// PANEL REGISTRY (KLUI-001 §3)
// ============================================================================
// Sprint 1: Vault + Notes active. Others show placeholder.
var PANEL_TYPES = [
  // Production group
  { id: 'vault', name: 'Document Vault', group: 'production', icon: 'vault', sprint: 1 },
  { id: 'notes', name: 'Notes', group: 'production', icon: 'notes', sprint: 1 },
  { id: 'documents', name: 'Documents', group: 'production', icon: 'documents', sprint: 2 },
  { id: 'eileen', name: 'Eileen', group: 'production', icon: 'eileen', sprint: 5 },
  // Intelligence group
  { id: 'research', name: 'Research', group: 'intelligence', icon: 'research', sprint: 5 },
  { id: 'planner', name: 'Contract Planner', group: 'intelligence', icon: 'planner', sprint: 3,
    tierGate: ['governance', 'institutional'] },
  { id: 'clipboard', name: 'Clipboard', group: 'intelligence', icon: 'clipboard', sprint: 2 },
  { id: 'calendar', name: 'Calendar', group: 'intelligence', icon: 'calendar', sprint: 2 },
];

// ============================================================================
// SVG ICONS (inline, no external dependency)
// ============================================================================
var PANEL_ICONS = {
  vault: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V4a2 2 0 012-2h12a2 2 0 012 2v16"/><path d="M4 20h16"/><path d="M12 14a2 2 0 100-4 2 2 0 000 4z"/><path d="M12 10V6"/></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  documents: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
  eileen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="4 4"/><circle cx="12" cy="4" r="1" fill="currentColor"/><circle cx="12" cy="20" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="20" cy="12" r="1" fill="currentColor"/></svg>',
  research: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  planner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  push: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>',
  overlay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="10" y="5" width="12" height="14" rx="1" fill="currentColor" opacity="0.15"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
};

// ============================================================================
// PANEL RAIL (KLUI-001 §2.1)
// ============================================================================
class PanelRail {
  constructor(drawer, prefs) {
    this.drawer = drawer;
    this.prefs = prefs;
    this.el = null;
  }

  render() {
    this.el = document.createElement('nav');
    this.el.className = 'ws-rail';
    this.el.setAttribute('role', 'complementary');
    this.el.setAttribute('aria-label', 'Knowledge Library Workspace');

    var productionGroup = PANEL_TYPES.filter(p => p.group === 'production');
    var intelligenceGroup = PANEL_TYPES.filter(p => p.group === 'intelligence');

    // Production group
    var prodDiv = document.createElement('div');
    prodDiv.className = 'ws-rail-group';
    productionGroup.forEach(panel => {
      prodDiv.appendChild(this._createButton(panel));
    });
    this.el.appendChild(prodDiv);

    // Divider
    var divider = document.createElement('div');
    divider.className = 'ws-rail-divider';
    this.el.appendChild(divider);

    // Intelligence group
    var intDiv = document.createElement('div');
    intDiv.className = 'ws-rail-group';
    intelligenceGroup.forEach(panel => {
      intDiv.appendChild(this._createButton(panel));
    });
    this.el.appendChild(intDiv);

    // Bottom spacer + settings
    var spacer = document.createElement('div');
    spacer.style.flex = '1';
    this.el.appendChild(spacer);

    var bottomGroup = document.createElement('div');
    bottomGroup.className = 'ws-rail-group';
    var settingsBtn = document.createElement('button');
    settingsBtn.className = 'ws-rail-btn';
    settingsBtn.innerHTML = PANEL_ICONS.settings;
    settingsBtn.setAttribute('data-tooltip', 'Settings');
    settingsBtn.setAttribute('aria-label', 'Workspace settings');
    bottomGroup.appendChild(settingsBtn);
    this.el.appendChild(bottomGroup);

    document.body.appendChild(this.el);
    document.body.classList.add('ws-rail-active');
  }

  _createButton(panel) {
    var btn = document.createElement('button');
    btn.className = 'ws-rail-btn';
    btn.setAttribute('data-panel', panel.id);
    btn.setAttribute('data-tooltip', panel.name);
    btn.setAttribute('aria-label', 'Open ' + panel.name + ' panel');
    btn.innerHTML = PANEL_ICONS[panel.icon];

    // Tier gate check
    if (panel.tierGate) {
      var userTier = window.__ailaneUser ? window.__ailaneUser.tier : null;
      if (!panel.tierGate.includes(userTier)) {
        btn.setAttribute('data-tooltip', panel.name + ' (Governance+)');
        btn.style.opacity = '0.35';
      }
    }

    btn.addEventListener('click', () => {
      // Tier gate: show upgrade message for locked panels
      if (panel.tierGate) {
        var userTier = window.__ailaneUser ? window.__ailaneUser.tier : null;
        if (!panel.tierGate.includes(userTier)) {
          this.drawer.showUpgradeNotice(panel.name);
          return;
        }
      }

      // Sprint gate: show coming soon for future panels
      if (panel.sprint > 3) {
        this.drawer.showComingSoon(panel.name);
        return;
      }

      this.drawer.toggle(panel.id);
      this._updateActiveState(panel.id);
    });

    return btn;
  }

  _updateActiveState(panelId) {
    this.el.querySelectorAll('.ws-rail-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-panel') === panelId && this.drawer.isOpen);
    });
  }

  clearActive() {
    this.el.querySelectorAll('.ws-rail-btn').forEach(btn => btn.classList.remove('active'));
  }
}

// ============================================================================
// PANEL DRAWER (KLUI-001 §2.2)
// ============================================================================
class PanelDrawer {
  constructor(prefs, bus) {
    this.prefs = prefs;
    this.bus = bus;
    this.el = null;
    this.contentEl = null;
    this.titleEl = null;
    this.isOpen = false;
    this.activePanel = null;
    this.width = prefs.get('drawer_width') || 420;
    this.mode = prefs.get('push_overlay_mode') || 'push';
    this._panels = {};
    this._resizing = false;
  }

  render() {
    this.el = document.createElement('aside');
    this.el.className = 'ws-drawer';
    this.el.setAttribute('role', 'region');
    this.el.setAttribute('aria-label', 'Workspace Panel');
    this.el.style.width = this.width + 'px';

    // Resize handle
    var resize = document.createElement('div');
    resize.className = 'ws-drawer-resize';
    this._setupResize(resize);
    this.el.appendChild(resize);

    // Header
    var header = document.createElement('div');
    header.className = 'ws-drawer-header';

    this.titleEl = document.createElement('span');
    this.titleEl.className = 'ws-drawer-title';
    header.appendChild(this.titleEl);

    var actions = document.createElement('div');
    actions.className = 'ws-drawer-actions';

    // Push/overlay toggle
    var modeBtn = document.createElement('button');
    modeBtn.className = 'ws-drawer-action-btn';
    modeBtn.setAttribute('aria-label', 'Toggle push/overlay mode');
    modeBtn.innerHTML = this.mode === 'push' ? PANEL_ICONS.push : PANEL_ICONS.overlay;
    modeBtn.addEventListener('click', () => {
      this.mode = this.mode === 'push' ? 'overlay' : 'push';
      modeBtn.innerHTML = this.mode === 'push' ? PANEL_ICONS.push : PANEL_ICONS.overlay;
      this.prefs.set('push_overlay_mode', this.mode);
      this._applyMode();
    });
    actions.appendChild(modeBtn);

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'ws-drawer-action-btn';
    closeBtn.setAttribute('aria-label', 'Close panel');
    closeBtn.innerHTML = PANEL_ICONS.close;
    closeBtn.addEventListener('click', () => this.close());
    actions.appendChild(closeBtn);

    header.appendChild(actions);
    this.el.appendChild(header);

    // Content
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'ws-drawer-content';
    this.el.appendChild(this.contentEl);

    // Overlay backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'ws-overlay-backdrop';
    this.backdrop.addEventListener('click', () => this.close());

    document.body.appendChild(this.el);
    document.body.appendChild(this.backdrop);

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    this._applyMode();
  }

  toggle(panelId) {
    if (this.isOpen && this.activePanel === panelId) {
      this.close();
    } else {
      this.open(panelId);
    }
  }

  open(panelId) {
    this.activePanel = panelId;
    this.isOpen = true;
    this.el.classList.add('open');

    var panelDef = PANEL_TYPES.find(p => p.id === panelId);
    this.titleEl.textContent = panelDef ? panelDef.name : panelId;

    // Lazy-load panel content
    this._loadPanel(panelId);

    this._applyMode();
    this.prefs.set('active_panel', panelId);
    this.prefs.set('drawer_open', true);
    this.bus.emit('panel:opened', { panelId: panelId });
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove('open');
    document.body.classList.remove('ws-push-mode');
    document.body.classList.remove('ws-overlay-mode');
    document.body.style.removeProperty('--ws-drawer-width');
    this.activePanel = null;
    this.prefs.set('drawer_open', false);
    this.prefs.set('active_panel', null);
    this.bus.emit('panel:closed', {});
  }

  _loadPanel(panelId) {
    this.contentEl.innerHTML = '';

    if (panelId === 'vault' && window.AilaneVaultPanel) {
      if (!this._panels.vault) {
        this._panels.vault = new window.AilaneVaultPanel(this.contentEl, this.bus);
      }
      this._panels.vault.mount(this.contentEl);
    } else if (panelId === 'notes' && window.AilaneNotesPanel) {
      if (!this._panels.notes) {
        this._panels.notes = new window.AilaneNotesPanel(this.contentEl, this.bus);
      }
      this._panels.notes.mount(this.contentEl);
    } else if (panelId === 'documents' && window.__PanelDocuments) {
      if (!this._panels.documents) {
        this._panels.documents = new window.__PanelDocuments(this.contentEl, this.bus);
      }
      this._panels.documents.mount(this.contentEl);
    } else if (panelId === 'clipboard' && window.__PanelClipboard) {
      if (!this._panels.clipboard) {
        this._panels.clipboard = new window.__PanelClipboard(this.contentEl, this.bus);
      }
      this._panels.clipboard.mount(this.contentEl);
    } else if (panelId === 'calendar' && window.__PanelCalendar) {
      if (!this._panels.calendar) {
        this._panels.calendar = new window.__PanelCalendar(this.contentEl, this.bus);
      }
      this._panels.calendar.mount(this.contentEl);
    } else if (panelId === 'planner' && window.__PanelPlanner) {
      this._panels.planner = window.__PanelPlanner(this.contentEl);
    } else {
      // Placeholder for future panels
      this.contentEl.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:32px;text-align:center;">' +
          '<div style="width:48px;height:48px;border-radius:12px;background:#F3F4F6;display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:#6B7280;">' +
            (PANEL_ICONS[panelId] || '') +
          '</div>' +
          '<p style="font-size:14px;font-weight:600;color:#0A2342;margin:0 0 8px;">Coming Soon</p>' +
          '<p style="font-size:12px;color:#6B7280;margin:0;">This panel is under development.</p>' +
        '</div>';
    }
  }

  showUpgradeNotice(panelName) {
    var notice = document.createElement('div');
    notice.style.cssText = 'position:fixed;bottom:80px;right:64px;background:#0A2342;color:white;padding:12px 20px;border-radius:10px;font-size:13px;font-family:Inter,system-ui;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
    notice.innerHTML = '<strong>' + panelName + '</strong> is available on the Governance tier. <a href="/account/dashboard/" style="color:#06B6D4;text-decoration:underline;">Upgrade</a>';
    document.body.appendChild(notice);
    setTimeout(function() { notice.remove(); }, 4000);
  }

  showComingSoon(panelName) {
    var notice = document.createElement('div');
    notice.style.cssText = 'position:fixed;bottom:80px;right:64px;background:#0A2342;color:white;padding:12px 20px;border-radius:10px;font-size:13px;font-family:Inter,system-ui;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
    notice.textContent = panelName + ' is coming soon.';
    document.body.appendChild(notice);
    setTimeout(function() { notice.remove(); }, 3000);
  }

  _applyMode() {
    if (!this.isOpen) return;
    document.body.classList.toggle('ws-push-mode', this.mode === 'push');
    document.body.classList.toggle('ws-overlay-mode', this.mode === 'overlay');
    if (this.mode === 'push') {
      document.body.style.setProperty('--ws-drawer-width', this.width + 'px');
    }
  }

  _setupResize(handle) {
    var self = this;
    var startX, startWidth;

    var onMouseMove = function(e) {
      var diff = startX - e.clientX;
      var newWidth = Math.max(320, Math.min(600, startWidth + diff));
      self.width = newWidth;
      self.el.style.width = newWidth + 'px';
      if (self.mode === 'push') {
        document.body.style.setProperty('--ws-drawer-width', newWidth + 'px');
      }
    };

    var onMouseUp = function() {
      self._resizing = false;
      handle.classList.remove('dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      self.prefs.set('drawer_width', self.width);
    };

    handle.addEventListener('mousedown', function(e) {
      self._resizing = true;
      startX = e.clientX;
      startWidth = self.width;
      handle.classList.add('dragging');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    });
  }
}

// ============================================================================
// WORKSPACE INIT
// ============================================================================
function initWorkspace() {
  // Primary guard: only on authenticated pages with user context
  if (!window.__ailaneUser) {
    console.warn('[Workspace] No user context. Panel system not initialised.');
    return;
  }

  // Tier guard: only render for workspace-enabled tiers
  var wsEnabledTiers = ['operational', 'governance', 'institutional'];
  if (!wsEnabledTiers.includes(window.__ailaneUser.tier)) {
    return;
  }

  // Defence in depth: exclude known non-workspace paths (Discrepancy 7)
  var path = window.location.pathname;
  var EXCLUDED_PATHS = [
    '/',
    '/index.html',
    '/contract-scan/',
    '/contract-check-worker/',
    '/AiLaneCEO/',
    '/auth/callback/',
    '/login/',
    '/account/',
    '/account/dashboard/',
    '/governance-dashboard/',
    '/terms/',
    '/privacy/',
    '/signup/',
    '/complaints/',
    '/welcome/',
    '/employers/',
    '/senedd-viewer/',
    '/knowledge-library-preview/'
  ];

  var normalised = path.endsWith('/') ? path : path + '/';
  if (EXCLUDED_PATHS.some(function(ex) {
    var exNorm = ex.endsWith('/') ? ex : ex + '/';
    return normalised === exNorm;
  })) {
    return;
  }

  var bus = new ContextBus();
  var prefs = new PreferenceManager();
  var drawer = new PanelDrawer(prefs, bus);
  var rail = new PanelRail(drawer, prefs);

  // NOTE: CSS loaded statically via <link> in page <head> (Discrepancy 8)
  // No dynamic CSS loading here.

  // Render components
  rail.render();
  drawer.render();

  // Load preferences from Supabase
  prefs.loadFromSupabase().then(function() {
    // Restore previous state
    var wasOpen = prefs.get('drawer_open');
    var lastPanel = prefs.get('active_panel');
    if (wasOpen && lastPanel) {
      drawer.open(lastPanel);
      rail._updateActiveState(lastPanel);
    }
  });

  // Close handler syncs rail
  bus.on('panel:closed', function() { rail.clearActive(); });
  bus.on('panel:opened', function(data) { rail._updateActiveState(data.panelId); });

  // Sprint 2: Cross-panel wiring
  // clipboard:to-notes — append clip content to active note
  var _pendingClipToNotes = null;
  bus.on('clipboard:to-notes', function(data) {
    if (drawer._panels.notes && drawer.activePanel === 'notes') {
      var notesPanel = drawer._panels.notes;
      if (notesPanel.editorEl) {
        var attribution = '\n\n--- Clipped from ' + (data.source || 'clipboard') + ' ---\n';
        var p = document.createElement('p');
        p.innerHTML = '<br>';
        var blockquote = document.createElement('blockquote');
        blockquote.textContent = data.text;
        notesPanel.editorEl.appendChild(blockquote);
        notesPanel.editorEl.appendChild(p);
        notesPanel._scheduleAutoSave();
      }
    } else {
      _pendingClipToNotes = data;
    }
  });

  bus.on('panel:opened', function(data) {
    if (data.panelId === 'notes' && _pendingClipToNotes) {
      setTimeout(function() {
        var notesPanel = drawer._panels.notes;
        if (notesPanel && notesPanel.editorEl) {
          var blockquote = document.createElement('blockquote');
          blockquote.textContent = _pendingClipToNotes.text;
          var p = document.createElement('p');
          p.innerHTML = '<br>';
          notesPanel.editorEl.appendChild(blockquote);
          notesPanel.editorEl.appendChild(p);
          notesPanel._scheduleAutoSave();
        }
        _pendingClipToNotes = null;
      }, 200);
    }
  });

  // Expose context bus globally for panel modules
  window.__contextBus = bus;

  // Expose for panel modules
  window.__ailaneWorkspace = { bus: bus, prefs: prefs, drawer: drawer, rail: rail };
}

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    // Delay slightly to let auth guard complete
    setTimeout(initWorkspace, 100);
  });
} else {
  setTimeout(initWorkspace, 100);
}
