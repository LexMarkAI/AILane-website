// calendar-ical.js — iCal (.ics) Export
// Spec: KLUI-001 §3.8 (Export -> iCal for Outlook/Google Calendar)
// Format: RFC 5545

/**
 * Generates and downloads an iCal .ics file from the event array.
 * @param {Array} events - merged event array [{date, title, description, eventType, ...}]
 * @param {string} calendarName - e.g. "Ailane Compliance Calendar"
 */
export function downloadICal(events, calendarName) {
  var lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ailane//Compliance Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + _icalEscape(calendarName || 'Ailane Compliance Calendar'),
    'X-WR-TIMEZONE:Europe/London'
  ];

  events.forEach(function(evt) {
    if (!evt.date) return;
    var dateStr = evt.date.replace(/-/g, '');
    var uid = (evt.id || _generateUID()) + '@ailane.ai';
    var now = _formatICalDate(new Date());

    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + uid);
    lines.push('DTSTART;VALUE=DATE:' + dateStr.substring(0, 8));
    if (evt.endDate) {
      var endStr = evt.endDate.replace(/-/g, '');
      lines.push('DTEND;VALUE=DATE:' + endStr.substring(0, 8));
    }
    lines.push('DTSTAMP:' + now);
    lines.push('SUMMARY:' + _icalEscape(evt.title || 'Compliance Event'));
    if (evt.description) {
      lines.push('DESCRIPTION:' + _icalEscape(evt.description));
    }
    // Category based on event type
    var category = _eventTypeCategory(evt.eventType);
    if (category) lines.push('CATEGORIES:' + category);

    // Add 7-day reminder
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P7D');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:' + _icalEscape(evt.title || 'Compliance Event') + ' in 7 days');
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  var content = lines.join('\r\n');
  var blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  var url = URL.createObjectURL(blob);

  var a = document.createElement('a');
  a.href = url;
  a.download = 'ailane-compliance-calendar.ics';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function _icalEscape(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function _formatICalDate(date) {
  return date.getUTCFullYear() +
    String(date.getUTCMonth() + 1).padStart(2, '0') +
    String(date.getUTCDate()).padStart(2, '0') + 'T' +
    String(date.getUTCHours()).padStart(2, '0') +
    String(date.getUTCMinutes()).padStart(2, '0') +
    String(date.getUTCSeconds()).padStart(2, '0') + 'Z';
}

function _generateUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function _eventTypeCategory(type) {
  var map = {
    'regulatory': 'REGULATORY,COMPLIANCE',
    'review': 'DOCUMENT REVIEW,COMPLIANCE',
    'organisation': 'ORGANISATION,COMPLIANCE',
    'tribunal': 'TRIBUNAL,COMPLIANCE'
  };
  return map[type] || 'COMPLIANCE';
}
