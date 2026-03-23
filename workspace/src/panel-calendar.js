/**
 * COMPLIANCE CALENDAR PANEL — Sprint 2
 * KLUI-001 §3.8
 *
 * List view of regulatory events (from regulatory_requirements) and
 * document review events (derived from kl_vault_documents + compliance_uploads).
 * Sprint 2 scope: List view only. Month/Timeline views deferred to Sprint 4.
 *
 * Constitutional compliance:
 * - Calendar displays regulatory facts, not index outputs (ACEI Art. I §1.5)
 * - Forward events do not affect current compliance scores (FWD-001)
 * - Document review events derived from Vault metadata only (separation doctrine)
 */

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

class AilaneCalendarPanel {
  constructor(container, bus) {
    this.bus = bus;
    this.events = [];
    this.el = null;
    this.expandedEventId = null;
  }

  async mount(container) {
    this.el = container;
    this.el.innerHTML = '<div class="ws-skeleton" style="height:200px;margin:16px;"></div>';

    try {
      await this._loadEvents();
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

  _render() {
    var self = this;
    this.el.innerHTML = '';
    this.el.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E5E7EB;';

    var title = document.createElement('span');
    title.style.cssText = 'font-size:12px;color:#6B7280;font-family:Inter,system-ui;';
    title.textContent = this.events.length + ' event' + (this.events.length !== 1 ? 's' : '');
    header.appendChild(title);

    var viewLabel = document.createElement('span');
    viewLabel.style.cssText = 'font-size:11px;color:#9CA3AF;font-family:Inter,system-ui;';
    viewLabel.textContent = 'List View';
    header.appendChild(viewLabel);

    this.el.appendChild(header);

    // Empty state
    if (this.events.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'ws-cal-empty';
      empty.style.cssText = 'padding:40px 16px;text-align:center;';
      empty.innerHTML =
        '<p style="font-size:14px;font-weight:600;color:#0A2342;margin:0 0 4px;">No upcoming compliance events</p>' +
        '<p style="font-size:12px;color:#6B7280;margin:0;">Check back after submitting documents for analysis.</p>';
      this.el.appendChild(empty);
      return;
    }

    var list = document.createElement('div');
    list.className = 'ws-cal-list';
    list.style.cssText = 'flex:1;overflow-y:auto;';

    var now = new Date();
    var sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    var thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Coming Up banner — events within 30 days
    var comingUpEvents = this.events.filter(function(ev) {
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
        comingUp.appendChild(self._renderEvent(ev, sevenDaysFromNow));
      });

      list.appendChild(comingUp);
    }

    // Group remaining events by month
    var grouped = {};
    this.events.forEach(function(ev) {
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
        list.appendChild(self._renderEvent(ev, sevenDaysFromNow));
      });
    });

    this.el.appendChild(list);
  }

  _renderEvent(ev, sevenDaysFromNow) {
    var self = this;
    var now = new Date();
    var eventDate = new Date(ev.date);
    var isWithin7Days = eventDate >= now && eventDate <= sevenDaysFromNow;

    var item = document.createElement('div');
    item.className = 'ws-cal-event ws-cal-event--' + ev.type;
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', ev.title + ', ' + eventDate.toLocaleDateString('en-GB'));

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
    if (ev.type === 'regulatory') {
      badge.style.cssText = 'background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:Inter,system-ui;';
      badge.textContent = 'Regulatory';
    } else if (ev.type === 'review') {
      badge.style.cssText = 'background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:Inter,system-ui;';
      badge.textContent = 'Document Review';
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
    titleEl.textContent = ev.title;
    item.appendChild(titleEl);

    // Subtitle info
    if (ev.type === 'regulatory') {
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
    } else if (ev.type === 'review') {
      if (ev.lastCheckScore !== null && ev.lastCheckScore !== undefined) {
        var scoreLine = document.createElement('div');
        scoreLine.style.cssText = 'font-size:11px;color:#6B7280;margin-top:2px;font-family:Inter,system-ui;';
        scoreLine.textContent = 'Last check score: ' + Math.round(ev.lastCheckScore) + '%';
        item.appendChild(scoreLine);
      }
    }

    // Click to expand/collapse detail
    item.addEventListener('click', function() {
      self._toggleDetail(ev, item);
    });
    item.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') self._toggleDetail(ev, item);
    });

    return item;
  }

  _toggleDetail(ev, item) {
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

    this.expandedEventId = ev.id;

    var detail = document.createElement('div');
    detail.className = 'ws-cal-detail';

    if (ev.type === 'regulatory') {
      var content = '';
      if (ev.description) content += '<p style="margin:0 0 8px;font-size:12px;color:#1F2937;line-height:1.5;">' + ev.description + '</p>';
      if (ev.statutoryBasis) content += '<p style="margin:0 0 4px;font-size:11px;color:#6B7280;"><strong>Statutory basis:</strong> ' + ev.statutoryBasis + '</p>';
      if (ev.commencementNote) content += '<p style="margin:0 0 8px;font-size:11px;color:#6B7280;"><strong>Commencement:</strong> ' + ev.commencementNote + '</p>';

      // Learn More button
      content += '<button class="ws-cal-learn-more" style="margin-top:8px;padding:6px 12px;background:#0A5C52;color:white;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,system-ui;">Learn More</button>';
      detail.innerHTML = content;

      var learnMoreBtn = detail.querySelector('.ws-cal-learn-more');
      if (learnMoreBtn) {
        var self = this;
        learnMoreBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self.bus.emit('calendar:learn-more', {
            requirementId: ev.id,
            title: ev.title,
            statutoryBasis: ev.statutoryBasis,
            sourceAct: ev.sourceAct
          });
        });
      }
    } else if (ev.type === 'review') {
      var reviewContent = '';
      reviewContent += '<p style="margin:0 0 4px;font-size:12px;color:#1F2937;"><strong>Document:</strong> ' + (ev.documentName || '') + '</p>';
      if (ev.lastCheckScore !== null && ev.lastCheckScore !== undefined) {
        reviewContent += '<p style="margin:0 0 4px;font-size:12px;color:#1F2937;"><strong>Last check score:</strong> ' + Math.round(ev.lastCheckScore) + '%</p>';
      }
      if (ev.lastCheckDate) {
        reviewContent += '<p style="margin:0;font-size:11px;color:#6B7280;"><strong>Checked:</strong> ' + new Date(ev.lastCheckDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</p>';
      }
      detail.innerHTML = reviewContent;
    }

    item.appendChild(detail);

    // Emit event selected signal
    this.bus.emit('calendar:event:selected', {
      id: ev.id,
      type: ev.type,
      title: ev.title,
      date: ev.date
    });
  }
}

// Expose globally for panel system lazy loading
window.__PanelCalendar = AilaneCalendarPanel;
