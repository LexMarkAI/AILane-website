import { useState, useEffect, useRef, useCallback } from "react";
// ════════════════════════════════════════════════════════════════════
// AILANE CEO COMMAND CENTRE
// Internal Operational Dashboard — Not Client-Facing
// Constitutional References: ACEI v1.0, RRI v1.0, CCI v1.0
// ════════════════════════════════════════════════════════════════════
const accent = "#2E75B6";
// --- ANNEX B: SECTOR MULTIPLIERS (ACEI Art. III §3.5) ---
const SECTORS = [
  { id: "professional", name: "Professional Services", sm: 1.20, scb: "A" },
  { id: "financial", name: "Financial Services", sm: 1.25, scb: "A" },
  { id: "healthcare", name: "Healthcare", sm: 1.15, scb: "A" },
  { id: "technology", name: "Technology", sm: 1.10, scb: "A" },
  { id: "retail", name: "Retail & Hospitality", sm: 1.05, scb: "B" },
  { id: "manufacturing", name: "Manufacturing", sm: 1.00, scb: "B" },
  { id: "construction", name: "Construction", sm: 0.95, scb: "B" },
  { id: "education", name: "Education", sm: 1.10, scb: "A" },
  { id: "public", name: "Public Sector", sm: 1.30, scb: "A" },
  { id: "charity", name: "Charities & Non-Profits", sm: 0.90, scb: "C" },
  { id: "transport", name: "Transport & Logistics", sm: 1.05, scb: "B" },
  { id: "media", name: "Media & Entertainment", sm: 1.15, scb: "B" },
];
// --- ANNEX B: JURISDICTION MULTIPLIERS (ACEI Art. III §3.5) ---
const JURISDICTIONS = [
  { id: "london", name: "London", jm: 1.40 },
  { id: "se", name: "South East England", jm: 1.25 },
  { id: "sw", name: "South West England", jm: 1.00 },
  { id: "east", name: "East of England", jm: 1.05 },
  { id: "em", name: "East Midlands", jm: 0.95 },
  { id: "wm", name: "West Midlands", jm: 1.05 },
  { id: "yh", name: "Yorkshire & Humber", jm: 1.00 },
  { id: "nw", name: "North West England", jm: 1.10 },
  { id: "ne", name: "North East England", jm: 0.95 },
  { id: "wales", name: "Wales", jm: 1.00 },
  { id: "scotland", name: "Scotland", jm: 1.20 },
  { id: "ni", name: "Northern Ireland", jm: 1.15 },
];
// --- 12 ACEI CATEGORIES ---
const CATEGORIES = [
  { id: 1, name: "Unfair Dismissal & Wrongful Termination", short: "Dismissal", baseL: 2, baseI: 2 },
  { id: 2, name: "Discrimination & Harassment", short: "Discrimination", baseL: 2, baseI: 3, uncapped: true },
  { id: 3, name: "Wages, Working Time & Holiday Pay", short: "Wages", baseL: 3, baseI: 2 },
  { id: 4, name: "Whistleblowing & Protected Disclosures", short: "Whistleblowing", baseL: 2, baseI: 4, uncapped: true },
  { id: 5, name: "Employment Status & Worker Classification", short: "Status", baseL: 2, baseI: 2 },
  { id: 6, name: "Redundancy & Restructuring", short: "Redundancy", baseL: 2, baseI: 2 },
  { id: 7, name: "Parental & Family Rights", short: "Parental", baseL: 2, baseI: 2 },
  { id: 8, name: "Trade Union & Collective Rights", short: "Trade Union", baseL: 2, baseI: 3 },
  { id: 9, name: "Breach of Contract & Notice Disputes", short: "Contract", baseL: 2, baseI: 2 },
  { id: 10, name: "Health & Safety Protections", short: "H&S", baseL: 2, baseI: 2 },
  { id: 11, name: "Data Protection & Employee Privacy", short: "Data", baseL: 2, baseI: 3 },
  { id: 12, name: "Business Transfers & Insolvency", short: "Transfers", baseL: 1, baseI: 2 },
];
const BANDS = [
  { label: "Low", min: 0, max: 20, color: "#16A085" },
  { label: "Controlled", min: 21, max: 40, color: "#2E86C1" },
  { label: "Elevated", min: 41, max: 60, color: "#D4920B" },
  { label: "High", min: 61, max: 80, color: "#E67E22" },
  { label: "Severe", min: 81, max: 100, color: "#C0392B" },
];
const CCI_BANDS = [
  { label: "Strong", min: 81, max: 100, color: "#16A085" },
  { label: "Adequate", min: 61, max: 80, color: "#2E86C1" },
  { label: "Concerning", min: 41, max: 60, color: "#D4920B" },
  { label: "Weak", min: 21, max: 40, color: "#E67E22" },
  { label: "Critical", min: 0, max: 20, color: "#C0392B" },
];
function getBand(score) {
  return BANDS.find(b => score >= b.min && score <= b.max) || BANDS[0];
}
function getCCIBand(score) {
  return CCI_BANDS.find(b => score >= b.min && score <= b.max) || CCI_BANDS[4];
}
// --- ONBOARDING FIELDS mapped to constitutional requirements ---
const ONBOARDING_SECTIONS = [
  {
    id: "company",
    title: "Company Profile",
    subtitle: "Core identification — feeds all three indices",
    icon: "\u{1F3E2}",
    fields: [
      { id: "companyName", label: "Registered Company Name", type: "text", required: true, feeds: "All indices", constitutional: "ACEI Preamble \u00A71.1" },
      { id: "companiesHouse", label: "Companies House Number", type: "text", required: true, feeds: "CCI cross-reference", constitutional: "CCI Art. V \u00A75.1.1", crossRef: true, note: "Auto-validates via Companies House API; cross-references headcount filings" },
      { id: "tradingName", label: "Trading Name(s)", type: "text", required: false, feeds: "CCI tribunal matching", constitutional: "CCI Art. V", crossRef: true, note: "Used to match against 80,124 employer names in tribunal database" },
      { id: "sector", label: "Primary Business Sector", type: "select", options: SECTORS.map(s => s.name), required: true, feeds: "ACEI SM, CCI SCB", constitutional: "ACEI Annex B \u00A7B1" },
      { id: "headcount", label: "Current UK Employee Headcount", type: "number", required: true, feeds: "CCI normalisation", constitutional: "CCI Art. III \u00A73.2.1", note: "Per 100 employees normalisation for TCF, AOR, PSI, REE" },
      { id: "jurisdiction", label: "Primary Jurisdiction", type: "select", options: JURISDICTIONS.map(j => j.name), required: true, feeds: "ACEI JM", constitutional: "ACEI Annex B \u00A7B2" },
      { id: "multiJurisdiction", label: "Multi-jurisdiction Operations?", type: "toggle", required: true, feeds: "ACEI Art. VIII", constitutional: "ACEI Art. VIII \u00A78.2" },
    ]
  },
  {
    id: "claims",
    title: "Claims History (36-Month Window)",
    subtitle: "CCI Components: TCF (w=0.25), AOR (w=0.20), PSI (w=0.20)",
    icon: "\u2696\uFE0F",
    fields: [
      { id: "claimsY1", label: "ET Claims Filed \u2014 Last 12 months", type: "number", required: true, feeds: "CCI TCF", constitutional: "CCI Art. III \u00A73.2 (Recency Weight: 0.45)", crossRef: true, note: "Cross-referenced against published tribunal decisions" },
      { id: "claimsY2", label: "ET Claims Filed \u2014 13-24 months ago", type: "number", required: true, feeds: "CCI TCF", constitutional: "CCI Art. III \u00A73.2 (Recency Weight: 0.35)", crossRef: true },
      { id: "claimsY3", label: "ET Claims Filed \u2014 25-36 months ago", type: "number", required: true, feeds: "CCI TCF", constitutional: "CCI Art. III \u00A73.2 (Recency Weight: 0.20)", crossRef: true },
      { id: "adverseY1", label: "Adverse Outcomes \u2014 Last 12 months", type: "number", required: true, feeds: "CCI AOR", constitutional: "CCI Art. III \u00A73.3", note: "Judgment against, settlement with payment, or default judgment" },
      { id: "adverseY2", label: "Adverse Outcomes \u2014 13-24 months", type: "number", required: true, feeds: "CCI AOR", constitutional: "CCI Art. III \u00A73.3" },
      { id: "adverseY3", label: "Adverse Outcomes \u2014 25-36 months", type: "number", required: true, feeds: "CCI AOR", constitutional: "CCI Art. III \u00A73.3" },
      { id: "payoutsY1", label: "Total Settlement/Award Expenditure \u2014 Year 1 (\u00A3)", type: "number", required: true, feeds: "CCI PSI", constitutional: "CCI Art. III \u00A73.4", note: "Director/CFO attestation required. Individual detail not required." },
      { id: "payoutsY2", label: "Total Settlement/Award Expenditure \u2014 Year 2 (\u00A3)", type: "number", required: true, feeds: "CCI PSI", constitutional: "CCI Art. III \u00A73.4" },
      { id: "payoutsY3", label: "Total Settlement/Award Expenditure \u2014 Year 3 (\u00A3)", type: "number", required: true, feeds: "CCI PSI", constitutional: "CCI Art. III \u00A73.4" },
      { id: "claimCategories", label: "Which categories have claims fallen into?", type: "multiselect", options: CATEGORIES.map(c => `Cat ${c.id}: ${c.short}`), required: false, feeds: "CCI RAP", constitutional: "CCI Art. III \u00A73.7", note: "Repeat Allegation Pattern detection requires category-level data" },
    ]
  },
  {
    id: "enforcement",
    title: "Regulatory Enforcement History",
    subtitle: "CCI Component: REE (w=0.15) \u2014 No credibility weighting applied",
    icon: "\u{1F50D}",
    fields: [
      { id: "reeEvents", label: "Formal enforcement actions in past 36 months?", type: "toggle", required: true, feeds: "CCI REE", constitutional: "CCI Art. III \u00A73.5, Art. IV \u00A74.4.1" },
      { id: "reeCount", label: "Number of enforcement events", type: "number", required: false, feeds: "CCI REE", constitutional: "CCI Art. III \u00A73.5", crossRef: true, note: "Cross-referenced against HSE, ICO, EHRC, FCA/PRA enforcement registers" },
      { id: "reeSeverity", label: "Most severe enforcement action", type: "select", options: ["Improvement notice", "Prohibition notice", "Penalty notice", "Licence warning", "Formal reprimand", "Published enforcement"], required: false, feeds: "CCI REE", constitutional: "CCI Art. II \u00A72.5" },
      { id: "acasNotifications", label: "ACAS Early Conciliation notifications received (36 months)", type: "number", required: false, feeds: "CCI TCF enrichment", constitutional: "CCI Art. V \u00A75.3.1", note: "Captures claims not reaching tribunal \u2014 addresses the public data undercount" },
    ]
  },
  {
    id: "governance",
    title: "Governance & Grievance Handling",
    subtitle: "CCI Component: GR (w=0.10) \u2014 Weight never redistributed",
    icon: "\u{1F4CB}",
    fields: [
      { id: "grievanceProcess", label: "Formal written grievance procedure in place?", type: "toggle", required: true, feeds: "CCI GR", constitutional: "CCI Art. III \u00A73.6" },
      { id: "responseTimeliness", label: "Grievance response timeliness (%)", type: "number", required: false, feeds: "CCI GR", constitutional: "CCI Art. III \u00A73.6.3", note: "Mean: timeliness + investigation completion + escalation compliance" },
      { id: "investigationCompletion", label: "Investigation completion rate (%)", type: "number", required: false, feeds: "CCI GR", constitutional: "CCI Art. III \u00A73.6.3" },
      { id: "escalationCompliance", label: "Escalation compliance rate (%)", type: "number", required: false, feeds: "CCI GR", constitutional: "CCI Art. III \u00A73.6.3" },
      { id: "hrStructure", label: "Dedicated HR function?", type: "select", options: ["In-house HR team", "HR manager/officer", "Outsourced HR", "No dedicated HR"], required: true, feeds: "RRI Pillar 5 (GO)", constitutional: "RRI Art. V \u00A75.5" },
      { id: "boardOversight", label: "Board-level employment compliance oversight?", type: "toggle", required: false, feeds: "RRI Pillar 5 (GO)", constitutional: "RRI Art. V \u00A75.5" },
    ]
  },
  {
    id: "readiness",
    title: "Current Compliance Posture",
    subtitle: "Feeds RRI five-pillar framework assessment (future activation)",
    icon: "\u{1F6E1}\uFE0F",
    fields: [
      { id: "policyReview", label: "When were employment policies last reviewed?", type: "select", options: ["Within 6 months", "6-12 months ago", "1-2 years ago", "Over 2 years ago", "Never formally reviewed"], required: true, feeds: "RRI Pillar 1 (PA)", constitutional: "RRI Art. V \u00A75.1" },
      { id: "contractsCompliant", label: "Are employment contracts up to date with current legislation?", type: "select", options: ["Fully compliant", "Mostly compliant", "Needs updating", "Unsure"], required: true, feeds: "RRI Pillar 2 (CC)", constitutional: "RRI Art. V \u00A75.2" },
      { id: "trainingFrequency", label: "Employment law training frequency for managers", type: "select", options: ["Quarterly or more", "Biannually", "Annually", "Ad hoc", "None"], required: true, feeds: "RRI Pillar 3 (TD)", constitutional: "RRI Art. V \u00A75.3" },
      { id: "systemsProcess", label: "HR system/process maturity", type: "select", options: ["Fully integrated HRIS", "Basic HR software", "Spreadsheet-based", "Paper-based/informal"], required: true, feeds: "RRI Pillar 4 (SPA)", constitutional: "RRI Art. V \u00A75.4" },
      { id: "recentChanges", label: "Aware of upcoming employment law changes?", type: "select", options: ["Fully aware and preparing", "Somewhat aware", "Vaguely aware", "Not aware"], required: true, feeds: "RRI overall readiness", constitutional: "RRI Art. II \u00A72.3", note: "Indicates readiness posture before formal RCE scoring" },
      { id: "insuranceEPLI", label: "Do you hold EPLI insurance?", type: "toggle", required: false, feeds: "Commercial intelligence", note: "Insurance integration pathway \u2014 underwriting data opportunity" },
    ]
  },
];
// --- SIMULATED CROSS-REFERENCE DATA ---
const CROSS_REF_EXAMPLES = [
  { company: "Acme Solutions Ltd", reported: 1, found: 3, discrepancy: true, categories: ["Cat 1: Dismissal", "Cat 2: Discrimination", "Cat 1: Dismissal"] },
  { company: "Sterling Healthcare", reported: 4, found: 4, discrepancy: false, categories: ["Cat 2: Discrimination", "Cat 7: Parental", "Cat 3: Wages", "Cat 1: Dismissal"] },
  { company: "Nexus Financial Group", reported: 0, found: 2, discrepancy: true, categories: ["Cat 4: Whistleblowing", "Cat 11: Data"] },
  { company: "Brightside Education Trust", reported: 2, found: 2, discrepancy: false, categories: ["Cat 1: Dismissal", "Cat 3: Wages"] },
];
// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════
function MiniGauge({ score, size = 80 }) {
  const band = getBand(score);
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2, r = size / 2 - 8;
    const start = 0.75 * Math.PI, end = 2.25 * Math.PI, total = end - start;
    ctx.beginPath(); ctx.arc(cx, cy, r, start, end);
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.stroke();
    const scoreAngle = start + (score / 100) * total;
    ctx.beginPath(); ctx.arc(cx, cy, r, start, scoreAngle);
    ctx.strokeStyle = band.color; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.stroke();
  }, [score, size]);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: band.color, fontFamily: "'Courier New', monospace" }}>{score}</div>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
// MAIN CEO DASHBOARD
// ═══════════════════════════════════════════════════════════════
export default function CEODashboard({ onLogout }) {
  const [activeView, setActiveView] = useState("simulator");
  const [sector, setSector] = useState("technology");
  const [jurisdiction, setJurisdiction] = useState("wales");
  const [headcount, setHeadcount] = useState(150);
  const [expandedSection, setExpandedSection] = useState("company");
  const [onboardingView, setOnboardingView] = useState("design"); // design | preview | crossref
  const selectedSector = SECTORS.find(s => s.id === sector);
  const selectedJurisdiction = JURISDICTIONS.find(j => j.id === jurisdiction);
  const sm = selectedSector?.sm || 1.0;
  const jm = selectedJurisdiction?.jm || 1.0;
  // Art. III compliant ACEI calculation
  const computeACEI = useCallback(() => {
    const cats = CATEGORIES.map(c => {
      const crs = c.baseL * c.baseI;
      const wcs = crs * sm * jm;
      return { ...c, crs, wcs };
    });
    const drt = cats.reduce((sum, c) => sum + c.wcs, 0);
    const di = Math.min(100, Math.round((drt / 300) * 100));
    return { cats, drt, di, sm, jm };
  }, [sm, jm]);
  const acei = computeACEI();
  // Simulated CCI based on headcount
  const cw = Math.min(1, 3 / (3 + 5)); // K=5, assume 3 claims
  const baseCCI = 69;
  const sizeFactor = headcount < 100 ? 0.95 : headcount < 500 ? 1.0 : 1.03;
  const simCCI = Math.round(baseCCI * sizeFactor);
  const views = [
    { id: "simulator", label: "ACEI Simulator", icon: "\u26A1" },
    { id: "onboarding", label: "Onboarding Architecture", icon: "\u{1F4DD}" },
    { id: "intelligence", label: "Client Intelligence", icon: "\u{1F50D}" },
    { id: "platform", label: "Platform Status", icon: "\u{1F4CA}" },
  ];
  const selectStyle = {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6, padding: "8px 12px", color: "#E0E0E0", fontSize: 13,
    fontFamily: "-apple-system, sans-serif", width: "100%", outline: "none",
    appearance: "none", cursor: "pointer"
  };
  return (
    <div style={{ minHeight: "100vh", background: "#080E1A", color: "#E0E0E0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        select option { background: #0B1120; color: #E0E0E0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
      `}</style>
      {/* ─── HEADER ─── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(8,14,26,0.95)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 2, color: "#fff" }}>AILANE</div>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
          <a href="/dashboard/" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textDecoration: "none", letterSpacing: 0.5, transition: "color 0.2s" }}>Dashboard</a>
          <a href="/AiLaneCEO/" style={{ fontSize: 11, color: "#fff", textDecoration: "none", letterSpacing: 0.5, borderBottom: `1px solid ${accent}`, paddingBottom: 1 }}>CEO Command Centre</a>
          <a href="/knowledge-library/" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textDecoration: "none", letterSpacing: 0.5, transition: "color 0.2s" }}>Knowledge Library</a>
          <a href="/ticker/" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textDecoration: "none", letterSpacing: 0.5, transition: "color 0.2s" }}>Ticker</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: "rgba(192,57,43,0.15)", color: "#E74C3C", fontWeight: 600, letterSpacing: 0.5 }}>INTERNAL ONLY</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'Courier New', monospace" }}>v1.0 \u2022 01 Mar 2026</span>
          {onLogout && (
            <button onClick={onLogout} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4, padding: "4px 12px", fontSize: 10, color: "rgba(255,255,255,0.4)",
              cursor: "pointer", fontWeight: 500, marginLeft: 6, transition: "all 0.2s"
            }}>Sign Out</button>
          )}
        </div>
      </div>
      {/* ─── NAV ─── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "0 24px", display: "flex", gap: 0, overflowX: "auto" }}>
        {views.map(v => (
          <button key={v.id} onClick={() => setActiveView(v.id)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px 18px",
            fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
            color: activeView === v.id ? "#fff" : "rgba(255,255,255,0.3)",
            borderBottom: activeView === v.id ? `2px solid ${accent}` : "2px solid transparent",
            transition: "all 0.2s"
          }}>
            <span style={{ marginRight: 6 }}>{v.icon}</span>{v.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "20px 24px", maxWidth: 1300, margin: "0 auto" }}>
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ACEI PARAMETER SIMULATOR                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeView === "simulator" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
              {/* Controls Panel */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Parameter Controls</div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>Sector (SM = {sm})</label>
                  <select value={sector} onChange={e => setSector(e.target.value)} style={selectStyle}>
                    {SECTORS.map(s => <option key={s.id} value={s.id}>{s.name} — SM {s.sm}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>Jurisdiction (JM = {jm})</label>
                  <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} style={selectStyle}>
                    {JURISDICTIONS.map(j => <option key={j.id} value={j.id}>{j.name} — JM {j.jm}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>Headcount: {headcount}</label>
                  <input type="range" min={25} max={2000} step={25} value={headcount} onChange={e => setHeadcount(+e.target.value)}
                    style={{ width: "100%", accentColor: accent }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
                    <span>25</span><span>500</span><span>1,000</span><span>2,000</span>
                  </div>
                </div>
                {/* Pricing Tier Indicator */}
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: 12, marginTop: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Pricing Tier</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>
                    {headcount <= 100 ? "Operational Readiness \u2014 \u00A3199/mo" : headcount <= 2000 ? "Governance \u2014 \u00A3799/mo" : "Institutional \u2014 Custom"}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                    {headcount <= 100 ? "ACEI only" : headcount <= 2000 ? "Full Index Triad" : "API + white-label"}
                  </div>
                </div>
                {/* Multiplier Impact */}
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: 12, marginTop: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Multiplier Impact</div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 2 }}>
                    <div>SM \u00D7 JM = <span style={{ color: "#fff", fontWeight: 600 }}>{(sm * jm).toFixed(3)}</span></div>
                    <div>Combined effect: <span style={{ color: sm * jm > 1.3 ? "#E67E22" : sm * jm > 1.0 ? "#D4920B" : "#16A085", fontWeight: 600 }}>
                      {sm * jm > 1.0 ? `+${((sm * jm - 1) * 100).toFixed(0)}% amplification` : `${((1 - sm * jm) * 100).toFixed(0)}% attenuation`}
                    </span></div>
                    <div>SCB Tier: <span style={{ color: "#fff" }}>{selectedSector?.scb}</span></div>
                    <div>CW (K=5, N=3): <span style={{ color: "#fff" }}>{cw.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
              {/* Results Panel */}
              <div>
                {/* Score Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>ACEI Domain Index</div>
                    <MiniGauge score={acei.di} />
                    <div style={{ fontSize: 11, color: getBand(acei.di).color, fontWeight: 600, marginTop: 4 }}>{getBand(acei.di).label} Exposure</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>DRT: {acei.drt.toFixed(1)} / DMR: 300</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Simulated CCI</div>
                    <MiniGauge score={simCCI} />
                    <div style={{ fontSize: 11, color: getCCIBand(simCCI).color, fontWeight: 600, marginTop: 4 }}>{getCCIBand(simCCI).label} Conduct</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>CW: {cw.toFixed(2)} | Mode: Full</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Composite View</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 20, marginBottom: 20, padding: "8px", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 4 }}>
                      Composite score prohibited under Art. XII-A \u00A712A.3.3
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>Requires Major Amendment to all three constitutions</div>
                  </div>
                </div>
                {/* Category Breakdown */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                    12-Category Breakdown — SM={sm} \u00D7 JM={jm}
                  </div>
                  {acei.cats.map(cat => {
                    const pct = (cat.wcs / Math.max(...acei.cats.map(c => c.wcs)) ) * 100;
                    const catBand = getBand(Math.min(100, (cat.crs / 25) * 100));
                    return (
                      <div key={cat.id} style={{
                        display: "grid", gridTemplateColumns: "24px 1fr 180px 70px 50px",
                        alignItems: "center", gap: 8, padding: "5px 8px",
                        background: cat.id % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                        borderRadius: 3, fontSize: 11
                      }}>
                        <span style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Courier New', monospace", fontSize: 10 }}>{cat.id}</span>
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>
                          {cat.short}
                          {cat.uncapped && <span style={{ marginLeft: 4, fontSize: 8, padding: "1px 4px", borderRadius: 2, background: "rgba(192,57,43,0.15)", color: "#E74C3C", fontWeight: 700 }}>UNCAPPED</span>}
                        </span>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: catBand.color, borderRadius: 3, transition: "width 0.5s ease" }} />
                        </div>
                        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "rgba(255,255,255,0.5)", textAlign: "right" }}>
                          WCS {cat.wcs.toFixed(2)}
                        </span>
                        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "right" }}>
                          {cat.baseL}\u00D7{cat.baseI}={cat.crs}
                        </span>
                      </div>
                    );
                  })}
                  <div style={{
                    marginTop: 12, padding: "8px 10px", background: "rgba(46,134,193,0.06)",
                    borderRadius: 4, fontFamily: "'Courier New', monospace", fontSize: 11, color: "rgba(255,255,255,0.5)"
                  }}>
                    DI = min(100, ({acei.drt.toFixed(1)} / 300) \u00D7 100) = <span style={{ color: "#fff", fontWeight: 600 }}>{acei.di}</span> — {getBand(acei.di).label} Exposure
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ONBOARDING ARCHITECTURE                                    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeView === "onboarding" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { id: "design", label: "Data Architecture" },
                { id: "preview", label: "Client-Facing Preview" },
                { id: "crossref", label: "Cross-Reference Engine" }
              ].map(tab => (
                <button key={tab.id} onClick={() => setOnboardingView(tab.id)} style={{
                  background: onboardingView === tab.id ? "rgba(46,134,193,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${onboardingView === tab.id ? "rgba(46,134,193,0.3)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 500,
                  color: onboardingView === tab.id ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer"
                }}>{tab.label}</button>
              ))}
            </div>
            {onboardingView === "design" && (
              <div>
                <div style={{ marginBottom: 16, padding: 14, background: "rgba(46,134,193,0.05)", border: "1px solid rgba(46,134,193,0.15)", borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Onboarding Data Strategy</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                    Every field below serves a dual purpose: it feeds a constitutional scoring requirement AND builds intelligence depth on the client.
                    Fields marked with {"\uD83D\uDD04"} trigger automatic cross-referencing against the tribunal database (130,854 decisions, 80,124 unique employers).
                    Discrepancies between self-reported and public data trigger CCI Art. V \u00A75.4.2 governance review.
                  </div>
                </div>
                {ONBOARDING_SECTIONS.map(section => (
                  <div key={section.id} style={{ marginBottom: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
                    <button
                      onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                      style={{
                        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{section.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{section.title}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{section.subtitle}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
                          {section.fields.length} fields
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, transition: "transform 0.2s", transform: expandedSection === section.id ? "rotate(180deg)" : "rotate(0)" }}>\u25BC</span>
                      </div>
                    </button>
                    {expandedSection === section.id && (
                      <div style={{ padding: "0 16px 16px" }}>
                        {section.fields.map(field => (
                          <div key={field.id} style={{
                            padding: "10px 12px", borderLeft: `3px solid ${field.crossRef ? "#D4920B" : field.required ? accent : "rgba(255,255,255,0.06)"}`,
                            marginBottom: 6, background: "rgba(255,255,255,0.015)", borderRadius: "0 4px 4px 0"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
                                  {field.crossRef && <span style={{ marginRight: 4 }}>{"\uD83D\uDD04"}</span>}
                                  {field.label}
                                  {field.required && <span style={{ marginLeft: 4, color: "#E74C3C", fontSize: 10 }}>*</span>}
                                </div>
                                {field.note && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3, fontStyle: "italic" }}>{field.note}</div>}
                              </div>
                              <div style={{ textAlign: "right", marginLeft: 12 }}>
                                <div style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "rgba(46,134,193,0.1)", color: "#2E86C1", fontWeight: 600, marginBottom: 3 }}>
                                  {field.feeds}
                                </div>
                                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "'Courier New', monospace" }}>{field.constitutional}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{ONBOARDING_SECTIONS.reduce((sum, s) => sum + s.fields.length, 0)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Total Fields</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#D4920B" }}>{ONBOARDING_SECTIONS.reduce((sum, s) => sum + s.fields.filter(f => f.crossRef).length, 0)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Cross-Reference Fields</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#16A085" }}>3</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Indices Fed</div>
                  </div>
                </div>
              </div>
            )}
            {onboardingView === "preview" && (
              <div style={{ maxWidth: 700, margin: "0 auto" }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ padding: "24px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(46,134,193,0.04)" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Welcome to Ailane</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                      Complete your company profile to receive your personalised ACEI exposure score.
                      This takes approximately 8-10 minutes. All data is encrypted and governed under strict confidentiality protocols.
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                      {ONBOARDING_SECTIONS.map((s, i) => (
                        <div key={s.id} style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: i === 0 ? accent : "rgba(255,255,255,0.06)"
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Step 1 of {ONBOARDING_SECTIONS.length} — {ONBOARDING_SECTIONS[0].title}</div>
                  </div>
                  {/* Form Preview */}
                  <div style={{ padding: "20px 28px" }}>
                    {ONBOARDING_SECTIONS[0].fields.map(field => (
                      <div key={field.id} style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6, fontWeight: 500 }}>
                          {field.label} {field.required && <span style={{ color: "#E74C3C" }}>*</span>}
                        </label>
                        {field.type === "select" ? (
                          <select style={{ ...selectStyle, padding: "10px 14px" }} disabled>
                            <option>Select...</option>
                          </select>
                        ) : field.type === "toggle" ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button style={{ padding: "8px 20px", borderRadius: 6, border: `1px solid ${accent}`, background: `${accent}22`, color: accent, fontSize: 12, cursor: "pointer" }}>Yes</button>
                            <button style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>No</button>
                          </div>
                        ) : (
                          <input type={field.type} placeholder={field.type === "number" ? "0" : "Enter..."} disabled
                            style={{ ...selectStyle, padding: "10px 14px", width: "100%" }} />
                        )}
                      </div>
                    ))}
                    <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                      <button style={{
                        padding: "10px 28px", borderRadius: 6, border: "none",
                        background: accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer"
                      }}>Continue \u2192</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {onboardingView === "crossref" && (
              <div>
                <div style={{ marginBottom: 16, padding: 14, background: "rgba(212,146,11,0.06)", border: "1px solid rgba(212,146,11,0.15)", borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#D4920B", marginBottom: 4 }}>Cross-Reference Intelligence Engine</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                    When a client provides their company name and claims history, we automatically search our tribunal database
                    (130,854 decisions, 80,124 unique employers) for matches. Per CCI Art. V \u00A75.4.2: where self-reported claim counts
                    are lower than public judgment counts, the higher figure is used and an 'Attestation Discrepancy' flag is raised.
                  </div>
                </div>
                {/* Cross-ref flow diagram */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr 40px 1fr", alignItems: "center", gap: 0, marginBottom: 20 }}>
                  {[
                    { title: "Client Reports", desc: "Self-attested claims via onboarding form", icon: "\u{1F4DD}" },
                    null,
                    { title: "Tribunal Database Match", desc: "Auto-search 80,124 employer names + trading names", icon: "\u{1F50D}" },
                    null,
                    { title: "Discrepancy Resolution", desc: "Higher figure used (\u00A75.4.2). Flag raised for governance review.", icon: "\u2696\uFE0F" },
                  ].map((item, i) => item ? (
                    <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 14, textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  ) : (
                    <div key={i} style={{ textAlign: "center", fontSize: 16, color: "rgba(255,255,255,0.15)" }}>\u2192</div>
                  ))}
                </div>
                {/* Simulated matches */}
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
                  Simulated Cross-Reference Results
                </div>
                {CROSS_REF_EXAMPLES.map((ex, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr 80px 80px 100px 1fr",
                    alignItems: "center", gap: 12, padding: "10px 14px",
                    background: ex.discrepancy ? "rgba(192,57,43,0.04)" : "rgba(255,255,255,0.015)",
                    border: `1px solid ${ex.discrepancy ? "rgba(192,57,43,0.15)" : "rgba(255,255,255,0.04)"}`,
                    borderRadius: 6, marginBottom: 6, fontSize: 12
                  }}>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{ex.company}</span>
                    <span style={{ textAlign: "center", fontFamily: "'Courier New', monospace", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                      Reported: {ex.reported}
                    </span>
                    <span style={{ textAlign: "center", fontFamily: "'Courier New', monospace", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                      Found: {ex.found}
                    </span>
                    <span style={{ textAlign: "center" }}>
                      {ex.discrepancy ? (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: "rgba(192,57,43,0.15)", color: "#E74C3C", fontWeight: 600 }}>DISCREPANCY</span>
                      ) : (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: "rgba(22,160,133,0.15)", color: "#16A085", fontWeight: 600 }}>VERIFIED</span>
                      )}
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{ex.categories.join(", ")}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Constitutional Authority</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
                    CCI Art. V \u00A75.4.2 — Discrepancies between self-reported and public data trigger governance review. Where self-reported counts are lower than public judgment counts, the higher figure is used and an 'Attestation Discrepancy' flag is raised.
                    CCI Art. V \u00A75.4.3 — Material misreporting results in CCI suspension pending investigation.
                    CCI Art. V \u00A75.2.3 — Public-Only CCI carries permanent 'Public-Only' flag acknowledging systematic undercount.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CLIENT INTELLIGENCE                                        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeView === "intelligence" && (
          <>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>
              Onboarding Intelligence Value Map
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* What we learn */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 12 }}>What Every Client Reveals</div>
                {[
                  { signal: "Sector + Size + Jurisdiction", insight: "Exact pricing tier qualification and SM \u00D7 JM exposure profile", value: "Revenue qualification" },
                  { signal: "Claims history vs tribunal records", insight: "Honesty indicator. Discrepancy = higher risk profile, lower CCI. Also reveals if client is unaware of own tribunal exposure.", value: "Trust calibration + CCI accuracy" },
                  { signal: "ACAS notifications count", insight: "Captures the hidden iceberg \u2014 claims that never reach tribunal but indicate workplace conflict patterns", value: "True dispute volume" },
                  { signal: "Grievance handling metrics", insight: "Operational maturity of HR function. Low GR = intervention opportunity. High GR + low claims = strong culture.", value: "Upsell readiness (RRI)" },
                  { signal: "Policy review recency", insight: "Proxy for overall compliance attention. 'Over 2 years' or 'Never' = high RRI value proposition", value: "Sales qualification" },
                  { signal: "EPLI insurance status", insight: "Direct lead for insurance integration pathway. No EPLI = recommendation opportunity. Has EPLI = underwriting data value.", value: "Insurance channel pipeline" },
                  { signal: "HR structure type", insight: "Outsourced HR = potential partnership channel. No HR = highest need segment.", value: "Channel strategy" },
                  { signal: "Awareness of upcoming changes", insight: "'Not aware' = exactly the problem Ailane solves. Immediate demonstration of value gap.", value: "Conversion trigger" },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: 10, padding: "8px 10px", borderLeft: "2px solid rgba(46,134,193,0.3)", background: "rgba(255,255,255,0.01)", borderRadius: "0 4px 4px 0" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{item.signal}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{item.insight}</div>
                    <div style={{ fontSize: 9, color: accent, marginTop: 2, fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {/* Aggregate insights */}
              <div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 18, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Market Intelligence Aggregation</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                    As clients onboard, every data point becomes aggregate market intelligence.
                    At scale, Ailane will possess the most detailed dataset on UK employment compliance posture ever assembled:
                  </div>
                  {[
                    { metric: "Sector-level claim frequency benchmarks", source: "TCF data \u00D7 sector classification" },
                    { metric: "Jurisdiction-level enforcement intensity", source: "REE data \u00D7 jurisdiction mapping" },
                    { metric: "HR maturity by company size", source: "GR + HR structure \u00D7 headcount" },
                    { metric: "Policy currency gaps by sector", source: "Policy review date \u00D7 sector" },
                    { metric: "EPLI penetration rates", source: "Insurance status \u00D7 size \u00D7 sector" },
                    { metric: "Attestation discrepancy rates", source: "Self-report vs tribunal match rates" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 11 }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{item.metric}</span>
                      <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>{item.source}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(22,160,133,0.05)", border: "1px solid rgba(22,160,133,0.15)", borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#16A085", marginBottom: 8 }}>Insurance Industry Data Product</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                    Onboarding data creates the foundation for the EPLI underwriting data feed.
                    No insurer currently has access to computational CCI scores backed by real tribunal data.
                    Projected value: \u00A3375k\u2013\u00A3750k annually from 5\u201310 insurance clients by Year 3.
                    Each onboarded client enriches the dataset that makes this product more valuable.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PLATFORM STATUS                                            */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeView === "platform" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              { title: "Tribunal Database", value: "130,854", sub: "UK decisions", status: "ENRICHING", statusColor: "#D4920B", detail: "80,124 unique employers identified. Classification running (~50hrs remaining)." },
              { title: "Global Scrapers", value: "30+", sub: "Active scrapers", status: "DEPLOYED", statusColor: "#16A085", detail: "18 jurisdictions. 53 jurisdiction database. 6-hourly automated runs." },
              { title: "Database Security", value: "32", sub: "RLS-secured tables", status: "SECURED", statusColor: "#16A085", detail: "Anon INSERT removed from 7 critical tables. Service role auth enforced." },
              { title: "Constitutions", value: "3", sub: "Founding documents", status: "ADOPTED", statusColor: "#16A085", detail: "ACEI v1.0, RRI v1.0, CCI v1.0. Adopted 26 Feb 2026." },
              { title: "Landing Page", value: "ailane.ai", sub: "Production", status: "LIVE", statusColor: "#16A085", detail: "Institutional fintech design. ACEI gauge. Pricing tiers. Early access signup." },
              { title: "Trademark", value: "UK00004347220", sub: "Ailane", status: "FILED", statusColor: "#D4920B", detail: "Filed 28 Feb 2026. \u00A3170 fee. Awaiting registration." },
              { title: "ACEI Engine", value: "DI = 22", sub: "Controlled Exposure", status: "LIVE", statusColor: "#16A085", detail: "EVI + EII + SCI three-component engine. Art. III compliant." },
              { title: "RRI Engine", value: "\u2014", sub: "Not built", status: "PENDING", statusColor: "#C0392B", detail: "Constitution adopted. Five-pillar framework defined. Awaiting implementation." },
              { title: "CCI Engine", value: "\u2014", sub: "Not built", status: "PENDING", statusColor: "#C0392B", detail: "Constitution adopted. Six-component Bayesian framework defined. Depends on enrichment completion." },
              { title: "Innovation Wales", value: "\u00A375k", sub: "Funding target", status: "IN PROGRESS", statusColor: "#D4920B", detail: "April panel presentation. Panel are potential customers." },
              { title: "Revenue", value: "\u00A30", sub: "Pre-revenue", status: "PRE-REVENUE", statusColor: "#D4920B", detail: "Pricing: \u00A3199 / \u00A3799 / Custom. Blended ARPU \u00A3574/mo. 145 customers = \u00A31m ARR." },
              { title: "Valuation", value: "\u00A3852k\u2013\u00A31.5m", sub: "Pre-revenue estimate", status: "ASSESSED", statusColor: "#2E86C1", detail: "Based on IP, data assets, infrastructure. Year 5 base: \u00A342.3m." },
            ].map((card, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{card.title}</div>
                  <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: `${card.statusColor}18`, color: card.statusColor, fontWeight: 700, letterSpacing: 0.5 }}>
                    {card.status}
                  </span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Courier New', monospace" }}>{card.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>{card.sub}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 8 }}>{card.detail}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.03)", padding: "12px 24px", display: "flex", justifyContent: "space-between", marginTop: 40 }}>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.15)" }}>INTERNAL — NOT FOR CLIENT DISTRIBUTION — AI Lane Limited (Company No. 17035654)</span>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.15)" }}>ACEI v1.0 \u2022 RRI v1.0 \u2022 CCI v1.0 — Founding Constitutions</span>
      </div>
    </div>
  );
}
