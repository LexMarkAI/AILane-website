#!/usr/bin/env node
// apply-legal-update.mjs
// Governed legal-page write-automation applier (LPU v1.0).
// Dependency-free, Node >= 18 (ESM). Applies a reviewable JSON edit-spec to a
// single legal page deterministically, keeping all version stamps in sync.
//
// Invocation:
//   node tools/legal-page-update/apply-legal-update.mjs <edit-spec.json> [--dry-run]
//
// Governance: AILANE-CC-BRIEF-LEGAL-PAGE-AUTOMATION-001. CC never touches the
// database; database acceptance is Chairman-side only.

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, sep } from 'node:path';

// --- constants -------------------------------------------------------------

const GOVERNED_PAGES = [
  'privacy/index.html',
  'terms/index.html',
  'complaints/index.html',
  'tribunal-privacy/index.html',
];

// The self-test fixture lives here; specs targeting it are permitted so the
// tool can be exercised without touching a live legal page.
const FIXTURE_PREFIX = 'tools/legal-page-update/fixtures/';

// A header-style version stamp: "Version 4.2 — 10 June 2026".
// Accepts a literal em-dash, the &mdash; entity, or the &#8212; entity.
const DASH = '(?:\\u2014|&mdash;|&#8212;)';
const HEADER_STAMP = new RegExp(
  `Version\\s+\\d[\\d.]*\\s*${DASH}\\s*\\d{1,2}\\s+[A-Za-z]+\\s+\\d{4}`,
  'g'
);
// The stamp-sync invariant pattern, per brief (literal em-dash form).
const INVARIANT_STAMP = /Version \d[\d.]* — \d{1,2} \w+ \d{4}/g;

const BANNED_TERMS = ['Flash Check', 'Full Check']; // case-sensitive

// --- helpers ---------------------------------------------------------------

function fail(msg) {
  console.log(msg);
}

function sha256(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function normalisePath(p) {
  // Express the given path relative to the repo root using forward slashes.
  const repoRoot = process.cwd();
  let rel = relative(repoRoot, resolve(repoRoot, p));
  if (sep !== '/') rel = rel.split(sep).join('/');
  return rel;
}

function isAllowedPage(relPath) {
  return GOVERNED_PAGES.includes(relPath) || relPath.startsWith(FIXTURE_PREFIX);
}

function stripVersionPrefix(label) {
  return label.replace(/^Version\s+/, '');
}

// Count occurrences of the word "scan"/"scans" used as a noun (heuristic).
function countScanNoun(text) {
  const determiner =
    /\b(?:a|an|the|one|one-time|document|documents|compliance|contract|contracts|your|our|these|those|each|per|full)\s+scans?\b/gi;
  const trailing = /\bscans?\s+(?:are|is|was|were|findings|results|report|reports)\b/gi;
  const m1 = text.match(determiner) || [];
  const m2 = text.match(trailing) || [];
  return m1.length + m2.length;
}

// --- validation ------------------------------------------------------------

function validateSpec(spec) {
  const failures = [];
  if (typeof spec !== 'object' || spec === null) {
    failures.push('spec must be a JSON object');
    return failures;
  }
  if (typeof spec.spec_id !== 'string' || spec.spec_id.trim() === '')
    failures.push('spec_id: required non-empty string');
  if (typeof spec.page_path !== 'string' || spec.page_path.trim() === '') {
    failures.push('page_path: required non-empty string');
  } else {
    const rel = normalisePath(spec.page_path);
    if (!isAllowedPage(rel))
      failures.push(
        `page_path: must be one of ${GOVERNED_PAGES.join(' | ')} (or a fixture under ${FIXTURE_PREFIX})`
      );
  }
  if (typeof spec.new_version_label !== 'string' || spec.new_version_label.trim() === '')
    failures.push('new_version_label: required non-empty string');
  else if (!/^Version \d[\d.]* — \d{1,2} \w+ \d{4}$/.test(spec.new_version_label))
    failures.push(
      `new_version_label: must match "Version <n> — <day> <month> <year>" (got "${spec.new_version_label}")`
    );
  if (!Array.isArray(spec.edits)) {
    failures.push('edits: required array');
  } else {
    spec.edits.forEach((e, i) => {
      if (typeof e !== 'object' || e === null) {
        failures.push(`edits[${i}]: must be an object`);
        return;
      }
      if (typeof e.find !== 'string' || e.find === '')
        failures.push(`edits[${i}].find: required non-empty string`);
      if (typeof e.replace !== 'string')
        failures.push(`edits[${i}].replace: required string`);
    });
  }
  if (!(spec.changelog_append === null || typeof spec.changelog_append === 'string'))
    failures.push('changelog_append: must be a string or null');
  if (typeof spec.approval_ref !== 'string' || spec.approval_ref.trim() === '')
    failures.push('approval_ref: required non-empty string (Director sign-off)');
  return failures;
}

// --- transformation --------------------------------------------------------

function indexOfH1(text) {
  const m = /<h1\b/i.exec(text);
  return m ? m.index : -1;
}

// Replace the header version badge nearest the page H1 with the new label.
function replaceHeaderBadge(text, newLabel) {
  const matches = [...text.matchAll(HEADER_STAMP)];
  if (matches.length === 0) return { text, replaced: false };
  const h1 = indexOfH1(text);
  let target = matches[0];
  if (h1 >= 0) {
    let best = Infinity;
    for (const m of matches) {
      const d = Math.abs(m.index - h1);
      if (d < best) {
        best = d;
        target = m;
      }
    }
  }
  const before = text.slice(0, target.index);
  const after = text.slice(target.index + target[0].length);
  return { text: before + newLabel + after, replaced: true };
}

// Replace the version text inside the footer governance sentence.
function replaceFooterStamp(text, newLabel, changelogAppend) {
  const stripped = stripVersionPrefix(newLabel);
  const stampBody = `\\d[\\d.]*\\s*${DASH}\\s*\\d{1,2}\\s+[A-Za-z]+\\s+\\d{4}`;

  // Preferred: an explicit "Current version: <stamp>." sentence.
  const currentRe = new RegExp(`(Current version:\\s*)(${stampBody})(\\.?)`);
  const cm = currentRe.exec(text);
  if (cm) {
    let rep = `${cm[1]}${stripped}${cm[3]}`;
    if (changelogAppend != null) rep += ` ${changelogAppend}`;
    return { text: text.replace(currentRe, rep), replaced: true };
  }

  // Otherwise: the last header-style stamp that is NOT the header badge.
  const matches = [...text.matchAll(HEADER_STAMP)];
  if (matches.length >= 2) {
    const target = matches[matches.length - 1];
    const before = text.slice(0, target.index);
    let mid = newLabel;
    if (changelogAppend != null) mid += ` ${changelogAppend}`;
    const after = text.slice(target.index + target[0].length);
    return { text: before + mid + after, replaced: true };
  }

  return { text, replaced: false };
}

// --- main ------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const specPath = args.find((a) => a !== '--dry-run');

  if (!specPath) {
    fail('USAGE: node apply-legal-update.mjs <edit-spec.json> [--dry-run]');
    process.exit(1);
  }

  let spec;
  try {
    spec = JSON.parse(readFileSync(specPath, 'utf8'));
  } catch (e) {
    fail(`SPEC-FAIL: cannot read/parse ${specPath}: ${e.message}`);
    process.exit(1);
  }

  const vfailures = validateSpec(spec);
  if (vfailures.length > 0) {
    for (const f of vfailures) fail(`VALIDATION-FAIL ${spec?.spec_id ?? '<no-id>'}: ${f}`);
    process.exit(1);
  }

  const relPage = normalisePath(spec.page_path);
  let original;
  try {
    original = readFileSync(relPage, 'utf8');
  } catch (e) {
    fail(`SPEC-FAIL ${spec.spec_id}: cannot read page ${relPage}: ${e.message}`);
    process.exit(1);
  }

  // (a) edits — validate all against the original (all-or-nothing), then apply.
  const editFailures = [];
  spec.edits.forEach((e, i) => {
    const count = original.split(e.find).length - 1;
    if (count !== 1) editFailures.push(`EDIT-FAIL ${spec.spec_id} ${i}: ${count} occurrences`);
  });
  if (editFailures.length > 0) {
    for (const f of editFailures) fail(f);
    process.exit(1);
  }

  let content = original;
  for (const e of spec.edits) {
    content = content.replace(e.find, e.replace); // first (unique) occurrence
  }

  // (b) header version badge.
  ({ text: content } = replaceHeaderBadge(content, spec.new_version_label));

  // (c) footer governance stamp.
  ({ text: content } = replaceFooterStamp(
    content,
    spec.new_version_label,
    spec.changelog_append ?? null
  ));

  // (d) stamp-sync invariant: every header-style stamp must equal the label.
  const driftStamps = (content.match(INVARIANT_STAMP) || []).filter(
    (s) => s !== spec.new_version_label
  );
  if (driftStamps.length > 0) {
    fail(
      `STAMP-SYNC-FAIL ${spec.spec_id}: ${driftStamps.length} divergent stamp(s): ${[
        ...new Set(driftStamps),
      ].join(' | ')}`
    );
    process.exit(1); // original never written — restore is a no-op
  }

  // banned-term sweep on the resulting file.
  const bannedHits = BANNED_TERMS.filter((t) => content.includes(t));
  if (bannedHits.length > 0) {
    fail(`BANNED-TERM-FAIL ${spec.spec_id}: ${bannedHits.join(', ')} present after edits`);
    process.exit(1); // original never written — restore is a no-op
  }

  // REPORT-ONLY: "scan" used as a noun (Director decision pending; never fails).
  console.log(`REPORT-ONLY ${spec.spec_id}: scan-noun-count=${countScanNoun(content)}`);

  const newSha = sha256(content);
  if (dryRun) {
    console.log(`APPLIED ${spec.spec_id} ${relPage} sha256:${newSha}`);
    console.log('DRY-RUN — file not written');
    return;
  }

  writeFileSync(relPage, content, 'utf8');
  console.log(`APPLIED ${spec.spec_id} ${relPage} sha256:${newSha}`);
}

main();
