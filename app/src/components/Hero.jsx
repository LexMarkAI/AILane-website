import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-badge">ACEI VERSION 6.0 — NOW LIVE</div>
        <h1>A credit score for your <em>regulatory exposure</em></h1>
        <p>The Ailane Core Exposure Index monitors UK employment tribunal activity across 12 categories and quantifies your risk on a 0–100 scale. Built for businesses with 75–200 employees.</p>
        <div className="hero-actions">
          <a href="#early-access" className="btn-primary">Request Early Access</a>
          <a href="#how" className="btn-secondary">See How It Works</a>
        </div>
      </div>
    </section>
  )
}
