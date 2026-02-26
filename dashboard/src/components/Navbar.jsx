import './Navbar.css'

export default function Navbar({ email, onLogout }) {
  return (
    <nav className="dash-nav">
      <div className="dash-nav-inner">
        <div className="dash-nav-left">
          <span className="dash-logo">AILANE <span className="dash-logo-sub">ACEI</span></span>
          <span className="dash-version">v6.0</span>
        </div>
        <div className="dash-nav-right">
          {email && <span className="dash-email">{email}</span>}
          <button className="dash-logout" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </nav>
  )
}
