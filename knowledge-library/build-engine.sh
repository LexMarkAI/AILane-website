#!/bin/bash
# Knowledge Library / Operational shared engine — kl-app.jsx -> kl-app.js
#
# kl-app.js is the ONLY runtime engine. Three pages load it verbatim:
#   knowledge-library/index.html, operational/index.html, operational/documents/index.html
#
# --bundle IS REQUIRED. kl-app.jsx imports dompurify (runtime dep, package.json).
#   Without it, esbuild emits require("dompurify"); the pages load this file as a
#   plain <script>, require is undefined, and ALL THREE PAGES WHITE-SCREEN.
#   Proven 11 Jul 2026. Do not remove --bundle.
#
# RULE 23: no --global-name (silent white-screen on mobile).
# Do NOT minify: the shipped bundle is unminified and must stay diff-readable.
#
# ALWAYS commit kl-app.jsx and kl-app.js in the SAME commit.
# NEVER hand-edit kl-app.js. It is build output. Hand-editing it is what caused
# the divergence remediated by AILANE-CC-BRIEF-KL-ENGINE-RECONCILE-SITE-001.
#
# After building, ALWAYS verify:  grep -c 'require(' knowledge-library/kl-app.js  -> MUST be 0
set -e
npm ci
npx esbuild knowledge-library/kl-app.jsx \
  --bundle \
  --loader:.jsx=jsx \
  --jsx=transform \
  --format=iife \
  --target=es2020 \
  --outfile=knowledge-library/kl-app.js
if [ "$(grep -c 'require(' knowledge-library/kl-app.js)" -ne 0 ]; then
  echo "FATAL: kl-app.js contains require( — this will white-screen every host page. Build aborted."
  exit 1
fi
echo "Rebuilt knowledge-library/kl-app.js — require() check clean."
