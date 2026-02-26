import { getBand } from '../categories'
import './ScoreCard.css'

function formatDelta(val) {
  if (val == null) return '—'
  const sign = val > 0 ? '+' : ''
  return `${sign}${val.toFixed(1)}`
}

function needleAngle(score) {
  // Map 0-100 to -90 to +90 degrees for a semicircle gauge
  return -90 + (score / 100) * 180
}

export default function ScoreCard({ latest, previous, fourWeeksAgo }) {
  const ai = latest.ai != null ? Number(latest.ai) : 0
  const band = getBand(ai)
  const delta1w = previous ? ai - Number(previous.ai) : null
  const delta4w = fourWeeksAgo ? ai - Number(fourWeeksAgo.ai) : null
  const di = latest.di != null ? Number(latest.di).toFixed(1) : '—'
  const drt = latest.drt != null ? Number(latest.drt).toFixed(3) : '—'
  const dmr = latest.dmr != null ? Number(latest.dmr).toFixed(3) : '—'
  const structural = latest.structural_flag
  const angle = needleAngle(ai)

  // Calculate needle endpoint from center (130, 140) with radius 100
  const rad = (angle * Math.PI) / 180
  const nx = 130 + 95 * Math.cos(rad)
  const ny = 140 + 95 * Math.sin(rad)

  return (
    <div className="score-card">
      <div className="score-gauge-wrap">
        <svg className="score-gauge" viewBox="0 0 260 160">
          {/* Background arc */}
          <path d="M 30 140 A 100 100 0 0 1 230 140" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round" />
          {/* Band segments */}
          <path d="M 30 140 A 100 100 0 0 1 70 60" fill="none" stroke="#34d399" strokeWidth="12" strokeLinecap="round" opacity="0.7" />
          <path d="M 70 60 A 100 100 0 0 1 130 40" fill="none" stroke="#38bdf8" strokeWidth="12" strokeLinecap="round" opacity="0.7" />
          <path d="M 130 40 A 100 100 0 0 1 190 60" fill="none" stroke="#fbbf24" strokeWidth="12" strokeLinecap="round" opacity="0.7" />
          <path d="M 190 60 A 100 100 0 0 1 218 95" fill="none" stroke="#f97316" strokeWidth="12" strokeLinecap="round" opacity="0.7" />
          <path d="M 218 95 A 100 100 0 0 1 230 140" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" opacity="0.7" />
          {/* Needle */}
          <line
            x1="130" y1="140"
            x2={nx} y2={ny}
            stroke="var(--text-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle cx="130" cy="140" r="5" fill="var(--text-primary)" opacity="0.9" />
        </svg>
        <div className="score-value" style={{ color: band.color }}>
          {ai.toFixed(0)}
        </div>
      </div>

      <div className="score-band" style={{ color: band.color, borderColor: band.color }}>
        {band.label}
      </div>

      <div className="score-meta">
        <div className="score-meta-row">
          <span className="score-meta-label">1-Week Delta</span>
          <span className="score-meta-val" style={{ color: delta1w && delta1w > 0 ? 'var(--accent-rose)' : delta1w && delta1w < 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
            {formatDelta(delta1w)}
          </span>
        </div>
        <div className="score-meta-row">
          <span className="score-meta-label">4-Week Delta</span>
          <span className="score-meta-val" style={{ color: delta4w && delta4w > 0 ? 'var(--accent-rose)' : delta4w && delta4w < 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
            {formatDelta(delta4w)}
          </span>
        </div>
        <div className="score-meta-row">
          <span className="score-meta-label">External DI</span>
          <span className="score-meta-val">{di}</span>
        </div>
        <div className="score-meta-row">
          <span className="score-meta-label">DRT</span>
          <span className="score-meta-val">{drt}</span>
        </div>
        <div className="score-meta-row">
          <span className="score-meta-label">DMR</span>
          <span className="score-meta-val">{dmr}</span>
        </div>
      </div>

      {structural && (
        <div className="score-structural">
          STRUCTURAL REGIME SHIFT DETECTED
        </div>
      )}

      <div className="score-date">
        Week of {latest.week_start_date} &middot; v{latest.version || '6.0'}
      </div>
    </div>
  )
}
