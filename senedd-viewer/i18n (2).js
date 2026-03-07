/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AILANE · I18N RUNTIME
 * AILANE-SPEC-LANG-001 v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DROP INTO ANY STATIC HTML PAGE:
 *   <script src="/i18n/translations.js"></script>
 *   <script src="/i18n/i18n.js"></script>
 *
 * MARK TRANSLATABLE ELEMENTS:
 *   <h1 data-i18n="hero.headline"></h1>
 *   <p data-i18n="hero.subheadline"></p>
 *   <input data-i18n-placeholder="earlyAccess.namePlaceholder">
 *   <a data-i18n="nav.pricing"></a>
 *
 * THE TOGGLE:
 *   Call window.ailaneI18n.setLang('cy') from any toggle button.
 *   All data-i18n elements re-render instantly.
 *   Language persists across all ailane.ai pages via localStorage.
 *
 * REACT APPS:
 *   Don't use this runtime — import { t, getLang, setLang } from translations.js
 *   and use the AILANE_TRANSLATIONS object directly in component state.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function() {
  "use strict";

  const { t, getLang, setLang, getActiveLangs } = window.AILANE_I18N;

  /**
   * Resolve a dot-notation key from a translation object.
   * e.g. "hero.headline" → translations.hero.headline
   */
  function resolve(obj, key) {
    return key.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), obj);
  }

  /**
   * Apply translations to all data-i18n elements in the document.
   */
  function applyTranslations(langCode) {
    const translations = t(langCode);

    // Text content: data-i18n="key.path"
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const val = resolve(translations, key);
      if (val !== null && typeof val === "string") {
        el.textContent = val;
      }
    });

    // Placeholder: data-i18n-placeholder="key.path"
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      const val = resolve(translations, key);
      if (val !== null && typeof val === "string") {
        el.placeholder = val;
      }
    });

    // Aria label: data-i18n-aria="key.path"
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
      const key = el.getAttribute("data-i18n-aria");
      const val = resolve(translations, key);
      if (val !== null && typeof val === "string") {
        el.setAttribute("aria-label", val);
      }
    });

    // Title attribute: data-i18n-title="key.path"
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      const val = resolve(translations, key);
      if (val !== null && typeof val === "string") {
        el.title = val;
      }
    });

    // HTML lang attribute on root
    document.documentElement.lang = langCode;

    // Text direction
    const meta = t(langCode)._meta;
    document.documentElement.dir = (meta && meta.dir) || "ltr";

    // Mark active toggle button if present
    document.querySelectorAll("[data-lang-toggle]").forEach(btn => {
      const btnLang = btn.getAttribute("data-lang-toggle");
      btn.classList.toggle("active", btnLang === langCode);
      btn.setAttribute("aria-pressed", btnLang === langCode ? "true" : "false");
    });
  }

  /**
   * Build a language toggle bar and inject into a container element.
   * Usage: <div id="lang-toggle-container"></div>
   */
  function buildToggle(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const langs = getActiveLangs();
    if (langs.length <= 1) return; // No toggle needed for single language

    container.innerHTML = "";
    langs.forEach(lang => {
      const btn = document.createElement("button");
      btn.setAttribute("data-lang-toggle", lang.code);
      btn.textContent = lang.code.toUpperCase();
      btn.title = lang.native;
      btn.addEventListener("click", () => {
        setLang(lang.code);
      });
      container.appendChild(btn);
    });
  }

  /**
   * Initialise on DOM ready.
   */
  function init() {
    const lang = getLang();
    applyTranslations(lang);

    // Listen for language change events (fired by setLang)
    window.addEventListener("ailane:langchange", (e) => {
      applyTranslations(e.detail.lang);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose public API
  window.ailaneI18n = {
    setLang,
    getLang,
    getActiveLangs,
    applyTranslations,
    buildToggle,
    t,
  };

})();
