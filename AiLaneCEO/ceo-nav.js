/**
 * ──────────────────────────────────────────────────────────────────────
 * AILANE CEO RETURN NAVIGATION
 * ──────────────────────────────────────────────────────────────────────
 * 
 * Include this script on any Ailane sub-app (Knowledge Library,
 * Client Dashboard, Ticker, etc.) to render a floating "Return to
 * CEO Command Centre" button.
 * 
 * CREDENTIAL-GATED: The button is ONLY visible when the authenticated
 * Supabase user is mark@ailane.ai. All other users see nothing.
 * 
 * Usage:
 *   <script src="/AiLaneCEO/ceo-nav.js"></script>
 * 
 * Place this script tag just before </body> on any sub-app page.
 * 
 * AI Lane Limited · Company No. 17035654
 * Constitutional Basis: Internal governance tooling
 * ──────────────────────────────────────────────────────────────────────
 */
(function () {
  "use strict";

  // ─── CONFIG ─────────────────────────────────────────────────────────
  var CEO_EMAIL = "mark@ailane.ai";
  var CEO_COMMAND_CENTRE_URL = "/AiLaneCEO/";
  var SB_URL = "https://cnbsxwtvazfvzmltkuvx.supabase.co";
  var SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g";

  // ─── Don't render on the CEO Command Centre itself ──────────────────
  if (window.location.pathname.indexOf("/AiLaneCEO") === 0) return;

  // ─── CHECK AUTH ─────────────────────────────────────────────────────
  function checkAndRender() {
    var storedToken = null;
    var storedUser = null;

    try {
      storedToken = localStorage.getItem("sb-token");
      var rawUser = localStorage.getItem("sb-user");
      if (rawUser) storedUser = JSON.parse(rawUser);
    } catch (e) {
      return; // No access to localStorage or corrupt data — do nothing
    }

    // Must have token AND user with CEO email
    if (!storedToken || !storedUser) return;
    if (!storedUser.email || storedUser.email.toLowerCase() !== CEO_EMAIL) return;

    // Verify token is still valid before rendering
    fetch(SB_URL + "/auth/v1/user", {
      headers: {
        apikey: SB_ANON,
        Authorization: "Bearer " + storedToken,
      },
    })
      .then(function (res) {
        if (res.ok) {
          return res.json();
        }
        throw new Error("Token invalid");
      })
      .then(function (user) {
        if (user.email && user.email.toLowerCase() === CEO_EMAIL) {
          renderCEONav();
        }
      })
      .catch(function () {
        // Token expired or invalid — don't show the button
      });
  }

  // ─── RENDER FLOATING NAV ────────────────────────────────────────────
  function renderCEONav() {
    // Prevent duplicate rendering
    if (document.getElementById("ailane-ceo-return-nav")) return;

    var nav = document.createElement("div");
    nav.id = "ailane-ceo-return-nav";
    nav.innerHTML =
      '<a href="' +
      CEO_COMMAND_CENTRE_URL +
      '" style="' +
      "display:flex;align-items:center;gap:8px;padding:10px 18px 10px 14px;" +
      "background:linear-gradient(135deg,rgba(10,14,26,0.95),rgba(15,23,42,0.95));" +
      "border:1px solid rgba(34,211,238,0.3);" +
      "border-radius:10px;" +
      "color:#22d3ee;" +
      "text-decoration:none;" +
      "font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;" +
      "font-size:12px;font-weight:600;" +
      "box-shadow:0 8px 32px rgba(0,0,0,0.4),0 0 0 1px rgba(34,211,238,0.1);" +
      "backdrop-filter:blur(12px);" +
      "transition:all 0.2s ease;" +
      '"' +
      ' onmouseenter="this.style.borderColor=\'rgba(34,211,238,0.6)\';this.style.boxShadow=\'0 8px 32px rgba(0,0,0,0.5),0 0 20px rgba(34,211,238,0.15)\';this.style.transform=\'translateY(-1px)\'"' +
      ' onmouseleave="this.style.borderColor=\'rgba(34,211,238,0.3)\';this.style.boxShadow=\'0 8px 32px rgba(0,0,0,0.4),0 0 0 1px rgba(34,211,238,0.1)\';this.style.transform=\'translateY(0)\'"' +
      ">" +
      '<span style="font-size:14px">⚡</span>' +
      '<span style="letter-spacing:0.5px">CEO Command Centre</span>' +
      "</a>";

    nav.style.cssText =
      "position:fixed;bottom:24px;right:24px;z-index:99999;" +
      "animation:ailane-ceo-fadein 0.3s ease;";

    // Add animation keyframes
    var style = document.createElement("style");
    style.textContent =
      "@keyframes ailane-ceo-fadein { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }";
    document.head.appendChild(style);

    document.body.appendChild(nav);
  }

  // ─── INITIALISE ─────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAndRender);
  } else {
    checkAndRender();
  }
})();
