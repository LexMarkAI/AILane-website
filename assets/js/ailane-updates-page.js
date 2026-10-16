/* ailane-updates-page.js — confirm / unsubscribe pages for the purchase-reopen list.
   AILANE-CC-BRIEF-COMMERCE-PAUSE-SITE-001 · v1.0 · 16 October 2026
   Token is read from the URL fragment (#t=...) and removed from the address bar immediately. */
(function () {
  'use strict';
  var FUNCTIONS_BASE = 'https://cnbsxwtvazfvzmltkuvx.functions.supabase.co';

  var COPY = {
    confirm: {
      endpoint: '/waitlist-confirm',
      ok: 'confirmed',
      okTitle: 'Thank you — you are on the list',
      okText: 'Your email address is confirmed. We will let you know as soon as purchasing reopens.',
      badTitle: 'This link is no longer valid',
      badText: 'The confirmation link has expired or has already been used. If you would still like to be notified, please sign up again from the Ailane website.'
    },
    unsubscribe: {
      endpoint: '/waitlist-unsubscribe',
      ok: 'unsubscribed',
      okTitle: 'You have been unsubscribed',
      okText: 'We will not email you about purchasing or product updates again. You can sign up again at any time from the Ailane website.',
      badTitle: 'This link is no longer valid',
      badText: 'We could not find a subscription for this link. If you continue to receive emails, please contact us via the Ailane website.'
    },
    errorTitle: 'Something went wrong',
    errorText: 'We could not complete your request just now. Please try again shortly.',
    missingTitle: 'Link incomplete',
    missingText: 'This page needs the full link from your email. Please open the link again from the original message.'
  };

  function init() {
    var body = document.body;
    var action = body.getAttribute('data-ailane-updates');
    var c = COPY[action];
    var title = document.getElementById('ailane-up-title');
    var text = document.getElementById('ailane-up-text');
    var button = document.getElementById('ailane-up-button');
    if (!c || !title || !text || !button) return;

    var m = /(?:^|[#&])t=([A-Za-z0-9_-]{40,64})(?:&|$)/.exec(location.hash || '');
    var token = m ? m[1] : null;
    if (history && history.replaceState) history.replaceState(null, '', location.pathname);

    function show(t, x, hideButton) {
      title.textContent = t;
      text.textContent = x;
      if (hideButton) button.hidden = true;
      title.focus();
    }

    if (!token) { show(COPY.missingTitle, COPY.missingText, true); return; }

    button.addEventListener('click', function () {
      button.disabled = true;
      fetch(FUNCTIONS_BASE + c.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, body: b }; });
      }).then(function (res) {
        if (res.status === 200 && res.body && res.body.status === c.ok) show(c.okTitle, c.okText, true);
        else if (res.status === 200) show(c.badTitle, c.badText, true);
        else { show(COPY.errorTitle, COPY.errorText, false); button.disabled = false; }
      }).catch(function () {
        show(COPY.errorTitle, COPY.errorText, false);
        button.disabled = false;
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
