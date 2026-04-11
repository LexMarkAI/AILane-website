// kl-app.jsx — Ailane Knowledge Library v3.0
// KLUX-001 (AMD-036) | EILEEN-001 (AMD-020) | PLUGIN-001 (AMD-032)
// Stage 2: Core React components

const { useState, useEffect, useRef, useCallback } = React;

const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MTk2ODcsImV4cCI6MjA1NTk5NTY4N30.RE_n2oXvPYFqdPnztWRPBRaHRC9i3Mo71PBfGjDOPOA';
const EILEEN_ENDPOINT = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co') + '/functions/v1/eileen-intelligence';

const CROWN_JEWELS = [
  'Employment Rights Act 1996',
  'Equality Act 2010',
  'Health and Safety at Work Act 1974',
  'National Minimum Wage Act 1998',
  'Trade Union and Labour Relations (Consolidation) Act 1992',
  'Employment Rights Act 2025',
  'Public Interest Disclosure Act 1998',
];

const QUICK_STARTS = [
  'What are the latest tribunal decisions on disability discrimination?',
  'Summarise the key changes in the Employment Rights Act 2025.',
  'How should I handle a flexible working request under current law?',
];

// ─── Helpers ───

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  const withInline = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  const lines = withInline.split('\n');
  const out = [];
  let listItems = [];
  function flushList() {
    if (listItems.length) { out.push('<ul>' + listItems.join('') + '</ul>'); listItems = []; }
  }
  lines.forEach(line => {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (headerMatch) {
      flushList();
      const level = Math.min(6, headerMatch[1].length + 3);
      out.push('<h' + level + '>' + headerMatch[2] + '</h' + level + '>');
    } else if (listMatch) {
      listItems.push('<li>' + listMatch[1] + '</li>');
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      out.push('<p>' + line + '</p>');
    }
  });
  flushList();
  return out.join('');
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.substring(0, n - 1) + '…' : s;
}

function tierPalette(tier) {
  if (tier === 'institutional') return ['#D4A017', '#F1C85B'];
  if (tier === 'governance') return ['#0EA5E9', '#8B5CF6'];
  if (tier === 'operational_readiness') return ['#0EA5E9', '#10B981'];
  return ['#0EA5E9', '#38BDF8'];
}

// ─── NexusCanvas ───

function NexusCanvas({ tier }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const [colorA, colorB] = tierPalette(tier);
    const cx = size / 2;
    const cy = size / 2;
    const nodes = [];
    const rings = [{ count: 6, radius: 28 }, { count: 8, radius: 68 }, { count: 10, radius: 110 }];
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2 + ri * 0.4;
        nodes.push({
          x: cx + Math.cos(angle) * ring.radius,
          y: cy + Math.sin(angle) * ring.radius,
          phase: Math.random() * Math.PI * 2,
          ring: ri,
        });
      }
    });

    const start = performance.now();
    function draw(now) {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, size, size);

      // Connections between nearby nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 72) {
            const alpha = (1 - d / 72) * 0.2;
            ctx.strokeStyle = 'rgba(14,165,233,' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Nodes with pulse animation
      nodes.forEach((n, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + n.phase);
        const r = 2 + pulse * 2.2;
        const color = n.ring === 0 ? colorA : (n.ring === 2 ? colorB : (i % 2 ? colorA : colorB));
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.45 + pulse * 0.55;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [tier]);

  return <canvas ref={canvasRef} className="kl-nexus-canvas" />;
}

// ─── TypingIndicator ───

function TypingIndicator() {
  return (
    <div className="kl-msg kl-msg-eileen">
      <div className="kl-msg-content">
        <div className="kl-msg-sender">Eileen</div>
        <div className="kl-typing-dots">
          <span className="kl-dot"></span>
          <span className="kl-dot"></span>
          <span className="kl-dot"></span>
        </div>
      </div>
    </div>
  );
}

// ─── MessageBubble ───

function MessageBubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="kl-msg kl-msg-user">
        <div className="kl-msg-content">
          <div className="kl-msg-body">{msg.content}</div>
        </div>
      </div>
    );
  }
  const html = renderMarkdown(msg.content || '');
  const hasStats = msg.provisionsCount != null || msg.casesCount != null;
  return (
    <div className="kl-msg kl-msg-eileen">
      <div className="kl-msg-content">
        <div className="kl-msg-sender">Eileen</div>
        <div className="kl-msg-body" dangerouslySetInnerHTML={{ __html: html }} />
        {hasStats && (
          <div className="kl-msg-footer">
            <div className="kl-msg-stats">
              Based on {msg.provisionsCount || 0} provision{msg.provisionsCount === 1 ? '' : 's'} and {msg.casesCount || 0} case{msg.casesCount === 1 ? '' : 's'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MessageInput ───

function MessageInput({ onSend, disabled }) {
  const [value, setValue] = useState('');

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="kl-input-bar">
      <input
        className="kl-input"
        type="text"
        placeholder="Ask Eileen anything about UK employment law..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        disabled={disabled}
      />
      <button
        className="kl-send-btn"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  );
}

// ─── ConversationArea ───

function ConversationArea({ messages, isLoading, onSend, tier }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const empty = messages.length === 0;

  return (
    <div className="kl-main">
      {empty ? (
        <div className="kl-welcome">
          <div className="kl-welcome-nexus">
            <NexusCanvas tier={tier} />
          </div>
          <h1 className="kl-welcome-greeting">How can I help you today?</h1>
          <div className="kl-welcome-input">
            <MessageInput onSend={onSend} disabled={isLoading} />
          </div>
          <div className="kl-topics-grid">
            {QUICK_STARTS.map((q, i) => (
              <button key={i} className="kl-topic-card" onClick={() => onSend(q)} disabled={isLoading}>
                <div className="kl-card-label">{q}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="kl-conversation">
          <div className="kl-messages" ref={scrollRef}>
            {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
            {isLoading && <TypingIndicator />}
          </div>
          <div className="kl-conversation-input">
            <MessageInput onSend={onSend} disabled={isLoading} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CrownJewels ───

function CrownJewels({ onQuery, disabled }) {
  return (
    <div className="kl-crown">
      <div className="kl-crown-title">Crown Jewels</div>
      <div className="kl-crown-chips">
        {CROWN_JEWELS.map((name) => (
          <button
            key={name}
            className="kl-chip"
            disabled={disabled}
            onClick={() => onQuery('Tell me about the key provisions and current obligations under the ' + name)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ───

function Sidebar({ open, sessionHistory, activeSessionId, onSelectSession, onNewChat, onCrownQuery }) {
  return (
    <div className={'kl-sidebar' + (open ? '' : ' collapsed')}>
      <div className="kl-sidebar-section">
        <button className="kl-new-chat-btn" onClick={onNewChat}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>New Conversation</span>
        </button>
      </div>
      <div className="kl-sidebar-history">
        {sessionHistory.length === 0 ? (
          <div className="kl-sidebar-empty">No prior conversations</div>
        ) : (
          sessionHistory.map((s) => (
            <button
              key={s.sessionId}
              className={'kl-history-item' + (s.sessionId === activeSessionId ? ' active' : '')}
              onClick={() => onSelectSession(s.sessionId)}
            >
              <div className="kl-history-title">{truncate(s.title, 40)}</div>
              <div className="kl-history-time">{formatRelativeTime(s.lastActivity)}</div>
            </button>
          ))
        )}
      </div>
      <div className="kl-sidebar-divider"></div>
      <CrownJewels onQuery={onCrownQuery} />
    </div>
  );
}

// ─── TopBar ───

function TopBar({ sidebarOpen, onToggleSidebar, accessType, tier }) {
  let badgeLabel = 'KNOWLEDGE LIBRARY';
  let badgeClass = 'kl-badge-per-session';
  if (accessType === 'subscription') {
    if (tier === 'operational_readiness') { badgeLabel = 'OPERATIONAL'; badgeClass = 'kl-badge-operational'; }
    else if (tier === 'governance') { badgeLabel = 'GOVERNANCE'; badgeClass = 'kl-badge-governance'; }
    else if (tier === 'institutional') { badgeLabel = 'INSTITUTIONAL'; badgeClass = 'kl-badge-institutional'; }
  } else if (accessType === 'per_session') {
    badgeLabel = 'PER-SESSION';
  }
  return (
    <div className="kl-topbar">
      <button className="kl-topbar-toggle" onClick={onToggleSidebar} aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <div className="kl-topbar-title">AILANE Knowledge Library</div>
      <div className="kl-topbar-right">
        <span className={'kl-tier-badge ' + badgeClass}>{badgeLabel}</span>
      </div>
    </div>
  );
}

// ─── PanelRail (KLUI-001 §2.1) ───

const PANEL_DEFS = [
  { id: 'vault',     icon: '📄', label: 'Document Vault',   minTier: 'operational_readiness' },
  { id: 'notes',     icon: '📝', label: 'Notes',            minTier: null },
  { id: 'documents', icon: '📑', label: 'Documents',        minTier: 'operational_readiness' },
  { id: 'clipboard', icon: '📋', label: 'Clipboard',        minTier: null },
  { id: 'calendar',  icon: '📅', label: 'Calendar',         minTier: 'operational_readiness' },
  { id: 'eileen',    icon: '💬', label: 'Eileen',           minTier: null },
  { id: 'research',  icon: '🔍', label: 'Research',         minTier: null },
  { id: 'planner',   icon: '📊', label: 'Contract Planner', minTier: 'governance' },
];

const TIER_RANK = {
  per_session: 0,
  kl_quick_session: 0,
  kl_day_pass: 0,
  kl_research_week: 0,
  operational_readiness: 1,
  governance: 2,
  institutional: 3,
};

function PanelRail({ activePanel, onSelectPanel, accessType, tier }) {
  const userRank = TIER_RANK[tier] != null ? TIER_RANK[tier] : (TIER_RANK[accessType] != null ? TIER_RANK[accessType] : 0);
  return (
    <div className="kl-panelrail">
      {PANEL_DEFS.map((p) => {
        const minRank = p.minTier ? (TIER_RANK[p.minTier] != null ? TIER_RANK[p.minTier] : 99) : 0;
        const locked = userRank < minRank;
        const isActive = activePanel === p.id;
        return (
          <button
            key={p.id}
            type="button"
            className={'kl-panel-rail-btn' + (isActive ? ' active' : '') + (locked ? ' locked' : '')}
            title={locked ? p.label + ' (upgrade required)' : p.label}
            aria-label={p.label}
            aria-pressed={isActive}
            disabled={locked}
            onClick={() => { if (!locked) onSelectPanel(isActive ? null : p.id); }}
          >
            <span className="kl-panel-rail-icon" aria-hidden="true">{p.icon}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── NotesPanel (reads/writes kl_workspace_notes.content_plain) ───

function NotesPanel() {
  const [noteId, setNoteId] = useState(null);
  const [title, setTitle] = useState('Untitled note');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('loading'); // loading | saved | dirty | saving | error
  const saveTimer = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!window.__klToken || !window.__klUserId) return;
      try {
        const resp = await fetch(
          SUPABASE_URL + '/rest/v1/kl_workspace_notes?user_id=eq.' + window.__klUserId +
            '&select=id,title,content_plain&order=updated_at.desc&limit=1',
          { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
        );
        const data = await resp.json();
        if (cancelled) return;
        if (Array.isArray(data) && data[0]) {
          setNoteId(data[0].id);
          setTitle(data[0].title || 'Untitled note');
          setBody(data[0].content_plain || '');
        }
        loadedRef.current = true;
        setStatus('saved');
      } catch (e) {
        console.error('Notes load failed:', e);
        if (!cancelled) setStatus('error');
      }
    }
    load();
    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  async function performSave(nextTitle, nextBody, currentId) {
    if (!window.__klToken || !window.__klUserId) return;
    setStatus('saving');
    const now = new Date().toISOString();
    try {
      if (currentId) {
        // PATCH existing note
        const resp = await fetch(
          SUPABASE_URL + '/rest/v1/kl_workspace_notes?id=eq.' + currentId,
          {
            method: 'PATCH',
            headers: {
              'Authorization': 'Bearer ' + window.__klToken,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              title: nextTitle || 'Untitled note',
              content_plain: nextBody,
              updated_at: now,
            }),
          }
        );
        if (!resp.ok) throw new Error('PATCH ' + resp.status);
      } else {
        // INSERT new note, store returned id
        const resp = await fetch(SUPABASE_URL + '/rest/v1/kl_workspace_notes', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + window.__klToken,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            user_id: window.__klUserId,
            project_id: null,
            title: nextTitle || 'Untitled note',
            content_plain: nextBody,
          }),
        });
        if (!resp.ok) throw new Error('POST ' + resp.status);
        const data = await resp.json();
        if (Array.isArray(data) && data[0] && data[0].id) setNoteId(data[0].id);
      }
      setStatus('saved');
    } catch (e) {
      console.error('Notes save failed:', e);
      setStatus('error');
    }
  }

  function scheduleSave(nextTitle, nextBody) {
    if (!loadedRef.current) return;
    setStatus('dirty');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => performSave(nextTitle, nextBody, noteId), 1500);
  }

  function onTitleChange(e) {
    const v = e.target.value;
    setTitle(v);
    scheduleSave(v, body);
  }

  function onBodyChange(e) {
    const v = e.target.value;
    setBody(v);
    scheduleSave(title, v);
  }

  const statusLabel =
    status === 'loading' ? 'Loading…' :
    status === 'dirty'   ? 'Unsaved changes' :
    status === 'saving'  ? 'Saving…' :
    status === 'error'   ? 'Save failed' :
                           '✓ Saved';
  const statusClass = 'kl-notes-status' + (status === 'saved' ? ' saved' : '') + (status === 'error' ? ' error' : '');

  return (
    <div className="kl-notes-panel">
      <input
        className="kl-notes-title"
        type="text"
        value={title}
        onChange={onTitleChange}
        placeholder="Untitled note"
      />
      <div className={statusClass}>{statusLabel}</div>
      <textarea
        className="kl-notes-body"
        value={body}
        onChange={onBodyChange}
        placeholder="Take notes during your research..."
      />
    </div>
  );
}

// ─── ClipboardPanel ───

function ClipboardPanel() {
  const [clips, setClips] = useState([]);

  useEffect(() => {
    window.__klAddClip = function (text, source) {
      setClips((prev) => [{ id: Date.now() + Math.random(), text: String(text || ''), source: source || null, copiedAt: new Date() }, ...prev]);
    };
    return () => { delete window.__klAddClip; };
  }, []);

  function removeClip(id) {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch((e) => console.error('Clipboard copy failed:', e));
    }
  }

  if (clips.length === 0) {
    return (
      <div className="kl-clipboard-panel">
        <p className="kl-clipboard-empty">No clips yet. Copy text from Eileen's responses to save it here.</p>
      </div>
    );
  }

  return (
    <div className="kl-clipboard-panel">
      <button className="kl-clipboard-clear" onClick={() => setClips([])}>Clear all</button>
      {clips.map((c) => (
        <div key={c.id} className="kl-clip">
          <p className="kl-clip-text">{c.text.length > 200 ? c.text.substring(0, 200) + '…' : c.text}</p>
          <div className="kl-clip-actions">
            <button className="kl-clip-copy" onClick={() => copyToClipboard(c.text)}>Copy</button>
            <button className="kl-clip-remove" onClick={() => removeClip(c.id)}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PlaceholderPanel ───

const PLACEHOLDER_DESCRIPTIONS = {
  vault:     'Access and manage your compliance documents, view scan scores, and track document health.',
  documents: 'Create structured documents with watermarks, disclaimers, and export controls.',
  calendar:  'Track regulatory commencement dates, review deadlines, and compliance milestones.',
  eileen:    'Context-aware Eileen chat with Vault and Calendar integration.',
  research:  'Browse the Knowledge Library content — 391 provisions, 240 cases, 69 instruments.',
  planner:   'Six-step contract planning workflow with gap analysis and compliance mapping.',
};

function PlaceholderPanel({ panelId }) {
  return (
    <div className="kl-placeholder-panel">
      <div className="kl-placeholder-icon" aria-hidden="true">⚙</div>
      <div className="kl-placeholder-title">Coming soon</div>
      <p className="kl-placeholder-body">
        {PLACEHOLDER_DESCRIPTIONS[panelId] || 'This panel is under development.'}
      </p>
    </div>
  );
}

// ─── PanelDrawer (KLUI-001 §2.2) ───

const PANEL_LABELS = {
  vault: 'Document Vault', notes: 'Notes', documents: 'Documents',
  clipboard: 'Clipboard', calendar: 'Calendar', eileen: 'Eileen',
  research: 'Research', planner: 'Contract Planner',
};

const PANEL_COMPONENTS = {
  notes: NotesPanel,
  clipboard: ClipboardPanel,
};

function PanelDrawer({ panelId, onClose }) {
  if (!panelId) return null;
  const PanelContent = PANEL_COMPONENTS[panelId] || PlaceholderPanel;
  const label = PANEL_LABELS[panelId] || panelId;
  return (
    <div className="kl-panel-drawer" role="dialog" aria-label={label}>
      <div className="kl-panel-drawer-header">
        <span className="kl-panel-drawer-title">{label}</span>
        <button className="kl-panel-drawer-close" onClick={onClose} aria-label="Close panel">✕</button>
      </div>
      <div className="kl-panel-drawer-body">
        <PanelContent panelId={panelId} />
      </div>
    </div>
  );
}

// ─── AdvisoryBanner ───

function AdvisoryBanner() {
  return (
    <div className="kl-advisory">
      <p>This is regulatory intelligence. It does not constitute legal advice. AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720)</p>
    </div>
  );
}

// ─── App ───

function App() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(() => 'eileen-' + Date.now() + '-' + Math.random().toString(36).substr(2, 7));
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePanel, setActivePanel] = useState(null);
  const [accessType, setAccessType] = useState(window.__klAccessType || null);
  const [tier, setTier] = useState(window.__klTier || window.__klProductType || null);

  const loadSessionHistory = useCallback(async function () {
    if (!window.__klToken || !window.__klUserId) return;
    try {
      const resp = await fetch(
        SUPABASE_URL + '/rest/v1/kl_eileen_conversations?user_id=eq.' + window.__klUserId +
          '&select=session_id,user_message,created_at&order=created_at.desc&limit=100',
        { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
      );
      const data = await resp.json();
      if (!Array.isArray(data)) return;
      const grouped = {};
      data.forEach((row) => {
        if (!grouped[row.session_id]) {
          grouped[row.session_id] = {
            sessionId: row.session_id,
            title: row.user_message ? row.user_message.substring(0, 50) : '(untitled)',
            lastActivity: row.created_at,
          };
        }
      });
      setSessionHistory(Object.values(grouped).slice(0, 50));
    } catch (err) {
      console.error('Failed to load session history:', err);
    }
  }, []);

  // Wire up auth-ready event + trigger initial history load
  useEffect(() => {
    function onReady(e) {
      setAccessType(e.detail.accessType);
      setTier(e.detail.tier);
      loadSessionHistory();
    }
    window.addEventListener('ailane-kl-ready', onReady);
    if (window.__klAccessType) {
      loadSessionHistory();
    }
    return () => window.removeEventListener('ailane-kl-ready', onReady);
  }, [loadSessionHistory]);

  // Toggle sidebar-collapsed class on the real #kl-root grid container
  useEffect(() => {
    const el = document.getElementById('kl-root');
    if (el) el.classList.toggle('sidebar-collapsed', !sidebarOpen);
  }, [sidebarOpen]);

  // Toggle drawer-open class on the real #kl-root (layout signal only;
  // the drawer itself is positioned fixed — this class is reserved for future push mode).
  useEffect(() => {
    const el = document.getElementById('kl-root');
    if (el) el.classList.toggle('drawer-open', !!activePanel);
  }, [activePanel]);

  async function loadSession(sid) {
    if (!window.__klToken) return;
    try {
      const resp = await fetch(
        SUPABASE_URL + '/rest/v1/kl_eileen_conversations?session_id=eq.' + sid +
          '&select=user_message,eileen_response,created_at&order=created_at.asc',
        { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
      );
      const data = await resp.json();
      if (!Array.isArray(data)) return;
      const msgs = [];
      data.forEach((row) => {
        msgs.push({ role: 'user', content: row.user_message });
        msgs.push({ role: 'assistant', content: row.eileen_response });
      });
      setMessages(msgs);
      setSessionId(sid);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  }

  function newChat() {
    setSessionId('eileen-' + Date.now() + '-' + Math.random().toString(36).substr(2, 7));
    setMessages([]);
  }

  async function sendMessage(text) {
    const clean = (text || '').trim();
    if (!clean || isLoading) return;
    setMessages((prev) => [...prev, { role: 'user', content: clean }]);
    setIsLoading(true);
    try {
      const resp = await fetch(EILEEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + window.__klToken,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          message: clean,
          session_id: sessionId,
          page_context: 'knowledge-library',
        }),
      });
      const data = await resp.json();
      if (data && data.response) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.response,
          provisionsCount: data.provisions_count,
          casesCount: data.cases_count,
        }]);
        loadSessionHistory();
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: "I wasn't able to process that request. Please try again.",
          isError: true,
        }]);
      }
    } catch (err) {
      console.error('sendMessage error:', err);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "I wasn't able to process that request. Please try again.",
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  // Fragment root: children become direct grid items of the real #kl-root.
  // (Wrapping in another <div id="kl-root"> would duplicate the id and
  // break the #kl-root.sidebar-collapsed CSS rule on the outer grid.)
  return (
    <React.Fragment>
      <TopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        accessType={accessType}
        tier={tier}
      />
      <Sidebar
        open={sidebarOpen}
        sessionHistory={sessionHistory}
        activeSessionId={sessionId}
        onSelectSession={loadSession}
        onNewChat={newChat}
        onCrownQuery={sendMessage}
      />
      <ConversationArea
        messages={messages}
        isLoading={isLoading}
        onSend={sendMessage}
        accessType={accessType}
        tier={tier}
      />
      <PanelRail
        activePanel={activePanel}
        onSelectPanel={setActivePanel}
        accessType={accessType}
        tier={tier}
      />
      <AdvisoryBanner />
      {activePanel && (
        <PanelDrawer panelId={activePanel} onClose={() => setActivePanel(null)} />
      )}
    </React.Fragment>
  );
}

// ─── Init ───
// The shell's auth guard calls window.initKLApp() once auth is confirmed.
window.initKLApp = function () {
  const container = document.getElementById('kl-root');
  if (!container) return;
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(App));
};

// Auto-init if auth already completed before this bundle loaded.
if (window.__klAccessType) {
  window.initKLApp();
}
