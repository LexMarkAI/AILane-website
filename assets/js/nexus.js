/* assets/js/nexus.js
   AILANE-CC-BRIEF-EILEEN-NEXUS-002 Part B §3.1 (extended per Chairman §0 direction)
   Authority: AMD-058 Art. 13.1, Art. 13.4, Art. 13.6.
   CLAUDE.md RULE 27: no Supabase JS SDK; fetch()-only in the fetchIntel caller.

   Exposes window.AilaneNexus:
     - createNexus(canvas, opts): render an instance; returns { destroy }
     - updateLive({ categories, relationships, snapshotAt }): push v3 shape to all instances

   Live binding: when updateLive is called with Art. 13.1 canonical categories
   (array of { id, claim_frequency, ... }), node weights are recomputed from
   claim_frequency and all attached instances re-render with the new balance.
   Before v3 delivers data, legacy seed weights preserve today's visual look. */
(function () {
  'use strict';

  /* Nexus palette — AMD-069 canonical values.
     Source of truth: assets/css/tokens.css (CSS variable layer).
     This constant block mirrors the CSS for JS consumers.
     Introduced by TOKENS-AUG-001 (AMD-070). Tier mapping aligned by
     TOKENS-REMAP-001 (AMD-071).
     Core Identity Colour is constant and tier-independent; it paints the
     core Nexus node and its halo on every surface. Tier Ring Palette paints
     the secondary nodes and connector edges and is resolved from pageTier.
     Do not hardcode nexus hex values outside this block. */
  var NEXUS_CORE_COLOUR = '#F59E0B';
  var NEXUS_CORE_GLOW = 'rgba(245, 158, 11, 0.30)';
  var NEXUS_CORE_RADIUS_MULTIPLIER = 1.4;

  var NEXUS_RING_BASELINE = '#0EA5E9';
  var NEXUS_RING_BASELINE_DIM = 'rgba(14, 165, 233, 0.35)';

  var NEXUS_RING_HIGH_ACCENT = '#D97706';
  var NEXUS_RING_HIGH_ACCENT_DIM = 'rgba(217, 119, 6, 0.35)';

  var NEXUS_RING_OPERATIONAL_LIFT = '#22d3ee';
  var NEXUS_RING_OPERATIONAL_LIFT_DIM = 'rgba(34, 211, 238, 0.35)';

  var NEXUS_RING_GOVERNANCE_OVERLAY = '#a855f7';
  var NEXUS_RING_GOVERNANCE_OVERLAY_DIM = 'rgba(168, 85, 247, 0.35)';

  var NEXUS_EDGE_ACTIVE_ALPHA = 0.60;
  var NEXUS_EDGE_IDLE_ALPHA = 0.15;

  function hexToRgbTuple(hex) {
    var h = String(hex || '').replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  function rgbaFromHex(hex, alpha) {
    var t = hexToRgbTuple(hex);
    return 'rgba(' + t.r + ', ' + t.g + ', ' + t.b + ', ' + alpha + ')';
  }

  function resolveRingPalette(tier) {
    switch (tier) {
      case 'enterprise':
      case 'institutional':  // AMD-123 transitional alias — accept legacy callers
      case 'ceo_command':
        return {
          active: NEXUS_RING_HIGH_ACCENT,
          dim:    NEXUS_RING_HIGH_ACCENT_DIM
        };
      case 'governance':
        return {
          active: NEXUS_RING_GOVERNANCE_OVERLAY,
          dim:    NEXUS_RING_GOVERNANCE_OVERLAY_DIM
        };
      case 'operational_readiness':
        return {
          active: NEXUS_RING_OPERATIONAL_LIFT,
          dim:    NEXUS_RING_OPERATIONAL_LIFT_DIM
        };
      case 'landing':
      default:
        return {
          active: NEXUS_RING_BASELINE,
          dim:    NEXUS_RING_BASELINE_DIM
        };
    }
  }

  function resolveEdgeColour(tier, active) {
    var ring = resolveRingPalette(tier);
    var alpha = active ? NEXUS_EDGE_ACTIVE_ALPHA : NEXUS_EDGE_IDLE_ALPHA;
    return rgbaFromHex(ring.active, alpha);
  }

  var CANONICAL_KEYS = [
    'discrimination_harassment', 'whistleblowing', 'unfair_dismissal',
    'wages_working_time', 'redundancy_org_change', 'employment_status',
    'parental_family_rights', 'trade_union_collective', 'breach_of_contract',
    'health_safety', 'data_protection_privacy', 'business_transfers_insolvency'
  ];

  /* Seed weights — preserves pre-v3 visual look. Sourced from the legacy
     CATEGORY_WEIGHTS block previously inlined in index.html, mapped to
     canonical keys (brief §0.2 mapping layer). */
  var SEED_WEIGHTS = {
    unfair_dismissal: 0.28,
    discrimination_harassment: 0.22,
    wages_working_time: 0.15,
    breach_of_contract: 0.12,
    redundancy_org_change: 0.06,
    business_transfers_insolvency: 0.04,
    whistleblowing: 0.03,
    health_safety: 0.03,
    parental_family_rights: 0.03,
    data_protection_privacy: 0.02,
    employment_status: 0.01,
    trade_union_collective: 0.01
  };

  /* Shared live store — updated by updateLive, read by all attached instances. */
  var liveStore = {
    weights: null,          /* { canonical_key: normalised 0..1 } when v3 delivered */
    relationships: [],      /* [{ from_id, to_id, strength }, ...] */
    instruments: [],        /* [{ id, category_id, provision_count }, ...] — D1 secondaries */
    snapshotAt: null,
    subscribers: []
  };

  function notify() {
    liveStore.subscribers.forEach(function (fn) { try { fn(); } catch (_e) {} });
  }

  function updateLive(payload) {
    if (!payload || typeof payload !== 'object') return;

    if (Array.isArray(payload.categories) && payload.categories.length) {
      var total = 0;
      var raw = {};
      payload.categories.forEach(function (c) {
        if (!c || CANONICAL_KEYS.indexOf(c.id) < 0) return;
        var v = Number(c.claim_frequency) || 0;
        raw[c.id] = v;
        total += v;
      });
      if (total > 0) {
        var normalised = {};
        CANONICAL_KEYS.forEach(function (k) {
          normalised[k] = (raw[k] || 0) / total;
        });
        liveStore.weights = normalised;
      }
    }

    if (Array.isArray(payload.relationships)) {
      liveStore.relationships = payload.relationships.filter(function (r) {
        return r &&
          CANONICAL_KEYS.indexOf(r.from_id) >= 0 &&
          CANONICAL_KEYS.indexOf(r.to_id) >= 0 &&
          Number(r.strength) > 0;
      });
    }

    /* D1 — secondary statutory instruments orbiting the canonical primary nodes.
       Deployed eileen-nexus-intel v3 emits this field already; the upstream view
       starts as a stub (empty array) and lights up after a Path A migration.
       Filter is permissive about empty arrays (no-op) and rejects malformed rows. */
    if (Array.isArray(payload.instruments)) {
      liveStore.instruments = payload.instruments.filter(function (inst) {
        return inst &&
          typeof inst.id === 'string' &&
          CANONICAL_KEYS.indexOf(inst.category_id) >= 0 &&
          Number(inst.provision_count) >= 0;
      });
    }

    if (payload.snapshotAt) liveStore.snapshotAt = payload.snapshotAt;
    notify();
  }

  function currentWeights() {
    return liveStore.weights || SEED_WEIGHTS;
  }

  function createNexus(canvas, opts) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      return { destroy: function () {} };
    }
    opts = opts || {};
    var size = Number(opts.size) || 180;
    /* AMD-069: ring colour is derived from pageTier when supplied. Legacy
       `colour`/`tierColour` opts remain honoured as a direct ring-colour
       override so existing call sites that pre-date pageTier keep working. */
    var ringPalette = opts.pageTier ? resolveRingPalette(opts.pageTier) : null;
    var legacyRing = opts.colour || opts.tierColour || null;
    var ringActive = (ringPalette && ringPalette.active) || legacyRing || NEXUS_RING_BASELINE;
    var interactive = opts.interactive === true;
    var showRelationships = opts.showRelationships !== false;
    var showSecondaryNodes = opts.showSecondaryNodes === true;
    var prefersReducedMotion = (typeof window !== 'undefined' &&
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    if (!canvas.style.width) canvas.style.width = size + 'px';
    if (!canvas.style.height) canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    var cx = size / 2;
    var cy = size / 2;
    var radius = size * 0.35;

    /* Build node ring using canonical keys so edge lookups by id work. */
    var nodes = CANONICAL_KEYS.map(function (key, i) {
      var angle = (i / CANONICAL_KEYS.length) * Math.PI * 2 - Math.PI / 2;
      var jitter = (Math.sin(i * 2.3) * 0.5) * size * 0.04;
      return {
        id: key,
        angle: angle,
        jitter: jitter,
        phase: Math.random() * Math.PI * 2,
        x: 0,
        y: 0
      };
    });

    /* Ring strokes / secondary-node fills — tinted to the resolved ring colour. */
    function rgba(alpha) {
      return rgbaFromHex(ringActive, alpha);
    }
    /* Core strokes / fills — locked to NEXUS_CORE_COLOUR (AMD-069 core constancy). */
    var coreRgb = hexToRgbTuple(NEXUS_CORE_COLOUR);
    function coreRgba(alpha) {
      return 'rgba(' + coreRgb.r + ', ' + coreRgb.g + ', ' + coreRgb.b + ', ' + alpha + ')';
    }

    var animFrame = null;
    var running = false;
    var hoverId = null;
    var startedAt = 0;

    /* 30fps cap per Art. 13.4. */
    var FRAME_MS = 1000 / 30;
    var lastFrameAt = 0;

    var currentRot = 0;
    function positionNodes(time) {
      currentRot = (time / 120000) * Math.PI * 2; /* 120-second ambient rotation */
      nodes.forEach(function (n) {
        var a = n.angle + currentRot;
        n.x = cx + Math.cos(a) * (radius + n.jitter);
        n.y = cy + Math.sin(a) * (radius + n.jitter);
      });
    }

    /* Draw 0..N secondary "instrument" nodes orbiting their parent primary.
       Silent no-op when the live store is empty or when the opt is off. */
    function drawSecondaries(time, primariesById) {
      if (!showSecondaryNodes) return;
      var instruments = liveStore.instruments;
      if (!instruments || !instruments.length) return;

      var byParent = {};
      for (var i = 0; i < instruments.length; i++) {
        var inst = instruments[i];
        if (!byParent[inst.category_id]) byParent[inst.category_id] = [];
        byParent[inst.category_id].push(inst);
      }

      var orbitRadius = size * 0.06;
      var parentIds = Object.keys(byParent);
      for (var p = 0; p < parentIds.length; p++) {
        var parent = primariesById[parentIds[p]];
        if (!parent) continue;
        var children = byParent[parentIds[p]];
        for (var c = 0; c < children.length; c++) {
          var inst2 = children[c];
          var angleOffset = (c / Math.max(children.length, 1)) * Math.PI * 2;
          var breathOff = prefersReducedMotion
            ? 1
            : 0.95 + 0.05 * Math.sin(time / 3000 + angleOffset);
          var angle = angleOffset + (prefersReducedMotion ? 0 : currentRot);
          var sx = parent.x + Math.cos(angle) * orbitRadius * breathOff;
          var sy = parent.y + Math.sin(angle) * orbitRadius * breathOff;

          ctx.beginPath();
          ctx.moveTo(parent.x, parent.y);
          ctx.lineTo(sx, sy);
          ctx.strokeStyle = rgba(0.08);
          ctx.lineWidth = 0.3;
          ctx.stroke();

          var nodeRadius = size * 0.005 +
            Math.min(Number(inst2.provision_count) / 50, 1) * size * 0.004;
          ctx.beginPath();
          ctx.arc(sx, sy, nodeRadius, 0, Math.PI * 2);
          ctx.fillStyle = rgba(0.4);
          ctx.fill();
        }
      }
    }

    function draw(time) {
      if (!running) { animFrame = null; return; }
      if (time - lastFrameAt < FRAME_MS) {
        animFrame = requestAnimationFrame(draw);
        return;
      }
      lastFrameAt = time;

      ctx.clearRect(0, 0, size, size);
      positionNodes(time);

      var weights = currentWeights();
      var maxWeight = 0;
      nodes.forEach(function (n) {
        var w = weights[n.id] || 0;
        if (w > maxWeight) maxWeight = w;
      });
      if (maxWeight <= 0) maxWeight = 1;

      /* Baseline geometry: lines to centre, adjacent, cross — preserves current look. */
      nodes.forEach(function (n, i) {
        var w = weights[n.id] || 0;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = rgba(0.1 + w * 0.4);
        ctx.lineWidth = 0.5;
        ctx.stroke();

        var next = nodes[(i + 1) % nodes.length];
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = rgba(0.15);
        ctx.lineWidth = 0.5;
        ctx.stroke();

        if (i % 3 === 0) {
          var cross = nodes[(i + 4) % nodes.length];
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(cross.x, cross.y);
          ctx.strokeStyle = rgba(0.08);
          ctx.lineWidth = 0.3;
          ctx.stroke();
        }
      });

      /* v3 relationships overlay — edges weighted by strength (Art. 13.1). */
      if (showRelationships && liveStore.relationships.length) {
        var maxStrength = 1;
        liveStore.relationships.forEach(function (r) {
          if (r.strength > maxStrength) maxStrength = r.strength;
        });
        var byId = {};
        nodes.forEach(function (n) { byId[n.id] = n; });
        liveStore.relationships.forEach(function (edge) {
          var a = byId[edge.from_id];
          var b = byId[edge.to_id];
          if (!a || !b) return;
          var alpha = 0.06 + 0.22 * (edge.strength / maxStrength);
          ctx.strokeStyle = rgba(alpha);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        });
      }

      /* Nodes — glow proportional to weight, breathe modulation. */
      nodes.forEach(function (n) {
        var w = weights[n.id] || 0;
        var freqRatio = w / maxWeight;
        var breathe = 0.7 + 0.3 * Math.sin(time / 2000 + n.phase);
        var isActive = hoverId === n.id;
        var dim = hoverId && !isActive ? 0.3 : 1;

        var nodeRadius = size * (0.015 + w * 0.02) + (isActive ? 1.2 : 0);
        var glowRadius = nodeRadius * (2 + w * 4);

        var grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowRadius);
        grad.addColorStop(0, rgba(w * 0.5 * breathe * dim));
        grad.addColorStop(1, rgba(0));
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = rgba((0.5 + freqRatio * 0.5) * breathe * dim);
        ctx.fill();
      });

      /* D1 — secondary statutory instruments orbit their parent primaries.
         Drawn after primaries so the small dim dots sit visually beneath the
         core glow but outside each primary node's halo. */
      if (showSecondaryNodes && liveStore.instruments && liveStore.instruments.length) {
        var primariesById = {};
        nodes.forEach(function (n) { primariesById[n.id] = n; });
        drawSecondaries(time, primariesById);
      }

      /* Centre halo + core node — AMD-069 core constancy.
         Both paint in NEXUS_CORE_COLOUR irrespective of ring palette / tier.
         Core radius uses NEXUS_CORE_RADIUS_MULTIPLIER against the baseline
         secondary-node radius (size * 0.025) so it reads as 1.4× the ring. */
      var centreBreath = 0.7 + 0.3 * Math.sin(time / 3000);
      var centreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.15);
      centreGrad.addColorStop(0, coreRgba(0.30 * centreBreath));
      centreGrad.addColorStop(1, coreRgba(0));
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = centreGrad;
      ctx.fill();

      var coreRadius = size * 0.025 * NEXUS_CORE_RADIUS_MULTIPLIER;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreRgba(0.95);
      ctx.fill();

      animFrame = requestAnimationFrame(draw);
    }

    function start() {
      if (running) return;
      running = true;
      startedAt = performance.now();
      animFrame = requestAnimationFrame(draw);
    }
    function stop() {
      running = false;
      if (animFrame) cancelAnimationFrame(animFrame);
      animFrame = null;
    }

    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) start(); else stop();
        });
      });
      io.observe(canvas);
    } else {
      start();
    }

    /* Interactivity — hover spotlight (Art. 13.1 spec: active 1.0, others 0.3). */
    function onMove(ev) {
      var rect = canvas.getBoundingClientRect();
      var px = ev.clientX - rect.left;
      var py = ev.clientY - rect.top;
      var hit = null;
      var hitDist = Infinity;
      nodes.forEach(function (n) {
        var dx = n.x - px;
        var dy = n.y - py;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 14 && d < hitDist) { hit = n.id; hitDist = d; }
      });
      hoverId = hit;
    }
    function onLeave() { hoverId = null; }
    if (interactive) {
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseleave', onLeave);
    }

    /* Subscribe to live store updates — re-render kicks itself via RAF loop. */
    var unsubscribe = function () {
      var idx = liveStore.subscribers.indexOf(redraw);
      if (idx >= 0) liveStore.subscribers.splice(idx, 1);
    };
    function redraw() { /* next frame picks up new weights via currentWeights() */ }
    liveStore.subscribers.push(redraw);

    return {
      destroy: function () {
        stop();
        if (io) io.disconnect();
        if (interactive) {
          canvas.removeEventListener('mousemove', onMove);
          canvas.removeEventListener('mouseleave', onLeave);
        }
        unsubscribe();
      }
    };
  }

  /* ============================================================
     LAYER 3 — ACEI CHROMATIC SIGNATURE API (EILEEN-009 / AMD-072)
     Declares the 12-colour ACEI palette accessors, WeightVector
     renderers (bar, ring, chips), and the provenance accessor.
     The chromatic signature indicates the ACEI-category composition
     computed for an artefact. Intelligence, not legal advice.
     Consumers: NEXUS-KL-001 (Brief #6). No surface consumes this
     namespace at ailane.ai today — declaration only.
     ============================================================ */

  var ACEI_PALETTE = [
    { n: 1,  token: '--acei-1',  hex: '#EF4444', nonText: false },
    { n: 2,  token: '--acei-2',  hex: '#D946EF', nonText: false },
    { n: 3,  token: '--acei-3',  hex: '#22C55E', nonText: false },
    { n: 4,  token: '--acei-4',  hex: '#FACC15', nonText: false },
    { n: 5,  token: '--acei-5',  hex: '#3B82F6', nonText: false },
    { n: 6,  token: '--acei-6',  hex: '#F97316', nonText: false },
    { n: 7,  token: '--acei-7',  hex: '#F43F5E', nonText: false },
    { n: 8,  token: '--acei-8',  hex: '#A21CAF', nonText: true  },
    { n: 9,  token: '--acei-9',  hex: '#6366F1', nonText: false },
    { n: 10, token: '--acei-10', hex: '#14B8A6', nonText: false },
    { n: 11, token: '--acei-11', hex: '#4338CA', nonText: true  },
    { n: 12, token: '--acei-12', hex: '#64748B', nonText: false }
  ];
  (function freezeACEIPalette() {
    for (var fi = 0; fi < ACEI_PALETTE.length; fi++) {
      Object.freeze(ACEI_PALETTE[fi]);
    }
    Object.freeze(ACEI_PALETTE);
  })();

  var ACEI_WEIGHT_KEYS = [
    'c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12'
  ];
  var ACEI_TOLERANCE = 0.005;
  var ACEI_RESIDUAL_COLOUR = '#1E293B';
  var ACEI_NONTEXT_FG = '#FFFFFF';
  var ACEI_TEXT_FG = '#0a0e1a';

  function resolveACEIPalette() {
    return ACEI_PALETTE;
  }

  /* Read a WeightVector as c1..c12. Warns (does not silently renormalise)
     when the sum falls outside ±ACEI_TOLERANCE — that is an upstream
     emission fault per EILEEN-009 Annex B. Segment drawing still uses
     values/total so a malformed vector degrades visibly, not silently. */
  function readACEIWeights(w) {
    var values = [];
    var total = 0;
    for (var i = 0; i < ACEI_WEIGHT_KEYS.length; i++) {
      var k = ACEI_WEIGHT_KEYS[i];
      var v = Number(w && w[k]);
      if (!isFinite(v) || v < 0) v = 0;
      values.push(v);
      total += v;
    }
    if (total > 0 && Math.abs(total - 1.0) > ACEI_TOLERANCE) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Nexus Layer 3] WeightVector sum ' + total.toFixed(4) +
          ' exceeds tolerance ±' + ACEI_TOLERANCE +
          '. Upstream emission likely faulty.');
      }
    }
    return { values: values, total: total };
  }

  function clearACEIHost(host) {
    while (host.firstChild) host.removeChild(host.firstChild);
  }

  function renderBar(host, w, opts) {
    if (!host) return;
    opts = opts || {};
    var height = Number(opts.height) || 8;
    var minSegmentPct = typeof opts.minSegmentPct === 'number' ? opts.minSegmentPct : 2;
    var labels = opts.labels === true;

    var read = readACEIWeights(w);
    clearACEIHost(host);
    host.style.display = 'flex';
    host.style.width = '100%';
    host.style.height = height + 'px';
    host.style.overflow = 'hidden';
    host.style.borderRadius = '2px';
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', 'ACEI chromatic signature bar');

    if (read.total <= 0) return;

    var residualPct = 0;
    for (var i = 0; i < read.values.length; i++) {
      var entry = ACEI_PALETTE[i];
      var pct = (read.values[i] / read.total) * 100;
      if (pct < minSegmentPct) {
        residualPct += pct;
        continue;
      }
      var seg = document.createElement('div');
      seg.style.flex = pct + ' 0 0';
      seg.style.background = entry.hex;
      seg.setAttribute('aria-label',
        'category ' + entry.n + ' ' + pct.toFixed(1) + '%');
      if (labels) {
        seg.textContent = entry.n;
        seg.style.color = entry.nonText ? ACEI_NONTEXT_FG : ACEI_TEXT_FG;
        seg.style.fontSize = Math.max(9, height - 2) + 'px';
        seg.style.display = 'flex';
        seg.style.alignItems = 'center';
        seg.style.justifyContent = 'center';
      }
      host.appendChild(seg);
    }
    if (residualPct > 0) {
      var res = document.createElement('div');
      res.style.flex = residualPct + ' 0 0';
      res.style.background = ACEI_RESIDUAL_COLOUR;
      res.setAttribute('aria-label', 'residual categories');
      host.appendChild(res);
    }
  }

  function renderRing(host, w, opts) {
    if (!host) return;
    opts = opts || {};
    var size = Number(opts.size) || 64;
    var thickness = Number(opts.thickness) || 8;
    var startAngle = typeof opts.startAngle === 'number' ? opts.startAngle : -90;
    var minSegmentPct = 2;

    var read = readACEIWeights(w);
    clearACEIHost(host);
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', 'ACEI chromatic signature ring');

    var svgns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgns, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    host.appendChild(svg);

    if (read.total <= 0) return;

    var cx = size / 2;
    var cy = size / 2;
    var r = (size - thickness) / 2;
    var circumference = 2 * Math.PI * r;

    var cursor = startAngle;
    var residualPct = 0;

    for (var i = 0; i < read.values.length; i++) {
      var entry = ACEI_PALETTE[i];
      var pct = (read.values[i] / read.total) * 100;
      if (pct < minSegmentPct) {
        residualPct += pct;
        continue;
      }
      var arcLen = (pct / 100) * circumference;
      var seg = document.createElementNS(svgns, 'circle');
      seg.setAttribute('cx', String(cx));
      seg.setAttribute('cy', String(cy));
      seg.setAttribute('r', String(r));
      seg.setAttribute('fill', 'none');
      seg.setAttribute('stroke', entry.hex);
      seg.setAttribute('stroke-width', String(thickness));
      seg.setAttribute('stroke-dasharray', arcLen + ' ' + circumference);
      seg.setAttribute('transform', 'rotate(' + cursor + ' ' + cx + ' ' + cy + ')');
      seg.setAttribute('aria-label',
        'category ' + entry.n + ' ' + pct.toFixed(1) + '%');
      svg.appendChild(seg);
      cursor += (pct / 100) * 360;
    }
    if (residualPct > 0) {
      var arcLenR = (residualPct / 100) * circumference;
      var segR = document.createElementNS(svgns, 'circle');
      segR.setAttribute('cx', String(cx));
      segR.setAttribute('cy', String(cy));
      segR.setAttribute('r', String(r));
      segR.setAttribute('fill', 'none');
      segR.setAttribute('stroke', ACEI_RESIDUAL_COLOUR);
      segR.setAttribute('stroke-width', String(thickness));
      segR.setAttribute('stroke-dasharray', arcLenR + ' ' + circumference);
      segR.setAttribute('transform', 'rotate(' + cursor + ' ' + cx + ' ' + cy + ')');
      segR.setAttribute('aria-label', 'residual categories');
      svg.appendChild(segR);
    }
  }

  function renderChips(host, w, opts) {
    if (!host) return;
    opts = opts || {};
    var threshold = typeof opts.threshold === 'number' ? opts.threshold : 0.08;
    var max = Number(opts.max) || 4;
    var showPct = opts.showPct !== false;

    var read = readACEIWeights(w);
    clearACEIHost(host);
    host.style.display = 'flex';
    host.style.flexWrap = 'wrap';
    host.style.gap = '6px';
    host.setAttribute('role', 'list');
    host.setAttribute('aria-label', 'ACEI dominant categories');

    if (read.total <= 0) return;

    var ranked = [];
    for (var i = 0; i < read.values.length; i++) {
      var ratio = read.values[i] / read.total;
      if (ratio < threshold) continue;
      ranked.push({ entry: ACEI_PALETTE[i], ratio: ratio });
    }
    ranked.sort(function (a, b) { return b.ratio - a.ratio; });
    if (ranked.length > max) ranked.length = max;

    for (var j = 0; j < ranked.length; j++) {
      var item = ranked[j];
      var chip = document.createElement('span');
      chip.setAttribute('role', 'listitem');
      chip.style.display = 'inline-flex';
      chip.style.alignItems = 'center';
      chip.style.padding = '2px 8px';
      chip.style.borderRadius = '999px';
      chip.style.background = item.entry.hex;
      chip.style.color = item.entry.nonText ? ACEI_NONTEXT_FG : ACEI_TEXT_FG;
      chip.style.fontSize = '11px';
      chip.style.fontWeight = '600';
      chip.style.lineHeight = '1.4';
      var label = 'C' + item.entry.n;
      if (showPct) label += ' · ' + (item.ratio * 100).toFixed(0) + '%';
      chip.textContent = label;
      host.appendChild(chip);
    }
  }

  function resolvePrimary(w) {
    var read = readACEIWeights(w);
    if (read.total <= 0) return null;
    var bestRatio = -1;
    var bestIdx = -1;
    for (var i = 0; i < read.values.length; i++) {
      var ratio = read.values[i] / read.total;
      if (ratio > bestRatio) { bestRatio = ratio; bestIdx = i; }
    }
    if (bestIdx < 0 || bestRatio <= 0.20) return null;
    var entry = ACEI_PALETTE[bestIdx];
    return {
      n: entry.n,
      token: entry.token,
      hex: entry.hex,
      weight: bestRatio
    };
  }

  function getProvenance(w) {
    if (!w || !w.provenance || typeof w.provenance !== 'object') return null;
    var p = w.provenance;
    return {
      source: String(p.source || ''),
      computed_at: String(p.computed_at || ''),
      confidence: Number(p.confidence) || 0
    };
  }

  window.AilaneNexus = {
    createNexus: createNexus,
    updateLive: updateLive,
    CANONICAL_KEYS: CANONICAL_KEYS,

    /* AMD-069 palette surface — consumers must read colours from here
       and never hardcode Nexus hexes outside this module. */
    NEXUS_CORE_COLOUR: NEXUS_CORE_COLOUR,
    NEXUS_CORE_GLOW: NEXUS_CORE_GLOW,
    NEXUS_CORE_RADIUS_MULTIPLIER: NEXUS_CORE_RADIUS_MULTIPLIER,
    NEXUS_RING_BASELINE: NEXUS_RING_BASELINE,
    NEXUS_RING_BASELINE_DIM: NEXUS_RING_BASELINE_DIM,
    NEXUS_RING_HIGH_ACCENT: NEXUS_RING_HIGH_ACCENT,
    NEXUS_RING_HIGH_ACCENT_DIM: NEXUS_RING_HIGH_ACCENT_DIM,
    NEXUS_RING_OPERATIONAL_LIFT: NEXUS_RING_OPERATIONAL_LIFT,
    NEXUS_RING_OPERATIONAL_LIFT_DIM: NEXUS_RING_OPERATIONAL_LIFT_DIM,
    NEXUS_RING_GOVERNANCE_OVERLAY: NEXUS_RING_GOVERNANCE_OVERLAY,
    NEXUS_RING_GOVERNANCE_OVERLAY_DIM: NEXUS_RING_GOVERNANCE_OVERLAY_DIM,
    NEXUS_EDGE_ACTIVE_ALPHA: NEXUS_EDGE_ACTIVE_ALPHA,
    NEXUS_EDGE_IDLE_ALPHA: NEXUS_EDGE_IDLE_ALPHA,
    resolveRingPalette: resolveRingPalette,
    resolveEdgeColour: resolveEdgeColour
  };

  // Layer 3 — ACEI Chromatic Signature (EILEEN-009 / AMD-072)
  window.AilaneNexus.chromaticSignature = {
    resolveACEIPalette: resolveACEIPalette,
    renderBar: renderBar,
    renderRing: renderRing,
    renderChips: renderChips,
    resolvePrimary: resolvePrimary,
    getProvenance: getProvenance
  };
  window.AilaneNexus.resolveACEIPalette = resolveACEIPalette;

  /* ============================================================
     Layer 3 DEV self-test — runs on localhost or with
     ?nexus-debug=1 in the URL. Production loads suppress entirely.
     ============================================================ */
  (function layerThreeSelfTest() {
    if (typeof window === 'undefined' || !window.document) return;
    var hostname = (window.location && window.location.hostname) || '';
    var search = (window.location && window.location.search) || '';
    var debug = search.indexOf('nexus-debug=1') >= 0;
    if (hostname !== 'localhost' && !debug) return;
    if (!window.AilaneNexus || !window.AilaneNexus.chromaticSignature) return;

    try {
      var cs = window.AilaneNexus.chromaticSignature;

      var expected = [
        ['--acei-1',  '#EF4444'], ['--acei-2',  '#D946EF'],
        ['--acei-3',  '#22C55E'], ['--acei-4',  '#FACC15'],
        ['--acei-5',  '#3B82F6'], ['--acei-6',  '#F97316'],
        ['--acei-7',  '#F43F5E'], ['--acei-8',  '#A21CAF'],
        ['--acei-9',  '#6366F1'], ['--acei-10', '#14B8A6'],
        ['--acei-11', '#4338CA'], ['--acei-12', '#64748B']
      ];
      var rootStyle = getComputedStyle(document.documentElement);
      for (var i = 0; i < expected.length; i++) {
        var got = rootStyle.getPropertyValue(expected[i][0]).trim().toUpperCase();
        var want = expected[i][1].toUpperCase();
        if (got !== want) {
          throw new Error('token ' + expected[i][0] + ' resolved "' + got +
            '", expected "' + want + '"');
        }
      }

      var pal = cs.resolveACEIPalette();
      if (!Array.isArray(pal) || pal.length !== 12) {
        throw new Error('resolveACEIPalette length ' + (pal && pal.length));
      }
      if (!Object.isFrozen(pal)) throw new Error('palette array not frozen');
      for (var j = 0; j < 12; j++) {
        if (pal[j].n !== j + 1) {
          throw new Error('palette order at index ' + j + ' -> n=' + pal[j].n);
        }
        var shouldBeNonText = (pal[j].n === 8 || pal[j].n === 11);
        if (pal[j].nonText !== shouldBeNonText) {
          throw new Error('nonText flag category ' + pal[j].n);
        }
        if (!Object.isFrozen(pal[j])) {
          throw new Error('palette entry not frozen category ' + pal[j].n);
        }
      }

      var uniform = {
        c1: 1/12, c2: 1/12, c3: 1/12, c4:  1/12,
        c5: 1/12, c6: 1/12, c7: 1/12, c8:  1/12,
        c9: 1/12, c10: 1/12, c11: 1/12, c12: 1/12,
        provenance: {
          source: 'selftest.uniform',
          computed_at: new Date().toISOString(),
          confidence: 1.0
        }
      };

      var barHost = document.createElement('div');
      cs.renderBar(barHost, uniform);
      if (barHost.childNodes.length !== 12) {
        throw new Error('renderBar children ' + barHost.childNodes.length);
      }

      var ringHost = document.createElement('div');
      cs.renderRing(ringHost, uniform);
      var svg = ringHost.firstChild;
      if (!svg || svg.childNodes.length !== 12) {
        throw new Error('renderRing children ' +
          (svg && svg.childNodes.length));
      }

      console.log('[Nexus Layer 3] self-test PASSED');
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('[Nexus Layer 3] self-test FAILED:', e && e.message);
      }
    }
  })();
})();
