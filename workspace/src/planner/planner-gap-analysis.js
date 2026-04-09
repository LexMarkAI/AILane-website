// planner-gap-analysis.js — Step 5: Gap Analysis
// Spec: KLWS-001 §4.2 Step 5, KLUI-001 §3.6
// Data: window.__vaultData (Sprint 3b), compliance_findings via REST
// LEGAL BOUNDARY: Identifies gaps. Does NOT advise how to fix them.

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';

/**
 * Renders Step 5 — Gap Analysis.
 * If the user selects a vault document, fetches its compliance findings
 * and maps them against the plan's requirement snapshot.
 *
 * @param {HTMLElement} container
 * @param {Object} plan - plan with requirement_snapshot and structure_selections
 * @param {Object} user - window.__ailaneUser
 * @param {Function} onNext - callback to advance to Step 6
 * @param {Function} onBack - callback to return to Step 4
 * @param {Function} onGapLoaded - context bus callback
 */
export async function renderStep5(container, plan, user, onNext, onBack, onGapLoaded) {
  container.innerHTML = '';

  // Inline disclaimer
  var notice = document.createElement('div');
  notice.className = 'ws-planner-req-notice';
  notice.textContent = 'This gap analysis identifies areas where your existing contract may not address statutory requirements. It does not constitute a legal compliance assessment. Gaps identified here are areas where a qualified employment solicitor can advise on appropriate contract provisions.';
  container.appendChild(notice);

  // Vault document selector
  var selectorSection = document.createElement('div');
  selectorSection.className = 'ws-gap-selector';

  var selectorTitle = document.createElement('div');
  selectorTitle.className = 'ws-gap-selector-title';
  selectorTitle.textContent = 'Select a contract from your Document Vault to compare against the requirement checklist:';
  selectorSection.appendChild(selectorTitle);

  // Check if vault data is available
  var vaultDocs = window.__vaultData || [];
  var checkedDocs = vaultDocs.filter(function(d) { return d.overallScore !== null && d.overallScore !== undefined; });

  if (checkedDocs.length === 0) {
    var emptyMsg = document.createElement('div');
    emptyMsg.className = 'ws-gap-empty';
    emptyMsg.textContent = 'No analysed contracts found in your Document Vault. Upload a contract and run a Contract Compliance Check first, then return to this step.';
    selectorSection.appendChild(emptyMsg);
  } else {
    var docList = document.createElement('div');
    docList.className = 'ws-gap-doc-list';
    checkedDocs.forEach(function(doc) {
      var item = document.createElement('div');
      item.className = 'ws-gap-doc-item';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'option');

      var nameEl = document.createElement('span');
      nameEl.className = 'ws-gap-doc-name';
      nameEl.textContent = doc.filename;
      item.appendChild(nameEl);

      var scoreEl = document.createElement('span');
      scoreEl.className = 'ws-gap-doc-score';
      var scoreVal = Math.round(doc.overallScore);
      scoreEl.textContent = scoreVal + '%';
      scoreEl.classList.add(scoreVal < 45 ? 'ws-score--red' : scoreVal < 75 ? 'ws-score--amber' : 'ws-score--green');
      item.appendChild(scoreEl);

      item.addEventListener('click', function() {
        // Highlight selected
        docList.querySelectorAll('.ws-gap-doc-item').forEach(function(el) {
          el.classList.remove('ws-gap-doc-item--selected');
          el.setAttribute('aria-selected', 'false');
        });
        item.classList.add('ws-gap-doc-item--selected');
        item.setAttribute('aria-selected', 'true');
        // Load gap analysis
        _loadGapAnalysis(container, plan, user, doc, onGapLoaded);
      });
      docList.appendChild(item);
    });
    selectorSection.appendChild(docList);
  }

  container.appendChild(selectorSection);

  // Gap results container (populated after document selection)
  var resultsContainer = document.createElement('div');
  resultsContainer.id = 'ws-gap-results';
  resultsContainer.className = 'ws-gap-results';
  container.appendChild(resultsContainer);

  // Skip option — user may not have an existing contract
  var skipSection = document.createElement('div');
  skipSection.className = 'ws-gap-skip';
  skipSection.innerHTML = '<p>If you do not have an existing contract to compare, you can proceed directly to export your requirement checklist and structure guide.</p>';
  var skipBtn = document.createElement('button');
  skipBtn.className = 'ws-planner-btn ws-planner-btn--secondary';
  skipBtn.textContent = 'Skip Gap Analysis \u2192 Export';
  skipBtn.addEventListener('click', function() {
    onNext({ gap_skipped: true });
  });
  skipSection.appendChild(skipBtn);
  container.appendChild(skipSection);

  // Navigation
  var nav = document.createElement('div');
  nav.className = 'ws-planner-nav';

  var backBtn = document.createElement('button');
  backBtn.className = 'ws-planner-btn ws-planner-btn--secondary';
  backBtn.textContent = '\u2190 Back to Structure';
  backBtn.addEventListener('click', function() { onBack(); });
  nav.appendChild(backBtn);

  var nextBtn = document.createElement('button');
  nextBtn.className = 'ws-planner-btn ws-planner-btn--primary';
  nextBtn.textContent = 'Next \u2192 Export & Referral';
  nextBtn.addEventListener('click', function() {
    onNext({ gap_skipped: false });
  });
  nav.appendChild(nextBtn);

  container.appendChild(nav);
}

async function _loadGapAnalysis(container, plan, user, vaultDoc, onGapLoaded) {
  var resultsEl = container.querySelector('#ws-gap-results');
  resultsEl.innerHTML = '<div class="ws-loading">Loading findings for ' + vaultDoc.filename + '\u2026</div>';

  try {
    // Fetch findings for this vault document's upload
    if (!vaultDoc.uploadId) {
      resultsEl.innerHTML = '<div class="ws-gap-empty">This document has not been analysed yet. Run a Contract Compliance Check first.</div>';
      return;
    }

    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/compliance_findings?upload_id=eq.' + vaultDoc.uploadId + '&order=severity.asc',
      {
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!resp.ok) throw new Error('Failed to load findings');
    var findings = await resp.json();

    // Map findings against requirement snapshot
    var snapshot = plan.requirement_snapshot || [];
    resultsEl.innerHTML = '';

    // Header
    var header = document.createElement('div');
    header.className = 'ws-gap-header';
    header.innerHTML = '<h4>Gap Analysis: ' + vaultDoc.filename + ' (' + Math.round(vaultDoc.overallScore) + '%)</h4>';
    resultsEl.appendChild(header);

    // Build gap table: requirement on left, finding match on right
    var table = document.createElement('div');
    table.className = 'ws-gap-table';

    var addressedCount = 0;
    var gapCount = 0;

    snapshot.forEach(function(req) {
      if (req.is_forward_requirement) return; // Only gap-check current requirements

      var row = document.createElement('div');
      row.className = 'ws-gap-row';
      row.setAttribute('tabindex', '0');

      // Left: requirement
      var leftCol = document.createElement('div');
      leftCol.className = 'ws-gap-col-left';
      leftCol.innerHTML = '<div class="ws-gap-req-name">' + (req.requirement_name || '') + '</div>' +
        '<div class="ws-gap-req-source">' + (req.statutory_basis || '') + '</div>';
      row.appendChild(leftCol);

      // Right: finding match or gap
      var rightCol = document.createElement('div');
      rightCol.className = 'ws-gap-col-right';

      // Try to match finding by statutory_ref
      var matchingFinding = null;
      for (var i = 0; i < findings.length; i++) {
        if (findings[i].statutory_ref && req.statutory_basis &&
            findings[i].statutory_ref.toLowerCase().indexOf(req.statutory_basis.toLowerCase().split(',')[0].trim().toLowerCase()) !== -1) {
          matchingFinding = findings[i];
          break;
        }
      }

      if (matchingFinding) {
        // Determine if addressed or gap based on severity
        var isAddressed = matchingFinding.severity === 'compliant' || matchingFinding.severity === 'minor';
        if (isAddressed) {
          addressedCount++;
          rightCol.className += ' ws-gap-col-right--addressed';
          rightCol.innerHTML = '<div class="ws-gap-status ws-gap-status--addressed">\u2713 Appears to address this requirement</div>' +
            '<div class="ws-gap-finding-detail">' + (matchingFinding.finding_detail || '') + '</div>';
        } else {
          gapCount++;
          rightCol.className += ' ws-gap-col-right--gap';
          rightCol.innerHTML = '<div class="ws-gap-status ws-gap-status--gap">\u2717 Does not appear to address this requirement</div>' +
            '<div class="ws-gap-finding-detail">' + (matchingFinding.finding_detail || '') + '</div>';
        }
      } else {
        gapCount++;
        rightCol.className += ' ws-gap-col-right--gap';
        rightCol.innerHTML = '<div class="ws-gap-status ws-gap-status--gap">\u2717 No matching provision found</div>';
      }

      row.appendChild(rightCol);
      table.appendChild(row);
    });

    resultsEl.appendChild(table);

    // Summary
    var summary = document.createElement('div');
    summary.className = 'ws-gap-summary';
    var currentReqs = snapshot.filter(function(r) { return !r.is_forward_requirement; }).length;
    summary.textContent = addressedCount + ' of ' + currentReqs + ' requirements appear to be addressed. ' + gapCount + ' gap' + (gapCount !== 1 ? 's' : '') + ' identified.';
    resultsEl.appendChild(summary);

    // Referral CTA — KLWS-001 §9.1
    var referralCta = document.createElement('div');
    referralCta.className = 'ws-gap-referral';
    referralCta.innerHTML = '<p>Discuss these findings with a qualified solicitor</p>' +
      '<a href="/intelligence/" class="ws-planner-locked-cta">Find an employment solicitor \u2192</a>';
    resultsEl.appendChild(referralCta);

    // Save gap_analysis_upload_id to plan
    fetch(SUPABASE_URL + '/rest/v1/kl_contract_plans?id=eq.' + plan.id, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + user.token,
        'apikey': window.__SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ gap_analysis_upload_id: vaultDoc.uploadId, current_step: 5 })
    }).catch(function(err) { console.error('Gap save failed:', err); });

    // Emit context bus signal
    if (onGapLoaded) {
      onGapLoaded({ planId: plan.id, documentId: vaultDoc.id, addressedCount: addressedCount, gapCount: gapCount });
    }

  } catch (err) {
    resultsEl.innerHTML = '<div class="ws-error">Unable to load gap analysis. Please try again.</div>';
  }
}
