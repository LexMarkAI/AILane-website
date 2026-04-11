(() => {
  // knowledge-library/kl-app.jsx
  var { useState, useEffect, useRef, useCallback } = React;
  var SUPABASE_URL = "https://cnbsxwtvazfvzmltkuvx.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g";
  var EILEEN_ENDPOINT = SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co") + "/functions/v1/eileen-intelligence";
  var CROWN_JEWELS = [
    "Employment Rights Act 1996",
    "Equality Act 2010",
    "Health and Safety at Work Act 1974",
    "National Minimum Wage Act 1998",
    "Trade Union and Labour Relations (Consolidation) Act 1992",
    "Employment Rights Act 2025",
    "Public Interest Disclosure Act 1998"
  ];
  var QUICK_STARTS = [
    "What are the latest tribunal decisions on disability discrimination?",
    "Summarise the key changes in the Employment Rights Act 2025.",
    "How should I handle a flexible working request under current law?"
  ];
  (function() {
    if (typeof document === "undefined") return;
    if (document.getElementById("kl-r1b-keyframes")) return;
    const style = document.createElement("style");
    style.id = "kl-r1b-keyframes";
    style.textContent = "@keyframes kl-pulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }";
    document.head.appendChild(style);
  })();
  var ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"];
  var MAX_FILE_SIZE = 10 * 1024 * 1024;
  function formatFileSize(bytes) {
    if (bytes == null) return "";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function renderMarkdown(text) {
    if (!text) return "";
    const escaped = escapeHtml(text);
    const withInline = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
    const lines = withInline.split("\n");
    const out = [];
    let listItems = [];
    function flushList() {
      if (listItems.length) {
        out.push("<ul>" + listItems.join("") + "</ul>");
        listItems = [];
      }
    }
    lines.forEach((line) => {
      const trimmed = line.trim();
      const headerMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
      const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (headerMatch) {
        flushList();
        const level = Math.min(6, headerMatch[1].length + 3);
        out.push("<h" + level + ">" + headerMatch[2] + "</h" + level + ">");
      } else if (listMatch) {
        listItems.push("<li>" + listMatch[1] + "</li>");
      } else if (trimmed === "") {
        flushList();
      } else {
        flushList();
        out.push("<p>" + line + "</p>");
      }
    });
    flushList();
    return out.join("");
  }
  function formatRelativeTime(iso) {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - then);
    const mins = Math.floor(diff / 6e4);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + "d ago";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  function truncate(s, n) {
    if (!s) return "";
    return s.length > n ? s.substring(0, n - 1) + "\u2026" : s;
  }
  function tierPalette(tier) {
    if (tier === "institutional") return ["#D4A017", "#F1C85B"];
    if (tier === "governance") return ["#0EA5E9", "#8B5CF6"];
    if (tier === "operational_readiness") return ["#0EA5E9", "#10B981"];
    return ["#0EA5E9", "#38BDF8"];
  }
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
      canvas.style.width = size + "px";
      canvas.style.height = size + "px";
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      const [colorA, colorB] = tierPalette(tier);
      const cx = size / 2;
      const cy = size / 2;
      const nodes = [];
      const rings = [{ count: 6, radius: 28 }, { count: 8, radius: 68 }, { count: 10, radius: 110 }];
      rings.forEach((ring, ri) => {
        for (let i = 0; i < ring.count; i++) {
          const angle = i / ring.count * Math.PI * 2 + ri * 0.4;
          nodes.push({
            x: cx + Math.cos(angle) * ring.radius,
            y: cy + Math.sin(angle) * ring.radius,
            phase: Math.random() * Math.PI * 2,
            ring: ri
          });
        }
      });
      const start = performance.now();
      function draw(now) {
        const t = (now - start) / 1e3;
        ctx.clearRect(0, 0, size, size);
        ctx.lineWidth = 1;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 72) {
              const alpha = (1 - d / 72) * 0.2;
              ctx.strokeStyle = "rgba(14,165,233," + alpha.toFixed(3) + ")";
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
            }
          }
        }
        nodes.forEach((n, i) => {
          const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + n.phase);
          const r = 2 + pulse * 2.2;
          const color = n.ring === 0 ? colorA : n.ring === 2 ? colorB : i % 2 ? colorA : colorB;
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
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [tier]);
    return /* @__PURE__ */ React.createElement("canvas", { ref: canvasRef, className: "kl-nexus-canvas" });
  }
  function EileenSenderLabel() {
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        "aria-hidden": "true",
        style: {
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#0EA5E9",
          boxShadow: "0 0 6px rgba(14,165,233,0.5)",
          flexShrink: 0
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "kl-msg-sender", style: { marginBottom: 0 } }, "Eileen"));
  }
  function TypingIndicator() {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-eileen" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content" }, /* @__PURE__ */ React.createElement(EileenSenderLabel, null), /* @__PURE__ */ React.createElement("div", { className: "kl-typing-dots", style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("span", { className: "kl-dot" }), /* @__PURE__ */ React.createElement("span", { className: "kl-dot" }), /* @__PURE__ */ React.createElement("span", { className: "kl-dot" }))));
  }
  function FileAttachmentBubble({ filename, fileSize, status, charCount }) {
    const sizeLabel = formatFileSize(fileSize);
    const statusIcon = {
      uploading: "\u23F3",
      // ⏳
      extracting: "\u2699\uFE0F",
      // ⚙️
      ready: "\u2705",
      // ✅
      error: "\u274C"
      // ❌
    }[status] || "\u23F3";
    const statusLabel = {
      uploading: "Uploading...",
      extracting: "Extracting text...",
      ready: charCount ? charCount.toLocaleString() + " characters extracted" : "Ready",
      error: "Upload failed"
    }[status] || "";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 14px",
          borderRadius: "10px",
          background: "rgba(14,165,233,0.08)",
          border: "1px solid rgba(14,165,233,0.2)",
          maxWidth: "320px"
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: "24px" }, "aria-hidden": "true" }, "\u{1F4C4}"),
      /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            color: "#E2E8F0",
            fontSize: "13px",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        },
        filename
      ), /* @__PURE__ */ React.createElement("div", { style: { color: "#94A3B8", fontSize: "11px", marginTop: "2px" } }, sizeLabel + " \xB7 " + statusLabel)),
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: "16px" }, "aria-hidden": "true" }, statusIcon)
    );
  }
  function AnalysisResultMessage({ data }) {
    const score = data.overall_score;
    const status = data.status;
    const findings = data.findings || [];
    const forwardFindings = data.forward_findings || [];
    const summary = data.summary || {};
    const engineVersion = data.engine_version || "";
    const analysisTimeMs = data.analysis_time_ms || 0;
    const checksUsed = data.checks_used;
    const checkLimit = data.check_limit;
    const expandedRef = useRef({});
    const [, setTick] = useState(0);
    function toggleFinding(key) {
      expandedRef.current[key] = !expandedRef.current[key];
      setTick((c) => c + 1);
    }
    if (status === "out_of_scope") {
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            padding: "16px",
            borderRadius: "10px",
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.2)"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: "14px", fontWeight: 600, color: "#FBBF24", marginBottom: "8px" } }, "\u26A0\uFE0F Document Outside Scope"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px", color: "#CBD5E1", lineHeight: 1.5 } }, "This document does not appear to be a UK employment contract, staff handbook, or workplace policy. The compliance engine analyses employment documents only. If this is an employment document, try uploading it in a different format (PDF or DOCX).")
      );
    }
    const scoreColor = score >= 65 ? "#22C55E" : score >= 30 ? "#FBBF24" : "#EF4444";
    const SEV_COLORS = {
      critical: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", text: "#EF4444", label: "Critical" },
      major: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", text: "#FBBF24", label: "Major" },
      minor: { bg: "rgba(234,179,8,0.06)", border: "rgba(234,179,8,0.2)", text: "#EAB308", label: "Minor" },
      compliant: { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.2)", text: "#22C55E", label: "Compliant" }
    };
    const severityOrder = { critical: 0, major: 1, minor: 2 };
    const currentNonCompliant = findings.filter((f) => f.severity !== "compliant").slice().sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
    const forwardNonCompliant = forwardFindings.filter((f) => f.severity !== "compliant");
    const summaryParts = [];
    if (summary.critical) summaryParts.push(summary.critical + " critical");
    if (summary.major) summaryParts.push(summary.major + " major");
    if (summary.minor) summaryParts.push(summary.minor + " minor");
    if (summary.compliant) summaryParts.push(summary.compliant + " compliant");
    const summaryLine = summaryParts.join("  \xB7  ");
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: "100%" } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "16px",
          marginBottom: "12px",
          borderRadius: "10px",
          background: "rgba(14,165,233,0.05)",
          border: "1px solid rgba(14,165,233,0.15)"
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(10,22,40,0.8)",
            border: "2px solid " + scoreColor,
            flexShrink: 0
          }
        },
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: "18px", fontWeight: 700, color: scoreColor } }, Math.round(score) + "%")
      ),
      /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "14px", fontWeight: 600, color: "#E2E8F0", marginBottom: "4px" } }, "Contract Compliance Check \u2014 Complete"), summaryLine && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#94A3B8" } }, summaryLine), status === "sparse_report" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#FBBF24", marginTop: "4px" } }, "\u26A0\uFE0F Some requirements could not be assessed. Manual review recommended for gaps."))
    ), currentNonCompliant.map((finding, idx) => {
      const sev = SEV_COLORS[finding.severity] || SEV_COLORS.minor;
      const key = "c" + idx;
      const isExpanded = !!expandedRef.current[key];
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key,
          style: {
            marginBottom: "8px",
            borderRadius: "8px",
            background: sev.bg,
            border: "1px solid " + sev.border,
            overflow: "hidden"
          }
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            onClick: () => toggleFinding(key),
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              cursor: "pointer"
            }
          },
          /* @__PURE__ */ React.createElement(
            "span",
            {
              style: {
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: "4px",
                background: sev.border,
                color: sev.text
              }
            },
            sev.label
          ),
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", color: "#CBD5E1", flex: 1, minWidth: 0 } }, finding.clause_category),
          finding.statutory_ref && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#64748B" } }, finding.statutory_ref),
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", color: "#64748B", marginLeft: "4px" } }, isExpanded ? "\u25B2" : "\u25BC")
        ),
        isExpanded && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 12px 12px" } }, finding.clause_text && finding.clause_text !== "[Not found in document]" && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#94A3B8",
              fontStyle: "italic",
              padding: "6px 10px",
              marginBottom: "8px",
              borderRadius: "4px",
              background: "rgba(0,0,0,0.2)",
              borderLeft: "2px solid " + sev.border
            }
          },
          finding.clause_text.length > 300 ? finding.clause_text.slice(0, 300) + "\u2026" : finding.clause_text
        ), finding.finding_detail && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#CBD5E1",
              lineHeight: 1.5,
              marginBottom: "8px"
            }
          },
          finding.finding_detail
        ), finding.remediation && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#0EA5E9",
              lineHeight: 1.5,
              padding: "8px 10px",
              borderRadius: "4px",
              background: "rgba(14,165,233,0.06)",
              borderLeft: "2px solid rgba(14,165,233,0.3)"
            }
          },
          /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", display: "block", marginBottom: "4px" } }, "Remediation"),
          finding.remediation
        ))
      );
    }), summary.compliant > 0 && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          padding: "8px 12px",
          marginBottom: "8px",
          borderRadius: "8px",
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.15)",
          fontSize: "12px",
          color: "#22C55E"
        }
      },
      "\u2713 " + summary.compliant + " requirement" + (summary.compliant === 1 ? "" : "s") + " assessed as compliant"
    ), forwardNonCompliant.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "16px" } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          fontSize: "13px",
          fontWeight: 600,
          color: "#A78BFA",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }
      },
      "\u{1F52E} Legislative Horizon \u2014 Forward Exposure"
    ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#94A3B8", marginBottom: "10px" } }, "These findings relate to provisions of the Employment Rights Act 2025 not yet in force. They do not affect the current compliance position."), forwardNonCompliant.map((finding, idx) => {
      const sev = SEV_COLORS[finding.severity] || SEV_COLORS.minor;
      const key = "f" + idx;
      const isExpanded = !!expandedRef.current[key];
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key,
          style: {
            marginBottom: "8px",
            borderRadius: "8px",
            background: "rgba(167,139,250,0.04)",
            border: "1px solid rgba(167,139,250,0.15)",
            overflow: "hidden"
          }
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            onClick: () => toggleFinding(key),
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              cursor: "pointer"
            }
          },
          /* @__PURE__ */ React.createElement(
            "span",
            {
              style: {
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: "4px",
                background: sev.border,
                color: sev.text
              }
            },
            sev.label
          ),
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", color: "#CBD5E1", flex: 1, minWidth: 0 } }, finding.clause_category),
          finding.forward_effective_date && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#A78BFA" } }, "Expected: " + finding.forward_effective_date),
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", color: "#64748B", marginLeft: "4px" } }, isExpanded ? "\u25B2" : "\u25BC")
        ),
        isExpanded && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 12px 12px" } }, finding.finding_detail && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#CBD5E1",
              lineHeight: 1.5,
              marginBottom: "8px"
            }
          },
          finding.finding_detail
        ), finding.remediation && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#A78BFA",
              lineHeight: 1.5,
              padding: "8px 10px",
              borderRadius: "4px",
              background: "rgba(167,139,250,0.04)",
              borderLeft: "2px solid rgba(167,139,250,0.2)"
            }
          },
          /* @__PURE__ */ React.createElement(
            "strong",
            {
              style: { fontSize: "11px", display: "block", marginBottom: "4px" }
            },
            "Action Before Commencement"
          ),
          finding.remediation
        ))
      );
    })), /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          marginTop: "12px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(148,163,184,0.1)",
          fontSize: "11px",
          color: "#64748B",
          lineHeight: 1.5
        }
      },
      "Engine " + engineVersion + " \xB7 " + Math.round(analysisTimeMs / 1e3) + "s analysis time",
      checksUsed != null && checkLimit != null ? " \xB7 Check " + checksUsed + "/" + checkLimit + " used" : "",
      /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", fontSize: "10px", color: "#475569" } }, "This analysis is regulatory intelligence grounded in Ailane's compliance engine. It does not constitute legal advice. AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720) trading as Ailane.")
    ));
  }
  function MessageBubble({ msg, onRunAnalysis }) {
    if (msg.type === "file_upload") {
      return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-user" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content" }, /* @__PURE__ */ React.createElement(
        FileAttachmentBubble,
        {
          filename: msg.filename,
          fileSize: msg.fileSize,
          status: msg.status,
          charCount: msg.charCount
        }
      )));
    }
    if (msg.role === "user") {
      return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-user" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-body" }, msg.content)));
    }
    const hasStats = msg.provisionsCount != null || msg.casesCount != null;
    const renderAnalysisResult = msg.isAnalysisResult && msg.analysisData;
    const html = renderAnalysisResult ? "" : renderMarkdown(msg.content || "");
    function handleRunClick() {
      if (typeof onRunAnalysis === "function") {
        onRunAnalysis(msg.documentId, msg.id);
      }
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-eileen" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content" }, /* @__PURE__ */ React.createElement(EileenSenderLabel, null), msg.isAnalysisLoading && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "8px",
          marginBottom: "4px"
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "kl-analysis-pulse",
          style: {
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#0EA5E9",
            animation: "kl-pulse 1.5s ease-in-out infinite",
            flexShrink: 0
          },
          "aria-hidden": "true"
        }
      ),
      /* @__PURE__ */ React.createElement("span", { style: { color: "#94A3B8", fontSize: "11px", fontStyle: "italic" } }, "Compliance engine active")
    ), renderAnalysisResult ? /* @__PURE__ */ React.createElement("div", { className: "kl-msg-body", style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement(AnalysisResultMessage, { data: msg.analysisData })) : /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "kl-msg-body",
        style: { marginTop: "8px" },
        dangerouslySetInnerHTML: { __html: html }
      }
    ), msg.analysisReady && msg.documentId && !msg.analysisTriggered && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleRunClick,
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "12px",
          padding: "10px 18px",
          background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          transition: "opacity 0.2s"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.opacity = "0.9";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.opacity = "1";
        }
      },
      "\u2713 Run Contract Compliance Check"
    ), msg.analysisReady && msg.analysisTriggered && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          marginTop: "12px",
          padding: "8px 14px",
          background: "rgba(14,165,233,0.08)",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#64748B",
          display: "inline-block"
        }
      },
      "\u2713 Contract Compliance Check initiated"
    ), hasStats && /* @__PURE__ */ React.createElement("div", { className: "kl-msg-footer" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-stats" }, "Based on ", msg.provisionsCount || 0, " provision", msg.provisionsCount === 1 ? "" : "s", " and ", msg.casesCount || 0, " case", msg.casesCount === 1 ? "" : "s"))));
  }
  function MessageInput({ onSend, disabled, onFileSelect }) {
    const [value, setValue] = useState("");
    const fileInputRef = useRef(null);
    function submit() {
      const text = value.trim();
      if (!text || disabled) return;
      onSend(text);
      setValue("");
    }
    function onKey(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    }
    function onPaperclipClick() {
      if (fileInputRef.current) fileInputRef.current.click();
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kl-input-bar" }, onFileSelect && /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "file",
        ref: fileInputRef,
        accept: ".pdf,.docx,.doc,.txt",
        style: { display: "none" },
        onChange: onFileSelect
      }
    ), onFileSelect && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onPaperclipClick,
        title: "Upload a contract for compliance analysis",
        "aria-label": "Upload a contract for compliance analysis",
        style: {
          background: "rgba(14,165,233,0.08)",
          border: "1px solid rgba(14,165,233,0.2)",
          borderRadius: "8px",
          cursor: "pointer",
          padding: "6px 10px",
          color: "#0EA5E9",
          fontSize: "13px",
          fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap",
          flexShrink: 0
        }
      },
      /* @__PURE__ */ React.createElement(
        "svg",
        {
          width: "16",
          height: "16",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": "true"
        },
        /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
        /* @__PURE__ */ React.createElement("polyline", { points: "17 8 12 3 7 8" }),
        /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })
      ),
      /* @__PURE__ */ React.createElement("span", null, "Upload contract")
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "kl-input",
        type: "text",
        placeholder: "Ask Eileen anything about UK employment law...",
        value,
        onChange: (e) => setValue(e.target.value),
        onKeyDown: onKey,
        disabled
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "kl-send-btn",
        onClick: submit,
        disabled: disabled || !value.trim(),
        "aria-label": "Send message"
      },
      /* @__PURE__ */ React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.25", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("line", { x1: "22", y1: "2", x2: "11", y2: "13" }), /* @__PURE__ */ React.createElement("polygon", { points: "22 2 15 22 11 13 2 9 22 2" }))
    ));
  }
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
        onFileSelect({ target: { files } });
      }
    }
    const dragOverlay = isDragging && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 50,
          background: "rgba(14,165,233,0.08)",
          border: "2px dashed #0EA5E9",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { color: "#0EA5E9", fontSize: "16px", fontWeight: 500 } }, "Drop your contract here")
    );
    return /* @__PURE__ */ React.createElement("div", { className: "kl-main" }, empty ? /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "kl-welcome",
        style: { position: "relative" },
        onDragOver,
        onDragLeave,
        onDrop
      },
      dragOverlay,
      /* @__PURE__ */ React.createElement("div", { className: "kl-welcome-nexus" }, /* @__PURE__ */ React.createElement(NexusCanvas, { tier })),
      /* @__PURE__ */ React.createElement("h1", { className: "kl-welcome-greeting" }, "How can I help you today?"),
      /* @__PURE__ */ React.createElement("div", { className: "kl-welcome-input" }, /* @__PURE__ */ React.createElement(MessageInput, { onSend, disabled: isLoading, onFileSelect })),
      /* @__PURE__ */ React.createElement("div", { className: "kl-topics-grid" }, QUICK_STARTS.map((q, i) => /* @__PURE__ */ React.createElement("button", { key: i, className: "kl-topic-card", onClick: () => onSend(q), disabled: isLoading }, /* @__PURE__ */ React.createElement("div", { className: "kl-card-label" }, q))))
    ) : /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "kl-conversation",
        style: { position: "relative" },
        onDragOver,
        onDragLeave,
        onDrop
      },
      dragOverlay,
      /* @__PURE__ */ React.createElement("div", { className: "kl-messages", ref: scrollRef }, messages.map((m, i) => /* @__PURE__ */ React.createElement(MessageBubble, { key: i, msg: m, onRunAnalysis })), isLoading && /* @__PURE__ */ React.createElement(TypingIndicator, null)),
      /* @__PURE__ */ React.createElement("div", { className: "kl-conversation-input" }, /* @__PURE__ */ React.createElement(MessageInput, { onSend, disabled: isLoading, onFileSelect }))
    ));
  }
  function CrownJewels({ onQuery, disabled }) {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-crown" }, /* @__PURE__ */ React.createElement("div", { className: "kl-crown-title" }, "Crown Jewels"), /* @__PURE__ */ React.createElement("div", { className: "kl-crown-chips" }, CROWN_JEWELS.map((name) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: name,
        className: "kl-chip",
        disabled,
        onClick: () => onQuery("Tell me about the key provisions and current obligations under the " + name)
      },
      name
    ))));
  }
  function Sidebar({ open, sessionHistory, activeSessionId, onSelectSession, onNewChat, onCrownQuery }) {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-sidebar" + (open ? "" : " collapsed") }, /* @__PURE__ */ React.createElement("div", { className: "kl-sidebar-section" }, /* @__PURE__ */ React.createElement("button", { className: "kl-new-chat-btn", onClick: onNewChat }, /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.25", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), /* @__PURE__ */ React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })), /* @__PURE__ */ React.createElement("span", null, "New Conversation"))), /* @__PURE__ */ React.createElement("div", { className: "kl-sidebar-history" }, sessionHistory.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "kl-sidebar-empty" }, "No prior conversations") : sessionHistory.map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s.sessionId,
        className: "kl-history-item" + (s.sessionId === activeSessionId ? " active" : ""),
        onClick: () => onSelectSession(s.sessionId)
      },
      /* @__PURE__ */ React.createElement("div", { className: "kl-history-title" }, truncate(s.title, 40)),
      /* @__PURE__ */ React.createElement("div", { className: "kl-history-time" }, formatRelativeTime(s.lastActivity))
    ))), /* @__PURE__ */ React.createElement("div", { className: "kl-sidebar-divider" }), /* @__PURE__ */ React.createElement(CrownJewels, { onQuery: onCrownQuery }));
  }
  function SessionCountdown({ expiresAt, onExpired }) {
    const [remaining, setRemaining] = useState("");
    const [isUrgent, setIsUrgent] = useState(false);
    const firedRef = useRef(false);
    useEffect(() => {
      firedRef.current = false;
      if (!expiresAt) return void 0;
      const expiry = new Date(expiresAt).getTime();
      if (isNaN(expiry)) return void 0;
      function tick() {
        const diff = expiry - Date.now();
        if (diff <= 0) {
          setRemaining("Expired");
          setIsUrgent(true);
          if (!firedRef.current && typeof onExpired === "function") {
            firedRef.current = true;
            onExpired();
          }
          return false;
        }
        const totalSecs = Math.floor(diff / 1e3);
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor(totalSecs % 3600 / 60);
        const secs = totalSecs % 60;
        const label = hours > 0 ? hours + "h " + String(mins).padStart(2, "0") + "m" : mins + "m " + String(secs).padStart(2, "0") + "s";
        setRemaining(label);
        setIsUrgent(diff < 15 * 60 * 1e3);
        return true;
      }
      if (!tick()) return void 0;
      const interval = setInterval(() => {
        if (!tick()) clearInterval(interval);
      }, 1e3);
      return () => clearInterval(interval);
    }, [expiresAt, onExpired]);
    if (!expiresAt) return null;
    return /* @__PURE__ */ React.createElement("span", { className: "kl-session-countdown" + (isUrgent ? " urgent" : ""), title: "Time remaining in this session" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u23F1"), /* @__PURE__ */ React.createElement("span", { className: "kl-session-countdown-time" }, remaining));
  }
  function ExpiredModal() {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-expired-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "kl-expired-title" }, /* @__PURE__ */ React.createElement("div", { className: "kl-expired-backdrop", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("div", { className: "kl-expired-content" }, /* @__PURE__ */ React.createElement("h2", { id: "kl-expired-title", className: "kl-expired-title" }, "Session expired"), /* @__PURE__ */ React.createElement("p", { className: "kl-expired-body" }, "Your Knowledge Library session has ended. Purchase a new session to continue your research."), /* @__PURE__ */ React.createElement("a", { className: "kl-expired-cta", href: "/knowledge-library-preview/" }, "Get a new session")));
  }
  function MobileSidebarBackdrop({ onClick }) {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-sidebar-backdrop", onClick, "aria-hidden": "true" });
  }
  function TopBar({ sidebarOpen, onToggleSidebar, accessType, tier, sessionExpiresAt, onSessionExpired }) {
    let badgeLabel = "KNOWLEDGE LIBRARY";
    let badgeClass = "kl-badge-per-session";
    if (accessType === "subscription") {
      if (tier === "operational_readiness") {
        badgeLabel = "OPERATIONAL";
        badgeClass = "kl-badge-operational";
      } else if (tier === "governance") {
        badgeLabel = "GOVERNANCE";
        badgeClass = "kl-badge-governance";
      } else if (tier === "institutional") {
        badgeLabel = "INSTITUTIONAL";
        badgeClass = "kl-badge-institutional";
      }
    } else if (accessType === "per_session") {
      badgeLabel = "PER-SESSION";
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kl-topbar" }, /* @__PURE__ */ React.createElement("button", { className: "kl-topbar-toggle", onClick: onToggleSidebar, "aria-label": sidebarOpen ? "Collapse sidebar" : "Expand sidebar" }, /* @__PURE__ */ React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "12", x2: "21", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "6", x2: "21", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "18", x2: "21", y2: "18" }))), /* @__PURE__ */ React.createElement("div", { className: "kl-topbar-title" }, "AILANE Knowledge Library"), /* @__PURE__ */ React.createElement("div", { className: "kl-topbar-right" }, accessType === "per_session" && sessionExpiresAt && /* @__PURE__ */ React.createElement(SessionCountdown, { expiresAt: sessionExpiresAt, onExpired: onSessionExpired }), /* @__PURE__ */ React.createElement("span", { className: "kl-tier-badge " + badgeClass }, badgeLabel)));
  }
  var PANEL_DEFS = [
    { id: "vault", icon: "\u{1F4C4}", label: "Document Vault", minTier: "operational_readiness" },
    { id: "notes", icon: "\u{1F4DD}", label: "Notes", minTier: null },
    { id: "clipboard", icon: "\u{1F4CB}", label: "Clipboard", minTier: null },
    { id: "calendar", icon: "\u{1F4C5}", label: "Calendar", minTier: "operational_readiness" },
    { id: "research", icon: "\u{1F50D}", label: "Research", minTier: null }
  ];
  var TIER_RANK = {
    per_session: 0,
    kl_quick_session: 0,
    kl_day_pass: 0,
    kl_research_week: 0,
    operational_readiness: 1,
    governance: 2,
    institutional: 3
  };
  function PanelRail({ activePanel, onSelectPanel, accessType, tier }) {
    const userRank = TIER_RANK[tier] != null ? TIER_RANK[tier] : TIER_RANK[accessType] != null ? TIER_RANK[accessType] : 0;
    return /* @__PURE__ */ React.createElement("div", { className: "kl-panelrail" }, PANEL_DEFS.map((p) => {
      const minRank = p.minTier ? TIER_RANK[p.minTier] != null ? TIER_RANK[p.minTier] : 99 : 0;
      const locked = userRank < minRank;
      const isActive = activePanel === p.id;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: p.id,
          type: "button",
          className: "kl-panel-rail-btn" + (isActive ? " active" : "") + (locked ? " locked" : ""),
          title: locked ? p.label + " (upgrade required)" : p.label,
          "aria-label": p.label,
          "aria-pressed": isActive,
          disabled: locked,
          onClick: () => {
            if (!locked) onSelectPanel(isActive ? null : p.id);
          }
        },
        /* @__PURE__ */ React.createElement("span", { className: "kl-panel-rail-icon", "aria-hidden": "true" }, p.icon)
      );
    }));
  }
  function NotesPanel() {
    const [noteId, setNoteId] = useState(null);
    const [title, setTitle] = useState("Untitled note");
    const [body, setBody] = useState("");
    const [status, setStatus] = useState("loading");
    const saveTimer = useRef(null);
    const loadedRef = useRef(false);
    useEffect(() => {
      let cancelled = false;
      async function load() {
        if (!window.__klToken || !window.__klUserId) return;
        try {
          const resp = await fetch(
            SUPABASE_URL + "/rest/v1/kl_workspace_notes?user_id=eq." + window.__klUserId + "&select=id,title,content_plain&order=updated_at.desc&limit=1",
            { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
          );
          const data = await resp.json();
          if (cancelled) return;
          if (Array.isArray(data) && data[0]) {
            setNoteId(data[0].id);
            setTitle(data[0].title || "Untitled note");
            setBody(data[0].content_plain || "");
          }
          loadedRef.current = true;
          setStatus("saved");
        } catch (e) {
          console.error("Notes load failed:", e);
          if (!cancelled) setStatus("error");
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
      setStatus("saving");
      const now = (/* @__PURE__ */ new Date()).toISOString();
      try {
        if (currentId) {
          const resp = await fetch(
            SUPABASE_URL + "/rest/v1/kl_workspace_notes?id=eq." + currentId,
            {
              method: "PATCH",
              headers: {
                "Authorization": "Bearer " + window.__klToken,
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({
                title: nextTitle || "Untitled note",
                content_plain: nextBody,
                updated_at: now
              })
            }
          );
          if (!resp.ok) throw new Error("PATCH " + resp.status);
        } else {
          const resp = await fetch(SUPABASE_URL + "/rest/v1/kl_workspace_notes", {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + window.__klToken,
              "apikey": SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify({
              user_id: window.__klUserId,
              project_id: null,
              title: nextTitle || "Untitled note",
              content_plain: nextBody
            })
          });
          if (!resp.ok) throw new Error("POST " + resp.status);
          const data = await resp.json();
          if (Array.isArray(data) && data[0] && data[0].id) setNoteId(data[0].id);
        }
        setStatus("saved");
      } catch (e) {
        console.error("Notes save failed:", e);
        setStatus("error");
      }
    }
    function scheduleSave(nextTitle, nextBody) {
      if (!loadedRef.current) return;
      setStatus("dirty");
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
    const statusLabel = status === "loading" ? "Loading\u2026" : status === "dirty" ? "Unsaved changes" : status === "saving" ? "Saving\u2026" : status === "error" ? "Save failed" : "\u2713 Saved";
    const statusClass = "kl-notes-status" + (status === "saved" ? " saved" : "") + (status === "error" ? " error" : "");
    return /* @__PURE__ */ React.createElement("div", { className: "kl-notes-panel" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "kl-notes-title",
        type: "text",
        value: title,
        onChange: onTitleChange,
        placeholder: "Untitled note"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: statusClass }, statusLabel), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        className: "kl-notes-body",
        value: body,
        onChange: onBodyChange,
        placeholder: "Take notes during your research..."
      }
    ));
  }
  function ClipboardPanel() {
    const [clips, setClips] = useState([]);
    useEffect(() => {
      window.__klAddClip = function(text, source) {
        setClips((prev) => [{ id: Date.now() + Math.random(), text: String(text || ""), source: source || null, copiedAt: /* @__PURE__ */ new Date() }, ...prev]);
      };
      return () => {
        delete window.__klAddClip;
      };
    }, []);
    function removeClip(id) {
      setClips((prev) => prev.filter((c) => c.id !== id));
    }
    function copyToClipboard(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch((e) => console.error("Clipboard copy failed:", e));
      }
    }
    if (clips.length === 0) {
      return /* @__PURE__ */ React.createElement("div", { className: "kl-clipboard-panel" }, /* @__PURE__ */ React.createElement("p", { className: "kl-clipboard-empty" }, "No clips yet. Copy text from Eileen's responses to save it here."));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kl-clipboard-panel" }, /* @__PURE__ */ React.createElement("button", { className: "kl-clipboard-clear", onClick: () => setClips([]) }, "Clear all"), clips.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, className: "kl-clip" }, /* @__PURE__ */ React.createElement("p", { className: "kl-clip-text" }, c.text.length > 200 ? c.text.substring(0, 200) + "\u2026" : c.text), /* @__PURE__ */ React.createElement("div", { className: "kl-clip-actions" }, /* @__PURE__ */ React.createElement("button", { className: "kl-clip-copy", onClick: () => copyToClipboard(c.text) }, "Copy"), /* @__PURE__ */ React.createElement("button", { className: "kl-clip-remove", onClick: () => removeClip(c.id) }, "Remove")))));
  }
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
            SUPABASE_URL + "/rest/v1/compliance_uploads?user_id=eq." + window.__klUserId + "&select=id,file_name,display_name,overall_score,status,created_at&order=created_at.desc&limit=20",
            { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
          );
          const data = await resp.json();
          if (cancelled) return;
          if (Array.isArray(data)) setDocs(data);
        } catch (e) {
          console.error("Vault load failed:", e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, []);
    if (loading) {
      return /* @__PURE__ */ React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "12px" } }, "Loading documents\u2026");
    }
    if (docs.length === 0) {
      return /* @__PURE__ */ React.createElement("div", { style: { padding: "12px" } }, /* @__PURE__ */ React.createElement("p", { style: { color: "#94A3B8", fontSize: "14px", marginBottom: "6px" } }, "No documents yet."), /* @__PURE__ */ React.createElement("p", { style: { color: "#64748B", fontSize: "13px", lineHeight: 1.5 } }, "Upload a contract through Eileen to run a compliance check."));
    }
    return /* @__PURE__ */ React.createElement("div", null, docs.map((doc) => {
      const score = doc.overall_score;
      const hasScore = score != null;
      const scoreColor = !hasScore ? null : score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";
      const scoreBg = !hasScore ? null : score >= 70 ? "rgba(16,185,129,0.15)" : score >= 40 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: doc.id,
          style: {
            padding: "12px",
            marginBottom: "8px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement("span", { style: {
          color: "#E2E8F0",
          fontSize: "13px",
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0
        } }, doc.display_name || doc.file_name), hasScore && /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: "12px",
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: "4px",
          background: scoreBg,
          color: scoreColor,
          flexShrink: 0
        } }, Math.round(score), "%")),
        /* @__PURE__ */ React.createElement("div", { style: { color: "#64748B", fontSize: "11px", marginTop: "4px" } }, new Date(doc.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))
      );
    }));
  }
  function CalendarPanel() {
    const [reqs, setReqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    useEffect(() => {
      let cancelled = false;
      async function load() {
        if (!window.__klToken) {
          setLoading(false);
          return;
        }
        try {
          const resp = await fetch(
            SUPABASE_URL + "/rest/v1/regulatory_requirements?select=id,requirement_name,statutory_basis,effective_from,commencement_status,is_forward_requirement,source_act&order=effective_from.asc",
            { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
          );
          const data = await resp.json();
          if (cancelled) return;
          if (Array.isArray(data)) setReqs(data);
        } catch (e) {
          console.error("Calendar load failed:", e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, []);
    if (loading) {
      return /* @__PURE__ */ React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "12px" } }, "Loading regulatory calendar\u2026");
    }
    const forwardCount = reqs.filter((r) => r.is_forward_requirement).length;
    const filtered = reqs.filter((r) => {
      if (filter === "forward") return r.is_forward_requirement;
      if (filter === "in_force") return r.commencement_status === "in_force";
      return true;
    });
    const filterButtons = [
      { id: "all", label: "All (" + reqs.length + ")" },
      { id: "in_force", label: "In Force" },
      { id: "forward", label: "Forward (" + forwardCount + ")" }
    ];
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" } }, filterButtons.map((f) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: f.id,
        type: "button",
        onClick: () => setFilter(f.id),
        style: {
          padding: "4px 10px",
          borderRadius: "4px",
          fontSize: "11px",
          cursor: "pointer",
          fontFamily: "inherit",
          border: filter === f.id ? "1px solid #0EA5E9" : "1px solid rgba(255,255,255,0.1)",
          background: filter === f.id ? "rgba(14,165,233,0.15)" : "transparent",
          color: filter === f.id ? "#0EA5E9" : "#94A3B8"
        }
      },
      f.label
    ))), filtered.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No requirements match this filter.") : filtered.map((r) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: r.id,
        style: {
          padding: "10px",
          marginBottom: "6px",
          borderRadius: "6px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderLeft: r.is_forward_requirement ? "3px solid #F59E0B" : "3px solid #10B981"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { color: "#E2E8F0", fontSize: "13px", fontWeight: 500 } }, r.requirement_name),
      r.statutory_basis && /* @__PURE__ */ React.createElement("div", { style: { color: "#94A3B8", fontSize: "11px", marginTop: "2px" } }, r.statutory_basis),
      r.effective_from && /* @__PURE__ */ React.createElement("div", { style: { color: "#64748B", fontSize: "11px", marginTop: "4px" } }, "Effective: " + new Date(r.effective_from).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))
    )));
  }
  function ResearchPanel() {
    const [tab, setTab] = useState("provisions");
    const [search, setSearch] = useState("");
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
          const path = tab === "provisions" ? "/rest/v1/kl_provisions?select=provision_id,title,instrument_id,section_num,in_force,is_era_2025&order=instrument_id&limit=50" : "/rest/v1/kl_cases?select=case_id,name,citation,court,year,principle&order=year.desc&limit=50";
          const resp = await fetch(SUPABASE_URL + path, {
            headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY }
          });
          const d = await resp.json();
          if (cancelled) return;
          setData(Array.isArray(d) ? d : []);
        } catch (e) {
          console.error("Research load failed:", e);
          if (!cancelled) setData([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [tab]);
    const filtered = data.filter((item) => {
      if (!search) return true;
      const s = search.toLowerCase();
      if (tab === "provisions") {
        return (item.title || "").toLowerCase().includes(s) || (item.instrument_id || "").toLowerCase().includes(s);
      }
      return (item.name || "").toLowerCase().includes(s) || (item.citation || "").toLowerCase().includes(s);
    });
    const tabs = [
      { id: "provisions", label: "Provisions (391)" },
      { id: "cases", label: "Cases (240)" }
    ];
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "10px" } }, tabs.map((t) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: t.id,
        type: "button",
        onClick: () => {
          setTab(t.id);
          setSearch("");
        },
        style: {
          flex: 1,
          padding: "6px",
          borderRadius: "6px",
          fontSize: "12px",
          cursor: "pointer",
          fontFamily: "inherit",
          border: tab === t.id ? "1px solid #0EA5E9" : "1px solid rgba(255,255,255,0.1)",
          background: tab === t.id ? "rgba(14,165,233,0.1)" : "transparent",
          color: tab === t.id ? "#0EA5E9" : "#94A3B8",
          fontWeight: tab === t.id ? 600 : 400
        }
      },
      t.label
    ))), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Search " + tab + "\u2026",
        value: search,
        onChange: (e) => setSearch(e.target.value),
        style: {
          width: "100%",
          padding: "8px 12px",
          borderRadius: "6px",
          fontSize: "13px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.03)",
          color: "#E2E8F0",
          marginBottom: "10px",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit"
        }
      }
    ), loading ? /* @__PURE__ */ React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "12px" } }, "Loading\u2026") : filtered.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No results.") : filtered.slice(0, 30).map((item) => {
      if (tab === "provisions") {
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: item.provision_id,
            style: {
              padding: "8px",
              marginBottom: "4px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)"
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500 } }, item.title),
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", marginTop: "3px", flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#0EA5E9", fontSize: "11px" } }, (item.instrument_id || "") + (item.section_num ? " s." + item.section_num : "")), item.is_era_2025 && /* @__PURE__ */ React.createElement("span", { style: {
            color: "#F59E0B",
            fontSize: "10px",
            padding: "1px 5px",
            borderRadius: "3px",
            background: "rgba(245,158,11,0.1)"
          } }, "ERA 2025"), /* @__PURE__ */ React.createElement("span", { style: { color: item.in_force ? "#10B981" : "#94A3B8", fontSize: "10px" } }, item.in_force ? "In force" : "Not yet"))
        );
      }
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: item.case_id,
          style: {
            padding: "8px",
            marginBottom: "4px",
            borderRadius: "6px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500 } }, item.name),
        /* @__PURE__ */ React.createElement("div", { style: { color: "#94A3B8", fontSize: "11px", marginTop: "2px" } }, [item.citation, item.court, item.year].filter(Boolean).join(" \xB7 ")),
        item.principle && /* @__PURE__ */ React.createElement("div", { style: { color: "#64748B", fontSize: "11px", marginTop: "3px", lineHeight: 1.4 } }, item.principle.length > 120 ? item.principle.slice(0, 120) + "\u2026" : item.principle)
      );
    }));
  }
  var PLACEHOLDER_DESCRIPTIONS = {
    documents: "Create structured documents with watermarks, disclaimers, and export controls.",
    eileen: "Context-aware Eileen chat with Vault and Calendar integration.",
    planner: "Six-step contract planning workflow with gap analysis and compliance mapping."
  };
  function PlaceholderPanel({ panelId }) {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-placeholder-panel" }, /* @__PURE__ */ React.createElement("div", { className: "kl-placeholder-icon", "aria-hidden": "true" }, "\u2699"), /* @__PURE__ */ React.createElement("div", { className: "kl-placeholder-title" }, "Coming soon"), /* @__PURE__ */ React.createElement("p", { className: "kl-placeholder-body" }, PLACEHOLDER_DESCRIPTIONS[panelId] || "This panel is under development."));
  }
  var PANEL_LABELS = {
    vault: "Document Vault",
    notes: "Notes",
    documents: "Documents",
    clipboard: "Clipboard",
    calendar: "Calendar",
    eileen: "Eileen",
    research: "Research",
    planner: "Contract Planner"
  };
  var PANEL_COMPONENTS = {
    vault: VaultPanel,
    notes: NotesPanel,
    clipboard: ClipboardPanel,
    calendar: CalendarPanel,
    research: ResearchPanel
  };
  function PanelDrawer({ panelId, onClose }) {
    if (!panelId) return null;
    const PanelContent = PANEL_COMPONENTS[panelId] || PlaceholderPanel;
    const label = PANEL_LABELS[panelId] || panelId;
    return /* @__PURE__ */ React.createElement("div", { className: "kl-panel-drawer", role: "dialog", "aria-label": label }, /* @__PURE__ */ React.createElement("div", { className: "kl-panel-drawer-header" }, /* @__PURE__ */ React.createElement("span", { className: "kl-panel-drawer-title" }, label), /* @__PURE__ */ React.createElement("button", { className: "kl-panel-drawer-close", onClick: onClose, "aria-label": "Close panel" }, "\u2715")), /* @__PURE__ */ React.createElement("div", { className: "kl-panel-drawer-body" }, /* @__PURE__ */ React.createElement(PanelContent, { panelId })));
  }
  function AdvisoryBanner() {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-advisory" }, /* @__PURE__ */ React.createElement("p", null, "This is regulatory intelligence. It does not constitute legal advice. AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720)"));
  }
  var UPSELL_CONFIG = {
    kl_quick_session: {
      threshold: 20,
      title: "Need more time?",
      message: "Your Quick Session ends in less than 20 minutes. Upgrade to a Day Pass for 24 hours of full access \u2014 including 2 compliance checks.",
      cta: "Upgrade to Day Pass \u2014 \xA349",
      href: "/kl-access/?product=kl_day_pass"
    },
    kl_day_pass: {
      threshold: 60,
      title: "Extend your research",
      message: "Your Day Pass expires in under an hour. A Research Week gives you 7 full days and 3 compliance checks included.",
      cta: "Upgrade to Research Week \u2014 \xA399",
      href: "/kl-access/?product=kl_research_week"
    },
    kl_research_week: {
      threshold: 1440,
      title: "Ready for continuous monitoring?",
      message: "Your Research Week ends tomorrow. Operational subscribers get 5 monitored contracts with auto-rescan, alerts, and ongoing Eileen access.",
      cta: "Explore Operational \u2014 \xA3199/mo",
      href: "/account/"
    }
  };
  function UpsellCard({ productType, minutesRemaining, onDismiss }) {
    const c = UPSELL_CONFIG[productType];
    if (!c) return null;
    if (minutesRemaining == null || minutesRemaining <= 0 || minutesRemaining > c.threshold) return null;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "complementary",
        "aria-label": "Session upgrade prompt",
        style: {
          position: "fixed",
          bottom: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "440px",
          width: "90%",
          padding: "16px 20px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(14,165,233,0.04) 100%)",
          border: "1px solid rgba(14,165,233,0.25)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 1e3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          fontFamily: "'DM Sans', sans-serif"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#0EA5E9", fontSize: "14px", fontWeight: 600, marginBottom: "6px" } }, c.title), /* @__PURE__ */ React.createElement("div", { style: { color: "#CBD5E1", fontSize: "13px", lineHeight: 1.5 } }, c.message)), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: onDismiss,
          "aria-label": "Dismiss upgrade prompt",
          style: {
            background: "none",
            border: "none",
            color: "#64748B",
            fontSize: "18px",
            cursor: "pointer",
            padding: "0 0 0 12px",
            lineHeight: 1
          }
        },
        "\xD7"
      )),
      /* @__PURE__ */ React.createElement("div", { style: { marginTop: "12px" } }, /* @__PURE__ */ React.createElement(
        "a",
        {
          href: c.href,
          style: {
            display: "inline-block",
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            background: "#0EA5E9",
            color: "#FFFFFF",
            textDecoration: "none",
            cursor: "pointer"
          }
        },
        c.cta
      ))
    );
  }
  function App() {
    const [messages, setMessages] = useState([]);
    const [sessionId, setSessionId] = useState(() => "eileen-" + Date.now() + "-" + Math.random().toString(36).substr(2, 7));
    const [sessionHistory, setSessionHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === "undefined" ? true : window.innerWidth > 768);
    const [activePanel, setActivePanel] = useState(null);
    const [accessType, setAccessType] = useState(window.__klAccessType || null);
    const [tier, setTier] = useState(window.__klTier || window.__klProductType || null);
    const [sessionExpiresAt, setSessionExpiresAt] = useState(window.__klSessionExpiry || null);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [minutesRemaining, setMinutesRemaining] = useState(null);
    const [upsellDismissed, setUpsellDismissed] = useState(false);
    const loadSessionHistory = useCallback(async function() {
      if (!window.__klToken || !window.__klUserId) return;
      try {
        const resp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_eileen_conversations?user_id=eq." + window.__klUserId + "&select=session_id,user_message,created_at&order=created_at.desc&limit=100",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        );
        const data = await resp.json();
        if (!Array.isArray(data)) return;
        const grouped = {};
        data.forEach((row) => {
          if (!grouped[row.session_id]) {
            grouped[row.session_id] = {
              sessionId: row.session_id,
              title: row.user_message ? row.user_message.substring(0, 50) : "(untitled)",
              lastActivity: row.created_at
            };
          }
        });
        setSessionHistory(Object.values(grouped).slice(0, 50));
      } catch (err) {
        console.error("Failed to load session history:", err);
      }
    }, []);
    useEffect(() => {
      function onReady(e) {
        setAccessType(e.detail.accessType);
        setTier(e.detail.tier);
        setSessionExpiresAt(window.__klSessionExpiry || null);
        loadSessionHistory();
      }
      window.addEventListener("ailane-kl-ready", onReady);
      if (window.__klAccessType) {
        loadSessionHistory();
      }
      return () => window.removeEventListener("ailane-kl-ready", onReady);
    }, [loadSessionHistory]);
    useEffect(() => {
      function onResize() {
        if (window.innerWidth <= 768) {
          setSidebarOpen(false);
        }
      }
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, []);
    useEffect(() => {
      const el = document.getElementById("kl-root");
      if (el) el.classList.toggle("sidebar-collapsed", !sidebarOpen);
    }, [sidebarOpen]);
    useEffect(() => {
      const el = document.getElementById("kl-root");
      if (el) el.classList.toggle("drawer-open", !!activePanel);
    }, [activePanel]);
    useEffect(() => {
      if (!sessionExpiresAt) {
        setMinutesRemaining(null);
        return void 0;
      }
      const expiresAt = new Date(sessionExpiresAt).getTime();
      if (isNaN(expiresAt)) return void 0;
      function update() {
        const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 6e4));
        setMinutesRemaining(diff);
      }
      update();
      const interval = setInterval(update, 6e4);
      return () => clearInterval(interval);
    }, [sessionExpiresAt]);
    async function loadSession(sid) {
      if (!window.__klToken) return;
      try {
        const resp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_eileen_conversations?session_id=eq." + sid + "&select=user_message,eileen_response,created_at&order=created_at.asc",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        );
        const data = await resp.json();
        if (!Array.isArray(data)) return;
        const msgs = [];
        data.forEach((row) => {
          msgs.push({ role: "user", content: row.user_message });
          msgs.push({ role: "assistant", content: row.eileen_response });
        });
        setMessages(msgs);
        setSessionId(sid);
      } catch (err) {
        console.error("Failed to load session:", err);
      }
    }
    function newChat() {
      setSessionId("eileen-" + Date.now() + "-" + Math.random().toString(36).substr(2, 7));
      setMessages([]);
    }
    async function sendMessage(text) {
      const clean = (text || "").trim();
      if (!clean || isLoading) return;
      setMessages((prev) => [...prev, { role: "user", content: clean }]);
      setIsLoading(true);
      try {
        const resp = await fetch(EILEEN_ENDPOINT, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + window.__klToken,
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            message: clean,
            session_id: sessionId,
            page_context: "knowledge-library"
          })
        });
        const data = await resp.json();
        if (data && data.response) {
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: data.response,
            provisionsCount: data.provisions_count,
            casesCount: data.cases_count
          }]);
          loadSessionHistory();
        } else {
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: "I wasn't able to process that request. Please try again.",
            isError: true
          }]);
        }
      } catch (err) {
        console.error("sendMessage error:", err);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "I wasn't able to process that request. Please try again.",
          isError: true
        }]);
      } finally {
        setIsLoading(false);
      }
    }
    function addMessage(msg) {
      setMessages((prev) => [...prev, msg]);
    }
    function updateFileMessage(msgId, updates) {
      setMessages((prev) => prev.map((m) => m.id === msgId ? Object.assign({}, m, updates) : m));
    }
    async function uploadFile(file, msgId) {
      const storagePath = window.__klUserId + "/" + Date.now() + "-" + file.name;
      let uploadOk = false;
      try {
        const uploadResp = await fetch(
          SUPABASE_URL + "/storage/v1/object/kl-document-vault/" + encodeURIComponent(storagePath),
          {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + window.__klToken,
              "apikey": SUPABASE_ANON_KEY,
              "Content-Type": file.type || "application/octet-stream",
              "x-upsert": "true"
            },
            body: file
          }
        );
        uploadOk = uploadResp.ok;
      } catch (err) {
        console.error("Storage upload failed:", err);
      }
      if (!uploadOk) {
        updateFileMessage(msgId, { status: "error" });
        addMessage({
          role: "assistant",
          content: "Upload failed. Please try again.",
          isLocal: true
        });
        return;
      }
      const isSubscription = window.__klAccessType === "subscription" || window.__klTier === "operational_readiness" || window.__klTier === "governance" || window.__klTier === "institutional";
      const docRecord = {
        user_id: window.__klUserId,
        filename: file.name,
        storage_path: storagePath,
        file_size_bytes: file.size,
        mime_type: file.type,
        extraction_status: "pending",
        analysis_status: "pending",
        session_only: !isSubscription,
        expires_at: isSubscription ? null : window.__klSessionExpiry || null
      };
      let documentId = null;
      try {
        const insertResp = await fetch(SUPABASE_URL + "/rest/v1/kl_vault_documents", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + window.__klToken,
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(docRecord)
        });
        if (insertResp.ok) {
          const insertedDocs = await insertResp.json();
          if (Array.isArray(insertedDocs) && insertedDocs[0] && insertedDocs[0].id) {
            documentId = insertedDocs[0].id;
          }
        }
      } catch (err) {
        console.error("Vault insert failed:", err);
      }
      if (!documentId) {
        updateFileMessage(msgId, { status: "error" });
        addMessage({
          role: "assistant",
          content: "Upload failed. Please try again.",
          isLocal: true
        });
        return;
      }
      updateFileMessage(msgId, { documentId, status: "extracting" });
      let extractResult = null;
      try {
        const extractResp = await fetch(
          SUPABASE_URL + "/functions/v1/kl_document_extract",
          {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + window.__klToken,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ document_id: documentId })
          }
        );
        if (extractResp.ok) {
          extractResult = await extractResp.json();
        }
      } catch (err) {
        console.error("Document extract failed:", err);
      }
      if (!extractResult || typeof extractResult.char_count !== "number") {
        updateFileMessage(msgId, { status: "error" });
        addMessage({
          role: "assistant",
          content: "Text extraction failed. The file may be image-only or password-protected.",
          isLocal: true
        });
        return;
      }
      updateFileMessage(msgId, { status: "ready", charCount: extractResult.char_count });
      addMessage({
        id: "ready-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        role: "assistant",
        content: "I have your contract \u2014 " + extractResult.char_count.toLocaleString() + " characters extracted and ready for analysis.",
        isLocal: true,
        analysisReady: true,
        documentId,
        analysisTriggered: false
      });
    }
    async function handleRunAnalysis(documentId, msgId) {
      setMessages(
        (prev) => prev.map((m) => m.id === msgId ? Object.assign({}, m, { analysisTriggered: true }) : m)
      );
      const loadingMsgId = "analysis-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      addMessage({
        id: loadingMsgId,
        role: "assistant",
        content: "Routing your contract through the compliance engine\u2026",
        isLocal: true,
        isAnalysisLoading: true
      });
      const phases = [
        { delay: 8e3, text: "Analysing against UK employment law requirements\u2026" },
        { delay: 2e4, text: "Checking statutory provisions and forward legislative exposure\u2026" },
        { delay: 4e4, text: "Compiling findings and scoring compliance position\u2026" }
      ];
      const phaseTimers = phases.map(
        (phase) => setTimeout(() => {
          setMessages(
            (prev) => prev.map((m) => m.id === loadingMsgId ? Object.assign({}, m, { content: phase.text }) : m)
          );
        }, phase.delay)
      );
      try {
        const token = window.__klToken;
        if (!token) throw new Error("Not authenticated");
        const response = await fetch(
          SUPABASE_URL + "/functions/v1/kl-compliance-bridge",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
              document_id: documentId,
              document_type: "employment_contract"
            })
          }
        );
        phaseTimers.forEach((t) => clearTimeout(t));
        const data = await response.json();
        if (!response.ok) {
          if (data && data.error === "check_limit_reached") {
            setMessages(
              (prev) => prev.map((m) => {
                if (m.id === loadingMsgId) {
                  return Object.assign({}, m, {
                    content: data.message || "You have used all bundled Contract Compliance Checks in this session. Additional checks are available at \xA315 each.",
                    isAnalysisLoading: false,
                    isLocal: true
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
          throw new Error(data && (data.error || data.detail) || "Analysis failed");
        }
        setMessages((prev) => {
          const withoutLoading = prev.filter((m) => m.id !== loadingMsgId);
          return withoutLoading.concat([{
            id: "result-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
            role: "assistant",
            content: "",
            isLocal: true,
            isAnalysisResult: true,
            analysisData: data
          }]);
        });
      } catch (err) {
        phaseTimers.forEach((t) => clearTimeout(t));
        console.error("handleRunAnalysis error:", err);
        setMessages(
          (prev) => prev.map((m) => {
            if (m.id === loadingMsgId) {
              return Object.assign({}, m, {
                content: "I was unable to complete the analysis. " + (err && err.message || "Please try again."),
                isAnalysisLoading: false,
                isLocal: true
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
      const parts = file.name.split(".");
      const ext = parts.length > 1 ? "." + parts[parts.length - 1].toLowerCase() : "";
      if (ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
        addMessage({
          role: "assistant",
          content: "I can accept PDF, DOCX, or TXT files up to 10MB. The file you selected (" + (ext || "unknown type") + ") is not a supported format.",
          isLocal: true
        });
        if (e.target && "value" in e.target) e.target.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        addMessage({
          role: "assistant",
          content: "That file is too large (" + (file.size / (1024 * 1024)).toFixed(1) + "MB). The maximum is 10MB.",
          isLocal: true
        });
        if (e.target && "value" in e.target) e.target.value = "";
        return;
      }
      const msgId = "upload-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      addMessage({
        id: msgId,
        role: "user",
        type: "file_upload",
        filename: file.name,
        fileSize: file.size,
        status: "uploading",
        documentId: null,
        charCount: null
      });
      uploadFile(file, msgId);
      if (e.target && "value" in e.target) e.target.value = "";
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      TopBar,
      {
        sidebarOpen,
        onToggleSidebar: () => setSidebarOpen(!sidebarOpen),
        accessType,
        tier,
        sessionExpiresAt,
        onSessionExpired: () => setSessionExpired(true)
      }
    ), /* @__PURE__ */ React.createElement(
      Sidebar,
      {
        open: sidebarOpen,
        sessionHistory,
        activeSessionId: sessionId,
        onSelectSession: (sid) => {
          loadSession(sid);
          if (window.innerWidth <= 768) setSidebarOpen(false);
        },
        onNewChat: () => {
          newChat();
          if (window.innerWidth <= 768) setSidebarOpen(false);
        },
        onCrownQuery: sendMessage
      }
    ), /* @__PURE__ */ React.createElement(
      ConversationArea,
      {
        messages,
        isLoading,
        onSend: sendMessage,
        accessType,
        tier,
        onFileSelect: handleFileSelect,
        onRunAnalysis: handleRunAnalysis
      }
    ), /* @__PURE__ */ React.createElement(
      PanelRail,
      {
        activePanel,
        onSelectPanel: setActivePanel,
        accessType,
        tier
      }
    ), /* @__PURE__ */ React.createElement(AdvisoryBanner, null), sidebarOpen && /* @__PURE__ */ React.createElement(MobileSidebarBackdrop, { onClick: () => setSidebarOpen(false) }), activePanel && /* @__PURE__ */ React.createElement(PanelDrawer, { panelId: activePanel, onClose: () => setActivePanel(null) }), !upsellDismissed && !sessionExpired && /* @__PURE__ */ React.createElement(
      UpsellCard,
      {
        productType: window.__klProductType || tier || "",
        minutesRemaining,
        onDismiss: () => setUpsellDismissed(true)
      }
    ), sessionExpired && /* @__PURE__ */ React.createElement(ExpiredModal, null));
  }
  window.initKLApp = function() {
    const container = document.getElementById("kl-root");
    if (!container) return;
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(App));
  };
  if (window.__klAccessType) {
    window.initKLApp();
  }
})();
