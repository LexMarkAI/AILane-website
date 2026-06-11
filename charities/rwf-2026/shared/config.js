/* =============================================================================
 * Charity Onboarding Room — configuration
 * AILANE-CC-BRIEF-CSO-ROOM-WEB-002 §1 · AILANE-SPEC-CSO-004 v1.0
 * Room: /charities/rwf-2026/ — The Rudolph Walker Foundation
 *
 * The anon key below is the published public anon key already shipped on this
 * site (the SUPABASE_ANON_KEY constant in the live partner room shared auth.js).
 * PROVISIONED is true; surfaces whose backing tables / policies have not yet
 * arrived (BACKEND-002, RLS at provisioning) still render their graceful
 * "opens at provisioning" states — that is a completion state, not an error.
 * ============================================================================= */
(function () {
  'use strict';

  var ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';

  window.CHARITY_ROOM = {
    SUPABASE_URL: 'https://cnbsxwtvazfvzmltkuvx.supabase.co',
    SUPABASE_ANON_KEY: ANON_KEY,
    PROVISIONED: ANON_KEY.indexOf('__ANON_KEY__') === -1,

    CLID: 'rwf-2026',
    ROOM_LABEL: 'Charity Onboarding Room',
    CHARITY_NAME: 'The Rudolph Walker Foundation',
    ROOM_HOME: '/charities/rwf-2026/',

    /* Entry-gate version constants (dealroom_terms_acceptance rows) */
    TERMS_VERSION: 'charity-room-terms-v1',
    PRIVACY_VERSION: 'charity-room-privacy-v1',

    /* Eileen — active version 2; callers degrade gracefully if unreachable */
    EILEEN_EF_URL: 'https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/eileen-charityroom',

    /* Contract Vault (BACKEND-002 — degrade until applied) */
    VAULT_BUCKET: 'charity-vault',

    /* Blocking docs: acceptance = signature, captured in-room */
    ACCEPTANCE_DOC_CODES: ['AILANE-NDA-RWF-001', 'AILANE-AGT-RWF-001'],

    /* In-room rendering registry (storage_path NULL — these fragments are the
     * v1 rendering). type 'fragment' loads shared/docs/<doc_code>.html;
     * type 'summary' renders a summary card + canonical /terms/ or /privacy/
     * link (acceptance for those is captured at the entry gate). */
    DOC_VIEWS: {
      'AILANE-TERMS-CURRENT': {
        type: 'summary',
        href: '/terms/',
        link_label: 'Read the full Terms of Service',
        summary: 'The Ailane Terms of Service govern use of this room and the platform. ' +
          'The canonical text lives on the public Terms page. Your acceptance was recorded ' +
          'when you entered this room.'
      },
      'AILANE-PRIVACY-CURRENT': {
        type: 'summary',
        href: '/privacy/',
        link_label: 'Read the full Privacy Notice',
        summary: 'The Privacy Notice explains how AI Lane Limited handles personal data in ' +
          'this room. The canonical text lives on the public Privacy page. Your acceptance ' +
          'was recorded when you entered this room.'
      },
      'AILANE-SAFEGUARDING-DATA-001': { type: 'fragment' },
      'AILANE-NDA-RWF-001': { type: 'fragment', blocking: true },
      'AILANE-AGT-RWF-001': { type: 'fragment', blocking: true }
    },

    /* Plain-English phase labels (canonical phase_0..phase_f taxonomy) */
    PHASE_LABEL: {
      phase_0: 'Phase 0 — Getting started',
      phase_a: 'Phase A — First conversations',
      phase_b: 'Phase B — Agreements',
      phase_c: 'Phase C — Setting up',
      phase_d: 'Phase D — Up and running',
      phase_e: 'Phase E — Review & renewal',
      phase_f: 'Phase F — Wind-down'
    },
    DEFAULT_GATE_TEXT: 'Phase 0 — Awaiting counterparty',

    /* Document seed — mirrors the live dealroom_documents_catalog rows for
     * clid rwf-2026; rendered when the catalog is not reachable (RLS pending). */
    PHASE0_DOCS: [
      {
        doc_code: 'AILANE-TERMS-CURRENT',
        name: 'Terms of Service',
        description: 'The Ailane terms that govern use of this room. Read them in-room or on the public Terms page.',
        version_label: 'current',
        phase: 'phase_0',
        acceptance: false
      },
      {
        doc_code: 'AILANE-PRIVACY-CURRENT',
        name: 'Privacy Notice',
        description: 'How AI Lane Limited handles personal data in this room. Read it in-room or on the public Privacy page.',
        version_label: 'current',
        phase: 'phase_0',
        acceptance: false
      },
      {
        doc_code: 'AILANE-SAFEGUARDING-DATA-001',
        name: 'Safeguarding Data-Handling Statement',
        description: 'The data posture Ailane holds itself to in this room, because the Foundation works with children and young people. Read it in-room.',
        version_label: 'v1.0',
        phase: 'phase_0',
        acceptance: false
      },
      {
        doc_code: 'AILANE-NDA-RWF-001',
        name: 'Mutual Non-Disclosure Agreement',
        description: 'Keeps what both sides share in this room confidential. Read it in-room; acceptance is your signature.',
        version_label: 'v1.0',
        phase: 'phase_0',
        acceptance: true
      },
      {
        doc_code: 'AILANE-AGT-RWF-001',
        name: 'Founding Charity Partner Agreement (fee-waived)',
        description: 'The fee-waived Founding Charity Partner agreement. Read it in-room; acceptance is your signature.',
        version_label: 'v1.0',
        phase: 'phase_a',
        acceptance: true
      }
    ]
  };
})();
