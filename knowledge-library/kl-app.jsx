const { useState, useEffect, useRef, useCallback } = React;

const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';

const TOPIC_CARDS = [
  { label: 'Dismissal & Disciplinary', icon: 'shield', message: 'I need to understand our obligations around dismissing an employee' },
  { label: 'Discrimination & Harassment', icon: 'scales', message: "We've had a complaint about discrimination — what should we know?" },
  { label: 'Contracts & Terms', icon: 'document', message: 'Our employment contracts need reviewing — what are the current requirements?' },
  { label: 'Family Leave & Pregnancy', icon: 'family', message: "An employee has just told us she's pregnant — what are our obligations?" },
  { label: 'Business Transfers', icon: 'arrows', message: 'We\'re taking on staff from another company — what does TUPE require?' },
  { label: 'Health & Safety', icon: 'hardhat', message: 'What are our core health and safety obligations as an employer?' },
  { label: 'Whistleblowing', icon: 'megaphone', message: 'An employee says they want to raise a concern about practices in the company' },
  { label: 'Data & Monitoring', icon: 'lock', message: "What are the rules around monitoring employees' emails and devices?" },
];

const CROWN_JEWELS = [
  'ERA 1996', 'EqA 2010', 'HSWA 1974', 'TULRCA 1992', 'WTR 1998', 'DPA 2018', 'TUPE 2006'
];

const TIER_LABELS = {
  operational: 'Operational',
  operational_readiness: 'Operational',
  governance: 'Governance',
  institutional: 'Institutional',
};

/* ── SVG Icons ── */
function CardIcon({ type }) {
  const icons = {
    shield: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    scales: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18"/><path d="M4 7h16"/><path d="M4 7l3 8h-6l3-8z"/><path d="M20 7l-3 8h6l-3-8z"/>
      </svg>
    ),
    document: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    family: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
    arrows: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
      </svg>
    ),
    hardhat: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 18h20v2H2z"/><path d="M4 18v-4a8 8 0 0116 0v4"/><path d="M12 2v4"/>
      </svg>
    ),
    megaphone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
    lock: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
  };
  return <span className="kl-card-icon">{icons[type]}</span>;
}

/* ── Nexus Canvas ── */
function NexusCanvas({ size = 200, active = false, processing = false }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = size * dpr;
    const h = size * dpr;
    canvas.width = w;
    canvas.height = h;
    const cx = w / 2;
    const cy = h / 2;

    const nodeCount = size > 100 ? 20 : (processing ? 12 : active ? 10 : 8);
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const ring = i < Math.floor(nodeCount * 0.4) ? 0.25 : 0.6;
      const angle = (i / (i < Math.floor(nodeCount * 0.4) ? Math.floor(nodeCount * 0.4) : nodeCount - Math.floor(nodeCount * 0.4))) * Math.PI * 2 + i * 0.3;
      const radius = ring * (w * 0.4);
      nodes.push({
        bx: cx + Math.cos(angle) * radius,
        by: cy + Math.sin(angle) * radius,
        r: (1.0 + Math.random() * 1.5) * dpr,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        ring,
      });
    }

    function draw() {
      timeRef.current += processing ? 0.035 : active ? 0.02 : 0.01;
      const t = timeRef.current;
      ctx.clearRect(0, 0, w, h);

      // Outer glow
      const breathe = 1 + Math.sin(t * 0.8) * (processing ? 0.15 : 0.08);
      const coreR = (processing ? 6 : active ? 5 : 3.5) * dpr;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 4 * breathe);
      glow.addColorStop(0, processing ? 'rgba(14,165,233,0.5)' : active ? 'rgba(14,165,233,0.35)' : 'rgba(14,165,233,0.15)');
      glow.addColorStop(0.5, processing ? 'rgba(56,189,248,0.2)' : active ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.04)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 4 * breathe, 0, Math.PI * 2);
      ctx.fill();

      // Core
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * breathe);
      core.addColorStop(0, 'rgba(255,255,255,0.85)');
      core.addColorStop(0.3, 'rgba(14,165,233,0.7)');
      core.addColorStop(0.7, 'rgba(56,189,248,0.3)');
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * breathe, 0, Math.PI * 2);
      ctx.fill();

      // Compute animated positions
      const positions = nodes.map(n => {
        const dx = Math.sin(t * n.speed + n.phase) * 3 * dpr;
        const dy = Math.cos(t * n.speed * 0.7 + n.phase) * 2 * dpr;
        return { x: n.bx + dx, y: n.by + dy, r: n.r, ring: n.ring };
      });

      // Draw connections
      const maxDist = w * 0.45;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * (processing ? 0.3 : active ? 0.2 : 0.1);
            ctx.strokeStyle = `rgba(14,165,233,${alpha})`;
            ctx.lineWidth = 0.5 * dpr;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // Radial lines from center
        const p = positions[i];
        const distFromCenter = Math.hypot(p.x - cx, p.y - cy);
        const lineAlpha = (1 - distFromCenter / (w * 0.45)) * (active ? 0.12 : 0.05);
        if (lineAlpha > 0) {
          ctx.strokeStyle = `rgba(14,165,233,${lineAlpha})`;
          ctx.lineWidth = 0.5 * dpr;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      // Draw nodes
      positions.forEach((p, i) => {
        const brightness = Math.sin(t * 2 + i) * 0.3 + 0.7;
        const isPrimary = p.ring < 0.4;
        const nodeGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        nodeGlow.addColorStop(0, `rgba(14,165,233,${brightness * (active ? 0.8 : 0.5)})`);
        nodeGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nodeGlow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isPrimary
          ? `rgba(14,165,233,${brightness})`
          : `rgba(56,189,248,${brightness * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (active ? 1 : 0.8), 0, Math.PI * 2);
        ctx.fill();
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [size, active, processing]);

  return <canvas ref={canvasRef} className="kl-nexus-canvas" style={{ width: size, height: size, borderRadius: '50%' }} />;
}

/* ── Tier Badge ── */
function TierBadge({ tier }) {
  const label = TIER_LABELS[tier] || 'Operational';
  const badgeClass = tier === 'governance' ? 'kl-badge-governance'
    : tier === 'institutional' ? 'kl-badge-institutional'
    : 'kl-badge-operational';
  return <span className={`kl-tier-badge ${badgeClass}`}>{label}</span>;
}

/* ── Advisory Banner ── */
function AdvisoryBanner() {
  return (
    <div className="kl-advisory" role="alert">
      <strong>Eileen provides regulatory intelligence.</strong> She does not provide legal advice.
      For legal advice, consult a qualified employment solicitor.
    </div>
  );
}

/* ── Chat Input ── */
function ChatInput({ value, onChange, onSubmit, disabled, placeholder }) {
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  return (
    <div className="kl-input-bar">
      <input
        ref={inputRef}
        type="text"
        className="kl-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Ask Eileen anything about employment law\u2026'}
        disabled={disabled}
        aria-label="Message Eileen"
      />
      <button
        className="kl-send-btn"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  );
}

/* ── Topic Card ── */
function TopicCard({ card, onClick }) {
  return (
    <button className="kl-topic-card" onClick={() => onClick(card.message)}>
      <CardIcon type={card.icon} />
      <span className="kl-card-label">{card.label}</span>
    </button>
  );
}

/* ── Eileen Message ── */
function EileenMessage({ text, provisionsCount, casesCount }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const renderText = (raw) => {
    // Basic markdown: **bold**
    const parts = raw.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="kl-msg kl-msg-eileen">
      <div className="kl-msg-avatar">
        <NexusCanvas size={32} active={false} processing={false} />
      </div>
      <div className="kl-msg-content">
        <div className="kl-msg-sender">Eileen</div>
        <div className="kl-msg-body">{renderText(text)}</div>
        <div className="kl-msg-footer">
          {provisionsCount != null && (
            <span className="kl-msg-stats">
              {provisionsCount} provision{provisionsCount !== 1 ? 's' : ''}
              {casesCount != null && <> &middot; {casesCount} case{casesCount !== 1 ? 's' : ''}</>}
            </span>
          )}
          <button className="kl-save-btn" onClick={copyToClipboard} title="Copy to clipboard">
            Save <span aria-hidden="true">&#128221;</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── User Message ── */
function UserMessage({ text }) {
  return (
    <div className="kl-msg kl-msg-user">
      <div className="kl-msg-content">
        <div className="kl-msg-body">{text}</div>
      </div>
    </div>
  );
}

/* ── Typing Indicator ── */
function TypingIndicator() {
  return (
    <div className="kl-msg kl-msg-eileen">
      <div className="kl-msg-avatar">
        <NexusCanvas size={32} active={true} processing={true} />
      </div>
      <div className="kl-msg-content">
        <div className="kl-typing-dots" role="status" aria-live="polite">
          <span className="kl-dot" /><span className="kl-dot" /><span className="kl-dot" />
          <span className="sr-only">Eileen is thinking...</span>
        </div>
      </div>
    </div>
  );
}

/* ── Crown Jewels ── */
function CrownJewels() {
  return (
    <div className="kl-crown">
      <div className="kl-crown-title">Crown Jewels</div>
      <div className="kl-crown-chips">
        {CROWN_JEWELS.map(s => <span key={s} className="kl-chip">{s}</span>)}
      </div>
    </div>
  );
}

/* ── Horizon Alert ── */
function HorizonAlert() {
  return (
    <div className="kl-horizon">
      <span className="kl-horizon-icon" aria-hidden="true">&#9889;</span>
      <span>
        <strong>ERA 2025:</strong> Unfair dismissal qualifying period reduces to 6 months from 1 January 2027
      </span>
    </div>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="kl-footer">
      <div className="kl-footer-legal">
        AI Lane Limited &middot; Company No. 17035654 &middot; ICO Reg. 00013389720
      </div>
      <div className="kl-footer-links">
        <a href="/terms/">Terms</a>
        <span>&middot;</span>
        <a href="/privacy/">Privacy</a>
      </div>
    </footer>
  );
}

/* ── Header ── */
function Header({ tier, pageState, onNewChat }) {
  return (
    <header className="kl-header">
      <div className="kl-header-left">
        <TierBadge tier={tier} />
      </div>
      <div className="kl-header-center">
        {pageState === 'conversation' && <span className="kl-header-title">Knowledge Library</span>}
      </div>
      <div className="kl-header-right">
        {pageState === 'conversation' ? (
          <button className="kl-new-chat-btn" onClick={onNewChat} aria-label="New conversation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New chat
          </button>
        ) : (
          <img src="/assets/ailane-logo.svg" alt="Ailane" className="kl-logo" onError={(e) => { e.target.style.display = 'none'; }} />
        )}
      </div>
    </header>
  );
}

/* ── Welcome State ── */
function WelcomeState({ inputValue, onInputChange, onSubmit, onTopicClick }) {
  return (
    <div className="kl-welcome">
      <div className="kl-welcome-nexus">
        <NexusCanvas size={200} active={false} processing={false} />
      </div>
      <h1 className="kl-welcome-greeting">What can I help you with today?</h1>
      <div className="kl-welcome-input">
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onSubmit}
          disabled={false}
          placeholder="Ask Eileen anything about employment law\u2026"
        />
      </div>
      <div className="kl-topics-grid">
        {TOPIC_CARDS.map(card => (
          <TopicCard key={card.label} card={card} onClick={onTopicClick} />
        ))}
      </div>
      <CrownJewels />
      <HorizonAlert />
    </div>
  );
}

/* ── Conversation State ── */
function ConversationState({ messages, isLoading, inputValue, onInputChange, onSubmit }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="kl-conversation">
      <AdvisoryBanner />
      <div className="kl-messages" ref={listRef}>
        {messages.map((msg, i) =>
          msg.role === 'eileen' ? (
            <EileenMessage key={i} text={msg.text} provisionsCount={msg.provisions_count} casesCount={msg.cases_count} />
          ) : (
            <UserMessage key={i} text={msg.text} />
          )
        )}
        {isLoading && <TypingIndicator />}
      </div>
      <div className="kl-conversation-input">
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onSubmit}
          disabled={isLoading}
          placeholder="Type your reply\u2026"
        />
      </div>
    </div>
  );
}

/* ── KLApp (Root) ── */
function KLApp() {
  const [pageState, setPageState] = useState('welcome');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [tier, setTier] = useState(window.__ailaneUser?.tier || 'loading');
  const sessionIdRef = useRef(crypto.randomUUID());
  const user = window.__ailaneUser || {};

  useEffect(() => {
    function onTier(e) { setTier(e.detail.tier); }
    window.addEventListener('ailane-tier-loaded', onTier);
    return () => window.removeEventListener('ailane-tier-loaded', onTier);
  }, []);

  const sendToEileen = useCallback(async (message) => {
    const userMsg = { role: 'user', text: message };
    setMessages(prev => [...prev, userMsg]);
    setPageState('conversation');
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/kl_ai_assistant`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            session_id: sessionIdRef.current,
            page_context: 'knowledge-library',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const eileenMsg = {
        role: 'eileen',
        text: data.response || 'I wasn\'t able to process that request. Please try again.',
        provisions_count: data.provisions_count,
        cases_count: data.cases_count,
      };
      if (data.session_id) {
        sessionIdRef.current = data.session_id;
      }
      setMessages(prev => [...prev, eileenMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'eileen',
        text: 'I\'m having trouble connecting right now. Please try again in a moment.',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [user.token]);

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    sendToEileen(trimmed);
  }, [inputValue, isLoading, sendToEileen]);

  const handleTopicClick = useCallback((message) => {
    if (isLoading) return;
    sendToEileen(message);
  }, [isLoading, sendToEileen]);

  const handleNewChat = useCallback(() => {
    sessionIdRef.current = crypto.randomUUID();
    setMessages([]);
    setPageState('welcome');
    setInputValue('');
  }, []);

  return (
    <div className="kl-app">
      <Header tier={tier} pageState={pageState} onNewChat={handleNewChat} />
      <main className="kl-main">
        {pageState === 'welcome' ? (
          <WelcomeState
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSubmit={handleSubmit}
            onTopicClick={handleTopicClick}
          />
        ) : (
          <ConversationState
            messages={messages}
            isLoading={isLoading}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSubmit={handleSubmit}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

// Mount point — called from index.html boot script
window.KLApp = KLApp;
