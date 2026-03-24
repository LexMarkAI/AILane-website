/**
 * RESEARCH SEARCH — KLUI-001 §3.5
 * Full-text search across legislation_library, kl_training_resources,
 * and regulatory_requirements. Client-side search with pre-fetched data.
 */

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NDQ5MDIsImV4cCI6MjA1NzEyMDkwMn0.LMfOjHp97P9MKaOeaK3GI2JCQ7kj5Kxpuq6llLD-1H0';

var _legislation = [];
var _training = [];
var _requirements = [];
var _loaded = false;
var _onResultClick = null;

function _authHeaders() {
  var user = window.__ailaneUser;
  return {
    'Authorization': 'Bearer ' + user.token,
    'apikey': ANON_KEY,
    'Content-Type': 'application/json'
  };
}

async function _prefetch() {
  if (_loaded) return;
  var user = window.__ailaneUser;
  if (!user) return;

  try {
    var legP = fetch(
      SUPABASE_URL + '/rest/v1/legislation_library?select=id,short_title,summary,key_provisions,legislation_type,lifecycle_stage&order=short_title.asc',
      { headers: _authHeaders() }
    );
    var trainP = fetch(
      SUPABASE_URL + '/rest/v1/kl_training_resources?is_published=eq.true&select=id,title,content_type,publisher_body,estimated_read_minutes,source_licence&order=sort_order.asc',
      { headers: _authHeaders() }
    );
    var reqP = fetch(
      SUPABASE_URL + '/rest/v1/regulatory_requirements?select=id,name,source,description,is_forward_requirement,effective_from&order=name.asc',
      { headers: _authHeaders() }
    );

    var results = await Promise.all([legP, trainP, reqP]);
    _legislation = await results[0].json() || [];
    _training = await results[1].json() || [];
    _requirements = await results[2].json() || [];
    _loaded = true;
  } catch (e) {
    console.error('[ResearchSearch] Prefetch error:', e);
  }
}

function _search(query) {
  if (!query || query.length < 2) return [];
  var q = query.toLowerCase();
  var results = [];

  // Search legislation
  _legislation.forEach(function(item) {
    var titleScore = (item.short_title || '').toLowerCase().indexOf(q) !== -1 ? 3 : 0;
    var summaryScore = (item.summary || '').toLowerCase().indexOf(q) !== -1 ? 2 : 0;
    var contentScore = (item.key_provisions || '').toLowerCase().indexOf(q) !== -1 ? 1 : 0;
    var total = titleScore + summaryScore + contentScore;
    if (total > 0) {
      var matchField = titleScore ? 'title' : summaryScore ? 'summary' : 'content';
      var matchText = titleScore ? item.short_title : summaryScore ? item.summary : item.key_provisions;
      results.push({ type: 'legislation', item: item, score: total, matchField: matchField, matchText: matchText || '' });
    }
  });

  // Search training
  _training.forEach(function(item) {
    var titleScore = (item.title || '').toLowerCase().indexOf(q) !== -1 ? 3 : 0;
    if (titleScore > 0) {
      results.push({ type: 'training', item: item, score: titleScore, matchField: 'title', matchText: item.title || '' });
    }
  });

  // Search requirements
  _requirements.forEach(function(item) {
    var nameScore = (item.name || '').toLowerCase().indexOf(q) !== -1 ? 3 : 0;
    var descScore = (item.description || '').toLowerCase().indexOf(q) !== -1 ? 2 : 0;
    var sourceScore = (item.source || '').toLowerCase().indexOf(q) !== -1 ? 1 : 0;
    var total = nameScore + descScore + sourceScore;
    if (total > 0) {
      var matchField = nameScore ? 'name' : descScore ? 'description' : 'source';
      var matchText = nameScore ? item.name : descScore ? item.description : item.source;
      results.push({ type: 'requirement', item: item, score: total, matchField: matchField, matchText: matchText || '' });
    }
  });

  // Sort by score descending
  results.sort(function(a, b) { return b.score - a.score; });
  return results;
}

function _highlightMatch(text, query) {
  if (!text || !query) return text || '';
  var idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  var start = Math.max(0, idx - 30);
  var end = Math.min(text.length, idx + query.length + 30);
  var snippet = (start > 0 ? '\u2026' : '') +
    text.substring(start, idx) +
    '<span class="ws-research-search-highlight">' + text.substring(idx, idx + query.length) + '</span>' +
    text.substring(idx + query.length, end) +
    (end < text.length ? '\u2026' : '');
  return snippet;
}

function renderResults(container, query, onResultClick) {
  _onResultClick = onResultClick;
  container.innerHTML = '';

  if (!query || query.length < 2) {
    container.innerHTML = '<div style="padding:16px;color:#64748b;font-size:13px;">Type at least 2 characters to search.</div>';
    return;
  }

  var results = _search(query);

  if (results.length === 0) {
    container.innerHTML = '<div style="padding:16px;color:#64748b;font-size:13px;">No results found for \u201c' + query + '\u201d</div>';
    return;
  }

  // Group by type
  var groups = { legislation: [], training: [], requirement: [] };
  results.forEach(function(r) { groups[r.type].push(r); });

  var groupLabels = {
    legislation: 'Legislation',
    training: 'Training Resources',
    requirement: 'Requirements'
  };

  Object.keys(groups).forEach(function(type) {
    if (groups[type].length === 0) return;

    var groupHeader = document.createElement('div');
    groupHeader.className = 'ws-research-search-group';
    groupHeader.textContent = groupLabels[type] + ' (' + groups[type].length + ')';
    container.appendChild(groupHeader);

    groups[type].forEach(function(result) {
      var row = document.createElement('div');
      row.className = 'ws-research-item';
      row.setAttribute('tabindex', '0');
      row.style.cursor = 'pointer';

      var titleEl = document.createElement('div');
      titleEl.className = 'ws-research-item-title';
      titleEl.textContent = result.item.short_title || result.item.title || result.item.name || '';
      row.appendChild(titleEl);

      var metaEl = document.createElement('div');
      metaEl.className = 'ws-research-item-meta';
      var typeBadge = type === 'legislation' ? 'ws-research-badge--primary' :
        type === 'training' ? 'ws-research-badge--guide' : 'ws-research-badge--si';
      metaEl.innerHTML = '<span class="ws-research-badge ' + typeBadge + '">' + groupLabels[type].replace(' Resources', '') + '</span>' +
        ' <span style="color:#64748b;font-size:11px;">Matched in ' + result.matchField + '</span>';
      row.appendChild(metaEl);

      // Preview snippet with highlight
      var snippetEl = document.createElement('div');
      snippetEl.style.cssText = 'font-size:12px;color:#94a3b8;margin-top:4px;line-height:1.4;';
      snippetEl.innerHTML = _highlightMatch(result.matchText, query);
      row.appendChild(snippetEl);

      row.addEventListener('click', function() {
        if (_onResultClick) _onResultClick(type, result.item);
      });
      row.addEventListener('keydown', function(e) { if (e.key === 'Enter') row.click(); });

      container.appendChild(row);
    });
  });
}

function init(options) {
  _onResultClick = options ? options.onResultClick : null;
  _prefetch();
}

function getData() {
  return { legislation: _legislation, training: _training, requirements: _requirements };
}

function destroy() {
  _legislation = [];
  _training = [];
  _requirements = [];
  _loaded = false;
  _onResultClick = null;
}

window.__ResearchSearch = {
  init: init,
  renderResults: renderResults,
  getData: getData,
  destroy: destroy
};
