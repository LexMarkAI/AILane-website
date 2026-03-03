import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

// ════════════════════════════════════════════════════════════════
// AILANE ACEI SIMULATOR — POST-SIGNUP EXPERIENCE
// Purpose: Convert signups into paying customers by demonstrating
// product value immediately. All data clearly marked as simulated.
// ════════════════════════════════════════════════════════════════

const SECTORS = [
  { id: 'professional', name: 'Professional Services', sm: 1.20 },
  { id: 'financial', name: 'Financial Services', sm: 1.25 },
  { id: 'healthcare', name: 'Healthcare', sm: 1.15 },
  { id: 'technology', name: 'Technology', sm: 1.10 },
  { id: 'retail', name: 'Retail & Hospitality', sm: 1.05 },
  { id: 'manufacturing', name: 'Manufacturing', sm: 1.00 },
  { id: 'construction', name: 'Construction', sm: 0.95 },
  { id: 'education', name: 'Education', sm: 1.10 },
  { id: 'public', name: 'Public Sector', sm: 1.30 },
  { id: 'charity', name: 'Charities & Non-Profits', sm: 0.90 },
  { id: 'transport', name: 'Transport & Logistics', sm: 1.05 },
  { id: 'media', name: 'Media & Entertainment', sm: 1.15 },
]

const JURISDICTIONS = [
  { id: 'london', name: 'London', jm: 1.40 },
  { id: 'se', name: 'South East England', jm: 1.25 },
  { id: 'sw', name: 'South West England', jm: 1.00 },
  { id: 'east', name: 'East of England', jm: 1.05 },
  { id: 'em', name: 'East Midlands', jm: 0.95 },
  { id: 'wm', name: 'West Midlands', jm: 1.05 },
  { id: 'yh', name: 'Yorkshire & Humber', jm: 1.00 },
  { id: 'nw', name: 'North West England', jm: 1.10 },
  { id: 'ne', name: 'North East England', jm: 0.95 },
  { id: 'wales', name: 'Wales', jm: 1.00 },
  { id: 'scotland', name: 'Scotland', jm: 1.20 },
  { id: 'ni', name: 'Northern Ireland', jm: 1.15 },
]

const CATEGORIES = [
  { id: 1, name: 'Unfair Dismissal & Wrongful Termination', short: 'Dismissal', icon: '\u2696\uFE0F', baseL: 2, baseI: 2 },
  { id: 2, name: 'Discrimination & Harassment', short: 'Discrimination', icon: '\uD83D\uDEE1\uFE0F', baseL: 3, baseI: 3, uncapped: true },
  { id: 3, name: 'Wages, Working Time & Holiday Pay', short: 'Wages & Time', icon: '\u23F1\uFE0F', baseL: 3, baseI: 2 },
  { id: 4, name: 'Whistleblowing & Protected Disclosures', short: 'Whistleblowing', icon: '\uD83D\uDCE2', baseL: 2, baseI: 4, uncapped: true },
  { id: 5, name: 'Employment Status & Worker Classification', short: 'Status', icon: '\uD83D\uDCCB', baseL: 2, baseI: 2 },
  { id: 6, name: 'Redundancy & Restructuring', short: 'Redundancy', icon: '\uD83C\uDFD7\uFE0F', baseL: 2, baseI: 2 },
  { id: 7, name: 'Parental & Family Rights', short: 'Parental', icon: '\uD83D\uDC76', baseL: 2, baseI: 2 },
  { id: 8, name: 'Trade Union & Collective Rights', short: 'Trade Union', icon: '\uD83E\uDD1D', baseL: 2, baseI: 3 },
  { id: 9, name: 'Breach of Contract & Notice Disputes', short: 'Contract', icon: '\uD83D\uDCC4', baseL: 2, baseI: 2 },
  { id: 10, name: 'Health & Safety Protections', short: 'H&S', icon: '\uD83D\uDD12', baseL: 2, baseI: 2 },
  { id: 11, name: 'Data Protection & Employee Privacy', short: 'Data', icon: '\uD83D\uDD10', baseL: 2, baseI: 3 },
  { id: 12, name: 'Business Transfers & Insolvency', short: 'Transfers', icon: '\uD83D\uDD04', baseL: 1, baseI: 2 },
]

const BANDS = [
  { label: 'Low Exposure', min: 0, max: 20, color: '#34d399', desc: 'Minimal regulatory exposure. Maintain monitoring.' },
  { label: 'Controlled Exposure', min: 21, max: 40, color: '#38bdf8', desc: 'Manageable exposure. Standard compliance measures sufficient.' },
  { label: 'Elevated Exposure', min: 41, max: 60, color: '#fbbf24', desc: 'Above-average exposure. Active risk management recommended.' },
  { label: 'High Exposure', min: 61, max: 80, color: '#f97316', desc: 'Significant exposure. Immediate compliance review warranted.' },
  { label: 'Severe Exposure', min: 81, max: 100, color: '#ef4444', desc: 'Maximum exposure band. Urgent governance intervention indicated.' },
]

function getBand(score) {
  return BANDS.find(b => score >= b.min && score <= b.max) || BANDS[0]
}

// ─── ANIMATED GAUGE ─────────────────────────────────────────
function SimGauge({ score, size = 200, prevScore }) {
  const [animatedScore, setAnimatedScore] = useState(prevScore || 0)
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const band = getBand(score)

  useEffect(() => {
    const start = animatedScore
    const diff = score - start
    let frame = 0
    const totalFrames = 60
    const ease = (t) => 1 - Math.pow(1 - t, 3)

    const animate = () => {
      frame++
      const progress = ease(Math.min(frame / totalFrames, 1))
      setAnimatedScore(Math.round(start + diff * progress))
      if (frame < totalFrames) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [score])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)
    const cx = size / 2, cy = size / 2, radius = size / 2 - 18
    const startAngle = 0.75 * Math.PI, endAngle = 2.25 * Math.PI, totalArc = endAngle - startAngle
    ctx.clearRect(0, 0, size, size)

    // Background arc
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, endAngle)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    ctx.stroke()

    // Band segments
    BANDS.forEach((b) => {
      const segStart = startAngle + (b.min / 100) * totalArc
      const segEnd = startAngle + ((b.max + 1) / 100) * totalArc
      ctx.beginPath()
      ctx.arc(cx, cy, radius, segStart, segEnd)
      ctx.strokeStyle = b.color + '28'
      ctx.lineWidth = 12
      ctx.lineCap = 'butt'
      ctx.stroke()
    })

    // Active arc
    const scoreAngle = startAngle + (animatedScore / 100) * totalArc
    const gradient = ctx.createLinearGradient(0, size, size, 0)
    gradient.addColorStop(0, band.color + '66')
    gradient.addColorStop(1, band.color)
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, scoreAngle)
    ctx.strokeStyle = gradient
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    ctx.stroke()

    // Glow
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, scoreAngle)
    ctx.strokeStyle = band.color + '33'
    ctx.lineWidth = 22
    ctx.lineCap = 'round'
    ctx.stroke()

    // Ticks
    for (let i = 0; i <= 100; i += 10) {
      const angle = startAngle + (i / 100) * totalArc
      const innerR = i % 20 === 0 ? radius - 20 : radius - 16
      ctx.beginPath()
      ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle))
      ctx.lineTo(cx + (radius - 9) * Math.cos(angle), cy + (radius - 9) * Math.sin(angle))
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = i % 20 === 0 ? 2 : 1
      ctx.stroke()
    }
  }, [animatedScore, size, band])

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -45%)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: band.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{animatedScore}</div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1.5, marginTop: 4, textTransform: 'uppercase' }}>Simulated Index</div>
      </div>
      <div style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        background: band.color + '18', border: `1px solid ${band.color}44`,
        borderRadius: 4, padding: '3px 12px', whiteSpace: 'nowrap'
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: band.color, letterSpacing: 0.8 }}>{band.label.toUpperCase()}</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN SIMULATOR
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [sector, setSector] = useState('technology')
  const [jurisdiction, setJurisdiction] = useState('london')
  const [headcount, setHeadcount] = useState(150)
  const [showCategories, setShowCategories] = useState(false)
  const [prevDI, setPrevDI] = useState(0)
  const [userEmail, setUserEmail] = useState(null)

  // Capture auth token from hash (post-signup/magic-link redirect)
  useEffect(() => {
    const hash = window.location.hash.substring(1)
    if (!hash) return
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    const tokenType = params.get('token_type')
    if (token && tokenType === 'bearer') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      // Store session so dashboard can pick it up later
      sessionStorage.setItem('acei_token', token)
      // Decode JWT to get email
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.email) {
          sessionStorage.setItem('acei_email', payload.email)
          setUserEmail(payload.email)
        }
      } catch (_) { /* ignore decode errors */ }
    } else {
      // Check existing session
      const savedEmail = sessionStorage.getItem('acei_email')
      if (savedEmail) setUserEmail(savedEmail)
    }
  }, [])

  const sm = SECTORS.find(s => s.id === sector)?.sm || 1.0
  const jm = JURISDICTIONS.find(j => j.id === jurisdiction)?.jm || 1.0
  const sectorName = SECTORS.find(s => s.id === sector)?.name || ''
  const jurisdictionName = JURISDICTIONS.find(j => j.id === jurisdiction)?.name || ''

  const compute = useCallback(() => {
    const cats = CATEGORIES.map(c => {
      const crs = c.baseL * c.baseI
      const wcs = crs * sm * jm
      return { ...c, crs, wcs }
    })
    const drt = cats.reduce((sum, c) => sum + c.wcs, 0)
    const di = Math.min(100, Math.round((drt / 300) * 100))
    return { cats, drt, di }
  }, [sm, jm])

  const result = compute()
  const band = getBand(result.di)
  const maxWcs = Math.max(...result.cats.map(c => c.wcs))
  const sortedCats = [...result.cats].sort((a, b) => b.wcs - a.wcs)

  // Track previous DI for smooth animation
  const prevDIRef = useRef(result.di)
  useEffect(() => {
    setPrevDI(prevDIRef.current)
    prevDIRef.current = result.di
  }, [result.di])

  // Pricing tier
  const tier = headcount <= 100
    ? { name: 'Operational Readiness', price: '\u00A3199', scope: 'ACEI exposure scores' }
    : headcount <= 2000
    ? { name: 'Governance', price: '\u00A3799', scope: 'Full Index Triad (ACEI + RRI + CCI)' }
    : { name: 'Institutional', price: 'Custom', scope: 'API access, white-label, insurance integration' }

  return (
    <>
      {/* ─── HEADER ─── */}
      <div className="sim-header">
        <div className="sim-header-left">
          <a href="/" className="sim-header-logo" style={{ textDecoration: 'none', color: '#fff' }}>AILANE</a>
          <div className="sim-header-divider" />
          <div className="sim-header-subtitle">Exposure Simulator</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sim-badge">SIMULATED DATA</div>
          {userEmail ? (
            <a href="/dashboard/" style={{ fontSize: 11, color: 'var(--accent-cyan)', textDecoration: 'none' }}>
              Go to Dashboard {'\u2192'}
            </a>
          ) : (
            <a href="/dashboard/" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>
              Sign in
            </a>
          )}
        </div>
      </div>

      {/* ─── WELCOME BANNER (authenticated users) ─── */}
      {userEmail && (
        <div className="sim-welcome">
          <div className="sim-welcome-inner">
            <span>{'\u2713'} Signed in as <strong>{userEmail}</strong></span>
            <span>This is a simulator with illustrative data. To get your real ACEI score, <a href="/dashboard/">subscribe via the dashboard</a>.</span>
          </div>
        </div>
      )}

      {/* ─── BANNER ─── */}
      <div className="sim-banner">
        <div className="sim-banner-inner">
          <div className="sim-banner-title">See what your exposure score could look like</div>
          <div className="sim-banner-desc">
            Select your sector, jurisdiction, and company size below. The ACEI engine calculates your simulated
            regulatory exposure across 12 employment law categories using our constitutional scoring methodology.
          </div>
          <div className="sim-banner-warning">
            <span>{'\u26A0\uFE0F'}</span>
            <span>
              These numbers are illustrative only and do not represent your actual compliance position.
              Your real score requires a full assessment with verified data.
            </span>
          </div>
        </div>
      </div>

      <div className="sim-body">
        {/* ─── CONTROLS ─── */}
        <div className="sim-controls">
          <div>
            <label className="sim-control-label">Your Sector</label>
            <select className="sim-select" value={sector} onChange={e => setSector(e.target.value)}>
              {SECTORS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="sim-multiplier">Sector Multiplier: {sm}</div>
          </div>
          <div>
            <label className="sim-control-label">Primary Location</label>
            <select className="sim-select" value={jurisdiction} onChange={e => setJurisdiction(e.target.value)}>
              {JURISDICTIONS.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
            <div className="sim-multiplier">Jurisdiction Multiplier: {jm}</div>
          </div>
          <div>
            <label className="sim-control-label">UK Employees: {headcount}</label>
            <div style={{ padding: '6px 0' }}>
              <input type="range" className="sim-slider" min={25} max={2000} step={25} value={headcount}
                onChange={e => setHeadcount(+e.target.value)} />
            </div>
            <div className="sim-slider-labels">
              <span>25</span><span>500</span><span>1,000</span><span>2,000</span>
            </div>
          </div>
        </div>

        {/* ─── SCORE + CONTEXT ─── */}
        <div className="sim-score-grid">
          {/* Gauge */}
          <div className="sim-gauge-card">
            <SimGauge score={result.di} size={190} prevScore={prevDI} />
            <div className="sim-bandscale">
              <div className="sim-bandscale-bar">
                {BANDS.map(b => (
                  <div key={b.label} className="sim-bandscale-segment" style={{ background: b.color + '44' }}>
                    {result.di >= b.min && result.di <= b.max && (
                      <div className="sim-bandscale-needle"
                        style={{
                          left: `${((result.di - b.min) / (b.max - b.min + 1)) * 100}%`,
                          boxShadow: `0 0 6px ${b.color}`
                        }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Context cards */}
          <div className="sim-context">
            {/* Band explanation */}
            <div className="sim-band-card"
              style={{
                background: band.color + '08',
                borderColor: band.color + '22',
                borderLeftColor: band.color,
                border: `1px solid ${band.color}22`,
                borderLeft: `4px solid ${band.color}`,
              }}>
              <div className="sim-band-title" style={{ color: band.color }}>
                {band.label} — Domain Index {result.di}
              </div>
              <div className="sim-band-desc">{band.desc}</div>
              <div className="sim-band-multiplier">
                A <strong>{sectorName}</strong> business in <strong>{jurisdictionName}</strong> faces a combined multiplier effect of <strong>{(sm * jm).toFixed(2)}x</strong> on base exposure scores.
                {sm * jm > 1.2 && ' This is a significantly amplified risk profile — sector and geographic factors compound together.'}
                {sm * jm < 0.95 && ' This provides some natural attenuation of base exposure scores.'}
              </div>
            </div>

            {/* Key metrics */}
            <div className="sim-metrics">
              <div className="sim-metric">
                <div className="sim-metric-label">Categories Monitored</div>
                <div className="sim-metric-value">12</div>
                <div className="sim-metric-sub">Employment law categories</div>
              </div>
              <div className="sim-metric">
                <div className="sim-metric-label">Tribunal Decisions</div>
                <div className="sim-metric-value">130,854</div>
                <div className="sim-metric-sub">UK decisions analysed</div>
              </div>
              <div className="sim-metric">
                <div className="sim-metric-label">Update Frequency</div>
                <div className="sim-metric-value">Weekly</div>
                <div className="sim-metric-sub">Live regulatory monitoring</div>
              </div>
            </div>

            {/* Suggested tier */}
            <div className="sim-tier-card">
              <div>
                <div className="sim-tier-label">Recommended for {headcount} employees</div>
                <div className="sim-tier-name">{tier.name} <span className="sim-tier-price">{tier.price}/mo</span></div>
                <div className="sim-tier-scope">{tier.scope}</div>
              </div>
              <button className="sim-cta-btn">Get Your Real Score →</button>
            </div>
          </div>
        </div>

        {/* ─── CATEGORY BREAKDOWN ─── */}
        <div style={{ marginBottom: 24 }}>
          <button className="sim-cat-toggle" onClick={() => setShowCategories(!showCategories)}>
            <div>
              <div className="sim-cat-toggle-title">12-Category Exposure Breakdown</div>
              <div className="sim-cat-toggle-desc">
                See how exposure distributes across employment law categories for {sectorName}
              </div>
            </div>
            <span className="sim-cat-arrow" style={{ transform: showCategories ? 'rotate(180deg)' : 'rotate(0)' }}>{'\u25BC'}</span>
          </button>

          {showCategories && (
            <div className="sim-cat-panel">
              <div className="sim-cat-header">
                <span />
                <span>Category</span>
                <span>Exposure Level</span>
                <span style={{ textAlign: 'right' }}>WCS</span>
                <span style={{ textAlign: 'center' }}>L {'\u00D7'} I</span>
              </div>
              {sortedCats.map((cat, idx) => {
                const pct = (cat.wcs / (maxWcs + 2)) * 100
                const catBand = getBand(Math.min(100, (cat.crs / 25) * 100))
                return (
                  <div key={cat.id} className="sim-cat-row" style={{ animation: `fadeUp ${0.3 + idx * 0.05}s ease-out` }}>
                    <span className="sim-cat-icon">{cat.icon}</span>
                    <div>
                      <span className="sim-cat-name">{cat.name}</span>
                      {cat.uncapped && <span className="sim-cat-uncapped">UNCAPPED</span>}
                    </div>
                    <div className="sim-cat-bar">
                      <div className="sim-cat-bar-fill" style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${catBand.color}55, ${catBand.color})`
                      }} />
                    </div>
                    <span className="sim-cat-wcs">{cat.wcs.toFixed(2)}</span>
                    <span className="sim-cat-lxi">{cat.baseL}{'\u00D7'}{cat.baseI}={cat.crs}</span>
                  </div>
                )
              })}
              <div className="sim-drt-summary">
                DRT = {'\u03A3'} WCS = {result.drt.toFixed(1)} &nbsp;|&nbsp; DI = min(100, ({result.drt.toFixed(1)} / 300) {'\u00D7'} 100) = <span style={{ color: band.color, fontWeight: 700 }}>{result.di}</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── WHAT'S DIFFERENT WITH YOUR REAL SCORE ─── */}
        <div className="sim-compare">
          <div className="sim-compare-title">What changes with your real ACEI score?</div>
          <div className="sim-compare-grid">
            {[
              { title: 'Simulated Score', items: ['Generic sector baseline inputs', 'Neutral velocity (no momentum)', 'No company-specific claims history', 'No mitigation credits applied', 'Static snapshot'], side: 'sim' },
              { title: 'Your Real Score', items: ['Live tribunal data from 130,854 decisions', 'Velocity tracking on enforcement momentum', 'Cross-referenced against your actual claims', 'Mitigation credits for compliance actions', 'Weekly updates with trend analysis'], side: 'real' },
            ].map(col => (
              <div key={col.side} className={`sim-compare-col ${col.side}`}>
                <div className="sim-compare-col-title" style={{ color: col.side === 'real' ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {col.title}
                </div>
                {col.items.map((item, i) => (
                  <div key={i} className="sim-compare-item">
                    <span className="sim-compare-check" style={{ color: col.side === 'real' ? 'var(--accent-emerald)' : 'var(--text-dim)' }}>
                      {col.side === 'real' ? '\u2713' : '\u25CB'}
                    </span>
                    <span className="sim-compare-text">{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ─── SUBSCRIPTION TIERS ─── */}
        <div style={{ marginBottom: 28 }}>
          <div className="sim-pricing-header">
            <div className="sim-pricing-title">Choose your level of protection</div>
            <div className="sim-pricing-desc">
              Every tier is powered by real UK tribunal data, updated weekly. No questionnaires.
              No guesswork. Deterministic scores governed by the ACEI Founding Constitution.
            </div>
          </div>

          <div className="sim-pricing-grid">
            {/* Tier 1: Operational Readiness */}
            <div className={`sim-plan-card ${headcount <= 100 ? 'recommended' : ''}`}>
              {headcount <= 100 && <div className="sim-plan-badge">RECOMMENDED FOR YOU</div>}
              <div className="sim-plan-tier">Operational Readiness</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span className="sim-plan-price">{'\u00A3'}199</span>
                <span className="sim-plan-period">/month</span>
              </div>
              <div className="sim-plan-employees">25–100 employees</div>
              <div className="sim-plan-features">
                {[
                  { text: 'ACEI Domain Index score', ok: true },
                  { text: '12-category exposure breakdown', ok: true },
                  { text: 'Weekly score updates', ok: true },
                  { text: 'Sector & jurisdiction multipliers', ok: true },
                  { text: 'Velocity tracking & trend analysis', ok: true },
                  { text: 'Interpretation band classification', ok: true },
                  { text: 'Email alerts on score movement', ok: true },
                  { text: 'RRI Readiness Index', ok: false },
                  { text: 'CCI Conduct Index', ok: false },
                  { text: 'Claims cross-referencing', ok: false },
                  { text: 'API access', ok: false },
                ].map((f, i) => (
                  <div key={i} className="sim-plan-feature">
                    <span className="sim-plan-feature-check" style={{ color: f.ok ? 'var(--accent-emerald)' : 'var(--text-dim)' }}>
                      {f.ok ? '\u2713' : '\u2014'}
                    </span>
                    <span className="sim-plan-feature-text" style={{ color: f.ok ? 'var(--text-secondary)' : 'var(--text-dim)' }}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
              <button className={`sim-plan-btn ${headcount <= 100 ? 'active' : 'inactive'}`}>
                {headcount <= 100 ? 'Start Free Trial \u2192' : 'Select Plan'}
              </button>
            </div>

            {/* Tier 2: Governance */}
            <div className={`sim-plan-card ${headcount > 100 && headcount <= 2000 ? 'recommended' : ''}`}>
              {headcount > 100 && headcount <= 2000 && <div className="sim-plan-badge">RECOMMENDED FOR YOU</div>}
              <div className="sim-plan-tier-row">
                <div className="sim-plan-tier">Governance</div>
                <div className="sim-plan-popular">MOST POPULAR</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span className="sim-plan-price">{'\u00A3'}799</span>
                <span className="sim-plan-period">/month</span>
              </div>
              <div className="sim-plan-employees">100–2,000 employees</div>
              <div className="sim-plan-features">
                {[
                  { text: 'Everything in Operational Readiness', ok: true, bold: true },
                  { text: 'Full Ailane Index Triad', ok: true },
                  { text: 'RRI Regulatory Readiness Index', ok: true, sub: '5-pillar forward-looking assessment' },
                  { text: 'CCI Compliance Conduct Index', ok: true, sub: 'Bayesian credibility-weighted scoring' },
                  { text: 'Claims history cross-referencing', ok: true, sub: 'Verified against 130,854 tribunal decisions' },
                  { text: 'Sector & jurisdiction benchmarking', ok: true },
                  { text: 'Governance dashboard & reporting', ok: true },
                  { text: 'Multi-jurisdiction scoring', ok: true, sub: 'Workforce-weighted aggregation (Art. VIII)' },
                  { text: 'Quarterly governance review', ok: true },
                  { text: 'API access', ok: false },
                  { text: 'White-label reporting', ok: false },
                ].map((f, i) => (
                  <div key={i}>
                    <div className="sim-plan-feature">
                      <span className="sim-plan-feature-check" style={{ color: f.ok ? 'var(--accent-emerald)' : 'var(--text-dim)' }}>
                        {f.ok ? '\u2713' : '\u2014'}
                      </span>
                      <span className="sim-plan-feature-text" style={{
                        color: f.ok ? 'var(--text-secondary)' : 'var(--text-dim)',
                        fontWeight: f.bold ? 600 : 400
                      }}>
                        {f.text}
                      </span>
                    </div>
                    {f.sub && f.ok && <div className="sim-plan-feature-sub">{f.sub}</div>}
                  </div>
                ))}
              </div>
              <button className={`sim-plan-btn ${headcount > 100 && headcount <= 2000 ? 'active' : 'inactive'}`}>
                {headcount > 100 && headcount <= 2000 ? 'Start Free Trial \u2192' : 'Select Plan'}
              </button>
            </div>

            {/* Tier 3: Institutional */}
            <div className={`sim-plan-card ${headcount > 2000 ? 'recommended' : ''}`}>
              {headcount > 2000 && <div className="sim-plan-badge">RECOMMENDED FOR YOU</div>}
              <div className="sim-plan-tier">Institutional</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span className="sim-plan-price">Custom</span>
              </div>
              <div className="sim-plan-employees">2,000+ employees</div>
              <div className="sim-plan-features">
                {[
                  { text: 'Everything in Governance', ok: true, bold: true },
                  { text: 'Full API access', ok: true, sub: 'Real-time scoring endpoints' },
                  { text: 'White-label reporting', ok: true, sub: 'Your brand, our engine' },
                  { text: 'EPLI insurance integration', ok: true, sub: 'Underwriting data feeds' },
                  { text: 'Custom multiplier profiles', ok: true, sub: 'Bespoke SM/JM calibration' },
                  { text: 'Multi-entity portfolio scoring', ok: true, sub: 'Group-level exposure aggregation' },
                  { text: 'Dedicated governance liaison', ok: true },
                  { text: 'Custom SLA & uptime guarantee', ok: true },
                  { text: 'Priority data enrichment', ok: true },
                  { text: 'Annual constitutional review', ok: true, sub: 'AIC methodology consultation' },
                ].map((f, i) => (
                  <div key={i}>
                    <div className="sim-plan-feature">
                      <span className="sim-plan-feature-check" style={{ color: 'var(--accent-emerald)' }}>{'\u2713'}</span>
                      <span className="sim-plan-feature-text" style={{
                        color: 'var(--text-secondary)',
                        fontWeight: f.bold ? 600 : 400
                      }}>
                        {f.text}
                      </span>
                    </div>
                    {f.sub && <div className="sim-plan-feature-sub">{f.sub}</div>}
                  </div>
                ))}
              </div>
              <button className={`sim-plan-btn ${headcount > 2000 ? 'active' : 'inactive'}`}>
                Contact Sales
              </button>
            </div>
          </div>

          {/* Trust strip */}
          <div className="sim-trust">
            {[
              { icon: '\uD83D\uDD12', text: 'Bank-grade encryption' },
              { icon: '\uD83D\uDCDC', text: 'Constitutionally governed methodology' },
              { icon: '\u2696\uFE0F', text: '130,854 tribunal decisions' },
              { icon: '\uD83D\uDD04', text: 'Weekly live updates' },
              { icon: '\u270B', text: 'Cancel anytime' },
            ].map((item, i) => (
              <div key={i} className="sim-trust-item">
                <span className="sim-trust-icon">{item.icon}</span>
                <span className="sim-trust-text">{item.text}</span>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="sim-faq">
            {[
              { q: 'How is this different from a compliance audit?', a: 'The ACEI is a continuous measurement instrument, not a point-in-time audit. Your score updates weekly using live tribunal data, enforcement records, and legislative changes — so you always know where you stand.' },
              { q: 'What data do I need to provide?', a: 'A short onboarding assessment covering company profile, claims history, and governance structure. Takes approximately 8\u201310 minutes. We then cross-reference your responses against our tribunal database of 80,124 identified employers.' },
              { q: 'Can I change plan later?', a: 'Yes. Upgrade or downgrade at any time. If your headcount grows past 100 employees, the Governance tier unlocks the full Index Triad — adding forward-looking readiness (RRI) and historical conduct (CCI) analysis.' },
              { q: 'What is the Ailane Index Triad?', a: 'Three complementary but independent indices: ACEI measures external regulatory exposure, RRI assesses your preparedness for confirmed changes, and CCI evaluates your historical conduct. Each is governed by its own constitution and scored 0\u2013100.' },
            ].map((faq, i) => (
              <div key={i} className="sim-faq-card">
                <div className="sim-faq-q">{faq.q}</div>
                <div className="sim-faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── CTA ─── */}
        <div className="sim-final-cta">
          <div className="sim-final-cta-title">Ready to know your real exposure?</div>
          <div className="sim-final-cta-desc">
            Complete a short assessment and we'll calculate your actual ACEI Domain Index
            using live tribunal data, enforcement records, and your specific compliance posture.
          </div>
          <div className="sim-final-cta-btns">
            <button className="sim-btn-primary">Start Your Assessment</button>
            <button className="sim-btn-secondary">View Pricing</button>
          </div>
        </div>

        {/* ─── METHODOLOGY ─── */}
        <div className="sim-methodology">
          <div className="sim-methodology-label">Methodology</div>
          <div className="sim-methodology-text">
            The ACEI is governed by the Ailane Core Exposure Index Founding Constitution v1.0, adopted 26 February 2026.
            Scores are calculated using the Article III mathematical engine: L = (0.4 {'\u00D7'} EVI) + (0.3 {'\u00D7'} EII) + (0.3 {'\u00D7'} SCI), with
            sector and jurisdiction multipliers applied per Annex B. This simulator uses baseline inputs only — your real score
            incorporates live tribunal data, enforcement monitoring, and velocity tracking updated weekly.
            This index does not constitute legal advice, risk rating, or compliance certification.
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div className="sim-footer">
        <span>AI Lane Limited (17035654) trading as Ailane {'\u2022'} ailane.ai</span>
        <span>ACEI Founding Constitution v1.0 {'\u2022'} Simulated data — not representative of actual compliance position</span>
      </div>
    </>
  )
}
