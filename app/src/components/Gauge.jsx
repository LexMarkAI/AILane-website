import './Gauge.css'

export default function Gauge() {
  return (
    <div className="gauge-section">
      <div className="gauge-wrapper">
        <svg className="gauge-svg" viewBox="0 0 260 150">
          {/* Background arc */}
          <path d="M 30 140 A 100 100 0 0 1 230 140" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round"/>
          {/* Coloured segments */}
          <path d="M 30 140 A 100 100 0 0 1 70 60" fill="none" stroke="#34d399" strokeWidth="12" strokeLinecap="round" opacity="0.7"/>
          <path d="M 70 60 A 100 100 0 0 1 130 40" fill="none" stroke="#38bdf8" strokeWidth="12" strokeLinecap="round" opacity="0.7"/>
          <path d="M 130 40 A 100 100 0 0 1 190 60" fill="none" stroke="#fbbf24" strokeWidth="12" strokeLinecap="round" opacity="0.7"/>
          <path d="M 190 60 A 100 100 0 0 1 218 95" fill="none" stroke="#f97316" strokeWidth="12" strokeLinecap="round" opacity="0.7"/>
          <path d="M 218 95 A 100 100 0 0 1 230 140" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" opacity="0.7"/>
          {/* Needle */}
          <line x1="130" y1="140" x2="62" y2="78" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
            <animateTransform attributeName="transform" type="rotate" from="-90 130 140" to="-65 130 140" dur="1.5s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>
          </line>
          <circle cx="130" cy="140" r="5" fill="var(--text-primary)" opacity="0.9"/>
        </svg>
        <div className="gauge-value">14</div>
      </div>
      <div className="gauge-label">UK Market Baseline</div>
      <div className="gauge-sublabel">Low Exposure — as of February 2026</div>
    </div>
  )
}
