/* ============================================================
   AI LANE × DUN & BRADSTREET DEAL ROOM — PATHWAY SVG
   ------------------------------------------------------------
   Click-to-expand detail panels for the inline SVG pathway diagram.
   Sourced from AILANE-ROADMAP-DNB-001 v1.3 §3.
   Brief: AILANE-CC-BRIEF-DEAL-ROOM-PHASE-1B-001 v1.0 §8.4.
   ============================================================ */

(function () {
  var PHASE_DETAILS = {
    A: {
      title: 'Phase A — Roadmap & routing',
      timing: 'Earliest: April 2026 · Envelope: April–May 2026',
      description: 'The engagement roadmap, commercial proposal, and Legal & Audit pack are released to this workspace. D&B routes the partnership internally and the engagement record is opened. AI Lane prepares the mutual NDA template against the proposal\'s confidentiality covering terms.',
      activities: [
        'Roadmap and proposal review by D&B',
        'Internal routing acknowledgement by D&B',
        'Engagement record opened by AI Lane',
        'NDA template prepared'
      ],
      deliverable: 'Routing acknowledged; Phase A documents released; deal-room workspace seeded.'
    },
    B: {
      title: 'Phase B — NDA execution & Pilot SOW preparation',
      timing: 'Earliest: May 2026 · Envelope: May–June 2026',
      description: 'A mutual non-disclosure agreement is executed between AI Lane and Dun & Bradstreet. The Pilot Statement of Work is scoped against the per-package data field schedule. NDA execution unlocks subsequent document releases in this workspace.',
      activities: [
        'Mutual NDA review and execution',
        'Pilot SOW scoped against package selection',
        'Per-package field schedule confirmed',
        'Joint legal review of Pilot SOW terms'
      ],
      deliverable: 'NDA executed; Pilot SOW circulated for execution; DPIA addendum staged.'
    },
    C: {
      title: 'Phase C — Pilot SOW execution & pilot delivery',
      timing: 'Earliest: June 2026 · Envelope: June–August 2026',
      description: 'Pilot SOW signed; pilot fee received; per-CLID DPIA addendum executed; data exchange initiated. Pilot delivery proceeds against the field schedule and KPI definitions specified in the proposal.',
      activities: [
        'Pilot SOW execution and fee receipt',
        'Per-CLID DPIA addendum executed',
        'Pilot data exchange initiated',
        'KPI dashboards activated for the pilot window'
      ],
      deliverable: 'Pilot in active delivery; KPI baselines established; data exchange flowing.'
    },
    D: {
      title: 'Phase D — Pilot complete & MCA negotiation',
      timing: 'Earliest: August 2026 · Envelope: August–October 2026',
      description: 'Pilot delivery completes; package selection is confirmed; Master Commercial Agreement negotiation opens under the 60-day negotiation lock-in. Package economics are finalised, including renewal cascade timing.',
      activities: [
        'Pilot delivery sign-off and KPI review',
        'Package selection confirmed',
        '60-day MCA negotiation lock-in opened',
        'Renewal cascade cadence agreed'
      ],
      deliverable: 'Pilot complete; package selection confirmed; MCA terms in active negotiation.'
    },
    E: {
      title: 'Phase E — MCA execution & production rollout',
      timing: 'Earliest: October 2026 · Envelope: Q4 2026',
      description: 'Master Commercial Agreement executed; production data exchange begins; reconciliation reports and KPI dashboards activate. Director-level review checkpoints are scheduled at week 4 and week 12.',
      activities: [
        'MCA execution',
        'Production data exchange initiated',
        'Reconciliation reports activated',
        'Director review at week 4 and week 12'
      ],
      deliverable: 'MCA executed; production rollout in flight; review cadence established.'
    },
    F: {
      title: 'Phase F — Renewal cascade',
      timing: 'Earliest: 2027 · Envelope: per renewal cycle',
      description: 'Anniversary renewal cascade across packages, with expansion options reviewed at each cycle. Renewal cadence and pricing review windows are anchored in the MCA.',
      activities: [
        'Anniversary renewal cycle initiated',
        'Expansion options reviewed',
        'Pricing review window honoured per MCA',
        'Renewal terms re-executed'
      ],
      deliverable: 'Partnership renewed; expansion scope confirmed for the next cycle.'
    }
  };

  function showPhase(letter, phases, panel) {
    var d = PHASE_DETAILS[letter];
    if (!d || !panel) return;

    panel.innerHTML =
      '<h3 class="dr-pathway-detail-title"></h3>' +
      '<p class="dr-pathway-detail-timing"></p>' +
      '<p class="dr-pathway-detail-desc"></p>' +
      '<h4 class="dr-pathway-detail-h">Activities</h4>' +
      '<ul class="dr-pathway-detail-activities"></ul>' +
      '<h4 class="dr-pathway-detail-h">Deliverable</h4>' +
      '<p class="dr-pathway-detail-deliverable"></p>';

    panel.querySelector('.dr-pathway-detail-title').textContent = d.title;
    panel.querySelector('.dr-pathway-detail-timing').textContent = d.timing;
    panel.querySelector('.dr-pathway-detail-desc').textContent = d.description;
    panel.querySelector('.dr-pathway-detail-deliverable').textContent = d.deliverable;
    var ul = panel.querySelector('.dr-pathway-detail-activities');
    for (var i = 0; i < d.activities.length; i++) {
      var li = document.createElement('li');
      li.textContent = d.activities[i];
      ul.appendChild(li);
    }

    for (var j = 0; j < phases.length; j++) {
      if (phases[j].getAttribute('data-phase') === letter) {
        phases[j].classList.add('is-selected');
      } else {
        phases[j].classList.remove('is-selected');
      }
    }

    try {
      if (window.gtag) {
        window.gtag('event', 'pathway_phase_expand', { phase: letter });
      }
    } catch (e) { /* swallow */ }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var panel = document.getElementById('dr-pathway-detail-panel');
    if (!panel) return;
    var phases = document.querySelectorAll('.dr-pathway-phase');
    if (phases.length === 0) return;

    for (var i = 0; i < phases.length; i++) {
      (function (el) {
        el.addEventListener('click', function () { showPhase(el.getAttribute('data-phase'), phases, panel); });
        el.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            showPhase(el.getAttribute('data-phase'), phases, panel);
          }
        });
      })(phases[i]);
    }
  });
})();
