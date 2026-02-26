import './Categories.css'

const categories = [
  { num: '01', color: 'rose', title: 'Unfair Dismissal & Wrongful Termination', desc: 'Substantive, procedural & constructive dismissal claims' },
  { num: '02', color: 'rose', title: 'Discrimination & Harassment', desc: 'All 9 protected characteristics, equal pay, victimisation', uncapped: true },
  { num: '03', color: 'amber', title: 'Wages, Working Time & Holiday Pay', desc: 'NMW/NLW violations, WTD breaches, holiday pay errors' },
  { num: '04', color: 'rose', title: 'Whistleblowing & Protected Disclosures', desc: 'PIDA claims, detriment, dismissal, NDA disputes', uncapped: true },
  { num: '05', color: 'violet', title: 'Employment Status & Worker Classification', desc: 'IR35, gig economy, zero-hours, umbrella companies' },
  { num: '06', color: 'amber', title: 'Redundancy & Organisational Change', desc: 'Collective consultation, TUPE, protective awards' },
  { num: '07', color: 'emerald', title: 'Parental & Family Rights', desc: 'Maternity, paternity, shared parental, flexible working' },
  { num: '08', color: 'cyan', title: 'Trade Union & Collective Rights', desc: 'Recognition, blacklisting, industrial action protections' },
  { num: '09', color: 'amber', title: 'Breach of Contract & Notice Disputes', desc: 'PILON, garden leave, restrictive covenants, bonus claims' },
  { num: '10', color: 'emerald', title: 'Health & Safety Protections', desc: 'H&S detriment, unsafe work refusal, RIDDOR disputes' },
  { num: '11', color: 'violet', title: 'Data Protection & Employee Privacy', desc: 'GDPR Art.88, SAR disputes, AI recruitment, ICO exposure' },
  { num: '12', color: 'cyan', title: 'Business Transfers & Insolvency', desc: 'NIF claims, administration disputes, preferential creditor' },
]

export default function Categories() {
  return (
    <section id="categories">
      <div className="container">
        <div className="section-label centered">COVERAGE</div>
        <div className="section-title centered">12 categories of employment tribunal exposure</div>
        <div className="section-desc centered">Version 6.0 expanded coverage from 5 to 12 discrete categories, eliminating blindspots in whistleblowing, parental rights, trade union obligations, health &amp; safety, data protection and contractual disputes.</div>
        <div className="categories-grid">
          {categories.map((c) => (
            <div className="cat-card" data-color={c.color} key={c.num}>
              <div className="cat-num">CATEGORY {c.num}</div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              {c.uncapped && <span className="uncapped-tag">UNCAPPED</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
