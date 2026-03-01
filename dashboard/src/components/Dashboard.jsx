import { useState, useEffect } from 'react'
import { fetchDomainScores, fetchCategoryScores } from '../api'
import { BANDS, CATEGORY_META, getBand, formatDelta, formatDate } from '../categories'
import Navbar from './Navbar'
import Footer from './Footer'
import ScoreGauge from './ScoreGauge'
import Sparkline from './Sparkline'
import './Dashboard.css'

// ─── INLINE SUB-COMPONENTS ──────────────────────────────────

function BandScale({ score }) {
  return (
    <div className="band-scale">
      <div className="band-bar">
        {BANDS.map(b => (
          <div key={b.label} className="band-segment" style={{ background: b.hex + '44' }}>
            {score >= b.min && score <= b.max && (
              <div
                className="band-marker"
                style={{
                  left: `${((score - b.min) / (b.max - b.min + 1)) * 100}%`,
                  boxShadow: `0 0 8px ${b.hex}`,
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="band-labels">
        {BANDS.map(b => (
          <div key={b.label} className="band-label">{b.label.split(' ')[0]}</div>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

function CategoryBar({ cat, maxWcs }) {
  const [animated, setAnimated] = useState(0)
  const meta = CATEGORY_META[cat.category] || { id: 0, name: cat.category, short: cat.category, icon: '\uD83D\uDCCA' }
  const pct = maxWcs > 0 ? (parseFloat(cat.wcs) / maxWcs) * 100 : 0
  const catBand = getBand(Math.min(100, (cat.crs / 25) * 100))

  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 200 + (meta.id || 0) * 60)
    return () => clearTimeout(t)
  }, [pct, meta.id])

  const vCat = parseFloat(cat.v_category)

  return (
    <div className="cat-row">
      <span className="cat-row-icon">{meta.icon}</span>
      <div>
        <span className="cat-row-name">{meta.name}</span>
        {meta.uncapped && <span className="cat-row-uncapped">UNCAPPED</span>}
      </div>
      <div className="cat-row-bar">
        <div
          className="cat-row-bar-fill"
          style={{
            width: `${animated}%`,
            background: `linear-gradient(90deg, ${catBand.hex}66, ${catBand.hex})`,
          }}
        />
      </div>
      <div className="cat-row-score">{parseFloat(cat.wcs).toFixed(2)}</div>
      <div className="cat-row-li">
        <span className="cat-row-li-val">{cat.l}</span>
        <span className="cat-row-li-sep">{'\u00D7'}</span>
        <span className="cat-row-li-val">{cat.i}</span>
      </div>
      <div className="cat-row-vel">
        {vCat > 0 ? (
          <span style={{ color: 'var(--accent-orange)' }}>{'\u25B2'} {(vCat * 100).toFixed(0)}%</span>
        ) : vCat < 0 ? (
          <span style={{ color: 'var(--accent-emerald)' }}>{'\u25BC'} {Math.abs(vCat * 100).toFixed(0)}%</span>
        ) : (
          <span style={{ color: 'var(--text-dim)' }}>{'\u2014'}</span>
        )}
      </div>
    </div>
  )
}

function CatTableHeader({ wcsLabel = 'WCS' }) {
  return (
    <div className="cat-table-header">
      <span />
      <span className="cat-col-label">Category</span>
      <span className="cat-col-label">{wcsLabel}</span>
      <span className="cat-col-label" style={{ textAlign: 'right' }}>Score</span>
      <span className="cat-col-label" style={{ textAlign: 'center' }}>L {'\u00D7'} I</span>
      <span className="cat-col-label" style={{ textAlign: 'right' }}>Vel.</span>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'categories', label: '12 Categories' },
  { id: 'history', label: 'History' },
  { id: 'methodology', label: 'Methodology' },
]

const METHODOLOGY = [
  { title: 'Scoring Architecture (Art. III)', content: 'The ACEI produces a deterministic Domain Index (DI) on a 0\u2013100 scale. Identical inputs produce identical outputs (\u00A71.3.1). Stochastic elements are prohibited in live scoring (\u00A71.3.2). All scoring functions are reproducible within 24 hours upon governance request (\u00A71.3.4).' },
  { title: 'Likelihood Derivation (Art. III \u00A73.2)', content: 'L_raw = (0.4 \u00D7 EVI) + (0.3 \u00D7 EII) + (0.3 \u00D7 SCI). L is rounded to integer \u2208 {1,2,3,4,5}. Week-over-week increases exceeding one level are prohibited unless SCI \u2265 4.' },
  { title: 'Impact Derivation (Art. III \u00A73.3)', content: 'I_raw = BFI + OM + RM. I = min(5, round(I_raw)). Base Financial Impact is category-specific with compensation bands defined in Annex A.' },
  { title: 'Multiplier Layer (Art. III \u00A73.5)', content: 'WCS_pre = CRS \u00D7 SM \u00D7 JM. Sector Multipliers range 0.80\u20131.30. Jurisdiction Multipliers range 0.90\u20131.40. Modification requires formal constitutional amendment.' },
  { title: 'Aggregation (Art. III \u00A73.7)', content: 'DRT = \u03A3 WCS across all twelve categories. DI = min(100, (DRT/DMR) \u00D7 100). DMR = 300 (95th percentile simulated extreme). DI is rounded to nearest integer and capped at 100.' },
  { title: 'Bounded Volatility (Art. I \u00A71.4)', content: 'Single-event movement: \u22648 index points absent Structural validation. Weekly movement: \u226425 index points under any circumstance.' },
  { title: 'Interpretation Bands (Art. IX \u00A79.5)', content: '0\u201320: Low Exposure. 21\u201340: Controlled Exposure. 41\u201360: Elevated Exposure. 61\u201380: High Exposure. 81\u2013100: Severe Exposure. Descriptive only \u2014 not risk rating or investment advice.' },
  { title: 'Clinical Neutrality (Art. I \u00A71.5)', content: 'The ACEI describes exposure magnitude only. Does not forecast litigation frequency, project financial loss, or opine on legal merits. Prohibited terms: crisis, collapse, explosion, emergency, panic.' },
]

export default function Dashboard({ token, email, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [domainHistory, setDomainHistory] = useState([])
  const [categories, setCategories] = useState([])
  const [latest, setLatest] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const domainScores = await fetchDomainScores(token, 12)
        if (!domainScores.length) throw new Error('No domain scores found')

        const latestScore = domainScores[0]
        const catScores = await fetchCategoryScores(token, latestScore.week_start_date)

        const weekDelta = domainScores.length >= 2 ? latestScore.di - domainScores[1].di : 0
        const fourWeekDelta = domainScores.length >= 5 ? latestScore.di - domainScores[4].di : 0

        setLatest({ ...latestScore, weekDelta, fourWeekDelta })
        setDomainHistory(domainScores.reverse())
        setCategories(catScores)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  if (loading) {
    return (
      <div className="dashboard">
        <Navbar email={email} onLogout={onLogout} />
        <div className="dash-loading">
          <div className="dash-loading-inner">
            <div className="dash-loading-logo">AILANE</div>
            <div className="dash-loading-text">Connecting to live scoring engine...</div>
            <div className="dash-loading-bar"><div className="dash-loading-fill" /></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <Navbar email={email} onLogout={onLogout} />
        <div className="dash-error">
          <div>
            <div className="dash-loading-logo">AILANE</div>
            <div className="dash-error-box">
              <div className="dash-error-title">Connection Error</div>
              <div className="dash-error-msg">{error}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const band = getBand(latest.di)
  const maxWcs = Math.max(...categories.map(c => parseFloat(c.wcs)), 1)
  const sm = categories.length > 0 ? parseFloat(categories[0].sm) : 1.0
  const jm = categories.length > 0 ? parseFloat(categories[0].jm) : 1.0
  const sortedCats = [...categories].sort((a, b) => parseFloat(b.wcs) - parseFloat(a.wcs))

  return (
    <div className="dashboard">
      <Navbar email={email} version={latest.version} weekDate={latest.week_start_date} onLogout={onLogout} />

      <div className="dash-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`dash-tab${activeTab === tab.id ? ' active' : ''}`}
          >{tab.label}</button>
        ))}
      </div>

      <div className="dash-content">

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === 'overview' && (
          <>
            <div className="overview-grid">
              <div className="overview-gauge-panel">
                <ScoreGauge score={latest.di} size={200} />
                <BandScale score={latest.di} />
              </div>
              <div className="overview-metrics-col">
                <div className="overview-metrics-row">
                  <MetricCard
                    label="Weekly Delta"
                    value={formatDelta(latest.weekDelta)}
                    sub="Art. IX \u00A79.2.1(b)"
                    color={latest.weekDelta < 0 ? 'var(--accent-emerald)' : latest.weekDelta > 0 ? 'var(--accent-orange)' : 'var(--text-muted)'}
                  />
                  <MetricCard
                    label="4-Week Delta"
                    value={formatDelta(latest.fourWeekDelta)}
                    sub="Art. IX \u00A79.2.1(c)"
                    color={latest.fourWeekDelta < 0 ? 'var(--accent-emerald)' : latest.fourWeekDelta > 0 ? 'var(--accent-orange)' : 'var(--text-muted)'}
                  />
                  <MetricCard
                    label="DRT / DMR"
                    value={`${parseFloat(latest.drt).toFixed(0)} / ${parseFloat(latest.dmr)}`}
                    sub="Domain Raw Total vs Reference"
                  />
                  <MetricCard
                    label="Multipliers"
                    value={`${sm} \u00D7 ${jm}`}
                    sub={`SM \u00D7 JM = ${(sm * jm).toFixed(2)}`}
                  />
                </div>

                <div className="overview-sparkline-panel">
                  <div className="overview-trend-info">
                    <div className="overview-trend-label">{domainHistory.length}-Week Trend</div>
                    <div className="overview-trend-ref">Art. IX {'\u00A7'}9.1.1 — Weekly publication</div>
                    {domainHistory.length >= 2 && (() => {
                      const first = domainHistory[0].di
                      const last = domainHistory[domainHistory.length - 1].di
                      const diff = last - first
                      return (
                        <div
                          className="overview-trend-delta"
                          style={{ color: diff < 0 ? 'var(--accent-emerald)' : diff > 0 ? 'var(--accent-orange)' : 'var(--text-muted)' }}
                        >
                          {diff > 0 ? '\u25B2' : diff < 0 ? '\u25BC' : '\u2192'} {Math.abs(diff)} pts over period
                        </div>
                      )
                    })()}
                  </div>
                  <div className="overview-sparkline-area">
                    <Sparkline data={domainHistory} width={400} height={55} />
                  </div>
                </div>

                <div className="formula-panel">
                  <div className="formula-label">Art. III — Live Computation</div>
                  <div className="formula-line">
                    <span className="formula-ref">{'\u00A7'}3.7.1</span> DRT = {'\u03A3'} WCS = <span className="formula-val">{parseFloat(latest.drt).toFixed(1)}</span>
                  </div>
                  <div className="formula-line">
                    <span className="formula-ref">{'\u00A7'}3.7.2</span> DI = min(100, (<span className="formula-highlight">{parseFloat(latest.drt).toFixed(1)}</span> / <span className="formula-highlight">{parseFloat(latest.dmr)}</span>) {'\u00D7'} 100) = <span className="formula-val">{latest.di}</span>
                  </div>
                  <div className="formula-line">
                    <span className="formula-ref">{'\u00A7'}9.5.1</span> Band: <span style={{ color: band.hex, fontWeight: 600 }}>{band.label}</span> ({BANDS.find(b => b.label === band.label)?.min}{'\u2013'}{BANDS.find(b => b.label === band.label)?.max})
                  </div>
                </div>
              </div>
            </div>

            <div className="section-eyebrow">Top Exposure Categories</div>
            <div className="cat-table">
              <CatTableHeader />
              {sortedCats.slice(0, 5).map(cat => (
                <CategoryBar key={cat.category} cat={cat} maxWcs={maxWcs + 2} />
              ))}
            </div>
          </>
        )}

        {/* ═══ 12 CATEGORIES ═══ */}
        {activeTab === 'categories' && (
          <>
            <div className="section-eyebrow">
              All 12 Categories — {formatDate(latest.week_start_date)} — Art. II Comprehensive Coverage
            </div>
            <div className="cat-table">
              <CatTableHeader wcsLabel="Weighted Category Score" />
              {sortedCats.map(cat => (
                <CategoryBar key={cat.category} cat={cat} maxWcs={maxWcs + 2} />
              ))}
            </div>

            <div className="cat-detail-grid">
              {sortedCats.map(cat => {
                const meta = CATEGORY_META[cat.category] || { id: '?', name: cat.category, icon: '\uD83D\uDCCA' }
                const catBand = getBand(Math.min(100, (cat.crs / 25) * 100))
                return (
                  <div key={cat.category} className="cat-detail-card" style={{ borderLeftColor: catBand.hex + '44' }}>
                    <div className="cat-detail-header">
                      <div>
                        <span className="cat-detail-icon">{meta.icon}</span>
                        <span className="cat-detail-num">Cat {meta.num || meta.id}</span>
                      </div>
                      {meta.uncapped && <span className="cat-detail-uncapped">UNCAPPED</span>}
                    </div>
                    <div className="cat-detail-name">{meta.name}</div>
                    <div className="cat-detail-metrics">
                      {[
                        { label: 'L', val: cat.l },
                        { label: 'I', val: cat.i },
                        { label: 'CRS', val: cat.crs, color: catBand.hex },
                      ].map(d => (
                        <div key={d.label}>
                          <div className="cat-detail-metric-label">{d.label}</div>
                          <div className="cat-detail-metric-value" style={{ color: d.color || 'var(--text-primary)' }}>{d.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ═══ HISTORY ═══ */}
        {activeTab === 'history' && (
          <>
            <div className="section-eyebrow">Domain Index History — Art. IX Weekly Publication</div>
            <div className="hist-chart-panel">
              <Sparkline data={domainHistory} width={1100} height={120} />
              {domainHistory.length > 0 && (
                <div className="hist-chart-dates">
                  <span className="hist-chart-date">{formatDate(domainHistory[0].week_start_date)}</span>
                  <span className="hist-chart-date">{formatDate(domainHistory[domainHistory.length - 1].week_start_date)}</span>
                </div>
              )}
            </div>
            <div className="hist-table">
              <div className="hist-table-header">
                {['Week', 'DI', 'AI', 'DRT', 'DMR', 'Version', 'Band'].map(h => (
                  <span key={h} className="hist-col-label">{h}</span>
                ))}
              </div>
              {[...domainHistory].reverse().map((row, i) => {
                const rowBand = getBand(row.di)
                return (
                  <div key={row.week_start_date} className={`hist-row${i === 0 ? ' latest' : ''}`}>
                    <span className="hist-cell hist-cell-date">{formatDate(row.week_start_date)}</span>
                    <span className="hist-cell" style={{ fontWeight: 700, color: rowBand.hex }}>{row.di}</span>
                    <span className="hist-cell hist-cell-dim">{row.ai}</span>
                    <span className="hist-cell hist-cell-dim">{parseFloat(row.drt).toFixed(0)}</span>
                    <span className="hist-cell hist-cell-dim">{parseFloat(row.dmr)}</span>
                    <span className="hist-cell hist-cell-version">{row.version}</span>
                    <span style={{ fontSize: 11, color: rowBand.hex, fontWeight: 500 }}>
                      <span
                        className="hist-band-dot"
                        style={{ background: rowBand.hex + '44', border: `1.5px solid ${rowBand.hex}` }}
                      />
                      {rowBand.label}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="hist-note">
              <div className="hist-note-text">
                Art. I {'\u00A7'}1.4 — Bounded Volatility: Single-event {'\u2264'}8pts, weekly {'\u2264'}25pts. Art. IX {'\u00A7'}9.4 — Historical values not rewritten except data corruption or calculation error. Structural flag indicates Art. V regime shift classification.
              </div>
            </div>
          </>
        )}

        {/* ═══ METHODOLOGY ═══ */}
        {activeTab === 'methodology' && (
          <div className="meth-container">
            <div className="section-eyebrow">Constitutional Methodology Reference</div>
            {METHODOLOGY.map((section, i) => (
              <div key={i} className={`meth-section${i === 0 ? ' first' : ''}`}>
                <div className="meth-title">{section.title}</div>
                <div className="meth-content">{section.content}</div>
              </div>
            ))}
            <div className="meth-governance">
              <div className="meth-governance-label">Governance</div>
              <div className="meth-governance-text">
                Governed by the Ailane Index Committee (AIC) under ACEI Founding Constitution v1.0, adopted 26 February 2026.
                Published by AI Lane Limited (Company No. 17035654) trading as Ailane.
                Separation Doctrine maintained (Art. XII-A {'\u00A7'}12A.3). No composite score permitted across the Index Triad.
              </div>
            </div>
          </div>
        )}

      </div>
      <Footer />
    </div>
  )
}
