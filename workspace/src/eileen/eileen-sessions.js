/**
 * EILEEN SESSION MANAGER — KLUI-001 §3.4 / KLWS-001 §3.3
 * Session sidebar, CRUD, search, tier-based retention.
 * Sessions stored in kl_chat_sessions. Messages in kl_eileen_conversations.
 */

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NDQ5MDIsImV4cCI6MjA1NzEyMDkwMn0.LMfOjHp97P9MKaOeaK3GI2JCQ7kj5Kxpuq6llLD-1H0';

var _sidebarEl = null;
var _sessions = [];
var _activeSessionId = null;
var _onSessionSelect = null;
var _searchQuery = '';

function _authHeaders() {
  var user = window.__ailaneUser;
  return {
    'Authorization': 'Bearer ' + user.token,
    'apikey': ANON_KEY,
    'Content-Type': 'application/json'
  };
}

function _relativeTime(dateStr) {
  var now = Date.now();
  var then = new Date(dateStr).getTime();
  var diff = now - then;
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  var days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return days + ' days ago';
  var weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks + 'w ago';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function _isRetained(session) {
  var user = window.__ailaneUser;
  if (!user) return true;
  if (user.tier === 'governance' || user.tier === 'institutional') return true;
  // Operational: 30-day retention
  var thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return new Date(session.updated_at).getTime() > thirtyDaysAgo;
}

async function loadSessions() {
  var user = window.__ailaneUser;
  if (!user) return [];

  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/kl_chat_sessions?user_id=eq.' + user.id + '&order=updated_at.desc&limit=50',
      { headers: _authHeaders() }
    );
    _sessions = await res.json() || [];
  } catch (e) {
    console.error('[EileenSessions] Load error:', e);
    _sessions = [];
  }
  return _sessions;
}

async function createSession() {
  var user = window.__ailaneUser;
  if (!user) return null;

  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/kl_chat_sessions',
      {
        method: 'POST',
        headers: Object.assign({}, _authHeaders(), { 'Prefer': 'return=representation' }),
        body: JSON.stringify({
          user_id: user.id,
          title: 'New Conversation',
          page_context: 'workspace'
        })
      }
    );
    var data = await res.json();
    var session = Array.isArray(data) ? data[0] : data;
    if (session && session.id) {
      _sessions.unshift(session);
      _activeSessionId = session.id;
      _renderList();
    }
    return session;
  } catch (e) {
    console.error('[EileenSessions] Create error:', e);
    return null;
  }
}

async function updateSession(sessionId, updates) {
  try {
    await fetch(
      SUPABASE_URL + '/rest/v1/kl_chat_sessions?id=eq.' + sessionId,
      {
        method: 'PATCH',
        headers: Object.assign({}, _authHeaders(), { 'Prefer': 'return=minimal' }),
        body: JSON.stringify(updates)
      }
    );
    // Update local cache
    for (var i = 0; i < _sessions.length; i++) {
      if (_sessions[i].id === sessionId) {
        Object.assign(_sessions[i], updates);
        break;
      }
    }
    _renderList();
  } catch (e) {
    console.error('[EileenSessions] Update error:', e);
  }
}

async function deleteSession(sessionId) {
  if (!confirm('Are you sure you want to delete this conversation?')) return;

  try {
    await fetch(
      SUPABASE_URL + '/rest/v1/kl_chat_sessions?id=eq.' + sessionId,
      { method: 'DELETE', headers: _authHeaders() }
    );
    _sessions = _sessions.filter(function(s) { return s.id !== sessionId; });
    if (_activeSessionId === sessionId) {
      _activeSessionId = _sessions.length > 0 ? _sessions[0].id : null;
      if (_onSessionSelect && _activeSessionId) _onSessionSelect(_activeSessionId);
    }
    _renderList();
  } catch (e) {
    console.error('[EileenSessions] Delete error:', e);
  }
}

function selectSession(sessionId) {
  _activeSessionId = sessionId;
  _renderList();
  if (_onSessionSelect) _onSessionSelect(sessionId);
}

function _renderList() {
  if (!_sidebarEl) return;
  var listEl = _sidebarEl.querySelector('.ws-eileen-session-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  var filtered = _sessions;
  if (_searchQuery) {
    var q = _searchQuery.toLowerCase();
    filtered = _sessions.filter(function(s) {
      return (s.title && s.title.toLowerCase().indexOf(q) !== -1) ||
        (s.topic_tags && s.topic_tags.some(function(tag) { return tag.toLowerCase().indexOf(q) !== -1; }));
    });
  }

  filtered.forEach(function(session) {
    var item = document.createElement('div');
    item.className = 'ws-eileen-session-item';
    item.setAttribute('tabindex', '0');
    if (session.id === _activeSessionId) item.classList.add('ws-eileen-session-item--active');

    var retained = _isRetained(session);

    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight:500;color:' + (retained ? '#e2e8f0' : '#475569') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;';
    var displayTitle = session.title || 'New Conversation';
    if (displayTitle.length > 30) displayTitle = displayTitle.substring(0, 30) + '\u2026';
    titleEl.textContent = displayTitle;
    if (!retained) titleEl.textContent += ' (Archived)';
    item.appendChild(titleEl);

    var metaRow = document.createElement('div');
    metaRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:4px;';

    var timeEl = document.createElement('span');
    timeEl.style.cssText = 'font-size:11px;color:#64748b;';
    timeEl.textContent = _relativeTime(session.updated_at);
    metaRow.appendChild(timeEl);

    if (session.message_count > 0) {
      var countBadge = document.createElement('span');
      countBadge.style.cssText = 'font-size:10px;color:#94a3b8;background:#1e293b;padding:1px 6px;border-radius:8px;';
      countBadge.textContent = session.message_count;
      metaRow.appendChild(countBadge);
    }

    item.appendChild(metaRow);

    item.addEventListener('click', function() { selectSession(session.id); });
    item.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') selectSession(session.id);
    });

    // Right-click / long-press delete
    item.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      deleteSession(session.id);
    });

    listEl.appendChild(item);
  });
}

function init(options) {
  _sidebarEl = options.sidebarEl;
  _onSessionSelect = options.onSessionSelect;
  _activeSessionId = options.activeSessionId || null;

  var user = window.__ailaneUser;

  // KL Pass: no saved sessions
  if (user && user.tier === 'per_session') {
    _sidebarEl.style.display = 'none';
    return;
  }

  // New conversation button
  var newBtn = document.createElement('button');
  newBtn.className = 'ws-eileen-send-btn';
  newBtn.style.cssText = 'width:100%;margin-bottom:8px;font-size:12px;padding:8px;';
  newBtn.textContent = '+ New Conversation';
  newBtn.addEventListener('click', function() { createSession(); });
  _sidebarEl.appendChild(newBtn);

  // Search input
  var searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'ws-eileen-input';
  searchInput.style.cssText = 'width:100%;box-sizing:border-box;font-size:12px;padding:6px 10px;margin-bottom:8px;';
  searchInput.placeholder = 'Search sessions\u2026';
  var searchTimer = null;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      _searchQuery = searchInput.value.trim();
      _renderList();
    }, 300);
  });
  _sidebarEl.appendChild(searchInput);

  // Session list container
  var listEl = document.createElement('div');
  listEl.className = 'ws-eileen-session-list';
  listEl.style.cssText = 'flex:1;overflow-y:auto;';
  _sidebarEl.appendChild(listEl);

  // Load sessions
  loadSessions().then(function() {
    _renderList();
  });
}

function getActiveSessionId() {
  return _activeSessionId;
}

function setActiveSessionId(id) {
  _activeSessionId = id;
  _renderList();
}

function destroy() {
  _sidebarEl = null;
  _sessions = [];
  _activeSessionId = null;
  _onSessionSelect = null;
  _searchQuery = '';
}

window.__EileenSessions = {
  init: init,
  createSession: createSession,
  loadSessions: loadSessions,
  selectSession: selectSession,
  updateSession: updateSession,
  getActiveSessionId: getActiveSessionId,
  setActiveSessionId: setActiveSessionId,
  destroy: destroy
};
