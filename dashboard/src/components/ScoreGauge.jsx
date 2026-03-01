import { useState, useEffect, useRef } from 'react'
import { BANDS, getBand } from '../categories'

export default function ScoreGauge({ score, size = 200 }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const band = getBand(score)

  useEffect(() => {
    let frame = 0
    const totalFrames = 90
    const ease = (t) => 1 - Math.pow(1 - t, 3)
    const animate = () => {
      frame++
      const progress = ease(Math.min(frame / totalFrames, 1))
      setAnimatedScore(Math.round(progress * score))
      if (frame < totalFrames) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    const timeout = setTimeout(animate, 400)
    return () => {
      clearTimeout(timeout)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [score])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2, cy = size / 2, radius = size / 2 - 20
    const startAngle = 0.75 * Math.PI, endAngle = 2.25 * Math.PI
    const totalArc = endAngle - startAngle

    // Background track
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, endAngle)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 14
    ctx.lineCap = 'round'
    ctx.stroke()

    // Band segments
    BANDS.forEach((b) => {
      const segStart = startAngle + (b.min / 100) * totalArc
      const segEnd = startAngle + ((b.max + 1) / 100) * totalArc
      ctx.beginPath()
      ctx.arc(cx, cy, radius, segStart, segEnd)
      ctx.strokeStyle = b.hex + '33'
      ctx.lineWidth = 14
      ctx.lineCap = 'butt'
      ctx.stroke()
    })

    // Active arc
    const scoreAngle = startAngle + (animatedScore / 100) * totalArc
    const gradient = ctx.createLinearGradient(0, size, size, 0)
    gradient.addColorStop(0, band.hex + '88')
    gradient.addColorStop(1, band.hex)
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, scoreAngle)
    ctx.strokeStyle = gradient
    ctx.lineWidth = 14
    ctx.lineCap = 'round'
    ctx.stroke()

    // Glow
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, scoreAngle)
    ctx.strokeStyle = band.hex + '44'
    ctx.lineWidth = 24
    ctx.lineCap = 'round'
    ctx.stroke()

    // Tick marks
    for (let i = 0; i <= 100; i += 10) {
      const angle = startAngle + (i / 100) * totalArc
      const innerR = i % 20 === 0 ? radius - 22 : radius - 18
      const outerR = radius - 10
      ctx.beginPath()
      ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle))
      ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle))
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = i % 20 === 0 ? 2 : 1
      ctx.stroke()
    }
  }, [animatedScore, size, band])

  return (
    <div className="gauge-wrap" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      <div className="gauge-center">
        <div className="gauge-score" style={{ color: band.hex }}>{animatedScore}</div>
        <div className="gauge-sublabel">Domain Index</div>
      </div>
      <div className="gauge-band-pill" style={{ background: band.hex + '18', borderColor: band.hex + '44' }}>
        <span style={{ color: band.hex }}>{band.label.toUpperCase()}</span>
      </div>
    </div>
  )
}
