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

  const scoreColor = score >= 65 ? '#22C55E' : score >= 30 ? '#FBBF24' : '#EF4444';

  const SEV_COLORS = {
    critical:  { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)',  text: '#EF4444', label: 'Critical' },
    major:     { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.3)', text: '#FBBF24', label: 'Major'    },
    minor:     { bg: 'rgba(234,179,8,0.06)',  border: 'rgba(234,179,8,0.2)',  text: '#EAB308', label: 'Minor'    },
    compliant: { bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.2)',  text: '#22C55E', label: 'Compliant'},
  };

  const severityOrder = { critical: 0, major: 1, minor: 2 };
  const currentNonCompliant = findings
    .filter((f) => f.severity !== 'compliant')
    .slice()
    .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  const forwardNonCompliant = forwardFindings.filter((f) => f.severity !== 'compliant');

  const summaryParts = [];
  if (summary.critical)  summaryParts.push(summary.critical  + ' critical');
  if (summary.major)     summaryParts.push(summary.major     + ' major');
  if (summary.minor)     summaryParts.push(summary.minor     + ' minor');
  if (summary.compliant) summaryParts.push(summary.compliant + ' compliant');
  const summaryLine = summaryParts.join('  \u00B7  ');

  return (
    <div style={{ maxWidth: '100%' }}>

      {/* ── Score header ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '16px', marginBottom: '12px', borderRadius: '10px',
          background: 'rgba(14,165,233,0.05)',
          border: '1px solid rgba(14,165,233,0.15)',
        }}
      >
        <div
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,22,40,0.8)',
            border: '2px solid ' + scoreColor,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 700, color: scoreColor }}>
            {Math.round(score) + '%'}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#E2E8F0', marginBottom: '4px' }}>
            Contract Compliance Check — Complete
          </div>
          {summaryLine && (
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>{summaryLine}</div>
          )}
          {status === 'sparse_report' && (
            <div style={{ fontSize: '11px', color: '#FBBF24', marginTop: '4px' }}>
              {'\u26A0\uFE0F Some requirements could not be assessed. Manual review recommended for gaps.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Current findings (non-compliant, severity-sorted) ───── */}
      {currentNonCompliant.map((finding, idx) => {
        const sev = SEV_COLORS[finding.severity] || SEV_COLORS.minor;
        const key = 'c' + idx;
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

      {/* ── Compliant count (collapsed summary line) ─────────────── */}
      {summary.compliant > 0 && (
        <div
          style={{
            padding: '8px 12px', marginBottom: '8px', borderRadius: '8px',
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.15)',
            fontSize: '12px', color: '#22C55E',
          }}
        >
          {'\u2713 ' + summary.compliant + ' requirement' +
            (summary.compliant === 1 ? '' : 's') + ' assessed as compliant'}
        </div>
      )}

      {/* ── Forward findings (Legislative Horizon) ───────────────── */}
      {forwardNonCompliant.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              fontSize: '13px', fontWeight: 600, color: '#A78BFA',
              marginBottom: '8px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {'\uD83D\uDD2E Legislative Horizon \u2014 Forward Exposure'}
          </div>
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
      <div className="kl-msg-content">
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

function MessageInput({ onSend, disabled, onFileSelect }) {
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  );
}

// ─── ConversationArea ───

function ConversationArea({ messages, isLoading, onSend, tier, onFileSelect, onRunAnalysis }) {
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
          <h1 className="kl-welcome-greeting">How can I help you today?</h1>
          <div className="kl-welcome-input">
            <MessageInput onSend={onSend} disabled={isLoading} onFileSelect={onFileSelect} />
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
        <div
          className="kl-conversation"
          style={{ position: 'relative' }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {dragOverlay}
          <div className="kl-messages" ref={scrollRef}>
            {messages.map((m, i) => <MessageBubble key={i} msg={m} onRunAnalysis={onRunAnalysis} />)}
            {isLoading && <TypingIndicator />}
          </div>
          <div className="kl-conversation-input">
            <MessageInput onSend={onSend} disabled={isLoading} onFileSelect={onFileSelect} />
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
      <div className="kl-topbar-title">AILANE Knowledge Library</div>
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
  { id: 'vault',     icon: '📄', label: 'Document Vault',   minTier: 'operational_readiness' },
  { id: 'notes',     icon: '📝', label: 'Notes',            minTier: null },
  { id: 'clipboard', icon: '📋', label: 'Clipboard',        minTier: null },
  { id: 'calendar',  icon: '📅', label: 'Calendar',         minTier: 'operational_readiness' },
  { id: 'research',  icon: '🔍', label: 'Research',         minTier: null },
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

// ─── VaultPanel (compliance_uploads, user-scoped) ───
// Raw REST fetch — consistent with NotesPanel and CLAUDE.md JWT-decode + raw-fetch rule.

function VaultPanel() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!window.__klToken || !window.__klUserId) {
        setLoading(false);
        return;
      }
      try {
        const resp = await fetch(
          SUPABASE_URL + '/rest/v1/compliance_uploads?user_id=eq.' + window.__klUserId +
            '&select=id,file_name,display_name,overall_score,status,created_at' +
            '&order=created_at.desc&limit=20',
          { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
        );
        const data = await resp.json();
        if (cancelled) return;
        if (Array.isArray(data)) setDocs(data);
      } catch (e) {
        console.error('Vault load failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div style={{ color: '#94A3B8', fontSize: '13px', padding: '12px' }}>Loading documents…</div>;
  }

  if (docs.length === 0) {
    return (
      <div style={{ padding: '12px' }}>
        <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '6px' }}>No documents yet.</p>
        <p style={{ color: '#64748B', fontSize: '13px', lineHeight: 1.5 }}>
          Upload a contract through Eileen to run a compliance check.
        </p>
      </div>
    );
  }

  return (
    <div>
      {docs.map((doc) => {
        const score = doc.overall_score;
        const hasScore = score != null;
        const scoreColor = !hasScore ? null : score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
        const scoreBg = !hasScore ? null : score >= 70 ? 'rgba(16,185,129,0.15)' : score >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';
        return (
          <div
            key={doc.id}
            style={{
              padding: '12px', marginBottom: '8px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{
                color: '#E2E8F0', fontSize: '13px', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              }}>
                {doc.display_name || doc.file_name}
              </span>
              {hasScore && (
                <span style={{
                  fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                  background: scoreBg, color: scoreColor, flexShrink: 0,
                }}>
                  {Math.round(score)}%
                </span>
              )}
            </div>
            <div style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>
              {new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CalendarPanel (regulatory_requirements, not user-scoped) ───

function CalendarPanel() {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!window.__klToken) {
        setLoading(false);
        return;
      }
      try {
        const resp = await fetch(
          SUPABASE_URL + '/rest/v1/regulatory_requirements' +
            '?select=id,requirement_name,statutory_basis,effective_from,commencement_status,is_forward_requirement,source_act' +
            '&order=effective_from.asc',
          { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
        );
        const data = await resp.json();
        if (cancelled) return;
        if (Array.isArray(data)) setReqs(data);
      } catch (e) {
        console.error('Calendar load failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div style={{ color: '#94A3B8', fontSize: '13px', padding: '12px' }}>Loading regulatory calendar…</div>;
  }

  const forwardCount = reqs.filter((r) => r.is_forward_requirement).length;
  const filtered = reqs.filter((r) => {
    if (filter === 'forward') return r.is_forward_requirement;
    if (filter === 'in_force') return r.commencement_status === 'in_force';
    return true;
  });

  const filterButtons = [
    { id: 'all', label: 'All (' + reqs.length + ')' },
    { id: 'in_force', label: 'In Force' },
    { id: 'forward', label: 'Forward (' + forwardCount + ')' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {filterButtons.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            style={{
              padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
              fontFamily: 'inherit',
              border: filter === f.id ? '1px solid #0EA5E9' : '1px solid rgba(255,255,255,0.1)',
              background: filter === f.id ? 'rgba(14,165,233,0.15)' : 'transparent',
              color: filter === f.id ? '#0EA5E9' : '#94A3B8',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ color: '#64748B', fontSize: '12px', padding: '8px 4px' }}>No requirements match this filter.</div>
      ) : (
        filtered.map((r) => (
          <div
            key={r.id}
            style={{
              padding: '10px', marginBottom: '6px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: r.is_forward_requirement ? '3px solid #F59E0B' : '3px solid #10B981',
            }}
          >
            <div style={{ color: '#E2E8F0', fontSize: '13px', fontWeight: 500 }}>{r.requirement_name}</div>
            {r.statutory_basis && (
              <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>{r.statutory_basis}</div>
            )}
            {r.effective_from && (
              <div style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>
                {'Effective: ' + new Date(r.effective_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─── ResearchPanel (kl_provisions + kl_cases, tabs + search) ───

function ResearchPanel() {
  const [tab, setTab] = useState('provisions');
  const [search, setSearch] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!window.__klToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const path = tab === 'provisions'
          ? '/rest/v1/kl_provisions?select=provision_id,title,instrument_id,section_num,in_force,is_era_2025&order=instrument_id&limit=50'
          : '/rest/v1/kl_cases?select=case_id,name,citation,court,year,principle&order=year.desc&limit=50';
        const resp = await fetch(SUPABASE_URL + path, {
          headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY },
        });
        const d = await resp.json();
        if (cancelled) return;
        setData(Array.isArray(d) ? d : []);
      } catch (e) {
        console.error('Research load failed:', e);
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tab]);

  const filtered = data.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    if (tab === 'provisions') {
      return (item.title || '').toLowerCase().includes(s) || (item.instrument_id || '').toLowerCase().includes(s);
    }
    return (item.name || '').toLowerCase().includes(s) || (item.citation || '').toLowerCase().includes(s);
  });

  const tabs = [
    { id: 'provisions', label: 'Provisions (391)' },
    { id: 'cases', label: 'Cases (240)' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setSearch(''); }}
            style={{
              flex: 1, padding: '6px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              fontFamily: 'inherit',
              border: tab === t.id ? '1px solid #0EA5E9' : '1px solid rgba(255,255,255,0.1)',
              background: tab === t.id ? 'rgba(14,165,233,0.1)' : 'transparent',
              color: tab === t.id ? '#0EA5E9' : '#94A3B8',
              fontWeight: tab === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder={'Search ' + tab + '…'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
          border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
          color: '#E2E8F0', marginBottom: '10px', outline: 'none', boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />
      {loading ? (
        <div style={{ color: '#94A3B8', fontSize: '13px', padding: '12px' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#64748B', fontSize: '12px', padding: '8px 4px' }}>No results.</div>
      ) : (
        filtered.slice(0, 30).map((item) => {
          if (tab === 'provisions') {
            return (
              <div
                key={item.provision_id}
                style={{
                  padding: '8px', marginBottom: '4px', borderRadius: '6px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ color: '#E2E8F0', fontSize: '12px', fontWeight: 500 }}>{item.title}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: '#0EA5E9', fontSize: '11px' }}>
                    {(item.instrument_id || '') + (item.section_num ? ' s.' + item.section_num : '')}
                  </span>
                  {item.is_era_2025 && (
                    <span style={{
                      color: '#F59E0B', fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
                      background: 'rgba(245,158,11,0.1)',
                    }}>
                      ERA 2025
                    </span>
                  )}
                  <span style={{ color: item.in_force ? '#10B981' : '#94A3B8', fontSize: '10px' }}>
                    {item.in_force ? 'In force' : 'Not yet'}
                  </span>
                </div>
              </div>
            );
          }
          return (
            <div
              key={item.case_id}
              style={{
                padding: '8px', marginBottom: '4px', borderRadius: '6px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ color: '#E2E8F0', fontSize: '12px', fontWeight: 500 }}>{item.name}</div>
              <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>
                {[item.citation, item.court, item.year].filter(Boolean).join(' · ')}
              </div>
              {item.principle && (
                <div style={{ color: '#64748B', fontSize: '11px', marginTop: '3px', lineHeight: 1.4 }}>
                  {item.principle.length > 120 ? item.principle.slice(0, 120) + '…' : item.principle}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
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
  vault: 'Document Vault', notes: 'Notes', documents: 'Documents',
  clipboard: 'Clipboard', calendar: 'Calendar', eileen: 'Eileen',
  research: 'Research', planner: 'Contract Planner',
};

const PANEL_COMPONENTS = {
  vault: VaultPanel,
  notes: NotesPanel,
  clipboard: ClipboardPanel,
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

      const response = await fetch(
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
          }),
        }
      );

      // Stop the phased text updates regardless of outcome
      phaseTimers.forEach((t) => clearTimeout(t));

      const data = await response.json();

      if (!response.ok) {
        // Check limit reached — explain allowance, re-enable the trigger
        if (data && data.error === 'check_limit_reached') {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === loadingMsgId) {
                return Object.assign({}, m, {
                  content:
                    data.message ||
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
        throw new Error((data && (data.error || data.detail)) || 'Analysis failed');
      }

      // 4. Success — drop the loading message, append the analysis result
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => m.id !== loadingMsgId);
        return withoutLoading.concat([{
          id: 'result-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          role: 'assistant',
          content: '',
          isLocal: true,
          isAnalysisResult: true,
          analysisData: data,
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
