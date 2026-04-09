/**
 * COMPLIANCE CALENDAR PANEL — Sprint 2 + Sprint 4b
 * KLUI-001 §3.8
 *
 * Three views: List (Sprint 2), Month grid (Sprint 4b), Timeline (Sprint 4b).
 * Event sources: regulatory_requirements, kl_vault_documents + compliance_uploads,
 * kl_calendar_events (organisation events — Sprint 4b).
 *
 * Constitutional compliance:
 * - Calendar displays regulatory facts, not index outputs (ACEI Art. I §1.5)
 * - Forward events do not affect current compliance scores (FWD-001)
 * - Document review events derived from Vault metadata only (separation doctrine)
 * - Organisation events are client-created, not regulatory facts
 */

import { renderMonthView, renderDayDetail } from './calendar/calendar-month.js';
import { renderTimelineView } from './calendar/calendar-timeline.js';
import { renderEventForm, fetchOrgEvents } from './calendar/calendar-crud.js';
import { downloadICal } from './calendar/calendar-ical.js';

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Colour mapping per KLUI-001 §3.8
var EVENT_COLOURS = {
  'regulatory': '#D97706',
  'review': '#0A5C52',
  'organisation': '#0A2342',
  'tribunal': '#DC2626'
};

class AilaneCalendarPanel {
  constructor(container, bus) {
    this.bus = bus;
    this.events = [];
    this._mergedEvents = [];
    this.el = null;
    this.expandedEventId = null;
    this._currentView = 'list';
    this._monthYear = null;
    this._monthMonth = null;
    this._orgEvents = [];
  }

  async mount(container) {
    this.el = container;
    this.el.innerHTML = '<div class="ws-skeleton" style="height:200px;margin:16px;"></div>';

    // Restore view preference
    if (window.__ailaneWorkspace && window.__ailaneWorkspace.prefs) {
      var saved = window.__ailaneWorkspace.prefs.get('calendarView');
      if (saved && (saved === 'list' || saved === 'month' || saved === 'timeline')) {
        this._currentView = saved;
      }
    }

    var now = new Date();
    this._monthYear = now.getFullYear();
    this._monthMonth = now.getMonth();

    try {
      await this._loadEvents();
      await this._loadOrgEvents();
      this._mergeAllEvents();
      this._updateDeadlineBadge();
      this._render();
    } catch(e) {
      console.error('[Calendar] Load error:', e);
      this.el.innerHTML = '<p style="padding:16px;color:#991B1B;">Unable to load calendar events. Please try again.</p>';
    }
  }

  async _loadEvents() {
    var user = window.__ailaneUser;
    if (!user) return;

    this.events = [];

    // 1. Regulatory events — forward requirements with effective dates
    try {
      var regRes = await fetch(
        SUPABASE_URL + '/rest/v1/regulatory_requirements?is_forward_requirement=eq.true&effective_from=not.is.null&order=effective_from.asc',
        {
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      var regData = await regRes.json();
      var self = this;
      (regData || []).forEach(function(req) {
        self.events.push({
          id: 'reg_' + req.id,
          type: 'regulatory',
          title: req.requirement_name,
          date: req.effective_from,
          sourceAct: req.source_act || '',
          commencementStatus: req.commencement_status || '',
          commencementNote: req.commencement_note || '',
          description: req.description || '',
          statutoryBasis: req.statutory_basis || '',
          isForward: true,
          editable: false
        });
      });
    } catch(e) {
      console.error('[Calendar] Regulatory events load error:', e);
    }

    // 2. Document review events — 12 months after last compliance check
    try {
      // Fetch vault documents
      var vaultRes = await fetch(
        SUPABASE_URL + '/rest/v1/kl_vault_documents?user_id=eq.' + user.id + '&deleted_at=is.null&select=id,filename',
        {
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      var vaultDocs = await vaultRes.json() || [];

      // Fetch compliance uploads for score + date
      var uploadsRes = await fetch(
        SUPABASE_URL + '/rest/v1/compliance_uploads?user_id=eq.' + user.id + '&status=eq.complete&order=created_at.desc',
        {
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      var uploads = await uploadsRes.json() || [];

      // Tier-based limit for document review events
      var reviewLimit = (user.tier === 'governance' || user.tier === 'institutional') ? Infinity : 5;
      var reviewCount = 0;

      var self = this;
      vaultDocs.forEach(function(doc) {
        if (reviewCount >= reviewLimit) return;

        var matchingUpload = uploads.find(function(u) {
          return u.file_name === doc.filename || u.display_name === doc.filename;
        });

        if (matchingUpload) {
          var checkDate = new Date(matchingUpload.created_at);
          var reviewDate = new Date(checkDate);
          reviewDate.setFullYear(reviewDate.getFullYear() + 1);

          self.events.push({
            id: 'review_' + doc.id,
            type: 'review',
            title: 'Contract review due: ' + doc.filename,
            date: reviewDate.toISOString().split('T')[0],
            documentName: doc.filename,
            lastCheckScore: Number(matchingUpload.overall_score),
            lastCheckDate: matchingUpload.created_at,
            editable: false
          });

          reviewCount++;
        }
      });
    } catch(e) {
      console.error('[Calendar] Document review events load error:', e);
    }

    // Sort all events by date ascending
    this.events.sort(function(a, b) {
      return new Date(a.date) - new Date(b.date);
    });
  }

  async _loadOrgEvents() {
    var user = window.__ailaneUser;
    if (!user) return;
    try {
      this._orgEvents = await fetchOrgEvents(user);
    } catch(e) {
      console.error('[Calendar] Org events load error:', e);
      this._orgEvents = [];
    }
  }

  _mergeAllEvents() {
    var merged = [];

    // Regulatory + Review events (from this.events — Sprint 2 format)
    this.events.forEach(function(ev) {
      merged.push({
        id: ev.id,
        title: ev.title,
        date: ev.date,
        endDate: null,
        description: ev.description || null,
        eventType: ev.type,
        colour: EVENT_COLOURS[ev.type] || '#6B7280',
        statutoryBasis: ev.statutoryBasis || null,
        sourceAct: ev.sourceAct || null,
        commencementStatus: ev.commencementStatus || null,
        commencementNote: ev.commencementNote || null,
        documentId: null,
        documentName: ev.documentName || null,
        documentScore: ev.lastCheckScore !== undefined ? ev.lastCheckScore : null,
        isEditable: false,
        // Preserve original fields for List view detail rendering
        _original: ev
      });
    });

    // Organisation events (from kl_calendar_events)
    (this._orgEvents || []).forEach(function(org) {
      merged.push({
        id: org.id,
        title: org.title,
        date: org.event_date,
        endDate: org.end_date || null,
        description: org.description || null,
        eventType: 'organisation',
        colour: EVENT_COLOURS['organisation'],
        statutoryBasis: null,
        sourceAct: null,
        commencementStatus: null,
        commencementNote: null,
        documentId: org.linked_document_id || null,
        documentName: null,
        documentScore: null,
        isEditable: true,
        _orgData: org
      });
    });

    // Sort by date
    merged.sort(function(a, b) {
      return new Date(a.date) - new Date(b.date);
    });

    this._mergedEvents = merged;
  }

  _updateDeadlineBadge() {
    var now = new Date();
    var sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    var urgentCount = this._mergedEvents.filter(function(e) {
      var d = new Date(e.date + 'T00:00:00');
      return d >= now && d <= sevenDays;
    }).length;
    if (urgentCount > 0) {
      if (window.__setRailBadge) window.__setRailBadge('calendar', 'red');
    } else {
      if (window.__clearRailBadge) window.__clearRailBadge('calendar');
    }
  }

  _render() {
    var self = this;
    this.el.innerHTML = '';
    this.el.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E5E7EB;';

    var title = document.createElement('span');
    title.style.cssText = 'font-size:12px;color:#6B7280;font-family:Inter,system-ui;';
    title.textContent = this._mergedEvents.length + ' event' + (this._mergedEvents.length !== 1 ? 's' : '');
    header.appendChild(title);

    this.el.appendChild(header);

    // View switcher
    var switcher = document.createElement('div');
    switcher.className = 'ws-cal-view-switcher';
    var views = [
      { key: 'list', label: 'List' },
      { key: 'month', label: 'Month' },
      { key: 'timeline', label: 'Timeline' }
    ];
    views.forEach(function(v) {
      var btn = document.createElement('button');
      btn.className = 'ws-cal-view-btn' + (self._currentView === v.key ? ' ws-cal-view-btn--active' : '');
      btn.textContent = v.label;
      btn.setAttribute('aria-label', v.label + ' view');
      btn.addEventListener('click', function() {
        self._currentView = v.key;
        if (window.__ailaneWorkspace && window.__ailaneWorkspace.prefs) {
          window.__ailaneWorkspace.prefs.set('calendarView', v.key);
        }
        if (window.__contextBus) {
          window.__contextBus.emit('calendar:view:changed', { view: v.key });
        }
        self._render();
      });
      switcher.appendChild(btn);
    });
    this.el.appendChild(switcher);

    // Action bar: New Event + iCal Export
    var actionBar = document.createElement('div');
    actionBar.className = 'ws-cal-actions';

    var newEventBtn = document.createElement('button');
    newEventBtn.className = 'ws-cal-action-btn ws-cal-action-btn--primary';
    newEventBtn.textContent = '+ New Event';
    newEventBtn.addEventListener('click', function() {
      self._showCrudForm(null);
    });
    actionBar.appendChild(newEventBtn);

    var icalBtn = document.createElement('button');
    icalBtn.className = 'ws-cal-action-btn';
    icalBtn.textContent = 'Export to Calendar (.ics)';
    icalBtn.addEventListener('click', function() {
      downloadICal(self._mergedEvents, 'Ailane Compliance Calendar');
    });
    actionBar.appendChild(icalBtn);

    this.el.appendChild(actionBar);

    // View content container
    var viewContent = document.createElement('div');
    viewContent.className = 'ws-cal-view-content';
    viewContent.style.cssText = 'flex:1;overflow-y:auto;';
    this.el.appendChild(viewContent);

    // Dispatch to view
    switch (this._currentView) {
      case 'month':
        this._renderMonthView(viewContent);
        break;
      case 'timeline':
        this._renderTimelineView(viewContent);
        break;
      default:
        this._renderListView(viewContent);
        break;
    }
  }

  // ======================================================================
  // LIST VIEW (Sprint 2 — preserved exactly)
  // ======================================================================
  _renderListView(container) {
    var self = this;

    // Empty state
    if (this._mergedEvents.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'ws-cal-empty';
      empty.style.cssText = 'padding:40px 16px;text-align:center;';
      empty.innerHTML =
        '<p style="font-size:14px;font-weight:600;color:#0A2342;margin:0 0 4px;">No upcoming compliance events</p>' +
        '<p style="font-size:12px;color:#6B7280;margin:0;">Check back after submitting documents for analysis.</p>';
      container.appendChild(empty);
      return;
    }

    var list = document.createElement('div');
    list.className = 'ws-cal-list';

    var now = new Date();
    var sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    var thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Coming Up banner — events within 30 days
    var comingUpEvents = this._mergedEvents.filter(function(ev) {
      var d = new Date(ev.date);
      return d >= now && d <= thirtyDaysFromNow;
    });

    if (comingUpEvents.length > 0) {
      var comingUp = document.createElement('div');
      comingUp.className = 'ws-cal-coming-up';

      var cuTitle = document.createElement('div');
      cuTitle.style.cssText = 'font-size:12px;font-weight:700;color:#0A2342;padding:10px 16px;border-bottom:1px solid #E5E7EB;font-family:Inter,system-ui;';
      cuTitle.textContent = 'Coming Up (' + comingUpEvents.length + ')';
      comingUp.appendChild(cuTitle);

      comingUpEvents.forEach(function(ev) {
        comingUp.appendChild(self._renderListEvent(ev, sevenDaysFromNow));
      });

      list.appendChild(comingUp);
    }

    // Group remaining events by month
    var grouped = {};
    this._mergedEvents.forEach(function(ev) {
      var d = new Date(ev.date);
      var key = d.getFullYear() + '-' + String(d.getMonth()).padStart(2, '0');
      if (!grouped[key]) grouped[key] = { label: MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear(), events: [] };
      grouped[key].events.push(ev);
    });

    Object.keys(grouped).sort().forEach(function(key) {
      var group = grouped[key];

      var monthHeader = document.createElement('div');
      monthHeader.className = 'ws-cal-month-header';
      monthHeader.textContent = group.label;
      list.appendChild(monthHeader);

      group.events.forEach(function(ev) {
        list.appendChild(self._renderListEvent(ev, sevenDaysFromNow));
      });
    });

    container.appendChild(list);
  }

  _renderListEvent(mev, sevenDaysFromNow) {
    var self = this;
    // Use the original Sprint 2 event object for regulatory/review types
    var ev = mev._original || mev;
    var evType = mev.eventType || ev.type;
    var now = new Date();
    var eventDate = new Date(mev.date);
    var isWithin7Days = eventDate >= now && eventDate <= sevenDaysFromNow;

    var item = document.createElement('div');
    item.className = 'ws-cal-event ws-cal-event--' + (evType === 'organisation' ? 'org' : evType);
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', mev.title + ', ' + eventDate.toLocaleDateString('en-GB'));

    // Top row: badge + title + date
    var top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;gap:8px;';

    if (isWithin7Days) {
      var redDot = document.createElement('span');
      redDot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#DC2626;flex-shrink:0;';
      top.appendChild(redDot);
    }

    var badge = document.createElement('span');
    badge.className = 'ws-cal-badge';
    if (evType === 'regulatory') {
      badge.style.cssText = 'background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:Inter,system-ui;';
      badge.textContent = 'Regulatory';
    } else if (evType === 'review') {
      badge.style.cssText = 'background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:Inter,system-ui;';
      badge.textContent = 'Document Review';
    } else if (evType === 'organisation') {
      badge.style.cssText = 'background:#0A2342;color:#FFFFFF;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:Inter,system-ui;';
      badge.textContent = 'Organisation';
    }
    top.appendChild(badge);

    var dateEl = document.createElement('span');
    dateEl.style.cssText = 'font-size:11px;color:#6B7280;margin-left:auto;font-family:Inter,system-ui;';
    dateEl.textContent = eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    top.appendChild(dateEl);

    item.appendChild(top);

    // Title
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:13px;font-weight:600;color:#0A2342;margin-top:4px;font-family:Inter,system-ui;';
    titleEl.textContent = mev.title;
    item.appendChild(titleEl);

    // Subtitle info
    if (evType === 'regulatory') {
      var subtitle = document.createElement('div');
      subtitle.style.cssText = 'font-size:11px;color:#6B7280;margin-top:2px;font-family:Inter,system-ui;';
      var subtitleParts = [];
      if (ev.sourceAct) subtitleParts.push(ev.sourceAct);
      if (ev.commencementStatus) subtitleParts.push(ev.commencementStatus);
      subtitle.textContent = subtitleParts.join(' \u2014 ');

      if (ev.commencementStatus && ev.commencementStatus.toLowerCase().indexOf('not yet in force') !== -1) {
        var notInForce = document.createElement('span');
        notInForce.style.cssText = 'display:inline-block;margin-left:8px;padding:1px 6px;background:#FEF3C7;border:1px solid #D97706;border-radius:3px;font-size:10px;color:#92400E;font-weight:600;';
        notInForce.textContent = 'Not yet in force';
        subtitle.appendChild(notInForce);
      }

      item.appendChild(subtitle);

      // Truncated description
      if (ev.description) {
        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:12px;color:#4B5563;margin-top:4px;line-height:1.4;font-family:Inter,system-ui;';
        desc.textContent = ev.description.length > 120 ? ev.description.substring(0, 120) + '\u2026' : ev.description;
        item.appendChild(desc);
      }
    } else if (evType === 'review') {
      if (ev.lastCheckScore !== null && ev.lastCheckScore !== undefined) {
        var scoreLine = document.createElement('div');
        scoreLine.style.cssText = 'font-size:11px;color:#6B7280;margin-top:2px;font-family:Inter,system-ui;';
        scoreLine.textContent = 'Last check score: ' + Math.round(ev.lastCheckScore) + '%';
        item.appendChild(scoreLine);
      }
    } else if (evType === 'organisation' && mev.description) {
      var orgDesc = document.createElement('div');
      orgDesc.style.cssText = 'font-size:12px;color:#4B5563;margin-top:4px;line-height:1.4;font-family:Inter,system-ui;';
      orgDesc.textContent = mev.description.length > 120 ? mev.description.substring(0, 120) + '\u2026' : mev.description;
      item.appendChild(orgDesc);
    }

    // Click to expand/collapse detail
    item.addEventListener('click', function() {
      self._toggleListDetail(mev, item);
    });
    item.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') self._toggleListDetail(mev, item);
    });

    return item;
  }

  _toggleListDetail(mev, item) {
    var existingDetail = item.querySelector('.ws-cal-detail');
    if (existingDetail) {
      existingDetail.remove();
      this.expandedEventId = null;
      return;
    }

    // Remove any other expanded details
    if (this.el) {
      this.el.querySelectorAll('.ws-cal-detail').forEach(function(d) { d.remove(); });
    }

    this.expandedEventId = mev.id;

    var detail = document.createElement('div');
    detail.className = 'ws-cal-detail';

    var ev = mev._original || mev;
    var evType = mev.eventType || ev.type;
    var self = this;

    if (evType === 'regulatory') {
      var content = '';
      if (ev.description) content += '<p style="margin:0 0 8px;font-size:12px;color:#1F2937;line-height:1.5;">' + ev.description + '</p>';
      if (ev.statutoryBasis) content += '<p style="margin:0 0 4px;font-size:11px;color:#6B7280;"><strong>Statutory basis:</strong> ' + ev.statutoryBasis + '</p>';
      if (ev.commencementNote) content += '<p style="margin:0 0 8px;font-size:11px;color:#6B7280;"><strong>Commencement:</strong> ' + ev.commencementNote + '</p>';

      // Learn More button
      content += '<button class="ws-cal-learn-more" style="margin-top:8px;padding:6px 12px;background:#0A5C52;color:white;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,system-ui;">Learn More</button>';
      detail.innerHTML = content;

      var learnMoreBtn = detail.querySelector('.ws-cal-learn-more');
      if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self.bus.emit('calendar:learn-more', {
            requirementId: mev.id,
            title: mev.title,
            statutoryBasis: ev.statutoryBasis,
            sourceAct: ev.sourceAct
          });
        });
      }
    } else if (evType === 'review') {
      var reviewContent = '';
      reviewContent += '<p style="margin:0 0 4px;font-size:12px;color:#1F2937;"><strong>Document:</strong> ' + (ev.documentName || '') + '</p>';
      if (ev.lastCheckScore !== null && ev.lastCheckScore !== undefined) {
        reviewContent += '<p style="margin:0 0 4px;font-size:12px;color:#1F2937;"><strong>Last check score:</strong> ' + Math.round(ev.lastCheckScore) + '%</p>';
      }
      if (ev.lastCheckDate) {
        reviewContent += '<p style="margin:0;font-size:11px;color:#6B7280;"><strong>Checked:</strong> ' + new Date(ev.lastCheckDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</p>';
      }
      detail.innerHTML = reviewContent;
    } else if (evType === 'organisation') {
      var orgContent = '';
      if (mev.description) orgContent += '<p style="margin:0 0 8px;font-size:12px;color:#1F2937;line-height:1.5;">' + mev.description + '</p>';
      if (mev._orgData && mev._orgData.recurrence) {
        orgContent += '<p style="margin:0 0 4px;font-size:11px;color:#6B7280;"><strong>Recurrence:</strong> ' + mev._orgData.recurrence + '</p>';
      }
      // Edit + Delete buttons for organisation events
      orgContent += '<div class="ws-cal-org-actions" style="margin-top:8px;display:flex;gap:8px;"></div>';
      detail.innerHTML = orgContent;

      var actionsDiv = detail.querySelector('.ws-cal-org-actions');
      var editBtn = document.createElement('button');
      editBtn.style.cssText = 'padding:6px 12px;background:#0A5C52;color:white;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,system-ui;';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self._showCrudForm(mev._orgData);
      });
      actionsDiv.appendChild(editBtn);

      var delBtn = document.createElement('button');
      delBtn.style.cssText = 'padding:6px 12px;background:#FEF2F2;color:#DC2626;border:1px solid #DC2626;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,system-ui;';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this event?')) {
          var user = window.__ailaneUser;
          fetch(SUPABASE_URL + '/rest/v1/kl_calendar_events?id=eq.' + mev.id, {
            method: 'DELETE',
            headers: {
              'Authorization': 'Bearer ' + user.token,
              'apikey': window.__SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            }
          }).then(function() {
            if (self.bus) self.bus.emit('calendar:event:deleted', { id: mev.id });
            self._refreshAfterCrud();
          });
        }
      });
      actionsDiv.appendChild(delBtn);
    }

    item.appendChild(detail);

    // Emit event selected signal
    this.bus.emit('calendar:event:selected', {
      id: mev.id,
      type: mev.eventType,
      title: mev.title,
      date: mev.date
    });
  }

  // ======================================================================
  // MONTH VIEW (Sprint 4b)
  // ======================================================================
  _renderMonthView(container) {
    var self = this;
    renderMonthView(
      container,
      this._mergedEvents,
      this._monthYear,
      this._monthMonth,
      function(dateStr, dayEvents) {
        // Day clicked — render detail
        var detailEl = container.querySelector('#ws-cal-day-detail');
        if (detailEl) {
          renderDayDetail(detailEl, dateStr, dayEvents, function(evt) {
            self.bus.emit('calendar:event:selected', {
              id: evt.id,
              type: evt.eventType,
              title: evt.title,
              date: evt.date
            });
            if (evt.isEditable && evt._orgData) {
              self._showCrudForm(evt._orgData);
            }
          });
        }
      },
      function(newYear, newMonth) {
        self._monthYear = newYear;
        self._monthMonth = newMonth;
        self._render();
      }
    );
  }

  // ======================================================================
  // TIMELINE VIEW (Sprint 4b)
  // ======================================================================
  _renderTimelineView(container) {
    var self = this;
    renderTimelineView(container, this._mergedEvents, function(evt) {
      self.bus.emit('calendar:event:selected', {
        id: evt.id,
        type: evt.eventType,
        title: evt.title,
        date: evt.date
      });
    });
  }

  // ======================================================================
  // CRUD FORM (Sprint 4b)
  // ======================================================================
  _showCrudForm(existingEvent) {
    var self = this;
    var user = window.__ailaneUser;

    // Replace the view content with the CRUD form
    var viewContent = this.el.querySelector('.ws-cal-view-content');
    if (!viewContent) return;

    renderEventForm(
      viewContent,
      user,
      existingEvent,
      function(savedEvent) {
        // On save
        if (existingEvent) {
          if (self.bus) self.bus.emit('calendar:event:updated', { id: savedEvent.id });
        } else {
          if (self.bus) self.bus.emit('calendar:event:created', { id: savedEvent.id });
        }
        self._refreshAfterCrud();
      },
      function() {
        // On cancel — re-render current view
        self._renderViewContent();
      },
      function(deletedId) {
        // On delete
        if (self.bus) self.bus.emit('calendar:event:deleted', { id: deletedId });
        self._refreshAfterCrud();
      }
    );
  }

  async _refreshAfterCrud() {
    await this._loadOrgEvents();
    this._mergeAllEvents();
    this._updateDeadlineBadge();
    this._render();
  }

  _renderViewContent() {
    var viewContent = this.el.querySelector('.ws-cal-view-content');
    if (!viewContent) return;
    viewContent.innerHTML = '';
    switch (this._currentView) {
      case 'month': this._renderMonthView(viewContent); break;
      case 'timeline': this._renderTimelineView(viewContent); break;
      default: this._renderListView(viewContent); break;
    }
  }
}

// Expose globally for panel system lazy loading
window.__PanelCalendar = AilaneCalendarPanel;
