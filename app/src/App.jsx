import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Gauge from './components/Gauge'
import Problem from './components/Problem'
import HowItWorks from './components/HowItWorks'
import Categories from './components/Categories'
import ExposureBands from './components/ExposureBands'
import Pricing from './components/Pricing'
import Governance from './components/Governance'
import EarlyAccess from './components/EarlyAccess'
import Footer from './components/Footer'

function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <Gauge />
      <div className="divider" />
      <Problem />
      <div className="divider" />
      <HowItWorks />
      <div className="divider" />
      <Categories />
      <div className="divider" />
      <ExposureBands />
      <div className="divider" />
      <Pricing />
      <div className="divider" />
      <Governance />
      <div className="divider" />
      <EarlyAccess />
      <Footer />
    </>
  )
}

export default App
