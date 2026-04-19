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

  /* AMD-069 — Two-layer palette. Authority: AILANE-AMD-069 §1.3.
     Source of truth: assets/css/tokens.css (--nexus-* tokens). This block
     mirrors those tokens for JS consumers; do not introduce values here that
     are not also present in tokens.css.
     Core Identity Colour is constant and tier-independent; it paints the core
     Nexus node and its halo on every surface. Tier Ring Palette paints the
     secondary nodes and connector edges and is resolved from pageTier. */
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
      case 'institutional':
      case 'ceo_command':
        return {
          active: NEXUS_RING_HIGH_ACCENT,
          dim:    NEXUS_RING_HIGH_ACCENT_DIM
        };
      case 'landing':
      case 'operational_readiness':
      case 'governance':
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

    function positionNodes(time) {
      var rot = (time / 120000) * Math.PI * 2; /* 120-second ambient rotation */
      nodes.forEach(function (n) {
        var a = n.angle + rot;
        n.x = cx + Math.cos(a) * (radius + n.jitter);
        n.y = cy + Math.sin(a) * (radius + n.jitter);
      });
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
})();
