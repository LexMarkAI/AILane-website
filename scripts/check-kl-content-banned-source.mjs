// Guard (AMD-343): fails if any Knowledge Library content file links to or names the banned case-law source.
// The name is assembled from character codes so that it never appears literally in this repository.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NAME = String.fromCharCode(98, 97, 105, 108, 105, 105);
const ROOT = process.argv[2] || 'knowledge-library/content';

function* jsonFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* jsonFiles(p);
    else if (p.endsWith('.json')) yield p;
  }
}

let total = 0;
for (const file of jsonFiles(ROOT)) {
  const n = readFileSync(file, 'utf8').toLowerCase().split(NAME).length - 1;
  if (n > 0) { console.error(`${file}: ${n}`); total += n; }
}
if (total > 0) {
  console.error(`FAIL: ${total} reference(s) to the banned source under ${ROOT}`);
  process.exit(1);
}
console.log(`OK: no reference to the banned source under ${ROOT}`);
