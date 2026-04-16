// build-welsh-content.js — Populates Welsh (_cy) fields in content JSON.
// Run: node build-welsh-content.js
//
// BRIEF 3B — Welsh static JSON generation
//
// This is a ONE-TIME content population script. Reads Welsh translations from
// the Supabase legislation_library table and writes them into:
//   - knowledge-library/content/content-index.json  (manifest entries get
//     title_cy + warmSubtitle_cy)
//   - knowledge-library/content/<id>.json           (per-instrument files
//     get title_cy + desc_cy)
//
// Legal safeguards (DMSP-002):
//   - obligations_cy is NEVER written anywhere. Welsh obligations must not be
//     rendered as compliance content; only titles and warm subtitles are safe
//     to surface under an AI translation disclaimer.
//   - key_provisions_cy is a single blob on the DB record; we do NOT attempt
//     section-level translation because provisions in the static JSON are
//     structured and a single blob cannot be safely sliced.
//   - Downloads stay English-only. Section-level text stays English.
//
// DB match strategy (user-confirmed):
//   1. exact inst.short    === row.short_title
//   2. exact inst.title    === row.long_title
//   3. case-insensitive    inst.title === row.long_title
// No fuzzy matching. Unmatched entries are logged and skipped — their English
// fields remain authoritative and bl() simply falls back.
//
// Auth: anon key only. NEVER embed a service role key in this script.
// The anon key can be overridden via SUPABASE_ANON_KEY env var.

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';

const contentDir = path.join(__dirname, 'knowledge-library', 'content');
const manifestPath = path.join(contentDir, 'content-index.json');

const SELECT_COLS = [
  'short_title',
  'long_title',
  'summary',
  'title_cy',
  'summary_cy',
].join(',');

function fetchLegislationLibrary() {
  return new Promise(function(resolve, reject) {
    const url = SUPABASE_URL + '/rest/v1/legislation_library?select=' + SELECT_COLS;
    const req = https.request(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        Accept: 'application/json',
      },
    }, function(res) {
      let body = '';
      res.on('data', function(chunk) { body += chunk; });
      res.on('end', function() {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error('HTTP ' + res.statusCode + ': ' + body.slice(0, 500)));
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function matchRow(inst, rows) {
  // 1. exact short → short_title
  if (inst.short) {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].short_title === inst.short) return rows[i];
    }
  }
  // 2. exact title → long_title
  if (inst.title) {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].long_title === inst.title) return rows[i];
    }
  }
  // 3. case-insensitive title → long_title
  if (inst.title) {
    const lc = inst.title.toLowerCase();
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].long_title && rows[i].long_title.toLowerCase() === lc) return rows[i];
    }
  }
  return null;
}

async function main() {
  console.log('Fetching legislation_library rows from Supabase\u2026');
  const rows = await fetchLegislationLibrary();
  console.log('Fetched ' + rows.length + ' rows.');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const matched = [];
  const unmatched = [];

  manifest.forEach(function(entry) {
    const row = matchRow(entry, rows);
    if (!row) {
      unmatched.push(entry.id);
      return;
    }
    // Manifest: title_cy + warmSubtitle_cy.
    if (row.title_cy) entry.title_cy = row.title_cy;
    if (row.summary_cy) {
      // Mirror the warmSubtitle derivation in build-content-index.js: first
      // sentence of summary_cy, 200-char ellipsis cap.
      const firstSentence = row.summary_cy.split(/\.\s/)[0];
      let ws = firstSentence + (row.summary_cy.indexOf('.') !== -1 ? '.' : '');
      if (ws.length > 200) ws = ws.slice(0, 200) + '\u2026';
      entry.warmSubtitle_cy = ws;
    }

    // Per-instrument file: title_cy + desc_cy. Applies to both schemas
    // (parts[] and provisions[]). section-level fields NOT translated.
    const filePath = path.join(contentDir, entry.filename);
    if (!fs.existsSync(filePath)) {
      matched.push({ id: entry.id, fileMissing: true });
      return;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (row.title_cy) data.title_cy = row.title_cy;
    if (row.summary_cy) data.desc_cy = row.summary_cy;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    matched.push({ id: entry.id, titleCy: !!row.title_cy, summaryCy: !!row.summary_cy });
  });

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('');
  console.log('Matched: ' + matched.length);
  console.log('  with title_cy:   ' + matched.filter(function(m) { return m.titleCy; }).length);
  console.log('  with summary_cy: ' + matched.filter(function(m) { return m.summaryCy; }).length);
  console.log('Unmatched: ' + unmatched.length);
  if (unmatched.length) {
    console.log('  ' + unmatched.join(', '));
  }
}

main().catch(function(err) {
  console.error('Failed:', err.message);
  process.exit(1);
});
