import { useState, useEffect } from 'react'
import { getSession, getEmail, setSession, clearSession, parseHashToken } from './auth'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'

export default function App() {
  const [token, setToken] = useState(null)
  const [email, setEmail] = useState(null)

  useEffect(() => {
    const hashToken = parseHashToken()
    if (hashToken) {
      setSession(hashToken, '')
      setToken(hashToken)
      return
    }
    const saved = getSession()
    if (saved) {
      setToken(saved)
      setEmail(getEmail())
    }
  }, [])

  function handleAuth(accessToken, userEmail) {
    setSession(accessToken, userEmail)
    setToken(accessToken)
    setEmail(userEmail)
  }

  function handleLogout() {
    clearSession()
    setToken(null)
    setEmail(null)
  }

  if (!token) {
    return <AuthScreen onAuth={handleAuth} />
  }

  return <Dashboard token={token} email={email} onLogout={handleLogout} />
}
