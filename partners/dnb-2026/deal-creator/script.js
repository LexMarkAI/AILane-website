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

  // ─── Panel 3 — Overlay definitions (§3.3 + §4.4) ────────
  // Each overlay renders its options inline. Stage 0 NDA-gated options
  // (locked: <reason>) render with a disabled radio + lock-icon + small
  // explanation text, per §7.3 styling.
  var OVERLAY_DEFINITIONS = [
    {
      key: 'refresh',
      type: 'radio',
      name: 'refresh',
      options: [
        { value: 'quarterly', label: 'Quarterly', defaultChecked: true },
        { value: 'daily',     label: 'Daily' },
        { value: 'real_time', label: 'Real-time (+25%)',
          locked: 'Real-time refresh is unlocked at NDA execution (Phase B).' }
      ]
    },
    {
      key: 'exclusivity',
      type: 'radio',
      name: 'exclusivity',
      options: [
        { value: 'none',     label: 'None', defaultChecked: true },
        { value: 'vertical', label: 'Vertical (+60%)',
          locked: 'Vertical exclusivity is unlocked at NDA execution (Phase B).' },
        { value: 'full_uk',  label: 'Full-UK',
          locked: 'Full-UK exclusivity is unlocked at NDA execution and Enterprise tier (Phase B+).' }
      ]
    },
    {
      key: 'term',
      type: 'radio',
      name: 'term',
      options: [
        { value: '12', label: '12 months' },
        { value: '24', label: '24 months', defaultChecked: true },
        { value: '36', label: '36 months' },
        { value: '60', label: '60 months',
          locked: 'The 60-month closing concession is available at MCA negotiation closing (Phase D).' }
      ]
    },
    {
      key: 'duns',
      type: 'checkbox',
      name: 'duns',
      description: 'Adds the DUNS unique identifier to enriched records. Applies +£3 per employer per year when enabled.',
      options: [
        { value: 'on', label: 'Enable DUNS enrichment' }
      ]
    }
  ];

  // ─── Panel 1 — Field-set tier definitions (HOTFIX-001 §3) ─────────
  // PROP-DMSP-001 §10.2 governs Deal Room Panel 1 — field-set tier choice
  // (data depth the counterparty buys), not subscription tier (KL/Contract-
  // Check semantics). Stage 0 visible: Identity / Tribunal Exposure /
  // Outcome Intelligence. Stage 1+ NDA-gated: Full ACEI / Full Enrichment /
  // Premium. Each tier is cumulative: a higher tier includes everything
  // below it. Per-record price tags from DATAFEED-001 §6.
  var TIER_DEFINITIONS = [
    {
      code: 'identity',
      label: 'Identity',
      price: '£4 per employer per year',
      description: 'Core entity record: name, registered address, current status, sector classification, employee count band, Companies House Number cross-reference where available.',
      locked: false
    },
    {
      code: 'tribunal_exposure',
      label: 'Tribunal Exposure',
      price: '£18 per employer per year',
      description: 'Identity + binary tribunal-decision indicator + counts, dates, jurisdictional summary. Includes the no-adverse-signal declaration with coverage transparency.',
      locked: false
    },
    {
      code: 'outcome_intelligence',
      label: 'Outcome Intelligence',
      price: '£33 per employer per year',
      description: 'Tribunal Exposure + outcome-classified data (claim outcomes, awards, ACEI sector base rates, peer-percentile context).',
      locked: false
    },
    {
      code: 'full_acei',
      label: 'Full ACEI',
      price: '£45 per employer per year',
      description: 'Outcome Intelligence + 12-category ACEI scoring with severity-weighted signals and sector-multiplier overlay.',
      locked: true
    },
    {
      code: 'full_enrichment',
      label: 'Full Enrichment',
      price: '£90 per employer per year',
      description: 'Full ACEI + complete 171-column enrichment estate (representative profiles, hearing-day metrics, judge-canonical fields, citation authority).',
      locked: true
    },
    {
      code: 'premium',
      label: 'Premium',
      price: '£140 per employer per year',
      description: 'Full Enrichment + cross-domain regulatory signal (HSE prosecutions, coroner PFD, corporate-relationship rollup).',
      locked: true
    }
  ];

  // Field-set tier → internal subscription tier mapping (HOTFIX §3.4).
  // The deployed pricing_quote_function_v4 uses Model A (subscription tier
  // × scope-axis depth) and accepts ONLY operational_readiness / governance /
  // enterprise (raises EXCEPTION on any other value). The hotfix preserves
  // that contract: field-set tier is a display-layer concept that maps to
  // internal subscription tier before the RPC submit. field_set_tier is
  // also forwarded in modifiers for forward compatibility once the backend
  // pricing model harmonises to Model B.
  var FIELD_SET_TO_INTERNAL_TIER = {
    identity:             'operational_readiness',
    tribunal_exposure:    'operational_readiness',
    outcome_intelligence: 'operational_readiness',
    full_acei:            'governance',
    full_enrichment:      'enterprise',
    premium:              'enterprise'
  };

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

  // ─── Panel 1 — render field-set tier radio cards (HOTFIX §3.2) ─
  function renderPanel1Tier_() {
    var container = document.querySelector('#panel-1-tier .dc-tier-cards');
    if (!container) return;

    var html = TIER_DEFINITIONS.map(function (t) {
      var inputId = 'dc-tier-' + t.code;
      var disabledAttr = t.locked ? ' disabled' : '';
      var lockedClass = t.locked ? ' dc-tier-card-locked' : '';
      var lockIcon = t.locked
        ? '<span class="dc-tier-card-lock" aria-label="NDA-gated">&#x1F512;</span>'
        : '';
      var lockExplanation = t.locked
        ? '<p class="dc-tier-card-lock-explanation">Unlocks at NDA execution (Phase B).</p>'
        : '';
      return (
        '<label class="dc-tier-card' + lockedClass + '" data-tier="' + t.code + '" for="' + inputId + '">' +
          '<input type="radio" id="' + inputId + '" name="field_set_tier" value="' + t.code + '"' + disabledAttr + ' />' +
          '<div class="dc-tier-card-header">' +
            '<span class="dc-tier-card-title">' + escapeHtml_(t.label) + '</span>' +
            '<span class="dc-tier-card-price">' + escapeHtml_(t.price) + '</span>' +
            lockIcon +
          '</div>' +
          '<p class="dc-tier-card-description">' + escapeHtml_(t.description) + '</p>' +
          lockExplanation +
        '</label>'
      );
    }).join('');

    container.innerHTML = html;

    container.addEventListener('change', function (ev) {
      if (!ev.target || ev.target.name !== 'field_set_tier') return;
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
    recompute_();
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

  // ─── Build full p_config_snapshot from Panel 1/2/3 state (§4.5) ─
  // getCurrentTier_ returns the FIELD-SET tier code (identity / tribunal_exposure
  // / outcome_intelligence / full_acei / full_enrichment / premium) per
  // HOTFIX §3.4 architecture. buildConfigSnapshot_ maps it to the internal
  // subscription tier string for the pricing function and forwards the
  // field-set tier as field_set_tier for forward compatibility.
  function getCurrentTier_() {
    var el = document.querySelector('input[name="field_set_tier"]:checked');
    return el ? el.value : null;
  }

  function getCurrentOverlays_() {
    var refresh = document.querySelector('input[name="refresh"]:checked');
    var exclusivity = document.querySelector('input[name="exclusivity"]:checked');
    var term = document.querySelector('input[name="term"]:checked');
    var duns = document.querySelector('input[name="duns"]');
    var termMonths = term ? Number(term.value) : 24;
    return {
      refresh: refresh ? refresh.value : 'quarterly',
      exclusivity: exclusivity ? exclusivity.value : 'none',
      term_months: termMonths,
      term_years: Math.round(termMonths / 12),  // function expects years (1/2/3/5)
      duns_match: !!(duns && duns.checked)
    };
  }

  function buildConfigSnapshot_() {
    var fieldSetTier = getCurrentTier_();
    var internalTier = fieldSetTier ? FIELD_SET_TO_INTERNAL_TIER[fieldSetTier] : null;
    var scope = getCurrentScope_();
    var overlays = getCurrentOverlays_();
    return {
      scope: scope,
      modifiers: {
        tier: internalTier,            // pricing function expects subscription tier
        field_set_tier: fieldSetTier,  // HOTFIX §3.4 forward-compat (function ignores)
        refresh: overlays.refresh,
        exclusivity: overlays.exclusivity,
        term_years: overlays.term_years,
        duns_match: overlays.duns_match,
        clid: CLID
      }
    };
  }

  // ─── Quote pane copy helpers (R-9 §3 binding via §5 worked example) ─
  // Each helper returns a single factual string. No urgency, no commitment,
  // no quasi-legal advice. The phrasing tracks AILANE-LEGAL-MEMO-EIM-001-
  // PHRASING-001 §3 and the §5.3 binding worked example in the brief.
  // TIER_LABEL_MAP maps the FIELD-SET tier code (HOTFIX §3) to its display
  // label. Used in buildConfigSummary_ to render the configuration summary
  // line on the quote pane. Field-set tier is the deal-room semantic;
  // subscription tier is internal-only.
  var TIER_LABEL_MAP = {
    identity:             'Identity',
    tribunal_exposure:    'Tribunal Exposure',
    outcome_intelligence: 'Outcome Intelligence',
    full_acei:            'Full ACEI',
    full_enrichment:      'Full Enrichment',
    premium:              'Premium'
  };

  function ceilingLabel_(axis, level, code) {
    if (!_ceilings || !_ceilings.axes || !_ceilings.axes[axis]) return code;
    var lvl = _ceilings.axes[axis].levels && _ceilings.axes[axis].levels[level];
    if (!lvl) return code;
    for (var i = 0; i < lvl.length; i++) {
      if (lvl[i].value_code === code) return lvl[i].display_label || code;
    }
    return code;
  }

  // Display labels in get_pricing_ceilings_v3 follow "<prefix> — <description>"
  // (em-dash separator) for ACEI and Industry SIC sections. shortLabel_ returns
  // just the prefix ("K", "ACEI 1") for use in the configuration summary line
  // when ≥3 items are selected (Director STOP 6 ack item 2: codes only ≥3,
  // full labels ≤2). Other axes (Sector / Geography) use the full label
  // unconditionally because their display labels are already short.
  function shortLabel_(displayLabel) {
    if (!displayLabel) return displayLabel;
    var idx = displayLabel.indexOf(' — ');
    return (idx > 0) ? displayLabel.substring(0, idx) : displayLabel;
  }

  function labelListContextSensitive_(axis, level, codes) {
    if (codes.length === 0) return '';
    var fullLabels = codes.map(function (c) { return ceilingLabel_(axis, level, c); });
    if (codes.length <= 2) return fullLabels.join(', ');
    return fullLabels.map(shortLabel_).join(', ');
  }

  function buildConfigSummary_(snapshot) {
    var parts = [TIER_LABEL_MAP[snapshot.modifiers.field_set_tier] || snapshot.modifiers.field_set_tier];
    var s = snapshot.scope;
    if (s.sector.l1.length > 0) {
      parts.push('Sector: ' + s.sector.l1.map(function (c) { return ceilingLabel_('sector', 'L1', c); }).join(', '));
    }
    if (s.sector.l2.length > 0) {
      parts.push('Segments: ' + s.sector.l2.map(function (c) { return ceilingLabel_('sector', 'L2', c); }).join(', '));
    }
    if (s.geography.values && s.geography.values.length > 0) {
      parts.push('Geography ' + s.geography.level + ': ' +
        s.geography.values.map(function (c) { return ceilingLabel_('geography', s.geography.level, c); }).join(', '));
    }
    if (s.industry.values && s.industry.values.length > 0) {
      parts.push('Industry ' + s.industry.level + ': ' +
        labelListContextSensitive_('industry', s.industry.level, s.industry.values));
    }
    if (s.intelligence.acei.length > 0) {
      parts.push('ACEI: ' + labelListContextSensitive_('intelligence', 'L1', s.intelligence.acei));
    }
    return parts.join(' · ');
  }

  function refreshLine_(value) {
    var label = (value === 'daily') ? 'Daily'
              : (value === 'real_time') ? 'Real-time'
              : 'Quarterly';
    return 'Refresh cadence: ' + label + '.';
  }

  function exclusivityLine_(value) {
    if (value === 'vertical') {
      return 'Exclusivity: Vertical — binds the platform from offering equivalent commercial terms to competitors in the same sub-vertical and region for the duration of the engagement.';
    }
    if (value === 'full_uk') {
      return 'Exclusivity: Full-UK — binds the platform from offering equivalent commercial terms to competitors in the United Kingdom for the duration of the engagement.';
    }
    return 'Exclusivity: not elected at this configuration.';
  }

  function termLine_(months) {
    return 'Term: ' + months + ' months.';
  }

  function dunsLine_(enabled) {
    return enabled ? 'DUNS enrichment: enabled (+£3 per employer per year).'
                   : 'DUNS enrichment: not enabled.';
  }

  function launchPartnerLine_(applied) {
    if (!applied) return null;
    // Decision 1 (Director STOP 6 ack): the launch-partner percentage is a
    // backend constant (pricing_modifier table). Rendering a hardcoded "10%"
    // here would silently lie if the constant ever changes. The discount IS
    // already mathematically reflected in the annual figure the counterparty
    // sees; abstraction is institutional safety, not opacity. Forward backend
    // note for Cycle 4: extend pricing_quote_function_v4 response to include
    // launch_partner_discount_pct so future surfaces can render dynamically.
    return 'Launch-partner discount: applied — the configured reduction is reflected in the annual figure above.';
  }

  function floorLine_(applied) {
    if (!applied) return null;
    return 'Pricing floor: the minimum annual fee threshold has been applied at this configuration.';
  }

  function fmtPounds_(pence) {
    if (typeof pence !== 'number') return '—';
    return '£' + Math.round(pence / 100).toLocaleString('en-GB');
  }

  function fmtPoundsPerRecord_(pence) {
    if (typeof pence !== 'number') return '—';
    var pounds = pence / 100;
    if (pounds >= 100 || pounds === Math.round(pounds)) {
      return '£' + Math.round(pounds).toLocaleString('en-GB');
    }
    return '£' + pounds.toLocaleString('en-GB', { maximumFractionDigits: 2 });
  }

  // ─── Quote pane render ──────────────────────────────────
  function renderQuoteSelectTier_() {
    var pane = document.getElementById('quote-pane');
    if (pane) pane.innerHTML = '<p class="dc-quote-empty">Select a tier to begin a configuration.</p>';
    var saveBtn = document.getElementById('save-configuration');
    if (saveBtn) saveBtn.disabled = true;
    var explainEl = document.getElementById('dc-save-explanation');
    if (explainEl) explainEl.hidden = true;
  }

  function renderQuoteUnavailable_(snapshot, reasonClass) {
    var pane = document.getElementById('quote-pane');
    if (pane) {
      pane.innerHTML =
        '<p class="dc-quote-empty">Configuration not yet priced. Adjust your selections to produce a priceable scope.</p>';
    }
    var saveBtn = document.getElementById('save-configuration');
    if (saveBtn) saveBtn.disabled = true;
    var explainEl = document.getElementById('dc-save-explanation');
    if (explainEl) explainEl.hidden = true;
    try {
      if (window.gtag) {
        window.gtag('event', 'deal_creator_quote_unavailable', {
          clid: CLID,
          tier: snapshot && snapshot.modifiers && snapshot.modifiers.field_set_tier,
          error_class: reasonClass || 'rpc_error'
        });
      }
    } catch (e) { /* swallow */ }
  }

  function renderQuote_(quote, snapshot) {
    var pane = document.getElementById('quote-pane');
    if (!pane) return;

    var summary = buildConfigSummary_(snapshot);
    var perRecord = fmtPoundsPerRecord_(quote.per_record_pence);
    var universe = (typeof quote.scope_universe === 'number')
      ? quote.scope_universe.toLocaleString('en-GB')
      : '—';
    var annual = fmtPounds_(quote.annual_pence);
    var overlays = snapshot.modifiers;

    var metaLines = [
      'Pricing schedule: escalation at the next ratification milestone trigger.',
      exclusivityLine_(overlays.exclusivity),
      refreshLine_(overlays.refresh),
      termLine_(getCurrentOverlays_().term_months),
      dunsLine_(overlays.duns_match)
    ];
    var lp = launchPartnerLine_(quote.is_launch_partner_applied);
    if (lp) metaLines.push(lp);
    var fl = floorLine_(quote.floor_applied);
    if (fl) metaLines.push(fl);

    var html = '<div class="dc-quote-summary">' +
      '<div class="dc-quote-config">' + escapeHtml_(summary) + '</div>' +
      '<dl class="dc-quote-figures">' +
        '<div class="dc-quote-row">' +
          '<dt class="dc-quote-label">Universe</dt>' +
          '<dd class="dc-quote-figure">' + escapeHtml_(universe) + ' employers</dd>' +
        '</div>' +
        '<div class="dc-quote-row">' +
          '<dt class="dc-quote-label">Per record</dt>' +
          '<dd class="dc-quote-figure">' + escapeHtml_(perRecord) + '</dd>' +
        '</div>' +
        '<div class="dc-quote-row">' +
          '<dt class="dc-quote-label">Annual</dt>' +
          '<dd class="dc-quote-figure">' + escapeHtml_(annual) + '</dd>' +
        '</div>' +
      '</dl>' +
      '<div class="dc-quote-meta">' +
        metaLines.map(function (l) { return '<p>' + escapeHtml_(l) + '</p>'; }).join('') +
      '</div>' +
    '</div>';

    pane.innerHTML = html;

    // Mirror universe count into Panel 2 footer too.
    var countEl = document.getElementById('universe-count');
    if (countEl) countEl.textContent = universe;

    // Save Configuration is gate-state-gated per PROP-DMSP-001 §10.1
    // (Stage 0 = browse-only). Save unlocks at gate_state='phase_b' or
    // higher; until then the button stays disabled and the inline
    // explanation renders below the action row.
    applySaveButtonState_(snapshot);

    try {
      if (window.gtag) {
        window.gtag('event', 'deal_creator_quote_returned', {
          clid: CLID,
          tier: snapshot.modifiers.field_set_tier,
          per_record_pence: quote.per_record_pence,
          annual_pence: quote.annual_pence,
          universe_count: quote.scope_universe
        });
      }
    } catch (e) { /* swallow */ }
  }

  // ─── Save Configuration gating (Stage 0 = disabled-with-explanation) ─
  // PROP-DMSP-001 §10.1 anchors Stage 0 (gate_state='phase_0') as
  // browse-only — counterparty INSERTs to partner_counter_proposals are
  // RLS-blocked at this gate state by design. The Save Configuration UX
  // therefore stays disabled with an inline R-9 §3 explanation. When a
  // counterparty progresses to phase_b or beyond, Director-side wiring
  // (separate successor brief AILANE-CC-BRIEF-DEALROOM-DEAL-CREATOR-
  // STAGE-1-001) will activate the cppp-submit-proposal flow.
  var STAGE_1_GATES = ['phase_a', 'phase_b', 'phase_1', 'phase_2', 'phase_f'];
  var _saveAttemptFiredForSession = false;

  function applySaveButtonState_(snapshot) {
    var saveBtn = document.getElementById('save-configuration');
    var explainEl = document.getElementById('dc-save-explanation');
    if (!saveBtn) return;

    loadWorkspaceMeta_().then(function (meta) {
      var gateState = meta && meta.gate_state;
      var stage1Reached = gateState && STAGE_1_GATES.indexOf(gateState) !== -1;

      if (stage1Reached) {
        // Phase B+ — enable Save when a valid quote is rendered. Hide
        // the Stage 0 explanation. (Forward-compatible — the Stage 1
        // submit-and-receipt flow itself is wired in a successor brief.)
        saveBtn.disabled = false;
        if (explainEl) explainEl.hidden = true;
      } else {
        // Stage 0 — Save stays disabled; explanation visible whenever a
        // tier is selected (i.e., whenever this function is reached after
        // a renderQuote_).
        saveBtn.disabled = true;
        if (explainEl) explainEl.hidden = false;

        // Fire deal_creator_save_attempt once per session — captures the
        // Stage 0 save-intent signal for Director analytics even when the
        // action itself is inert.
        if (!_saveAttemptFiredForSession) {
          _saveAttemptFiredForSession = true;
          try {
            if (window.gtag) {
              window.gtag('event', 'deal_creator_save_attempt', {
                clid: CLID,
                tier: snapshot.modifiers.field_set_tier,
                reason: 'stage_0_pre_nda'
              });
            }
          } catch (e) { /* swallow */ }
        }
      }
    });
  }

  // ─── Discuss with Eileen — page-local context-passing (path iii) ───
  // Director STOP 1 ack item 2 (Path iii): keep parent script.js untouched.
  // On click, pre-fill the Eileen input with a brief Deal-Creator context
  // header so the user's first turn is contextualised. User reviews + edits
  // before sending. Pre-fill happens once per session (or when the input
  // is empty) so repeat clicks don't stack context.
  var _eileenContextProvided = false;

  function bindDiscussWithEileen_() {
    var btn = document.getElementById('discuss-with-eileen');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var snapshot = buildConfigSnapshot_();
      var input = document.getElementById('dr-eileen-input');

      if (input && (!_eileenContextProvided || !input.value || input.value.trim() === '')) {
        var summary = snapshot.modifiers.tier
          ? buildConfigSummary_(snapshot)
          : 'No tier selected yet — please pick an access tier above so Eileen can speak to a concrete configuration.';
        input.value = 'About this Deal Creator configuration:\n' + summary + '\n\n';
        _eileenContextProvided = true;
      }

      if (input) {
        try { input.focus(); } catch (e) { /* swallow */ }
      }

      var panel = document.getElementById('dr-eileen-panel');
      if (panel) {
        try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* swallow */ }
      }

      try {
        if (window.gtag) {
          window.gtag('event', 'deal_creator_eileen_opened', {
            clid: CLID,
            from_panel: 'deal_creator_quote_pane'
          });
        }
      } catch (e) { /* swallow */ }
    });
  }

  // ─── Recompute pipeline (debounced 250ms per §3.4) ──────
  var _recomputeTimer = null;
  function recompute_() {
    clearTimeout(_recomputeTimer);
    _recomputeTimer = setTimeout(function () {
      var snapshot = buildConfigSnapshot_();

      if (!snapshot.modifiers.tier) {
        renderQuoteSelectTier_();
        var countEl = document.getElementById('universe-count');
        if (countEl) countEl.textContent = '—';
        return;
      }

      var token = (window.__dealRoomUser && window.__dealRoomUser.token) || SUPABASE_ANON_KEY;

      fetch(SUPABASE_URL + '/rest/v1/rpc/pricing_quote_function_v4', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_config_snapshot: snapshot })
      }).then(function (r) {
        return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; });
      }).then(function (result) {
        if (!result.ok || !result.data || typeof result.data.annual_pence !== 'number') {
          var reason = (result.data && (result.data.code === 'P0001' || /zero records/i.test(result.data.message || '')))
            ? 'zero_scope'
            : 'rpc_error';
          renderQuoteUnavailable_(snapshot, reason);
          return;
        }
        renderQuote_(result.data, snapshot);
      }).catch(function (e) {
        console.error('[deal-creator] quote recompute failed:', e);
        renderQuoteUnavailable_(snapshot, 'network_error');
      });
    }, 250);
  }

  // ─── Panel 3 — Commercial overlays renderer (§4.4) ──────
  function renderOverlay_(overlayDef) {
    var content = document.querySelector('.dc-overlay[data-overlay="' + overlayDef.key + '"] .dc-overlay-content');
    if (!content) return;
    var html = '';
    if (overlayDef.description) {
      html += '<p class="dc-overlay-desc">' + escapeHtml_(overlayDef.description) + '</p>';
    }
    overlayDef.options.forEach(function (opt) {
      var inputId = 'dc-overlay-' + overlayDef.name + '-' + opt.value;
      var checked = opt.defaultChecked ? ' checked' : '';
      var disabled = opt.locked ? ' disabled' : '';
      var labelClass = opt.locked ? ' class="locked"' : '';
      html += '<label' + labelClass + ' for="' + inputId + '">' +
        '<input type="' + overlayDef.type + '" id="' + inputId + '" name="' + overlayDef.name + '" value="' + escapeHtml_(opt.value) + '"' + checked + disabled + ' />' +
        '<span>' + escapeHtml_(opt.label) + '</span>';
      if (opt.locked) {
        html += ' <span class="lock-icon" aria-label="NDA-gated">🔒</span>' +
          '<small>' + escapeHtml_(opt.locked) + '</small>';
      }
      html += '</label>';
    });
    content.innerHTML = html;
  }

  function renderPanel3Overlays_() {
    OVERLAY_DEFINITIONS.forEach(renderOverlay_);
    bindOverlayChangeHandlers_();
  }

  function bindOverlayChangeHandlers_() {
    var panel = document.getElementById('panel-3-overlays');
    if (!panel || panel.dataset.bound === '1') return;
    panel.dataset.bound = '1';
    panel.addEventListener('change', function (ev) {
      if (!ev.target || !ev.target.name) return;
      var value = (ev.target.type === 'checkbox')
        ? (ev.target.checked ? 'on' : 'off')
        : ev.target.value;
      onOverlayChange_(ev.target.name, value);
    });
  }

  function onOverlayChange_(overlay, value) {
    try {
      if (window.gtag) {
        window.gtag('event', 'deal_creator_overlay_changed', {
          clid: CLID, overlay: overlay, value: value
        });
      }
    } catch (e) { /* swallow */ }
    recompute_();
  }

  // ─── Workspace meta cache (partner_clids row) ───────────
  // Used for the launch-partner discount badge (§4.4) and any future
  // workspace-meta-driven UI. RLS allows authenticated reads of the row
  // belonging to the user's CLID; anon read is also permitted on
  // gate_state and is_launch_partner per AMD-126 RLS hardening.
  var _workspaceMeta = null;
  var _workspaceMetaPromise = null;
  function loadWorkspaceMeta_() {
    if (_workspaceMeta) return Promise.resolve(_workspaceMeta);
    if (_workspaceMetaPromise) return _workspaceMetaPromise;
    var token = (window.__dealRoomUser && window.__dealRoomUser.token) || SUPABASE_ANON_KEY;
    _workspaceMetaPromise = fetch(
      SUPABASE_URL + '/rest/v1/partner_clids?clid=eq.' + encodeURIComponent(CLID) +
      '&select=is_launch_partner,gate_state',
      {
        headers: {
          'Authorization': 'Bearer ' + token,
          'apikey': SUPABASE_ANON_KEY,
          'Accept': 'application/json'
        }
      }
    ).then(function (r) {
      if (!r.ok) throw new Error('partner_clids_load_failed_' + r.status);
      return r.json();
    }).then(function (rows) {
      _workspaceMeta = (rows && rows.length > 0) ? rows[0] : null;
      return _workspaceMeta;
    }).catch(function (e) {
      _workspaceMetaPromise = null;
      console.error('[deal-creator] workspace meta load failed:', e);
      return null;
    });
    return _workspaceMetaPromise;
  }

  function renderLaunchPartnerBadge_() {
    loadWorkspaceMeta_().then(function (meta) {
      if (!meta || meta.is_launch_partner !== true) return;
      var panel = document.getElementById('panel-3-overlays');
      if (!panel) return;
      if (panel.querySelector('.dc-launch-partner-badge')) return;  // idempotent
      var heading = panel.querySelector('h2');
      if (!heading) return;
      var badge = document.createElement('span');
      badge.className = 'dc-launch-partner-badge';
      badge.textContent = 'Launch-partner — discount applies automatically';
      heading.insertAdjacentElement('afterend', badge);
    });
  }

  // ─── Tier-gating refresh ────────────────────────────────
  // Renders Panel 2 per the current tier and the §3.3 Stage 0 visibility
  // table. At Stage 0 (gate_state='phase_0' for both dnb-2026-001 and
  // sim-2026-001), tier-gating governs which scope axes are accessible
  // at all; locked rows render for higher levels with NDA-unlock prompts
  // referencing Phase B. Panel 3 (overlays) is not tier-dependent — its
  // visibility rules are Stage-0-driven only — so it renders on init.
  function applyTierGating_(_tier) {
    loadCeilings_().then(function () {
      renderPanel2Scope_();
      recompute_();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderPanel1Tier_();
    renderPanel3Overlays_();
    renderLaunchPartnerBadge_();
    bindDiscussWithEileen_();
    loadCeilings_();        // begin loading in the background; tier-change awaits.
    loadWorkspaceMeta_();   // begin loading workspace meta (gate_state + launch-partner).

    try {
      if (window.gtag) {
        window.gtag('event', 'deal_creator_view', { clid: CLID });
      }
    } catch (e) { /* swallow */ }
  });
})();
