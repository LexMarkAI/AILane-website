import './Pricing.css'

const plans = [
  {
    tier: 'Monitor',
    price: '£49',
    desc: 'Weekly market-level exposure intelligence for compliance-aware teams getting started.',
    features: [
      'Weekly ACEI Public Index (0–100)',
      '12-category exposure summary',
      'Weekly delta & 4-week trend',
      'Structural Regime Shift alerts',
      'Email delivery every Monday',
    ],
    btnClass: 'price-btn-outline',
    btnText: 'Get Started',
  },
  {
    tier: 'Professional',
    price: '£149',
    desc: 'Category-level intelligence with sector and jurisdiction calibration for your specific risk profile.',
    featured: true,
    features: [
      'Everything in Monitor',
      'Category-level score breakdown',
      'Sector Multiplier calibration',
      'Jurisdiction Multiplier calibration',
      'Velocity momentum indicators',
      'Forward Exposure Register access',
      'Up to 5 mitigation credits per quarter',
    ],
    btnClass: 'price-btn-primary',
    btnText: 'Request Access',
  },
  {
    tier: 'Enterprise',
    price: '£399',
    desc: 'Full constitutional framework access with dedicated mitigation support and multi-jurisdiction aggregation.',
    features: [
      'Everything in Professional',
      'Unlimited mitigation credits',
      'Tier I–III evidentiary framework',
      'Multi-jurisdiction workforce weighting',
      'Severity Concentration Flags',
      'API access (read-only)',
      'Quarterly governance briefing',
      'Priority Structural Regime Shift notifications',
    ],
    btnClass: 'price-btn-outline',
    btnText: 'Contact Us',
  },
]

export default function Pricing() {
  return (
    <section id="pricing">
      <div className="container">
        <div className="section-label centered">PRICING</div>
        <div className="section-title centered">Intelligence that scales with your risk profile</div>
        <div className="section-desc centered">All plans include the weekly Public ACEI Index. Higher tiers unlock category-level breakdowns, sector adjustments, and constitutional mitigation credits.</div>
        <div className="pricing-grid">
          {plans.map((p) => (
            <div className={`price-card${p.featured ? ' featured' : ''}`} key={p.tier}>
              {p.featured && <div className="popular-badge">MOST POPULAR</div>}
              <div className="price-tier">{p.tier}</div>
              <div className="price-amount">{p.price} <span>/month</span></div>
              <div className="price-desc">{p.desc}</div>
              <ul className="price-features">
                {p.features.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              <a href="#early-access" className={`price-btn ${p.btnClass}`}>{p.btnText}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
