import { useEffect, useRef } from 'react'

export default function Sparkline({ data, width = 320, height = 50, className }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data || !data.length) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    // Use container width if available for responsiveness
    const w = containerRef.current ? containerRef.current.offsetWidth : width
    const h = height

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.scale(dpr, dpr)

    const values = data.map(d => d.di)
    const min = Math.min(...values) - 3
    const max = Math.max(...values) + 3
    const stepX = w / (values.length - 1)

    // Fill gradient
    ctx.beginPath()
    values.forEach((v, i) => {
      const x = i * stepX
      const y = h - ((v - min) / (max - min)) * (h - 8) - 4
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, 'rgba(56,189,248,0.18)')
    grad.addColorStop(1, 'rgba(56,189,248,0)')
    ctx.fillStyle = grad
    ctx.fill()

    // Line
    ctx.beginPath()
    values.forEach((v, i) => {
      const x = i * stepX
      const y = h - ((v - min) / (max - min)) * (h - 8) - 4
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2
    ctx.stroke()

    // End dot
    const lastX = (values.length - 1) * stepX
    const lastY = h - ((values[values.length - 1] - min) / (max - min)) * (h - 8) - 4
    ctx.beginPath()
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#38bdf8'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(lastX, lastY, 8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(56,189,248,0.2)'
    ctx.fill()

    // Band threshold lines
    ;[20, 40, 60, 80].forEach(threshold => {
      if (threshold >= min && threshold <= max) {
        const y = h - ((threshold - min) / (max - min)) * (h - 8) - 4
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 4])
        ctx.stroke()
        ctx.setLineDash([])
      }
    })
  }, [data, width, height])

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', maxWidth: width }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
