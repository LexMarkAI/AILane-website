/**
 * CLIPBOARD PANEL — Sprint 2
 * KLUI-001 §3.7
 *
 * Session-scoped clipboard for collecting content from other panels.
 * Storage: sessionStorage under key 'ailane_clipboard' (max 50 clips).
 * No Supabase data — pure client-side panel.
 */

var CLIP_TYPE_COLOURS = {
  text: '#6B7280',
  requirement: '#0A5C52',
  eileen: '#06B6D4',
  clause: '#0A2342',
  finding: '#D97706'
};

var CLIP_TYPE_LABELS = {
  text: 'Text',
  requirement: 'Requirement',
  eileen: 'Eileen',
  clause: 'Clause',
  finding: 'Finding'
};

var CLIPBOARD_KEY = 'ailane_clipboard';
var MAX_CLIPS = 50;
var WARN_THRESHOLD = 45;

class AilaneClipboardPanel {
  constructor(container, bus) {
    this.bus = bus;
    this.el = null;

    // Listen for clipboard:add signals
    var self = this;
    this.bus.on('clipboard:add', function(data) {
      self._addClip(data);
    });
  }

  mount(container) {
    this.el = container;
    this._render();
  }

  _getClips() {
    try {
      var stored = sessionStorage.getItem(CLIPBOARD_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch(e) {
      return [];
    }
  }

  _saveClips(clips) {
    sessionStorage.setItem(CLIPBOARD_KEY, JSON.stringify(clips));
  }

  _addClip(clipData) {
    var clips = this._getClips();

    var clip = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      text: clipData.text || '',
      source: clipData.source || 'Unknown',
      sourceRef: clipData.sourceRef || '',
      clipType: clipData.clipType || 'text',
      timestamp: clipData.timestamp || new Date().toISOString()
    };

    // At capacity: remove oldest
    if (clips.length >= MAX_CLIPS) {
      clips.pop();
    }

    clips.unshift(clip);
    this._saveClips(clips);

    // Re-render if panel is open
    if (this.el && this.el.parentNode) {
      this._render();
    }
  }

  _removeClip(clipId) {
    var clips = this._getClips().filter(function(c) { return c.id !== clipId; });
    this._saveClips(clips);
    this._render();
  }

  _render() {
    if (!this.el) return;
    var self = this;
    this.el.innerHTML = '';
    this.el.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    var clips = this._getClips();

    // Header with count
    var header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #E5E7EB;';

    var count = document.createElement('span');
    count.style.cssText = 'font-size:12px;color:#6B7280;font-family:Inter,system-ui;';
    count.textContent = clips.length + '/' + MAX_CLIPS + ' clips';
    header.appendChild(count);

    if (clips.length > 0) {
      var clearBtn = document.createElement('button');
      clearBtn.style.cssText = 'padding:4px 10px;background:none;border:1px solid #D1D5DB;border-radius:6px;font-size:11px;color:#6B7280;cursor:pointer;font-family:Inter,system-ui;';
      clearBtn.textContent = 'Clear All';
      clearBtn.addEventListener('click', function() {
        if (confirm('Clear all clipboard items?')) {
          self._saveClips([]);
          self._render();
        }
      });
      header.appendChild(clearBtn);
    }

    this.el.appendChild(header);

    // Capacity warning
    if (clips.length >= WARN_THRESHOLD && clips.length < MAX_CLIPS) {
      var warning = document.createElement('div');
      warning.className = 'ws-clip-warning';
      warning.textContent = 'Clipboard nearly full (' + clips.length + '/' + MAX_CLIPS + '). Oldest clips will be removed when limit is reached.';
      this.el.appendChild(warning);
    }

    // Empty state
    if (clips.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'ws-clip-empty';
      empty.style.cssText = 'padding:40px 16px;text-align:center;';
      empty.innerHTML =
        '<p style="font-size:14px;font-weight:600;color:#0A2342;margin:0 0 4px;">Your clipboard is empty</p>' +
        '<p style="font-size:12px;color:#6B7280;margin:0;">Copy content from the Research, Vault, or Eileen panels to collect it here.</p>';
      this.el.appendChild(empty);
      return;
    }

    // Clip list
    var list = document.createElement('div');
    list.className = 'ws-clip-list';
    list.style.cssText = 'flex:1;overflow-y:auto;';

    clips.forEach(function(clip) {
      var item = document.createElement('div');
      item.className = 'ws-clip-item';
      item.setAttribute('tabindex', '0');

      // Badge + preview
      var top = document.createElement('div');
      top.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;';

      var badge = document.createElement('span');
      badge.className = 'ws-clip-type-badge';
      badge.style.cssText = 'background:' + (CLIP_TYPE_COLOURS[clip.clipType] || '#6B7280') + ';color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;font-family:Inter,system-ui;';
      badge.textContent = CLIP_TYPE_LABELS[clip.clipType] || clip.clipType;
      top.appendChild(badge);

      var source = document.createElement('span');
      source.style.cssText = 'font-size:10px;color:#6B7280;font-family:Inter,system-ui;';
      source.textContent = clip.source;
      top.appendChild(source);

      var time = document.createElement('span');
      time.style.cssText = 'font-size:10px;color:#9CA3AF;font-family:Inter,system-ui;margin-left:auto;';
      time.textContent = new Date(clip.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      top.appendChild(time);

      item.appendChild(top);

      // Preview text
      var preview = document.createElement('div');
      preview.className = 'ws-clip-preview';
      preview.textContent = clip.text.length > 100 ? clip.text.substring(0, 100) + '\u2026' : clip.text;
      item.appendChild(preview);

      // Actions
      var actions = document.createElement('div');
      actions.className = 'ws-clip-actions';

      var copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        navigator.clipboard.writeText(clip.text).then(function() {
          copyBtn.textContent = 'Copied!';
          setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
        });
      });
      actions.appendChild(copyBtn);

      var toNotesBtn = document.createElement('button');
      toNotesBtn.textContent = 'Send to Notes';
      toNotesBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self.bus.emit('clipboard:to-notes', {
          text: clip.text,
          source: clip.source,
          sourceRef: clip.sourceRef,
          clipType: clip.clipType
        });
        toNotesBtn.textContent = 'Sent!';
        setTimeout(function() { toNotesBtn.textContent = 'Send to Notes'; }, 1500);
      });
      actions.appendChild(toNotesBtn);

      var deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.style.color = '#DC2626';
      deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self._removeClip(clip.id);
      });
      actions.appendChild(deleteBtn);

      item.appendChild(actions);
      list.appendChild(item);
    });

    this.el.appendChild(list);
  }
}

// Global add clip API
window.__addClip = function(clipData) {
  var clips = [];
  try {
    var stored = sessionStorage.getItem(CLIPBOARD_KEY);
    clips = stored ? JSON.parse(stored) : [];
  } catch(e) { clips = []; }

  var clip = {
    id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    text: clipData.text || '',
    source: clipData.source || 'Unknown',
    sourceRef: clipData.sourceRef || '',
    clipType: clipData.clipType || 'text',
    timestamp: clipData.timestamp || new Date().toISOString()
  };

  if (clips.length >= MAX_CLIPS) clips.pop();
  clips.unshift(clip);
  sessionStorage.setItem(CLIPBOARD_KEY, JSON.stringify(clips));
};

// Expose globally for panel system lazy loading
window.__PanelClipboard = AilaneClipboardPanel;
