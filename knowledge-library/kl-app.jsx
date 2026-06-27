// kl-app.jsx — Ailane Knowledge Library v3.0
// KLUX-001 (AMD-036) | EILEEN-001 (AMD-020) | PLUGIN-001 (AMD-032)
// Stage 2: Core React components

// OOX-001 #43 — DOMPurify, bundled by esbuild into kl-app.js (pure string-only
// JS; no network, no CSP impact). Hardens the Intelligence facet's two estate
// HTML columns via an allowlist before dangerouslySetInnerHTML. See HubIntelFacet.
import DOMPurify from 'dompurify';

const { useState, useEffect, useRef, useCallback } = React;

const SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';
const EILEEN_ENDPOINT = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co') + '/functions/v1/eileen-intelligence';

// ─── OOX-001 KL-Hub frame (preview-gated) ───────────────────────────────────
// AILANE-OOX-001-KL-HUB-ARCHITECTURE-SPEC-001 §1–§5. Hub mode repoints the
// centre Eileen chat to `eileen-operational`, stands up the matter bar, and
// renders the "Your workspace" facet rail — for an AUTHENTICATED OPERATIONAL
// session only, AND only behind a preview flag. In every other case the public
// Knowledge Library renders exactly as today (the flag/session check is the
// only gate). A later cutover brief drops the flag requirement. This brief
// builds the frame + Eileen + rail shell only; facet content ports later.
var HUB_FUNCTIONS_BASE = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co');
// Live operational-room allow-list (verbatim from operational/index.html guard).
var HUB_ALLOWED_TIERS = ['operational', 'operational_readiness', 'governance', 'enterprise'];

// "Your workspace" facet rail (KL-HUB §1.5). Placeholders this brief; the real
// panels (ACEI/Vault/Alerts/Intelligence/Notes/Calendar) port in later briefs.
var HUB_WORKSPACE_FACETS = [
  { id: 'vault',        label: 'Document Vault' },
  { id: 'alerts',       label: 'Alerts' },
  { id: 'acei',         label: 'ACEI Overview' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'ticker',       label: 'Ticker' },
  { id: 'notes',        label: 'Notes' },
  { id: 'calendar',     label: 'Calendar' },
];
var HUB_FACET_LABELS = {
  vault: 'Document Vault', alerts: 'Alerts', acei: 'ACEI Overview',
  intelligence: 'Intelligence', ticker: 'Ticker', notes: 'Notes', calendar: 'Calendar',
};

// Preview flag — `?hub=1` in the URL OR localStorage `ailane_kl_hub === 'on'`.
// OOX-001 (AMD-230) cutover: RETIRED as an activation gate (KL-HUB-SPEC §5
// step 9). The hub now activates from the authenticated session itself (see
// detectHubSession). This helper is retained only as a no-op back-compat shim —
// existing `?hub=1` / localStorage links still resolve to the hub (now via
// auth), they just no longer drive activation. Safe to remove in a later cleanup.
function klHubFlagSet() {
  try {
    var q = new URLSearchParams(window.location.search || '');
    if (q.get('hub') === '1') return true;
  } catch (e) { /* ignore */ }
  try { if (localStorage.getItem('ailane_kl_hub') === 'on') return true; } catch (e) { /* ignore */ }
  return false;
}

// OOX-001 §1.2/§1.3 — operational-mode detection. The SAME engine bundle renders
// at two host pages: /knowledge-library/ (public KL chrome) and /operational/
// (the "Ailane Operational" workspace). operational/index.html sets the explicit
// config flag `window.__klMode = 'operational'` before booting; the path check is
// a defensive backup (matches /operational/ exactly, NOT /operational-demo/).
// Operational mode only changes the chrome (brand + identity badge) and scopes the
// legacy-drawer retirement — the Knowledge Library engine itself is unchanged.
function klOperationalMode() {
  try { if (window.__klMode === 'operational') return true; } catch (e) { /* ignore */ }
  try {
    var p = (window.location && window.location.pathname) || '';
    if (p === '/operational' || p.indexOf('/operational/') === 0) return true;
  } catch (e) { /* ignore */ }
  return false;
}

// OOX-001 HOTFIX (AMD-230) — idempotent routing navigation. The redirect-loop
// class is caused by a routing redirect that navigates to the very path it is
// already on: the engine reloads, re-evaluates the same condition, and redirects
// again → forever. This helper compares the intended target to the current
// pathname (trailing-slash-insensitive) and SKIPS the navigation when they already
// match, so a routing redirect can never navigate to the path it is already on.
// §1.3 — the durable, class-wide fix: every routing window.location.replace flows
// through here. Returns true iff it actually navigated.
function klRouteReplace(target) {
  var here = '';
  try { here = (window.location && window.location.pathname) || ''; } catch (e) { here = ''; }
  if (here.replace(/\/+$/, '') === String(target).replace(/\/+$/, '')) return false;
  window.location.replace(target);
  return true;
}

// Detect an authenticated operational session — mirrors the operational/index.html
// guard (createClient → getSession() → JWT decode → tier). Resolves to a
// hubSession object or null.
//
// OOX-001 (AMD-230) cutover — the preview flag is retired (KL-HUB-SPEC §5 step 9):
//   • Hub activates for any AUTHENTICATED session whose user holds an operational
//     org (get_my_org_id() → non-null) AND whose tier is allow-listed — no
//     `?hub=1` required. `?hub=1`/localStorage remain a harmless no-op (back-compat).
//   • Onboarding-aware routing (§1.2): read operational_onboarding_state
//     .landing_unlocked (RLS-scoped to the caller's org). unlocked → hub; not
//     unlocked (false / no row) → redirect to /operational/onboarding/ (finish
//     onboarding first; never render an empty hub mid-onboarding). Read-resilient:
//     any org/state read error fails OPEN to the hub (never trap a paying tenant
//     out) + console.warn.
//   • Truly anonymous visitors, and authenticated users with no operational org,
//     still get the public KL unchanged (resolve null, no redirect).
// hubSession shape mirrors window.AILANE_OPS plus the resolved tier.
function detectHubSession() {
  if (typeof window === 'undefined' || !window.supabase || !window.supabase.createClient) {
    return Promise.resolve(null);
  }
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return sb.auth.getSession().then(function (gs) {
    var session = gs && gs.data && gs.data.session;
    if (!session) return null;  // truly anonymous → public KL (unchanged)
    var token = session.access_token;
    var payload;
    try { payload = JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
    // OOX-001 (AMD-230): AAL2 is no longer an activation precondition — any
    // authenticated session yields the hub. The AAL2 control stays in the data
    // layer (RLS: aal2_required_when_enrolled on the three Vault document tables),
    // not as a front-end gate.
    var userId = payload.sub;
    return fetch(
      SUPABASE_URL + '/rest/v1/kl_account_profiles?select=subscription_tier&user_id=eq.' + userId + '&limit=1',
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' } }
    ).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        var tier = rows && rows[0] && rows[0].subscription_tier;
        if (!tier || HUB_ALLOWED_TIERS.indexOf(tier) < 0) return null;
        var hubSession = {
          sb: sb,
          token: token,
          anon: SUPABASE_ANON_KEY,
          supabaseUrl: SUPABASE_URL,
          functionsBase: HUB_FUNCTIONS_BASE,
          userId: userId,
          email: payload.email || '',
          tier: tier,
        };
        // §1.1 — confirm an operational org via get_my_org_id (the same RPC the
        // facets use). Non-null org ⇒ operational tenant → onboarding-aware
        // routing. Null org (authenticated, no org) ⇒ public KL. An RPC *error*
        // (≠ "no org") fails OPEN to the hub — never trap a paying tenant out.
        return sb.rpc('get_my_org_id').then(function (orgRes) {
          if (orgRes && orgRes.error) {
            console.warn('[OOX-001] get_my_org_id failed — failing open to hub', orgRes.error);
            return hubSession;
          }
          var orgId = orgRes && orgRes.data;
          if (!orgId) return null;  // authenticated, no operational org → public KL
          // §1.4 — realise the cutover. The hub's canonical home is /operational/.
          // An authenticated, onboarded operational session that resolved here from
          // the public KL path (no operational flag/path) is moved to /operational/
          // so the operational chrome (brand + badge) applies. At /operational/ the
          // flag is set ⇒ this is a no-op (no redirect loop). Anonymous/no-org
          // sessions never reach this branch, so the public KL is untouched.
          function finishHub() {
            // §1.1 — move an operational session that resolved here from the public
            // KL path to /operational/ so the operational chrome applies. Fire ONLY
            // when NOT already in operational mode AND NOT already on /operational/
            // (trailing-slash-insensitive). Either condition true ⇒ render the hub in
            // place — never re-navigate to the path we are already on (no loop).
            if (klOperationalMode() === false &&
                (window.location.pathname || '').replace(/\/+$/, '') !== '/operational') {
              klRouteReplace('/operational/');
              return null;
            }
            return hubSession;
          }
          // §1.3 — product-context tier for the identity badge comes from
          // organisations.tier (e.g. operational_readiness), NOT the billing-axis
          // subscription_tier. Read-resilient: any failure leaves orgTier unset and
          // the badge falls back to a neutral "Operational" label. §1.2 onboarding
          // routing reads operational_onboarding_state.landing_unlocked (RLS-scoped
          // to the caller's org). Both reads run in parallel.
          var orgTierP = fetch(
            SUPABASE_URL + '/rest/v1/organisations?id=eq.' + orgId + '&select=tier',
            { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' } }
          ).then(function (r) { return r.ok ? r.json() : null; })
            .then(function (orows) { return orows && orows[0] && orows[0].tier; })
            .catch(function () { return null; });
          var stateP = sb.from('operational_onboarding_state').select('landing_unlocked').limit(1);
          return Promise.all([orgTierP, stateP]).then(function (rr) {
            var orgTier = rr[0];
            if (orgTier) hubSession.orgTier = orgTier;  // §1.3 — humanised by the badge
            var stRes = rr[1];
            if (stRes && stRes.error) {
              console.warn('[OOX-001] onboarding-state read failed — failing open to hub', stRes.error);
              return finishHub();
            }
            var row = stRes && stRes.data && stRes.data[0];
            if (row && row.landing_unlocked === true) return finishHub();   // onboarded → hub
            // §1.2 — not onboarded (landing_unlocked false / no row) ⇒ finish
            // onboarding first, but NEVER redirect to /operational/onboarding/ while
            // already on it (would loop). Idempotent: skip when already on the path.
            if ((window.location.pathname || '').replace(/\/+$/, '') !== '/operational/onboarding') {
              klRouteReplace('/operational/onboarding/');                    // not onboarded → finish first
            }
            return null;
          });
        }).catch(function (e) {
          console.warn('[OOX-001] hub routing resolution failed — failing open to hub', e);
          return hubSession;
        });
      })
      .catch(function () { return null; });
  }).catch(function () { return null; });
}

// Canonical hub Eileen request helper. Every call to eileen-operational — the
// chat question AND the matter_action calls — flows through this one function,
// so the endpoint URL + auth headers (Bearer token + apikey anon) are inherited,
// never re-hardcoded. Returns the parsed JSON; throws on any non-2xx (caller
// degrades gracefully). Mirrors operational/index.html `sendToEileen`.
function hubSendToEileen(hubSession, body) {
  return fetch(hubSession.functionsBase + '/eileen-operational', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + hubSession.token,
      'apikey': hubSession.anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then(function (r) {
    if (!r.ok) throw new Error('http_' + r.status);
    return r.json();
  });
}

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

// ─── KL Live Feed client (KL-LIVE-001) ───
// Single authenticated client for the kl-live-feed Edge Function.
// Sections: calendar | instruments | topic_tiles | forward_rail.
// Every consumer degrades gracefully across three states:
//   'loading' → 'live' | 'unavailable' (feed not yet live).
// Live responses are cached for the session; unavailable results are NOT
// cached so a backend deploy mid-session is picked up on next mount.

var __klLiveFeedCache = {};
var __klLiveFeedPending = {};

// Liberal shape handling — the EF may return a bare array or wrap rows.
function __klLiveFeedRows(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.rows)) return data.rows;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return null;
}

function fetchLiveFeedSection(section) {
  if (__klLiveFeedCache[section]) return Promise.resolve(__klLiveFeedCache[section]);
  if (__klLiveFeedPending[section]) return __klLiveFeedPending[section];
  var p = (function() {
    if (!window.__klToken) return Promise.resolve({ state: 'unavailable' });
    return fetch(
      SUPABASE_URL + '/functions/v1/kl-live-feed?section=' + encodeURIComponent(section),
      { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
    ).then(function(resp) {
      if (!resp.ok) return { state: 'unavailable' };
      return resp.json().then(function(data) {
        if (!data || data.error) return { state: 'unavailable' };
        var result = {
          state: 'live',
          data: data,
          generatedAt: data.generated_at || data.generatedAt || null,
        };
        __klLiveFeedCache[section] = result;
        return result;
      }).catch(function() { return { state: 'unavailable' }; });
    }).catch(function() {
      return { state: 'unavailable' };
    }).then(function(result) {
      delete __klLiveFeedPending[section];
      return result;
    });
  })();
  __klLiveFeedPending[section] = p;
  return p;
}

// §W-B: instruments map — fetched once per session, exposed on window so
// non-React renderers (renderMarkdown) can resolve display titles too.
function ensureInstrumentsMap() {
  return fetchLiveFeedSection('instruments').then(function(result) {
    if (result.state !== 'live') return window.__klInstrumentsMap || null;
    var d = result.data;
    var map = null;
    if (d && d.instruments && typeof d.instruments === 'object' && !Array.isArray(d.instruments)) map = d.instruments;
    else if (d && d.map && typeof d.map === 'object' && !Array.isArray(d.map)) map = d.map;
    else if (d && typeof d === 'object' && !Array.isArray(d)) map = d;
    if (map) window.__klInstrumentsMap = map;
    return window.__klInstrumentsMap || null;
  });
}

function instrumentEntry(instId) {
  var m = (typeof window !== 'undefined' && window.__klInstrumentsMap) || null;
  if (!m || !instId) return null;
  var entry = m[instId] || m[String(instId).toLowerCase()];
  return (entry && typeof entry === 'object') ? entry : null;
}

// §W-B: display title for an instrument code. Live-feed map first, then the
// static INSTRUMENT_NAMES map, then the raw code unchanged (mandated fallback).
function instrumentDisplayTitle(instId) {
  var entry = instrumentEntry(instId);
  if (entry && entry.display_title) return entry.display_title;
  return INSTRUMENT_NAMES[instId] || instId;
}

function instrumentShortCitation(instId) {
  var entry = instrumentEntry(instId);
  return (entry && entry.short_citation) || null;
}

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

// ─── Domain sub-pages (AMD-045, KLUX-001-AM-001 §2–5) ───
// Authoritative domain data for the 8 problem-domain sub-pages.

const DOMAINS = [
  {
    id: 'dismissal',
    slug: 'dismissal',
    name: 'Dismissal and Disciplinary',
    orientation: 'This area covers the law governing how employment relationships end and how employers must conduct disciplinary processes. It is the most litigated area of UK employment law.',
    eileenGreeting: "I\u2019m here to help with dismissal and disciplinary matters. What\u2019s your situation?",
    subAreas: [
      { name: 'Unfair Dismissal', instruments: 'ERA 1996 Part X, ERA 2025 ss.1\u20136', scope: 'Qualifying service, automatically unfair reasons, day-one rights (ERA 2025), remedies and compensation.' },
      { name: 'Wrongful Dismissal', instruments: 'ERA 1996 ss.86\u201391', scope: 'Notice periods, breach of contract, payment in lieu of notice, garden leave.' },
      { name: 'Constructive Dismissal', instruments: 'ERA 1996 s.95(1)(c)', scope: 'Fundamental breach, last straw doctrine, resignation in response to breach.' },
      { name: 'Gross Misconduct', instruments: 'ACAS Code of Practice 1', scope: 'Definition, investigation requirements, suspension, right to be accompanied, appeal rights.' },
      { name: 'ACAS Disciplinary Code', instruments: 'ACAS Code 1, ERA 1996 s.207A', scope: 'Full Code requirements, tribunal uplift for non-compliance, step-by-step procedure.' },
      { name: 'Capability and Performance', instruments: 'ACAS performance guidance', scope: 'Performance improvement plans, capability procedures, reasonable adjustments.' },
      { name: 'Probationary Dismissals', instruments: 'ERA 1996 Part X, ERA 2025 s.1', scope: 'Probationary period rights, day-one protection changes, notice during probation.' },
      { name: 'Redundancy', instruments: 'ERA 1996 Part XI, TULRCA 1992 s.188', scope: 'Genuine redundancy, selection criteria, collective consultation, redundancy pay.' },
    ]
  },
  {
    id: 'discrimination',
    slug: 'discrimination',
    name: 'Discrimination and Harassment',
    orientation: 'This area covers protection against unlawful discrimination, harassment, and victimisation in the workplace. It represents the largest concentration of case law in the Ailane intelligence estate.',
    eileenGreeting: "I\u2019m here to help with discrimination and harassment matters. What\u2019s your situation?",
    subAreas: [
      { name: 'The Nine Protected Characteristics', instruments: 'EqA 2010 s.4', scope: 'Age, disability, gender reassignment, marriage/civil partnership, pregnancy/maternity, race, religion/belief, sex, sexual orientation.' },
      { name: 'Direct Discrimination', instruments: 'EqA 2010 s.13', scope: 'Less favourable treatment, comparator requirements, burden of proof, defences.' },
      { name: 'Indirect Discrimination', instruments: 'EqA 2010 s.19', scope: 'Provision, criterion or practice, particular disadvantage, justification defence.' },
      { name: 'Harassment', instruments: 'EqA 2010 s.26, Worker Protection Act 2023', scope: 'Unwanted conduct, third-party harassment (new employer duty), sexual harassment.' },
      { name: 'Victimisation', instruments: 'EqA 2010 s.27', scope: 'Protected acts, detriment, protection for complainants and witnesses.' },
      { name: 'Reasonable Adjustments', instruments: 'EqA 2010 ss.20\u201322', scope: 'Duty to adjust for disabled workers, substantial disadvantage, auxiliary aids.' },
      { name: 'Equal Pay', instruments: 'EqA 2010 ss.64\u201380', scope: 'Like work, work rated as equivalent, work of equal value, material factor defence.' },
      { name: 'EHRC Employment Code', instruments: 'EHRC Statutory Code of Practice', scope: 'Full Code guidance, employer liability, vicarious liability, reasonable steps defence.' },
    ]
  },
  {
    id: 'contracts',
    slug: 'contracts',
    name: 'Contracts and Terms',
    orientation: 'This area covers the legal framework governing employment contracts, written terms, working time, and contractual rights.',
    eileenGreeting: "I\u2019m here to help with contracts and employment terms. What\u2019s your situation?",
    subAreas: [
      { name: 'Written Statement of Particulars', instruments: 'ERA 1996 ss.1\u201312', scope: 'Day-one right, required content, changes to particulars, remedies for failure.' },
      { name: 'Express and Implied Terms', instruments: 'Common law', scope: 'Express terms, implied terms (mutual trust, duty of care, fidelity), custom and practice.' },
      { name: 'Variation of Contract', instruments: 'ERA 1996 s.4', scope: 'Lawful variation, agreement, fire and rehire restrictions (ERA 2025).' },
      { name: 'Restrictive Covenants', instruments: 'Common law, ERA 2025', scope: 'Non-compete, non-solicitation, confidentiality, reasonableness test.' },
      { name: 'Working Time', instruments: 'WTR 1998', scope: '48-hour week, opt-out, rest breaks, annual leave calculation (Brazel).' },
      { name: 'Part-Time and Fixed-Term Rights', instruments: 'PTWR 2000, FTER 2002', scope: 'Less favourable treatment, objective justification, successive fixed-term contracts.' },
      { name: 'Agency Worker Rights', instruments: 'AWR 2010', scope: '12-week qualifying period, day-one rights, comparator assessment.' },
      { name: 'Flexible Working', instruments: 'ERA 1996 s.80F, FWR 2014, ERA 2025', scope: 'Day-one right (ERA 2025), application process, grounds for refusal.' },
      { name: 'Zero-Hours and Low-Hours', instruments: 'ERA 2025', scope: 'Guaranteed hours, reasonable notice of shifts, compensation for cancellations.' },
      { name: 'Holiday Pay Calculations', instruments: 'WTR 1998 Reg.16, EqA 2010', scope: 'Normal remuneration, 52-week reference, Brazel methodology, rolled-up holiday pay.' },
    ]
  },
  {
    id: 'family-leave',
    slug: 'family-leave',
    name: 'Family Leave and Pregnancy',
    orientation: 'This area covers legal entitlements during pregnancy, maternity, paternity, adoption, and other family-related leave. One of the most active areas post-ERA 2025.',
    eileenGreeting: "I\u2019m here to help with family leave and pregnancy matters. What\u2019s your situation?",
    subAreas: [
      { name: 'Maternity Leave and Pay', instruments: 'MPL 1999, SMP Regs', scope: 'OML, AML, statutory maternity pay, notification, KIT days, return to work.' },
      { name: 'Paternity Leave and Pay', instruments: 'PAL 2002', scope: 'Entitlement, notice, timing, statutory paternity pay.' },
      { name: 'Shared Parental Leave', instruments: 'SPL Regs 2014', scope: 'Eligibility, curtailment, notice of entitlement and intention.' },
      { name: 'Adoption Leave', instruments: 'PAL 2002', scope: 'Matching, notification, statutory adoption pay, overseas adoption.' },
      { name: 'Parental Leave (Unpaid)', instruments: 'MPL 1999 Part III', scope: '18 weeks per child, qualifying conditions, postponement, default scheme.' },
      { name: 'Time Off for Dependants', instruments: 'ERA 1996 s.57A', scope: 'Reasonable time off, definition of dependant, no pay requirement.' },
      { name: 'Pregnancy Discrimination', instruments: 'EqA 2010 s.18', scope: 'Protected period, unfavourable treatment, no comparator required.' },
      { name: 'Redundancy During Pregnancy/Maternity', instruments: 'Protection from Redundancy Act 2023, ERA 2025', scope: 'Priority right to suitable alternative, extended protection period.' },
      { name: 'Neonatal Care Leave', instruments: 'ERA 2025', scope: 'New entitlement, qualifying conditions, duration, statutory neonatal care pay.' },
    ]
  },
  {
    id: 'transfers',
    slug: 'transfers',
    name: 'Business Transfers',
    orientation: 'This area covers the Transfer of Undertakings regulations and the legal framework for business sales, outsourcing, and service provision changes.',
    eileenGreeting: "I\u2019m here to help with business transfers and TUPE. What\u2019s your situation?",
    subAreas: [
      { name: 'What Constitutes a Transfer', instruments: 'TUPE 2006 Reg.3', scope: 'Relevant transfer, economic entity, service provision change, organised grouping.' },
      { name: 'Employee Rights on Transfer', instruments: 'TUPE 2006 Reg.4', scope: 'Automatic transfer of contracts, continuity, preservation of terms.' },
      { name: 'Information and Consultation', instruments: 'TUPE 2006 Regs.13\u201316', scope: 'Duty to inform/consult, long enough before transfer, compensation for failure.' },
      { name: 'ETO Reasons', instruments: 'TUPE 2006 Reg.7', scope: 'Economic/technical/organisational reasons, when dismissal may be fair.' },
      { name: 'Harmonisation Post-Transfer', instruments: 'TUPE 2006 Reg.4(4)', scope: 'Prohibition on varying terms by reason of transfer, one-year restriction.' },
      { name: 'Collective Redundancy in Transfer', instruments: 'TULRCA 1992 s.188, TUPE 2006', scope: 'Dual consultation requirements, interaction of obligations.' },
      { name: 'Outsourcing and Insourcing', instruments: 'TUPE 2006 Reg.3(1)(b)', scope: 'Service provision changes, activities ceasing and being carried on.' },
    ]
  },
  {
    id: 'health-safety',
    slug: 'health-safety',
    name: 'Health and Safety',
    orientation: "This area covers the employer\u2019s duty to provide a safe working environment and the regulatory enforcement framework. Ailane\u2019s estate includes 2,498 HSE prosecutions (\u00A3462.7M in fines) and 30,543 enforcement notices.",
    eileenGreeting: "I\u2019m here to help with health and safety matters. What\u2019s your situation?",
    subAreas: [
      { name: 'General Duties', instruments: 'HSWA 1974 ss.2\u20139', scope: "Employer\u2019s general duty to employees (s.2), to non-employees (s.3), premises control (s.4)." },
      { name: 'Risk Assessment', instruments: 'MHSWR 1999 Reg.3', scope: 'Suitable and sufficient assessment, significant findings, review and revision.' },
      { name: 'Display Screen Equipment', instruments: 'DSE Regs 1992', scope: 'Workstation assessment, eye tests, breaks, home/hybrid working DSE.' },
      { name: 'Workplace Stress', instruments: 'HSWA 1974, MHSWR 1999, HSE Standards', scope: 'Management standards (demands, control, support, relationships, role, change).' },
      { name: 'Accident Reporting', instruments: 'RIDDOR 2013', scope: 'Reportable injuries, occupational diseases, dangerous occurrences, deadlines.' },
      { name: 'HSE Enforcement', instruments: 'HSWA 1974 ss.21\u201325', scope: 'Improvement notices, prohibition notices, prosecution, sentencing guidelines.' },
      { name: 'Safety Representatives', instruments: 'SRSC Regs 1977, HSCER 1996', scope: 'Appointment, functions, time off, employer consultation duty.' },
      { name: 'Right to Refuse Unsafe Work', instruments: 'ERA 1996 s.44, HSWA 1974', scope: 'Automatic unfair dismissal, detriment protection, reasonable belief.' },
    ]
  },
  {
    id: 'whistleblowing',
    slug: 'whistleblowing',
    name: 'Whistleblowing',
    orientation: 'This area covers legal protection for workers who report wrongdoing. Users who arrive here are often in acute situations with immediate employment consequences.',
    eileenGreeting: "I\u2019m here to help with whistleblowing and protected disclosures. What\u2019s your situation?",
    subAreas: [
      { name: 'Qualifying Disclosures', instruments: 'ERA 1996 s.43B', scope: 'Six categories: criminal offence, legal obligation failure, miscarriage of justice, H&S danger, environmental damage, concealment.' },
      { name: 'Protected Disclosures', instruments: 'ERA 1996 ss.43C\u201343H', scope: 'Disclosure to employer, legal adviser, Minister, prescribed person, wider disclosure.' },
      { name: 'Automatic Unfair Dismissal', instruments: 'ERA 1996 s.103A', scope: 'No qualifying service, no compensation cap, burden of proof, interim relief.' },
      { name: 'Detriment Short of Dismissal', instruments: 'ERA 1996 s.47B', scope: 'Acts or deliberate failures, co-worker liability, vicarious liability.' },
      { name: 'Prescribed Persons', instruments: 'PI Disclosure (Prescribed Persons) Order', scope: 'Full list of prescribed regulators, coverage, reporting routes.' },
      { name: 'NDAs and Confidentiality Clauses', instruments: 'ERA 1996 s.43J', scope: 'Void provisions, settlement agreements, clauses preventing protected disclosures.' },
      { name: 'Whistleblowing Policies', instruments: 'ACAS workplace policies guide', scope: 'Best practice policies, designated officers, investigation, protection.' },
    ]
  },
  {
    id: 'data-monitoring',
    slug: 'data-monitoring',
    name: 'Data and Monitoring',
    orientation: "This area covers data protection obligations in the employment relationship, including employee monitoring, subject access requests, and data retention.",
    eileenGreeting: "I\u2019m here to help with data protection and employee monitoring matters. What\u2019s your situation?",
    subAreas: [
      { name: 'Employer GDPR Obligations', instruments: 'UK GDPR, DPA 2018', scope: 'Lawful bases for employee data, legitimate interests, privacy notices.' },
      { name: 'Lawful Bases for HR Processing', instruments: 'UK GDPR Art.6, Art.9', scope: 'Special category data (health, union, biometric), employment condition.' },
      { name: 'Data Protection Impact Assessments', instruments: 'UK GDPR Art.35', scope: 'When DPIAs required for HR systems, systematic monitoring, large-scale special category.' },
      { name: 'Employee Monitoring', instruments: 'ICO Employment Practices Code', scope: 'Email/internet, CCTV, telephone recording, covert monitoring, impact assessments.' },
      { name: 'Subject Access Requests', instruments: 'UK GDPR Art.15', scope: 'Right to access, one-month period, exemptions, redaction of third-party data.' },
      { name: 'Data Retention', instruments: 'UK GDPR Art.5(1)(e)', scope: 'Retention schedules, statutory minimums (tax, pension, H&S), destruction procedures.' },
      { name: 'International Data Transfers', instruments: 'UK GDPR Art.44\u201349', scope: 'Post-Brexit adequacy, standard contractual clauses, binding corporate rules.' },
      { name: 'Biometric Data', instruments: 'UK GDPR Art.9, DPA 2018', scope: 'Fingerprint/facial recognition clocking-in, explicit consent, DPIA, proportionality.' },
    ]
  },
];

// ─── Bilingual field helpers (KL Welsh toggle plumbing) ───
// bl(): generic English/Welsh selector — Welsh field name is the English
// field + '_cy' suffix. blLeg(): explicit map for legislation records where
// the Welsh field names do not follow the _cy suffix convention (e.g.
// short_title → title_cy). Both fall back to the English value when the
// Welsh value is absent or the language is 'en'.
function bl(record, englishField, lang) {
  if (!record) return '';
  if (lang !== 'cy') return record[englishField] || '';
  var cyField = englishField + '_cy';
  return record[cyField] || record[englishField] || '';
}

function blLeg(record, englishField, lang) {
  if (!record) return '';
  if (lang !== 'cy') return record[englishField] || '';
  var CY_MAP = {
    'short_title': 'title_cy',
    'summary': 'summary_cy',
    'key_provisions': 'key_provisions_cy',
    'obligations_summary': 'obligations_cy',
  };
  var cyField = CY_MAP[englishField];
  if (cyField && record[cyField]) return record[cyField];
  return record[englishField] || '';
}

// ─── Hash-based route detection (AMD-045 §3.1) ───
function getRoute() {
  var hash = (window.location.hash || '').replace('#', '') || '/';
  if (hash.indexOf('/domain/') === 0) {
    var slug = hash.replace('/domain/', '');
    var domain = DOMAINS.find(function(d) { return d.slug === slug; });
    return domain ? { view: 'domain', domain: domain } : { view: 'welcome' };
  }
  return { view: 'welcome' };
}

// ─── §6.1 Contract intent detection (KLAC-001-AM-006, AMD-043) ───
// Regex patterns for proactive contract routing to compliance engine.
var CONTRACT_INTENT_PATTERNS = [
  /\b(check|review|audit|analyse|analyze)\b.*\b(contract|document|policy|handbook)\b/i,
  /\b(contract|document|policy|handbook)\b.*\b(check|review|audit|analyse|analyze)\b/i,
  /\bupload\b.*\b(contract|document)\b/i,
  /\b(compliance|compliant)\b.*\b(check|review)\b/i,
  /\bcontract\s+compliance\b/i,
  /\bcheck\s+my\s+contract\b/i,
  /\breview\s+my\s+(contract|document)\b/i,
  /\bis\s+my\s+contract\s+(legal|compliant|ok|okay)\b/i,
];

function hasContractIntent(text) {
  return CONTRACT_INTENT_PATTERNS.some(function(pattern) {
    return pattern.test(text || '');
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

// ─── KL-LIVE-001 styles (§W-A calendar, §W-C rail/strip, §W-E responsive) ───
// Injected at module load — index.html is out of scope for this relay, so all
// new rules ship inside the bundle (same pattern as kl-r1b-keyframes above).
(function () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('kl-live-001-styles')) return;
  const style = document.createElement('style');
  style.id = 'kl-live-001-styles';
  style.textContent = [
    /* §W-C: Coming-into-force rail (horizontal scroll by design) */
    '.kl-forward-rail { display: flex; gap: 10px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 6px; }',
    '.kl-forward-rail-note { width: 100%; max-width: 820px; margin-bottom: 16px; font-size: 11px; color: #475569; font-family: "DM Mono", monospace; text-align: center; }',
    '.kl-forward-card { flex: 0 0 230px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 12px; min-width: 0; }',
    /* §W-A: live calendar */
    '.kl-live-chip { border-radius: 14px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: "DM Sans", sans-serif; white-space: nowrap; transition: all 0.15s; }',
    '.kl-cal-viewbtn { border-radius: 6px; padding: 4px 12px; font-size: 11px; cursor: pointer; font-family: "DM Sans", sans-serif; }',
    '.kl-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }',
    '.kl-cal-cell { min-height: 44px; border-radius: 4px; padding: 3px 4px; border: 1px solid transparent; }',
    '.kl-cal-cell.has-events { cursor: pointer; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); }',
    '.kl-cal-cell.selected { border-color: #0EA5E9; background: rgba(14,165,233,0.08); }',
    '.kl-topic-chip-row { display: flex; gap: 6px; flex-wrap: wrap; }',
    /* §W-C: per-topic currency strip */
    '.kl-currency-strip { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; padding: 10px 14px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 28px; max-width: 720px; }',
    /* §W-E: mobile pass. The first four rules re-assert index.html mobile
       rules that are cascade-dead there (the base .kl-panelrail /
       .kl-topbar-title / padding rules appear LATER in its <style> block at
       equal specificity, so the early max-width:767px block never wins —
       the rail was being auto-placed into an implicit grid row on phones,
       crushing the main column). Injected last, these win the cascade. */
    '@media (max-width: 767px) {',
    '  .kl-panelrail { display: none !important; }',
    '  .kl-topbar-title { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '  .kl-messages { padding: 16px; }',
    '  .kl-conversation-input { padding: 12px 16px; }',
    '  .kl-welcome { padding: 32px 16px; }',
    '  .kl-topic-chip-row, .kl-domain-selector { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }',
    '  .kl-live-chip, .kl-cal-viewbtn { min-height: 44px; display: inline-flex; align-items: center; }',
    '  .kl-cal-cell { min-height: 48px; }',
    '  .kl-forward-card { flex-basis: 200px; }',
    '  .kl-currency-strip { flex-direction: column; align-items: flex-start; gap: 8px; }',
    /* §W-E: Eileen markdown data tables → stacked rows */
    '  .eileen-response-content table, .eileen-response-content tbody, .eileen-response-content tr, .eileen-response-content td, .eileen-response-content th { display: block; width: 100%; box-sizing: border-box; }',
    '  .eileen-response-content thead { display: none; }',
    '  .eileen-response-content tr { border-bottom: 1px solid #1E293B; padding: 6px 0; }',
    '  .eileen-response-content td { border-bottom: none !important; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);
})();

// ─── KL-LIVE-002 styles (§W-F D1/D2/D4/D5/D6/D7 + §W-G D3) ───
// Injected at module load like the kl-live-001 block above — index.html is
// out of scope, so every rule ships inside the bundle. This block is appended
// after the index.html <style> block and the kl-live-001 block, so it wins
// the cascade at equal specificity.
(function () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('kl-live-002-styles')) return;
  const style = document.createElement('style');
  style.id = 'kl-live-002-styles';
  style.textContent = [
    /* D6: one viewport-height scroll architecture. dvh (not vh) so mobile
       browser chrome cannot open a phantom page scrollbar behind the app —
       the main column owns exactly one scroll context per view. */
    'html { height: 100%; overflow: hidden; }',
    'body { height: 100dvh; }',
    '#kl-root { height: 100dvh; }',
    '.kl-main { overflow: hidden; }',
    '.kl-panel-drawer-body { overflow-y: auto; overflow-x: hidden; }',

    /* D1: single centred content container for the welcome column —
       hero, research-area grid, and shelf all inherit from it. */
    '.kl-content-container { width: 100%; max-width: 1260px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }',
    '.kl-forward-rail-note { max-width: none; }',

    /* D4: hero clears the top-bar height on scroll — the layout consumes
       the existing --kl-topbar-height variable. */
    '.kl-welcome { scroll-padding-top: calc(var(--kl-topbar-height, 56px) + 8px); }',
    '.kl-welcome-greeting { scroll-margin-top: calc(var(--kl-topbar-height, 56px) + 8px); }',

    /* D2: research-area card grid (replaces the .kl-domain-compact rows).
       2 columns from 768px up; single column below. */
    '.kl-domain-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; width: 100%; }',
    '.kl-domain-card { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-height: 132px; padding: 16px 18px; background: var(--kl-surface, #0F1D32); border: 1px solid var(--kl-border, #1E3A5F); border-radius: 10px; cursor: pointer; text-align: left; width: 100%; font-family: var(--kl-font-sans, sans-serif); color: var(--kl-text, #F1F5F9); transition: background 0.2s, border-color 0.2s; }',
    '.kl-domain-card:hover { background: var(--kl-surface-hover, #162440); border-color: var(--kl-cyan, #0EA5E9); }',
    '.kl-domain-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; }',
    '.kl-domain-card-name { font-weight: 600; font-size: 15px; min-width: 0; }',
    '.kl-domain-card-count { font-size: 10px; font-family: var(--kl-font-mono, monospace); color: var(--kl-cyan, #0EA5E9); background: rgba(14,165,233,0.1); border: 1px solid rgba(14,165,233,0.25); border-radius: 10px; padding: 2px 8px; white-space: nowrap; flex-shrink: 0; }',
    '.kl-domain-card-desc { font-size: 13px; color: var(--kl-text-muted, #94A3B8); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }',
    '.kl-domain-card-explore { margin-top: auto; font-size: 12px; font-weight: 500; color: var(--kl-cyan, #0EA5E9); }',

    /* D5: fixed book-spine width; title clamps inside the spine. */
    '.kl-book { flex: 0 0 100px; }',
    '.kl-book-title { display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; min-width: 0; }',

    /* D3: Saved Items / Notes drawer — fixed-width overlay above page
       content, internal scroll only. z-index sits above the mobile sidebar
       (40) and below the modal layer (ExpiredModal 100, vault dialog 1000). */
    '.kl-panel-drawer { top: 0; right: 0; width: 400px; height: 100dvh; z-index: 60; }',
    '.kl-notes-editor-bar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 4px 0 8px; background: var(--kl-bg, #0A1628); border-bottom: 1px solid var(--kl-border, #1E3A5F); flex-shrink: 0; }',

    /* D7: compact help chip (mobile replacement for the floating card). */
    '.kl-eileen-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 6px 14px; border-radius: 22px; background: rgba(10, 22, 40, 0.9); border: 1px solid rgba(14, 165, 233, 0.3); color: var(--kl-cyan, #0EA5E9); font-size: 12px; font-weight: 500; font-family: var(--kl-font-sans, sans-serif); cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }',

    '@media (max-width: 767px) {',
    '  .kl-domain-card-grid { grid-template-columns: 1fr; }',
    '  .kl-domain-card { min-height: 44px; }',
    /* D5: shelf becomes a horizontal scroll-snap row — no wrap-shrink.
       !important needed to beat the inline flex styles and the 540px
       80px-shrink rule in index.html. */
    '  .kl-shelf { flex-wrap: nowrap !important; overflow-x: auto !important; justify-content: flex-start !important; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }',
    '  .kl-book { flex: 0 0 100px !important; width: 100px !important; height: 130px !important; scroll-snap-align: start; }',
    '  .kl-book > div:nth-child(2) { font-size: 10px !important; }',
    /* D3: drawer becomes a full-screen sheet; action bar buttons stay
       tappable (≥44px). */
    '  .kl-panel-drawer { width: 100%; }',
    '  .kl-notes-editor-bar button { min-height: 44px; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);
})();

// ─── EILEEN-NEXUS-001 styles ───
// Wrapper-level rules for the canonical Nexus consumer below. The halo
// classes carry the retired Sprint A state machine's visual triggers
// (dormant/ready/processing/presenting) on the HOST container — glow values
// mirror the legacy FloatingNexus glowMap, so the trigger semantics survive
// the renderer swap without touching module internals or palette.
(function () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('eileen-nexus-001-styles')) return;
  const style = document.createElement('style');
  style.id = 'eileen-nexus-001-styles';
  style.textContent = [
    '.kl-nexus-host { position: relative; display: block; border-radius: 50%; }',
    '.kl-nexus-host .kl-nexus-canvas { display: block; }',
    '.kl-nexus-halo { transition: box-shadow 0.3s ease; }',
    '.kl-nexus-halo--dormant { box-shadow: 0 0 8px rgba(14,165,233,0.1); }',
    '.kl-nexus-halo--ready { box-shadow: 0 0 12px rgba(14,165,233,0.2); }',
    '.kl-nexus-halo--processing { box-shadow: 0 0 20px rgba(14,165,233,0.4); animation: klNexusHaloPulse 1.5s ease-in-out infinite; }',
    '.kl-nexus-halo--presenting { box-shadow: 0 0 24px rgba(14,165,233,0.5); }',
    '@keyframes klNexusHaloPulse {',
    '  0%, 100% { box-shadow: 0 0 20px rgba(14,165,233,0.4); }',
    '  50% { box-shadow: 0 0 28px rgba(14,165,233,0.55); }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  .kl-nexus-halo--processing { animation: none; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);
})();

// ─── EILEEN-NEXUS-001: canonical Nexus module + shared live v3 feed ───
// One-time dynamic load of the canonical renderer (assets/js/nexus.js,
// window.AilaneNexus). The KL gate (index.html) is out of scope, so the
// module is injected from inside the bundle — same philosophy as the
// injected style blocks above. Resolves true once window.AilaneNexus is
// available; false on load failure (every consumer no-ops — the page never
// breaks on module absence).
var __nexusModulePromise = null;
function loadNexusModule() {
  if (typeof document === 'undefined') return Promise.resolve(false);
  if (window.AilaneNexus && window.AilaneNexus.createNexus) {
    startNexusPoll();
    return Promise.resolve(true);
  }
  if (__nexusModulePromise) return __nexusModulePromise;
  __nexusModulePromise = new Promise(function (resolve) {
    var s = document.createElement('script');
    s.src = '/assets/js/nexus.js';
    s.onload = function () {
      var ok = !!(window.AilaneNexus && window.AilaneNexus.createNexus);
      if (ok) startNexusPoll();
      resolve(ok);
    };
    s.onerror = function () { resolve(false); };
    document.head.appendChild(s);
  });
  return __nexusModulePromise;
}

// Canonical v3 consumer — same contract as the landing page reference
// implementation (index.html fetchNexus, AMD-058 Art. 13.1): 6s abort
// timeout; verify version === 'v3'; on contract drift / non-200 / network
// failure retain seed weights silently (console.warn only). ONE shared poll
// per page feeds every attached instance via window.AilaneNexus.updateLive.
var NEXUS_URL = 'https://cnbsxwtvazfvzmltkuvx.functions.supabase.co/eileen-nexus-intel';
async function fetchNexus() {
  var ctrl = new AbortController();
  var timeoutId = setTimeout(function () { ctrl.abort(); }, 6000);
  try {
    var r = await fetch(NEXUS_URL, { signal: ctrl.signal });
    clearTimeout(timeoutId);
    if (!r.ok) { console.warn('[Nexus] HTTP ' + r.status); return; }
    var data = await r.json();
    if (data.version !== 'v3') {
      console.warn('[Nexus] contract drift: expected v3, got ' + data.version);
      return;
    }
    if (!Array.isArray(data.categories) || data.categories.length === 0) {
      return;
    }
    var categories = data.categories.map(function (c) {
      return {
        id: c.id,
        label: typeof c.label === 'string'
          ? c.label.replace(/_/g, ' ').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); })
          : c.id,
        claim_frequency: c.claim_frequency,
        provision_count: c.provision_count
      };
    });
    if (window.AilaneNexus && window.AilaneNexus.updateLive) {
      window.AilaneNexus.updateLive({
        categories: categories,
        relationships: Array.isArray(data.relationships) ? data.relationships : [],
        instruments: Array.isArray(data.instruments) ? data.instruments : [],
        snapshotAt: data.snapshotAt || null
      });
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('[Nexus] fetch failed, retaining seed weights');
  }
}

var __nexusPollTimer = null;
function startNexusPoll() {
  if (__nexusPollTimer) return;
  fetchNexus();
  __nexusPollTimer = setInterval(fetchNexus, 5 * 60 * 1000);
}

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

// §2: Enhanced Eileen markdown renderer (EILEEN-002 §2–3, KLUX-001 Art. 13)
// Handles the specific output patterns of eileen-intelligence: headers, bold,
// italic, numbered/bullet lists, blockquotes, tables, inline code, code blocks,
// horizontal rules, and Sprint H §2 library reference links.
function renderMarkdown(text) {
  if (!text) return '';
  var escaped = escapeHtml(text);

  // --- Pre-processing: extract code blocks before line-level parsing ---
  var codeBlocks = [];
  escaped = escaped.replace(/```(?:[a-z]*)\n([\s\S]*?)```/gm, function(match, code) {
    var idx = codeBlocks.length;
    codeBlocks.push('<pre style="background:#0F172A;border:1px solid #1E293B;border-radius:8px;padding:12px 16px;overflow-x:auto;margin:12px 0"><code style="font-family:\'DM Mono\',monospace;font-size:12px;color:#0EA5E9;line-height:1.6">' + code.trim() + '</code></pre>');
    return '\n%%CODEBLOCK_' + idx + '%%\n';
  });

  // --- Pre-processing: extract tables before line-level parsing ---
  var tables = [];
  escaped = escaped.replace(/(\|.+\|\n\|[-:| ]+\|\n(?:\|.+\|\n?)+)/gm, function(match) {
    var idx = tables.length;
    var rows = match.trim().split('\n').filter(function(r) { return !r.match(/^\|[-:| ]+\|$/); });
    if (rows.length < 1) { tables.push(match); return '%%TABLE_' + idx + '%%'; }
    var headerCells = rows[0].split('|').filter(function(c) { return c.trim(); }).map(function(c) {
      return '<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #1E293B;color:#F1F5F9;font-weight:600;font-size:12px">' + c.trim() + '</th>';
    }).join('');
    var bodyRows = rows.slice(1).map(function(row) {
      var cells = row.split('|').filter(function(c) { return c.trim(); }).map(function(c) {
        return '<td style="padding:8px 12px;border-bottom:1px solid #1E293B;color:#CBD5E1;font-size:13px">' + c.trim() + '</td>';
      }).join('');
      return '<tr>' + cells + '</tr>';
    }).join('');
    tables.push('<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;background:#0F172A;border-radius:8px;overflow:hidden"><thead><tr>' + headerCells + '</tr></thead><tbody>' + bodyRows + '</tbody></table></div>');
    return '\n%%TABLE_' + idx + '%%\n';
  });

  // --- Inline formatting ---
  var withInline = escaped
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#F1F5F9">$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#1E293B;padding:2px 6px;border-radius:4px;font-family:\'DM Mono\',monospace;font-size:12px;color:#0EA5E9">$1</code>')
    // Sprint H §2: Link library references like (acas-bm §17–25), (era1996 s.94).
    // KL-LIVE-001 §W-B: render the live-feed display_title for mapped codes;
    // unmapped codes fall back to the raw instrument id unchanged.
    .replace(/\(([a-z][a-z0-9-]+)\s+(§|s\.)([^)]+)\)/gi, function(match, instId, prefix, sectionRef) {
      var lowerInstId = instId.toLowerCase();
      var display = instId;
      var liveMap = (typeof window !== 'undefined' && window.__klInstrumentsMap) || null;
      var entry = liveMap && (liveMap[lowerInstId] || liveMap[instId]);
      if (entry && entry.display_title) display = entry.display_title;
      return '<span class="kl-ref-link" data-inst="' + escapeHtml(lowerInstId) + '" data-section="' + escapeHtml(prefix + sectionRef) + '" title="Open in Library: ' + escapeHtml(display) + ' ' + escapeHtml(prefix + sectionRef) + '">' + escapeHtml(display + ' ' + prefix + sectionRef) + '</span>';
    });

  // --- Line-level parsing ---
  var lines = withInline.split('\n');
  var out = [];
  var ulItems = [];
  var olItems = [];

  function flushUl() {
    if (ulItems.length) {
      out.push('<ul style="margin:12px 0;padding-left:24px;color:#CBD5E1;list-style:disc">' + ulItems.join('') + '</ul>');
      ulItems = [];
    }
  }
  function flushOl() {
    if (olItems.length) {
      out.push('<ol style="margin:12px 0;padding-left:24px;color:#CBD5E1">' + olItems.join('') + '</ol>');
      olItems = [];
    }
  }
  function flushLists() { flushUl(); flushOl(); }

  lines.forEach(function(line) {
    var trimmed = line.trim();

    // Placeholder restoration (code blocks, tables)
    var codeMatch = trimmed.match(/^%%CODEBLOCK_(\d+)%%$/);
    if (codeMatch) { flushLists(); out.push(codeBlocks[parseInt(codeMatch[1])]); return; }
    var tableMatch = trimmed.match(/^%%TABLE_(\d+)%%$/);
    if (tableMatch) { flushLists(); out.push(tables[parseInt(tableMatch[1])]); return; }

    // Headers
    var headerMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headerMatch) {
      flushLists();
      var hLevel = headerMatch[1].length;
      if (hLevel === 2) out.push('<h3 style="color:#F1F5F9;font-family:\'DM Sans\',sans-serif;font-size:16px;font-weight:600;margin:20px 0 10px">' + headerMatch[2] + '</h3>');
      else if (hLevel === 3) out.push('<h4 style="color:#F1F5F9;font-family:\'DM Sans\',sans-serif;font-size:14px;font-weight:600;margin:16px 0 8px">' + headerMatch[2] + '</h4>');
      else out.push('<h4 style="color:#F1F5F9;font-family:\'DM Sans\',sans-serif;font-size:14px;font-weight:600;margin:16px 0 8px">' + headerMatch[2] + '</h4>');
      return;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushLists();
      out.push('<hr style="border:none;border-top:1px solid #1E293B;margin:16px 0">');
      return;
    }

    // Blockquotes
    if (trimmed.indexOf('&gt; ') === 0) {
      flushLists();
      var quoteContent = trimmed.substring(5);
      out.push('<blockquote style="border-left:3px solid #0EA5E9;padding:8px 16px;margin:12px 0;color:#CBD5E1;font-style:italic;background:#0F172A;border-radius:0 6px 6px 0">' + quoteContent + '</blockquote>');
      return;
    }

    // Numbered list
    var olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      flushUl();
      olItems.push('<li style="margin:4px 0;padding-left:4px">' + olMatch[2] + '</li>');
      return;
    }

    // Bullet list
    var ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      flushOl();
      ulItems.push('<li style="margin:4px 0;padding-left:4px">' + ulMatch[1] + '</li>');
      return;
    }

    // Empty line
    if (trimmed === '') {
      flushLists();
      return;
    }

    // Default paragraph
    flushLists();
    out.push('<p style="margin:0 0 12px;line-height:1.7">' + line + '</p>');
  });
  flushLists();
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

// §3.1 (AMD-044/C-1): Date classification per KLUX-001 Art. 8
function classifyDate(dateStr) {
  var now = new Date();
  var d = new Date(dateStr);
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  var weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

  if (d >= today) return 'Today';
  if (d >= yesterday) return 'Yesterday';
  if (d >= weekAgo) return 'This Week';
  return 'Earlier';
}

function groupSessionsByTime(sessions) {
  var groups = {
    today: { label: 'Today', items: [] },
    yesterday: { label: 'Yesterday', items: [] },
    thisWeek: { label: 'This Week', items: [] },
    earlier: { label: 'Earlier', items: [] },
  };

  var groupKeyMap = { 'Today': 'today', 'Yesterday': 'yesterday', 'This Week': 'thisWeek', 'Earlier': 'earlier' };

  sessions.forEach(function(s) {
    var group = s.dateGroup || classifyDate(s.lastActivity);
    var key = groupKeyMap[group] || 'earlier';
    groups[key].items.push(s);
  });

  return [groups.today, groups.yesterday, groups.thisWeek, groups.earlier].filter(function(g) {
    return g.items.length > 0;
  });
}

// §4.1 (AMD-044/C-2): Category-to-title map per KLUX-001 Art. 8
var CATEGORY_TITLES = {
  unfair_dismissal: 'Unfair Dismissal',
  discrimination: 'Discrimination',
  wages_deductions: 'Wages and Deductions',
  working_time: 'Working Time',
  whistleblowing: 'Whistleblowing',
  health_safety: 'Health and Safety',
  tupe: 'Business Transfers (TUPE)',
  data_protection: 'Data Protection',
  family_leave: 'Family Leave',
  redundancy: 'Redundancy',
  contractual: 'Contract Terms',
  equal_pay: 'Equal Pay',
};

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.substring(0, n - 1) + '…' : s;
}

// ─── CanonicalNexus (EILEEN-NEXUS-001 §1.1) ───
// Consumer wrapper for the canonical Nexus renderer (assets/js/nexus.js,
// window.AilaneNexus — AMD-069 palette, Gold core constancy, live v3
// weights). Replaces the retired Sprint A NexusCanvas fork (spec §8
// prohibits renderer forks). Tier ring resolution happens ONLY via
// pageTier — 'landing' gives the KL its cyan baseline ring. The Sprint A
// nexusState trigger semantics are preserved on the host wrapper as a halo
// class only (see #eileen-nexus-001-styles).
function CanonicalNexus({ size, interactive, showRelationships, nexusState }) {
  const hostRef = useRef(null);
  const px = size || 180;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let instance = null;
    let cancelled = false;
    loadNexusModule().then(function (ok) {
      if (!ok || cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.className = 'kl-nexus-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      host.appendChild(canvas);
      instance = window.AilaneNexus.createNexus(canvas, {
        pageTier: 'landing',
        size: px,
        interactive: interactive === true,
        showRelationships: showRelationships !== false,
        dataSource: 'eileen-nexus-intel'
      });
    });
    return function () {
      cancelled = true;
      if (instance) instance.destroy();
      while (host.firstChild) host.removeChild(host.firstChild);
    };
  }, [px, interactive, showRelationships]);

  return (
    <div
      ref={hostRef}
      className={'kl-nexus-host kl-nexus-halo kl-nexus-halo--' + (nexusState || 'dormant')}
      style={{ width: px + 'px', height: px + 'px' }}
    />
  );
}

// ─── EileenStaticDot ───
// 8px static cyan dot for the micro identity moments that previously ran a
// 16–20px NexusCanvas instance (advisor tip card, sidebar, domain panel).
// Same label-not-renderer rationale as EileenSenderLabel below; keeps each
// page within the spec §9 canonical-instance budget (≤3 per page).
function EileenStaticDot() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#0EA5E9',
        boxShadow: '0 0 6px rgba(14,165,233,0.5)',
        flexShrink: 0,
        display: 'inline-block',
      }}
    ></span>
  );
}

// Retired by EILEEN-NEXUS-001 §1.0: the Sprint A NexusCanvas fork
// (4-state visual engine, EILEEN-002 §7.1) and its tierPalette helper were
// removed here — the canonical module above is the only renderer.

// ─── EileenSenderLabel ───
// Static cyan "Nexus" dot + "Eileen" label, rendered on every Eileen message
// bubble to restore Eileen's visual identity throughout the conversation
// (KLUX-001 Art. 13 §13.2, Art. 19 §19.1(a)). Option B of the R1-A brief:
// a label, not a renderer — kept as-is by EILEEN-NEXUS-001 §1.0; its cyan
// aligns with the canonical ring baseline.

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

// §3.2: Reusable Eileen-voiced error message (KLUX-001 Art. 19)
// Amber (#F59E0B) indicator dot distinguishes from Eileen's normal cyan.
function EileenErrorMessage({ message, retryAction, retryLabel }) {
  return (
    <div style={{
      display: 'flex', gap: '12px', padding: '16px',
      background: '#0F172A', borderRadius: '12px', border: '1px solid #1E293B',
      margin: '8px 0', maxWidth: '520px',
    }}>
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px',
        background: '#F59E0B', boxShadow: '0 0 8px rgba(245,158,11,0.4)',
        flexShrink: 0,
      }} />
      <div>
        <p style={{ color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', lineHeight: 1.6, margin: '0 0 8px' }}>
          {message}
        </p>
        {retryAction && (
          <button
            onClick={retryAction}
            style={{
              background: 'transparent', border: '1px solid #334155', color: '#94A3B8',
              borderRadius: '6px', padding: '6px 14px', fontSize: '12px',
              fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
            }}
          >
            {retryLabel || 'Try again'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── §6.2 ContractUploadPrompt (KLAC-001-AM-006 §4.2) ───
// Rendered in the conversation when contract intent is detected.
// CCI Separation Doctrine: Eileen routes, the engine analyses.

function ContractUploadPrompt({ onUpload }) {
  return (
    <div style={{
      background: '#0F172A',
      border: '1px solid #0EA5E9',
      borderRadius: '12px',
      padding: '20px',
      margin: '12px 0',
      maxWidth: '520px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#0EA5E9', boxShadow: '0 0 8px rgba(14,165,233,0.5)',
        }} />
        <span style={{ color: '#F1F5F9', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
          Ready to check your contract
        </span>
      </div>
      <p style={{ color: '#CBD5E1', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, margin: '0 0 16px' }}>
        Upload your employment contract or HR document and Eileen will route it through the Contract Compliance Check engine for analysis against current UK employment legislation.
      </p>
      <button
        onClick={onUpload}
        style={{
          background: '#0EA5E9',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '13px',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          cursor: 'pointer',
        }}
        onMouseEnter={function(e) { e.currentTarget.style.background = '#0284C7'; }}
        onMouseLeave={function(e) { e.currentTarget.style.background = '#0EA5E9'; }}
      >
        Upload Document
      </button>
    </div>
  );
}

// ─── QualifyingQuestion (KLIA-001 Art. 23 — EQIS) ───
// Renders as a local Eileen message with two clickable buttons.
// §5.3: Persisted to kl_user_preferences.preferences.user_type via DB.

function QualifyingQuestion({ onSelect }) {
  return (
    <div className="kl-msg kl-msg-eileen">
      <div className="kl-msg-content">
        <EileenSenderLabel />
        <div className="kl-msg-body" style={{ marginTop: '8px' }}>
          <p>Before we begin — are you an employer or HR professional managing staff, or a worker with a question about your own employment?</p>
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
            Employer / HR Professional
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

// Retired by EILEEN-NEXUS-001 §1.0: FloatingNexus and FloatingNexusPanel
// (EILEEN-001 §3–4) were dead code — superseded by FloatingNexusAdvisor
// (Hotfix H-5) — and rendered the retired NexusCanvas fork, so both were
// removed with it.

// ─── Advisor Tips (Hotfix H-5 §6.3) ───
var ADVISOR_TIPS = {
  'dismissal': 'Eileen can guide you through unfair dismissal rights, disciplinary procedures, and the ACAS Code. This is the most litigated area of UK employment law.',
  'discrimination': 'Eileen covers all nine protected characteristics, the EHRC Code, harassment obligations including the new Worker Protection Act 2023, and equal pay.',
  'contracts': 'Eileen can analyse your contract terms against current legislation \u2014 including the new flexible working and zero-hours provisions under ERA 2025.',
  'family-leave': 'Eileen covers maternity, paternity, shared parental leave, and the new neonatal care leave under ERA 2025. One of the most active areas of legislative change.',
  'transfers': 'Eileen can explain TUPE transfer obligations, employee consultation requirements, and the interaction with collective redundancy law.',
  'health-safety': "Eileen draws on 2,498 HSE prosecution records and 30,543 enforcement notices to contextualise your health and safety obligations.",
  'whistleblowing': 'Eileen covers qualifying disclosures, protected disclosure routes, and the employment protections for workers who raise concerns.',
  'data-monitoring': "Eileen can guide you through employer GDPR obligations, employee monitoring rules, and subject access request handling.",
};

// ─── FloatingNexusAdvisor (Hotfix H-5 §6.5) ───
// Replaces the chat-panel FloatingNexus (retired) on the welcome state.
// Shows contextual domain tooltip when user hovers near domain cards.

// KL-LIVE-002 §W-F D7: generic helper line shown when no proximity tip is
// active (same copy as the retired FloatingNexusPanel — no new product copy).
var ADVISOR_GENERIC_TIP = "I'm here whenever you need me. Ask a question or upload a contract for analysis.";

function FloatingNexusAdvisor({ nearDomain, nexusState, prefersReducedMotion, onProximityDomain, dismissed, onDismiss }) {
  var _show = useState(false);
  var showTooltip = _show[0];
  var setShowTooltip = _show[1];
  var tip = nearDomain ? ADVISOR_TIPS[nearDomain] : null;

  // §W-F D7: below 768px the floating card is suppressed entirely and a
  // compact help chip renders instead.
  var _mobileVp = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  var isMobileVp = _mobileVp[0];
  var setIsMobileVp = _mobileVp[1];
  useEffect(function() {
    function onResize() { setIsMobileVp(window.innerWidth < 768); }
    window.addEventListener('resize', onResize);
    return function() { window.removeEventListener('resize', onResize); };
  }, []);

  useEffect(function() {
    // §W-F D7: dismissal suppresses proximity auto-show (persisted via
    // KLUI-001 prefs); manual open via the chip/orb stays available.
    if (tip && !dismissed) {
      setShowTooltip(true);
    } else if (!tip) {
      var t = setTimeout(function() { setShowTooltip(false); }, 300);
      return function() { clearTimeout(t); };
    }
  }, [tip, dismissed]);

  function handleDismissCard() {
    setShowTooltip(false);
    if (typeof onDismiss === 'function') onDismiss();
  }

  // KLUX-001-AM-002 §3: Drag state. null x/y = default bottom-right anchor.
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
    var elements = document.querySelectorAll('[data-domain-slug], [data-feed-id], [data-calendar-id]');
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
    if (typeof onProximityDomain === 'function') onProximityDomain(closest);
  }

  function handleMouseDown(e) {
    if (window.innerWidth < 768) {
      setShowTooltip(function(v) { return !v; });
      return;
    }
    dragging.current = true;
    var rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  }

  function handleTouchStart(e) {
    if (window.innerWidth < 768) {
      setShowTooltip(function(v) { return !v; });
      return;
    }
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
      setPos({ x: x, y: y });
      checkProximity(e.clientX, e.clientY);
    }
    function handleMouseUp() {
      dragging.current = false;
      setPos(function(prev) {
        if (prev.x !== null && (prev.x < 60 || prev.y < 60)) {
          return { x: null, y: null };
        }
        return prev;
      });
    }
    function handleTouchMove(e) {
      if (!dragging.current) return;
      var touch = e.touches[0];
      var x = Math.max(0, Math.min(window.innerWidth - 52, touch.clientX - dragOffset.current.x));
      var y = Math.max(0, Math.min(window.innerHeight - 52, touch.clientY - dragOffset.current.y));
      setPos({ x: x, y: y });
      checkProximity(touch.clientX, touch.clientY);
      if (e.cancelable) e.preventDefault();
    }
    function handleTouchEnd() {
      dragging.current = false;
      setPos(function(prev) {
        if (prev.x !== null && (prev.x < 60 || prev.y < 60)) {
          return { x: null, y: null };
        }
        return prev;
      });
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return function() {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // §W-F D7: shared tooltip card — header carries a dismiss control.
  function renderTipCard(text) {
    return React.createElement('div', {
      style: {
        background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px',
        padding: '14px 18px', maxWidth: '300px',
        transition: 'opacity 0.3s, transform 0.3s',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      },
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
        React.createElement(EileenStaticDot, null),
        React.createElement('span', { style: { color: '#0EA5E9', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, flex: 1 } }, 'Eileen'),
        React.createElement('button', {
          type: 'button',
          onClick: handleDismissCard,
          'aria-label': 'Dismiss Eileen helper',
          style: {
            background: 'none', border: 'none', color: '#64748B',
            fontSize: '16px', cursor: 'pointer', padding: '0 0 0 8px', lineHeight: 1,
            flexShrink: 0,
          },
        }, '×')
      ),
      React.createElement('p', { style: { color: '#CBD5E1', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, margin: 0 } }, text)
    );
  }

  // §W-F D7: mobile (<768px) — no floating card; a compact help chip with
  // safe-area margin toggles the tip instead.
  if (isMobileVp) {
    return React.createElement('div', {
      style: {
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        // z-index 50: above page content, below the panel drawer (60) so the
        // full-screen sheet covers the chip on mobile (§W-G.3).
        right: '16px', zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px',
      },
    },
      showTooltip ? renderTipCard(tip || ADVISOR_GENERIC_TIP) : null,
      React.createElement('button', {
        type: 'button',
        className: 'kl-eileen-chip',
        'aria-label': showTooltip ? 'Hide Eileen helper' : 'Show Eileen helper',
        'aria-expanded': showTooltip,
        onClick: function() { setShowTooltip(function(v) { return !v; }); },
      },
        React.createElement('span', {
          'aria-hidden': 'true',
          style: {
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#0EA5E9', boxShadow: '0 0 6px rgba(14,165,233,0.5)',
            flexShrink: 0,
          },
        }),
        'Eileen'
      )
    );
  }

  // alignItems is kept 'flex-end' in both branches so the tooltip stays
  // right-anchored relative to the orb after a drag — preventing the
  // misalignment where the tooltip would jump left when the anchor flipped.
  // §W-F D7: default anchor carries a safe-area margin.
  var posStyle = pos.x !== null
    ? { position: 'fixed', left: pos.x + 'px', top: pos.y + 'px', zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px',
        cursor: dragging.current ? 'grabbing' : 'grab' }
    : { position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', right: '24px', zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px',
        cursor: dragging.current ? 'grabbing' : 'grab' };

  return React.createElement('div', { style: posStyle },
    // Advisor tooltip
    showTooltip && tip ? renderTipCard(tip) : null,
    // Nexus orb (draggable)
    React.createElement('div', {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      role: 'button',
      'aria-label': 'Drag Eileen',
      style: {
        width: '52px', height: '52px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: dragging.current ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        boxShadow: '0 0 ' + (nearDomain ? '16' : '8') + 'px rgba(14,165,233,' + (nearDomain ? '0.3' : '0.15') + ')',
        transition: 'box-shadow 0.3s',
      },
    },
      React.createElement(CanonicalNexus, {
        size: 52, interactive: false, showRelationships: false,
        nexusState: nearDomain ? 'ready' : (nexusState || 'dormant'),
      })
    )
  );
}

// ─── NexusSendButton (EILEEN-002 §7.2, Sprint A §4) ───
// 38px circular send action. Dormant when disabled, reflects nexusState
// when active. EILEEN-NEXUS-001 §1.0/§1.1: the atmospheric NexusCanvas
// backdrop was retired with the fork; the nexusState trigger semantics now
// live on the button's halo class (#eileen-nexus-001-styles).

function NexusSendButton({ size, nexusState, disabled, onClick, prefersReducedMotion, tier }) {
  var s = size || 38;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={'kl-nexus-halo kl-nexus-halo--' + (disabled ? 'dormant' : (nexusState || 'dormant'))}
      style={{
        width: s + 'px',
        height: s + 'px',
        borderRadius: '50%',
        border: 'none',
        background: disabled ? 'transparent' : '#0EA5E9',
        padding: 0,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'opacity 0.2s, background 0.3s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label="Send message to Eileen"
    >
      {/* Visible send arrow */}
      <svg
        width={Math.round(s * 0.45)}
        height={Math.round(s * 0.45)}
        viewBox="0 0 24 24"
        fill="none"
        style={{ position: 'relative', zIndex: 1 }}
        aria-hidden="true"
      >
        <path
          d="M5 12h14M13 6l6 6-6 6"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
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

// ─── Voice Phase 1 (EILEEN-002 §7.3, VTCA-001 Art. 16) ───
// Session-scoped module flag so the voice disclosure toast appears only once
// per session, per VTCA-001 Art. 16.1.
var __eileenVoiceDisclosureShown = false;

// Select the best available Scottish/UK female voice per EILEEN-002 §7.3.
// Priority cascade: Fiona → named UK female voices → any en-GB non-male
// → any en-GB → any en → first available voice.
function selectEileenVoice() {
  try {
    var voices = (window.speechSynthesis && window.speechSynthesis.getVoices()) || [];
    if (!voices.length) return null;
    // 1. Fiona (Scottish female) — exact match
    var fiona = voices.find(function(v) { return /fiona/i.test(v.name); });
    if (fiona) return fiona;
    // 2. Named UK female voices
    var namedFemale = ['kate', 'serena', 'moira', 'martha', 'tessa'];
    for (var i = 0; i < namedFemale.length; i++) {
      var match = voices.find(function(v) {
        return new RegExp(namedFemale[i], 'i').test(v.name);
      });
      if (match) return match;
    }
    // 3. Any en-GB voice without obviously male name tokens
    var maleTokens = /(daniel|oliver|arthur|male|man)/i;
    var enGbFemale = voices.find(function(v) {
      return (v.lang === 'en-GB' || /en[-_]gb/i.test(v.lang)) && !maleTokens.test(v.name);
    });
    if (enGbFemale) return enGbFemale;
    // 4. Any en-GB voice
    var enGb = voices.find(function(v) { return v.lang === 'en-GB' || /en[-_]gb/i.test(v.lang); });
    if (enGb) return enGb;
    // 5. Any en voice
    var en = voices.find(function(v) { return /^en/i.test(v.lang); });
    if (en) return en;
    // 6. Fallback: first available
    return voices[0] || null;
  } catch (err) {
    return null;
  }
}

// Strip markdown to plain speech-safe text.
function stripMarkdownForSpeech(src) {
  if (!src) return '';
  var s = String(src);
  // Remove code fences and inline code
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]+)`/g, '$1');
  // Headings, blockquote markers
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/^>\s+/gm, '');
  // Bold / italic / strike
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/_([^_]+)_/g, '$1');
  s = s.replace(/~~([^~]+)~~/g, '$1');
  // Links: [text](url) → text
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // List bullets
  s = s.replace(/^[\s]*[-*+]\s+/gm, '');
  s = s.replace(/^[\s]*\d+\.\s+/gm, '');
  // HTML tags
  s = s.replace(/<[^>]+>/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function ReadAloudButton({ text }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(function() {
    // Stop speaking if this component unmounts mid-utterance
    return function() {
      try {
        if (isSpeaking && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch (e) { /* silent */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Cancel any in-flight utterance from another message
    window.speechSynthesis.cancel();
    var utt = new SpeechSynthesisUtterance(clean);
    var voice = selectEileenVoice();
    if (voice) utt.voice = voice;
    utt.lang = (voice && voice.lang) || 'en-GB';
    utt.pitch = 1.15;
    utt.rate = 0.92;
    utt.volume = 0.9;
    utt.onend = function() { setIsSpeaking(false); };
    utt.onerror = function() { setIsSpeaking(false); };
    setIsSpeaking(true);
    window.speechSynthesis.speak(utt);
    // VTCA-001 Art. 16.1: session-scoped voice disclosure
    if (!__eileenVoiceDisclosureShown) {
      __eileenVoiceDisclosureShown = true;
      try {
        var toast = document.createElement('div');
        toast.textContent = 'Eileen uses AI-generated voice technology';
        toast.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#1E293B;color:#F1F5F9;padding:10px 18px;border-radius:8px;font-size:12px;font-family:DM Sans,sans-serif;z-index:9999;border:1px solid #334155;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:1;transition:opacity 0.4s;';
        document.body.appendChild(toast);
        setTimeout(function() {
          toast.style.opacity = '0';
          setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
        }, 3500);
      } catch (e) { /* silent */ }
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="kl-action-btn"
      title={isSpeaking ? 'Stop reading' : 'Read aloud'}
      aria-label={isSpeaking ? 'Stop reading' : 'Read response aloud'}
    >{isSpeaking ? '\u25A0 Stop' : '\u25B6 Read aloud'}</button>
  );
}

// ─── UploadCompleteMessage (F-3) ───
// Replaces the auto-prompt for compliance analysis with two explicit choices:
// "Run Compliance Check" (routes to the engine) or "Save to Vault only"
// (archives without analysis). CCI v1.0 Art. I §1.5 Separation Doctrine.

function UploadCompleteMessage({ filename, charCount, documentId, onRunAnalysis, onVaultOnly, dismissed, msgId, extractionFailed }) {
  if (dismissed) {
    return (
      <div style={{
        marginTop: '8px', padding: '10px 14px',
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.25)',
        borderRadius: '8px', fontSize: '13px', color: '#10B981',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {'\u2713 Saved to Document Vault'}
      </div>
    );
  }
  var sizeLabel = extractionFailed
    ? 'saved to vault (text extraction unavailable)'
    : (charCount != null ? charCount.toLocaleString() + ' characters extracted' : 'ready');
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.7 }}>
        I have your contract{filename ? ' \u2014 ' + filename : ''}{' \u2014 '}{sizeLabel}. How would you like to proceed?
      </div>
      {extractionFailed && (
        <div style={{ fontSize: '12px', color: '#b08000', marginTop: '10px', marginBottom: '8px' }}>
          Text extraction was not possible. The file is saved in your vault. To run a compliance check, try re-uploading as a text-based PDF.
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
        {!extractionFailed && (
          <button
            type="button"
            onClick={function() { if (typeof onRunAnalysis === 'function') onRunAnalysis(documentId, msgId); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              color: '#FFFFFF', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.2s',
            }}
            onMouseEnter={function(e) { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={function(e) { e.currentTarget.style.opacity = '1'; }}
          >{'\u2713 Run Compliance Check'}</button>
        )}
        {extractionFailed && (
          <button
            type="button"
            disabled
            title="Text extraction failed \u2014 file saved to vault but cannot run compliance check"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px',
              background: '#334155',
              color: '#94A3B8', border: 'none', borderRadius: '8px',
              cursor: 'not-allowed', fontSize: '13px', fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", opacity: 0.6,
            }}
          >Compliance Check Unavailable</button>
        )}
        <button
          type="button"
          onClick={function() { if (typeof onVaultOnly === 'function') onVaultOnly(msgId); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px',
            background: 'transparent',
            color: '#CBD5E1', border: '1px solid #334155', borderRadius: '8px',
            cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={function(e) { e.currentTarget.style.borderColor = '#64748B'; e.currentTarget.style.color = '#F1F5F9'; }}
          onMouseLeave={function(e) { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#CBD5E1'; }}
        >Save to Vault only</button>
      </div>
    </div>
  );
}

// ─── MessageBubble ───

function MessageBubble({ msg, onRunAnalysis, onVaultOnly }) {
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
  // F-3: Upload-complete dual-choice card (Run Compliance Check / Save to Vault only)
  if (msg.isUploadComplete) {
    return (
      <div className="kl-msg kl-msg-eileen">
        <div className="kl-msg-content" style={{ position: 'relative' }}>
          <EileenSenderLabel />
          <UploadCompleteMessage
            filename={msg.filename}
            charCount={msg.charCount}
            documentId={msg.documentId}
            msgId={msg.id}
            dismissed={!!msg.vaultOnly}
            extractionFailed={!!msg.extractionFailed}
            onRunAnalysis={onRunAnalysis}
            onVaultOnly={onVaultOnly}
          />
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
            className="eileen-response-content"
            style={{ color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.7, marginTop: '8px' }}
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
            {/* F-5: Read aloud — Web Speech API with Scottish female voice cascade */}
            <ReadAloudButton text={msg.content || ''} />

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

function MessageInput({ onSend, disabled, onFileSelect, pulseUpload, onInputChange, nexusState, tier, prefersReducedMotion }) {
  const [value, setValue] = useState('');
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);

  // KLUX-001-AM-002 §2.4 / Art. 5: "Discuss with Eileen" seeds the input
  // without auto-sending. Listens for kl-seed-input custom events dispatched
  // from RegulatoryFeed and CalendarPanel.
  useEffect(function() {
    function onSeed(e) {
      var text = e && e.detail && e.detail.text;
      if (typeof text !== 'string' || !text) return;
      setValue(text);
      if (typeof onInputChange === 'function') onInputChange(text.trim().length);
      if (textInputRef.current) {
        try { textInputRef.current.focus(); } catch (err) { /* silent */ }
      }
    }
    window.addEventListener('kl-seed-input', onSeed);
    return function() { window.removeEventListener('kl-seed-input', onSeed); };
  }, [onInputChange]);

  function handleChange(e) {
    var v = e.target.value;
    setValue(v);
    if (typeof onInputChange === 'function') onInputChange(v.trim().length);
  }

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    if (typeof onInputChange === 'function') onInputChange(0);
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
        ref={textInputRef}
        className="kl-input"
        type="text"
        placeholder="Ask Eileen anything about UK employment law..."
        aria-label="Message Eileen"
        value={value}
        onChange={handleChange}
        onKeyDown={onKey}
        disabled={disabled}
      />
      <NexusSendButton
        size={38}
        nexusState={nexusState || 'dormant'}
        disabled={disabled || !value.trim()}
        onClick={submit}
        prefersReducedMotion={prefersReducedMotion}
        tier={tier || window.__klTier || 'kl'}
      />
    </div>
  );
}

// ─── ConversationArea ───

function ConversationArea({ messages, isLoading, onSend, tier, onFileSelect, onRunAnalysis, onVaultOnly, floatingNexusExpanded, onToggleFloatingNexus, showQualifier, onUserTypeSelect, pulseUpload, nexusState, prefersReducedMotion, onInputChange, nearDomain, onDomainHover, onDomainLeave, hubMode, hubSession, matterRefreshKey }) {
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
          {/* KL-LIVE-002 §W-F D1: single centred content container — hero,
              research-area grid, and shelf all inherit from it. */}
          <div className="kl-content-container">
            <div className="kl-welcome-nexus">
              {/* EILEEN-NEXUS-001 §1.1: the one interactive ≤180px canonical
                  instance — Eileen hero mount, cyan baseline ring. */}
              <CanonicalNexus size={180} interactive={true} nexusState={nexusState} />
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
              <MessageInput onSend={onSend} disabled={isLoading} onFileSelect={onFileSelect} pulseUpload={pulseUpload} onInputChange={onInputChange} nexusState={nexusState} tier={tier} prefersReducedMotion={prefersReducedMotion} />
            </div>
            {/* OOX-001 §1.4: hub-mode matter bar (retain-or-clear + remember). */}
            {hubMode && hubSession && <HubMatterPanel hubSession={hubSession} refreshKey={matterRefreshKey} />}
            <HorizonAlert />
            {/* KL-LIVE-001 §W-C: Coming-into-force rail (live feed, date-sorted) */}
            <ForwardRail />
            {/* KL-LIVE-002 §W-F D2: research-area card grid — title,
                2-line-clamped description, topic-count badge, Explore
                affordance. Whole card is the tap target. data-domain-slug
                and hover handlers feed FloatingNexusAdvisor proximity. */}
            <div className="kl-domain-card-grid">
              {DOMAINS.map(function(domain) {
                var navToDomain = function() { window.location.hash = '/domain/' + domain.slug; };
                return (
                  <button
                    key={domain.id}
                    type="button"
                    className="kl-domain-card"
                    data-domain-slug={domain.slug}
                    aria-label={'Explore ' + domain.name}
                    onClick={navToDomain}
                    onMouseEnter={function() { if (typeof onDomainHover === 'function') onDomainHover(domain.slug); }}
                    onMouseLeave={function() { if (typeof onDomainLeave === 'function') onDomainLeave(); }}
                  >
                    <span className="kl-domain-card-head">
                      <span className="kl-domain-card-name">{domain.name}</span>
                      <span className="kl-domain-card-count">{domain.subAreas.length} topics</span>
                    </span>
                    <span className="kl-domain-card-desc">{domain.orientation}</span>
                    <span className="kl-domain-card-explore">Explore <span aria-hidden="true">&rarr;</span></span>
                  </button>
                );
              })}
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
          {/* F-1: FloatingNexusAdvisor is rendered at App level so it remains
              visible even when Welcome is not the active view. See App render. */}
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
          {/* H-5: Conversation state — simple Nexus state indicator, no panel.
              EILEEN-NEXUS-001: canonical 52px orb; the state glow moved from
              this container onto the orb's halo class. */}
          <div style={{
            position: 'absolute', bottom: window.innerWidth <= 768 ? '100px' : '80px', right: '24px', zIndex: 30,
            width: '52px', height: '52px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <CanonicalNexus size={52} interactive={false} showRelationships={false} nexusState={nexusState} />
          </div>
          <div className="kl-messages" ref={scrollRef} role="log" aria-live="polite" onClick={function(e) {
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
            {messages.map((m, i) => {
              if (m.role === 'system_ui' && m.type === 'contract_upload_prompt') {
                return <ContractUploadPrompt key={i} onUpload={function() {
                  var fileInput = document.querySelector('.kl-conversation-input input[type="file"]') ||
                                  document.querySelector('.kl-welcome-input input[type="file"]');
                  if (fileInput) fileInput.click();
                }} />;
              }
              if (m.isError) {
                return <EileenErrorMessage key={i} message={m.errorMessage || m.content} retryAction={m.retryAction} retryLabel={m.retryLabel} />;
              }
              return <MessageBubble key={i} msg={m} onRunAnalysis={onRunAnalysis} onVaultOnly={onVaultOnly} />;
            })}
            {showQualifier && <QualifyingQuestion onSelect={onUserTypeSelect} />}
            {isLoading && <TypingIndicator />}
          </div>
          {/* OOX-001 §1.4: hub-mode matter bar (retain-or-clear + remember). */}
          {hubMode && hubSession && <HubMatterPanel hubSession={hubSession} refreshKey={matterRefreshKey} />}
          <div className="kl-conversation-input">
            <MessageInput onSend={onSend} disabled={isLoading} onFileSelect={onFileSelect} pulseUpload={pulseUpload} onInputChange={onInputChange} nexusState={nexusState} tier={tier} prefersReducedMotion={prefersReducedMotion} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Regulatory Intelligence Feed (KLUX-001-AM-002 §2, AMD-046) ───
// Replaces Crown Jewels in the sidebar. Shows rolling 180-day window of
// regulatory requirements (90 days past, 90 days future) from the
// regulatory_requirements table.

async function loadRegulatoryFeed() {
  if (!window.__klToken) return [];
  try {
    var now = new Date();
    var past = new Date(now); past.setDate(past.getDate() - 90);
    var future = new Date(now); future.setDate(future.getDate() + 90);

    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/regulatory_requirements' +
        '?effective_from=gte.' + past.toISOString().split('T')[0] +
        '&effective_from=lte.' + future.toISOString().split('T')[0] +
        '&select=id,requirement_name,statutory_basis,effective_from,commencement_status,is_forward_requirement,source_act' +
        '&order=effective_from.desc' +
        '&limit=20',
      { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
    );
    var data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Regulatory feed failed:', e);
    return [];
  }
}

function RegulatoryFeedItem({ item, onDiscuss }) {
  var _exp = useState(false);
  var expanded = _exp[0];
  var setExpanded = _exp[1];

  var now = new Date();
  var effectiveDate = new Date(item.effective_from);
  var isPast = effectiveDate <= now;
  var daysAway = Math.ceil((effectiveDate - now) / (1000 * 60 * 60 * 24));

  // KLUX-001-AM-002 §2.3: no brand gold (#F59E0B/#D4A017) outside Institutional tier.
  // Pending items use warm amber (#D97706) as specified in AMD-050 §3.2.
  var badgeColor = isPast ? '#10B981' : daysAway <= 30 ? '#EF4444' : '#D97706';
  var badgeText = isPast ? 'In force' : daysAway + ' days';

  return (
    <div data-feed-id={item.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div
        onClick={function() { setExpanded(!expanded); }}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
        aria-expanded={expanded}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{
            fontSize: '10px', fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
            color: badgeColor, background: badgeColor + '15',
            padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap',
          }}>{badgeText}</span>
          <span style={{
            color: '#E2E8F0', fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0,
          }}>{item.requirement_name}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: '#0EA5E9', fontSize: '10px', fontFamily: "'DM Mono', monospace" }}>{item.source_act}</span>
          <span style={{ color: '#64748B', fontSize: '10px' }}>
            {effectiveDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{
            color: '#CBD5E1', fontSize: '11px', fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.5, margin: '0 0 8px',
          }}>{item.statutory_basis}</p>
          <button
            type="button"
            onClick={function(e) { e.stopPropagation(); onDiscuss(item); }}
            style={{
              background: 'transparent', border: '1px solid #0EA5E9', color: '#0EA5E9',
              borderRadius: '6px', padding: '4px 10px', fontSize: '11px',
              fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
            }}
          >Discuss with Eileen</button>
        </div>
      )}
    </div>
  );
}

// ─── CrownJewels (removed from Sidebar per KLUX-001-AM-002 §2.1; constant retained at top of file) ───

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

function Sidebar({ open, sessionHistory, activeSessionId, onSelectSession, onNewChat, onCrownQuery, nexusState, prefersReducedMotion, lang, hubChrome, currentFacet, onSelectFacet }) {
  var _historyOpen = useState(false);
  var historyOpen = _historyOpen[0];
  var setHistoryOpen = _historyOpen[1];
  // KLUX-001-AM-002 §2: Regulatory Intelligence Feed state (replaces Crown Jewels)
  var _feed = useState([]);
  var feedItems = _feed[0];
  var setFeedItems = _feed[1];
  // AMD-050 §3.2: Default to compact 3-item view; expandable to full list.
  var _feedExpanded = useState(false);
  var feedExpanded = _feedExpanded[0];
  var setFeedExpanded = _feedExpanded[1];

  useEffect(function() {
    // OOX-001 INTELLIGENCE-FOLD §1.1 + OOX-CARDS §1.1: the feed is PUBLIC-KL only.
    // In the gated hub chrome — hub mode OR operational mode (hubChrome) — it is no
    // longer rendered (the in-force statutory catalogue now lives inside the
    // Intelligence facet), so skip the fetch entirely. The earlier fold gated this on
    // hubMode alone, which left the feed live at /operational/ (operationalMode true,
    // hubMode false). Keying on hubChrome removes it in operational mode too.
    if (hubChrome) return;
    var cancelled = false;
    loadRegulatoryFeed().then(function(items) {
      if (!cancelled) setFeedItems(items);
    });
    return function() { cancelled = true; };
  }, [hubChrome]);

  return React.createElement('nav', { className: 'kl-sidebar' + (open ? '' : ' collapsed'), role: 'navigation', 'aria-label': 'Conversation history' },
    // §5 — Sidebar Nexus indicator (20px, shows Eileen's current state)
    React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    },
      React.createElement(EileenStaticDot, null),
      React.createElement('span', {
        style: { color: '#94A3B8', fontSize: '11px', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
      }, 'Eileen')
    ),
    React.createElement('div', { className: 'kl-sidebar-section' },
      React.createElement('button', { className: 'kl-new-chat-btn', onClick: onNewChat },
        React.createElement('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.25', strokeLinecap: 'round', strokeLinejoin: 'round' },
          React.createElement('line', { x1: '12', y1: '5', x2: '12', y2: '19' }),
          React.createElement('line', { x1: '5', y1: '12', x2: '19', y2: '12' })
        ),
        React.createElement('span', null, 'New Conversation')
      )
    ),

    // OOX-001 INTELLIGENCE-FOLD §1.1 + OOX-CARDS §1.1: this middle scroll panel is
    // PUBLIC-KL ONLY. In the gated hub chrome — hub mode OR operational mode
    // (hubChrome) — the "Regulatory Intelligence" feed is removed (its in-force
    // statutory catalogue now lives inside the Intelligence facet — §1.2) and the
    // "Your workspace" facet rail occupies the scroll area instead. Public KL (neither
    // flag): the feed below is unchanged. The rail keeps Eileen / New Conversation /
    // workspace / History.
    hubChrome
      ? React.createElement('div', {
          style: { flex: 1, overflowY: 'auto', minHeight: 0, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 0' },
        },
          React.createElement('div', {
            style: { color: '#64748B', fontSize: '10px', fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 16px' },
          }, 'Your workspace'),
          HUB_WORKSPACE_FACETS.map(function (f) {
            var active = currentFacet === f.id;
            return React.createElement('button', {
              key: f.id,
              type: 'button',
              onClick: function () { onSelectFacet(active ? null : f.id); },
              'aria-pressed': active,
              style: {
                width: '100%', textAlign: 'left', display: 'block',
                background: active ? 'rgba(14,165,233,0.12)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid #0EA5E9' : '2px solid transparent',
                color: active ? '#F1F5F9' : '#94A3B8', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: '13px', padding: '8px 16px',
              },
            }, f.label);
          })
        )
      : React.createElement('div', { style: { flex: 1, overflowY: 'auto', minHeight: 0 } },
      React.createElement('div', { style: { marginTop: '12px' } },
        React.createElement('div', {
          style: {
            color: '#64748B', fontSize: '10px', fontFamily: "'DM Mono', monospace",
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '8px 16px',
          },
        }, 'Regulatory Intelligence'),
        feedItems.length === 0
          ? React.createElement('div', {
              style: { padding: '8px 16px', color: '#475569', fontSize: '11px' },
            }, 'No recent regulatory events')
          : (function() {
              // AMD-050 §3.2: default to first 3; "Show all" reveals the remainder.
              var display = feedExpanded ? feedItems : feedItems.slice(0, 3);
              var rendered = display.map(function(item, i) {
                return React.createElement(RegulatoryFeedItem, {
                  key: item.id || i,
                  item: item,
                  // AMD-050 §3.3 + KLUX-001 Art. 5: seed the input, do NOT auto-send.
                  onDiscuss: function(it) {
                    var seed = 'Tell me about ' + (it.requirement_name || 'this regulatory event') +
                      (it.source_act ? ' under ' + it.source_act : '') +
                      ' and what it means for employers.';
                    if (typeof window.__klSeedInput === 'function') {
                      window.__klSeedInput(seed);
                    } else if (typeof onCrownQuery === 'function') {
                      // Fallback (should not occur post-AMD-050)
                      onCrownQuery(seed);
                    }
                  },
                });
              });
              if (feedItems.length > 3) {
                rendered.push(React.createElement('button', {
                  key: '__feed-toggle',
                  type: 'button',
                  onClick: function() { setFeedExpanded(!feedExpanded); },
                  style: {
                    width: '100%', padding: '8px 16px', marginTop: '4px',
                    background: 'transparent', border: 'none',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    color: '#0EA5E9', fontSize: '11px',
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                    textAlign: 'left', cursor: 'pointer',
                  },
                  'aria-expanded': feedExpanded,
                },
                  feedExpanded
                    ? '\u25B2 Show fewer'
                    : '\u25BC Show all regulatory events (' + feedItems.length + ')'
                ));
              }
              return rendered;
            })()
      )
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

// OOX-001 §1.3 — humanise organisations.tier for the identity badge (the
// product-context axis, e.g. operational_readiness → "Operational"). Distinct
// from the billing-axis subscription_tier. The .kl-tier-badge CSS uppercases
// the label; the class drives the palette (operational = cyan).
function klOrgTierBadge(orgTier) {
  switch (orgTier) {
    case 'operational_readiness':
    case 'operational':
      return { label: 'Operational', cls: 'kl-badge-operational' };
    case 'governance':
      return { label: 'Governance', cls: 'kl-badge-governance' };
    case 'institutional':
    case 'enterprise':
      return { label: orgTier === 'institutional' ? 'Institutional' : 'Enterprise', cls: 'kl-badge-enterprise' };
    default:
      // Unknown/absent org tier in operational mode → neutral, never the
      // billing tier. Snake/kebab → Title Case fallback.
      if (!orgTier) return { label: 'Operational', cls: 'kl-badge-operational' };
      return {
        label: String(orgTier).replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
        cls: 'kl-badge-operational',
      };
  }
}

function TopBar({ sidebarOpen, onToggleSidebar, accessType, tier, sessionExpiresAt, onSessionExpired, lang, onToggleLang, operationalMode, orgTier }) {
  let badgeLabel = 'KNOWLEDGE LIBRARY';
  let badgeClass = 'kl-badge-per-session';
  if (operationalMode) {
    // §1.3 — operational identity badge reads organisations.tier, NOT subscription_tier.
    var ob = klOrgTierBadge(orgTier);
    badgeLabel = ob.label;
    badgeClass = ob.cls;
  } else if (accessType === 'subscription') {
    if (tier === 'operational_readiness') { badgeLabel = 'OPERATIONAL'; badgeClass = 'kl-badge-operational'; }
    else if (tier === 'governance') { badgeLabel = 'GOVERNANCE'; badgeClass = 'kl-badge-governance'; }
    else if (tier === 'enterprise' || tier === 'institutional') { badgeLabel = 'ENTERPRISE'; badgeClass = 'kl-badge-enterprise'; }
  } else if (accessType === 'per_session') {
    badgeLabel = 'PER-SESSION';
  }
  // §1.2/§1.3 — in operational mode the brand reads "Ailane Operational" and links
  // to the operational home (in-app), never to the ailane.ai root.
  var brandLabel = operationalMode ? 'Ailane Operational' : 'AILANE Knowledge Library';
  var brandHref = operationalMode ? '/operational/' : '/';
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
        href={brandHref}
        style={{
          color: '#22D3EE',
          textDecoration: 'none',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >{brandLabel}</a>
      <div className="kl-topbar-right">
        {accessType === 'per_session' && sessionExpiresAt && (
          <SessionCountdown expiresAt={sessionExpiresAt} onExpired={onSessionExpired} />
        )}
        {onToggleLang && (
          <button
            type="button"
            onClick={onToggleLang}
            className="kl-lang-toggle"
            title={lang === 'en' ? 'Newid i Gymraeg' : 'Switch to English'}
            aria-label={lang === 'en' ? 'Switch to Welsh' : 'Switch to English'}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              color: '#fff',
              padding: '4px 10px',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.5px',
              marginRight: '8px',
            }}
          >
            {lang === 'en' ? 'CY' : 'EN'}
          </button>
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
  loading: 1,
  per_session: 0,
  kl_quick_session: 0,
  kl_day_pass: 0,
  kl_research_week: 0,
  operational_readiness: 1,
  governance: 2,
  enterprise: 3,
  institutional: 3  /* AMD-123 G-4.1 transitional alias */
};

function PanelRail({ activePanel, onSelectPanel, accessType, tier, hubMode }) {
  var userRank = TIER_RANK[tier] != null ? TIER_RANK[tier] : (TIER_RANK[accessType] != null ? TIER_RANK[accessType] : 0);
  // OOX-001 §1.1 — retire the legacy right-drawer Vault/Notes/Calendar in hub/
  // operational mode (each lives once as a left-rail "Your workspace" facet). The
  // right drawer then offers only Research (the Eileen legislation-library
  // browser). Public KL keeps the full rail unchanged.
  var defs = hubMode ? PANEL_DEFS.filter(function (p) { return p.id === 'research'; }) : PANEL_DEFS;
  var primaryPanels = defs.filter(function(p) { return p.group === 'primary'; });
  var secondaryPanels = defs.filter(function(p) { return p.group === 'secondary'; });

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

  return React.createElement('div', { className: 'kl-panelrail', role: 'toolbar', 'aria-label': 'Workspace panels' },
    primaryPanels.map(renderButton),
    (primaryPanels.length && secondaryPanels.length) ? React.createElement('div', {
      className: 'kl-panel-rail-divider',
      style: {
        width: '24px',
        height: '1px',
        background: 'rgba(255,255,255,0.08)',
        margin: '4px 0',
      },
      'aria-hidden': 'true',
    }) : null,
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

  var statusLabel = status === 'loading' ? 'Loading\u2026' : status === 'dirty' ? 'Unsaved changes' : status === 'saving' ? 'Saving\u2026' : status === 'error' ? 'Couldn\u2019t save \u2014 try again in a moment' : '\u2713 Saved';
  var statusColor = status === 'saved' ? '#10B981' : status === 'saving' ? '#F59E0B' : status === 'error' ? '#EF4444' : '#94A3B8';

  var filterChips = ['all', 'note', 'clip', 'eileen'];
  var filterLabels = { all: 'All', note: 'Notes', clip: 'Clips', eileen: 'Eileen' };

  // ─── Note list view (KL-LIVE-002 §W-G: stacked navigation, full width —
  // the editor replaces the list inside the drawer; never side-by-side) ───
  var noteListView = React.createElement('div', {
    style: {
      width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0,
      flex: 1,
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

  // ─── Editor view (KL-LIVE-002 §W-G: stacked INSIDE the drawer with a
  // sticky action bar — Back · note title · Download — reachable at every
  // supported width; the textarea is the only scrolling region) ───
  var editorView = null;
  if (activeId && activeNote) {
    var isReadOnly = (activeNote.note_type === 'clip' || activeNote.note_type === 'eileen_response') && !editable;

    editorView = React.createElement('div', {
      className: 'kl-notes-editor',
      style: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
    },
      // §W-G sticky action bar: Back · note title · Download
      React.createElement('div', { className: 'kl-notes-editor-bar' },
        React.createElement('button', {
          type: 'button',
          onClick: function() { setActiveId(null); setActiveNote(null); setDownloadOpen(false); },
          style: {
            background: 'none', border: 'none', color: '#0EA5E9', fontSize: '12px', cursor: 'pointer',
            padding: '4px 6px 4px 0', fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
          },
        }, '\u2190 Back'),
        // Note title — editable input, flexes between Back and Download
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
          style: Object.assign({ flex: 1, minWidth: 0 }, isReadOnly ? { opacity: 0.8 } : {}),
        }),
        // Download button with dropdown
        React.createElement('div', { style: { position: 'relative', flexShrink: 0 } },
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
        )
      ),
      // Source attribution (for clips / eileen responses)
      activeNote.source_attribution ? React.createElement('div', {
        style: { color: '#64748B', fontSize: '11px', fontStyle: 'italic', margin: '6px 0 0', fontFamily: "'DM Mono', monospace", flexShrink: 0 },
      }, activeNote.source_attribution) : null,
      // Status indicator + Email (greyed out) row
      React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', margin: '6px 0', flexShrink: 0 },
      },
        React.createElement('span', {
          style: { fontSize: '10px', color: statusColor, fontFamily: "'DM Mono', monospace" },
        }, statusLabel),
        React.createElement('button', {
          type: 'button',
          disabled: true,
          className: 'kl-action-btn',
          title: 'Coming soon \u2014 requires server-side export',
          style: { fontSize: '11px', padding: '3px 8px', opacity: 0.4, cursor: 'not-allowed' },
        }, '\u2709 Email')
      ),
      // Edit button for read-only notes
      isReadOnly ? React.createElement('button', {
        type: 'button',
        onClick: function() { setEditable(true); },
        className: 'kl-action-btn',
        style: { fontSize: '11px', padding: '3px 8px', marginBottom: '6px', alignSelf: 'flex-start', flexShrink: 0 },
      }, '\u270E Edit') : null,
      // Body editor / reader — internal scroll only
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
        style: Object.assign({ flex: 1, minHeight: 0 }, isReadOnly ? { opacity: 0.85 } : {}),
      })
    );
  }

  // §W-G: stacked navigation — the editor REPLACES the list inside the
  // drawer (never a side-by-side nested column).
  return React.createElement('div', {
    className: 'kl-notes-panel',
    style: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', minHeight: 0 },
  },
    editorView ? editorView : noteListView,
    deleteDialog
  );
}

// ─── ClipboardPanel retired (AMD-044 §4) ───
// Clipboard functionality absorbed by NotesPanel via note_type='clip'.
// window.__klAddClip stub retained for backward compatibility with any
// code that may still call it — silently no-ops.

// ─── Vault helper functions (Hotfix H-2, H-3, H-4) ───

async function downloadVaultDocument(storagePath, filename) {
  if (!window.__klToken || !storagePath) {
    alert('Unable to download \u2014 please refresh and try again.');
    return;
  }
  try {
    // Sprint G §5: Encode each path segment individually so slashes are
    // preserved but spaces and special characters in the filename are encoded.
    // Supabase Storage rejects fully-encoded paths where '/' has become '%2F'.
    var encodedPath = storagePath.split('/').map(function(part) {
      return encodeURIComponent(part);
    }).join('/');

    var signResp = await fetch(
      SUPABASE_URL + '/storage/v1/object/sign/kl-document-vault/' + encodedPath,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + window.__klToken,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 3600 }),
      }
    );

    if (!signResp.ok) {
      var errText = await signResp.text();
      console.error('Signed URL error:', signResp.status, errText);
      alert('Download failed \u2014 the file may not be available. Please try again.');
      return;
    }

    var signData = await signResp.json();

    if (!signData.signedURL) {
      console.error('No signedURL in response:', signData);
      alert('Download failed \u2014 please try again.');
      return;
    }

    var downloadUrl = SUPABASE_URL + '/storage/v1' + signData.signedURL;

    var a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename || 'document';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download error:', err);
    alert('Unable to download this document right now. Please check your connection and try again.');
  }
}

async function downloadComplianceReport(uploadId) {
  if (!window.__klToken) return;
  try {
    var resp = await fetch(
      SUPABASE_URL + '/functions/v1/generate-report-pdf',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + window.__klToken,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upload_id: uploadId }),
      }
    );
    if (!resp.ok) {
      throw new Error('PDF generation failed: ' + resp.status);
    }
    var blob = await resp.blob();
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Ailane-Compliance-Report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Report download failed:', err);
    alert('Unable to generate the compliance report right now. Please try again.');
  }
}

async function fetchDocumentText(documentId) {
  if (!window.__klToken) return null;
  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/kl_vault_document_text?document_id=eq.' + documentId + '&select=extracted_text,char_count',
      {
        headers: {
          'Authorization': 'Bearer ' + window.__klToken,
          'apikey': SUPABASE_ANON_KEY,
        },
      }
    );
    var data = await resp.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    return null;
  } catch (err) {
    console.error('Preview fetch failed:', err);
    return null;
  }
}

async function fetchComplianceFindings(uploadId) {
  if (!window.__klToken) return null;
  try {
    var resp = await fetch(
      SUPABASE_URL + '/rest/v1/compliance_findings?upload_id=eq.' + uploadId + '&select=clause_category,severity,finding_detail,statutory_ref,remediation&order=severity.desc',
      {
        headers: {
          'Authorization': 'Bearer ' + window.__klToken,
          'apikey': SUPABASE_ANON_KEY,
        },
      }
    );
    var data = await resp.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.error('Findings fetch failed:', err);
    return null;
  }
}

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
  // H-3: Preview state — inline expandable per-document
  var _pid = useState(null);
  var previewDocId = _pid[0];
  var setPreviewDocId = _pid[1];
  var _ptxt = useState(null);
  var previewContent = _ptxt[0];
  var setPreviewContent = _ptxt[1];
  var _pload = useState(false);
  var previewLoading = _pload[0];
  var setPreviewLoading = _pload[1];
  // AMD-050 §5: soft-delete confirmation modal state + in-flight guard
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
    // AMD-050 §5: vault documents support soft-delete via UPDATE deleted_at.
    // Compliance uploads do not carry a deleted_at column (§0.f) — skip them
    // with a user-visible message rather than a silent no-op.
    if (doc.source !== 'vault') {
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
        SUPABASE_URL + '/rest/v1/kl_vault_documents?id=eq.' + doc.id +
          '&user_id=eq.' + window.__klUserId,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + window.__klToken,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ deleted_at: new Date().toISOString() }),
        }
      );
      if (!resp.ok) {
        setDeleteError("That didn't go through. Please try again in a moment.");
        return;
      }
      // Optimistic removal from local state — no full refetch (AMD-050 §5).
      setDocs(function(prev) {
        return prev.filter(function(d) {
          return !(d.source === doc.source && d.id === doc.id);
        });
      });
      // Close inline preview if it was showing the deleted doc
      var key = doc.source + '-' + doc.id;
      if (previewDocId === key) {
        setPreviewDocId(null);
        setPreviewContent(null);
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Vault delete failed:', err);
      setDeleteError("That didn't go through. Please check your connection and try again.");
    } finally {
      setDeletePending(false);
    }
  }

  async function handlePreview(doc) {
    if (previewDocId === (doc.source + '-' + doc.id)) {
      setPreviewDocId(null);
      setPreviewContent(null);
      return;
    }
    var key = doc.source + '-' + doc.id;
    setPreviewDocId(key);
    setPreviewLoading(true);
    setPreviewContent(null);
    if (doc.source === 'compliance') {
      var findings = await fetchComplianceFindings(doc.id);
      setPreviewContent({ type: 'findings', data: findings });
    } else {
      var result = await fetchDocumentText(doc.id);
      setPreviewContent({ type: 'text', data: result ? result.extracted_text : 'No extracted text available for this document.' });
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
    return React.createElement('div', { style: { padding: '12px' } },
      uploadButton,
      React.createElement(EileenErrorMessage, {
        message: "I wasn't able to load your documents right now. This is usually temporary.",
        retryAction: function() { loadDocs(); },
        retryLabel: 'Retry',
      })
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

  // AMD-050 §5.2: Delete confirmation modal. Rendered alongside the vault
  // list so it appears above all panel content without depending on a
  // portal mechanism.
  var deleteModal = deleteTarget ? React.createElement('div', {
    role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'kl-del-title',
    onClick: function(e) { if (e.target === e.currentTarget) cancelDelete(); },
    onKeyDown: function(e) { if (e.key === 'Escape') cancelDelete(); },
    style: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    },
  },
    React.createElement('div', {
      style: {
        background: '#111827', border: '1px solid #1E293B',
        borderRadius: '12px', padding: '24px',
        maxWidth: '400px', width: '90%',
        fontFamily: "'DM Sans', sans-serif",
      },
    },
      React.createElement('div', {
        id: 'kl-del-title',
        style: { fontSize: '16px', fontWeight: 600, color: '#F1F5F9', marginBottom: '12px' },
      }, 'Delete document?'),
      React.createElement('div', {
        style: { fontSize: '13px', color: '#94A3B8', marginBottom: '20px', lineHeight: 1.6 },
      },
        'Are you sure you want to delete ',
        React.createElement('strong', { style: { color: '#E2E8F0' } },
          (deleteTarget.name || 'this document')),
        '? This action cannot be undone.'
      ),
      deleteError ? React.createElement('div', {
        style: {
          fontSize: '12px', color: '#EF4444', marginBottom: '12px',
          padding: '8px 10px', background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px',
        },
      }, deleteError) : null,
      React.createElement('div', {
        style: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
      },
        React.createElement('button', {
          type: 'button',
          onClick: cancelDelete,
          disabled: deletePending,
          style: {
            background: 'transparent', border: '1px solid #374151',
            borderRadius: '8px', padding: '8px 16px',
            color: '#94A3B8', fontSize: '13px',
            cursor: deletePending ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            opacity: deletePending ? 0.6 : 1,
          },
        }, 'Cancel'),
        React.createElement('button', {
          type: 'button',
          onClick: confirmDelete,
          disabled: deletePending,
          style: {
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', padding: '8px 16px',
            color: '#EF4444', fontSize: '13px', fontWeight: 600,
            cursor: deletePending ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            opacity: deletePending ? 0.6 : 1,
          },
        }, deletePending ? 'Deleting\u2026' : 'Delete')
      )
    )
  ) : null;

  return React.createElement('div', null,
    uploadButton,
    deleteModal,
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
        // Row 3: Action buttons (Hotfix H-2/H-3/H-4)
        React.createElement('div', { style: { display: 'flex', gap: '4px', marginTop: '8px' } },
          React.createElement('button', {
            type: 'button',
            className: 'kl-action-btn',
            onClick: function() { handlePreview(doc); },
            style: { fontSize: '11px', padding: '3px 8px' },
          }, previewDocId === (doc.source + '-' + doc.id) ? 'Close' : 'Preview'),
          doc.source === 'compliance'
            ? React.createElement('button', {
                type: 'button',
                className: 'kl-action-btn',
                title: 'Download compliance report',
                style: { fontSize: '11px', padding: '3px 8px' },
                onClick: function() { downloadComplianceReport(doc.id); },
              }, 'Download')
            : React.createElement('button', {
                type: 'button',
                className: 'kl-action-btn',
                title: 'Download original document',
                style: { fontSize: '11px', padding: '3px 8px' },
                onClick: function() { downloadVaultDocument(doc.storagePath, doc.name); },
              }, 'Download'),
          // AMD-050 §5: soft-delete action. Only offered for vault-sourced
          // documents; compliance_uploads have no deleted_at column.
          doc.source === 'vault'
            ? React.createElement('button', {
                type: 'button',
                className: 'kl-action-btn',
                title: 'Delete document',
                'aria-label': 'Delete ' + (doc.name || 'document'),
                style: {
                  fontSize: '11px', padding: '3px 8px',
                  marginLeft: 'auto', color: '#94A3B8',
                },
                onClick: function(e) { e.stopPropagation(); openDeleteConfirm(doc); },
              }, 'Delete')
            : null
        ),
        // Inline preview panel (H-3)
        previewDocId === (doc.source + '-' + doc.id) ? React.createElement('div', {
          style: {
            background: '#0F172A', border: '1px solid #1E293B', borderTop: 'none',
            borderRadius: '0 0 8px 8px', padding: '16px', maxHeight: '300px', overflowY: 'auto', marginTop: '8px',
          },
        },
          previewLoading
            ? React.createElement('span', { style: { color: '#94A3B8', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" } }, 'Loading preview\u2026')
            : previewContent && previewContent.type === 'findings' && Array.isArray(previewContent.data)
              ? previewContent.data.map(function(f, i) {
                  var sevColor = f.severity === 'high' || f.severity === 'critical' ? '#EF4444' : f.severity === 'medium' || f.severity === 'major' ? '#F59E0B' : '#10B981';
                  return React.createElement('div', {
                    key: i,
                    style: { marginBottom: '12px', paddingBottom: '12px', borderBottom: i < previewContent.data.length - 1 ? '1px solid #1E293B' : 'none' },
                  },
                    React.createElement('div', { style: { display: 'flex', gap: '8px', marginBottom: '4px' } },
                      React.createElement('span', {
                        style: { fontSize: '11px', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textTransform: 'uppercase', color: sevColor },
                      }, f.severity),
                      React.createElement('span', { style: { fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#64748B' } }, f.clause_category)
                    ),
                    React.createElement('p', { style: { color: '#CBD5E1', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, margin: '0 0 4px' } }, f.finding_detail),
                    f.statutory_ref ? React.createElement('span', { style: { fontSize: '11px', fontFamily: "'DM Mono', monospace", color: '#0EA5E9' } }, f.statutory_ref) : null
                  );
                })
              : previewContent && previewContent.type === 'text'
                ? React.createElement('pre', {
                    style: { color: '#CBD5E1', fontFamily: "'DM Mono', monospace", fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 },
                  }, previewContent.data)
                : React.createElement('span', { style: { color: '#94A3B8', fontSize: '13px' } }, 'No preview available.')
        ) : null
      );
    })
  );
}

// ─── LiveIndicator (KL-LIVE-001 §W-A) ───
// Small "Live" pill showing the feed generated_at timestamp.

function LiveIndicator({ generatedAt }) {
  var label = 'Live';
  if (generatedAt) {
    var d = new Date(generatedAt);
    if (!isNaN(d.getTime())) {
      label = 'Live · ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
        ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
  }
  return React.createElement('span', {
    title: 'Data from the live Knowledge Library feed',
    style: {
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '10px', fontFamily: "'DM Mono', monospace",
      color: '#10B981', background: 'rgba(16,185,129,0.08)',
      border: '1px solid rgba(16,185,129,0.25)',
      borderRadius: '10px', padding: '1px 8px', whiteSpace: 'nowrap',
    },
  },
    React.createElement('span', {
      'aria-hidden': 'true',
      style: { width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', flexShrink: 0 },
    }),
    label
  );
}

// ─── FreshnessBadge (KL-LIVE-001 §W-D) ───
// "Verified current — {date}" within 90 days of last_verified; beyond 90
// days a calm amber state notes that re-verification is scheduled.

function FreshnessBadge({ lastVerified, style }) {
  if (!lastVerified) return null;
  var d = new Date(lastVerified);
  if (isNaN(d.getTime())) return null;
  var days = Math.floor((Date.now() - d.getTime()) / 86400000);
  var dateLabel = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  var stale = days > 90;
  // AMD-050: warm amber #D97706 — brand gold is Institutional tier only.
  var color = stale ? '#D97706' : '#10B981';
  return React.createElement('span', {
    className: 'kl-freshness-badge',
    title: stale
      ? 'Last verified ' + dateLabel + ' — re-verification scheduled'
      : 'Verified current as of ' + dateLabel,
    style: Object.assign({
      fontSize: '10px', padding: '1px 6px', borderRadius: '3px', display: 'inline-block',
      background: color + '15', color: color, whiteSpace: 'nowrap',
    }, style || {}),
  }, stale
    ? 'Verified ' + dateLabel + ' — re-verification scheduled'
    : 'Verified current — ' + dateLabel);
}

// Feed-type colour map shared by the rail and the live calendar.
// horizon uses warm amber #D97706 per AMD-050 (brand gold is tier-reserved).
var LIVE_FEED_COLOURS = {
  regulatory: '#0EA5E9',
  rates: '#10B981',
  horizon: '#D97706',
  client: '#8B5CF6',
};
var LIVE_FEED_LABELS = {
  regulatory: 'Regulatory',
  rates: 'Rates & limits',
  horizon: 'Horizon',
  client: 'My events',
};

// ─── ForwardRail (KL-LIVE-001 §W-C) ───
// "Coming into force" rail on the welcome state, fed by
// kl-live-feed?section=forward_rail. Date-sorted ascending.
// Three states: loading / feed not yet live / live.

function ForwardRail() {
  var _state = useState('loading');
  var railState = _state[0];
  var setRailState = _state[1];
  var _rows = useState([]);
  var rows = _rows[0];
  var setRows = _rows[1];
  var _gen = useState(null);
  var generatedAt = _gen[0];
  var setGeneratedAt = _gen[1];

  useEffect(function() {
    var cancelled = false;
    fetchLiveFeedSection('forward_rail').then(function(result) {
      if (cancelled) return;
      if (result.state !== 'live') { setRailState('unavailable'); return; }
      var data = __klLiveFeedRows(result.data) || [];
      var sorted = data.slice().sort(function(a, b) {
        return new Date(a.event_date || a.date || a.effective_from || 0) -
               new Date(b.event_date || b.date || b.effective_from || 0);
      });
      setRows(sorted);
      setGeneratedAt(result.generatedAt);
      setRailState('live');
    });
    return function() { cancelled = true; };
  }, []);

  if (railState === 'loading') {
    return React.createElement('div', { className: 'kl-forward-rail-note' }, 'Loading coming-into-force feed…');
  }
  if (railState === 'unavailable') {
    return React.createElement('div', { className: 'kl-forward-rail-note' },
      'Coming into force — live feed not yet available');
  }
  if (rows.length === 0) {
    return React.createElement('div', { className: 'kl-forward-rail-note' },
      'Coming into force — no upcoming items');
  }

  return React.createElement('div', {
    className: 'kl-forward-rail-wrap',
    // §W-F D1: width inherited from .kl-content-container (no per-section cap)
    style: { width: '100%', marginBottom: '20px' },
  },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
      React.createElement('span', {
        style: {
          fontSize: '10px', fontWeight: 500, color: '#475569', textTransform: 'uppercase',
          letterSpacing: '0.1em', fontFamily: "'DM Mono', monospace",
        },
      }, 'Coming into force'),
      React.createElement(LiveIndicator, { generatedAt: generatedAt })
    ),
    React.createElement('div', { className: 'kl-forward-rail' },
      rows.slice(0, 12).map(function(row, i) {
        var dt = new Date(row.event_date || row.date || row.effective_from);
        var hasDate = !isNaN(dt.getTime());
        var colour = LIVE_FEED_COLOURS[row.feed] || LIVE_FEED_COLOURS.regulatory;
        var title = row.title || row.requirement_name || 'Untitled item';
        return React.createElement('div', { key: row.ref_id || i, className: 'kl-forward-card' },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' } },
            React.createElement('span', {
              'aria-hidden': 'true',
              style: { width: '6px', height: '6px', borderRadius: '50%', background: colour, flexShrink: 0 },
            }),
            React.createElement('span', {
              style: { color: colour, fontSize: '10px', fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' },
            }, hasDate ? dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBC')
          ),
          React.createElement('div', {
            style: { color: '#E2E8F0', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, lineHeight: 1.4 },
          }, truncate(title, 90)),
          row.detail ? React.createElement('div', {
            style: { color: '#64748B', fontSize: '11px', lineHeight: 1.4, marginTop: '4px' },
          }, truncate(row.detail, 100)) : null,
          row.url ? React.createElement('a', {
            href: row.url, target: '_blank', rel: 'noopener noreferrer',
            style: { fontSize: '10px', color: '#0EA5E9', textDecoration: 'none', marginTop: '6px', display: 'inline-block' },
          }, '↗ Source') : null
        );
      })
    )
  );
}

// ─── TopicCurrencyStrip (KL-LIVE-001 §W-C) ───
// Per-topic currency strip on domain sub-pages, fed by
// kl-live-feed?section=topic_tiles (keyed per ACEI category). Shows the
// latest relevant news title + date (plain link), the provisions
// verified-current range, and the open horizon count.

// Maps the 8 problem domains onto likely ACEI category keys. Matching is
// normalised (lowercase, alphanumeric only); unmatched domains render
// nothing in the live state.
var DOMAIN_ACEI_HINTS = {
  'dismissal': ['Dismissal Procedures', 'Unfair Dismissal', 'Redundancy'],
  'discrimination': ['Discrimination'],
  'contracts': ['Working Arrangements', 'Employment Documentation', 'Pay & Compensation'],
  'family-leave': ['Family Leave'],
  'transfers': ['TUPE & Business Transfers'],
  'health-safety': ['Health & Safety'],
  'whistleblowing': ['Whistleblowing'],
  'data-monitoring': ['Data Protection', 'Data Protection & Monitoring'],
};

function __klNormKey(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findTopicTile(tiles, domain) {
  if (!tiles || typeof tiles !== 'object' || Array.isArray(tiles) || !domain) return null;
  var candidates = [domain.id, domain.slug, domain.name].concat(DOMAIN_ACEI_HINTS[domain.id] || []);
  var normCandidates = [];
  candidates.forEach(function(c) { var n = __klNormKey(c); if (n) normCandidates.push(n); });
  var keys = Object.keys(tiles);
  for (var i = 0; i < keys.length; i++) {
    if (normCandidates.indexOf(__klNormKey(keys[i])) !== -1) return tiles[keys[i]];
  }
  return null;
}

function TopicCurrencyStrip({ domain }) {
  var _state = useState('loading');
  var stripState = _state[0];
  var setStripState = _state[1];
  var _tile = useState(null);
  var tile = _tile[0];
  var setTile = _tile[1];
  var _gen = useState(null);
  var generatedAt = _gen[0];
  var setGeneratedAt = _gen[1];

  useEffect(function() {
    var cancelled = false;
    setStripState('loading');
    setTile(null);
    fetchLiveFeedSection('topic_tiles').then(function(result) {
      if (cancelled) return;
      if (result.state !== 'live') { setStripState('unavailable'); return; }
      var d = result.data;
      var tiles = (d && (d.topic_tiles || d.tiles)) || d;
      setTile(findTopicTile(tiles, domain));
      setGeneratedAt(result.generatedAt);
      setStripState('live');
    });
    return function() { cancelled = true; };
  }, [domain && domain.id]);

  var noteStyle = {
    fontSize: '11px', color: '#475569', fontFamily: "'DM Mono', monospace",
    margin: '0 0 28px',
  };
  if (stripState === 'loading') {
    return React.createElement('div', { className: 'kl-currency-note', style: noteStyle }, 'Loading currency data…');
  }
  if (stripState === 'unavailable') {
    return React.createElement('div', { className: 'kl-currency-note', style: noteStyle },
      'Live currency data not yet available for this area');
  }
  if (!tile) return null;

  var news = tile.latest_news || null;
  var range = tile.verified_range || null;
  var horizonOpen = tile.horizon_open;

  function fmtDate(v) {
    if (!v) return null;
    var d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  var rangeMin = range && fmtDate(range.min);
  var rangeMax = range && fmtDate(range.max);

  return React.createElement('div', { className: 'kl-currency-strip' },
    React.createElement(LiveIndicator, { generatedAt: generatedAt }),
    news && news.title ? React.createElement('span', {
      style: { fontSize: '12px', color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", minWidth: 0 },
    },
      news.url
        ? React.createElement('a', {
            href: news.url, target: '_blank', rel: 'noopener noreferrer',
            style: { color: '#0EA5E9', textDecoration: 'none' },
          }, truncate(news.title, 80))
        : truncate(news.title, 80),
      news.published_date && fmtDate(news.published_date)
        ? React.createElement('span', { style: { color: '#64748B', fontSize: '11px' } }, ' · ' + fmtDate(news.published_date))
        : null
    ) : null,
    rangeMin && rangeMax ? React.createElement('span', {
      style: { fontSize: '11px', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' },
    }, 'Provisions verified ' + rangeMin + ' – ' + rangeMax) : null,
    horizonOpen != null ? React.createElement('span', {
      style: { fontSize: '11px', color: '#D97706', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' },
    }, horizonOpen + ' open horizon item' + (horizonOpen === 1 ? '' : 's')) : null
  );
}

// ─── CalendarPanel (regulatory_requirements, month-grouped, date-prominent) ───
// KLUX-001-AM-002 §4: Replaces flat list with month-grouped layout and
// prominent day-number date badges. Each event is expandable and offers a
// "Discuss with Eileen" seed button.

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

  // ── KL-LIVE-001 §W-A: live feed state ──
  var _liveState = useState('loading'); // 'loading' | 'live' | 'unavailable'
  var liveState = _liveState[0];
  var setLiveState = _liveState[1];
  var _liveRows = useState([]);
  var liveRows = _liveRows[0];
  var setLiveRows = _liveRows[1];
  var _generatedAt = useState(null);
  var generatedAt = _generatedAt[0];
  var setGeneratedAt = _generatedAt[1];
  var _view = useState('list'); // 'month' | 'list'
  var view = _view[0];
  var setView = _view[1];
  var _monthCursor = useState(function() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  var monthCursor = _monthCursor[0];
  var setMonthCursor = _monthCursor[1];
  var _feedsOn = useState({ regulatory: true, rates: true, horizon: true, client: true });
  var feedsOn = _feedsOn[0];
  var setFeedsOn = _feedsOn[1];
  var _selectedDay = useState(null);
  var selectedDay = _selectedDay[0];
  var setSelectedDay = _selectedDay[1];

  // §W-A: try the live feed first; fall back to the direct
  // regulatory_requirements query when the feed is not yet live.
  useEffect(function() {
    var cancelled = false;

    async function loadLegacy() {
      if (!window.__klToken) { if (!cancelled) setLoading(false); return; }
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

    fetchLiveFeedSection('calendar').then(function(result) {
      if (cancelled) return;
      if (result.state === 'live') {
        var rows = __klLiveFeedRows(result.data) || [];
        setLiveRows(rows);
        setGeneratedAt(result.generatedAt);
        setLiveState('live');
        setLoading(false);
      } else {
        setLiveState('unavailable');
        loadLegacy();
      }
    });
    return function() { cancelled = true; };
  }, []);

  // ── §W-A live helpers ──

  // Date key without timezone shift: prefer the literal YYYY-MM-DD prefix.
  function evDateKey(value) {
    var s = String(value || '');
    var m = s.match(/^\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
    var d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function feedKeyOf(row) {
    return LIVE_FEED_COLOURS[row.feed] ? row.feed : 'regulatory';
  }

  function fmtDayLabel(key) {
    var d = new Date(key + 'T00:00:00');
    if (isNaN(d.getTime())) return key;
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  var filteredLive = liveRows.filter(function(r) {
    return feedsOn[feedKeyOf(r)] && evDateKey(r.event_date || r.date);
  });

  function toggleFeed(key) {
    setFeedsOn(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = !prev[key];
      return next;
    });
    setSelectedDay(null);
  }

  // ── §W-A live row card (shared by list view and selected-day view) ──
  function renderLiveRow(row, idx) {
    var key = 'live-' + (row.ref_id || idx) + '-' + idx;
    var isExpanded = !!expanded[key];
    var fk = feedKeyOf(row);
    var colour = LIVE_FEED_COLOURS[fk];
    var dateKey = evDateKey(row.event_date || row.date);
    var d = dateKey ? new Date(dateKey + 'T00:00:00') : null;
    var endKey = row.end_date ? evDateKey(row.end_date) : null;

    return (
      <div
        key={key}
        onClick={function() { toggleExpand(key); }}
        role="button"
        tabIndex={0}
        onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(key); } }}
        aria-expanded={isExpanded}
        style={{
          display: 'flex', gap: '12px', padding: '10px 0',
          borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer',
        }}
      >
        <div style={{
          minWidth: '44px', height: '44px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: colour + '15', borderRadius: '8px', flexShrink: 0,
        }}>
          <span style={{
            color: colour, fontSize: '18px', fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif", lineHeight: 1,
          }}>{d ? d.getDate() : '–'}</span>
          <span style={{
            color: colour, fontSize: '9px',
            fontFamily: "'DM Mono', monospace", textTransform: 'uppercase',
          }}>{d ? d.toLocaleDateString('en-GB', { month: 'short' }) : ''}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: '#E2E8F0', fontSize: '12px',
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
          }}>{row.title || 'Untitled event'}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
            <span style={{
              color: colour, fontSize: '9px', fontFamily: "'DM Mono', monospace",
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{LIVE_FEED_LABELS[fk]}</span>
            {endKey && endKey !== dateKey && (
              <span style={{ color: '#64748B', fontSize: '10px', fontFamily: "'DM Mono', monospace" }}>
                {'until ' + new Date(endKey + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          {isExpanded && (
            <div style={{ marginTop: '8px' }}>
              {row.detail && (
                <p style={{
                  color: '#CBD5E1', fontSize: '11px', lineHeight: 1.5,
                  margin: '0 0 8px', fontFamily: "'DM Sans', sans-serif",
                }}>{row.detail}</p>
              )}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {row.url && (
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={function(e) { e.stopPropagation(); }}
                    style={{ fontSize: '11px', color: '#0EA5E9', textDecoration: 'none' }}
                  >↗ View source</a>
                )}
                {row.ref_id && (
                  <span style={{ fontSize: '10px', color: '#475569', fontFamily: "'DM Mono', monospace" }}>{row.ref_id}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── §W-A month grid view ──
  function renderMonthView() {
    var year = monthCursor.getFullYear();
    var month = monthCursor.getMonth();
    var firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayKey = evDateKey(new Date().toISOString());

    var byDay = {};
    filteredLive.forEach(function(r) {
      var k = evDateKey(r.event_date || r.date);
      if (!k) return;
      if (!byDay[k]) byDay[k] = [];
      byDay[k].push(r);
    });

    var cells = [];
    for (var b = 0; b < firstWeekday; b++) cells.push(null);
    for (var day = 1; day <= daysInMonth; day++) cells.push(day);

    var monthLabel = monthCursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    function navBtnStyle() {
      return {
        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px', color: '#94A3B8', fontSize: '12px',
        padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
        minHeight: '32px',
      };
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button
            type="button"
            className="kl-cal-viewbtn"
            aria-label="Previous month"
            onClick={function() { setMonthCursor(new Date(year, month - 1, 1)); setSelectedDay(null); }}
            style={navBtnStyle()}
          >‹</button>
          <span style={{ color: '#E2E8F0', fontSize: '13px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{monthLabel}</span>
          <button
            type="button"
            className="kl-cal-viewbtn"
            aria-label="Next month"
            onClick={function() { setMonthCursor(new Date(year, month + 1, 1)); setSelectedDay(null); }}
            style={navBtnStyle()}
          >›</button>
        </div>

        <div className="kl-cal-grid" style={{ marginBottom: '4px' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function(wd) {
            return (
              <div key={wd} style={{
                textAlign: 'center', color: '#475569', fontSize: '9px',
                fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', padding: '2px 0',
              }}>{wd}</div>
            );
          })}
        </div>

        <div className="kl-cal-grid">
          {cells.map(function(day, i) {
            if (day === null) return <div key={'b' + i} className="kl-cal-cell" aria-hidden="true"></div>;
            var key = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            var events = byDay[key] || [];
            var feedsHere = [];
            events.forEach(function(r) {
              var fk = feedKeyOf(r);
              if (feedsHere.indexOf(fk) === -1) feedsHere.push(fk);
            });
            var isToday = key === todayKey;
            var isSelected = key === selectedDay;
            return (
              <div
                key={key}
                className={'kl-cal-cell' + (events.length ? ' has-events' : '') + (isSelected ? ' selected' : '')}
                role={events.length ? 'button' : undefined}
                tabIndex={events.length ? 0 : undefined}
                aria-label={events.length ? fmtDayLabel(key) + ' — ' + events.length + ' event' + (events.length === 1 ? '' : 's') : undefined}
                onClick={events.length ? function() { setSelectedDay(isSelected ? null : key); } : undefined}
                onKeyDown={events.length ? function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDay(isSelected ? null : key); } } : undefined}
              >
                <div style={{
                  fontSize: '11px',
                  color: isToday ? '#0EA5E9' : events.length ? '#E2E8F0' : '#64748B',
                  fontWeight: isToday ? 700 : 400,
                  fontFamily: "'DM Sans', sans-serif",
                }}>{day}</div>
                {feedsHere.length > 0 && (
                  <div style={{ display: 'flex', gap: '2px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {feedsHere.slice(0, 4).map(function(fk) {
                      return (
                        <span key={fk} aria-hidden="true" style={{
                          width: '5px', height: '5px', borderRadius: '50%',
                          background: LIVE_FEED_COLOURS[fk], display: 'inline-block',
                        }}></span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedDay && (
          <div style={{ marginTop: '12px' }}>
            <div style={{
              color: '#94A3B8', fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600, padding: '6px 0', borderBottom: '1px solid #1E293B',
            }}>{fmtDayLabel(selectedDay)}</div>
            {(byDay[selectedDay] || []).map(renderLiveRow)}
          </div>
        )}
      </div>
    );
  }

  // ── §W-A list view (month-grouped, date-sorted) ──
  function renderListView() {
    var sorted = filteredLive.slice().sort(function(a, b) {
      return String(evDateKey(a.event_date || a.date)).localeCompare(String(evDateKey(b.event_date || b.date)));
    });
    var groupedLive = {};
    sorted.forEach(function(r) {
      var k = evDateKey(r.event_date || r.date);
      var monthKey = k.slice(0, 7);
      if (!groupedLive[monthKey]) {
        var d = new Date(k + 'T00:00:00');
        groupedLive[monthKey] = {
          label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
          items: [],
        };
      }
      groupedLive[monthKey].items.push(r);
    });
    var monthKeys = Object.keys(groupedLive).sort();

    if (monthKeys.length === 0) {
      return <div style={{ color: '#64748B', fontSize: '12px', padding: '8px 4px' }}>No events match the selected feeds.</div>;
    }
    return monthKeys.map(function(mk) {
      var g = groupedLive[mk];
      return (
        <div key={mk} style={{ marginBottom: '20px' }}>
          <div style={{
            color: '#94A3B8', fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600, padding: '8px 0', borderBottom: '1px solid #1E293B',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>{g.label}</span>
            <span style={{ fontSize: '11px', color: '#475569' }}>{g.items.length} event{g.items.length === 1 ? '' : 's'}</span>
          </div>
          {g.items.map(renderLiveRow)}
        </div>
      );
    });
  }

  // ── §W-A live calendar shell ──
  function renderLiveCalendar() {
    return (
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <LiveIndicator generatedAt={generatedAt} />
          <div style={{ display: 'flex', gap: '4px' }}>
            {[{ id: 'month', label: 'Month' }, { id: 'list', label: 'List' }].map(function(v) {
              return (
                <button
                  key={v.id}
                  type="button"
                  className="kl-cal-viewbtn"
                  aria-pressed={view === v.id}
                  onClick={function() { setView(v.id); setSelectedDay(null); }}
                  style={{
                    border: view === v.id ? '1px solid #0EA5E9' : '1px solid rgba(255,255,255,0.1)',
                    background: view === v.id ? 'rgba(14,165,233,0.15)' : 'transparent',
                    color: view === v.id ? '#0EA5E9' : '#94A3B8',
                  }}
                >{v.label}</button>
              );
            })}
          </div>
        </div>

        <div className="kl-topic-chip-row" style={{ marginBottom: '14px' }}>
          {['regulatory', 'rates', 'horizon', 'client'].map(function(fk) {
            var on = feedsOn[fk];
            var colour = LIVE_FEED_COLOURS[fk];
            return (
              <button
                key={fk}
                type="button"
                className="kl-live-chip"
                aria-pressed={on}
                onClick={function() { toggleFeed(fk); }}
                style={{
                  border: '1px solid ' + (on ? colour : 'rgba(255,255,255,0.1)'),
                  background: on ? colour + '15' : 'transparent',
                  color: on ? colour : '#64748B',
                }}
              >{LIVE_FEED_LABELS[fk]}</button>
            );
          })}
        </div>

        {view === 'month' ? renderMonthView() : renderListView()}
      </div>
    );
  }

  function toggleExpand(id) {
    setExpanded(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[id] = !prev[id];
      return next;
    });
  }

  function discussWithEileen(req) {
    // AMD-050 §8.4 + KLUX-001 Art. 5: seed the input, do NOT auto-send.
    var seed = 'Tell me about ' + (req.requirement_name || 'this regulatory event') +
      (req.source_act ? ' under ' + req.source_act : '') +
      ' and what it means for employers.';
    if (typeof window.__klSeedInput === 'function') {
      window.__klSeedInput(seed);
    } else if (typeof window.__klSendMessage === 'function') {
      window.__klSendMessage(seed);
    }
  }

  // §W-A state routing: loading → live → not-yet-live (legacy fallback).
  if (liveState === 'loading') {
    return <div style={{ color: '#94A3B8', fontSize: '13px', padding: '12px' }}>Connecting to the live calendar feed&hellip;</div>;
  }
  if (liveState === 'live') {
    return renderLiveCalendar();
  }

  if (loading) {
    return <div style={{ color: '#94A3B8', fontSize: '13px', padding: '12px' }}>Loading regulatory calendar&hellip;</div>;
  }

  var forwardCount = reqs.filter(function(r) { return r.is_forward_requirement; }).length;
  var filteredReqs = reqs.filter(function(r) {
    if (filter === 'forward') return r.is_forward_requirement;
    if (filter === 'in_force') return r.commencement_status === 'in_force';
    return true;
  });

  var filterButtons = [
    { id: 'all', label: 'All (' + reqs.length + ')' },
    { id: 'in_force', label: 'In Force' },
    { id: 'forward', label: 'Forward (' + forwardCount + ')' },
  ];

  // KLUX-001-AM-002 §4.1: Group filtered events by month
  var grouped = {};
  filteredReqs.forEach(function(req) {
    if (!req.effective_from) return;
    var d = new Date(req.effective_from);
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    var label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!grouped[key]) grouped[key] = { label: label, items: [] };
    grouped[key].items.push(req);
  });
  var months = Object.keys(grouped).sort();

  return (
    <div style={{ padding: '12px' }}>
      {/* §W-A: not-yet-live state — calm note above the legacy calendar */}
      <div style={{
        fontSize: '10px', color: '#475569', fontFamily: "'DM Mono', monospace",
        marginBottom: '10px',
      }}>Live calendar feed not yet available — showing regulatory requirements</div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {filterButtons.map(function(f) {
          return (
            <button
              key={f.id}
              type="button"
              onClick={function() { setFilter(f.id); }}
              style={{
                padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
                fontFamily: 'inherit',
                border: filter === f.id ? '1px solid #0EA5E9' : '1px solid rgba(255,255,255,0.1)',
                background: filter === f.id ? 'rgba(14,165,233,0.15)' : 'transparent',
                color: filter === f.id ? '#0EA5E9' : '#94A3B8',
              }}
            >{f.label}</button>
          );
        })}
      </div>

      {months.length === 0 ? (
        <div style={{ color: '#64748B', fontSize: '12px', padding: '8px 4px' }}>No requirements match this filter.</div>
      ) : months.map(function(monthKey) {
        var month = grouped[monthKey];
        return (
          <div key={monthKey} style={{ marginBottom: '20px' }}>
            <div style={{
              color: '#94A3B8', fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600, padding: '8px 0', borderBottom: '1px solid #1E293B',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{month.label}</span>
              <span style={{ fontSize: '11px', color: '#475569' }}>{month.items.length} event{month.items.length === 1 ? '' : 's'}</span>
            </div>

            {month.items.map(function(req, i) {
              var d = new Date(req.effective_from);
              var dayNum = d.getDate();
              var isExpanded = !!expanded[req.id];
              // AMD-050 §8: forward items use warm amber (#D97706); brand gold
              // (#F59E0B / #D4A017) is Institutional tier only.
              var statusColor = req.commencement_status === 'in_force' ? '#10B981'
                : req.is_forward_requirement ? '#D97706' : '#0EA5E9';

              return (
                <div
                  key={req.id || i}
                  data-calendar-id={req.id}
                  onClick={function() { toggleExpand(req.id); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(req.id); } }}
                  aria-expanded={isExpanded}
                  style={{
                    display: 'flex', gap: '12px', padding: '10px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer',
                  }}
                >
                  <div style={{
                    minWidth: '44px', height: '44px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: statusColor + '15', borderRadius: '8px', flexShrink: 0,
                  }}>
                    <span style={{
                      color: statusColor, fontSize: '18px', fontWeight: 700,
                      fontFamily: "'DM Sans', sans-serif", lineHeight: 1,
                    }}>{dayNum}</span>
                    <span style={{
                      color: statusColor, fontSize: '9px',
                      fontFamily: "'DM Mono', monospace", textTransform: 'uppercase',
                    }}>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: '#E2E8F0', fontSize: '12px',
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                    }}>{req.requirement_name}</div>
                    {req.source_act && (
                      <div style={{
                        color: '#64748B', fontSize: '10px',
                        fontFamily: "'DM Mono', monospace", marginTop: '2px',
                      }}>{req.source_act}</div>
                    )}

                    {isExpanded && (
                      <div style={{ marginTop: '8px' }}>
                        {req.statutory_basis && (
                          <p style={{
                            color: '#CBD5E1', fontSize: '11px', lineHeight: 1.5,
                            margin: '0 0 8px', fontFamily: "'DM Sans', sans-serif",
                          }}>{req.statutory_basis}</p>
                        )}
                        <button
                          type="button"
                          onClick={function(e) { e.stopPropagation(); discussWithEileen(req); }}
                          style={{
                            background: 'transparent', border: '1px solid #0EA5E9', color: '#0EA5E9',
                            borderRadius: '6px', padding: '4px 10px', fontSize: '11px',
                            fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                          }}
                        >Discuss with Eileen</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── ResearchPanel (kl_provisions grouped by instrument + kl_cases, tabs + search) ───

function ResearchPanel({ lang }) {
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
  // §W-B: bump when the live instruments map arrives so group headers
  // re-render with display titles. The fetch itself is session-cached.
  var _instMapReady = useState(!!(typeof window !== 'undefined' && window.__klInstrumentsMap));
  var setInstMapReady = _instMapReady[1];

  useEffect(function() {
    var cancelled = false;
    ensureInstrumentsMap().then(function(map) {
      if (!cancelled && map) setInstMapReady(true);
    });
    return function() { cancelled = true; };
  }, []);

  useEffect(function() {
    // Sprint F §3.4: Library tab is handled by its own useEffect below.
    if (tab === 'library') { setLoading(false); return; }
    var cancelled = false;
    async function load() {
      if (!window.__klToken) { setLoading(false); return; }
      setLoading(true);
      try {
        // §W-D: include last_verified for freshness badges. If the column is
        // ever absent PostgREST rejects the whole select, so retry without it.
        var path = tab === 'provisions'
          ? '/rest/v1/kl_provisions?select=provision_id,title,instrument_id,section_num,in_force,is_era_2025,last_verified&order=instrument_id,section_num&limit=500'
          : '/rest/v1/kl_cases?select=case_id,name,citation,court,year,principle&order=year.desc&limit=100';
        var headers = { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY };
        var resp = await fetch(SUPABASE_URL + path, { headers: headers });
        if (tab === 'provisions' && !resp.ok) {
          resp = await fetch(
            SUPABASE_URL + '/rest/v1/kl_provisions?select=provision_id,title,instrument_id,section_num,in_force,is_era_2025&order=instrument_id,section_num&limit=500',
            { headers: headers }
          );
        }
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
  // Brief 3B: when Welsh is active, also match against title_cy and
  // warmSubtitle_cy so Welsh users can search Welsh text.
  var filteredInstruments = instruments;
  if (tab === 'library' && search) {
    var libSearch = search.toLowerCase();
    var isCy = lang === 'cy';
    filteredInstruments = instruments.filter(function(inst) {
      if ((inst.title || '').toLowerCase().indexOf(libSearch) !== -1) return true;
      if ((inst.short || '').toLowerCase().indexOf(libSearch) !== -1) return true;
      if ((inst.warmSubtitle || '').toLowerCase().indexOf(libSearch) !== -1) return true;
      if ((inst.cat || '').toLowerCase().indexOf(libSearch) !== -1) return true;
      if (isCy) {
        if ((inst.title_cy || '').toLowerCase().indexOf(libSearch) !== -1) return true;
        if ((inst.warmSubtitle_cy || '').toLowerCase().indexOf(libSearch) !== -1) return true;
      }
      return false;
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
          // \u00A7W-B: live-feed display_title (+ short_citation where present);
          // unmapped codes fall back to the raw instrument_id unchanged.
          React.createElement('span', { style: { minWidth: 0 } },
            instrumentDisplayTitle(instId),
            instrumentShortCitation(instId) && React.createElement('span', {
              style: { fontSize: '10px', color: '#64748B', fontFamily: "'DM Mono', monospace", marginLeft: '6px' },
            }, instrumentShortCitation(instId))
          ),
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
                // §W-B: seed Eileen with the display title, never the raw code.
                var seedMsg = 'Tell me about ' + item.title + (item.instrument_id ? ' under the ' + instrumentDisplayTitle(item.instrument_id) : '');
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
                ),
                // §W-D: freshness badge from kl_provisions.last_verified
                React.createElement(FreshnessBadge, { lastVerified: item.last_verified })
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
                  // AMD-050 §4: render the human-readable topicLabel as primary
                  // when present; the formal title falls back to a secondary line.
                  // Brief 3B: bl() swaps title/warmSubtitle to Welsh when lang==='cy'.
                  // topicLabel stays English — human-readable tag, not translatable.
                  React.createElement('div', { style: { color: '#E2E8F0', fontSize: '12px', fontWeight: 500, marginBottom: '4px', lineHeight: 1.3 } },
                    inst.topicLabel || bl(inst, 'title', lang)
                  ),
                  inst.topicLabel && inst.title && React.createElement('div', {
                    style: { color: '#64748B', fontSize: '11px', lineHeight: 1.35, marginBottom: '4px' },
                  }, bl(inst, 'title', lang)),
                  (function() {
                    var ws = bl(inst, 'warmSubtitle', lang);
                    if (!ws) return null;
                    return React.createElement('div', {
                      style: { color: '#94A3B8', fontSize: '11px', lineHeight: 1.4, marginBottom: '6px' },
                    }, ws.length > 100 ? ws.slice(0, 100) + '\u2026' : ws);
                  })(),
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
    // Brief 3B: bl() swaps title/warmSubtitle to Welsh when lang==='cy'.
    // type/jurisdiction/chapters stay English (structural metadata).
    var summaryTitle = bl(inst, 'title', lang);
    var summaryWarm = bl(inst, 'warmSubtitle', lang);
    return React.createElement('div', null,
      React.createElement('div', { style: { fontSize: '16px', fontWeight: 600, color: '#E2E8F0', marginBottom: '8px' } }, summaryTitle),
      React.createElement('div', { style: { fontSize: '12px', color: '#64748B', marginBottom: '4px', fontFamily: "'DM Mono', monospace" } },
        (inst.type || '') + (inst.jurisdiction ? ' \u00B7 ' + inst.jurisdiction : '')
      ),
      // \u00A7W-D: freshness badge when the manifest carries lastVerified
      (inst.lastVerified || inst.last_verified) && React.createElement('div', { style: { marginBottom: '8px' } },
        React.createElement(FreshnessBadge, { lastVerified: inst.lastVerified || inst.last_verified, style: { padding: '2px 6px', borderRadius: '4px' } })
      ),
      inst.chapters && React.createElement('div', { style: { fontSize: '12px', color: '#94A3B8', marginBottom: '12px', lineHeight: 1.5 } }, inst.chapters),
      summaryWarm && React.createElement('div', {
        style: {
          fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '12px',
          padding: '12px', background: 'rgba(14,165,233,0.04)', borderRadius: '8px',
          borderLeft: '2px solid rgba(14,165,233,0.2)',
        },
      }, summaryWarm),
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
    // Brief 3B: bl() swaps formalTitle/description to Welsh when lang==='cy'.
    // topicLabel, type, jurisdiction, chapters, and section-level content stay
    // English (structural metadata / untranslated statutory text).
    var formalTitle = bl(detail, 'title', lang)
      || detail.shortTitle
      || (activeInstrument && bl(activeInstrument, 'title', lang))
      || 'Instrument';
    // AMD-050 §4: topicLabel is the human-readable primary name when present.
    var topicLabel = detail.topicLabel || (activeInstrument && activeInstrument.topicLabel) || null;
    var displayTitle = topicLabel || formalTitle;
    var displayType = detail.type || (activeInstrument && activeInstrument.type) || '';
    var displayJurisdiction = detail.jurisdiction || (activeInstrument && activeInstrument.jurisdiction) || '';
    var description = bl(detail, 'desc', lang)
      || bl(detail, 'description', lang)
      || bl(detail, 'summary', lang)
      || bl(detail, 'overview', lang)
      || (activeInstrument && bl(activeInstrument, 'warmSubtitle', lang))
      || '';
    var inForce = detail.isInForce != null
      ? detail.isInForce
      : (activeInstrument && activeInstrument.isInForce);
    // §W-D: instrument-level verification timestamp (content schema carries
    // lastVerified as an ISO date on 64 of the content files).
    var lastVerified = detail.lastVerified
      || detail.last_verified
      || (activeInstrument && (activeInstrument.lastVerified || activeInstrument.last_verified))
      || null;

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
        // AMD-050 §4: formal title rendered secondary when a topicLabel is set.
        topicLabel && formalTitle && topicLabel !== formalTitle
          ? React.createElement('div', {
              style: { fontSize: '11px', color: '#64748B', marginBottom: '4px' },
            }, formalTitle)
          : null,
        React.createElement('div', { style: { fontSize: '11px', color: '#64748B', fontFamily: "'DM Mono', monospace", marginBottom: '4px' } },
          [displayType, displayJurisdiction, detail.currentAsOf && ('Verified ' + detail.currentAsOf)].filter(Boolean).join(' \u00B7 ')
        ),
        detail.chapters && React.createElement('div', { style: { fontSize: '11px', color: '#94A3B8', marginBottom: '8px' } }, detail.chapters),
        React.createElement('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } },
          React.createElement('span', {
            style: {
              fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'inline-block',
              background: inForce ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              color: inForce ? '#10B981' : '#F59E0B',
            },
          }, inForce ? 'In force' : 'Not yet commenced'),
          // §W-D: freshness badge alongside the in-force state
          React.createElement(FreshnessBadge, { lastVerified: lastVerified, style: { padding: '2px 6px', borderRadius: '4px' } })
        )
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
            (c.tna_url || c.supremecourt_url || c.judiciary_url) && React.createElement('a', {
              href: c.tna_url || c.supremecourt_url || c.judiciary_url, target: '_blank', rel: 'noopener noreferrer',
              style: { fontSize: '10px', color: '#0EA5E9', textDecoration: 'none', marginTop: '4px', display: 'inline-block' },
            }, '\u2197 Read judgment')
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

function PanelDrawer({ panelId, onClose, lang }) {
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
        <PanelContent panelId={panelId} lang={lang} />
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
    // §W-F D1: width inherited from .kl-content-container (no per-section cap)
    style: { width: '100%', marginTop: '32px' },
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
              minWidth: 0,
            },
          },
            // §W-F D5: clamp the title inside the spine (kl-book-title)
            React.createElement('span', { className: 'kl-book-title' }, shortTitle)
          ),
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

// ─── DomainSubPage (AMD-045 §4 — domain sub-page with sub-area grid) ───
// Renders a full domain sub-page with breadcrumb, domain selector,
// domain header, expandable sub-area grid, key instruments strip,
// and anchored Eileen panel at bottom.

function DomainSubPage({ domain, onBack, onAskEileen, onSend, isLoading, onFileSelect, nexusState, prefersReducedMotion, onInputChange, tier, lang }) {
  var _exp = useState(null);
  var expandedSubArea = _exp[0];
  var setExpandedSubArea = _exp[1];

  return React.createElement('div', {
    className: 'kl-main',
    style: { display: 'flex', flexDirection: 'column', height: '100%' },
  },

    // §4.2 Breadcrumb
    React.createElement('nav', {
      role: 'navigation',
      'aria-label': 'Breadcrumb',
      style: {
        padding: '12px 24px', borderBottom: '1px solid #1E3A5F',
        background: '#0F1D32', flexShrink: 0,
      },
    },
      React.createElement('span', {
        style: { color: '#94A3B8', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" },
        onClick: onBack,
      }, 'Knowledge Library'),
      React.createElement('span', { style: { color: '#475569', margin: '0 8px' } }, '\u203A'),
      React.createElement('span', {
        style: { color: '#F1F5F9', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" },
      }, domain.name)
    ),

    // §4.3 Domain selector — compact horizontal tabs.
    // KL-LIVE-001 §W-E: className activates the index.html mobile rule
    // (.kl-domain-selector → horizontal scroll, no wrap, under 768px).
    React.createElement('div', {
      className: 'kl-domain-selector',
      style: {
        padding: '8px 24px', display: 'flex', gap: '8px', overflowX: 'auto',
        borderBottom: '1px solid #1E3A5F', background: '#0F1D32', flexShrink: 0,
      },
    },
      DOMAINS.map(function(d) {
        return React.createElement('button', {
          key: d.id,
          type: 'button',
          onClick: function() { window.location.hash = '/domain/' + d.slug; },
          style: {
            background: d.id === domain.id ? '#0EA5E9' : 'transparent',
            color: d.id === domain.id ? '#FFFFFF' : '#94A3B8',
            border: d.id === domain.id ? 'none' : '1px solid #334155',
            borderRadius: '16px',
            padding: '4px 12px',
            fontSize: '12px',
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s',
          },
        }, d.name);
      })
    ),

    // Scrollable main content
    React.createElement('div', {
      style: { flex: 1, overflowY: 'auto', padding: '24px', minHeight: 0 },
    },

      // §4.4 Domain Header
      React.createElement('h1', {
        style: {
          color: '#0EA5E9', fontFamily: "'DM Sans', sans-serif", fontSize: '28px',
          margin: '0 0 12px', fontWeight: 700,
        },
      }, domain.name),
      React.createElement('p', {
        style: {
          color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '15px',
          lineHeight: 1.7, maxWidth: '720px', margin: '0 0 16px',
        },
      }, domain.orientation),

      // KL-LIVE-001 §W-C: per-topic currency strip (topic_tiles live feed)
      React.createElement(TopicCurrencyStrip, { domain: domain }),

      // §4.5 Sub-Area Grid
      React.createElement('h2', {
        style: {
          color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif", fontSize: '18px',
          margin: '0 0 16px', fontWeight: 600,
        },
      }, 'Topics in this area'),
      // KL-LIVE-001 §W-E: className activates the index.html mobile rule
      // (.kl-domain-subarea-grid → single column under 768px).
      React.createElement('div', {
        className: 'kl-domain-subarea-grid',
        style: {
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '12px', marginBottom: '32px',
        },
      },
        domain.subAreas.map(function(sa, i) {
          var isExpanded = expandedSubArea === i;
          var toggleExpand = function() { setExpandedSubArea(isExpanded ? null : i); };
          return React.createElement('div', { key: i },
            // Sub-area card header
            React.createElement('div', {
              role: 'button',
              tabIndex: 0,
              'aria-expanded': isExpanded,
              'aria-label': sa.name + (isExpanded ? ' — collapse' : ' — expand for details'),
              onClick: toggleExpand,
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(); } },
              style: {
                background: '#111827',
                border: isExpanded ? '1px solid #0EA5E9' : '1px solid #1E293B',
                borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              },
            },
              React.createElement('h3', {
                style: { color: '#F1F5F9', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", margin: '0 0 6px', fontWeight: 600 },
              }, sa.name),
              React.createElement('p', {
                style: { color: '#64748B', fontSize: '12px', fontFamily: "'DM Mono', monospace", margin: '0 0 8px' },
              }, sa.instruments),
              React.createElement('span', {
                style: { color: isExpanded ? '#0EA5E9' : '#475569', fontSize: '11px' },
              }, isExpanded ? '\u25BE Less' : '\u25B8 Details')
            ),
            // Expanded details
            isExpanded ? React.createElement('div', {
              style: {
                background: '#0F172A', border: '1px solid #1E293B', borderTop: 'none',
                borderRadius: '0 0 8px 8px', padding: '16px',
              },
            },
              React.createElement('p', {
                style: { color: '#CBD5E1', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, margin: '0 0 12px' },
              }, sa.scope),
              React.createElement('button', {
                type: 'button',
                onClick: function() { onAskEileen('Tell me about ' + sa.name.toLowerCase() + ' in the context of ' + domain.name.toLowerCase()); },
                style: {
                  background: 'transparent', border: '1px solid #0EA5E9', color: '#0EA5E9',
                  borderRadius: '6px', padding: '6px 14px', fontSize: '12px',
                  fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                  transition: 'all 0.15s',
                },
              }, 'Discuss with Eileen \u2192')
            ) : null
          );
        })
      ),

      // §4.6 Key Instruments Strip
      React.createElement('h2', {
        style: {
          color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif", fontSize: '18px',
          margin: '0 0 16px', fontWeight: 600,
        },
      }, 'Key instruments'),
      React.createElement('div', {
        style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' },
      },
        (function() {
          var seen = {};
          var unique = [];
          domain.subAreas.forEach(function(sa) {
            sa.instruments.split(', ').forEach(function(inst) {
              if (!seen[inst]) { seen[inst] = true; unique.push(inst); }
            });
          });
          return unique;
        })().map(function(inst, i) {
          return React.createElement('span', {
            key: i,
            style: {
              background: '#1E293B', color: '#0EA5E9', padding: '6px 12px',
              borderRadius: '16px', fontSize: '12px', fontFamily: "'DM Mono', monospace",
              whiteSpace: 'nowrap',
            },
          }, inst);
        })
      )
    ),

    // §4.7 Eileen Panel — anchored at bottom
    React.createElement('div', {
      style: {
        borderTop: '1px solid #1E3A5F', padding: '16px 24px',
        background: '#0F1D32', flexShrink: 0,
      },
    },
      React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
      },
        React.createElement(EileenStaticDot, null),
        React.createElement('span', {
          style: { color: '#94A3B8', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" },
        }, domain.eileenGreeting)
      ),
      React.createElement(MessageInput, { onSend: onSend, disabled: isLoading, onFileSelect: onFileSelect, onInputChange: onInputChange, nexusState: nexusState, tier: tier, prefersReducedMotion: prefersReducedMotion })
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

// ─── KLUI-001 preference write helper (KL-LIVE-002 §W-F D7 / §W-G.4) ───
// Merge-writes one or more keys into kl_user_preferences.preferences using
// the same GET-then-PATCH(merge)/POST pattern as handleUserTypeSelect (§5.3).
async function saveKlPreferences(partial) {
  if (!window.__klToken || !window.__klUserId) return;
  try {
    var checkResp = await fetch(
      SUPABASE_URL + '/rest/v1/kl_user_preferences?user_id=eq.' + window.__klUserId + '&select=id,preferences',
      { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
    );
    var existing = await checkResp.json();
    if (Array.isArray(existing) && existing.length > 0) {
      var merged = Object.assign({}, existing[0].preferences, partial);
      await fetch(
        SUPABASE_URL + '/rest/v1/kl_user_preferences?id=eq.' + existing[0].id,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + window.__klToken,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ preferences: merged, updated_at: new Date().toISOString() }),
        }
      );
    } else {
      await fetch(
        SUPABASE_URL + '/rest/v1/kl_user_preferences',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + window.__klToken,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ user_id: window.__klUserId, preferences: partial }),
        }
      );
    }
  } catch (err) {
    console.error('Failed to save preferences:', err);
  }
}

// ─── App ───

// ─── OOX-001 Hub: matter memory + workspace facets ──────────────────────────
// Ported from operational/index.html (matter bar + remember capture). Every
// call reuses hubSendToEileen() (same eileen-operational URL + auth as the
// chat). ALL server strings are rendered via React children (auto-escaped) —
// never dangerouslySetInnerHTML on DB/server data (KL-HUB §1.4 / §2 security).
// The layer degrades silently: any matter_error / network failure hides the
// panel (console.warn only) and never blocks the chat.

function fmtHubMatterDate(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return String(iso); }
}

var HUB_MATTER_BTN_STYLE = {
  background: 'transparent', border: '1px solid rgba(14,165,233,0.3)',
  borderRadius: '6px', color: '#0EA5E9', fontFamily: "'DM Sans', sans-serif",
  fontSize: '12px', padding: '6px 12px', cursor: 'pointer', minHeight: '32px',
};
var HUB_MATTER_BTN_DANGER = Object.assign({}, HUB_MATTER_BTN_STYLE, {
  color: '#F87171', border: '1px solid rgba(239,68,68,0.35)',
});
var HUB_MATTER_BTN_PRIMARY = Object.assign({}, HUB_MATTER_BTN_STYLE, {
  background: '#0EA5E9', color: '#fff', border: '1px solid #0EA5E9',
});

// A single due-to-clear matter row: Keep (extend, reason required) /
// Clear now (delete, confirm) / Mark resolved.
function HubMatterRow({ m, hubSession, onChanged, onToast }) {
  var _mode = useState(null);  var mode = _mode[0];  var setMode = _mode[1]; // null | 'keep' | 'clear'
  var _reason = useState(''); var reason = _reason[0]; var setReason = _reason[1];
  var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];

  function act(op, extra) {
    setBusy(true);
    var body = Object.assign({ op: op, matter_id: m.id }, extra || {});
    return hubSendToEileen(hubSession, { matter_action: body })
      .then(function (resp) { return resp && resp.matter_result; });
  }
  function doExtend() {
    var r = (reason || '').trim();
    if (!r) return;
    act('extend', { retention_reason: r })
      .then(function (mr) {
        // Always clear busy: on a server-side failure the matter stays
        // due_soon and the row re-renders, so leaving busy set would lock
        // the buttons. On success the row leaves due_soon and unmounts.
        setBusy(false);
        if (mr && mr.matter_ok) onToast('Kept until ' + fmtHubMatterDate(mr.expires_at));
        else console.warn('[OOX-001] extend failed', mr && mr.matter_error);
        onChanged();
      })
      .catch(function (e) { console.warn('[OOX-001] extend failed', e); setBusy(false); onChanged(); });
  }
  function doDelete() {
    act('delete')
      .then(function (mr) {
        setBusy(false);
        if (mr && mr.matter_ok) onToast('Cleared');
        else console.warn('[OOX-001] delete failed', mr && mr.matter_error);
        onChanged();
      })
      .catch(function (e) { console.warn('[OOX-001] delete failed', e); setBusy(false); onChanged(); });
  }
  function doResolve() {
    act('resolve')
      .then(function (mr) {
        setBusy(false);
        if (mr && mr.matter_ok) onToast('Marked resolved — clears automatically after 30 days');
        else console.warn('[OOX-001] resolve failed', mr && mr.matter_error);
        onChanged();
      })
      .catch(function (e) { console.warn('[OOX-001] resolve failed', e); setBusy(false); onChanged(); });
  }

  var rowChildren = [
    React.createElement('div', { key: 'main', style: { minWidth: 0 } },
      React.createElement('div', { style: { color: '#F1F5F9', fontSize: '13px', lineHeight: 1.4 } }, m.summary || '(no summary)'),
      React.createElement('div', { style: { color: '#64748B', fontSize: '11px', fontFamily: "'DM Mono', monospace", marginTop: '2px' } }, 'Clears ' + fmtHubMatterDate(m.expires_at))
    ),
  ];

  if (mode === 'keep') {
    rowChildren.push(React.createElement('div', { key: 'keep', style: { display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' } },
      React.createElement('input', {
        type: 'text', value: reason, maxLength: 240,
        placeholder: 'Reason to keep (e.g. ongoing tribunal claim)',
        onChange: function (e) { setReason(e.target.value); },
        onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); doExtend(); } },
        style: { flex: 1, minWidth: '160px', background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: '6px', color: '#F1F5F9', fontSize: '12px', padding: '6px 10px', fontFamily: "'DM Sans', sans-serif" },
      }),
      React.createElement('button', { type: 'button', disabled: busy || !reason.trim(), style: HUB_MATTER_BTN_PRIMARY, onClick: doExtend }, 'Save reason'),
      React.createElement('button', { type: 'button', style: HUB_MATTER_BTN_STYLE, onClick: function () { setMode(null); setReason(''); } }, 'Cancel')
    ));
  } else if (mode === 'clear') {
    rowChildren.push(React.createElement('div', { key: 'clear', style: { display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' } },
      React.createElement('span', { style: { color: '#94A3B8', fontSize: '12px', flex: 1, minWidth: '160px' } }, 'Clear this from memory? This cannot be undone.'),
      React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_DANGER, onClick: doDelete }, 'Confirm clear'),
      React.createElement('button', { type: 'button', style: HUB_MATTER_BTN_STYLE, onClick: function () { setMode(null); } }, 'Cancel')
    ));
  } else {
    rowChildren.push(React.createElement('div', { key: 'actions', style: { display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' } },
      React.createElement('button', { type: 'button', style: HUB_MATTER_BTN_STYLE, onClick: function () { setMode('keep'); } }, 'Keep'),
      React.createElement('button', { type: 'button', style: HUB_MATTER_BTN_DANGER, onClick: function () { setMode('clear'); } }, 'Clear now'),
      React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: doResolve }, 'Mark resolved')
    ));
  }

  return React.createElement('div', {
    style: { padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' },
  }, rowChildren);
}

// Retain-or-clear matter panel + "Remember a matter" capture (upsert).
// Re-lists on `refreshKey` change (bumped after each Eileen answer) and on mount.
function HubMatterPanel({ hubSession, refreshKey }) {
  var _matters = useState([]); var matters = _matters[0]; var setMatters = _matters[1];
  var _toast = useState(''); var toast = _toast[0]; var setToast = _toast[1];
  var _capOpen = useState(false); var capOpen = _capOpen[0]; var setCapOpen = _capOpen[1];
  var _capText = useState(''); var capText = _capText[0]; var setCapText = _capText[1];
  var _capCats = useState(''); var capCats = _capCats[0]; var setCapCats = _capCats[1];
  var _capErr = useState(''); var capErr = _capErr[0]; var setCapErr = _capErr[1];
  var _capBusy = useState(false); var capBusy = _capBusy[0]; var setCapBusy = _capBusy[1];
  var toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(function () { setToast(''); }, 3200);
  }

  var refresh = useCallback(function () {
    if (!hubSession) return;
    hubSendToEileen(hubSession, { matter_action: { op: 'list' } })
      .then(function (resp) {
        var mr = resp && resp.matter_result;
        if (!mr || mr.matter_error || !Array.isArray(mr.matters)) {
          if (mr && mr.matter_error) console.warn('[OOX-001] matter list error:', mr.matter_error);
          setMatters([]); return;
        }
        setMatters(mr.matters.filter(function (m) { return m && m.due_soon === true; }));
      })
      .catch(function (e) { console.warn('[OOX-001] matter list failed', e); setMatters([]); });
  }, [hubSession]);

  useEffect(function () { refresh(); }, [refresh, refreshKey]);
  useEffect(function () { return function () { if (toastTimer.current) clearTimeout(toastTimer.current); }; }, []);

  function saveCapture() {
    var summary = (capText || '').trim();
    setCapErr('');
    if (!summary) return;
    var catList = (capCats || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    setCapBusy(true);
    hubSendToEileen(hubSession, { matter_action: { op: 'upsert', summary: summary, acei_categories: catList } })
      .then(function (resp) {
        setCapBusy(false);
        var mr = resp && resp.matter_result;
        if (mr && mr.matter_ok) {
          showToast('Remembered');
          setCapOpen(false); setCapText(''); setCapCats('');
          refresh();
        } else if (mr && mr.matter_error) {
          setCapErr(mr.matter_error);
        } else {
          setCapErr('Could not save the matter. Please try again.');
        }
      })
      .catch(function (e) {
        setCapBusy(false);
        console.warn('[OOX-001] upsert failed', e);
        setCapErr('Could not save the matter. Please try again.');
      });
  }

  var children = [];

  // Retain-or-clear card (only when there are due_soon matters).
  if (matters.length > 0) {
    children.push(React.createElement('div', {
      key: 'card',
      style: { background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '10px', padding: '8px 14px 12px', marginBottom: '8px' },
    },
      React.createElement('div', {
        style: { color: '#94A3B8', fontSize: '10px', fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' },
      }, 'Matter memory — due to clear'),
      matters.map(function (m) {
        return React.createElement(HubMatterRow, { key: m.id, m: m, hubSession: hubSession, onChanged: refresh, onToast: showToast });
      })
    ));
  }

  // Remember-a-matter control.
  var captureChildren = [
    React.createElement('button', {
      key: 'toggle', type: 'button', className: 'kl-action-btn',
      onClick: function () { setCapErr(''); setCapOpen(!capOpen); },
    }, capOpen ? 'Close' : '+ Remember a matter'),
  ];
  if (capOpen) {
    captureChildren.push(React.createElement('div', {
      key: 'form',
      style: { marginTop: '8px', background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '10px', padding: '12px' },
    },
      React.createElement('label', {
        htmlFor: 'hub-matter-capture-text',
        style: { display: 'block', color: '#94A3B8', fontSize: '12px', marginBottom: '6px', lineHeight: 1.4 },
      }, 'Describe the matter — use roles, not names. Eileen stores it anonymised.'),
      React.createElement('textarea', {
        id: 'hub-matter-capture-text', value: capText, rows: 2, maxLength: 600,
        onChange: function (e) { setCapText(e.target.value); },
        style: { width: '100%', background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: '6px', color: '#F1F5F9', fontSize: '13px', padding: '8px 10px', fontFamily: "'DM Sans', sans-serif", resize: 'vertical' },
      }),
      React.createElement('input', {
        type: 'text', value: capCats, placeholder: 'ACEI categories (optional, comma-separated)',
        onChange: function (e) { setCapCats(e.target.value); },
        style: { width: '100%', marginTop: '6px', background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: '6px', color: '#F1F5F9', fontSize: '12px', padding: '6px 10px', fontFamily: "'DM Sans', sans-serif" },
      }),
      capErr ? React.createElement('div', { style: { color: '#F87171', fontSize: '12px', marginTop: '6px' } }, capErr) : null,
      React.createElement('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
        React.createElement('button', { type: 'button', disabled: capBusy || !capText.trim(), style: HUB_MATTER_BTN_PRIMARY, onClick: saveCapture }, 'Remember'),
        React.createElement('button', { type: 'button', style: HUB_MATTER_BTN_STYLE, onClick: function () { setCapOpen(false); setCapText(''); setCapCats(''); setCapErr(''); } }, 'Cancel')
      )
    ));
  }
  children.push(React.createElement('div', { key: 'capture' }, captureChildren));

  if (toast) {
    children.push(React.createElement('div', {
      key: 'toast', role: 'status', 'aria-live': 'polite',
      style: { marginTop: '8px', color: '#10B981', fontSize: '12px', fontFamily: "'DM Mono', monospace" },
    }, toast));
  }

  return React.createElement('div', {
    className: 'kl-hub-matter-panel',
    style: { maxWidth: '860px', width: '100%', margin: '0 auto 8px' },
  }, children);
}

// ─── OOX-001 KL-Hub: ACEI Overview facet ────────────────────────────────────
// Ports operational/index.html renderAceiSection into the hub's "Your workspace"
// rail (KL-HUB §5 step 2). Reads run on facet open via the hub session's
// AUTHENTICATED Supabase client (hubSession.sb) — RLS auto-scopes every row to
// the tenant; no service key, no cross-tenant read. ALL DB values render via
// React children (auto-escaped) — never dangerouslySetInnerHTML on data
// (KL-HUB §1.4 / §2 security). The facet degrades silently: any read error logs
// console.warn and the affected block falls back ("—" for values, the domain
// card hides, the sector panel shows "not available"); it never throws. Mirrors
// renderAceiSection behaviour: latest-week category filter, WCS-desc sort,
// sm≠1.00 emphasis, domain index, sector benchmark, and onboarding empty state.

// Humanised ACEI category labels (verbatim from operational/index.html).
var HUB_ACEI_CAT_LABELS = {
  discrimination_harassment: 'Discrimination & harassment',
  harassment_bullying: 'Harassment & bullying',
  unfair_dismissal: 'Unfair dismissal',
  wrongful_dismissal: 'Wrongful dismissal',
  redundancy: 'Redundancy & restructure',
  redundancy_restructure: 'Redundancy & restructure',
  pay_wages: 'Pay & wages',
  wages_pay: 'Pay & wages',
  national_minimum_wage: 'National minimum wage',
  working_time: 'Working time',
  holiday_pay: 'Holiday pay',
  family_leave: 'Family & parental leave',
  whistleblowing: 'Whistleblowing',
  tupe: 'TUPE transfers',
  contracts_terms: 'Contracts & terms',
  health_safety: 'Health & safety',
  data_protection: 'Data protection',
  grievance_disciplinary: 'Grievance & disciplinary',
  equal_pay: 'Equal pay',
  trade_union: 'Trade union & collective',
  worker_status: 'Worker status & classification',
  immigration_rtw: 'Immigration & right to work',
};

// Number formatters (mirror operational/index.html aceiF2/F3/Int/Smart/Di).
function hubAceiIsNum(v) { return v != null && v !== '' && !isNaN(Number(v)); }
function hubAceiF2(v) { return hubAceiIsNum(v) ? Number(v).toFixed(2) : '—'; }
function hubAceiF3(v) { return hubAceiIsNum(v) ? Number(v).toFixed(3) : '—'; }
function hubAceiInt(v) { return hubAceiIsNum(v) ? String(Math.round(Number(v))) : '—'; }
function hubAceiSmart(v) {
  if (!hubAceiIsNum(v)) return '—';
  var n = Number(v);
  return n === Math.round(n) ? String(n) : n.toFixed(2);
}
function hubAceiDi(v) {
  if (!hubAceiIsNum(v)) return '—';
  var n = Number(v);
  return n === Math.round(n) ? String(n) : n.toFixed(1);
}
function hubAceiHumanise(raw) {
  if (raw == null) return '—';
  var key = String(raw).toLowerCase();
  if (HUB_ACEI_CAT_LABELS[key]) return HUB_ACEI_CAT_LABELS[key];
  return String(raw).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, function (c) { return c.toUpperCase(); }) || '—';
}

// Resilient unwrap of a supabase-js result: read error -> fallback (+ warn);
// the facet never throws (KL-HUB §1.6).
function hubAceiData(res, name, fallback) {
  if (!res) return fallback;
  if (res.error) { console.warn('[OOX-001] ACEI read failed: ' + name, res.error); return fallback; }
  return (res.data == null) ? fallback : res.data;
}

var HUB_ACEI_CARD_STYLE = { background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '12px', padding: '20px 24px' };
var HUB_ACEI_SECTION_H = { color: '#94A3B8', fontFamily: "'DM Mono', monospace", fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' };

// §1.2 Empty state — no scores yet for this tenant. Invitation + onboarding CTA.
function hubAceiEmptyState() {
  return React.createElement('div', {
    style: { maxWidth: '460px', margin: '24px auto', textAlign: 'center', background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '12px', padding: '32px 24px' },
  },
    React.createElement('div', {
      'aria-hidden': 'true',
      style: { width: '48px', height: '48px', margin: '0 auto 18px', borderRadius: '50%', background: 'radial-gradient(circle at 32% 30%, #38BDF8, #0F1D32)', boxShadow: '0 0 24px rgba(14,165,233,0.35)' },
    }),
    React.createElement('div', {
      style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' },
    }, 'Your exposure index is calculated once your company profile is complete. Add your company number and SIC so Eileen can resolve your sector and weight your exposure.'),
    React.createElement('a', {
      href: '/operational/onboarding/',
      style: { display: 'inline-block', background: '#0EA5E9', color: '#fff', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500, padding: '10px 18px', borderRadius: '8px' },
    }, 'Set up your workspace')
  );
}

// §1.3 Domain index card. Read degraded / no row -> hidden (mirrors operational).
function hubAceiDomainHeader(d0) {
  if (!d0) return null;
  var meta = [
    React.createElement('div', { key: 'lbl', style: { color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: 500 } }, 'Employment-law exposure index'),
    React.createElement('div', { key: 'drt', style: { color: '#94A3B8', fontFamily: "'DM Mono', monospace", fontSize: '12px', marginTop: '4px' } }, 'Domain risk total: ' + hubAceiSmart(d0.drt)),
  ];
  if (d0.structural_flag === true) {
    meta.push(React.createElement('span', {
      key: 'badge',
      style: { alignSelf: 'flex-start', marginTop: '8px', color: '#F59E0B', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', fontFamily: "'DM Mono', monospace", fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 8px' },
    }, 'Structural'));
  }
  return React.createElement('div', {
    key: 'di-card',
    style: { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '20px', background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '12px', padding: '20px 24px' },
  },
    React.createElement('div', { style: { fontFamily: "'DM Mono', monospace", fontSize: '40px', fontWeight: 600, color: '#F1F5F9', lineHeight: 1, whiteSpace: 'nowrap' } },
      hubAceiDi(d0.di),
      React.createElement('span', { style: { fontSize: '16px', color: '#64748B', marginLeft: '4px' } }, '/100')
    ),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0 } }, meta)
  );
}

// §1.4 Category table (the propagation). Sorted by WCS desc; sm≠1.00 emphasised;
// WCS to 3dp; caption present. No advice language (RULE 15).
function hubAceiCategoryTable(rows) {
  var sorted = rows.slice().sort(function (a, b) {
    var av = hubAceiIsNum(a && a.wcs) ? Number(a.wcs) : -Infinity;
    var bv = hubAceiIsNum(b && b.wcs) ? Number(b.wcs) : -Infinity;
    return bv - av;
  });
  var headers = ['Category', 'Likelihood (L)', 'Impact (I)', 'CRS (L×I)', 'Sector × (sm)', 'Jurisdiction × (jm)', 'Weighted (WCS)'];
  var thBase = { padding: '9px 12px', borderBottom: '2px solid #1E3A5F', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' };
  var thText = Object.assign({}, thBase, { textAlign: 'left' });
  var thNum = Object.assign({}, thBase, { textAlign: 'right' });
  var tdText = { padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500 };
  var tdNum = { padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#CBD5E1', fontFamily: "'DM Mono', monospace", fontSize: '13px', textAlign: 'right', whiteSpace: 'nowrap' };
  var tdWcs = Object.assign({}, tdNum, { color: '#F1F5F9', fontWeight: 600 });

  var headRow = React.createElement('tr', null, headers.map(function (h, i) {
    return React.createElement('th', { key: h, style: i === 0 ? thText : thNum }, h);
  }));
  var bodyRows = sorted.map(function (row, idx) {
    var smStr = hubAceiF2(row.sm);
    var smEmph = hubAceiIsNum(row.sm) && smStr !== '1.00';
    var smStyle = smEmph ? Object.assign({}, tdNum, { color: '#0EA5E9', fontWeight: 600 }) : tdNum;
    return React.createElement('tr', { key: idx },
      React.createElement('td', { style: tdText }, hubAceiHumanise(row.category)),
      React.createElement('td', { style: tdNum }, hubAceiSmart(row.l)),
      React.createElement('td', { style: tdNum }, hubAceiSmart(row.i)),
      React.createElement('td', { style: tdNum }, hubAceiF2(row.crs)),
      React.createElement('td', { style: smStyle }, smStr),
      React.createElement('td', { style: tdNum }, hubAceiF2(row.jm)),
      React.createElement('td', { style: tdWcs }, hubAceiF3(row.wcs))
    );
  });
  return React.createElement('div', { key: 'cat', style: { marginBottom: '20px' } },
    React.createElement('div', { style: HUB_ACEI_SECTION_H }, 'Exposure by category'),
    React.createElement('div', { style: { overflowX: 'auto', background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '10px' } },
      React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: '640px' } },
        React.createElement('thead', null, headRow),
        React.createElement('tbody', null, bodyRows)
      )
    ),
    React.createElement('div', { style: { color: '#64748B', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', lineHeight: 1.5, marginTop: '10px' } },
      'Weighted scores reflect your sector (Sector ×) and jurisdiction mix (Jurisdiction ×). WCS = CRS × Sector × × Jurisdiction ×.')
  );
}

// §1.5 Sector benchmark. Resolved -> name/group + stats + neutral compare line;
// unresolved -> "not available" message. Advice-free (RULE 15).
function hubAceiSectorPanel(org, sector) {
  var children = [
    React.createElement('h3', { key: 'h', style: { color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif", fontSize: '15px', fontWeight: 600, margin: '0 0 4px' } }, 'Your sector benchmark'),
  ];
  if (!sector) {
    children.push(React.createElement('div', { key: 'na', style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' } }, 'Sector benchmark not available for your SIC classification.'));
    return React.createElement('div', { key: 'sector', style: HUB_ACEI_CARD_STYLE }, children);
  }
  var subTxt = sector.sector_name || '—';
  if (sector.sector_group_name) subTxt += ' · ' + sector.sector_group_name;
  children.push(React.createElement('div', { key: 'sub', style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', marginBottom: '14px' } }, subTxt));

  var stats = [
    ['Sector exposure multiplier', hubAceiF2(sector.sector_multiplier)],
    ['Employers in sector', hubAceiInt(sector.employer_count)],
    ['Tribunal cases', hubAceiInt(sector.tribunal_cases)],
    ['Cases per employer', hubAceiF2(sector.cases_per_employer)],
  ];
  children.push(React.createElement('div', {
    key: 'grid',
    style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '14px' },
  }, stats.map(function (s) {
    return React.createElement('div', { key: s[0], style: { background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: '8px', padding: '12px 14px' } },
      React.createElement('div', { style: { color: '#64748B', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', marginBottom: '6px' } }, s[0]),
      React.createElement('div', { style: { color: '#F1F5F9', fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 600 } }, s[1])
    );
  })));
  children.push(React.createElement('div', { key: 'cmp', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', lineHeight: 1.5 } },
    'Your sector multiplier is ' + hubAceiF2(sector.sector_multiplier) + ' — applied as the Sector × in your weighted scores above.'));

  var orgMult = org && org.acei_sector_multiplier;
  if (hubAceiIsNum(orgMult) && hubAceiF2(orgMult) !== hubAceiF2(sector.sector_multiplier)) {
    children.push(React.createElement('div', { key: 'note', style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', lineHeight: 1.5, marginTop: '8px' } },
      'Applied value for your organisation: ' + hubAceiF2(orgMult) + ' — this is the multiplier applied to this tenant.'));
  }
  return React.createElement('div', { key: 'sector', style: HUB_ACEI_CARD_STYLE }, children);
}

// ACEI Overview facet body. Reads on open via the hub RLS client (§1.1).
function HubAceiFacet({ hubSession }) {
  var _state = useState({ status: 'loading', cats: [], dom: null, org: null, sector: null });
  var state = _state[0]; var setState = _state[1];

  useEffect(function () {
    var alive = true;
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from) { setState({ status: 'ready', cats: [], dom: null, org: null, sector: null }); return; }
    // §1.1 reads — RLS-scoped via the authenticated hub client.
    Promise.all([
      sb.from('acei_category_scores')
        .select('category,domain,l,i,sm,jm,crs,wcs,week_start_date')
        .order('week_start_date', { ascending: false }).limit(60),
      sb.from('acei_domain_scores')
        .select('domain,drt,dmr,di,structural_flag,week_start_date')
        .order('week_start_date', { ascending: false }).limit(1),
      sb.from('organisations')
        .select('name,acei_sector_code,acei_sector_multiplier').maybeSingle(),
    ]).then(function (res) {
      var cats = hubAceiData(res[0], 'acei_category_scores', []);
      var dom = hubAceiData(res[1], 'acei_domain_scores', []);
      var org = hubAceiData(res[2], 'organisations', null);
      var code = org && org.acei_sector_code;
      if (code) {
        return sb.from('sector_exposure_summary')
          .select('sector_code,sector_name,sector_group_name,sector_multiplier,employer_count,tribunal_cases,cases_per_employer')
          .eq('sector_code', code).maybeSingle()
          .then(function (secRes) {
            if (!alive) return;
            setState({ status: 'ready', cats: cats || [], dom: (dom && dom[0]) || null, org: org, sector: hubAceiData(secRes, 'sector_exposure_summary', null) });
          });
      }
      if (alive) setState({ status: 'ready', cats: cats || [], dom: (dom && dom[0]) || null, org: org, sector: null });
    }).catch(function (e) {
      console.warn('[OOX-001] ACEI facet: reads failed', e);
      if (alive) setState({ status: 'ready', cats: [], dom: null, org: null, sector: null });
    });
    return function () { alive = false; };
  }, [hubSession]);

  if (state.status === 'loading') {
    return React.createElement('div', { style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '8px 0' } }, 'Loading your exposure index…');
  }

  var cats = state.cats || [];
  // §1.2 empty state — no category rows (also the read-error fallback, mirroring
  // operational): render the invitation only, no empty tables.
  if (!cats.length) return hubAceiEmptyState();

  // §1.1 latest-week filter — keep only rows on the max week_start_date.
  var maxWeek = null;
  cats.forEach(function (r) {
    if (r && r.week_start_date != null) {
      if (maxWeek === null || String(r.week_start_date) > String(maxWeek)) maxWeek = r.week_start_date;
    }
  });
  var latest = maxWeek === null ? cats
    : cats.filter(function (r) { return String(r.week_start_date) === String(maxWeek); });

  return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } },
    hubAceiDomainHeader(state.dom),     // §1.3
    hubAceiCategoryTable(latest),       // §1.4
    hubAceiSectorPanel(state.org, state.sector)  // §1.5
  );
}

// ─── OOX-001 KL-Hub Document Vault facet (brief-3 / KL-HUB §1) ───
// The tenant's own documents + their contract analyses, read on open via the
// hub RLS client (hubSession.sb) — no service key; RLS auto-scopes (own
// non-deleted docs + org-shared; org-scoped contract records + demo rows;
// AAL2-gated). ALL DB values render via React children (auto-escaped) — never
// dangerouslySetInnerHTML on data (KL-HUB §1.4 / §2 security). Each read is
// unwrapped resiliently: a failed panel shows "—" with console.warn and the
// facet never throws. Mirrors operational/index.html renderVaultSection:
// documents table (type chip + size + extraction/analysis pills + visibility
// tag + date + empty state), contract-analyses cards (ref/role/score/gaps/
// finding), the is_demonstration "sample" tag, the neutral caption, and both
// empty states. No advice language (RULE 15).

// Resilient unwrap of a supabase-js result -> { rows } | { error } (+ warn).
function hubVaultUnwrap(res, name) {
  if (!res || res.error) {
    console.warn('[OOX-001] Vault read failed: ' + name, res && res.error);
    return { error: true };
  }
  return { rows: Array.isArray(res.data) ? res.data : [] };
}

// §1.2 — Resolve whether the current session is AAL1 with a verified second
// factor (so the aal2_required_when_enrolled RLS policy filters the three Vault
// document tables to empty). Local read of the session AAL via supabase-js — no
// network, no retry. Any uncertainty → false, so the ordinary empty state is
// kept (brief §1.2 fallback): this cleanly distinguishes an AAL2-gated empty
// docs read from a genuinely-empty vault. RLS still enforces AAL2 server-side.
function hubVaultAal2StepUp(sb) {
  try {
    var mfa = sb && sb.auth && sb.auth.mfa;
    if (!mfa || !mfa.getAuthenticatorAssuranceLevel) return Promise.resolve(false);
    return mfa.getAuthenticatorAssuranceLevel().then(function (r) {
      var d = r && r.data;
      return !!(d && d.currentLevel === 'aal1' && d.nextLevel === 'aal2');
    }).catch(function () { return false; });
  } catch (e) { return Promise.resolve(false); }
}

// Human-readable file size (mirror operational vaultFileSize).
function hubVaultFileSize(bytes) {
  if (!hubAceiIsNum(bytes)) return '—';
  var n = Number(bytes);
  if (n < 1024) return Math.round(n) + ' B';
  var units = ['KB', 'MB', 'GB', 'TB'], u = -1;
  do { n /= 1024; u++; } while (n >= 1024 && u < units.length - 1);
  return (n >= 10 ? Math.round(n) : n.toFixed(1)) + ' ' + units[u];
}

// Short type chip from a MIME string (mirror operational vaultMimeLabel).
function hubVaultMimeLabel(mime) {
  if (!mime) return 'FILE';
  var m = String(mime).toLowerCase();
  if (m.indexOf('pdf') >= 0) return 'PDF';
  if (m.indexOf('wordprocessing') >= 0 || m.indexOf('msword') >= 0) return 'DOCX';
  if (m.indexOf('spreadsheet') >= 0 || m.indexOf('excel') >= 0) return 'XLSX';
  if (m.indexOf('text/plain') >= 0) return 'TXT';
  if (m.indexOf('image/') >= 0) return (m.split('/')[1] || 'image').toUpperCase();
  var slash = m.indexOf('/');
  return (slash >= 0 ? m.slice(slash + 1) : m).toUpperCase();
}

// Visibility tag — org_shared/org_required -> "org", else "private".
function hubVaultVisibilityLabel(vis) {
  var v = String(vis == null ? '' : vis).toLowerCase();
  return (v === 'org_shared' || v === 'org_required') ? 'org' : 'private';
}

// Status string -> semantic class (mirror operational vaultStatusClass).
function hubVaultStatusClass(status) {
  var s = String(status == null ? '' : status).toLowerCase();
  if (/(complete|done|extracted|analy[sz]ed|ready|success|\bok\b)/.test(s)) return 'ok';
  if (/(fail|error|reject)/.test(s)) return 'bad';
  if (/(pend|queue|process|progress|run|extract|analy[sz]ing|wait)/.test(s)) return 'busy';
  return 'idle';
}

// critical_gaps may be an int, an array, or a jsonb object -> a count, else null.
function hubVaultGapCount(g) {
  if (g == null || g === '') return null;
  if (Array.isArray(g)) return g.length;
  if (typeof g === 'object') { try { return Object.keys(g).length; } catch (e) { return null; } }
  if (hubAceiIsNum(g)) return Math.round(Number(g));
  return null;
}

// ISO date -> en-GB short (mirror operational fmtMatterDate).
function hubVaultDate(iso) {
  if (!iso) return '—';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return String(iso); }
}

// Pill / chip / tag chrome (hub palette; mirrors operational vault-* classes).
var HUB_VAULT_PILL_BASE = { display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', letterSpacing: '0.01em', padding: '3px 9px', borderRadius: '999px', border: '1px solid #1E3A5F', background: '#0A1628', color: '#94A3B8' };
var HUB_VAULT_PILL_STYLES = {
  ok:   { color: '#22C55E', borderColor: 'rgba(34,197,94,0.3)',    background: 'rgba(34,197,94,0.08)' },
  busy: { color: '#0EA5E9', borderColor: 'rgba(14,165,233,0.3)',   background: 'rgba(14,165,233,0.12)' },
  bad:  { color: '#F87171', borderColor: 'rgba(248,113,113,0.32)', background: 'rgba(248,113,113,0.08)' },
  idle: { color: '#64748B' },
};
var HUB_VAULT_CHIP_STYLE = { display: 'inline-block', fontFamily: "'DM Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', color: '#0EA5E9', whiteSpace: 'nowrap', background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', padding: '2px 8px', borderRadius: '6px' };
var HUB_VAULT_VIS_BASE = { display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', fontFamily: "'DM Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '999px', border: '1px solid #1E3A5F', color: '#94A3B8', background: 'rgba(148,163,184,0.06)' };
var HUB_VAULT_VIS_ORG = { color: '#0EA5E9', borderColor: 'rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.12)' };
var HUB_VAULT_CARD_STYLE = { background: '#0F1D32', border: '1px solid #1E3A5F', borderLeft: '2px solid rgba(14,165,233,0.3)', borderRadius: '12px', padding: '16px 18px' };
var HUB_VAULT_SAMPLE_STYLE = { flexShrink: 0, fontFamily: "'DM Mono', monospace", fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94A3B8', background: 'rgba(148,163,184,0.07)', border: '1px solid #1E3A5F', padding: '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap' };
var HUB_VAULT_STAT_TILE = { background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: '8px', padding: '12px 14px' };
var HUB_VAULT_STAT_LABEL = { color: '#64748B', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', marginBottom: '6px' };
var HUB_VAULT_STAT_VAL = { color: '#F1F5F9', fontFamily: "'DM Mono', monospace", fontSize: '18px', fontWeight: 600 };

// Extraction/analysis status pill. Empty -> "—" (idle); humanised via hubAcei.
function hubVaultStatusPill(status, key) {
  if (status == null || status === '') {
    return React.createElement('span', { key: key, style: Object.assign({}, HUB_VAULT_PILL_BASE, HUB_VAULT_PILL_STYLES.idle) }, '—');
  }
  var pillStyle = Object.assign({}, HUB_VAULT_PILL_BASE, HUB_VAULT_PILL_STYLES[hubVaultStatusClass(status)]);
  return React.createElement('span', { key: key, style: pillStyle }, hubAceiHumanise(status));
}

// §1.2 Documents panel — filename, type chip, size, extraction/analysis pills,
// visibility tag, added date. Read error -> "—"; empty -> invitation + upload
// note (no fake button). Reuses the hub table chrome.
function hubVaultDocsPanel(r) {
  var children = [React.createElement('div', { key: 'h', style: HUB_ACEI_SECTION_H }, 'Documents')];
  if (r.error) {
    children.push(React.createElement('div', { key: 'err', style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' } }, '—'));
    return React.createElement('div', { key: 'docs', style: { marginBottom: '24px' } }, children);
  }
  var rows = r.rows || [];
  if (!rows.length) {
    // §1.2 — AAL1 + MFA-enrolled: the aal2_required_when_enrolled RLS policy is
    // filtering the documents read. Show a single calm step-up note (advice-free,
    // RULE 15) in place of the empty state. RLS still enforces AAL2 server-side.
    if (r.stepUp) {
      children.push(React.createElement('div', { key: 'stepup', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6 } }, 'Verify your identity with your second factor to view stored documents.'));
      return React.createElement('div', { key: 'docs', style: { marginBottom: '24px' } }, children);
    }
    children.push(React.createElement('div', { key: 'empty', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6 } }, 'No documents in your vault yet.'));
    children.push(React.createElement('div', { key: 'note', style: { color: '#64748B', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', lineHeight: 1.5, marginTop: '8px' } }, 'Document upload is coming to this room shortly.'));
    return React.createElement('div', { key: 'docs', style: { marginBottom: '24px' } }, children);
  }
  var headers = ['Document', 'Type', 'Size', 'Extraction', 'Analysis', 'Visibility', 'Added'];
  var thBase = { padding: '9px 12px', borderBottom: '2px solid #1E3A5F', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'left' };
  var tdBase = { padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', verticalAlign: 'top' };
  var tdFname = Object.assign({}, tdBase, { color: '#F1F5F9', fontWeight: 600, wordBreak: 'break-word' });
  var tdCell = Object.assign({}, tdBase, { color: '#F1F5F9' });
  var tdNum = Object.assign({}, tdBase, { color: '#CBD5E1', fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' });
  var tdMuted = Object.assign({}, tdBase, { color: '#94A3B8', whiteSpace: 'nowrap' });
  var headRow = React.createElement('tr', null, headers.map(function (h) {
    return React.createElement('th', { key: h, style: thBase }, h);
  }));
  var bodyRows = rows.map(function (doc, idx) {
    var vlabel = hubVaultVisibilityLabel(doc.visibility);
    var visStyle = vlabel === 'org' ? Object.assign({}, HUB_VAULT_VIS_BASE, HUB_VAULT_VIS_ORG) : HUB_VAULT_VIS_BASE;
    return React.createElement('tr', { key: doc.id != null ? doc.id : idx },
      React.createElement('td', { style: tdFname }, doc.filename || '—'),
      React.createElement('td', { style: tdCell }, React.createElement('span', { style: HUB_VAULT_CHIP_STYLE }, hubVaultMimeLabel(doc.mime_type))),
      React.createElement('td', { style: tdNum }, hubVaultFileSize(doc.file_size_bytes)),
      React.createElement('td', { style: tdCell }, hubVaultStatusPill(doc.extraction_status, 'ex')),
      React.createElement('td', { style: tdCell }, hubVaultStatusPill(doc.analysis_status, 'an')),
      React.createElement('td', { style: tdCell }, React.createElement('span', { style: visStyle }, vlabel)),
      React.createElement('td', { style: tdMuted }, hubVaultDate(doc.created_at))
    );
  });
  children.push(React.createElement('div', { key: 'tbl', style: { overflowX: 'auto', background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '10px' } },
    React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: '640px' } },
      React.createElement('thead', null, headRow),
      React.createElement('tbody', null, bodyRows)
    )
  ));
  return React.createElement('div', { key: 'docs', style: { marginBottom: '24px' } }, children);
}

// One contract-analysis card — pseudonymised ref, role · tier, bare score,
// gap count, key finding, and an is_demonstration "sample" tag. Advice-free.
function hubVaultAnalysisCard(a, idx) {
  var main = [React.createElement('div', { key: 'ref', style: { fontSize: '16px', fontWeight: 700, color: '#F1F5F9', wordBreak: 'break-word', fontFamily: "'DM Sans', sans-serif" } }, a.employee_ref || '—')];
  var roleBits = [];
  if (a.role_title) roleBits.push(a.role_title);
  if (a.role_tier) roleBits.push(a.role_tier);
  if (roleBits.length) main.push(React.createElement('div', { key: 'role', style: { marginTop: '3px', fontSize: '13px', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif" } }, roleBits.join(' · ')));
  var top = [React.createElement('div', { key: 'main', style: { minWidth: 0 } }, main)];
  // Tag estate samples so the tenant can tell them from their own rows.
  if (a.is_demonstration === true) top.push(React.createElement('span', { key: 'sample', style: HUB_VAULT_SAMPLE_STYLE }, 'sample'));
  var cardChildren = [React.createElement('div', { key: 'top', style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' } }, top)];
  // Stored number only — the score renders as a bare value (no advice, RULE 15).
  if (hubAceiIsNum(a.compliance_score)) {
    cardChildren.push(React.createElement('div', { key: 'grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '12px' } },
      React.createElement('div', { style: HUB_VAULT_STAT_TILE },
        React.createElement('div', { style: HUB_VAULT_STAT_LABEL }, 'Compliance score'),
        React.createElement('div', { style: HUB_VAULT_STAT_VAL }, hubAceiSmart(a.compliance_score))
      )
    ));
  }
  // critical_gaps -> "N critical gaps" (count only; no advice framing).
  var gaps = hubVaultGapCount(a.critical_gaps);
  if (gaps != null) {
    cardChildren.push(React.createElement('div', { key: 'gaps', style: { marginTop: '10px', color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' } },
      String(gaps) + (gaps === 1 ? ' critical gap' : ' critical gaps')));
  }
  if (a.key_finding) {
    cardChildren.push(React.createElement('div', { key: 'kfh', style: { marginTop: '14px', fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#64748B' } }, 'Key finding'));
    cardChildren.push(React.createElement('div', { key: 'kf', style: { marginTop: '6px', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, a.key_finding));
  }
  return React.createElement('div', { key: a.id != null ? a.id : idx, style: HUB_VAULT_CARD_STYLE }, cardChildren);
}

// §1.3 Contract-analyses panel — a card per row + a neutral caption. Read error
// -> "—"; empty -> "No contract analyses yet." No advice language (RULE 15).
function hubVaultAnalysesPanel(r) {
  var children = [React.createElement('div', { key: 'h', style: HUB_ACEI_SECTION_H }, 'Contract analyses')];
  if (r.error) {
    children.push(React.createElement('div', { key: 'err', style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' } }, '—'));
    return React.createElement('div', { key: 'analyses', style: { marginBottom: '24px' } }, children);
  }
  var rows = r.rows || [];
  if (!rows.length) {
    children.push(React.createElement('div', { key: 'empty', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6 } }, 'No contract analyses yet.'));
    return React.createElement('div', { key: 'analyses', style: { marginBottom: '24px' } }, children);
  }
  children.push(React.createElement('div', { key: 'list', style: { display: 'flex', flexDirection: 'column', gap: '14px', margin: '8px 0 4px' } },
    rows.map(function (a, idx) { return hubVaultAnalysisCard(a, idx); })
  ));
  // Neutral caption only — no conclusions/advice framing (§1.3, RULE 15).
  children.push(React.createElement('div', { key: 'cap', style: { color: '#64748B', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', lineHeight: 1.55, marginTop: '10px' } },
    'Analyses are indicative; the legal judgement belongs with a qualified professional.'));
  return React.createElement('div', { key: 'analyses', style: { marginBottom: '24px' } }, children);
}

// Document Vault facet body. Reads on open via the hub RLS client (§1.1):
// the tenant's own documents + their contract analyses. Mirrors HubAceiFacet's
// shape (alive-guarded reads, loading line, max-width container).
function HubVaultFacet({ hubSession }) {
  var _state = useState({ status: 'loading', docs: { rows: [] }, analyses: { rows: [] } });
  var state = _state[0]; var setState = _state[1];

  useEffect(function () {
    var alive = true;
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from) { setState({ status: 'ready', docs: { error: true }, analyses: { error: true } }); return; }
    // §1.1 reads — RLS-scoped via the authenticated hub client (parallel).
    Promise.all([
      sb.from('kl_vault_documents')
        .select('id,filename,mime_type,file_size_bytes,extraction_status,analysis_status,visibility,created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(50),
      sb.from('vault_contract_records')
        .select('id,employee_ref,role_title,role_tier,compliance_score,critical_gaps,key_finding,is_demonstration,created_at')
        // OOX-001 §1.5 — defensive demo filter. Phase A (DB) already keeps
        // is_demonstration rows out of authenticated tenants (demo reads are
        // anon-only); this front-end guard ensures the operational Vault facet
        // never surfaces sample/demonstration rows even if a future read path slips.
        .eq('is_demonstration', false)
        .order('created_at', { ascending: false }).limit(50),
      hubVaultAal2StepUp(sb), // §1.2 — AAL1 + MFA-enrolled? (never rejects)
    ]).then(function (res) {
      if (!alive) return;
      var docs = hubVaultUnwrap(res[0], 'kl_vault_documents');
      // §1.2 — an empty documents read for an AAL1 + MFA-enrolled user is the
      // aal2_required_when_enrolled RLS policy biting, not an empty vault: mark it
      // so the panel shows the calm step-up note. A read error keeps the resilient
      // "—"; a non-empty read renders normally. vault_contract_records is unaffected
      // (AAL1-readable) and renders as before.
      if (res[2] && docs.rows && docs.rows.length === 0) docs.stepUp = true;
      setState({ status: 'ready', docs: docs, analyses: hubVaultUnwrap(res[1], 'vault_contract_records') });
    }).catch(function (e) {
      console.warn('[OOX-001] Vault facet: reads failed', e);
      if (alive) setState({ status: 'ready', docs: { error: true }, analyses: { error: true } });
    });
    return function () { alive = false; };
  }, [hubSession]);

  if (state.status === 'loading') {
    return React.createElement('div', { style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '8px 0' } }, 'Loading your document vault…');
  }
  return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } },
    hubVaultDocsPanel(state.docs),       // §1.2
    hubVaultAnalysesPanel(state.analyses) // §1.3
  );
}

// ─── OOX-001 KL-Hub Alerts facet (brief-4 / KL-HUB §5 step 4) ───
// The tenant's open actions, breach register and mitigations, read on open via
// the hub RLS client (hubSession.sb) — no service key; RLS auto-scopes every row
// to the tenant. ALL DB values render via React children (auto-escaped) — never
// dangerouslySetInnerHTML on data (KL-HUB §1.5 / §2 security). Each read is
// unwrapped resiliently (hubVaultUnwrap): a failed panel shows "—" with
// console.warn and the facet never throws. Mirrors operational/index.html
// renderAlertsSection: open-actions panel (action_text/notes, status pill,
// due_date overdue/due-soon flag, owner hint), breach register (ref, nature,
// status, discovered date, ICO-reportable marker + report-due/overdue/reported
// markers), mitigations (domain·category, tier, status, revalidate-by flag,
// active-since), counts in each heading, and all three empty states. Breach
// records are presented factually — no advice/conclusion language (RULE 15);
// risk_assessment free-text is deliberately NOT rendered (matches operational).
// rsg_change_alerts is NOT wired (firm-internal feed; tenants have no read
// policy). Reuses the hub chrome: hubVaultUnwrap, hubVaultStatusPill,
// hubVaultDate, hubAceiHumanise and HUB_ACEI_SECTION_H.

// Whole-day difference (date − today), UTC-normalised. null if unparseable.
// Mirrors operational alertsDaysUntil.
function hubAlertsDaysUntil(iso) {
  if (!iso) return null;
  var d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  var now = new Date();
  var a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  var b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / 86400000);
}
// Overdue (past) / due-soon (≤14d) flag for a date field; null otherwise.
function hubAlertsDateFlag(iso) {
  var t = hubAlertsDaysUntil(iso);
  if (t === null) return null;
  if (t < 0) return { kind: 'overdue', label: 'Overdue' };
  if (t <= 14) return { kind: 'due', label: 'Due soon' };
  return null;
}

// Card / meta / flag chrome (hub palette; mirrors operational .alerts-* classes).
var HUB_ALERTS_CARD_STYLE = { background: '#0F1D32', border: '1px solid #1E3A5F', borderLeft: '2px solid rgba(14,165,233,0.3)', borderRadius: '12px', padding: '14px 16px' };
var HUB_ALERTS_TOP_STYLE = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' };
var HUB_ALERTS_TITLE_STYLE = { fontFamily: "'DM Sans', sans-serif", fontSize: '15px', fontWeight: 700, color: '#F1F5F9', wordBreak: 'break-word' };
var HUB_ALERTS_SUB_STYLE = { marginTop: '3px', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#94A3B8', lineHeight: 1.5, wordBreak: 'break-word' };
var HUB_ALERTS_META_STYLE = { marginTop: '9px', display: 'flex', flexWrap: 'wrap', gap: '6px 8px', alignItems: 'center' };
var HUB_ALERTS_MONO_STYLE = { fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#64748B', letterSpacing: '0.02em' };
var HUB_ALERTS_FLAG_BASE = { display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', letterSpacing: '0.02em', padding: '2px 9px', borderRadius: '999px', border: '1px solid #1E3A5F', background: '#0A1628', color: '#94A3B8' };
var HUB_ALERTS_FLAG_OVERDUE = { color: '#F87171', borderColor: 'rgba(248,113,113,0.32)', background: 'rgba(248,113,113,0.08)' };
var HUB_ALERTS_FLAG_DUE = { color: '#0EA5E9', borderColor: 'rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.12)' };
var HUB_ALERTS_FLAG_ICO = { fontFamily: "'DM Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0EA5E9', borderColor: 'rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.12)' };
var HUB_ALERTS_EMPTY_STYLE = { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6 };
var HUB_ALERTS_ERR_STYLE = { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' };
var HUB_ALERTS_LIST_STYLE = { display: 'flex', flexDirection: 'column', gap: '12px', margin: '2px 0 4px' };

// Section heading with the panel's row count (count omitted on read error).
function hubAlertsHeading(title, r) {
  var text = (r && r.rows) ? (title + ' · ' + r.rows.length) : title;
  return React.createElement('div', { key: 'h', style: HUB_ACEI_SECTION_H }, text);
}
// A flag pill (overdue / due / ico). Label rendered via React children (escaped).
function hubAlertsFlag(kind, label, key) {
  var extra = kind === 'overdue' ? HUB_ALERTS_FLAG_OVERDUE
    : kind === 'due' ? HUB_ALERTS_FLAG_DUE
    : kind === 'ico' ? HUB_ALERTS_FLAG_ICO
    : null;
  return React.createElement('span', { key: key, style: extra ? Object.assign({}, HUB_ALERTS_FLAG_BASE, extra) : HUB_ALERTS_FLAG_BASE }, label);
}
// Mono meta chip (date lines). Value rendered via React children (escaped).
function hubAlertsMono(text, key) {
  return React.createElement('span', { key: key, style: HUB_ALERTS_MONO_STYLE }, text);
}
// Card top: title + optional sub on the left, status pill on the right.
function hubAlertsCardTop(title, sub, status) {
  var main = [React.createElement('div', { key: 't', style: HUB_ALERTS_TITLE_STYLE }, title)];
  if (sub) main.push(React.createElement('div', { key: 's', style: HUB_ALERTS_SUB_STYLE }, sub));
  return React.createElement('div', { key: 'top', style: HUB_ALERTS_TOP_STYLE },
    React.createElement('div', { key: 'main', style: { minWidth: 0 } }, main),
    hubVaultStatusPill(status, 'st')
  );
}
// Assemble a card from a top element + a meta-children array (meta row omitted
// when empty). key uses the row id with an index fallback.
function hubAlertsCard(id, idx, top, meta) {
  var children = [top];
  if (meta.length) children.push(React.createElement('div', { key: 'meta', style: HUB_ALERTS_META_STYLE }, meta));
  return React.createElement('div', { key: id != null ? id : idx, style: HUB_ALERTS_CARD_STYLE }, children);
}
// Panel wrapper: heading + count, "—" on read error, empty-state line, else list.
function hubAlertsPanel(panelKey, title, r, emptyText, renderCard) {
  var children = [hubAlertsHeading(title, r)];
  if (r.error) {
    children.push(React.createElement('div', { key: 'err', style: HUB_ALERTS_ERR_STYLE }, '—'));
  } else {
    var rows = r.rows || [];
    if (!rows.length) {
      children.push(React.createElement('div', { key: 'empty', style: HUB_ALERTS_EMPTY_STYLE }, emptyText));
    } else {
      children.push(React.createElement('div', { key: 'list', style: HUB_ALERTS_LIST_STYLE },
        rows.map(function (row, idx) { return renderCard(row, idx); })));
    }
  }
  return React.createElement('div', { key: panelKey, style: { marginBottom: '24px' } }, children);
}

// §1.2 — open action card. action_text (notes fallback); status pill; owner hint;
// due_date with overdue/due-soon flag, or "No due date".
function hubAlertsActionCard(a, idx) {
  var cat = a.actions;
  if (Array.isArray(cat)) cat = cat[0];
  cat = cat || {};
  var top = hubAlertsCardTop(cat.action_text || a.notes || 'Action', cat.owner_role_hint ? ('Owner: ' + cat.owner_role_hint) : null, a.status);
  var meta = [];
  if (a.due_date) {
    meta.push(hubAlertsMono('Due ' + hubVaultDate(a.due_date), 'due'));
    var flag = hubAlertsDateFlag(a.due_date);
    if (flag) meta.push(hubAlertsFlag(flag.kind, flag.label, 'fl'));
  } else {
    meta.push(hubAlertsMono('No due date', 'due'));
  }
  return hubAlertsCard(a.id, idx, top, meta);
}

// §1.3 — breach card. ref, nature, status, discovered date; where ico_reportable
// an "ICO-reportable" marker + report-due (overdue flagged only when not yet
// reported) + reported date. Factual only — no advice (RULE 15). risk_assessment
// is intentionally not rendered.
function hubAlertsBreachCard(b, idx) {
  var top = hubAlertsCardTop(b.breach_ref || 'Breach', b.nature || null, b.status);
  var meta = [];
  if (b.discovered_at) meta.push(hubAlertsMono('Discovered ' + hubVaultDate(b.discovered_at), 'disc'));
  if (b.ico_reportable === true) {
    meta.push(hubAlertsFlag('ico', 'ICO-reportable', 'ico'));
    if (b.ico_report_due_at) {
      meta.push(hubAlertsMono('Report due ' + hubVaultDate(b.ico_report_due_at), 'rdue'));
      if (!b.ico_reported_at) {
        var f = hubAlertsDateFlag(b.ico_report_due_at);
        if (f && f.kind === 'overdue') meta.push(hubAlertsFlag('overdue', 'Report overdue', 'rovd'));
      }
    }
    if (b.ico_reported_at) meta.push(hubAlertsMono('Reported ' + hubVaultDate(b.ico_reported_at), 'rep'));
  }
  return hubAlertsCard(b.id, idx, top, meta);
}

// §1.4 — mitigation card. domain·category (humanised), tier, status; revalidate_by
// with due/overdue flag; active-since.
function hubAlertsMitigationCard(m, idx) {
  var titleBits = [];
  if (m.domain) titleBits.push(hubAceiHumanise(m.domain));
  if (m.category) titleBits.push(hubAceiHumanise(m.category));
  var top = hubAlertsCardTop(titleBits.length ? titleBits.join(' · ') : 'Mitigation', (m.tier != null && m.tier !== '') ? ('Tier: ' + m.tier) : null, m.status);
  var meta = [];
  if (m.revalidate_by) {
    meta.push(hubAlertsMono('Revalidate by ' + hubVaultDate(m.revalidate_by), 'rev'));
    var flag = hubAlertsDateFlag(m.revalidate_by);
    if (flag) meta.push(hubAlertsFlag(flag.kind, flag.label, 'fl'));
  }
  if (m.activated_at) meta.push(hubAlertsMono('Active since ' + hubVaultDate(m.activated_at), 'act'));
  return hubAlertsCard(m.id, idx, top, meta);
}

// Alerts facet body. Reads on open via the hub RLS client (§1.1). Mirrors
// HubVaultFacet's shape (alive-guarded parallel reads, loading line, max-width
// container). Each panel is resilient; the facet never throws.
function HubAlertsFacet({ hubSession }) {
  var _state = useState({ status: 'loading', actions: { rows: [] }, breaches: { rows: [] }, mitigations: { rows: [] } });
  var state = _state[0]; var setState = _state[1];

  useEffect(function () {
    var alive = true;
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from) { setState({ status: 'ready', actions: { error: true }, breaches: { error: true }, mitigations: { error: true } }); return; }
    // §1.1 reads — RLS-scoped via the authenticated hub client (parallel).
    Promise.all([
      sb.from('org_actions')
        .select('id,status,due_date,notes,created_at,actions(action_text,owner_role_hint,deadline_days,required)')
        .neq('status', 'completed')
        .order('due_date', { ascending: true, nullsFirst: false }).limit(50),
      sb.from('breach_register')
        .select('id,breach_ref,discovered_at,nature,status,ico_reportable,ico_report_due_at,ico_reported_at,risk_assessment')
        .order('discovered_at', { ascending: false }).limit(50),
      sb.from('mitigation_register')
        .select('id,domain,category,tier,status,revalidate_by,activated_at')
        .order('revalidate_by', { ascending: true, nullsFirst: false }).limit(50),
    ]).then(function (res) {
      if (!alive) return;
      setState({ status: 'ready',
        actions: hubVaultUnwrap(res[0], 'org_actions'),
        breaches: hubVaultUnwrap(res[1], 'breach_register'),
        mitigations: hubVaultUnwrap(res[2], 'mitigation_register') });
    }).catch(function (e) {
      console.warn('[OOX-001] Alerts facet: reads failed', e);
      if (alive) setState({ status: 'ready', actions: { error: true }, breaches: { error: true }, mitigations: { error: true } });
    });
    return function () { alive = false; };
  }, [hubSession]);

  if (state.status === 'loading') {
    return React.createElement('div', { style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '8px 0' } }, 'Loading your alerts…');
  }
  return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } },
    hubAlertsPanel('actions', 'Open actions', state.actions, 'No open actions.', hubAlertsActionCard),           // §1.2
    hubAlertsPanel('breaches', 'Breach register', state.breaches, 'No breaches recorded.', hubAlertsBreachCard),  // §1.3
    hubAlertsPanel('mitigations', 'Mitigations', state.mitigations, 'No mitigations active.', hubAlertsMitigationCard) // §1.4
  );
}

// ─── OOX-001 KL-Hub Intelligence facet (KL-HUB §5 step 5, realised as a hub
// facet — AILANE-CC-BRIEF-OOX-KL-HUB-INTELLIGENCE-FACET-001) ───
// The forward legislative pipeline (kl_legislative_horizon — global authenticated
// SELECT; every published row surfaced in full) with the tenant's tracked items
// (org_horizon_watchlist — RLS org-scoped) highlighted and a track/untrack
// control (track = insert carrying org_id from get_my_org_id(); untrack = delete,
// RLS-scoped). All reads/writes flow through hubSession.sb so RLS auto-scopes.
// The pipeline is Tier 5 — a standing caveat banner; advice-free (RULE 15).
// Render discipline mirrors the ACEI/Vault/Alerts facets: alive-guarded parallel
// reads, resilient unwrap (hubVaultUnwrap → "—" + console.warn), loading line,
// max-width container, reused hub chrome. EVERY server field renders via escaped
// React children EXCEPT the two estate-authored HTML columns
// (business_impact_html, preparatory_steps_html), which pass through
// hubIntelSanitiseHtml (#43 DOMPurify allowlist) before the facet's ONLY
// dangerouslySetInnerHTML. Mirrors operational/index.html renderIntelSection.

// #43 — the security control. DOMPurify (bundled; string-only, no network, no CSP
// impact) hardens the two estate-authored HTML columns to a tight allowlist before
// they reach dangerouslySetInnerHTML. This is the ONLY sanitiser and the ONLY
// dangerouslySetInnerHTML in the facet; every other field renders escaped.
function hubIntelSanitiseHtml(html) {
  if (html == null || html === '') return '';
  try {
    return DOMPurify.sanitize(String(html), {
      ALLOWED_TAGS: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'h3', 'h4', 'a', 'span'],
      ALLOWED_ATTR: ['href'],
      ALLOWED_URI_REGEXP: /^https?:\/\//i,
    });
  } catch (e) {
    console.warn('[OOX-001] Intelligence: sanitise failed', e);
    return '';
  }
}

// Coerce a server field to a printable string for escaped React children (mirrors
// operational's textContent assignment; arrays/objects render safely rather than
// throwing on object children).
function hubIntelText(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.filter(function (x) { return x != null && x !== ''; }).map(String).join('\n');
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch (e) { return ''; } }
  return String(v);
}

// Intel chrome (hub palette; mirrors operational .intel-* classes). Reuses the
// shared section heading style and defines the card / caveat / chip / track-button
// composites here.
var HUB_INTEL_CAVEAT_STYLE = { background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.28)', borderRadius: '10px', padding: '11px 14px', marginBottom: '18px', color: '#7DD3FC', fontFamily: "'DM Sans', sans-serif", fontSize: '12.5px', lineHeight: 1.55 };
var HUB_INTEL_CARD_STYLE = { background: '#0F1D32', border: '1px solid #1E3A5F', borderLeft: '2px solid rgba(14,165,233,0.3)', borderRadius: '12px', padding: '16px 18px' };
var HUB_INTEL_CARD_TRACKING_STYLE = { borderColor: 'rgba(14,165,233,0.45)', borderLeftColor: '#38BDF8', background: 'rgba(14,165,233,0.06)' };
var HUB_INTEL_LIST_STYLE = { display: 'flex', flexDirection: 'column', gap: '14px', margin: '2px 0 4px' };
var HUB_INTEL_TOP_STYLE = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' };
var HUB_INTEL_TITLE_STYLE = { fontFamily: "'DM Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#F1F5F9', wordBreak: 'break-word' };
var HUB_INTEL_META_STYLE = { marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '2px 14px', fontFamily: "'DM Sans', sans-serif", fontSize: '12.5px', color: '#94A3B8' };
var HUB_INTEL_CHIPS_STYLE = { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' };
var HUB_INTEL_CHIP_BASE = { display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', letterSpacing: '0.01em', padding: '3px 9px', borderRadius: '999px', border: '1px solid #1E3A5F', background: '#0A1628', color: '#94A3B8' };
var HUB_INTEL_CHIP_TYPE = { color: '#0EA5E9', borderColor: 'rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.12)' };
var HUB_INTEL_CHIP_HIGH = { color: '#F87171', borderColor: 'rgba(248,113,113,0.32)', background: 'rgba(248,113,113,0.08)' };
var HUB_INTEL_SUBHEAD_STYLE = { marginTop: '14px', fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#64748B' };
var HUB_INTEL_SUMMARY_STYLE = { marginTop: '12px', color: '#E2E8F0', fontFamily: "'DM Sans', sans-serif", fontSize: '14.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
var HUB_INTEL_TEXT_STYLE = { marginTop: '6px', color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
var HUB_INTEL_HTML_STYLE = { marginTop: '6px', color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, wordBreak: 'break-word' };
var HUB_INTEL_FOOT_STYLE = { marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px 14px', alignItems: 'center' };
var HUB_INTEL_SOURCE_STYLE = { fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#38BDF8', textDecoration: 'none', fontWeight: 600 };
var HUB_INTEL_DISCLAIMER_STYLE = { marginTop: '10px', color: '#64748B', fontFamily: "'DM Sans', sans-serif", fontSize: '11.5px', lineHeight: 1.5, whiteSpace: 'pre-wrap' };
var HUB_INTEL_TRACK_BASE = { flexShrink: 0, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '0.01em', padding: '6px 12px', borderRadius: '999px', border: '1px solid #1E3A5F', background: '#0A1628', color: '#CBD5E1', whiteSpace: 'nowrap' };
var HUB_INTEL_TRACK_ON = { color: '#38BDF8', borderColor: 'rgba(56,189,248,0.45)', background: 'rgba(14,165,233,0.14)' };
var HUB_INTEL_FILTER_STYLE = { display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' };
var HUB_INTEL_TOGGLE_BASE = { cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#0A1628', color: '#94A3B8' };
var HUB_INTEL_TOGGLE_ON = { color: '#38BDF8', borderColor: 'rgba(56,189,248,0.45)', background: 'rgba(14,165,233,0.14)' };
// OOX-001 DISCLAIMER-FEEDBACK — Legal Council Opinion C1 banner + "Have we missed
// something?" gap control on the forward-pipeline view. Plain, prominent, shown
// before reliance; writes a gap submission direct to horizon_gap_submissions (RLS).
var HUB_INTEL_C1_STYLE = { background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.28)', borderLeft: '3px solid #38BDF8', borderRadius: '10px', padding: '13px 16px', marginBottom: '18px', color: '#BAE6FD', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', lineHeight: 1.6 };
var HUB_INTEL_GAP_OPEN_STYLE = { cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '12.5px', fontWeight: 600, padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.45)', background: 'rgba(14,165,233,0.10)', color: '#38BDF8' };
var HUB_INTEL_GAP_FORM_STYLE = { background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '12px', padding: '16px 18px', margin: '14px 0 6px' };
var HUB_INTEL_GAP_LABEL_STYLE = { display: 'block', fontFamily: "'DM Sans', sans-serif", fontSize: '12.5px', fontWeight: 600, color: '#E2E8F0', margin: '12px 0 6px' };
var HUB_INTEL_GAP_TEXTAREA_STYLE = { width: '100%', minHeight: '84px', resize: 'vertical', boxSizing: 'border-box', padding: '10px 12px', background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: '8px', color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' };
var HUB_INTEL_GAP_INPUT_STYLE = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: '8px', color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' };
var HUB_INTEL_GAP_SUBMIT_STYLE = { cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 700, padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#38BDF8', color: '#042027' };
var HUB_INTEL_GAP_CANCEL_STYLE = { cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, padding: '9px 18px', borderRadius: '8px', border: '1px solid #1E3A5F', background: 'transparent', color: '#94A3B8' };
var HUB_INTEL_GAP_CONFIRM_STYLE = { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', padding: '16px 18px', margin: '14px 0 6px', color: '#6EE7B7', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', lineHeight: 1.6 };

// One pipeline chip (escaped label). variant: 'type' | 'high' | null.
function hubIntelChip(label, variant, key) {
  var extra = variant === 'type' ? HUB_INTEL_CHIP_TYPE : variant === 'high' ? HUB_INTEL_CHIP_HIGH : null;
  return React.createElement('span', { key: key, style: extra ? Object.assign({}, HUB_INTEL_CHIP_BASE, extra) : HUB_INTEL_CHIP_BASE }, label);
}

// OOX-CARDS §1.2 — key_changes (kl_legislative_horizon, jsonb) arrives either as a
// proper array (2 of 48 rows) or, more often, as a JSON STRING of that array (46
// rows). Each element is an object {change,severity,expected,note} or a plain string.
// Render DEFENSIVELY: JSON.parse a string first, render every element as escaped React
// children — NEVER String(object) → "[object Object]" — and degrade to a graceful line
// when empty/unparseable. Zero dangerouslySetInnerHTML in this path.
var HUB_INTEL_KC_LINE_STYLE = { marginTop: '8px', color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
var HUB_INTEL_KC_META_STYLE = { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '5px' };
function hubIntelKcEmpty() {
  return React.createElement('div', { key: 'kc-empty', style: HUB_INTEL_KC_LINE_STYLE }, 'No key changes listed yet.');
}
function hubIntelKcLine(text, key) {
  return React.createElement('div', { key: key, style: HUB_INTEL_KC_LINE_STYLE }, text);
}
// One key-changes object element → change (primary, escaped) + severity/expected as
// small secondary chips where present. Returns null (skipped) if it carries no usable
// text — the raw object is never rendered.
function hubIntelKcObject(el, key) {
  if (el == null || typeof el !== 'object') return null;  // never read fields off null
  var change = el.change != null ? String(el.change).trim() : '';
  var note = el.note != null ? String(el.note).trim() : '';
  var primary = change !== '' ? change : note;
  if (primary === '') return null;
  var chips = [];
  if (el.severity != null && String(el.severity).trim() !== '') {
    var sev = String(el.severity).trim();
    var high = /high|critical|severe|urgent/i.test(sev);
    chips.push(hubIntelChip('Severity: ' + sev, high ? 'high' : null, 'sev'));
  }
  if (el.expected != null && String(el.expected).trim() !== '') {
    chips.push(hubIntelChip('Expected: ' + String(el.expected).trim(), null, 'exp'));
  }
  var kids = [React.createElement('div', { key: 'c' }, primary)];
  if (chips.length) kids.push(React.createElement('div', { key: 'm', style: HUB_INTEL_KC_META_STYLE }, chips));
  return React.createElement('div', { key: key, style: HUB_INTEL_KC_LINE_STYLE }, kids);
}
// Returns an array of escaped React children for key_changes, or null to skip the
// whole "Key changes" section (only when the value is absent). Handles: JS array,
// JSON-string of an array, array of objects, array of strings, a bare object, and the
// empty / empty-array / unparseable cases (graceful "No key changes listed yet.").
function hubIntelKeyChanges(raw) {
  if (raw == null) return null;
  var val = raw;
  if (typeof val === 'string') {
    var s = val.trim();
    if (s === '') return [hubIntelKcEmpty()];
    try { val = JSON.parse(s); }
    catch (e) { return [hubIntelKcLine(s, 'kc0')]; }  // non-JSON prose → one escaped line
    // The string parsed to a JSON literal null/undefined (e.g. the text "null") →
    // empty content; degrade gracefully rather than reaching the object branch.
    if (val == null) return [hubIntelKcEmpty()];
  }
  if (Array.isArray(val)) {
    var nodes = [];
    val.forEach(function (el, i) {
      if (el == null) return;
      if (typeof el === 'object') { var n = hubIntelKcObject(el, 'kc' + i); if (n) nodes.push(n); }
      else { var t = String(el).trim(); if (t !== '') nodes.push(hubIntelKcLine(t, 'kc' + i)); }
    });
    return nodes.length ? nodes : [hubIntelKcEmpty()];
  }
  if (typeof val === 'object') {                        // a bare object → its change line
    var one = hubIntelKcObject(val, 'kc0');
    return one ? [one] : [hubIntelKcEmpty()];
  }
  var str = String(val).trim();                         // number/bool → text or fallback
  return str !== '' ? [hubIntelKcLine(str, 'kc0')] : [hubIntelKcEmpty()];
}

// OOX-CARDS §1.3 — "Discuss with Eileen" control shared by both Intelligence card
// types. Closing the facet + seeding the Eileen input is handled by the App-level
// window.__klDiscussWithEileen (deferred dispatch so the seed lands after the
// conversation's MessageInput remounts). Falls back to a plain seed if that hub global
// is somehow absent. Mirrors the existing RegulatoryFeed "Discuss" affordance (seeds
// the input; does NOT auto-send).
var HUB_INTEL_DISCUSS_STYLE = { marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'transparent', border: '1px solid #0EA5E9', color: '#0EA5E9', borderRadius: '8px', padding: '6px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 600 };
function hubIntelDiscussBtn(seed, key) {
  return React.createElement('button', {
    key: key || 'discuss', type: 'button', style: HUB_INTEL_DISCUSS_STYLE,
    'aria-label': 'Discuss with Eileen',
    onClick: function () {
      if (typeof window.__klDiscussWithEileen === 'function') window.__klDiscussWithEileen(seed);
      else if (typeof window.__klSeedInput === 'function') window.__klSeedInput(seed);
    },
  }, '→ Discuss with Eileen');
}

// One pipeline card. Header (title + stage/expected meta + track toggle), type/
// priority/status chips, headline + key changes (escaped), the two sanitised
// *_html columns, affected-category chips, a plain source link, the per-item
// disclaimer. Tracked rows get the highlighted style + an "Untrack" control.
function hubIntelCard(row, idx, isTracked, onToggle) {
  var cardStyle = isTracked ? Object.assign({}, HUB_INTEL_CARD_STYLE, HUB_INTEL_CARD_TRACKING_STYLE) : HUB_INTEL_CARD_STYLE;
  var children = [];

  // Header: title + meta on the left, track/untrack on the right.
  var name = row.legislation_short_name || row.legislation_title || 'Untitled instrument';
  var left = [React.createElement('div', { key: 'title', style: HUB_INTEL_TITLE_STYLE }, name)];
  var meta = [];
  if (row.parliament_stage) meta.push(React.createElement('span', { key: 'stage' }, hubIntelText(row.parliament_stage)));
  if (row.expected_enactment) meta.push(React.createElement('span', { key: 'exp' }, 'Expected in-force: ' + hubIntelText(row.expected_enactment)));
  if (meta.length) left.push(React.createElement('div', { key: 'meta', style: HUB_INTEL_META_STYLE }, meta));
  children.push(React.createElement('div', { key: 'top', style: HUB_INTEL_TOP_STYLE },
    React.createElement('div', { key: 'l', style: { minWidth: 0 } }, left),
    React.createElement('button', {
      key: 'track', type: 'button',
      style: isTracked ? Object.assign({}, HUB_INTEL_TRACK_BASE, HUB_INTEL_TRACK_ON) : HUB_INTEL_TRACK_BASE,
      'aria-pressed': isTracked ? 'true' : 'false',
      'aria-label': (isTracked ? 'Untrack ' : 'Track ') + name,
      onClick: function () { onToggle(row); },
    }, isTracked ? '✓ Tracking' : '+ Track')
  ));

  // Type / priority / status chips (escaped).
  var chips = [];
  if (row.legislation_type) chips.push(hubIntelChip(hubIntelText(row.legislation_type), 'type', 'type'));
  if (row.priority) {
    var high = String(row.priority).toLowerCase() === 'high';
    chips.push(hubIntelChip('Priority: ' + hubIntelText(row.priority), high ? 'high' : null, 'prio'));
  }
  if (row.status) chips.push(hubIntelChip(hubIntelText(row.status), null, 'status'));
  if (chips.length) children.push(React.createElement('div', { key: 'chips', style: HUB_INTEL_CHIPS_STYLE }, chips));

  // Headline + key changes — escaped React children.
  if (row.headline_summary) children.push(React.createElement('div', { key: 'sum', style: HUB_INTEL_SUMMARY_STYLE }, hubIntelText(row.headline_summary)));
  // §1.2 (OOX-CARDS) — key_changes rendered defensively (array | JSON-string of
  // objects/strings); never "[object Object]", graceful fallback when empty. Escaped.
  var kcNodes = hubIntelKeyChanges(row.key_changes);
  if (kcNodes) {
    children.push(React.createElement('div', { key: 'kch', style: HUB_INTEL_SUBHEAD_STYLE }, 'Key changes'));
    children.push(React.createElement('div', { key: 'kc' }, kcNodes));
  }

  // §1.2 the ONLY dangerouslySetInnerHTML — the two estate-authored HTML columns,
  // each passed through the #43 DOMPurify allowlist first. Empty after sanitise → skip.
  var bi = hubIntelSanitiseHtml(row.business_impact_html);
  if (bi) {
    children.push(React.createElement('div', { key: 'bih', style: HUB_INTEL_SUBHEAD_STYLE }, 'Business impact'));
    children.push(React.createElement('div', { key: 'bi', style: HUB_INTEL_HTML_STYLE, dangerouslySetInnerHTML: { __html: bi } }));
  }
  var ps = hubIntelSanitiseHtml(row.preparatory_steps_html);
  if (ps) {
    children.push(React.createElement('div', { key: 'psh', style: HUB_INTEL_SUBHEAD_STYLE }, 'Preparatory steps'));
    children.push(React.createElement('div', { key: 'ps', style: HUB_INTEL_HTML_STYLE, dangerouslySetInnerHTML: { __html: ps } }));
  }

  // Affected categories — escaped chips.
  if (Array.isArray(row.affected_categories) && row.affected_categories.length) {
    var cats = [];
    row.affected_categories.forEach(function (c, i) {
      if (c != null && c !== '') cats.push(hubIntelChip(hubIntelText(c), null, 'cat' + i));
    });
    if (cats.length) children.push(React.createElement('div', { key: 'cats', style: HUB_INTEL_CHIPS_STYLE }, cats));
  }

  // Source link (plain; rendered only for an http(s) URL — defensive, matching the
  // sanitiser's URI policy).
  if (row.source_url && /^https?:\/\//i.test(String(row.source_url))) {
    children.push(React.createElement('div', { key: 'foot', style: HUB_INTEL_FOOT_STYLE },
      React.createElement('a', { key: 'src', href: String(row.source_url), target: '_blank', rel: 'noopener noreferrer', style: HUB_INTEL_SOURCE_STYLE }, 'Source')));
  }

  // Per-item disclaimer footnote (escaped).
  if (row.disclaimer_text) children.push(React.createElement('div', { key: 'disc', style: HUB_INTEL_DISCLAIMER_STYLE }, hubIntelText(row.disclaimer_text)));

  // §1.3 (OOX-CARDS) — "Discuss with Eileen": switch the centre back to Eileen, seeded
  // with this instrument's context (seed only; does NOT auto-send).
  var discussName = row.legislation_short_name || row.legislation_title || 'this legislation';
  children.push(hubIntelDiscussBtn('Explain the ' + discussName + ' and what it means for my organisation.', 'discuss'));

  return React.createElement('div', { key: row.id != null ? row.id : idx, style: cardStyle }, children);
}

// Intelligence facet body. Reads on open via the hub RLS client (§1.1): the global
// forward pipeline + the tenant's watchlist + the org id (for inserts). Mirrors
// HubAlertsFacet's shape (alive-guarded parallel reads, loading line, max-width
// container). Reads are resilient; the facet never throws.
// OOX-001 INTELLIGENCE-FOLD §1.2: this is the "Coming into force — forward pipeline"
// view (formerly the whole Intelligence facet) — kl_legislative_horizon + the DOMPurify
// *_html path, UNCHANGED. It is now one of two views the facet hosts; the new in-force
// statutory view is HubIntelInForceView and the segmented wrapper is HubIntelFacet (both
// below).
// OOX-001 DISCLAIMER-FEEDBACK — "Have we missed something?" gap control. Writes a
// gap submission DIRECT to public.horizon_gap_submissions via the authenticated hub
// client (RLS: INSERT permitted only where org_id = get_my_org_id()). Free text is
// passed strictly as data and is never rendered back unescaped. Mirrors the proven
// org_horizon_watchlist insert (org_id from state.orgId, user from hubSession.userId).
function HubIntelGapForm({ hubSession, orgId }) {
  var _open = useState(false); var open = _open[0]; var setOpen = _open[1];
  var _desc = useState(''); var desc = _desc[0]; var setDesc = _desc[1];
  var _src = useState(''); var src = _src[0]; var setSrc = _src[1];
  var _jur = useState(''); var jur = _jur[0]; var setJur = _jur[1];
  var _status = useState('idle'); var status = _status[0]; var setStatus = _status[1]; // idle | submitting | success | error
  var _err = useState(''); var err = _err[0]; var setErr = _err[1];

  var sb = hubSession && hubSession.sb;

  function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    var description = (desc || '').trim();
    if (!description) return;                       // also guarded by the disabled Submit button
    if (!sb || !sb.from || !orgId) {
      console.error('[OOX-001] Intelligence: gap submission blocked (no client/org)');
      setErr('Sorry — we couldn’t submit that just now. Please try again.');
      setStatus('error');
      return;
    }
    setStatus('submitting'); setErr('');
    Promise.resolve(sb.from('horizon_gap_submissions').insert({
      org_id: orgId,
      submitted_by: hubSession.userId,
      instrument_description: description,
      source_url_hint: (src || '').trim() || null,
      jurisdiction_hint: (jur || '').trim() || null,
    })).then(function (r) {
      if (r && r.error) throw r.error;
      setStatus('success');
    }).catch(function (e2) {
      console.error('[OOX-001] Intelligence: gap submission failed', e2);
      setErr('Sorry — we couldn’t submit that just now. Please try again.');
      setStatus('error');
    });
  }

  if (status === 'success') {
    return React.createElement('div', { style: HUB_INTEL_GAP_CONFIRM_STYLE },
      'Thank you — we’ll check this against Parliament and legislation.gov.uk and update your horizon if it’s a current change. You can add more detail or a source any time.');
  }

  if (!open) {
    return React.createElement('div', { style: { margin: '16px 0 4px' } },
      React.createElement('button', { type: 'button', style: HUB_INTEL_GAP_OPEN_STYLE, onClick: function () { setOpen(true); } },
        'Have we missed something?'));
  }

  var fields = [];
  fields.push(React.createElement('div', { key: 'lead', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', lineHeight: 1.55 } },
    'This horizon is not a complete record. Tell us about a change you think we’ve missed — every suggestion is reviewed by a person before anything is added.'));
  fields.push(React.createElement('label', { key: 'l1', style: HUB_INTEL_GAP_LABEL_STYLE }, 'Describe the change you think we’ve missed'));
  fields.push(React.createElement('textarea', { key: 't1', style: HUB_INTEL_GAP_TEXTAREA_STYLE, value: desc,
    onChange: function (ev) { setDesc(ev.target.value); }, placeholder: 'The bill, regulation, consultation or other change you think is missing…' }));
  fields.push(React.createElement('label', { key: 'l2', style: HUB_INTEL_GAP_LABEL_STYLE }, 'Link to a source (a bill or legislation.gov.uk page), if you have one (optional)'));
  fields.push(React.createElement('input', { key: 'i2', type: 'url', style: HUB_INTEL_GAP_INPUT_STYLE, value: src,
    onChange: function (ev) { setSrc(ev.target.value); }, placeholder: 'https://…' }));
  fields.push(React.createElement('label', { key: 'l3', style: HUB_INTEL_GAP_LABEL_STYLE }, 'Jurisdiction (optional)'));
  fields.push(React.createElement('input', { key: 'i3', type: 'text', style: HUB_INTEL_GAP_INPUT_STYLE, value: jur,
    onChange: function (ev) { setJur(ev.target.value); }, placeholder: 'e.g. England & Wales' }));
  if (status === 'error' && err) {
    fields.push(React.createElement('div', { key: 'e', style: { color: '#F87171', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', marginTop: '10px' } }, err));
  }
  var submitDisabled = (desc || '').trim().length === 0 || status === 'submitting';
  fields.push(React.createElement('div', { key: 'act', style: { display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' } },
    React.createElement('button', { key: 'submit', type: 'submit', disabled: submitDisabled,
      style: submitDisabled ? Object.assign({}, HUB_INTEL_GAP_SUBMIT_STYLE, { opacity: 0.5, cursor: 'not-allowed' }) : HUB_INTEL_GAP_SUBMIT_STYLE },
      status === 'submitting' ? 'Submitting…' : 'Submit'),
    React.createElement('button', { key: 'cancel', type: 'button', style: HUB_INTEL_GAP_CANCEL_STYLE,
      onClick: function () { setOpen(false); setErr(''); setStatus('idle'); } }, 'Cancel')));

  return React.createElement('form', { style: HUB_INTEL_GAP_FORM_STYLE, onSubmit: submit }, fields);
}

function HubIntelHorizonView({ hubSession }) {
  var _state = useState({ status: 'loading', pipeline: [], tracked: new Set(), orgId: null, error: false });
  var state = _state[0]; var setState = _state[1];
  var _trackedOnly = useState(false);
  var trackedOnly = _trackedOnly[0]; var setTrackedOnly = _trackedOnly[1];

  useEffect(function () {
    var alive = true;
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from) { setState({ status: 'ready', pipeline: [], tracked: new Set(), orgId: null, error: true }); return; }
    // §1.1 reads — RLS-scoped via the authenticated hub client (parallel).
    Promise.all([
      sb.from('kl_legislative_horizon')
        .select('id,legislation_short_name,legislation_title,legislation_type,parliament_stage,expected_enactment,priority,status,headline_summary,key_changes,business_impact_html,preparatory_steps_html,disclaimer_text,affected_categories,source_url,display_order')
        .eq('is_published', true)
        .order('display_order', { ascending: true }),
      sb.from('org_horizon_watchlist').select('horizon_id'),
      sb.rpc('get_my_org_id'),
    ]).then(function (res) {
      if (!alive) return;
      var pipe = hubVaultUnwrap(res[0], 'kl_legislative_horizon');
      var watch = hubVaultUnwrap(res[1], 'org_horizon_watchlist');
      if (res[2] && res[2].error) console.warn('[OOX-001] Intelligence: get_my_org_id failed', res[2].error);
      var orgId = (res[2] && !res[2].error) ? res[2].data : null;
      var tracked = new Set();
      (watch.rows || []).forEach(function (w) { if (w && w.horizon_id != null) tracked.add(w.horizon_id); });
      setState({ status: 'ready', pipeline: pipe.rows || [], tracked: tracked, orgId: orgId, error: !!pipe.error });
    }).catch(function (e) {
      console.warn('[OOX-001] Intelligence facet: reads failed', e);
      if (alive) setState({ status: 'ready', pipeline: [], tracked: new Set(), orgId: null, error: true });
    });
    return function () { alive = false; };
  }, [hubSession]);

  // §1.4 track/untrack. On success update the tracked Set (re-render restyles the
  // card + button); on error console.warn and leave state unchanged (never block).
  function toggleTrack(row) {
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from || row == null || row.id == null) return;
    var id = row.id;
    var wasTracked = state.tracked.has(id);
    var op = wasTracked
      ? sb.from('org_horizon_watchlist').delete().eq('horizon_id', id)
      : sb.from('org_horizon_watchlist').insert({ org_id: state.orgId, horizon_id: id, added_by: hubSession.userId });
    Promise.resolve(op).then(function (r) {
      if (r && r.error) throw r.error;
      setState(function (prev) {
        var next = new Set(prev.tracked);
        if (wasTracked) next.delete(id); else next.add(id);
        return Object.assign({}, prev, { tracked: next });
      });
    }).catch(function (e) {
      console.warn(wasTracked ? '[OOX-001] Intelligence: untrack failed' : '[OOX-001] Intelligence: track failed', e);
    });
  }

  if (state.status === 'loading') {
    return React.createElement('div', { style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '8px 0' } }, 'Loading the forward horizon…');
  }

  var children = [];
  // §1.3 standing disclaimer — Legal Council Opinion C1 (intelligence, not advice;
  // not a complete record; absence is not assurance). Shown before reliance.
  children.push(React.createElement('div', { key: 'caveat', style: HUB_INTEL_C1_STYLE, role: 'note' },
    React.createElement('strong', { key: 's' }, 'This is regulatory intelligence to support your decisions — not legal advice.'),
    ' It is not a complete record of all applicable law, and the absence of an item here is not assurance that nothing has changed. For advice on your own situation, consult a qualified professional.'));
  // "Have we missed something?" gap control (direct insert to horizon_gap_submissions).
  children.push(React.createElement(HubIntelGapForm, { key: 'gap', hubSession: hubSession, orgId: state.orgId }));

  if (state.error) {
    // §1.6 resilient — the pipeline read failed: degrade to "—", never throw.
    children.push(React.createElement('div', { key: 'err', style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' } }, '—'));
    return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } }, children);
  }

  var pipeline = state.pipeline || [];
  if (!pipeline.length) {
    // §1.5 empty state.
    children.push(React.createElement('div', { key: 'empty', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6 } }, 'No forward legislation is currently published.'));
    return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } }, children);
  }

  // §1.5 optional "tracked only" client-side filter (default: all).
  children.push(React.createElement('div', { key: 'filter', style: HUB_INTEL_FILTER_STYLE },
    React.createElement('button', {
      type: 'button',
      style: trackedOnly ? Object.assign({}, HUB_INTEL_TOGGLE_BASE, HUB_INTEL_TOGGLE_ON) : HUB_INTEL_TOGGLE_BASE,
      'aria-pressed': trackedOnly ? 'true' : 'false',
      onClick: function () { setTrackedOnly(!trackedOnly); },
    }, trackedOnly ? 'Showing tracked only' : 'Show tracked only')));

  var rows = trackedOnly ? pipeline.filter(function (r) { return r && state.tracked.has(r.id); }) : pipeline;
  if (!rows.length) {
    children.push(React.createElement('div', { key: 'empty2', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6 } },
      trackedOnly ? 'You are not tracking any items yet.' : 'No forward legislation is currently published.'));
    return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } }, children);
  }

  children.push(React.createElement('div', { key: 'list', style: HUB_INTEL_LIST_STYLE },
    rows.map(function (row, idx) { return hubIntelCard(row, idx, state.tracked.has(row.id), toggleTrack); })));

  return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } }, children);
}

// ─── OOX-001 INTELLIGENCE-FOLD §1.2 — "In force — statutory requirements" view ───
// The in-force statutory catalogue (regulatory_requirements: global authenticated/anon
// SELECT, no org scope; plain-text columns only — there are NO *_html columns) that the
// rail feed used to surface, now folded into the Intelligence facet as its default view.
// Read on open via hubSession.sb. EVERY field renders via escaped React children — ZERO
// dangerouslySetInnerHTML (these are plain-text columns). Resilient: read error → "—" +
// console.warn, never throws. Reuses the hub Intelligence chrome (cards / chips / list /
// caveat) plus hubAceiHumanise (category) and hubVaultDate (effective_from).

// Exact §1.2 select list (mandated verbatim).
var HUB_INTEL_REQ_COLS = 'id,category,requirement_name,statutory_basis,source_act,applies_to,mandatory,jurisdiction_code,description,current_minimum,commencement_status,commencement_note,effective_from,effective_to,is_forward_requirement,version';

// "Mandatory" badge (reuses the red/high palette as a bolder, uppercase pill).
var HUB_INTEL_MAND_BADGE = { flexShrink: 0, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '999px', color: '#F87171', border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.1)' };
// Filter bar (category select + in-force/forward toggle) + the category <select>.
var HUB_INTEL_FILTERBAR_STYLE = { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' };
var HUB_INTEL_SELECT_STYLE = { cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#0A1628', color: '#CBD5E1' };
var HUB_INTEL_TOGGLE_GROUP_STYLE = { display: 'inline-flex', gap: '6px' };

// One statutory-requirement card. requirement_name; humanised category + commencement
// chips; statutory_basis / source_act meta; a Mandatory badge where mandatory === true;
// escaped description. ALL values via escaped React children — no raw-HTML sink (§1.2/§2).
function hubIntelReqCard(row, idx) {
  var children = [];
  var name = hubIntelText(row.requirement_name) || 'Untitled requirement';
  var left = [React.createElement('div', { key: 'title', style: HUB_INTEL_TITLE_STYLE }, name)];
  var metaBits = [];
  if (row.statutory_basis) metaBits.push(hubIntelText(row.statutory_basis));
  if (row.source_act) metaBits.push(hubIntelText(row.source_act));
  if (metaBits.length) left.push(React.createElement('div', { key: 'meta', style: HUB_INTEL_META_STYLE }, metaBits.join(' · ')));
  children.push(React.createElement('div', { key: 'top', style: HUB_INTEL_TOP_STYLE },
    React.createElement('div', { key: 'l', style: { minWidth: 0 } }, left),
    row.mandatory === true ? React.createElement('span', { key: 'mand', style: HUB_INTEL_MAND_BADGE }, 'Mandatory') : null
  ));

  // Humanised category chip + commencement_status chip (+ effective_from where present).
  var chips = [];
  if (row.category) chips.push(hubIntelChip(hubAceiHumanise(row.category), 'type', 'cat'));
  if (row.commencement_status) {
    var label = hubAceiHumanise(row.commencement_status);
    if (row.effective_from) label += ' · ' + hubVaultDate(row.effective_from);
    chips.push(hubIntelChip(label, null, 'cs'));
  }
  if (chips.length) children.push(React.createElement('div', { key: 'chips', style: HUB_INTEL_CHIPS_STYLE }, chips));

  // Description — escaped React children.
  if (row.description != null && hubIntelText(row.description) !== '') {
    children.push(React.createElement('div', { key: 'desc', style: HUB_INTEL_TEXT_STYLE }, hubIntelText(row.description)));
  }

  // §1.3 (OOX-CARDS) — "Discuss with Eileen": seed Eileen with this statutory
  // requirement's context (seed only; does NOT auto-send).
  var reqName = hubIntelText(row.requirement_name) || 'this requirement';
  var reqBasis = hubIntelText(row.statutory_basis);
  children.push(hubIntelDiscussBtn(
    "Explain the requirement '" + reqName + "'" + (reqBasis ? ' (' + reqBasis + ')' : '') + ' and how we comply.',
    'discuss'));

  return React.createElement('div', { key: row.id != null ? row.id : idx, style: HUB_INTEL_CARD_STYLE }, children);
}

// In-force statutory view. Reads regulatory_requirements on open (ordered category,
// requirement_name). A light category filter + an in-force/forward commencement toggle
// (via is_forward_requirement) sit above the cards. Resilient (hubVaultUnwrap → "—").
function HubIntelInForceView({ hubSession }) {
  var _state = useState({ status: 'loading', rows: [], error: false });
  var state = _state[0]; var setState = _state[1];
  var _cat = useState('all'); var cat = _cat[0]; var setCat = _cat[1];
  var _comm = useState('inforce'); var comm = _comm[0]; var setComm = _comm[1]; // 'inforce' | 'forward'

  useEffect(function () {
    var alive = true;
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from) { setState({ status: 'ready', rows: [], error: true }); return; }
    // §1.2 read — global reference table; ordered category, requirement_name.
    sb.from('regulatory_requirements')
      .select(HUB_INTEL_REQ_COLS)
      .order('category', { ascending: true })
      .order('requirement_name', { ascending: true })
      .then(function (res) {
        if (!alive) return;
        var out = hubVaultUnwrap(res, 'regulatory_requirements');
        setState({ status: 'ready', rows: out.rows || [], error: !!out.error });
      })
      .catch(function (e) {
        console.warn('[OOX-001] Intelligence in-force: read failed', e);
        if (alive) setState({ status: 'ready', rows: [], error: true });
      });
    return function () { alive = false; };
  }, [hubSession]);

  if (state.status === 'loading') {
    return React.createElement('div', { style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '8px 0' } }, 'Loading the statutory catalogue…');
  }

  var children = [];
  // Advice-free standing caveat (RULE 15), reusing the Intelligence caveat chrome.
  children.push(React.createElement('div', { key: 'caveat', style: HUB_INTEL_CAVEAT_STYLE },
    'In-force statutory requirements — reference information drawn from the regulatory catalogue. Intelligence, not advice.'));

  if (state.error) {
    // §1.3 resilient — the read failed: degrade to "—", never throw.
    children.push(React.createElement('div', { key: 'err', style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' } }, '—'));
    return React.createElement('div', null, children);
  }

  var all = state.rows || [];
  // Commencement split via is_forward_requirement (§1.2 toggle).
  var byComm = all.filter(function (r) {
    var fwd = r && r.is_forward_requirement === true;
    return comm === 'forward' ? fwd : !fwd;
  });
  // Stable category options (humanised), derived from the full catalogue.
  var catVals = []; var seenCat = {};
  all.forEach(function (r) {
    var c = r && r.category;
    if (c != null && c !== '' && !seenCat[c]) { seenCat[c] = true; catVals.push(c); }
  });
  catVals.sort(function (a, b) { var ha = hubAceiHumanise(a), hb = hubAceiHumanise(b); return ha < hb ? -1 : ha > hb ? 1 : 0; });
  var rows = cat === 'all' ? byComm : byComm.filter(function (r) { return r && String(r.category) === cat; });

  // Filter bar: category <select> + in-force/forward toggle.
  var catOptions = [React.createElement('option', { key: 'all', value: 'all' }, 'All categories')];
  catVals.forEach(function (c) { catOptions.push(React.createElement('option', { key: c, value: c }, hubAceiHumanise(c))); });
  children.push(React.createElement('div', { key: 'filter', style: HUB_INTEL_FILTERBAR_STYLE },
    React.createElement('select', {
      key: 'catsel', value: cat, 'aria-label': 'Filter by category',
      onChange: function (e) { setCat(e.target.value); }, style: HUB_INTEL_SELECT_STYLE,
    }, catOptions),
    React.createElement('div', { key: 'commtoggle', style: HUB_INTEL_TOGGLE_GROUP_STYLE },
      React.createElement('button', {
        type: 'button', 'aria-pressed': comm === 'inforce' ? 'true' : 'false',
        style: comm === 'inforce' ? Object.assign({}, HUB_INTEL_TOGGLE_BASE, HUB_INTEL_TOGGLE_ON) : HUB_INTEL_TOGGLE_BASE,
        onClick: function () { setComm('inforce'); },
      }, 'In force'),
      React.createElement('button', {
        type: 'button', 'aria-pressed': comm === 'forward' ? 'true' : 'false',
        style: comm === 'forward' ? Object.assign({}, HUB_INTEL_TOGGLE_BASE, HUB_INTEL_TOGGLE_ON) : HUB_INTEL_TOGGLE_BASE,
        onClick: function () { setComm('forward'); },
      }, 'Forward-dated')
    )
  ));

  if (!rows.length) {
    children.push(React.createElement('div', { key: 'empty', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6 } },
      comm === 'forward' ? 'No forward-dated statutory requirements match.' : 'No in-force statutory requirements match.'));
    return React.createElement('div', null, children);
  }

  children.push(React.createElement('div', { key: 'list', style: HUB_INTEL_LIST_STYLE },
    rows.map(function (row, idx) { return hubIntelReqCard(row, idx); })));

  return React.createElement('div', null, children);
}

// ─── OOX-001 INTELLIGENCE-FOLD §1.2 — the Intelligence facet: a segmented wrapper over
// two views. Default "In force" = the statutory catalogue (HubIntelInForceView;
// regulatory_requirements; escaped/plain-text — zero raw-HTML sink). "Coming into force"
// = the unchanged forward pipeline (HubIntelHorizonView; kl_legislative_horizon +
// DOMPurify *_html). The wrapper owns only the view toggle; each view reads its own data
// on mount via hubSession.sb and degrades resiliently. ───
var HUB_INTEL_VIEWS = [
  { id: 'inforce', label: 'In force — statutory requirements' },
  { id: 'horizon', label: 'Coming into force — forward pipeline' },
];
var HUB_INTEL_SEG_WRAP = { display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' };
var HUB_INTEL_SEG_BASE = { flex: '1 1 220px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, padding: '9px 14px', borderRadius: '8px', border: '1px solid #1E3A5F', background: '#0A1628', color: '#94A3B8', textAlign: 'center' };
var HUB_INTEL_SEG_ON = { color: '#F1F5F9', borderColor: '#0EA5E9', background: 'rgba(14,165,233,0.14)' };

function HubIntelFacet({ hubSession }) {
  var _view = useState('inforce'); // §1.2 default to "In force"
  var view = _view[0]; var setView = _view[1];

  var seg = React.createElement('div', { key: 'seg', style: HUB_INTEL_SEG_WRAP, role: 'tablist', 'aria-label': 'Intelligence views' },
    HUB_INTEL_VIEWS.map(function (v) {
      var on = view === v.id;
      return React.createElement('button', {
        key: v.id, type: 'button', role: 'tab', 'aria-selected': on ? 'true' : 'false',
        style: on ? Object.assign({}, HUB_INTEL_SEG_BASE, HUB_INTEL_SEG_ON) : HUB_INTEL_SEG_BASE,
        onClick: function () { setView(v.id); },
      }, v.label);
    }));

  return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } },
    seg,
    view === 'inforce'
      ? React.createElement(HubIntelInForceView, { key: 'inforce', hubSession: hubSession })
      : React.createElement(HubIntelHorizonView, { key: 'horizon', hubSession: hubSession })
  );
}

// ─── OOX-001 KL-Hub Notes facet (KL-HUB §5 step 6, realised as a hub facet —
// AILANE-CC-BRIEF-OOX-KL-HUB-NOTES-FACET-001) ───
// A CRUD surface over the user's OWN notes (kl_workspace_notes). Reads + writes
// flow through the hub session's authenticated client (hubSession.sb) — no
// service key; RLS auto-scopes every row to the caller (user_id = auth.uid(),
// full select/insert/update/delete, WITH CHECK user_id = auth.uid()). Inserts set
// user_id = hubSession.userId, content_json = {} (NOT NULL), note_type = 'note'
// (NOT NULL CHECK), project_id left null (standalone notes). ALL server values
// render via React children (auto-escaped) — no raw-HTML sink anywhere in this
// facet (notes are plain text; KL-HUB §1.4 / §2 security). Mirrors the Intelligence facet's
// direct-sb write pattern (insert/update/delete + optimistic state) and the
// matter bar's inline edit / confirm-delete chrome. Resilient: any write error
// console.warns, leaves state unchanged + shows a brief inline note; never blocks.

var HUB_NOTES_COLS = 'id,title,content_plain,pinned,note_type,updated_at,created_at';

// Notes chrome — reuses the hub palette (card / input / button styles mirror the
// matter bar + the other facets).
var HUB_NOTES_CARD_STYLE = { background: '#0F1D32', border: '1px solid #1E3A5F', borderRadius: '12px', padding: '16px 18px' };
var HUB_NOTES_CARD_PINNED = { borderColor: 'rgba(14,165,233,0.45)', borderLeft: '2px solid #38BDF8', background: 'rgba(14,165,233,0.06)' };
var HUB_NOTES_LIST_STYLE = { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' };
var HUB_NOTES_TITLE_STYLE = { fontFamily: "'DM Sans', sans-serif", fontSize: '15px', fontWeight: 700, color: '#F1F5F9', wordBreak: 'break-word' };
var HUB_NOTES_SNIPPET_STYLE = { marginTop: '6px', color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
var HUB_NOTES_META_STYLE = { marginTop: '8px', color: '#64748B', fontFamily: "'DM Mono', monospace", fontSize: '11px' };
var HUB_NOTES_PIN_TAG = { display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, color: '#38BDF8', background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '999px', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 600, padding: '2px 9px', whiteSpace: 'nowrap' };
var HUB_NOTES_INPUT_STYLE = { width: '100%', background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: '6px', color: '#F1F5F9', fontSize: '13px', padding: '8px 10px', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' };
var HUB_NOTES_TEXTAREA_STYLE = Object.assign({}, HUB_NOTES_INPUT_STYLE, { resize: 'vertical', marginTop: '8px' });
var HUB_NOTES_ACTIONS_STYLE = { display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' };
var HUB_NOTES_ERR_STYLE = { color: '#F87171', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', marginTop: '8px' };

// Sort: pinned first, then most-recently-updated (mirrors the §1.1 query order;
// re-applied after every mutation so the list re-orders without a re-query).
function hubNotesSort(notes) {
  return (notes || []).slice().sort(function (a, b) {
    var ap = a && a.pinned ? 1 : 0;
    var bp = b && b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    var au = a && a.updated_at ? String(a.updated_at) : '';
    var bu = b && b.updated_at ? String(b.updated_at) : '';
    if (au < bu) return 1;
    if (au > bu) return -1;
    return 0;
  });
}

// Content preview for a card (escaped at render via React children).
function hubNotesSnippet(text) {
  if (text == null) return '';
  var s = String(text).trim();
  if (s.length <= 200) return s;
  return s.slice(0, 200).replace(/\s+\S*$/, '') + '…';
}

// One note card. Default view: title (or "Untitled"), a content snippet, the
// updated date, a pin tag, and Pin / Edit / Delete controls. Edit → inline
// title/content fields (§1.3); Delete → a confirm step (§1.4); Pin toggles
// pinned (§1.5). All server values via escaped React children. Writes go through
// hubSession.sb (RLS scopes to the owner); on error console.warn + a brief inline
// note, state unchanged (§1.6).
function HubNoteCard({ note, hubSession, onChanged, onRemoved }) {
  var _mode = useState(null); var mode = _mode[0]; var setMode = _mode[1]; // null | 'edit' | 'delete'
  var _title = useState(note.title || ''); var title = _title[0]; var setTitle = _title[1];
  var _content = useState(note.content_plain || ''); var content = _content[0]; var setContent = _content[1];
  var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
  var _err = useState(''); var err = _err[0]; var setErr = _err[1];

  function sbReady() { var sb = hubSession && hubSession.sb; return (sb && sb.from) ? sb : null; }

  // §1.3 Edit — update title/content + updated_at; refresh that row on success.
  function saveEdit() {
    var sb = sbReady(); if (!sb) return;
    var t = (title || '').trim();
    var c = (content || '').trim();
    if (!c) { setErr('Note content cannot be empty.'); return; }
    setBusy(true); setErr('');
    sb.from('kl_workspace_notes')
      .update({ title: t || null, content_plain: c, updated_at: new Date().toISOString() })
      .eq('id', note.id)
      .select(HUB_NOTES_COLS).single()
      .then(function (r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        setMode(null);
        onChanged((r && r.data) || Object.assign({}, note, { title: t || null, content_plain: c }));
      })
      .catch(function (e) { setBusy(false); console.warn('[OOX-001] Notes: edit failed', e); setErr('Could not save changes. Please try again.'); });
  }

  // §1.4 Delete (after the confirm step) — remove from the list on success.
  function doDelete() {
    var sb = sbReady(); if (!sb) return;
    setBusy(true); setErr('');
    sb.from('kl_workspace_notes').delete().eq('id', note.id)
      .then(function (r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        onRemoved(note.id);
      })
      .catch(function (e) { setBusy(false); console.warn('[OOX-001] Notes: delete failed', e); setErr('Could not delete this note. Please try again.'); setMode(null); });
  }

  // §1.5 Pin toggle — flip pinned + bump updated_at; re-sort on success.
  function togglePin() {
    var sb = sbReady(); if (!sb) return;
    var next = !note.pinned;
    setBusy(true);
    sb.from('kl_workspace_notes')
      .update({ pinned: next, updated_at: new Date().toISOString() })
      .eq('id', note.id)
      .select(HUB_NOTES_COLS).single()
      .then(function (r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        onChanged((r && r.data) || Object.assign({}, note, { pinned: next }));
      })
      .catch(function (e) { setBusy(false); console.warn('[OOX-001] Notes: pin toggle failed', e); });
  }

  var cardStyle = note.pinned ? Object.assign({}, HUB_NOTES_CARD_STYLE, HUB_NOTES_CARD_PINNED) : HUB_NOTES_CARD_STYLE;

  if (mode === 'edit') {
    return React.createElement('div', { style: cardStyle },
      React.createElement('input', {
        type: 'text', value: title, maxLength: 200, placeholder: 'Title (optional)', 'aria-label': 'Note title',
        onChange: function (e) { setTitle(e.target.value); },
        style: HUB_NOTES_INPUT_STYLE,
      }),
      React.createElement('textarea', {
        value: content, rows: 4, placeholder: 'Write your note…', 'aria-label': 'Note content',
        onChange: function (e) { setContent(e.target.value); },
        style: HUB_NOTES_TEXTAREA_STYLE,
      }),
      err ? React.createElement('div', { style: HUB_NOTES_ERR_STYLE }, err) : null,
      React.createElement('div', { style: HUB_NOTES_ACTIONS_STYLE },
        React.createElement('button', { type: 'button', disabled: busy || !content.trim(), style: HUB_MATTER_BTN_PRIMARY, onClick: saveEdit }, busy ? 'Saving…' : 'Save'),
        React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function () { setMode(null); setTitle(note.title || ''); setContent(note.content_plain || ''); setErr(''); } }, 'Cancel')
      )
    );
  }

  if (mode === 'delete') {
    return React.createElement('div', { style: cardStyle },
      React.createElement('div', { style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', lineHeight: 1.5 } }, 'Delete this note? This cannot be undone.'),
      err ? React.createElement('div', { style: HUB_NOTES_ERR_STYLE }, err) : null,
      React.createElement('div', { style: HUB_NOTES_ACTIONS_STYLE },
        React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_DANGER, onClick: doDelete }, busy ? 'Deleting…' : 'Confirm delete'),
        React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function () { setMode(null); setErr(''); } }, 'Cancel')
      )
    );
  }

  // Default view.
  var children = [
    React.createElement('div', { key: 'hdr', style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' } },
      React.createElement('div', { style: { minWidth: 0 } },
        React.createElement('div', { style: HUB_NOTES_TITLE_STYLE }, note.title ? note.title : 'Untitled')),
      note.pinned ? React.createElement('span', { style: HUB_NOTES_PIN_TAG }, '📌 Pinned') : null
    ),
  ];
  var snip = hubNotesSnippet(note.content_plain);
  if (snip) children.push(React.createElement('div', { key: 'snip', style: HUB_NOTES_SNIPPET_STYLE }, snip));
  children.push(React.createElement('div', { key: 'meta', style: HUB_NOTES_META_STYLE }, 'Updated ' + hubVaultDate(note.updated_at)));
  if (err) children.push(React.createElement('div', { key: 'err', style: HUB_NOTES_ERR_STYLE }, err));
  children.push(React.createElement('div', { key: 'actions', style: HUB_NOTES_ACTIONS_STYLE },
    React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, 'aria-pressed': note.pinned ? 'true' : 'false', onClick: togglePin }, note.pinned ? 'Unpin' : 'Pin'),
    React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function () { setTitle(note.title || ''); setContent(note.content_plain || ''); setErr(''); setMode('edit'); } }, 'Edit'),
    React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_DANGER, onClick: function () { setErr(''); setMode('delete'); } }, 'Delete')
  ));

  return React.createElement('div', { style: cardStyle }, children);
}

// Notes facet body. Lists the user's own notes on open (§1.1, RLS-scoped), with a
// "New note" capture form below (§1.2). Pinned first; empty state present. The
// list is held in state and reconciled in place after each create/edit/delete/pin
// (no re-query needed). Mirrors the other facets' shape (alive-guarded read,
// loading line, resilient unwrap, max-width container, reused hub chrome).
function HubNotesFacet({ hubSession }) {
  var _state = useState({ status: 'loading', notes: [], error: false });
  var state = _state[0]; var setState = _state[1];
  var _nt = useState(''); var newTitle = _nt[0]; var setNewTitle = _nt[1];
  var _nc = useState(''); var newContent = _nc[0]; var setNewContent = _nc[1];
  var _cb = useState(false); var creating = _cb[0]; var setCreating = _cb[1];
  var _ce = useState(''); var createErr = _ce[0]; var setCreateErr = _ce[1];

  // §1.1 list read — RLS returns only the caller's own notes (parallel-safe).
  useEffect(function () {
    var alive = true;
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from) { setState({ status: 'ready', notes: [], error: true }); return; }
    sb.from('kl_workspace_notes')
      .select(HUB_NOTES_COLS)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(100)
      .then(function (res) {
        if (!alive) return;
        var un = hubVaultUnwrap(res, 'kl_workspace_notes');
        if (un.error) { setState({ status: 'ready', notes: [], error: true }); return; }
        setState({ status: 'ready', notes: hubNotesSort(un.rows || []), error: false });
      })
      .catch(function (e) {
        console.warn('[OOX-001] Notes facet: read failed', e);
        if (alive) setState({ status: 'ready', notes: [], error: true });
      });
    return function () { alive = false; };
  }, [hubSession]);

  // §1.2 Create — insert the caller's note (content_json {}, note_type 'note',
  // user_id = hubSession.userId; project_id omitted/null) → prepend + clear.
  function createNote() {
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from) return;
    var t = (newTitle || '').trim();
    var c = (newContent || '').trim();
    if (!c) { setCreateErr('Write something to save.'); return; }
    setCreating(true); setCreateErr('');
    sb.from('kl_workspace_notes')
      .insert({ user_id: hubSession.userId, title: t || null, content_plain: c, content_json: {}, note_type: 'note', pinned: false })
      .select(HUB_NOTES_COLS).single()
      .then(function (r) {
        setCreating(false);
        if (r && r.error) throw r.error;
        var row = r && r.data;
        if (!row) { setCreateErr('Could not save the note. Please try again.'); return; }
        setNewTitle(''); setNewContent('');
        setState(function (prev) { return { status: 'ready', notes: hubNotesSort([row].concat(prev.notes || [])), error: prev.error }; });
      })
      .catch(function (e) { setCreating(false); console.warn('[OOX-001] Notes: create failed', e); setCreateErr('Could not save the note. Please try again.'); });
  }

  // Reconcile a single mutated row / removal into the list (re-sort on change).
  function handleChanged(row) {
    if (!row || row.id == null) return;
    setState(function (prev) {
      var next = (prev.notes || []).map(function (n) { return n.id === row.id ? row : n; });
      return Object.assign({}, prev, { notes: hubNotesSort(next) });
    });
  }
  function handleRemoved(id) {
    setState(function (prev) {
      return Object.assign({}, prev, { notes: (prev.notes || []).filter(function (n) { return n.id !== id; }) });
    });
  }

  if (state.status === 'loading') {
    return React.createElement('div', { style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '8px 0' } }, 'Loading your notes…');
  }

  var children = [];
  var notes = state.notes || [];
  if (state.error) {
    // §1.6 resilient — the read failed: a brief inline note, but the New-note form
    // below still works.
    children.push(React.createElement('div', { key: 'err', style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', marginBottom: '16px' } }, 'Could not load your notes just now.'));
  } else if (!notes.length) {
    // §1.1 empty state.
    children.push(React.createElement('div', { key: 'empty', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' } }, 'No notes yet — capture your first below.'));
  } else {
    children.push(React.createElement('div', { key: 'list', style: HUB_NOTES_LIST_STYLE },
      notes.map(function (n) {
        return React.createElement(HubNoteCard, { key: n.id, note: n, hubSession: hubSession, onChanged: handleChanged, onRemoved: handleRemoved });
      })));
  }

  // §1.2 "New note" capture form (below the list).
  children.push(React.createElement('div', { key: 'newform', style: HUB_NOTES_CARD_STYLE },
    React.createElement('div', { key: 'h', style: HUB_ACEI_SECTION_H }, 'New note'),
    React.createElement('input', {
      key: 'title', type: 'text', value: newTitle, maxLength: 200, placeholder: 'Title (optional)', 'aria-label': 'New note title',
      onChange: function (e) { setNewTitle(e.target.value); },
      style: HUB_NOTES_INPUT_STYLE,
    }),
    React.createElement('textarea', {
      key: 'content', value: newContent, rows: 3, placeholder: 'Write a note…', 'aria-label': 'New note content',
      onChange: function (e) { setNewContent(e.target.value); },
      style: HUB_NOTES_TEXTAREA_STYLE,
    }),
    createErr ? React.createElement('div', { key: 'err', style: HUB_NOTES_ERR_STYLE }, createErr) : null,
    React.createElement('div', { key: 'actions', style: HUB_NOTES_ACTIONS_STYLE },
      React.createElement('button', { type: 'button', disabled: creating || !newContent.trim(), style: HUB_MATTER_BTN_PRIMARY, onClick: createNote }, creating ? 'Saving…' : 'Save note')
    )
  ));

  return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } }, children);
}

// ─── OOX-001 KL-Hub Calendar facet (KL-HUB §5 step 7, realised as a hub facet —
// AILANE-CC-BRIEF-OOX-KL-HUB-CALENDAR-FACET-001) ───
// A CRUD surface over the tenant's upcoming compliance dates (kl_calendar_events).
// Reads + writes flow through the hub session's authenticated client (hubSession.sb)
// — no service key; RLS auto-scopes every row (full CRUD on own events where
// auth.uid() = user_id, plus READ of org_shared rows for the caller's org). Inserts
// set user_id = hubSession.userId (satisfies WITH CHECK), a CHECK-valid event_type /
// status ('active') / visibility / recurrence enum, and event_date; org-shared inserts
// carry org_id from get_my_org_id() (fetched once on mount, mirror HubIntelFacet). V1
// is a date-ordered LIST (not a month grid, no recurrence expansion). Edit / delete /
// status controls are gated to the OWNER (event.user_id === hubSession.userId);
// org-shared events owned by a peer render read-only. ALL server values render via
// React children (auto-escaped) — no raw-HTML sink anywhere in this facet (KL-HUB §1.4
// / §2 security). Resilient: any write error console.warns, leaves state unchanged +
// shows a brief inline note; never blocks. Mirrors HubNotesFacet's CRUD + form shape
// and the matter bar's inline-edit / confirm-delete chrome.

var HUB_CAL_COLS = 'id,event_type,title,description,event_date,end_date,recurrence,visibility,status,user_id';

// Allowed enum values (CHECK-constrained) surfaced as humanised <select> options.
var HUB_CAL_TYPE_OPTS = [
  { v: 'policy_renewal',    l: 'Policy renewal' },
  { v: 'training_deadline', l: 'Training deadline' },
  { v: 'board_reporting',   l: 'Board reporting' },
  { v: 'appraisal_cycle',   l: 'Appraisal cycle' },
  { v: 'probation_review',  l: 'Probation review' },
  { v: 'custom',            l: 'Custom' },
];
var HUB_CAL_TYPE_LABELS = { policy_renewal: 'Policy renewal', training_deadline: 'Training deadline', board_reporting: 'Board reporting', appraisal_cycle: 'Appraisal cycle', probation_review: 'Probation review', custom: 'Custom' };
var HUB_CAL_REC_OPTS = [
  { v: 'none',      l: 'No recurrence' },
  { v: 'monthly',   l: 'Monthly' },
  { v: 'quarterly', l: 'Quarterly' },
  { v: 'biannual',  l: 'Biannual' },
  { v: 'annual',    l: 'Annual' },
];
var HUB_CAL_REC_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', biannual: 'Biannual', annual: 'Annual' };

// Calendar chrome — reuses the hub palette (cards/inputs/buttons mirror Notes + the
// matter bar; pills/chips/visibility tags mirror the Vault facet).
var HUB_CAL_DATE_STYLE = { fontFamily: "'DM Mono', monospace", fontSize: '14px', fontWeight: 700, color: '#F1F5F9', letterSpacing: '0.02em', whiteSpace: 'nowrap' };
var HUB_CAL_DATE_OVERDUE = { color: '#F87171' };
var HUB_CAL_OVERDUE_TAG = { display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, color: '#F87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: '999px', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 600, padding: '2px 9px', whiteSpace: 'nowrap' };
var HUB_CAL_TITLE_STYLE = { marginTop: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '15px', fontWeight: 700, color: '#F1F5F9', wordBreak: 'break-word' };
var HUB_CAL_REC_TAG = { display: 'inline-block', fontFamily: "'DM Mono', monospace", fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', color: '#94A3B8', whiteSpace: 'nowrap', background: 'rgba(148,163,184,0.08)', border: '1px solid #1E3A5F', padding: '2px 8px', borderRadius: '6px' };
var HUB_CAL_META_ROW = { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' };
var HUB_CAL_DESC_STYLE = { marginTop: '10px', color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '13.5px', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
var HUB_CAL_FIELD_LABEL = { color: '#64748B', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', margin: '10px 0 4px' };
var HUB_CAL_SELECT_STYLE = Object.assign({}, HUB_NOTES_INPUT_STYLE, { cursor: 'pointer' });
var HUB_CAL_CHECKBOX_ROW = { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', cursor: 'pointer' };
var HUB_CAL_SHARED_NOTE = { marginTop: '12px', color: '#64748B', fontFamily: "'DM Mono', monospace", fontSize: '11px' };
var HUB_CAL_STATUS_CLASS = { active: 'busy', completed: 'ok', snoozed: 'idle', cancelled: 'idle' };

// Humanisers (escaped at render via React children).
function hubCalTypeLabel(t) { var k = String(t == null ? '' : t).toLowerCase(); return HUB_CAL_TYPE_LABELS[k] || hubAceiHumanise(t); }
function hubCalRecLabel(r) { var k = String(r == null ? '' : r).toLowerCase(); if (!k || k === 'none') return ''; return HUB_CAL_REC_LABELS[k] || hubAceiHumanise(r); }

// Today's local date as 'YYYY-MM-DD'. event_date is a date column, so a lexicographic
// compare of ISO date strings is a safe overdue test (no Date/tz round-trip).
function hubCalTodayStr() {
  var d = new Date();
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
// date-only 'YYYY-MM-DD' -> en-GB short, built from parts (no UTC parse -> no tz
// off-by-one). Non-date input passes through unchanged.
function hubCalDate(dateStr) {
  if (!dateStr) return '—';
  var s = String(dateStr);
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  try {
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return s; }
}
function hubCalIsOverdue(ev) {
  if (!ev || !ev.event_date) return false;
  if (String(ev.status) !== 'active') return false;
  return String(ev.event_date) < hubCalTodayStr();
}
// Date-ascending sort (§1.1); title tie-break for stability. Re-applied after every
// mutation so the list re-orders without a re-query.
function hubCalSort(events) {
  return (events || []).slice().sort(function (a, b) {
    var ad = a && a.event_date ? String(a.event_date) : '';
    var bd = b && b.event_date ? String(b.event_date) : '';
    if (ad < bd) return -1;
    if (ad > bd) return 1;
    var at = a && a.title ? String(a.title) : '';
    var bt = b && b.title ? String(b.title) : '';
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
}
function hubCalStatusPill(status, key) {
  var cls = HUB_CAL_STATUS_CLASS[String(status == null ? '' : status).toLowerCase()] || 'idle';
  return React.createElement('span', { key: key, style: Object.assign({}, HUB_VAULT_PILL_BASE, HUB_VAULT_PILL_STYLES[cls]) }, hubAceiHumanise(status || 'active'));
}
function hubCalVisTag(vis, key) {
  var isOrg = String(vis == null ? '' : vis).toLowerCase() === 'org_shared';
  return React.createElement('span', { key: key, style: isOrg ? Object.assign({}, HUB_VAULT_VIS_BASE, HUB_VAULT_VIS_ORG) : HUB_VAULT_VIS_BASE }, isOrg ? 'org' : 'personal');
}
// Constrained <select> (options from a CHECK enum). Optional disabled placeholder.
function hubCalSelectEl(key, value, onChange, opts, ariaLabel, placeholder) {
  var children = [];
  if (placeholder != null) children.push(React.createElement('option', { key: '__ph', value: '', disabled: true }, placeholder));
  opts.forEach(function (o) { children.push(React.createElement('option', { key: o.v, value: o.v }, o.l)); });
  return React.createElement('select', { key: key, value: value, 'aria-label': ariaLabel, onChange: onChange, style: HUB_CAL_SELECT_STYLE }, children);
}

// One event card. Default view: prominent date (overdue flagged), title, a humanised
// type chip + optional recurrence tag + visibility tag, status pill, escaped
// description, and — for the OWNER only — status / Edit / Delete controls. Edit ->
// inline fields (§1.3); Delete -> confirm step (§1.4); status -> complete/snooze/reopen
// (§1.4). Peer org-shared rows render read-only. Writes go through hubSession.sb (RLS);
// on error console.warn + a brief inline note, state unchanged (§1.5).
function HubCalEventCard({ event, hubSession, orgId, isOwner, onChanged, onRemoved }) {
  var _mode = useState(null); var mode = _mode[0]; var setMode = _mode[1]; // null | 'edit' | 'delete'
  var _title = useState(event.title || ''); var title = _title[0]; var setTitle = _title[1];
  var _etype = useState(event.event_type || ''); var etype = _etype[0]; var setEtype = _etype[1];
  var _edate = useState(event.event_date || ''); var edate = _edate[0]; var setEdate = _edate[1];
  var _desc = useState(event.description || ''); var desc = _desc[0]; var setDesc = _desc[1];
  var _recur = useState(event.recurrence || 'none'); var recur = _recur[0]; var setRecur = _recur[1];
  var _share = useState(String(event.visibility || '') === 'org_shared'); var share = _share[0]; var setShare = _share[1];
  var _busy = useState(false); var busy = _busy[0]; var setBusy = _busy[1];
  var _err = useState(''); var err = _err[0]; var setErr = _err[1];

  function sbReady() { var sb = hubSession && hubSession.sb; return (sb && sb.from) ? sb : null; }
  function resetEdit() { setTitle(event.title || ''); setEtype(event.event_type || ''); setEdate(event.event_date || ''); setDesc(event.description || ''); setRecur(event.recurrence || 'none'); setShare(String(event.visibility || '') === 'org_shared'); setErr(''); }

  // §1.3 Edit — update the row + updated_at; refresh that row on success. org_id is
  // set from the visibility toggle (data contract: org-shared rows carry org_id; the
  // create path sets it too) — null for personal.
  function saveEdit() {
    var sb = sbReady(); if (!sb) return;
    var t = (title || '').trim();
    var d = (edate || '').trim();
    if (!t) { setErr('A title is required.'); return; }
    if (!etype) { setErr('Choose an event type.'); return; }
    if (!d) { setErr('A date is required.'); return; }
    var shareOrg = !!share;
    if (shareOrg && orgId == null) { setErr('Could not confirm your organisation — please try again.'); return; }
    setBusy(true); setErr('');
    var recVal = (recur && recur !== 'none') ? recur : null;
    sb.from('kl_calendar_events')
      .update({ title: t, event_type: etype, event_date: d, description: (desc || '').trim() || null, recurrence: recVal, visibility: shareOrg ? 'org_shared' : 'personal', org_id: shareOrg ? orgId : null, updated_at: new Date().toISOString() })
      .eq('id', event.id)
      .select(HUB_CAL_COLS).single()
      .then(function (r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        setMode(null);
        onChanged((r && r.data) || Object.assign({}, event, { title: t, event_type: etype, event_date: d, description: (desc || '').trim() || null, recurrence: recVal, visibility: shareOrg ? 'org_shared' : 'personal' }));
      })
      .catch(function (e) { setBusy(false); console.warn('[OOX-001] Calendar: edit failed', e); setErr('Could not save changes. Please try again.'); });
  }

  // §1.4 Delete (after the confirm step) — remove from the list on success.
  function doDelete() {
    var sb = sbReady(); if (!sb) return;
    setBusy(true); setErr('');
    sb.from('kl_calendar_events').delete().eq('id', event.id)
      .then(function (r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        onRemoved(event.id);
      })
      .catch(function (e) { setBusy(false); console.warn('[OOX-001] Calendar: delete failed', e); setErr('Could not delete this date. Please try again.'); setMode(null); });
  }

  // §1.4 Status — mark completed / snoozed, or reopen to active. Enum-constrained;
  // bumps updated_at (mirrors the Notes pin-toggle write).
  function setStatus(next) {
    var sb = sbReady(); if (!sb) return;
    setBusy(true); setErr('');
    sb.from('kl_calendar_events')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', event.id)
      .select(HUB_CAL_COLS).single()
      .then(function (r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        onChanged((r && r.data) || Object.assign({}, event, { status: next }));
      })
      .catch(function (e) { setBusy(false); console.warn('[OOX-001] Calendar: status update failed', e); setErr('Could not update the status. Please try again.'); });
  }

  var overdue = hubCalIsOverdue(event);
  var cardStyle = overdue ? Object.assign({}, HUB_VAULT_CARD_STYLE, { borderLeft: '2px solid rgba(248,113,113,0.5)' }) : HUB_VAULT_CARD_STYLE;

  if (mode === 'edit') {
    return React.createElement('div', { style: cardStyle },
      React.createElement('div', { style: HUB_CAL_FIELD_LABEL }, 'Title'),
      React.createElement('input', { type: 'text', value: title, maxLength: 200, placeholder: 'What is due?', 'aria-label': 'Event title', onChange: function (e) { setTitle(e.target.value); }, style: HUB_NOTES_INPUT_STYLE }),
      React.createElement('div', { style: HUB_CAL_FIELD_LABEL }, 'Type'),
      hubCalSelectEl('etype', etype, function (e) { setEtype(e.target.value); }, HUB_CAL_TYPE_OPTS, 'Event type', 'Select type…'),
      React.createElement('div', { style: HUB_CAL_FIELD_LABEL }, 'Date'),
      React.createElement('input', { type: 'date', value: edate || '', 'aria-label': 'Event date', onChange: function (e) { setEdate(e.target.value); }, style: HUB_NOTES_INPUT_STYLE }),
      React.createElement('div', { style: HUB_CAL_FIELD_LABEL }, 'Description (optional)'),
      React.createElement('textarea', { value: desc, rows: 3, placeholder: 'Add any detail…', 'aria-label': 'Event description', onChange: function (e) { setDesc(e.target.value); }, style: HUB_NOTES_TEXTAREA_STYLE }),
      React.createElement('div', { style: HUB_CAL_FIELD_LABEL }, 'Recurrence'),
      hubCalSelectEl('erec', recur, function (e) { setRecur(e.target.value); }, HUB_CAL_REC_OPTS, 'Recurrence', null),
      React.createElement('label', { style: HUB_CAL_CHECKBOX_ROW },
        React.createElement('input', { type: 'checkbox', checked: share, 'aria-label': 'Share with organisation', onChange: function (e) { setShare(e.target.checked); } }),
        'Share with organisation'),
      err ? React.createElement('div', { style: HUB_NOTES_ERR_STYLE }, err) : null,
      React.createElement('div', { style: HUB_NOTES_ACTIONS_STYLE },
        React.createElement('button', { type: 'button', disabled: busy || !title.trim() || !etype || !edate, style: HUB_MATTER_BTN_PRIMARY, onClick: saveEdit }, busy ? 'Saving…' : 'Save'),
        React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function () { setMode(null); resetEdit(); } }, 'Cancel')
      )
    );
  }

  if (mode === 'delete') {
    return React.createElement('div', { style: cardStyle },
      React.createElement('div', { style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', lineHeight: 1.5 } }, 'Delete this date? This cannot be undone.'),
      err ? React.createElement('div', { style: HUB_NOTES_ERR_STYLE }, err) : null,
      React.createElement('div', { style: HUB_NOTES_ACTIONS_STYLE },
        React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_DANGER, onClick: doDelete }, busy ? 'Deleting…' : 'Confirm delete'),
        React.createElement('button', { type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function () { setMode(null); setErr(''); } }, 'Cancel')
      )
    );
  }

  // Default view.
  var recLabel = hubCalRecLabel(event.recurrence);
  var children = [
    React.createElement('div', { key: 'top', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 } },
        React.createElement('span', { style: overdue ? Object.assign({}, HUB_CAL_DATE_STYLE, HUB_CAL_DATE_OVERDUE) : HUB_CAL_DATE_STYLE }, hubCalDate(event.event_date)),
        overdue ? React.createElement('span', { style: HUB_CAL_OVERDUE_TAG }, 'Overdue') : null
      ),
      hubCalStatusPill(event.status, 'st')
    ),
    React.createElement('div', { key: 'title', style: HUB_CAL_TITLE_STYLE }, event.title ? event.title : 'Untitled'),
    React.createElement('div', { key: 'meta', style: HUB_CAL_META_ROW },
      React.createElement('span', { key: 'type', style: HUB_VAULT_CHIP_STYLE }, hubCalTypeLabel(event.event_type)),
      recLabel ? React.createElement('span', { key: 'rec', style: HUB_CAL_REC_TAG }, '↻ ' + recLabel) : null,
      hubCalVisTag(event.visibility, 'vis')
    ),
  ];
  if (event.description) children.push(React.createElement('div', { key: 'desc', style: HUB_CAL_DESC_STYLE }, event.description));
  if (err) children.push(React.createElement('div', { key: 'err', style: HUB_NOTES_ERR_STYLE }, err));
  if (isOwner) {
    var actions = [];
    if (String(event.status) === 'active') {
      actions.push(React.createElement('button', { key: 'done', type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function () { setStatus('completed'); } }, 'Mark complete'));
      actions.push(React.createElement('button', { key: 'snooze', type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function () { setStatus('snoozed'); } }, 'Snooze'));
    } else {
      actions.push(React.createElement('button', { key: 'reopen', type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function () { setStatus('active'); } }, 'Reopen'));
    }
    actions.push(React.createElement('button', { key: 'edit', type: 'button', disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function () { resetEdit(); setMode('edit'); } }, 'Edit'));
    actions.push(React.createElement('button', { key: 'del', type: 'button', disabled: busy, style: HUB_MATTER_BTN_DANGER, onClick: function () { setErr(''); setMode('delete'); } }, 'Delete'));
    children.push(React.createElement('div', { key: 'actions', style: HUB_NOTES_ACTIONS_STYLE }, actions));
  } else {
    children.push(React.createElement('div', { key: 'shared', style: HUB_CAL_SHARED_NOTE }, 'Shared by your organisation · read-only'));
  }

  return React.createElement('div', { style: cardStyle }, children);
}

// Calendar facet body. Lists the tenant's upcoming dates on open (§1.1, RLS returns
// own + org-shared, date-ascending), with a "New date" form below (§1.2). org_id for
// org-shared writes is resolved once via get_my_org_id() (mirror HubIntelFacet). The
// list is held in state and reconciled in place after each create/edit/delete/status
// change (re-sorted by date; no re-query). Mirrors the other facets' shape
// (alive-guarded read, loading line, resilient unwrap, max-width container, reused hub
// chrome).
function HubCalendarFacet({ hubSession }) {
  var _state = useState({ status: 'loading', events: [], orgId: null, error: false });
  var state = _state[0]; var setState = _state[1];
  var _nt = useState(''); var nTitle = _nt[0]; var setNTitle = _nt[1];
  var _ntype = useState(''); var nType = _ntype[0]; var setNType = _ntype[1];
  var _ndate = useState(''); var nDate = _ndate[0]; var setNDate = _ndate[1];
  var _ndesc = useState(''); var nDesc = _ndesc[0]; var setNDesc = _ndesc[1];
  var _nrec = useState('none'); var nRec = _nrec[0]; var setNRec = _nrec[1];
  var _nshare = useState(false); var nShare = _nshare[0]; var setNShare = _nshare[1];
  var _cb = useState(false); var creating = _cb[0]; var setCreating = _cb[1];
  var _ce = useState(''); var createErr = _ce[0]; var setCreateErr = _ce[1];

  // §1.1 list read (own + org-shared, date-ascending) + one-shot get_my_org_id for
  // org-shared writes (parallel; RLS-scoped via the authenticated hub client).
  useEffect(function () {
    var alive = true;
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from) { setState({ status: 'ready', events: [], orgId: null, error: true }); return; }
    Promise.all([
      sb.from('kl_calendar_events').select(HUB_CAL_COLS).neq('status', 'cancelled').order('event_date', { ascending: true }).limit(100),
      sb.rpc('get_my_org_id'),
    ]).then(function (res) {
      if (!alive) return;
      var un = hubVaultUnwrap(res[0], 'kl_calendar_events');
      if (res[1] && res[1].error) console.warn('[OOX-001] Calendar: get_my_org_id failed', res[1].error);
      var orgId = (res[1] && !res[1].error) ? res[1].data : null;
      if (un.error) { setState({ status: 'ready', events: [], orgId: orgId, error: true }); return; }
      setState({ status: 'ready', events: hubCalSort(un.rows || []), orgId: orgId, error: false });
    }).catch(function (e) {
      console.warn('[OOX-001] Calendar facet: reads failed', e);
      if (alive) setState({ status: 'ready', events: [], orgId: null, error: true });
    });
    return function () { alive = false; };
  }, [hubSession]);

  // §1.2 Create — insert the caller's event (user_id = hubSession.userId) → add to the
  // list (re-sorted by date) + clear the form. Require title + event_type + event_date.
  function createEvent() {
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from) return;
    var t = (nTitle || '').trim();
    var d = (nDate || '').trim();
    if (!t) { setCreateErr('A title is required.'); return; }
    if (!nType) { setCreateErr('Choose an event type.'); return; }
    if (!d) { setCreateErr('A date is required.'); return; }
    var shareOrg = !!nShare;
    if (shareOrg && state.orgId == null) { setCreateErr('Could not confirm your organisation — please try again.'); return; }
    setCreating(true); setCreateErr('');
    var recVal = (nRec && nRec !== 'none') ? nRec : null;
    sb.from('kl_calendar_events')
      .insert({ user_id: hubSession.userId, event_type: nType, title: t, event_date: d, description: (nDesc || '').trim() || null, recurrence: recVal, status: 'active', visibility: shareOrg ? 'org_shared' : 'personal', org_id: shareOrg ? state.orgId : null })
      .select(HUB_CAL_COLS).single()
      .then(function (r) {
        setCreating(false);
        if (r && r.error) throw r.error;
        var row = r && r.data;
        if (!row) { setCreateErr('Could not save this date. Please try again.'); return; }
        setNTitle(''); setNType(''); setNDate(''); setNDesc(''); setNRec('none'); setNShare(false);
        setState(function (prev) { return Object.assign({}, prev, { events: hubCalSort([row].concat(prev.events || [])) }); });
      })
      .catch(function (e) { setCreating(false); console.warn('[OOX-001] Calendar: create failed', e); setCreateErr('Could not save this date. Please try again.'); });
  }

  // Reconcile a single mutated row / removal into the list (re-sort by date on change).
  function handleChanged(row) {
    if (!row || row.id == null) return;
    setState(function (prev) {
      var next = (prev.events || []).map(function (n) { return n.id === row.id ? row : n; });
      return Object.assign({}, prev, { events: hubCalSort(next) });
    });
  }
  function handleRemoved(id) {
    setState(function (prev) { return Object.assign({}, prev, { events: (prev.events || []).filter(function (n) { return n.id !== id; }) }); });
  }

  if (state.status === 'loading') {
    return React.createElement('div', { style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '8px 0' } }, 'Loading your calendar…');
  }

  var children = [];
  var events = state.events || [];
  if (state.error) {
    // §1.5 resilient — the read failed: a brief inline note, but the New-date form
    // below still works.
    children.push(React.createElement('div', { key: 'err', style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', marginBottom: '16px' } }, 'Could not load your calendar just now.'));
  } else if (!events.length) {
    // §1.1 empty state.
    children.push(React.createElement('div', { key: 'empty', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' } }, 'No upcoming dates yet — add your first below.'));
  } else {
    children.push(React.createElement('div', { key: 'list', style: HUB_NOTES_LIST_STYLE },
      events.map(function (ev) {
        return React.createElement(HubCalEventCard, { key: ev.id, event: ev, hubSession: hubSession, orgId: state.orgId, isOwner: ev.user_id === hubSession.userId, onChanged: handleChanged, onRemoved: handleRemoved });
      })));
  }

  // §1.2 "New date" capture form (below the list).
  children.push(React.createElement('div', { key: 'newform', style: HUB_NOTES_CARD_STYLE },
    React.createElement('div', { key: 'h', style: HUB_ACEI_SECTION_H }, 'New date'),
    React.createElement('div', { key: 'lt', style: HUB_CAL_FIELD_LABEL }, 'Title'),
    React.createElement('input', { key: 'title', type: 'text', value: nTitle, maxLength: 200, placeholder: 'What is due?', 'aria-label': 'New event title', onChange: function (e) { setNTitle(e.target.value); }, style: HUB_NOTES_INPUT_STYLE }),
    React.createElement('div', { key: 'ltype', style: HUB_CAL_FIELD_LABEL }, 'Type'),
    hubCalSelectEl('type', nType, function (e) { setNType(e.target.value); }, HUB_CAL_TYPE_OPTS, 'New event type', 'Select type…'),
    React.createElement('div', { key: 'ld', style: HUB_CAL_FIELD_LABEL }, 'Date'),
    React.createElement('input', { key: 'date', type: 'date', value: nDate, 'aria-label': 'New event date', onChange: function (e) { setNDate(e.target.value); }, style: HUB_NOTES_INPUT_STYLE }),
    React.createElement('div', { key: 'ldesc', style: HUB_CAL_FIELD_LABEL }, 'Description (optional)'),
    React.createElement('textarea', { key: 'desc', value: nDesc, rows: 3, placeholder: 'Add any detail…', 'aria-label': 'New event description', onChange: function (e) { setNDesc(e.target.value); }, style: HUB_NOTES_TEXTAREA_STYLE }),
    React.createElement('div', { key: 'lrec', style: HUB_CAL_FIELD_LABEL }, 'Recurrence'),
    hubCalSelectEl('rec', nRec, function (e) { setNRec(e.target.value); }, HUB_CAL_REC_OPTS, 'New event recurrence', null),
    React.createElement('label', { key: 'share', style: HUB_CAL_CHECKBOX_ROW },
      React.createElement('input', { type: 'checkbox', checked: nShare, 'aria-label': 'Share with organisation', onChange: function (e) { setNShare(e.target.checked); } }),
      'Share with organisation'),
    createErr ? React.createElement('div', { key: 'cerr', style: HUB_NOTES_ERR_STYLE }, createErr) : null,
    React.createElement('div', { key: 'actions', style: HUB_NOTES_ACTIONS_STYLE },
      React.createElement('button', { type: 'button', disabled: creating || !nTitle.trim() || !nType || !nDate, style: HUB_MATTER_BTN_PRIMARY, onClick: createEvent }, creating ? 'Saving…' : 'Save date')
    )
  ));

  return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } }, children);
}

// ─── OOX-001 KL-Hub Ticker facet (KL-HUB §5 step 8 — the last facet before
// cutover; AILANE-CC-BRIEF-OOX-KL-HUB-TICKER-FACET-001) ───
// The global employment-law intelligence feed, in-hub. Reads on open via the hub
// RLS client (hubSession.sb): ticker_briefings (RLS auto-filters to
// generation_status='completed' AND quality_passed=true — global, not org-scoped)
// and acei_category_scores (org-scoped — the latest week's category set, used ONLY
// to highlight items relevant to the tenant's exposure). Each briefing renders as a
// date-ordered card; briefing_text (markdown) is the facet's ONLY
// dangerouslySetInnerHTML, rendered through the existing escape-first renderMarkdown
// — the identical safe path the Eileen chat uses (renderMarkdown escapes before it
// formats). Every other field renders via escaped React children (hubIntelText).
// Reads are resilient: a failed feed degrades to "—" with console.warn; the
// relevance set degrades to no-highlight; the facet never throws. Reuses the
// Intelligence facet's hub chrome (card / chip / list / toggle / caveat constants).

var HUB_TICKER_RELEVANT_BADGE = { flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38BDF8', background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '999px', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 600, padding: '3px 10px', whiteSpace: 'nowrap' };
var HUB_TICKER_BODY_STYLE = { marginTop: '12px', color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.7, wordBreak: 'break-word' };
var HUB_TICKER_BODY_COLLAPSED = Object.assign({}, HUB_TICKER_BODY_STYLE, { maxHeight: '180px', overflow: 'hidden' });
var HUB_TICKER_MOREBTN_STYLE = { marginTop: '8px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 600, padding: '4px 0', border: 'none', background: 'none', color: '#38BDF8' };
var HUB_TICKER_FILTERS_STYLE = { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '14px' };

// Raw-markdown length over which a briefing body collapses behind "Show more".
var HUB_TICKER_LONG = 600;

// Urgency → chip variant (colour). act/urgent → red ('high'); monitor/watch →
// blue ('type'); anything else → neutral.
function hubTickerUrgencyVariant(u) {
  var k = String(u == null ? '' : u).toLowerCase();
  if (k === 'act' || k === 'action' || k === 'urgent' || k === 'high') return 'high';
  if (k === 'monitor' || k === 'watch' || k === 'review' || k === 'low') return 'type';
  return null;
}

// Tier label — a bare number reads "Tier N"; any other value is humanised.
function hubTickerTierLabel(t) {
  if (t == null || t === '') return '';
  var s = String(t).trim();
  return /^\d+$/.test(s) ? 'Tier ' + s : hubAceiHumanise(s);
}

// acei_category → one chip per category (handles a scalar or an array; empty → none).
function hubTickerCatChips(cat) {
  var list = Array.isArray(cat) ? cat : (cat == null || cat === '' ? [] : [cat]);
  var out = [];
  list.forEach(function (c, i) {
    if (c != null && c !== '') out.push(hubIntelChip(hubAceiHumanise(c), null, 'cat' + i));
  });
  return out;
}

// Does a briefing's acei_category intersect the org's exposure set? (scalar or
// array; absent/empty set → never relevant, so nothing is highlighted.)
function hubTickerCatMatch(cat, catSet) {
  if (!catSet || !catSet.size || cat == null || cat === '') return false;
  if (Array.isArray(cat)) return cat.some(function (c) { return c != null && catSet.has(String(c).toLowerCase()); });
  return catSet.has(String(cat).toLowerCase());
}

// §1.1 relevance set — the latest week's category values from acei_category_scores
// (lower-cased) as a Set. Graceful: read error / empty / no categories → null,
// which switches the relevance highlight off entirely.
function hubTickerLatestCatSet(res) {
  if (!res || res.error || !Array.isArray(res.data) || !res.data.length) {
    if (res && res.error) console.warn('[OOX-001] Ticker: acei_category_scores read failed', res.error);
    return null;
  }
  var rows = res.data;
  var maxWeek = null;
  rows.forEach(function (r) {
    if (r && r.week_start_date != null && (maxWeek === null || String(r.week_start_date) > String(maxWeek))) maxWeek = r.week_start_date;
  });
  var set = new Set();
  rows.forEach(function (r) {
    if (!r || r.category == null || r.category === '') return;
    if (maxWeek !== null && String(r.week_start_date) !== String(maxWeek)) return;
    set.add(String(r.category).toLowerCase());
  });
  return set.size ? set : null;
}

// Distinct non-empty values of a field across the loaded rows (for the filter
// dropdowns), numeric-sorted when every value is a bare number, else alpha.
function hubTickerDistinct(rows, field, lower) {
  var seen = {}, out = [];
  (rows || []).forEach(function (r) {
    if (!r || r[field] == null || r[field] === '') return;
    var v = String(r[field]);
    if (lower) v = v.toLowerCase();
    if (!seen[v]) { seen[v] = 1; out.push(v); }
  });
  var allNum = out.length > 0 && out.every(function (v) { return /^\d+$/.test(v); });
  return out.sort(function (a, b) { return allNum ? Number(a) - Number(b) : (a < b ? -1 : a > b ? 1 : 0); });
}

// One briefing card. Header (event_title + event_date, optional relevance badge),
// tier / urgency / acei_category chips, the markdown body (renderMarkdown — the
// facet's ONLY dangerouslySetInnerHTML, collapsed behind "Show more" when long),
// and a plain source link. key uses the row id with an index fallback.
function hubTickerCard(row, idx, isRelevant, isExpanded, onToggleExpand) {
  var cardStyle = isRelevant ? Object.assign({}, HUB_INTEL_CARD_STYLE, HUB_INTEL_CARD_TRACKING_STYLE) : HUB_INTEL_CARD_STYLE;
  var children = [];

  // Header — title + date on the left; "Relevant to your exposure" badge on the right.
  var left = [React.createElement('div', { key: 'title', style: HUB_INTEL_TITLE_STYLE }, hubIntelText(row.event_title) || 'Untitled briefing')];
  var dateStr = row.event_date ? hubVaultDate(row.event_date) : '';
  if (dateStr && dateStr !== '—') left.push(React.createElement('div', { key: 'meta', style: HUB_INTEL_META_STYLE }, React.createElement('span', { key: 'd' }, dateStr)));
  children.push(React.createElement('div', { key: 'top', style: HUB_INTEL_TOP_STYLE },
    React.createElement('div', { key: 'l', style: { minWidth: 0 } }, left),
    isRelevant ? React.createElement('span', { key: 'rel', style: HUB_TICKER_RELEVANT_BADGE, title: 'Matches a category in your exposure profile' }, '◆ Relevant to your exposure') : null
  ));

  // Tier / urgency / acei_category chips (all escaped React children via hubIntelChip).
  var chips = [];
  var tierLabel = hubTickerTierLabel(row.tier);
  if (tierLabel) chips.push(hubIntelChip(tierLabel, null, 'tier'));
  if (row.legislative_urgency != null && String(row.legislative_urgency) !== '') {
    chips.push(hubIntelChip(hubAceiHumanise(row.legislative_urgency), hubTickerUrgencyVariant(row.legislative_urgency), 'urg'));
  }
  Array.prototype.push.apply(chips, hubTickerCatChips(row.acei_category));
  if (chips.length) children.push(React.createElement('div', { key: 'chips', style: HUB_INTEL_CHIPS_STYLE }, chips));

  // Body — briefing_text via the existing escape-first renderMarkdown. This is the
  // ONLY dangerouslySetInnerHTML in the facet (identical safe pattern to the Eileen
  // chat). Long bodies collapse until "Show more".
  var raw = row.briefing_text == null ? '' : String(row.briefing_text);
  var bodyHtml = renderMarkdown(raw);
  if (bodyHtml) {
    var isLong = raw.length > HUB_TICKER_LONG;
    children.push(React.createElement('div', {
      key: 'body',
      style: (isLong && !isExpanded) ? HUB_TICKER_BODY_COLLAPSED : HUB_TICKER_BODY_STYLE,
      dangerouslySetInnerHTML: { __html: bodyHtml },
    }));
    if (isLong) {
      children.push(React.createElement('button', {
        key: 'more', type: 'button', style: HUB_TICKER_MOREBTN_STYLE,
        'aria-expanded': isExpanded ? 'true' : 'false',
        onClick: function () { onToggleExpand(row); },
      }, isExpanded ? 'Show less' : 'Show more'));
    }
  }

  // Footer — source_url as a plain link (rendered only for an http(s) URL).
  if (row.source_url && /^https?:\/\//i.test(String(row.source_url))) {
    children.push(React.createElement('div', { key: 'foot', style: HUB_INTEL_FOOT_STYLE },
      React.createElement('a', { key: 'src', href: String(row.source_url), target: '_blank', rel: 'noopener noreferrer', style: HUB_INTEL_SOURCE_STYLE }, 'Source')));
  }

  return React.createElement('div', { key: row.id != null ? row.id : idx, style: cardStyle }, children);
}

// Ticker facet body — the global intelligence feed (§1). Reads on open via the hub
// RLS client (§1.1): ticker_briefings (date-ordered, ≤50) + the org's
// acei_category_scores (latest-week set, for the relevance highlight). Mirrors
// HubIntelFacet's shape (alive-guarded parallel reads, loading line, caveat,
// max-width container, light client-side filter). Reads are resilient; never throws.
function HubTickerFacet({ hubSession }) {
  var _state = useState({ status: 'loading', briefings: [], catSet: null, error: false });
  var state = _state[0]; var setState = _state[1];
  var _expanded = useState(function () { return new Set(); });
  var expanded = _expanded[0]; var setExpanded = _expanded[1];
  var _tierF = useState('all'); var tierF = _tierF[0]; var setTierF = _tierF[1];
  var _urgF = useState('all'); var urgF = _urgF[0]; var setUrgF = _urgF[1];
  var _relOnly = useState(false); var relOnly = _relOnly[0]; var setRelOnly = _relOnly[1];

  useEffect(function () {
    var alive = true;
    var sb = hubSession && hubSession.sb;
    if (!sb || !sb.from) { setState({ status: 'ready', briefings: [], catSet: null, error: true }); return; }
    // §1.1 reads — RLS-scoped via the authenticated hub client (parallel). The
    // briefings RLS auto-filters to completed + quality-passed; the category read is
    // org-scoped and only ever powers the relevance highlight.
    Promise.all([
      sb.from('ticker_briefings')
        .select('id,event_title,tier,briefing_text,acei_category,event_date,source_url,legislative_urgency,created_at')
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50),
      sb.from('acei_category_scores')
        .select('category,week_start_date')
        .order('week_start_date', { ascending: false })
        .limit(60),
    ]).then(function (res) {
      if (!alive) return;
      var feed = hubVaultUnwrap(res[0], 'ticker_briefings');
      var catSet = hubTickerLatestCatSet(res[1]);
      setState({ status: 'ready', briefings: feed.rows || [], catSet: catSet, error: !!feed.error });
    }).catch(function (e) {
      console.warn('[OOX-001] Ticker facet: reads failed', e);
      if (alive) setState({ status: 'ready', briefings: [], catSet: null, error: true });
    });
    return function () { alive = false; };
  }, [hubSession]);

  function toggleExpand(row) {
    if (row == null || row.id == null) return;
    setExpanded(function (prev) {
      var next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
      return next;
    });
  }

  if (state.status === 'loading') {
    return React.createElement('div', { style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', padding: '8px 0' } }, 'Loading the intelligence feed…');
  }

  var children = [];
  // Standing caveat banner (advice-free) — mirrors the Intelligence facet.
  children.push(React.createElement('div', { key: 'caveat', style: HUB_INTEL_CAVEAT_STYLE },
    'Global employment-law intelligence feed. Items matching your exposure profile are highlighted; the full global feed always shows. Intelligence, not advice.'));

  if (state.error) {
    // §1.4 resilient — the feed read failed: degrade to "—", never throw.
    children.push(React.createElement('div', { key: 'err', style: { color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' } }, '—'));
    return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } }, children);
  }

  var briefings = state.briefings || [];
  if (!briefings.length) {
    // §1.2 empty state.
    children.push(React.createElement('div', { key: 'empty', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6 } }, 'No intelligence briefings available yet.'));
    return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } }, children);
  }

  var catSet = state.catSet;
  var hasRelevance = !!(catSet && catSet.size);

  // §1.3 light client-side filters — tier / urgency dropdowns (shown only when a
  // field has more than one value) + a "Relevant to me only" toggle (shown only
  // when the relevance set is non-empty). Default: all. Filtering never hides
  // globals permanently — clearing the control re-shows the full feed.
  var tiers = hubTickerDistinct(briefings, 'tier', false);
  var urgencies = hubTickerDistinct(briefings, 'legislative_urgency', true);
  var controls = [];
  if (tiers.length > 1) {
    var tierOpts = [{ v: 'all', l: 'All tiers' }].concat(tiers.map(function (t) { return { v: t, l: hubTickerTierLabel(t) }; }));
    controls.push(hubCalSelectEl('tierf', tierF, function (e) { setTierF(e.target.value); }, tierOpts, 'Filter by tier', null));
  }
  if (urgencies.length > 1) {
    var urgOpts = [{ v: 'all', l: 'All urgency' }].concat(urgencies.map(function (u) { return { v: u, l: hubAceiHumanise(u) }; }));
    controls.push(hubCalSelectEl('urgf', urgF, function (e) { setUrgF(e.target.value); }, urgOpts, 'Filter by urgency', null));
  }
  if (hasRelevance) {
    controls.push(React.createElement('button', {
      key: 'relbtn', type: 'button',
      style: relOnly ? Object.assign({}, HUB_INTEL_TOGGLE_BASE, HUB_INTEL_TOGGLE_ON) : HUB_INTEL_TOGGLE_BASE,
      'aria-pressed': relOnly ? 'true' : 'false',
      onClick: function () { setRelOnly(!relOnly); },
    }, relOnly ? 'Showing relevant only' : 'Relevant to me only'));
  }
  if (controls.length) children.push(React.createElement('div', { key: 'filters', style: HUB_TICKER_FILTERS_STYLE }, controls));

  var rows = briefings.filter(function (r) {
    if (!r) return false;
    if (tierF !== 'all' && String(r.tier == null ? '' : r.tier) !== tierF) return false;
    if (urgF !== 'all' && String(r.legislative_urgency == null ? '' : r.legislative_urgency).toLowerCase() !== urgF) return false;
    if (relOnly && !hubTickerCatMatch(r.acei_category, catSet)) return false;
    return true;
  });

  if (!rows.length) {
    children.push(React.createElement('div', { key: 'empty2', style: { color: '#CBD5E1', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', lineHeight: 1.6 } }, 'No briefings match the current filter.'));
    return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } }, children);
  }

  children.push(React.createElement('div', { key: 'list', style: HUB_INTEL_LIST_STYLE },
    rows.map(function (row, idx) { return hubTickerCard(row, idx, hubTickerCatMatch(row.acei_category, catSet), expanded.has(row.id), toggleExpand); })));

  return React.createElement('div', { style: { maxWidth: '900px', margin: '0 auto', width: '100%' } }, children);
}

// Workspace facet mounted in the main content area (KL-HUB §1.5). The ACEI, Vault,
// Alerts, Intelligence, Ticker, Notes and Calendar facets all render live.
// Routing/state in brief-1.
function HubFacetView({ facet, hubSession, onBack }) {
  var label = HUB_FACET_LABELS[facet] || 'Workspace';
  var body = facet === 'acei'
    ? React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '24px' } },
        React.createElement(HubAceiFacet, { hubSession: hubSession }))
    : facet === 'vault'
    ? React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '24px' } },
        React.createElement(HubVaultFacet, { hubSession: hubSession }))
    : facet === 'alerts'
    ? React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '24px' } },
        React.createElement(HubAlertsFacet, { hubSession: hubSession }))
    : facet === 'intelligence'
    ? React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '24px' } },
        React.createElement(HubIntelFacet, { hubSession: hubSession }))
    : facet === 'ticker'
    ? React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '24px' } },
        React.createElement(HubTickerFacet, { hubSession: hubSession }))
    : facet === 'notes'
    ? React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '24px' } },
        React.createElement(HubNotesFacet, { hubSession: hubSession }))
    : facet === 'calendar'
    ? React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '24px' } },
        React.createElement(HubCalendarFacet, { hubSession: hubSession }))
    : React.createElement('div', { style: { flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' } },
        React.createElement('div', { className: 'kl-placeholder-panel', style: { maxWidth: '420px' } },
          React.createElement('div', { className: 'kl-placeholder-icon' }, '🛠️'),
          React.createElement('div', { className: 'kl-placeholder-title' }, label),
          React.createElement('div', { className: 'kl-placeholder-body' }, 'This area is being wired in — coming shortly.')
        ));
  return React.createElement('div', { className: 'kl-main' },
    React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', borderBottom: '1px solid var(--kl-border, #1E3A5F)', flexShrink: 0 },
    },
      React.createElement('button', {
        type: 'button', className: 'kl-action-btn', onClick: onBack, 'aria-label': 'Back to Eileen',
      }, '← Back to Eileen'),
      React.createElement('div', { style: { fontSize: '15px', fontWeight: 500, color: '#F1F5F9', fontFamily: "'DM Sans', sans-serif" } }, label)
    ),
    body
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(() => 'eileen-' + Date.now() + '-' + Math.random().toString(36).substr(2, 7));
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' ? true : window.innerWidth > 768);
  // §W-G.4: drawer open-state persists via KLUI-001 prefs. localStorage
  // mirror restores synchronously at boot; the DB value (cross-device) is
  // applied in loadUserPreferences only when no local entry exists. Only
  // ungated panels are restored — tier is unknown at boot.
  const [activePanel, setActivePanel] = useState(function() {
    try {
      var saved = localStorage.getItem('ailane_kl_active_panel');
      return (saved === 'notes' || saved === 'research') ? saved : null;
    } catch(e) { return null; }
  });
  function handleSelectPanel(panelId) {
    setActivePanel(panelId);
    try {
      if (panelId) localStorage.setItem('ailane_kl_active_panel', panelId);
      else localStorage.setItem('ailane_kl_active_panel', '');
    } catch(e) { /* silent */ }
    saveKlPreferences({ active_panel: panelId || null });
  }
  // §W-F D7: Eileen helper dismissal — persisted via KLUI-001 prefs.
  const [helperDismissed, setHelperDismissed] = useState(function() {
    try { return localStorage.getItem('ailane_kl_helper_dismissed') === '1'; } catch(e) { return false; }
  });
  function handleHelperDismiss() {
    setHelperDismissed(true);
    try { localStorage.setItem('ailane_kl_helper_dismissed', '1'); } catch(e) { /* silent */ }
    saveKlPreferences({ helper_dismissed: true });
  }
  // OOX-001 KL-Hub frame (preview-gated). hubSession is null unless an
  // authenticated operational session is present AND the preview flag is set.
  // hubMode being false ⇒ the public KL renders exactly as today.
  const [hubSession, setHubSession] = useState(null);
  useEffect(function () {
    var alive = true;
    detectHubSession().then(function (s) { if (alive) setHubSession(s); });
    return function () { alive = false; };
  }, []);
  const hubMode = !!hubSession;
  // OOX-001 §1.2 — operational mode (the /operational/ host, flag-driven). Stable
  // for the page's life (window.__klMode is set before initKLApp). Drives the
  // "Ailane Operational" chrome + the org-tier badge; the right-drawer retirement
  // (§1.1) is scoped to hub/operational mode (hubMode || operationalMode).
  const operationalMode = klOperationalMode();
  const hubChrome = hubMode || operationalMode;
  const orgTier = hubSession && hubSession.orgTier;
  // Active workspace facet (hub mode only). null ⇒ Eileen conversation shows.
  const [currentFacet, setCurrentFacet] = useState(null);
  // OOX-CARDS §1.3 — a pending "Discuss with Eileen" seed: set alongside closing the
  // facet, dispatched by the effect below once the conversation (MessageInput) mounts.
  const [pendingEileenSeed, setPendingEileenSeed] = useState(null);
  // Bumped after each hub Eileen answer to re-list the matter bar.
  const [matterRefreshKey, setMatterRefreshKey] = useState(0);
  function handleSelectFacet(id) {
    setCurrentFacet(id);
    // Leave any domain sub-page so the facet (main-area mount) is visible.
    if (id && window.location.hash && window.location.hash !== '#/') {
      window.location.hash = '/';
    }
  }
  // OOX-CARDS §1.3 — when a card's "Discuss with Eileen" closes the facet, the
  // ConversationArea/MessageInput remounts in the same commit; child effects fire
  // before this parent effect, so the kl-seed-input listener is registered by the time
  // we seed. Seed the input (does NOT auto-send), then clear the pending value.
  useEffect(function () {
    if (pendingEileenSeed != null && !currentFacet) {
      var seed = pendingEileenSeed;
      setPendingEileenSeed(null);
      if (typeof window.__klSeedInput === 'function') window.__klSeedInput(seed);
    }
  }, [pendingEileenSeed, currentFacet]);

  const [accessType, setAccessType] = useState(window.__klAccessType || null);
  const [tier, setTier] = useState(window.__klTier || window.__klProductType || null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(window.__klSessionExpiry || null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState(null);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [floatingNexusOpen, setFloatingNexusOpen] = useState(false);
  // Welsh toggle — persisted in localStorage, defaults to English.
  const [lang, setLang] = useState(function() {
    try { return localStorage.getItem('ailane_kl_lang') || 'en'; } catch(e) { return 'en'; }
  });
  function toggleLang() {
    setLang(function(prev) {
      var next = prev === 'en' ? 'cy' : 'en';
      try { localStorage.setItem('ailane_kl_lang', next); } catch(e) { /* silent */ }
      return next;
    });
  }
  // H-5: Domain hover tracking for FloatingNexusAdvisor
  const [nearDomain, setNearDomain] = useState(null);
  const nearDomainTimeout = useRef(null);
  function handleDomainHover(domainSlug) {
    setNearDomain(domainSlug);
    if (nearDomainTimeout.current) clearTimeout(nearDomainTimeout.current);
    nearDomainTimeout.current = setTimeout(function() { setNearDomain(null); }, 5000);
  }
  function handleDomainLeave() {
    if (nearDomainTimeout.current) clearTimeout(nearDomainTimeout.current);
    nearDomainTimeout.current = setTimeout(function() { setNearDomain(null); }, 2000);
  }
  // Sprint A §2 — Nexus visual state machine
  const [nexusState, setNexusState] = useState('dormant');
  const presentingTimerRef = useRef(null);
  const [userType, setUserType] = useState(function() {
    try { return localStorage.getItem('ailane_kl_user_type') || null; } catch(e) { return null; }
  });
  const [showQualifier, setShowQualifier] = useState(false);
  const [qualifierShownThisSession, setQualifierShownThisSession] = useState(false);
  const [hasUploadedThisSession, setHasUploadedThisSession] = useState(false);
  // Brief 5: Minimalist welcome — suppress early noise.
  // pageLoadTime gates the qualifier (≥2 user messages OR ≥60s elapsed) and
  // upsellGraceElapsed gates the upsell card (30s grace after first render).
  const pageLoadTime = useRef(Date.now());
  const [upsellGraceElapsed, setUpsellGraceElapsed] = useState(false);
  useEffect(function() {
    var t = setTimeout(function() { setUpsellGraceElapsed(true); }, 30000);
    return function() { clearTimeout(t); };
  }, []);
  // §6.4: One contract upload prompt per session
  const contractPromptShown = useRef(false);

  // AMD-045 §5: View state for domain sub-pages
  const [currentView, setCurrentView] = useState(function() {
    var route = getRoute();
    return route.view;
  });
  const [currentDomain, setCurrentDomain] = useState(function() {
    var route = getRoute();
    return route.domain || null;
  });

  // AMD-045 §5: Hash-based routing listener
  useEffect(function() {
    function handleRoute() {
      var route = getRoute();
      if (route.view === 'domain') {
        setCurrentView('domain');
        setCurrentDomain(route.domain);
      } else {
        setCurrentView(messages.length > 0 ? 'conversation' : 'welcome');
        setCurrentDomain(null);
      }
    }
    window.addEventListener('hashchange', handleRoute);
    return function() { window.removeEventListener('hashchange', handleRoute); };
  }, [messages.length]);

  const loadSessionHistory = useCallback(async function () {
    if (!window.__klToken || !window.__klUserId) return;
    try {
      // §4.2: Include categories_matched for meaningful titles
      const resp = await fetch(
        SUPABASE_URL + '/rest/v1/kl_eileen_conversations?user_id=eq.' + window.__klUserId +
          '&select=session_id,user_message,categories_matched,created_at&order=created_at.desc&limit=200',
        { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
      );
      const data = await resp.json();
      if (!Array.isArray(data)) return;
      const grouped = {};
      data.forEach((row) => {
        if (!grouped[row.session_id]) {
          // §4.3: Category-based title (Pass 1) or first-message fallback (Pass 2)
          var title = row.user_message ? row.user_message.substring(0, 50) : '(untitled)';
          if (row.categories_matched && row.categories_matched.length > 0) {
            var catKey = row.categories_matched[0];
            if (CATEGORY_TITLES[catKey]) {
              title = CATEGORY_TITLES[catKey];
            }
          }
          grouped[row.session_id] = {
            sessionId: row.session_id,
            title: title,
            lastActivity: row.created_at,
            dateGroup: classifyDate(row.created_at),
            messageCount: 1,
          };
        } else {
          grouped[row.session_id].messageCount++;
        }
      });
      // §4.3: Append message count to category-based titles
      var sessions = Object.values(grouped);
      var categoryTitleValues = Object.values(CATEGORY_TITLES);
      sessions.forEach(function(s) {
        if (s.messageCount > 1 && categoryTitleValues.indexOf(s.title) !== -1) {
          s.title = s.title + ' (' + s.messageCount + ')';
        }
      });
      setSessionHistory(sessions.slice(0, 50));
    } catch (err) {
      console.error('Failed to load session history:', err);
    }
  }, []);

  // §5.2: Load user preferences (user_type) from kl_user_preferences on boot
  async function loadUserPreferences() {
    if (!window.__klToken || !window.__klUserId) return;
    try {
      var resp = await fetch(
        SUPABASE_URL + '/rest/v1/kl_user_preferences?user_id=eq.' + window.__klUserId + '&select=preferences',
        { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
      );
      var data = await resp.json();
      if (Array.isArray(data) && data.length > 0 && data[0].preferences) {
        var prefs = data[0].preferences;
        if (prefs.user_type) {
          setUserType(prefs.user_type);
          try { localStorage.setItem('ailane_kl_user_type', prefs.user_type); } catch(e) { /* silent */ }
        }
        // §W-F D7: helper dismissal (KLUI-001 prefs)
        if (prefs.helper_dismissed) {
          setHelperDismissed(true);
          try { localStorage.setItem('ailane_kl_helper_dismissed', '1'); } catch(e) { /* silent */ }
        }
        // §W-G.4: drawer open-state — DB value applies only when this device
        // has no local entry; ungated panels only (tier loads async).
        var hasLocalPanel = false;
        try { hasLocalPanel = localStorage.getItem('ailane_kl_active_panel') !== null; } catch(e) { /* silent */ }
        if (!hasLocalPanel && (prefs.active_panel === 'notes' || prefs.active_panel === 'research')) {
          setActivePanel(prefs.active_panel);
        }
      }
    } catch (err) {
      console.error('Failed to load user preferences:', err);
    }
  }

  // Wire up auth-ready event + trigger initial history load + preferences load
  useEffect(() => {
    function onReady(e) {
      setAccessType(e.detail.accessType);
      setTier(e.detail.tier);
      setSessionExpiresAt(window.__klSessionExpiry || null);
      loadSessionHistory();
      loadUserPreferences();
    }
    window.addEventListener('ailane-kl-ready', onReady);
    if (window.__klAccessType) {
      loadSessionHistory();
      loadUserPreferences();
    }
    return () => window.removeEventListener('ailane-kl-ready', onReady);
  }, [loadSessionHistory]);

  // KL-LIVE-001 §W-B: warm the instruments map once per session so display
  // titles resolve in Eileen reference links and the Research panel.
  useEffect(function() {
    if (window.__klToken) ensureInstrumentsMap();
  }, []);

  // §4.3: Track viewport width for responsive rendering
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // §5.5: Respect prefers-reduced-motion
  const prefersReducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // F-5: Preload Web Speech voice list. Chrome/Edge populate getVoices()
  // asynchronously; Firefox/Safari fire voiceschanged. Warming the list
  // here ensures selectEileenVoice() resolves Fiona (or fallback) on the
  // first Read aloud click. EILEEN-002 §7.3.
  useEffect(function() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
    try { window.speechSynthesis.getVoices(); } catch (e) { /* silent */ }
    function onVoicesChanged() {
      try { window.speechSynthesis.getVoices(); } catch (e) { /* silent */ }
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    return function() {
      try {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        window.speechSynthesis.cancel();
      } catch (e) { /* silent */ }
    };
  }, []);

  // Auto-close sidebar when resizing down to mobile; track mobile state.
  useEffect(() => {
    function onResize() {
      var mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
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

  // KL-LIVE-002 §W-G.1: the drawer is a fixed-width OVERLAY above page
  // content. The former drawer-open class toggle is removed — it drove the
  // index.html push-mode grid rule (third column widened to 468px), which
  // squeezed the main column whenever a panel was open.

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
    // F-5: Cancel any active speech when switching sessions
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* silent */ }
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
    // F-5: Cancel any active speech when starting a new chat
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* silent */ }
    setSessionId('eileen-' + Date.now() + '-' + Math.random().toString(36).substr(2, 7));
    setMessages([]);
    // AMD-045: Reset view to welcome and clear domain context
    setCurrentView('welcome');
    setCurrentDomain(null);
    // OOX-001: close any open workspace facet on new conversation.
    setCurrentFacet(null);
    // §6.4: Reset contract prompt guard for new session
    contractPromptShown.current = false;
    if (window.location.hash && window.location.hash !== '#/') {
      window.location.hash = '/';
    }
  }

  async function sendMessage(text) {
    const clean = (text || '').trim();
    if (!clean || isLoading) return;
    // OOX-001: leave any open workspace facet so the conversation shows.
    if (currentFacet) setCurrentFacet(null);
    // AMD-045 §5: Transition from domain sub-page to conversation on send
    if (currentView === 'domain') {
      setCurrentView('conversation');
      // Don't clear currentDomain — it's used for page_context
    }
    setMessages((prev) => [...prev, { role: 'user', content: clean }]);
    setIsLoading(true);
    if (presentingTimerRef.current) { clearTimeout(presentingTimerRef.current); presentingTimerRef.current = null; }
    setNexusState('processing');
    try {
      var data;
      if (hubMode) {
        // OOX-001 §1.3: hub mode routes Eileen to eileen-operational. Reuse the
        // operational request shape ({ question }) and normalise the response to
        // the KL message shape ({ response }) so the existing escape-first
        // renderer (renderMarkdown) renders it unchanged.
        var hubData = await hubSendToEileen(hubSession, { question: clean });
        var hubText = hubData && (hubData.response || hubData.answer || hubData.text || hubData.message);
        data = hubText ? { response: hubText } : null;
      } else {
        // AMD-045 §4.8: Include domain context in Eileen request
        var requestBody = {
          message: (userType ? '[Context: user is ' + (userType === 'employer' ? 'an employer/HR professional managing staff' : 'a worker with a question about their own employment') + '] ' : '') + clean,
          session_id: sessionId,
          page_context: currentDomain
            ? 'knowledge-library/domain/' + currentDomain.slug
            : 'knowledge-library',
        };
        if (currentDomain) {
          requestBody.domain_context = currentDomain.id;
        }
        const resp = await fetch(EILEEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + window.__klToken,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(requestBody),
        });
        data = await resp.json();
      }
      if (data && data.response) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.response,
          provisionsCount: data.provisions_count,
          casesCount: data.cases_count,
        }]);
        loadSessionHistory();
        setNexusState('presenting');
        presentingTimerRef.current = setTimeout(function() { setNexusState('dormant'); presentingTimerRef.current = null; }, 2000);
        // OOX-001 §1.4: refresh the retain-or-clear matter panel after each answer.
        if (hubMode) setMatterRefreshKey(function (k) { return k + 1; });

        // EQIS: Show qualifying question only once the user is engaged.
        // Brief 5 §1.4: gate on ≥2 user messages OR ≥60s on-page, to keep
        // the welcome/early conversation state quiet.
        var userMsgCount = 0;
        for (var i = 0; i < messages.length; i++) {
          if (messages[i] && messages[i].role === 'user') userMsgCount++;
        }
        userMsgCount += 1; // include the message just sent in this turn
        var elapsedMs = Date.now() - pageLoadTime.current;
        if (!userType && !qualifierShownThisSession && (userMsgCount >= 2 || elapsedMs >= 60000)) {
          setShowQualifier(true);
          setQualifierShownThisSession(true);
        }

        // §6.3/§6.4: Proactive contract routing — one prompt per session
        if (hasContractIntent(clean) && !contractPromptShown.current && !hasUploadedThisSession) {
          contractPromptShown.current = true;
          setTimeout(function() {
            setMessages(function(prev) {
              return prev.concat([{
                role: 'system_ui',
                type: 'contract_upload_prompt',
              }]);
            });
          }, 800);
        }
      } else {
        setNexusState('dormant');
        setMessages((prev) => [...prev, {
          role: 'assistant',
          isError: true,
          errorMessage: "I wasn't able to process that just now. This is usually temporary — would you like to try again?",
          retryAction: function() { sendMessage(clean); },
        }]);
      }
    } catch (err) {
      console.error('sendMessage error:', err);
      setNexusState('dormant');
      var isOffline = !navigator.onLine || (err && err.message && err.message.indexOf('fetch') !== -1);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        isError: true,
        errorMessage: isOffline
          ? "It looks like we've lost connection. Please check your internet and try again when you're ready."
          : "I wasn't able to process that just now. This is usually temporary — would you like to try again?",
        retryAction: function() { sendMessage(clean); },
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  // Sprint A §2.3: dormant ↔ ready based on input content
  function handleInputChange(inputLength) {
    if (inputLength > 0 && nexusState === 'dormant') setNexusState('ready');
    else if (inputLength === 0 && nexusState === 'ready') setNexusState('dormant');
  }

  // Sprint A §2.5: Cleanup presenting timer on unmount
  useEffect(function() {
    return function() {
      if (presentingTimerRef.current) clearTimeout(presentingTimerRef.current);
    };
  }, []);

  // Expose sendMessage for Research Panel provision click → seed Eileen
  window.__klSendMessage = sendMessage;
  // KLUX-001-AM-002 §2.4 / Art. 5: "Discuss with Eileen" seeds the input
  // (does NOT auto-send). Dispatched to the MessageInput via custom event.
  window.__klSeedInput = function(text) {
    if (typeof text !== 'string' || !text) return;
    try {
      window.dispatchEvent(new CustomEvent('kl-seed-input', { detail: { text: text } }));
    } catch (e) {
      var ev = document.createEvent('CustomEvent');
      ev.initCustomEvent('kl-seed-input', true, true, { text: text });
      window.dispatchEvent(ev);
    }
  };
  // OOX-CARDS §1.3 — "Discuss with Eileen" from an Intelligence card: switch the centre
  // back to Eileen (close any open workspace facet) AND seed the input with the item's
  // context. The seed dispatch is deferred (see the pendingEileenSeed effect) so it
  // lands after the conversation's MessageInput remounts. Reuses the existing seed
  // mechanism — no new chat surface; does NOT auto-send.
  window.__klDiscussWithEileen = function (seed) {
    if (typeof seed !== 'string' || !seed) return;
    setPendingEileenSeed(seed);
    setCurrentFacet(null);
  };
  // Sprint G §2.8: Expose the panel opener so the welcome-state
  // "Browse the Library" button can open the Research Panel.
  // §W-G.4: routes through handleSelectPanel so open-state persists.
  window.__klOpenPanel = function(panelId) {
    handleSelectPanel(panelId);
  };
  // Sprint H §5.1: Expose handleFileSelect so the VaultPanel upload button
  // can invoke the App-level upload flow without prop drilling.
  window.__klHandleFileSelect = handleFileSelect;

  // §5.3: Persist user_type to kl_user_preferences via PATCH (existing) or POST (new)
  async function handleUserTypeSelect(type) {
    setUserType(type);
    setShowQualifier(false);
    try { localStorage.setItem('ailane_kl_user_type', type); } catch(e) { /* silent */ }
    if (!window.__klToken || !window.__klUserId) return;
    try {
      var checkResp = await fetch(
        SUPABASE_URL + '/rest/v1/kl_user_preferences?user_id=eq.' + window.__klUserId + '&select=id,preferences',
        { headers: { 'Authorization': 'Bearer ' + window.__klToken, 'apikey': SUPABASE_ANON_KEY } }
      );
      var existing = await checkResp.json();
      if (Array.isArray(existing) && existing.length > 0) {
        var merged = Object.assign({}, existing[0].preferences, { user_type: type });
        await fetch(
          SUPABASE_URL + '/rest/v1/kl_user_preferences?id=eq.' + existing[0].id,
          {
            method: 'PATCH',
            headers: {
              'Authorization': 'Bearer ' + window.__klToken,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ preferences: merged, updated_at: new Date().toISOString() }),
          }
        );
      } else {
        await fetch(
          SUPABASE_URL + '/rest/v1/kl_user_preferences',
          {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + window.__klToken,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              user_id: window.__klUserId,
              preferences: { user_type: type },
            }),
          }
        );
      }
    } catch (err) {
      console.error('Failed to save user type:', err);
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
        isError: true,
        errorMessage: "The document upload didn't complete. Please check the file is a PDF or Word document and try again.",
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
      window.__klTier === 'enterprise' ||
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
        isError: true,
        errorMessage: "The document upload didn't complete. Please check the file is a PDF or Word document and try again.",
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
    // If extraction failed, still offer vault-only save (record already exists)
    var charCount = (extractResult && typeof extractResult.char_count === 'number')
      ? extractResult.char_count
      : null;
    var extractionFailed = (charCount === null);

    updateFileMessage(msgId, {
      status: extractionFailed ? 'saved-no-extract' : 'ready',
      charCount: charCount || 0
    });

    addMessage({
      id: 'ready-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      role: 'assistant',
      content: '',
      isLocal: true,
      isUploadComplete: true,
      filename: file.name,
      fileSize: file.size,
      charCount: charCount || 0,
      documentId: documentId,
      vaultOnly: false,
      extractionFailed: extractionFailed,
    });
  }

  // F-3: "Save to Vault only" dismisses the upload-complete card. The
  // document row is already persisted in kl_vault_documents by uploadFile,
  // so no extra POST is required — we just collapse the card UI.
  function handleVaultOnly(msgId) {
    setMessages(function(prev) {
      return prev.map(function(m) {
        return m.id === msgId ? Object.assign({}, m, { vaultOnly: true }) : m;
      });
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
        lang={lang}
        onToggleLang={toggleLang}
        operationalMode={operationalMode}
        orgTier={orgTier}
      />
      {/* DMSP-002: AI translation disclaimer. Mandatory sibling below TopBar
          whenever Welsh is active — bilingual Welsh/English copy makes clear
          the translations are AI-generated and not an official translation
          under the Welsh Language Act 1993. */}
      {lang === 'cy' && (
        <div
          role="note"
          style={{
            fontSize: '10px',
            color: '#94a3b8',
            textAlign: 'center',
            padding: '2px 0',
            background: 'rgba(245,158,11,0.06)',
            borderBottom: '1px solid rgba(245,158,11,0.1)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Cyfieithiad AI — nid cyfieithiad swyddogol. / AI translation — not an official translation.
        </div>
      )}
      <Sidebar
        open={sidebarOpen}
        sessionHistory={sessionHistory}
        activeSessionId={sessionId}
        onSelectSession={(sid) => { loadSession(sid); if (window.innerWidth <= 768) setSidebarOpen(false); }}
        onNewChat={() => { newChat(); if (window.innerWidth <= 768) setSidebarOpen(false); }}
        onCrownQuery={sendMessage}
        nexusState={nexusState}
        prefersReducedMotion={prefersReducedMotion.current}
        lang={lang}
        hubChrome={hubChrome}
        currentFacet={currentFacet}
        onSelectFacet={(id) => { handleSelectFacet(id); if (window.innerWidth <= 768) setSidebarOpen(false); }}
      />
      {/* AMD-045 §5: Conditional render — domain sub-page or conversation area.
          OOX-001 §1.5: in hub mode an open workspace facet mounts in the main
          content area (same mount as a domain "Explore →"). */}
      {currentView === 'domain' && currentDomain ? (
        <DomainSubPage
          domain={currentDomain}
          onBack={function() { window.location.hash = '/'; }}
          onAskEileen={function(question) { sendMessage(question); }}
          onSend={sendMessage}
          isLoading={isLoading}
          onFileSelect={handleFileSelect}
          nexusState={nexusState}
          prefersReducedMotion={prefersReducedMotion.current}
          onInputChange={handleInputChange}
          tier={tier}
          lang={lang}
        />
      ) : hubMode && currentFacet ? (
        <HubFacetView facet={currentFacet} hubSession={hubSession} onBack={() => setCurrentFacet(null)} />
      ) : (
        <ConversationArea
          messages={messages}
          isLoading={isLoading}
          onSend={sendMessage}
          accessType={accessType}
          tier={tier}
          onFileSelect={handleFileSelect}
          onRunAnalysis={handleRunAnalysis}
          onVaultOnly={handleVaultOnly}
          floatingNexusExpanded={floatingNexusOpen}
          onToggleFloatingNexus={() => setFloatingNexusOpen(!floatingNexusOpen)}
          showQualifier={showQualifier}
          onUserTypeSelect={handleUserTypeSelect}
          pulseUpload={messages.some(function(m) { return m.role === 'system_ui' && m.type === 'contract_upload_prompt'; }) && !hasUploadedThisSession}
          nexusState={nexusState}
          prefersReducedMotion={prefersReducedMotion.current}
          onInputChange={handleInputChange}
          nearDomain={nearDomain}
          onDomainHover={handleDomainHover}
          onDomainLeave={handleDomainLeave}
          hubMode={hubMode}
          hubSession={hubSession}
          matterRefreshKey={matterRefreshKey}
        />
      )}
      {/* F-1: FloatingNexusAdvisor rendered at App level so it is visible
          above ConversationArea (previously nested inside welcome branch
          and effectively clipped). Hide on domain sub-pages. */}
      {currentView !== 'domain' && messages.length === 0 && (
        <FloatingNexusAdvisor
          nearDomain={nearDomain}
          nexusState={nexusState}
          prefersReducedMotion={prefersReducedMotion.current}
          onProximityDomain={function(slug) { if (slug) handleDomainHover(slug); else handleDomainLeave(); }}
          dismissed={helperDismissed}
          onDismiss={handleHelperDismiss}
        />
      )}
      <PanelRail
        activePanel={activePanel}
        onSelectPanel={handleSelectPanel}
        accessType={accessType}
        tier={tier}
        hubMode={hubChrome}
      />
      <AdvisoryBanner />
      {sidebarOpen && <MobileSidebarBackdrop onClick={() => setSidebarOpen(false)} />}
      {/* OOX-001 §1.1 — in hub/operational mode only the Research drawer opens; a
          stale persisted Vault/Notes/Calendar panel never re-opens the legacy drawer. */}
      {activePanel && (!hubChrome || activePanel === 'research') && (
        <PanelDrawer panelId={activePanel} onClose={() => handleSelectPanel(null)} lang={lang} />
      )}
      {!upsellDismissed && !sessionExpired && upsellGraceElapsed && (
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
