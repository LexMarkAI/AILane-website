/**
 * DOCUMENT VAULT PANEL — Sprint 1
 * KLUI-001 §3.1
 *
 * Reads from:
 * - kl_vault_documents (KLAC-001) — user's stored documents
 * - compliance_uploads (existing) — check results with overall_score
 * - compliance_findings (existing) — per-clause findings with severity
 */
// AILANE-CC-BRIEF-DOCV-FRONTEND-WIRING-001 · F4 — MFA AAL2 elevation before vault writes.
// §4.2 decision gate: panel-vault.js imported no auth-helper module, so the IF branch
// applies — a new workspace/src/_mfa-elevation.js was created and is imported here.
import { ensureAal2 } from './_mfa-elevation.js';

class AilaneVaultPanel {
  constructor(container, bus) {
    this.bus = bus;
    this.documents = [];
    this.activeDocId = null;
    this.el = null;
    this._isRendered = false;
    this._findingsSummary = {}; // uploadId → [statutory_ref strings]
    this._container = container;

    // Cross-panel wiring: planner requirement selection → vault highlighting
    var self = this;
    if (window.__contextBus) {
      window.__contextBus.on('planner:requirement:selected', function(data) {
        if (!self._isRendered) return;
        self._clearHighlights();
        if (data && data.statutoryBasis) {
          self._highlightByStatutoryBasis(data.statutoryBasis);
        }
      });
    }
  }

  async mount(container) {
    this.el = container;
    this.el.innerHTML = '<div class="ws-skeleton" style="height:200px;margin:16px;"></div>';

    try {
      await this._loadDocuments();
      this._render();
    } catch(e) {
      console.error('[Vault] Load error:', e);
      this.el.innerHTML = '<p style="padding:16px;color:#991B1B;">Unable to load documents. Please try again.</p>';
    }
  }

  async _loadDocuments() {
    var user = window.__ailaneUser;
    if (!user) return;

    // Fetch vault documents
    var vaultRes = await fetch(
      'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_vault_documents?user_id=eq.' + user.id + '&deleted_at=is.null&order=created_at.desc',
      {
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    var vaultDocs = await vaultRes.json();

    // Fetch compliance uploads for this user (to get scores)
    var uploadsRes = await fetch(
      'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/compliance_uploads?user_id=eq.' + user.id + '&status=eq.complete&order=created_at.desc',
      {
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    var uploads = await uploadsRes.json();

    // Merge: vault docs enriched with compliance scores
    this.documents = (vaultDocs || []).map(function(doc) {
      var matchingUpload = (uploads || []).find(function(u) {
        return u.file_name === doc.filename || u.display_name === doc.filename;
      });
      return {
        id: doc.id,
        filename: doc.filename,
        score: matchingUpload ? Number(matchingUpload.overall_score) : null,
        uploadId: matchingUpload ? matchingUpload.id : null,
        checkedAt: matchingUpload ? matchingUpload.updated_at : null,
        isMonitored: doc.analysis_status === 'monitored',
        fromUploads: false
      };
    });

    // Also include compliance uploads that aren't in the vault yet
    var self = this;
    (uploads || []).forEach(function(upload) {
      var alreadyInVault = self.documents.some(function(d) {
        return d.filename === upload.file_name || d.filename === upload.display_name;
      });
      if (!alreadyInVault) {
        self.documents.push({
          id: upload.id,
          filename: upload.display_name || upload.file_name,
          score: Number(upload.overall_score),
          uploadId: upload.id,
          checkedAt: upload.updated_at,
          isMonitored: false,
          fromUploads: true
        });
      }
    });

    // Vault data export for cross-panel integration
    // Consumers: Contract Planner (Step 5 gap analysis pre-population)
    // Shape: [{ id, filename, overallScore, uploadId, lastChecked, isMonitored, findingsCount, fromUploads }]
    this._exportVaultData();

    // Batch findings summary for cross-panel highlighting (Approach A)
    await this._loadFindingsSummary(uploads);
  }

  _exportVaultData() {
    window.__vaultData = this.documents.map(function(doc) {
      return {
        id: doc.id,
        filename: doc.filename,
        overallScore: doc.score || null,
        uploadId: doc.uploadId || null,
        lastChecked: doc.checkedAt || null,
        isMonitored: doc.isMonitored || false,
        findingsCount: doc.findingsCount || 0,
        fromUploads: doc.fromUploads || false
      };
    });
  }

  async _loadFindingsSummary(uploads) {
    var user = window.__ailaneUser;
    if (!user || !uploads || uploads.length === 0) return;

    var uploadIds = [];
    for (var i = 0; i < uploads.length; i++) {
      if (uploads[i].id) uploadIds.push(uploads[i].id);
    }
    if (uploadIds.length === 0) return;

    try {
      var res = await fetch(
        'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/compliance_findings?upload_id=in.(' + uploadIds.join(',') + ')&select=upload_id,statutory_ref',
        {
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      var findings = await res.json();
      var self = this;
      self._findingsSummary = {};
      (findings || []).forEach(function(f) {
        if (!f.upload_id || !f.statutory_ref) return;
        if (!self._findingsSummary[f.upload_id]) self._findingsSummary[f.upload_id] = [];
        self._findingsSummary[f.upload_id].push(f.statutory_ref);
      });
    } catch(e) {
      console.error('[Vault] Findings summary load error:', e);
    }
  }

  _render() {
    var self = this;
    this._isRendered = true;
    this.el.innerHTML = '';

    // Header bar with count and upload button
    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E5E7EB;';

    var count = document.createElement('span');
    count.style.cssText = 'font-size:12px;color:#6B7280;font-family:Inter,system-ui;';
    count.textContent = this.documents.length + ' document' + (this.documents.length !== 1 ? 's' : '');
    header.appendChild(count);

    var uploadBtn = document.createElement('button');
    uploadBtn.style.cssText = 'padding:6px 12px;background:#0A5C52;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,system-ui;';
    uploadBtn.textContent = '+ Upload';
    uploadBtn.addEventListener('click', function() { self._handleUpload(); });
    header.appendChild(uploadBtn);

    this.el.appendChild(header);

    // Document list
    if (this.documents.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:40px 16px;text-align:center;';
      empty.innerHTML =
        '<div style="width:48px;height:48px;border-radius:12px;background:#F3F4F6;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:#6B7280;">' +
          PANEL_ICONS.vault +
        '</div>' +
        '<p style="font-size:14px;font-weight:600;color:#0A2342;margin:0 0 4px;">No documents yet</p>' +
        '<p style="font-size:12px;color:#6B7280;margin:0;">Upload a contract, policy, or handbook to get started.</p>';
      this.el.appendChild(empty);
      return;
    }

    var list = document.createElement('ul');
    list.className = 'ws-vault-list';

    this.documents.forEach(function(doc) {
      var item = document.createElement('li');
      item.className = 'ws-vault-item';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', doc.filename + ', compliance score ' + (doc.score !== null ? doc.score + '%' : 'not checked'));

      // Score badge
      var scoreBadge = document.createElement('div');
      var scoreClass = 'ws-vault-score--grey';
      var scoreText = '?';
      if (doc.score !== null) {
        if (doc.score < 45) scoreClass = 'ws-vault-score--red';
        else if (doc.score < 75) scoreClass = 'ws-vault-score--amber';
        else scoreClass = 'ws-vault-score--green';
        scoreText = Math.round(doc.score) + '%';
      }
      scoreBadge.className = 'ws-vault-score ' + scoreClass;
      scoreBadge.textContent = scoreText;
      item.appendChild(scoreBadge);

      // Info
      var info = document.createElement('div');
      info.className = 'ws-vault-info';

      var name = document.createElement('div');
      name.className = 'ws-vault-name';
      name.textContent = doc.filename;
      info.appendChild(name);

      var meta = document.createElement('div');
      meta.className = 'ws-vault-meta';
      if (doc.checkedAt) {
        var date = new Date(doc.checkedAt);
        meta.textContent = 'Checked ' + date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } else {
        meta.textContent = 'Not yet checked';
      }
      info.appendChild(meta);

      item.appendChild(info);

      // Monitored badge
      if (doc.isMonitored) {
        var monitored = document.createElement('div');
        monitored.className = 'ws-vault-monitored';
        monitored.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>';
        monitored.title = 'Monitored — auto-rechecked';
        item.appendChild(monitored);
      }

      // Row actions (F5a/F5b/F5c). Small bordered buttons mirror panel-documents.js.
      // data-doc-id lets _setRowState() find this row to show progress/error state.
      item.setAttribute('data-doc-id', doc.id);
      var actions = document.createElement('div');
      actions.className = 'ws-vault-actions';
      actions.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0;';
      var actCss = 'padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-family:Inter,system-ui;background:none;line-height:1.2;';

      // F5b — Solicitor pack. Needs a kl_vault_documents.id (document_id); offered for
      // real vault rows only (fromUploads pseudo-rows carry an upload id, not a vault id).
      if (!doc.fromUploads) {
        var packBtn = document.createElement('button');
        packBtn.className = 'ws-vault-act';
        packBtn.type = 'button';
        packBtn.style.cssText = actCss + 'border:1px solid #D1D5DB;color:#0A5C52;';
        packBtn.textContent = 'Solicitor pack';
        packBtn.addEventListener('click', function(e) { e.stopPropagation(); self._generateSolicitorPack(doc.id); });
        actions.appendChild(packBtn);
      }

      // F5c — Vault report PDF. Needs an upload_id; offered only when an analysis exists.
      if (doc.uploadId) {
        var reportBtn = document.createElement('button');
        reportBtn.className = 'ws-vault-act';
        reportBtn.type = 'button';
        reportBtn.style.cssText = actCss + 'border:1px solid #D1D5DB;color:#0A5C52;';
        reportBtn.textContent = 'Report PDF';
        reportBtn.addEventListener('click', function(e) { e.stopPropagation(); self._generateVaultReportPdf(doc.id, doc.uploadId); });
        actions.appendChild(reportBtn);
      }

      // F5a — Soft-delete. Real vault rows only.
      if (!doc.fromUploads) {
        var delBtn = document.createElement('button');
        delBtn.className = 'ws-vault-act';
        delBtn.type = 'button';
        delBtn.style.cssText = actCss + 'border:1px solid #FCA5A5;color:#DC2626;';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', function(e) { e.stopPropagation(); self._deleteDocument(doc.id); });
        actions.appendChild(delBtn);
      }

      var rowStatus = document.createElement('span');
      rowStatus.className = 'ws-vault-row-status';
      rowStatus.setAttribute('aria-live', 'polite');
      rowStatus.style.cssText = 'font-size:11px;color:#6B7280;font-family:Inter,system-ui;';
      actions.appendChild(rowStatus);

      item.appendChild(actions);

      // Click handler
      item.addEventListener('click', function() { self._selectDocument(doc, item); });
      item.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') self._selectDocument(doc, item);
      });

      list.appendChild(item);
    });

    this.el.appendChild(list);
  }

  async _selectDocument(doc, itemEl) {
    // Highlight active
    this.el.querySelectorAll('.ws-vault-item').forEach(function(i) { i.classList.remove('active'); });
    itemEl.classList.add('active');
    this.activeDocId = doc.id;

    // Emit context bus signal
    this.bus.emit('vault:document:selected', {
      documentId: doc.id,
      documentName: doc.filename,
      score: doc.score,
      uploadId: doc.uploadId
    });

    // Load findings if we have an upload ID
    if (doc.uploadId) {
      await this._loadFindings(doc.uploadId);
    }
  }

  async _loadFindings(uploadId) {
    var user = window.__ailaneUser;
    var self = this;

    try {
      var res = await fetch(
        'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/compliance_findings?upload_id=eq.' + uploadId + '&order=severity.asc',
        {
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      var findings = await res.json();

      if (!findings || findings.length === 0) return;

      // Show findings summary below the document list
      var existingSummary = this.el.querySelector('.ws-vault-findings-detail');
      if (existingSummary) existingSummary.remove();

      var summary = document.createElement('div');
      summary.className = 'ws-vault-findings-detail';
      summary.style.cssText = 'border-top:2px solid #E5E7EB;';

      // Severity counts
      var counts = { critical: 0, major: 0, minor: 0, compliant: 0, forward: 0 };
      findings.forEach(function(f) {
        if (f.is_forward_looking) counts.forward++;
        else if (f.severity === 'critical') counts.critical++;
        else if (f.severity === 'major') counts.major++;
        else if (f.severity === 'minor') counts.minor++;
        else counts.compliant++;
      });

      var countsBar = document.createElement('div');
      countsBar.className = 'ws-vault-findings';
      var countsHTML = '';
      if (counts.critical > 0) countsHTML += '<span class="ws-vault-finding-count"><span class="ws-finding-dot ws-finding-dot--critical"></span>' + counts.critical + ' Critical</span>';
      if (counts.major > 0) countsHTML += '<span class="ws-vault-finding-count"><span class="ws-finding-dot ws-finding-dot--major"></span>' + counts.major + ' Major</span>';
      if (counts.minor > 0) countsHTML += '<span class="ws-vault-finding-count"><span class="ws-finding-dot ws-finding-dot--minor"></span>' + counts.minor + ' Minor</span>';
      if (counts.compliant > 0) countsHTML += '<span class="ws-vault-finding-count"><span class="ws-finding-dot ws-finding-dot--compliant"></span>' + counts.compliant + ' Compliant</span>';
      countsBar.innerHTML = countsHTML;
      summary.appendChild(countsBar);

      // Forward exposure markers
      if (counts.forward > 0) {
        var fwdBar = document.createElement('div');
        fwdBar.style.cssText = 'padding:8px 16px;border-bottom:1px solid #E5E7EB;';
        fwdBar.innerHTML = '<span class="ws-forward-marker">ERA 2025 — ' + counts.forward + ' forward finding' + (counts.forward > 1 ? 's' : '') + ' — Not Yet In Force</span>';
        summary.appendChild(fwdBar);
      }

      // Individual findings list
      var findingsList = document.createElement('div');
      findingsList.style.cssText = 'max-height:300px;overflow-y:auto;';

      findings.forEach(function(f) {
        var row = document.createElement('div');
        row.style.cssText = 'padding:10px 16px;border-bottom:1px solid #F3F4F6;font-size:12px;font-family:Inter,system-ui;';

        var severityColor = { critical: '#DC2626', major: '#D97706', minor: '#3B82F6', compliant: '#16A34A' }[f.severity] || '#6B7280';

        var rowHTML = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:' + severityColor + ';flex-shrink:0;"></span>' +
          '<strong style="color:#0A2342;">' + (f.clause_category || 'General') + '</strong>' +
          (f.is_forward_looking ? '<span class="ws-forward-marker" style="font-size:10px;">Forward</span>' : '') +
          '</div>' +
          '<p style="margin:0;color:#4B5563;line-height:1.4;">' + (f.finding_detail || '') + '</p>' +
          (f.statutory_ref ? '<p style="margin:4px 0 0;color:#6B7280;font-size:11px;">' + f.statutory_ref + '</p>' : '');

        row.innerHTML = rowHTML;

        row.addEventListener('click', function() {
          self.bus.emit('vault:finding:focused', {
            findingId: f.id,
            severity: f.severity,
            requirementRef: f.statutory_ref,
            clauseRef: f.clause_category
          });
        });

        findingsList.appendChild(row);
      });

      summary.appendChild(findingsList);
      this.el.appendChild(summary);

    } catch(e) {
      console.error('[Vault] Findings load error:', e);
    }
  }

  _clearHighlights() {
    if (!this.el) return;
    var items = this.el.querySelectorAll('.ws-vault-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('ws-vault-item--highlighted');
    }
  }

  _highlightByStatutoryBasis(statutoryBasis) {
    if (!this.el || !statutoryBasis) return;
    var self = this;
    var basisLower = statutoryBasis.toLowerCase();

    // Find which uploadIds have findings matching the statutory basis
    var matchingUploadIds = {};
    Object.keys(this._findingsSummary).forEach(function(uploadId) {
      var refs = self._findingsSummary[uploadId];
      for (var i = 0; i < refs.length; i++) {
        if (refs[i].toLowerCase().indexOf(basisLower) !== -1) {
          matchingUploadIds[uploadId] = true;
          break;
        }
      }
    });

    // Map uploadIds to document indices
    var matchingDocIds = {};
    this.documents.forEach(function(doc) {
      if (doc.uploadId && matchingUploadIds[doc.uploadId]) {
        matchingDocIds[doc.id] = true;
      }
    });

    // Apply highlight class to matching vault items
    var items = this.el.querySelectorAll('.ws-vault-item');
    var docIndex = 0;
    for (var j = 0; j < items.length; j++) {
      if (docIndex < self.documents.length && matchingDocIds[self.documents[docIndex].id]) {
        items[j].classList.add('ws-vault-item--highlighted');
      }
      docIndex++;
    }
  }

  _handleUpload() {
    var self = this;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx';
    input.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;

      // Size check (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be under 10MB.');
        return;
      }

      // Sprint 1: Upload flow placeholder
      var notice = document.createElement('div');
      notice.style.cssText = 'padding:12px 16px;background:#D1FAE5;border-bottom:1px solid #A7F3D0;font-size:13px;color:#065F46;font-family:Inter,system-ui;';
      notice.textContent = '"' + file.name + '" ready for upload. Full upload flow coming in Sprint 2.';
      self.el.insertBefore(notice, self.el.children[1]);
      setTimeout(function() { notice.remove(); }, 5000);
    });
    input.click();
  }

  // AILANE-CC-BRIEF-DOCV-FRONTEND-WIRING-001 · F5a — soft-delete via PATCH
  // deleted_at=now() (no DELETE policy on kl_vault_documents; owner UPDATE permits).
  // VAULT-PHASE-B-001 (Stage C · C2) — honest delete: Prefer: return=representation,
  // and the row is treated as deleted ONLY when the representation is a NON-EMPTY
  // array (the set of rows the UPDATE actually touched). An empty array means RLS
  // filtered the update to zero rows (an aal1 session under aal2_required_when_
  // enrolled, wrong owner, or already deleted) — surfaced as a failure, never as
  // success. This supersedes the §4B return=minimal pattern: the Phase-B
  // owner-select policy lets the owner read their own soft-deleted rows, so the
  // representation read succeeds. A confirmed delete also writes the GDPR audit
  // row (operational_matter_deletion_log) — best-effort, never blocking.
  async _deleteDocument(docId) {
    if (!docId) return;
    if (!window.confirm('Delete this document? It will be removed from your vault.')) return;

    try {
      await ensureAal2(); // F4 dependency — vault writes require aal2 when MFA-enrolled
    } catch (e) {
      this._showError('Multi-factor authentication required to delete (' + ((e && e.code) || 'mfa') + ').');
      return;
    }

    var user = window.__ailaneUser;
    if (!user) { this._showError('Not signed in.'); return; }

    this._setRowState(docId, 'generating');

    var resp;
    try {
      resp = await fetch(
        'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_vault_documents?id=eq.' + docId + '&deleted_at=is.null&select=id,deleted_at',
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ deleted_at: new Date().toISOString() })
        }
      );
    } catch (e) {
      this._setRowState(docId, 'error');
      this._showError('Delete failed (network): ' + ((e && e.message) || e));
      return;
    }

    if (resp.status < 200 || resp.status >= 300) {
      var body = '';
      try { body = await resp.text(); } catch (e) {}
      console.error('[Vault] delete failed: HTTP ' + resp.status + ' — ' + (body || '(no body)'));
      this._setRowState(docId, 'error');
      this._showError('Delete failed (HTTP ' + resp.status + '): ' + body.slice(0, 200));
      return;
    }

    var confirmedRows = null;
    try { confirmedRows = await resp.json(); } catch (e) { confirmedRows = null; }
    if (!confirmedRows || !confirmedRows.length) {
      console.error('[Vault] delete unconfirmed: the PATCH matched zero rows (RLS-filtered or already deleted)');
      this._setRowState(docId, 'error');
      this._showError('Could not confirm the deletion. Refresh and try again — if two-factor is on for your account, you may need to re-verify.');
      return;
    }

    this._recordDeletionAudit(docId);

    await this._loadDocuments(); // refresh list (existing method, already filters deleted_at=is.null)
    this._render();
  }

  // VAULT-PHASE-B-001 (Stage C · C2) — GDPR delete-audit. One row per confirmed
  // delete into operational_matter_deletion_log (org-scoped RLS insert; matter_id
  // carries the vault document id). Best-effort: failure logs to console only.
  // GDPR Art 17 decision (recorded): the user-facing delete stays a SOFT delete +
  // this audit row; full erasure (storage object + row purge) remains a
  // service-role back-office process — no hard-delete Edge Function this phase.
  _recordDeletionAudit(docId) {
    var user = window.__ailaneUser;
    if (!user) return;
    var REST = 'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1';
    var headers = {
      'Authorization': 'Bearer ' + user.token,
      'apikey': window.__SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    fetch(REST + '/rpc/get_my_org_id', { method: 'POST', headers: headers, body: '{}' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (orgId) {
        if (!orgId) { console.warn('[Vault] delete-audit skipped: no org id'); return; }
        return fetch(REST + '/operational_matter_deletion_log', {
          method: 'POST',
          headers: Object.assign({ 'Prefer': 'return=minimal' }, headers),
          body: JSON.stringify({ org_id: orgId, matter_id: docId, reason: 'vault_document_user_delete' })
        }).then(function (r) {
          if (!(r.status >= 200 && r.status < 300)) {
            return r.text().then(function (b) {
              console.warn('[Vault] delete-audit failed: HTTP ' + r.status + ' — ' + (b || '(no body)'));
            });
          }
        });
      })
      .catch(function (e) { console.warn('[Vault] delete-audit failed:', e); });
  }

  // AILANE-CC-BRIEF-DOCV-FRONTEND-WIRING-001 · F5b
  // generate-solicitor-pack expects { document_id } (confirmed from the live
  // operational/documents surface) and returns a PDF blob on 200 (402 = quota, 409 = no
  // analysis yet). docId is the kl_vault_documents.id and doubles as the row-state key.
  async _generateSolicitorPack(docId) {
    if (!docId) return;

    try {
      await ensureAal2(); // safe-by-default per brief §6.1
    } catch (e) {
      this._showError('Multi-factor authentication required (' + ((e && e.code) || 'mfa') + ').');
      return;
    }

    var user = window.__ailaneUser;
    if (!user) { this._showError('Not signed in.'); return; }

    this._setRowState(docId, 'generating');

    var resp;
    try {
      resp = await fetch('https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/generate-solicitor-pack', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ document_id: docId })
      });
    } catch (e) {
      this._setRowState(docId, 'error');
      this._showError('Network error: ' + ((e && e.message) || e));
      return;
    }

    await this._handleFileResponse(docId, resp, 'Ailane_Solicitor_Pack.pdf');
  }

  // AILANE-CC-BRIEF-DOCV-FRONTEND-WIRING-001 · F5c
  // generate-vault-report-pdf expects { upload_id } (confirmed from the live
  // operational/documents surface — NOT document_id; §7 / open-question #5 resolved) and
  // returns a PDF blob on 200. rowId keys the row state; uploadId is the EF payload.
  async _generateVaultReportPdf(rowId, uploadId) {
    if (!uploadId) return;

    try {
      await ensureAal2(); // safe-by-default per brief §7
    } catch (e) {
      this._showError('Multi-factor authentication required (' + ((e && e.code) || 'mfa') + ').');
      return;
    }

    var user = window.__ailaneUser;
    if (!user) { this._showError('Not signed in.'); return; }

    this._setRowState(rowId, 'generating');

    var resp;
    try {
      resp = await fetch('https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/generate-vault-report-pdf', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ upload_id: uploadId })
      });
    } catch (e) {
      this._setRowState(rowId, 'error');
      this._showError('Network error: ' + ((e && e.message) || e));
      return;
    }

    await this._handleFileResponse(rowId, resp, 'Ailane_Vault_Exposure_Report.pdf');
  }

  // Shared honest response handler for the two PDF-generating EFs (F5b/F5c §6.2).
  // Parses the body BEFORE assuming success; never swallows an error (brief §9).
  async _handleFileResponse(rowId, resp, defaultName) {
    var ct = resp.headers.get('content-type') || '';

    // Friendly handling for the documented non-200 statuses from these EFs.
    if (resp.status === 402) {
      this._setRowState(rowId, 'error');
      this._showError('You have used your included packs for this period. Additional packs are available separately.');
      return;
    }
    if (resp.status === 409) {
      this._setRowState(rowId, 'error');
      this._showError('Run a compliance check on this document first.');
      return;
    }
    if (resp.status !== 200) {
      var text = '';
      try { text = await resp.text(); } catch (e) {}
      this._setRowState(rowId, 'error');
      this._showError('Generation failed (HTTP ' + resp.status + '): ' + text.slice(0, 200));
      return;
    }

    // 200 — branch on content-type.
    if (ct.indexOf('application/json') !== -1) {
      var jbody = null;
      try { jbody = await resp.json(); } catch (e) {}
      if (jbody && jbody.error) {
        this._setRowState(rowId, 'error');
        this._showError('Not ready: ' + jbody.error);
        return;
      }
      if (jbody && jbody.url) {
        this._setRowState(rowId, 'ready');
        window.open(jbody.url, '_blank', 'noopener');
        return;
      }
      this._setRowState(rowId, 'error');
      this._showError('Unexpected response shape from the server.');
      console.error('[Vault] unexpected JSON from PDF EF:', jbody);
      return;
    }

    if (ct.indexOf('application/pdf') !== -1 || ct.indexOf('octet-stream') !== -1 || ct === '') {
      var blob;
      try { blob = await resp.blob(); } catch (e) {
        this._setRowState(rowId, 'error');
        this._showError('Could not read the generated file.');
        return;
      }
      this._openBlob(blob, this._filenameFromResponse(resp, defaultName));
      this._setRowState(rowId, 'ready');
      return;
    }

    this._setRowState(rowId, 'error');
    this._showError('Unexpected content type: ' + ct);
    console.error('[Vault] unexpected content-type from PDF EF:', ct);
  }

  _filenameFromResponse(resp, fallback) {
    var cd = resp.headers.get('Content-Disposition');
    if (cd) {
      var m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
      if (m && m[1]) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
    }
    return fallback;
  }

  // Open the PDF in a new tab (brief §6.3 / §10 #3). window.open after an awaited
  // fetch can be popup-blocked, so fall back to an anchor download (the mechanism the
  // live operational/documents page uses) to guarantee the Director can view the file.
  _openBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var win = window.open(url, '_blank', 'noopener');
    if (!win) {
      var a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
  }

  // Per-row progress/error state. Disables this row's action buttons while busy and
  // updates the row's status text. Mirrors the loading-state pattern of panel-documents.
  _setRowState(rowId, state) {
    if (!this.el) return;
    var row = this.el.querySelector('.ws-vault-item[data-doc-id="' + rowId + '"]');
    if (!row) return;
    var busy = (state === 'generating');
    var btns = row.querySelectorAll('.ws-vault-act');
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = busy;
      btns[i].style.opacity = busy ? '0.6' : '';
      btns[i].style.cursor = busy ? 'default' : 'pointer';
    }
    var status = row.querySelector('.ws-vault-row-status');
    if (status) {
      if (state === 'generating') status.textContent = 'Preparing…';
      else if (state === 'ready') status.textContent = 'Ready';
      else status.textContent = '';
    }
  }

  // Surface every error to the user (brief §9 — no silent swallows). Inline red banner
  // under the header, mirroring the green notice banner already used by _handleUpload.
  _showError(message) {
    if (!this.el) return;
    var existing = this.el.querySelector('.ws-vault-error');
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.className = 'ws-vault-error';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'padding:10px 16px;background:#FEE2E2;border-bottom:1px solid #FCA5A5;color:#991B1B;font-size:13px;font-family:Inter,system-ui;';
    banner.textContent = message;
    if (this.el.children.length > 1) this.el.insertBefore(banner, this.el.children[1]);
    else this.el.appendChild(banner);
    setTimeout(function() { if (banner.parentNode) banner.remove(); }, 7000);
  }
}

// Expose globally for panel system lazy loading
window.AilaneVaultPanel = AilaneVaultPanel;
