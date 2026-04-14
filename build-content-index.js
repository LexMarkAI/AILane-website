// build-content-index.js — Generates content-index.json from all content files
// Run: node build-content-index.js
//
// Reads every .json file in knowledge-library/content/, extracts root
// metadata, derives a display category from the id prefix (so acas-*,
// hse-*, ico-*, ehrc-* files land on their own bookshelves even though
// their stored `cat` is "guidance"), and writes content-index.json.
//
// Defaults:
//   - id starts with acas- → cat: 'acas'
//   - id starts with hse-  → cat: 'hse'
//   - id starts with ico-  → cat: 'ico'
//   - id starts with ehrc- → cat: 'ehrc'
//   - no prefix match       → file's own cat, else 'legislation'
//
// The file's original cat is preserved as originalCat for audit trail.
// Commit this script to the repo root. The generated manifest lives at
// knowledge-library/content/content-index.json. Both are tracked in git.

const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, 'knowledge-library', 'content');
const files = fs.readdirSync(contentDir).filter(function(f) {
  return f.endsWith('.json') && f !== 'content-index.json';
});

function deriveCat(id, fileCat) {
  if (/^acas-/i.test(id)) return 'acas';
  if (/^hse-/i.test(id)) return 'hse';
  if (/^ico-/i.test(id)) return 'ico';
  if (/^ehrc-/i.test(id)) return 'ehrc';
  return fileCat || 'legislation';
}

const index = [];

files.forEach(function(filename) {
  try {
    const raw = fs.readFileSync(path.join(contentDir, filename), 'utf8');
    const data = JSON.parse(raw);

    // Count sections across all parts (KLIA-001 schema) or top-level
    // provisions (era1996 / horizon-tracker / redundancy-intelligence).
    let sectionCount = 0;
    if (Array.isArray(data.parts)) {
      data.parts.forEach(function(part) {
        if (Array.isArray(part.sections)) {
          sectionCount += part.sections.length;
        }
      });
    } else if (Array.isArray(data.provisions)) {
      sectionCount = data.provisions.length;
    }

    // Count leading cases across all sections in all parts, plus any
    // top-level leadingCases or cases arrays.
    let caseCount = 0;
    if (Array.isArray(data.parts)) {
      data.parts.forEach(function(part) {
        if (Array.isArray(part.sections)) {
          part.sections.forEach(function(sec) {
            if (Array.isArray(sec.leadingCases)) {
              caseCount += sec.leadingCases.length;
            }
          });
        }
      });
    }
    if (Array.isArray(data.provisions)) {
      data.provisions.forEach(function(prov) {
        if (Array.isArray(prov.leadingCases)) caseCount += prov.leadingCases.length;
      });
    }
    if (Array.isArray(data.leadingCases)) caseCount += data.leadingCases.length;
    if (Array.isArray(data.cases)) caseCount += data.cases.length;

    // Derive a warm subtitle from the desc field — first sentence,
    // truncated at 200 chars with ellipsis if longer. 36 of 72 content
    // files lack a desc field; for those, fall back to the chapters
    // field, which typically holds a readable descriptive line.
    const desc = data.desc || data.description || data.summary || data.overview || data.chapters || '';
    let warmSubtitle = '';
    if (desc) {
      const firstSentence = desc.split(/\.\s/)[0];
      warmSubtitle = firstSentence + (desc.indexOf('.') !== -1 ? '.' : '');
      if (warmSubtitle.length > 200) {
        warmSubtitle = warmSubtitle.slice(0, 200) + '\u2026';
      }
    }

    const fileId = data.id || filename.replace('.json', '');
    const derivedCat = deriveCat(fileId, data.cat);

    index.push({
      id: fileId,
      cat: derivedCat,
      originalCat: data.cat || null,
      title: data.title || filename.replace('.json', ''),
      // KLUX-001-AM-002 §4 / AMD-050 §4: human-readable topic label rendered
      // as the primary name when present; the formal title falls back to the
      // secondary line. Null when not yet backfilled on the source file.
      topicLabel: data.topicLabel || null,
      short: data.short || '',
      type: data.type || '',
      jurisdiction: data.jurisdiction || '',
      isInForce: data.isInForce != null ? data.isInForce : true,
      isERA: data.isERA || false,
      currentAsOf: data.currentAsOf || '',
      warmSubtitle: warmSubtitle,
      chapters: data.chapters || '',
      partCount: Array.isArray(data.parts) ? data.parts.length : 0,
      sectionCount: sectionCount,
      caseCount: caseCount,
      hasContent: sectionCount > 0,
      sourceUrl: data.sourceUrl || null,
      filename: filename,
    });
  } catch (err) {
    console.error('Failed to process ' + filename + ':', err.message);
  }
});

// Sort: legislation first, then acas, hse, ico, ehrc, then everything else.
const catOrder = {
  legislation: 0,
  acas: 1,
  hse: 2,
  ico: 3,
  ehrc: 4,
  guidance: 5,
  'employment-relations': 6,
  'cross-cutting': 7,
  horizon: 8,
  training: 9,
  caselaw: 10,
};
index.sort(function(a, b) {
  const ca = catOrder[a.cat] != null ? catOrder[a.cat] : 99;
  const cb = catOrder[b.cat] != null ? catOrder[b.cat] : 99;
  if (ca !== cb) return ca - cb;
  return a.title.localeCompare(b.title);
});

const outputPath = path.join(contentDir, 'content-index.json');
fs.writeFileSync(outputPath, JSON.stringify(index, null, 2), 'utf8');

const cats = {};
index.forEach(function(i) { cats[i.cat] = (cats[i.cat] || 0) + 1; });
console.log('Generated content-index.json with ' + index.length + ' instruments');
console.log('Categories:');
Object.keys(cats).forEach(function(c) { console.log('  ' + c + ': ' + cats[c]); });
