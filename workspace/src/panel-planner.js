// panel-planner.js — Contract Planner Panel Orchestrator
// Spec: KLUI-001 §3.6, KLWS-001 §4, PCIE-003-AM-001
// Tier: governance, institutional ONLY

import { renderDisclaimerGate, isDisclaimerAcknowledged } from './planner/planner-disclaimer.js';
import { renderStep1, renderStep2, CONTRACT_TYPES } from './planner/planner-steps.js';
import { renderStep3 } from './planner/planner-requirements.js';

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
var TIER_GATE = ['governance', 'institutional'];

var TYPE_LABELS = {};
CONTRACT_TYPES.forEach(function(ct) { TYPE_LABELS[ct.value] = ct.label; });

var PLAN_STATUS_LABELS = {
  'draft': 'Draft',
  'in_progress': 'In Progress',
  'complete': 'Complete',
  'exported': 'Exported'
};

function PlannerPanel(container) {
  this._container = container;
  this._user = window.__ailaneUser;
  this._draftPlan = {};
  this._currentPlanId = null;

  // Defence-in-depth tier check
  if (!this._user || TIER_GATE.indexOf(this._user.tier) === -1) {
    this._renderLocked();
    return;
  }

  // Disclaimer gate
  if (!isDisclaimerAcknowledged()) {
    var self = this;
    renderDisclaimerGate(this._container, function() { self._renderPlanList(); });
  } else {
    this._renderPlanList();
  }
}

PlannerPanel.prototype._renderLocked = function() {
  this._container.innerHTML =
    '<div class="ws-planner-locked">' +
      '<div class="ws-planner-locked-icon">\uD83D\uDD12</div>' +
      '<h3>Contract Planner</h3>' +
      '<p>The Contract Planner is a guided requirement assembly tool that identifies what your employment contracts need to address under UK employment law.</p>' +
      '<p>Available on the Governance plan.</p>' +
      '<a href="/intelligence/" class="ws-planner-locked-cta">Explore Governance \u2192</a>' +
    '</div>';
};

PlannerPanel.prototype._renderPlanList = async function() {
  this._container.innerHTML = '<div class="ws-loading">Loading plans\u2026</div>';
  var self = this;

  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/kl_contract_plans?user_id=eq.' + this._user.id + '&order=updated_at.desc',
      {
        headers: {
          'Authorization': 'Bearer ' + this._user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    var plans = resp.ok ? await resp.json() : [];

    this._container.innerHTML = '';

    // Header
    var header = document.createElement('div');
    header.className = 'ws-panel-header';
    header.innerHTML = '<h3>Contract Planner</h3>';
    this._container.appendChild(header);

    // New Plan button
    var newBtn = document.createElement('button');
    newBtn.className = 'ws-planner-btn ws-planner-btn--primary';
    newBtn.textContent = '+ New Plan';
    newBtn.addEventListener('click', function() {
      self._draftPlan = {};
      self._currentPlanId = null;
      self._renderStep(1);
    });
    this._container.appendChild(newBtn);

    if (plans.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'ws-planner-empty';
      empty.textContent = 'No contract plans yet. Create one to identify the statutory requirements your employment contracts need to address.';
      this._container.appendChild(empty);
    } else {
      var list = document.createElement('div');
      list.className = 'ws-planner-plan-list';
      plans.forEach(function(plan) {
        var item = document.createElement('div');
        item.className = 'ws-planner-plan-item';
        item.setAttribute('tabindex', '0');

        var nameEl = document.createElement('div');
        nameEl.className = 'ws-planner-plan-name';
        nameEl.textContent = plan.plan_name;
        item.appendChild(nameEl);

        var meta = document.createElement('div');
        meta.className = 'ws-planner-plan-meta';
        var typeSpan = document.createElement('span');
        typeSpan.className = 'ws-planner-plan-type';
        typeSpan.textContent = TYPE_LABELS[plan.contract_type] || plan.contract_type;
        meta.appendChild(typeSpan);
        var statusSpan = document.createElement('span');
        statusSpan.className = 'ws-planner-plan-status';
        statusSpan.textContent = PLAN_STATUS_LABELS[plan.status] || plan.status;
        meta.appendChild(statusSpan);
        item.appendChild(meta);

        var dateEl = document.createElement('div');
        dateEl.className = 'ws-planner-plan-date';
        dateEl.textContent = 'Last updated: ' + new Date(plan.updated_at).toLocaleDateString('en-GB');
        item.appendChild(dateEl);

        item.addEventListener('click', function() {
          self._currentPlanId = plan.id;
          self._draftPlan = {
            plan_name: plan.plan_name,
            sector: plan.employer_profile ? plan.employer_profile.sector : '',
            size: plan.employer_profile ? plan.employer_profile.size : '',
            location: plan.employer_profile ? plan.employer_profile.location : '',
            jurisdiction: plan.jurisdiction,
            workforce: plan.employer_profile ? (plan.employer_profile.workforce || []) : [],
            contract_type: plan.contract_type
          };
          // Cap at step 3 for Sprint 3a
          self._renderStep(Math.min(plan.current_step || 1, 3));
        });
        list.appendChild(item);
      });
      this._container.appendChild(list);
    }
  } catch (err) {
    this._container.innerHTML = '<div class="ws-error">Unable to load plans. Please try again.</div>';
  }
};

PlannerPanel.prototype._renderStep = function(step) {
  this._container.innerHTML = '';
  this._container.appendChild(this._renderStepBar(step));

  var content = document.createElement('div');
  content.className = 'ws-planner-step-content';
  this._container.appendChild(content);

  // Emit context bus signal
  if (window.__contextBus) {
    window.__contextBus.emit('planner:step:changed', { planId: this._currentPlanId, step: step });
  }

  var self = this;

  switch (step) {
    case 1:
      renderStep1(content, this._draftPlan, function(data) {
        Object.assign(self._draftPlan, data);
        self._renderStep(2);
      });
      break;

    case 2:
      renderStep2(content, this._draftPlan,
        async function(data) {
          Object.assign(self._draftPlan, data);
          await self._createOrUpdatePlan();
          self._renderStep(3);
        },
        function() { self._renderStep(1); }
      );
      break;

    case 3:
      if (!this._currentPlanId) {
        this._renderStep(2);
        return;
      }
      renderStep3(
        content,
        { contract_type: this._draftPlan.contract_type, id: this._currentPlanId },
        this._user,
        null, // onNext disabled in Sprint 3
        function() { self._renderStep(2); },
        function(reqData) {
          if (window.__contextBus) {
            window.__contextBus.emit('planner:requirement:selected', reqData);
          }
        }
      );
      break;
  }
};

PlannerPanel.prototype._renderStepBar = function(currentStep) {
  var bar = document.createElement('div');
  bar.className = 'ws-planner-steps';
  var labels = ['Profile', 'Type', 'Requirements', 'Structure', 'Gaps', 'Export'];
  var self = this;

  for (var i = 0; i < labels.length; i++) {
    var stepNum = i + 1;

    if (i > 0) {
      var connector = document.createElement('div');
      connector.className = 'ws-planner-step-connector' + (stepNum <= currentStep ? ' ws-planner-step-connector--done' : '');
      bar.appendChild(connector);
    }

    var circle = document.createElement('div');
    circle.className = 'ws-planner-step';
    circle.setAttribute('aria-label', 'Step ' + stepNum + ': ' + labels[i]);

    if (stepNum < currentStep) {
      circle.classList.add('ws-planner-step--complete', 'ws-planner-step--clickable');
      circle.textContent = '\u2713';
      (function(sn) {
        circle.addEventListener('click', function() { self._renderStep(sn); });
      })(stepNum);
    } else if (stepNum === currentStep) {
      circle.classList.add('ws-planner-step--current');
      circle.textContent = stepNum;
    } else {
      circle.classList.add('ws-planner-step--future');
      circle.textContent = stepNum;
    }
    bar.appendChild(circle);

    var lbl = document.createElement('div');
    lbl.className = 'ws-planner-step-label';
    lbl.textContent = labels[i];
    bar.appendChild(lbl);
  }
  return bar;
};

PlannerPanel.prototype._createOrUpdatePlan = async function() {
  var body = {
    user_id: this._user.id,
    org_id: this._user.orgId || null,
    plan_name: this._draftPlan.plan_name,
    employer_profile: {
      sector: this._draftPlan.sector,
      size: this._draftPlan.size,
      location: this._draftPlan.location,
      workforce: this._draftPlan.workforce || []
    },
    contract_type: this._draftPlan.contract_type,
    jurisdiction: this._draftPlan.jurisdiction || 'gb-eng',
    current_step: 2,
    status: 'in_progress'
  };

  try {
    if (this._currentPlanId) {
      await fetch(SUPABASE_URL + '/rest/v1/kl_contract_plans?id=eq.' + this._currentPlanId, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + this._user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body)
      });
    } else {
      var resp = await fetch(SUPABASE_URL + '/rest/v1/kl_contract_plans', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this._user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(body)
      });
      if (resp.ok) {
        var data = await resp.json();
        this._currentPlanId = Array.isArray(data) ? data[0].id : data.id;
      }
    }
  } catch (err) {
    console.error('Plan save failed:', err);
  }
};

PlannerPanel.prototype.destroy = function() {
  this._container.innerHTML = '';
};

// Register globally for panel-system.js
window.__PanelPlanner = function(container) {
  return new PlannerPanel(container);
};
