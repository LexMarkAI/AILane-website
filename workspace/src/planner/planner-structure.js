// planner-structure.js — Step 4: Structure Guide
// Spec: KLWS-001 §4.2 Step 4, KLUI-001 §3.6
// LEGAL BOUNDARY: Shows typical structure. Does NOT prescribe what to write.

var CONTRACT_SECTIONS = [
  {
    id: 'parties',
    name: 'Parties & Commencement',
    description: 'Identifies the employer and employee, start date, and continuous employment date.',
    mandatory: true,
    pillarMappings: ['CC'],
    statutoryBasis: 'ERA 1996 s.1(3), s.1(4)(a)–(b)'
  },
  {
    id: 'job_role',
    name: 'Job Title, Description & Duties',
    description: 'Defines the role, reporting structure, and scope of responsibilities.',
    mandatory: true,
    pillarMappings: ['CC'],
    statutoryBasis: 'ERA 1996 s.1(4)(f)'
  },
  {
    id: 'place_of_work',
    name: 'Place of Work',
    description: 'Primary workplace and any requirement to work at other locations.',
    mandatory: true,
    pillarMappings: ['CC'],
    statutoryBasis: 'ERA 1996 s.1(4)(h)'
  },
  {
    id: 'hours',
    name: 'Hours of Work',
    description: 'Normal working hours, overtime arrangements, and Working Time Regulations applicability.',
    mandatory: true,
    pillarMappings: ['CC'],
    statutoryBasis: 'ERA 1996 s.1(4)(c), WTR 1998'
  },
  {
    id: 'remuneration',
    name: 'Remuneration & Pay',
    description: 'Salary or wage rate, payment frequency, and method of payment.',
    mandatory: true,
    pillarMappings: ['CC', 'SPA'],
    statutoryBasis: 'ERA 1996 s.1(4)(a), NMW Act 1998'
  },
  {
    id: 'holiday',
    name: 'Holiday & Annual Leave',
    description: 'Holiday entitlement, accrual method, carry-over provisions, and holiday pay calculation.',
    mandatory: true,
    pillarMappings: ['CC'],
    statutoryBasis: 'ERA 1996 s.1(4)(d)(i), WTR 1998 Regs.13–16'
  },
  {
    id: 'sickness',
    name: 'Sickness Absence & SSP',
    description: 'Sickness notification, SSP entitlement, and any contractual sick pay arrangements.',
    mandatory: true,
    pillarMappings: ['CC', 'SPA'],
    statutoryBasis: 'ERA 1996 s.1(4)(d)(ii), SSP Act 1994'
  },
  {
    id: 'pension',
    name: 'Pension',
    description: 'Pension scheme participation, auto-enrolment obligations, and employer contributions.',
    mandatory: true,
    pillarMappings: ['CC'],
    statutoryBasis: 'ERA 1996 s.1(4)(d)(iii), PA 2008'
  },
  {
    id: 'notice',
    name: 'Notice Periods & Termination',
    description: 'Notice requirements for both parties, statutory minimum periods, and termination conditions.',
    mandatory: true,
    pillarMappings: ['CC'],
    statutoryBasis: 'ERA 1996 s.1(4)(e), s.86'
  },
  {
    id: 'disciplinary',
    name: 'Disciplinary & Grievance Procedures',
    description: 'Reference to applicable procedures or details of the procedure itself.',
    mandatory: true,
    pillarMappings: ['CC', 'GO'],
    statutoryBasis: 'ERA 1996 s.3, ACAS Code of Practice'
  },
  {
    id: 'data_protection',
    name: 'Data Protection',
    description: 'Processing of employee personal data, lawful basis, and privacy notice reference.',
    mandatory: false,
    pillarMappings: ['PA'],
    statutoryBasis: 'UK GDPR Art.13–14, DPA 2018'
  },
  {
    id: 'health_safety',
    name: 'Health & Safety',
    description: 'Employer and employee obligations under health and safety legislation.',
    mandatory: false,
    pillarMappings: ['PA'],
    statutoryBasis: 'HSWA 1974 s.2–7'
  },
  {
    id: 'training',
    name: 'Training & Development',
    description: 'Mandatory training requirements, entitlement to request training, and study leave.',
    mandatory: false,
    pillarMappings: ['TD'],
    statutoryBasis: 'ERA 1996 s.63D–63I'
  },
  {
    id: 'collective',
    name: 'Collective Agreements',
    description: 'Any collective agreements that directly affect the terms and conditions of employment.',
    mandatory: true,
    pillarMappings: ['CC'],
    statutoryBasis: 'ERA 1996 s.1(4)(j)'
  },
  {
    id: 'confidentiality',
    name: 'Confidentiality & Intellectual Property',
    description: 'Obligations regarding confidential information and ownership of work product.',
    mandatory: false,
    pillarMappings: [],
    statutoryBasis: 'Common law implied terms'
  },
  {
    id: 'restrictive',
    name: 'Restrictive Covenants',
    description: 'Post-termination restrictions on competition, solicitation, and dealing.',
    mandatory: false,
    pillarMappings: [],
    statutoryBasis: 'Common law restraint of trade doctrine'
  }
];

/**
 * Renders Step 4 — Structure Guide.
 * Maps contract sections to requirements from the Step 3 snapshot.
 *
 * @param {HTMLElement} container
 * @param {Object} plan - plan object with requirement_snapshot
 * @param {Object} user - window.__ailaneUser
 * @param {Function} onNext - callback to advance to Step 5
 * @param {Function} onBack - callback to return to Step 3
 * @param {Function} onSectionSelect - context bus callback
 */
export function renderStep4(container, plan, user, onNext, onBack, onSectionSelect) {
  container.innerHTML = '';

  // Inline disclaimer — VERBATIM from KLWS-001 §5.1 Touchpoint 4. DO NOT MODIFY.
  var notice = document.createElement('div');
  notice.className = 'ws-planner-req-notice';
  notice.textContent = 'This structure shows how employment contracts are typically organised. Your specific contract structure should be reviewed by a qualified employment solicitor.';
  container.appendChild(notice);

  // Get requirement snapshot from plan
  var snapshot = plan.requirement_snapshot || [];
  // Build a map of pillarMapping → requirements for quick lookup
  var reqsByPillar = {};
  snapshot.forEach(function(req) {
    var pillar = req.pillar_mapping || '';
    if (!reqsByPillar[pillar]) reqsByPillar[pillar] = [];
    reqsByPillar[pillar].push(req);
  });

  // Track which sections the user selects as relevant
  var selections = plan.structure_selections || {};
  // Default: all mandatory sections selected
  CONTRACT_SECTIONS.forEach(function(sec) {
    if (selections[sec.id] === undefined) {
      selections[sec.id] = sec.mandatory;
    }
  });

  // Section list
  var sectionList = document.createElement('div');
  sectionList.className = 'ws-structure-list';

  CONTRACT_SECTIONS.forEach(function(section) {
    var card = document.createElement('div');
    card.className = 'ws-structure-card' + (section.mandatory ? ' ws-structure-card--mandatory' : ' ws-structure-card--recommended');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'listitem');

    // Header row: checkbox + name + mandatory badge
    var header = document.createElement('div');
    header.className = 'ws-structure-card-header';

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!selections[section.id];
    cb.className = 'ws-structure-card-check';
    cb.setAttribute('aria-label', 'Include ' + section.name + ' in contract structure');
    if (section.mandatory) {
      cb.checked = true;
      cb.disabled = true;
      cb.title = 'Mandatory — required by statute';
    }
    cb.addEventListener('change', function(e) {
      e.stopPropagation();
      selections[section.id] = cb.checked;
    });
    header.appendChild(cb);

    var nameEl = document.createElement('span');
    nameEl.className = 'ws-structure-card-name';
    nameEl.textContent = section.name;
    header.appendChild(nameEl);

    var badge = document.createElement('span');
    badge.className = section.mandatory ? 'ws-structure-badge--mandatory' : 'ws-structure-badge--recommended';
    badge.textContent = section.mandatory ? 'Mandatory' : 'Recommended';
    header.appendChild(badge);

    card.appendChild(header);

    // Description
    var desc = document.createElement('div');
    desc.className = 'ws-structure-card-desc';
    desc.textContent = section.description;
    card.appendChild(desc);

    // Statutory basis
    var basis = document.createElement('div');
    basis.className = 'ws-structure-card-basis';
    basis.textContent = section.statutoryBasis;
    card.appendChild(basis);

    // Linked requirements (from snapshot, matched by pillar)
    var linkedReqs = [];
    section.pillarMappings.forEach(function(pm) {
      if (reqsByPillar[pm]) {
        linkedReqs = linkedReqs.concat(reqsByPillar[pm]);
      }
    });

    if (linkedReqs.length > 0) {
      var reqCount = document.createElement('div');
      reqCount.className = 'ws-structure-card-reqs';
      reqCount.textContent = linkedReqs.length + ' requirement' + (linkedReqs.length !== 1 ? 's' : '') + ' apply to this section';
      card.appendChild(reqCount);

      // Expandable requirement detail
      var reqDetail = document.createElement('div');
      reqDetail.className = 'ws-structure-card-req-detail';
      reqDetail.style.display = 'none';
      linkedReqs.forEach(function(r) {
        var row = document.createElement('div');
        row.className = 'ws-structure-req-item';
        row.innerHTML = '<span class="ws-structure-req-name">' + (r.requirement_name || '') + '</span>' +
          '<span class="ws-structure-req-source">' + (r.statutory_basis || '') + '</span>' +
          (r.addressed ? '<span class="ws-structure-req-addressed">\u2713 Addressed</span>' : '<span class="ws-structure-req-gap">\u2717 Not addressed</span>');
        reqDetail.appendChild(row);
      });
      card.appendChild(reqDetail);

      // Toggle expand
      reqCount.style.cursor = 'pointer';
      reqCount.addEventListener('click', function(e) {
        e.stopPropagation();
        var isOpen = reqDetail.style.display !== 'none';
        reqDetail.style.display = isOpen ? 'none' : 'block';
        reqCount.textContent = (isOpen ? '\u25B6 ' : '\u25BC ') + linkedReqs.length + ' requirement' + (linkedReqs.length !== 1 ? 's' : '') + ' apply to this section';
      });
    }

    // Card click emits context bus signal
    card.addEventListener('click', function(e) {
      if (e.target === cb) return;
      if (onSectionSelect) {
        onSectionSelect({ sectionId: section.id, sectionName: section.name, requirementCount: linkedReqs.length });
      }
    });

    sectionList.appendChild(card);
  });

  container.appendChild(sectionList);

  // Summary
  var mandatoryCount = CONTRACT_SECTIONS.filter(function(s) { return s.mandatory; }).length;
  var selectedCount = Object.keys(selections).filter(function(k) { return selections[k]; }).length;
  var summaryEl = document.createElement('div');
  summaryEl.className = 'ws-structure-summary';
  summaryEl.textContent = selectedCount + ' of ' + CONTRACT_SECTIONS.length + ' sections selected (' + mandatoryCount + ' mandatory)';
  container.appendChild(summaryEl);

  // Navigation
  var nav = document.createElement('div');
  nav.className = 'ws-planner-nav';

  var backBtn = document.createElement('button');
  backBtn.className = 'ws-planner-btn ws-planner-btn--secondary';
  backBtn.textContent = '\u2190 Back to Requirements';
  backBtn.addEventListener('click', function() { onBack(); });
  nav.appendChild(backBtn);

  var nextBtn = document.createElement('button');
  nextBtn.className = 'ws-planner-btn ws-planner-btn--primary';
  nextBtn.textContent = 'Next \u2192 Gap Analysis';
  nextBtn.addEventListener('click', function() {
    _saveStructure(plan.id, user, selections, function() {
      onNext({ structure_selections: selections });
    });
  });
  nav.appendChild(nextBtn);

  container.appendChild(nav);
}

function _saveStructure(planId, user, selections, callback) {
  var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
  fetch(SUPABASE_URL + '/rest/v1/kl_contract_plans?id=eq.' + planId, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + user.token,
      'apikey': window.__SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ structure_selections: selections, current_step: 4 })
  }).then(function() { if (callback) callback(); })
    .catch(function(err) { console.error('Structure save failed:', err); if (callback) callback(); });
}

export { CONTRACT_SECTIONS };
