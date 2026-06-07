#!/usr/bin/env bash
#
# AILANE ringfence gate
# ---------------------
# DUNS / D&B / Dun & Bradstreet terminology is RINGFENCED to the live D&B deal
# room. It must NEVER appear on index.html, any public/marketing/legal page, or
# any shipped web file (html/js/css) outside the sanctioned deal-room paths.
#
# Governed by CLAUDE.md -> "RINGFENCED TERMS" and AILANE-AMD-REG-001.
# Incident origin: a "DUNS-matched records" phrase reached the public homepage
# via a pre-approved brief (2026-06-07). This gate prevents recurrence.
#
# Scope: tracked *.html, *.js, *.css ONLY. Governance records (*.md) and DB
# migrations (*.sql) are out of scope by design (they are records/history).
#
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Ringfenced patterns (case-insensitive, POSIX ERE).
PATTERN='\bDUNS\b|D&B|\bDNB\b|Dun *(&|and) *Bradstreet|\bBradstreet\b'

# Sanctioned paths — the live D&B deal room and its dedicated/runtime assets.
ALLOW='^(partners/dnb-2026/|assets/dnb-2026/|assets/dealroom/)'

mapfile -t FILES < <(git ls-files '*.html' '*.js' '*.css' | grep -Ev "$ALLOW" || true)

report=""
for f in "${FILES[@]}"; do
  [ -z "$f" ] && continue
  if matches=$(grep -nIEi "$PATTERN" "$f" 2>/dev/null); then
    while IFS= read -r line; do
      report+="  ${f}:${line}"$'\n'
    done <<< "$matches"
  fi
done

if [ -n "$report" ]; then
  echo "✗ RINGFENCE BREACH — DUNS/D&B terminology found outside the sanctioned deal room:" >&2
  printf '%s' "$report" >&2
  echo "" >&2
  echo "These terms are permitted ONLY under:" >&2
  echo "  partners/dnb-2026/  assets/dnb-2026/  assets/dealroom/" >&2
  echo "See CLAUDE.md -> RINGFENCED TERMS. Do not bypass this gate." >&2
  exit 1
fi

echo "✓ Ringfence gate passed — no DUNS/D&B terminology outside the sanctioned deal room."
