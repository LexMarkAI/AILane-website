import { useState, useEffect } from 'react'
import { getSession, getEmail, setSession, clearSession, parseHashToken } from './auth'
import { ALLOWED_EMAIL } from './config'
import AuthScreen from './components/AuthScreen'
import CEODashboard from './components/CEODashboard'

function AccessDenied({ email, onLogout }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 16,
        padding: '48px 40px',
        maxWidth: 440,
      }}>
        <div style={{
          fontSize: 48,
          marginBottom: 16,
        }}>&#x1F6AB;</div>
        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 12,
        }}>Access Denied</h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: 14,
          marginBottom: 8,
        }}>
          The CEO Command Centre is restricted.
        </p>
        <p style={{
          color: 'var(--text-muted)',
          fontSize: 13,
          marginBottom: 24,
        }}>
          Signed in as <strong style={{ color: 'var(--accent-rose)' }}>{email}</strong>
        </p>
        <button onClick={onLogout} style={{
          background: 'var(--accent-cyan)',
          color: 'var(--bg-primary)',
          border: 'none',
          borderRadius: 8,
          padding: '12px 32px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}>Sign Out</button>
      </div>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(null)
  const [email, setEmailState] = useState(null)

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
      setEmailState(getEmail())
    }
  }, [])

  function handleAuth(accessToken, userEmail) {
    setSession(accessToken, userEmail)
    setToken(accessToken)
    setEmailState(userEmail)
  }

  function handleLogout() {
    clearSession()
    setToken(null)
    setEmailState(null)
  }

  if (!token) {
    return <AuthScreen onAuth={handleAuth} />
  }

  if (email && email.toLowerCase() !== ALLOWED_EMAIL) {
    return <AccessDenied email={email} onLogout={handleLogout} />
  }

  return <CEODashboard onLogout={handleLogout} />
}
