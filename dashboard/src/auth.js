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

export async function signup(email, password) {
  const res = await fetch(`${AUTH_BASE}/signup`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error_description || err.msg || 'Signup failed')
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

export async function recover(email) {
  const redirectTo = window.location.origin + window.location.pathname
  const res = await fetch(`${AUTH_BASE}/recover`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error_description || err.msg || 'Password reset failed')
  }
  return res.json()
}

export async function updatePassword(accessToken, newPassword) {
  const res = await fetch(`${AUTH_BASE}/user`, {
    method: 'PUT',
    headers: headers(accessToken),
    body: JSON.stringify({ password: newPassword }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error_description || err.msg || 'Password update failed')
  }
  return res.json()
}

export function parseHashToken() {
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const tokenType = params.get('token_type')
  const type = params.get('type')
  if (accessToken && tokenType === 'bearer') {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    return { token: accessToken, type: type || 'login' }
  }
  return null
}

export function getSession() {
  return sessionStorage.getItem('acei_token')
}

export function getEmail() {
  return sessionStorage.getItem('acei_email')
}

export function setSession(token, email) {
  sessionStorage.setItem('acei_token', token)
  if (email) sessionStorage.setItem('acei_email', email)
}

export function clearSession() {
  sessionStorage.removeItem('acei_token')
  sessionStorage.removeItem('acei_email')
}
