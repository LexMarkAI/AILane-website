import './Governance.css'

const cards = [
  { title: 'Article I — Determinism', desc: 'Identical inputs always produce identical outputs. Stochastic elements are prohibited in live scoring. Every weekly value is reproducible within 24 hours.' },
  { title: 'Article IV — Calibration', desc: 'DomainMaxReference set at 95th percentile via Monte Carlo simulation (1,000+ runs). Prevents premature saturation and preserves structural escalation headroom.' },
  { title: 'Article V — Structural Shifts', desc: 'Distinguishes ordinary volatility from fundamental regulatory transformation. Requires both quantitative threshold AND qualifying legal trigger. Shock Caps enforce bounded movement.' },
  { title: 'Article XII — Amendments', desc: 'Major changes require 75% supermajority plus external advisory review. 24-month backtesting mandatory. Non-retroactive — historical scores are permanent.' },
]

export default function Governance() {
  return (
    <section>
      <div className="container">
        <div className="section-label centered">INSTITUTIONAL GOVERNANCE</div>
        <div className="section-title centered">Built like a financial index, not a newsletter</div>
        <div className="section-desc centered">The ACEI is governed by a published constitutional framework with formal amendment protocols, version control, and audit reproducibility — the same infrastructure that underpins indices like the FTSE and S&amp;P.</div>
        <div className="governance-grid">
          {cards.map((c, i) => (
            <div className="gov-card" key={i}>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
