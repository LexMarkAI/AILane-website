/**
 * RESEARCH NAVIGATION — KLUI-001 §3.5
 * Three-level hierarchy: 12 ACEI categories → topics → content.
 * Data sources: legislation_library, kl_training_resources, regulatory_requirements.
 */

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NDQ5MDIsImV4cCI6MjA1NzEyMDkwMn0.LMfOjHp97P9MKaOeaK3GI2JCQ7kj5Kxpuq6llLD-1H0';

var ACEI_CATEGORIES = [
  { id: 1,  key: 'unfair_dismissal',          label: 'Unfair Dismissal',             icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>' },
  { id: 2,  key: 'discrimination_harassment',  label: 'Discrimination & Harassment',   icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>' },
  { id: 3,  key: 'wages_working_time',         label: 'Wages & Working Time',          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
  { id: 4,  key: 'health_safety',              label: 'Health & Safety',               icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  { id: 5,  key: 'whistleblowing',             label: 'Whistleblowing',                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>' },
  { id: 6,  key: 'equal_pay',                  label: 'Equal Pay',                     icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
  { id: 7,  key: 'family_parental',            label: 'Family & Parental Rights',      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { id: 8,  key: 'tupe',                       label: 'TUPE Transfers',                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><line x1="21" y1="3" x2="14" y2="10"/><polyline points="9 21 3 21 3 15"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' },
  { id: 9,  key: 'contractual_disputes',        label: 'Contractual Disputes',          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
  { id: 10, key: 'data_protection',            label: 'Data Protection',               icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' },
  { id: 11, key: 'trade_union',                label: 'Trade Union Rights',            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>' },
  { id: 12, key: 'redundancy',                 label: 'Redundancy',                    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' }
];

// Category keyword mapping for filtering regulatory_requirements
var CATEGORY_KEYWORDS = {
  'unfair_dismissal': ['dismissal', 'unfair dismissal', 'termination', 'notice period'],
  'discrimination_harassment': ['discrimination', 'harassment', 'equality', 'protected characteristic'],
  'wages_working_time': ['wages', 'pay', 'working time', 'hours', 'holiday', 'minimum wage', 'national living wage'],
  'health_safety': ['health', 'safety', 'risk assessment', 'workplace safety'],
  'whistleblowing': ['whistleblow', 'disclosure', 'protected disclosure'],
  'equal_pay': ['equal pay', 'pay gap', 'gender pay'],
  'family_parental': ['maternity', 'paternity', 'parental', 'family', 'adoption', 'shared parental'],
  'tupe': ['tupe', 'transfer of undertakings', 'business transfer'],
  'contractual_disputes': ['contract', 'breach', 'terms', 'variation', 'written particulars', 'statement of particulars'],
  'data_protection': ['data protection', 'gdpr', 'privacy', 'personal data', 'subject access'],
  'trade_union': ['trade union', 'collective', 'recognition', 'industrial action'],
  'redundancy': ['redundancy', 'collective consultation', 'selection criteria']
};

var _container = null;
var _bus = null;
var _onViewContent = null;
var _currentLevel = 1;
var _currentCategory = null;
var _activeTab = 'legislation';

// Data caches
var _legislationCache = {};
var _trainingCache = {};
var _requirementsCache = null;

function _authHeaders() {
  var user = window.__ailaneUser;
  return {
    'Authorization': 'Bearer ' + user.token,
    'apikey': ANON_KEY,
    'Content-Type': 'application/json'
  };
}

function _renderBreadcrumb(container, categoryLabel) {
  var bc = document.createElement('div');
  bc.className = 'ws-research-breadcrumb';

  var home = document.createElement('a');
  home.textContent = 'Home';
  home.addEventListener('click', function() { _renderCategories(); });
  bc.appendChild(home);

  if (categoryLabel) {
    var sep = document.createElement('span');
    sep.textContent = ' \u203A ';
    bc.appendChild(sep);

    var cat = document.createElement('span');
    cat.style.color = '#e2e8f0';
    cat.textContent = categoryLabel;
    bc.appendChild(cat);
  }

  container.insertBefore(bc, container.firstChild);
}

function _renderCategories() {
  _currentLevel = 1;
  _currentCategory = null;
  _container.innerHTML = '';

  var grid = document.createElement('div');
  grid.className = 'ws-research-categories';

  ACEI_CATEGORIES.forEach(function(cat) {
    var card = document.createElement('div');
    card.className = 'ws-research-category-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', cat.label);

    var iconEl = document.createElement('div');
    iconEl.style.cssText = 'width:24px;height:24px;color:#0A5C52;';
    iconEl.innerHTML = cat.icon;
    card.appendChild(iconEl);

    var labelEl = document.createElement('div');
    labelEl.className = 'ws-research-category-label';
    labelEl.textContent = cat.label;
    card.appendChild(labelEl);

    var countEl = document.createElement('div');
    countEl.className = 'ws-research-category-count';
    countEl.textContent = 'Loading\u2026';
    card.appendChild(countEl);

    card.addEventListener('click', function() { _openCategory(cat); });
    card.addEventListener('keydown', function(e) { if (e.key === 'Enter') _openCategory(cat); });

    grid.appendChild(card);

    // Async count fetch
    _fetchCategoryCount(cat, countEl);
  });

  _container.appendChild(grid);
}

async function _fetchCategoryCount(cat, countEl) {
  try {
    var legRes = await fetch(
      SUPABASE_URL + '/rest/v1/legislation_library?primary_acei_category=eq.' + cat.id + '&select=id',
      { headers: _authHeaders() }
    );
    var legData = await legRes.json() || [];

    var trainRes = await fetch(
      SUPABASE_URL + '/rest/v1/kl_training_resources?primary_acei_category=eq.' + cat.key + '&is_published=eq.true&select=id',
      { headers: _authHeaders() }
    );
    var trainData = await trainRes.json() || [];

    countEl.textContent = (legData.length + trainData.length) + ' items';
  } catch (e) {
    countEl.textContent = '';
  }
}

async function _openCategory(cat) {
  _currentLevel = 2;
  _currentCategory = cat;
  _activeTab = 'legislation';
  _container.innerHTML = '';

  _renderBreadcrumb(_container, cat.label);

  // Tab row
  var tabs = document.createElement('div');
  tabs.className = 'ws-research-tabs';
  var tabDefs = [
    { key: 'legislation', label: 'Legislation' },
    { key: 'training', label: 'Training' },
    { key: 'requirements', label: 'Requirements' }
  ];

  tabDefs.forEach(function(td) {
    var tab = document.createElement('button');
    tab.className = 'ws-research-tab' + (td.key === _activeTab ? ' ws-research-tab--active' : '');
    tab.textContent = td.label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', td.key === _activeTab ? 'true' : 'false');
    tab.addEventListener('click', function() {
      _activeTab = td.key;
      _openCategory(cat);
    });
    tabs.appendChild(tab);
  });
  _container.appendChild(tabs);

  // Content area
  var contentArea = document.createElement('div');
  contentArea.style.cssText = 'flex:1;overflow-y:auto;';
  contentArea.innerHTML = '<div style="padding:16px;color:#64748b;font-size:13px;">Loading\u2026</div>';
  _container.appendChild(contentArea);

  if (_activeTab === 'legislation') {
    await _loadLegislation(cat, contentArea);
  } else if (_activeTab === 'training') {
    await _loadTraining(cat, contentArea);
  } else {
    await _loadRequirements(cat, contentArea);
  }
}

async function _loadLegislation(cat, contentArea) {
  try {
    if (!_legislationCache[cat.id]) {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/legislation_library?primary_acei_category=eq.' + cat.id + '&select=id,short_title,legislation_type,lifecycle_stage,tier_access,summary,legislation_gov_url&order=short_title.asc',
        { headers: _authHeaders() }
      );
      _legislationCache[cat.id] = await res.json() || [];
    }
    _renderItemList(contentArea, _legislationCache[cat.id], 'legislation');
  } catch (e) {
    contentArea.innerHTML = '<p style="padding:16px;color:#991B1B;">Unable to load legislation data.</p>';
  }
}

async function _loadTraining(cat, contentArea) {
  try {
    if (!_trainingCache[cat.key]) {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/kl_training_resources?primary_acei_category=eq.' + cat.key + '&is_published=eq.true&select=id,title,slug,content_type,publisher_body,source_licence,word_count,estimated_read_minutes,attribution_statement&order=sort_order.asc',
        { headers: _authHeaders() }
      );
      _trainingCache[cat.key] = await res.json() || [];
    }
    _renderItemList(contentArea, _trainingCache[cat.key], 'training');
  } catch (e) {
    contentArea.innerHTML = '<p style="padding:16px;color:#991B1B;">Unable to load training resources.</p>';
  }
}

async function _loadRequirements(cat, contentArea) {
  try {
    if (!_requirementsCache) {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/regulatory_requirements?select=id,name,source,description,category,applies_to,is_forward_requirement,effective_from,commencement_status,pillar_mapping&order=name.asc',
        { headers: _authHeaders() }
      );
      _requirementsCache = await res.json() || [];
    }

    // Filter by category keywords
    var keywords = CATEGORY_KEYWORDS[cat.key] || [];
    var filtered = _requirementsCache.filter(function(req) {
      var text = ((req.name || '') + ' ' + (req.source || '') + ' ' + (req.description || '')).toLowerCase();
      return keywords.some(function(kw) { return text.indexOf(kw) !== -1; });
    });

    _renderItemList(contentArea, filtered, 'requirement');
  } catch (e) {
    contentArea.innerHTML = '<p style="padding:16px;color:#991B1B;">Unable to load requirements data.</p>';
  }
}

function _getTypeBadge(type) {
  var badges = {
    'primary': { cls: 'ws-research-badge--primary', label: 'Primary' },
    'statutory_instrument': { cls: 'ws-research-badge--si', label: 'Statutory Instrument' },
    'binding_code': { cls: 'ws-research-badge--code', label: 'Binding Code' },
    'written_guide': { cls: 'ws-research-badge--guide', label: 'Written Guide' },
    'factsheet': { cls: 'ws-research-badge--factsheet', label: 'Factsheet' }
  };
  return badges[type] || { cls: '', label: type || '' };
}

function _renderItemList(contentArea, items, type) {
  contentArea.innerHTML = '';

  if (!items || items.length === 0) {
    contentArea.innerHTML = '<div style="padding:40px 16px;text-align:center;color:#64748b;font-size:13px;">No items found in this category.</div>';
    return;
  }

  items.forEach(function(item) {
    var row = document.createElement('div');
    row.className = 'ws-research-item';
    row.setAttribute('tabindex', '0');
    row.setAttribute('role', 'button');

    var titleEl = document.createElement('div');
    titleEl.className = 'ws-research-item-title';

    if (type === 'legislation') {
      titleEl.textContent = item.short_title || 'Untitled';

      var metaEl = document.createElement('div');
      metaEl.className = 'ws-research-item-meta';
      var badgeInfo = _getTypeBadge(item.legislation_type);
      metaEl.innerHTML = '<span class="ws-research-badge ' + badgeInfo.cls + '">' + badgeInfo.label + '</span>';

      // Forward intelligence marker
      if (item.lifecycle_stage && item.lifecycle_stage !== 'in_force') {
        metaEl.innerHTML += ' <span class="ws-research-badge ws-research-badge--forward">Not yet in force</span>';
      }

      if (item.summary) {
        var preview = document.createElement('div');
        preview.style.cssText = 'font-size:12px;color:#94a3b8;margin-top:4px;line-height:1.4;';
        preview.textContent = item.summary.length > 80 ? item.summary.substring(0, 80) + '\u2026' : item.summary;
        row.appendChild(titleEl);
        row.appendChild(metaEl);
        row.appendChild(preview);
      } else {
        row.appendChild(titleEl);
        row.appendChild(metaEl);
      }

      row.addEventListener('click', function() { if (_onViewContent) _onViewContent('legislation', item); });

    } else if (type === 'training') {
      titleEl.textContent = item.title || 'Untitled';

      var trainMeta = document.createElement('div');
      trainMeta.className = 'ws-research-item-meta';
      var ctBadge = _getTypeBadge(item.content_type);
      trainMeta.innerHTML = '<span class="ws-research-badge ' + ctBadge.cls + '">' + ctBadge.label + '</span>';
      if (item.publisher_body) trainMeta.innerHTML += ' <span style="color:#94a3b8;">' + item.publisher_body + '</span>';
      if (item.estimated_read_minutes) trainMeta.innerHTML += ' <span style="color:#64748b;">\u00b7 ' + item.estimated_read_minutes + ' min read</span>';

      row.appendChild(titleEl);
      row.appendChild(trainMeta);

      row.addEventListener('click', function() { if (_onViewContent) _onViewContent('training', item); });

    } else {
      titleEl.textContent = item.name || 'Untitled';

      var reqMeta = document.createElement('div');
      reqMeta.className = 'ws-research-item-meta';
      if (item.source) reqMeta.innerHTML = '<span style="color:#94a3b8;">' + item.source + '</span>';
      if (item.applies_to) reqMeta.innerHTML += ' <span class="ws-research-badge ws-research-badge--primary">' + item.applies_to + '</span>';
      if (item.is_forward_requirement) {
        reqMeta.innerHTML += ' <span class="ws-research-badge ws-research-badge--forward">Forward</span>';
      }

      row.appendChild(titleEl);
      row.appendChild(reqMeta);

      row.addEventListener('click', function() { if (_onViewContent) _onViewContent('requirement', item); });
    }

    row.addEventListener('keydown', function(e) { if (e.key === 'Enter') row.click(); });
    contentArea.appendChild(row);
  });
}

function create(options) {
  _container = options.container;
  _bus = options.bus;
  _onViewContent = options.onViewContent;
  _renderCategories();
}

function navigateToCategory(categoryKey) {
  var cat = ACEI_CATEGORIES.find(function(c) { return c.key === categoryKey; });
  if (cat) _openCategory(cat);
}

function navigateHome() {
  _renderCategories();
}

function destroy() {
  _container = null;
  _bus = null;
  _onViewContent = null;
  _legislationCache = {};
  _trainingCache = {};
  _requirementsCache = null;
}

window.__ResearchNavigation = {
  create: create,
  destroy: destroy,
  navigateToCategory: navigateToCategory,
  navigateHome: navigateHome,
  ACEI_CATEGORIES: ACEI_CATEGORIES
};
