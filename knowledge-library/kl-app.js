var KLApp = (() => {
  // knowledge-library/kl-app.jsx
  var { useState, useEffect, useRef, useCallback } = React;
  var SUPABASE_URL = "https://cnbsxwtvazfvzmltkuvx.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g";
  var EILEEN_ENDPOINT = SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co") + "/functions/v1/eileen-intelligence";
  var INSTRUMENT_NAMES = {
    "ERA 1996": "Employment Rights Act 1996",
    "EqA 2010": "Equality Act 2010",
    "HSWA 1974": "Health and Safety at Work Act 1974",
    "NMWA 1998": "National Minimum Wage Act 1998",
    "TULRCA 1992": "Trade Union and Labour Relations (Consolidation) Act 1992",
    "ERA 2025": "Employment Rights Act 2025",
    "PIDA 1998": "Public Interest Disclosure Act 1998",
    "WTR 1998": "Working Time Regulations 1998",
    "MPL 1999": "Maternity and Parental Leave Regulations 1999",
    "TUPE 2006": "Transfer of Undertakings Regulations 2006",
    "ACAS Code 1": "ACAS Code of Practice on Disciplinary and Grievance",
    "FWR 2014": "Flexible Working Regulations 2014",
    "PTWR 2000": "Part-Time Workers Regulations 2000",
    "FTER 2002": "Fixed-Term Employees Regulations 2002",
    "AWR 2010": "Agency Workers Regulations 2010",
    "PAL 2002": "Paternity and Adoption Leave Regulations 2002",
    "SPL 2014": "Shared Parental Leave Regulations 2014",
    "MHSWR 1999": "Management of Health and Safety at Work Regulations 1999",
    "DPA 2018": "Data Protection Act 2018"
  };
  var DOMAINS = [
    {
      id: "dismissal",
      slug: "dismissal",
      name: "Dismissal and Disciplinary",
      orientation: "This area covers the law governing how employment relationships end and how employers must conduct disciplinary processes. It is the most litigated area of UK employment law.",
      eileenGreeting: "I\u2019m here to help with dismissal and disciplinary matters. What\u2019s your situation?",
      subAreas: [
        { name: "Unfair Dismissal", instruments: "ERA 1996 Part X, ERA 2025 ss.1\u20136", scope: "Qualifying service, automatically unfair reasons, day-one rights (ERA 2025), remedies and compensation." },
        { name: "Wrongful Dismissal", instruments: "ERA 1996 ss.86\u201391", scope: "Notice periods, breach of contract, payment in lieu of notice, garden leave." },
        { name: "Constructive Dismissal", instruments: "ERA 1996 s.95(1)(c)", scope: "Fundamental breach, last straw doctrine, resignation in response to breach." },
        { name: "Gross Misconduct", instruments: "ACAS Code of Practice 1", scope: "Definition, investigation requirements, suspension, right to be accompanied, appeal rights." },
        { name: "ACAS Disciplinary Code", instruments: "ACAS Code 1, ERA 1996 s.207A", scope: "Full Code requirements, tribunal uplift for non-compliance, step-by-step procedure." },
        { name: "Capability and Performance", instruments: "ACAS performance guidance", scope: "Performance improvement plans, capability procedures, reasonable adjustments." },
        { name: "Probationary Dismissals", instruments: "ERA 1996 Part X, ERA 2025 s.1", scope: "Probationary period rights, day-one protection changes, notice during probation." },
        { name: "Redundancy", instruments: "ERA 1996 Part XI, TULRCA 1992 s.188", scope: "Genuine redundancy, selection criteria, collective consultation, redundancy pay." }
      ]
    },
    {
      id: "discrimination",
      slug: "discrimination",
      name: "Discrimination and Harassment",
      orientation: "This area covers protection against unlawful discrimination, harassment, and victimisation in the workplace. It represents the largest concentration of case law in the Ailane intelligence estate.",
      eileenGreeting: "I\u2019m here to help with discrimination and harassment matters. What\u2019s your situation?",
      subAreas: [
        { name: "The Nine Protected Characteristics", instruments: "EqA 2010 s.4", scope: "Age, disability, gender reassignment, marriage/civil partnership, pregnancy/maternity, race, religion/belief, sex, sexual orientation." },
        { name: "Direct Discrimination", instruments: "EqA 2010 s.13", scope: "Less favourable treatment, comparator requirements, burden of proof, defences." },
        { name: "Indirect Discrimination", instruments: "EqA 2010 s.19", scope: "Provision, criterion or practice, particular disadvantage, justification defence." },
        { name: "Harassment", instruments: "EqA 2010 s.26, Worker Protection Act 2023", scope: "Unwanted conduct, third-party harassment (new employer duty), sexual harassment." },
        { name: "Victimisation", instruments: "EqA 2010 s.27", scope: "Protected acts, detriment, protection for complainants and witnesses." },
        { name: "Reasonable Adjustments", instruments: "EqA 2010 ss.20\u201322", scope: "Duty to adjust for disabled workers, substantial disadvantage, auxiliary aids." },
        { name: "Equal Pay", instruments: "EqA 2010 ss.64\u201380", scope: "Like work, work rated as equivalent, work of equal value, material factor defence." },
        { name: "EHRC Employment Code", instruments: "EHRC Statutory Code of Practice", scope: "Full Code guidance, employer liability, vicarious liability, reasonable steps defence." }
      ]
    },
    {
      id: "contracts",
      slug: "contracts",
      name: "Contracts and Terms",
      orientation: "This area covers the legal framework governing employment contracts, written terms, working time, and contractual rights.",
      eileenGreeting: "I\u2019m here to help with contracts and employment terms. What\u2019s your situation?",
      subAreas: [
        { name: "Written Statement of Particulars", instruments: "ERA 1996 ss.1\u201312", scope: "Day-one right, required content, changes to particulars, remedies for failure." },
        { name: "Express and Implied Terms", instruments: "Common law", scope: "Express terms, implied terms (mutual trust, duty of care, fidelity), custom and practice." },
        { name: "Variation of Contract", instruments: "ERA 1996 s.4", scope: "Lawful variation, agreement, fire and rehire restrictions (ERA 2025)." },
        { name: "Restrictive Covenants", instruments: "Common law, ERA 2025", scope: "Non-compete, non-solicitation, confidentiality, reasonableness test." },
        { name: "Working Time", instruments: "WTR 1998", scope: "48-hour week, opt-out, rest breaks, annual leave calculation (Brazel)." },
        { name: "Part-Time and Fixed-Term Rights", instruments: "PTWR 2000, FTER 2002", scope: "Less favourable treatment, objective justification, successive fixed-term contracts." },
        { name: "Agency Worker Rights", instruments: "AWR 2010", scope: "12-week qualifying period, day-one rights, comparator assessment." },
        { name: "Flexible Working", instruments: "ERA 1996 s.80F, FWR 2014, ERA 2025", scope: "Day-one right (ERA 2025), application process, grounds for refusal." },
        { name: "Zero-Hours and Low-Hours", instruments: "ERA 2025", scope: "Guaranteed hours, reasonable notice of shifts, compensation for cancellations." },
        { name: "Holiday Pay Calculations", instruments: "WTR 1998 Reg.16, EqA 2010", scope: "Normal remuneration, 52-week reference, Brazel methodology, rolled-up holiday pay." }
      ]
    },
    {
      id: "family-leave",
      slug: "family-leave",
      name: "Family Leave and Pregnancy",
      orientation: "This area covers legal entitlements during pregnancy, maternity, paternity, adoption, and other family-related leave. One of the most active areas post-ERA 2025.",
      eileenGreeting: "I\u2019m here to help with family leave and pregnancy matters. What\u2019s your situation?",
      subAreas: [
        { name: "Maternity Leave and Pay", instruments: "MPL 1999, SMP Regs", scope: "OML, AML, statutory maternity pay, notification, KIT days, return to work." },
        { name: "Paternity Leave and Pay", instruments: "PAL 2002", scope: "Entitlement, notice, timing, statutory paternity pay." },
        { name: "Shared Parental Leave", instruments: "SPL Regs 2014", scope: "Eligibility, curtailment, notice of entitlement and intention." },
        { name: "Adoption Leave", instruments: "PAL 2002", scope: "Matching, notification, statutory adoption pay, overseas adoption." },
        { name: "Parental Leave (Unpaid)", instruments: "MPL 1999 Part III", scope: "18 weeks per child, qualifying conditions, postponement, default scheme." },
        { name: "Time Off for Dependants", instruments: "ERA 1996 s.57A", scope: "Reasonable time off, definition of dependant, no pay requirement." },
        { name: "Pregnancy Discrimination", instruments: "EqA 2010 s.18", scope: "Protected period, unfavourable treatment, no comparator required." },
        { name: "Redundancy During Pregnancy/Maternity", instruments: "Protection from Redundancy Act 2023, ERA 2025", scope: "Priority right to suitable alternative, extended protection period." },
        { name: "Neonatal Care Leave", instruments: "ERA 2025", scope: "New entitlement, qualifying conditions, duration, statutory neonatal care pay." }
      ]
    },
    {
      id: "transfers",
      slug: "transfers",
      name: "Business Transfers",
      orientation: "This area covers the Transfer of Undertakings regulations and the legal framework for business sales, outsourcing, and service provision changes.",
      eileenGreeting: "I\u2019m here to help with business transfers and TUPE. What\u2019s your situation?",
      subAreas: [
        { name: "What Constitutes a Transfer", instruments: "TUPE 2006 Reg.3", scope: "Relevant transfer, economic entity, service provision change, organised grouping." },
        { name: "Employee Rights on Transfer", instruments: "TUPE 2006 Reg.4", scope: "Automatic transfer of contracts, continuity, preservation of terms." },
        { name: "Information and Consultation", instruments: "TUPE 2006 Regs.13\u201316", scope: "Duty to inform/consult, long enough before transfer, compensation for failure." },
        { name: "ETO Reasons", instruments: "TUPE 2006 Reg.7", scope: "Economic/technical/organisational reasons, when dismissal may be fair." },
        { name: "Harmonisation Post-Transfer", instruments: "TUPE 2006 Reg.4(4)", scope: "Prohibition on varying terms by reason of transfer, one-year restriction." },
        { name: "Collective Redundancy in Transfer", instruments: "TULRCA 1992 s.188, TUPE 2006", scope: "Dual consultation requirements, interaction of obligations." },
        { name: "Outsourcing and Insourcing", instruments: "TUPE 2006 Reg.3(1)(b)", scope: "Service provision changes, activities ceasing and being carried on." }
      ]
    },
    {
      id: "health-safety",
      slug: "health-safety",
      name: "Health and Safety",
      orientation: "This area covers the employer\u2019s duty to provide a safe working environment and the regulatory enforcement framework. Ailane\u2019s estate includes 2,498 HSE prosecutions (\xA3462.7M in fines) and 30,543 enforcement notices.",
      eileenGreeting: "I\u2019m here to help with health and safety matters. What\u2019s your situation?",
      subAreas: [
        { name: "General Duties", instruments: "HSWA 1974 ss.2\u20139", scope: "Employer\u2019s general duty to employees (s.2), to non-employees (s.3), premises control (s.4)." },
        { name: "Risk Assessment", instruments: "MHSWR 1999 Reg.3", scope: "Suitable and sufficient assessment, significant findings, review and revision." },
        { name: "Display Screen Equipment", instruments: "DSE Regs 1992", scope: "Workstation assessment, eye tests, breaks, home/hybrid working DSE." },
        { name: "Workplace Stress", instruments: "HSWA 1974, MHSWR 1999, HSE Standards", scope: "Management standards (demands, control, support, relationships, role, change)." },
        { name: "Accident Reporting", instruments: "RIDDOR 2013", scope: "Reportable injuries, occupational diseases, dangerous occurrences, deadlines." },
        { name: "HSE Enforcement", instruments: "HSWA 1974 ss.21\u201325", scope: "Improvement notices, prohibition notices, prosecution, sentencing guidelines." },
        { name: "Safety Representatives", instruments: "SRSC Regs 1977, HSCER 1996", scope: "Appointment, functions, time off, employer consultation duty." },
        { name: "Right to Refuse Unsafe Work", instruments: "ERA 1996 s.44, HSWA 1974", scope: "Automatic unfair dismissal, detriment protection, reasonable belief." }
      ]
    },
    {
      id: "whistleblowing",
      slug: "whistleblowing",
      name: "Whistleblowing",
      orientation: "This area covers legal protection for workers who report wrongdoing. Users who arrive here are often in acute situations with immediate employment consequences.",
      eileenGreeting: "I\u2019m here to help with whistleblowing and protected disclosures. What\u2019s your situation?",
      subAreas: [
        { name: "Qualifying Disclosures", instruments: "ERA 1996 s.43B", scope: "Six categories: criminal offence, legal obligation failure, miscarriage of justice, H&S danger, environmental damage, concealment." },
        { name: "Protected Disclosures", instruments: "ERA 1996 ss.43C\u201343H", scope: "Disclosure to employer, legal adviser, Minister, prescribed person, wider disclosure." },
        { name: "Automatic Unfair Dismissal", instruments: "ERA 1996 s.103A", scope: "No qualifying service, no compensation cap, burden of proof, interim relief." },
        { name: "Detriment Short of Dismissal", instruments: "ERA 1996 s.47B", scope: "Acts or deliberate failures, co-worker liability, vicarious liability." },
        { name: "Prescribed Persons", instruments: "PI Disclosure (Prescribed Persons) Order", scope: "Full list of prescribed regulators, coverage, reporting routes." },
        { name: "NDAs and Confidentiality Clauses", instruments: "ERA 1996 s.43J", scope: "Void provisions, settlement agreements, clauses preventing protected disclosures." },
        { name: "Whistleblowing Policies", instruments: "ACAS workplace policies guide", scope: "Best practice policies, designated officers, investigation, protection." }
      ]
    },
    {
      id: "data-monitoring",
      slug: "data-monitoring",
      name: "Data and Monitoring",
      orientation: "This area covers data protection obligations in the employment relationship, including employee monitoring, subject access requests, and data retention.",
      eileenGreeting: "I\u2019m here to help with data protection and employee monitoring matters. What\u2019s your situation?",
      subAreas: [
        { name: "Employer GDPR Obligations", instruments: "UK GDPR, DPA 2018", scope: "Lawful bases for employee data, legitimate interests, privacy notices." },
        { name: "Lawful Bases for HR Processing", instruments: "UK GDPR Art.6, Art.9", scope: "Special category data (health, union, biometric), employment condition." },
        { name: "Data Protection Impact Assessments", instruments: "UK GDPR Art.35", scope: "When DPIAs required for HR systems, systematic monitoring, large-scale special category." },
        { name: "Employee Monitoring", instruments: "ICO Employment Practices Code", scope: "Email/internet, CCTV, telephone recording, covert monitoring, impact assessments." },
        { name: "Subject Access Requests", instruments: "UK GDPR Art.15", scope: "Right to access, one-month period, exemptions, redaction of third-party data." },
        { name: "Data Retention", instruments: "UK GDPR Art.5(1)(e)", scope: "Retention schedules, statutory minimums (tax, pension, H&S), destruction procedures." },
        { name: "International Data Transfers", instruments: "UK GDPR Art.44\u201349", scope: "Post-Brexit adequacy, standard contractual clauses, binding corporate rules." },
        { name: "Biometric Data", instruments: "UK GDPR Art.9, DPA 2018", scope: "Fingerprint/facial recognition clocking-in, explicit consent, DPIA, proportionality." }
      ]
    }
  ];
  function getRoute() {
    var hash = (window.location.hash || "").replace("#", "") || "/";
    if (hash.indexOf("/domain/") === 0) {
      var slug = hash.replace("/domain/", "");
      var domain = DOMAINS.find(function(d) {
        return d.slug === slug;
      });
      return domain ? { view: "domain", domain } : { view: "welcome" };
    }
    return { view: "welcome" };
  }
  var CONTRACT_INTENT_PATTERNS = [
    /\b(check|review|audit|analyse|analyze)\b.*\b(contract|document|policy|handbook)\b/i,
    /\b(contract|document|policy|handbook)\b.*\b(check|review|audit|analyse|analyze)\b/i,
    /\bupload\b.*\b(contract|document)\b/i,
    /\b(compliance|compliant)\b.*\b(check|review)\b/i,
    /\bcontract\s+compliance\b/i,
    /\bcheck\s+my\s+contract\b/i,
    /\breview\s+my\s+(contract|document)\b/i,
    /\bis\s+my\s+contract\s+(legal|compliant|ok|okay)\b/i
  ];
  function hasContractIntent(text) {
    return CONTRACT_INTENT_PATTERNS.some(function(pattern) {
      return pattern.test(text || "");
    });
  }
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
    var escaped = escapeHtml(text);
    var codeBlocks = [];
    escaped = escaped.replace(/```(?:[a-z]*)\n([\s\S]*?)```/gm, function(match, code) {
      var idx = codeBlocks.length;
      codeBlocks.push(`<pre style="background:#0F172A;border:1px solid #1E293B;border-radius:8px;padding:12px 16px;overflow-x:auto;margin:12px 0"><code style="font-family:'DM Mono',monospace;font-size:12px;color:#0EA5E9;line-height:1.6">` + code.trim() + "</code></pre>");
      return "\n%%CODEBLOCK_" + idx + "%%\n";
    });
    var tables = [];
    escaped = escaped.replace(/(\|.+\|\n\|[-:| ]+\|\n(?:\|.+\|\n?)+)/gm, function(match) {
      var idx = tables.length;
      var rows = match.trim().split("\n").filter(function(r) {
        return !r.match(/^\|[-:| ]+\|$/);
      });
      if (rows.length < 1) {
        tables.push(match);
        return "%%TABLE_" + idx + "%%";
      }
      var headerCells = rows[0].split("|").filter(function(c) {
        return c.trim();
      }).map(function(c) {
        return '<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #1E293B;color:#F1F5F9;font-weight:600;font-size:12px">' + c.trim() + "</th>";
      }).join("");
      var bodyRows = rows.slice(1).map(function(row) {
        var cells = row.split("|").filter(function(c) {
          return c.trim();
        }).map(function(c) {
          return '<td style="padding:8px 12px;border-bottom:1px solid #1E293B;color:#CBD5E1;font-size:13px">' + c.trim() + "</td>";
        }).join("");
        return "<tr>" + cells + "</tr>";
      }).join("");
      tables.push('<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;background:#0F172A;border-radius:8px;overflow:hidden"><thead><tr>' + headerCells + "</tr></thead><tbody>" + bodyRows + "</tbody></table></div>");
      return "\n%%TABLE_" + idx + "%%\n";
    });
    var withInline = escaped.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>").replace(/\*\*(.+?)\*\*/g, '<strong style="color:#F1F5F9">$1</strong>').replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>").replace(/`([^`]+)`/g, `<code style="background:#1E293B;padding:2px 6px;border-radius:4px;font-family:'DM Mono',monospace;font-size:12px;color:#0EA5E9">$1</code>`).replace(/\(([a-z][a-z0-9-]+)\s+(§|s\.)([^)]+)\)/gi, function(match, instId, prefix, sectionRef) {
      var lowerInstId = instId.toLowerCase();
      return '<span class="kl-ref-link" data-inst="' + escapeHtml(lowerInstId) + '" data-section="' + escapeHtml(prefix + sectionRef) + '" title="Open in Library: ' + escapeHtml(instId) + " " + escapeHtml(prefix + sectionRef) + '">' + escapeHtml(instId + " " + prefix + sectionRef) + "</span>";
    });
    var lines = withInline.split("\n");
    var out = [];
    var ulItems = [];
    var olItems = [];
    function flushUl() {
      if (ulItems.length) {
        out.push('<ul style="margin:12px 0;padding-left:24px;color:#CBD5E1;list-style:disc">' + ulItems.join("") + "</ul>");
        ulItems = [];
      }
    }
    function flushOl() {
      if (olItems.length) {
        out.push('<ol style="margin:12px 0;padding-left:24px;color:#CBD5E1">' + olItems.join("") + "</ol>");
        olItems = [];
      }
    }
    function flushLists() {
      flushUl();
      flushOl();
    }
    lines.forEach(function(line) {
      var trimmed = line.trim();
      var codeMatch = trimmed.match(/^%%CODEBLOCK_(\d+)%%$/);
      if (codeMatch) {
        flushLists();
        out.push(codeBlocks[parseInt(codeMatch[1])]);
        return;
      }
      var tableMatch = trimmed.match(/^%%TABLE_(\d+)%%$/);
      if (tableMatch) {
        flushLists();
        out.push(tables[parseInt(tableMatch[1])]);
        return;
      }
      var headerMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (headerMatch) {
        flushLists();
        var hLevel = headerMatch[1].length;
        if (hLevel === 2) out.push(`<h3 style="color:#F1F5F9;font-family:'DM Sans',sans-serif;font-size:16px;font-weight:600;margin:20px 0 10px">` + headerMatch[2] + "</h3>");
        else if (hLevel === 3) out.push(`<h4 style="color:#F1F5F9;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;margin:16px 0 8px">` + headerMatch[2] + "</h4>");
        else out.push(`<h4 style="color:#F1F5F9;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;margin:16px 0 8px">` + headerMatch[2] + "</h4>");
        return;
      }
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        flushLists();
        out.push('<hr style="border:none;border-top:1px solid #1E293B;margin:16px 0">');
        return;
      }
      if (trimmed.indexOf("&gt; ") === 0) {
        flushLists();
        var quoteContent = trimmed.substring(5);
        out.push('<blockquote style="border-left:3px solid #0EA5E9;padding:8px 16px;margin:12px 0;color:#CBD5E1;font-style:italic;background:#0F172A;border-radius:0 6px 6px 0">' + quoteContent + "</blockquote>");
        return;
      }
      var olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (olMatch) {
        flushUl();
        olItems.push('<li style="margin:4px 0;padding-left:4px">' + olMatch[2] + "</li>");
        return;
      }
      var ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (ulMatch) {
        flushOl();
        ulItems.push('<li style="margin:4px 0;padding-left:4px">' + ulMatch[1] + "</li>");
        return;
      }
      if (trimmed === "") {
        flushLists();
        return;
      }
      flushLists();
      out.push('<p style="margin:0 0 12px;line-height:1.7">' + line + "</p>");
    });
    flushLists();
    return out.join("");
  }
  var ACAS_PART_TITLES = {
    "Foreword": "About This Code",
    "Introduction": "What This Code Covers",
    "Keys to handling disciplinary situations in the workplace": "Handling Disciplinary Situations",
    "Keys to handling grievances in the workplace": "Handling Workplace Grievances",
    "Disciplinary situations": "When Disciplinary Action May Be Needed",
    "Grievance procedure": "How to Handle a Grievance",
    "Holding a meeting": "Conducting the Meeting",
    "Settlement agreements": "Using Settlement Agreements",
    "Flexible working": "Managing Flexible Working Requests",
    "Redundancy handling": "Managing Redundancy Fairly",
    "Bullying and harassment": "Addressing Bullying and Harassment",
    "Absence management": "Managing Employee Absence",
    "Whistleblowing": "Handling Whistleblowing Disclosures"
  };
  function humanisePartTitle(title, cat) {
    if (!title) return title;
    if (cat === "acas" || cat === "guidance") {
      return ACAS_PART_TITLES[title] || title;
    }
    return title;
  }
  if (typeof window !== "undefined") {
    window.__klFns = window.__klFns || {};
    window.__klFns["humanisePartTitle"] = humanisePartTitle;
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
  function classifyDate(dateStr) {
    var now = /* @__PURE__ */ new Date();
    var d = new Date(dateStr);
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    var weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    if (d >= today) return "Today";
    if (d >= yesterday) return "Yesterday";
    if (d >= weekAgo) return "This Week";
    return "Earlier";
  }
  function groupSessionsByTime(sessions) {
    var groups = {
      today: { label: "Today", items: [] },
      yesterday: { label: "Yesterday", items: [] },
      thisWeek: { label: "This Week", items: [] },
      earlier: { label: "Earlier", items: [] }
    };
    var groupKeyMap = { "Today": "today", "Yesterday": "yesterday", "This Week": "thisWeek", "Earlier": "earlier" };
    sessions.forEach(function(s) {
      var group = s.dateGroup || classifyDate(s.lastActivity);
      var key = groupKeyMap[group] || "earlier";
      groups[key].items.push(s);
    });
    return [groups.today, groups.yesterday, groups.thisWeek, groups.earlier].filter(function(g) {
      return g.items.length > 0;
    });
  }
  var CATEGORY_TITLES = {
    unfair_dismissal: "Unfair Dismissal",
    discrimination: "Discrimination",
    wages_deductions: "Wages and Deductions",
    working_time: "Working Time",
    whistleblowing: "Whistleblowing",
    health_safety: "Health and Safety",
    tupe: "Business Transfers (TUPE)",
    data_protection: "Data Protection",
    family_leave: "Family Leave",
    redundancy: "Redundancy",
    contractual: "Contract Terms",
    equal_pay: "Equal Pay"
  };
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
  function NexusCanvas({ tier, size, nexusState, prefersReducedMotion }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const stateRef = useRef(nexusState || "dormant");
    const lerpFromRef = useRef(null);
    const stateChangeTimeRef = useRef(0);
    const dataPulsesRef = useRef([]);
    const lastPulseSpawnRef = useRef(0);
    const renderedRef = useRef(null);
    useEffect(() => {
      const incoming = nexusState || "dormant";
      if (stateRef.current !== incoming) {
        if (renderedRef.current) lerpFromRef.current = Object.assign({}, renderedRef.current);
        stateRef.current = incoming;
        stateChangeTimeRef.current = performance.now();
        if (incoming !== "processing") dataPulsesRef.current = [];
      }
    }, [nexusState]);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const canvasSize = size || 280;
      canvas.width = canvasSize * dpr;
      canvas.height = canvasSize * dpr;
      canvas.style.width = canvasSize + "px";
      canvas.style.height = canvasSize + "px";
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      const [colorA, colorB] = tierPalette(tier);
      const cx = canvasSize / 2;
      const cy = canvasSize / 2;
      const sc = canvasSize / 280;
      const nodes = [];
      const rings = [
        { count: 6, radius: 28 * sc },
        { count: 8, radius: 68 * sc },
        { count: 10, radius: 110 * sc }
      ];
      rings.forEach(function(ring, ri) {
        for (var i2 = 0; i2 < ring.count; i2++) {
          var angle = i2 / ring.count * Math.PI * 2 + ri * 0.4;
          nodes.push({
            baseAngle: angle,
            radius: ring.radius,
            baseX: cx + Math.cos(angle) * ring.radius,
            baseY: cy + Math.sin(angle) * ring.radius,
            phase: Math.random() * Math.PI * 2,
            ring: ri
          });
        }
      });
      var allConns = [];
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var dx = nodes[i].baseX - nodes[j].baseX;
          var dy = nodes[i].baseY - nodes[j].baseY;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100 * sc) allConns.push({ a: i, b: j, dist: d });
        }
      }
      allConns.sort(function(a, b) {
        return a.dist - b.dist;
      });
      var CONFIGS = {
        dormant: { nOp: 0.3, cPct: 0.3, cOp: 0.15, pMin: 0.97, pMax: 1.03, pCyc: 4e3, orb: 0.3 },
        ready: { nOp: 0.6, cPct: 0.5, cOp: 0.3, pMin: 0.95, pMax: 1.05, pCyc: 2500, orb: 0.5 },
        processing: { nOp: 1, cPct: 0.8, cOp: 0.5, pMin: 0.9, pMax: 1.1, pCyc: 1500, orb: 1 },
        presenting: { nOp: 1, cPct: 1, cOp: 0.7, pMin: 1, pMax: 1.05, pCyc: 600, orb: 0.5 }
      };
      function lv(a, b, t) {
        return a + (b - a) * t;
      }
      var initCfg = CONFIGS[stateRef.current] || CONFIGS.dormant;
      var rd = { nOp: initCfg.nOp, cPct: initCfg.cPct, cOp: initCfg.cOp, pMin: initCfg.pMin, pMax: initCfg.pMax, pCyc: initCfg.pCyc, orb: initCfg.orb };
      if (!lerpFromRef.current) lerpFromRef.current = Object.assign({}, rd);
      renderedRef.current = Object.assign({}, rd);
      var start = performance.now();
      if (!stateChangeTimeRef.current) stateChangeTimeRef.current = start;
      function draw(now) {
        var t = (now - start) / 1e3;
        var curState = stateRef.current;
        var tgt = CONFIGS[curState] || CONFIGS.dormant;
        var from = lerpFromRef.current;
        var elapsed = now - stateChangeTimeRef.current;
        var lt = Math.min(1, elapsed / 300);
        rd.nOp = lv(from.nOp, tgt.nOp, lt);
        rd.cPct = lv(from.cPct, tgt.cPct, lt);
        rd.cOp = lv(from.cOp, tgt.cOp, lt);
        rd.pMin = lv(from.pMin, tgt.pMin, lt);
        rd.pMax = lv(from.pMax, tgt.pMax, lt);
        rd.pCyc = lv(from.pCyc, tgt.pCyc, lt);
        rd.orb = lv(from.orb, tgt.orb, lt);
        if (lt >= 1) lerpFromRef.current = Object.assign({}, rd);
        renderedRef.current = Object.assign({}, rd);
        ctx.clearRect(0, 0, canvasSize, canvasSize);
        if (prefersReducedMotion) {
          var scc = Math.floor(allConns.length * rd.cPct);
          ctx.lineWidth = 1;
          for (var ci = 0; ci < scc; ci++) {
            var cn = allConns[ci];
            ctx.strokeStyle = "rgba(14,165,233," + rd.cOp.toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(nodes[cn.a].baseX, nodes[cn.a].baseY);
            ctx.lineTo(nodes[cn.b].baseX, nodes[cn.b].baseY);
            ctx.stroke();
          }
          nodes.forEach(function(n2) {
            var color = n2.ring === 0 ? colorA : n2.ring === 2 ? colorB : colorA;
            ctx.beginPath();
            ctx.arc(n2.baseX, n2.baseY, 3 * sc, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = rd.nOp;
            ctx.fill();
            ctx.globalAlpha = 1;
          });
          rafRef.current = requestAnimationFrame(draw);
          return;
        }
        var orbitRad = rd.orb * Math.PI / 3;
        var pos = [];
        for (var ni = 0; ni < nodes.length; ni++) {
          var n = nodes[ni];
          pos.push({
            x: cx + Math.cos(n.baseAngle + t * orbitRad) * n.radius,
            y: cy + Math.sin(n.baseAngle + t * orbitRad) * n.radius
          });
        }
        var pPeriod = rd.pCyc / 1e3;
        var pPhase = pPeriod > 0 ? t % pPeriod / pPeriod * Math.PI * 2 : 0;
        var pFactor = rd.pMin + (rd.pMax - rd.pMin) * (0.5 + 0.5 * Math.sin(pPhase));
        var coreR = 14 * sc * pFactor;
        var coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        coreG.addColorStop(0, "rgba(14,165,233," + (0.12 * rd.nOp).toFixed(3) + ")");
        coreG.addColorStop(1, "rgba(14,165,233,0)");
        ctx.fillStyle = coreG;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
        var cc = Math.floor(allConns.length * rd.cPct);
        ctx.lineWidth = 1;
        for (var ci = 0; ci < cc; ci++) {
          var cn = allConns[ci];
          var distFactor = 1 - cn.dist / (100 * sc);
          var alpha = distFactor * rd.cOp;
          ctx.strokeStyle = "rgba(14,165,233," + alpha.toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(pos[cn.a].x, pos[cn.a].y);
          ctx.lineTo(pos[cn.b].x, pos[cn.b].y);
          ctx.stroke();
        }
        if (curState === "processing" && cc > 0) {
          if (now - lastPulseSpawnRef.current > 1e3) {
            lastPulseSpawnRef.current = now;
            var spawnCount = 2 + Math.floor(Math.random() * 2);
            for (var k = 0; k < spawnCount; k++) {
              dataPulsesRef.current.push({ ci: Math.floor(Math.random() * cc), st: now });
            }
          }
        }
        dataPulsesRef.current = dataPulsesRef.current.filter(function(p) {
          var prog = (now - p.st) / 800;
          if (prog > 1) return false;
          var cn2 = allConns[p.ci];
          if (!cn2) return false;
          var px = pos[cn2.a].x + (pos[cn2.b].x - pos[cn2.a].x) * prog;
          var py = pos[cn2.a].y + (pos[cn2.b].y - pos[cn2.a].y) * prog;
          var a = prog < 0.2 ? prog / 0.2 : prog > 0.8 ? (1 - prog) / 0.2 : 1;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1, 2 * sc), 0, Math.PI * 2);
          ctx.fillStyle = "rgba(14,165,233," + a.toFixed(3) + ")";
          ctx.fill();
          return true;
        });
        var flashM = 1;
        if (curState === "presenting" && elapsed < 600) {
          var ft = elapsed / 600;
          flashM = ft < 0.5 ? 1 + 0.4 * ft * 2 : 1 + 0.4 * (1 - (ft - 0.5) * 2);
        }
        nodes.forEach(function(n2, i2) {
          var p = pos[i2];
          var pulse = 0.5 + 0.5 * Math.sin(t * 2 + n2.phase);
          var r = (2 + pulse * 2.2) * sc;
          var color = n2.ring === 0 ? colorA : n2.ring === 2 ? colorB : i2 % 2 ? colorA : colorB;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * flashM, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = Math.min(1, rd.nOp * flashM);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
        rafRef.current = requestAnimationFrame(draw);
      }
      rafRef.current = requestAnimationFrame(draw);
      return function() {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [tier, size, prefersReducedMotion]);
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
  function EileenErrorMessage({ message, retryAction, retryLabel }) {
    return /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      gap: "12px",
      padding: "16px",
      background: "#0F172A",
      borderRadius: "12px",
      border: "1px solid #1E293B",
      margin: "8px 0",
      maxWidth: "520px"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      marginTop: "6px",
      background: "#F59E0B",
      boxShadow: "0 0 8px rgba(245,158,11,0.4)",
      flexShrink: 0
    } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", lineHeight: 1.6, margin: "0 0 8px" } }, message), retryAction && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: retryAction,
        style: {
          background: "transparent",
          border: "1px solid #334155",
          color: "#94A3B8",
          borderRadius: "6px",
          padding: "6px 14px",
          fontSize: "12px",
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer"
        }
      },
      retryLabel || "Try again"
    )));
  }
  function ContractUploadPrompt({ onUpload }) {
    return /* @__PURE__ */ React.createElement("div", { style: {
      background: "#0F172A",
      border: "1px solid #0EA5E9",
      borderRadius: "12px",
      padding: "20px",
      margin: "12px 0",
      maxWidth: "520px"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: "#0EA5E9",
      boxShadow: "0 0 8px rgba(14,165,233,0.5)"
    } }), /* @__PURE__ */ React.createElement("span", { style: { color: "#F1F5F9", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 } }, "Ready to check your contract")), /* @__PURE__ */ React.createElement("p", { style: { color: "#CBD5E1", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, margin: "0 0 16px" } }, "Upload your employment contract or HR document and Eileen will route it through the Contract Compliance Check engine for analysis against current UK employment legislation."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onUpload,
        style: {
          background: "#0EA5E9",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "13px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          cursor: "pointer"
        },
        onMouseEnter: function(e) {
          e.currentTarget.style.background = "#0284C7";
        },
        onMouseLeave: function(e) {
          e.currentTarget.style.background = "#0EA5E9";
        }
      },
      "Upload Document"
    ));
  }
  function QualifyingQuestion({ onSelect }) {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-eileen" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content" }, /* @__PURE__ */ React.createElement(EileenSenderLabel, null), /* @__PURE__ */ React.createElement("div", { className: "kl-msg-body", style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("p", null, "Before we begin \u2014 are you an employer or HR professional managing staff, or a worker with a question about your own employment?")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          onSelect("employer");
        },
        style: {
          padding: "8px 16px",
          borderRadius: "8px",
          background: "rgba(14, 165, 233, 0.1)",
          border: "1px solid rgba(14, 165, 233, 0.3)",
          color: "#0EA5E9",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.15s"
        },
        onMouseEnter: function(e) {
          e.currentTarget.style.background = "rgba(14, 165, 233, 0.2)";
        },
        onMouseLeave: function(e) {
          e.currentTarget.style.background = "rgba(14, 165, 233, 0.1)";
        }
      },
      "Employer / HR Professional"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          onSelect("worker");
        },
        style: {
          padding: "8px 16px",
          borderRadius: "8px",
          background: "rgba(139, 92, 246, 0.1)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          color: "#A78BFA",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.15s"
        },
        onMouseEnter: function(e) {
          e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)";
        },
        onMouseLeave: function(e) {
          e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
        }
      },
      "Worker"
    ))));
  }
  function TypingIndicator() {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-eileen" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content" }, /* @__PURE__ */ React.createElement(EileenSenderLabel, null), /* @__PURE__ */ React.createElement("div", { className: "kl-typing-dots", style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("span", { className: "kl-dot" }), /* @__PURE__ */ React.createElement("span", { className: "kl-dot" }), /* @__PURE__ */ React.createElement("span", { className: "kl-dot" }))));
  }
  var ADVISOR_TIPS = {
    "dismissal": "Eileen can guide you through unfair dismissal rights, disciplinary procedures, and the ACAS Code. This is the most litigated area of UK employment law.",
    "discrimination": "Eileen covers all nine protected characteristics, the EHRC Code, harassment obligations including the new Worker Protection Act 2023, and equal pay.",
    "contracts": "Eileen can analyse your contract terms against current legislation \u2014 including the new flexible working and zero-hours provisions under ERA 2025.",
    "family-leave": "Eileen covers maternity, paternity, shared parental leave, and the new neonatal care leave under ERA 2025. One of the most active areas of legislative change.",
    "transfers": "Eileen can explain TUPE transfer obligations, employee consultation requirements, and the interaction with collective redundancy law.",
    "health-safety": "Eileen draws on 2,498 HSE prosecution records and 30,543 enforcement notices to contextualise your health and safety obligations.",
    "whistleblowing": "Eileen covers qualifying disclosures, protected disclosure routes, and the employment protections for workers who raise concerns.",
    "data-monitoring": "Eileen can guide you through employer GDPR obligations, employee monitoring rules, and subject access request handling."
  };
  function FloatingNexusAdvisor({ nearDomain, nexusState, prefersReducedMotion, onProximityDomain }) {
    var _show = useState(false);
    var showTooltip = _show[0];
    var setShowTooltip = _show[1];
    var tip = nearDomain ? ADVISOR_TIPS[nearDomain] : null;
    useEffect(function() {
      if (tip) {
        setShowTooltip(true);
      } else {
        var t = setTimeout(function() {
          setShowTooltip(false);
        }, 300);
        return function() {
          clearTimeout(t);
        };
      }
    }, [tip]);
    var _pos = useState({ x: null, y: null });
    var pos = _pos[0];
    var setPos = _pos[1];
    var dragging = useRef(false);
    var dragOffset = useRef({ x: 0, y: 0 });
    var lastProximityCheck = useRef(0);
    function checkProximity(currentX, currentY) {
      var nowTs = Date.now();
      if (nowTs - lastProximityCheck.current < 100) return;
      lastProximityCheck.current = nowTs;
      var elements = document.querySelectorAll("[data-domain-slug], [data-feed-id], [data-calendar-id]");
      var closest = null;
      var closestDist = Infinity;
      elements.forEach(function(el) {
        var rect = el.getBoundingClientRect();
        var cx = (rect.left + rect.right) / 2;
        var cy = (rect.top + rect.bottom) / 2;
        var dist = Math.sqrt(Math.pow(currentX - cx, 2) + Math.pow(currentY - cy, 2));
        if (dist < 120 && dist < closestDist) {
          closestDist = dist;
          closest = el.dataset.domainSlug || null;
        }
      });
      if (typeof onProximityDomain === "function") onProximityDomain(closest);
    }
    function handleMouseDown(e) {
      dragging.current = true;
      var rect = e.currentTarget.getBoundingClientRect();
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      e.preventDefault();
    }
    function handleTouchStart(e) {
      dragging.current = true;
      var touch = e.touches[0];
      var rect = e.currentTarget.getBoundingClientRect();
      dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    useEffect(function() {
      function handleMouseMove(e) {
        if (!dragging.current) return;
        var x = Math.max(0, Math.min(window.innerWidth - 52, e.clientX - dragOffset.current.x));
        var y = Math.max(0, Math.min(window.innerHeight - 52, e.clientY - dragOffset.current.y));
        setPos({ x, y });
        checkProximity(e.clientX, e.clientY);
      }
      function handleMouseUp() {
        dragging.current = false;
      }
      function handleTouchMove(e) {
        if (!dragging.current) return;
        var touch = e.touches[0];
        var x = Math.max(0, Math.min(window.innerWidth - 52, touch.clientX - dragOffset.current.x));
        var y = Math.max(0, Math.min(window.innerHeight - 52, touch.clientY - dragOffset.current.y));
        setPos({ x, y });
        checkProximity(touch.clientX, touch.clientY);
        if (e.cancelable) e.preventDefault();
      }
      function handleTouchEnd() {
        dragging.current = false;
      }
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      return function() {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }, []);
    var posStyle = pos.x !== null ? {
      position: "fixed",
      left: pos.x + "px",
      top: pos.y + "px",
      zIndex: 1e3,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "8px"
    } : {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: 1e3,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "8px"
    };
    return React.createElement(
      "div",
      { style: posStyle },
      // Advisor tooltip
      showTooltip && tip ? React.createElement(
        "div",
        {
          style: {
            background: "#0F172A",
            border: "1px solid #1E293B",
            borderRadius: "12px",
            padding: "14px 18px",
            maxWidth: "300px",
            opacity: tip ? 1 : 0,
            transform: tip ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.3s, transform 0.3s",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
          }
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } },
          React.createElement(NexusCanvas, { size: 16, nexusState: "ready", tier: "kl", prefersReducedMotion }),
          React.createElement("span", { style: { color: "#0EA5E9", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 } }, "Eileen")
        ),
        React.createElement("p", { style: { color: "#CBD5E1", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, margin: 0 } }, tip)
      ) : null,
      // Nexus orb (draggable)
      React.createElement(
        "div",
        {
          onMouseDown: handleMouseDown,
          onTouchStart: handleTouchStart,
          role: "button",
          "aria-label": "Drag Eileen",
          style: {
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: dragging.current ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
            boxShadow: "0 0 " + (nearDomain ? "16" : "8") + "px rgba(14,165,233," + (nearDomain ? "0.3" : "0.15") + ")",
            transition: "box-shadow 0.3s"
          }
        },
        React.createElement(NexusCanvas, {
          size: 52,
          nexusState: nearDomain ? "ready" : nexusState || "dormant",
          tier: "kl",
          prefersReducedMotion
        })
      )
    );
  }
  function NexusSendButton({ size, nexusState, disabled, onClick, prefersReducedMotion, tier }) {
    var s = size || 38;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick,
        disabled,
        style: {
          width: s + "px",
          height: s + "px",
          borderRadius: "50%",
          border: "none",
          background: disabled ? "transparent" : "#0EA5E9",
          padding: 0,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.3 : 1,
          transition: "opacity 0.2s, background 0.3s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden"
        },
        "aria-label": "Send message to Eileen"
      },
      /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, opacity: 0.4 } }, /* @__PURE__ */ React.createElement(
        NexusCanvas,
        {
          size: s,
          nexusState: disabled ? "dormant" : nexusState,
          tier: tier || "kl",
          prefersReducedMotion
        }
      )),
      /* @__PURE__ */ React.createElement(
        "svg",
        {
          width: Math.round(s * 0.45),
          height: Math.round(s * 0.45),
          viewBox: "0 0 24 24",
          fill: "none",
          style: { position: "relative", zIndex: 1 },
          "aria-hidden": "true"
        },
        /* @__PURE__ */ React.createElement(
          "path",
          {
            d: "M5 12h14M13 6l6 6-6 6",
            stroke: "#FFFFFF",
            strokeWidth: "2.5",
            strokeLinecap: "round",
            strokeLinejoin: "round"
          }
        )
      )
    );
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
    const [showCompliant, setShowCompliant] = useState(false);
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
    const scoreColor = score >= 65 ? "#22C55E" : score >= 30 ? "#F59E0B" : "#EF4444";
    const SEV_COLORS = {
      critical: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", text: "#EF4444", label: "Critical" },
      major: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", text: "#FBBF24", label: "Major" },
      minor: { bg: "rgba(234,179,8,0.06)", border: "rgba(234,179,8,0.2)", text: "#EAB308", label: "Minor" },
      compliant: { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.2)", text: "#22C55E", label: "Compliant" }
    };
    const severityOrder = { critical: 0, major: 1, minor: 2, compliant: 3 };
    const visibleFindings = findings.filter((f) => showCompliant || f.severity !== "compliant").slice().sort((a, b) => (severityOrder[a.severity] != null ? severityOrder[a.severity] : 4) - (severityOrder[b.severity] != null ? severityOrder[b.severity] : 4));
    const forwardNonCompliant = forwardFindings.filter((f) => f.severity !== "compliant");
    const compliantCount = findings.filter((f) => f.severity === "compliant").length;
    const findingsTotal = findings.length;
    const forwardTotal = forwardFindings.length;
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: "100%" } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          background: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(14,165,233,0.04))",
          border: "1px solid rgba(14,165,233,0.25)",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "16px"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px", color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif", marginBottom: "4px" } }, "Contract Compliance Score"),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: "28px", fontWeight: 700, color: scoreColor, fontFamily: "'DM Mono', monospace" } }, Math.round(score) + "%"),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px", fontFamily: "'DM Sans', sans-serif" } }, findingsTotal + " finding" + (findingsTotal === 1 ? "" : "s") + " \xB7 " + forwardTotal + " forward exposure item" + (forwardTotal === 1 ? "" : "s"))
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" } }, Object.entries(summary).map(function(entry) {
      var sev = entry[0];
      var count = entry[1];
      if (!count) return null;
      var colors = { critical: "#EF4444", major: "#F59E0B", minor: "#3B82F6", compliant: "#22C55E" };
      return React.createElement("span", {
        key: sev,
        style: {
          background: (colors[sev] || "#666") + "20",
          border: "1px solid " + (colors[sev] || "#666") + "40",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "12px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          color: colors[sev] || "#aaa"
        }
      }, count + " " + sev);
    })), status === "sparse_report" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#FBBF24", marginBottom: "12px" } }, "\u26A0\uFE0F Some requirements could not be assessed. Manual review recommended for gaps."), visibleFindings.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "14px", fontWeight: 700, color: "#22D3EE", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" } }, "Current Law Findings"), visibleFindings.map((finding, idx) => {
      const sev = SEV_COLORS[finding.severity] || SEV_COLORS.minor;
      const key = "c" + idx + "-" + finding.severity;
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
    }), compliantCount > 0 && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setShowCompliant(!showCompliant),
        style: {
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.5)",
          fontSize: "12px",
          cursor: "pointer",
          padding: "8px 0",
          fontFamily: "'DM Sans', sans-serif"
        }
      },
      showCompliant ? "Hide compliant items" : "Show " + compliantCount + " compliant item" + (compliantCount === 1 ? "" : "s")
    ), forwardNonCompliant.length > 0 && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          fontSize: "14px",
          fontWeight: 700,
          color: "#A855F7",
          marginTop: "20px",
          marginBottom: "8px",
          fontFamily: "'DM Sans', sans-serif"
        }
      },
      "Legislative Horizon \u2014 Forward Exposure"
    ), forwardNonCompliant.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#94A3B8", marginBottom: "10px" } }, "These findings relate to provisions of the Employment Rights Act 2025 not yet in force. They do not affect the current compliance position."), forwardNonCompliant.map((finding, idx) => {
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
    })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = "Generating PDF\u2026";
          try {
            const token = window.__klToken;
            if (!token) throw new Error("Not authenticated");
            const response = await fetch(
              SUPABASE_URL + "/functions/v1/generate-report-pdf",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer " + token,
                  "apikey": SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ upload_id: data.upload_id })
              }
            );
            if (!response.ok) throw new Error("PDF generation failed");
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Ailane-Compliance-Report.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            btn.textContent = "\u2713 Downloaded";
            btn.disabled = false;
            setTimeout(() => {
              btn.textContent = "\u{1F4C4} Download PDF Report";
            }, 2e3);
          } catch (err) {
            console.error("PDF download error:", err);
            btn.textContent = "\u274C Failed \u2014 try again";
            btn.disabled = false;
            setTimeout(() => {
              btn.textContent = "\u{1F4C4} Download PDF Report";
            }, 3e3);
          }
        },
        style: {
          background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(14,165,233,0.3)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }
      },
      "\u{1F4C4} Download PDF Report"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: async (e) => {
          var btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = "Saving\u2026";
          try {
            var token = window.__klToken;
            if (!token) throw new Error("Not authenticated");
            var docId = data.document_id;
            if (docId) {
              var resp = await fetch(
                SUPABASE_URL + "/rest/v1/kl_vault_documents?id=eq." + docId,
                {
                  method: "PATCH",
                  headers: {
                    "Authorization": "Bearer " + token,
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                  },
                  body: JSON.stringify({ analysis_status: "completed" })
                }
              );
              if (!resp.ok) throw new Error("Vault update failed (" + resp.status + ")");
            }
            btn.textContent = "\u2713 Saved to Vault";
            btn.style.background = "rgba(16,185,129,0.15)";
            btn.style.color = "#10B981";
            btn.style.borderColor = "rgba(16,185,129,0.3)";
          } catch (err) {
            console.error("Save to Vault error:", err);
            btn.textContent = "\u274C Failed \u2014 try again";
            btn.disabled = false;
            setTimeout(function() {
              btn.textContent = "\u{1F4BE} Save to Vault";
            }, 3e3);
          }
        },
        style: {
          background: "transparent",
          color: "#CBD5E1",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.15s"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.borderColor = "rgba(14,165,233,0.3)";
          e.currentTarget.style.color = "#0EA5E9";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          e.currentTarget.style.color = "#CBD5E1";
        }
      },
      "\u{1F4BE} Save to Vault"
    )), /* @__PURE__ */ React.createElement(
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
  var __eileenVoiceDisclosureShown = false;
  function selectEileenVoice() {
    try {
      var voices = window.speechSynthesis && window.speechSynthesis.getVoices() || [];
      if (!voices.length) return null;
      var fiona = voices.find(function(v) {
        return /fiona/i.test(v.name);
      });
      if (fiona) return fiona;
      var namedFemale = ["kate", "serena", "moira", "martha", "tessa"];
      for (var i = 0; i < namedFemale.length; i++) {
        var match = voices.find(function(v) {
          return new RegExp(namedFemale[i], "i").test(v.name);
        });
        if (match) return match;
      }
      var maleTokens = /(daniel|oliver|arthur|male|man)/i;
      var enGbFemale = voices.find(function(v) {
        return (v.lang === "en-GB" || /en[-_]gb/i.test(v.lang)) && !maleTokens.test(v.name);
      });
      if (enGbFemale) return enGbFemale;
      var enGb = voices.find(function(v) {
        return v.lang === "en-GB" || /en[-_]gb/i.test(v.lang);
      });
      if (enGb) return enGb;
      var en = voices.find(function(v) {
        return /^en/i.test(v.lang);
      });
      if (en) return en;
      return voices[0] || null;
    } catch (err) {
      return null;
    }
  }
  function stripMarkdownForSpeech(src) {
    if (!src) return "";
    var s = String(src);
    s = s.replace(/```[\s\S]*?```/g, " ");
    s = s.replace(/`([^`]+)`/g, "$1");
    s = s.replace(/^#{1,6}\s+/gm, "");
    s = s.replace(/^>\s+/gm, "");
    s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
    s = s.replace(/\*([^*]+)\*/g, "$1");
    s = s.replace(/__([^_]+)__/g, "$1");
    s = s.replace(/_([^_]+)_/g, "$1");
    s = s.replace(/~~([^~]+)~~/g, "$1");
    s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    s = s.replace(/^[\s]*[-*+]\s+/gm, "");
    s = s.replace(/^[\s]*\d+\.\s+/gm, "");
    s = s.replace(/<[^>]+>/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }
  function ReadAloudButton({ text }) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    useEffect(function() {
      return function() {
        try {
          if (isSpeaking && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
        } catch (e) {
        }
      };
    }, []);
    function handleClick() {
      if (!window.speechSynthesis) return;
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      var clean = stripMarkdownForSpeech(text);
      if (!clean) return;
      window.speechSynthesis.cancel();
      var utt = new SpeechSynthesisUtterance(clean);
      var voice = selectEileenVoice();
      if (voice) utt.voice = voice;
      utt.lang = voice && voice.lang || "en-GB";
      utt.pitch = 1.15;
      utt.rate = 0.92;
      utt.volume = 0.9;
      utt.onend = function() {
        setIsSpeaking(false);
      };
      utt.onerror = function() {
        setIsSpeaking(false);
      };
      setIsSpeaking(true);
      window.speechSynthesis.speak(utt);
      if (!__eileenVoiceDisclosureShown) {
        __eileenVoiceDisclosureShown = true;
        try {
          var toast = document.createElement("div");
          toast.textContent = "Eileen uses AI-generated voice technology";
          toast.style.cssText = "position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#1E293B;color:#F1F5F9;padding:10px 18px;border-radius:8px;font-size:12px;font-family:DM Sans,sans-serif;z-index:9999;border:1px solid #334155;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:1;transition:opacity 0.4s;";
          document.body.appendChild(toast);
          setTimeout(function() {
            toast.style.opacity = "0";
            setTimeout(function() {
              if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
          }, 3500);
        } catch (e) {
        }
      }
    }
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleClick,
        className: "kl-action-btn",
        title: isSpeaking ? "Stop reading" : "Read aloud",
        "aria-label": isSpeaking ? "Stop reading" : "Read response aloud"
      },
      isSpeaking ? "\u25A0 Stop" : "\u25B6 Read aloud"
    );
  }
  function UploadCompleteMessage({ filename, charCount, documentId, onRunAnalysis, onVaultOnly, dismissed, msgId, extractionFailed }) {
    if (dismissed) {
      return /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: "8px",
        padding: "10px 14px",
        background: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.25)",
        borderRadius: "8px",
        fontSize: "13px",
        color: "#10B981",
        fontFamily: "'DM Sans', sans-serif"
      } }, "\u2713 Saved to Document Vault");
    }
    var sizeLabel = extractionFailed ? "saved to vault (text extraction unavailable)" : charCount != null ? charCount.toLocaleString() + " characters extracted" : "ready";
    return /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.7 } }, "I have your contract", filename ? " \u2014 " + filename : "", " \u2014 ", sizeLabel, ". How would you like to proceed?"), extractionFailed && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#b08000", marginTop: "10px", marginBottom: "8px" } }, "Text extraction was not possible. The file is saved in your vault. To run a compliance check, try re-uploading as a text-based PDF."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" } }, !extractionFailed && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          if (typeof onRunAnalysis === "function") onRunAnalysis(documentId, msgId);
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
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
        onMouseEnter: function(e) {
          e.currentTarget.style.opacity = "0.9";
        },
        onMouseLeave: function(e) {
          e.currentTarget.style.opacity = "1";
        }
      },
      "\u2713 Run Compliance Check"
    ), extractionFailed && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: true,
        title: "Text extraction failed \\u2014 file saved to vault but cannot run compliance check",
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          background: "#334155",
          color: "#94A3B8",
          border: "none",
          borderRadius: "8px",
          cursor: "not-allowed",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          opacity: 0.6
        }
      },
      "Compliance Check Unavailable"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          if (typeof onVaultOnly === "function") onVaultOnly(msgId);
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          background: "transparent",
          color: "#CBD5E1",
          border: "1px solid #334155",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif",
          transition: "border-color 0.2s, color 0.2s"
        },
        onMouseEnter: function(e) {
          e.currentTarget.style.borderColor = "#64748B";
          e.currentTarget.style.color = "#F1F5F9";
        },
        onMouseLeave: function(e) {
          e.currentTarget.style.borderColor = "#334155";
          e.currentTarget.style.color = "#CBD5E1";
        }
      },
      "Save to Vault only"
    )));
  }
  function MessageBubble({ msg, onRunAnalysis, onVaultOnly }) {
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
    if (msg.isUploadComplete) {
      return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-eileen" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content", style: { position: "relative" } }, /* @__PURE__ */ React.createElement(EileenSenderLabel, null), /* @__PURE__ */ React.createElement(
        UploadCompleteMessage,
        {
          filename: msg.filename,
          charCount: msg.charCount,
          documentId: msg.documentId,
          msgId: msg.id,
          dismissed: !!msg.vaultOnly,
          extractionFailed: !!msg.extractionFailed,
          onRunAnalysis,
          onVaultOnly
        }
      )));
    }
    const hasStats = msg.provisionsCount != null || msg.casesCount != null;
    const renderAnalysisResult = msg.isAnalysisResult && msg.analysisData;
    const html = renderAnalysisResult ? "" : renderMarkdown(msg.content || "");
    function handleRunClick() {
      if (typeof onRunAnalysis === "function") {
        onRunAnalysis(msg.documentId, msg.id);
      }
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-eileen" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content", style: { position: "relative" } }, /* @__PURE__ */ React.createElement(EileenSenderLabel, null), msg.isAnalysisLoading && /* @__PURE__ */ React.createElement(
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
        className: "eileen-response-content",
        style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.7, marginTop: "8px" },
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
    ), msg.role === "assistant" && !msg.isAnalysisResult && !msg.isAnalysisLoading && !msg.isLocal && /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      gap: "2px",
      marginTop: "10px",
      paddingTop: "8px",
      borderTop: "1px solid rgba(255,255,255,0.06)"
    } }, /* @__PURE__ */ React.createElement(ReadAloudButton, { text: msg.content || "" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function(e) {
          var btn = e.currentTarget;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(msg.content || "").then(function() {
              var orig = btn.textContent;
              btn.textContent = "\u2713 Copied";
              setTimeout(function() {
                btn.textContent = orig;
              }, 1500);
            });
          }
        },
        className: "kl-action-btn",
        title: "Copy to clipboard"
      },
      "Copy"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function(e) {
          var btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = "Saving\u2026";
          var token = window.__klToken;
          var userId = window.__klUserId;
          if (!token || !userId) {
            btn.textContent = "Not signed in";
            btn.disabled = false;
            return;
          }
          var noteTitle = (msg.content || "").split("\n")[0].slice(0, 50) || "Eileen response";
          var now = /* @__PURE__ */ new Date();
          var dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
          var timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
          var attribution = "[Eileen \u2014 " + dateStr + " " + timeStr + "] " + noteTitle;
          fetch(SUPABASE_URL + "/rest/v1/kl_workspace_notes", {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + token,
              "apikey": SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify({
              user_id: userId,
              project_id: null,
              title: noteTitle,
              content_plain: msg.content || "",
              content_json: {},
              note_type: "eileen_response",
              source_attribution: attribution
            })
          }).then(function(resp) {
            if (resp.ok) {
              btn.textContent = "\u2713 Saved";
              btn.style.color = "#10B981";
              resp.json().then(function(data) {
                if (Array.isArray(data) && data[0] && typeof window.__klNotesRefresh === "function") {
                  window.__klNotesRefresh(data[0]);
                }
              }).catch(function() {
              });
              var toast = document.createElement("div");
              toast.textContent = "Saved to Saved Items";
              toast.style.cssText = "position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#10B981;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;font-family:DM Sans,sans-serif;z-index:9999;opacity:1;transition:opacity 0.3s;";
              document.body.appendChild(toast);
              setTimeout(function() {
                toast.style.opacity = "0";
                setTimeout(function() {
                  document.body.removeChild(toast);
                }, 300);
              }, 2e3);
            } else {
              btn.textContent = "Failed";
              btn.style.color = "#EF4444";
            }
            setTimeout(function() {
              btn.textContent = "Save";
              btn.style.color = "";
              btn.disabled = false;
            }, 2e3);
          }).catch(function() {
            btn.textContent = "Failed";
            setTimeout(function() {
              btn.textContent = "Save";
              btn.style.color = "";
              btn.disabled = false;
            }, 2e3);
          });
        },
        className: "kl-action-btn",
        title: "Save this response to Saved Items"
      },
      "Save"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          var text = msg.content || "";
          var safeTitle = text.split("\n")[0].slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, "") || "Eileen-response";
          var disclaimer = "\n\n---\nThis content was exported from the Ailane Knowledge Library. It constitutes regulatory intelligence, not legal advice. For legal advice, consult a qualified employment solicitor. AI Lane Limited \xB7 Company No. 17035654 \xB7 ICO Reg. 00013389720 \xB7 ailane.ai/terms/";
          var blob = new Blob([text + disclaimer], { type: "text/plain;charset=utf-8" });
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = safeTitle.replace(/\s+/g, "-") + ".txt";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        className: "kl-action-btn",
        title: "Download this response as a text file"
      },
      "Download"
    )), hasStats && /* @__PURE__ */ React.createElement("div", { className: "kl-msg-footer" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-stats" }, "Based on ", msg.provisionsCount || 0, " provision", msg.provisionsCount === 1 ? "" : "s", " and ", msg.casesCount || 0, " case", msg.casesCount === 1 ? "" : "s"))));
  }
  function MessageInput({ onSend, disabled, onFileSelect, pulseUpload, onInputChange, nexusState, tier, prefersReducedMotion }) {
    const [value, setValue] = useState("");
    const fileInputRef = useRef(null);
    const textInputRef = useRef(null);
    useEffect(function() {
      function onSeed(e) {
        var text = e && e.detail && e.detail.text;
        if (typeof text !== "string" || !text) return;
        setValue(text);
        if (typeof onInputChange === "function") onInputChange(text.trim().length);
        if (textInputRef.current) {
          try {
            textInputRef.current.focus();
          } catch (err) {
          }
        }
      }
      window.addEventListener("kl-seed-input", onSeed);
      return function() {
        window.removeEventListener("kl-seed-input", onSeed);
      };
    }, [onInputChange]);
    function handleChange(e) {
      var v = e.target.value;
      setValue(v);
      if (typeof onInputChange === "function") onInputChange(v.trim().length);
    }
    function submit() {
      const text = value.trim();
      if (!text || disabled) return;
      onSend(text);
      setValue("");
      if (typeof onInputChange === "function") onInputChange(0);
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
          flexShrink: 0,
          animation: pulseUpload ? "kl-pulse 1.5s ease-in-out 3" : "none"
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
        ref: textInputRef,
        className: "kl-input",
        type: "text",
        placeholder: "Ask Eileen anything about UK employment law...",
        "aria-label": "Message Eileen",
        value,
        onChange: handleChange,
        onKeyDown: onKey,
        disabled
      }
    ), /* @__PURE__ */ React.createElement(
      NexusSendButton,
      {
        size: 38,
        nexusState: nexusState || "dormant",
        disabled: disabled || !value.trim(),
        onClick: submit,
        prefersReducedMotion,
        tier: tier || window.__klTier || "kl"
      }
    ));
  }
  function ConversationArea({ messages, isLoading, onSend, tier, onFileSelect, onRunAnalysis, onVaultOnly, floatingNexusExpanded, onToggleFloatingNexus, showQualifier, onUserTypeSelect, pulseUpload, nexusState, prefersReducedMotion, onInputChange, nearDomain, onDomainHover, onDomainLeave }) {
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
      /* @__PURE__ */ React.createElement("div", { className: "kl-welcome-nexus" }, /* @__PURE__ */ React.createElement(NexusCanvas, { tier, nexusState, prefersReducedMotion })),
      /* @__PURE__ */ React.createElement("h1", { className: "kl-welcome-greeting" }, "What can I help you with today?"),
      /* @__PURE__ */ React.createElement("div", { className: "kl-eileen-subtitle", style: {
        fontSize: "12px",
        color: "#64748B",
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.06em",
        marginBottom: "24px",
        textAlign: "center"
      } }, "Eileen \xB7 UK Employment Law Intelligence"),
      /* @__PURE__ */ React.createElement("div", { className: "kl-welcome-input" }, /* @__PURE__ */ React.createElement(MessageInput, { onSend, disabled: isLoading, onFileSelect, pulseUpload, onInputChange, nexusState, tier, prefersReducedMotion })),
      /* @__PURE__ */ React.createElement(HorizonAlert, null),
      /* @__PURE__ */ React.createElement("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "16px",
        width: "100%",
        maxWidth: "820px"
      } }, DOMAINS.map(function(domain) {
        var navToDomain = function() {
          window.location.hash = "/domain/" + domain.slug;
        };
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: domain.id,
            "data-domain-slug": domain.slug,
            role: "button",
            tabIndex: 0,
            "aria-label": "Explore " + domain.name,
            onClick: navToDomain,
            onKeyDown: function(e) {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navToDomain();
              }
            },
            style: {
              background: "#111827",
              border: "1px solid #1E293B",
              borderLeft: "3px solid #1E293B",
              borderRadius: "12px",
              padding: "20px",
              cursor: "pointer",
              transition: "border-color 0.2s, border-left-color 0.2s"
            },
            onMouseEnter: function(e) {
              e.currentTarget.style.borderLeftColor = "#0EA5E9";
              if (typeof onDomainHover === "function") onDomainHover(domain.slug);
            },
            onMouseLeave: function(e) {
              e.currentTarget.style.borderLeftColor = "#1E293B";
              if (typeof onDomainLeave === "function") onDomainLeave();
            }
          },
          /* @__PURE__ */ React.createElement("h3", { style: {
            color: "#F1F5F9",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "16px",
            margin: "0 0 8px",
            fontWeight: 600
          } }, domain.name),
          /* @__PURE__ */ React.createElement("p", { style: {
            color: "#94A3B8",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            margin: "0 0 12px",
            lineHeight: 1.5
          } }, domain.orientation.substring(0, 100), "..."),
          /* @__PURE__ */ React.createElement("span", { style: {
            color: "#0EA5E9",
            fontSize: "12px",
            fontFamily: "'DM Sans', sans-serif"
          } }, "Explore \u2192")
        );
      })),
      /* @__PURE__ */ React.createElement(BookShelf, { onOpenBook: function(book) {
        if (typeof window.__klOpenPanel === "function") {
          window.__klOpenPanel("research");
          window.__klPendingInstrument = book.id;
          window.dispatchEvent(new CustomEvent("kl-open-instrument", { detail: { id: book.id } }));
        }
      } })
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
      /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        bottom: window.innerWidth <= 768 ? "100px" : "80px",
        right: "24px",
        zIndex: 30,
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 12px rgba(14,165,233,0.2)",
        pointerEvents: "none"
      } }, /* @__PURE__ */ React.createElement(NexusCanvas, { size: 52, nexusState, tier, prefersReducedMotion })),
      /* @__PURE__ */ React.createElement("div", { className: "kl-messages", ref: scrollRef, role: "log", "aria-live": "polite", onClick: function(e) {
        var target = e.target;
        if (target && target.classList && target.classList.contains("kl-ref-link")) {
          var instId = target.getAttribute("data-inst");
          if (instId && typeof window.__klOpenPanel === "function") {
            window.__klOpenPanel("research");
            window.__klPendingInstrument = instId;
            window.dispatchEvent(new CustomEvent("kl-open-instrument", { detail: { id: instId } }));
          }
        }
      } }, messages.map((m, i) => {
        if (m.role === "system_ui" && m.type === "contract_upload_prompt") {
          return /* @__PURE__ */ React.createElement(ContractUploadPrompt, { key: i, onUpload: function() {
            var fileInput = document.querySelector('.kl-conversation-input input[type="file"]') || document.querySelector('.kl-welcome-input input[type="file"]');
            if (fileInput) fileInput.click();
          } });
        }
        if (m.isError) {
          return /* @__PURE__ */ React.createElement(EileenErrorMessage, { key: i, message: m.errorMessage || m.content, retryAction: m.retryAction, retryLabel: m.retryLabel });
        }
        return /* @__PURE__ */ React.createElement(MessageBubble, { key: i, msg: m, onRunAnalysis, onVaultOnly });
      }), showQualifier && /* @__PURE__ */ React.createElement(QualifyingQuestion, { onSelect: onUserTypeSelect }), isLoading && /* @__PURE__ */ React.createElement(TypingIndicator, null)),
      /* @__PURE__ */ React.createElement("div", { className: "kl-conversation-input" }, /* @__PURE__ */ React.createElement(MessageInput, { onSend, disabled: isLoading, onFileSelect, pulseUpload, onInputChange, nexusState, tier, prefersReducedMotion }))
    ));
  }
  async function loadRegulatoryFeed() {
    if (!window.__klToken) return [];
    try {
      var now = /* @__PURE__ */ new Date();
      var past = new Date(now);
      past.setDate(past.getDate() - 90);
      var future = new Date(now);
      future.setDate(future.getDate() + 90);
      var resp = await fetch(
        SUPABASE_URL + "/rest/v1/regulatory_requirements?effective_from=gte." + past.toISOString().split("T")[0] + "&effective_from=lte." + future.toISOString().split("T")[0] + "&select=id,requirement_name,statutory_basis,effective_from,commencement_status,is_forward_requirement,source_act&order=effective_from.desc&limit=20",
        { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
      );
      var data = await resp.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("Regulatory feed failed:", e);
      return [];
    }
  }
  function RegulatoryFeedItem({ item, onDiscuss }) {
    var _exp = useState(false);
    var expanded = _exp[0];
    var setExpanded = _exp[1];
    var now = /* @__PURE__ */ new Date();
    var effectiveDate = new Date(item.effective_from);
    var isPast = effectiveDate <= now;
    var daysAway = Math.ceil((effectiveDate - now) / (1e3 * 60 * 60 * 24));
    var badgeColor = isPast ? "#10B981" : daysAway <= 30 ? "#EF4444" : "#D97706";
    var badgeText = isPast ? "In force" : daysAway + " days";
    return /* @__PURE__ */ React.createElement("div", { "data-feed-id": item.id, style: { padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: function() {
          setExpanded(!expanded);
        },
        style: { cursor: "pointer" },
        role: "button",
        tabIndex: 0,
        onKeyDown: function(e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        },
        "aria-expanded": expanded
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" } }, /* @__PURE__ */ React.createElement("span", { style: {
        fontSize: "10px",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        color: badgeColor,
        background: badgeColor + "15",
        padding: "2px 6px",
        borderRadius: "4px",
        whiteSpace: "nowrap"
      } }, badgeText), /* @__PURE__ */ React.createElement("span", { style: {
        color: "#E2E8F0",
        fontSize: "12px",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        flex: 1,
        minWidth: 0
      } }, item.requirement_name)),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#0EA5E9", fontSize: "10px", fontFamily: "'DM Mono', monospace" } }, item.source_act), /* @__PURE__ */ React.createElement("span", { style: { color: "#64748B", fontSize: "10px" } }, effectiveDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })))
    ), expanded && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.04)" } }, /* @__PURE__ */ React.createElement("p", { style: {
      color: "#CBD5E1",
      fontSize: "11px",
      fontFamily: "'DM Sans', sans-serif",
      lineHeight: 1.5,
      margin: "0 0 8px"
    } }, item.statutory_basis), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function(e) {
          e.stopPropagation();
          onDiscuss(item);
        },
        style: {
          background: "transparent",
          border: "1px solid #0EA5E9",
          color: "#0EA5E9",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "11px",
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer"
        }
      },
      "Discuss with Eileen"
    )));
  }
  function Sidebar({ open, sessionHistory, activeSessionId, onSelectSession, onNewChat, onCrownQuery, nexusState, prefersReducedMotion }) {
    var _historyOpen = useState(false);
    var historyOpen = _historyOpen[0];
    var setHistoryOpen = _historyOpen[1];
    var _feed = useState([]);
    var feedItems = _feed[0];
    var setFeedItems = _feed[1];
    var _feedExpanded = useState(false);
    var feedExpanded = _feedExpanded[0];
    var setFeedExpanded = _feedExpanded[1];
    useEffect(function() {
      var cancelled = false;
      loadRegulatoryFeed().then(function(items) {
        if (!cancelled) setFeedItems(items);
      });
      return function() {
        cancelled = true;
      };
    }, []);
    return React.createElement(
      "nav",
      { className: "kl-sidebar" + (open ? "" : " collapsed"), role: "navigation", "aria-label": "Conversation history" },
      // §5 — Sidebar Nexus indicator (20px, shows Eileen's current state)
      React.createElement(
        "div",
        {
          style: { display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }
        },
        React.createElement(NexusCanvas, { size: 20, nexusState: nexusState || "dormant", tier: "kl", prefersReducedMotion }),
        React.createElement("span", {
          style: { color: "#94A3B8", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }
        }, "Eileen")
      ),
      React.createElement(
        "div",
        { className: "kl-sidebar-section" },
        React.createElement(
          "button",
          { className: "kl-new-chat-btn", onClick: onNewChat },
          React.createElement(
            "svg",
            { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.25", strokeLinecap: "round", strokeLinejoin: "round" },
            React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
            React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })
          ),
          React.createElement("span", null, "New Conversation")
        )
      ),
      // KLUX-001-AM-002 §2.3: Regulatory Intelligence Feed (replaces Crown Jewels)
      React.createElement(
        "div",
        { style: { flex: 1, overflowY: "auto", minHeight: 0 } },
        React.createElement(
          "div",
          { style: { marginTop: "12px" } },
          React.createElement("div", {
            style: {
              color: "#64748B",
              fontSize: "10px",
              fontFamily: "'DM Mono', monospace",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "8px 16px"
            }
          }, "Regulatory Intelligence"),
          feedItems.length === 0 ? React.createElement("div", {
            style: { padding: "8px 16px", color: "#475569", fontSize: "11px" }
          }, "No recent regulatory events") : (function() {
            var display = feedExpanded ? feedItems : feedItems.slice(0, 3);
            var rendered = display.map(function(item, i) {
              return React.createElement(RegulatoryFeedItem, {
                key: item.id || i,
                item,
                // AMD-050 §3.3 + KLUX-001 Art. 5: seed the input, do NOT auto-send.
                onDiscuss: function(it) {
                  var seed = "Tell me about " + (it.requirement_name || "this regulatory event") + (it.source_act ? " under " + it.source_act : "") + " and what it means for employers.";
                  if (typeof window.__klSeedInput === "function") {
                    window.__klSeedInput(seed);
                  } else if (typeof onCrownQuery === "function") {
                    onCrownQuery(seed);
                  }
                }
              });
            });
            if (feedItems.length > 3) {
              rendered.push(React.createElement(
                "button",
                {
                  key: "__feed-toggle",
                  type: "button",
                  onClick: function() {
                    setFeedExpanded(!feedExpanded);
                  },
                  style: {
                    width: "100%",
                    padding: "8px 16px",
                    marginTop: "4px",
                    background: "transparent",
                    border: "none",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    color: "#0EA5E9",
                    fontSize: "11px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    textAlign: "left",
                    cursor: "pointer"
                  },
                  "aria-expanded": feedExpanded
                },
                feedExpanded ? "\u25B2 Show fewer" : "\u25BC Show all regulatory events (" + feedItems.length + ")"
              ));
            }
            return rendered;
          })()
        )
      ),
      React.createElement(
        "div",
        { style: { flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.06)" } },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() {
              setHistoryOpen(!historyOpen);
            },
            style: {
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              color: "#64748B",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.06em",
              textTransform: "uppercase"
            }
          },
          React.createElement("span", null, "History (" + sessionHistory.length + ")"),
          React.createElement("span", {
            style: { fontSize: "9px", transition: "transform 0.15s", transform: historyOpen ? "rotate(180deg)" : "rotate(0)" }
          }, "\u25BC")
        ),
        historyOpen && React.createElement(
          "div",
          {
            style: { maxHeight: "240px", overflowY: "auto", padding: "0 8px 8px" }
          },
          sessionHistory.length === 0 ? React.createElement("div", { className: "kl-sidebar-empty" }, "No prior conversations") : groupSessionsByTime(sessionHistory).map(function(group) {
            return React.createElement(
              React.Fragment,
              { key: group.label },
              React.createElement("div", {
                style: {
                  fontSize: "9px",
                  fontWeight: 500,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "8px 10px 3px",
                  fontFamily: "'DM Mono', monospace"
                }
              }, group.label),
              group.items.map(function(s) {
                return React.createElement(
                  "button",
                  {
                    key: s.sessionId,
                    className: "kl-history-item" + (s.sessionId === activeSessionId ? " active" : ""),
                    onClick: function() {
                      onSelectSession(s.sessionId);
                    }
                  },
                  React.createElement("div", { className: "kl-history-title" }, truncate(s.title, 40)),
                  React.createElement("div", { className: "kl-history-time" }, formatRelativeTime(s.lastActivity))
                );
              })
            );
          })
        )
      )
    );
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
    return /* @__PURE__ */ React.createElement("div", { className: "kl-topbar" }, /* @__PURE__ */ React.createElement("button", { className: "kl-topbar-toggle", onClick: onToggleSidebar, "aria-label": sidebarOpen ? "Collapse sidebar" : "Expand sidebar" }, /* @__PURE__ */ React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "12", x2: "21", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "6", x2: "21", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "18", x2: "21", y2: "18" }))), /* @__PURE__ */ React.createElement(
      "a",
      {
        className: "kl-topbar-title",
        href: "/",
        style: {
          color: "#22D3EE",
          textDecoration: "none",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: "16px",
          cursor: "pointer"
        }
      },
      "AILANE Knowledge Library"
    ), /* @__PURE__ */ React.createElement("div", { className: "kl-topbar-right" }, accessType === "per_session" && sessionExpiresAt && /* @__PURE__ */ React.createElement(SessionCountdown, { expiresAt: sessionExpiresAt, onExpired: onSessionExpired }), /* @__PURE__ */ React.createElement("span", { className: "kl-tier-badge " + badgeClass }, badgeLabel)));
  }
  var PANEL_DEFS = [
    // Primary group (AMD-044 §4.2)
    { id: "vault", label: "Document Vault", minTier: "operational_readiness", group: "primary" },
    { id: "notes", label: "Saved Items", minTier: null, group: "primary" },
    { id: "research", label: "Research", minTier: null, group: "primary" },
    // Secondary group — clipboard slot removed per AMD-044 §4
    { id: "calendar", label: "Calendar", minTier: "operational_readiness", group: "secondary" }
  ];
  function PanelIcon({ id }) {
    var iconProps = { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round" };
    if (id === "vault") {
      return React.createElement(
        "svg",
        iconProps,
        React.createElement("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
        React.createElement("polyline", { points: "14 2 14 8 20 8" }),
        React.createElement("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
        React.createElement("line", { x1: "16", y1: "17", x2: "8", y2: "17" })
      );
    }
    if (id === "notes") {
      return React.createElement(
        "svg",
        iconProps,
        React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
        React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
      );
    }
    if (id === "research") {
      return React.createElement(
        "svg",
        iconProps,
        React.createElement("circle", { cx: "11", cy: "11", r: "8" }),
        React.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
      );
    }
    if (id === "calendar") {
      return React.createElement(
        "svg",
        iconProps,
        React.createElement("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
        React.createElement("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
        React.createElement("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
        React.createElement("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
      );
    }
    return React.createElement("span", { style: { fontSize: "18px" } }, "?");
  }
  var TIER_RANK = {
    loading: 1,
    per_session: 0,
    kl_quick_session: 0,
    kl_day_pass: 0,
    kl_research_week: 0,
    operational_readiness: 1,
    governance: 2,
    institutional: 3
  };
  function PanelRail({ activePanel, onSelectPanel, accessType, tier }) {
    var userRank = TIER_RANK[tier] != null ? TIER_RANK[tier] : TIER_RANK[accessType] != null ? TIER_RANK[accessType] : 0;
    var primaryPanels = PANEL_DEFS.filter(function(p) {
      return p.group === "primary";
    });
    var secondaryPanels = PANEL_DEFS.filter(function(p) {
      return p.group === "secondary";
    });
    function renderButton(p) {
      var minRank = p.minTier ? TIER_RANK[p.minTier] != null ? TIER_RANK[p.minTier] : 99 : 0;
      var locked = userRank < minRank;
      var isActive = activePanel === p.id;
      return React.createElement(
        "button",
        {
          key: p.id,
          type: "button",
          className: "kl-panel-rail-btn" + (isActive ? " active" : "") + (locked ? " locked" : ""),
          title: locked ? p.label + " (upgrade required)" : p.label,
          "aria-label": p.label,
          "aria-pressed": isActive,
          disabled: locked,
          onClick: function() {
            if (!locked) onSelectPanel(isActive ? null : p.id);
          }
        },
        React.createElement(PanelIcon, { id: p.id })
      );
    }
    return React.createElement(
      "div",
      { className: "kl-panelrail", role: "toolbar", "aria-label": "Workspace panels" },
      primaryPanels.map(renderButton),
      React.createElement("div", {
        className: "kl-panel-rail-divider",
        style: {
          width: "24px",
          height: "1px",
          background: "rgba(255,255,255,0.08)",
          margin: "4px 0"
        },
        "aria-hidden": "true"
      }),
      secondaryPanels.map(renderButton)
    );
  }
  var NOTES_DISCLAIMER = "\n\n---\nThis content was exported from the Ailane Knowledge Library. It constitutes regulatory intelligence, not legal advice. For legal advice, consult a qualified employment solicitor. AI Lane Limited \xB7 Company No. 17035654 \xB7 ICO Reg. 00013389720 \xB7 ailane.ai/terms/";
  function noteTypeIcon(noteType) {
    if (noteType === "clip") return "\u{1F4CC}";
    if (noteType === "eileen_response") return "\u{1F4AC}";
    return "\u{1F4DD}";
  }
  function relativeTime(dateStr) {
    if (!dateStr) return "";
    var diff = Date.now() - new Date(dateStr).getTime();
    var mins = Math.floor(diff / 6e4);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + "d ago";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  function downloadNoteFile(note, format) {
    var safeTitle = (note.title || "note").replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/ +/g, "-");
    var content, mimeType, ext;
    if (format === "md") {
      content = "# " + (note.title || "Untitled Note") + "\n\n" + (note.content_plain || "") + NOTES_DISCLAIMER;
      mimeType = "text/markdown";
      ext = ".md";
    } else {
      content = (note.title || "Untitled Note") + "\n\n" + (note.content_plain || "") + NOTES_DISCLAIMER;
      mimeType = "text/plain;charset=utf-8";
      ext = ".txt";
    }
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
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
    var _title = useState("Untitled Note");
    var title = _title[0];
    var setTitle = _title[1];
    var _body = useState("");
    var body = _body[0];
    var setBody = _body[1];
    var _status = useState("loading");
    var status = _status[0];
    var setStatus = _status[1];
    var _filter = useState("all");
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
        if (!window.__klToken || !window.__klUserId) {
          setStatus("saved");
          return;
        }
        try {
          var resp = await fetch(
            SUPABASE_URL + "/rest/v1/kl_workspace_notes?user_id=eq." + window.__klUserId + "&order=pinned.desc,updated_at.desc&select=id,title,note_type,source_attribution,pinned,updated_at,content_plain",
            { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
          );
          var data = await resp.json();
          if (cancelled) return;
          if (Array.isArray(data)) {
            setNotes(data);
          }
          setStatus("saved");
        } catch (e) {
          console.error("Notes load failed:", e);
          if (!cancelled) setStatus("error");
        }
      }
      load();
      return function() {
        cancelled = true;
        if (saveTimer.current) clearTimeout(saveTimer.current);
      };
    }, []);
    useEffect(function() {
      window.__klNotesRefresh = function(newNote2) {
        if (newNote2) {
          setNotes(function(prev) {
            return [newNote2].concat(prev);
          });
        }
      };
      return function() {
        delete window.__klNotesRefresh;
      };
    }, []);
    function selectNote(note) {
      setActiveId(note.id);
      setActiveNote(note);
      setTitle(note.title || "Untitled Note");
      setBody(note.content_plain || "");
      setStatus("saved");
      setEditable(note.note_type === "note" || !note.note_type);
      setDownloadOpen(false);
      if (window.__klToken) {
        fetch(
          SUPABASE_URL + "/rest/v1/kl_workspace_notes?id=eq." + note.id + "&select=*",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        ).then(function(r) {
          return r.json();
        }).then(function(d) {
          if (Array.isArray(d) && d[0]) {
            setBody(d[0].content_plain || "");
            setTitle(d[0].title || "Untitled Note");
            setActiveNote(d[0]);
          }
        }).catch(function() {
        });
      }
    }
    function newNote() {
      if (!window.__klToken || !window.__klUserId) return;
      var dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      var newTitle = "Untitled Note \u2014 " + dateStr;
      fetch(SUPABASE_URL + "/rest/v1/kl_workspace_notes", {
        method: "POST",
        headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({ user_id: window.__klUserId, project_id: null, title: newTitle, content_plain: "", note_type: "note" })
      }).then(function(r) {
        return r.json();
      }).then(function(d) {
        if (Array.isArray(d) && d[0]) {
          setNotes(function(prev) {
            return [d[0]].concat(prev);
          });
          selectNote(d[0]);
          setEditable(true);
        }
      }).catch(function(e) {
        console.error("Create note failed:", e);
      });
    }
    async function performSave(nextTitle, nextBody, currentId) {
      if (!window.__klToken || !window.__klUserId || !currentId) return;
      setStatus("saving");
      var now = (/* @__PURE__ */ new Date()).toISOString();
      try {
        var resp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_workspace_notes?id=eq." + currentId,
          {
            method: "PATCH",
            headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
            body: JSON.stringify({ title: nextTitle || "Untitled Note", content_plain: nextBody, updated_at: now })
          }
        );
        if (!resp.ok) throw new Error("PATCH " + resp.status);
        setNotes(function(prev) {
          return prev.map(function(n) {
            return n.id === currentId ? Object.assign({}, n, { title: nextTitle, content_plain: nextBody, updated_at: now }) : n;
          });
        });
        setStatus("saved");
      } catch (e) {
        console.error("Notes save failed:", e);
        setStatus("error");
      }
    }
    function scheduleSave(nextTitle, nextBody) {
      setStatus("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(function() {
        performSave(nextTitle, nextBody, activeId);
      }, 3e3);
    }
    async function deleteNote(noteId) {
      if (!window.__klToken) return;
      try {
        await fetch(SUPABASE_URL + "/rest/v1/kl_workspace_notes?id=eq." + noteId, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY }
        });
        setNotes(function(prev) {
          return prev.filter(function(n) {
            return n.id !== noteId;
          });
        });
        if (activeId === noteId) {
          setActiveId(null);
          setActiveNote(null);
        }
        setConfirmDelete(null);
      } catch (e) {
        console.error("Delete failed:", e);
      }
    }
    var filteredNotes = notes.filter(function(n) {
      if (filter === "all") return true;
      if (filter === "note") return n.note_type === "note" || !n.note_type;
      if (filter === "clip") return n.note_type === "clip";
      if (filter === "eileen") return n.note_type === "eileen_response";
      return true;
    });
    var statusLabel = status === "loading" ? "Loading\u2026" : status === "dirty" ? "Unsaved changes" : status === "saving" ? "Saving\u2026" : status === "error" ? "Couldn\u2019t save \u2014 try again in a moment" : "\u2713 Saved";
    var statusColor = status === "saved" ? "#10B981" : status === "saving" ? "#F59E0B" : status === "error" ? "#EF4444" : "#94A3B8";
    var filterChips = ["all", "note", "clip", "eileen"];
    var filterLabels = { all: "All", note: "Notes", clip: "Clips", eileen: "Eileen" };
    var noteListPane = React.createElement(
      "div",
      {
        style: {
          width: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          borderRight: activeId ? "1px solid rgba(255,255,255,0.06)" : "none",
          flex: activeId ? "0 0 200px" : "1"
        }
      },
      // Filter chips row
      React.createElement(
        "div",
        { style: { display: "flex", gap: "4px", padding: "0 0 8px", flexWrap: "wrap" } },
        filterChips.map(function(f) {
          return React.createElement("button", {
            key: f,
            type: "button",
            onClick: function() {
              setFilter(f);
            },
            style: {
              padding: "3px 8px",
              borderRadius: "12px",
              fontSize: "10px",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              border: "none",
              background: filter === f ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.04)",
              color: filter === f ? "#0EA5E9" : "#94A3B8",
              transition: "all 0.15s"
            }
          }, filterLabels[f]);
        })
      ),
      // New Note button
      React.createElement("button", {
        type: "button",
        onClick: newNote,
        style: {
          width: "100%",
          padding: "8px",
          borderRadius: "8px",
          background: "rgba(14,165,233,0.08)",
          border: "1px solid rgba(14,165,233,0.2)",
          color: "#0EA5E9",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px"
        }
      }, "+ New Note"),
      // Scrollable note list
      React.createElement(
        "div",
        { style: { flex: 1, overflowY: "auto", minHeight: 0 } },
        filteredNotes.length === 0 ? React.createElement(
          "div",
          { style: { color: "#64748B", fontSize: "12px", textAlign: "center", padding: "20px 4px" } },
          filter === "all" ? "No saved items yet." : "No " + filterLabels[filter].toLowerCase() + " found."
        ) : filteredNotes.map(function(n) {
          var isActive = activeId === n.id;
          return React.createElement(
            "div",
            {
              key: n.id,
              style: {
                padding: "8px",
                marginBottom: "4px",
                borderRadius: "6px",
                background: isActive ? "rgba(14,165,233,0.08)" : "rgba(255,255,255,0.02)",
                borderLeft: isActive ? "3px solid #0EA5E9" : "3px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "flex-start",
                gap: "6px",
                transition: "all 0.15s"
              },
              onClick: function() {
                selectNote(n);
              }
            },
            // Type icon
            React.createElement("span", { style: { fontSize: "12px", flexShrink: 0, marginTop: "1px" } }, noteTypeIcon(n.note_type)),
            // Title + meta
            React.createElement(
              "div",
              { style: { minWidth: 0, flex: 1 } },
              React.createElement("div", { style: {
                color: isActive ? "#E2E8F0" : "#CBD5E1",
                fontSize: "12px",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              } }, (n.title || "Untitled Note").substring(0, 40)),
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" } },
                n.pinned ? React.createElement("span", { style: { fontSize: "9px" } }, "\u{1F4CC}") : null,
                React.createElement("span", { style: { color: "#64748B", fontSize: "10px", fontFamily: "'DM Mono', monospace" } }, relativeTime(n.updated_at))
              )
            ),
            // Delete button
            React.createElement("button", {
              type: "button",
              onClick: function(e) {
                e.stopPropagation();
                setConfirmDelete(n.id);
              },
              style: { background: "none", border: "none", color: "#64748B", fontSize: "12px", cursor: "pointer", padding: "0 2px", flexShrink: 0, opacity: 0.6 },
              title: "Delete",
              "aria-label": "Delete note"
            }, "\u2715")
          );
        })
      )
    );
    var deleteDialog = confirmDelete ? React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          background: "rgba(10,22,40,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      React.createElement(
        "div",
        {
          style: {
            background: "#0F1D32",
            border: "1px solid #1E3A5F",
            borderRadius: "10px",
            padding: "20px",
            maxWidth: "260px",
            textAlign: "center"
          }
        },
        React.createElement("p", { style: { color: "#E2E8F0", fontSize: "13px", marginBottom: "14px" } }, "Delete this note?"),
        React.createElement(
          "div",
          { style: { display: "flex", gap: "8px", justifyContent: "center" } },
          React.createElement("button", {
            type: "button",
            onClick: function() {
              setConfirmDelete(null);
            },
            className: "kl-action-btn",
            style: { fontSize: "12px", padding: "6px 14px" }
          }, "Cancel"),
          React.createElement("button", {
            type: "button",
            onClick: function() {
              deleteNote(confirmDelete);
            },
            style: {
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "4px",
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#EF4444",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif"
            }
          }, "Delete")
        )
      )
    ) : null;
    var editorPane = null;
    if (activeId && activeNote) {
      var isReadOnly = (activeNote.note_type === "clip" || activeNote.note_type === "eileen_response") && !editable;
      editorPane = React.createElement(
        "div",
        {
          style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, paddingLeft: "12px" }
        },
        // Toolbar: Download + Email
        React.createElement(
          "div",
          {
            style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexShrink: 0 }
          },
          // Back button (mobile-friendly)
          React.createElement("button", {
            type: "button",
            onClick: function() {
              setActiveId(null);
              setActiveNote(null);
              setDownloadOpen(false);
            },
            style: {
              background: "none",
              border: "none",
              color: "#0EA5E9",
              fontSize: "11px",
              cursor: "pointer",
              padding: "0",
              fontFamily: "'DM Sans', sans-serif"
            }
          }, "\u2190 Back"),
          // Action buttons
          React.createElement(
            "div",
            { style: { display: "flex", gap: "4px", position: "relative" } },
            // Download button with dropdown
            React.createElement(
              "div",
              { style: { position: "relative" } },
              React.createElement("button", {
                type: "button",
                onClick: function() {
                  setDownloadOpen(!downloadOpen);
                },
                className: "kl-action-btn",
                title: "Download",
                style: { fontSize: "11px", padding: "3px 8px" }
              }, "\u2B07 Download"),
              downloadOpen ? React.createElement(
                "div",
                {
                  style: {
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "4px",
                    background: "#0F1D32",
                    border: "1px solid #1E3A5F",
                    borderRadius: "6px",
                    padding: "4px 0",
                    zIndex: 20,
                    minWidth: "180px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                  }
                },
                React.createElement("button", {
                  type: "button",
                  onClick: function() {
                    downloadNoteFile({ title, content_plain: body }, "md");
                    setDownloadOpen(false);
                  },
                  style: {
                    display: "block",
                    width: "100%",
                    padding: "6px 12px",
                    background: "transparent",
                    border: "none",
                    color: "#E2E8F0",
                    fontSize: "12px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif"
                  }
                }, "Download as Markdown (.md)"),
                React.createElement("button", {
                  type: "button",
                  onClick: function() {
                    downloadNoteFile({ title, content_plain: body }, "txt");
                    setDownloadOpen(false);
                  },
                  style: {
                    display: "block",
                    width: "100%",
                    padding: "6px 12px",
                    background: "transparent",
                    border: "none",
                    color: "#E2E8F0",
                    fontSize: "12px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif"
                  }
                }, "Download as Text (.txt)"),
                React.createElement("div", { style: { height: "1px", background: "#1E3A5F", margin: "4px 0" } }),
                React.createElement("button", {
                  type: "button",
                  disabled: true,
                  title: "Coming soon \u2014 requires server-side export",
                  style: {
                    display: "block",
                    width: "100%",
                    padding: "6px 12px",
                    background: "transparent",
                    border: "none",
                    color: "#64748B",
                    fontSize: "12px",
                    textAlign: "left",
                    cursor: "not-allowed",
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: 0.5
                  }
                }, "Download as PDF (.pdf)"),
                React.createElement("button", {
                  type: "button",
                  disabled: true,
                  title: "Coming soon \u2014 requires server-side export",
                  style: {
                    display: "block",
                    width: "100%",
                    padding: "6px 12px",
                    background: "transparent",
                    border: "none",
                    color: "#64748B",
                    fontSize: "12px",
                    textAlign: "left",
                    cursor: "not-allowed",
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: 0.5
                  }
                }, "Download as DOCX (.docx)")
              ) : null
            ),
            // Email to self (greyed out)
            React.createElement("button", {
              type: "button",
              disabled: true,
              className: "kl-action-btn",
              title: "Coming soon \u2014 requires server-side export",
              style: { fontSize: "11px", padding: "3px 8px", opacity: 0.4, cursor: "not-allowed" }
            }, "\u2709 Email")
          )
        ),
        // Source attribution (for clips / eileen responses)
        activeNote.source_attribution ? React.createElement("div", {
          style: { color: "#64748B", fontSize: "11px", fontStyle: "italic", marginBottom: "6px", fontFamily: "'DM Mono', monospace" }
        }, activeNote.source_attribution) : null,
        // Title input
        React.createElement("input", {
          className: "kl-notes-title",
          type: "text",
          value: title,
          readOnly: isReadOnly,
          onChange: function(e) {
            if (isReadOnly) return;
            var v = e.target.value;
            setTitle(v);
            scheduleSave(v, body);
          },
          placeholder: "Untitled Note",
          style: isReadOnly ? { opacity: 0.8 } : {}
        }),
        // Status indicator
        React.createElement("div", {
          style: { fontSize: "10px", color: statusColor, marginBottom: "6px", fontFamily: "'DM Mono', monospace" }
        }, statusLabel),
        // Edit button for read-only notes
        isReadOnly ? React.createElement("button", {
          type: "button",
          onClick: function() {
            setEditable(true);
          },
          className: "kl-action-btn",
          style: { fontSize: "11px", padding: "3px 8px", marginBottom: "6px", alignSelf: "flex-start" }
        }, "\u270E Edit") : null,
        // Body editor / reader
        React.createElement("textarea", {
          className: "kl-notes-body",
          value: body,
          readOnly: isReadOnly,
          onChange: function(e) {
            if (isReadOnly) return;
            var v = e.target.value;
            setBody(v);
            scheduleSave(title, v);
          },
          placeholder: "Take notes during your research...",
          style: Object.assign({ flex: 1 }, isReadOnly ? { opacity: 0.85 } : {})
        })
      );
    } else {
      editorPane = React.createElement(
        "div",
        {
          style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: "12px" }
        },
        React.createElement("p", { style: { color: "#64748B", fontSize: "13px", textAlign: "center" } }, "Select a note or create a new one")
      );
    }
    return React.createElement(
      "div",
      {
        className: "kl-notes-panel",
        style: { display: "flex", flexDirection: "row", height: "100%", position: "relative", minHeight: 0 }
      },
      noteListPane,
      editorPane,
      deleteDialog
    );
  }
  async function downloadVaultDocument(storagePath, filename) {
    if (!window.__klToken || !storagePath) {
      alert("Unable to download \u2014 please refresh and try again.");
      return;
    }
    try {
      var encodedPath = storagePath.split("/").map(function(part) {
        return encodeURIComponent(part);
      }).join("/");
      var signResp = await fetch(
        SUPABASE_URL + "/storage/v1/object/sign/kl-document-vault/" + encodedPath,
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + window.__klToken,
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ expiresIn: 3600 })
        }
      );
      if (!signResp.ok) {
        var errText = await signResp.text();
        console.error("Signed URL error:", signResp.status, errText);
        alert("Download failed \u2014 the file may not be available. Please try again.");
        return;
      }
      var signData = await signResp.json();
      if (!signData.signedURL) {
        console.error("No signedURL in response:", signData);
        alert("Download failed \u2014 please try again.");
        return;
      }
      var downloadUrl = SUPABASE_URL + "/storage/v1" + signData.signedURL;
      var a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename || "document";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      alert("Unable to download this document right now. Please check your connection and try again.");
    }
  }
  async function downloadComplianceReport(uploadId) {
    if (!window.__klToken) return;
    try {
      var resp = await fetch(
        SUPABASE_URL + "/functions/v1/generate-report-pdf",
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + window.__klToken,
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ upload_id: uploadId })
        }
      );
      if (!resp.ok) {
        throw new Error("PDF generation failed: " + resp.status);
      }
      var blob = await resp.blob();
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "Ailane-Compliance-Report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Report download failed:", err);
      alert("Unable to generate the compliance report right now. Please try again.");
    }
  }
  async function fetchDocumentText(documentId) {
    if (!window.__klToken) return null;
    try {
      var resp = await fetch(
        SUPABASE_URL + "/rest/v1/kl_vault_document_text?document_id=eq." + documentId + "&select=extracted_text,char_count",
        {
          headers: {
            "Authorization": "Bearer " + window.__klToken,
            "apikey": SUPABASE_ANON_KEY
          }
        }
      );
      var data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      return null;
    } catch (err) {
      console.error("Preview fetch failed:", err);
      return null;
    }
  }
  async function fetchComplianceFindings(uploadId) {
    if (!window.__klToken) return null;
    try {
      var resp = await fetch(
        SUPABASE_URL + "/rest/v1/compliance_findings?upload_id=eq." + uploadId + "&select=clause_category,severity,finding_detail,statutory_ref,remediation&order=severity.desc",
        {
          headers: {
            "Authorization": "Bearer " + window.__klToken,
            "apikey": SUPABASE_ANON_KEY
          }
        }
      );
      var data = await resp.json();
      return Array.isArray(data) ? data : null;
    } catch (err) {
      console.error("Findings fetch failed:", err);
      return null;
    }
  }
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
    var _pid = useState(null);
    var previewDocId = _pid[0];
    var setPreviewDocId = _pid[1];
    var _ptxt = useState(null);
    var previewContent = _ptxt[0];
    var setPreviewContent = _ptxt[1];
    var _pload = useState(false);
    var previewLoading = _pload[0];
    var setPreviewLoading = _pload[1];
    var _del = useState(null);
    var deleteTarget = _del[0];
    var setDeleteTarget = _del[1];
    var _delPending = useState(false);
    var deletePending = _delPending[0];
    var setDeletePending = _delPending[1];
    var _delError = useState(null);
    var deleteError = _delError[0];
    var setDeleteError = _delError[1];
    function openDeleteConfirm(doc) {
      setDeleteError(null);
      setDeleteTarget(doc);
    }
    function cancelDelete() {
      if (deletePending) return;
      setDeleteTarget(null);
      setDeleteError(null);
    }
    async function confirmDelete() {
      var doc = deleteTarget;
      if (!doc || deletePending) return;
      if (doc.source !== "vault") {
        setDeleteError("Compliance check uploads can't be deleted from here.");
        return;
      }
      if (!window.__klToken || !window.__klUserId) {
        setDeleteError("You're not signed in. Please refresh and try again.");
        return;
      }
      setDeletePending(true);
      setDeleteError(null);
      try {
        var resp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_vault_documents?id=eq." + doc.id + "&user_id=eq." + window.__klUserId,
          {
            method: "PATCH",
            headers: {
              "Authorization": "Bearer " + window.__klToken,
              "apikey": SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
              "Prefer": "return=minimal"
            },
            body: JSON.stringify({ deleted_at: (/* @__PURE__ */ new Date()).toISOString() })
          }
        );
        if (!resp.ok) {
          setDeleteError("That didn't go through. Please try again in a moment.");
          return;
        }
        setDocs(function(prev) {
          return prev.filter(function(d) {
            return !(d.source === doc.source && d.id === doc.id);
          });
        });
        var key = doc.source + "-" + doc.id;
        if (previewDocId === key) {
          setPreviewDocId(null);
          setPreviewContent(null);
        }
        setDeleteTarget(null);
      } catch (err) {
        console.error("Vault delete failed:", err);
        setDeleteError("That didn't go through. Please check your connection and try again.");
      } finally {
        setDeletePending(false);
      }
    }
    async function handlePreview(doc) {
      if (previewDocId === doc.source + "-" + doc.id) {
        setPreviewDocId(null);
        setPreviewContent(null);
        return;
      }
      var key = doc.source + "-" + doc.id;
      setPreviewDocId(key);
      setPreviewLoading(true);
      setPreviewContent(null);
      if (doc.source === "compliance") {
        var findings = await fetchComplianceFindings(doc.id);
        setPreviewContent({ type: "findings", data: findings });
      } else {
        var result = await fetchDocumentText(doc.id);
        setPreviewContent({ type: "text", data: result ? result.extracted_text : "No extracted text available for this document." });
      }
      setPreviewLoading(false);
    }
    function loadDocs() {
      setLoading(true);
      setFetchError(false);
      var cancelled = false;
      async function load() {
        if (!window.__klToken || !window.__klUserId) {
          setLoading(false);
          return;
        }
        var headers = { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY };
        var vaultOk = false;
        var uploadsOk = false;
        var allDocs = [];
        try {
          var vaultResp = await fetch(
            SUPABASE_URL + "/rest/v1/kl_vault_documents?user_id=eq." + window.__klUserId + "&deleted_at=is.null&order=created_at.desc&select=id,filename,storage_path,file_size_bytes,mime_type,extraction_status,analysis_status,created_at,visibility",
            { headers }
          );
          if (vaultResp.ok) {
            var vaultData = await vaultResp.json();
            vaultOk = true;
            if (!cancelled && Array.isArray(vaultData)) {
              vaultData.forEach(function(d) {
                allDocs.push({
                  id: d.id,
                  name: d.filename,
                  source: "vault",
                  size: d.file_size_bytes,
                  status: d.extraction_status,
                  score: null,
                  storagePath: d.storage_path,
                  date: d.created_at
                });
              });
            }
          }
        } catch (e) {
          console.warn("Vault docs fetch failed:", e);
        }
        try {
          var uploadsResp = await fetch(
            SUPABASE_URL + "/rest/v1/compliance_uploads?user_id=eq." + window.__klUserId + "&order=created_at.desc&select=id,file_name,file_path,file_size_bytes,document_type,status,overall_score,created_at,display_name",
            { headers }
          );
          if (uploadsResp.ok) {
            var uploadsData = await uploadsResp.json();
            uploadsOk = true;
            if (!cancelled && Array.isArray(uploadsData)) {
              uploadsData.forEach(function(d) {
                allDocs.push({
                  id: d.id,
                  name: d.display_name || d.file_name,
                  source: "compliance",
                  size: d.file_size_bytes,
                  status: d.status,
                  score: d.overall_score,
                  storagePath: d.file_path,
                  date: d.created_at
                });
              });
            }
          }
        } catch (e) {
          console.warn("Uploads fetch failed:", e);
        }
        if (!cancelled) {
          if (!vaultOk && !uploadsOk) {
            setFetchError(true);
          }
          allDocs.sort(function(a, b) {
            return new Date(b.date) - new Date(a.date);
          });
          setDocs(allDocs);
          setLoading(false);
        }
      }
      load();
      return function() {
        cancelled = true;
      };
    }
    useEffect(function() {
      var cleanup = loadDocs();
      return cleanup;
    }, []);
    var uploadButton = React.createElement(
      "div",
      { style: { marginBottom: "12px" } },
      React.createElement("input", {
        type: "file",
        id: "vault-upload-input",
        accept: ".pdf,.docx,.doc,.txt",
        style: { display: "none" },
        onChange: function(e) {
          if (typeof window.__klHandleFileSelect === "function") {
            window.__klHandleFileSelect(e);
          }
        }
      }),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: function() {
            var input = document.getElementById("vault-upload-input");
            if (input) input.click();
          },
          style: {
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.2)",
            color: "#0EA5E9",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }
        },
        React.createElement(
          "svg",
          { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
          React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
          React.createElement("polyline", { points: "17 8 12 3 7 8" }),
          React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })
        ),
        "Upload document"
      )
    );
    if (loading) {
      return React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "12px" } }, "Loading documents\u2026");
    }
    if (fetchError && docs.length === 0) {
      return React.createElement(
        "div",
        { style: { padding: "12px" } },
        uploadButton,
        React.createElement(EileenErrorMessage, {
          message: "I wasn't able to load your documents right now. This is usually temporary.",
          retryAction: function() {
            loadDocs();
          },
          retryLabel: "Retry"
        })
      );
    }
    if (docs.length === 0) {
      return React.createElement(
        "div",
        { style: { padding: "12px" } },
        uploadButton,
        React.createElement("p", { style: { color: "#94A3B8", fontSize: "14px", marginBottom: "6px" } }, "No documents yet."),
        React.createElement(
          "p",
          { style: { color: "#64748B", fontSize: "13px", lineHeight: 1.5 } },
          "Upload a contract here or through Eileen to run a compliance check."
        )
      );
    }
    var deleteModal = deleteTarget ? React.createElement(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "kl-del-title",
        onClick: function(e) {
          if (e.target === e.currentTarget) cancelDelete();
        },
        onKeyDown: function(e) {
          if (e.key === "Escape") cancelDelete();
        },
        style: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1e3
        }
      },
      React.createElement(
        "div",
        {
          style: {
            background: "#111827",
            border: "1px solid #1E293B",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "400px",
            width: "90%",
            fontFamily: "'DM Sans', sans-serif"
          }
        },
        React.createElement("div", {
          id: "kl-del-title",
          style: { fontSize: "16px", fontWeight: 600, color: "#F1F5F9", marginBottom: "12px" }
        }, "Delete document?"),
        React.createElement(
          "div",
          {
            style: { fontSize: "13px", color: "#94A3B8", marginBottom: "20px", lineHeight: 1.6 }
          },
          "Are you sure you want to delete ",
          React.createElement(
            "strong",
            { style: { color: "#E2E8F0" } },
            deleteTarget.name || "this document"
          ),
          "? This action cannot be undone."
        ),
        deleteError ? React.createElement("div", {
          style: {
            fontSize: "12px",
            color: "#EF4444",
            marginBottom: "12px",
            padding: "8px 10px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "6px"
          }
        }, deleteError) : null,
        React.createElement(
          "div",
          {
            style: { display: "flex", gap: "12px", justifyContent: "flex-end" }
          },
          React.createElement("button", {
            type: "button",
            onClick: cancelDelete,
            disabled: deletePending,
            style: {
              background: "transparent",
              border: "1px solid #374151",
              borderRadius: "8px",
              padding: "8px 16px",
              color: "#94A3B8",
              fontSize: "13px",
              cursor: deletePending ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              opacity: deletePending ? 0.6 : 1
            }
          }, "Cancel"),
          React.createElement("button", {
            type: "button",
            onClick: confirmDelete,
            disabled: deletePending,
            style: {
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px",
              padding: "8px 16px",
              color: "#EF4444",
              fontSize: "13px",
              fontWeight: 600,
              cursor: deletePending ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              opacity: deletePending ? 0.6 : 1
            }
          }, deletePending ? "Deleting\u2026" : "Delete")
        )
      )
    ) : null;
    return React.createElement(
      "div",
      null,
      uploadButton,
      deleteModal,
      docs.map(function(doc) {
        var hasScore = doc.score != null;
        var scoreColor = !hasScore ? null : doc.score >= 75 ? "#10B981" : doc.score >= 50 ? "#F59E0B" : "#EF4444";
        var scoreBg = !hasScore ? null : doc.score >= 75 ? "rgba(16,185,129,0.15)" : doc.score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
        var sourceBadge = React.createElement("span", {
          style: {
            fontSize: "10px",
            fontWeight: 500,
            padding: "2px 6px",
            borderRadius: "4px",
            fontFamily: "'DM Mono', monospace",
            background: doc.source === "vault" ? "rgba(14,165,233,0.15)" : "rgba(16,185,129,0.15)",
            color: doc.source === "vault" ? "#0EA5E9" : "#10B981",
            flexShrink: 0
          }
        }, doc.source === "vault" ? "Vault" : "Check");
        var scoreBadge = hasScore ? React.createElement(
          "span",
          {
            style: {
              fontSize: "11px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "4px",
              background: scoreBg,
              color: scoreColor,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }
          },
          React.createElement("span", {
            style: { width: "8px", height: "8px", borderRadius: "50%", background: scoreColor, display: "inline-block" }
          }),
          Math.round(doc.score) + "%"
        ) : null;
        var statusBadge = null;
        if (!hasScore && doc.status) {
          var statusColors = {
            pending: { text: "#94A3B8", bg: "rgba(148,163,184,0.1)" },
            extracting: { text: "#0EA5E9", bg: "rgba(14,165,233,0.1)" },
            processing: { text: "#0EA5E9", bg: "rgba(14,165,233,0.1)" },
            completed: { text: "#10B981", bg: "rgba(16,185,129,0.1)" },
            ready: { text: "#10B981", bg: "rgba(16,185,129,0.1)" }
          };
          var sc = statusColors[doc.status] || statusColors.pending;
          statusBadge = React.createElement("span", {
            style: { fontSize: "10px", fontWeight: 500, padding: "2px 6px", borderRadius: "4px", background: sc.bg, color: sc.text, flexShrink: 0, fontFamily: "'DM Mono', monospace" }
          }, doc.status);
        }
        return React.createElement(
          "div",
          {
            key: doc.source + "-" + doc.id,
            style: { padding: "12px", marginBottom: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
          },
          // Row 1: Name + score or status
          React.createElement(
            "div",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" } },
            React.createElement("span", {
              style: { color: "#E2E8F0", fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }
            }, (doc.name || "").substring(0, 35)),
            hasScore ? scoreBadge : statusBadge
          ),
          // Row 2: Source badge, date, file size
          React.createElement(
            "div",
            { style: { display: "flex", gap: "8px", alignItems: "center", marginTop: "6px", flexWrap: "wrap" } },
            sourceBadge,
            React.createElement("span", { style: { color: "#64748B", fontSize: "11px" } }, relativeTime(doc.date)),
            doc.size ? React.createElement("span", { style: { color: "#64748B", fontSize: "10px", fontFamily: "'DM Mono', monospace" } }, formatFileSize(doc.size)) : null
          ),
          // Row 3: Action buttons (Hotfix H-2/H-3/H-4)
          React.createElement(
            "div",
            { style: { display: "flex", gap: "4px", marginTop: "8px" } },
            React.createElement("button", {
              type: "button",
              className: "kl-action-btn",
              onClick: function() {
                handlePreview(doc);
              },
              style: { fontSize: "11px", padding: "3px 8px" }
            }, previewDocId === doc.source + "-" + doc.id ? "Close" : "Preview"),
            doc.source === "compliance" ? React.createElement("button", {
              type: "button",
              className: "kl-action-btn",
              title: "Download compliance report",
              style: { fontSize: "11px", padding: "3px 8px" },
              onClick: function() {
                downloadComplianceReport(doc.id);
              }
            }, "Download") : React.createElement("button", {
              type: "button",
              className: "kl-action-btn",
              title: "Download original document",
              style: { fontSize: "11px", padding: "3px 8px" },
              onClick: function() {
                downloadVaultDocument(doc.storagePath, doc.name);
              }
            }, "Download"),
            // AMD-050 §5: soft-delete action. Only offered for vault-sourced
            // documents; compliance_uploads have no deleted_at column.
            doc.source === "vault" ? React.createElement("button", {
              type: "button",
              className: "kl-action-btn",
              title: "Delete document",
              "aria-label": "Delete " + (doc.name || "document"),
              style: {
                fontSize: "11px",
                padding: "3px 8px",
                marginLeft: "auto",
                color: "#94A3B8"
              },
              onClick: function(e) {
                e.stopPropagation();
                openDeleteConfirm(doc);
              }
            }, "Delete") : null
          ),
          // Inline preview panel (H-3)
          previewDocId === doc.source + "-" + doc.id ? React.createElement(
            "div",
            {
              style: {
                background: "#0F172A",
                border: "1px solid #1E293B",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
                padding: "16px",
                maxHeight: "300px",
                overflowY: "auto",
                marginTop: "8px"
              }
            },
            previewLoading ? React.createElement("span", { style: { color: "#94A3B8", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" } }, "Loading preview\u2026") : previewContent && previewContent.type === "findings" && Array.isArray(previewContent.data) ? previewContent.data.map(function(f, i) {
              var sevColor = f.severity === "high" || f.severity === "critical" ? "#EF4444" : f.severity === "medium" || f.severity === "major" ? "#F59E0B" : "#10B981";
              return React.createElement(
                "div",
                {
                  key: i,
                  style: { marginBottom: "12px", paddingBottom: "12px", borderBottom: i < previewContent.data.length - 1 ? "1px solid #1E293B" : "none" }
                },
                React.createElement(
                  "div",
                  { style: { display: "flex", gap: "8px", marginBottom: "4px" } },
                  React.createElement("span", {
                    style: { fontSize: "11px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textTransform: "uppercase", color: sevColor }
                  }, f.severity),
                  React.createElement("span", { style: { fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#64748B" } }, f.clause_category)
                ),
                React.createElement("p", { style: { color: "#CBD5E1", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, margin: "0 0 4px" } }, f.finding_detail),
                f.statutory_ref ? React.createElement("span", { style: { fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#0EA5E9" } }, f.statutory_ref) : null
              );
            }) : previewContent && previewContent.type === "text" ? React.createElement("pre", {
              style: { color: "#CBD5E1", fontFamily: "'DM Mono', monospace", fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }
            }, previewContent.data) : React.createElement("span", { style: { color: "#94A3B8", fontSize: "13px" } }, "No preview available.")
          ) : null
        );
      })
    );
  }
  function CalendarPanel() {
    var _reqs = useState([]);
    var reqs = _reqs[0];
    var setReqs = _reqs[1];
    var _loading = useState(true);
    var loading = _loading[0];
    var setLoading = _loading[1];
    var _filter = useState("all");
    var filter = _filter[0];
    var setFilter = _filter[1];
    var _expanded = useState({});
    var expanded = _expanded[0];
    var setExpanded = _expanded[1];
    useEffect(function() {
      var cancelled = false;
      async function load() {
        if (!window.__klToken) {
          setLoading(false);
          return;
        }
        try {
          var resp = await fetch(
            SUPABASE_URL + "/rest/v1/regulatory_requirements?select=id,requirement_name,statutory_basis,effective_from,commencement_status,is_forward_requirement,source_act&order=effective_from.asc",
            { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
          );
          var data = await resp.json();
          if (cancelled) return;
          if (Array.isArray(data)) setReqs(data);
        } catch (e) {
          console.error("Calendar load failed:", e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return function() {
        cancelled = true;
      };
    }, []);
    function toggleExpand(id) {
      setExpanded(function(prev) {
        var next = {};
        for (var k in prev) next[k] = prev[k];
        next[id] = !prev[id];
        return next;
      });
    }
    function discussWithEileen(req) {
      var seed = "Tell me about " + (req.requirement_name || "this regulatory event") + (req.source_act ? " under " + req.source_act : "") + " and what it means for employers.";
      if (typeof window.__klSeedInput === "function") {
        window.__klSeedInput(seed);
      } else if (typeof window.__klSendMessage === "function") {
        window.__klSendMessage(seed);
      }
    }
    if (loading) {
      return /* @__PURE__ */ React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "12px" } }, "Loading regulatory calendar\u2026");
    }
    var forwardCount = reqs.filter(function(r) {
      return r.is_forward_requirement;
    }).length;
    var filteredReqs = reqs.filter(function(r) {
      if (filter === "forward") return r.is_forward_requirement;
      if (filter === "in_force") return r.commencement_status === "in_force";
      return true;
    });
    var filterButtons = [
      { id: "all", label: "All (" + reqs.length + ")" },
      { id: "in_force", label: "In Force" },
      { id: "forward", label: "Forward (" + forwardCount + ")" }
    ];
    var grouped = {};
    filteredReqs.forEach(function(req) {
      if (!req.effective_from) return;
      var d = new Date(req.effective_from);
      var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      var label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      if (!grouped[key]) grouped[key] = { label, items: [] };
      grouped[key].items.push(req);
    });
    var months = Object.keys(grouped).sort();
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "12px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" } }, filterButtons.map(function(f) {
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: f.id,
          type: "button",
          onClick: function() {
            setFilter(f.id);
          },
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
      );
    })), months.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No requirements match this filter.") : months.map(function(monthKey) {
      var month = grouped[monthKey];
      return /* @__PURE__ */ React.createElement("div", { key: monthKey, style: { marginBottom: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: {
        color: "#94A3B8",
        fontSize: "13px",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        padding: "8px 0",
        borderBottom: "1px solid #1E293B",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      } }, /* @__PURE__ */ React.createElement("span", null, month.label), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#475569" } }, month.items.length, " event", month.items.length === 1 ? "" : "s")), month.items.map(function(req, i) {
        var d = new Date(req.effective_from);
        var dayNum = d.getDate();
        var isExpanded = !!expanded[req.id];
        var statusColor = req.commencement_status === "in_force" ? "#10B981" : req.is_forward_requirement ? "#D97706" : "#0EA5E9";
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: req.id || i,
            "data-calendar-id": req.id,
            onClick: function() {
              toggleExpand(req.id);
            },
            role: "button",
            tabIndex: 0,
            onKeyDown: function(e) {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleExpand(req.id);
              }
            },
            "aria-expanded": isExpanded,
            style: {
              display: "flex",
              gap: "12px",
              padding: "10px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              cursor: "pointer"
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: {
            minWidth: "44px",
            height: "44px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: statusColor + "15",
            borderRadius: "8px",
            flexShrink: 0
          } }, /* @__PURE__ */ React.createElement("span", { style: {
            color: statusColor,
            fontSize: "18px",
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1
          } }, dayNum), /* @__PURE__ */ React.createElement("span", { style: {
            color: statusColor,
            fontSize: "9px",
            fontFamily: "'DM Mono', monospace",
            textTransform: "uppercase"
          } }, d.toLocaleDateString("en-GB", { month: "short" }))),
          /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: {
            color: "#E2E8F0",
            fontSize: "12px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500
          } }, req.requirement_name), req.source_act && /* @__PURE__ */ React.createElement("div", { style: {
            color: "#64748B",
            fontSize: "10px",
            fontFamily: "'DM Mono', monospace",
            marginTop: "2px"
          } }, req.source_act), isExpanded && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, req.statutory_basis && /* @__PURE__ */ React.createElement("p", { style: {
            color: "#CBD5E1",
            fontSize: "11px",
            lineHeight: 1.5,
            margin: "0 0 8px",
            fontFamily: "'DM Sans', sans-serif"
          } }, req.statutory_basis), /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: function(e) {
                e.stopPropagation();
                discussWithEileen(req);
              },
              style: {
                background: "transparent",
                border: "1px solid #0EA5E9",
                color: "#0EA5E9",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "11px",
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer"
              }
            },
            "Discuss with Eileen"
          )))
        );
      }));
    }));
  }
  function ResearchPanel() {
    var _tab = useState("library");
    var tab = _tab[0];
    var setTab = _tab[1];
    var _search = useState("");
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
      if (tab === "library") {
        setLoading(false);
        return;
      }
      var cancelled = false;
      async function load() {
        if (!window.__klToken) {
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          var path = tab === "provisions" ? "/rest/v1/kl_provisions?select=provision_id,title,instrument_id,section_num,in_force,is_era_2025&order=instrument_id,section_num&limit=500" : "/rest/v1/kl_cases?select=case_id,name,citation,court,year,principle&order=year.desc&limit=100";
          var resp = await fetch(SUPABASE_URL + path, {
            headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY }
          });
          var d = await resp.json();
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
      return function() {
        cancelled = true;
      };
    }, [tab]);
    useEffect(function() {
      if (tab !== "library") return;
      var cancelled = false;
      async function loadInstruments() {
        try {
          var resp = await fetch("/knowledge-library/content/content-index.json");
          var d = await resp.json();
          if (!cancelled && Array.isArray(d)) {
            setInstruments(d);
            if (window.__klPendingInstrument) {
              var pending = window.__klPendingInstrument;
              delete window.__klPendingInstrument;
              var target = d.find(function(inst) {
                return inst.id === pending;
              });
              if (target) {
                setTimeout(function() {
                  loadInstrumentDetail(target);
                }, 100);
              }
            }
          }
        } catch (e) {
          console.warn("Library manifest fetch failed:", e);
        }
      }
      if (instruments.length === 0) loadInstruments();
      return function() {
        cancelled = true;
      };
    }, [tab]);
    useEffect(function() {
      function handleOpen(e) {
        var instId = e.detail && e.detail.id;
        if (!instId) return;
        setTab("library");
        var found = instruments.find(function(inst) {
          return inst.id === instId;
        });
        if (found) {
          loadInstrumentDetail(found);
        } else {
          window.__klPendingInstrument = instId;
        }
      }
      window.addEventListener("kl-open-instrument", handleOpen);
      return function() {
        window.removeEventListener("kl-open-instrument", handleOpen);
      };
    }, [instruments]);
    function toggleInstrument(instId) {
      setExpanded(function(prev) {
        var next = {};
        for (var k in prev) next[k] = prev[k];
        next[instId] = !prev[instId];
        return next;
      });
    }
    async function loadInstrumentDetail(inst) {
      setActiveInstrument(inst);
      setInstrumentDetail(null);
      setDetailLoading(true);
      try {
        var filename = inst.filename || (inst.id ? inst.id + ".json" : null);
        if (filename) {
          var resp = await fetch("/knowledge-library/content/" + filename);
          if (resp.ok) {
            var d = await resp.json();
            setInstrumentDetail(d);
          }
        }
      } catch (e) {
        console.warn("Content file fetch failed:", e);
      } finally {
        setDetailLoading(false);
      }
    }
    var filtered = data.filter(function(item) {
      if (!search) return true;
      var s = search.toLowerCase();
      if (tab === "provisions") {
        return (item.title || "").toLowerCase().indexOf(s) !== -1 || (item.instrument_id || "").toLowerCase().indexOf(s) !== -1;
      }
      return (item.name || "").toLowerCase().indexOf(s) !== -1 || (item.citation || "").toLowerCase().indexOf(s) !== -1;
    });
    var filteredInstruments = instruments;
    if (tab === "library" && search) {
      var libSearch = search.toLowerCase();
      filteredInstruments = instruments.filter(function(inst) {
        return (inst.title || "").toLowerCase().indexOf(libSearch) !== -1 || (inst.short || "").toLowerCase().indexOf(libSearch) !== -1 || (inst.warmSubtitle || "").toLowerCase().indexOf(libSearch) !== -1 || (inst.cat || "").toLowerCase().indexOf(libSearch) !== -1;
      });
    }
    var groupedProvisions = {};
    if (tab === "provisions") {
      filtered.forEach(function(item) {
        var key = item.instrument_id || "Other";
        if (!groupedProvisions[key]) {
          groupedProvisions[key] = [];
        }
        groupedProvisions[key].push(item);
      });
    }
    var instrumentKeys = Object.keys(groupedProvisions).sort();
    function renderProvisionsTab() {
      if (instrumentKeys.length === 0) {
        return React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No results.");
      }
      return instrumentKeys.map(function(instId) {
        var items = groupedProvisions[instId];
        var isOpen = !!expanded[instId];
        return React.createElement(
          "div",
          { key: instId, style: { marginBottom: "6px" } },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() {
                toggleInstrument(instId);
              },
              style: {
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: "6px",
                background: "rgba(14,165,233,0.04)",
                border: "1px solid rgba(14,165,233,0.12)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#E2E8F0",
                fontSize: "12px",
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif"
              }
            },
            React.createElement("span", null, INSTRUMENT_NAMES[instId] || instId),
            React.createElement(
              "span",
              { style: { display: "flex", alignItems: "center", gap: "6px" } },
              React.createElement("span", { style: { fontSize: "10px", color: "#0EA5E9", fontFamily: "'DM Mono', monospace" } }, items.length + " provisions"),
              React.createElement("span", { style: { fontSize: "10px", color: "#64748B", transition: "transform 0.15s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" } }, "\u25BC")
            )
          ),
          isOpen && React.createElement(
            "div",
            { style: { paddingLeft: "8px", marginTop: "4px" } },
            items.map(function(item) {
              return React.createElement(
                "div",
                {
                  key: item.provision_id,
                  style: {
                    padding: "6px 8px",
                    marginBottom: "2px",
                    borderRadius: "4px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer"
                  },
                  onClick: function() {
                    var seedMsg = "Tell me about " + item.title + (item.instrument_id ? " under the " + item.instrument_id : "");
                    if (window.__klSendMessage) window.__klSendMessage(seedMsg);
                  },
                  title: "Ask Eileen about this provision"
                },
                React.createElement("div", { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500 } }, item.title),
                React.createElement(
                  "div",
                  { style: { display: "flex", gap: "6px", marginTop: "2px", flexWrap: "wrap", alignItems: "center" } },
                  React.createElement(
                    "span",
                    { style: { color: "#475569", fontSize: "10px", fontFamily: "'DM Mono', monospace" } },
                    item.section_num ? "s." + item.section_num : ""
                  ),
                  item.is_era_2025 && React.createElement("span", {
                    style: { color: "#F59E0B", fontSize: "10px", padding: "1px 5px", borderRadius: "3px", background: "rgba(245,158,11,0.1)" }
                  }, "ERA 2025"),
                  React.createElement(
                    "span",
                    { style: { color: item.in_force ? "#10B981" : "#94A3B8", fontSize: "10px" } },
                    item.in_force ? "In force" : "Not yet"
                  )
                )
              );
            })
          )
        );
      });
    }
    function renderCasesTab() {
      if (filtered.length === 0) {
        return React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No results.");
      }
      return filtered.slice(0, 50).map(function(item) {
        var caseKey = "case-" + item.case_id;
        var isOpen = !!expanded[caseKey];
        return React.createElement(
          "div",
          {
            key: item.case_id,
            style: {
              marginBottom: "6px",
              borderRadius: "6px",
              overflow: "hidden",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)"
            }
          },
          React.createElement(
            "div",
            {
              onClick: function() {
                toggleInstrument(caseKey);
              },
              style: {
                padding: "8px 10px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start"
              }
            },
            React.createElement(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              React.createElement("div", { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500 } }, item.name),
              React.createElement(
                "div",
                { style: { color: "#64748B", fontSize: "10px", marginTop: "2px", fontFamily: "'DM Mono', monospace" } },
                [item.citation, item.court, item.year].filter(Boolean).join(" \xB7 ")
              )
            ),
            React.createElement("span", {
              style: { fontSize: "9px", color: "#64748B", flexShrink: 0, marginTop: "4px", transition: "transform 0.15s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" },
              "aria-hidden": "true"
            }, "\u25BC")
          ),
          isOpen && React.createElement(
            "div",
            {
              style: { padding: "0 10px 10px", borderTop: "1px solid rgba(255,255,255,0.04)" }
            },
            item.principle && React.createElement("div", {
              style: { fontSize: "12px", color: "#CBD5E1", lineHeight: 1.5, marginTop: "8px", marginBottom: "10px" }
            }, item.principle),
            React.createElement("button", {
              type: "button",
              onClick: function() {
                if (window.__klSendMessage) window.__klSendMessage("Tell me about the case " + item.name + (item.citation ? " (" + item.citation + ")" : "") + " and what it means for employers");
              },
              style: {
                padding: "6px 12px",
                borderRadius: "6px",
                background: "rgba(14,165,233,0.08)",
                border: "1px solid rgba(14,165,233,0.2)",
                color: "#0EA5E9",
                fontSize: "11px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif"
              }
            }, "\u2192 Discuss with Eileen")
          )
        );
      });
    }
    function renderLibraryTab() {
      if (activeInstrument) {
        return renderInstrumentDetail();
      }
      var CATEGORY_LABELS = {
        legislation: "UK Employment Legislation",
        acas: "ACAS Codes of Practice & Guidance",
        hse: "Health & Safety Executive Guidance",
        ico: "ICO Data Protection Guidance",
        ehrc: "Equality & Human Rights Commission",
        horizon: "Forward Intelligence & Horizon",
        training: "Training Resources",
        caselaw: "Case Law Intelligence",
        guidance: "Regulatory Guidance",
        "employment-relations": "Employment Relations",
        "cross-cutting": "Cross-Cutting Provisions"
      };
      var CATEGORY_ORDER = ["legislation", "acas", "hse", "ehrc", "ico", "guidance", "employment-relations", "cross-cutting", "horizon", "training", "caselaw"];
      var CATEGORY_COLOURS = {
        legislation: "#0EA5E9",
        acas: "#10B981",
        hse: "#F59E0B",
        ico: "#8B5CF6",
        ehrc: "#EC4899",
        horizon: "#F97316",
        training: "#06B6D4",
        caselaw: "#6366F1",
        guidance: "#14B8A6",
        "employment-relations": "#10B981",
        "cross-cutting": "#64748B"
      };
      var grouped = {};
      filteredInstruments.forEach(function(inst) {
        var cat = inst.cat || "legislation";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(inst);
      });
      var filteredCats = CATEGORY_ORDER.filter(function(c) {
        return grouped[c] && grouped[c].length > 0;
      });
      Object.keys(grouped).forEach(function(c) {
        if (filteredCats.indexOf(c) === -1) filteredCats.push(c);
      });
      if (instruments.length === 0) {
        return React.createElement(
          "div",
          { style: { color: "#64748B", fontSize: "13px", padding: "12px", textAlign: "center" } },
          "Loading instrument library\u2026"
        );
      }
      if (filteredCats.length === 0) {
        return React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No instruments match your search.");
      }
      return React.createElement(
        "div",
        null,
        filteredCats.map(function(cat) {
          var items = grouped[cat];
          var label = CATEGORY_LABELS[cat] || cat;
          var catColor = CATEGORY_COLOURS[cat] || "#0EA5E9";
          var isCatOpen = expanded[cat] !== false;
          return React.createElement(
            "div",
            { key: cat, style: { marginBottom: "12px" } },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  toggleInstrument(cat);
                },
                style: {
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: "rgba(14,165,233,0.06)",
                  border: "1px solid rgba(14,165,233,0.15)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: catColor,
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif"
                }
              },
              React.createElement("span", null, label),
              React.createElement(
                "span",
                { style: { display: "flex", alignItems: "center", gap: "6px" } },
                React.createElement("span", { style: { fontSize: "10px", color: "#64748B", fontFamily: "'DM Mono', monospace" } }, items.length + " instruments"),
                React.createElement("span", { style: { fontSize: "9px", color: "#64748B", transition: "transform 0.15s", transform: isCatOpen ? "rotate(180deg)" : "rotate(0)" } }, "\u25BC")
              )
            ),
            isCatOpen && React.createElement(
              "div",
              { style: { paddingLeft: "4px", marginTop: "6px" } },
              items.map(function(inst) {
                var accentColor = CATEGORY_COLOURS[inst.cat] || "#0EA5E9";
                return React.createElement(
                  "div",
                  {
                    key: inst.id,
                    onClick: function() {
                      loadInstrumentDetail(inst);
                    },
                    style: {
                      padding: "0",
                      marginBottom: "6px",
                      borderRadius: "4px",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      border: "1px solid rgba(255,255,255,0.06)",
                      display: "flex"
                    },
                    onMouseEnter: function(e) {
                      e.currentTarget.style.transform = "translateX(4px)";
                      e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
                    },
                    onMouseLeave: function(e) {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  },
                  // Book spine accent
                  React.createElement("div", {
                    style: {
                      width: "4px",
                      background: accentColor,
                      flexShrink: 0
                    }
                  }),
                  // Book cover content
                  React.createElement(
                    "div",
                    {
                      style: {
                        flex: 1,
                        padding: "10px 12px",
                        background: "rgba(255,255,255,0.02)"
                      }
                    },
                    // AMD-050 §4: render the human-readable topicLabel as primary
                    // when present; the formal title falls back to a secondary line.
                    React.createElement(
                      "div",
                      { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500, marginBottom: "4px", lineHeight: 1.3 } },
                      inst.topicLabel || inst.title
                    ),
                    inst.topicLabel && inst.title && React.createElement("div", {
                      style: { color: "#64748B", fontSize: "11px", lineHeight: 1.35, marginBottom: "4px" }
                    }, inst.title),
                    inst.warmSubtitle && React.createElement("div", {
                      style: { color: "#94A3B8", fontSize: "11px", lineHeight: 1.4, marginBottom: "6px" }
                    }, inst.warmSubtitle.length > 100 ? inst.warmSubtitle.slice(0, 100) + "\u2026" : inst.warmSubtitle),
                    React.createElement(
                      "div",
                      { style: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" } },
                      inst.sectionCount > 0 && React.createElement("span", {
                        style: { fontSize: "10px", color: accentColor, fontFamily: "'DM Mono', monospace" }
                      }, inst.sectionCount + " provisions"),
                      inst.caseCount > 0 && React.createElement("span", {
                        style: { fontSize: "10px", color: "#64748B", fontFamily: "'DM Mono', monospace" }
                      }, inst.caseCount + " cases"),
                      inst.isInForce != null && React.createElement("span", {
                        style: {
                          fontSize: "9px",
                          padding: "1px 5px",
                          borderRadius: "3px",
                          background: inst.isInForce ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                          color: inst.isInForce ? "#10B981" : "#F59E0B"
                        }
                      }, inst.isInForce ? "In force" : "Pending")
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
      return React.createElement(
        "div",
        null,
        React.createElement("button", {
          type: "button",
          onClick: function() {
            setActiveInstrument(null);
            setInstrumentDetail(null);
          },
          style: {
            background: "none",
            border: "none",
            color: "#0EA5E9",
            fontSize: "12px",
            cursor: "pointer",
            padding: "0 0 10px",
            fontFamily: "'DM Sans', sans-serif",
            textAlign: "left"
          }
        }, "\u2190 Back to Library"),
        detailLoading ? React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "20px 0", textAlign: "center" } }, "Loading instrument detail\u2026") : instrumentDetail ? renderInstrumentContent(instrumentDetail) : renderInstrumentSummary(activeInstrument)
      );
    }
    function renderInstrumentSummary(inst) {
      return React.createElement(
        "div",
        null,
        React.createElement("div", { style: { fontSize: "16px", fontWeight: 600, color: "#E2E8F0", marginBottom: "8px" } }, inst.title),
        React.createElement(
          "div",
          { style: { fontSize: "12px", color: "#64748B", marginBottom: "4px", fontFamily: "'DM Mono', monospace" } },
          (inst.type || "") + (inst.jurisdiction ? " \xB7 " + inst.jurisdiction : "")
        ),
        inst.chapters && React.createElement("div", { style: { fontSize: "12px", color: "#94A3B8", marginBottom: "12px", lineHeight: 1.5 } }, inst.chapters),
        inst.warmSubtitle && React.createElement("div", {
          style: {
            fontSize: "13px",
            color: "#CBD5E1",
            lineHeight: 1.6,
            marginBottom: "12px",
            padding: "12px",
            background: "rgba(14,165,233,0.04)",
            borderRadius: "8px",
            borderLeft: "2px solid rgba(14,165,233,0.2)"
          }
        }, inst.warmSubtitle),
        inst.sourceUrl && React.createElement("a", {
          href: inst.sourceUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "12px",
            fontSize: "11px",
            color: "#0EA5E9",
            textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif"
          }
        }, "\u2197 View on legislation.gov.uk"),
        !inst.warmSubtitle && React.createElement(
          "div",
          { style: { fontSize: "12px", color: "#475569", fontStyle: "italic", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" } },
          "Deep content for this instrument is being enriched. Ask Eileen for current intelligence."
        ),
        React.createElement("button", {
          type: "button",
          onClick: function() {
            if (window.__klSendMessage) window.__klSendMessage("Tell me about the " + inst.title + " and what it means for employers");
          },
          style: {
            marginTop: "12px",
            padding: "8px 14px",
            borderRadius: "6px",
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.2)",
            color: "#0EA5E9",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif"
          }
        }, "\u2192 Ask Eileen about this instrument")
      );
    }
    function renderInstrumentContent(detail) {
      var formalTitle = detail.title || detail.shortTitle || activeInstrument && activeInstrument.title || "Instrument";
      var topicLabel = detail.topicLabel || activeInstrument && activeInstrument.topicLabel || null;
      var displayTitle = topicLabel || formalTitle;
      var displayType = detail.type || activeInstrument && activeInstrument.type || "";
      var displayJurisdiction = detail.jurisdiction || activeInstrument && activeInstrument.jurisdiction || "";
      var description = detail.desc || detail.description || detail.summary || detail.overview || activeInstrument && activeInstrument.warmSubtitle || "";
      var inForce = detail.isInForce != null ? detail.isInForce : activeInstrument && activeInstrument.isInForce;
      var instCat = activeInstrument && activeInstrument.cat || detail.cat || "";
      var provisions = [];
      if (Array.isArray(detail.provisions)) {
        provisions = detail.provisions;
      } else if (Array.isArray(detail.parts)) {
        detail.parts.forEach(function(part) {
          var rawPartLabel = part.title || part.num || part.name || "";
          var partLabel = humanisePartTitle(rawPartLabel, instCat);
          (part.sections || []).forEach(function(sec) {
            provisions.push({
              title: sec.title || sec.name || "",
              section: sec.num || sec.sectionNum || sec.section || "",
              text: sec.text || sec.currentText || sec.content || "",
              summary: sec.summary || sec.keyPrinciple || "",
              sourceUrl: sec.sourceUrl || null,
              partLabel,
              leadingCases: sec.leadingCases || []
            });
          });
        });
      }
      var cases = [];
      if (Array.isArray(detail.leadingCases)) cases = cases.concat(detail.leadingCases);
      if (Array.isArray(detail.cases)) cases = cases.concat(detail.cases);
      provisions.forEach(function(p) {
        if (Array.isArray(p.leadingCases)) cases = cases.concat(p.leadingCases);
      });
      var sourceUrl = detail.sourceUrl || activeInstrument && activeInstrument.sourceUrl || provisions[0] && provisions[0].sourceUrl || null;
      return React.createElement(
        "div",
        null,
        // Title block
        React.createElement(
          "div",
          { style: { marginBottom: "16px" } },
          React.createElement("div", { style: { fontSize: "16px", fontWeight: 600, color: "#E2E8F0", marginBottom: "6px" } }, displayTitle),
          // AMD-050 §4: formal title rendered secondary when a topicLabel is set.
          topicLabel && formalTitle && topicLabel !== formalTitle ? React.createElement("div", {
            style: { fontSize: "11px", color: "#64748B", marginBottom: "4px" }
          }, formalTitle) : null,
          React.createElement(
            "div",
            { style: { fontSize: "11px", color: "#64748B", fontFamily: "'DM Mono', monospace", marginBottom: "4px" } },
            [displayType, displayJurisdiction, detail.currentAsOf && "Verified " + detail.currentAsOf].filter(Boolean).join(" \xB7 ")
          ),
          detail.chapters && React.createElement("div", { style: { fontSize: "11px", color: "#94A3B8", marginBottom: "8px" } }, detail.chapters),
          React.createElement("span", {
            style: {
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "4px",
              display: "inline-block",
              background: inForce ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
              color: inForce ? "#10B981" : "#F59E0B"
            }
          }, inForce ? "In force" : "Not yet commenced")
        ),
        description && React.createElement("div", {
          style: {
            fontSize: "13px",
            color: "#CBD5E1",
            lineHeight: 1.6,
            marginBottom: "16px",
            padding: "12px",
            background: "rgba(14,165,233,0.04)",
            borderRadius: "8px",
            borderLeft: "2px solid rgba(14,165,233,0.2)"
          }
        }, typeof description === "string" ? description : JSON.stringify(description)),
        sourceUrl && React.createElement("a", {
          href: sourceUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          style: {
            display: "inline-block",
            marginBottom: "16px",
            fontSize: "11px",
            color: "#0EA5E9",
            textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif"
          }
        }, "\u2197 View original source"),
        React.createElement("button", {
          type: "button",
          onClick: function() {
            if (window.__klSendMessage) window.__klSendMessage("Give me a comprehensive briefing on the " + displayTitle + " including key obligations, recent changes, and practical implications for employers");
          },
          style: {
            display: "block",
            marginBottom: "16px",
            padding: "8px 14px",
            borderRadius: "6px",
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.2)",
            color: "#0EA5E9",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif"
          }
        }, "\u2192 Get a full briefing from Eileen"),
        // Provisions list (Level 2 + Level 3 on expand)
        provisions.length > 0 && React.createElement(
          "div",
          { style: { marginTop: "8px" } },
          React.createElement("div", {
            style: { fontSize: "12px", fontWeight: 600, color: "#0EA5E9", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }
          }, "Provisions (" + provisions.length + ")"),
          provisions.slice(0, 40).map(function(prov, idx) {
            var provKey = "prov-" + idx;
            var isProvOpen = !!expanded[provKey];
            var provTitle = prov.summary || prov.title || prov.name || "Section " + (prov.section || prov.sectionNum || prov.num || idx + 1);
            if (provTitle.length > 140) provTitle = provTitle.slice(0, 140) + "\u2026";
            var provOfficialTitle = prov.summary && prov.title && prov.title !== prov.summary ? prov.title : null;
            var provText = prov.text || "";
            var provSection = prov.section || "";
            return React.createElement(
              "div",
              {
                key: provKey,
                style: { marginBottom: "3px", borderRadius: "4px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }
              },
              React.createElement(
                "div",
                {
                  onClick: function() {
                    toggleInstrument(provKey);
                  },
                  style: {
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.02)"
                  }
                },
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  React.createElement("span", { style: { color: "#E2E8F0", fontSize: "11px" } }, provTitle),
                  provSection && React.createElement(
                    "span",
                    { style: { color: "#475569", fontSize: "10px", marginLeft: "6px", fontFamily: "'DM Mono', monospace" } },
                    (String(provSection).indexOf("s.") === 0 ? "" : "s.") + provSection
                  ),
                  provOfficialTitle && React.createElement("div", {
                    style: { color: "#475569", fontSize: "10px", fontStyle: "italic", marginTop: "1px" }
                  }, provOfficialTitle)
                ),
                React.createElement("span", { style: { fontSize: "8px", color: "#475569", transition: "transform 0.15s", transform: isProvOpen ? "rotate(180deg)" : "rotate(0)" } }, "\u25BC")
              ),
              isProvOpen && React.createElement(
                "div",
                { style: { padding: "8px", borderTop: "1px solid rgba(255,255,255,0.04)" } },
                prov.summary && React.createElement(
                  "div",
                  { style: { fontSize: "11px", color: "#CBD5E1", lineHeight: 1.6, marginBottom: "6px" } },
                  prov.summary.length > 400 ? prov.summary.slice(0, 400) + "\u2026" : prov.summary
                ),
                provText && React.createElement(
                  "div",
                  { style: { fontSize: "11px", color: "#94A3B8", lineHeight: 1.6, maxHeight: "200px", overflowY: "auto", fontFamily: "'DM Mono', monospace" } },
                  provText.length > 500 ? provText.slice(0, 500) + "\u2026" : provText
                ),
                prov.sourceUrl && React.createElement("a", {
                  href: prov.sourceUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    color: "#0EA5E9",
                    textDecoration: "none",
                    marginTop: "6px",
                    marginBottom: "4px"
                  }
                }, "\u2197 View on legislation.gov.uk"),
                React.createElement("button", {
                  type: "button",
                  onClick: function() {
                    if (window.__klSendMessage) window.__klSendMessage("Explain " + provTitle + " of the " + displayTitle + " and its practical implications");
                  },
                  style: {
                    display: "block",
                    marginTop: "6px",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    background: "rgba(14,165,233,0.06)",
                    border: "1px solid rgba(14,165,233,0.15)",
                    color: "#0EA5E9",
                    fontSize: "10px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif"
                  }
                }, "\u2192 Ask Eileen")
              )
            );
          })
        ),
        cases.length > 0 && React.createElement(
          "div",
          { style: { marginTop: "16px" } },
          React.createElement("div", {
            style: { fontSize: "12px", fontWeight: 600, color: "#0EA5E9", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }
          }, "Leading Cases (" + cases.length + ")"),
          cases.slice(0, 20).map(function(c, idx) {
            var caseText = c.principle || c.heldText || c.held || c.significance || "";
            return React.createElement(
              "div",
              {
                key: "lc-" + idx,
                style: { padding: "8px", marginBottom: "4px", borderRadius: "4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }
              },
              React.createElement("div", { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500 } }, c.name || c.title || "Unnamed case"),
              (c.citation || c.court || c.year) && React.createElement(
                "div",
                { style: { color: "#64748B", fontSize: "10px", marginTop: "2px", fontFamily: "'DM Mono', monospace" } },
                [c.citation, c.court, c.year].filter(Boolean).join(" \xB7 ")
              ),
              caseText && React.createElement(
                "div",
                { style: { color: "#94A3B8", fontSize: "11px", marginTop: "4px", lineHeight: 1.4 } },
                caseText.length > 200 ? caseText.slice(0, 200) + "\u2026" : caseText
              ),
              (c.url || c.bailiiUrl) && React.createElement("a", {
                href: c.url || c.bailiiUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                style: { fontSize: "10px", color: "#0EA5E9", textDecoration: "none", marginTop: "4px", display: "inline-block" }
              }, "\u2197 BAILII")
            );
          })
        )
      );
    }
    var tabs = [
      { id: "library", label: "Library" },
      { id: "provisions", label: "Provisions" },
      { id: "cases", label: "Cases" }
    ];
    return React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { display: "flex", gap: "8px", marginBottom: "10px" } },
        tabs.map(function(t) {
          return React.createElement("button", {
            key: t.id,
            type: "button",
            onClick: function() {
              setTab(t.id);
              setSearch("");
              setExpanded({});
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
          }, t.label);
        })
      ),
      React.createElement("input", {
        type: "text",
        placeholder: "Search " + tab + "\u2026",
        value: search,
        onChange: function(e) {
          setSearch(e.target.value);
        },
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
      }),
      loading ? React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "12px" } }, "Loading\u2026") : tab === "library" ? renderLibraryTab() : tab === "provisions" ? renderProvisionsTab() : renderCasesTab()
    );
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
    notes: "Saved Items",
    documents: "Documents",
    calendar: "Calendar",
    eileen: "Eileen",
    research: "Research",
    planner: "Contract Planner"
  };
  var PANEL_COMPONENTS = {
    vault: VaultPanel,
    notes: NotesPanel,
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
  function HorizonAlert() {
    const [event, setEvent] = useState(null);
    useEffect(() => {
      let cancelled = false;
      async function load() {
        try {
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const resp = await fetch(
            SUPABASE_URL + "/rest/v1/regulatory_requirements?is_forward_requirement=eq.true&effective_from=gte." + today + "&select=requirement_name,statutory_basis,effective_from&order=effective_from.asc&limit=1",
            {
              headers: {
                "Authorization": "Bearer " + (window.__klToken || ""),
                "apikey": SUPABASE_ANON_KEY
              }
            }
          );
          const data = await resp.json();
          if (cancelled) return;
          if (Array.isArray(data) && data[0]) {
            setEvent(data[0]);
          }
        } catch (e) {
          console.warn("HorizonAlert fetch failed (non-blocking):", e);
        }
      }
      if (window.__klToken) load();
      return () => {
        cancelled = true;
      };
    }, []);
    if (!event) return null;
    const effectiveDate = new Date(event.effective_from);
    const now = /* @__PURE__ */ new Date();
    const diffDays = Math.max(0, Math.ceil((effectiveDate - now) / (1e3 * 60 * 60 * 24)));
    const dateLabel = effectiveDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const urgencyColor = diffDays <= 30 ? "#F59E0B" : diffDays <= 90 ? "#0EA5E9" : "#64748B";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "kl-horizon-alert",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "6px 14px",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "16px",
          marginTop: "8px",
          maxWidth: "640px",
          width: "100%",
          fontFamily: "'DM Sans', sans-serif"
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: urgencyColor,
            flexShrink: 0
          }
        }
      ),
      /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500 } }, event.requirement_name), event.statutory_basis && /* @__PURE__ */ React.createElement("span", { style: { color: "#64748B", fontSize: "11px", marginLeft: "6px" } }, event.statutory_basis)),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            color: urgencyColor,
            fontSize: "11px",
            fontWeight: 500,
            fontFamily: "'DM Mono', monospace",
            whiteSpace: "nowrap",
            flexShrink: 0
          }
        },
        diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : diffDays + " days",
        " \u2014 ",
        dateLabel
      )
    );
  }
  function BookShelf({ onOpenBook }) {
    var _books = useState([]);
    var books = _books[0];
    var setBooks = _books[1];
    useEffect(function() {
      var cancelled = false;
      fetch("/knowledge-library/content/content-index.json").then(function(r) {
        return r.json();
      }).then(function(data) {
        if (!cancelled && Array.isArray(data)) {
          var byCat = {};
          data.forEach(function(inst) {
            if (!byCat[inst.cat]) byCat[inst.cat] = [];
            byCat[inst.cat].push(inst);
          });
          var featured = [];
          var catOrder = ["legislation", "acas", "hse", "ehrc", "ico"];
          catOrder.forEach(function(cat) {
            if (byCat[cat]) {
              featured = featured.concat(byCat[cat].slice(0, 3));
            }
          });
          setBooks(featured.slice(0, 15));
        }
      }).catch(function(e) {
        console.warn("BookShelf fetch failed:", e);
      });
      return function() {
        cancelled = true;
      };
    }, []);
    if (books.length === 0) return null;
    var BOOK_COLOURS = {
      legislation: { bg: "linear-gradient(160deg, #1a2332 0%, #0f1923 50%, #1a2332 100%)", text: "#D4A017", spine: "#D4A017" },
      acas: { bg: "linear-gradient(160deg, #0f2318 0%, #0a1a12 50%, #0f2318 100%)", text: "#10B981", spine: "#10B981" },
      hse: { bg: "linear-gradient(160deg, #231a0f 0%, #1a1208 50%, #231a0f 100%)", text: "#F59E0B", spine: "#F59E0B" },
      ehrc: { bg: "linear-gradient(160deg, #1f0f23 0%, #170a1a 50%, #1f0f23 100%)", text: "#EC4899", spine: "#EC4899" },
      ico: { bg: "linear-gradient(160deg, #0f1523 0%, #0a0f1a 50%, #0f1523 100%)", text: "#8B5CF6", spine: "#8B5CF6" }
    };
    return React.createElement(
      "div",
      {
        className: "kl-bookshelf",
        style: { width: "100%", maxWidth: "820px", marginTop: "32px" }
      },
      React.createElement("div", {
        style: {
          fontSize: "10px",
          fontWeight: 500,
          color: "#475569",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "12px",
          fontFamily: "'DM Mono', monospace",
          textAlign: "center"
        }
      }, "The Employment Law Library"),
      React.createElement(
        "div",
        {
          className: "kl-shelf",
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "center",
            padding: "16px 12px 20px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(139,92,246,0.02) 100%)",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.04)",
            position: "relative"
          }
        },
        books.map(function(book) {
          var colours = BOOK_COLOURS[book.cat] || BOOK_COLOURS.legislation;
          var shortTitle = book.short || book.title;
          if (shortTitle.length > 35) shortTitle = shortTitle.slice(0, 32) + "\u2026";
          return React.createElement(
            "div",
            {
              key: book.id,
              onClick: function() {
                onOpenBook(book);
              },
              className: "kl-book",
              style: {
                width: "100px",
                height: "130px",
                borderRadius: "2px 4px 4px 2px",
                background: colours.bg,
                cursor: "pointer",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "10px 8px 8px",
                overflow: "hidden",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "2px 2px 8px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.05)",
                borderLeft: "4px solid " + colours.spine
              },
              title: book.title,
              onMouseEnter: function(e) {
                e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
                e.currentTarget.style.boxShadow = "2px 6px 16px rgba(0,0,0,0.5), inset -1px 0 0 rgba(255,255,255,0.08)";
              },
              onMouseLeave: function(e) {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "2px 2px 8px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.05)";
              }
            },
            React.createElement("div", {
              style: {
                width: "60%",
                height: "1px",
                background: colours.text,
                opacity: 0.3,
                marginBottom: "6px"
              }
            }),
            React.createElement("div", {
              style: {
                color: colours.text,
                fontSize: "10px",
                fontWeight: 600,
                lineHeight: 1.25,
                fontFamily: "'DM Sans', sans-serif",
                flex: 1,
                display: "flex",
                alignItems: "center"
              }
            }, shortTitle),
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end"
                }
              },
              React.createElement("span", {
                style: {
                  fontSize: "7px",
                  color: colours.text,
                  opacity: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "'DM Mono', monospace"
                }
              }, book.cat === "legislation" ? "Act" : book.cat === "acas" ? "ACAS" : book.cat === "hse" ? "HSE" : book.cat === "ico" ? "ICO" : book.cat === "ehrc" ? "EHRC" : ""),
              React.createElement("div", {
                style: {
                  width: "3px",
                  height: "80%",
                  position: "absolute",
                  right: 0,
                  top: "10%",
                  background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)"
                }
              })
            )
          );
        }),
        React.createElement("div", {
          style: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, rgba(139,92,246,0.1), rgba(14,165,233,0.1), rgba(139,92,246,0.1))",
            borderRadius: "0 0 8px 8px"
          }
        })
      ),
      React.createElement(
        "div",
        { style: { textAlign: "center", marginTop: "12px" } },
        React.createElement("button", {
          type: "button",
          onClick: function() {
            if (typeof window.__klOpenPanel === "function") window.__klOpenPanel("research");
          },
          style: {
            background: "transparent",
            border: "none",
            color: "#0EA5E9",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            padding: "4px 8px"
          }
        }, "Browse all 72 instruments \u2192")
      )
    );
  }
  function DomainSubPage({ domain, onBack, onAskEileen, onSend, isLoading, onFileSelect, nexusState, prefersReducedMotion, onInputChange, tier }) {
    var _exp = useState(null);
    var expandedSubArea = _exp[0];
    var setExpandedSubArea = _exp[1];
    return React.createElement(
      "div",
      {
        className: "kl-main",
        style: { display: "flex", flexDirection: "column", height: "100%" }
      },
      // §4.2 Breadcrumb
      React.createElement(
        "nav",
        {
          role: "navigation",
          "aria-label": "Breadcrumb",
          style: {
            padding: "12px 24px",
            borderBottom: "1px solid #1E3A5F",
            background: "#0F1D32",
            flexShrink: 0
          }
        },
        React.createElement("span", {
          style: { color: "#94A3B8", cursor: "pointer", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" },
          onClick: onBack
        }, "Knowledge Library"),
        React.createElement("span", { style: { color: "#475569", margin: "0 8px" } }, "\u203A"),
        React.createElement("span", {
          style: { color: "#F1F5F9", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }
        }, domain.name)
      ),
      // §4.3 Domain selector — compact horizontal tabs
      React.createElement(
        "div",
        {
          style: {
            padding: "8px 24px",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            borderBottom: "1px solid #1E3A5F",
            background: "#0F1D32",
            flexShrink: 0
          }
        },
        DOMAINS.map(function(d) {
          return React.createElement("button", {
            key: d.id,
            type: "button",
            onClick: function() {
              window.location.hash = "/domain/" + d.slug;
            },
            style: {
              background: d.id === domain.id ? "#0EA5E9" : "transparent",
              color: d.id === domain.id ? "#FFFFFF" : "#94A3B8",
              border: d.id === domain.id ? "none" : "1px solid #334155",
              borderRadius: "16px",
              padding: "4px 12px",
              fontSize: "12px",
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.15s"
            }
          }, d.name);
        })
      ),
      // Scrollable main content
      React.createElement(
        "div",
        {
          style: { flex: 1, overflowY: "auto", padding: "24px", minHeight: 0 }
        },
        // §4.4 Domain Header
        React.createElement("h1", {
          style: {
            color: "#0EA5E9",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "28px",
            margin: "0 0 12px",
            fontWeight: 700
          }
        }, domain.name),
        React.createElement("p", {
          style: {
            color: "#CBD5E1",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            lineHeight: 1.7,
            maxWidth: "720px",
            margin: "0 0 32px"
          }
        }, domain.orientation),
        // §4.5 Sub-Area Grid
        React.createElement("h2", {
          style: {
            color: "#F1F5F9",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "18px",
            margin: "0 0 16px",
            fontWeight: 600
          }
        }, "Topics in this area"),
        React.createElement(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "12px",
              marginBottom: "32px"
            }
          },
          domain.subAreas.map(function(sa, i) {
            var isExpanded = expandedSubArea === i;
            var toggleExpand = function() {
              setExpandedSubArea(isExpanded ? null : i);
            };
            return React.createElement(
              "div",
              { key: i },
              // Sub-area card header
              React.createElement(
                "div",
                {
                  role: "button",
                  tabIndex: 0,
                  "aria-expanded": isExpanded,
                  "aria-label": sa.name + (isExpanded ? " \u2014 collapse" : " \u2014 expand for details"),
                  onClick: toggleExpand,
                  onKeyDown: function(e) {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand();
                    }
                  },
                  style: {
                    background: "#111827",
                    border: isExpanded ? "1px solid #0EA5E9" : "1px solid #1E293B",
                    borderRadius: isExpanded ? "8px 8px 0 0" : "8px",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "border-color 0.2s"
                  }
                },
                React.createElement("h3", {
                  style: { color: "#F1F5F9", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", margin: "0 0 6px", fontWeight: 600 }
                }, sa.name),
                React.createElement("p", {
                  style: { color: "#64748B", fontSize: "12px", fontFamily: "'DM Mono', monospace", margin: "0 0 8px" }
                }, sa.instruments),
                React.createElement("span", {
                  style: { color: isExpanded ? "#0EA5E9" : "#475569", fontSize: "11px" }
                }, isExpanded ? "\u25BE Less" : "\u25B8 Details")
              ),
              // Expanded details
              isExpanded ? React.createElement(
                "div",
                {
                  style: {
                    background: "#0F172A",
                    border: "1px solid #1E293B",
                    borderTop: "none",
                    borderRadius: "0 0 8px 8px",
                    padding: "16px"
                  }
                },
                React.createElement("p", {
                  style: { color: "#CBD5E1", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, margin: "0 0 12px" }
                }, sa.scope),
                React.createElement("button", {
                  type: "button",
                  onClick: function() {
                    onAskEileen("Tell me about " + sa.name.toLowerCase() + " in the context of " + domain.name.toLowerCase());
                  },
                  style: {
                    background: "transparent",
                    border: "1px solid #0EA5E9",
                    color: "#0EA5E9",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }
                }, "Discuss with Eileen \u2192")
              ) : null
            );
          })
        ),
        // §4.6 Key Instruments Strip
        React.createElement("h2", {
          style: {
            color: "#F1F5F9",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "18px",
            margin: "0 0 16px",
            fontWeight: 600
          }
        }, "Key instruments"),
        React.createElement(
          "div",
          {
            style: { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px" }
          },
          (function() {
            var seen = {};
            var unique = [];
            domain.subAreas.forEach(function(sa) {
              sa.instruments.split(", ").forEach(function(inst) {
                if (!seen[inst]) {
                  seen[inst] = true;
                  unique.push(inst);
                }
              });
            });
            return unique;
          })().map(function(inst, i) {
            return React.createElement("span", {
              key: i,
              style: {
                background: "#1E293B",
                color: "#0EA5E9",
                padding: "6px 12px",
                borderRadius: "16px",
                fontSize: "12px",
                fontFamily: "'DM Mono', monospace",
                whiteSpace: "nowrap"
              }
            }, inst);
          })
        )
      ),
      // §4.7 Eileen Panel — anchored at bottom
      React.createElement(
        "div",
        {
          style: {
            borderTop: "1px solid #1E3A5F",
            padding: "16px 24px",
            background: "#0F1D32",
            flexShrink: 0
          }
        },
        React.createElement(
          "div",
          {
            style: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }
          },
          React.createElement(NexusCanvas, { size: 20, nexusState: nexusState || "dormant", tier: tier || "kl", prefersReducedMotion }),
          React.createElement("span", {
            style: { color: "#94A3B8", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }
          }, domain.eileenGreeting)
        ),
        React.createElement(MessageInput, { onSend, disabled: isLoading, onFileSelect, onInputChange, nexusState, tier, prefersReducedMotion })
      )
    );
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
    const [floatingNexusOpen, setFloatingNexusOpen] = useState(false);
    const [nearDomain, setNearDomain] = useState(null);
    const nearDomainTimeout = useRef(null);
    function handleDomainHover(domainSlug) {
      setNearDomain(domainSlug);
      if (nearDomainTimeout.current) clearTimeout(nearDomainTimeout.current);
      nearDomainTimeout.current = setTimeout(function() {
        setNearDomain(null);
      }, 5e3);
    }
    function handleDomainLeave() {
      if (nearDomainTimeout.current) clearTimeout(nearDomainTimeout.current);
      nearDomainTimeout.current = setTimeout(function() {
        setNearDomain(null);
      }, 2e3);
    }
    const [nexusState, setNexusState] = useState("dormant");
    const presentingTimerRef = useRef(null);
    const [userType, setUserType] = useState(function() {
      try {
        return localStorage.getItem("ailane_kl_user_type") || null;
      } catch (e) {
        return null;
      }
    });
    const [showQualifier, setShowQualifier] = useState(false);
    const [qualifierShownThisSession, setQualifierShownThisSession] = useState(false);
    const [hasUploadedThisSession, setHasUploadedThisSession] = useState(false);
    const contractPromptShown = useRef(false);
    const [currentView, setCurrentView] = useState(function() {
      var route = getRoute();
      return route.view;
    });
    const [currentDomain, setCurrentDomain] = useState(function() {
      var route = getRoute();
      return route.domain || null;
    });
    useEffect(function() {
      function handleRoute() {
        var route = getRoute();
        if (route.view === "domain") {
          setCurrentView("domain");
          setCurrentDomain(route.domain);
        } else {
          setCurrentView(messages.length > 0 ? "conversation" : "welcome");
          setCurrentDomain(null);
        }
      }
      window.addEventListener("hashchange", handleRoute);
      return function() {
        window.removeEventListener("hashchange", handleRoute);
      };
    }, [messages.length]);
    const loadSessionHistory = useCallback(async function() {
      if (!window.__klToken || !window.__klUserId) return;
      try {
        const resp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_eileen_conversations?user_id=eq." + window.__klUserId + "&select=session_id,user_message,categories_matched,created_at&order=created_at.desc&limit=200",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        );
        const data = await resp.json();
        if (!Array.isArray(data)) return;
        const grouped = {};
        data.forEach((row) => {
          if (!grouped[row.session_id]) {
            var title = row.user_message ? row.user_message.substring(0, 50) : "(untitled)";
            if (row.categories_matched && row.categories_matched.length > 0) {
              var catKey = row.categories_matched[0];
              if (CATEGORY_TITLES[catKey]) {
                title = CATEGORY_TITLES[catKey];
              }
            }
            grouped[row.session_id] = {
              sessionId: row.session_id,
              title,
              lastActivity: row.created_at,
              dateGroup: classifyDate(row.created_at),
              messageCount: 1
            };
          } else {
            grouped[row.session_id].messageCount++;
          }
        });
        var sessions = Object.values(grouped);
        var categoryTitleValues = Object.values(CATEGORY_TITLES);
        sessions.forEach(function(s) {
          if (s.messageCount > 1 && categoryTitleValues.indexOf(s.title) !== -1) {
            s.title = s.title + " (" + s.messageCount + ")";
          }
        });
        setSessionHistory(sessions.slice(0, 50));
      } catch (err) {
        console.error("Failed to load session history:", err);
      }
    }, []);
    async function loadUserPreferences() {
      if (!window.__klToken || !window.__klUserId) return;
      try {
        var resp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_user_preferences?user_id=eq." + window.__klUserId + "&select=preferences",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        );
        var data = await resp.json();
        if (Array.isArray(data) && data.length > 0 && data[0].preferences) {
          var prefs = data[0].preferences;
          if (prefs.user_type) {
            setUserType(prefs.user_type);
            try {
              localStorage.setItem("ailane_kl_user_type", prefs.user_type);
            } catch (e) {
            }
          }
        }
      } catch (err) {
        console.error("Failed to load user preferences:", err);
      }
    }
    useEffect(() => {
      function onReady(e) {
        setAccessType(e.detail.accessType);
        setTier(e.detail.tier);
        setSessionExpiresAt(window.__klSessionExpiry || null);
        loadSessionHistory();
        loadUserPreferences();
      }
      window.addEventListener("ailane-kl-ready", onReady);
      if (window.__klAccessType) {
        loadSessionHistory();
        loadUserPreferences();
      }
      return () => window.removeEventListener("ailane-kl-ready", onReady);
    }, [loadSessionHistory]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const prefersReducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    useEffect(function() {
      if (typeof window === "undefined" || !window.speechSynthesis) return void 0;
      try {
        window.speechSynthesis.getVoices();
      } catch (e) {
      }
      function onVoicesChanged() {
        try {
          window.speechSynthesis.getVoices();
        } catch (e) {
        }
      }
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
      return function() {
        try {
          window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
          window.speechSynthesis.cancel();
        } catch (e) {
        }
      };
    }, []);
    useEffect(() => {
      function onResize() {
        var mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (mobile) {
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
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (e) {
      }
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
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (e) {
      }
      setSessionId("eileen-" + Date.now() + "-" + Math.random().toString(36).substr(2, 7));
      setMessages([]);
      setCurrentView("welcome");
      setCurrentDomain(null);
      contractPromptShown.current = false;
      if (window.location.hash && window.location.hash !== "#/") {
        window.location.hash = "/";
      }
    }
    async function sendMessage(text) {
      const clean = (text || "").trim();
      if (!clean || isLoading) return;
      if (currentView === "domain") {
        setCurrentView("conversation");
      }
      setMessages((prev) => [...prev, { role: "user", content: clean }]);
      setIsLoading(true);
      if (presentingTimerRef.current) {
        clearTimeout(presentingTimerRef.current);
        presentingTimerRef.current = null;
      }
      setNexusState("processing");
      try {
        var requestBody = {
          message: (userType ? "[Context: user is " + (userType === "employer" ? "an employer/HR professional managing staff" : "a worker with a question about their own employment") + "] " : "") + clean,
          session_id: sessionId,
          page_context: currentDomain ? "knowledge-library/domain/" + currentDomain.slug : "knowledge-library"
        };
        if (currentDomain) {
          requestBody.domain_context = currentDomain.id;
        }
        const resp = await fetch(EILEEN_ENDPOINT, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + window.__klToken,
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY
          },
          body: JSON.stringify(requestBody)
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
          setNexusState("presenting");
          presentingTimerRef.current = setTimeout(function() {
            setNexusState("dormant");
            presentingTimerRef.current = null;
          }, 2e3);
          if (!userType && !qualifierShownThisSession) {
            setShowQualifier(true);
            setQualifierShownThisSession(true);
          }
          if (hasContractIntent(clean) && !contractPromptShown.current && !hasUploadedThisSession) {
            contractPromptShown.current = true;
            setTimeout(function() {
              setMessages(function(prev) {
                return prev.concat([{
                  role: "system_ui",
                  type: "contract_upload_prompt"
                }]);
              });
            }, 800);
          }
        } else {
          setNexusState("dormant");
          setMessages((prev) => [...prev, {
            role: "assistant",
            isError: true,
            errorMessage: "I wasn't able to process that just now. This is usually temporary \u2014 would you like to try again?",
            retryAction: function() {
              sendMessage(clean);
            }
          }]);
        }
      } catch (err) {
        console.error("sendMessage error:", err);
        setNexusState("dormant");
        var isOffline = !navigator.onLine || err && err.message && err.message.indexOf("fetch") !== -1;
        setMessages((prev) => [...prev, {
          role: "assistant",
          isError: true,
          errorMessage: isOffline ? "It looks like we've lost connection. Please check your internet and try again when you're ready." : "I wasn't able to process that just now. This is usually temporary \u2014 would you like to try again?",
          retryAction: function() {
            sendMessage(clean);
          }
        }]);
      } finally {
        setIsLoading(false);
      }
    }
    function handleInputChange(inputLength) {
      if (inputLength > 0 && nexusState === "dormant") setNexusState("ready");
      else if (inputLength === 0 && nexusState === "ready") setNexusState("dormant");
    }
    useEffect(function() {
      return function() {
        if (presentingTimerRef.current) clearTimeout(presentingTimerRef.current);
      };
    }, []);
    window.__klSendMessage = sendMessage;
    window.__klSeedInput = function(text) {
      if (typeof text !== "string" || !text) return;
      try {
        window.dispatchEvent(new CustomEvent("kl-seed-input", { detail: { text } }));
      } catch (e) {
        var ev = document.createEvent("CustomEvent");
        ev.initCustomEvent("kl-seed-input", true, true, { text });
        window.dispatchEvent(ev);
      }
    };
    window.__klOpenPanel = function(panelId) {
      setActivePanel(panelId);
    };
    window.__klHandleFileSelect = handleFileSelect;
    async function handleUserTypeSelect(type) {
      setUserType(type);
      setShowQualifier(false);
      try {
        localStorage.setItem("ailane_kl_user_type", type);
      } catch (e) {
      }
      if (!window.__klToken || !window.__klUserId) return;
      try {
        var checkResp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_user_preferences?user_id=eq." + window.__klUserId + "&select=id,preferences",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        );
        var existing = await checkResp.json();
        if (Array.isArray(existing) && existing.length > 0) {
          var merged = Object.assign({}, existing[0].preferences, { user_type: type });
          await fetch(
            SUPABASE_URL + "/rest/v1/kl_user_preferences?id=eq." + existing[0].id,
            {
              method: "PATCH",
              headers: {
                "Authorization": "Bearer " + window.__klToken,
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({ preferences: merged, updated_at: (/* @__PURE__ */ new Date()).toISOString() })
            }
          );
        } else {
          await fetch(
            SUPABASE_URL + "/rest/v1/kl_user_preferences",
            {
              method: "POST",
              headers: {
                "Authorization": "Bearer " + window.__klToken,
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({
                user_id: window.__klUserId,
                preferences: { user_type: type }
              })
            }
          );
        }
      } catch (err) {
        console.error("Failed to save user type:", err);
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
          isError: true,
          errorMessage: "The document upload didn't complete. Please check the file is a PDF or Word document and try again."
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
          isError: true,
          errorMessage: "The document upload didn't complete. Please check the file is a PDF or Word document and try again."
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
      var charCount = extractResult && typeof extractResult.char_count === "number" ? extractResult.char_count : null;
      var extractionFailed = charCount === null;
      updateFileMessage(msgId, {
        status: extractionFailed ? "saved-no-extract" : "ready",
        charCount: charCount || 0
      });
      addMessage({
        id: "ready-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        role: "assistant",
        content: "",
        isLocal: true,
        isUploadComplete: true,
        filename: file.name,
        fileSize: file.size,
        charCount: charCount || 0,
        documentId,
        vaultOnly: false,
        extractionFailed
      });
    }
    function handleVaultOnly(msgId) {
      setMessages(function(prev) {
        return prev.map(function(m) {
          return m.id === msgId ? Object.assign({}, m, { vaultOnly: true }) : m;
        });
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
        const startResponse = await fetch(
          SUPABASE_URL + "/functions/v1/kl-compliance-bridge",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
              document_id: documentId,
              document_type: "employment_contract",
              action: "start"
            })
          }
        );
        const startData = await startResponse.json();
        if (!startResponse.ok) {
          phaseTimers.forEach((t) => clearTimeout(t));
          if (startData && startData.error === "check_limit_reached") {
            setMessages(
              (prev) => prev.map((m) => {
                if (m.id === loadingMsgId) {
                  return Object.assign({}, m, {
                    content: startData.message || "You have used all bundled Contract Compliance Checks in this session. Additional checks are available at \xA315 each.",
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
          throw new Error(startData && (startData.error || startData.detail) || "Analysis failed");
        }
        var uploadId = startData.upload_id;
        if (!uploadId) throw new Error("No upload_id returned from bridge");
        setMessages(function(prev) {
          return prev.map(function(m) {
            return m.id === loadingMsgId ? Object.assign({}, m, { content: "Analysing your contract against UK employment law requirements. This typically takes 60\u201390 seconds." }) : m;
          });
        });
        var maxPolls = 60;
        var pollCount = 0;
        var pollResult = null;
        while (pollCount < maxPolls) {
          await new Promise(function(resolve) {
            setTimeout(resolve, 5e3);
          });
          pollCount++;
          var elapsed = pollCount * 5;
          if (elapsed === 15) {
            setMessages(function(prev) {
              return prev.map(function(m) {
                return m.id === loadingMsgId ? Object.assign({}, m, { content: "Checking statutory provisions and case law references\u2026" }) : m;
              });
            });
          } else if (elapsed === 35) {
            setMessages(function(prev) {
              return prev.map(function(m) {
                return m.id === loadingMsgId ? Object.assign({}, m, { content: "Assessing forward legislative exposure under ERA 2025\u2026" }) : m;
              });
            });
          } else if (elapsed === 60) {
            setMessages(function(prev) {
              return prev.map(function(m) {
                return m.id === loadingMsgId ? Object.assign({}, m, { content: "Compiling findings and scoring compliance position\u2026" }) : m;
              });
            });
          }
          try {
            var pollResponse = await fetch(
              SUPABASE_URL + "/functions/v1/kl-compliance-bridge",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                  document_id: documentId,
                  upload_id: uploadId,
                  action: "poll"
                })
              }
            );
            var pollData = await pollResponse.json();
            if (pollData.status === "processing") {
              continue;
            }
            pollResult = pollData;
            break;
          } catch (pollErr) {
            console.warn("Poll error (will retry):", pollErr);
            continue;
          }
        }
        phaseTimers.forEach(function(t) {
          clearTimeout(t);
        });
        if (!pollResult) {
          throw new Error("Analysis is taking longer than expected. Your results will appear in the Document Vault when ready.");
        }
        setMessages(function(prev) {
          var withoutLoading = prev.filter(function(m) {
            return m.id !== loadingMsgId;
          });
          return withoutLoading.concat([{
            id: "result-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
            role: "assistant",
            content: "",
            isLocal: true,
            isAnalysisResult: true,
            // R1-C §3: merge upload_id so the PDF download button in
            // AnalysisResultMessage can reference it via data.upload_id.
            // Sprint F §2.2: merge document_id so the Save to Vault button
            // can PATCH the kl_vault_documents row.
            analysisData: Object.assign({}, pollResult, { upload_id: uploadId, document_id: documentId })
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
      setHasUploadedThisSession(true);
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
        onCrownQuery: sendMessage,
        nexusState,
        prefersReducedMotion: prefersReducedMotion.current
      }
    ), currentView === "domain" && currentDomain ? /* @__PURE__ */ React.createElement(
      DomainSubPage,
      {
        domain: currentDomain,
        onBack: function() {
          window.location.hash = "/";
        },
        onAskEileen: function(question) {
          sendMessage(question);
        },
        onSend: sendMessage,
        isLoading,
        onFileSelect: handleFileSelect,
        nexusState,
        prefersReducedMotion: prefersReducedMotion.current,
        onInputChange: handleInputChange,
        tier
      }
    ) : /* @__PURE__ */ React.createElement(
      ConversationArea,
      {
        messages,
        isLoading,
        onSend: sendMessage,
        accessType,
        tier,
        onFileSelect: handleFileSelect,
        onRunAnalysis: handleRunAnalysis,
        onVaultOnly: handleVaultOnly,
        floatingNexusExpanded: floatingNexusOpen,
        onToggleFloatingNexus: () => setFloatingNexusOpen(!floatingNexusOpen),
        showQualifier,
        onUserTypeSelect: handleUserTypeSelect,
        pulseUpload: messages.some(function(m) {
          return m.role === "system_ui" && m.type === "contract_upload_prompt";
        }) && !hasUploadedThisSession,
        nexusState,
        prefersReducedMotion: prefersReducedMotion.current,
        onInputChange: handleInputChange,
        nearDomain,
        onDomainHover: handleDomainHover,
        onDomainLeave: handleDomainLeave
      }
    ), currentView !== "domain" && messages.length === 0 && /* @__PURE__ */ React.createElement(
      FloatingNexusAdvisor,
      {
        nearDomain,
        nexusState,
        prefersReducedMotion: prefersReducedMotion.current,
        onProximityDomain: function(slug) {
          if (slug) handleDomainHover(slug);
          else handleDomainLeave();
        }
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
