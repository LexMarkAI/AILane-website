/* =============================================================================
 * Charity Onboarding Room — page shell bootstrap
 * AILANE-CC-BRIEF-CSO-ROOM-WEB-001 §1
 * Each page calls CharityRoom.boot(function (state) { ...page render... }).
 * The guard resolves auth (or pre-provisioning preview), wires the shell
 * (signed-in email, sign-out, preview chip) and mounts the Eileen widget.
 * ============================================================================= */
(function () {
  'use strict';

  function boot(pageInit) {
    window.charityRoomAuth.guard(function (state) {
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
