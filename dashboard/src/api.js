import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

const REST_BASE = `${SUPABASE_URL}/rest/v1`

function headers(token) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  }
}

export async function fetchDomainScores(token) {
  const res = await fetch(
    `${REST_BASE}/acei_domain_scores?order=week_start_date.asc`,
    { headers: headers(token) }
  )
  if (!res.ok) throw new Error('Failed to load domain scores')
  return res.json()
}

export async function fetchCategoryScores(token, weekDate) {
  const url = weekDate
    ? `${REST_BASE}/acei_category_scores?week_start_date=eq.${weekDate}&order=category.asc`
    : `${REST_BASE}/acei_category_scores?order=week_start_date.desc,category.asc&limit=12`
  const res = await fetch(url, { headers: headers(token) })
  if (!res.ok) throw new Error('Failed to load category scores')
  return res.json()
}
