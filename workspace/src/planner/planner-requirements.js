// planner-requirements.js — Step 3 Requirement Assembly
// Spec: KLWS-001 §4.2 Step 3, §4.3, KLUI-001 §3.6
// Data: regulatory_requirements table (71 requirements, READ ONLY)
// Schema verified: 24 March 2026

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';

var STATUS_LABELS = {
  'commenced': 'Commenced',
  'in_force': 'In Force',
  'pending_commencement': 'Awaiting Commencement Date',
  'pending_consultation': 'Subject to Consultation',
  'pending_si': 'Awaiting Statutory Instrument'
};

var CATEGORY_LABELS = {
  'written_particulars': 'Written Particulars',
  'handbook_policies': 'Handbook & Policies'
};

/**
 * Fetches requirements and renders the requirement assembly table.
 * @param {HTMLElement} container
 * @param {Object} plan - plan object with contract_type and id
 * @param {Object} user - window.__ailaneUser
 * @param {Function|null} onNext - null in Sprint 3 (Steps 4-6 deferred)
 * @param {Function} onBack - callback to return to Step 2
 * @param {Function} onRequirementSelect - context bus callback
 */
export async function renderStep3(container, plan, user, onNext, onBack, onRequirementSelect) {
  container.innerHTML = '<div class="ws-loading">Loading requirements\u2026</div>';

  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/regulatory_requirements?select=*&order=category.asc,requirement_name.asc',
      {
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!resp.ok) throw new Error('Failed to load requirements');
    var allReqs = await resp.json();

    // Filter: contract context — applies_to = 'contract' or 'both'
    var filtered = allReqs.filter(function(r) {
      return r.applies_to === 'contract' || r.applies_to === 'both';
    });

    // Separate current vs forward
    var current = filtered.filter(function(r) { return !r.is_forward_requirement; });
    var forward = filtered.filter(function(r) { return r.is_forward_requirement === true; });

    container.innerHTML = '';

    // Inline disclaimer — VERBATIM from KLWS-001 §5.1 Touchpoint 3. DO NOT MODIFY.
    var notice = document.createElement('div');
    notice.className = 'ws-planner-req-notice';
    notice.textContent = 'These are statutory requirements identified from UK employment law. They are presented as facts of law, not as recommendations for your specific contract.';
    container.appendChild(notice);

    // Summary
    var summary = document.createElement('div');
    summary.className = 'ws-planner-req-summary';
    var typeLabel = _contractTypeLabel(plan.contract_type);
    summary.textContent = filtered.length + ' requirements identified for your ' + typeLabel + ' contract (' + current.length + ' current, ' + forward.length + ' forward)';
    container.appendChild(summary);

    // Search filter
    var searchBar = document.createElement('input');
    searchBar.type = 'text';
    searchBar.className = 'ws-planner-input';
    searchBar.placeholder = 'Filter requirements\u2026';
    searchBar.setAttribute('aria-label', 'Filter requirements');
    container.appendChild(searchBar);

    // Addressed state tracking
    var addressedState = {};

    // Current requirements table
    var tableContainer = document.createElement('div');
    tableContainer.className = 'ws-planner-req-table';
    current.forEach(function(req) {
      addressedState[req.id] = false;
      tableContainer.appendChild(_reqRow(req, false, addressedState, onRequirementSelect));
    });
    container.appendChild(tableContainer);

    // Forward requirements section
    if (forward.length > 0) {
      var divider = document.createElement('div');
      divider.className = 'ws-planner-forward-divider';
      container.appendChild(divider);

      var fwdHeader = document.createElement('div');
      fwdHeader.className = 'ws-planner-forward-header';
      fwdHeader.textContent = 'Forward-Looking Requirements \u2014 ERA 2025 (Not Yet In Force)';
      container.appendChild(fwdHeader);

      // FWD-001 structural separation notice
      var fwdNotice = document.createElement('div');
      fwdNotice.className = 'ws-planner-req-notice';
      fwdNotice.textContent = 'These requirements reflect provisions that have been enacted but are not yet in force. They are included for planning purposes. Your current compliance obligations are defined by the requirements above.';
      container.appendChild(fwdNotice);

      var fwdTable = document.createElement('div');
      fwdTable.className = 'ws-planner-req-table';
      forward.forEach(function(req) {
        addressedState[req.id] = false;
        fwdTable.appendChild(_reqRow(req, true, addressedState, onRequirementSelect));
      });
      container.appendChild(fwdTable);
    }

    // Search filter handler
    searchBar.addEventListener('input', function() {
      var q = searchBar.value.toLowerCase();
      var rows = container.querySelectorAll('.ws-planner-req-row');
      for (var i = 0; i < rows.length; i++) {
        rows[i].style.display = rows[i].textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
      }
    });

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
    nextBtn.textContent = 'Next \u2192 Structure Guide';
    nextBtn.addEventListener('click', async function() {
      var snapshot = filtered.map(function(r) {
        return {
          id: r.id,
          requirement_name: r.requirement_name,
          statutory_basis: r.statutory_basis,
          category: r.category,
          mandatory: r.mandatory,
          is_forward_requirement: r.is_forward_requirement,
          pillar_mapping: r.pillar_mapping,
          addressed: !!addressedState[r.id]
        };
      });
      try {
        await fetch(SUPABASE_URL + '/rest/v1/kl_contract_plans?id=eq.' + plan.id, {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ requirement_snapshot: snapshot, current_step: 4, status: 'in_progress' })
        });
      } catch(e) { console.error('Snapshot save failed:', e); }
      if (onNext) onNext(snapshot);
    });
    nav.appendChild(nextBtn);

    container.appendChild(nav);

  } catch (err) {
    container.innerHTML = '<div class="ws-error">Unable to load requirements. Please try again.</div>';
  }
}

function _reqRow(req, isForward, addressedState, onSelect) {
  var row = document.createElement('div');
  row.className = 'ws-planner-req-row' + (isForward ? ' ws-planner-req-row--forward' : '');
  row.setAttribute('tabindex', '0');
  row.setAttribute('role', 'row');

  var main = document.createElement('div');
  main.className = 'ws-planner-req-main';

  // Addressed checkbox
  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'ws-planner-req-status';
  cb.checked = !!addressedState[req.id];
  cb.setAttribute('aria-label', 'Mark ' + req.requirement_name + ' as addressed');
  cb.addEventListener('change', function(e) {
    e.stopPropagation();
    addressedState[req.id] = cb.checked;
  });
  main.appendChild(cb);

  // Requirement name
  var name = document.createElement('span');
  name.className = 'ws-planner-req-name';
  name.textContent = req.requirement_name;
  main.appendChild(name);

  // Statutory source
  var source = document.createElement('span');
  source.className = 'ws-planner-req-source';
  source.textContent = req.statutory_basis || '';
  main.appendChild(source);

  // Category badge
  var cat = document.createElement('span');
  cat.className = 'ws-planner-req-cat';
  cat.textContent = CATEGORY_LABELS[req.category] || req.category;
  main.appendChild(cat);

  // Mandatory shield
  if (req.mandatory) {
    var shield = document.createElement('span');
    shield.className = 'ws-planner-req-mandatory';
    shield.title = 'Mandatory requirement';
    shield.setAttribute('aria-label', 'Mandatory');
    shield.textContent = '\uD83D\uDEE1\uFE0F';
    main.appendChild(shield);
  }

  row.appendChild(main);

  // Expandable detail
  var detail = document.createElement('div');
  detail.className = 'ws-planner-req-detail';
  detail.style.display = 'none';

  var detailHTML = '<div><strong>Description:</strong> ' + (req.description || 'No description available') + '</div>';
  if (req.current_minimum) detailHTML += '<div><strong>Current minimum:</strong> ' + req.current_minimum + '</div>';
  if (req.check_logic) detailHTML += '<div><strong>Assessment basis:</strong> ' + req.check_logic + '</div>';
  if (isForward && req.effective_from) detailHTML += '<div><strong>Effective from:</strong> ' + req.effective_from + '</div>';
  if (isForward && req.source_act) detailHTML += '<div><strong>Source act:</strong> ' + req.source_act + '</div>';
  if (isForward && req.commencement_status) detailHTML += '<div><strong>Commencement status:</strong> ' + (STATUS_LABELS[req.commencement_status] || req.commencement_status) + '</div>';
  detail.innerHTML = detailHTML;

  // Toggle expand on row click (not on checkbox)
  main.addEventListener('click', function(e) {
    if (e.target === cb) return;
    var isOpen = detail.style.display !== 'none';
    detail.style.display = isOpen ? 'none' : 'block';
    row.classList.toggle('ws-planner-req-row--expanded', !isOpen);
    if (!isOpen && onSelect) {
      onSelect({ requirementId: req.id, requirementName: req.requirement_name, statutoryBasis: req.statutory_basis });
    }
  });

  row.appendChild(detail);
  return row;
}

function _contractTypeLabel(value) {
  var labels = {
    'permanent_ft': 'Permanent Full-Time',
    'permanent_pt': 'Permanent Part-Time',
    'fixed_term': 'Fixed-Term',
    'zero_hours': 'Zero-Hours',
    'casual': 'Casual',
    'agency': 'Agency Worker'
  };
  return labels[value] || value;
}

export { STATUS_LABELS, CATEGORY_LABELS };
