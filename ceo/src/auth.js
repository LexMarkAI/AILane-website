import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

const AUTH_BASE = `${SUPABASE_URL}/auth/v1`

function headers(token) {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
  }
}

export async function login(email, password) {
  const res = await fetch(`${AUTH_BASE}/token?grant_type=password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error_description || err.msg || 'Login failed')
  }
  return res.json()
}

export async function magicLink(email) {
  const res = await fetch(`${AUTH_BASE}/magiclink`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error_description || err.msg || 'Magic link failed')
  }
  return res.json()
}

export function parseHashToken() {
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const tokenType = params.get('token_type')
  if (accessToken && tokenType === 'bearer') {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    return accessToken
  }
  return null
}

export function getSession() {
  return sessionStorage.getItem('ceo_token')
}

export function getEmail() {
  return sessionStorage.getItem('ceo_email')
}

export function setSession(token, email) {
  sessionStorage.setItem('ceo_token', token)
  if (email) sessionStorage.setItem('ceo_email', email)
}

export function clearSession() {
  sessionStorage.removeItem('ceo_token')
  sessionStorage.removeItem('ceo_email')
}
