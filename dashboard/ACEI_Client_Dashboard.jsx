import { useState, useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════
// AILANE ACEI CLIENT DASHBOARD
// Constitutional Reference: ACEI Founding Constitution v1.0
// Adopted: 26 February 2026
// ════════════════════════════════════════════════════════════

// --- CONSTITUTIONAL DATA (Art. IX §9.5.1 Interpretation Bands) ---
const BANDS = [
  { label: "Low Exposure", min: 0, max: 20, color: "#16A085", bg: "rgba(22,160,133,0.08)" },
  { label: "Controlled Exposure", min: 21, max: 40, color: "#2E86C1", bg: "rgba(46,134,193,0.08)" },
  { label: "Elevated Exposure", min: 41, max: 60, color: "#D4920B", bg: "rgba(212,146,11,0.08)" },
  { label: "High Exposure", min: 61, max: 80, color: "#E67E22", bg: "rgba(230,126,34,0.08)" },
  { label: "Severe Exposure", min: 81, max: 100, color: "#C0392B", bg: "rgba(192,57,43,0.08)" },
];

// --- 12 ACEI CATEGORIES (Art. II) ---
const CATEGORIES = [
  { id: 1, name: "Unfair Dismissal & Wrongful Termination", short: "Dismissal", icon: "⚖️" },
  { id: 2, name: "Discrimination & Harassment", short: "Discrimination", icon: "🛡️", uncapped: true },
  { id: 3, name: "Wages, Working Time & Holiday Pay", short: "Wages & Time", icon: "⏱️" },
  { id: 4, name: "Whistleblowing & Protected Disclosures", short: "Whistleblowing", icon: "📢", uncapped: true },
  { id: 5, name: "Employment Status & Worker Classification", short: "Status", icon: "📋" },
  { id: 6, name: "Redundancy & Restructuring", short: "Redundancy", icon: "🏗️" },
  { id: 7, name: "Parental & Family Rights", short: "Parental", icon: "👶" },
  { id: 8, name: "Trade Union & Collective Rights", short: "Trade Union", icon: "🤝" },
  { id: 9, name: "Breach of Contract & Notice Disputes", short: "Contract", icon: "📄" },
  { id: 10, name: "Health & Safety Protections", short: "H&S", icon: "🔒" },
  { id: 11, name: "Data Protection & Employee Privacy", short: "Data", icon: "🔐" },
  { id: 12, name: "Business Transfers & Insolvency", short: "Transfers", icon: "🔄" },
];

// --- SIMULATED LIVE SCORING DATA (Art. III compliant) ---
const SCORE_DATA = {
  domainIndex: 22,
  weekDelta: -1,
  fourWeekDelta: +3,
  version: "v1.0",
  computedAt: "2026-03-01T08:00:00Z",
  jurisdiction: "GB",
  sector: "Technology",
  sectorMultiplier: 1.10,
  jurisdictionMultiplier: 1.00,
  dmr: 300,
  drt: 66.0,
  velocityTotal: 0.02,
  subIndices: { evi: 2.1, eii: 1.8, sci: 1.5 },
  lRaw: 1.86, // (0.4×2.1)+(0.3×1.8)+(0.3×1.5) = 0.84+0.54+0.45 = 1.83
  categories: [
    { id: 1, L: 2, I: 2, crs: 4, wcs: 4.40, velocity: 0.01 },
    { id: 2, L: 2, I: 3, crs: 6, wcs: 6.60, velocity: 0.03 },
    { id: 3, L: 3, I: 2, crs: 6, wcs: 6.60, velocity: 0.02 },
    { id: 4, L: 2, I: 4, crs: 8, wcs: 8.80, velocity: 0.04 },
    { id: 5, L: 2, I: 2, crs: 4, wcs: 4.40, velocity: 0.00 },
    { id: 6, L: 2, I: 2, crs: 4, wcs: 4.40, velocity: -0.01 },
    { id: 7, L: 2, I: 2, crs: 4, wcs: 4.40, velocity: 0.01 },
    { id: 8, L: 2, I: 3, crs: 6, wcs: 6.60, velocity: 0.05 },
    { id: 9, L: 2, I: 2, crs: 4, wcs: 4.40, velocity: 0.00 },
    { id: 10, L: 2, I: 2, crs: 4, wcs: 4.40, velocity: 0.01 },
    { id: 11, L: 2, I: 3, crs: 6, wcs: 6.60, velocity: 0.03 },
    { id: 12, L: 1, I: 2, crs: 2, wcs: 2.20, velocity: 0.00 },
  ]
};

// --- Historical weekly scores (simulated 12-week history) ---
const HISTORY = [
  { week: "W50", di: 18 }, { week: "W51", di: 19 }, { week: "W52", di: 20 },
  { week: "W01", di: 19 }, { week: "W02", di: 20 }, { week: "W03", di: 21 },
  { week: "W04", di: 20 }, { week: "W05", di: 21 }, { week: "W06", di: 22 },
  { week: "W07", di: 23 }, { week: "W08", di: 23 }, { week: "W09", di: 22 },
];

function getBand(score) {
  return BANDS.find(b => score >= b.min && score <= b.max) || BANDS[0];
}

function formatDelta(val) {
  if (val > 0) return `+${val}`;
  if (val < 0) return `${val}`;
  return "0";
}

// ─── ANIMATED GAUGE ─────────────────────────────────────────
function ScoreGauge({ score, size = 220 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const canvasRef = useRef(null);
  const band = getBand(score);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 90;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const animate = () => {
      frame++;
      const progress = ease(Math.min(frame / totalFrames, 1));
      setAnimatedScore(Math.round(progress * score));
      if (frame < totalFrames) requestAnimationFrame(animate);
    };
    const timeout = setTimeout(animate, 400);
    return () => clearTimeout(timeout);
  }, [score]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 20;
    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;
    const totalArc = endAngle - startAngle;

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.stroke();

    // Band segments
    BANDS.forEach((b) => {
      const segStart = startAngle + (b.min / 100) * totalArc;
      const segEnd = startAngle + ((b.max + 1) / 100) * totalArc;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, segStart, segEnd);
      ctx.strokeStyle = b.color + "33";
      ctx.lineWidth = 14;
      ctx.lineCap = "butt";
      ctx.stroke();
    });

    // Active arc
    const scoreAngle = startAngle + (animatedScore / 100) * totalArc;
    const gradient = ctx.createLinearGradient(0, size, size, 0);
    gradient.addColorStop(0, band.color + "88");
    gradient.addColorStop(1, band.color);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, scoreAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.stroke();

    // Glow
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, scoreAngle);
    ctx.strokeStyle = band.color + "44";
    ctx.lineWidth = 24;
    ctx.lineCap = "round";
    ctx.stroke();

    // Tick marks
    for (let i = 0; i <= 100; i += 10) {
      const angle = startAngle + (i / 100) * totalArc;
      const innerR = i % 20 === 0 ? radius - 22 : radius - 18;
      const outerR = radius - 10;
      ctx.beginPath();
      ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
      ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = i % 20 === 0 ? 2 : 1;
      ctx.stroke();
    }
  }, [animatedScore, size, band]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -45%)", textAlign: "center"
      }}>
        <div style={{ fontSize: 52, fontWeight: 700, color: band.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
          {animatedScore}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, marginTop: 4, textTransform: "uppercase" }}>
          Domain Index
        </div>
      </div>
      <div style={{
        position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
        background: band.color + "18", border: `1px solid ${band.color}44`,
        borderRadius: 4, padding: "3px 12px", whiteSpace: "nowrap"
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: band.color, letterSpacing: 0.8 }}>
          {band.label.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ─── MINI SPARKLINE ─────────────────────────────────────────
function Sparkline({ data, width = 160, height = 40 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const values = data.map(d => d.di);
    const min = Math.min(...values) - 2;
    const max = Math.max(...values) + 2;
    const stepX = width / (values.length - 1);

    // Fill
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / (max - min)) * (height - 8) - 4;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(46,134,193,0.15)");
    gradient.addColorStop(1, "rgba(46,134,193,0)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / (max - min)) * (height - 8) - 4;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#2E86C1";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // End dot
    const lastX = (values.length - 1) * stepX;
    const lastY = height - ((values[values.length - 1] - min) / (max - min)) * (height - 8) - 4;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#2E86C1";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(46,134,193,0.2)";
    ctx.fill();
  }, [data, width, height]);

  return <canvas ref={canvasRef} style={{ width, height }} />;
}

// ─── CATEGORY BAR ───────────────────────────────────────────
function CategoryBar({ cat, score, maxWcs }) {
  const [animated, setAnimated] = useState(0);
  const category = CATEGORIES.find(c => c.id === cat.id);
  const pct = (cat.wcs / maxWcs) * 100;
  const band = getBand(Math.min(100, (cat.wcs / 25) * 100));

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(pct), 200 + cat.id * 60);
    return () => clearTimeout(timeout);
  }, [pct, cat.id]);

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "28px 1fr 200px 60px 50px 50px",
      alignItems: "center", gap: 10, padding: "8px 12px",
      background: cat.id % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
      borderRadius: 4, fontSize: 12
    }}>
      <span style={{ fontSize: 15 }}>{category?.icon}</span>
      <div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500, fontSize: 12 }}>
          {category?.name}
          {category?.uncapped && (
            <span style={{
              marginLeft: 6, fontSize: 9, padding: "1px 5px", borderRadius: 3,
              background: "rgba(192,57,43,0.15)", color: "#E74C3C", fontWeight: 600
            }}>UNCAPPED</span>
          )}
        </div>
      </div>
      <div style={{ position: "relative", height: 10, background: "rgba(255,255,255,0.04)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${animated}%`, background: `linear-gradient(90deg, ${band.color}66, ${band.color})`,
          borderRadius: 5, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)"
        }} />
      </div>
      <div style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
        {cat.wcs.toFixed(2)}
      </div>
      <div style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>{cat.L}</span>
        <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 2px" }}>×</span>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>{cat.I}</span>
      </div>
      <div style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
        {cat.velocity > 0 ? (
          <span style={{ color: "#E67E22" }}>▲ {(cat.velocity * 100).toFixed(0)}%</span>
        ) : cat.velocity < 0 ? (
          <span style={{ color: "#16A085" }}>▼ {Math.abs(cat.velocity * 100).toFixed(0)}%</span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
        )}
      </div>
    </div>
  );
}

// ─── SUB-INDEX CARD ─────────────────────────────────────────
function SubIndexCard({ label, value, weight, desc, max = 5 }) {
  const pct = (value / max) * 100;
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8, padding: 16, flex: 1
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
        <span style={{
          fontSize: 9, padding: "2px 6px", borderRadius: 3,
          background: "rgba(46,134,193,0.1)", color: "#2E86C1", fontWeight: 600
        }}>w={weight}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#E0E0E0", marginBottom: 8 }}>
        {value.toFixed(1)}
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginLeft: 2 }}>/ {max}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2, marginBottom: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#2E86C1", borderRadius: 2, transition: "width 1s ease" }} />
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{desc}</div>
    </div>
  );
}

// ─── METRIC CARD ────────────────────────────────────────────
function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8, padding: "14px 16px", flex: 1, minWidth: 120
    }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: color || "#E0E0E0" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─── FORMULA DISPLAY ────────────────────────────────────────
function FormulaBlock() {
  const d = SCORE_DATA;
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8, padding: 16
    }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
        Article III — Computational Audit Trail
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 2.2 }}>
        <div>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>§3.2.1</span>{" "}
          L<sub>raw</sub> = (0.4 × <span style={{ color: "#2E86C1" }}>{d.subIndices.evi}</span>) + (0.3 × <span style={{ color: "#2E86C1" }}>{d.subIndices.eii}</span>) + (0.3 × <span style={{ color: "#2E86C1" }}>{d.subIndices.sci}</span>) = <span style={{ color: "#E0E0E0", fontWeight: 600 }}>{d.lRaw}</span>
        </div>
        <div>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>§3.7.1</span>{" "}
          DRT = Σ WCS = <span style={{ color: "#E0E0E0", fontWeight: 600 }}>{d.drt.toFixed(1)}</span>
        </div>
        <div>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>§3.7.2</span>{" "}
          DI = min(100, (<span style={{ color: "#2E86C1" }}>{d.drt.toFixed(1)}</span> / <span style={{ color: "#2E86C1" }}>{d.dmr}</span>) × 100) = <span style={{ color: "#E0E0E0", fontWeight: 600 }}>{d.domainIndex}</span>
        </div>
      </div>
    </div>
  );
}

// ─── BAND SCALE ─────────────────────────────────────────────
function BandScale({ score }) {
  return (
    <div style={{ padding: "0 12px" }}>
      <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
        {BANDS.map(b => (
          <div key={b.label} style={{
            flex: 1, background: b.color + "44",
            position: "relative"
          }}>
            {score >= b.min && score <= b.max && (
              <div style={{
                position: "absolute", top: -3, bottom: -3,
                left: `${((score - b.min) / (b.max - b.min + 1)) * 100}%`,
                width: 3, background: "#fff", borderRadius: 2, boxShadow: `0 0 8px ${b.color}`
              }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {BANDS.map(b => (
          <div key={b.label} style={{ flex: 1, fontSize: 8, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
            {b.label.split(" ")[0]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════
export default function ACEIDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const d = SCORE_DATA;
  const band = getBand(d.domainIndex);
  const maxWcs = Math.max(...d.categories.map(c => c.wcs));
  const computedDate = new Date(d.computedAt);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "categories", label: "12 Categories" },
    { id: "methodology", label: "Methodology" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0B1120",
      color: "#E0E0E0",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      {/* ─── TOP BAR ─── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(11,17,32,0.95)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, color: "#fff" }}>
            AILANE
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase" }}>
            Core Exposure Index
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            fontSize: 10, padding: "4px 10px", borderRadius: 4,
            background: "rgba(22,160,133,0.1)", border: "1px solid rgba(22,160,133,0.2)",
            color: "#16A085", fontWeight: 600, letterSpacing: 0.5
          }}>
            ● LIVE
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
            {d.version} • {computedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* ─── NAVIGATION TABS ─── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 28px",
        display: "flex", gap: 0
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "12px 20px", fontSize: 12, fontWeight: 500,
              color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.35)",
              borderBottom: activeTab === tab.id ? `2px solid ${accent}` : "2px solid transparent",
              transition: "all 0.2s"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── CONTENT ─── */}
      <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>

        {activeTab === "overview" && (
          <>
            {/* Score + Context Row */}
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, marginBottom: 24 }}>
              {/* Gauge */}
              <div style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center"
              }}>
                <ScoreGauge score={d.domainIndex} size={200} />
                <BandScale score={d.domainIndex} />
              </div>

              {/* Metrics Grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <MetricCard
                    label="Weekly Delta"
                    value={formatDelta(d.weekDelta)}
                    sub="Art. IX §9.2.1(b)"
                    color={d.weekDelta < 0 ? "#16A085" : d.weekDelta > 0 ? "#E67E22" : "rgba(255,255,255,0.5)"}
                  />
                  <MetricCard
                    label="4-Week Delta"
                    value={formatDelta(d.fourWeekDelta)}
                    sub="Art. IX §9.2.1(c)"
                    color={d.fourWeekDelta < 0 ? "#16A085" : d.fourWeekDelta > 0 ? "#E67E22" : "rgba(255,255,255,0.5)"}
                  />
                  <MetricCard label="Velocity" value={`${(d.velocityTotal * 100).toFixed(0)}%`} sub={`|v_total| ≤ 15% (Art. III §3.6.2)`} />
                  <MetricCard label="DRT / DMR" value={`${d.drt.toFixed(0)} / ${d.dmr}`} sub="Domain Raw Total vs Reference" />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <MetricCard label="Sector" value={d.sector} sub={`SM = ${d.sectorMultiplier} (Annex B)`} />
                  <MetricCard label="Jurisdiction" value={d.jurisdiction} sub={`JM = ${d.jurisdictionMultiplier} (Annex B)`} />
                  <MetricCard label="Categories" value="12" sub="Art. II (full spectrum coverage)" />
                </div>
                {/* Sparkline */}
                <div style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 16
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>12-Week Trend</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Art. IX §9.1.1 — Weekly publication cadence</div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <Sparkline data={HISTORY} width={280} height={40} />
                </div>
              </div>
            </div>

            {/* Sub-Indices (Art. III §3.2.1) */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                Likelihood Sub-Indices — Art. III §3.2
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <SubIndexCard label="EVI" value={d.subIndices.evi} weight="0.4" desc="Event Volume Index — Tribunal decision frequency vs 52-week baseline" />
                <SubIndexCard label="EII" value={d.subIndices.eii} weight="0.3" desc="Enforcement Intensity Index — 90-day rolling regulator activity (EHRC, HSE, ICO)" />
                <SubIndexCard label="SCI" value={d.subIndices.sci} weight="0.3" desc="Structural Change Index — Legislative & judicial framework transformation" />
              </div>
            </div>

            {/* Formula Audit */}
            <FormulaBlock />

            {/* Top Exposure Categories */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                Top Exposure Categories
              </div>
              <div style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8, padding: "8px 0", overflow: "hidden"
              }}>
                {/* Header */}
                <div style={{
                  display: "grid", gridTemplateColumns: "28px 1fr 200px 60px 50px 50px",
                  gap: 10, padding: "4px 12px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)"
                }}>
                  <span />
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase" }}>Category</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase" }}>WCS</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase", textAlign: "right" }}>Score</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase", textAlign: "center" }}>L × I</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase", textAlign: "right" }}>Vel.</span>
                </div>
                {[...d.categories].sort((a, b) => b.wcs - a.wcs).slice(0, 5).map(cat => (
                  <CategoryBar key={cat.id} cat={cat} maxWcs={maxWcs + 2} />
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "categories" && (
          <>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>
              All 12 Categories — Art. II Comprehensive Coverage
            </div>
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8, padding: "8px 0"
            }}>
              <div style={{
                display: "grid", gridTemplateColumns: "28px 1fr 200px 60px 50px 50px",
                gap: 10, padding: "4px 12px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)"
              }}>
                <span />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase" }}>Category</span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase" }}>Weighted Category Score</span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase", textAlign: "right" }}>WCS</span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase", textAlign: "center" }}>L × I</span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textTransform: "uppercase", textAlign: "right" }}>Vel.</span>
              </div>
              {d.categories.map(cat => (
                <CategoryBar key={cat.id} cat={cat} maxWcs={maxWcs + 2} />
              ))}
            </div>

            {/* Category Detail Cards */}
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {d.categories.map(cat => {
                const category = CATEGORIES.find(c => c.id === cat.id);
                const catBand = getBand(Math.min(100, (cat.crs / 25) * 100));
                return (
                  <div key={cat.id} style={{
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8, padding: 14, borderLeft: `3px solid ${catBand.color}44`
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 14, marginRight: 6 }}>{category?.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Cat {cat.id}</span>
                      </div>
                      {category?.uncapped && (
                        <span style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, background: "rgba(192,57,43,0.15)", color: "#E74C3C", fontWeight: 700 }}>
                          UNCAPPED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>{category?.name}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      <div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>L</div>
                        <div style={{ fontSize: 16, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{cat.L}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>I</div>
                        <div style={{ fontSize: 16, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{cat.I}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>CRS</div>
                        <div style={{ fontSize: 16, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: catBand.color }}>{cat.crs}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "methodology" && (
          <div style={{ maxWidth: 800 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 20 }}>
              Constitutional Methodology Reference
            </div>

            {[
              { title: "Scoring Architecture (Art. III)", content: "The ACEI produces a deterministic Domain Index (DI) on a 0–100 scale. Identical inputs produce identical outputs (§1.3.1). Stochastic elements are prohibited in live scoring (§1.3.2). All scoring functions are reproducible within 24 hours upon governance request (§1.3.4)." },
              { title: "Likelihood Derivation (Art. III §3.2)", content: "L_raw = (0.4 × EVI) + (0.3 × EII) + (0.3 × SCI). L is rounded to integer ∈ {1,2,3,4,5}. Week-over-week increases exceeding one level are prohibited unless SCI ≥ 4. Downward adjustments require two consecutive periods of declining volume and enforcement." },
              { title: "Impact Derivation (Art. III §3.3)", content: "I_raw = BFI + OM + RM. I = min(5, round(I_raw)). Base Financial Impact is category-specific with compensation bands defined in Annex A. Operational Modifier (0.0–2.0) and Reputational Modifier (0.0–2.0) provide additional signal." },
              { title: "Category Raw Score (Art. III §3.4)", content: "CRS = L × I. Range: [1, 25]. Scores exceeding 20 trigger automatic governance review. The twelve categories cover the full spectrum of UK employment tribunal liability from Unfair Dismissal through Business Transfers & Insolvency." },
              { title: "Multiplier Layer (Art. III §3.5)", content: "WCS_pre = CRS × SM × JM. Sector Multipliers range 0.80–1.30 (e.g., Financial Services 1.25, Public Sector 1.30). Jurisdiction Multipliers range 0.90–1.40 (e.g., London 1.40, Scotland 1.20). Modification requires formal constitutional amendment." },
              { title: "Velocity Bounds (Art. III §3.6)", content: "|v_total| ≤ 0.15. v_total = v_category + v_domain. Category velocity measures short-term enforcement momentum. Domain velocity adds 0.05 overlay when ≥4 categories show positive momentum ≥ 0.05. Velocity requires documented evidence." },
              { title: "Aggregation (Art. III §3.7)", content: "DRT = Σ WCS across all twelve categories. DI = min(100, (DRT/DMR) × 100). DMR = 300 (95th percentile simulated extreme). DI is rounded to nearest integer and capped at 100." },
              { title: "Bounded Volatility (Art. I §1.4)", content: "Single-event movement: ≤8 index points absent Structural validation. Weekly movement: ≤25 index points under any circumstance. Shock caps, velocity bounds, and structural regime thresholds prevent uncontrolled escalation." },
              { title: "Interpretation Bands (Art. IX §9.5)", content: "0–20: Low Exposure. 21–40: Controlled Exposure. 41–60: Elevated Exposure. 61–80: High Exposure. 81–100: Severe Exposure. Band interpretation is descriptive only and does not constitute risk rating or investment advice." },
              { title: "Clinical Neutrality (Art. I §1.5)", content: "The ACEI describes exposure magnitude only. It does not forecast litigation frequency, project financial loss, or opine on legal merits. Language remains clinical, descriptive, and analytically neutral. Prohibited terms: crisis, collapse, explosion, emergency, panic." },
            ].map((section, i) => (
              <div key={i} style={{
                borderLeft: `2px solid ${i === 0 ? accent : "rgba(255,255,255,0.06)"}`,
                padding: "12px 20px", marginBottom: 12,
                background: i === 0 ? "rgba(46,134,193,0.04)" : "transparent",
                borderRadius: "0 6px 6px 0"
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 6 }}>{section.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{section.content}</div>
              </div>
            ))}

            <div style={{
              marginTop: 24, padding: 16, background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8
            }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Governance</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>
                Governed by the Ailane Index Committee (AIC) under ACEI Founding Constitution v1.0, adopted 26 February 2026.
                Published by AI Lane Limited (Company No. 17035654) trading as Ailane.
                The ACEI operates within the Ailane Index Triad alongside the RRI and CCI under the Separation Doctrine (Art. XII-A §12A.3).
                Constitutional Supremacy: No commercial agreement may override this Constitution (Art. I §1.2).
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── FOOTER ─── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "14px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 40
      }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
          ACEI Founding Constitution v1.0 • Adopted 26 February 2026 • AI Lane Limited (Company No. 17035654)
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
          This index does not constitute legal advice, risk rating, or compliance certification (Art. I §1.5)
        </div>
      </div>
    </div>
  );
}
