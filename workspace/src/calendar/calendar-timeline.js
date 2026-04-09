// calendar-timeline.js — Timeline/Gantt View Renderer
// Spec: KLUI-001 §3.8 (Timeline view — horizontal scrolling multi-month)
// Custom build — no external library (KLUI-001 §10)

import { MONTH_NAMES } from './calendar-month.js';

var TIMELINE_MONTHS = 12; // Show 12 months from current date

/**
 * Renders the Timeline view.
 * @param {HTMLElement} container
 * @param {Array} allEvents - merged event array
 * @param {Function} onEventClick - callback for event selection
 */
export function renderTimelineView(container, allEvents, onEventClick) {
  container.innerHTML = '';

  var now = new Date();
  var startYear = now.getFullYear();
  var startMonth = now.getMonth();

  // Build month columns
  var months = [];
  for (var i = 0; i < TIMELINE_MONTHS; i++) {
    var m = (startMonth + i) % 12;
    var y = startYear + Math.floor((startMonth + i) / 12);
    months.push({ year: y, month: m, label: MONTH_NAMES[m].substring(0, 3) + ' ' + y });
  }

  // Timeline header
  var wrapper = document.createElement('div');
  wrapper.className = 'ws-cal-timeline-wrapper';

  var headerRow = document.createElement('div');
  headerRow.className = 'ws-cal-timeline-header';

  // Row label column
  var labelCol = document.createElement('div');
  labelCol.className = 'ws-cal-timeline-label-col';
  labelCol.textContent = 'Event Type';
  headerRow.appendChild(labelCol);

  // Month columns
  months.forEach(function(m) {
    var col = document.createElement('div');
    col.className = 'ws-cal-timeline-month-col';
    col.textContent = m.label;
    headerRow.appendChild(col);
  });
  wrapper.appendChild(headerRow);

  // Group events by type
  var eventTypes = [
    { key: 'regulatory', label: 'Regulatory', colour: '#D97706' },
    { key: 'review', label: 'Document Review', colour: '#0A5C52' },
    { key: 'organisation', label: 'Organisation', colour: '#0A2342' }
  ];

  var timelineStart = new Date(startYear, startMonth, 1);
  var timelineEnd = new Date(months[months.length - 1].year, months[months.length - 1].month + 1, 0);
  var totalDays = Math.ceil((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24));

  eventTypes.forEach(function(et) {
    var typeEvents = allEvents.filter(function(e) { return e.eventType === et.key; });

    var row = document.createElement('div');
    row.className = 'ws-cal-timeline-row';

    // Row label
    var rowLabel = document.createElement('div');
    rowLabel.className = 'ws-cal-timeline-label-col';
    rowLabel.innerHTML = '<span class="ws-cal-timeline-type-dot" style="background:' + et.colour + '"></span> ' + et.label;
    row.appendChild(rowLabel);

    // Event track
    var track = document.createElement('div');
    track.className = 'ws-cal-timeline-track';

    typeEvents.forEach(function(evt) {
      if (!evt.date) return;
      var evtDate = new Date(evt.date + 'T00:00:00');
      if (evtDate < timelineStart || evtDate > timelineEnd) return;

      var dayOffset = Math.ceil((evtDate - timelineStart) / (1000 * 60 * 60 * 24));
      var leftPercent = (dayOffset / totalDays) * 100;

      var marker = document.createElement('div');
      marker.className = 'ws-cal-timeline-marker';
      marker.style.left = leftPercent + '%';
      marker.style.background = et.colour;
      marker.title = evt.title + ' \u2014 ' + evtDate.toLocaleDateString('en-GB');
      marker.setAttribute('tabindex', '0');
      marker.setAttribute('aria-label', evt.title + ', ' + evtDate.toLocaleDateString('en-GB'));

      marker.addEventListener('click', function() {
        if (onEventClick) onEventClick(evt);
      });

      track.appendChild(marker);
    });

    row.appendChild(track);
    wrapper.appendChild(row);
  });

  container.appendChild(wrapper);

  // Today marker
  var todayOffset = Math.ceil((now - timelineStart) / (1000 * 60 * 60 * 24));
  if (todayOffset >= 0 && todayOffset <= totalDays) {
    var todayLine = document.createElement('div');
    todayLine.className = 'ws-cal-timeline-today';
    todayLine.style.left = 'calc(' + ((todayOffset / totalDays) * 100) + '% + 120px)'; // offset for label column
    todayLine.title = 'Today';
    wrapper.appendChild(todayLine);
  }
}
