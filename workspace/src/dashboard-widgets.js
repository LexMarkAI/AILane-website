/**
 * AILANE KNOWLEDGE LIBRARY — DASHBOARD WIDGETS
 * KLUI-001 v1.0 · AMD-031 · Sprint 6a · §11.2
 *
 * Self-contained widget components for the account dashboard.
 * Each widget fetches its own data from Supabase REST endpoints
 * using the authenticated user's Bearer token.
 *
 * Exported API: window.__DashboardWidgets = { renderAll, destroy }
 */

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NDQ5MDIsImV4cCI6MjA1NzEyMDkwMn0.LMfOjHp97P9MKaOeaK3GI2JCQ7kj5Kxpuq6llLD-1H0';

var TIER_HIERARCHY = {
  operational: 1,
  operational_readiness: 1,
  governance: 2,
  enterprise: 3,
  institutional: 3  // AMD-123 G-4.1 transitional alias
};

// ============================================================================
// HELPER UTILITIES
// ============================================================================

function _authHeaders(user) {
  return {
    'Authorization': 'Bearer ' + user.token,
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
}

function _relativeTime(dateStr) {
  if (!dateStr) return '';
  var now = Date.now();
  var then = new Date(dateStr).getTime();
  var diff = now - then;
  var minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + 'm ago';
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  var days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  var months = Math.floor(days / 30);
  return months + 'mo ago';
}

function _formatDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function _truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '\u2026' : str;
}

function _scoreColourClass(score) {
  if (score === null || score === undefined) return '';
  if (score < 45) return 'ws-dashboard-stat-value--red';
  if (score < 75) return 'ws-dashboard-stat-value--amber';
  return 'ws-dashboard-stat-value--green';
}

function _emitPanelOpen(panelKey) {
  if (window.__contextBus) {
    window.__contextBus.emit('panel:open:' + panelKey, panelKey);
  }
}

function _skeleton(height) {
  var el = document.createElement('div');
  el.className = 'ws-dashboard-skeleton';
  el.style.height = (height || 40) + 'px';
  el.style.width = '100%';
  el.style.marginBottom = '8px';
  return el;
}

function _showSkeletons(container, count, height) {
  for (var i = 0; i < (count || 3); i++) {
    container.appendChild(_skeleton(height || 24));
  }
}

function _errorState(container, message, retryFn) {
  container.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.className = 'ws-dashboard-empty';
  wrap.innerHTML = '<p>' + (message || 'Unable to load data.') + '</p>';
  if (retryFn) {
    var retryBtn = document.createElement('button');
    retryBtn.className = 'ws-dashboard-quick-btn';
    retryBtn.textContent = 'Retry';
    retryBtn.style.marginTop = '8px';
    retryBtn.addEventListener('click', retryFn);
    wrap.appendChild(retryBtn);
  }
  container.appendChild(wrap);
}

// ============================================================================
// WIDGET 1: DOCUMENT VAULT SUMMARY
// ============================================================================
function _renderVaultWidget(container, user) {
  var card = document.createElement('div');
  card.className = 'ws-dashboard-card';

  // Title
  var title = document.createElement('div');
  title.className = 'ws-dashboard-card-title';
  title.innerHTML = 'Document Vault <a href="javascript:void(0)" class="ws-dashboard-card-link" aria-label="Open Document Vault panel">View All</a>';
  title.querySelector('.ws-dashboard-card-link').addEventListener('click', function() {
    _emitPanelOpen('vault');
  });
  card.appendChild(title);

  // Skeleton
  var content = document.createElement('div');
  _showSkeletons(content, 3, 20);
  card.appendChild(content);
  container.appendChild(card);

  // Fetch data
  var headers = _authHeaders(user);

  var vaultPromise = fetch(
    SUPABASE_URL + '/rest/v1/kl_vault_documents?user_id=eq.' + user.id + '&deleted_at=is.null&select=id,filename,created_at',
    { headers: headers }
  ).then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; });

  var uploadsPromise = fetch(
    SUPABASE_URL + '/rest/v1/compliance_uploads?user_id=eq.' + user.id + '&select=id,file_name,overall_score,check_date,findings_summary&order=check_date.desc',
    { headers: headers }
  ).then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; });

  Promise.all([vaultPromise, uploadsPromise]).then(function(results) {
    var vaultDocs = results[0] || [];
    var uploads = results[1] || [];
    content.innerHTML = '';

    if (vaultDocs.length === 0 && uploads.length === 0) {
      content.innerHTML =
        '<div class="ws-dashboard-empty">' +
          '<p>No documents uploaded yet. Upload your first contract to get started.</p>' +
          '<a href="/contract-scan/" class="ws-dashboard-empty-cta">Upload Contract</a>' +
        '</div>';
      return;
    }

    var totalDocs = vaultDocs.length;

    // Average compliance score
    var scores = uploads.filter(function(u) { return u.overall_score !== null && u.overall_score !== undefined; })
      .map(function(u) { return u.overall_score; });
    var avgScore = scores.length > 0 ? Math.round(scores.reduce(function(a, b) { return a + b; }, 0) / scores.length) : null;

    // Documents due for review (checked > 12 months ago)
    var twelveMonthsAgo = new Date(Date.now() - 365 * 86400000).toISOString();
    var dueForReview = uploads.filter(function(u) { return u.check_date && u.check_date < twelveMonthsAgo; }).length;

    // Critical findings count
    var criticalCount = 0;
    uploads.forEach(function(u) {
      if (u.findings_summary) {
        try {
          var summary = typeof u.findings_summary === 'string' ? JSON.parse(u.findings_summary) : u.findings_summary;
          if (summary.critical) criticalCount += summary.critical;
        } catch(e) { /* ignore */ }
      }
    });

    // Stats row
    var statsRow = document.createElement('div');
    statsRow.className = 'ws-dashboard-stat-row';

    // Total documents
    statsRow.innerHTML =
      '<div class="ws-dashboard-stat">' +
        '<span class="ws-dashboard-stat-value ws-dashboard-stat-value--teal">' + totalDocs + '</span>' +
        '<span class="ws-dashboard-stat-label">Documents</span>' +
      '</div>';

    if (avgScore !== null) {
      statsRow.innerHTML +=
        '<div class="ws-dashboard-stat">' +
          '<span class="ws-dashboard-stat-value ' + _scoreColourClass(avgScore) + '">' + avgScore + '%</span>' +
          '<span class="ws-dashboard-stat-label">Avg. Score</span>' +
        '</div>';
    }

    if (dueForReview > 0) {
      statsRow.innerHTML +=
        '<div class="ws-dashboard-stat">' +
          '<span class="ws-dashboard-stat-value ws-dashboard-stat-value--amber">' + dueForReview + '</span>' +
          '<span class="ws-dashboard-stat-label">Due for Review</span>' +
        '</div>';
    }

    if (criticalCount > 0) {
      statsRow.innerHTML +=
        '<div class="ws-dashboard-stat">' +
          '<span class="ws-dashboard-stat-value ws-dashboard-stat-value--red">' + criticalCount + '</span>' +
          '<span class="ws-dashboard-stat-label">Critical Findings</span>' +
        '</div>';
    }

    content.appendChild(statsRow);

    // Most urgent document
    if (uploads.length > 0) {
      var urgent = uploads.reduce(function(prev, curr) {
        var prevScore = prev.overall_score !== null ? prev.overall_score : 100;
        var currScore = curr.overall_score !== null ? curr.overall_score : 100;
        return currScore < prevScore ? curr : prev;
      });
      if (urgent.overall_score !== null && urgent.overall_score < 75) {
        var urgentEl = document.createElement('div');
        urgentEl.style.cssText = 'margin-top:12px;padding:8px 12px;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:6px;font-size:12px;color:#94a3b8;';
        urgentEl.innerHTML = 'Most urgent: <strong style="color:#e2e8f0;">' +
          _truncate(urgent.file_name || 'Untitled', 40) + '</strong> \u2014 ' +
          '<span style="color:' + (urgent.overall_score < 45 ? '#ef4444' : '#D97706') + ';font-weight:600;">' +
          urgent.overall_score + '%</span>';
        content.appendChild(urgentEl);
      }
    }
  }).catch(function() {
    _errorState(content, 'Unable to load vault data.', function() {
      content.innerHTML = '';
      _showSkeletons(content, 3, 20);
      _renderVaultWidget(container, user);
    });
  });
}

// ============================================================================
// WIDGET 2: COMPLIANCE CALENDAR STRIP
// ============================================================================
function _renderCalendarWidget(container, user) {
  var card = document.createElement('div');
  card.className = 'ws-dashboard-card ws-dashboard-card--full';

  var title = document.createElement('div');
  title.className = 'ws-dashboard-card-title';
  title.innerHTML = 'Compliance Calendar <a href="javascript:void(0)" class="ws-dashboard-card-link" aria-label="Open Calendar panel">View All</a>';
  title.querySelector('.ws-dashboard-card-link').addEventListener('click', function() {
    _emitPanelOpen('calendar');
  });
  card.appendChild(title);

  var content = document.createElement('div');
  _showSkeletons(content, 2, 32);
  card.appendChild(content);
  container.appendChild(card);

  var headers = _authHeaders(user);
  var today = new Date().toISOString().split('T')[0];
  var thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  var regPromise = fetch(
    SUPABASE_URL + '/rest/v1/regulatory_requirements?is_forward_requirement=eq.true&effective_from=not.is.null&select=id,name,source,effective_from,commencement_status',
    { headers: headers }
  ).then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; });

  var orgPromise = fetch(
    SUPABASE_URL + '/rest/v1/kl_calendar_events?user_id=eq.' + user.id + '&event_date=gte.' + today + '&event_date=lte.' + thirtyDays + '&status=eq.active&select=id,title,event_type,event_date&order=event_date.asc&limit=5',
    { headers: headers }
  ).then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; });

  Promise.all([regPromise, orgPromise]).then(function(results) {
    var regEvents = results[0] || [];
    var orgEvents = results[1] || [];
    content.innerHTML = '';

    // Merge and sort, take top 5
    var allEvents = [];

    regEvents.forEach(function(ev) {
      if (ev.effective_from) {
        allEvents.push({
          type: 'regulatory',
          date: ev.effective_from,
          title: _truncate(ev.name, 50),
          dotClass: 'ws-dashboard-timeline-dot--amber'
        });
      }
    });

    orgEvents.forEach(function(ev) {
      var dotClass = ev.event_type === 'review'
        ? 'ws-dashboard-timeline-dot--teal'
        : 'ws-dashboard-timeline-dot--navy';
      allEvents.push({
        type: ev.event_type || 'org',
        date: ev.event_date,
        title: _truncate(ev.title, 50),
        dotClass: dotClass
      });
    });

    allEvents.sort(function(a, b) { return a.date.localeCompare(b.date); });
    allEvents = allEvents.slice(0, 5);

    if (allEvents.length === 0) {
      content.innerHTML =
        '<div class="ws-dashboard-empty">' +
          '<p>Your compliance calendar is clear for the next 30 days.</p>' +
        '</div>';
      return;
    }

    var timeline = document.createElement('div');
    timeline.className = 'ws-dashboard-timeline';

    allEvents.forEach(function(ev) {
      var eventEl = document.createElement('div');
      eventEl.className = 'ws-dashboard-timeline-event';
      eventEl.setAttribute('tabindex', '0');
      eventEl.setAttribute('role', 'listitem');
      eventEl.addEventListener('click', function() {
        _emitPanelOpen('calendar');
      });

      var dotRow = document.createElement('div');
      dotRow.style.display = 'flex';
      dotRow.style.alignItems = 'center';
      dotRow.style.gap = '6px';

      var dot = document.createElement('span');
      dot.className = 'ws-dashboard-timeline-dot ' + ev.dotClass;
      dotRow.appendChild(dot);

      var dateEl = document.createElement('span');
      dateEl.className = 'ws-dashboard-timeline-date';
      dateEl.textContent = _formatDate(ev.date);
      dotRow.appendChild(dateEl);

      eventEl.appendChild(dotRow);

      var titleEl = document.createElement('span');
      titleEl.className = 'ws-dashboard-timeline-title';
      titleEl.textContent = ev.title;
      eventEl.appendChild(titleEl);

      timeline.appendChild(eventEl);
    });

    content.appendChild(timeline);
  }).catch(function() {
    _errorState(content, 'Unable to load calendar data.');
  });
}

// ============================================================================
// WIDGET 3: RECENT NOTES
// ============================================================================
function _renderNotesWidget(container, user) {
  var card = document.createElement('div');
  card.className = 'ws-dashboard-card';

  var title = document.createElement('div');
  title.className = 'ws-dashboard-card-title';
  title.innerHTML = 'Recent Notes <a href="javascript:void(0)" class="ws-dashboard-card-link" aria-label="Open Notes panel">View All</a>';
  title.querySelector('.ws-dashboard-card-link').addEventListener('click', function() {
    _emitPanelOpen('notes');
  });
  card.appendChild(title);

  var content = document.createElement('div');
  _showSkeletons(content, 3, 28);
  card.appendChild(content);
  container.appendChild(card);

  var headers = _authHeaders(user);

  fetch(
    SUPABASE_URL + '/rest/v1/kl_workspace_notes?user_id=eq.' + user.id + '&select=id,title,content_plain,updated_at&order=updated_at.desc&limit=3',
    { headers: headers }
  ).then(function(r) {
    if (!r.ok) throw new Error('Fetch failed');
    return r.json();
  }).then(function(notes) {
    content.innerHTML = '';

    if (!notes || notes.length === 0) {
      content.innerHTML =
        '<div class="ws-dashboard-empty">' +
          '<p>No notes yet. Open the Notes panel to start capturing your research.</p>' +
          '<a href="javascript:void(0)" class="ws-dashboard-empty-cta" onclick="if(window.__contextBus)window.__contextBus.emit(\'panel:open:notes\',\'notes\')">Open Notes</a>' +
        '</div>';
      return;
    }

    notes.forEach(function(note) {
      var item = document.createElement('div');
      item.className = 'ws-dashboard-list-item';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.addEventListener('click', function() {
        _emitPanelOpen('notes');
      });

      var info = document.createElement('div');
      info.style.flex = '1';
      info.style.minWidth = '0';

      var noteTitle = document.createElement('div');
      noteTitle.className = 'ws-dashboard-list-title';
      noteTitle.textContent = note.title || 'Untitled Note';
      info.appendChild(noteTitle);

      if (note.content_plain) {
        var preview = document.createElement('div');
        preview.className = 'ws-dashboard-list-preview';
        preview.textContent = _truncate(note.content_plain, 80);
        info.appendChild(preview);
      }

      item.appendChild(info);

      var meta = document.createElement('span');
      meta.className = 'ws-dashboard-list-meta';
      meta.textContent = _relativeTime(note.updated_at);
      item.appendChild(meta);

      content.appendChild(item);
    });
  }).catch(function() {
    _errorState(content, 'Unable to load notes.');
  });
}

// ============================================================================
// WIDGET 4: ACTIVE CONTRACT PLANS
// ============================================================================
function _renderPlansWidget(container, user) {
  var card = document.createElement('div');
  card.className = 'ws-dashboard-card';

  var title = document.createElement('div');
  title.className = 'ws-dashboard-card-title';
  title.innerHTML = 'Active Contract Plans <a href="javascript:void(0)" class="ws-dashboard-card-link" aria-label="Open Contract Planner panel">View All</a>';
  title.querySelector('.ws-dashboard-card-link').addEventListener('click', function() {
    _emitPanelOpen('planner');
  });
  card.appendChild(title);

  var content = document.createElement('div');
  card.appendChild(content);
  container.appendChild(card);

  // Tier gate: governance+ only
  var userTierLevel = TIER_HIERARCHY[user.tier] || 0;
  if (userTierLevel < 2) {
    card.style.position = 'relative';
    content.innerHTML =
      '<div class="ws-dashboard-locked">' +
        '<div class="ws-dashboard-locked-overlay">' +
          '<div class="ws-dashboard-locked-text">' +
            '<p>Contract Planner is available from Governance tier.</p>' +
            '<a href="/account/dashboard/" class="ws-dashboard-upgrade-btn">Upgrade</a>' +
          '</div>' +
        '</div>' +
        '<div style="height:80px;"></div>' +
      '</div>';
    return;
  }

  _showSkeletons(content, 3, 28);

  var headers = _authHeaders(user);

  fetch(
    SUPABASE_URL + '/rest/v1/kl_contract_plans?user_id=eq.' + user.id + '&status=eq.active&select=id,plan_name,current_step,contract_type,updated_at&order=updated_at.desc&limit=3',
    { headers: headers }
  ).then(function(r) {
    if (!r.ok) throw new Error('Fetch failed');
    return r.json();
  }).then(function(plans) {
    content.innerHTML = '';

    if (!plans || plans.length === 0) {
      content.innerHTML =
        '<div class="ws-dashboard-empty">' +
          '<p>No active contract plans. Start a new plan in the Contract Planner.</p>' +
          '<a href="javascript:void(0)" class="ws-dashboard-empty-cta" onclick="if(window.__contextBus)window.__contextBus.emit(\'panel:open:planner\',\'planner\')">Open Planner</a>' +
        '</div>';
      return;
    }

    plans.forEach(function(plan) {
      var item = document.createElement('div');
      item.className = 'ws-dashboard-list-item';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.addEventListener('click', function() {
        _emitPanelOpen('planner');
      });

      var info = document.createElement('div');
      info.style.flex = '1';
      info.style.minWidth = '0';

      var planTitle = document.createElement('div');
      planTitle.className = 'ws-dashboard-list-title';
      planTitle.textContent = plan.plan_name || 'Untitled Plan';
      info.appendChild(planTitle);

      var metaRow = document.createElement('div');
      metaRow.style.display = 'flex';
      metaRow.style.alignItems = 'center';
      metaRow.style.gap = '8px';
      metaRow.style.marginTop = '4px';

      if (plan.contract_type) {
        var typeEl = document.createElement('span');
        typeEl.className = 'ws-dashboard-list-meta';
        typeEl.textContent = plan.contract_type;
        metaRow.appendChild(typeEl);
      }

      var stepEl = document.createElement('span');
      stepEl.className = 'ws-dashboard-step-indicator';
      stepEl.textContent = 'Step ' + (plan.current_step || 1) + ' of 6';
      metaRow.appendChild(stepEl);

      info.appendChild(metaRow);
      item.appendChild(info);

      var meta = document.createElement('span');
      meta.className = 'ws-dashboard-list-meta';
      meta.textContent = _relativeTime(plan.updated_at);
      item.appendChild(meta);

      content.appendChild(item);
    });
  }).catch(function() {
    _errorState(content, 'Unable to load contract plans.');
  });
}

// ============================================================================
// WIDGET 5: EILEEN CONVERSATIONS
// ============================================================================
function _renderEileenWidget(container, user) {
  var card = document.createElement('div');
  card.className = 'ws-dashboard-card';

  var title = document.createElement('div');
  title.className = 'ws-dashboard-card-title';
  title.innerHTML = 'Eileen Conversations <a href="javascript:void(0)" class="ws-dashboard-card-link" aria-label="Open Eileen panel">View All</a>';
  title.querySelector('.ws-dashboard-card-link').addEventListener('click', function() {
    _emitPanelOpen('eileen');
  });
  card.appendChild(title);

  var content = document.createElement('div');
  _showSkeletons(content, 3, 28);
  card.appendChild(content);
  container.appendChild(card);

  var headers = _authHeaders(user);

  fetch(
    SUPABASE_URL + '/rest/v1/kl_chat_sessions?user_id=eq.' + user.id + '&select=id,title,message_count,topic_tags,updated_at&order=updated_at.desc&limit=3',
    { headers: headers }
  ).then(function(r) {
    if (!r.ok) throw new Error('Fetch failed');
    return r.json();
  }).then(function(sessions) {
    content.innerHTML = '';

    if (!sessions || sessions.length === 0) {
      content.innerHTML =
        '<div class="ws-dashboard-empty">' +
          '<p>No conversations yet. Ask Eileen about your employment law obligations.</p>' +
          '<a href="javascript:void(0)" class="ws-dashboard-empty-cta" onclick="if(window.__contextBus)window.__contextBus.emit(\'panel:open:eileen\',\'eileen\')">Ask Eileen</a>' +
        '</div>';
      return;
    }

    sessions.forEach(function(session) {
      var item = document.createElement('div');
      item.className = 'ws-dashboard-list-item';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.addEventListener('click', function() {
        _emitPanelOpen('eileen');
      });

      var info = document.createElement('div');
      info.style.flex = '1';
      info.style.minWidth = '0';

      var sessionTitle = document.createElement('div');
      sessionTitle.className = 'ws-dashboard-list-title';
      sessionTitle.textContent = session.title || 'Untitled Conversation';
      info.appendChild(sessionTitle);

      // Topic tags (first 2)
      if (session.topic_tags && session.topic_tags.length > 0) {
        var tagsRow = document.createElement('div');
        tagsRow.style.display = 'flex';
        tagsRow.style.gap = '6px';
        tagsRow.style.marginTop = '4px';
        var tags = Array.isArray(session.topic_tags) ? session.topic_tags : [];
        tags.slice(0, 2).forEach(function(tag) {
          var tagEl = document.createElement('span');
          tagEl.style.cssText = 'font-size:11px;padding:2px 6px;background:rgba(56,189,248,0.1);color:#38bdf8;border-radius:3px;';
          tagEl.textContent = tag;
          tagsRow.appendChild(tagEl);
        });
        info.appendChild(tagsRow);
      }

      item.appendChild(info);

      // Message count badge + time
      var rightCol = document.createElement('div');
      rightCol.style.display = 'flex';
      rightCol.style.alignItems = 'center';
      rightCol.style.gap = '8px';
      rightCol.style.flexShrink = '0';

      if (session.message_count) {
        var countBadge = document.createElement('span');
        countBadge.className = 'ws-dashboard-msg-count';
        countBadge.textContent = session.message_count;
        rightCol.appendChild(countBadge);
      }

      var meta = document.createElement('span');
      meta.className = 'ws-dashboard-list-meta';
      meta.textContent = _relativeTime(session.updated_at);
      rightCol.appendChild(meta);

      item.appendChild(rightCol);
      content.appendChild(item);
    });
  }).catch(function() {
    _errorState(content, 'Unable to load conversations.');
  });
}

// ============================================================================
// WIDGET 6: QUICK ACTIONS
// ============================================================================
function _renderQuickActions(container) {
  var card = document.createElement('div');
  card.className = 'ws-dashboard-card ws-dashboard-card--full';

  var title = document.createElement('div');
  title.className = 'ws-dashboard-card-title';
  title.textContent = 'Quick Actions';
  card.appendChild(title);

  var actions = document.createElement('div');
  actions.className = 'ws-dashboard-quick-actions';

  var actionDefs = [
    { label: 'New Note', icon: '\u270F\uFE0F', panel: 'notes' },
    { label: 'Ask Eileen', icon: '\uD83D\uDCAC', panel: 'eileen' },
    { label: 'Review Calendar', icon: '\uD83D\uDCC5', panel: 'calendar' },
    { label: 'Check a Contract', icon: '\uD83D\uDCCB', href: '/contract-scan/' },
    { label: 'Open Workspace', icon: '\uD83D\uDDA5\uFE0F', href: '/account/workspace/', primary: true }
  ];

  actionDefs.forEach(function(action) {
    if (action.href) {
      var link = document.createElement('a');
      link.className = 'ws-dashboard-quick-btn' + (action.primary ? ' ws-dashboard-quick-btn--primary' : '');
      link.href = action.href;
      link.setAttribute('aria-label', action.label);
      link.innerHTML = '<span>' + action.icon + '</span> ' + action.label;
      actions.appendChild(link);
    } else {
      var btn = document.createElement('button');
      btn.className = 'ws-dashboard-quick-btn';
      btn.setAttribute('aria-label', action.label);
      btn.innerHTML = '<span>' + action.icon + '</span> ' + action.label;
      btn.addEventListener('click', function() {
        _emitPanelOpen(action.panel);
      });
      actions.appendChild(btn);
    }
  });

  card.appendChild(actions);
  container.appendChild(card);
}

// ============================================================================
// RENDER ALL
// ============================================================================
function renderAll(container, user) {
  if (!container || !user) return;

  container.innerHTML = '';

  var grid = document.createElement('div');
  grid.className = 'ws-dashboard-grid';
  grid.setAttribute('role', 'region');
  grid.setAttribute('aria-label', 'Workspace activity widgets');

  container.appendChild(grid);

  // Widget 1: Document Vault Summary
  _renderVaultWidget(grid, user);

  // Widget 2: Compliance Calendar Strip (full width)
  _renderCalendarWidget(grid, user);

  // Widget 3: Recent Notes
  _renderNotesWidget(grid, user);

  // Widget 4: Active Contract Plans
  _renderPlansWidget(grid, user);

  // Widget 5: Eileen Conversations
  _renderEileenWidget(grid, user);

  // Widget 6: Quick Actions (full width)
  _renderQuickActions(grid);
}

// ============================================================================
// DESTROY
// ============================================================================
function destroyWidgets() {
  // No ongoing timers or listeners to clean up — widgets are DOM-only
}

// ============================================================================
// EXPORT
// ============================================================================
window.__DashboardWidgets = {
  renderAll: renderAll,
  destroy: destroyWidgets
};
