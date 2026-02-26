import { CATEGORY_META, COLOR_MAP } from '../categories'
import './CategoryGrid.css'

export default function CategoryGrid({ categories }) {
  return (
    <div className="cat-section">
      <div className="cat-header">
        <span className="cat-label">12-CATEGORY BREAKDOWN</span>
      </div>
      <div className="cat-grid">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat.category] || {
            num: '??',
            name: cat.category,
            color: 'cyan',
          }
          const color = COLOR_MAP[meta.color] || '#38bdf8'
          const crs = cat.crs != null ? Number(cat.crs) : 0
          const wcs = cat.wcs != null ? Number(cat.wcs) : 0
          const l = cat.l != null ? Number(cat.l).toFixed(2) : '—'
          const i = cat.i != null ? Number(cat.i).toFixed(2) : '—'

          return (
            <div className="cat-card" key={cat.category}>
              <div className="cat-card-accent" style={{ background: color }} />
              <div className="cat-card-num">CAT {meta.num}</div>
              <div className="cat-card-name">{meta.name}</div>
              <div className="cat-card-score" style={{ color }}>
                {crs.toFixed(1)}
              </div>
              <div className="cat-card-bar-bg">
                <div
                  className="cat-card-bar"
                  style={{ width: `${Math.min(crs, 100)}%`, background: color }}
                />
              </div>
              <div className="cat-card-details">
                <span>L: {l}</span>
                <span>I: {i}</span>
                <span>WCS: {wcs.toFixed(2)}</span>
              </div>
              {meta.uncapped && (
                <span className="cat-card-uncapped">UNCAPPED</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
