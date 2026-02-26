import { useState } from 'react'
import { login, signup, magicLink } from '../auth'
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
      if (mode === 'magic') {
        await magicLink(email)
        setInfo('Check your email for a magic link.')
      } else if (mode === 'signup') {
        const data = await signup(email, password)
        if (data.access_token) {
          onAuth(data.access_token, email)
        } else {
          setInfo('Check your email to confirm your account.')
        }
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
        <div className="auth-logo">AILANE <span>ACEI</span></div>
        <h1 className="auth-title">
          {mode === 'login' && 'Sign in to your dashboard'}
          {mode === 'signup' && 'Create your account'}
          {mode === 'magic' && 'Sign in with magic link'}
        </h1>

        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError(''); setInfo('') }}
          >Login</button>
          <button
            className={`auth-tab${mode === 'signup' ? ' active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); setInfo('') }}
          >Sign Up</button>
          <button
            className={`auth-tab${mode === 'magic' ? ' active' : ''}`}
            onClick={() => { setMode('magic'); setError(''); setInfo('') }}
          >Magic Link</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Work email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />
          {mode !== 'magic' && (
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
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'magic' ? 'Send Magic Link' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}
      </div>

      <p className="auth-footer">
        AI Lane Limited (Company No. 17035654) trading as Ailane
      </p>
    </div>
  )
}
