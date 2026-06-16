#!/usr/bin/env node
/* AILANE-CC-BRIEF-CEO-BABEL-PIN-001 — Babel 8 regression remediation
   Repo: LexMarkAI/AILane-website
   Usage:
     node scripts/fix-babel-pin.mjs <root>                          # dry-run report
     node scripts/fix-babel-pin.mjs <root> --write                  # pin only, .bak saved
     node scripts/fix-babel-pin.mjs <root> --write --strip-import-bundles
     node scripts/fix-babel-pin.mjs <root> --verify                 # gate: exit 0 PASS / 1 FAIL
*/
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT   = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : '.';
const WRITE  = process.argv.includes('--write');
const STRIP  = process.argv.includes('--strip-import-bundles');
const VERIFY = process.argv.includes('--verify');
const PIN    = 'https://unpkg.com/@babel/standalone@7.29.7/babel.min.js';

// unpinned = standalone immediately followed by /babel, or @latest
const UNPINNED = /https?:\/\/unpkg\.com\/@babel\/standalone(?:@latest)?\/babel(?:\.min)?\.js/g;

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.html?$/i.test(name)) acc.push(p);
  }
  return acc;
}

// inline (no src), non-text/babel <script> blocks whose body has a top-level `import ... from`
function findOffenders(html) {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || '', body = m[2] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (/type\s*=\s*["']text\/babel["']/i.test(attrs)) continue;
    const hasImport = body.split('\n').some(l => /^\s*import\s.+\sfrom\s+["']/.test(l));
    if (hasImport) out.push({ full: m[0], jsxRuntime: /react\/jsx-runtime/.test(body), len: m[0].length });
  }
  return out;
}

const files = walk(ROOT);

if (VERIFY) {
  const fails = [];
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    const reasons = [];
    if (UNPINNED.test(html)) reasons.push('unpinned-babel');
    UNPINNED.lastIndex = 0;
    if (findOffenders(html).length) reasons.push('classic-script-import');
    if (reasons.length) fails.push(`${f}  [${reasons.join(', ')}]`);
  }
  if (fails.length) {
    console.log('VERIFY FAIL\n' + fails.map(x => '  ' + x).join('\n'));
    process.exit(1);
  }
  console.log(`VERIFY PASS — ${files.length} HTML files clean.`);
  process.exit(0);
}

let pinnedCount = 0, strippedCount = 0;
const manual = [];

for (const f of files) {
  let html = readFileSync(f, 'utf8');
  const orig = html;

  // (A) pin Babel
  html = html.replace(UNPINNED, PIN);
  UNPINNED.lastIndex = 0;

  // (B) handle offending classic scripts
  const hasBabelSource = /<script\b[^>]*type\s*=\s*["']text\/babel["'][^>]*>/i.test(html);
  for (const o of findOffenders(html)) {
    if (STRIP && o.jsxRuntime && hasBabelSource) {
      html = html.replace(o.full, '');
      strippedCount++;
    } else {
      manual.push(`${f}  (jsxRuntime=${o.jsxRuntime}, hasBabelSource=${hasBabelSource}, ${o.len}b)`);
    }
  }

  if (html !== orig) {
    pinnedCount++;
    if (WRITE) { writeFileSync(f + '.bak', orig); writeFileSync(f, html); }
  }
}

console.log(`HTML scanned: ${files.length}`);
console.log(`Files changed: ${pinnedCount} | jsx-runtime bundles stripped: ${strippedCount} | mode: ${WRITE ? 'WRITTEN (.bak saved)' : 'DRY-RUN'}`);
if (manual.length) {
  console.log(`\nMANUAL REVIEW (${manual.length}):`);
  for (const x of manual) console.log('  ' + x);
}
