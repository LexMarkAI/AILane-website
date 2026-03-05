import { useState, useEffect, Component } from 'react'
import { getSession, getEmail, setSession, clearSession, parseHashToken, updatePassword } from './auth'
import { ALLOWED_EMAIL } from './config'
import AuthScreen from './components/AuthScreen'
import CEODashboard from './components/CEODashboard'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 24,
          background: '#080E1A', color: '#E0E0E0', fontFamily: 'monospace',
        }}>
          <h1 style={{ fontSize: 20, marginBottom: 16, color: '#E74C3C' }}>Dashboard Error</h1>
          <pre style={{
            background: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 8,
            maxWidth: 600, overflow: 'auto', fontSize: 13, lineHeight: 1.6,
          }}>
            {this.state.error?.message || 'Unknown error'}
            {'\n\n'}
            {this.state.error?.stack || ''}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); this.props.onReset?.() }}
            style={{
              marginTop: 20, background: '#2E75B6', color: '#fff', border: 'none',
              borderRadius: 6, padding: '10px 24px', fontSize: 14, cursor: 'pointer',
            }}
          >Sign Out &amp; Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}

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
      background: '#080E1A',
      color: '#E0E0E0',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: '48px 40px',
        maxWidth: 440,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F6AB;</div>
        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 12,
        }}>Access Denied</h1>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 14,
          marginBottom: 8,
        }}>
          The CEO Command Centre is restricted.
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 13,
          marginBottom: 24,
        }}>
          Signed in as <strong style={{ color: '#E74C3C' }}>{email}</strong>
        </p>
        <button onClick={onLogout} style={{
          background: '#2E75B6',
          color: '#fff',
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

function SetNewPassword({ recoveryToken, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await updatePassword(recoveryToken, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-logo">AILANE <span>CEO</span></div>
          <h1 className="auth-title">Password updated</h1>
          <p style={{ textAlign: 'center', color: 'var(--accent-emerald)', fontSize: 14, marginBottom: 24 }}>
            Your password has been changed successfully.
          </p>
          <button className="auth-btn" onClick={onDone}>Sign in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">AILANE <span>CEO</span></div>
        <h1 className="auth-title">Set new password</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="auth-input"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className="auth-input"
          />
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(null)
  const [email, setEmailState] = useState(null)
  const [recoveryToken, setRecoveryToken] = useState(null)

  useEffect(() => {
    const hashResult = parseHashToken()
    if (hashResult) {
      if (hashResult.type === 'recovery') {
        setRecoveryToken(hashResult.token)
        return
      }
      setSession(hashResult.token, '')
      setToken(hashResult.token)
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
    window.location.href = '/dashboard/router/'
  }

  function handleLogout() {
    clearSession()
    setToken(null)
    setEmailState(null)
  }

  if (recoveryToken) {
    return <SetNewPassword recoveryToken={recoveryToken} onDone={() => setRecoveryToken(null)} />
  }

  if (!token) {
    return <AuthScreen onAuth={handleAuth} />
  }

  if (email && email.toLowerCase() !== ALLOWED_EMAIL) {
    return <AccessDenied email={email} onLogout={handleLogout} />
  }

  return (
    <ErrorBoundary onReset={handleLogout}>
      <CEODashboard onLogout={handleLogout} />
    </ErrorBoundary>
  )
}
