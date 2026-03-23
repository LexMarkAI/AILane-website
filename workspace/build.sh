#!/bin/bash
# Knowledge Library Workspace — esbuild compilation
# CC Brief Skill Rule 23: Client-facing pages MUST use pre-compiled JS
npx esbuild \
  workspace/src/index.js \
  --bundle \
  --outfile=workspace/dist/workspace-bundle.js \
  --format=iife \
  --global-name=AilaneWorkspace \
  --minify \
  --target=es2020
