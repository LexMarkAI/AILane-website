/* ============================================================
   AI LANE × DUN & BRADSTREET DEAL ROOM — DEAL CREATOR
   ------------------------------------------------------------
   Page-local controller. Auth and sign-out are inherited from
   the parent /partners/dnb-2026/script.js (RULE 26 / RULE 2 —
   JWT decode + raw fetch). This script handles Deal-Creator-only
   concerns: tier / scope / overlay panel renderers, live
   recompute against pricing_quote_function_v4 +
   compute_scope_universe + get_pricing_ceilings_v3, the
   Save Configuration → cppp-generate-receipt flow, the
   Lodge as FCR → fcr-lodge flow, and a page-local
   Discuss-with-Eileen context-passing wrapper (Path iii per
   Director STOP 1 acknowledgement — no parent script.js
   modification).

   STOP gate progression (this file is built up across stops):
     STOP 2 — Scaffolding + populateDealCreator window shim   ◀ this commit
     STOP 3 — Panel 1 tier renderer
     STOP 4 — Panel 2 scope renderer + compute_scope_universe wire
     STOP 5 — Panel 3 overlay renderer + locked-row UX
     STOP 6 — Quote pane + pricing_quote_function_v4 recompute
     STOP 7 — Save Configuration → cppp-generate-receipt
     STOP 8 — Discuss with Eileen context-passing (path iii)

   Brief: AILANE-CC-BRIEF-DEALROOM-DEAL-CREATOR-BUILD-001 v1.0
   ============================================================ */

(function () {
  var CLID = 'dnb-2026-001';

  // Window-level dispatch shim. Director STOP 1 acknowledgement, item 3
  // (Path A): after the §6 / STOP 9 slug rename, parent script.js's
  // revealPage() will dispatch `populateDealCreator(window.__dealRoomUser)`
  // when location.pathname includes '/deal-creator/'. Defining the symbol
  // at window level here resolves that dispatch without ReferenceError.
  // The actual page-local initialisation runs via DOMContentLoaded below;
  // the shim itself is intentionally a no-op.
  window.populateDealCreator = function (_user) {
    /* no-op — page self-initialises via DOMContentLoaded below. */
  };

  document.addEventListener('DOMContentLoaded', function () {
    // STOP 3-8 wire panel renderers, recompute pipeline, submit and
    // Eileen context-passing flows here.

    try {
      if (window.gtag) {
        window.gtag('event', 'deal_creator_view', { clid: CLID });
      }
    } catch (e) { /* swallow */ }
  });
})();
