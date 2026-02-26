import './HowItWorks.css'

const steps = [
  { num: '01 — MONITOR', title: 'Automated Surveillance', desc: 'Continuous scraping of GOV.UK employment tribunal decisions, statutory instruments, and enforcement bulletins. Every relevant signal captured in real time.' },
  { num: '02 — CLASSIFY', title: '12-Category Taxonomy', desc: 'Each event is deterministically assigned to one of 12 constitutional categories using overlap allocation rules. No ambiguity, no miscellaneous bucket.' },
  { num: '03 — SCORE', title: 'Mathematical Engine', desc: 'Likelihood × Impact × Sector Multiplier × Jurisdiction Multiplier × Velocity Adjustment. Eight sequential computation steps, fully reproducible within 24 hours.' },
  { num: '04 — QUANTIFY', title: 'Your ACEI Score', desc: 'A single 0–100 number reflecting your aggregate regulatory exposure. Calibrated against Monte Carlo simulations. Bounded by constitutional shock caps and velocity controls.' },
]

export default function HowItWorks() {
  return (
    <section id="how">
      <div className="container">
        <div className="section-label centered">HOW IT WORKS</div>
        <div className="section-title centered">From raw tribunal data to a single number</div>
        <div className="section-desc centered">The ACEI pipeline transforms unstructured regulatory activity into a deterministic, reproducible exposure score governed by a public constitutional framework.</div>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step" key={i}>
              <div className="step-number">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
