/**
 * Nexus — Eileen's visual identity.
 * Authority: AILANE-SPEC-EILEEN-UNIFIED-001 v1.0, Part V (AMD-058).
 * Anti-drift: Unified Spec Art. 27.2 — this file MUST NOT reference
 * any superseded EILEEN-series document (001, 002, 002-AM-001,
 * 002-AM-002, 003, 007, 008). The Unified Spec is the sole authority.
 *
 * Consumed by:
 *   - Floating Eileen (52px, decorative, landing + KL access page)
 *   - Embedded Eileen (38px, decorative, all pages with Eileen present)
 *   - Landing hero live data visualisation (180px + viewport, interactive)
 *
 * Never consumed as: a chat entry point. The Nexus does not open panels.
 */

// ─── Tunables (Unified Spec Art. 13.1, Table 6) ────────────────────────────
// glow(category) = BASE_GLOW + ACEI_WEIGHTS[category] * GLOW_MULTIPLIER
// With weights 0.01..0.28 → 0.37..0.91 glow range.
const BASE_GLOW = 0.35;
const GLOW_MULTIPLIER = 2.0;

// Animation periods (Unified Spec Art. 13.1, 13.7)
const BREATHING_PERIOD_MS = 4000;      // sinusoidal opacity modulation
const ROTATION_PERIOD_MS  = 120000;    // full revolution in interactive mode

// Performance discipline (Unified Spec Art. 13.4, brief §10)
const DRAW_BUDGET_MS      = 2;
const SOFT_FAIL_MS        = 4;
const SOFT_FAIL_STREAK    = 10;
const SECONDARY_REDUCTION = 0.75;

// Data source (Unified Spec Table 8, eileen-landing-intel v2, verify_jwt: false)
const LANDING_INTEL_URL = 'https://cnbsxwtvazfvzmltkuvx.functions.supabase.co/eileen-landing-intel';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// DPR cap (brief §10.5)
const MAX_DPR = 2;

// IntersectionObserver threshold (brief §10.2)
const IO_THRESHOLD = 0.01;

// ─── Table 6 — ACEI category weights (verbatim, sum = 1.00) ────────────────
export const ACEI_WEIGHTS = Object.freeze({
  unfair_dismissal:           0.28,  // Highest tribunal frequency → brightest
  discrimination_harassment:  0.22,
  wages_working_time:         0.15,
  breach_of_contract:         0.12,
  redundancy:                 0.06,
  tupe:                       0.04,
  whistleblowing:             0.03,
  health_safety:              0.03,
  family_rights:              0.03,
  data_protection:            0.02,
  employment_status:          0.01,
  collective_consultation:    0.01
});

// ─── Table 7 — Tier palettes (verbatim) ────────────────────────────────────
// The gold (#F59E0B) is reserved for the Institutional tier (Unified Spec
// Art. 12.6). Never produced as a fallback in any other context.
export const TIER_PALETTES = Object.freeze({
  'cyan': {
    nodes:       ['#0EA5E9'],
    connections: 'rgba(14, 165, 233, 0.20)'
  },
  'cyan+green': {
    nodes:       ['#0EA5E9', '#22D3EE'],
    connections: 'rgba(34, 211, 238, 0.30)'
  },
  'cyan+purple': {
    nodes:       ['#0EA5E9', '#A855F7'],
    connections: 'rgba(168, 85, 247, 0.30)'
  },
  'gold': {
    nodes:       ['#F59E0B'],  // EXCLUSIVE to Institutional
    connections: 'rgba(245, 158, 11, 0.40)'
  }
});

// ─── Shared offscreen glow atlas (brief §10.6) ─────────────────────────────
// Single module-scope cache keyed by "colour|radius|alpha". All Nexus
// instances share these pre-rendered sprites so the hot path allocates zero
// gradients per frame.
const GLOW_ATLAS = new Map();

function atlasKey(hex, radius, alpha) {
  return hex + '|' + radius.toFixed(1) + '|' + alpha.toFixed(2);
}

function getGlowSprite(hex, radius, alpha) {
  const key = atlasKey(hex, radius, alpha);
  const cached = GLOW_ATLAS.get(key);
  if (cached) return cached;
  const d = Math.ceil(radius * 2);
  if (d <= 0) return null;
  const off = document.createElement('canvas');
  off.width = d;
  off.height = d;
  const c = off.getContext('2d');
  const grad = c.createRadialGradient(radius, radius, 0, radius, radius, radius);
  const rgba = hexToRgba(hex);
  grad.addColorStop(0, 'rgba(' + rgba.r + ',' + rgba.g + ',' + rgba.b + ',' + alpha + ')');
  grad.addColorStop(1, 'rgba(' + rgba.r + ',' + rgba.g + ',' + rgba.b + ',0)');
  c.fillStyle = grad;
  c.beginPath();
  c.arc(radius, radius, radius, 0, Math.PI * 2);
  c.fill();
  GLOW_ATLAS.set(key, off);
  return off;
}

function hexToRgba(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substr(0, 2), 16),
    g: parseInt(h.substr(2, 2), 16),
    b: parseInt(h.substr(4, 2), 16)
  };
}

// ─── Category → instrument distribution (69 secondaries weighted by ACEI) ──
// Returns an array of 69 secondary nodes, each tagged with its categoryId,
// angle offset relative to the parent category, and an orbital radius.
function distributeSecondaries(categoryIds, totalSecondary) {
  const raw = categoryIds.map(id => ACEI_WEIGHTS[id] * totalSecondary);
  const floored = raw.map(Math.floor);
  let sum = floored.reduce((a, b) => a + b, 0);
  const remainders = raw
    .map((v, i) => ({ i, r: v - floored[i] }))
    .sort((a, b) => b.r - a.r);
  let j = 0;
  while (sum < totalSecondary) {
    floored[remainders[j % remainders.length].i] += 1;
    sum += 1;
    j += 1;
  }
  return floored;
}

// ─── Validation ────────────────────────────────────────────────────────────
function validateConfig(config) {
  if (!config || !(config.canvas instanceof HTMLCanvasElement)) {
    throw new Error('[Nexus] config.canvas must be an HTMLCanvasElement');
  }
  const { size, interactive, fps, dataSource, tierColour, nodeCount } = config;
  const validSizes = [52, 38, 180, 'viewport'];
  if (validSizes.indexOf(size) === -1) {
    throw new Error('[Nexus] config.size must be one of 52, 38, 180, "viewport"');
  }
  if (!TIER_PALETTES[tierColour]) {
    throw new Error('[Nexus] config.tierColour must be one of ' + Object.keys(TIER_PALETTES).join(', '));
  }
  if ([12, 32, 81].indexOf(nodeCount) === -1) {
    throw new Error('[Nexus] config.nodeCount must be 12, 32, or 81');
  }
  if (interactive && size !== 180 && size !== 'viewport') {
    throw new Error('[Nexus] interactive mode requires size 180 or "viewport"');
  }
  if (fps === 30 && size !== 180 && size !== 'viewport') {
    throw new Error('[Nexus] fps 30 is only permitted at size 180 or "viewport"');
  }
  if (fps !== 15 && fps !== 30) {
    throw new Error('[Nexus] config.fps must be 15 or 30');
  }
  if (dataSource === 'eileen-landing-intel' && !interactive) {
    throw new Error('[Nexus] dataSource "eileen-landing-intel" requires interactive: true');
  }
  if (dataSource !== null && dataSource !== 'eileen-landing-intel') {
    throw new Error('[Nexus] config.dataSource must be null or "eileen-landing-intel"');
  }
}

// ─── Main entry point ──────────────────────────────────────────────────────
export function renderNexus(config) {
  validateConfig(config);

  const canvas = config.canvas;
  const palette = TIER_PALETTES[config.tierColour];
  const primaryCount = 12;
  const secondaryCount = config.nodeCount === 81 ? 69 : (config.nodeCount === 32 ? 20 : 0);
  const pauseOffscreen    = config.pauseOffscreen !== false;
  const respectRM         = config.respectReducedMotion !== false;
  const ariaLabel         = config.ariaLabel || 'Eileen — the Nexus';
  const frameInterval     = 1000 / config.fps;

  // Accessibility (brief §11.1)
  if (!canvas.getAttribute('role')) canvas.setAttribute('role', 'img');
  if (!canvas.getAttribute('aria-label')) canvas.setAttribute('aria-label', ariaLabel);

  // Runtime state mutated via setState / pointer events
  const state = {
    hoverXY: null,
    activeCategory: null,
    hoverCategory: null,
    pause: false,
    reducedMotion: false,
    skipSecondaryConnections: false,
    activeSecondaryCount: secondaryCount,
    softFailStreak: 0,
    secondaryReductionApplied: false
  };

  // Telemetry
  const stats = {
    fps: 0,
    avgDrawMs: 0,
    droppedFrames: 0,
    _frameCount: 0,
    _frameBudget: 0,
    _lastFpsReset: 0
  };

  // Category list (stable ordering)
  const categoryIds = Object.keys(ACEI_WEIGHTS);
  const secondaryPerCategory = secondaryCount > 0
    ? distributeSecondaries(categoryIds, secondaryCount)
    : categoryIds.map(() => 0);

  // Deterministic layout: primary nodes evenly distributed, secondaries
  // clustered around their parent category.
  const primaryNodes = categoryIds.map((id, i) => {
    const angle = (i / primaryCount) * Math.PI * 2 - Math.PI / 2;
    const jitter = Math.sin(i * 2.3) * 0.04;
    return {
      id,
      weight: ACEI_WEIGHTS[id],
      baseAngle: angle,
      radiusMul: 0.36 + jitter,
      phase: (i * 0.7) % (Math.PI * 2)
    };
  });

  const secondaryNodes = [];
  categoryIds.forEach((id, ci) => {
    const count = secondaryPerCategory[ci];
    if (!count) return;
    const parentAngle = primaryNodes[ci].baseAngle;
    const spread = Math.PI * 2 / primaryCount * 0.85;
    for (let k = 0; k < count; k++) {
      const t = count === 1 ? 0 : (k / (count - 1) - 0.5);
      const angle = parentAngle + t * spread;
      secondaryNodes.push({
        categoryId: id,
        parentIndex: ci,
        baseAngle: angle,
        radiusMul: 0.62 + ((k * 13 + ci * 7) % 10) * 0.008,
        phase: ((k * 1.7 + ci * 0.9) % (Math.PI * 2))
      });
    }
  });

  // Relationships (populated from data source when available; otherwise empty)
  let relationships = [];

  // Canvas sizing state
  let cssWidth = 0;
  let cssHeight = 0;
  let ctx = canvas.getContext('2d');
  let rafId = null;
  let lastFrameTime = 0;
  let startTimestamp = 0;

  // Observers and listeners (tracked for clean destroy)
  let io = null;
  let ro = null;
  let abortCtrl = null;
  let refreshTimer = null;
  let pointerMoveHandler = null;
  let pointerLeaveHandler = null;
  let pointerDownHandler = null;
  let mediaQuery = null;
  let mediaQueryHandler = null;

  function resolveSize() {
    if (config.size === 'viewport') {
      const rect = canvas.getBoundingClientRect();
      return { w: Math.max(1, rect.width), h: Math.max(1, rect.height) };
    }
    return { w: config.size, h: config.size };
  }

  function applyCanvasSize() {
    const { w, h } = resolveSize();
    cssWidth = w;
    cssHeight = h;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (config.size !== 'viewport') {
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ─── Draw loop ────────────────────────────────────────────────────────
  function draw(now) {
    const t0 = performance.now();
    const cx = cssWidth / 2;
    const cy = cssHeight / 2;
    const ringRadius = Math.min(cssWidth, cssHeight);

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Motion phases
    const elapsed = now - startTimestamp;
    const breath = state.reducedMotion
      ? 1
      : 0.75 + 0.25 * Math.sin((elapsed / BREATHING_PERIOD_MS) * Math.PI * 2);
    const rotation = (config.interactive && !state.reducedMotion)
      ? (elapsed / ROTATION_PERIOD_MS) * Math.PI * 2
      : 0;

    const primaryColour = palette.nodes[0];
    const secondaryColour = palette.nodes[1] || palette.nodes[0];
    const connStroke = palette.connections;

    // Resolve node positions
    const primaryPos = primaryNodes.map(n => {
      const angle = n.baseAngle + rotation;
      const r = n.radiusMul * ringRadius;
      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        node: n
      };
    });

    const activeSecondary = Math.min(secondaryNodes.length, state.activeSecondaryCount);
    const secondaryPos = [];
    for (let i = 0; i < activeSecondary; i++) {
      const n = secondaryNodes[i];
      const angle = n.baseAngle + rotation;
      const r = n.radiusMul * ringRadius;
      secondaryPos.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        node: n
      });
    }

    // Spotlight: determine which category is highlighted (if any)
    const highlight = state.activeCategory || state.hoverCategory;
    const dim = 0.3;

    // Primary→secondary membership lines
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = connStroke;
    for (let i = 0; i < secondaryPos.length; i++) {
      const sp = secondaryPos[i];
      const pp = primaryPos[sp.node.parentIndex];
      if (highlight && highlight !== sp.node.categoryId) {
        ctx.globalAlpha = dim;
      } else {
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.moveTo(pp.x, pp.y);
      ctx.lineTo(sp.x, sp.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Secondary↔secondary cross-reference lines (skipped under soft-fail)
    if (!state.skipSecondaryConnections && relationships.length > 0) {
      for (let k = 0; k < relationships.length; k++) {
        const rel = relationships[k];
        const a = secondaryPos[rel.fromIndex];
        const b = secondaryPos[rel.toIndex];
        if (!a || !b) continue;
        if (highlight && a.node.categoryId !== highlight && b.node.categoryId !== highlight) {
          ctx.globalAlpha = dim * rel.strength;
        } else {
          ctx.globalAlpha = rel.strength;
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Secondary nodes
    const secondaryRadius = Math.max(0.8, cssWidth * 0.008);
    for (let i = 0; i < secondaryPos.length; i++) {
      const sp = secondaryPos[i];
      const dimmed = highlight && highlight !== sp.node.categoryId;
      ctx.globalAlpha = dimmed ? dim : breath;
      const glowR = secondaryRadius * 2.5;
      const sprite = getGlowSprite(secondaryColour, glowR, 0.35);
      if (sprite) ctx.drawImage(sprite, sp.x - glowR, sp.y - glowR);
      ctx.fillStyle = secondaryColour;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, secondaryRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Primary nodes — glow intensity scales with ACEI weight
    const primaryRadius = Math.max(1.2, cssWidth * 0.014);
    for (let i = 0; i < primaryPos.length; i++) {
      const pp = primaryPos[i];
      const n = pp.node;
      const weightGlow = BASE_GLOW + n.weight * GLOW_MULTIPLIER;
      const dimmed = highlight && highlight !== n.id;
      const alpha = dimmed ? dim : Math.min(1, weightGlow * breath);
      const glowR = primaryRadius * (3 + n.weight * 6);
      ctx.globalAlpha = alpha;
      const sprite = getGlowSprite(primaryColour, glowR, 0.55);
      if (sprite) ctx.drawImage(sprite, pp.x - glowR, pp.y - glowR);
      ctx.fillStyle = primaryColour;
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, primaryRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Centre halo (single draw — cheap)
    const haloR = Math.max(3, cssWidth * 0.04);
    const centreGlow = getGlowSprite(primaryColour, haloR, 0.25 * breath);
    if (centreGlow) ctx.drawImage(centreGlow, cx - haloR, cy - haloR);

    // Soft-deadline accounting
    const dt = performance.now() - t0;
    stats._frameCount += 1;
    stats._frameBudget += dt;
    if (stats._frameCount >= 30) {
      stats.avgDrawMs = stats._frameBudget / stats._frameCount;
      stats._frameCount = 0;
      stats._frameBudget = 0;
    }
    if (dt > DRAW_BUDGET_MS) {
      state.skipSecondaryConnections = true;
    } else {
      state.skipSecondaryConnections = false;
    }
    if (dt > SOFT_FAIL_MS) {
      state.softFailStreak += 1;
      if (state.softFailStreak >= SOFT_FAIL_STREAK && !state.secondaryReductionApplied) {
        state.activeSecondaryCount = Math.floor(secondaryNodes.length * SECONDARY_REDUCTION);
        state.secondaryReductionApplied = true;
        console.warn('[Nexus] sustained draw budget overrun; reducing secondary-node count by 25%');
      }
    } else {
      state.softFailStreak = 0;
    }
  }

  // ─── rAF loop with fps cap ────────────────────────────────────────────
  function loop(now) {
    rafId = requestAnimationFrame(loop);
    if (state.pause) return;

    if (!lastFrameTime) lastFrameTime = now;
    const delta = now - lastFrameTime;
    if (delta < frameInterval) return;

    const framesSkipped = Math.max(0, Math.floor(delta / frameInterval) - 1);
    if (framesSkipped > 0) stats.droppedFrames += framesSkipped;

    lastFrameTime = now - (delta % frameInterval);

    if (!stats._lastFpsReset) stats._lastFpsReset = now;
    const elapsed = now - stats._lastFpsReset;
    if (elapsed > 0) stats.fps = Math.round(1000 / Math.max(1, delta));

    draw(now);

    // Reduced-motion: render one static frame, then suspend rAF until setState
    if (state.reducedMotion) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function staticFrame() {
    if (!lastFrameTime) lastFrameTime = performance.now();
    draw(performance.now());
  }

  // ─── Data source ──────────────────────────────────────────────────────
  function applyData(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (!Array.isArray(payload.categories)) return false;
    // Mutate primary node weights from payload claimFrequency (normalised).
    let total = 0;
    for (let i = 0; i < payload.categories.length; i++) {
      const c = payload.categories[i];
      if (c && typeof c.claimFrequency === 'number') total += c.claimFrequency;
    }
    if (total <= 0) return false;
    for (let i = 0; i < primaryNodes.length; i++) {
      const match = payload.categories.find(c => c && c.id === primaryNodes[i].id);
      if (match && typeof match.claimFrequency === 'number') {
        primaryNodes[i].weight = match.claimFrequency / total;
      }
    }
    // Build relationships index if provided.
    if (Array.isArray(payload.relationships) && Array.isArray(payload.instruments)) {
      const idToIndex = new Map();
      payload.instruments.forEach((inst, idx) => {
        if (inst && inst.id) idToIndex.set(inst.id, idx);
      });
      const next = [];
      for (const rel of payload.relationships) {
        if (!rel) continue;
        const a = idToIndex.get(rel.fromId);
        const b = idToIndex.get(rel.toId);
        const strength = typeof rel.strength === 'number' ? Math.max(0, Math.min(1, rel.strength)) : 0.3;
        if (a != null && b != null) next.push({ fromIndex: a, toIndex: b, strength });
      }
      relationships = next;
    }
    return true;
  }

  async function fetchIntel() {
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();
    try {
      const res = await fetch(LANDING_INTEL_URL, { signal: abortCtrl.signal });
      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      if (!applyData(data)) {
        console.warn('[Nexus] landing-intel unavailable; using static fallback');
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.warn('[Nexus] landing-intel unavailable; using static fallback');
    }
  }

  // ─── Interactive pointer handlers (brief §8) ──────────────────────────
  function nearestCategory(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const cx = cssWidth / 2;
    const cy = cssHeight / 2;
    const ringRadius = Math.min(cssWidth, cssHeight);
    let nearestId = null;
    let nearestDist = Infinity;
    const elapsed = performance.now() - startTimestamp;
    const rotation = state.reducedMotion ? 0 : (elapsed / ROTATION_PERIOD_MS) * Math.PI * 2;
    for (let i = 0; i < primaryNodes.length; i++) {
      const n = primaryNodes[i];
      const angle = n.baseAngle + rotation;
      const r = n.radiusMul * ringRadius;
      const nx = cx + Math.cos(angle) * r;
      const ny = cy + Math.sin(angle) * r;
      const dx = nx - px;
      const dy = ny - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearestDist) {
        nearestDist = d2;
        nearestId = n.id;
      }
    }
    return nearestId;
  }

  function attachInteractiveHandlers() {
    pointerMoveHandler = (e) => {
      state.hoverXY = { x: e.clientX, y: e.clientY };
      state.hoverCategory = nearestCategory(e.clientX, e.clientY);
    };
    pointerLeaveHandler = () => {
      state.hoverXY = null;
      state.hoverCategory = null;
    };
    pointerDownHandler = () => {
      // Focus hook only — the Nexus is never a click-to-open-Eileen control.
      // (Unified Spec Art. 5.5 and Art. 13.7)
      canvas.focus && canvas.focus();
    };
    canvas.addEventListener('pointermove', pointerMoveHandler);
    canvas.addEventListener('pointerleave', pointerLeaveHandler);
    canvas.addEventListener('pointerdown', pointerDownHandler);
  }

  function detachInteractiveHandlers() {
    if (pointerMoveHandler)  canvas.removeEventListener('pointermove',  pointerMoveHandler);
    if (pointerLeaveHandler) canvas.removeEventListener('pointerleave', pointerLeaveHandler);
    if (pointerDownHandler)  canvas.removeEventListener('pointerdown',  pointerDownHandler);
    pointerMoveHandler = pointerLeaveHandler = pointerDownHandler = null;
  }

  // TODO[AMD-follow-up]: keyboard navigation deferred to v1.1.
  // Planned: Tab to focus the canvas, Arrow keys cycle primary nodes,
  // Enter calls setState({ activeCategory: focused }). v1 ships with
  // focus ring only (pointerdown above). Full WCAG 2.1 AA keyboard parity
  // tracked under AMD-058 follow-up.

  // ─── Reduced-motion handling ──────────────────────────────────────────
  function applyReducedMotion() {
    if (!respectRM) {
      state.reducedMotion = false;
      return;
    }
    state.reducedMotion = !!(mediaQuery && mediaQuery.matches);
  }

  function attachMediaQuery() {
    if (!respectRM || typeof window.matchMedia !== 'function') return;
    mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQueryHandler = () => {
      applyReducedMotion();
      if (state.reducedMotion) {
        staticFrame();
      } else if (!rafId && !state.pause) {
        lastFrameTime = 0;
        rafId = requestAnimationFrame(loop);
      }
    };
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', mediaQueryHandler);
    else if (mediaQuery.addListener) mediaQuery.addListener(mediaQueryHandler);
    applyReducedMotion();
  }

  function detachMediaQuery() {
    if (!mediaQuery || !mediaQueryHandler) return;
    if (mediaQuery.removeEventListener) mediaQuery.removeEventListener('change', mediaQueryHandler);
    else if (mediaQuery.removeListener) mediaQuery.removeListener(mediaQueryHandler);
    mediaQuery = null;
    mediaQueryHandler = null;
  }

  // ─── Observers ────────────────────────────────────────────────────────
  function attachIntersectionObserver() {
    if (!pauseOffscreen || typeof IntersectionObserver !== 'function') return;
    io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!rafId && !state.reducedMotion) {
            lastFrameTime = 0;
            rafId = requestAnimationFrame(loop);
          } else if (state.reducedMotion) {
            staticFrame();
          }
        } else {
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        }
      }
    }, { threshold: IO_THRESHOLD });
    io.observe(canvas);
  }

  function attachResizeObserver() {
    if (typeof ResizeObserver !== 'function') return;
    ro = new ResizeObserver(() => {
      applyCanvasSize();
      if (state.reducedMotion) staticFrame();
    });
    ro.observe(canvas);
  }

  // ─── Public handle ────────────────────────────────────────────────────
  let started = false;

  function start() {
    if (started) return;
    started = true;
    startTimestamp = performance.now();
    applyCanvasSize();
    attachMediaQuery();
    attachIntersectionObserver();
    attachResizeObserver();
    if (config.interactive && config.attachEvents) attachInteractiveHandlers();
    if (config.dataSource === 'eileen-landing-intel') {
      fetchIntel();
      refreshTimer = setInterval(fetchIntel, REFRESH_INTERVAL_MS);
    }
    if (state.reducedMotion) {
      staticFrame();
    } else {
      lastFrameTime = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    state.pause = true;
  }

  function destroy() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (io) { io.disconnect(); io = null; }
    if (ro) { ro.disconnect(); ro = null; }
    if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    detachInteractiveHandlers();
    detachMediaQuery();
    started = false;
  }

  function setState(partial) {
    if (!partial || typeof partial !== 'object') return;
    if ('hoverXY' in partial) state.hoverXY = partial.hoverXY;
    if ('activeCategory' in partial) state.activeCategory = partial.activeCategory;
    if ('pause' in partial) {
      state.pause = !!partial.pause;
      if (!state.pause && !rafId && started && !state.reducedMotion) {
        lastFrameTime = 0;
        rafId = requestAnimationFrame(loop);
      }
    }
    if (state.reducedMotion) staticFrame();
  }

  function getStats() {
    return {
      fps: stats.fps,
      avgDrawMs: Math.round(stats.avgDrawMs * 100) / 100,
      droppedFrames: stats.droppedFrames
    };
  }

  return { start, stop, destroy, setState, getStats };
}
