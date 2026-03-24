/**
 * EILEEN CHAT UI — KLUI-001 §3.4
 * Message rendering, typing indicator, markdown, API calls,
 * message history loading from kl_eileen_conversations.
 */

var EDGE_FN_URL = 'https://cnbsxwtvazfvzmltkuvx.functions.supabase.co/kl_ai_assistant';
var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NDQ5MDIsImV4cCI6MjA1NzEyMDkwMn0.LMfOjHp97P9MKaOeaK3GI2JCQ7kj5Kxpuq6llLD-1H0';

var _messagesEl = null;
var _inputEl = null;
var _sendBtn = null;
var _typingEl = null;
var _nexusHandle = null;
var _bus = null;
var _currentSessionId = null;
var _isProcessing = false;

// Simple markdown rendering (no external deps)
function _renderMarkdown(text) {
  if (!text) return '';
  var html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Newlines
  html = html.replace(/\n/g, '<br>');

  // Statutory reference chips — match patterns like "s.1 ERA 1996", "reg. 4 TUPE 2006", etc.
  html = html.replace(/((?:s\.|section |reg\.|regulation |Schedule )\d+[A-Z]?(?:\(\d+\))?(?:\([a-z]\))?\s+[A-Z][A-Za-z\s]*\d{4})/g,
    '<span class="ws-eileen-statute-chip">$1</span>');

  return html;
}

function _formatDate(dateStr) {
  var d = new Date(dateStr);
  var day = d.getDate();
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var month = months[d.getMonth()];
  var year = d.getFullYear();
  var hours = String(d.getHours()).padStart(2, '0');
  var mins = String(d.getMinutes()).padStart(2, '0');
  return day + ' ' + month + ' ' + year + ' ' + hours + ':' + mins;
}

function _createMessageBubble(type, content, timestamp) {
  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;gap:8px;' + (type === 'user' ? 'justify-content:flex-end;' : 'justify-content:flex-start;');

  if (type === 'eileen') {
    // Mini nexus avatar
    var avatarContainer = document.createElement('div');
    avatarContainer.style.cssText = 'flex-shrink:0;width:24px;height:24px;margin-top:4px;';
    window.__NexusAvatar.create(avatarContainer, 24, false, false);
    wrapper.appendChild(avatarContainer);
  }

  var bubble = document.createElement('div');
  bubble.className = type === 'user' ? 'ws-eileen-msg--user' : 'ws-eileen-msg--eileen';

  if (type === 'eileen') {
    bubble.innerHTML = _renderMarkdown(content);

    // Save to Notes button
    var saveBtn = document.createElement('button');
    saveBtn.className = 'ws-eileen-save-btn';
    saveBtn.textContent = 'Save to Notes';
    saveBtn.setAttribute('aria-label', 'Save this response to Notes');
    saveBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (_bus) {
        var dateStr = _formatDate(timestamp || new Date().toISOString());
        var preview = content.length > 40 ? content.substring(0, 40) : content;
        _bus.emit('content:copy', {
          content: content,
          sourceAttribution: '[Eileen \u2014 ' + dateStr + '] ' + preview,
          format: 'text'
        });
      }
    });
    bubble.appendChild(saveBtn);
  } else {
    bubble.textContent = content;
  }

  wrapper.appendChild(bubble);
  return wrapper;
}

function _scrollToBottom() {
  if (_messagesEl) {
    _messagesEl.scrollTop = _messagesEl.scrollHeight;
  }
}

function _showTyping() {
  if (_typingEl) _typingEl.style.display = 'flex';
  if (_nexusHandle) _nexusHandle.update(true, true);
}

function _hideTyping() {
  if (_typingEl) _typingEl.style.display = 'none';
  if (_nexusHandle) _nexusHandle.update(true, false);
}

async function _sendMessage(text) {
  if (_isProcessing || !text.trim()) return;
  _isProcessing = true;
  var user = window.__ailaneUser;
  if (!user) { _isProcessing = false; return; }

  // Ensure we have a session
  if (!_currentSessionId) {
    var session = await window.__EileenSessions.createSession();
    if (session && session.id) {
      _currentSessionId = session.id;
    } else {
      _isProcessing = false;
      return;
    }
  }

  // Render user message
  var userBubble = _createMessageBubble('user', text.trim(), new Date().toISOString());
  _messagesEl.appendChild(userBubble);
  if (_inputEl) _inputEl.value = '';
  _scrollToBottom();

  // Show typing indicator
  _showTyping();

  try {
    var workspaceContext = window.__EileenContext ? window.__EileenContext.getWorkspaceContext() : {};
    var response = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + user.token,
        'apikey': ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text.trim(),
        session_id: _currentSessionId,
        page_context: 'workspace',
        workspace_context: workspaceContext
      })
    });

    var data = await response.json();
    _hideTyping();

    var eileenText = data.response || data.message || data.reply || 'I was unable to process that request. Please try again.';
    var eileenBubble = _createMessageBubble('eileen', eileenText, new Date().toISOString());
    _messagesEl.appendChild(eileenBubble);
    _scrollToBottom();

    // Emit response signal for badge logic
    if (_bus) {
      _bus.emit('eileen:response', {
        messageId: data.id || null,
        content: eileenText,
        topic: data.topic || null
      });
    }

    // Auto-title session after first response
    var sessions = window.__EileenSessions;
    if (sessions) {
      var firstWords = eileenText.split(/\s+/).slice(0, 6).join(' ');
      sessions.updateSession(_currentSessionId, {
        message_count: (data.message_count || 1),
        title: firstWords,
        topic_tags: data.topic_tags || [],
        updated_at: new Date().toISOString()
      });
    }

  } catch (e) {
    console.error('[EileenChat] API error:', e);
    _hideTyping();
    var errorBubble = _createMessageBubble('eileen',
      'I encountered a connection issue. Please check your internet connection and try again.',
      new Date().toISOString()
    );
    _messagesEl.appendChild(errorBubble);
    _scrollToBottom();
  }

  _isProcessing = false;
}

async function _loadMessages(sessionId) {
  if (!sessionId) return;
  var user = window.__ailaneUser;
  if (!user) return;

  _messagesEl.innerHTML = '';

  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/kl_eileen_conversations?session_id=eq.' + sessionId + '&select=user_message,eileen_response,created_at&order=created_at.asc',
      {
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'apikey': ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    var messages = await res.json() || [];

    messages.forEach(function(msg) {
      if (msg.user_message) {
        _messagesEl.appendChild(_createMessageBubble('user', msg.user_message, msg.created_at));
      }
      if (msg.eileen_response) {
        _messagesEl.appendChild(_createMessageBubble('eileen', msg.eileen_response, msg.created_at));
      }
    });

    _scrollToBottom();
  } catch (e) {
    console.error('[EileenChat] Load messages error:', e);
  }
}

function create(options) {
  _bus = options.bus;
  _messagesEl = options.messagesEl;
  _inputEl = options.inputEl;
  _sendBtn = options.sendBtn;
  _typingEl = options.typingEl;
  _nexusHandle = options.nexusHandle;
  _currentSessionId = options.sessionId || null;

  // Send on button click
  if (_sendBtn) {
    _sendBtn.addEventListener('click', function() {
      if (_inputEl) _sendMessage(_inputEl.value);
    });
  }

  // Send on Enter key
  if (_inputEl) {
    _inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        _sendMessage(_inputEl.value);
      }
    });
  }

  // Load existing messages if session provided
  if (_currentSessionId) {
    _loadMessages(_currentSessionId);
  }
}

function setSession(sessionId) {
  _currentSessionId = sessionId;
  if (sessionId) {
    _loadMessages(sessionId);
  } else if (_messagesEl) {
    _messagesEl.innerHTML = '';
  }
}

function submitQuickAction(text) {
  if (_inputEl) _inputEl.value = text;
  _sendMessage(text);
}

function destroy() {
  _messagesEl = null;
  _inputEl = null;
  _sendBtn = null;
  _typingEl = null;
  _nexusHandle = null;
  _bus = null;
  _currentSessionId = null;
  _isProcessing = false;
}

window.__EileenChat = {
  create: create,
  destroy: destroy,
  setSession: setSession,
  submitQuickAction: submitQuickAction
};
