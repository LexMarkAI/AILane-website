import { useEffect, useRef } from 'react'
import './ExposureBands.css'

const bands = [
  { range: '0 – 20', cls: 'band-low', label: 'Low Exposure' },
  { range: '21 – 40', cls: 'band-controlled', label: 'Controlled Exposure' },
  { range: '41 – 60', cls: 'band-elevated', label: 'Elevated Exposure' },
  { range: '61 – 80', cls: 'band-high', label: 'High Exposure' },
  { range: '81 – 100', cls: 'band-severe', label: 'Severe Exposure' },
]

export default function ExposureBands() {
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.querySelectorAll('.band-bar').forEach((bar) => {
              bar.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)'
            })
          }
        })
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section>
      <div className="container">
        <div className="section-label centered">INTERPRETATION</div>
        <div className="section-title centered">What your score means</div>
        <div className="section-desc centered">Like a credit score, the ACEI translates complex data into a single actionable number. Interpretation bands give instant context.</div>
        <div className="bands-container" ref={containerRef}>
          {bands.map((b) => (
            <div className={`band-row ${b.cls}`} key={b.cls}>
              <div className="band-range">{b.range}</div>
              <div className="band-bar-bg"><div className="band-bar"></div></div>
              <div className="band-label">{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
