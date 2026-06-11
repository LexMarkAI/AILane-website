/* =============================================================================
 * Charity Onboarding Room — entry gate (Terms + Privacy, blocking)
 * AILANE-CC-BRIEF-CSO-ROOM-WEB-001 §1 — modelled on the deal-room clickwrap
 * gate, with direct REST writes (RULE 2) to public.dealroom_terms_acceptance
 * using acceptance_method='charity_room_entry'.
 *
 * Branches (both are correct outcomes, per brief):
 *   - acceptance row exists            → open the room live
 *   - no row → overlay → POST 201      → open the room live
 *   - POST fails (RLS not provisioned) → "Acceptance opens at provisioning";
 *     room continues in read-only preview with the synthetic banner.
 * ============================================================================= */
(function () {
  'use strict';

  var CFG = window.CHARITY_ROOM;
  var api = window.charityRoomApi;

  function setInert(on) {
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.id === 'cg-overlay') continue;
      if (on) {
        el.setAttribute('data-cg-inert', '1');
        el.setAttribute('aria-hidden', 'true');
        try { el.inert = true; } catch (e) { /* older browsers: overlay still blocks */ }
      } else if (el.getAttribute('data-cg-inert') === '1') {
        el.removeAttribute('data-cg-inert');
        el.removeAttribute('aria-hidden');
        try { el.inert = false; } catch (e) {}
      }
    }
    document.documentElement.style.overflow = on ? 'hidden' : '';
    document.body.style.overflow = on ? 'hidden' : '';
  }

  function dismiss() {
    var overlay = document.getElementById('cg-overlay');
    if (overlay) overlay.remove();
    setInert(false);
  }

  function showOverlay(state, onOpen) {
    var prev = document.getElementById('cg-overlay');
    if (prev) prev.remove();

    var overlay = document.createElement('div');
    overlay.id = 'cg-overlay';
    overlay.className = 'cg-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cg-title');
    overlay.innerHTML =
      '<div class="cg-card" role="document">' +
        '<h1 id="cg-title">Before you enter this room</h1>' +
        '<p>Welcome. Please read our Terms of Service and Privacy Notice, then accept to continue. ' +
        'They explain how this room works and how AI Lane Limited looks after your information.</p>' +
        '<p class="links">' +
          '<a href="/terms/" target="_blank" rel="noopener">Read the Terms of Service</a> &middot; ' +
          '<a href="/privacy/" target="_blank" rel="noopener">Read the Privacy Notice</a>' +
        '</p>' +
        '<div id="cg-status" class="msg info hidden" aria-live="polite"></div>' +
        '<button id="cg-accept" class="btn gold" type="button" style="width:100%;margin-top:8px">' +
          'I accept the Terms and the Privacy Notice</button>' +
      '</div>';

    document.body.appendChild(overlay);
    setInert(true);
    document.body.style.visibility = 'visible';

    var btn = document.getElementById('cg-accept');
    var status = document.getElementById('cg-status');

    btn.addEventListener('click', async function () {
      btn.disabled = true;
      status.className = 'msg info';
      status.textContent = 'Recording your acceptance…';
      try {
        await api.postEntryAcceptance(state);
        try { if (window.gtag) window.gtag('event', 'charity_room_entry_accepted', { clid: CFG.CLID }); } catch (e) {}
        dismiss();
        onOpen('live');
      } catch (e) {
        /* RLS not yet provisioned — completion state, not an error */
        status.className = 'msg info';
        status.innerHTML = '<b>Acceptance opens at provisioning.</b> You can look around the room ' +
          'in read-only preview for now; we will record your acceptance once the room is switched on.';
        btn.textContent = 'Continue in read-only preview';
        btn.disabled = false;
        btn.onclick = function () { dismiss(); onOpen('preview'); };
      }
    });
  }

  /* Entry point: state = { session, email, token } (authenticated). */
  async function run(state, onOpen) {
    var rows = null;
    try {
      rows = await api.getEntryAcceptance(state);
    } catch (e) {
      rows = null; /* read failed — present the overlay; the POST decides the branch */
    }
    if (rows && rows.length > 0) { onOpen('live'); return; }
    showOverlay(state, onOpen);
  }

  window.charityRoomEntryGate = { run: run };
})();
