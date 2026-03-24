// planner-disclaimer.js — Contract Planner Disclaimer Gate
// Spec: KLUI-001 §3.6, KLWS-001 §2.3, §5.1
// LEGAL SAFEGUARD — disclaimer text is verbatim from specification

/**
 * Renders the mandatory disclaimer gate. HARD BLOCK — user cannot
 * proceed to the Contract Planner until checkbox is ticked.
 *
 * @param {HTMLElement} container - parent element to render into
 * @param {Function} onAcknowledge - callback fired on acknowledgement
 */
export function renderDisclaimerGate(container, onAcknowledge) {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'ws-planner-disclaimer';

  // Title
  const title = document.createElement('div');
  title.className = 'ws-planner-disclaimer-title';
  title.textContent = '\u26A0\uFE0F Important \u2014 Please Read';
  wrapper.appendChild(title);

  // Disclaimer text — VERBATIM from KLWS-001 §2.3. DO NOT MODIFY.
  const text = document.createElement('div');
  text.className = 'ws-planner-disclaimer-text';

  const p1 = document.createElement('p');
  p1.textContent = 'The Contract Planner provides regulatory intelligence to inform your contract construction. It does not produce legally binding contract language. It does not certify that any contract created using this tool is compliant with employment law. It does not substitute for qualified legal advice.';
  text.appendChild(p1);

  const p2 = document.createElement('p');
  p2.textContent = 'Every document produced by or within the Contract Planner carries a visible watermark and disclaimer.';
  text.appendChild(p2);

  const p3 = document.createElement('p');
  p3.textContent = 'AI Lane Limited is not a law firm and does not provide regulated legal services under the Legal Services Act 2007. You should seek independent legal advice from a qualified employment solicitor before using any employment contract in practice.';
  text.appendChild(p3);

  wrapper.appendChild(text);

  // Checkbox row
  const checkRow = document.createElement('label');
  checkRow.className = 'ws-planner-disclaimer-checkbox';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'ws-planner-ack';
  checkbox.setAttribute('aria-label', 'Acknowledge disclaimer');
  checkRow.appendChild(checkbox);

  const checkLabel = document.createElement('span');
  checkLabel.textContent = 'I understand and acknowledge this disclaimer';
  checkRow.appendChild(checkLabel);

  wrapper.appendChild(checkRow);

  // Continue button — disabled until checkbox ticked
  const btn = document.createElement('button');
  btn.className = 'ws-planner-disclaimer-btn ws-planner-disclaimer-btn--disabled';
  btn.textContent = 'Continue to Contract Planner';
  btn.disabled = true;
  btn.setAttribute('aria-disabled', 'true');

  checkbox.addEventListener('change', function() {
    if (checkbox.checked) {
      btn.disabled = false;
      btn.classList.remove('ws-planner-disclaimer-btn--disabled');
      btn.setAttribute('aria-disabled', 'false');
    } else {
      btn.disabled = true;
      btn.classList.add('ws-planner-disclaimer-btn--disabled');
      btn.setAttribute('aria-disabled', 'true');
    }
  });

  btn.addEventListener('click', function() {
    if (!checkbox.checked) return;
    sessionStorage.setItem('ailane_planner_ack', new Date().toISOString());
    if (onAcknowledge) onAcknowledge();
  });

  wrapper.appendChild(btn);
  container.appendChild(wrapper);
}

/**
 * Check if disclaimer was already acknowledged this session.
 * @returns {boolean}
 */
export function isDisclaimerAcknowledged() {
  return !!sessionStorage.getItem('ailane_planner_ack');
}
