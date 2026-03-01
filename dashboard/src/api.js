import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

const REST_BASE = `${SUPABASE_URL}/rest/v1`
const MARKET_ORG = '00000000-0000-0000-0000-000000000000'

function headers(token) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
  }
}

export async function fetchDomainScores(token, limit = 12) {
  const res = await fetch(
    `${REST_BASE}/acei_domain_scores?org_id=eq.${MARKET_ORG}&order=week_start_date.desc&limit=${limit}&select=week_start_date,di,ai,drt,dmr,delta_weekly,structural_flag,version`,
    { headers: headers(token) }
  )
  if (!res.ok) throw new Error('Failed to load domain scores')
  return res.json()
}

export async function fetchCategoryScores(token, weekDate) {
  const res = await fetch(
    `${REST_BASE}/acei_category_scores?org_id=eq.${MARKET_ORG}&week_start_date=eq.${weekDate}&select=category,l,i,crs,wcs,wcs_pre,v_category,v_domain,sm,jm&order=category`,
    { headers: headers(token) }
  )
  if (!res.ok) throw new Error('Failed to load category scores')
  return res.json()
}
