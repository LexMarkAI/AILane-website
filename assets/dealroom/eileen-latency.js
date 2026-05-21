/* =============================================================================
 * Eileen latency line pool
 * AILANE-AMD-REG-001 / AMD-146 + CC-EXEC-DNB-DEALROOM-OPERATIONAL §4.1 (Q3)
 *
 * Communicates intellectually during Eileen's wait window — no generic
 * "Thinking…" spinner. 55 unique lines across three pools:
 *
 *   - 15 universal openers (any prompt, first 3 seconds)
 *   - 30 topical lines (10 topics × 3 lines each — topic-detected from prompt)
 *   - 10 long-wait teaching beats (after ~3 seconds, on any prompt)
 *
 * Public API:
 *   window.eileenLatency.pickLatencyLine(prompt, elapsedMs, sessionSeenSet)
 *
 * sessionSeenSet is a Set the caller maintains so the same line is not picked
 * twice within a single page-session per pool.
 *
 * Drop into: /assets/dealroom/eileen-latency.js
 * ============================================================================= */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Universal openers (15) — first <3s, any prompt
  // ---------------------------------------------------------------------------
  const UNIVERSAL = [
    'Reading your question carefully…',
    'Cross-referencing the regulatory landscape…',
    'Consulting Ailane\'s intelligence estate…',
    'Holding the question alongside the relevant authorities…',
    'Working through this one with care…',
    'Letting the question settle before drafting a reply…',
    'Checking the substantive ground, then the framing…',
    'Holding the commercial logic alongside the legal logic…',
    'Drawing on the institutional context to answer well…',
    'Taking a moment to be precise rather than fast…',
    'Reaching for the right pieces of evidence…',
    'Triangulating between framework, statute and case law…',
    'Considering this in light of the engagement\'s current phase…',
    'Looking for the most directly relevant authorities…',
    'Composing a response that earns its words…',
  ];

  // ---------------------------------------------------------------------------
  // Topical pools (30) — 10 topics × 3 lines
  // Keyword groups detect topic from the prompt text.
  // ---------------------------------------------------------------------------
  const TOPICS = [
    {
      key: 'nda',
      keywords: ['nda', 'non-disclosure', 'non disclosure', 'confidential'],
      lines: [
        'Reading the NDA against the standard mutual confidentiality framework…',
        'Considering the carve-outs and the residual obligations on each side…',
        'Holding the NDA term against the engagement\'s commercial timeline…',
      ],
    },
    {
      key: 'data_protection',
      keywords: ['gdpr', 'data protection', 'dpa', 'privacy', 'data subject', 'ico'],
      lines: [
        'Cross-referencing UK GDPR Articles 6, 9 and 14 obligations…',
        'Considering the controller / processor / joint-controller boundary here…',
        'Reading this through the data minimisation and accuracy principles…',
      ],
    },
    {
      key: 'tribunal',
      keywords: ['tribunal', 'et', 'employment tribunal', 'judgment', 'judgement', 'judgments'],
      lines: [
        'Cross-referencing the Public Record tribunal estate…',
        'Considering the relevant Court of Appeal and EAT authorities…',
        'Holding the question against the substantive enrichment of the tribunal decisions…',
      ],
    },
    {
      key: 'employment',
      keywords: ['employment', 'employer', 'employee', 'era 1996', 'era 2025', 'tupe', 'redundancy', 'dismissal', 'unfair'],
      lines: [
        'Reading the question against ERA 1996 and ERA 2025 substantive amendments…',
        'Considering TUPE applicability and the relevant authority chain…',
        'Drawing on the Equality Act 2010 framework alongside the employment statute…',
      ],
    },
    {
      key: 'pricing',
      keywords: ['price', 'pricing', 'cost', 'fee', 'quote', 'envelope', 'package'],
      lines: [
        'Holding the pricing envelope against your cohort and exclusivity tier…',
        'Cross-referencing the package architecture and value-capture research…',
        'Considering the commercial framework alongside the strategic-value logic…',
      ],
    },
    {
      key: 'pilot',
      keywords: ['pilot', 'sow', 'statement of work', 'scope of work'],
      lines: [
        'Reading the pilot Statement of Work against the engagement roadmap…',
        'Considering the pilot scope, deliverables and acceptance criteria…',
        'Holding the pilot timeline against the broader commercial commitment…',
      ],
    },
    {
      key: 'commercial',
      keywords: ['commercial', 'proposal', 'contract', 'agreement', 'msa', 'mca'],
      lines: [
        'Reading the commercial framework alongside Ailane\'s ratified posture…',
        'Considering the MSA in light of the data-licensing architecture…',
        'Holding the commercial terms against the regulatory and audit obligations…',
      ],
    },
    {
      key: 'audit',
      keywords: ['audit', 'compliance', 'licence', 'license', 'attribution'],
      lines: [
        'Cross-referencing the Licence Audit Chain and source attribution…',
        'Considering the compliance posture across the Ailane estate…',
        'Reading the audit question against the ratified governance framework…',
      ],
    },
    {
      key: 'pathway',
      keywords: ['pathway', 'phase', 'gate', 'roadmap', 'milestone', 'next step'],
      lines: [
        'Reading the question against the engagement\'s current and next phases…',
        'Considering the phase-gating logic and the documents released in each phase…',
        'Holding the question against the asynchronous discipline of the roadmap…',
      ],
    },
    {
      key: 'company',
      keywords: ['ailane', 'company', 'about you', 'who are you', 'mark', 'director'],
      lines: [
        'Reading the question against AI Lane Limited\'s constitutional framework…',
        'Considering Ailane\'s ACEI, RRI and CCI compliance posture…',
        'Holding the question against the operational and regulatory framework Ailane runs under…',
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // Long-wait teaching beats (10) — after ~3s elapsed
  // ---------------------------------------------------------------------------
  const LONG_WAIT = [
    'Eileen treats every response as a small piece of institutional reasoning — taking a moment to do it properly…',
    'Substantive answers take a beat to assemble. The intelligence estate is large; the right pieces of it take a moment to find…',
    'Holding the question against statutes, case law, and the institutional training corpus before responding…',
    'A grounded answer is worth a few seconds of patience. Drawing on the relevant authorities now…',
    'The Ailane intelligence estate carries 131,000+ tribunal decisions, the full UK statutory framework, and a curated case-law backbone. Eileen is consulting the parts relevant to your question…',
    'Composing a response that distinguishes what is settled from what is contested…',
    'Considering whether this calls for a substantive answer, a clarifying question, or an escalation to the team — getting that judgement right takes a moment…',
    'Cross-checking the framework before committing to a phrasing — Eileen aims to be useful rather than merely fast…',
    'Reading the question alongside the engagement\'s broader commercial and regulatory context…',
    'Drafting a response that reflects Ailane\'s ratified posture, not a generic one…',
  ];

  // ---------------------------------------------------------------------------
  // Topic detection
  // ---------------------------------------------------------------------------
  function detectTopic(prompt) {
    if (!prompt || typeof prompt !== 'string') return null;
    const lower = prompt.toLowerCase();
    for (const topic of TOPICS) {
      for (const kw of topic.keywords) {
        if (lower.includes(kw)) return topic;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Pick — with session-scoped dedupe and long-wait swap
  // ---------------------------------------------------------------------------
  function pickFromPool(pool, sessionSeen, poolName) {
    // Filter to lines not already seen this session in this pool.
    const key = (line) => poolName + '::' + line;
    const available = pool.filter((line) => !sessionSeen.has(key(line)));
    const candidates = available.length > 0 ? available : pool; // fallback: reuse if all seen
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    sessionSeen.add(key(choice));
    return choice;
  }

  /**
   * pickLatencyLine — main entry point.
   * @param {string} prompt - User's latest message text (for topic detection)
   * @param {number} elapsedMs - milliseconds since send dispatched
   * @param {Set<string>} sessionSeen - mutable set; caller persists for page session
   * @returns {string} The line to display
   */
  function pickLatencyLine(prompt, elapsedMs, sessionSeen) {
    if (!(sessionSeen instanceof Set)) sessionSeen = new Set();

    // ≥3s — swap to long-wait teaching beat pool
    if (elapsedMs >= 3000) {
      return pickFromPool(LONG_WAIT, sessionSeen, 'long');
    }

    // <3s — prefer topical if a topic is detected, otherwise universal
    const topic = detectTopic(prompt);
    if (topic) {
      return pickFromPool(topic.lines, sessionSeen, 'topic_' + topic.key);
    }
    return pickFromPool(UNIVERSAL, sessionSeen, 'universal');
  }

  // ---------------------------------------------------------------------------
  // Public surface
  // ---------------------------------------------------------------------------
  window.eileenLatency = {
    pickLatencyLine,
    // Exposed for tests/diagnostics
    _pools: { universal: UNIVERSAL, topics: TOPICS, long_wait: LONG_WAIT },
    _detectTopic: detectTopic,
  };
})();
