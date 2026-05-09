/* ============================================================
   AI LANE × DUN & BRADSTREET DEAL ROOM — DEAL CREATOR
   ------------------------------------------------------------
   Page-local controller. Auth and sign-out are inherited from
   the parent /partners/dnb-2026/script.js (RULE 26 / RULE 2 —
   JWT decode + raw fetch). This script handles Deal-Creator-only
   concerns: tier / scope / overlay panel renderers, live
   recompute against pricing_quote_function_v4 +
   compute_scope_universe + get_pricing_ceilings_v3, the
   Save Configuration → cppp-generate-receipt flow, the
   Lodge as FCR → fcr-lodge flow, and a page-local
   Discuss-with-Eileen context-passing wrapper (Path iii per
   Director STOP 1 acknowledgement — no parent script.js
   modification).

   STOP gate progression (this file is built up across stops):
     STOP 2 — Scaffolding + populateDealCreator window shim   ◀ this commit
     STOP 3 — Panel 1 tier renderer
     STOP 4 — Panel 2 scope renderer + compute_scope_universe wire
     STOP 5 — Panel 3 overlay renderer + locked-row UX
     STOP 6 — Quote pane + pricing_quote_function_v4 recompute
     STOP 7 — Save Configuration → cppp-generate-receipt
     STOP 8 — Discuss with Eileen context-passing (path iii)

   Brief: AILANE-CC-BRIEF-DEALROOM-DEAL-CREATOR-BUILD-001 v1.0
   ============================================================ */

(function () {
  var CLID = 'dnb-2026-001';

  // ─── Panel 1 — Tier definitions ─────────────────────────
  // RULE 11: form value attributes ARE the canonical DB tier strings —
  // operational_readiness / governance / institutional. AMD-123 display
  // rename ("Institutional" → "Enterprise") applies to the visible label
  // ONLY; the DB string stays "institutional" for backwards compatibility
  // with kl-access and the wider tier-resolution pathway.
  var TIER_DEFINITIONS = [
    {
      code: 'operational_readiness',
      label: 'Operational Readiness',
      description: 'Operational-depth access across sector, geography, industry, and the ACEI intelligence layer.'
    },
    {
      code: 'governance',
      label: 'Governance',
      description: 'Operational depth plus governance-depth scope and the RRI intelligence layer.'
    },
    {
      code: 'institutional',
      label: 'Enterprise',
      description: 'Full estate access including the CCI intelligence layer; postcode-level geography on request.'
    }
  ];

  // Window-level dispatch shim. Director STOP 1 acknowledgement, item 3
  // (Path A): after the §6 / STOP 9 slug rename, parent script.js's
  // revealPage() will dispatch `populateDealCreator(window.__dealRoomUser)`
  // when location.pathname includes '/deal-creator/'. Defining the symbol
  // at window level here resolves that dispatch without ReferenceError.
  // The actual page-local initialisation runs via DOMContentLoaded below;
  // the shim itself is intentionally a no-op.
  window.populateDealCreator = function (_user) {
    /* no-op — page self-initialises via DOMContentLoaded below. */
  };

  // ─── HTML escape (mirrors parent script.js pattern) ─────
  function escapeHtml_(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ─── Panel 1 — render tier radio cards (§4.2) ───────────
  function renderPanel1Tier_() {
    var container = document.querySelector('#panel-1-tier .dc-tier-cards');
    if (!container) return;

    var html = TIER_DEFINITIONS.map(function (t) {
      var inputId = 'dc-tier-' + t.code;
      return (
        '<label class="dc-tier-card" data-tier="' + t.code + '" for="' + inputId + '">' +
          '<div class="dc-tier-card-row">' +
            '<input type="radio" id="' + inputId + '" name="tier" value="' + t.code + '" />' +
            '<div class="dc-tier-card-content">' +
              '<h3>' +
                '<span class="dc-tier-accent" aria-hidden="true">●</span>' +
                escapeHtml_(t.label) +
              '</h3>' +
              '<p class="dc-tier-card-desc">' + escapeHtml_(t.description) + '</p>' +
            '</div>' +
          '</div>' +
        '</label>'
      );
    }).join('');

    container.innerHTML = html;

    container.addEventListener('change', function (ev) {
      if (!ev.target || ev.target.name !== 'tier') return;
      onTierChange_(ev.target.value);
    });
  }

  function onTierChange_(tier) {
    var cards = document.querySelectorAll('.dc-tier-card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-tier') === tier) {
        cards[i].classList.add('is-selected');
      } else {
        cards[i].classList.remove('is-selected');
      }
    }

    try {
      if (window.gtag) {
        window.gtag('event', 'deal_creator_tier_selected', { clid: CLID, tier: tier });
      }
    } catch (e) { /* swallow */ }

    applyTierGating_(tier);
  }

  // ─── Tier-gating refresh stub ───────────────────────────
  // STOPs 4 (Panel 2 scope content) and 5 (Panel 3 overlay content) flesh
  // this out per the §3.3 Stage 0 visibility table. At STOP 3 Panel 2 and
  // Panel 3 contain only structural placeholders, so there is nothing to
  // gate yet — the function exists so onTierChange_ has a stable callee.
  function applyTierGating_(_tier) {
    /* no-op at STOP 3 — Panel 2/3 content lands at STOPs 4-5. */
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderPanel1Tier_();
    // STOP 4-8 wire scope panel, overlays, recompute pipeline, submit and
    // Eileen context-passing flows here.

    try {
      if (window.gtag) {
        window.gtag('event', 'deal_creator_view', { clid: CLID });
      }
    } catch (e) { /* swallow */ }
  });
})();
