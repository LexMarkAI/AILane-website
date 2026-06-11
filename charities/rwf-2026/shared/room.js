/* =============================================================================
 * Charity Onboarding Room — page shell bootstrap
 * AILANE-CC-BRIEF-CSO-ROOM-WEB-001 §1 · WEB-002 §2 (solicitor banner)
 * Each page calls CharityRoom.boot(function (state) { ...page render... }).
 * The guard resolves auth, wires the shell (signed-in email, sign-out,
 * preview chip), renders the solicitor banner and mounts the Eileen widget.
 * ============================================================================= */
(function () {
  'use strict';

  /* Persistent, non-dismissible — on every room page, directly under the header */
  function mountSolicitorBanner() {
    if (document.getElementById('solicitor-band')) return;
    var band = document.createElement('div');
    band.id = 'solicitor-band';
    band.className = 'solicitor-band';
    band.setAttribute('role', 'note');
    band.innerHTML = '<div class="wrap">Ailane provides regulatory intelligence, not legal advice. ' +
      'Before signing or changing any contract, consult your solicitor.</div>';
    var hdr = document.querySelector('header.topbar');
    if (hdr && hdr.parentNode) hdr.insertAdjacentElement('afterend', band);
    else document.body.insertBefore(band, document.body.firstChild);
  }

  function boot(pageInit) {
    window.charityRoomAuth.guard(function (state) {
      mountSolicitorBanner();
      var who = document.getElementById('room-email');
      if (who) who.textContent = state.email || '';
      var out = document.getElementById('room-signout');
      if (out) {
        if (state.mode === 'live' && state.session) {
          out.addEventListener('click', function (e) { e.preventDefault(); window.charityRoomAuth.signOut(); });
        } else {
          out.classList.add('hidden');
        }
      }
      var chip = document.getElementById('room-mode-chip');
      if (chip && state.mode !== 'live') {
        chip.classList.remove('hidden');
        chip.textContent = 'Read-only preview — opens fully at provisioning';
      }
      window.CharityEileen.mount();
      if (typeof pageInit === 'function') {
        try { pageInit(state); } catch (e) { /* never blank the room on a page error */ }
      }
    });
  }

  window.CharityRoom = { boot: boot };
})();
