Source: `AiLaneCEO/legal/src/app.jsx` (JSX, no imports; React, ReactDOM and `window.supabase` are page globals). Contract test: `node --test AiLaneCEO/legal/src/fixture.test.mjs`.
Build: `npx --yes esbuild@0.24.2 AiLaneCEO/legal/src/app.jsx --bundle --outfile=AiLaneCEO/legal/assets/control-tower.js --format=iife --jsx=transform --target=es2019 --charset=utf8 --legal-comments=none`
React pin: `react@18.3.1` and `react-dom@18.3.1` UMD from cdn.jsdelivr.net (no Babel; canonical RULE 22 CSP).
Commit the bundle: GitHub Pages serves static files only, so `assets/control-tower.js` is rebuilt and committed with every change to `src/app.jsx`.
Legacy page retained at `/AiLaneCEO/legal/legacy/` until Phase 4 (removed later under RULE 25).
Governed by AILANE-AMD-REG-001 · AMD-319 / AMD-322.
