import './Problem.css'

const problems = [
  {
    icon: '🔍',
    title: 'Invisible Exposure',
    desc: 'Employment law changes constantly — tribunal decisions, enforcement campaigns, legislative amendments. Without systematic monitoring, your business accumulates risk silently.',
  },
  {
    icon: '📊',
    title: 'Fragmented Intelligence',
    desc: 'Legal updates scattered across newsletters, law firm bulletins and government gazettes. No single source quantifies what it all means for your specific exposure profile.',
  },
  {
    icon: '🎯',
    title: 'One-Size-Fits-All Advice',
    desc: 'Generic guidance doesn\'t account for your sector, jurisdiction, or workforce composition. A London financial services firm faces fundamentally different exposure than a Midlands manufacturer.',
  },
]

export default function Problem() {
  return (
    <section>
      <div className="container">
        <div className="section-label">THE PROBLEM</div>
        <div className="section-title">Compliance risk you can feel but can't measure</div>
        <div className="section-desc">Mid-sized UK employers face a regulatory environment that shifts weekly. Without quantified intelligence, exposure is invisible until it becomes a tribunal claim.</div>
        <div className="problem-grid">
          {problems.map((p, i) => (
            <div className="problem-card" key={i}>
              <div className="problem-icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
