/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AILANE · INTERNATIONAL LANGUAGE ARCHITECTURE
 * AILANE-SPEC-LANG-001 v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * SINGLE SOURCE OF TRUTH for all translatable strings across:
 *   - ailane.ai main website (static GitHub Pages)
 *   - /governance-dashboard/
 *   - /AiLaneCEO/
 *   - /ticker/
 *   - All future sub-applications
 *
 * USAGE (static HTML pages):
 *   <script src="/i18n/translations.js"></script>
 *   <script src="/i18n/i18n.js"></script>
 *   <h1 data-i18n="nav.platform"></h1>
 *
 * USAGE (React apps):
 *   import { t, setLang, getLang } from '/i18n/translations.js';
 *   const ui = t(getLang());
 *
 * ADDING A NEW LANGUAGE:
 *   1. Add a block below (copy 'cy' as template)
 *   2. Update supported_languages table: active = TRUE, ui_available = TRUE
 *   3. Add language code to relevant organisations.enabled_languages
 *   4. No other code changes required anywhere.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const AILANE_TRANSLATIONS = {

  // ─────────────────────────────────────────────────────────────────────────
  // ENGLISH (en) — canonical reference language
  // ─────────────────────────────────────────────────────────────────────────
  en: {
    _meta: {
      code: "en",
      name: "English",
      native: "English",
      dir: "ltr",
      locale: "en-GB",
    },

    // Navigation
    nav: {
      platform: "Platform",
      pricing: "Pricing",
      howItWorks: "How It Works",
      earlyAccess: "Request Early Access",
      dashboard: "Dashboard",
      knowledgeLibrary: "Knowledge Library",
      complianceChecker: "Compliance Checker",
      ticker: "Regulatory Ticker",
    },

    // Hero / Landing
    hero: {
      headline: "Constitutional-Grade Employment Law Intelligence",
      subheadline: "Quantify your regulatory exposure before it becomes a tribunal claim.",
      ctaPrimary: "Request Early Access",
      ctaSecondary: "See How It Works",
      trustLine: "Used by compliance leads and HR directors across the UK.",
    },

    // How It Works
    how: {
      heading: "How It Works",
      step1Title: "Adverse Claim Exposure",
      step1Body: "The ACEI quantifies your external regulatory environment across 12 employment law categories using 130,000+ tribunal decisions.",
      step2Title: "Regulatory Readiness",
      step2Body: "The RRI measures your internal preparedness — policies, training, documentation — against constitutional standards.",
      step3Title: "Compliance Conduct",
      step3Body: "The CCI scores your historical conduct posture using Bayesian credibility weighting across six components.",
    },

    // Pricing
    pricing: {
      heading: "Transparent Pricing",
      subheading: "Institutional-grade intelligence. No hidden fees.",
      tier1Name: "Operational Readiness",
      tier1Price: "£199",
      tier1Period: "per month",
      tier1Cta: "Get Started",
      tier2Name: "Governance",
      tier2Price: "£799",
      tier2Period: "per month",
      tier2Cta: "Get Started",
      tier3Name: "Enterprise",
      tier3Price: "Custom",
      tier3Period: "",
      tier3Cta: "Contact Us",
      annualDiscount: "Save 20% with annual billing",
    },

    // Early Access
    earlyAccess: {
      heading: "Request Early Access",
      subheading: "Join the waitlist for priority onboarding.",
      namePlaceholder: "Full name",
      emailPlaceholder: "Work email",
      orgPlaceholder: "Organisation name",
      rolePlaceholder: "Your role",
      submit: "Request Access",
      successMessage: "Thank you. We'll be in touch within 24 hours.",
      privacyNotice: "Your data is handled in accordance with our Privacy Policy.",
    },

    // Knowledge Library
    library: {
      title: "Knowledge Library",
      subtitle: "Regulatory Intelligence Platform",
      searchPlaceholder: "Search instruments…",
      filterAll: "All Instruments",
      filterWales: "Wales Only",
      filterGB: "Great Britain",
      sortSig: "By Significance",
      sortAlpha: "Alphabetical",
      noResults: "No instruments match your current filters.",
      loading: "Loading library…",
      error: "Failed to load library. Please refresh.",
      summary: "Summary",
      obligations: "Key Obligations",
      provisions: "Key Provisions",
      tierLabel: "Access Tier",
      jurisdictionLabel: "Jurisdiction",
      translationNotice: "AI-assisted translation · Not official legal Welsh",
      officialBilingual: "Official bilingual legislation",
      walesLayerActive: "Wales Layer Active",
      welshAvailable: "Welsh available",
      instrumentCount: (n) => `${n} instrument${n !== 1 ? "s" : ""}`,
      upgradePrompt: "Upgrade to Governance to access the full statutory text.",
      fullTextHeading: "Full Statutory Text",
      fullTextLoading: "Loading statutory text…",
      viewFullText: "View full statute",
      collapseFullText: "Collapse",
    },

    // Compliance Checker
    compliance: {
      title: "Compliance Checker",
      uploadPrompt: "Upload your policy document for analysis",
      checkButton: "Run Compliance Check",
      resultsHeading: "Compliance Results",
      rriScore: "RRI Score",
      trackA: "Track A — Attestation",
      trackB: "Track B — Documentary",
      noUpload: "Please upload a document to begin.",
    },

    // Ticker
    ticker: {
      title: "Regulatory Intelligence Ticker",
      loading: "Loading latest intelligence…",
      noItems: "No items available.",
      constitutionalAnalysis: "Constitutional Analysis",
      exportPdf: "Export PDF",
      lastUpdated: "Last updated",
    },

    // Translation / Language UI
    lang: {
      toggleLabel: "Language",
      switchTo: "Switch language",
      availableIn: "Available in",
      officialBilingual: "Official bilingual legislation",
      aiAssisted: "AI-assisted translation · Not official legal Welsh",
      notAvailable: "Not available in this language",
    },

    // Territory / Jurisdiction
    territory: {
      wales: "Wales",
      gb: "Great Britain",
      scotland: "Scotland",
      ireland: "Ireland",
      walesLayer: "Wales Layer",
      jurisdictionBadge: (t) => t,
    },

    // Tier names
    tiers: {
      all: "All Tiers",
      operational_readiness: "Operational Readiness",
      governance: "Governance",
      enterprise: "Enterprise",
    },

    // General UI
    ui: {
      close: "Close",
      back: "Back",
      next: "Next",
      save: "Save",
      cancel: "Cancel",
      confirm: "Confirm",
      loading: "Loading…",
      error: "An error occurred. Please try again.",
      poweredBy: "Powered by Ailane Constitutional Intelligence",
      copyright: (year) => `© ${year} AI Lane Limited. All rights reserved.`,
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      contact: "Contact",
    },

    // Footer
    footer: {
      tagline: "Constitutional-grade employment law intelligence for UK businesses.",
      companyNumber: "Company No. 17035654",
      trademark: "UK Trademark No. 00004347220",
      ico: "ICO Registration No. 00013389720",
      links: {
        privacy: "Privacy Policy",
        terms: "Terms of Service",
        tribunalPrivacy: "Tribunal Data Privacy Notice",
        earlyAccess: "Early Access",
      },
    },
  },


  // ─────────────────────────────────────────────────────────────────────────
  // CYMRAEG / WELSH (cy)
  // Status: ui_available = TRUE, statute_available = TRUE
  // ─────────────────────────────────────────────────────────────────────────
  cy: {
    _meta: {
      code: "cy",
      name: "Welsh",
      native: "Cymraeg",
      dir: "ltr",
      locale: "cy-GB",
    },

    nav: {
      platform: "Platfform",
      pricing: "Prisiau",
      howItWorks: "Sut Mae'n Gweithio",
      earlyAccess: "Mynediad Cynnar",
      dashboard: "Dangosfwrdd",
      knowledgeLibrary: "Llyfrgell Wybodaeth",
      complianceChecker: "Gwiriwr Cydymffurfiaeth",
      ticker: "Ticed Rheoleiddio",
    },

    hero: {
      headline: "Cuddwybodaeth Gyfraith Cyflogaeth ar Raddfa Gyfansoddiadol",
      subheadline: "Meintiwch eich amlygiad rheoleiddiol cyn iddo ddod yn hawliad tribiwnlys.",
      ctaPrimary: "Mynediad Cynnar",
      ctaSecondary: "Gweld Sut Mae'n Gweithio",
      trustLine: "Defnyddir gan arweinwyr cydymffurfiaeth a chyfarwyddwyr AD ledled y DU.",
    },

    how: {
      heading: "Sut Mae'n Gweithio",
      step1Title: "Amlygiad Hawliad Niweidiol",
      step1Body: "Mae'r ACEI yn meintio eich amgylchedd rheoleiddiol allanol ar draws 12 categori cyfraith cyflogaeth gan ddefnyddio 130,000+ o benderfyniadau tribiwnlys.",
      step2Title: "Parodrwydd Rheoleiddiol",
      step2Body: "Mae'r RRI yn mesur eich parodrwydd mewnol — polisïau, hyfforddiant, dogfennaeth — yn erbyn safonau cyfansoddiadol.",
      step3Title: "Ymddygiad Cydymffurfiaeth",
      step3Body: "Mae'r CCI yn sgorio eich agwedd ymddygiad hanesyddol gan ddefnyddio pwysoli hygrededd Bayesaidd ar draws chwe chydran.",
    },

    pricing: {
      heading: "Prisiau Tryloyw",
      subheading: "Cuddwybodaeth ar raddfa sefydliadol. Dim ffioedd cudd.",
      tier1Name: "Parodrwydd Gweithredol",
      tier1Price: "£199",
      tier1Period: "y mis",
      tier1Cta: "Cychwyn",
      tier2Name: "Llywodraethu",
      tier2Price: "£799",
      tier2Period: "y mis",
      tier2Cta: "Cychwyn",
      tier3Name: "Mentrol",
      tier3Price: "Cymesur",
      tier3Period: "",
      tier3Cta: "Cysylltu",
      annualDiscount: "Arbed 20% gyda bilio blynyddol",
    },

    earlyAccess: {
      heading: "Mynediad Cynnar",
      subheading: "Ymunwch â'r rhestr aros am flaenoriaeth ymuno.",
      namePlaceholder: "Enw llawn",
      emailPlaceholder: "E-bost gwaith",
      orgPlaceholder: "Enw'r sefydliad",
      rolePlaceholder: "Eich rôl",
      submit: "Gofyn am Fynediad",
      successMessage: "Diolch. Byddwn mewn cysylltiad o fewn 24 awr.",
      privacyNotice: "Trinir eich data yn unol â'n Polisi Preifatrwydd.",
    },

    library: {
      title: "Llyfrgell Wybodaeth",
      subtitle: "Platfform Cuddwybodaeth Reoleiddiol",
      searchPlaceholder: "Chwilio offerynnau…",
      filterAll: "Pob Offeryn",
      filterWales: "Cymru yn Unig",
      filterGB: "Prydain Fawr",
      sortSig: "Yn ôl Arwyddocâd",
      sortAlpha: "Yn Nhrefn yr Wyddor",
      noResults: "Nid oes offerynnau'n cyfateb â'ch hidlyddion cyfredol.",
      loading: "Yn llwytho'r llyfrgell…",
      error: "Methwyd â llwytho'r llyfrgell. Adnewyddwch y dudalen.",
      summary: "Crynodeb",
      obligations: "Prif Rwymedigaethau",
      provisions: "Prif Ddarpariaethau",
      tierLabel: "Haen Mynediad",
      jurisdictionLabel: "Awdurdodaeth",
      translationNotice: "Cyfieithiad a gynorthwyir gan AI · Nid cyfraith Gymraeg swyddogol",
      officialBilingual: "Deddfwriaeth ddwyieithog swyddogol",
      walesLayerActive: "Haen Cymru Weithredol",
      welshAvailable: "Cymraeg ar gael",
      instrumentCount: (n) => `${n} offeryn`,
      upgradePrompt: "Uwchraddiwch i Lywodraethu i gael mynediad at y testun statudol llawn.",
      fullTextHeading: "Testun Statudol Llawn",
      fullTextLoading: "Yn llwytho'r testun statudol…",
      viewFullText: "Gweld y statud llawn",
      collapseFullText: "Cau",
    },

    compliance: {
      title: "Gwiriwr Cydymffurfiaeth",
      uploadPrompt: "Llwythwch eich dogfen bolisi i fyny am ddadansoddiad",
      checkButton: "Rhedeg Gwiriad Cydymffurfiaeth",
      resultsHeading: "Canlyniadau Cydymffurfiaeth",
      rriScore: "Sgôr RRI",
      trackA: "Trac A — Ardystiad",
      trackB: "Trac B — Dogfennol",
      noUpload: "Llwythwch ddogfen i fyny i ddechrau.",
    },

    ticker: {
      title: "Ticed Cuddwybodaeth Reoleiddiol",
      loading: "Yn llwytho'r cuddwybodaeth ddiweddaraf…",
      noItems: "Dim eitemau ar gael.",
      constitutionalAnalysis: "Dadansoddiad Cyfansoddiadol",
      exportPdf: "Allforio PDF",
      lastUpdated: "Diweddarwyd ddiwethaf",
    },

    lang: {
      toggleLabel: "Iaith",
      switchTo: "Newid iaith",
      availableIn: "Ar gael yn",
      officialBilingual: "Deddfwriaeth ddwyieithog swyddogol",
      aiAssisted: "Cyfieithiad a gynorthwyir gan AI · Nid cyfraith Gymraeg swyddogol",
      notAvailable: "Ddim ar gael yn yr iaith hon",
    },

    territory: {
      wales: "Cymru",
      gb: "Prydain Fawr",
      scotland: "Yr Alban",
      ireland: "Iwerddon",
      walesLayer: "Haen Cymru",
      jurisdictionBadge: (t) => t,
    },

    tiers: {
      all: "Pob Haen",
      operational_readiness: "Parodrwydd Gweithredol",
      governance: "Llywodraethu",
      enterprise: "Mentrol",
    },

    ui: {
      close: "Cau",
      back: "Yn ôl",
      next: "Nesaf",
      save: "Cadw",
      cancel: "Canslo",
      confirm: "Cadarnhau",
      loading: "Yn llwytho…",
      error: "Digwyddodd gwall. Rhowch gynnig arall arni.",
      poweredBy: "Grymherir gan Ailane Constitutional Intelligence",
      copyright: (year) => `© ${year} AI Lane Limited. Cedwir pob hawl.`,
      privacyPolicy: "Polisi Preifatrwydd",
      termsOfService: "Telerau Gwasanaeth",
      contact: "Cyswllt",
    },

    footer: {
      tagline: "Cuddwybodaeth gyfraith cyflogaeth ar raddfa gyfansoddiadol i fusnesau'r DU.",
      companyNumber: "Rhif Cwmni: 17035654",
      trademark: "Nod Masnach y DU Rhif: 00004347220",
      ico: "Rhif Cofrestru ICO: 00013389720",
      links: {
        privacy: "Polisi Preifatrwydd",
        terms: "Telerau Gwasanaeth",
        tribunalPrivacy: "Tribunal Data Privacy Notice",
        earlyAccess: "Mynediad Cynnar",
      },
    },
  },


  // ─────────────────────────────────────────────────────────────────────────
  // GAEILGE / IRISH (ga) — INACTIVE: ui_available = FALSE
  // Activate when Ireland territory launches
  // Template: copy cy block, translate to Irish
  // ─────────────────────────────────────────────────────────────────────────
  ga: {
    _meta: {
      code: "ga",
      name: "Irish",
      native: "Gaeilge",
      dir: "ltr",
      locale: "ga-IE",
      status: "INACTIVE — pending Ireland territory launch",
    },
    // Strings to be completed on Ireland territory activation
  },


  // ─────────────────────────────────────────────────────────────────────────
  // GÀIDHLIG / SCOTTISH GAELIC (gd) — INACTIVE
  // Activate when Scotland territory launches
  // ─────────────────────────────────────────────────────────────────────────
  gd: {
    _meta: {
      code: "gd",
      name: "Scottish Gaelic",
      native: "Gàidhlig",
      dir: "ltr",
      locale: "gd-GB",
      status: "INACTIVE — pending Scotland territory launch",
    },
  },

};


// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get full translation object for a language.
 * Falls back to English if language not found or incomplete.
 */
const t = (langCode = "en") => {
  return AILANE_TRANSLATIONS[langCode] || AILANE_TRANSLATIONS["en"];
};

/**
 * Get or set the persisted language preference.
 * Uses localStorage key 'ailane_lang'.
 * Safe: returns 'en' if localStorage unavailable.
 */
const getLang = () => {
  try {
    return localStorage.getItem("ailane_lang") || "en";
  } catch {
    return "en";
  }
};

const setLang = (code) => {
  try {
    localStorage.setItem("ailane_lang", code);
  } catch {}
  // Dispatch event so all listeners can re-render
  window.dispatchEvent(new CustomEvent("ailane:langchange", { detail: { lang: code } }));
};

/**
 * Get list of currently active languages.
 */
const getActiveLangs = () => {
  return Object.values(AILANE_TRANSLATIONS)
    .filter(l => l._meta && l._meta.code)
    .filter(l => !l._meta.status?.includes("INACTIVE"))
    .map(l => ({
      code: l._meta.code,
      name: l._meta.name,
      native: l._meta.native,
      dir: l._meta.dir,
    }));
};

// Export for both ES module and CommonJS / browser global contexts
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AILANE_TRANSLATIONS, t, getLang, setLang, getActiveLangs };
} else if (typeof window !== "undefined") {
  window.AILANE_I18N = { AILANE_TRANSLATIONS, t, getLang, setLang, getActiveLangs };
}
