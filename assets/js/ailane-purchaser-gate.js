/* ailane-purchaser-gate.js — purchaser-type question and declaration at checkout.
   AILANE-CC-BRIEF-CHECKOUT-GATE-WEBSITE-001 §1 · AMD-365 · Governed by AILANE-AMD-REG-001
   Vanilla JS, no dependencies. No network calls, no storage, no personal data collected.
   Server strings are rendered with textContent only.

   window.AilanePurchaser = {
     mount(containerEl, { id, onChange })   // renders the gate; onChange(isComplete) on every change
     isComplete(containerEl)                // a purchaser type is selected AND the declaration is ticked
     payload(containerEl)                   // { purchaser_type, business_declaration: true } or null
     handleResponse(body, containerEl)      // true when a create-checkout gate code was shown inline
   }; */
(function () {
  'use strict';

  // AMD-365 D-1 (24 Oct 2026): sole traders and partnerships are mothballed. This option is NOT rendered.
  // Re-open only under an AMD after the AI provider confirms the position: move it into the rendered
  // options and move 'sole_trader_or_partnership' into PURCHASER_TYPES in create-checkout.
  var DORMANT_OPTIONS = [{ value: 'sole_trader_or_partnership', label: 'My own business, as a sole trader or partnership' }];

  var OPTIONS = [
    { value: 'organisation', label: 'A company or other organisation (for example a limited company, LLP, charity or public body)' },
    { value: 'adviser', label: 'Client organisations, as an adviser to employers (for example an HR consultant or employment solicitor)' }
  ];

  var TEXT = {
    legend: 'Who are you buying for?',
    eligibility: 'Ailane is currently available to companies and other organisations, and to advisers buying for client organisations. It is not available to sole traders or partnerships buying for their own business, or to individuals.',
    declaration: 'I confirm I am buying on behalf of a company or other organisation, or as an adviser to employer organisations, and not as a sole trader or partnership for my own business or as an individual reviewing my own terms of employment.',
    incomplete: 'Please tell us who you are buying for, and confirm the declaration, before continuing.'
  };

  var STYLE_ID = 'ailane-purchaser-styles';
  var CSS = [
    '.ailane-purchaser-gate { margin: 0 0 14px; text-align: left; font-family: inherit; }',
    '.ailane-purchaser { margin: 0 0 10px; padding: 12px 14px 14px; min-width: 0; border: 1px solid rgba(255,255,255,0.10); border-radius: 6px; background: rgba(255,255,255,0.04); }',
    '.ailane-purchaser legend { padding: 0 4px; font-size: 13px; font-weight: 600; line-height: 1.4; color: inherit; }',
    '.ailane-purchaser-option, .ailane-purchaser-declaration { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; line-height: 1.6; cursor: pointer; }',
    '.ailane-purchaser-option { margin: 8px 0 0; }',
    '.ailane-purchaser-declaration { padding: 12px 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; background: rgba(255,255,255,0.04); }',
    '.ailane-purchaser-option input, .ailane-purchaser-declaration input { width: 16px; height: 16px; flex-shrink: 0; margin: 2px 0 0; cursor: pointer; }',
    '.ailane-purchaser-option span, .ailane-purchaser-declaration span { opacity: 0.85; }',
    '.ailane-purchaser-eligibility { margin: 10px 0 0; font-size: 11.5px; line-height: 1.55; opacity: 0.7; }',
    '.ailane-purchaser-message { margin: 10px 0 0; padding: 10px 12px; border-left: 3px solid rgba(148,163,184,0.6); border-radius: 4px; background: rgba(148,163,184,0.08); font-size: 12px; line-height: 1.55; }',
    '.ailane-purchaser-message.is-error { border-left-color: #ff9a9a; color: #ff9a9a; background: rgba(255,154,154,0.06); }',
    '.ailane-purchaser-message[hidden] { display: none; }',
    '.ailane-purchaser-message strong { display: block; margin-bottom: 2px; }'
  ].join('\n');

  function ensureStyles() {
    if (!document.head || document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function parts(containerEl) {
    if (!containerEl || typeof containerEl.querySelector !== 'function') return null;
    return {
      radio: containerEl.querySelector('.ailane-purchaser input[type="radio"]:checked'),
      box: containerEl.querySelector('.ailane-purchaser-declaration input[type="checkbox"]')
    };
  }

  function isComplete(containerEl) {
    var p = parts(containerEl);
    return !!(p && p.radio && p.box && p.box.checked);
  }

  function payload(containerEl) {
    if (!isComplete(containerEl)) return null;
    return { purchaser_type: parts(containerEl).radio.value, business_declaration: true };
  }

  function messageEl(containerEl) {
    var m = containerEl.querySelector('.ailane-purchaser-message');
    if (!m) {
      m = el('div', 'ailane-purchaser-message');
      m.setAttribute('role', 'status');
      containerEl.appendChild(m);
    }
    return m;
  }

  function clearMessage(containerEl) {
    var m = containerEl.querySelector('.ailane-purchaser-message');
    if (m) { m.textContent = ''; m.hidden = true; }
  }

  function showMessage(containerEl, heading, message, isError) {
    var m = messageEl(containerEl);
    m.textContent = '';
    m.className = 'ailane-purchaser-message' + (isError ? ' is-error' : '');
    if (heading) m.appendChild(el('strong', null, heading));
    if (message) m.appendChild(el('span', null, message));
    m.hidden = false;
  }

  function str(v) { return (typeof v === 'string' && v.trim()) ? v : null; }

  function mount(containerEl, opts) {
    if (!containerEl) return;
    opts = opts || {};
    ensureStyles();
    var id = String(opts.id);
    containerEl.textContent = '';
    containerEl.classList.add('ailane-purchaser-gate');

    var fieldset = el('fieldset', 'ailane-purchaser');
    fieldset.appendChild(el('legend', null, TEXT.legend));
    OPTIONS.forEach(function (o) {
      var label = el('label', 'ailane-purchaser-option');
      var radio = el('input');
      radio.type = 'radio';
      radio.name = 'purchaser-' + id;
      radio.value = o.value;
      radio.id = 'purchaser-' + id + '-' + o.value;
      label.setAttribute('for', radio.id);
      label.appendChild(radio);
      label.appendChild(el('span', null, o.label));
      fieldset.appendChild(label);
    });
    fieldset.appendChild(el('p', 'ailane-purchaser-eligibility', TEXT.eligibility));
    containerEl.appendChild(fieldset);

    var decl = el('label', 'ailane-purchaser-declaration');
    var box = el('input');
    box.type = 'checkbox';
    box.id = 'biz-' + id;
    decl.setAttribute('for', box.id);
    decl.appendChild(box);
    decl.appendChild(el('span', null, TEXT.declaration));
    containerEl.appendChild(decl);

    var m = el('div', 'ailane-purchaser-message');
    m.setAttribute('role', 'status');
    m.hidden = true;
    containerEl.appendChild(m);

    // One listener per container, so a re-mount (re-rendered panel) never double-fires.
    if (containerEl.__ailanePurchaserChange) containerEl.removeEventListener('change', containerEl.__ailanePurchaserChange);
    containerEl.__ailanePurchaserChange = function (e) {
      var t = e.target;
      if (!t || (t.type !== 'radio' && t.type !== 'checkbox')) return;
      clearMessage(containerEl);
      if (typeof opts.onChange === 'function') opts.onChange(isComplete(containerEl));
    };
    containerEl.addEventListener('change', containerEl.__ailanePurchaserChange);
  }

  function handleResponse(body, containerEl) {
    var code = body && body.code;
    if (!containerEl || !code) return false;
    if (code === 'purchaser_type_not_eligible') {
      var heading = str(body.heading);
      var message = str(body.message);
      showMessage(containerEl, heading, message || (heading ? null : TEXT.eligibility), false);
      return true;
    }
    if (code === 'purchaser_type_required' || code === 'business_declaration_required') {
      showMessage(containerEl, null, str(body.error) || TEXT.incomplete, true);
      return true;
    }
    return false;
  }

  window.AilanePurchaser = {
    mount: mount,
    isComplete: isComplete,
    payload: payload,
    handleResponse: handleResponse
  };
})();
