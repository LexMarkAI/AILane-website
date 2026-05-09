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

  // SUPABASE_URL + SUPABASE_ANON_KEY mirror the parent /partners/dnb-2026/script.js
  // constants — anon key is publicly embedded in client code (RULE 26 / RULE 2
  // pattern). Authenticated calls use window.__dealRoomUser.token (set by parent
  // script.js after auth completes) where available; fallback to anon for the
  // ceilings RPC which is anon-readable.
  var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';

  // Stage 0 (gate_state='phase_0') NDA-gate flags. All operative for
  // dnb-2026-001 + sim-2026-001 per §0.4 audit. Per §3.3 visibility table:
  // these scope sub-axes render as visible-but-locked cards with the
  // explanation strings below until NDA execution (Phase B).
  var STAGE_0_LOCKED = {
    sector_l3:     'Sector L3 (public granular) is unlocked at NDA execution (Phase B).',
    geography_l4:  'Local Authority granularity is unlocked at NDA execution (Phase B).',
    geography_l5:  'Postcode-district granularity is unlocked at NDA execution; Enterprise tier on-request thereafter (Phase B+).',
    industry_l4:   'SIC L4 (4-digit class) granularity is unlocked at NDA execution (Phase B).',
    intel_rri:     'RRI (Regulatory Risk Intelligence) is unlocked at NDA execution and Governance tier minimum (Phase B+).',
    intel_cci:     'CCI (Constitutional Compliance Intelligence) is unlocked at NDA execution and Enterprise tier (Phase B+).'
  };

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

  // ─── Pricing ceilings cache (load once via get_pricing_ceilings_v3) ─
  var _ceilings = null;
  var _ceilingsPromise = null;
  function loadCeilings_() {
    if (_ceilings) return Promise.resolve(_ceilings);
    if (_ceilingsPromise) return _ceilingsPromise;
    _ceilingsPromise = fetch(SUPABASE_URL + '/rest/v1/rpc/get_pricing_ceilings_v3', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: '{}'
    }).then(function (r) {
      if (!r.ok) throw new Error('ceilings_load_failed_' + r.status);
      return r.json();
    }).then(function (data) {
      _ceilings = data;
      return _ceilings;
    }).catch(function (e) {
      _ceilingsPromise = null;
      console.error('[deal-creator] ceilings load failed:', e);
      return null;
    });
    return _ceilingsPromise;
  }

  // ─── Panel 2 — Scope axis renderers (§4.3) ──────────────
  function renderSegmentFieldset_(legend, name, items, opts) {
    opts = opts || {};
    var html = '<fieldset class="dc-segment-fieldset">' +
      '<legend>' + escapeHtml_(legend) + '</legend>' +
      '<div class="dc-segment-chips">';
    items.forEach(function (item) {
      var inputId = 'dc-' + name + '-' + item.value_code;
      var dataLevel = opts.level ? (' data-level="' + opts.level + '"') : '';
      var dataVolume = item.identity_count ? (' data-volume="' + item.identity_count + '"') : '';
      var countDisplay = '';
      if (opts.countField === 'enriched' && item.enriched_count) {
        countDisplay = '<small>' + Number(item.enriched_count).toLocaleString() + ' enriched</small>';
      } else if (item.identity_count) {
        countDisplay = '<small>' + Number(item.identity_count).toLocaleString() + ' employers</small>';
      }
      html += '<label class="dc-segment-chip" for="' + inputId + '">' +
        '<input type="checkbox" id="' + inputId + '" name="' + name + '" value="' + escapeHtml_(item.value_code) + '"' + dataLevel + dataVolume + ' />' +
        '<span>' + escapeHtml_(item.display_label) + '</span>' +
        countDisplay +
        '</label>';
    });
    html += '</div>';
    if (opts.hint) html += '<p class="dc-segment-hint">' + escapeHtml_(opts.hint) + '</p>';
    html += '</fieldset>';
    return html;
  }

  function renderLockedRow_(label, reason) {
    return '<div class="dc-overlay-locked" role="note">' +
      '<strong>' + escapeHtml_(label) + ' <span class="lock-icon" aria-hidden="true">🔒</span></strong>' +
      '<small>' + escapeHtml_(reason) + '</small>' +
      '</div>';
  }

  function renderSectorAxis_(ceilings) {
    var content = document.querySelector('.dc-axis[data-axis="sector"] .dc-axis-content');
    if (!content) return;
    var sector = ceilings && ceilings.axes && ceilings.axes.sector;
    if (!sector) {
      content.innerHTML = '<p class="dc-axis-empty">Sector data unavailable.</p>';
      return;
    }
    var l1 = (sector.levels && sector.levels.L1) || [];
    var l2 = (sector.levels && sector.levels.L2) || [];
    var html = '';
    if (l1.length > 0) {
      html += renderSegmentFieldset_('Sector L1 (public / private / third)', 'sector_l1', l1, {});
    }
    if (l2.length > 0) {
      html += renderSegmentFieldset_('Sector L2 segments (multi-select)', 'sector_l2', l2, {
        hint: 'Selections compose volume-weighted pricing per AMD-111.'
      });
    }
    html += renderLockedRow_('Sector L3 (public granular)', STAGE_0_LOCKED.sector_l3);
    content.innerHTML = html;
  }

  function renderGeographyAxis_(ceilings) {
    var content = document.querySelector('.dc-axis[data-axis="geography"] .dc-axis-content');
    if (!content) return;
    var geo = ceilings && ceilings.axes && ceilings.axes.geography;
    if (!geo) {
      content.innerHTML = '<p class="dc-axis-empty">Geography data unavailable.</p>';
      return;
    }
    var html = '<p class="dc-axis-hint">Selections at the deepest level win; selecting at L3 supersedes L2 and L1.</p>';
    ['L1', 'L2', 'L3'].forEach(function (lvl) {
      var items = (geo.levels && geo.levels[lvl]) || [];
      if (items.length === 0) return;
      var legend = (lvl === 'L1') ? 'Geography L1 (whole UK)'
                  : (lvl === 'L2') ? 'Geography L2 (4 nations)'
                  : 'Geography L3 (English regions, Scotland, Wales, Northern Ireland)';
      html += renderSegmentFieldset_(legend, 'geography', items, { level: lvl });
    });
    html += renderLockedRow_('Geography L4 (Local Authority)', STAGE_0_LOCKED.geography_l4);
    html += renderLockedRow_('Geography L5 (postcode district)', STAGE_0_LOCKED.geography_l5);
    content.innerHTML = html;
  }

  function renderIndustryAxis_(ceilings) {
    var content = document.querySelector('.dc-axis[data-axis="industry"] .dc-axis-content');
    if (!content) return;
    var industry = ceilings && ceilings.axes && ceilings.axes.industry;
    if (!industry) {
      content.innerHTML = '<p class="dc-axis-empty">Industry data unavailable.</p>';
      return;
    }
    var l1 = (industry.levels && industry.levels.L1) || [];
    var html = '';
    if (l1.length > 0) {
      html += renderSegmentFieldset_('SIC L1 (sections, multi-select)', 'industry_l1', l1, {});
    }
    html += renderLockedRow_('SIC L4 (4-digit class)', STAGE_0_LOCKED.industry_l4);
    content.innerHTML = html;
  }

  function renderIntelligenceAxis_(ceilings) {
    var content = document.querySelector('.dc-axis[data-axis="intelligence"] .dc-axis-content');
    if (!content) return;
    var intel = ceilings && ceilings.axes && ceilings.axes.intelligence;
    if (!intel) {
      content.innerHTML = '<p class="dc-axis-empty">Intelligence data unavailable.</p>';
      return;
    }
    var l1 = (intel.levels && intel.levels.L1) || [];
    var html = '';
    if (l1.length > 0) {
      html += renderSegmentFieldset_('ACEI categories (multi-select)', 'intelligence_acei', l1, {
        countField: 'enriched'
      });
    }
    html += renderLockedRow_('RRI — Regulatory Risk Intelligence', STAGE_0_LOCKED.intel_rri);
    html += renderLockedRow_('CCI — Constitutional Compliance Intelligence', STAGE_0_LOCKED.intel_cci);
    content.innerHTML = html;
  }

  function renderPanel2Scope_() {
    if (!_ceilings) return;
    renderSectorAxis_(_ceilings);
    renderGeographyAxis_(_ceilings);
    renderIndustryAxis_(_ceilings);
    renderIntelligenceAxis_(_ceilings);
    bindScopeChangeHandlers_();
  }

  function bindScopeChangeHandlers_() {
    var panel = document.getElementById('panel-2-scope');
    if (!panel || panel.dataset.bound === '1') return;
    panel.dataset.bound = '1';
    panel.addEventListener('change', function (ev) {
      if (!ev.target || !ev.target.name) return;
      onScopeChange_(ev.target.name, ev.target.value);
    });
  }

  function onScopeChange_(name, value) {
    try {
      if (window.gtag) {
        window.gtag('event', 'deal_creator_scope_changed', {
          clid: CLID, axis: name, value_summary: value
        });
      }
    } catch (e) { /* swallow */ }
    recomputeUniverse_();
  }

  // ─── Build p_scope from current Panel 2 selections (§4.5) ───────
  function getCurrentScope_() {
    var sectorL1 = Array.prototype.slice.call(document.querySelectorAll('input[name="sector_l1"]:checked'))
      .map(function (i) { return i.value; });
    var sectorL2 = Array.prototype.slice.call(document.querySelectorAll('input[name="sector_l2"]:checked'))
      .map(function (i) { return i.value; });

    // Geography — single-level pattern; deepest selected level wins.
    var geoBy = { L1: [], L2: [], L3: [] };
    Array.prototype.forEach.call(document.querySelectorAll('input[name="geography"]:checked'), function (i) {
      var lvl = i.dataset.level;
      if (geoBy[lvl]) geoBy[lvl].push(i.value);
    });
    var geoLevel = null, geoValues = [];
    if (geoBy.L3.length > 0) { geoLevel = 'L3'; geoValues = geoBy.L3; }
    else if (geoBy.L2.length > 0) { geoLevel = 'L2'; geoValues = geoBy.L2; }
    else if (geoBy.L1.length > 0) { geoLevel = 'L1'; geoValues = geoBy.L1; }

    var industryL1 = Array.prototype.slice.call(document.querySelectorAll('input[name="industry_l1"]:checked'))
      .map(function (i) { return i.value; });

    var acei = Array.prototype.slice.call(document.querySelectorAll('input[name="intelligence_acei"]:checked'))
      .map(function (i) { return i.value; });

    return {
      sector: { l1: sectorL1, l2: sectorL2 },
      geography: geoLevel ? { level: geoLevel, values: geoValues } : { level: null, values: [] },
      industry: industryL1.length > 0 ? { level: 'L1', values: industryL1 } : { level: null, values: [] },
      intelligence: { acei: acei, rri: [], cci: [] }
    };
  }

  // ─── Universe recompute (debounced 250ms per §3.4) ──────
  var _recomputeTimer = null;
  function recomputeUniverse_() {
    clearTimeout(_recomputeTimer);
    _recomputeTimer = setTimeout(function () {
      var scope = getCurrentScope_();
      var token = (window.__dealRoomUser && window.__dealRoomUser.token) || SUPABASE_ANON_KEY;
      var countEl = document.getElementById('universe-count');

      fetch(SUPABASE_URL + '/rest/v1/rpc/compute_scope_universe', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_scope: scope })
      }).then(function (r) {
        if (!r.ok) throw new Error('compute_scope_universe_' + r.status);
        return r.json();
      }).then(function (data) {
        var n = data && data.identity_universe;
        if (countEl) {
          countEl.textContent = (typeof n === 'number') ? n.toLocaleString() : '—';
        }
      }).catch(function (e) {
        console.error('[deal-creator] universe recompute failed:', e);
        if (countEl) countEl.textContent = '—';
      });
    }, 250);
  }

  // ─── Tier-gating refresh ────────────────────────────────
  // Renders Panel 2 (and at STOP 5, Panel 3) per the current tier and the
  // §3.3 Stage 0 visibility table. At Stage 0 (gate_state='phase_0' for
  // both dnb-2026-001 and sim-2026-001), tier-gating governs which axes
  // are accessible at all; locked rows render for higher levels with
  // NDA-unlock prompts referencing Phase B.
  function applyTierGating_(_tier) {
    loadCeilings_().then(function () {
      renderPanel2Scope_();
      // STOP 5 will add Panel 3 overlay rendering here.
      recomputeUniverse_();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderPanel1Tier_();
    loadCeilings_();  // begin loading in the background; tier-change awaits.
    // STOP 5-8 wire overlays, quote pane, submit and Eileen context-passing.

    try {
      if (window.gtag) {
        window.gtag('event', 'deal_creator_view', { clid: CLID });
      }
    } catch (e) { /* swallow */ }
  });
})();
