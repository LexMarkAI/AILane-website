#!/usr/bin/env node

/**
 * GOV.UK Employment Tribunal Decisions Scraper
 *
 * Fetches tribunal decisions from the GOV.UK Search API, classifies each
 * into one of 12 ACEI categories, and inserts into Supabase.
 *
 * Usage:
 *   node scraper/scrape.mjs                  # scrape all available pages
 *   node scraper/scrape.mjs --max-pages 5    # limit to 5 pages (5000 results)
 *   node scraper/scrape.mjs --start 2000     # start from offset 2000
 *
 * GOV.UK Search API:
 *   - Endpoint: https://www.gov.uk/api/search.json
 *   - Filter:   filter_document_type=employment_tribunal_decision
 *   - Pagination: count (max 1000) + start offset
 */

import { classify } from './classifier.mjs'
import {
  getExistingIdentifiers,
  insertDecisionsBatch,
  logRun,
  updateRun,
} from './supabase.mjs'

const SEARCH_API = 'https://www.gov.uk/api/search.json'
const CONTENT_API = 'https://www.gov.uk/api/content'
const BATCH_SIZE = 50
const PAGE_SIZE = 1000 // max allowed by GOV.UK API
const DELAY_MS = 500   // polite delay between API calls

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { maxPages: Infinity, startOffset: 0 }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-pages' && args[i + 1]) {
      opts.maxPages = parseInt(args[++i], 10)
    }
    if (args[i] === '--start' && args[i + 1]) {
      opts.startOffset = parseInt(args[++i], 10)
    }
  }
  return opts
}

/**
 * Fetch a page of tribunal decision listings from the GOV.UK Search API.
 */
async function fetchListingPage(start) {
  const url = `${SEARCH_API}?filter_document_type=employment_tribunal_decision&count=${PAGE_SIZE}&start=${start}&fields=title,link,public_timestamp,tribunal_decision_categories,tribunal_decision_country,tribunal_decision_decision_date,description`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Search API returned ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  return {
    results: data.results || [],
    total: data.total || 0,
  }
}

/**
 * Fetch the full content of a single decision page from the GOV.UK Content API.
 * Returns the HTML body and metadata.
 */
async function fetchDecisionDetail(path) {
  const url = `${CONTENT_API}${path}`
  const res = await fetch(url)
  if (!res.ok) return null

  const data = await res.json()
  const details = data.details || {}

  // Extract the decision body — usually in details.body or details.headers
  let bodyText = ''
  if (details.body) {
    // Strip HTML tags for classification
    bodyText = details.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  // Extract metadata
  const metadata = data.details?.metadata || {}
  const tribunalOffice =
    metadata.tribunal_decision_country ||
    (data.links?.organisations?.[0]?.title) ||
    ''

  const decisionDate =
    metadata.tribunal_decision_decision_date ||
    data.public_updated_at?.split('T')[0] ||
    null

  return {
    bodyText,
    tribunalOffice,
    decisionDate,
  }
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Build a tribunal_decisions row from a search result + detail page.
 */
function buildRow(result, detail) {
  const title = result.title || ''
  const link = result.link || ''
  const sourceIdentifier = link // e.g. /employment-tribunal-decisions/some-case-123

  const bodyText = detail?.bodyText || stripHtml(result.description) || ''
  const category = classify(title, bodyText)

  return {
    title,
    source_url: `https://www.gov.uk${link}`,
    source_identifier: sourceIdentifier,
    decision_date: detail?.decisionDate || result.tribunal_decision_decision_date || null,
    tribunal_office: detail?.tribunalOffice || '',
    raw_html: bodyText.slice(0, 50000), // cap at 50k chars
    acei_category: category,
    scraped_at: new Date().toISOString(),
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs()

  console.log('=== ACEI GOV.UK Tribunal Scraper ===')
  console.log(`Started: ${new Date().toISOString()}`)
  console.log()

  // Log the run
  const run = await logRun({
    started_at: new Date().toISOString(),
    status: 'running',
    source: 'gov.uk',
    decisions_found: 0,
    decisions_new: 0,
    decisions_duplicate: 0,
    errors: 0,
  })
  const runId = run?.id

  // Load existing identifiers to skip duplicates upfront
  console.log('Loading existing decisions from Supabase...')
  const existing = await getExistingIdentifiers()
  console.log(`  Found ${existing.size} existing decisions`)
  console.log()

  let totalScraped = 0
  let totalInserted = 0
  let totalSkipped = 0
  let totalErrors = 0
  let pageNum = 0
  let start = opts.startOffset

  try {
    // First request to get total count
    console.log('Fetching first page to get total count...')
    const firstPage = await fetchListingPage(start)
    const totalAvailable = firstPage.total
    console.log(`  Total decisions available on GOV.UK: ${totalAvailable}`)
    console.log()

    let results = firstPage.results

    while (results.length > 0 && pageNum < opts.maxPages) {
      pageNum++
      console.log(`--- Page ${pageNum} (offset ${start}, ${results.length} results) ---`)

      // Filter out already-existing decisions
      const newResults = results.filter((r) => !existing.has(r.link))
      const skippedCount = results.length - newResults.length

      if (skippedCount > 0) {
        console.log(`  Skipping ${skippedCount} already-existing decisions`)
      }

      totalSkipped += skippedCount
      totalScraped += results.length

      // Process new results in batches
      const rows = []
      for (let i = 0; i < newResults.length; i++) {
        const result = newResults[i]

        // Fetch detail page for full text + metadata
        let detail = null
        try {
          detail = await fetchDecisionDetail(result.link)
          await sleep(200) // be polite to GOV.UK
        } catch (err) {
          console.error(`  Error fetching ${result.link}: ${err.message}`)
        }

        const row = buildRow(result, detail)
        rows.push(row)
        existing.add(result.link) // track in-flight

        // Insert in batches
        if (rows.length >= BATCH_SIZE) {
          const batch = rows.splice(0, rows.length)
          const res = await insertDecisionsBatch(batch)
          totalInserted += res.inserted
          totalErrors += res.errors
          console.log(`  Inserted batch: ${res.inserted} new, ${res.skipped} skipped, ${res.errors} errors`)
        }

        // Progress
        if ((i + 1) % 20 === 0) {
          console.log(`  Processed ${i + 1}/${newResults.length} decisions on this page`)
        }
      }

      // Insert remaining rows
      if (rows.length > 0) {
        const res = await insertDecisionsBatch(rows)
        totalInserted += res.inserted
        totalErrors += res.errors
        console.log(`  Inserted final batch: ${res.inserted} new, ${res.skipped} skipped, ${res.errors} errors`)
      }

      // Update run progress
      if (runId) {
        await updateRun(runId, {
          decisions_found: totalScraped,
          decisions_new: totalInserted,
          decisions_duplicate: totalSkipped,
          errors: totalErrors,
        })
      }

      // Next page
      start += PAGE_SIZE
      if (start >= totalAvailable) {
        console.log('\n  Reached end of available results.')
        break
      }

      console.log()
      await sleep(DELAY_MS)

      const nextPage = await fetchListingPage(start)
      results = nextPage.results
    }
  } catch (err) {
    console.error(`\nFATAL ERROR: ${err.message}`)
    totalErrors++

    if (runId) {
      await updateRun(runId, {
        status: 'error',
        completed_at: new Date().toISOString(),
        decisions_found: totalScraped,
        decisions_new: totalInserted,
        decisions_duplicate: totalSkipped,
        errors: totalErrors,
        error_message: err.message,
      })
    }
    process.exit(1)
  }

  // Finalize run
  if (runId) {
    await updateRun(runId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      decisions_found: totalScraped,
      decisions_new: totalInserted,
      decisions_duplicate: totalSkipped,
      errors: totalErrors,
    })
  }

  console.log()
  console.log('=== Scraper Complete ===')
  console.log(`  Pages processed: ${pageNum}`)
  console.log(`  Decisions scraped: ${totalScraped}`)
  console.log(`  Decisions inserted: ${totalInserted}`)
  console.log(`  Decisions skipped (duplicates): ${totalSkipped}`)
  console.log(`  Errors: ${totalErrors}`)
  console.log(`  Finished: ${new Date().toISOString()}`)
}

main()





