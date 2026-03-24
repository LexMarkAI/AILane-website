/**
 * AILANE KNOWLEDGE LIBRARY — FULL WORKSPACE MODE
 * KLUI-001 v1.0 · AMD-031 · Sprint 6a
 *
 * Multi-panel grid manager for the Full Workspace experience.
 * Renders workspace chrome (top bar, panel selector, grid).
 * Keyboard shortcuts, layout persistence, panel communication.
 *
 * Exported API: window.__WorkspaceMode = { init, destroy, isActive, openPanel, closePanel, getLayout }
 */

// ============================================================================
// PANEL ICONS (reuse from panel-system — inline SVGs)
// ============================================================================
var WS_PANEL_ICONS = {
  vault: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V4a2 2 0 012-2h12a2 2 0 012 2v16"/><path d="M4 20h16"/><path d="M12 14a2 2 0 100-4 2 2 0 000 4z"/><path d="M12 10V6"/></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  documents: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
  eileen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="4 4"/><circle cx="12" cy="4" r="1" fill="currentColor"/><circle cx="12" cy="20" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="20" cy="12" r="1" fill="currentColor"/></svg>',
  research: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  planner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
};

// ============================================================================
// PANEL CONFIGURATION (mirrors panel-system.js PANEL_TYPES)
// ============================================================================
var WS_PANELS = [
  { id: 'vault', name: 'Document Vault', icon: 'vault', sprint: 1 },
  { id: 'notes', name: 'Notes', icon: 'notes', sprint: 1 },
  { id: 'documents', name: 'Documents', icon: 'documents', sprint: 2 },
  { id: 'eileen', name: 'Eileen', icon: 'eileen', sprint: 5 },
  { id: 'research', name: 'Research', icon: 'research', sprint: 5 },
  { id: 'planner', name: 'Contract Planner', icon: 'planner', sprint: 3,
    tierGate: ['governance', 'institutional'] },
  { id: 'clipboard', name: 'Clipboard', icon: 'clipboard', sprint: 2 },
  { id: 'calendar', name: 'Calendar', icon: 'calendar', sprint: 2 }
];

var TIER_LABELS = {
  operational_readiness: 'Operational',
  operational: 'Operational',
  governance: 'Governance',
  institutional: 'Institutional'
};

var MAX_PANELS = 4;
var MIN_PANEL_WIDTH = 280;

// ============================================================================
// WORKSPACE MODE STATE
// ============================================================================
var _active = false;
var _container = null;
var _bus = null;
var _user = null;
var _activePanels = []; // array of panel id strings
var _panelInstances = {}; // keyed by panel id
var _gridEl = null;
var _topbarEl = null;
var _panelBarEl = null;
var _keydownHandler = null;
var _maxNoticeTimeout = null;

// ============================================================================
// INIT
// ============================================================================
function init(container, bus, user) {
  _active = true;
  _container = container;
  _bus = bus;
  _user = user;
  window.__workspaceModeActive = true;

  // Build workspace chrome
  _container.innerHTML = '';
  _container.style.display = 'flex';
  _container.style.flexDirection = 'column';
  _container.style.height = '100vh';

  // 1. Top bar
  _topbarEl = _renderTopbar();
  _container.appendChild(_topbarEl);

  // 2. Panel selector bar
  _panelBarEl = _renderPanelBar();
  _container.appendChild(_panelBarEl);

  // 3. Panel grid
  _gridEl = document.createElement('div');
  _gridEl.className = 'ws-workspace-grid ws-workspace-grid--0';
  _gridEl.setAttribute('role', 'main');
  _gridEl.setAttribute('aria-label', 'Workspace panel grid');
  _container.appendChild(_gridEl);

  // 4. Keyboard shortcuts
  _registerKeyboard();

  // 5. Restore saved layout
  _restoreLayout();
}

// ============================================================================
// DESTROY
// ============================================================================
function destroy() {
  // Unmount all panels
  _activePanels.forEach(function(panelId) {
    _unmountPanel(panelId);
  });
  _activePanels = [];
  _panelInstances = {};

  // Remove keyboard listener
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
    _keydownHandler = null;
  }

  // Clear container
  if (_container) {
    _container.innerHTML = '';
  }

  _active = false;
  _container = null;
  _bus = null;
  _user = null;
  _gridEl = null;
  _topbarEl = null;
  _panelBarEl = null;
  window.__workspaceModeActive = false;

  if (_maxNoticeTimeout) {
    clearTimeout(_maxNoticeTimeout);
    _maxNoticeTimeout = null;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================
function isActive() {
  return _active;
}

function openPanel(panelId) {
  if (!_active) return;

  // Already open? Focus it instead
  if (_activePanels.indexOf(panelId) !== -1) {
    _focusPanelByKey(panelId);
    return;
  }

  // Sprint gate
  var panelDef = WS_PANELS.find(function(p) { return p.id === panelId; });
  if (!panelDef || panelDef.sprint > 5) {
    _showNotice(panelDef ? panelDef.name + ' is coming soon.' : 'Panel not found.');
    return;
  }

  // Tier gate
  if (panelDef.tierGate && _user) {
    if (panelDef.tierGate.indexOf(_user.tier) === -1) {
      _showNotice(panelDef.name + ' is available from the Governance tier.');
      return;
    }
  }

  // Max panel check
  if (_activePanels.length >= MAX_PANELS) {
    _showNotice('Maximum ' + MAX_PANELS + ' panels open. Close a panel to open another.');
    return;
  }

  // Check minimum width viability
  var gridWidth = _gridEl ? _gridEl.offsetWidth : window.innerWidth;
  var requiredWidth = (_activePanels.length + 1) * MIN_PANEL_WIDTH;
  if (requiredWidth > gridWidth && _activePanels.length > 0) {
    _showNotice('Not enough space. Close a panel or resize the window.');
    return;
  }

  _activePanels.push(panelId);
  _mountPanel(panelId);
  _updateGrid();
  _updatePanelBar();
  _persistLayout();

  if (_bus) {
    _bus.emit('panel:opened', { panelId: panelId });
  }
}

function closePanel(panelId) {
  if (!_active) return;
  var idx = _activePanels.indexOf(panelId);
  if (idx === -1) return;

  _unmountPanel(panelId);
  _activePanels.splice(idx, 1);
  _updateGrid();
  _updatePanelBar();
  _persistLayout();

  if (_bus) {
    _bus.emit('panel:closed', { panelId: panelId });
  }
}

function getLayout() {
  return {
    panels: _activePanels.slice(),
    count: _activePanels.length
  };
}

// ============================================================================
// TOP BAR RENDERING
// ============================================================================
function _renderTopbar() {
  var bar = document.createElement('div');
  bar.className = 'ws-workspace-topbar';

  // Left: Ailane wordmark
  var wordmark = document.createElement('a');
  wordmark.className = 'ws-workspace-wordmark';
  wordmark.href = '/account/dashboard/';
  wordmark.textContent = 'AILANE';
  wordmark.setAttribute('aria-label', 'Return to dashboard');
  bar.appendChild(wordmark);

  // Centre: label + tier badge
  var centre = document.createElement('div');
  centre.className = 'ws-workspace-centre';

  var label = document.createElement('span');
  label.className = 'ws-workspace-label';
  label.textContent = 'Workspace';
  centre.appendChild(label);

  if (_user && _user.tier) {
    var tierBadge = document.createElement('span');
    tierBadge.className = 'ws-workspace-tier-badge';
    tierBadge.textContent = TIER_LABELS[_user.tier] || _user.tier;
    centre.appendChild(tierBadge);
  }

  bar.appendChild(centre);

  // Right: Exit button
  var rightGroup = document.createElement('div');
  rightGroup.style.display = 'flex';
  rightGroup.style.alignItems = 'center';
  rightGroup.style.gap = '10px';

  var exitBtn = document.createElement('a');
  exitBtn.className = 'ws-workspace-exit-btn';
  exitBtn.href = '/account/dashboard/';
  exitBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Exit Workspace';
  exitBtn.setAttribute('aria-label', 'Exit workspace and return to dashboard');
  rightGroup.appendChild(exitBtn);

  bar.appendChild(rightGroup);

  return bar;
}

// ============================================================================
// PANEL SELECTOR BAR
// ============================================================================
function _renderPanelBar() {
  var bar = document.createElement('div');
  bar.className = 'ws-workspace-panel-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Panel selector');

  WS_PANELS.forEach(function(panel, index) {
    var btn = document.createElement('button');
    btn.className = 'ws-workspace-panel-btn';
    btn.setAttribute('data-panel', panel.id);
    btn.setAttribute('aria-label', 'Toggle ' + panel.name + ' panel');

    var iconSpan = document.createElement('span');
    iconSpan.style.width = '16px';
    iconSpan.style.height = '16px';
    iconSpan.style.display = 'inline-flex';
    iconSpan.innerHTML = WS_PANEL_ICONS[panel.icon] || '';
    iconSpan.querySelector('svg').setAttribute('width', '16');
    iconSpan.querySelector('svg').setAttribute('height', '16');
    btn.appendChild(iconSpan);

    var labelSpan = document.createElement('span');
    labelSpan.textContent = panel.name;
    btn.appendChild(labelSpan);

    // Tier gate visual
    if (panel.tierGate && _user && panel.tierGate.indexOf(_user.tier) === -1) {
      btn.style.opacity = '0.35';
      btn.setAttribute('aria-label', panel.name + ' (Governance+ required)');
    }

    btn.addEventListener('click', function() {
      if (_activePanels.indexOf(panel.id) !== -1) {
        closePanel(panel.id);
      } else {
        openPanel(panel.id);
      }
    });

    bar.appendChild(btn);
  });

  return bar;
}

function _updatePanelBar() {
  if (!_panelBarEl) return;
  var buttons = _panelBarEl.querySelectorAll('.ws-workspace-panel-btn');
  buttons.forEach(function(btn) {
    var panelKey = btn.getAttribute('data-panel');
    var isActive = _activePanels.indexOf(panelKey) !== -1;
    btn.classList.toggle('ws-workspace-panel-btn--active', isActive);
  });
}

// ============================================================================
// GRID MANAGEMENT
// ============================================================================
function _updateGrid() {
  if (!_gridEl) return;
  var count = _activePanels.length;

  // Update grid class
  _gridEl.className = 'ws-workspace-grid ws-workspace-grid--' + count;

  // Show empty state if no panels
  if (count === 0) {
    var existingEmpty = _gridEl.querySelector('.ws-workspace-empty');
    if (!existingEmpty) {
      var empty = document.createElement('div');
      empty.className = 'ws-workspace-empty';
      empty.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;grid-column:1/-1;';
      empty.innerHTML =
        '<p style="font-size:16px;color:#94a3b8;font-weight:500;">Select a panel to get started</p>' +
        '<p style="font-size:13px;color:#64748b;">Use the panel bar above or press Cmd/Ctrl + 1\u20138</p>';
      _gridEl.appendChild(empty);
    }
  } else {
    var emptyEl = _gridEl.querySelector('.ws-workspace-empty');
    if (emptyEl) emptyEl.remove();
  }
}

// ============================================================================
// PANEL MOUNTING / UNMOUNTING
// ============================================================================
function _mountPanel(panelId) {
  if (!_gridEl) return;

  // Create cell container
  var cell = document.createElement('div');
  cell.className = 'ws-workspace-cell';
  cell.setAttribute('data-ws-panel', panelId);
  cell.setAttribute('tabindex', '0');
  cell.setAttribute('role', 'region');

  var panelDef = WS_PANELS.find(function(p) { return p.id === panelId; });
  cell.setAttribute('aria-label', (panelDef ? panelDef.name : panelId) + ' panel');

  // Mount panel content using existing panel constructors
  _loadPanelContent(panelId, cell);

  _gridEl.appendChild(cell);
}

function _loadPanelContent(panelId, container) {
  if (panelId === 'vault' && window.AilaneVaultPanel) {
    _panelInstances[panelId] = new window.AilaneVaultPanel(container, _bus);
    _panelInstances[panelId].mount(container);
  } else if (panelId === 'notes' && window.AilaneNotesPanel) {
    _panelInstances[panelId] = new window.AilaneNotesPanel(container, _bus);
    _panelInstances[panelId].mount(container);
  } else if (panelId === 'documents' && window.__PanelDocuments) {
    _panelInstances[panelId] = new window.__PanelDocuments(container, _bus);
    _panelInstances[panelId].mount(container);
  } else if (panelId === 'clipboard' && window.__PanelClipboard) {
    _panelInstances[panelId] = new window.__PanelClipboard(container, _bus);
    _panelInstances[panelId].mount(container);
  } else if (panelId === 'calendar' && window.__PanelCalendar) {
    _panelInstances[panelId] = new window.__PanelCalendar(container, _bus);
    _panelInstances[panelId].mount(container);
  } else if (panelId === 'planner' && window.__PanelPlanner) {
    _panelInstances[panelId] = window.__PanelPlanner(container);
  } else if (panelId === 'eileen' && window.__PanelEileen) {
    _panelInstances[panelId] = new window.__PanelEileen(container, _bus);
    _panelInstances[panelId].mount(container);
  } else if (panelId === 'research' && window.__PanelResearch) {
    _panelInstances[panelId] = new window.__PanelResearch(container, _bus);
    _panelInstances[panelId].mount(container);
  } else {
    // Placeholder for unavailable panels
    container.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:32px;text-align:center;">' +
        '<p style="font-size:14px;font-weight:600;color:#e2e8f0;margin:0 0 8px;">Coming Soon</p>' +
        '<p style="font-size:12px;color:#64748b;margin:0;">This panel is under development.</p>' +
      '</div>';
  }
}

function _unmountPanel(panelId) {
  if (_panelInstances[panelId]) {
    if (typeof _panelInstances[panelId].destroy === 'function') {
      _panelInstances[panelId].destroy();
    }
    delete _panelInstances[panelId];
  }

  if (_gridEl) {
    var cell = _gridEl.querySelector('[data-ws-panel="' + panelId + '"]');
    if (cell) cell.remove();
  }
}

// ============================================================================
// KEYBOARD SHORTCUTS (KLUI-001 §2.3)
// ============================================================================
function _registerKeyboard() {
  _keydownHandler = function(e) {
    var mod = e.metaKey || e.ctrlKey;

    // Cmd/Ctrl + 1–8: Focus or open panel at index
    if (mod && e.key >= '1' && e.key <= '8') {
      e.preventDefault();
      var panelIndex = parseInt(e.key) - 1;
      if (panelIndex < WS_PANELS.length) {
        var targetPanel = WS_PANELS[panelIndex];
        if (_activePanels.indexOf(targetPanel.id) !== -1) {
          _focusPanelByKey(targetPanel.id);
        } else {
          openPanel(targetPanel.id);
        }
      }
      return;
    }

    // Cmd/Ctrl + N: Open/focus Notes
    if (mod && !e.shiftKey && e.key === 'n') {
      e.preventDefault();
      openPanel('notes');
      return;
    }

    // Cmd/Ctrl + Shift + E: Open/focus Eileen
    if (mod && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
      e.preventDefault();
      openPanel('eileen');
      return;
    }

    // Cmd/Ctrl + S: Save all
    if (mod && e.key === 's') {
      e.preventDefault();
      _saveAll();
      return;
    }

    // Escape: Close the focused/active panel
    if (e.key === 'Escape') {
      e.preventDefault();
      _closeActivePanel();
      return;
    }

    // Tab: Cycle between panels (within workspace, not default tab)
    if (e.key === 'Tab' && _activePanels.length > 1) {
      var focused = document.activeElement;
      var currentCell = focused ? focused.closest('.ws-workspace-cell') : null;
      if (currentCell) {
        var currentKey = currentCell.getAttribute('data-ws-panel');
        var currentIdx = _activePanels.indexOf(currentKey);
        if (currentIdx !== -1) {
          var nextIdx = e.shiftKey
            ? (currentIdx - 1 + _activePanels.length) % _activePanels.length
            : (currentIdx + 1) % _activePanels.length;
          _focusPanelByKey(_activePanels[nextIdx]);
          e.preventDefault();
        }
      }
    }
  };

  document.addEventListener('keydown', _keydownHandler);
}

function _focusPanelByKey(panelId) {
  if (!_gridEl) return;
  var cell = _gridEl.querySelector('[data-ws-panel="' + panelId + '"]');
  if (cell) cell.focus();
}

function _closeActivePanel() {
  if (_activePanels.length === 0) return;
  var focused = document.activeElement;
  var currentCell = focused ? focused.closest('.ws-workspace-cell') : null;
  if (currentCell) {
    var panelId = currentCell.getAttribute('data-ws-panel');
    if (panelId) {
      closePanel(panelId);
      return;
    }
  }
  // If no cell focused, close the last opened panel
  closePanel(_activePanels[_activePanels.length - 1]);
}

function _saveAll() {
  // Trigger auto-save on all active panels that support it
  _activePanels.forEach(function(panelId) {
    var inst = _panelInstances[panelId];
    if (inst && typeof inst._scheduleAutoSave === 'function') {
      inst._scheduleAutoSave();
    }
    if (inst && typeof inst.save === 'function') {
      inst.save();
    }
  });
  _showNotice('All panels saved.');
}

// ============================================================================
// LAYOUT PERSISTENCE
// ============================================================================
function _persistLayout() {
  if (window.__ailaneWorkspace && window.__ailaneWorkspace.prefs) {
    window.__ailaneWorkspace.prefs.set('workspaceLayout', {
      panels: _activePanels.slice(),
      count: _activePanels.length
    });
  }
}

function _restoreLayout() {
  if (window.__ailaneWorkspace && window.__ailaneWorkspace.prefs) {
    var saved = window.__ailaneWorkspace.prefs.get('workspaceLayout');
    if (saved && saved.panels && Array.isArray(saved.panels) && saved.panels.length > 0) {
      saved.panels.forEach(function(panelId) {
        // Validate panel exists and passes gates
        var panelDef = WS_PANELS.find(function(p) { return p.id === panelId; });
        if (!panelDef) return;
        if (panelDef.sprint > 5) return;
        if (panelDef.tierGate && _user && panelDef.tierGate.indexOf(_user.tier) === -1) return;
        if (_activePanels.length >= MAX_PANELS) return;

        _activePanels.push(panelId);
        _mountPanel(panelId);
      });
      _updateGrid();
      _updatePanelBar();
      return;
    }
  }

  // No saved layout — show empty state
  _updateGrid();
}

// ============================================================================
// NOTICE TOAST
// ============================================================================
function _showNotice(message) {
  // Remove existing notice
  var existing = document.querySelector('.ws-workspace-max-notice');
  if (existing) existing.remove();
  if (_maxNoticeTimeout) {
    clearTimeout(_maxNoticeTimeout);
  }

  var notice = document.createElement('div');
  notice.className = 'ws-workspace-max-notice';
  notice.textContent = message;
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  document.body.appendChild(notice);

  _maxNoticeTimeout = setTimeout(function() {
    if (notice.parentNode) notice.remove();
  }, 3200);
}

// ============================================================================
// EXPORT
// ============================================================================
window.__WorkspaceMode = {
  init: init,
  destroy: destroy,
  isActive: isActive,
  openPanel: openPanel,
  closePanel: closePanel,
  getLayout: getLayout
};
