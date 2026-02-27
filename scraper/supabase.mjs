// Supabase REST API helpers — no SDK, just fetch.

const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g'

const REST = `${SUPABASE_URL}/rest/v1`

function headers() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: 'return=minimal',
  }
}

/**
 * Insert a single tribunal decision. Uses upsert with
 * on-conflict on source_identifier to skip duplicates.
 * Returns { inserted: true } or { inserted: false, reason }.
 */
export async function insertDecision(row) {
  const res = await fetch(`${REST}/tribunal_decisions`, {
    method: 'POST',
    headers: {
      ...headers(),
      Prefer: 'return=minimal,resolution=ignore-duplicates',
    },
    body: JSON.stringify(row),
  })

  if (res.status === 201) return { inserted: true }
  if (res.status === 409) return { inserted: false, reason: 'duplicate' }

  // Some Supabase versions return 200 for ignored duplicates
  if (res.ok) return { inserted: false, reason: 'duplicate' }

  const err = await res.text()
  return { inserted: false, reason: err }
}

/**
 * Insert decisions in batch. Uses upsert with ignore-duplicates.
 */
export async function insertDecisionsBatch(rows) {
  if (rows.length === 0) return { inserted: 0, skipped: 0, errors: 0 }

  const res = await fetch(`${REST}/tribunal_decisions`, {
    method: 'POST',
    headers: {
      ...headers(),
      Prefer: 'return=representation,resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  })

  if (res.ok) {
    const data = await res.json()
    const inserted = Array.isArray(data) ? data.length : 0
    return { inserted, skipped: rows.length - inserted, errors: 0 }
  }

  const err = await res.text()
  console.error(`  Batch insert error: ${err}`)
  return { inserted: 0, skipped: 0, errors: rows.length }
}

/**
 * Get existing source_identifiers to check for duplicates upfront.
 */
export async function getExistingIdentifiers() {
  const identifiers = new Set()
  let offset = 0
  const limit = 1000

  while (true) {
    const res = await fetch(
      `${REST}/tribunal_decisions?select=source_identifier&offset=${offset}&limit=${limit}`,
      { headers: headers() }
    )
    if (!res.ok) break

    const data = await res.json()
    if (data.length === 0) break

    for (const row of data) {
      identifiers.add(row.source_identifier)
    }
    offset += limit
    if (data.length < limit) break
  }

  return identifiers
}

/**
 * Log a scraper run to the scraper_runs table.
 */
export async function logRun(run) {
  const res = await fetch(`${REST}/scraper_runs`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify(run),
  })

  if (res.ok) {
    const data = await res.json()
    return Array.isArray(data) ? data[0] : data
  }

  const err = await res.text()
  console.error(`Failed to log run: ${err}`)
  return null
}

/**
 * Update an existing scraper run.
 */
export async function updateRun(id, updates) {
  const res = await fetch(`${REST}/scraper_runs?id=eq.${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`Failed to update run ${id}: ${err}`)
  }
}
