import { useState, useRef } from 'react'
import './EarlyAccess.css'

export default function EarlyAccess() {
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef(null)

  function handleSubmit() {
    const input = inputRef.current
    if (input.value && input.value.includes('@')) {
      setSubmitted(true)
      input.value = ''
      input.style.borderColor = 'rgba(52,211,153,0.4)'
      setTimeout(() => { input.style.borderColor = '' }, 3000)
    } else {
      input.style.borderColor = 'rgba(251,113,133,0.6)'
      setTimeout(() => { input.style.borderColor = '' }, 2000)
    }
  }

  return (
    <section className="cta-section" id="early-access">
      <div className="container">
        <div className="section-label centered">EARLY ACCESS</div>
        <div className="section-title centered">Be first to quantify your exposure</div>
        <div className="section-desc centered">We're onboarding UK employers with 75–200 employees for early access to the ACEI platform. Limited places available.</div>
        <div className="cta-form">
          <input
            type="email"
            className="cta-input"
            ref={inputRef}
            placeholder="Work email address"
            aria-label="Work email address"
            required
          />
          <button type="button" className="btn-primary" onClick={handleSubmit} style={{ flexShrink: 0 }}>
            Request Access
          </button>
        </div>
        {submitted && (
          <p className="form-msg">Thanks — we'll be in touch shortly.</p>
        )}
      </div>
    </section>
  )
}
