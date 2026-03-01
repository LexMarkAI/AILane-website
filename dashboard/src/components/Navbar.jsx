import { formatDate } from '../categories'
import './Navbar.css'

export default function Navbar({ email, version, weekDate, onLogout }) {
  return (
    <nav className="dash-nav">
      <div className="dash-nav-inner">
        <div className="dash-nav-left">
          <span className="dash-logo">AILANE <span className="dash-logo-sub">ACEI</span></span>
          <div className="dash-nav-sep" />
          <span className="dash-nav-label">Core Exposure Index</span>
        </div>
        <div className="dash-nav-right">
          <span className="dash-live-badge">{'\u25CF'} LIVE</span>
          {version && weekDate && (
            <span className="dash-nav-meta">{version} {'\u00B7'} {formatDate(weekDate)}</span>
          )}
          {email && <span className="dash-email">{email}</span>}
          <button className="dash-logout" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </nav>
  )
}
