// planner-export.js — Step 6: Export & Referral
// Spec: KLWS-001 §4.2 Step 6, §9, §10, KLUI-001 §3.6
// LEGAL BOUNDARY: Offers export and solicitor referral. Does NOT certify compliance.

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';

/**
 * Renders Step 6 — Export & Referral.
 * @param {HTMLElement} container
 * @param {Object} plan - the complete plan object
 * @param {Object} user - window.__ailaneUser
 * @param {Function} onBack - callback to return to Step 5
 * @param {Function} onExport - context bus callback
 */
export function renderStep6(container, plan, user, onBack, onExport) {
  container.innerHTML = '';

  // Completion notice
  var completionEl = document.createElement('div');
  completionEl.className = 'ws-export-completion';
  completionEl.innerHTML = '<h3>\u2713 Requirement Analysis Complete</h3>' +
    '<p>Your contract requirement checklist, structure guide' +
    (plan.gap_analysis_upload_id ? ', and gap analysis' : '') +
    ' are ready for export.</p>';
  container.appendChild(completionEl);

  // Plan summary
  var summaryEl = document.createElement('div');
  summaryEl.className = 'ws-export-summary';
  var profile = plan.employer_profile || {};
  summaryEl.innerHTML =
    '<div class="ws-export-summary-row"><strong>Plan:</strong> ' + (plan.plan_name || '') + '</div>' +
    '<div class="ws-export-summary-row"><strong>Contract Type:</strong> ' + _typeLabel(plan.contract_type) + '</div>' +
    '<div class="ws-export-summary-row"><strong>Sector:</strong> ' + (profile.sector || '') + '</div>' +
    '<div class="ws-export-summary-row"><strong>Jurisdiction:</strong> ' + _jurisdictionLabel(plan.jurisdiction) + '</div>';
  container.appendChild(summaryEl);

  // Export buttons
  var exportSection = document.createElement('div');
  exportSection.className = 'ws-export-actions';

  var exports = [
    { label: 'Export Requirement Checklist (PDF)', icon: '\uD83D\uDCCB', type: 'checklist' },
    { label: 'Export Structure Guide (PDF)', icon: '\uD83D\uDCC4', type: 'structure' },
    { label: 'Export Full Plan (PDF)', icon: '\uD83D\uDCD1', type: 'full' }
  ];

  exports.forEach(function(exp) {
    var btn = document.createElement('button');
    btn.className = 'ws-export-btn';
    btn.innerHTML = '<span class="ws-export-btn-icon">' + exp.icon + '</span>' +
      '<span class="ws-export-btn-label">' + exp.label + '</span>';
    btn.addEventListener('click', function() {
      // kl_workspace_export Edge Function not yet deployed
      _showExportNotice(container);
      if (onExport) {
        onExport({ planId: plan.id, exportType: exp.type });
      }
    });
    exportSection.appendChild(btn);
  });

  container.appendChild(exportSection);

  // Watermark notice
  var watermarkNotice = document.createElement('div');
  watermarkNotice.className = 'ws-export-watermark-notice';
  watermarkNotice.textContent = 'All exported documents carry a visible watermark and advisory disclaimer. Watermarks are applied server-side and cannot be removed.';
  container.appendChild(watermarkNotice);

  // Legal Referral Section — KLWS-001 §9.1
  var referralSection = document.createElement('div');
  referralSection.className = 'ws-export-referral';

  var referralTitle = document.createElement('h4');
  referralTitle.textContent = 'Next Step: Legal Review';
  referralSection.appendChild(referralTitle);

  var referralText = document.createElement('p');
  referralText.textContent = 'Consider reviewing this document with a qualified employment solicitor before use.';
  referralSection.appendChild(referralText);

  var referralCta = document.createElement('a');
  referralCta.href = '/intelligence/';
  referralCta.className = 'ws-export-referral-cta';
  referralCta.textContent = 'Find a solicitor to review your contract \u2192';
  referralSection.appendChild(referralCta);

  container.appendChild(referralSection);

  // Mark plan as complete
  fetch(SUPABASE_URL + '/rest/v1/kl_contract_plans?id=eq.' + plan.id, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + user.token,
      'apikey': window.__SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ status: 'complete', current_step: 6 })
  }).catch(function(err) { console.error('Plan completion save failed:', err); });

  // Navigation
  var nav = document.createElement('div');
  nav.className = 'ws-planner-nav';

  var backBtn = document.createElement('button');
  backBtn.className = 'ws-planner-btn ws-planner-btn--secondary';
  backBtn.textContent = '\u2190 Back to Gap Analysis';
  backBtn.addEventListener('click', function() { onBack(); });
  nav.appendChild(backBtn);

  var doneBtn = document.createElement('button');
  doneBtn.className = 'ws-planner-btn ws-planner-btn--primary';
  doneBtn.textContent = 'Return to Plan List';
  doneBtn.addEventListener('click', function() {
    if (window.__plannerInstance && window.__plannerInstance._renderPlanList) {
      window.__plannerInstance._renderPlanList();
    }
  });
  nav.appendChild(doneBtn);

  container.appendChild(nav);
}

function _showExportNotice(container) {
  var existing = container.querySelector('.ws-export-pending-notice');
  if (existing) existing.remove();

  var noticeEl = document.createElement('div');
  noticeEl.className = 'ws-planner-req-notice ws-export-pending-notice';
  noticeEl.textContent = 'Server-side export with watermark \u2014 available in a future update. Your plan data is saved and will be exportable when this feature is deployed.';
  var actions = container.querySelector('.ws-export-actions');
  if (actions && actions.nextSibling) {
    actions.parentNode.insertBefore(noticeEl, actions.nextSibling);
  } else {
    container.appendChild(noticeEl);
  }
}

function _typeLabel(val) {
  var labels = {
    'permanent_ft': 'Permanent Full-Time', 'permanent_pt': 'Permanent Part-Time',
    'fixed_term': 'Fixed-Term', 'zero_hours': 'Zero-Hours',
    'casual': 'Casual', 'agency': 'Agency Worker'
  };
  return labels[val] || val;
}

function _jurisdictionLabel(val) {
  var labels = {
    'gb-eng': 'England', 'gb-sct': 'Scotland',
    'gb-wls': 'Wales', 'gb-nir': 'Northern Ireland'
  };
  return labels[val] || val;
}
