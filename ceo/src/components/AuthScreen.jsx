import { useState } from 'react'
import { login, magicLink, recover } from '../auth'
import './AuthScreen.css'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (mode === 'reset') {
        await recover(email)
        setInfo('Check your email for a password reset link.')
      } else if (mode === 'magic') {
        await magicLink(email)
        setInfo('Check your email for a magic link.')
      } else {
        const data = await login(email, password)
        onAuth(data.access_token, email)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">AILANE <span>CEO</span></div>
        <h1 className="auth-title">
          {mode === 'login' && 'Command Centre \u2014 Sign In'}
          {mode === 'magic' && 'Command Centre \u2014 Magic Link'}
          {mode === 'reset' && 'Command Centre \u2014 Reset Password'}
        </h1>

        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError(''); setInfo('') }}
          >Login</button>
          <button
            className={`auth-tab${mode === 'magic' ? ' active' : ''}`}
            onClick={() => { setMode('magic'); setError(''); setInfo('') }}
          >Magic Link</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />
          {mode === 'login' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="auth-input"
            />
          )}
          {mode === 'login' && (
            <button
              type="button"
              className="auth-forgot"
              onClick={() => { setMode('reset'); setError(''); setInfo('') }}
            >Forgot password?</button>
          )}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Please wait...' :
              mode === 'reset' ? 'Send Reset Link' :
              mode === 'magic' ? 'Send Magic Link' : 'Sign In'}
          </button>
        </form>

        {mode === 'reset' && (
          <button
            type="button"
            className="auth-back"
            onClick={() => { setMode('login'); setError(''); setInfo('') }}
          >Back to login</button>
        )}

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <p className="auth-restricted">Restricted access — authorised personnel only</p>
      </div>

      <p className="auth-footer">
        AI Lane Limited (Company No. 17035654) trading as Ailane
      </p>
    </div>
  )
}
