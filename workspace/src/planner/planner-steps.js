// planner-steps.js — Contract Planner Steps 1 & 2
// Spec: KLWS-001 §4.2

const SECTORS = [
  'Facilities Management', 'Hospitality', 'Retail', 'Healthcare',
  'Education', 'Technology', 'Financial Services', 'Construction',
  'Manufacturing', 'Professional Services', 'Transport & Logistics',
  'Public Sector', 'Other'
];

const SIZE_BANDS = ['1\u20139', '10\u201349', '50\u2013249', '250\u2013999', '1000+'];

const LOCATIONS = [
  { label: 'England', jurisdiction: 'gb-eng' },
  { label: 'Scotland', jurisdiction: 'gb-sct' },
  { label: 'Wales', jurisdiction: 'gb-wls' },
  { label: 'Northern Ireland', jurisdiction: 'gb-nir' }
];

const WORKFORCE_TYPES = [
  'Full-time permanent', 'Part-time permanent', 'Fixed-term',
  'Zero-hours', 'Casual', 'Agency workers'
];

const CONTRACT_TYPES = [
  { value: 'permanent_ft', label: 'Permanent Full-Time', desc: 'Standard permanent contract for full-time employees' },
  { value: 'permanent_pt', label: 'Permanent Part-Time', desc: 'Permanent contract for part-time employees with pro-rata considerations' },
  { value: 'fixed_term', label: 'Fixed-Term', desc: 'Contract for a defined period with specific termination provisions' },
  { value: 'zero_hours', label: 'Zero-Hours', desc: 'No guaranteed minimum hours \u2014 specific regulatory requirements apply', note: 'Additional regulatory requirements under ERA 2025 reforms' },
  { value: 'casual', label: 'Casual', desc: 'Irregular work pattern \u2014 employment status considerations' },
  { value: 'agency', label: 'Agency Worker', desc: 'Agency worker arrangements \u2014 AWR 2010 provisions apply' }
];

/**
 * Renders Step 1 — Organisation Profile form.
 * @param {HTMLElement} container
 * @param {Object} draftPlan - existing draft data to pre-fill
 * @param {Function} onNext - callback with form data object
 */
export function renderStep1(container, draftPlan, onNext) {
  container.innerHTML = '';
  var form = document.createElement('div');
  form.className = 'ws-planner-form';

  // Plan Name
  form.appendChild(_field('Plan Name *', _input('text', 'ws-plan-name', draftPlan.plan_name || '', 100)));

  // Sector
  form.appendChild(_field('Sector *', _select('ws-plan-sector', SECTORS, draftPlan.sector || '')));

  // Organisation Size
  form.appendChild(_field('Organisation Size *', _select('ws-plan-size', SIZE_BANDS, draftPlan.size || '')));

  // Location
  form.appendChild(_field('Location *', _select('ws-plan-location', LOCATIONS.map(function(l) { return l.label; }), draftPlan.location || '')));

  // Workforce Composition (multi-checkbox, optional)
  var wfGroup = document.createElement('div');
  wfGroup.className = 'ws-planner-field';
  var wfLabel = document.createElement('label');
  wfLabel.className = 'ws-planner-label';
  wfLabel.textContent = 'Workforce Composition';
  wfGroup.appendChild(wfLabel);

  var wfChecks = document.createElement('div');
  wfChecks.className = 'ws-planner-checkbox-group';
  WORKFORCE_TYPES.forEach(function(wt) {
    var lbl = document.createElement('label');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = wt;
    cb.checked = (draftPlan.workforce || []).indexOf(wt) !== -1;
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(' ' + wt));
    wfChecks.appendChild(lbl);
  });
  wfGroup.appendChild(wfChecks);
  form.appendChild(wfGroup);

  // Next button
  var btn = document.createElement('button');
  btn.className = 'ws-planner-btn ws-planner-btn--primary';
  btn.textContent = 'Next \u2192 Contract Type';
  btn.addEventListener('click', function() {
    var name = form.querySelector('#ws-plan-name').value.trim();
    var sector = form.querySelector('#ws-plan-sector').value;
    var size = form.querySelector('#ws-plan-size').value;
    var location = form.querySelector('#ws-plan-location').value;
    if (!name || !sector || !size || !location) {
      _showError(form, 'Please complete all required fields.');
      return;
    }
    var checked = form.querySelectorAll('.ws-planner-checkbox-group input:checked');
    var workforce = [];
    for (var i = 0; i < checked.length; i++) { workforce.push(checked[i].value); }
    var loc = null;
    for (var j = 0; j < LOCATIONS.length; j++) {
      if (LOCATIONS[j].label === location) { loc = LOCATIONS[j]; break; }
    }
    var jurisdiction = loc ? loc.jurisdiction : 'gb-eng';
    onNext({ plan_name: name, sector: sector, size: size, location: location, jurisdiction: jurisdiction, workforce: workforce });
  });
  form.appendChild(btn);

  container.appendChild(form);
}

/**
 * Renders Step 2 — Contract Type card selector.
 * @param {HTMLElement} container
 * @param {Object} draftPlan - existing draft data
 * @param {Function} onNext - callback with { contract_type }
 * @param {Function} onBack - callback to return to Step 1
 */
export function renderStep2(container, draftPlan, onNext, onBack) {
  container.innerHTML = '';
  var wrapper = document.createElement('div');

  var cards = document.createElement('div');
  cards.className = 'ws-planner-cards';
  var selected = draftPlan.contract_type || null;

  CONTRACT_TYPES.forEach(function(ct) {
    var card = document.createElement('div');
    card.className = 'ws-planner-card' + (selected === ct.value ? ' ws-planner-card--selected' : '');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', selected === ct.value ? 'true' : 'false');

    var titleEl = document.createElement('div');
    titleEl.className = 'ws-planner-card-title';
    titleEl.textContent = ct.label;
    card.appendChild(titleEl);

    var descEl = document.createElement('div');
    descEl.className = 'ws-planner-card-desc';
    descEl.textContent = ct.desc;
    card.appendChild(descEl);

    if (ct.note) {
      var noteEl = document.createElement('div');
      noteEl.className = 'ws-planner-card-note';
      noteEl.textContent = ct.note;
      card.appendChild(noteEl);
    }

    card.addEventListener('click', function() {
      var allCards = cards.querySelectorAll('.ws-planner-card');
      for (var k = 0; k < allCards.length; k++) {
        allCards[k].classList.remove('ws-planner-card--selected');
        allCards[k].setAttribute('aria-checked', 'false');
      }
      card.classList.add('ws-planner-card--selected');
      card.setAttribute('aria-checked', 'true');
      selected = ct.value;
    });
    cards.appendChild(card);
  });
  wrapper.appendChild(cards);

  // Navigation
  var nav = document.createElement('div');
  nav.className = 'ws-planner-nav';

  var backBtn = document.createElement('button');
  backBtn.className = 'ws-planner-btn ws-planner-btn--secondary';
  backBtn.textContent = '\u2190 Back';
  backBtn.addEventListener('click', function() { onBack(); });
  nav.appendChild(backBtn);

  var nextBtn = document.createElement('button');
  nextBtn.className = 'ws-planner-btn ws-planner-btn--primary';
  nextBtn.textContent = 'Next \u2192 Requirements';
  nextBtn.addEventListener('click', function() {
    if (!selected) {
      _showError(wrapper, 'Please select a contract type.');
      return;
    }
    onNext({ contract_type: selected });
  });
  nav.appendChild(nextBtn);
  wrapper.appendChild(nav);

  container.appendChild(wrapper);
}

// --- Helper functions ---

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
  i.type = type;
  i.id = id;
  i.className = 'ws-planner-input';
  i.value = value || '';
  if (maxLen) i.maxLength = maxLen;
  return i;
}

function _select(id, options, selectedVal) {
  var s = document.createElement('select');
  s.id = id;
  s.className = 'ws-planner-select';
  var html = '<option value="">\u2014 Select \u2014</option>';
  for (var i = 0; i < options.length; i++) {
    html += '<option value="' + options[i] + '"' + (options[i] === selectedVal ? ' selected' : '') + '>' + options[i] + '</option>';
  }
  s.innerHTML = html;
  return s;
}

function _showError(parent, msg) {
  var err = parent.querySelector('.ws-planner-error');
  if (!err) {
    err = document.createElement('div');
    err.className = 'ws-planner-error';
    parent.appendChild(err);
  }
  err.textContent = msg;
  setTimeout(function() { if (err.parentNode) err.parentNode.removeChild(err); }, 4000);
}

export { CONTRACT_TYPES, LOCATIONS };
