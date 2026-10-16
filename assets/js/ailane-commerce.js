/* ailane-commerce.js — purchase-pause notice and reopen notification sign-up.
   AILANE-CC-BRIEF-COMMERCE-PAUSE-SITE-001 · v1.0 · 16 October 2026
   Vanilla JS, no dependencies. No authentication, no session reads, no redirects (RULE 27-safe).
   Server strings are rendered with textContent only. */
(function () {
  'use strict';

  var REST_BASE = 'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1';
  var FUNCTIONS_BASE = 'https://cnbsxwtvazfvzmltkuvx.functions.supabase.co';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';
  var PRIVACY_URL = '/privacy/';

  var TEXT = {
    heading: 'New purchases are temporarily paused',
    message: 'We are completing a scheduled upgrade to the Ailane platform. New purchases and plan changes will reopen shortly. Existing subscriptions and access continue as normal.',
    prompt: 'Leave your email and we will let you know as soon as purchasing reopens.',
    consentReopen: 'Email me when purchasing reopens.',
    consentUpdates: 'Also send me occasional Ailane product updates.',
    privacyLead: 'We use your email address only for the purposes you select, and you can unsubscribe at any time. See our ',
    privacyLink: 'Privacy Notice',
    emailLabel: 'Email address',
    submit: 'Notify me',
    submitting: 'Sending…',
    close: 'Close',
    buttonPaused: 'Notify me when available',
    buttonUnavailable: 'Temporarily unavailable',
    unavailableHeading: 'Temporarily unavailable',
    unavailableMessage: 'This option is temporarily unavailable. Please try again shortly.',
    planHeading: 'Plan changes are temporarily paused',
    planMessage: 'We are completing a scheduled upgrade to the Ailane platform. Your current plan and access are unaffected.',
    successHeading: 'Please check your inbox',
    successMessage: 'We have sent a confirmation link to {email}. Please confirm your address to join the list. If it has not arrived within a few minutes, please check your junk folder.',
    errEmail: 'Please enter a valid email address.',
    errConsent: 'Please tick the box to confirm you would like us to email you.',
    errClosed: 'The notification list is not open at the moment.',
    errRate: 'Too many attempts. Please wait a few minutes and try again.',
    errGeneric: 'Something went wrong. Please try again shortly.'
  };

  var HANDLED_CODES = {
    purchases_paused: 1, product_unavailable: 1, service_unavailable: 1, plan_changes_paused: 1
  };

  var currentStatus = null;
  var statusPromise = null;
  var openDialog = null;

  function placeholder(v) { return !v || v.indexOf('__') === 0; }

  function getStatus() {
    if (statusPromise) return statusPromise;
    var fallback = { checkout_paused: false, waitlist_enabled: false, known: false };
    if (placeholder(ANON_KEY) || typeof fetch !== 'function') {
      statusPromise = Promise.resolve(fallback);
      return statusPromise;
    }
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    statusPromise = fetch(REST_BASE + '/commerce_settings?id=eq.1&select=checkout_paused,waitlist_enabled,paused_heading,paused_message,waitlist_prompt', {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY, Accept: 'application/json' },
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.ok ? r.json() : [];
    }).then(function (rows) {
      var s = rows && rows[0];
      if (!s) return fallback;
      return {
        checkout_paused: s.checkout_paused === true,
        waitlist_enabled: s.waitlist_enabled === true,
        heading: s.paused_heading || TEXT.heading,
        message: s.paused_message || TEXT.message,
        prompt: s.waitlist_prompt || TEXT.prompt,
        known: true
      };
    }).catch(function () {
      return fallback;
    }).then(function (s) {
      clearTimeout(timer);
      currentStatus = s;
      return s;
    });
    return statusPromise;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- Dialog ---------- */

  function closeDialog() {
    if (!openDialog) return;
    var d = openDialog;
    openDialog = null;
    document.removeEventListener('keydown', d.onKey, true);
    d.overlay.parentNode && d.overlay.parentNode.removeChild(d.overlay);
    document.documentElement.classList.remove('ailane-cm-open');
    if (d.trigger && typeof d.trigger.focus === 'function') d.trigger.focus();
  }

  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
    ));
  }

  function openNotice(opts) {
    opts = opts || {};
    closeDialog();
    var s = currentStatus || {};
    var mode = opts.mode || 'paused';
    var heading, message, showForm;
    if (mode === 'plan') {
      heading = opts.heading || TEXT.planHeading;
      message = opts.message || TEXT.planMessage;
      showForm = false;
    } else if (mode === 'unavailable') {
      heading = TEXT.unavailableHeading;
      message = TEXT.unavailableMessage;
      showForm = false;
    } else {
      heading = opts.heading || s.heading || TEXT.heading;
      message = opts.message || s.message || TEXT.message;
      showForm = (opts.waitlist === true) || (opts.waitlist !== false && s.waitlist_enabled === true);
    }

    var overlay = el('div', 'ailane-cm-overlay');
    var box = el('div', 'ailane-cm');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'ailane-cm-title');
    box.setAttribute('aria-describedby', 'ailane-cm-desc');

    var closeBtn = el('button', 'ailane-cm__close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', TEXT.close);
    closeBtn.innerHTML = '<span aria-hidden="true">&times;</span>';
    closeBtn.addEventListener('click', closeDialog);

    var eyebrow = el('p', 'ailane-cm__eyebrow', 'Ailane');
    var title = el('h2', 'ailane-cm__title', heading);
    title.id = 'ailane-cm-title';
    var desc = el('p', 'ailane-cm__desc', message);
    desc.id = 'ailane-cm-desc';

    box.appendChild(closeBtn);
    box.appendChild(eyebrow);
    box.appendChild(title);
    box.appendChild(desc);

    if (showForm) box.appendChild(buildForm(opts.interest || 'general', box));

    overlay.appendChild(box);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeDialog(); });
    document.body.appendChild(overlay);
    document.documentElement.classList.add('ailane-cm-open');

    var onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeDialog(); return; }
      if (e.key === 'Tab') {
        var f = focusables(box);
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    openDialog = { overlay: overlay, onKey: onKey, trigger: opts.trigger || document.activeElement };

    var firstInput = box.querySelector('input[type="email"]');
    (firstInput || closeBtn).focus();
  }

  function buildForm(interest, box) {
    var form = el('form', 'ailane-cm__form');
    form.noValidate = true;

    form.appendChild(el('p', 'ailane-cm__prompt', (currentStatus && currentStatus.prompt) || TEXT.prompt));

    var label = el('label', 'ailane-cm__label', TEXT.emailLabel);
    label.setAttribute('for', 'ailane-cm-email');
    var email = el('input', 'ailane-cm__input');
    email.id = 'ailane-cm-email';
    email.type = 'email';
    email.name = 'email';
    email.autocomplete = 'email';
    email.inputMode = 'email';
    email.maxLength = 254;
    email.required = true;
    form.appendChild(label);
    form.appendChild(email);

    var hp = el('div', 'ailane-cm__hp');
    hp.setAttribute('aria-hidden', 'true');
    var hpInput = el('input');
    hpInput.type = 'text';
    hpInput.name = 'website';
    hpInput.tabIndex = -1;
    hpInput.autocomplete = 'off';
    hp.appendChild(hpInput);
    form.appendChild(hp);

    function check(name, text, required) {
      var wrap = el('label', 'ailane-cm__check');
      var cb = el('input');
      cb.type = 'checkbox';
      cb.name = name;
      if (required) cb.required = true;
      wrap.appendChild(cb);
      wrap.appendChild(el('span', null, text));
      return { wrap: wrap, input: cb };
    }
    var c1 = check('consent_reopen_notice', TEXT.consentReopen, true);
    var c2 = check('consent_product_updates', TEXT.consentUpdates, false);
    form.appendChild(c1.wrap);
    form.appendChild(c2.wrap);

    var privacy = el('p', 'ailane-cm__privacy', TEXT.privacyLead);
    var a = el('a', null, TEXT.privacyLink);
    a.href = PRIVACY_URL;
    privacy.appendChild(a);
    privacy.appendChild(document.createTextNode('.'));
    form.appendChild(privacy);

    var err = el('p', 'ailane-cm__error');
    err.setAttribute('role', 'alert');
    err.hidden = true;
    form.appendChild(err);

    var submit = el('button', 'ailane-cm__submit', TEXT.submit);
    submit.type = 'submit';
    form.appendChild(submit);

    function showError(msg) { err.textContent = msg; err.hidden = false; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      var v = (email.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length > 254) { showError(TEXT.errEmail); email.focus(); return; }
      if (!c1.input.checked) { showError(TEXT.errConsent); c1.input.focus(); return; }
      submit.disabled = true;
      submit.textContent = TEXT.submitting;
      var headers = { 'Content-Type': 'application/json' };
      if (!placeholder(ANON_KEY)) { headers.apikey = ANON_KEY; headers.Authorization = 'Bearer ' + ANON_KEY; }
      fetch(FUNCTIONS_BASE + '/waitlist-signup', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          email: v,
          interest: interest,
          source_path: location.pathname,
          consent_reopen_notice: true,
          consent_product_updates: c2.input.checked === true,
          website: hpInput.value
        })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, body: b }; });
      }).then(function (res) {
        if (res.status === 200) {
          var done = el('div', 'ailane-cm__done');
          done.setAttribute('role', 'status');
          done.appendChild(el('h3', 'ailane-cm__done-title', TEXT.successHeading));
          done.appendChild(el('p', null, TEXT.successMessage.replace('{email}', v)));
          form.parentNode.replaceChild(done, form);
          var cb = box.querySelector('.ailane-cm__close');
          if (cb) cb.focus();
          return;
        }
        var code = res.body && res.body.code;
        if (code === 'invalid_email') showError(TEXT.errEmail);
        else if (code === 'consent_required') showError(TEXT.errConsent);
        else if (code === 'waitlist_closed') showError(TEXT.errClosed);
        else if (res.status === 429) showError(TEXT.errRate);
        else showError(TEXT.errGeneric);
        submit.disabled = false;
        submit.textContent = TEXT.submit;
      }).catch(function () {
        showError(TEXT.errGeneric);
        submit.disabled = false;
        submit.textContent = TEXT.submit;
      });
    });

    return form;
  }

  /* ---------- Page decoration ---------- */

  function decorate(s) {
    if (!s || !s.checkout_paused) return;
    document.documentElement.classList.add('ailane-purchases-paused');

    var buys = document.querySelectorAll('[data-ailane-buy]');
    Array.prototype.forEach.call(buys, function (b) {
      if (b.getAttribute('data-ailane-decorated') === '1') return;
      b.setAttribute('data-ailane-decorated', '1');
      var label = s.waitlist_enabled ? TEXT.buttonPaused : TEXT.buttonUnavailable;
      var target = b.querySelector('[data-ailane-buy-label]') || (b.children.length === 0 ? b : null);
      if (target) {
        target.setAttribute('data-ailane-original-label', target.textContent);
        target.textContent = label;
      }
      if (!s.waitlist_enabled) {
        b.setAttribute('aria-disabled', 'true');
        b.classList.add('ailane-buy--unavailable');
      }
    });

    var hosts = document.querySelectorAll('[data-ailane-commerce-banner]');
    Array.prototype.forEach.call(hosts, function (h) {
      if (h.querySelector(':scope > .ailane-cm-banner')) return;
      var banner = el('div', 'ailane-cm-banner');
      banner.setAttribute('role', 'status');
      var txt = el('div', 'ailane-cm-banner__text');
      txt.appendChild(el('strong', 'ailane-cm-banner__heading', s.heading || TEXT.heading));
      txt.appendChild(el('span', 'ailane-cm-banner__message', s.message || TEXT.message));
      banner.appendChild(txt);
      if (s.waitlist_enabled) {
        var btn = el('button', 'ailane-cm-banner__action', TEXT.buttonPaused);
        btn.type = 'button';
        btn.addEventListener('click', function () { openNotice({ interest: 'general', trigger: btn }); });
        banner.appendChild(btn);
      }
      h.insertBefore(banner, h.firstChild);
    });
  }

  document.addEventListener('click', function (e) {
    if (!currentStatus || !currentStatus.checkout_paused) return;
    var t = e.target && e.target.closest ? e.target.closest('[data-ailane-buy], [data-ailane-plan-change]') : null;
    if (!t) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (t.hasAttribute('data-ailane-plan-change')) openNotice({ mode: 'plan', trigger: t });
    else openNotice({ interest: t.getAttribute('data-ailane-buy') || 'general', trigger: t });
  }, true);

  /* ---------- Checkout response hook (used at existing call sites) ---------- */

  function handleCheckoutError(httpStatus, body, opts) {
    opts = opts || {};
    var code = body && body.code;
    if (code === 'purchases_paused') {
      currentStatus = currentStatus || {};
      currentStatus.checkout_paused = true;
      if (body.waitlist_enabled === true) currentStatus.waitlist_enabled = true;
      openNotice({ interest: opts.interest, trigger: opts.trigger, heading: body.heading, message: body.message, waitlist: body.waitlist_enabled === true });
      return true;
    }
    if (code === 'plan_changes_paused') {
      openNotice({ mode: 'plan', trigger: opts.trigger, heading: body.heading, message: body.message });
      return true;
    }
    if (HANDLED_CODES[code] || httpStatus === 404 || httpStatus >= 500) {
      openNotice({ mode: 'unavailable', trigger: opts.trigger });
      return true;
    }
    return false;
  }

  window.AilaneCommerce = {
    version: '1.0',
    getStatus: getStatus,
    openNotice: openNotice,
    handleCheckoutError: handleCheckoutError
  };

  function init() { getStatus().then(decorate); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
