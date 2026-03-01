import { useState, useEffect } from 'react'
import { getSession, getEmail, setSession, clearSession, parseHashToken, updatePassword } from './auth'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'

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
          <div className="auth-logo">AILANE <span>ACEI</span></div>
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
        <div className="auth-logo">AILANE <span>ACEI</span></div>
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
  const [email, setEmail] = useState(null)
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

  if (recoveryToken) {
    return <SetNewPassword recoveryToken={recoveryToken} onDone={() => setRecoveryToken(null)} />
  }

  if (!token) {
    return <AuthScreen onAuth={handleAuth} />
  }

  return <Dashboard token={token} email={email} onLogout={handleLogout} />
}
