/**
 * RESEARCH PANEL ORCHESTRATOR — KLUI-001 §3.5
 * Three-level hierarchy, statute/training/requirement viewers,
 * full-text search, forward intelligence markers.
 */

import './research/research-navigation.js';
import './research/research-viewer.js';
import './research/research-search.js';

function AilaneResearchPanel(container, bus) {
  this.bus = bus;
  this.el = null;
  this._navContainer = null;
  this._viewerContainer = null;
  this._searchContainer = null;
  this._searchVisible = false;
  this._searchInput = null;
  this._searchTimer = null;
  this._unsubs = [];
}

AilaneResearchPanel.prototype.mount = function(container) {
  this.el = container;
  this.el.innerHTML = '';
  this.el.style.cssText = 'display:flex;flex-direction:column;height:100%;background:#0a0f1a;color:#e2e8f0;';

  var self = this;

  // ---- Header ----
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #1e293b;';

  var icon = document.createElement('div');
  icon.style.cssText = 'width:20px;height:20px;color:#0A5C52;';
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
  header.appendChild(icon);

  var label = document.createElement('span');
  label.style.cssText = 'font-size:15px;font-weight:600;color:#e2e8f0;';
  label.textContent = 'Research';
  header.appendChild(label);

  var spacer = document.createElement('div');
  spacer.style.flex = '1';
  header.appendChild(spacer);

  // Search toggle
  var searchToggle = document.createElement('button');
  searchToggle.style.cssText = 'background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px;';
  searchToggle.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  searchToggle.setAttribute('aria-label', 'Toggle search');
  searchToggle.addEventListener('click', function() {
    self._searchVisible = !self._searchVisible;
    self._searchContainer.style.display = self._searchVisible ? 'block' : 'none';
    if (self._searchVisible && self._searchInput) self._searchInput.focus();
  });
  header.appendChild(searchToggle);

  this.el.appendChild(header);

  // ---- Search bar (collapsible) ----
  this._searchContainer = document.createElement('div');
  this._searchContainer.style.cssText = 'display:none;padding:8px 14px;border-bottom:1px solid #1e293b;';

  this._searchInput = document.createElement('input');
  this._searchInput.type = 'text';
  this._searchInput.className = 'ws-research-search-input';
  this._searchInput.placeholder = 'Search legislation, training, requirements\u2026';
  this._searchInput.setAttribute('aria-label', 'Search research content');
  this._searchInput.style.cssText = 'width:100%;box-sizing:border-box;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;padding:8px 12px;font-size:13px;outline:none;';

  this._searchInput.addEventListener('input', function() {
    clearTimeout(self._searchTimer);
    self._searchTimer = setTimeout(function() {
      var q = self._searchInput.value.trim();
      if (q.length >= 2) {
        self._navContainer.style.display = 'none';
        self._viewerContainer.style.display = 'none';
        self._searchResultsEl.style.display = 'block';
        window.__ResearchSearch.renderResults(self._searchResultsEl, q, function(type, item) {
          self._openViewer(type, item);
        });
      } else {
        self._searchResultsEl.style.display = 'none';
        self._navContainer.style.display = 'block';
      }
    }, 300);
  });

  this._searchContainer.appendChild(this._searchInput);
  this.el.appendChild(this._searchContainer);

  // ---- Search results container ----
  this._searchResultsEl = document.createElement('div');
  this._searchResultsEl.className = 'ws-research-search-results';
  this._searchResultsEl.style.cssText = 'display:none;flex:1;overflow-y:auto;';
  this.el.appendChild(this._searchResultsEl);

  // ---- Navigation container ----
  this._navContainer = document.createElement('div');
  this._navContainer.style.cssText = 'flex:1;overflow-y:auto;';
  this.el.appendChild(this._navContainer);

  // ---- Viewer container (hidden until content selected) ----
  this._viewerContainer = document.createElement('div');
  this._viewerContainer.style.cssText = 'display:none;flex:1;overflow-y:auto;';
  this.el.appendChild(this._viewerContainer);

  // ---- Initialise sub-modules ----
  window.__ResearchSearch.init({
    onResultClick: function(type, item) { self._openViewer(type, item); }
  });

  window.__ResearchNavigation.create({
    container: this._navContainer,
    bus: this.bus,
    onViewContent: function(type, item) { self._openViewer(type, item); }
  });

  // ---- Context bus listeners ----
  this._unsubs.push(this.bus.on('statute:viewed', function(data) {
    // Navigate to referenced statute if it has an id
    if (data && data.sectionId) {
      self._openViewerById('legislation', data.sectionId);
    }
  }));

  this._unsubs.push(this.bus.on('requirement:focused', function(data) {
    if (data && data.requirementId) {
      self._openViewerById('requirement', data.requirementId);
    }
  }));

  this._unsubs.push(this.bus.on('vault:finding:focused', function(data) {
    if (data && data.requirementRef) {
      // Search for matching requirement by statutory reference
      var searchData = window.__ResearchSearch.getData();
      var match = searchData.requirements.find(function(r) {
        return r.source && r.source.indexOf(data.requirementRef) !== -1;
      });
      if (match) self._openViewer('requirement', match);
    }
  }));

  this._unsubs.push(this.bus.on('calendar:learn-more', function(data) {
    if (data && data.statutoryBasis) {
      var searchData = window.__ResearchSearch.getData();
      var match = searchData.legislation.find(function(l) {
        return l.short_title && l.short_title.indexOf(data.statutoryBasis) !== -1;
      });
      if (match) self._openViewer('legislation', match);
    }
  }));
};

AilaneResearchPanel.prototype._openViewer = function(type, item) {
  this._navContainer.style.display = 'none';
  this._searchResultsEl.style.display = 'none';
  this._viewerContainer.style.display = 'flex';
  this._viewerContainer.style.flexDirection = 'column';
  this._viewerContainer.innerHTML = '';

  // Back button
  var self = this;
  var backBtn = document.createElement('button');
  backBtn.style.cssText = 'background:none;border:none;color:#38bdf8;cursor:pointer;padding:8px 14px;font-size:12px;text-align:left;';
  backBtn.textContent = '\u2190 Back to navigation';
  backBtn.addEventListener('click', function() {
    self._viewerContainer.style.display = 'none';
    self._navContainer.style.display = 'block';
  });
  this._viewerContainer.appendChild(backBtn);

  var viewerContent = document.createElement('div');
  viewerContent.style.cssText = 'flex:1;overflow-y:auto;';
  this._viewerContainer.appendChild(viewerContent);

  if (type === 'legislation') {
    window.__ResearchViewer.createStatuteViewer(viewerContent, item, this.bus);
  } else if (type === 'training') {
    window.__ResearchViewer.createTrainingViewer(viewerContent, item, this.bus);
  } else {
    window.__ResearchViewer.createRequirementViewer(viewerContent, item, this.bus);
  }
};

AilaneResearchPanel.prototype._openViewerById = function(type, id) {
  var searchData = window.__ResearchSearch.getData();
  var collection = type === 'legislation' ? searchData.legislation :
    type === 'training' ? searchData.training : searchData.requirements;
  var item = collection.find(function(i) { return i.id === id; });
  if (item) this._openViewer(type, item);
};

AilaneResearchPanel.prototype.unmount = function() {
  for (var i = 0; i < this._unsubs.length; i++) {
    if (typeof this._unsubs[i] === 'function') this._unsubs[i]();
  }
  this._unsubs = [];
  window.__ResearchNavigation.destroy();
  window.__ResearchViewer.destroy();
  window.__ResearchSearch.destroy();
  if (this.el) this.el.innerHTML = '';
};

// Global registration
window.__PanelResearch = AilaneResearchPanel;
