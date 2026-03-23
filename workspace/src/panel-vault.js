/**
 * DOCUMENT VAULT PANEL — Sprint 1
 * KLUI-001 §3.1
 *
 * Reads from:
 * - kl_vault_documents (KLAC-001) — user's stored documents
 * - compliance_uploads (existing) — check results with overall_score
 * - compliance_findings (existing) — per-clause findings with severity
 */
class AilaneVaultPanel {
  constructor(container, bus) {
    this.bus = bus;
    this.documents = [];
    this.activeDocId = null;
    this.el = null;
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
  }

  _render() {
    var self = this;
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
        monitored.title = 'Monitored — auto-rescanned';
        item.appendChild(monitored);
      }

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
}

// Expose globally for panel system lazy loading
window.AilaneVaultPanel = AilaneVaultPanel;
