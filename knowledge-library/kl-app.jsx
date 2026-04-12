// kl-app.jsx — Ailane Knowledge Library v3.0
// KLUX-001 (AMD-036) | EILEEN-001 (AMD-020) | PLUGIN-001 (AMD-032)
// Stage 2: Core React components

const { useState, useEffect, useRef, useCallback } = React;

const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';
const EILEEN_ENDPOINT = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co') + '/functions/v1/eileen-intelligence';

const CROWN_JEWELS = [
  {
    name: 'Employment Rights Act 1996',
    shortId: 'ERA 1996',
    warmIntro: 'The foundation of modern employment protection in the UK.',
    topics: 'Covers unfair dismissal, redundancy rights, written terms of employment, whistleblower protections, flexible working, and the right not to suffer detriment.',
    keyQuestion: 'What does the ERA 1996 require of my employment contracts?',
    inForce: true,
  },
  {
    name: 'Equality Act 2010',
    shortId: 'EqA 2010',
    warmIntro: 'The single framework protecting people from discrimination at work.',
    topics: 'Covers nine protected characteristics including age, disability, race, sex, and pregnancy. Addresses direct and indirect discrimination, harassment, victimisation, and the duty to make reasonable adjustments.',
    keyQuestion: 'What are my obligations around workplace discrimination under the Equality Act?',
    inForce: true,
  },
  {
    name: 'Health and Safety at Work Act 1974',
    shortId: 'HSWA 1974',
    warmIntro: 'The primary legislation ensuring workplaces are safe for everyone.',
    topics: 'Establishes the employer\'s general duty of care, risk assessment obligations, employee consultation rights, and HSE enforcement powers.',
    keyQuestion: 'What are my core health and safety duties as an employer?',
    inForce: true,
  },
  {
    name: 'National Minimum Wage Act 1998',
    shortId: 'NMWA 1998',
    warmIntro: 'Guarantees a minimum level of pay for virtually all workers.',
    topics: 'Sets out entitlements to national minimum wage and national living wage, employer record-keeping duties, and HMRC enforcement mechanisms.',
    keyQuestion: 'Am I meeting my minimum wage obligations for all worker categories?',
    inForce: true,
  },
  {
    name: 'Trade Union and Labour Relations (Consolidation) Act 1992',
    shortId: 'TULRCA 1992',
    warmIntro: 'Governs collective rights, union recognition, and industrial action.',
    topics: 'Covers trade union recognition, collective bargaining, the right to be accompanied, collective redundancy consultation (Section 188), and lawful industrial action.',
    keyQuestion: 'What are my obligations around collective consultation and trade union rights?',
    inForce: true,
  },
  {
    name: 'Employment Rights Act 2025',
    shortId: 'ERA 2025',
    warmIntro: 'The most significant reform to employment law in a generation.',
    topics: 'Introduces day-one unfair dismissal rights, restricts fire-and-rehire, reforms zero-hours contracts, strengthens flexible working, and creates the Fair Work Agency. Measures commenced 6 April 2026.',
    keyQuestion: 'How does the Employment Rights Act 2025 change my obligations from April 2026?',
    inForce: false,
  },
  {
    name: 'Public Interest Disclosure Act 1998',
    shortId: 'PIDA 1998',
    warmIntro: 'Protects workers who raise concerns about wrongdoing.',
    topics: 'Defines qualifying disclosures, protected disclosures in the public interest, protection from dismissal and detriment, and the prescribed persons framework.',
    keyQuestion: 'How should I handle a whistleblowing disclosure from an employee?',
    inForce: true,
  },
];

// Human-readable names for instrument IDs used in the Research Panel
var INSTRUMENT_NAMES = {
  'ERA 1996': 'Employment Rights Act 1996',
  'EqA 2010': 'Equality Act 2010',
  'HSWA 1974': 'Health and Safety at Work Act 1974',
  'NMWA 1998': 'National Minimum Wage Act 1998',
  'TULRCA 1992': 'Trade Union and Labour Relations (Consolidation) Act 1992',
  'ERA 2025': 'Employment Rights Act 2025',
  'PIDA 1998': 'Public Interest Disclosure Act 1998',
  'WTR 1998': 'Working Time Regulations 1998',
  'MPL 1999': 'Maternity and Parental Leave Regulations 1999',
  'TUPE 2006': 'Transfer of Undertakings Regulations 2006',
  'ACAS Code 1': 'ACAS Code of Practice on Disciplinary and Grievance',
  'FWR 2014': 'Flexible Working Regulations 2014',
  'PTWR 2000': 'Part-Time Workers Regulations 2000',
  'FTER 2002': 'Fixed-Term Employees Regulations 2002',
  'AWR 2010': 'Agency Workers Regulations 2010',
  'PAL 2002': 'Paternity and Adoption Leave Regulations 2002',
  'SPL 2014': 'Shared Parental Leave Regulations 2014',
  'MHSWR 1999': 'Management of Health and Safety at Work Regulations 1999',
  'DPA 2018': 'Data Protection Act 2018',
};

const TOPIC_DOMAINS = [
  {
    label: 'Dismissal and disciplinary',
    description: 'Unfair dismissal, redundancy, disciplinary procedures, ACAS Code',
    query: "I need guidance on dismissal and disciplinary procedures — what are the key legal requirements I should be aware of?",
  },
  {
    label: 'Discrimination and harassment',
    description: 'Protected characteristics, harassment duties, reasonable adjustments',
    query: "What are my obligations around discrimination and harassment in the workplace under current law?",
  },
  {
    label: 'Contracts and terms',
    description: 'Written statements, working time, flexible working, zero-hours',
    query: "What should I know about employment contract requirements and terms under current legislation?",
  },
  {
    label: 'Family leave and pregnancy',
    description: 'Maternity, paternity, shared parental leave, redundancy protection',
    query: "What are the current legal requirements for family leave and pregnancy protection in employment?",
  },
  {
    label: 'Business transfers',
    description: 'TUPE obligations, consultation requirements, employee protections',
    query: "What do I need to know about TUPE and employee protections during business transfers?",
  },
  {
    label: 'Health and safety',
    description: 'Employer duties, risk assessment, stress, working conditions',
    query: "What are the key health and safety obligations for employers under current law?",
  },
  {
    label: 'Whistleblowing',
    description: 'Protected disclosures, qualifying disclosures, detriment protection',
    query: "What protections exist for whistleblowers and what are my obligations as an employer?",
  },
  {
    label: 'Data and monitoring',
    description: 'Employee data, workplace monitoring, UK GDPR, ICO guidance',
    query: "What are the rules around employee data protection and workplace monitoring under UK GDPR?",
  },
];

// ─── Contract intent keywords (KLAC-001-AM-006, AMD-043) ───
// Eileen proactively routes contract-related requests to the compliance engine.
const CONTRACT_INTENT_PATTERNS = [
  'check my contract',
  'review my contract',
  'analyse my contract',
  'analyze my contract',
  'compliance check',
  'upload my contract',
  'is my contract compliant',
  'contract review',
  'check this contract',
  'review this document',
  'check my employment contract',
  'contract compliance',
  'look at my contract',
  'scan my contract',
];

function hasContractIntent(text) {
  var lower = (text || '').toLowerCase();
  return CONTRACT_INTENT_PATTERNS.some(function(pattern) {
    return lower.indexOf(pattern) !== -1;
  });
}

// ─── R1-B keyframes (kl-pulse for compliance engine indicator) ───
// Injected once at module load. index.html is out of scope per R1-B §12.
// Distinct from the existing klPulse (typing dots) — this one scales 1→1.3
// rather than 0.8→1 to give the analysis loading a different visual cadence.
(function () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('kl-r1b-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'kl-r1b-keyframes';
  style.textContent =
    '@keyframes kl-pulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }';
  document.head.appendChild(style);
})();

// ─── Upload constants (KL File Upload Widget, Stage A) ───
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─── Helpers ───

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  const withInline = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Sprint H §2: Link library references like (acas-bm §17–25), (era1996 s.94).
    // Already escaped, so instrument IDs and section refs are plain text here.
    .replace(/\(([a-z][a-z0-9-]+)\s+(§|s\.)([^)]+)\)/gi, function(match, instId, prefix, sectionRef) {
      var lowerInstId = instId.toLowerCase();
      return '<span class="kl-ref-link" data-inst="' + escapeHtml(lowerInstId) + '" data-section="' + escapeHtml(prefix + sectionRef) + '" title="Open in Library: ' + escapeHtml(instId) + ' ' + escapeHtml(prefix + sectionRef) + '">' + escapeHtml(instId + ' ' + prefix + sectionRef) + '</span>';
    });
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

// ─── ACAS Part Title Humanisation (Sprint H §6) ───
// Maps dry ACAS / guidance part titles to warm, human-readable descriptions.
// Applied in renderInstrumentContent when grouping by part label.
var ACAS_PART_TITLES = {
  'Foreword': 'About This Code',
  'Introduction': 'What This Code Covers',
  'Keys to handling disciplinary situations in the workplace': 'Handling Disciplinary Situations',
  'Keys to handling grievances in the workplace': 'Handling Workplace Grievances',
  'Disciplinary situations': 'When Disciplinary Action May Be Needed',
  'Grievance procedure': 'How to Handle a Grievance',
  'Holding a meeting': 'Conducting the Meeting',
  'Settlement agreements': 'Using Settlement Agreements',
  'Flexible working': 'Managing Flexible Working Requests',
  'Redundancy handling': 'Managing Redundancy Fairly',
  'Bullying and harassment': 'Addressing Bullying and Harassment',
  'Absence management': 'Managing Employee Absence',
  'Whistleblowing': 'Handling Whistleblowing Disclosures',
};

function humanisePartTitle(title, cat) {
  if (!title) return title;
  if (cat === 'acas' || cat === 'guidance') {
    return ACAS_PART_TITLES[title] || title;
  }
  return title;
}
// Expose for tests and integration — string literal key survives minification.
if (typeof window !== 'undefined') {
  window.__klFns = window.__klFns || {};
  window.__klFns['humanisePartTitle'] = humanisePartTitle;
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

// ─── groupSessionsByTime (KLUX-001 Art. 8) ───
// Groups session history entries into Today / Yesterday / This Week / Earlier.

function groupSessionsByTime(sessions) {
  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  var yesterdayStart = todayStart - 86400000;
  var weekStart = todayStart - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000;

  var groups = {
    today: { label: 'Today', items: [] },
    yesterday: { label: 'Yesterday', items: [] },
    thisWeek: { label: 'This Week', items: [] },
    earlier: { label: 'Earlier', items: [] },
  };

  sessions.forEach(function(s) {
    var t = new Date(s.lastActivity).getTime();
    if (t >= todayStart) {
      groups.today.items.push(s);
    } else if (t >= yesterdayStart) {
      groups.yesterday.items.push(s);
    } else if (t >= weekStart) {
      groups.thisWeek.items.push(s);
    } else {
      groups.earlier.items.push(s);
    }
  });

  return [groups.today, groups.yesterday, groups.thisWeek, groups.earlier].filter(function(g) {
    return g.items.length > 0;
  });
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

function NexusCanvas({ tier, size, state }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const canvasSize = size || 280;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = canvasSize + 'px';
    canvas.style.height = canvasSize + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const [colorA, colorB] = tierPalette(tier);
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    const nodes = [];
    const scale = canvasSize / 280;
    const rings = [
      { count: 6, radius: 28 * scale },
      { count: 8, radius: 68 * scale },
      { count: 10, radius: 110 * scale },
    ];
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
      const animState = state || 'ready';
      const speed = animState === 'processing' ? 3.0 : animState === 'dormant' ? 0.4 : 1.2;
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // Connections between nearby nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 72 * scale) {
            const connAlpha = animState === 'processing' ? 0.45 : 0.2;
            const alpha = (1 - d / (72 * scale)) * connAlpha;
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
        const pulse = 0.5 + 0.5 * Math.sin(t * speed + n.phase);
        const r = (2 + pulse * 2.2) * scale;
        const color = n.ring === 0 ? colorA : (n.ring === 2 ? colorB : (i % 2 ? colorA : colorB));
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        const baseAlpha = animState === 'dormant' ? 0.25 : animState === 'processing' ? 0.6 : 0.45;
        const pulseRange = animState === 'dormant' ? 0.3 : animState === 'processing' ? 0.4 : 0.55;
        ctx.globalAlpha = baseAlpha + pulse * pulseRange;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [tier, size, state]);

  return <canvas ref={canvasRef} className="kl-nexus-canvas" />;
}

// ─── EileenSenderLabel ───
// Static cyan "Nexus" dot + "Eileen" label, rendered on every Eileen message
// bubble to restore Eileen's visual identity throughout the conversation
// (KLUX-001 Art. 13 §13.2, Art. 19 §19.1(a)). Option B of the R1-A brief:
// static dot rather than a per-message NexusCanvas instance, because NexusCanvas
// has no size prop and each instance runs its own rAF loop (O(n²) per frame).

function EileenSenderLabel() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        aria-hidden="true"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#0EA5E9',
          boxShadow: '0 0 6px rgba(14,165,233,0.5)',
          flexShrink: 0,
        }}
      ></div>
      <div className="kl-msg-sender" style={{ marginBottom: 0 }}>Eileen</div>
    </div>
  );
}

// ─── QualifyingQuestion (KLIA-001 Art. 23 — EQIS) ───
// Renders as a local Eileen message with two clickable buttons.
// Appears once per browser (stored in localStorage). Not persisted to DB.

function QualifyingQuestion({ onSelect }) {
  return (
    <div className="kl-msg kl-msg-eileen">
      <div className="kl-msg-content">
        <EileenSenderLabel />
        <div className="kl-msg-body" style={{ marginTop: '8px' }}>
          <p>To give you the most relevant guidance — are you an employer or HR professional managing compliance, or a worker with a question about your own employment rights?</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={function() { onSelect('employer'); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(14, 165, 233, 0.1)',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              color: '#0EA5E9',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.15s',
            }}
            onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(14, 165, 233, 0.2)'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'; }}
          >
            Employer / HR
          </button>
          <button
            type="button"
            onClick={function() { onSelect('worker'); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: '#A78BFA',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.15s',
            }}
            onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'; }}
          >
            Worker
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TypingIndicator ───

function TypingIndicator() {
  return (
    <div className="kl-msg kl-msg-eileen">
      <div className="kl-msg-content">
        <EileenSenderLabel />
        <div className="kl-typing-dots" style={{ marginTop: '8px' }}>
          <span className="kl-dot"></span>
          <span className="kl-dot"></span>
          <span className="kl-dot"></span>
        </div>
      </div>
    </div>
  );
}

// ─── FloatingNexus (EILEEN-001 §3–4, KLUX-001 Art. 13 §13.2) ───
// Persistent Eileen presence during conversation state. 52px Nexus
// anchored bottom-right of conversation area. Three states driven
// by isLoading prop. Click to expand mini-panel.

function FloatingNexus({ tier, isLoading, isExpanded, onToggle }) {
  const nexusState = isLoading ? 'processing' : 'dormant';

  return (
    <div
      className="kl-floating-nexus-container"
      style={{
        position: 'absolute',
        bottom: window.innerWidth <= 768 ? '100px' : '80px',
        right: '24px',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        pointerEvents: 'auto',
        maxWidth: 'calc(100vw - 48px)',
      }}
    >
      {isExpanded && (
        <FloatingNexusPanel tier={tier} onClose={onToggle} />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isExpanded ? 'Close Eileen panel' : 'Open Eileen panel'}
        title="Eileen"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(10, 22, 40, 0.85)',
          border: '1px solid rgba(14, 165, 233, 0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          boxShadow: isLoading
            ? '0 0 20px rgba(14, 165, 233, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)'
            : '0 4px 16px rgba(0, 0, 0, 0.3)',
          transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <NexusCanvas tier={tier} size={36} state={nexusState} />
      </button>
    </div>
  );
}

// ─── FloatingNexusPanel ───
// Expands above the FloatingNexus button. Quick actions + status.

function FloatingNexusPanel({ tier, onClose }) {
  const tierLabel = {
    governance: 'Governance',
    operational_readiness: 'Operational',
    institutional: 'Institutional',
  }[tier] || 'Knowledge Library';

  return (
    <div
      className="kl-floating-panel"
      style={{
        width: '240px',
        maxWidth: 'calc(100vw - 48px)',
        background: 'rgba(15, 29, 50, 0.95)',
        border: '1px solid rgba(14, 165, 233, 0.2)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#0EA5E9',
            boxShadow: '0 0 6px rgba(14,165,233,0.5)',
          }}
        ></div>
        <span style={{ color: '#0EA5E9', fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>
          Eileen
        </span>
        <span style={{ flex: 1 }}></span>
        <span style={{ color: '#64748B', fontSize: '11px' }}>{tierLabel}</span>
      </div>

      <div style={{ color: '#CBD5E1', fontSize: '13px', lineHeight: 1.5, marginBottom: '12px' }}>
        I'm here whenever you need me. Ask a question or upload a contract for analysis.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          type="button"
          onClick={() => { onClose(); window.scrollTo(0, 0); }}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(14, 165, 233, 0.08)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            borderRadius: '8px',
            color: '#0EA5E9',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Ask a question
        </button>
      </div>
    </div>
  );
}

// ─── NexusSendButton (EILEEN-002 §7.2) ───
// 20px micro-Nexus inside the send button. Dormant when input empty,
// active when text entered, processing when isLoading.

function NexusSendButton({ hasText, isLoading, tier }) {
  const state = isLoading ? 'processing' : hasText ? 'ready' : 'dormant';
  return <NexusCanvas tier={tier} size={20} state={state} />;
}

// ─── FileAttachmentBubble (KL File Upload Widget, Stage A) ───
// Rendered on the user side for messages with type === 'file_upload'.
// Shows filename, size, and a status indicator that transitions
// uploading → extracting → ready (or error).

function FileAttachmentBubble({ filename, fileSize, status, charCount }) {
  const sizeLabel = formatFileSize(fileSize);

  const statusIcon = {
    uploading: '\u23F3',        // ⏳
    extracting: '\u2699\uFE0F', // ⚙️
    ready: '\u2705',            // ✅
    error: '\u274C',            // ❌
  }[status] || '\u23F3';

  const statusLabel = {
    uploading: 'Uploading...',
    extracting: 'Extracting text...',
    ready: charCount ? charCount.toLocaleString() + ' characters extracted' : 'Ready',
    error: 'Upload failed',
  }[status] || '';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '10px',
        background: 'rgba(14,165,233,0.08)',
        border: '1px solid rgba(14,165,233,0.2)',
        maxWidth: '320px',
      }}
    >
      <span style={{ fontSize: '24px' }} aria-hidden="true">{'\uD83D\uDCC4'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: '#E2E8F0',
            fontSize: '13px',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {filename}
        </div>
        <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>
          {sizeLabel + ' \u00B7 ' + statusLabel}
        </div>
      </div>
      <span style={{ fontSize: '16px' }} aria-hidden="true">{statusIcon}</span>
    </div>
  );
}

// ─── AnalysisResultMessage (KL R1-B, CCI v1.0 Separation Doctrine) ───
// Renders kl-compliance-bridge findings inside the conversation as an Eileen
// response. Eileen routes to the engine and presents findings — she does not
// compute scores or assess compliance (CCI v1.0 Art. I §1.5). PLUGIN-001
// Art. XIV §14.2: no "you should", "you must", "you are compliant".

function AnalysisResultMessage({ data }) {
  const score = data.overall_score;
  const status = data.status;
  const findings = data.findings || [];
  const forwardFindings = data.forward_findings || [];
  const summary = data.summary || {};
  const engineVersion = data.engine_version || '';
  const analysisTimeMs = data.analysis_time_ms || 0;
  const checksUsed = data.checks_used;
  const checkLimit = data.check_limit;

  // R1-C §4D — Hide compliant findings by default, toggle to reveal
  const [showCompliant, setShowCompliant] = useState(false);

  // Track which finding cards are expanded — use a ref + force-update counter
  // so we can toggle without threading state setters through the render tree.
  const expandedRef = useRef({});
  const [, setTick] = useState(0);
  function toggleFinding(key) {
    expandedRef.current[key] = !expandedRef.current[key];
    setTick((c) => c + 1);
  }

  // Out-of-scope handling — document is not an employment document.
  if (status === 'out_of_scope') {
    return (
      <div
        style={{
          padding: '16px',
          borderRadius: '10px',
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.2)',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#FBBF24', marginBottom: '8px' }}>
          {'\u26A0\uFE0F Document Outside Scope'}
        </div>
        <div style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5 }}>
          This document does not appear to be a UK employment contract, staff handbook, or workplace
          policy. The compliance engine analyses employment documents only. If this is an employment
          document, try uploading it in a different format (PDF or DOCX).
        </div>
      </div>
    );
  }

  const scoreColor = score >= 65 ? '#22C55E' : score >= 30 ? '#F59E0B' : '#EF4444';

  const SEV_COLORS = {
    critical:  { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)',  text: '#EF4444', label: 'Critical' },
    major:     { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.3)', text: '#FBBF24', label: 'Major'    },
    minor:     { bg: 'rgba(234,179,8,0.06)',  border: 'rgba(234,179,8,0.2)',  text: '#EAB308', label: 'Minor'    },
    compliant: { bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.2)',  text: '#22C55E', label: 'Compliant'},
  };

  const severityOrder = { critical: 0, major: 1, minor: 2, compliant: 3 };
  const visibleFindings = findings
    .filter((f) => showCompliant || f.severity !== 'compliant')
    .slice()
    .sort((a, b) => (severityOrder[a.severity] != null ? severityOrder[a.severity] : 4) - (severityOrder[b.severity] != null ? severityOrder[b.severity] : 4));

  const forwardNonCompliant = forwardFindings.filter((f) => f.severity !== 'compliant');
  const compliantCount = findings.filter((f) => f.severity === 'compliant').length;
  const findingsTotal = findings.length;
  const forwardTotal = forwardFindings.length;

  return (
    <div style={{ maxWidth: '100%' }}>

      {/* ── R1-C §4A: Overall Score Header ───────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(14,165,233,0.04))',
          border: '1px solid rgba(14,165,233,0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif", marginBottom: '4px' }}>
          Contract Compliance Score
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: scoreColor, fontFamily: "'DM Mono', monospace" }}>
          {Math.round(score) + '%'}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontFamily: "'DM Sans', sans-serif" }}>
          {findingsTotal + ' finding' + (findingsTotal === 1 ? '' : 's') + ' \u00B7 ' + forwardTotal + ' forward exposure item' + (forwardTotal === 1 ? '' : 's')}
        </div>
      </div>

      {/* ── R1-C §4B: Severity Summary Bar ───────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {Object.entries(summary).map(function(entry) {
          var sev = entry[0];
          var count = entry[1];
          if (!count) return null;
          var colors = { critical: '#EF4444', major: '#F59E0B', minor: '#3B82F6', compliant: '#22C55E' };
          return React.createElement('span', {
            key: sev,
            style: {
              background: (colors[sev] || '#666') + '20',
              border: '1px solid ' + (colors[sev] || '#666') + '40',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              color: colors[sev] || '#aaa',
            }
          }, count + ' ' + sev);
        })}
      </div>

      {status === 'sparse_report' && (
        <div style={{ fontSize: '12px', color: '#FBBF24', marginBottom: '12px' }}>
          {'\u26A0\uFE0F Some requirements could not be assessed. Manual review recommended for gaps.'}
        </div>
      )}

      {/* ── R1-C §4C: Current Law Findings header ────────────────── */}
      {visibleFindings.length > 0 && (
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#22D3EE', marginBottom: '8px', fontFamily: "'DM Sans', sans-serif" }}>
          Current Law Findings
        </div>
      )}

      {/* Current findings list (R1-C §4D: filtered by showCompliant) */}
      {visibleFindings.map((finding, idx) => {
        const sev = SEV_COLORS[finding.severity] || SEV_COLORS.minor;
        const key = 'c' + idx + '-' + finding.severity;
        const isExpanded = !!expandedRef.current[key];
        return (
          <div
            key={key}
            style={{
              marginBottom: '8px', borderRadius: '8px',
              background: sev.bg, border: '1px solid ' + sev.border,
              overflow: 'hidden',
            }}
          >
            <div
              onClick={() => toggleFinding(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  padding: '2px 6px', borderRadius: '4px',
                  background: sev.border, color: sev.text,
                }}
              >
                {sev.label}
              </span>
              <span style={{ fontSize: '12px', color: '#CBD5E1', flex: 1, minWidth: 0 }}>
                {finding.clause_category}
              </span>
              {finding.statutory_ref && (
                <span style={{ fontSize: '11px', color: '#64748B' }}>{finding.statutory_ref}</span>
              )}
              <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '4px' }}>
                {isExpanded ? '\u25B2' : '\u25BC'}
              </span>
            </div>

            {isExpanded && (
              <div style={{ padding: '0 12px 12px 12px' }}>
                {finding.clause_text && finding.clause_text !== '[Not found in document]' && (
                  <div
                    style={{
                      fontSize: '12px', color: '#94A3B8', fontStyle: 'italic',
                      padding: '6px 10px', marginBottom: '8px', borderRadius: '4px',
                      background: 'rgba(0,0,0,0.2)',
                      borderLeft: '2px solid ' + sev.border,
                    }}
                  >
                    {finding.clause_text.length > 300
                      ? finding.clause_text.slice(0, 300) + '\u2026'
                      : finding.clause_text}
                  </div>
                )}

                {finding.finding_detail && (
                  <div
                    style={{
                      fontSize: '12px', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '8px',
                    }}
                  >
                    {finding.finding_detail}
                  </div>
                )}

                {finding.remediation && (
                  <div
                    style={{
                      fontSize: '12px', color: '#0EA5E9', lineHeight: 1.5,
                      padding: '8px 10px', borderRadius: '4px',
                      background: 'rgba(14,165,233,0.06)',
                      borderLeft: '2px solid rgba(14,165,233,0.3)',
                    }}
                  >
                    <strong style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                      Remediation
                    </strong>
                    {finding.remediation}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── R1-C §4D: Toggle compliant visibility ────────────────── */}
      {compliantCount > 0 && (
        <button
          type="button"
          onClick={() => setShowCompliant(!showCompliant)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '8px 0',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {showCompliant
            ? 'Hide compliant items'
            : 'Show ' + compliantCount + ' compliant item' + (compliantCount === 1 ? '' : 's')}
        </button>
      )}

      {/* ── R1-C §4C: Forward findings section header ────────────── */}
      {forwardNonCompliant.length > 0 && (
        <div
          style={{
            fontSize: '14px', fontWeight: 700, color: '#A855F7',
            marginTop: '20px', marginBottom: '8px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {'Legislative Horizon \u2014 Forward Exposure'}
        </div>
      )}

      {/* Forward findings list */}
      {forwardNonCompliant.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '10px' }}>
            These findings relate to provisions of the Employment Rights Act 2025 not yet in force.
            They do not affect the current compliance position.
          </div>

          {forwardNonCompliant.map((finding, idx) => {
            const sev = SEV_COLORS[finding.severity] || SEV_COLORS.minor;
            const key = 'f' + idx;
            const isExpanded = !!expandedRef.current[key];
            return (
              <div
                key={key}
                style={{
                  marginBottom: '8px', borderRadius: '8px',
                  background: 'rgba(167,139,250,0.04)',
                  border: '1px solid rgba(167,139,250,0.15)',
                  overflow: 'hidden',
                }}
              >
                <div
                  onClick={() => toggleFinding(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 12px', cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: '4px',
                      background: sev.border, color: sev.text,
                    }}
                  >
                    {sev.label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#CBD5E1', flex: 1, minWidth: 0 }}>
                    {finding.clause_category}
                  </span>
                  {finding.forward_effective_date && (
                    <span style={{ fontSize: '10px', color: '#A78BFA' }}>
                      {'Expected: ' + finding.forward_effective_date}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '4px' }}>
                    {isExpanded ? '\u25B2' : '\u25BC'}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 12px 12px 12px' }}>
                    {finding.finding_detail && (
                      <div
                        style={{
                          fontSize: '12px', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '8px',
                        }}
                      >
                        {finding.finding_detail}
                      </div>
                    )}
                    {finding.remediation && (
                      <div
                        style={{
                          fontSize: '12px', color: '#A78BFA', lineHeight: 1.5,
                          padding: '8px 10px', borderRadius: '4px',
                          background: 'rgba(167,139,250,0.04)',
                          borderLeft: '2px solid rgba(167,139,250,0.2)',
                        }}
                      >
                        <strong
                          style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}
                        >
                          Action Before Commencement
                        </strong>
                        {finding.remediation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── R1-C §3: PDF Download Button ─────────────────────────── */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = 'Generating PDF\u2026';
            try {
              const token = window.__klToken;
              if (!token) throw new Error('Not authenticated');
              const response = await fetch(
                SUPABASE_URL + '/functions/v1/generate-report-pdf',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token,
                    'apikey': SUPABASE_ANON_KEY,
                  },
                  body: JSON.stringify({ upload_id: data.upload_id }),
                }
              );
              if (!response.ok) throw new Error('PDF generation failed');
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'Ailane-Compliance-Report.pdf';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              btn.textContent = '\u2713 Downloaded';
              btn.disabled = false;
              setTimeout(() => { btn.textContent = '\uD83D\uDCC4 Download PDF Report'; }, 2000);
            } catch (err) {
              console.error('PDF download error:', err);
              btn.textContent = '\u274C Failed \u2014 try again';
              btn.disabled = false;
              setTimeout(() => { btn.textContent = '\uD83D\uDCC4 Download PDF Report'; }, 3000);
            }
          }}
          style={{
            background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(14,165,233,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >{'\uD83D\uDCC4 Download PDF Report'}</button>

        {/* ── Sprint F §2.1: Save compliance findings to vault ───── */}
        <button
          type="button"
          onClick={async (e) => {
            var btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = 'Saving\u2026';
            try {
              var token = window.__klToken;
              if (!token) throw new Error('Not authenticated');
              var docId = data.document_id;
              if (docId) {
                var resp = await fetch(
                  SUPABASE_URL + '/rest/v1/kl_vault_documents?id=eq.' + docId,
                  {
                    method: 'PATCH',
                    headers: {
                      'Authorization': 'Bearer ' + token,
                      'apikey': SUPABASE_ANON_KEY,
                      'Content-Type': 'application/json',
                      'Prefer': 'return=minimal',
                    },
                    body: JSON.stringify({ analysis_status: 'completed' }),
                  }
                );
                if (!resp.ok) throw new Error('Vault update failed (' + resp.status + ')');
              }
              btn.textContent = '\u2713 Saved to Vault';
              btn.style.background = 'rgba(16,185,129,0.15)';
              btn.style.color = '#10B981';
              btn.style.borderColor = 'rgba(16,185,129,0.3)';
            } catch (err) {
              console.error('Save to Vault error:', err);
              btn.textContent = '\u274C Failed \u2014 try again';
              btn.disabled = false;
              setTimeout(function() { btn.textContent = '\uD83D\uDCBE Save to Vault'; }, 3000);
            }
          }}
          style={{
            background: 'transparent',
            color: '#CBD5E1',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)'; e.currentTarget.style.color = '#0EA5E9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#CBD5E1'; }}
        >{'\uD83D\uDCBE Save to Vault'}</button>
      </div>

      {/* ── Footer (Tier 4 disclaimer) ───────────────────────────── */}
      <div
        style={{
          marginTop: '12px', paddingTop: '10px',
          borderTop: '1px solid rgba(148,163,184,0.1)',
          fontSize: '11px', color: '#64748B', lineHeight: 1.5,
        }}
      >
        {'Engine ' + engineVersion + ' \u00B7 ' + Math.round(analysisTimeMs / 1000) + 's analysis time'}
        {checksUsed != null && checkLimit != null
          ? ' \u00B7 Check ' + checksUsed + '/' + checkLimit + ' used'
          : ''}
        <div style={{ marginTop: '6px', fontSize: '10px', color: '#475569' }}>
          This analysis is regulatory intelligence grounded in Ailane's compliance engine. It does
          not constitute legal advice. AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720)
          trading as Ailane.
        </div>
      </div>
    </div>
  );
}

// ─── MessageBubble ───

function MessageBubble({ msg, onRunAnalysis }) {
  if (msg.type === 'file_upload') {
    return (
      <div className="kl-msg kl-msg-user">
        <div className="kl-msg-content">
          <FileAttachmentBubble
            filename={msg.filename}
            fileSize={msg.fileSize}
            status={msg.status}
            charCount={msg.charCount}
          />
        </div>
      </div>
    );
  }
  if (msg.role === 'user') {
    return (
      <div className="kl-msg kl-msg-user">
        <div className="kl-msg-content">
          <div className="kl-msg-body">{msg.content}</div>
        </div>
      </div>
    );
  }
  const hasStats = msg.provisionsCount != null || msg.casesCount != null;
  const renderAnalysisResult = msg.isAnalysisResult && msg.analysisData;
  const html = renderAnalysisResult ? '' : renderMarkdown(msg.content || '');

  function handleRunClick() {
    if (typeof onRunAnalysis === 'function') {
      onRunAnalysis(msg.documentId, msg.id);
    }
  }

  return (
    <div className="kl-msg kl-msg-eileen">
      <div className="kl-msg-content" style={{ position: 'relative' }}>
        <EileenSenderLabel />

        {/* Analysis loading indicator — shown above the phased text */}
        {msg.isAnalysisLoading && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginTop: '8px', marginBottom: '4px',
            }}
          >
            <div
              className="kl-analysis-pulse"
              style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#0EA5E9',
                animation: 'kl-pulse 1.5s ease-in-out infinite',
                flexShrink: 0,
              }}
              aria-hidden="true"
            ></div>
            <span style={{ color: '#94A3B8', fontSize: '11px', fontStyle: 'italic' }}>
              Compliance engine active
            </span>
          </div>
        )}

        {/* Body: either the structured analysis result, or markdown text */}
        {renderAnalysisResult ? (
          <div className="kl-msg-body" style={{ marginTop: '8px' }}>
            <AnalysisResultMessage data={msg.analysisData} />
          </div>
        ) : (
          <div
            className="kl-msg-body"
            style={{ marginTop: '8px' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {/* Analysis trigger button — only when message is flagged analysisReady */}
        {msg.analysisReady && msg.documentId && !msg.analysisTriggered && (
          <button
            type="button"
            onClick={handleRunClick}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginTop: '12px', padding: '10px 18px',
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              color: '#FFFFFF', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {'\u2713 Run Contract Compliance Check'}
          </button>
        )}

        {msg.analysisReady && msg.analysisTriggered && (
          <div
            style={{
              marginTop: '12px', padding: '8px 14px',
              background: 'rgba(14,165,233,0.08)',
              borderRadius: '8px', fontSize: '12px', color: '#64748B',
              display: 'inline-block',
            }}
          >
            {'\u2713 Contract Compliance Check initiated'}
          </div>
        )}

        {/* AMD-044 §3.3 + §3.4: Eileen response action bar (Copy | Save | Download) */}
        {msg.role === 'assistant' && !msg.isAnalysisResult && !msg.isAnalysisLoading && !msg.isLocal && (
          <div style={{
            display: 'flex',
            gap: '2px',
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Copy */}
            <button
              type="button"
              onClick={function(e) {
                var btn = e.currentTarget;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(msg.content || '').then(function() {
                    var orig = btn.textContent;
                    btn.textContent = '\u2713 Copied';
                    setTimeout(function() { btn.textContent = orig; }, 1500);
                  });
                }
              }}
              className="kl-action-btn"
              title="Copy to clipboard"
            >Copy</button>

            {/* Save — AMD-044 §3.3: creates eileen_response note with source_attribution */}
            <button
              type="button"
              onClick={function(e) {
                var btn = e.currentTarget;
                btn.disabled = true;
                btn.textContent = 'Saving\u2026';
                var token = window.__klToken;
                var userId = window.__klUserId;
                if (!token || !userId) { btn.textContent = 'Not signed in'; btn.disabled = false; return; }
                var noteTitle = (msg.content || '').split('\n')[0].slice(0, 50) || 'Eileen response';
                var now = new Date();
                var dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                var timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                var attribution = '[Eileen \u2014 ' + dateStr + ' ' + timeStr + '] ' + noteTitle;
                fetch(SUPABASE_URL + '/rest/v1/kl_workspace_notes', {
                  method: 'POST',
                  headers: {
                    'Authorization': 'Bearer ' + token,
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                  },
                  body: JSON.stringify({
                    user_id: userId,
                    project_id: null,
                    title: noteTitle,
                    content_plain: msg.content || '',
                    content_json: {},
                    note_type: 'eileen_response',
                    source_attribution: attribution,
                  }),
                }).then(function(resp) {
                  if (resp.ok) {
                    btn.textContent = '\u2713 Saved';
                    btn.style.color = '#10B981';
                    // Notify NotesPanel to refresh list
                    resp.json().then(function(data) {
                      if (Array.isArray(data) && data[0] && typeof window.__klNotesRefresh === 'function') {
                        window.__klNotesRefresh(data[0]);
                      }
                    }).catch(function() {});
                    // Toast — brief green notification
                    var toast = document.createElement('div');
                    toast.textContent = 'Saved to Saved Items';
                    toast.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#10B981;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;font-family:DM Sans,sans-serif;z-index:9999;opacity:1;transition:opacity 0.3s;';
                    document.body.appendChild(toast);
                    setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { document.body.removeChild(toast); }, 300); }, 2000);
                  } else {
                    btn.textContent = 'Failed';
                    btn.style.color = '#EF4444';
                  }
                  setTimeout(function() { btn.textContent = 'Save'; btn.style.color = ''; btn.disabled = false; }, 2000);
                }).catch(function() {
                  btn.textContent = 'Failed';
                  setTimeout(function() { btn.textContent = 'Save'; btn.style.color = ''; btn.disabled = false; }, 2000);
                });
              }}
              className="kl-action-btn"
              title="Save this response to Saved Items"
            >Save</button>

            {/* Download — AMD-044 §3.4: includes mandatory disclaimer */}
            <button
              type="button"
              onClick={function() {
                var text = msg.content || '';
                var safeTitle = text.split('\n')[0].slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, '') || 'Eileen-response';
                var disclaimer = '\n\n---\nThis content was exported from the Ailane Knowledge Library. It constitutes regulatory intelligence, not legal advice. For legal advice, consult a qualified employment solicitor. AI Lane Limited \u00B7 Company No. 17035654 \u00B7 ICO Reg. 00013389720 \u00B7 ailane.ai/terms/';
                var blob = new Blob([text + disclaimer], { type: 'text/plain;charset=utf-8' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = safeTitle.replace(/\s+/g, '-') + '.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="kl-action-btn"
              title="Download this response as a text file"
            >Download</button>
          </div>
        )}

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

function MessageInput({ onSend, disabled, onFileSelect, pulseUpload }) {
  const [value, setValue] = useState('');
  const fileInputRef = useRef(null);

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

  function onPaperclipClick() {
    if (fileInputRef.current) fileInputRef.current.click();
  }

  return (
    <div className="kl-input-bar">
      {onFileSelect && (
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,.docx,.doc,.txt"
          style={{ display: 'none' }}
          onChange={onFileSelect}
        />
      )}
      {onFileSelect && (
        <button
          type="button"
          onClick={onPaperclipClick}
          title="Upload a contract for compliance analysis"
          aria-label="Upload a contract for compliance analysis"
          style={{
            background: 'rgba(14,165,233,0.08)',
            border: '1px solid rgba(14,165,233,0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            padding: '6px 10px',
            color: '#0EA5E9',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            animation: pulseUpload ? 'kl-pulse 1.5s ease-in-out 3' : 'none',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Upload contract</span>
        </button>
      )}
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
        <NexusSendButton hasText={!!value.trim()} isLoading={disabled} tier={window.__klTier || 'per_session'} />
      </button>
    </div>
  );
}

// ─── ConversationArea ───

function ConversationArea({ messages, isLoading, onSend, tier, onFileSelect, onRunAnalysis, floatingNexusExpanded, onToggleFloatingNexus, showQualifier, onUserTypeSelect, pulseUpload }) {
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const empty = messages.length === 0;

  function onDragOver(e) {
    if (!onFileSelect) return;
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave(e) {
    if (!onFileSelect) return;
    e.preventDefault();
    setIsDragging(false);
  }
  function onDrop(e) {
    if (!onFileSelect) return;
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect({ target: { files: files } });
    }
  }

  const dragOverlay = isDragging && (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'rgba(14,165,233,0.08)',
        border: '2px dashed #0EA5E9',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{ color: '#0EA5E9', fontSize: '16px', fontWeight: 500 }}>
        Drop your contract here
      </div>
    </div>
  );

  return (
    <div className="kl-main">
      {empty ? (
        <div
          className="kl-welcome"
          style={{ position: 'relative' }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {dragOverlay}
          <div className="kl-welcome-nexus">
            <NexusCanvas tier={tier} />
          </div>
          <h1 className="kl-welcome-greeting">What can I help you with today?</h1>
          <div className="kl-eileen-subtitle" style={{
            fontSize: '12px',
            color: '#64748B',
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.06em',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            Eileen &middot; UK Employment Law Intelligence
          </div>
          <div className="kl-welcome-input">
            <MessageInput onSend={onSend} disabled={isLoading} onFileSelect={onFileSelect} pulseUpload={pulseUpload} />
          </div>
          <HorizonAlert />
          <div className="kl-topics-grid">
            {TOPIC_DOMAINS.map((topic, i) => (
              <button key={i} className="kl-topic-card" onClick={() => onSend(topic.query)} disabled={isLoading}>
                <div className="kl-card-label">{topic.label}</div>
                <div className="kl-card-desc">{topic.description}</div>
              </button>
            ))}
          </div>
          {/* Sprint H §3.2: BookShelf replaces the Sprint G accent-line button.
              Renders up to 15 instruments as leather-textured book covers. */}
          <BookShelf onOpenBook={function(book) {
            if (typeof window.__klOpenPanel === 'function') {
              window.__klOpenPanel('research');
              window.__klPendingInstrument = book.id;
              window.dispatchEvent(new CustomEvent('kl-open-instrument', { detail: { id: book.id } }));
            }
          }} />
        </div>
      ) : (
        <div
          className="kl-conversation"
          style={{ position: 'relative' }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {dragOverlay}
          <FloatingNexus
            tier={tier}
            isLoading={isLoading}
            isExpanded={floatingNexusExpanded}
            onToggle={onToggleFloatingNexus}
          />
          <div className="kl-messages" ref={scrollRef} onClick={function(e) {
            var target = e.target;
            if (target && target.classList && target.classList.contains('kl-ref-link')) {
              var instId = target.getAttribute('data-inst');
              if (instId && typeof window.__klOpenPanel === 'function') {
                window.__klOpenPanel('research');
                window.__klPendingInstrument = instId;
                window.dispatchEvent(new CustomEvent('kl-open-instrument', { detail: { id: instId } }));
              }
            }
          }}>
            {messages.map((m, i) => <MessageBubble key={i} msg={m} onRunAnalysis={onRunAnalysis} />)}
            {showQualifier && <QualifyingQuestion onSelect={onUserTypeSelect} />}
            {isLoading && <TypingIndicator />}
          </div>
          <div className="kl-conversation-input">
            <MessageInput onSend={onSend} disabled={isLoading} onFileSelect={onFileSelect} pulseUpload={pulseUpload} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CrownJewels ───

function CrownJewels({ onQuery, disabled }) {
  var _exp = useState({});
  var expanded = _exp[0];
  var setExpanded = _exp[1];

  function toggle(name) {
    setExpanded(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[name] = !prev[name];
      return next;
    });
  }

  return React.createElement('div', { className: 'kl-crown' },
    React.createElement('div', { className: 'kl-crown-title' }, 'Crown Jewels'),
    React.createElement('div', { className: 'kl-crown-list' },
      CROWN_JEWELS.map(function(jewel) {
        var isOpen = !!expanded[jewel.name];
        return React.createElement('div', { key: jewel.name, style: { marginBottom: '4px' } },
          React.createElement('div', {
            onClick: function() { toggle(jewel.name); },
            style: {
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 10px', borderRadius: isOpen ? '8px 8px 0 0' : '8px',
              background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.12)',
              cursor: 'pointer', transition: 'background 0.15s',
            },
          },
            React.createElement('span', {
              style: {
                width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                background: jewel.inForce ? '#10B981' : '#F59E0B',
              },
            }),
            React.createElement('span', {
              style: { flex: 1, fontSize: '11px', color: '#CBD5E1', lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" },
            }, jewel.name),
            React.createElement('span', {
              style: { fontSize: '9px', color: '#64748B', flexShrink: 0, transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' },
              'aria-hidden': 'true',
            }, '\u25BC')
          ),
          isOpen && React.createElement('div', {
            style: {
              padding: '10px', background: 'rgba(14,165,233,0.02)',
              border: '1px solid rgba(14,165,233,0.12)', borderTop: 'none',
              borderRadius: '0 0 8px 8px',
            },
          },
            React.createElement('div', {
              style: { fontSize: '12px', color: '#0EA5E9', fontWeight: 500, marginBottom: '6px', fontFamily: "'DM Sans', sans-serif" },
            }, jewel.warmIntro),
            React.createElement('div', {
              style: { fontSize: '11px', color: '#94A3B8', lineHeight: 1.5, marginBottom: '10px' },
            }, jewel.topics),
            !jewel.inForce && React.createElement('div', {
              style: {
                fontSize: '10px', color: '#F59E0B', padding: '4px 8px', borderRadius: '4px',
                background: 'rgba(245,158,11,0.06)', marginBottom: '8px', display: 'inline-block',
              },
            }, 'Commenced 6 April 2026'),
            React.createElement('button', {
              type: 'button',
              disabled: disabled,
              onClick: function(e) { e.stopPropagation(); onQuery(jewel.keyQuestion); },
              style: {
                display: 'block', width: '100%', padding: '7px 10px', borderRadius: '6px',
                background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
                color: '#0EA5E9', fontSize: '11px', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", textAlign: 'left', opacity: disabled ? 0.5 : 1,
                transition: 'background 0.15s',
              },
            }, '\u2192 ' + jewel.keyQuestion)
          )
        );
      })
    )
  );
}

// ─── Sidebar ───

function Sidebar({ open, sessionHistory, activeSessionId, onSelectSession, onNewChat, onCrownQuery }) {
  var _historyOpen = useState(false);
  var historyOpen = _historyOpen[0];
  var setHistoryOpen = _historyOpen[1];

  return React.createElement('div', { className: 'kl-sidebar' + (open ? '' : ' collapsed') },
    React.createElement('div', { className: 'kl-sidebar-section' },
      React.createElement('button', { className: 'kl-new-chat-btn', onClick: onNewChat },
        React.createElement('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.25', strokeLinecap: 'round', strokeLinejoin: 'round' },
          React.createElement('line', { x1: '12', y1: '5', x2: '12', y2: '19' }),
          React.createElement('line', { x1: '5', y1: '12', x2: '19', y2: '12' })
        ),
        React.createElement('span', null, 'New Conversation')
      )
    ),

    React.createElement('div', { style: { flex: 1, overflowY: 'auto', minHeight: 0 } },
      React.createElement(CrownJewels, { onQuery: onCrownQuery })
    ),

    React.createElement('div', { style: { flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)' } },
      React.createElement('button', {
        type: 'button',
        onClick: function() { setHistoryOpen(!historyOpen); },
        style: {
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', background: 'transparent', border: 'none',
          color: '#64748B', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
          fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase',
        },
      },
        React.createElement('span', null, 'History (' + sessionHistory.length + ')'),
        React.createElement('span', {
          style: { fontSize: '9px', transition: 'transform 0.15s', transform: historyOpen ? 'rotate(180deg)' : 'rotate(0)' },
        }, '\u25BC')
      ),

      historyOpen && React.createElement('div', {
        style: { maxHeight: '240px', overflowY: 'auto', padding: '0 8px 8px' },
      },
        sessionHistory.length === 0
          ? React.createElement('div', { className: 'kl-sidebar-empty' }, 'No prior conversations')
          : groupSessionsByTime(sessionHistory).map(function(group) {
              return React.createElement(React.Fragment, { key: group.label },
                React.createElement('div', {
                  style: {
                    fontSize: '9px', fontWeight: 500, color: '#475569',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    padding: '8px 10px 3px', fontFamily: "'DM Mono', monospace",
                  },
                }, group.label),
                group.items.map(function(s) {
                  return React.createElement('button', {
                    key: s.sessionId,
                    className: 'kl-history-item' + (s.sessionId === activeSessionId ? ' active' : ''),
                    onClick: function() { onSelectSession(s.sessionId); },
                  },
                    React.createElement('div', { className: 'kl-history-title' }, truncate(s.title, 40)),
                    React.createElement('div', { className: 'kl-history-time' }, formatRelativeTime(s.lastActivity))
                  );
                })
              );
            })
      )
    )
  );
}

// ─── SessionCountdown (KLAC-001-AM-005) ───
// Per-session timer rendered inside TopBar. Reports expiry upward via onExpired
// so the App can hoist the modal to the root of the render tree.

function SessionCountdown({ expiresAt, onExpired }) {
  const [remaining, setRemaining] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    if (!expiresAt) return undefined;
    const expiry = new Date(expiresAt).getTime();
    if (isNaN(expiry)) return undefined;

    function tick() {
      const diff = expiry - Date.now();
      if (diff <= 0) {
        setRemaining('Expired');
        setIsUrgent(true);
        if (!firedRef.current && typeof onExpired === 'function') {
          firedRef.current = true;
          onExpired();
        }
        return false;
      }
      const totalSecs = Math.floor(diff / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      const label = hours > 0
        ? hours + 'h ' + String(mins).padStart(2, '0') + 'm'
        : mins + 'm ' + String(secs).padStart(2, '0') + 's';
      setRemaining(label);
      setIsUrgent(diff < 15 * 60 * 1000);
      return true;
    }

    if (!tick()) return undefined;
    const interval = setInterval(() => { if (!tick()) clearInterval(interval); }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  if (!expiresAt) return null;
  return (
    <span className={'kl-session-countdown' + (isUrgent ? ' urgent' : '')} title="Time remaining in this session">
      <span aria-hidden="true">⏱</span>
      <span className="kl-session-countdown-time">{remaining}</span>
    </span>
  );
}

// ─── ExpiredModal (KLAC-001-AM-005) ───

function ExpiredModal() {
  return (
    <div className="kl-expired-modal" role="dialog" aria-modal="true" aria-labelledby="kl-expired-title">
      <div className="kl-expired-backdrop" aria-hidden="true"></div>
      <div className="kl-expired-content">
        <h2 id="kl-expired-title" className="kl-expired-title">Session expired</h2>
        <p className="kl-expired-body">
          Your Knowledge Library session has ended. Purchase a new session to continue your research.
        </p>
        <a className="kl-expired-cta" href="/knowledge-library-preview/">
          Get a new session
        </a>
      </div>
    </div>
  );
}

// ─── MobileSidebarBackdrop ───
// Rendered whenever the sidebar is open. Hidden on desktop via CSS; visible on
// mobile to give a click-outside-to-close affordance for the overlay sidebar.

function MobileSidebarBackdrop({ onClick }) {
  return <div className="kl-sidebar-backdrop" onClick={onClick} aria-hidden="true"></div>;
}

// ─── TopBar ───

function TopBar({ sidebarOpen, onToggleSidebar, accessType, tier, sessionExpiresAt, onSessionExpired }) {
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
      <a
        className="kl-topbar-title"
        href="/"
        style={{
          color: '#22D3EE',
          textDecoration: 'none',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >AILANE Knowledge Library</a>
      <div className="kl-topbar-right">
        {accessType === 'per_session' && sessionExpiresAt && (
          <SessionCountdown expiresAt={sessionExpiresAt} onExpired={onSessionExpired} />
        )}
        <span className={'kl-tier-badge ' + badgeClass}>{badgeLabel}</span>
      </div>
    </div>
  );
}

// ─── PanelRail (KLUI-001 §2.1) ───

// Dead panel icons (eileen, documents, planner) removed per KLUX-001 Art. 9 §9.1.
// Only functional panels appear in the rail. PlaceholderPanel and its descriptions
// are preserved below as a defensive fallback in PanelDrawer but are now unreachable.
const PANEL_DEFS = [
  // Primary group (AMD-044 §4.2)
  { id: 'vault',     label: 'Document Vault',   minTier: 'operational_readiness', group: 'primary' },
  { id: 'notes',     label: 'Saved Items',      minTier: null, group: 'primary' },
  { id: 'research',  label: 'Research',         minTier: null, group: 'primary' },
  // Secondary group — clipboard slot removed per AMD-044 §4
  { id: 'calendar',  label: 'Calendar',         minTier: 'operational_readiness', group: 'secondary' },
];

// SVG icons for panel rail — 20px stroke-based, matching TopBar visual language
function PanelIcon({ id }) {
  var iconProps = { width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.75', strokeLinecap: 'round', strokeLinejoin: 'round' };

  if (id === 'vault') {
    return React.createElement('svg', iconProps,
      React.createElement('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
      React.createElement('polyline', { points: '14 2 14 8 20 8' }),
      React.createElement('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
      React.createElement('line', { x1: '16', y1: '17', x2: '8', y2: '17' })
    );
  }
  if (id === 'notes') {
    return React.createElement('svg', iconProps,
      React.createElement('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
      React.createElement('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
    );
  }
  if (id === 'research') {
    return React.createElement('svg', iconProps,
      React.createElement('circle', { cx: '11', cy: '11', r: '8' }),
      React.createElement('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' })
    );
  }
  if (id === 'calendar') {
    return React.createElement('svg', iconProps,
      React.createElement('rect', { x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2' }),
      React.createElement('line', { x1: '16', y1: '2', x2: '16', y2: '6' }),
      React.createElement('line', { x1: '8', y1: '2', x2: '8', y2: '6' }),
      React.createElement('line', { x1: '3', y1: '10', x2: '21', y2: '10' })
    );
  }
  // clipboard icon removed — AMD-044 §4
  // Fallback
  return React.createElement('span', { style: { fontSize: '18px' } }, '?');
}

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
  var userRank = TIER_RANK[tier] != null ? TIER_RANK[tier] : (TIER_RANK[accessType] != null ? TIER_RANK[accessType] : 0);
  var primaryPanels = PANEL_DEFS.filter(function(p) { return p.group === 'primary'; });
  var secondaryPanels = PANEL_DEFS.filter(function(p) { return p.group === 'secondary'; });

  function renderButton(p) {
    var minRank = p.minTier ? (TIER_RANK[p.minTier] != null ? TIER_RANK[p.minTier] : 99) : 0;
    var locked = userRank < minRank;
    var isActive = activePanel === p.id;
    return React.createElement('button', {
      key: p.id,
      type: 'button',
      className: 'kl-panel-rail-btn' + (isActive ? ' active' : '') + (locked ? ' locked' : ''),
      title: locked ? p.label + ' (upgrade required)' : p.label,
      'aria-label': p.label,
      'aria-pressed': isActive,
      disabled: locked,
      onClick: function() { if (!locked) onSelectPanel(isActive ? null : p.id); },
    },
      React.createElement(PanelIcon, { id: p.id })
    );
  }

  return React.createElement('div', { className: 'kl-panelrail' },
    primaryPanels.map(renderButton),
    React.createElement('div', {
      className: 'kl-panel-rail-divider',
      style: {
        width: '24px',
        height: '1px',
        background: 'rgba(255,255,255,0.08)',
        margin: '4px 0',
      },
      'aria-hidden': 'true',
    }),
    secondaryPanels.map(renderButton)
  );
}

// ─── NotesPanel (AMD-044 multi-note list/editor — reads/writes kl_workspace_notes) ───
// Two-pane layout: note list on left, editor on right.
// Supports note_type filter chips (All / Notes / Clips / Eileen).
// Download as Markdown / Text with mandatory advisory disclaimer.

var NOTES_DISCLAIMER = '\n\n---\nThis content was exported from the Ailane Knowledge Library. It constitutes regulatory intelligence, not legal advice. For legal advice, consult a qualified employment solicitor. AI Lane Limited \u00B7 Company No. 17035654 \u00B7 ICO Reg. 00013389720 \u00B7 ailane.ai/terms/';

function noteTypeIcon(noteType) {
  if (noteType === 'clip') return '\uD83D\uDCCC';
  if (noteType === 'eileen_response') return '\uD83D\uDCAC';
  return '\uD83D\uDCDD';
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  var days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function downloadNoteFile(note, format) {
  var safeTitle = (note.title || 'note').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '-');
  var content, mimeType, ext;
  if (format === 'md') {
    content = '# ' + (note.title || 'Untitled Note') + '\n\n' + (note.content_plain || '') + NOTES_DISCLAIMER;
    mimeType = 'text/markdown';
    ext = '.md';
  } else {
    content = (note.title || 'Untitled Note') + '\n\n' + (note.content_plain || '') + NOTES_DISCLAIMER;
    mimeType = 'text/plain;charset=utf-8';
    ext = '.txt';
  }
  var blob = new Blob([content], { type: mimeType });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = safeTitle + ext;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function NotesPanel() {
  var _notes = useState([]);
  var notes = _notes[0];
  var setNotes = _notes[1];
  var _active = useState(null);
  var activeId = _active[0];
  var setActiveId = _active[1];
  var _activeNote = useState(null);
  var activeNote = _activeNote[0];
  var setActiveNote = _activeNote[1];
  var _title = useState('Untitled Note');
  var title = _title[0];
  var setTitle = _title[1];
  var _body = useState('');
  var body = _body[0];
  var setBody = _body[1];
  var _status = useState('loading');
  var status = _status[0];
  var setStatus = _status[1];
  var _filter = useState('all');
  var filter = _filter[0];
  var setFilter = _filter[1];
  var _editable = useState(false);
  var editable = _editable[0];
  var setEditable = _editable[1];
  var _confirmDelete = useState(null);
  var confirmDelete = _confirmDelete[0];
  var setConfirmDelete = _confirmDelete[1];
  var _downloadOpen = useState(false);
  var downloadOpen = _downloadOpen[0];
  var setDownloadOpen = _downloadOpen[1];
  var saveTimer = useRef(null);

  useEffect(function() {
    var cancelled = false;
    async function load() {
      if (!window.__klToken || !window.__klUserId) { setStatus('saved'); return; }
      try {
        var resp = await fetch(
          SUPABASE_URL + '/rest/v1/kl_workspace_notes?user_id=eq.' + window.__klUserId +
            '&order=pinned.desc,updated_at.desc' +
            '&select=id,title,note_type,source_attribution,pinned,updated_at,content_plain',
          { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
        );
        var data = await resp.json();
        if (cancelled) return;
        if (Array.isArray(data)) { setNotes(data); }
        setStatus('saved');
      } catch (e) {
        console.error('Notes load failed:', e);
        if (!cancelled) setStatus('error');
      }
    }
    load();
    return function() { cancelled = true; if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  // Expose a function so MessageBubble can add notes and refresh the list
  useEffect(function() {
    window.__klNotesRefresh = function(newNote) {
      if (newNote) {
        setNotes(function(prev) { return [newNote].concat(prev); });
      }
    };
    return function() { delete window.__klNotesRefresh; };
  }, []);

  function selectNote(note) {
    // Fetch full content for selected note
    setActiveId(note.id);
    setActiveNote(note);
    setTitle(note.title || 'Untitled Note');
    setBody(note.content_plain || '');
    setStatus('saved');
    setEditable(note.note_type === 'note' || !note.note_type);
    setDownloadOpen(false);
    // Fetch full content (content_json etc) for the selected note
    if (window.__klToken) {
      fetch(
        SUPABASE_URL + '/rest/v1/kl_workspace_notes?id=eq.' + note.id + '&select=*',
        { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
      ).then(function(r) { return r.json(); }).then(function(d) {
        if (Array.isArray(d) && d[0]) {
          setBody(d[0].content_plain || '');
          setTitle(d[0].title || 'Untitled Note');
          setActiveNote(d[0]);
        }
      }).catch(function() {});
    }
  }

  function newNote() {
    if (!window.__klToken || !window.__klUserId) return;
    var dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    var newTitle = 'Untitled Note \u2014 ' + dateStr;
    fetch(SUPABASE_URL + '/rest/v1/kl_workspace_notes', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ user_id: window.__klUserId, project_id: null, title: newTitle, content_plain: '', note_type: 'note' }),
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (Array.isArray(d) && d[0]) {
        setNotes(function(prev) { return [d[0]].concat(prev); });
        selectNote(d[0]);
        setEditable(true);
      }
    }).catch(function(e) { console.error('Create note failed:', e); });
  }

  async function performSave(nextTitle, nextBody, currentId) {
    if (!window.__klToken || !window.__klUserId || !currentId) return;
    setStatus('saving');
    var now = new Date().toISOString();
    try {
      var resp = await fetch(
        SUPABASE_URL + '/rest/v1/kl_workspace_notes?id=eq.' + currentId,
        {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ title: nextTitle || 'Untitled Note', content_plain: nextBody, updated_at: now }),
        }
      );
      if (!resp.ok) throw new Error('PATCH ' + resp.status);
      setNotes(function(prev) { return prev.map(function(n) { return n.id === currentId ? Object.assign({}, n, { title: nextTitle, content_plain: nextBody, updated_at: now }) : n; }); });
      setStatus('saved');
    } catch (e) {
      console.error('Notes save failed:', e);
      setStatus('error');
    }
  }

  function scheduleSave(nextTitle, nextBody) {
    setStatus('dirty');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(function() { performSave(nextTitle, nextBody, activeId); }, 3000);
  }

  async function deleteNote(noteId) {
    if (!window.__klToken) return;
    try {
      await fetch(SUPABASE_URL + '/rest/v1/kl_workspace_notes?id=eq.' + noteId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY },
      });
      setNotes(function(prev) { return prev.filter(function(n) { return n.id !== noteId; }); });
      if (activeId === noteId) { setActiveId(null); setActiveNote(null); }
      setConfirmDelete(null);
    } catch (e) { console.error('Delete failed:', e); }
  }

  var filteredNotes = notes.filter(function(n) {
    if (filter === 'all') return true;
    if (filter === 'note') return n.note_type === 'note' || !n.note_type;
    if (filter === 'clip') return n.note_type === 'clip';
    if (filter === 'eileen') return n.note_type === 'eileen_response';
    return true;
  });

  var statusLabel = status === 'loading' ? 'Loading\u2026' : status === 'dirty' ? 'Unsaved changes' : status === 'saving' ? 'Saving\u2026' : status === 'error' ? 'Save failed' : '\u2713 Saved';
  var statusColor = status === 'saved' ? '#10B981' : status === 'saving' ? '#F59E0B' : status === 'error' ? '#EF4444' : '#94A3B8';

  var filterChips = ['all', 'note', 'clip', 'eileen'];
  var filterLabels = { all: 'All', note: 'Notes', clip: 'Clips', eileen: 'Eileen' };

  // ─── Note list pane (left) ───
  var noteListPane = React.createElement('div', {
    style: {
      width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0,
      borderRight: activeId ? '1px solid rgba(255,255,255,0.06)' : 'none',
      flex: activeId ? '0 0 200px' : '1',
    },
  },
    // Filter chips row
    React.createElement('div', { style: { display: 'flex', gap: '4px', padding: '0 0 8px', flexWrap: 'wrap' } },
      filterChips.map(function(f) {
        return React.createElement('button', {
          key: f,
          type: 'button',
          onClick: function() { setFilter(f); },
          style: {
            padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', border: 'none',
            background: filter === f ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.04)',
            color: filter === f ? '#0EA5E9' : '#94A3B8',
            transition: 'all 0.15s',
          },
        }, filterLabels[f]);
      })
    ),
    // New Note button
    React.createElement('button', {
      type: 'button',
      onClick: newNote,
      style: {
        width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(14,165,233,0.08)',
        border: '1px solid rgba(14,165,233,0.2)', color: '#0EA5E9', fontSize: '12px', fontWeight: 500,
        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
      },
    }, '+ New Note'),
    // Scrollable note list
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', minHeight: 0 } },
      filteredNotes.length === 0
        ? React.createElement('div', { style: { color: '#64748B', fontSize: '12px', textAlign: 'center', padding: '20px 4px' } },
            filter === 'all' ? 'No saved items yet.' : 'No ' + filterLabels[filter].toLowerCase() + ' found.'
          )
        : filteredNotes.map(function(n) {
            var isActive = activeId === n.id;
            return React.createElement('div', {
              key: n.id,
              style: {
                padding: '8px', marginBottom: '4px', borderRadius: '6px',
                background: isActive ? 'rgba(14,165,233,0.08)' : 'rgba(255,255,255,0.02)',
                borderLeft: isActive ? '3px solid #0EA5E9' : '3px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '6px',
                transition: 'all 0.15s',
              },
              onClick: function() { selectNote(n); },
            },
              // Type icon
              React.createElement('span', { style: { fontSize: '12px', flexShrink: 0, marginTop: '1px' } }, noteTypeIcon(n.note_type)),
              // Title + meta
              React.createElement('div', { style: { minWidth: 0, flex: 1 } },
                React.createElement('div', { style: {
                  color: isActive ? '#E2E8F0' : '#CBD5E1', fontSize: '12px', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                } }, (n.title || 'Untitled Note').substring(0, 40)),
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' } },
                  n.pinned ? React.createElement('span', { style: { fontSize: '9px' } }, '\uD83D\uDCCC') : null,
                  React.createElement('span', { style: { color: '#64748B', fontSize: '10px', fontFamily: "'DM Mono', monospace" } }, relativeTime(n.updated_at))
                )
              ),
              // Delete button
              React.createElement('button', {
                type: 'button',
                onClick: function(e) {
                  e.stopPropagation();
                  setConfirmDelete(n.id);
                },
                style: { background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', padding: '0 2px', flexShrink: 0, opacity: 0.6 },
                title: 'Delete',
                'aria-label': 'Delete note',
              }, '\u2715')
            );
          })
    )
  );

  // Delete confirmation dialog
  var deleteDialog = confirmDelete ? React.createElement('div', {
    style: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
      background: 'rgba(10,22,40,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
  },
    React.createElement('div', {
      style: {
        background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '10px',
        padding: '20px', maxWidth: '260px', textAlign: 'center',
      },
    },
      React.createElement('p', { style: { color: '#E2E8F0', fontSize: '13px', marginBottom: '14px' } }, 'Delete this note?'),
      React.createElement('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
        React.createElement('button', {
          type: 'button',
          onClick: function() { setConfirmDelete(null); },
          className: 'kl-action-btn',
          style: { fontSize: '12px', padding: '6px 14px' },
        }, 'Cancel'),
        React.createElement('button', {
          type: 'button',
          onClick: function() { deleteNote(confirmDelete); },
          style: {
            fontSize: '12px', padding: '6px 14px', borderRadius: '4px',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#EF4444', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          },
        }, 'Delete')
      )
    )
  ) : null;

  // ─── Editor pane (right) ───
  var editorPane = null;
  if (activeId && activeNote) {
    var isReadOnly = (activeNote.note_type === 'clip' || activeNote.note_type === 'eileen_response') && !editable;

    editorPane = React.createElement('div', {
      style: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, paddingLeft: '12px' },
    },
      // Toolbar: Download + Email
      React.createElement('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexShrink: 0 },
      },
        // Back button (mobile-friendly)
        React.createElement('button', {
          type: 'button',
          onClick: function() { setActiveId(null); setActiveNote(null); setDownloadOpen(false); },
          style: {
            background: 'none', border: 'none', color: '#0EA5E9', fontSize: '11px', cursor: 'pointer',
            padding: '0', fontFamily: "'DM Sans', sans-serif",
          },
        }, '\u2190 Back'),
        // Action buttons
        React.createElement('div', { style: { display: 'flex', gap: '4px', position: 'relative' } },
          // Download button with dropdown
          React.createElement('div', { style: { position: 'relative' } },
            React.createElement('button', {
              type: 'button',
              onClick: function() { setDownloadOpen(!downloadOpen); },
              className: 'kl-action-btn',
              title: 'Download',
              style: { fontSize: '11px', padding: '3px 8px' },
            }, '\u2B07 Download'),
            downloadOpen ? React.createElement('div', {
              style: {
                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '6px',
                padding: '4px 0', zIndex: 20, minWidth: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              },
            },
              React.createElement('button', {
                type: 'button',
                onClick: function() { downloadNoteFile({ title: title, content_plain: body }, 'md'); setDownloadOpen(false); },
                style: {
                  display: 'block', width: '100%', padding: '6px 12px', background: 'transparent',
                  border: 'none', color: '#E2E8F0', fontSize: '12px', textAlign: 'left', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                },
              }, 'Download as Markdown (.md)'),
              React.createElement('button', {
                type: 'button',
                onClick: function() { downloadNoteFile({ title: title, content_plain: body }, 'txt'); setDownloadOpen(false); },
                style: {
                  display: 'block', width: '100%', padding: '6px 12px', background: 'transparent',
                  border: 'none', color: '#E2E8F0', fontSize: '12px', textAlign: 'left', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                },
              }, 'Download as Text (.txt)'),
              React.createElement('div', { style: { height: '1px', background: '#1E3A5F', margin: '4px 0' } }),
              React.createElement('button', {
                type: 'button',
                disabled: true,
                title: 'Coming soon \u2014 requires server-side export',
                style: {
                  display: 'block', width: '100%', padding: '6px 12px', background: 'transparent',
                  border: 'none', color: '#64748B', fontSize: '12px', textAlign: 'left',
                  cursor: 'not-allowed', fontFamily: "'DM Sans', sans-serif", opacity: 0.5,
                },
              }, 'Download as PDF (.pdf)'),
              React.createElement('button', {
                type: 'button',
                disabled: true,
                title: 'Coming soon \u2014 requires server-side export',
                style: {
                  display: 'block', width: '100%', padding: '6px 12px', background: 'transparent',
                  border: 'none', color: '#64748B', fontSize: '12px', textAlign: 'left',
                  cursor: 'not-allowed', fontFamily: "'DM Sans', sans-serif", opacity: 0.5,
                },
              }, 'Download as DOCX (.docx)')
            ) : null
          ),
          // Email to self (greyed out)
          React.createElement('button', {
            type: 'button',
            disabled: true,
            className: 'kl-action-btn',
            title: 'Coming soon \u2014 requires server-side export',
            style: { fontSize: '11px', padding: '3px 8px', opacity: 0.4, cursor: 'not-allowed' },
          }, '\u2709 Email')
        )
      ),
      // Source attribution (for clips / eileen responses)
      activeNote.source_attribution ? React.createElement('div', {
        style: { color: '#64748B', fontSize: '11px', fontStyle: 'italic', marginBottom: '6px', fontFamily: "'DM Mono', monospace" },
      }, activeNote.source_attribution) : null,
      // Title input
      React.createElement('input', {
        className: 'kl-notes-title',
        type: 'text',
        value: title,
        readOnly: isReadOnly,
        onChange: function(e) {
          if (isReadOnly) return;
          var v = e.target.value;
          setTitle(v);
          scheduleSave(v, body);
        },
        placeholder: 'Untitled Note',
        style: isReadOnly ? { opacity: 0.8 } : {},
      }),
      // Status indicator
      React.createElement('div', {
        style: { fontSize: '10px', color: statusColor, marginBottom: '6px', fontFamily: "'DM Mono', monospace" },
      }, statusLabel),
      // Edit button for read-only notes
      isReadOnly ? React.createElement('button', {
        type: 'button',
        onClick: function() { setEditable(true); },
        className: 'kl-action-btn',
        style: { fontSize: '11px', padding: '3px 8px', marginBottom: '6px', alignSelf: 'flex-start' },
      }, '\u270E Edit') : null,
      // Body editor / reader
      React.createElement('textarea', {
        className: 'kl-notes-body',
        value: body,
        readOnly: isReadOnly,
        onChange: function(e) {
          if (isReadOnly) return;
          var v = e.target.value;
          setBody(v);
          scheduleSave(title, v);
        },
        placeholder: 'Take notes during your research...',
        style: Object.assign({ flex: 1 }, isReadOnly ? { opacity: 0.85 } : {}),
      })
    );
  } else {
    // No note selected — show prompt
    editorPane = React.createElement('div', {
      style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '12px' },
    },
      React.createElement('p', { style: { color: '#64748B', fontSize: '13px', textAlign: 'center' } }, 'Select a note or create a new one')
    );
  }

  return React.createElement('div', {
    className: 'kl-notes-panel',
    style: { display: 'flex', flexDirection: 'row', height: '100%', position: 'relative', minHeight: 0 },
  },
    noteListPane,
    editorPane,
    deleteDialog
  );
}

// ─── ClipboardPanel retired (AMD-044 §4) ───
// Clipboard functionality absorbed by NotesPanel via note_type='clip'.
// window.__klAddClip stub retained for backward compatibility with any
// code that may still call it — silently no-ops.

// ─── VaultPanel (AMD-044 §5 — dual-source: kl_vault_documents + compliance_uploads) ───
// Raw REST fetch — consistent with NotesPanel and CLAUDE.md JWT-decode + raw-fetch rule.
// Primary source: kl_vault_documents (KL upload flow).
// Secondary source: compliance_uploads (compliance check portal uploads).
// Client-side merge into normalised shape, sorted by date desc.

function VaultPanel() {
  var _s = useState([]);
  var docs = _s[0];
  var setDocs = _s[1];
  var _l = useState(true);
  var loading = _l[0];
  var setLoading = _l[1];
  var _err = useState(false);
  var fetchError = _err[0];
  var setFetchError = _err[1];
  var _preview = useState(null);
  var previewDoc = _preview[0];
  var setPreviewDoc = _preview[1];

  function loadDocs() {
    setLoading(true);
    setFetchError(false);
    var cancelled = false;

    async function load() {
      if (!window.__klToken || !window.__klUserId) {
        setLoading(false);
        return;
      }
      var headers = { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY };
      var vaultOk = false;
      var uploadsOk = false;
      var allDocs = [];

      // Primary: kl_vault_documents (AMD-044 §5.1 query 1)
      try {
        var vaultResp = await fetch(
          SUPABASE_URL + '/rest/v1/kl_vault_documents?user_id=eq.' + window.__klUserId +
            '&deleted_at=is.null' +
            '&order=created_at.desc' +
            '&select=id,filename,storage_path,file_size_bytes,mime_type,extraction_status,analysis_status,created_at,visibility',
          { headers: headers }
        );
        if (vaultResp.ok) {
          var vaultData = await vaultResp.json();
          vaultOk = true;
          if (!cancelled && Array.isArray(vaultData)) {
            vaultData.forEach(function(d) {
              allDocs.push({
                id: d.id,
                name: d.filename,
                source: 'vault',
                size: d.file_size_bytes,
                status: d.extraction_status,
                score: null,
                storagePath: d.storage_path,
                date: d.created_at,
              });
            });
          }
        }
      } catch (e) { console.warn('Vault docs fetch failed:', e); }

      // Secondary: compliance_uploads (AMD-044 §5.1 query 2)
      try {
        var uploadsResp = await fetch(
          SUPABASE_URL + '/rest/v1/compliance_uploads?user_id=eq.' + window.__klUserId +
            '&order=created_at.desc' +
            '&select=id,file_name,file_path,file_size_bytes,document_type,status,overall_score,created_at,display_name',
          { headers: headers }
        );
        if (uploadsResp.ok) {
          var uploadsData = await uploadsResp.json();
          uploadsOk = true;
          if (!cancelled && Array.isArray(uploadsData)) {
            uploadsData.forEach(function(d) {
              allDocs.push({
                id: d.id,
                name: d.display_name || d.file_name,
                source: 'compliance',
                size: d.file_size_bytes,
                status: d.status,
                score: d.overall_score,
                storagePath: d.file_path,
                date: d.created_at,
              });
            });
          }
        }
      } catch (e) { console.warn('Uploads fetch failed:', e); }

      if (!cancelled) {
        if (!vaultOk && !uploadsOk) {
          setFetchError(true);
        }
        allDocs.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
        setDocs(allDocs);
        setLoading(false);
      }
    }

    load();
    return function() { cancelled = true; };
  }

  useEffect(function() {
    var cleanup = loadDocs();
    return cleanup;
  }, []);

  // Upload button (existing pattern, delegates to App-level handler)
  var uploadButton = React.createElement('div', { style: { marginBottom: '12px' } },
    React.createElement('input', {
      type: 'file',
      id: 'vault-upload-input',
      accept: '.pdf,.docx,.doc,.txt',
      style: { display: 'none' },
      onChange: function(e) {
        if (typeof window.__klHandleFileSelect === 'function') {
          window.__klHandleFileSelect(e);
        }
      },
    }),
    React.createElement('button', {
      type: 'button',
      onClick: function() {
        var input = document.getElementById('vault-upload-input');
        if (input) input.click();
      },
      style: {
        width: '100%', padding: '10px', borderRadius: '8px',
        background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
        color: '#0EA5E9', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      },
    },
      React.createElement('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
        React.createElement('polyline', { points: '17 8 12 3 7 8' }),
        React.createElement('line', { x1: '12', y1: '3', x2: '12', y2: '15' })
      ),
      'Upload document'
    )
  );

  if (loading) {
    return React.createElement('div', { style: { color: '#94A3B8', fontSize: '13px', padding: '12px' } }, 'Loading documents\u2026');
  }

  // Error state — both sources failed (AMD-044 §5.4)
  if (fetchError && docs.length === 0) {
    return React.createElement('div', { style: { padding: '12px', textAlign: 'center' } },
      uploadButton,
      React.createElement('p', { style: { color: '#94A3B8', fontSize: '13px', marginBottom: '10px' } }, 'Unable to load your documents. Please try again.'),
      React.createElement('button', {
        type: 'button',
        onClick: function() { loadDocs(); },
        className: 'kl-action-btn',
        style: { fontSize: '12px', padding: '6px 14px' },
      }, 'Retry')
    );
  }

  // Preview overlay
  if (previewDoc) {
    return React.createElement('div', { style: { padding: '12px' } },
      React.createElement('button', {
        type: 'button',
        onClick: function() { setPreviewDoc(null); },
        style: { background: 'none', border: 'none', color: '#0EA5E9', fontSize: '12px', cursor: 'pointer', padding: '0', marginBottom: '10px', fontFamily: "'DM Sans', sans-serif" },
      }, '\u2190 Back to documents'),
      React.createElement('div', { style: { color: '#E2E8F0', fontSize: '14px', fontWeight: 500, marginBottom: '4px' } }, previewDoc.name),
      React.createElement('div', { style: { display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' } },
        React.createElement('span', {
          style: { fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontFamily: "'DM Mono', monospace", background: previewDoc.source === 'vault' ? 'rgba(14,165,233,0.15)' : 'rgba(16,185,129,0.15)', color: previewDoc.source === 'vault' ? '#0EA5E9' : '#10B981' },
        }, previewDoc.source === 'vault' ? 'Vault' : 'Check'),
        previewDoc.size ? React.createElement('span', { style: { fontSize: '10px', color: '#64748B', fontFamily: "'DM Mono', monospace" } }, formatFileSize(previewDoc.size)) : null,
        React.createElement('span', { style: { fontSize: '10px', color: '#64748B', fontFamily: "'DM Mono', monospace" } }, relativeTime(previewDoc.date))
      ),
      React.createElement('div', {
        style: { color: '#94A3B8', fontSize: '12px', lineHeight: 1.6, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' },
      }, 'Document preview is available after extraction is complete. Full document content will appear here in a future update.')
    );
  }

  if (docs.length === 0) {
    return React.createElement('div', { style: { padding: '12px' } },
      uploadButton,
      React.createElement('p', { style: { color: '#94A3B8', fontSize: '14px', marginBottom: '6px' } }, 'No documents yet.'),
      React.createElement('p', { style: { color: '#64748B', fontSize: '13px', lineHeight: 1.5 } },
        'Upload a contract here or through Eileen to run a compliance check.'
      )
    );
  }

  return React.createElement('div', null,
    uploadButton,
    docs.map(function(doc) {
      var hasScore = doc.score != null;
      var scoreColor = !hasScore ? null : doc.score >= 75 ? '#10B981' : doc.score >= 50 ? '#F59E0B' : '#EF4444';
      var scoreBg = !hasScore ? null : doc.score >= 75 ? 'rgba(16,185,129,0.15)' : doc.score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';

      // Source badge (AMD-044 §5.3)
      var sourceBadge = React.createElement('span', {
        style: {
          fontSize: '10px', fontWeight: 500, padding: '2px 6px', borderRadius: '4px',
          fontFamily: "'DM Mono', monospace",
          background: doc.source === 'vault' ? 'rgba(14,165,233,0.15)' : 'rgba(16,185,129,0.15)',
          color: doc.source === 'vault' ? '#0EA5E9' : '#10B981',
          flexShrink: 0,
        },
      }, doc.source === 'vault' ? 'Vault' : 'Check');

      // Compliance score badge
      var scoreBadge = hasScore ? React.createElement('span', {
        style: {
          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
          background: scoreBg, color: scoreColor, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        },
      },
        React.createElement('span', {
          style: { width: '8px', height: '8px', borderRadius: '50%', background: scoreColor, display: 'inline-block' },
        }),
        Math.round(doc.score) + '%'
      ) : null;

      // Status badge for non-scored items
      var statusBadge = null;
      if (!hasScore && doc.status) {
        var statusColors = {
          pending: { text: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
          extracting: { text: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
          processing: { text: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
          completed: { text: '#10B981', bg: 'rgba(16,185,129,0.1)' },
          ready: { text: '#10B981', bg: 'rgba(16,185,129,0.1)' },
        };
        var sc = statusColors[doc.status] || statusColors.pending;
        statusBadge = React.createElement('span', {
          style: { fontSize: '10px', fontWeight: 500, padding: '2px 6px', borderRadius: '4px', background: sc.bg, color: sc.text, flexShrink: 0, fontFamily: "'DM Mono', monospace" },
        }, doc.status);
      }

      return React.createElement('div', {
        key: doc.source + '-' + doc.id,
        style: { padding: '12px', marginBottom: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' },
      },
        // Row 1: Name + score or status
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } },
          React.createElement('span', {
            style: { color: '#E2E8F0', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 },
          }, (doc.name || '').substring(0, 35)),
          hasScore ? scoreBadge : statusBadge
        ),
        // Row 2: Source badge, date, file size
        React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' } },
          sourceBadge,
          React.createElement('span', { style: { color: '#64748B', fontSize: '11px' } }, relativeTime(doc.date)),
          doc.size ? React.createElement('span', { style: { color: '#64748B', fontSize: '10px', fontFamily: "'DM Mono', monospace" } }, formatFileSize(doc.size)) : null
        ),
        // Row 3: Action buttons (AMD-044 §5.3)
        React.createElement('div', { style: { display: 'flex', gap: '4px', marginTop: '8px' } },
          React.createElement('button', {
            type: 'button',
            className: 'kl-action-btn',
            onClick: function() { setPreviewDoc(doc); },
            style: { fontSize: '11px', padding: '3px 8px' },
          }, 'Preview'),
          doc.source === 'compliance'
            ? React.createElement('button', {
                type: 'button',
                className: 'kl-action-btn',
                title: 'Download compliance report',
                style: { fontSize: '11px', padding: '3px 8px' },
                onClick: function() {
                  // Trigger existing generate-report-pdf pipeline if available
                  if (typeof window.__klDownloadReport === 'function') {
                    window.__klDownloadReport(doc.id);
                  }
                },
              }, 'Download')
            : React.createElement('button', {
                type: 'button',
                className: 'kl-action-btn',
                disabled: true,
                title: 'Preview only \u2014 download will be available when storage retrieval is built',
                style: { fontSize: '11px', padding: '3px 8px', opacity: 0.4, cursor: 'not-allowed' },
              }, 'Download')
        )
      );
    })
  );
}

// ─── CalendarPanel (regulatory_requirements, not user-scoped, expandable detail) ───

function CalendarPanel() {
  var _reqs = useState([]);
  var reqs = _reqs[0];
  var setReqs = _reqs[1];
  var _loading = useState(true);
  var loading = _loading[0];
  var setLoading = _loading[1];
  var _filter = useState('all');
  var filter = _filter[0];
  var setFilter = _filter[1];
  var _expanded = useState({});
  var expanded = _expanded[0];
  var setExpanded = _expanded[1];

  useEffect(function() {
    var cancelled = false;
    async function load() {
      if (!window.__klToken) { setLoading(false); return; }
      try {
        var resp = await fetch(
          SUPABASE_URL + '/rest/v1/regulatory_requirements' +
            '?select=id,requirement_name,statutory_basis,effective_from,commencement_status,is_forward_requirement,source_act' +
            '&order=effective_from.asc',
          { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
        );
        var data = await resp.json();
        if (cancelled) return;
        if (Array.isArray(data)) setReqs(data);
      } catch (e) { console.error('Calendar load failed:', e); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return function() { cancelled = true; };
  }, []);

  function toggleExpand(id) {
    setExpanded(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[id] = !prev[id];
      return next;
    });
  }

  if (loading) {
    return React.createElement('div', { style: { color: '#94A3B8', fontSize: '13px', padding: '12px' } }, 'Loading regulatory calendar\u2026');
  }

  var forwardCount = reqs.filter(function(r) { return r.is_forward_requirement; }).length;
  var filtered = reqs.filter(function(r) {
    if (filter === 'forward') return r.is_forward_requirement;
    if (filter === 'in_force') return r.commencement_status === 'in_force';
    return true;
  });

  var filterButtons = [
    { id: 'all', label: 'All (' + reqs.length + ')' },
    { id: 'in_force', label: 'In Force' },
    { id: 'forward', label: 'Forward (' + forwardCount + ')' },
  ];

  return React.createElement('div', null,
    React.createElement('div', { style: { display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' } },
      filterButtons.map(function(f) {
        return React.createElement('button', {
          key: f.id,
          type: 'button',
          onClick: function() { setFilter(f.id); },
          style: {
            padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
            fontFamily: 'inherit',
            border: filter === f.id ? '1px solid #0EA5E9' : '1px solid rgba(255,255,255,0.1)',
            background: filter === f.id ? 'rgba(14,165,233,0.15)' : 'transparent',
            color: filter === f.id ? '#0EA5E9' : '#94A3B8',
          },
        }, f.label);
      })
    ),
    filtered.length === 0
      ? React.createElement('div', { style: { color: '#64748B', fontSize: '12px', padding: '8px 4px' } }, 'No requirements match this filter.')
      : filtered.map(function(r) {
          var isOpen = !!expanded[r.id];
          return React.createElement('div', {
            key: r.id,
            style: {
              marginBottom: '6px', borderRadius: '6px', overflow: 'hidden',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: r.is_forward_requirement ? '3px solid #F59E0B' : '3px solid #10B981',
            },
          },
            React.createElement('div', {
              onClick: function() { toggleExpand(r.id); },
              style: { padding: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
            },
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { color: '#E2E8F0', fontSize: '13px', fontWeight: 500 } }, r.requirement_name),
                r.effective_from && React.createElement('div', { style: { color: '#64748B', fontSize: '11px', marginTop: '2px' } },
                  'Effective: ' + new Date(r.effective_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                )
              ),
              React.createElement('span', {
                style: { color: '#64748B', fontSize: '10px', flexShrink: 0, transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' },
                'aria-hidden': 'true',
              }, '\u25BC')
            ),
            isOpen && React.createElement('div', {
              style: { padding: '0 10px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' },
            },
              r.statutory_basis && React.createElement('div', { style: { marginTop: '8px' } },
                React.createElement('span', { style: { color: '#64748B', fontSize: '10px', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Statutory Basis'),
                React.createElement('div', { style: { color: '#CBD5E1', fontSize: '12px', marginTop: '2px' } }, r.statutory_basis)
              ),
              r.source_act && React.createElement('div', { style: { marginTop: '8px' } },
                React.createElement('span', { style: { color: '#64748B', fontSize: '10px', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Source Act'),
                React.createElement('div', { style: { color: '#CBD5E1', fontSize: '12px', marginTop: '2px' } }, r.source_act)
              ),
              React.createElement('div', { style: { marginTop: '8px' } },
                React.createElement('span', { style: { color: '#64748B', fontSize: '10px', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Status'),
                React.createElement('div', { style: { marginTop: '2px' } },
                  React.createElement('span', {
                    style: {
                      fontSize: '11px', fontWeight: 500, padding: '2px 6px', borderRadius: '4px',
                      background: r.commencement_status === 'in_force' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                      color: r.commencement_status === 'in_force' ? '#10B981' : '#F59E0B',
                    },
                  }, r.commencement_status === 'in_force' ? 'In Force' : r.commencement_status || 'Pending')
                )
              ),
              r.is_forward_requirement && React.createElement('div', {
                style: { marginTop: '8px', padding: '6px 8px', borderRadius: '4px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)', fontSize: '11px', color: '#F59E0B' },
              }, 'Forward requirement \u2014 not yet in force')
            )
          );
        })
  );
}

// ─── ResearchPanel (kl_provisions grouped by instrument + kl_cases, tabs + search) ───

function ResearchPanel() {
  // Sprint F §3.2: default tab is Library (was 'provisions')
  var _tab = useState('library');
  var tab = _tab[0];
  var setTab = _tab[1];
  var _search = useState('');
  var search = _search[0];
  var setSearch = _search[1];
  var _data = useState([]);
  var data = _data[0];
  var setData = _data[1];
  var _loading = useState(true);
  var loading = _loading[0];
  var setLoading = _loading[1];
  var _expanded = useState({});
  var expanded = _expanded[0];
  var setExpanded = _expanded[1];
  // Sprint F §3.3: Library tab state
  var _instruments = useState([]);
  var instruments = _instruments[0];
  var setInstruments = _instruments[1];
  var _activeInstrument = useState(null);
  var activeInstrument = _activeInstrument[0];
  var setActiveInstrument = _activeInstrument[1];
  var _instrumentDetail = useState(null);
  var instrumentDetail = _instrumentDetail[0];
  var setInstrumentDetail = _instrumentDetail[1];
  var _detailLoading = useState(false);
  var detailLoading = _detailLoading[0];
  var setDetailLoading = _detailLoading[1];

  useEffect(function() {
    // Sprint F §3.4: Library tab is handled by its own useEffect below.
    if (tab === 'library') { setLoading(false); return; }
    var cancelled = false;
    async function load() {
      if (!window.__klToken) { setLoading(false); return; }
      setLoading(true);
      try {
        var path = tab === 'provisions'
          ? '/rest/v1/kl_provisions?select=provision_id,title,instrument_id,section_num,in_force,is_era_2025&order=instrument_id,section_num&limit=500'
          : '/rest/v1/kl_cases?select=case_id,name,citation,court,year,principle&order=year.desc&limit=100';
        var resp = await fetch(SUPABASE_URL + path, {
          headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY },
        });
        var d = await resp.json();
        if (cancelled) return;
        setData(Array.isArray(d) ? d : []);
      } catch (e) {
        console.error('Research load failed:', e);
        if (!cancelled) setData([]);
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return function() { cancelled = true; };
  }, [tab]);

  // Sprint G §2.1: Fetch static content manifest. Replaces the Sprint F
  // legislation_library query. No auth, instant load, includes all 72
  // instruments across legislation, ACAS, HSE, ICO, EHRC, and the rest
  // of the bookshelf. The manifest is generated by build-content-index.js
  // at repo root and regenerated whenever content files change.
  useEffect(function() {
    if (tab !== 'library') return;
    var cancelled = false;
    async function loadInstruments() {
      try {
        var resp = await fetch('/knowledge-library/content/content-index.json');
        var d = await resp.json();
        if (!cancelled && Array.isArray(d)) {
          setInstruments(d);
          // Sprint H §2.4: Check for pending instrument open (from reference click)
          if (window.__klPendingInstrument) {
            var pending = window.__klPendingInstrument;
            delete window.__klPendingInstrument;
            var target = d.find(function(inst) { return inst.id === pending; });
            if (target) {
              setTimeout(function() { loadInstrumentDetail(target); }, 100);
            }
          }
        }
      } catch (e) { console.warn('Library manifest fetch failed:', e); }
    }
    if (instruments.length === 0) loadInstruments();
    return function() { cancelled = true; };
  }, [tab]);

  // Sprint H §2.4: Listen for reference-click events dispatched from the
  // conversation area. Switches to the Library tab and loads the requested
  // instrument if it is already in the cached list; otherwise defers to
  // the loader above via window.__klPendingInstrument.
  useEffect(function() {
    function handleOpen(e) {
      var instId = e.detail && e.detail.id;
      if (!instId) return;
      setTab('library');
      var found = instruments.find(function(inst) { return inst.id === instId; });
      if (found) {
        loadInstrumentDetail(found);
      } else {
        window.__klPendingInstrument = instId;
      }
    }
    window.addEventListener('kl-open-instrument', handleOpen);
    return function() { window.removeEventListener('kl-open-instrument', handleOpen); };
  }, [instruments]);

  function toggleInstrument(instId) {
    setExpanded(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[instId] = !prev[instId];
      return next;
    });
  }

  // Sprint G: Fetch individual content file on instrument click.
  // The manifest carries the filename directly (e.g. "era1996.json"),
  // so we can fetch it without any registry lookup.
  async function loadInstrumentDetail(inst) {
    setActiveInstrument(inst);
    setInstrumentDetail(null);
    setDetailLoading(true);
    try {
      var filename = inst.filename || (inst.id ? inst.id + '.json' : null);
      if (filename) {
        var resp = await fetch('/knowledge-library/content/' + filename);
        if (resp.ok) {
          var d = await resp.json();
          setInstrumentDetail(d);
        }
      }
    } catch (e) { console.warn('Content file fetch failed:', e); }
    finally { setDetailLoading(false); }
  }

  var filtered = data.filter(function(item) {
    if (!search) return true;
    var s = search.toLowerCase();
    if (tab === 'provisions') {
      return (item.title || '').toLowerCase().indexOf(s) !== -1 || (item.instrument_id || '').toLowerCase().indexOf(s) !== -1;
    }
    return (item.name || '').toLowerCase().indexOf(s) !== -1 || (item.citation || '').toLowerCase().indexOf(s) !== -1;
  });

  // Sprint G §3: Library-specific search filter. Matches on title, short
  // name, warm subtitle, and category. Computed in the parent scope so
  // renderLibraryTab can consume it via closure.
  var filteredInstruments = instruments;
  if (tab === 'library' && search) {
    var libSearch = search.toLowerCase();
    filteredInstruments = instruments.filter(function(inst) {
      return (inst.title || '').toLowerCase().indexOf(libSearch) !== -1 ||
             (inst.short || '').toLowerCase().indexOf(libSearch) !== -1 ||
             (inst.warmSubtitle || '').toLowerCase().indexOf(libSearch) !== -1 ||
             (inst.cat || '').toLowerCase().indexOf(libSearch) !== -1;
    });
  }

  // Group provisions by instrument
  var groupedProvisions = {};
  if (tab === 'provisions') {
    filtered.forEach(function(item) {
      var key = item.instrument_id || 'Other';
      if (!groupedProvisions[key]) { groupedProvisions[key] = []; }
      groupedProvisions[key].push(item);
    });
  }
  var instrumentKeys = Object.keys(groupedProvisions).sort();

  // Sprint F §3.7: Existing Sprint D provisions rendering wrapped in a
  // helper — logic unchanged, just callable by name.
  function renderProvisionsTab() {
    if (instrumentKeys.length === 0) {
      return React.createElement('div', { style: { color: '#64748B', fontSize: '12px', padding: '8px 4px' } }, 'No results.');
    }
    return instrumentKeys.map(function(instId) {
      var items = groupedProvisions[instId];
      var isOpen = !!expanded[instId];
      return React.createElement('div', { key: instId, style: { marginBottom: '6px' } },
        React.createElement('button', {
          type: 'button',
          onClick: function() { toggleInstrument(instId); },
          style: {
            width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px',
            background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.12)',
            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            color: '#E2E8F0', fontSize: '12px', fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
          },
        },
          React.createElement('span', null, INSTRUMENT_NAMES[instId] || instId),
          React.createElement('span', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            React.createElement('span', { style: { fontSize: '10px', color: '#0EA5E9', fontFamily: "'DM Mono', monospace" } }, items.length + ' provisions'),
            React.createElement('span', { style: { fontSize: '10px', color: '#64748B', transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' } }, '\u25BC')
          )
        ),
        isOpen && React.createElement('div', { style: { paddingLeft: '8px', marginTop: '4px' } },
          items.map(function(item) {
            return React.createElement('div', {
              key: item.provision_id,
              style: {
                padding: '6px 8px', marginBottom: '2px', borderRadius: '4px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer',
              },
              onClick: function() {
                var seedMsg = 'Tell me about ' + item.title + (item.instrument_id ? ' under the ' + item.instrument_id : '');
                if (window.__klSendMessage) window.__klSendMessage(seedMsg);
              },
              title: 'Ask Eileen about this provision',
            },
              React.createElement('div', { style: { color: '#E2E8F0', fontSize: '12px', fontWeight: 500 } }, item.title),
              React.createElement('div', { style: { display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap', alignItems: 'center' } },
                React.createElement('span', { style: { color: '#475569', fontSize: '10px', fontFamily: "'DM Mono', monospace" } },
                  (item.section_num ? 's.' + item.section_num : '')
                ),
                item.is_era_2025 && React.createElement('span', {
                  style: { color: '#F59E0B', fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(245,158,11,0.1)' },
                }, 'ERA 2025'),
                React.createElement('span', { style: { color: item.in_force ? '#10B981' : '#94A3B8', fontSize: '10px' } },
                  item.in_force ? 'In force' : 'Not yet'
                )
              )
            );
          })
        )
      );
    });
  }

  // Sprint F §3.7: Existing Sprint E cases rendering wrapped in a helper.
  function renderCasesTab() {
    if (filtered.length === 0) {
      return React.createElement('div', { style: { color: '#64748B', fontSize: '12px', padding: '8px 4px' } }, 'No results.');
    }
    return filtered.slice(0, 50).map(function(item) {
      var caseKey = 'case-' + item.case_id;
      var isOpen = !!expanded[caseKey];
      return React.createElement('div', {
        key: item.case_id,
        style: {
          marginBottom: '6px', borderRadius: '6px', overflow: 'hidden',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
        },
      },
        React.createElement('div', {
          onClick: function() { toggleInstrument(caseKey); },
          style: {
            padding: '8px 10px', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          },
        },
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('div', { style: { color: '#E2E8F0', fontSize: '12px', fontWeight: 500 } }, item.name),
            React.createElement('div', { style: { color: '#64748B', fontSize: '10px', marginTop: '2px', fontFamily: "'DM Mono', monospace" } },
              [item.citation, item.court, item.year].filter(Boolean).join(' \u00B7 ')
            )
          ),
          React.createElement('span', {
            style: { fontSize: '9px', color: '#64748B', flexShrink: 0, marginTop: '4px', transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' },
            'aria-hidden': 'true',
          }, '\u25BC')
        ),
        isOpen && React.createElement('div', {
          style: { padding: '0 10px 10px', borderTop: '1px solid rgba(255,255,255,0.04)' },
        },
          item.principle && React.createElement('div', {
            style: { fontSize: '12px', color: '#CBD5E1', lineHeight: 1.5, marginTop: '8px', marginBottom: '10px' },
          }, item.principle),
          React.createElement('button', {
            type: 'button',
            onClick: function() {
              if (window.__klSendMessage) window.__klSendMessage('Tell me about the case ' + item.name + (item.citation ? ' (' + item.citation + ')' : '') + ' and what it means for employers');
            },
            style: {
              padding: '6px 12px', borderRadius: '6px',
              background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
              color: '#0EA5E9', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            },
          }, '\u2192 Discuss with Eileen')
        )
      );
    });
  }

  // Sprint G §2.2–§2.4: The Bookshelf — 72-instrument browse tree grouped
  // by derived category (legislation, acas, hse, ico, ehrc, etc.) with
  // book-cover cards carrying category-coloured spine accents, warm
  // subtitles, provision/case counts, and in-force badges.
  function renderLibraryTab() {
    if (activeInstrument) {
      return renderInstrumentDetail();
    }

    // Warm category labels cover every `cat` value the manifest may emit.
    var CATEGORY_LABELS = {
      legislation: 'UK Employment Legislation',
      acas: 'ACAS Codes of Practice & Guidance',
      hse: 'Health & Safety Executive Guidance',
      ico: 'ICO Data Protection Guidance',
      ehrc: 'Equality & Human Rights Commission',
      horizon: 'Forward Intelligence & Horizon',
      training: 'Training Resources',
      caselaw: 'Case Law Intelligence',
      guidance: 'Regulatory Guidance',
      'employment-relations': 'Employment Relations',
      'cross-cutting': 'Cross-Cutting Provisions',
    };
    var CATEGORY_ORDER = ['legislation', 'acas', 'hse', 'ehrc', 'ico', 'guidance', 'employment-relations', 'cross-cutting', 'horizon', 'training', 'caselaw'];

    // Spine accent colours — one per bookshelf.
    var CATEGORY_COLOURS = {
      legislation: '#0EA5E9',
      acas: '#10B981',
      hse: '#F59E0B',
      ico: '#8B5CF6',
      ehrc: '#EC4899',
      horizon: '#F97316',
      training: '#06B6D4',
      caselaw: '#6366F1',
      guidance: '#14B8A6',
      'employment-relations': '#10B981',
      'cross-cutting': '#64748B',
    };

    var grouped = {};
    filteredInstruments.forEach(function(inst) {
      var cat = inst.cat || 'legislation';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(inst);
    });
    // Preserve CATEGORY_ORDER first, then any unknown cat values at the
    // end so new categories surface without code changes.
    var filteredCats = CATEGORY_ORDER.filter(function(c) { return grouped[c] && grouped[c].length > 0; });
    Object.keys(grouped).forEach(function(c) {
      if (filteredCats.indexOf(c) === -1) filteredCats.push(c);
    });

    if (instruments.length === 0) {
      return React.createElement('div', { style: { color: '#64748B', fontSize: '13px', padding: '12px', textAlign: 'center' } },
        'Loading instrument library\u2026'
      );
    }
    if (filteredCats.length === 0) {
      return React.createElement('div', { style: { color: '#64748B', fontSize: '12px', padding: '8px 4px' } }, 'No instruments match your search.');
    }

    return React.createElement('div', null,
      filteredCats.map(function(cat) {
        var items = grouped[cat];
        var label = CATEGORY_LABELS[cat] || cat;
        var catColor = CATEGORY_COLOURS[cat] || '#0EA5E9';
        var isCatOpen = expanded[cat] !== false; // default open

        return React.createElement('div', { key: cat, style: { marginBottom: '12px' } },
          React.createElement('button', {
            type: 'button',
            onClick: function() { toggleInstrument(cat); },
            style: {
              width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px',
              background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)',
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              color: catColor, fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
            },
          },
            React.createElement('span', null, label),
            React.createElement('span', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
              React.createElement('span', { style: { fontSize: '10px', color: '#64748B', fontFamily: "'DM Mono', monospace" } }, items.length + ' instruments'),
              React.createElement('span', { style: { fontSize: '9px', color: '#64748B', transition: 'transform 0.15s', transform: isCatOpen ? 'rotate(180deg)' : 'rotate(0)' } }, '\u25BC')
            )
          ),
          isCatOpen && React.createElement('div', { style: { paddingLeft: '4px', marginTop: '6px' } },
            items.map(function(inst) {
              var accentColor = CATEGORY_COLOURS[inst.cat] || '#0EA5E9';
              return React.createElement('div', {
                key: inst.id,
                onClick: function() { loadInstrumentDetail(inst); },
                style: {
                  padding: '0',
                  marginBottom: '6px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                },
                onMouseEnter: function(e) { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)'; },
                onMouseLeave: function(e) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; },
              },
                // Book spine accent
                React.createElement('div', {
                  style: {
                    width: '4px',
                    background: accentColor,
                    flexShrink: 0,
                  },
                }),
                // Book cover content
                React.createElement('div', {
                  style: {
                    flex: 1,
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                  },
                },
                  React.createElement('div', { style: { color: '#E2E8F0', fontSize: '12px', fontWeight: 500, marginBottom: '4px', lineHeight: 1.3 } },
                    inst.title
                  ),
                  inst.warmSubtitle && React.createElement('div', {
                    style: { color: '#94A3B8', fontSize: '11px', lineHeight: 1.4, marginBottom: '6px' },
                  }, inst.warmSubtitle.length > 100 ? inst.warmSubtitle.slice(0, 100) + '\u2026' : inst.warmSubtitle),
                  React.createElement('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } },
                    inst.sectionCount > 0 && React.createElement('span', {
                      style: { fontSize: '10px', color: accentColor, fontFamily: "'DM Mono', monospace" },
                    }, inst.sectionCount + ' provisions'),
                    inst.caseCount > 0 && React.createElement('span', {
                      style: { fontSize: '10px', color: '#64748B', fontFamily: "'DM Mono', monospace" },
                    }, inst.caseCount + ' cases'),
                    inst.isInForce != null && React.createElement('span', {
                      style: {
                        fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
                        background: inst.isInForce ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: inst.isInForce ? '#10B981' : '#F59E0B',
                      },
                    }, inst.isInForce ? 'In force' : 'Pending')
                  )
                )
              );
            })
          )
        );
      })
    );
  }

  function renderInstrumentDetail() {
    return React.createElement('div', null,
      React.createElement('button', {
        type: 'button',
        onClick: function() { setActiveInstrument(null); setInstrumentDetail(null); },
        style: {
          background: 'none', border: 'none', color: '#0EA5E9', fontSize: '12px',
          cursor: 'pointer', padding: '0 0 10px', fontFamily: "'DM Sans', sans-serif",
          textAlign: 'left',
        },
      }, '\u2190 Back to Library'),

      detailLoading
        ? React.createElement('div', { style: { color: '#94A3B8', fontSize: '13px', padding: '20px 0', textAlign: 'center' } }, 'Loading instrument detail\u2026')
        : instrumentDetail
          ? renderInstrumentContent(instrumentDetail)
          : renderInstrumentSummary(activeInstrument)
    );
  }

  // Sprint G: Fallback shown when the content JSON file fails to load.
  // Reads from the manifest fields (title, type, jurisdiction,
  // warmSubtitle, sourceUrl) rather than the old registry fields.
  function renderInstrumentSummary(inst) {
    return React.createElement('div', null,
      React.createElement('div', { style: { fontSize: '16px', fontWeight: 600, color: '#E2E8F0', marginBottom: '8px' } }, inst.title),
      React.createElement('div', { style: { fontSize: '12px', color: '#64748B', marginBottom: '4px', fontFamily: "'DM Mono', monospace" } },
        (inst.type || '') + (inst.jurisdiction ? ' \u00B7 ' + inst.jurisdiction : '')
      ),
      inst.chapters && React.createElement('div', { style: { fontSize: '12px', color: '#94A3B8', marginBottom: '12px', lineHeight: 1.5 } }, inst.chapters),
      inst.warmSubtitle && React.createElement('div', {
        style: {
          fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '12px',
          padding: '12px', background: 'rgba(14,165,233,0.04)', borderRadius: '8px',
          borderLeft: '2px solid rgba(14,165,233,0.2)',
        },
      }, inst.warmSubtitle),
      inst.sourceUrl && React.createElement('a', {
        href: inst.sourceUrl, target: '_blank', rel: 'noopener noreferrer',
        style: {
          display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '12px',
          fontSize: '11px', color: '#0EA5E9', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif",
        },
      }, '\u2197 View on legislation.gov.uk'),
      !inst.warmSubtitle && React.createElement('div', { style: { fontSize: '12px', color: '#475569', fontStyle: 'italic', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' } },
        'Deep content for this instrument is being enriched. Ask Eileen for current intelligence.'
      ),
      React.createElement('button', {
        type: 'button',
        onClick: function() { if (window.__klSendMessage) window.__klSendMessage('Tell me about the ' + inst.title + ' and what it means for employers'); },
        style: {
          marginTop: '12px', padding: '8px 14px', borderRadius: '6px',
          background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
          color: '#0EA5E9', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        },
      }, '\u2192 Ask Eileen about this instrument')
    );
  }

  // Deep view rendered from the loaded JSON content file. Handles both
  // schemas in use: {parts:[{sections:[...]}]} (69 files) and
  // {provisions:[...]} (3 files — era1996, horizon-tracker,
  // redundancy-intelligence).
  function renderInstrumentContent(detail) {
    var displayTitle = detail.title || detail.shortTitle || (activeInstrument && activeInstrument.title) || 'Instrument';
    var displayType = detail.type || (activeInstrument && activeInstrument.type) || '';
    var displayJurisdiction = detail.jurisdiction || (activeInstrument && activeInstrument.jurisdiction) || '';
    var description = detail.desc || detail.description || detail.summary || detail.overview || (activeInstrument && activeInstrument.warmSubtitle) || '';
    var inForce = detail.isInForce != null
      ? detail.isInForce
      : (activeInstrument && activeInstrument.isInForce);

    // Normalise provisions across both schemas.
    // Sprint H §6.2: Pass ACAS / guidance part labels through
    // humanisePartTitle so grouping headers read humanistically.
    var instCat = (activeInstrument && activeInstrument.cat) || detail.cat || '';
    var provisions = [];
    if (Array.isArray(detail.provisions)) {
      provisions = detail.provisions;
    } else if (Array.isArray(detail.parts)) {
      detail.parts.forEach(function(part) {
        var rawPartLabel = part.title || part.num || part.name || '';
        var partLabel = humanisePartTitle(rawPartLabel, instCat);
        (part.sections || []).forEach(function(sec) {
          provisions.push({
            title: sec.title || sec.name || '',
            section: sec.num || sec.sectionNum || sec.section || '',
            text: sec.text || sec.currentText || sec.content || '',
            summary: sec.summary || sec.keyPrinciple || '',
            sourceUrl: sec.sourceUrl || null,
            partLabel: partLabel,
            leadingCases: sec.leadingCases || [],
          });
        });
      });
    }

    // Aggregate leading cases from all sections, plus any top-level list.
    var cases = [];
    if (Array.isArray(detail.leadingCases)) cases = cases.concat(detail.leadingCases);
    if (Array.isArray(detail.cases)) cases = cases.concat(detail.cases);
    provisions.forEach(function(p) {
      if (Array.isArray(p.leadingCases)) cases = cases.concat(p.leadingCases);
    });

    // Source link — prefer explicit detail.sourceUrl, then the manifest
    // sourceUrl, then a first-provision sourceUrl.
    var sourceUrl = detail.sourceUrl
      || (activeInstrument && activeInstrument.sourceUrl)
      || (provisions[0] && provisions[0].sourceUrl)
      || null;

    return React.createElement('div', null,
      // Title block
      React.createElement('div', { style: { marginBottom: '16px' } },
        React.createElement('div', { style: { fontSize: '16px', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' } }, displayTitle),
        React.createElement('div', { style: { fontSize: '11px', color: '#64748B', fontFamily: "'DM Mono', monospace", marginBottom: '4px' } },
          [displayType, displayJurisdiction, detail.currentAsOf && ('Verified ' + detail.currentAsOf)].filter(Boolean).join(' \u00B7 ')
        ),
        detail.chapters && React.createElement('div', { style: { fontSize: '11px', color: '#94A3B8', marginBottom: '8px' } }, detail.chapters),
        React.createElement('span', {
          style: {
            fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'inline-block',
            background: inForce ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            color: inForce ? '#10B981' : '#F59E0B',
          },
        }, inForce ? 'In force' : 'Not yet commenced')
      ),

      description && React.createElement('div', {
        style: {
          fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '16px',
          padding: '12px', background: 'rgba(14,165,233,0.04)', borderRadius: '8px',
          borderLeft: '2px solid rgba(14,165,233,0.2)',
        },
      }, typeof description === 'string' ? description : JSON.stringify(description)),

      sourceUrl && React.createElement('a', {
        href: sourceUrl, target: '_blank', rel: 'noopener noreferrer',
        style: {
          display: 'inline-block', marginBottom: '16px',
          fontSize: '11px', color: '#0EA5E9', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif",
        },
      }, '\u2197 View original source'),

      React.createElement('button', {
        type: 'button',
        onClick: function() { if (window.__klSendMessage) window.__klSendMessage('Give me a comprehensive briefing on the ' + displayTitle + ' including key obligations, recent changes, and practical implications for employers'); },
        style: {
          display: 'block', marginBottom: '16px', padding: '8px 14px', borderRadius: '6px',
          background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
          color: '#0EA5E9', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        },
      }, '\u2192 Get a full briefing from Eileen'),

      // Provisions list (Level 2 + Level 3 on expand)
      provisions.length > 0 && React.createElement('div', { style: { marginTop: '8px' } },
        React.createElement('div', {
          style: { fontSize: '12px', fontWeight: 600, color: '#0EA5E9', marginBottom: '8px', fontFamily: "'DM Sans', sans-serif" },
        }, 'Provisions (' + provisions.length + ')'),
        provisions.slice(0, 40).map(function(prov, idx) {
          var provKey = 'prov-' + idx;
          var isProvOpen = !!expanded[provKey];
          // Sprint G §2.5: surface the human-readable summary as the
          // primary display; keep the official statutory title as a
          // subtle italic subtitle when it differs.
          var provTitle = prov.summary || prov.title || prov.name || ('Section ' + (prov.section || prov.sectionNum || prov.num || idx + 1));
          if (provTitle.length > 140) provTitle = provTitle.slice(0, 140) + '\u2026';
          var provOfficialTitle = (prov.summary && prov.title && prov.title !== prov.summary) ? prov.title : null;
          var provText = prov.text || '';
          var provSection = prov.section || '';

          return React.createElement('div', {
            key: provKey,
            style: { marginBottom: '3px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' },
          },
            React.createElement('div', {
              onClick: function() { toggleInstrument(provKey); },
              style: {
                padding: '6px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
              },
            },
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('span', { style: { color: '#E2E8F0', fontSize: '11px' } }, provTitle),
                provSection && React.createElement('span', { style: { color: '#475569', fontSize: '10px', marginLeft: '6px', fontFamily: "'DM Mono', monospace" } },
                  (String(provSection).indexOf('s.') === 0 ? '' : 's.') + provSection
                ),
                provOfficialTitle && React.createElement('div', {
                  style: { color: '#475569', fontSize: '10px', fontStyle: 'italic', marginTop: '1px' },
                }, provOfficialTitle)
              ),
              React.createElement('span', { style: { fontSize: '8px', color: '#475569', transition: 'transform 0.15s', transform: isProvOpen ? 'rotate(180deg)' : 'rotate(0)' } }, '\u25BC')
            ),
            isProvOpen && React.createElement('div', { style: { padding: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' } },
              prov.summary && React.createElement('div', { style: { fontSize: '11px', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '6px' } },
                prov.summary.length > 400 ? prov.summary.slice(0, 400) + '\u2026' : prov.summary
              ),
              provText && React.createElement('div', { style: { fontSize: '11px', color: '#94A3B8', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto', fontFamily: "'DM Mono', monospace" } },
                provText.length > 500 ? provText.slice(0, 500) + '\u2026' : provText
              ),
              prov.sourceUrl && React.createElement('a', {
                href: prov.sourceUrl,
                target: '_blank',
                rel: 'noopener noreferrer',
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '10px', color: '#0EA5E9', textDecoration: 'none',
                  marginTop: '6px', marginBottom: '4px',
                },
              }, '\u2197 View on legislation.gov.uk'),
              React.createElement('button', {
                type: 'button',
                onClick: function() { if (window.__klSendMessage) window.__klSendMessage('Explain ' + provTitle + ' of the ' + displayTitle + ' and its practical implications'); },
                style: {
                  display: 'block', marginTop: '6px', padding: '4px 10px', borderRadius: '4px',
                  background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)',
                  color: '#0EA5E9', fontSize: '10px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                },
              }, '\u2192 Ask Eileen')
            )
          );
        })
      ),

      cases.length > 0 && React.createElement('div', { style: { marginTop: '16px' } },
        React.createElement('div', {
          style: { fontSize: '12px', fontWeight: 600, color: '#0EA5E9', marginBottom: '8px', fontFamily: "'DM Sans', sans-serif" },
        }, 'Leading Cases (' + cases.length + ')'),
        cases.slice(0, 20).map(function(c, idx) {
          var caseText = c.principle || c.heldText || c.held || c.significance || '';
          return React.createElement('div', {
            key: 'lc-' + idx,
            style: { padding: '8px', marginBottom: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' },
          },
            React.createElement('div', { style: { color: '#E2E8F0', fontSize: '12px', fontWeight: 500 } }, c.name || c.title || 'Unnamed case'),
            (c.citation || c.court || c.year) && React.createElement('div', { style: { color: '#64748B', fontSize: '10px', marginTop: '2px', fontFamily: "'DM Mono', monospace" } },
              [c.citation, c.court, c.year].filter(Boolean).join(' \u00B7 ')
            ),
            caseText && React.createElement('div', { style: { color: '#94A3B8', fontSize: '11px', marginTop: '4px', lineHeight: 1.4 } },
              caseText.length > 200 ? caseText.slice(0, 200) + '\u2026' : caseText
            ),
            (c.url || c.bailiiUrl) && React.createElement('a', {
              href: c.url || c.bailiiUrl, target: '_blank', rel: 'noopener noreferrer',
              style: { fontSize: '10px', color: '#0EA5E9', textDecoration: 'none', marginTop: '4px', display: 'inline-block' },
            }, '\u2197 BAILII')
          );
        })
      )
    );
  }

  // Sprint F §3.1: three-tab layout — Library is the default
  var tabs = [
    { id: 'library', label: 'Library' },
    { id: 'provisions', label: 'Provisions' },
    { id: 'cases', label: 'Cases' },
  ];

  return React.createElement('div', null,
    React.createElement('div', { style: { display: 'flex', gap: '8px', marginBottom: '10px' } },
      tabs.map(function(t) {
        return React.createElement('button', {
          key: t.id,
          type: 'button',
          onClick: function() { setTab(t.id); setSearch(''); setExpanded({}); },
          style: {
            flex: 1, padding: '6px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
            border: tab === t.id ? '1px solid #0EA5E9' : '1px solid rgba(255,255,255,0.1)',
            background: tab === t.id ? 'rgba(14,165,233,0.1)' : 'transparent',
            color: tab === t.id ? '#0EA5E9' : '#94A3B8', fontWeight: tab === t.id ? 600 : 400,
          },
        }, t.label);
      })
    ),
    React.createElement('input', {
      type: 'text',
      placeholder: 'Search ' + tab + '\u2026',
      value: search,
      onChange: function(e) { setSearch(e.target.value); },
      style: {
        width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
        color: '#E2E8F0', marginBottom: '10px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
      },
    }),
    loading
      ? React.createElement('div', { style: { color: '#94A3B8', fontSize: '13px', padding: '12px' } }, 'Loading\u2026')
      : tab === 'library'
        ? renderLibraryTab()
        : tab === 'provisions'
          ? renderProvisionsTab()
          : renderCasesTab()
  );
}

// ─── PlaceholderPanel ───

const PLACEHOLDER_DESCRIPTIONS = {
  documents: 'Create structured documents with watermarks, disclaimers, and export controls.',
  eileen:    'Context-aware Eileen chat with Vault and Calendar integration.',
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
  vault: 'Document Vault', notes: 'Saved Items', documents: 'Documents',
  calendar: 'Calendar', eileen: 'Eileen',
  research: 'Research', planner: 'Contract Planner',
};

const PANEL_COMPONENTS = {
  vault: VaultPanel,
  notes: NotesPanel,
  calendar: CalendarPanel,
  research: ResearchPanel,
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

// ─── HorizonAlert (KLUX-001 Art. 12 §12.1) ───
// Shows the next imminent legislative event in the welcome state.
// Single REST fetch from regulatory_requirements, forward items only.

function HorizonAlert() {
  const [event, setEvent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const resp = await fetch(
          SUPABASE_URL + '/rest/v1/regulatory_requirements' +
            '?is_forward_requirement=eq.true' +
            '&effective_from=gte.' + today +
            '&select=requirement_name,statutory_basis,effective_from' +
            '&order=effective_from.asc' +
            '&limit=1',
          {
            headers: {
              'Authorization': 'Bearer ' + (window.__klToken || ''),
              'apikey': SUPABASE_ANON_KEY,
            },
          }
        );
        const data = await resp.json();
        if (cancelled) return;
        if (Array.isArray(data) && data[0]) {
          setEvent(data[0]);
        }
      } catch (e) {
        console.warn('HorizonAlert fetch failed (non-blocking):', e);
      }
    }
    if (window.__klToken) load();
    return () => { cancelled = true; };
  }, []);

  if (!event) return null;

  const effectiveDate = new Date(event.effective_from);
  const now = new Date();
  const diffDays = Math.max(0, Math.ceil((effectiveDate - now) / (1000 * 60 * 60 * 24)));
  const dateLabel = effectiveDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const urgencyColor = diffDays <= 30 ? '#F59E0B' : diffDays <= 90 ? '#0EA5E9' : '#64748B';

  return (
    <div
      className="kl-horizon-alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 14px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '16px',
        marginTop: '8px',
        maxWidth: '640px',
        width: '100%',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: urgencyColor,
          flexShrink: 0,
        }}
      ></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: '#E2E8F0', fontSize: '12px', fontWeight: 500 }}>
          {event.requirement_name}
        </span>
        {event.statutory_basis && (
          <span style={{ color: '#64748B', fontSize: '11px', marginLeft: '6px' }}>
            {event.statutory_basis}
          </span>
        )}
      </div>
      <div
        style={{
          color: urgencyColor,
          fontSize: '11px',
          fontWeight: 500,
          fontFamily: "'DM Mono', monospace",
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : diffDays + ' days'} — {dateLabel}
      </div>
    </div>
  );
}

// ─── BookShelf (Sprint H §3, KLUX-001 Art. 14–15, KLIA-001 §11) ───
// Renders instruments as law book covers on shelves in the welcome state.
// Fetches content-index.json manifest. Up to 15 featured books across the
// top categories, with category-coloured leather gradients and gold titles.

function BookShelf({ onOpenBook }) {
  var _books = useState([]);
  var books = _books[0];
  var setBooks = _books[1];

  useEffect(function() {
    var cancelled = false;
    fetch('/knowledge-library/content/content-index.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!cancelled && Array.isArray(data)) {
          var byCat = {};
          data.forEach(function(inst) {
            if (!byCat[inst.cat]) byCat[inst.cat] = [];
            byCat[inst.cat].push(inst);
          });
          var featured = [];
          var catOrder = ['legislation', 'acas', 'hse', 'ehrc', 'ico'];
          catOrder.forEach(function(cat) {
            if (byCat[cat]) {
              featured = featured.concat(byCat[cat].slice(0, 3));
            }
          });
          setBooks(featured.slice(0, 15));
        }
      })
      .catch(function(e) { console.warn('BookShelf fetch failed:', e); });
    return function() { cancelled = true; };
  }, []);

  if (books.length === 0) return null;

  var BOOK_COLOURS = {
    legislation: { bg: 'linear-gradient(160deg, #1a2332 0%, #0f1923 50%, #1a2332 100%)', text: '#D4A017', spine: '#D4A017' },
    acas: { bg: 'linear-gradient(160deg, #0f2318 0%, #0a1a12 50%, #0f2318 100%)', text: '#10B981', spine: '#10B981' },
    hse: { bg: 'linear-gradient(160deg, #231a0f 0%, #1a1208 50%, #231a0f 100%)', text: '#F59E0B', spine: '#F59E0B' },
    ehrc: { bg: 'linear-gradient(160deg, #1f0f23 0%, #170a1a 50%, #1f0f23 100%)', text: '#EC4899', spine: '#EC4899' },
    ico: { bg: 'linear-gradient(160deg, #0f1523 0%, #0a0f1a 50%, #0f1523 100%)', text: '#8B5CF6', spine: '#8B5CF6' },
  };

  return React.createElement('div', {
    className: 'kl-bookshelf',
    style: { width: '100%', maxWidth: '820px', marginTop: '32px' },
  },
    React.createElement('div', {
      style: {
        fontSize: '10px', fontWeight: 500, color: '#475569', textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: '12px', fontFamily: "'DM Mono', monospace",
        textAlign: 'center',
      },
    }, 'The Employment Law Library'),

    React.createElement('div', {
      className: 'kl-shelf',
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        justifyContent: 'center',
        padding: '16px 12px 20px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(139,92,246,0.02) 100%)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.04)',
        position: 'relative',
      },
    },
      books.map(function(book) {
        var colours = BOOK_COLOURS[book.cat] || BOOK_COLOURS.legislation;
        var shortTitle = book.short || book.title;
        if (shortTitle.length > 35) shortTitle = shortTitle.slice(0, 32) + '\u2026';

        return React.createElement('div', {
          key: book.id,
          onClick: function() { onOpenBook(book); },
          className: 'kl-book',
          style: {
            width: '100px',
            height: '130px',
            borderRadius: '2px 4px 4px 2px',
            background: colours.bg,
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '10px 8px 8px',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '2px 2px 8px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.05)',
            borderLeft: '4px solid ' + colours.spine,
          },
          title: book.title,
          onMouseEnter: function(e) {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
            e.currentTarget.style.boxShadow = '2px 6px 16px rgba(0,0,0,0.5), inset -1px 0 0 rgba(255,255,255,0.08)';
          },
          onMouseLeave: function(e) {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '2px 2px 8px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.05)';
          },
        },
          React.createElement('div', {
            style: {
              width: '60%', height: '1px', background: colours.text, opacity: 0.3,
              marginBottom: '6px',
            },
          }),
          React.createElement('div', {
            style: {
              color: colours.text,
              fontSize: '10px',
              fontWeight: 600,
              lineHeight: 1.25,
              fontFamily: "'DM Sans', sans-serif",
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            },
          }, shortTitle),
          React.createElement('div', {
            style: {
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            },
          },
            React.createElement('span', {
              style: {
                fontSize: '7px', color: colours.text, opacity: 0.5,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: "'DM Mono', monospace",
              },
            }, book.cat === 'legislation' ? 'Act' : book.cat === 'acas' ? 'ACAS' : book.cat === 'hse' ? 'HSE' : book.cat === 'ico' ? 'ICO' : book.cat === 'ehrc' ? 'EHRC' : ''),
            React.createElement('div', {
              style: {
                width: '3px', height: '80%', position: 'absolute', right: 0, top: '10%',
                background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)',
              },
            })
          )
        );
      }),

      React.createElement('div', {
        style: {
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px',
          background: 'linear-gradient(90deg, rgba(139,92,246,0.1), rgba(14,165,233,0.1), rgba(139,92,246,0.1))',
          borderRadius: '0 0 8px 8px',
        },
      })
    ),

    React.createElement('div', { style: { textAlign: 'center', marginTop: '12px' } },
      React.createElement('button', {
        type: 'button',
        onClick: function() { if (typeof window.__klOpenPanel === 'function') window.__klOpenPanel('research'); },
        style: {
          background: 'transparent', border: 'none', color: '#0EA5E9',
          fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          padding: '4px 8px',
        },
      }, 'Browse all 72 instruments \u2192')
    )
  );
}

// ─── UpsellCard (KL upsell ladder, AMD-043) ───
// Fixed-position overlay shown when per-session users approach expiry.
// NOT registered in PANEL_COMPONENTS — renders directly in the App body.
// Dismissible once per trigger (App-level state); does not reappear after dismissal.

const UPSELL_CONFIG = {
  kl_quick_session: {
    threshold: 20,
    title: 'Need more time?',
    message: 'Your Quick Session ends in less than 20 minutes. Upgrade to a Day Pass for 24 hours of full access \u2014 including 2 compliance checks.',
    cta: 'Upgrade to Day Pass \u2014 \u00a349',
    href: '/kl-access/?product=kl_day_pass',
  },
  kl_day_pass: {
    threshold: 60,
    title: 'Extend your research',
    message: 'Your Day Pass expires in under an hour. A Research Week gives you 7 full days and 3 compliance checks included.',
    cta: 'Upgrade to Research Week \u2014 \u00a399',
    href: '/kl-access/?product=kl_research_week',
  },
  kl_research_week: {
    threshold: 1440,
    title: 'Ready for continuous monitoring?',
    message: 'Your Research Week ends tomorrow. Operational subscribers get 5 monitored contracts with auto-rescan, alerts, and ongoing Eileen access.',
    cta: 'Explore Operational \u2014 \u00a3199/mo',
    href: '/account/',
  },
};

function UpsellCard({ productType, minutesRemaining, onDismiss }) {
  const c = UPSELL_CONFIG[productType];
  if (!c) return null;
  if (minutesRemaining == null || minutesRemaining <= 0 || minutesRemaining > c.threshold) return null;

  return (
    <div
      role="complementary"
      aria-label="Session upgrade prompt"
      style={{
        position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
        maxWidth: '440px', width: '90%', padding: '16px 20px', borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(14,165,233,0.04) 100%)',
        border: '1px solid rgba(14,165,233,0.25)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#0EA5E9', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
            {c.title}
          </div>
          <div style={{ color: '#CBD5E1', fontSize: '13px', lineHeight: 1.5 }}>
            {c.message}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss upgrade prompt"
          style={{
            background: 'none', border: 'none', color: '#64748B',
            fontSize: '18px', cursor: 'pointer', padding: '0 0 0 12px', lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ marginTop: '12px' }}>
        <a
          href={c.href}
          style={{
            display: 'inline-block', padding: '8px 16px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 600,
            background: '#0EA5E9', color: '#FFFFFF',
            textDecoration: 'none', cursor: 'pointer',
          }}
        >
          {c.cta}
        </a>
      </div>
    </div>
  );
}

// ─── App ───

function App() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(() => 'eileen-' + Date.now() + '-' + Math.random().toString(36).substr(2, 7));
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' ? true : window.innerWidth > 768);
  const [activePanel, setActivePanel] = useState(null);
  const [accessType, setAccessType] = useState(window.__klAccessType || null);
  const [tier, setTier] = useState(window.__klTier || window.__klProductType || null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(window.__klSessionExpiry || null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState(null);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [floatingNexusOpen, setFloatingNexusOpen] = useState(false);
  const [userType, setUserType] = useState(function() {
    try { return localStorage.getItem('ailane_kl_user_type') || null; } catch(e) { return null; }
  });
  const [showQualifier, setShowQualifier] = useState(false);
  const [qualifierShownThisSession, setQualifierShownThisSession] = useState(false);
  const [hasUploadedThisSession, setHasUploadedThisSession] = useState(false);

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
      setSessionExpiresAt(window.__klSessionExpiry || null);
      loadSessionHistory();
    }
    window.addEventListener('ailane-kl-ready', onReady);
    if (window.__klAccessType) {
      loadSessionHistory();
    }
    return () => window.removeEventListener('ailane-kl-ready', onReady);
  }, [loadSessionHistory]);

  // Auto-close sidebar when resizing down to mobile; restore on resize up.
  useEffect(() => {
    function onResize() {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  // Upsell ladder: minute-precision countdown used by UpsellCard only.
  // Runs in parallel with SessionCountdown (which is second-precision for display).
  // Reads sessionExpiresAt state so it picks up the ailane-kl-ready event.
  useEffect(() => {
    if (!sessionExpiresAt) {
      setMinutesRemaining(null);
      return undefined;
    }
    const expiresAt = new Date(sessionExpiresAt).getTime();
    if (isNaN(expiresAt)) return undefined;

    function update() {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 60000));
      setMinutesRemaining(diff);
    }
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt]);

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
          message: (userType ? '[Context: user is ' + (userType === 'employer' ? 'an employer/HR professional' : 'a worker') + '] ' : '') + clean,
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

        // EQIS: Show qualifying question after first Eileen response
        // if user type not stored and not already shown this session
        if (!userType && !qualifierShownThisSession) {
          setShowQualifier(true);
          setQualifierShownThisSession(true);
        }

        // AMD-043: Proactive contract routing
        if (hasContractIntent(clean) && !hasUploadedThisSession) {
          setTimeout(function() {
            setMessages(function(prev) {
              return prev.concat([{
                role: 'assistant',
                content: 'I can run your contract through our compliance engine for a detailed analysis against current UK employment law.\n\nUpload your contract using the **Upload contract** button below (PDF, DOCX, or TXT — up to 10MB). I will extract the text, route it through the engine, and present findings with a compliance score, clause-by-clause assessment, and forward legislative exposure analysis.',
                isLocal: true,
                isContractPrompt: true,
              }]);
            });
          }, 800);
        }
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

  // Expose sendMessage for Research Panel provision click → seed Eileen
  window.__klSendMessage = sendMessage;
  // Sprint G §2.8: Expose the panel opener so the welcome-state
  // "Browse the Library" button can open the Research Panel.
  window.__klOpenPanel = function(panelId) {
    setActivePanel(panelId);
  };
  // Sprint H §5.1: Expose handleFileSelect so the VaultPanel upload button
  // can invoke the App-level upload flow without prop drilling.
  window.__klHandleFileSelect = handleFileSelect;

  function handleUserTypeSelect(type) {
    setUserType(type);
    setShowQualifier(false);
    try { localStorage.setItem('ailane_kl_user_type', type); } catch(e) { /* silent */ }
  }

  // ─── File upload flow (KL File Upload Widget, Stage A) ───

  function addMessage(msg) {
    setMessages((prev) => [...prev, msg]);
  }

  function updateFileMessage(msgId, updates) {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? Object.assign({}, m, updates) : m)));
  }

  async function uploadFile(file, msgId) {
    // Step 4.3 — Upload to Supabase Storage
    const storagePath = window.__klUserId + '/' + Date.now() + '-' + file.name;
    let uploadOk = false;
    try {
      const uploadResp = await fetch(
        SUPABASE_URL + '/storage/v1/object/kl-document-vault/' + encodeURIComponent(storagePath),
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + window.__klToken,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': file.type || 'application/octet-stream',
            'x-upsert': 'true',
          },
          body: file,
        }
      );
      uploadOk = uploadResp.ok;
    } catch (err) {
      console.error('Storage upload failed:', err);
    }
    if (!uploadOk) {
      updateFileMessage(msgId, { status: 'error' });
      addMessage({
        role: 'assistant',
        content: 'Upload failed. Please try again.',
        isLocal: true,
      });
      return;
    }

    // Step 4.4 — Create kl_vault_documents record
    // Per §11.3: subscription users get session_only=false / expires_at=null;
    // per-session users get session_only=true / expires_at=session expiry.
    const isSubscription = (
      window.__klAccessType === 'subscription' ||
      window.__klTier === 'operational_readiness' ||
      window.__klTier === 'governance' ||
      window.__klTier === 'institutional'
    );
    const docRecord = {
      user_id: window.__klUserId,
      filename: file.name,
      storage_path: storagePath,
      file_size_bytes: file.size,
      mime_type: file.type,
      extraction_status: 'pending',
      analysis_status: 'pending',
      session_only: !isSubscription,
      expires_at: isSubscription ? null : (window.__klSessionExpiry || null),
    };

    let documentId = null;
    try {
      const insertResp = await fetch(SUPABASE_URL + '/rest/v1/kl_vault_documents', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + window.__klToken,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(docRecord),
      });
      if (insertResp.ok) {
        const insertedDocs = await insertResp.json();
        if (Array.isArray(insertedDocs) && insertedDocs[0] && insertedDocs[0].id) {
          documentId = insertedDocs[0].id;
        }
      }
    } catch (err) {
      console.error('Vault insert failed:', err);
    }
    if (!documentId) {
      updateFileMessage(msgId, { status: 'error' });
      addMessage({
        role: 'assistant',
        content: 'Upload failed. Please try again.',
        isLocal: true,
      });
      return;
    }
    updateFileMessage(msgId, { documentId: documentId, status: 'extracting' });

    // Step 4.5 — Call kl_document_extract
    let extractResult = null;
    try {
      const extractResp = await fetch(
        SUPABASE_URL + '/functions/v1/kl_document_extract',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + window.__klToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ document_id: documentId }),
        }
      );
      if (extractResp.ok) {
        extractResult = await extractResp.json();
      }
    } catch (err) {
      console.error('Document extract failed:', err);
    }
    if (!extractResult || typeof extractResult.char_count !== 'number') {
      updateFileMessage(msgId, { status: 'error' });
      addMessage({
        role: 'assistant',
        content: 'Text extraction failed. The file may be image-only or password-protected.',
        isLocal: true,
      });
      return;
    }

    // Step 4.6 — Ready + local Eileen confirmation with analysis trigger metadata
    updateFileMessage(msgId, { status: 'ready', charCount: extractResult.char_count });
    addMessage({
      id: 'ready-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      role: 'assistant',
      content:
        'I have your contract \u2014 ' +
        extractResult.char_count.toLocaleString() +
        ' characters extracted and ready for analysis.',
      isLocal: true,
      analysisReady: true,
      documentId: documentId,
      analysisTriggered: false,
    });
  }

  // ─── Compliance bridge flow (KL R1-B, AMD-043) ───
  // Calls kl-compliance-bridge (deployed v1 ACTIVE on Supabase). Eileen routes
  // to the engine and presents findings — she does not compute scores.
  // CCI v1.0 Art. I §1.5 (Separation Doctrine).
  async function handleRunAnalysis(documentId, msgId) {
    // 1. Lock the trigger button on the post-extraction message
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? Object.assign({}, m, { analysisTriggered: true }) : m))
    );

    // 2. Add Eileen loading message with a stable id so we can update/replace it
    const loadingMsgId = 'analysis-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    addMessage({
      id: loadingMsgId,
      role: 'assistant',
      content: 'Routing your contract through the compliance engine\u2026',
      isLocal: true,
      isAnalysisLoading: true,
    });

    // 3. Phased status updates during the 30-90s analysis window
    const phases = [
      { delay: 8000,  text: 'Analysing against UK employment law requirements\u2026' },
      { delay: 20000, text: 'Checking statutory provisions and forward legislative exposure\u2026' },
      { delay: 40000, text: 'Compiling findings and scoring compliance position\u2026' },
    ];
    const phaseTimers = phases.map((phase) =>
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === loadingMsgId ? Object.assign({}, m, { content: phase.text }) : m))
        );
      }, phase.delay)
    );

    try {
      const token = window.__klToken;
      if (!token) throw new Error('Not authenticated');

      // ── START the analysis (bridge v3 returns immediately) ──
      const startResponse = await fetch(
        SUPABASE_URL + '/functions/v1/kl-compliance-bridge',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({
            document_id: documentId,
            document_type: 'employment_contract',
            action: 'start',
          }),
        }
      );

      const startData = await startResponse.json();

      if (!startResponse.ok) {
        // Stop phase timers on error
        phaseTimers.forEach((t) => clearTimeout(t));

        if (startData && startData.error === 'check_limit_reached') {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === loadingMsgId) {
                return Object.assign({}, m, {
                  content:
                    startData.message ||
                    'You have used all bundled Contract Compliance Checks in this session. Additional checks are available at \u00a315 each.',
                  isAnalysisLoading: false,
                  isLocal: true,
                });
              }
              if (m.id === msgId) {
                return Object.assign({}, m, { analysisTriggered: false });
              }
              return m;
            })
          );
          return;
        }
        throw new Error((startData && (startData.error || startData.detail)) || 'Analysis failed');
      }

      var uploadId = startData.upload_id;
      if (!uploadId) throw new Error('No upload_id returned from bridge');

      // Update loading message with time expectation
      setMessages(function(prev) {
        return prev.map(function(m) {
          return m.id === loadingMsgId
            ? Object.assign({}, m, { content: 'Analysing your contract against UK employment law requirements. This typically takes 60\u201390 seconds.' })
            : m;
        });
      });

      // ── POLL for completion (every 5 seconds, max 60 attempts = 5 minutes) ──
      var maxPolls = 60;
      var pollCount = 0;
      var pollResult = null;

      while (pollCount < maxPolls) {
        await new Promise(function(resolve) { setTimeout(resolve, 5000); });
        pollCount++;

        // Update phase messages based on elapsed time
        var elapsed = pollCount * 5;
        if (elapsed === 15) {
          setMessages(function(prev) {
            return prev.map(function(m) {
              return m.id === loadingMsgId
                ? Object.assign({}, m, { content: 'Checking statutory provisions and case law references\u2026' })
                : m;
            });
          });
        } else if (elapsed === 35) {
          setMessages(function(prev) {
            return prev.map(function(m) {
              return m.id === loadingMsgId
                ? Object.assign({}, m, { content: 'Assessing forward legislative exposure under ERA 2025\u2026' })
                : m;
            });
          });
        } else if (elapsed === 60) {
          setMessages(function(prev) {
            return prev.map(function(m) {
              return m.id === loadingMsgId
                ? Object.assign({}, m, { content: 'Compiling findings and scoring compliance position\u2026' })
                : m;
            });
          });
        }

        try {
          var pollResponse = await fetch(
            SUPABASE_URL + '/functions/v1/kl-compliance-bridge',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
              },
              body: JSON.stringify({
                document_id: documentId,
                upload_id: uploadId,
                action: 'poll',
              }),
            }
          );

          var pollData = await pollResponse.json();

          if (pollData.status === 'processing') {
            continue;
          }

          // Analysis complete (or error/out_of_scope/sparse_report)
          pollResult = pollData;
          break;
        } catch (pollErr) {
          console.warn('Poll error (will retry):', pollErr);
          continue;
        }
      }

      // Stop phase timers (they may still be running from the original set)
      phaseTimers.forEach(function(t) { clearTimeout(t); });

      if (!pollResult) {
        throw new Error('Analysis is taking longer than expected. Your results will appear in the Document Vault when ready.');
      }

      // ── SUCCESS — replace loading message with results ──
      setMessages(function(prev) {
        var withoutLoading = prev.filter(function(m) { return m.id !== loadingMsgId; });
        return withoutLoading.concat([{
          id: 'result-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          role: 'assistant',
          content: '',
          isLocal: true,
          isAnalysisResult: true,
          // R1-C §3: merge upload_id so the PDF download button in
          // AnalysisResultMessage can reference it via data.upload_id.
          // Sprint F §2.2: merge document_id so the Save to Vault button
          // can PATCH the kl_vault_documents row.
          analysisData: Object.assign({}, pollResult, { upload_id: uploadId, document_id: documentId }),
        }]);
      });
    } catch (err) {
      phaseTimers.forEach((t) => clearTimeout(t));
      console.error('handleRunAnalysis error:', err);

      // Generic error — re-enable the trigger so the user can retry
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === loadingMsgId) {
            return Object.assign({}, m, {
              content:
                'I was unable to complete the analysis. ' +
                ((err && err.message) || 'Please try again.'),
              isAnalysisLoading: false,
              isLocal: true,
            });
          }
          if (m.id === msgId) {
            return Object.assign({}, m, { analysisTriggered: false });
          }
          return m;
        })
      );
    }
  }

  function handleFileSelect(e) {
    const file = e && e.target && e.target.files && e.target.files[0];
    if (!file) return;
    setHasUploadedThisSession(true);

    // Validate extension
    const parts = file.name.split('.');
    const ext = parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : '';
    if (ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
      addMessage({
        role: 'assistant',
        content:
          'I can accept PDF, DOCX, or TXT files up to 10MB. The file you selected (' +
          (ext || 'unknown type') +
          ') is not a supported format.',
        isLocal: true,
      });
      if (e.target && 'value' in e.target) e.target.value = '';
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      addMessage({
        role: 'assistant',
        content:
          'That file is too large (' +
          (file.size / (1024 * 1024)).toFixed(1) +
          'MB). The maximum is 10MB.',
        isLocal: true,
      });
      if (e.target && 'value' in e.target) e.target.value = '';
      return;
    }

    // Add upload preview to conversation
    const msgId = 'upload-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    addMessage({
      id: msgId,
      role: 'user',
      type: 'file_upload',
      filename: file.name,
      fileSize: file.size,
      status: 'uploading',
      documentId: null,
      charCount: null,
    });

    // Kick off async upload flow
    uploadFile(file, msgId);

    // Reset input so the same file can be re-selected later
    if (e.target && 'value' in e.target) e.target.value = '';
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
        sessionExpiresAt={sessionExpiresAt}
        onSessionExpired={() => setSessionExpired(true)}
      />
      <Sidebar
        open={sidebarOpen}
        sessionHistory={sessionHistory}
        activeSessionId={sessionId}
        onSelectSession={(sid) => { loadSession(sid); if (window.innerWidth <= 768) setSidebarOpen(false); }}
        onNewChat={() => { newChat(); if (window.innerWidth <= 768) setSidebarOpen(false); }}
        onCrownQuery={sendMessage}
      />
      <ConversationArea
        messages={messages}
        isLoading={isLoading}
        onSend={sendMessage}
        accessType={accessType}
        tier={tier}
        onFileSelect={handleFileSelect}
        onRunAnalysis={handleRunAnalysis}
        floatingNexusExpanded={floatingNexusOpen}
        onToggleFloatingNexus={() => setFloatingNexusOpen(!floatingNexusOpen)}
        showQualifier={showQualifier}
        onUserTypeSelect={handleUserTypeSelect}
        pulseUpload={messages.some(function(m) { return m.isContractPrompt; }) && !hasUploadedThisSession}
      />
      <PanelRail
        activePanel={activePanel}
        onSelectPanel={setActivePanel}
        accessType={accessType}
        tier={tier}
      />
      <AdvisoryBanner />
      {sidebarOpen && <MobileSidebarBackdrop onClick={() => setSidebarOpen(false)} />}
      {activePanel && (
        <PanelDrawer panelId={activePanel} onClose={() => setActivePanel(null)} />
      )}
      {!upsellDismissed && !sessionExpired && (
        <UpsellCard
          productType={window.__klProductType || tier || ''}
          minutesRemaining={minutesRemaining}
          onDismiss={() => setUpsellDismissed(true)}
        />
      )}
      {sessionExpired && <ExpiredModal />}
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
