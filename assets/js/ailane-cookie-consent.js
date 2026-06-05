/* =============================================================================
 * AILANE — Minimal Cookie / PECR Consent Gate for GA4
 * AILANE-AMD-REG-001 / AMD-156 §2D
 * Brief: AILANE-CC-BRIEF-DEALROOM-PRIVACY-001 §2D
 *
 * Strictly-necessary cookies (Supabase auth/session) are unaffected and require
 * no consent — they continue to function. Google Analytics 4 (G-NTNXWZN31C) is
 * analytics and is held back until the user grants consent. No advertising or
 * cross-site tracking is loaded anywhere by this module.
 *
 * Scope of this addition: the Deal-Room Privacy Notice page and the in-scope
 * deal-room pages only. The wider public site retains its existing immediate
 * GA4 loading and is intentionally NOT retrofitted in this change.
 *
 * Behaviour:
 *   - On load, an existing stored decision is honoured immediately: a prior
 *     'granted' loads GA4; a prior 'denied' loads nothing. The strip is never
 *     shown automatically — pages decide WHEN to present() it.
 *   - The Privacy Notice page calls present() on load.
 *   - Deal-room pages call present() only AFTER the clickwrap gate is accepted,
 *     so the counterparty never sees two overlays at once.
 *
 * Public API (window.ailaneConsent):
 *   present()      apply a stored decision; if none, show the Accept/Decline strip
 *   grant()        record consent, load GA4, dismiss the strip
 *   decline()      record refusal, dismiss the strip, load nothing
 *   hasDecision()  boolean — whether a prior decision exists
 * ============================================================================= */
(function () {
  'use strict';

  var GA4_ID = 'G-NTNXWZN31C';
  var STORE_KEY = 'ailane_cookie_consent_v1'; // 'granted' | 'denied'
  var PRIVACY_URL = '/legal/deal-room-privacy/';

  // Define the dataLayer + gtag shim up front so any gtag('event', ...) calls
  // elsewhere on the page do not throw before/without consent — they simply
  // queue into the dataLayer and are only ever sent if GA4 is later loaded.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function read() { try { return window.localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
  function write(v) { try { window.localStorage.setItem(STORE_KEY, v); } catch (e) { /* private mode — degrade */ } }

  function loadGA4() {
    if (window.__ailaneGA4Loaded) return;
    window.__ailaneGA4Loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA4_ID, { anonymize_ip: true });
  }

  function removeStrip() {
    var el = document.getElementById('ailane-consent-strip');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function grant() { write('granted'); removeStrip(); loadGA4(); }
  function decline() { write('denied'); removeStrip(); }

  function injectStyles() {
    if (document.getElementById('ailane-consent-styles')) return;
    var st = document.createElement('style');
    st.id = 'ailane-consent-styles';
    st.textContent =
      '#ailane-consent-strip{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;' +
      'background:#0F1B35;border-top:1px solid #2A3A5C;color:#CBD5E1;' +
      'font-family:"Segoe UI",Arial,sans-serif;font-size:0.9rem;line-height:1.6;' +
      'box-shadow:0 -8px 32px rgba(0,0,0,0.4);}' +
      '.ailane-consent-inner{max-width:1100px;margin:0 auto;padding:14px 20px;' +
      'display:flex;align-items:center;gap:18px;flex-wrap:wrap;justify-content:space-between;}' +
      '.ailane-consent-text{margin:0;flex:1 1 320px;color:#CBD5E1;}' +
      '.ailane-consent-text a{color:#0EA5E9;text-decoration:none;}' +
      '.ailane-consent-text a:hover{text-decoration:underline;}' +
      '.ailane-consent-actions{display:flex;gap:10px;flex:0 0 auto;}' +
      '.ailane-consent-btn{font-family:inherit;font-size:0.85rem;font-weight:600;' +
      'padding:0.5rem 1.1rem;border-radius:6px;cursor:pointer;border:1px solid transparent;}' +
      '.ailane-consent-btn-primary{background:#0EA5E9;color:#FFFFFF;border-color:#0EA5E9;}' +
      '.ailane-consent-btn-primary:hover{background:#0b8fcc;}' +
      '.ailane-consent-btn-ghost{background:transparent;color:#94A3B8;border-color:#2A3A5C;}' +
      '.ailane-consent-btn-ghost:hover{color:#FFFFFF;border-color:#94A3B8;}' +
      '.ailane-consent-btn:focus-visible{outline:2px solid #0EA5E9;outline-offset:2px;}' +
      '@media (max-width:560px){.ailane-consent-actions{width:100%;}.ailane-consent-btn{flex:1;}}';
    document.head.appendChild(st);
  }

  function showStrip() {
    if (document.getElementById('ailane-consent-strip')) return;
    injectStyles();
    var bar = document.createElement('div');
    bar.id = 'ailane-consent-strip';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML =
      '<div class="ailane-consent-inner">' +
        '<p class="ailane-consent-text">We use strictly necessary cookies to run this workspace (these keep you signed in). ' +
        'With your consent we also use Google Analytics to understand how the site is used. ' +
        'See the <a href="' + PRIVACY_URL + '">Privacy Notice &amp; Workspace Terms</a>.</p>' +
        '<div class="ailane-consent-actions">' +
          '<button type="button" id="ailane-consent-decline" class="ailane-consent-btn ailane-consent-btn-ghost">Decline</button>' +
          '<button type="button" id="ailane-consent-accept" class="ailane-consent-btn ailane-consent-btn-primary">Accept</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bar);
    document.getElementById('ailane-consent-accept').addEventListener('click', grant);
    document.getElementById('ailane-consent-decline').addEventListener('click', decline);
  }

  function present() {
    var d = read();
    if (d === 'granted') { loadGA4(); return; }
    if (d === 'denied') { return; }
    if (document.body) showStrip();
    else document.addEventListener('DOMContentLoaded', showStrip);
  }

  // Honour any prior decision immediately on load (load GA4 if previously granted),
  // but never auto-show the strip — the page calls present() at the right moment.
  if (read() === 'granted') loadGA4();

  window.ailaneConsent = {
    present: present,
    grant: grant,
    decline: decline,
    hasDecision: function () { return read() !== null; }
  };
})();
