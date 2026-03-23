/**
 * NOTES PANEL — Sprint 1
 * KLUI-001 §3.2
 *
 * Contenteditable editor with auto-save to kl_workspace_notes.
 * Sprint 1 scope: basic rich text, project selector, note list, auto-save.
 * NOT in Sprint 1: statutory reference auto-linking, DOCX/PDF export, Copy from Research.
 * TipTap integration deferred to Sprint 2 when npm is configured.
 */
class AilaneNotesPanel {
  constructor(container, bus) {
    this.bus = bus;
    this.editor = null;
    this.notes = [];
    this.projects = [];
    this.activeProject = null;
    this.activeNote = null;
    this.el = null;
    this._saveTimeout = null;
    this._saving = false;
    this.sidebarEl = null;
    this.editorContainer = null;
    this.saveIndicator = null;
    this.editorEl = null;
  }

  async mount(container) {
    this.el = container;
    this.el.innerHTML = '<div class="ws-skeleton" style="height:200px;margin:16px;"></div>';

    try {
      await this._loadProjects();
      await this._loadNotes();
      this._render();
    } catch(e) {
      console.error('[Notes] Mount error:', e);
      this.el.innerHTML = '<p style="padding:16px;color:#991B1B;">Unable to load notes. Please try again.</p>';
    }
  }

  async _loadProjects() {
    var user = window.__ailaneUser;
    var res = await fetch(
      'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_workspace_projects?user_id=eq.' + user.id + '&status=eq.active&order=updated_at.desc',
      {
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    this.projects = await res.json() || [];

    // If no projects, create a default one
    if (this.projects.length === 0) {
      var createRes = await fetch(
        'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_workspace_projects',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: user.id,
            org_id: user.orgId,
            name: 'General Notes',
            project_type: 'general'
          })
        }
      );
      var newProject = await createRes.json();
      this.projects = Array.isArray(newProject) ? newProject : [newProject];
    }

    this.activeProject = this.projects[0];
  }

  async _loadNotes() {
    if (!this.activeProject) return;
    var user = window.__ailaneUser;

    var res = await fetch(
      'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_workspace_notes?project_id=eq.' + this.activeProject.id + '&user_id=eq.' + user.id + '&order=pinned.desc,updated_at.desc',
      {
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': window.__SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    this.notes = await res.json() || [];

    if (this.notes.length > 0) {
      this.activeNote = this.notes[0];
    }
  }

  _render() {
    var self = this;
    this.el.innerHTML = '';
    this.el.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    // Project selector + New Note button
    var topBar = document.createElement('div');
    topBar.style.cssText = 'padding:8px 12px;display:flex;gap:8px;border-bottom:1px solid #E5E7EB;background:#F9FAFB;align-items:center;';

    var projectSelect = document.createElement('select');
    projectSelect.style.cssText = 'flex:1;padding:6px 8px;border:1px solid #D1D5DB;border-radius:6px;font-size:12px;font-family:Inter,system-ui;background:white;';
    this.projects.forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (self.activeProject && p.id === self.activeProject.id) opt.selected = true;
      projectSelect.appendChild(opt);
    });

    // Add "New Project" option
    var newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '+ New Project';
    projectSelect.appendChild(newOpt);

    projectSelect.addEventListener('change', async function(e) {
      if (e.target.value === '__new__') {
        var name = prompt('Project name:');
        if (name) await self._createProject(name);
        else projectSelect.value = self.activeProject ? self.activeProject.id : '';
      } else {
        self.activeProject = self.projects.find(function(p) { return p.id === e.target.value; });
        await self._loadNotes();
        self._renderNotesList();
        self._renderEditor();
        self.bus.emit('project:selected', {
          projectId: self.activeProject.id,
          projectName: self.activeProject.name
        });
      }
    });
    topBar.appendChild(projectSelect);

    var newNoteBtn = document.createElement('button');
    newNoteBtn.style.cssText = 'padding:6px 10px;background:#0A5C52;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:Inter,system-ui;';
    newNoteBtn.textContent = '+ Note';
    newNoteBtn.addEventListener('click', function() { self._createNote(); });
    topBar.appendChild(newNoteBtn);

    this.el.appendChild(topBar);

    // Main content area: sidebar + editor
    var main = document.createElement('div');
    main.style.cssText = 'display:flex;flex:1;overflow:hidden;';

    // Note list sidebar
    this.sidebarEl = document.createElement('div');
    this.sidebarEl.className = 'ws-notes-sidebar';
    this._renderNotesList();
    main.appendChild(this.sidebarEl);

    // Editor area
    this.editorContainer = document.createElement('div');
    this.editorContainer.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
    this._renderEditor();
    main.appendChild(this.editorContainer);

    this.el.appendChild(main);
  }

  _renderNotesList() {
    var self = this;
    this.sidebarEl.innerHTML = '';

    if (this.notes.length === 0) {
      this.sidebarEl.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:#6B7280;">No notes yet</div>';
      return;
    }

    this.notes.forEach(function(note) {
      var item = document.createElement('div');
      item.className = 'ws-notes-list-item' +
        (self.activeNote && self.activeNote.id === note.id ? ' active' : '') +
        (note.pinned ? ' pinned' : '');

      var title = document.createElement('div');
      title.className = 'ws-notes-title';
      title.textContent = note.title || 'Untitled Note';
      item.appendChild(title);

      var preview = document.createElement('div');
      preview.className = 'ws-notes-preview';
      preview.textContent = (note.content_plain || '').substring(0, 60);
      item.appendChild(preview);

      item.addEventListener('click', function() {
        self.activeNote = note;
        self._renderNotesList();
        self._renderEditor();
        self.bus.emit('note:active', {
          noteId: note.id,
          title: note.title,
          topics: note.statutory_refs || []
        });
      });

      self.sidebarEl.appendChild(item);
    });
  }

  _renderEditor() {
    var self = this;
    this.editorContainer.innerHTML = '';

    if (!this.activeNote) {
      this.editorContainer.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:32px;text-align:center;">' +
          '<p style="font-size:14px;color:#6B7280;">Select a note or create a new one.</p>' +
        '</div>';
      return;
    }

    // Title input
    var titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = this.activeNote.title || '';
    titleInput.placeholder = 'Note title...';
    titleInput.style.cssText = 'flex:none;border:none;font-size:16px;font-weight:600;color:#0A2342;outline:none;font-family:Inter,system-ui;padding:8px 16px;border-bottom:1px solid #E5E7EB;';
    titleInput.addEventListener('input', function() {
      self.activeNote.title = titleInput.value;
      self._scheduleAutoSave();
    });
    this.editorContainer.appendChild(titleInput);

    // Auto-save indicator
    this.saveIndicator = document.createElement('div');
    this.saveIndicator.className = 'ws-autosave ws-autosave--saved';
    this.saveIndicator.style.cssText = 'padding:4px 16px;';
    this.saveIndicator.innerHTML = '<span>\u2713</span> Saved';
    this.editorContainer.appendChild(this.saveIndicator);

    // Editor container
    var editorDiv = document.createElement('div');
    editorDiv.className = 'ws-notes-editor';
    this.editorContainer.appendChild(editorDiv);

    // Sprint 1 MVP: contenteditable with basic formatting
    this._initBasicEditor(editorDiv);
  }

  _initBasicEditor(container) {
    var self = this;
    var editor = document.createElement('div');
    editor.contentEditable = true;
    editor.className = 'ProseMirror';
    editor.style.cssText = 'min-height:200px;outline:none;padding:0;';

    // Load existing content
    if (this.activeNote.content_plain) {
      editor.innerHTML = this.activeNote.content_plain
        .split('\n')
        .map(function(line) { return '<p>' + (line || '<br>') + '</p>'; })
        .join('');
    } else {
      editor.innerHTML = '<p><br></p>';
    }

    // Input handler for auto-save
    editor.addEventListener('input', function() {
      self._scheduleAutoSave();
      self.saveIndicator.className = 'ws-autosave ws-autosave--unsaved';
      self.saveIndicator.innerHTML = '<span>\u25CF</span> Unsaved';
    });

    this.editorEl = editor;
    container.appendChild(editor);
  }

  _scheduleAutoSave() {
    var self = this;
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(function() { self._autoSave(); }, 3000);
  }

  async _autoSave() {
    if (this._saving || !this.activeNote) return;
    this._saving = true;

    var user = window.__ailaneUser;
    var plainText = this.editorEl ? this.editorEl.innerText : '';

    try {
      await fetch(
        'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_workspace_notes?id=eq.' + this.activeNote.id,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            title: this.activeNote.title,
            content_plain: plainText,
            content_json: { html: this.editorEl ? this.editorEl.innerHTML : '' },
            updated_at: new Date().toISOString()
          })
        }
      );

      this.saveIndicator.className = 'ws-autosave ws-autosave--saved';
      this.saveIndicator.innerHTML = '<span>\u2713</span> Saved';

      // Update note in local list
      var self = this;
      var idx = this.notes.findIndex(function(n) { return n.id === self.activeNote.id; });
      if (idx >= 0) {
        this.notes[idx].title = this.activeNote.title;
        this.notes[idx].content_plain = plainText;
        this._renderNotesList();
      }
    } catch(e) {
      console.error('[Notes] Auto-save failed:', e);
      this.saveIndicator.className = 'ws-autosave';
      this.saveIndicator.innerHTML = '<span style="color:#DC2626;">\u2717</span> Save failed';
    }

    this._saving = false;
  }

  async _createNote() {
    if (!this.activeProject) return;
    var user = window.__ailaneUser;
    var self = this;

    try {
      var res = await fetch(
        'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_workspace_notes',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            project_id: self.activeProject.id,
            user_id: user.id,
            title: 'Untitled Note',
            content_json: {},
            content_plain: ''
          })
        }
      );
      var newNote = await res.json();
      var note = Array.isArray(newNote) ? newNote[0] : newNote;
      this.notes.unshift(note);
      this.activeNote = note;
      this._renderNotesList();
      this._renderEditor();
    } catch(e) {
      console.error('[Notes] Create failed:', e);
    }
  }

  async _createProject(name) {
    var user = window.__ailaneUser;
    var self = this;

    try {
      var res = await fetch(
        'https://cnbsxwtvazfvzmltkuvx.supabase.co/rest/v1/kl_workspace_projects',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'apikey': window.__SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: user.id,
            org_id: user.orgId,
            name: name,
            project_type: 'general'
          })
        }
      );
      var newProject = await res.json();
      var project = Array.isArray(newProject) ? newProject[0] : newProject;
      this.projects.push(project);
      this.activeProject = project;
      this.notes = [];
      this.activeNote = null;
      this._render();
    } catch(e) {
      console.error('[Notes] Create project failed:', e);
    }
  }
}

// Expose globally for panel system lazy loading
window.AilaneNotesPanel = AilaneNotesPanel;
