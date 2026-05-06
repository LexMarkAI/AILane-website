/**
 * DOCUMENTS PANEL — Sprint 2
 * KLUI-001 §3.3
 *
 * Workspace document creation and editing with mandatory disclaimer and watermark preview.
 * Data source: kl_workspace_documents table (KLWS-001 §3.3)
 */

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';

var DOC_TYPE_LABELS = {
  contract_outline: 'Contract Outline',
  policy_draft: 'Policy Draft',
  procedure: 'Procedure',
  handbook_section: 'Handbook Section',
  notes_export: 'Notes Export'
};

var DISCLAIMER_TEXT = 'This document was created using Ailane Knowledge Library. It provides regulatory intelligence and does not constitute legal advice. Seek independent legal advice from a qualified employment solicitor before use. AI Lane Limited \u00B7 Company No. 17035654 \u00B7 ICO Reg. 00013389720';

class AilaneDocumentsPanel {
  constructor(container, bus) {
    this.bus = bus;
    this.documents = [];
    this.projects = [];
    this.activeDoc = null;
    this.el = null;
    this._saveTimeout = null;
    this._saving = false;
    this.editorEl = null;
    this.saveIndicator = null;
  }

  async mount(container) {
    this.el = container;
    this.el.innerHTML = '<div class="ws-skeleton" style="height:200px;margin:16px;"></div>';

    try {
      await this._loadDocuments();
      this._renderList();
    } catch(e) {
      console.error('[Documents] Load error:', e);
      this.el.innerHTML = '<p style="padding:16px;color:#991B1B;">Unable to load documents. Please try again.</p>';
    }
  }

  async _loadDocuments() {
    var user = window.__ailaneUser;
    if (!user) return;

    var res = await fetch(
      SUPABASE_URL + '/rest/v1/kl_workspace_documents?user_id=eq.' + user.id + '&order=updated_at.desc',
      {
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    this.documents = await res.json() || [];
  }

  _getTierLimit() {
    var user = window.__ailaneUser;
    if (!user) return 5;
    var tier = user.tier;
    if (tier === 'governance' || tier === 'enterprise' || tier === 'institutional') return Infinity;
    return 5; // operational_readiness / operational
  }

  _renderList() {
    var self = this;
    this.el.innerHTML = '';
    this.el.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    var limit = this._getTierLimit();
    var atLimit = isFinite(limit) && this.documents.length >= limit;

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E5E7EB;';

    var countText = document.createElement('span');
    countText.style.cssText = 'font-size:12px;color:#6B7280;font-family:Inter,system-ui;';
    if (isFinite(limit)) {
      countText.textContent = this.documents.length + '/' + limit + ' documents';
    } else {
      countText.textContent = this.documents.length + ' document' + (this.documents.length !== 1 ? 's' : '');
    }
    header.appendChild(countText);

    var newBtn = document.createElement('button');
    newBtn.style.cssText = 'padding:6px 12px;background:#0A5C52;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,system-ui;';
    newBtn.textContent = '+ New Document';
    if (atLimit) {
      newBtn.disabled = true;
      newBtn.style.opacity = '0.5';
      newBtn.style.cursor = 'not-allowed';
    }
    newBtn.addEventListener('click', function() {
      if (atLimit) return;
      self._showNewDocumentFlow();
    });
    header.appendChild(newBtn);
    this.el.appendChild(header);

    // Tier limit warning
    if (atLimit) {
      var warning = document.createElement('div');
      warning.style.cssText = 'padding:10px 16px;background:#FEF3C7;border-bottom:1px solid #FDE68A;font-size:12px;color:#92400E;font-family:Inter,system-ui;';
      warning.innerHTML = 'Document limit reached (' + limit + '/' + limit + '). <a href="/account/dashboard/" style="color:#0A5C52;text-decoration:underline;font-weight:600;">Upgrade to Governance</a> for unlimited documents.';
      this.el.appendChild(warning);
    }

    // Document list
    if (this.documents.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'ws-doc-empty';
      empty.style.cssText = 'padding:40px 16px;text-align:center;';
      empty.innerHTML =
        '<p style="font-size:14px;font-weight:600;color:#0A2342;margin:0 0 4px;">No documents yet</p>' +
        '<p style="font-size:12px;color:#6B7280;margin:0;">Create a contract outline, policy draft, or procedure document.</p>';
      this.el.appendChild(empty);
      return;
    }

    var list = document.createElement('div');
    list.className = 'ws-doc-list';

    this.documents.forEach(function(doc) {
      var item = document.createElement('div');
      item.className = 'ws-doc-item';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', doc.title + ', ' + (DOC_TYPE_LABELS[doc.document_type] || doc.document_type));

      var info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';

      var title = document.createElement('div');
      title.style.cssText = 'font-size:13px;font-weight:600;color:#0A2342;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      title.textContent = doc.title;
      info.appendChild(title);

      var meta = document.createElement('div');
      meta.style.cssText = 'font-size:11px;color:#6B7280;margin-top:2px;display:flex;gap:8px;align-items:center;';

      var badge = document.createElement('span');
      badge.className = 'ws-doc-type-badge';
      badge.textContent = DOC_TYPE_LABELS[doc.document_type] || doc.document_type;
      meta.appendChild(badge);

      var date = document.createElement('span');
      date.textContent = new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      meta.appendChild(date);

      if (doc.export_count > 0) {
        var exports = document.createElement('span');
        exports.textContent = doc.export_count + ' export' + (doc.export_count !== 1 ? 's' : '');
        meta.appendChild(exports);
      }

      info.appendChild(meta);
      item.appendChild(info);

      item.addEventListener('click', function() { self._openEditor(doc); });
      item.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') self._openEditor(doc);
      });

      list.appendChild(item);
    });

    this.el.appendChild(list);
  }

  _showNewDocumentFlow() {
    var self = this;
    this.el.innerHTML = '';
    this.el.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    // Back button
    var backBar = document.createElement('div');
    backBar.style.cssText = 'padding:12px 16px;border-bottom:1px solid #E5E7EB;';
    var backBtn = document.createElement('button');
    backBtn.style.cssText = 'background:none;border:none;color:#0A5C52;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,system-ui;display:flex;align-items:center;gap:4px;';
    backBtn.innerHTML = '&#8249; Back to Documents';
    backBtn.addEventListener('click', function() { self._renderList(); });
    backBar.appendChild(backBtn);
    this.el.appendChild(backBar);

    var form = document.createElement('div');
    form.style.cssText = 'padding:24px 16px;';

    // Title
    var titleLabel = document.createElement('label');
    titleLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#0A2342;margin-bottom:6px;font-family:Inter,system-ui;';
    titleLabel.textContent = 'Document Title';
    form.appendChild(titleLabel);

    var titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'e.g. Disciplinary Procedure Draft';
    titleInput.style.cssText = 'width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;font-family:Inter,system-ui;margin-bottom:16px;';
    form.appendChild(titleInput);

    // Document type
    var typeLabel = document.createElement('label');
    typeLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#0A2342;margin-bottom:6px;font-family:Inter,system-ui;';
    typeLabel.textContent = 'Document Type';
    form.appendChild(typeLabel);

    var typeSelect = document.createElement('select');
    typeSelect.style.cssText = 'width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;font-family:Inter,system-ui;margin-bottom:16px;background:white;';
    Object.keys(DOC_TYPE_LABELS).forEach(function(key) {
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = DOC_TYPE_LABELS[key];
      typeSelect.appendChild(opt);
    });
    form.appendChild(typeSelect);

    // Project selector
    var projLabel = document.createElement('label');
    projLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#0A2342;margin-bottom:6px;font-family:Inter,system-ui;';
    projLabel.textContent = 'Project (optional)';
    form.appendChild(projLabel);

    var projSelect = document.createElement('select');
    projSelect.style.cssText = 'width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:6px;font-size:13px;font-family:Inter,system-ui;margin-bottom:24px;background:white;';
    var noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = 'No project';
    projSelect.appendChild(noneOpt);
    form.appendChild(projSelect);

    // Load projects
    this._loadProjects().then(function() {
      self.projects.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        projSelect.appendChild(opt);
      });
    });

    // Create button
    var createBtn = document.createElement('button');
    createBtn.style.cssText = 'padding:10px 20px;background:#0A5C52;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,system-ui;width:100%;';
    createBtn.textContent = 'Create Document';
    createBtn.addEventListener('click', async function() {
      var title = titleInput.value.trim();
      if (!title) {
        titleInput.style.borderColor = '#DC2626';
        return;
      }
      createBtn.disabled = true;
      createBtn.textContent = 'Creating...';
      await self._createDocument(title, typeSelect.value, projSelect.value || null);
    });
    form.appendChild(createBtn);

    this.el.appendChild(form);
    titleInput.focus();
  }

  async _loadProjects() {
    var user = window.__ailaneUser;
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/kl_workspace_projects?user_id=eq.' + user.id + '&status=eq.active&order=updated_at.desc',
      {
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    this.projects = await res.json() || [];
  }

  async _createDocument(title, docType, projectId) {
    var user = window.__ailaneUser;
    var body = {
      user_id: user.id,
      document_type: docType,
      title: title,
      content_json: {},
      disclaimer_version: '1.0'
    };
    if (projectId) body.project_id = projectId;

    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/kl_workspace_documents',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(body)
        }
      );
      var newDoc = await res.json();
      var doc = Array.isArray(newDoc) ? newDoc[0] : newDoc;
      this.documents.unshift(doc);
      this._openEditor(doc);
    } catch(e) {
      console.error('[Documents] Create failed:', e);
      this._renderList();
    }
  }

  _openEditor(doc) {
    var self = this;
    this.activeDoc = doc;
    this.el.innerHTML = '';
    this.el.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    // Emit context bus signal
    this.bus.emit('document:selected', {
      id: doc.id,
      title: doc.title,
      documentType: doc.document_type
    });

    // Header with back button and actions
    var header = document.createElement('div');
    header.style.cssText = 'padding:8px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E5E7EB;background:#F9FAFB;';

    var backBtn = document.createElement('button');
    backBtn.style.cssText = 'background:none;border:none;color:#0A5C52;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,system-ui;display:flex;align-items:center;gap:4px;';
    backBtn.innerHTML = '&#8249; Back';
    backBtn.addEventListener('click', function() {
      self.activeDoc = null;
      self._renderList();
    });
    header.appendChild(backBtn);

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;';

    // Export placeholder
    var exportBtn = document.createElement('button');
    exportBtn.style.cssText = 'padding:5px 10px;background:none;border:1px solid #D1D5DB;border-radius:6px;font-size:11px;color:#6B7280;cursor:pointer;font-family:Inter,system-ui;';
    exportBtn.textContent = 'Export (PDF/DOCX)';
    exportBtn.addEventListener('click', function() {
      var notice = document.createElement('div');
      notice.style.cssText = 'position:fixed;bottom:80px;right:64px;background:#0A2342;color:white;padding:12px 20px;border-radius:10px;font-size:13px;font-family:Inter,system-ui;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.2);';
      notice.textContent = 'Server-side export with watermark \u2014 available in a future update.';
      document.body.appendChild(notice);
      setTimeout(function() { notice.remove(); }, 3000);
    });
    actions.appendChild(exportBtn);

    // Delete button
    var deleteBtn = document.createElement('button');
    deleteBtn.style.cssText = 'padding:5px 10px;background:none;border:1px solid #FCA5A5;border-radius:6px;font-size:11px;color:#DC2626;cursor:pointer;font-family:Inter,system-ui;';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', function() {
      if (confirm('Delete "' + doc.title + '"? This cannot be undone.')) {
        self._deleteDocument(doc.id);
      }
    });
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    this.el.appendChild(header);

    // Title input
    var titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = doc.title;
    titleInput.style.cssText = 'flex:none;border:none;font-size:16px;font-weight:600;color:#0A2342;outline:none;font-family:Inter,system-ui;padding:8px 16px;border-bottom:1px solid #E5E7EB;';
    titleInput.addEventListener('input', function() {
      self.activeDoc.title = titleInput.value;
      self._scheduleAutoSave();
    });
    this.el.appendChild(titleInput);

    // Save indicator
    this.saveIndicator = document.createElement('div');
    this.saveIndicator.className = 'ws-autosave ws-autosave--saved';
    this.saveIndicator.style.cssText = 'padding:4px 16px;';
    this.saveIndicator.innerHTML = '<span>\u2713</span> Saved';
    this.el.appendChild(this.saveIndicator);

    // Editor area with watermark
    var editorWrapper = document.createElement('div');
    editorWrapper.className = 'ws-doc-editor';
    editorWrapper.style.cssText = 'flex:1;position:relative;overflow-y:auto;';

    // Watermark preview overlay
    var watermark = document.createElement('div');
    watermark.className = 'ws-doc-watermark-preview';
    editorWrapper.appendChild(watermark);

    // ContentEditable editor
    var editor = document.createElement('div');
    editor.contentEditable = true;
    editor.className = 'ProseMirror';
    editor.style.cssText = 'min-height:200px;outline:none;padding:16px;position:relative;z-index:2;font-family:Inter,system-ui;font-size:14px;line-height:1.6;color:#1F2937;';

    // Load existing content
    if (doc.content_json && doc.content_json.html) {
      editor.innerHTML = doc.content_json.html;
    } else if (doc.content_plain) {
      editor.innerHTML = doc.content_plain
        .split('\n')
        .map(function(line) { return '<p>' + (line || '<br>') + '</p>'; })
        .join('');
    } else {
      editor.innerHTML = '<h2>Section 1</h2><p><br></p>';
    }

    editor.addEventListener('input', function() {
      self._scheduleAutoSave();
      self.saveIndicator.className = 'ws-autosave ws-autosave--unsaved';
      self.saveIndicator.innerHTML = '<span>\u25CF</span> Unsaved';
    });

    this.editorEl = editor;
    editorWrapper.appendChild(editor);
    this.el.appendChild(editorWrapper);

    // Disclaimer footer — NON-REMOVABLE
    var disclaimer = document.createElement('div');
    disclaimer.className = 'ws-doc-disclaimer';
    disclaimer.textContent = DISCLAIMER_TEXT;
    this.el.appendChild(disclaimer);
  }

  _scheduleAutoSave() {
    var self = this;
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(function() { self._autoSave(); }, 3000);
  }

  async _autoSave() {
    if (this._saving || !this.activeDoc) return;
    this._saving = true;

    var user = window.__ailaneUser;
    var plainText = this.editorEl ? this.editorEl.innerText : '';
    var htmlContent = this.editorEl ? this.editorEl.innerHTML : '';

    try {
      await fetch(
        SUPABASE_URL + '/rest/v1/kl_workspace_documents?id=eq.' + this.activeDoc.id,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            title: this.activeDoc.title,
            content_json: { html: htmlContent },
            content_plain: plainText,
            updated_at: new Date().toISOString()
          })
        }
      );

      this.saveIndicator.className = 'ws-autosave ws-autosave--saved';
      this.saveIndicator.innerHTML = '<span>\u2713</span> Saved';

      // Emit saved signal
      this.bus.emit('document:saved', {
        id: this.activeDoc.id,
        title: this.activeDoc.title
      });

      // Update local list
      var self = this;
      var idx = this.documents.findIndex(function(d) { return d.id === self.activeDoc.id; });
      if (idx >= 0) {
        this.documents[idx].title = this.activeDoc.title;
        this.documents[idx].content_json = { html: htmlContent };
        this.documents[idx].content_plain = plainText;
        this.documents[idx].updated_at = new Date().toISOString();
      }
    } catch(e) {
      console.error('[Documents] Auto-save failed:', e);
      this.saveIndicator.className = 'ws-autosave';
      this.saveIndicator.innerHTML = '<span style="color:#DC2626;">\u2717</span> Save failed';
    }

    this._saving = false;
  }

  async _deleteDocument(docId) {
    var user = window.__ailaneUser;
    var self = this;

    try {
      await fetch(
        SUPABASE_URL + '/rest/v1/kl_workspace_documents?id=eq.' + docId,
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      this.documents = this.documents.filter(function(d) { return d.id !== docId; });
      this.activeDoc = null;
      this._renderList();
    } catch(e) {
      console.error('[Documents] Delete failed:', e);
    }
  }
}

// Expose globally for panel system lazy loading
window.__PanelDocuments = AilaneDocumentsPanel;
