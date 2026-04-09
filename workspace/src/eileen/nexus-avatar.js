/**
 * NEXUS AVATAR — AILANE-SPEC-EILEEN-001 §3
 * HTML5 Canvas neural constellation.
 * Operational tier: cyan #38bdf8 (inner ring) + green #22c55e (outer ring).
 * 3 states: dormant (10 nodes), active (13 nodes), processing (14 nodes).
 * 2 orbital rings. DPR-aware. requestAnimationFrame loop.
 */

function createNexusAvatar(container, size, active, processing) {
  var dpr = window.devicePixelRatio || 1;
  var canvas = document.createElement('canvas');
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.style.borderRadius = '50%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var state = { active: active, processing: processing };
  var t = 0;
  var rafId = null;

  function getNodeCount() {
    if (state.processing) return 14;
    if (state.active) return 13;
    return 10;
  }

  function getSpeed() {
    if (state.processing) return 0.035;
    if (state.active) return 0.02;
    return 0.01;
  }

  function getBreathAmplitude() {
    if (state.processing) return 0.15;
    if (state.active) return 0.08;
    return 0.03;
  }

  // Generate node positions
  function generateNodes(count) {
    var nodes = [];
    var innerCount = 5;
    for (var i = 0; i < count; i++) {
      var isInner = i < innerCount;
      var ringRadius = isInner ? 0.25 : 0.62;
      var totalInRing = isInner ? innerCount : (count - innerCount);
      var indexInRing = isInner ? i : (i - innerCount);
      var angleOffset = isInner ? 0.3 : 0.1;
      var baseAngle = (indexInRing / totalInRing) * Math.PI * 2 + angleOffset;
      nodes.push({
        baseAngle: baseAngle,
        ringRadius: ringRadius,
        orbitalSpeed: 0.2 + Math.random() * 0.3,
        phaseOffset: Math.random() * Math.PI * 2,
        nodeRadius: (isInner ? 2.0 : 1.6) * dpr,
        isInner: isInner
      });
    }
    return nodes;
  }

  var nodes = generateNodes(getNodeCount());

  function getNodePos(node, time) {
    var w = canvas.width;
    var h = canvas.height;
    var cx = w / 2;
    var cy = h / 2;
    var r = node.ringRadius * (w / 2);
    var angle = node.baseAngle + time * node.orbitalSpeed + node.phaseOffset;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r
    };
  }

  function draw() {
    var w = canvas.width;
    var h = canvas.height;
    var cx = w / 2;
    var cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    // Adjust node count if state changed
    var targetCount = getNodeCount();
    if (nodes.length !== targetCount) {
      nodes = generateNodes(targetCount);
    }

    // Core glow — radial gradient with breathing
    var breathMult = 1.0 + Math.sin(t * 0.8) * getBreathAmplitude();
    var coreRadius = w * 0.18 * breathMult;
    var coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
    coreGrad.addColorStop(0, 'rgba(56,189,248,0.25)');
    coreGrad.addColorStop(0.5, 'rgba(34,197,94,0.12)');
    coreGrad.addColorStop(1, 'rgba(34,197,94,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    // Compute node positions
    var positions = [];
    for (var i = 0; i < nodes.length; i++) {
      positions.push(getNodePos(nodes[i], t));
    }

    // Core connections — faint lines from centre to each node
    for (var ci = 0; ci < positions.length; ci++) {
      var cp = positions[ci];
      var dist = Math.sqrt((cp.x - cx) * (cp.x - cx) + (cp.y - cy) * (cp.y - cy));
      var maxDist = w * 0.5;
      var coreAlpha = Math.max(0, 0.08 * (1 - dist / maxDist));
      ctx.strokeStyle = 'rgba(56,189,248,' + coreAlpha + ')';
      ctx.lineWidth = 0.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cp.x, cp.y);
      ctx.stroke();
    }

    // Connections between nodes within distance threshold
    var connDist = w * 0.46;
    for (var ai = 0; ai < positions.length; ai++) {
      for (var bi = ai + 1; bi < positions.length; bi++) {
        var pa = positions[ai];
        var pb = positions[bi];
        var dx = pa.x - pb.x;
        var dy = pa.y - pb.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < connDist) {
          var pulse = (Math.sin(t * 2 + ai * 0.5) + 1) / 2;
          var connColor = pulse > 0.7
            ? 'rgba(34,197,94,' + (0.3 * (1 - d / connDist)) + ')'
            : 'rgba(56,189,248,' + (0.25 * (1 - d / connDist)) + ')';
          ctx.strokeStyle = connColor;
          ctx.lineWidth = 0.8 * dpr;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();

          // Processing mode: data flow effect
          if (state.processing) {
            var flowPos = (Math.sin(t * 3 + ai) + 1) / 2;
            var fx = pa.x + (pb.x - pa.x) * flowPos;
            var fy = pa.y + (pb.y - pa.y) * flowPos;
            ctx.fillStyle = 'rgba(56,189,248,0.6)';
            ctx.beginPath();
            ctx.arc(fx, fy, 1.2 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Draw nodes
    for (var ni = 0; ni < positions.length; ni++) {
      var np = positions[ni];
      var isInner = nodes[ni].isInner;
      var nr = nodes[ni].nodeRadius;

      // Glow
      var glowR = nr * 3;
      var glowGrad = ctx.createRadialGradient(np.x, np.y, 0, np.x, np.y, glowR);
      if (isInner) {
        glowGrad.addColorStop(0, 'rgba(56,189,248,0.4)');
        glowGrad.addColorStop(1, 'rgba(56,189,248,0)');
      } else {
        glowGrad.addColorStop(0, 'rgba(34,197,94,0.4)');
        glowGrad.addColorStop(1, 'rgba(34,197,94,0)');
      }
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(np.x, np.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Core dot
      ctx.fillStyle = isInner ? 'rgba(56,189,248,0.9)' : 'rgba(34,197,94,0.9)';
      ctx.beginPath();
      ctx.arc(np.x, np.y, nr, 0, Math.PI * 2);
      ctx.fill();
    }

    t += getSpeed();
    rafId = requestAnimationFrame(draw);
  }

  rafId = requestAnimationFrame(draw);

  var handle = {
    canvas: canvas,
    update: function(newActive, newProcessing) {
      state.active = newActive;
      state.processing = newProcessing;
    },
    destroy: function() {
      if (rafId) cancelAnimationFrame(rafId);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  };

  return handle;
}

function destroyNexusAvatar(handle) {
  if (handle) handle.destroy();
}

window.__NexusAvatar = { create: createNexusAvatar, destroy: destroyNexusAvatar };
