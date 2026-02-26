import './Navbar.css'

export default function Navbar() {
  return (
    <nav>
      <div className="nav-inner">
        <a href="#" className="logo">AILANE <span>ACEI</span></a>
        <ul>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#categories">Categories</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#early-access" className="nav-cta">Early Access</a></li>
        </ul>
      </div>
    </nav>
  )
}
