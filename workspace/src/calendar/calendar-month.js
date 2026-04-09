// calendar-month.js — Month View Grid Renderer
// Spec: KLUI-001 §3.8, §10 (custom calendar grid, no external library)

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
var DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Renders the Month view calendar grid.
 * @param {HTMLElement} container
 * @param {Array} allEvents - merged event array [{date, title, type, colour, detail, ...}]
 * @param {number} year - display year
 * @param {number} month - display month (0-indexed)
 * @param {Function} onDayClick - callback when a day cell is clicked
 * @param {Function} onMonthChange - callback when prev/next month clicked
 */
export function renderMonthView(container, allEvents, year, month, onDayClick, onMonthChange) {
  container.innerHTML = '';

  // Month navigation header
  var header = document.createElement('div');
  header.className = 'ws-cal-month-nav';

  var prevBtn = document.createElement('button');
  prevBtn.className = 'ws-cal-month-nav-btn';
  prevBtn.textContent = '\u2190';
  prevBtn.setAttribute('aria-label', 'Previous month');
  prevBtn.addEventListener('click', function() {
    var newMonth = month - 1;
    var newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    onMonthChange(newYear, newMonth);
  });
  header.appendChild(prevBtn);

  var titleEl = document.createElement('span');
  titleEl.className = 'ws-cal-month-title';
  titleEl.textContent = MONTH_NAMES[month] + ' ' + year;
  header.appendChild(titleEl);

  var nextBtn = document.createElement('button');
  nextBtn.className = 'ws-cal-month-nav-btn';
  nextBtn.textContent = '\u2192';
  nextBtn.setAttribute('aria-label', 'Next month');
  nextBtn.addEventListener('click', function() {
    var newMonth = month + 1;
    var newYear = year;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    onMonthChange(newYear, newMonth);
  });
  header.appendChild(nextBtn);

  container.appendChild(header);

  // Day name headers (Monday-start week per UK convention)
  var dayHeaders = document.createElement('div');
  dayHeaders.className = 'ws-cal-grid ws-cal-grid-header';
  DAY_NAMES.forEach(function(d) {
    var cell = document.createElement('div');
    cell.className = 'ws-cal-day-header';
    cell.textContent = d;
    dayHeaders.appendChild(cell);
  });
  container.appendChild(dayHeaders);

  // Build grid
  var grid = document.createElement('div');
  grid.className = 'ws-cal-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', MONTH_NAMES[month] + ' ' + year + ' calendar');

  // First day of month (adjusted for Monday-start: 0=Mon, 6=Sun)
  var firstDay = new Date(year, month, 1);
  var startDayOfWeek = (firstDay.getDay() + 6) % 7; // Convert Sunday=0 to Monday-start
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  // Build event lookup by date string (YYYY-MM-DD)
  var eventsByDate = {};
  allEvents.forEach(function(evt) {
    if (!evt.date) return;
    var dateStr = typeof evt.date === 'string' ? evt.date.substring(0, 10) : '';
    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
    eventsByDate[dateStr].push(evt);
  });

  // Padding cells for days before the 1st
  for (var p = 0; p < startDayOfWeek; p++) {
    var padCell = document.createElement('div');
    padCell.className = 'ws-cal-day ws-cal-day--pad';
    grid.appendChild(padCell);
  }

  // Day cells
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var cell = document.createElement('div');
    cell.className = 'ws-cal-day';
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', d + ' ' + MONTH_NAMES[month] + ' ' + year);

    if (dateStr === todayStr) {
      cell.classList.add('ws-cal-day--today');
    }

    // Day number
    var numEl = document.createElement('span');
    numEl.className = 'ws-cal-day-num';
    numEl.textContent = d;
    cell.appendChild(numEl);

    // Event dots
    var dayEvents = eventsByDate[dateStr] || [];
    if (dayEvents.length > 0) {
      var dotsEl = document.createElement('div');
      dotsEl.className = 'ws-cal-day-dots';
      // Show up to 3 dots, then a +N indicator
      var shown = Math.min(dayEvents.length, 3);
      for (var i = 0; i < shown; i++) {
        var dot = document.createElement('span');
        dot.className = 'ws-cal-dot';
        dot.style.background = dayEvents[i].colour || '#6B7280';
        dot.title = dayEvents[i].title || '';
        dotsEl.appendChild(dot);
      }
      if (dayEvents.length > 3) {
        var more = document.createElement('span');
        more.className = 'ws-cal-dot-more';
        more.textContent = '+' + (dayEvents.length - 3);
        dotsEl.appendChild(more);
      }
      cell.appendChild(dotsEl);

      // Screen reader text
      var srText = document.createElement('span');
      srText.className = 'ws-sr-only';
      srText.textContent = dayEvents.length + ' event' + (dayEvents.length !== 1 ? 's' : '');
      cell.appendChild(srText);
    }

    // Click handler
    (function(ds, evts) {
      cell.addEventListener('click', function() {
        onDayClick(ds, evts);
      });
    })(dateStr, dayEvents);

    grid.appendChild(cell);
  }

  // Trailing padding
  var totalCells = startDayOfWeek + daysInMonth;
  var remainingCells = (7 - (totalCells % 7)) % 7;
  for (var t = 0; t < remainingCells; t++) {
    var trailCell = document.createElement('div');
    trailCell.className = 'ws-cal-day ws-cal-day--pad';
    grid.appendChild(trailCell);
  }

  container.appendChild(grid);

  // Day detail container (populated on day click)
  var dayDetail = document.createElement('div');
  dayDetail.id = 'ws-cal-day-detail';
  dayDetail.className = 'ws-cal-day-detail';
  container.appendChild(dayDetail);
}

/**
 * Renders the day detail pane below the grid when a day is clicked.
 * @param {HTMLElement} detailContainer - #ws-cal-day-detail
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Array} events - events for this day
 * @param {Function} onEventClick - callback for event selection
 */
export function renderDayDetail(detailContainer, dateStr, events, onEventClick) {
  detailContainer.innerHTML = '';
  if (events.length === 0) {
    detailContainer.innerHTML = '<div class="ws-cal-day-detail-empty">No events on this date.</div>';
    return;
  }

  var dateObj = new Date(dateStr + 'T00:00:00');
  var headerEl = document.createElement('div');
  headerEl.className = 'ws-cal-day-detail-header';
  headerEl.textContent = dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  detailContainer.appendChild(headerEl);

  events.forEach(function(evt) {
    var row = document.createElement('div');
    row.className = 'ws-cal-event';
    row.classList.add('ws-cal-event--' + (evt.eventType || 'regulatory'));
    row.setAttribute('tabindex', '0');
    row.innerHTML =
      '<div class="ws-cal-event-title">' + (evt.title || '') + '</div>' +
      '<div class="ws-cal-event-meta">' +
        '<span class="ws-cal-badge ws-cal-badge--' + (evt.eventType || 'regulatory') + '">' + _eventTypeLabel(evt.eventType) + '</span>' +
      '</div>';
    row.addEventListener('click', function() {
      if (onEventClick) onEventClick(evt);
    });
    detailContainer.appendChild(row);
  });
}

function _eventTypeLabel(type) {
  var labels = {
    'regulatory': 'Regulatory',
    'review': 'Document Review',
    'organisation': 'Organisation',
    'tribunal': 'Tribunal'
  };
  return labels[type] || type || 'Event';
}

export { MONTH_NAMES, DAY_NAMES };
