/* AILANE-CC-BRIEF-WSUX-SITE-003 §S2 — shared workspace accessibility snippet.
 *
 * Loaded by the standalone workspace pages (operational|governance /documents,
 * /calendar, /cases, /parliament-live). The workspace shell pages that mount the
 * engine bundle (knowledge-library/, operational/, governance/) carry the same
 * logic inside knowledge-library/kl-app.jsx, so this file is ONLY for the
 * standalone pages that do not load that bundle.
 *
 * Reads the same localStorage keys the Settings surface writes, so a font-size /
 * high-contrast preference set once applies estate-wide. At default (scale '1',
 * contrast off) it is a no-op — no inline zoom is set and no class is added, so the
 * page renders unchanged. prefers-reduced-motion is honoured by the injected CSS
 * (it neutralises the pages' looping animations — `spin` loaders and the `eilPulse`
 * Eileen indicator — only when the viewer has expressed that OS preference).
 *
 * No external requests, no dependencies — CSP script-src 'self' compliant.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var FONT_KEY = 'ailane_a11y_font_scale';     // '1' | '1.12' | '1.25'
  var CONTRAST_KEY = 'ailane_a11y_contrast';   // '1' (on) | '' (off)
  var STEPS = ['1', '1.12', '1.25'];
  function readFont() { try { var v = localStorage.getItem(FONT_KEY); return STEPS.indexOf(v) >= 0 ? v : '1'; } catch (e) { return '1'; } }
  function readContrast() { try { return localStorage.getItem(CONTRAST_KEY) === '1'; } catch (e) { return false; } }
  function apply() {
    var scale = readFont();
    var contrast = readContrast();
    try {
      var root = document.documentElement;
      var scaled = scale !== '1';
      root.style.setProperty('--kl-a11y-font-scale', scale);
      var target = document.getElementById('kl-root') || document.body;
      if (target) target.style.zoom = scaled ? scale : '';
      // WORKSPACE-UX-PASS-SITE-001 §2 — release the outer scroll when scaled so a zoomed
      // fixed-height shell (a page pinning body/#kl-root to 100vh with overflow:hidden)
      // is never clipped: the window scrolls to the true bottom. No-op on ordinary
      // document-flow pages. Removed at scale '1' → default rendering untouched.
      if (scaled) root.classList.add('kl-a11y-scaled'); else root.classList.remove('kl-a11y-scaled');
      if (contrast) root.classList.add('contrast-boost'); else root.classList.remove('contrast-boost');
    } catch (e) { /* non-fatal */ }
  }
  window.__klA11yApply = apply;
  if (!document.getElementById('kl-wsux003-a11y-styles')) {
    var style = document.createElement('style');
    style.id = 'kl-wsux003-a11y-styles';
    style.textContent = [
      /* WORKSPACE-UX-PASS-SITE-001 §2 — large-font trap fix: when scaled, free body/html to
         scroll so a zoomed fixed-height shell reaches its true bottom (no clipped viewport). */
      'html.kl-a11y-scaled, html.kl-a11y-scaled body { overflow-y: auto !important; height: auto !important; min-height: 100vh !important; }',
      /* §S2b — high-contrast: lift text contrast of the existing palette (no redesign). */
      '.contrast-boost [style*="#64748B"], .contrast-boost [style*="#475569"] { color: #94A3B8 !important; }',
      '.contrast-boost [style*="#94A3B8"] { color: #CBD5E1 !important; }',
      '.contrast-boost [style*="#CBD5E1"] { color: #F1F5F9 !important; }',
      /* §S2c — honour prefers-reduced-motion: neutralise looping animations. */
      '@media (prefers-reduced-motion: reduce) {',
      '  *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  }
  apply();
  // Re-apply if the preference changes in another tab (e.g. the Settings surface).
  window.addEventListener('storage', function (e) { if (!e || e.key === FONT_KEY || e.key === CONTRAST_KEY) apply(); });
})();
