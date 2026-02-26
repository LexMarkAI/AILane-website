import { useState, useEffect } from 'react'
import { fetchDomainScores, fetchCategoryScores } from '../api'
import Navbar from './Navbar'
import ScoreCard from './ScoreCard'
import TrendChart from './TrendChart'
import CategoryGrid from './CategoryGrid'
import Footer from './Footer'
import './Dashboard.css'

export default function Dashboard({ token, email, onLogout }) {
  const [domainScores, setDomainScores] = useState([])
  const [categoryScores, setCategoryScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [domain, categories] = await Promise.all([
          fetchDomainScores(token),
          fetchCategoryScores(token),
        ])
        setDomainScores(domain)
        setCategoryScores(categories)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const latest = domainScores.length > 0 ? domainScores[domainScores.length - 1] : null
  const previous = domainScores.length > 1 ? domainScores[domainScores.length - 2] : null
  const fourWeeksAgo = domainScores.length > 4 ? domainScores[domainScores.length - 5] : null

  return (
    <div className="dashboard">
      <Navbar email={email} onLogout={onLogout} />
      <main className="dashboard-main">
        {loading && <div className="dashboard-loading">Loading ACEI data...</div>}
        {error && <div className="dashboard-error">{error}</div>}
        {!loading && !error && latest && (
          <>
            <div className="dashboard-top">
              <ScoreCard
                latest={latest}
                previous={previous}
                fourWeeksAgo={fourWeeksAgo}
              />
              <TrendChart data={domainScores} />
            </div>
            <CategoryGrid categories={categoryScores} />
          </>
        )}
        {!loading && !error && !latest && (
          <div className="dashboard-empty">No ACEI data available yet. Check back after the next weekly computation.</div>
        )}
      </main>
      <Footer />
    </div>
  )
}
