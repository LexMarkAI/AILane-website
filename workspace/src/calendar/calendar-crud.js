// calendar-crud.js — Organisation Event CRUD
// Spec: KLUI-001 §3.8 (Organisation Events)
// Table: kl_calendar_events
// Tier: Operational (personal only), Governance+ (personal + org-shared)

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';

var EVENT_TYPES = [
  { value: 'policy_renewal', label: 'Policy Renewal' },
  { value: 'training_deadline', label: 'Training Deadline' },
  { value: 'board_reporting', label: 'Board Reporting' },
  { value: 'appraisal_cycle', label: 'Appraisal Cycle' },
  { value: 'probation_review', label: 'Probation Review' },
  { value: 'custom', label: 'Custom Event' }
];

var RECURRENCE_OPTIONS = [
  { value: 'none', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Every 6 months' },
  { value: 'annual', label: 'Annual' }
];

/**
 * Renders the create/edit event form.
 * @param {HTMLElement} container
 * @param {Object} user - window.__ailaneUser
 * @param {Object|null} existingEvent - null for create, event object for edit
 * @param {Function} onSave - callback after save with the saved event
 * @param {Function} onCancel - callback to close form
 * @param {Function} onDelete - callback after delete (edit mode only)
 */
export function renderEventForm(container, user, existingEvent, onSave, onCancel, onDelete) {
  container.innerHTML = '';
  var isEdit = !!existingEvent;

  var form = document.createElement('div');
  form.className = 'ws-cal-crud-form';

  var formTitle = document.createElement('h4');
  formTitle.textContent = isEdit ? 'Edit Event' : 'New Organisation Event';
  form.appendChild(formTitle);

  // Title
  form.appendChild(_field('Event Title *', _input('text', 'ws-cal-event-title', isEdit ? existingEvent.title : '', 100)));

  // Event Type
  form.appendChild(_field('Event Type *', _select('ws-cal-event-type', EVENT_TYPES, isEdit ? existingEvent.event_type : '')));

  // Date
  form.appendChild(_field('Date *', _input('date', 'ws-cal-event-date', isEdit ? existingEvent.event_date : '', null)));

  // End Date (optional)
  form.appendChild(_field('End Date', _input('date', 'ws-cal-event-end-date', isEdit && existingEvent.end_date ? existingEvent.end_date : '', null)));

  // Description
  var descField = document.createElement('div');
  descField.className = 'ws-planner-field';
  var descLabel = document.createElement('label');
  descLabel.className = 'ws-planner-label';
  descLabel.textContent = 'Description';
  descField.appendChild(descLabel);
  var descArea = document.createElement('textarea');
  descArea.id = 'ws-cal-event-desc';
  descArea.className = 'ws-planner-input';
  descArea.rows = 3;
  descArea.value = isEdit && existingEvent.description ? existingEvent.description : '';
  descField.appendChild(descArea);
  form.appendChild(descField);

  // Recurrence
  form.appendChild(_field('Recurrence', _select('ws-cal-event-recurrence', RECURRENCE_OPTIONS, isEdit && existingEvent.recurrence ? existingEvent.recurrence : 'none')));

  // Visibility (Governance+ only)
  var tier = user.tier;
  if (tier === 'governance' || tier === 'enterprise' || tier === 'institutional') {
    var visOptions = [
      { value: 'personal', label: 'Personal (only you)' },
      { value: 'org_shared', label: 'Organisation (visible to all members)' }
    ];
    form.appendChild(_field('Visibility', _select('ws-cal-event-visibility', visOptions, isEdit && existingEvent.visibility ? existingEvent.visibility : 'personal')));
  }

  // Action buttons
  var actions = document.createElement('div');
  actions.className = 'ws-planner-nav';

  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'ws-planner-btn ws-planner-btn--secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', function() { onCancel(); });
  actions.appendChild(cancelBtn);

  if (isEdit && onDelete) {
    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'ws-planner-btn ws-cal-crud-delete-btn';
    deleteBtn.textContent = 'Delete Event';
    deleteBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to delete this event?')) {
        _deleteEvent(existingEvent.id, user, function() { onDelete(existingEvent.id); });
      }
    });
    actions.appendChild(deleteBtn);
  }

  var saveBtn = document.createElement('button');
  saveBtn.className = 'ws-planner-btn ws-planner-btn--primary';
  saveBtn.textContent = isEdit ? 'Update Event' : 'Create Event';
  saveBtn.addEventListener('click', function() {
    var title = form.querySelector('#ws-cal-event-title').value.trim();
    var eventType = form.querySelector('#ws-cal-event-type').value;
    var eventDate = form.querySelector('#ws-cal-event-date').value;
    if (!title || !eventType || !eventDate) {
      _showFormError(form, 'Please complete all required fields.');
      return;
    }
    var endDate = form.querySelector('#ws-cal-event-end-date').value || null;
    var description = form.querySelector('#ws-cal-event-desc').value.trim() || null;
    var recurrence = form.querySelector('#ws-cal-event-recurrence').value;
    var visEl = form.querySelector('#ws-cal-event-visibility');
    var visibility = visEl ? visEl.value : 'personal';

    var body = {
      title: title,
      event_type: eventType,
      event_date: eventDate,
      end_date: endDate,
      description: description,
      recurrence: recurrence === 'none' ? null : recurrence,
      visibility: visibility
    };

    if (isEdit) {
      _updateEvent(existingEvent.id, body, user, function(saved) { onSave(saved); });
    } else {
      body.user_id = user.id;
      body.org_id = user.orgId || null;
      _createEvent(body, user, function(saved) { onSave(saved); });
    }
  });
  actions.appendChild(saveBtn);
  form.appendChild(actions);

  container.appendChild(form);
}

async function _createEvent(body, user, callback) {
  try {
    var resp = await fetch(SUPABASE_URL + '/rest/v1/kl_calendar_events', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + user.token,
        'apikey': window.__SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(body)
    });
    if (resp.ok) {
      var data = await resp.json();
      var saved = Array.isArray(data) ? data[0] : data;
      if (callback) callback(saved);
    }
  } catch (err) { console.error('Event create failed:', err); }
}

async function _updateEvent(id, body, user, callback) {
  try {
    var resp = await fetch(SUPABASE_URL + '/rest/v1/kl_calendar_events?id=eq.' + id, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + user.token,
        'apikey': window.__SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(body)
    });
    if (resp.ok) {
      var data = await resp.json();
      var saved = Array.isArray(data) ? data[0] : data;
      if (callback) callback(saved);
    }
  } catch (err) { console.error('Event update failed:', err); }
}

async function _deleteEvent(id, user, callback) {
  try {
    await fetch(SUPABASE_URL + '/rest/v1/kl_calendar_events?id=eq.' + id, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + user.token,
        'apikey': window.__SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (callback) callback();
  } catch (err) { console.error('Event delete failed:', err); }
}

/**
 * Fetches organisation events for the current user.
 * @param {Object} user
 * @returns {Promise<Array>}
 */
export async function fetchOrgEvents(user) {
  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/kl_calendar_events?user_id=eq.' + user.id + '&status=eq.active&order=event_date.asc',
      {
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    if (resp.ok) return await resp.json();
    return [];
  } catch (err) { return []; }
}

// --- Helpers (reusing planner form patterns) ---
function _field(labelText, inputEl) {
  var f = document.createElement('div');
  f.className = 'ws-planner-field';
  var l = document.createElement('label');
  l.className = 'ws-planner-label';
  l.textContent = labelText;
  f.appendChild(l);
  f.appendChild(inputEl);
  return f;
}
function _input(type, id, value, maxLen) {
  var i = document.createElement('input');
  i.type = type; i.id = id; i.className = 'ws-planner-input';
  i.value = value || '';
  if (maxLen) i.maxLength = maxLen;
  return i;
}
function _select(id, options, selectedVal) {
  var s = document.createElement('select');
  s.id = id; s.className = 'ws-planner-select';
  var html = '<option value="">\u2014 Select \u2014</option>';
  for (var i = 0; i < options.length; i++) {
    var o = options[i];
    var val = typeof o === 'object' ? o.value : o;
    var lbl = typeof o === 'object' ? o.label : o;
    html += '<option value="' + val + '"' + (val === selectedVal ? ' selected' : '') + '>' + lbl + '</option>';
  }
  s.innerHTML = html;
  return s;
}
function _showFormError(parent, msg) {
  var err = parent.querySelector('.ws-planner-error');
  if (!err) { err = document.createElement('div'); err.className = 'ws-planner-error'; parent.appendChild(err); }
  err.textContent = msg;
  setTimeout(function() { if (err.parentNode) err.parentNode.removeChild(err); }, 4000);
}

export { EVENT_TYPES, RECURRENCE_OPTIONS };
