import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Line, ComposedChart } from 'recharts'
import './TrendChart.css'

const bands = [
  { y: 0, label: 'Low', color: '#34d399' },
  { y: 20, label: 'Controlled', color: '#38bdf8' },
  { y: 40, label: 'Elevated', color: '#fbbf24' },
  { y: 60, label: 'High', color: '#f97316' },
  { y: 80, label: 'Severe', color: '#ef4444' },
]

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="trend-tooltip">
      <div className="trend-tooltip-date">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="trend-tooltip-row">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span>{Number(p.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ data }) {
  const chartData = data.map((d) => ({
    date: formatDate(d.week_start_date),
    ai: Number(d.ai),
    di: d.di != null ? Number(d.di) : null,
  }))

  return (
    <div className="trend-card">
      <div className="trend-header">
        <span className="trend-label">ADJUSTED INDEX OVER TIME</span>
      </div>
      <div className="trend-chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#5a6478', fontSize: 10, fontFamily: 'Space Mono' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              tick={{ fill: '#5a6478', fontSize: 10, fontFamily: 'Space Mono' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            {bands.map((b) => (
              <ReferenceLine key={b.y} y={b.y} stroke={b.color} strokeOpacity={0.15} strokeDasharray="4 4" />
            ))}
            <Area
              type="monotone"
              dataKey="ai"
              name="Adjusted Index"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#aiGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#38bdf8' }}
            />
            <Line
              type="monotone"
              dataKey="di"
              name="External DI"
              stroke="#5a6478"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 3, fill: '#5a6478' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="trend-band-scale">
        {bands.map((b) => (
          <div key={b.label} className="trend-band-item" style={{ color: b.color }}>
            <span className="trend-band-dot" style={{ background: b.color }} />
            {b.label}
          </div>
        ))}
      </div>
    </div>
  )
}
