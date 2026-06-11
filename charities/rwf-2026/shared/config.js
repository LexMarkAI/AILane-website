/* =============================================================================
 * Charity Onboarding Room — configuration
 * AILANE-CC-BRIEF-CSO-ROOM-WEB-001 §2 · AILANE-SPEC-CSO-003 v1.1
 * Room: /charities/rwf-2026/ — The Rudolph Walker Foundation
 *
 * __ANON_KEY__ is a deliberate placeholder: the Director substitutes the
 * published anon key at provisioning. Until then PROVISIONED === false and
 * every live surface renders its "opens at provisioning" state — that is a
 * completion state, not an error. No key is copied from elsewhere in the repo;
 * no standalone shared anon-key constants file exists in repo shared assets
 * (the published constants are embedded inside behaviour-coupled room scripts).
 * ============================================================================= */
(function () {
  'use strict';

  var ANON_KEY = '__ANON_KEY__';

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

    /* Eileen — may not be deployed at build time; callers degrade gracefully */
    EILEEN_EF_URL: 'https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/eileen-charityroom',

    /* Catalog rows with these doc codes use the in-room acceptance flow */
    ACCEPTANCE_DOC_CODES: ['AILANE-NDA-RWF-001', 'AILANE-AGT-RWF-001'],

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

    /* Phase 0 document seed — rendered statically when the catalog is not yet
     * reachable. Director replaces/extends via dealroom_documents_catalog. */
    PHASE0_DOCS: [
      {
        doc_code: 'AILANE-TERMS',
        name: 'Terms of Service',
        description: 'The Ailane terms that govern use of this room. Read them on the public Terms page.',
        version_label: 'current',
        href: '/terms/',
        acceptance: false
      },
      {
        doc_code: 'AILANE-PRIVACY',
        name: 'Privacy Notice',
        description: 'How AI Lane Limited handles personal data in this room. Read it on the public Privacy page.',
        version_label: 'current',
        href: '/privacy/',
        acceptance: false
      },
      {
        doc_code: 'AILANE-SFG-RWF-001',
        name: 'Safeguarding Statement',
        description: 'The Ailane safeguarding statement for charity engagements.',
        version_label: 'v1.0',
        href: null,
        acceptance: false
      },
      {
        doc_code: 'AILANE-NDA-RWF-001',
        name: 'Mutual Non-Disclosure Agreement',
        description: 'Keeps what both sides share in this room confidential. Accepted in-room with one action.',
        version_label: 'v1.0',
        href: null,
        acceptance: true
      },
      {
        doc_code: 'AILANE-AGT-RWF-001',
        name: 'Founding Charity Partner Agreement (fee-waived)',
        description: 'The fee-waived Founding Charity Partner agreement. Accepted in-room with one action.',
        version_label: 'v1.0',
        href: null,
        acceptance: true
      }
    ]
  };
})();
