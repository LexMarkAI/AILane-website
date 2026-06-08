/* ===========================================================================
   Legal Oversight Document Room — shared sub-page layer
   ---------------------------------------------------------------------------
   Reuses the room's OWN magic-link session (RULE 26 / RULE 2 pattern): one
   Supabase client, getSession() then onAuthStateChange with a 6s timeout; on
   failure window.location.replace('/legal-oversight/') silently (the hub gate
   handles sign-in). No second auth surface here, no CLID machinery, no writes.

   Provides: the client + EF constants, the artefact viewer (open via
   lovr-vault-resolve), an authed observe() into lovr-dealroom-observe, and the
   page chrome (user email + sign-out). All read-only. Regulatory intelligence,
   not legal advice.
   =========================================================================== */
(function(){
  "use strict";

  // Public client values — identical to legal-oversight/index.html (the room's
  // own session is shared across the hub and these sub-pages).
  const SUPABASE_URL = "https://cnbsxwtvazfvzmltkuvx.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g";
  const RESOLVE_FN = "lovr-vault-resolve";
  const DEALROOM_FN = "lovr-dealroom-observe";
  const HUB = "/legal-oversight/";

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
  });

  const SOURCE_CHIP = {
    "content-store":"In-room note", "template-pack":"Operative template",
    "live-url":"Published page", "external-url":"External", "storage":"Document",
    "dealroom-render":"Rendered", "document-estate":"Estate"
  };
  const STATUS_LABEL = { "satisfied":"Satisfied","open":"Open","in-progress":"In progress","blocked":"Blocked","not-applicable":"N/A" };

  const esc = (s) => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const $ = (id) => document.getElementById(id);
  const gbp = (p) => p==null ? "—" : (p>=100000000 ? "£"+(p/100/1e6).toFixed(2)+"M" : "£"+(p/100).toLocaleString("en-GB",{minimumFractionDigits:2}));

  // ── RULE 26 auth guard ────────────────────────────────────────────────
  // <body style="visibility:hidden"> until a session is confirmed. getSession()
  // first; if absent, wait up to 6s for onAuthStateChange (covers a magic-link
  // return mid-process); otherwise redirect to the hub gate. No error UI.
  function guard(onReady){
    let settled = false;
    const succeed = (email)=>{
      if(settled) return; settled = true;
      document.body.style.visibility = "visible";
      bindChrome(email);
      try{ onReady && onReady(email); }catch(_e){}
    };
    const fail = ()=>{ if(settled) return; settled = true; window.location.replace(HUB); };

    sb.auth.getSession().then(({ data:{ session } })=>{
      if(session){ succeed(session.user.email || "Signed in"); return; }
      const t = setTimeout(fail, 6000);
      sb.auth.onAuthStateChange((_e, s)=>{
        if(settled) return;
        if(s){ clearTimeout(t); succeed(s.user.email || "Signed in"); }
      });
    }).catch(fail);
  }

  function bindChrome(email){
    const em = $("who-email"); if(em) em.textContent = email;
    const so = $("signout");
    if(so) so.addEventListener("click", async (e)=>{ e.preventDefault(); try{ await sb.auth.signOut(); }catch(_e){} window.location.replace(HUB); });
  }

  // ── Authed observe() into lovr-dealroom-observe (read-only) ───────────
  async function observe(payload){
    const { data:{ session } } = await sb.auth.getSession();
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${DEALROOM_FN}`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "apikey":SUPABASE_ANON_KEY, "Authorization":`Bearer ${session ? session.access_token : ""}` },
      body: JSON.stringify(payload)
    });
    if(!r.ok) throw new Error("observe "+r.status);
    return r.json();
  }

  // ── Artefact viewer (shared with the hub's behaviour) ─────────────────
  function openViewer(){ $("scrim").classList.add("open"); $("viewer").classList.add("open"); $("viewer").setAttribute("aria-hidden","false"); }
  function closeViewer(){ $("scrim").classList.remove("open"); $("viewer").classList.remove("open"); $("viewer").setAttribute("aria-hidden","true"); $("v-body").innerHTML=""; $("v-actions").innerHTML=""; }

  function mdFrame(markdown){
    const inner = (window.marked && typeof window.marked.parse === "function") ? window.marked.parse(markdown||"") : esc(markdown||"");
    const doc = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        body{margin:0;padding:30px 34px;background:#fff;color:#1f2733;
          font:15px/1.62 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;max-width:760px}
        h1,h2,h3{font-family:Georgia,"Times New Roman",serif;color:#0f1722;line-height:1.25;margin:1.4em 0 .5em}
        h1{font-size:24px;border-bottom:1px solid #e6e9ef;padding-bottom:.3em}
        h2{font-size:19px} h3{font-size:16px}
        p,li{font-size:15px} code{font-family:ui-monospace,Menlo,Consolas,monospace;background:#f3f5f8;padding:.1em .35em;border-radius:4px;font-size:13px}
        table{border-collapse:collapse;width:100%;margin:1em 0;font-size:13.5px}
        th,td{border:1px solid #dfe3ea;padding:7px 10px;text-align:left;vertical-align:top}
        th{background:#f6f8fb} hr{border:none;border-top:1px solid #e6e9ef;margin:1.6em 0}
        blockquote{border-left:3px solid #d8a23a;margin:1em 0;padding:.2em 0 .2em 14px;color:#5b6470}
        a{color:#0b69b8} em{color:#4a5568}
      </style></head><body>${inner}</body></html>`;
    return `<iframe sandbox srcdoc="${esc(doc)}" title="Document"></iframe>`;
  }

  // Open a registry artefact via lovr-vault-resolve (preview/download).
  async function openArtefact(artefactId, action){
    openViewer();
    $("v-title").textContent = "Opening…";
    $("v-meta").innerHTML = "";
    $("v-body").innerHTML = `<div class="vpad"><span class="spin"></span>Resolving artefact…</div>`;
    $("v-actions").innerHTML = "";
    try{
      const { data, error } = await sb.functions.invoke(RESOLVE_FN, { body:{ artefact_id:artefactId, action:action||"preview" } });
      if(error){
        let detail = error.message||"Error";
        try{ const ctx = await error.context?.json?.(); if(ctx&&(ctx.error||ctx.detail)) detail = (ctx.error||"")+(ctx.detail?" — "+ctx.detail:""); }catch(_e){}
        $("v-title").textContent = "Unable to open";
        $("v-body").innerHTML = `<div class="vpad"><div class="big">This artefact could not be opened</div><div>${esc(detail)}</div></div>`;
        return;
      }
      try{ gtag('event','lovr_open_artefact',{ doc_code:data.doc_code, content_mode:data.content_mode, surface:'documents' }); }catch(_e){}
      $("v-title").textContent = data.name || data.doc_code || "Artefact";
      const meta = [];
      if(data.version_label) meta.push(esc(data.version_label));
      if(data.content_source) meta.push(esc(SOURCE_CHIP[data.content_source]||data.content_source));
      if(data.doc_code) meta.push(`<span style="color:var(--muted-2)">${esc(data.doc_code)}</span>`);
      $("v-meta").innerHTML = meta.join(" · ");

      if(data.content_mode==="inline"){
        $("v-body").innerHTML = mdFrame(data.body_markdown);
      } else if(data.content_mode==="signed_url"){
        $("v-body").innerHTML = `<iframe class="docframe" src="${esc(data.signed_url)}" title="Document"></iframe>`;
        $("v-actions").innerHTML =
          `<button class="btn sm" onclick="window.open('${esc(data.signed_url)}','_blank','noopener')">Open in new tab</button>
           <button class="btn sm" onclick="LOVR.openArtefact('${esc(artefactId)}','download')">Download</button>`;
      } else if(data.content_mode==="url"){
        $("v-body").innerHTML = `<div class="vpad"><div class="big">${esc(data.name||"Published page")}</div>
          <div>This is a published page. It opens in a new browser tab.</div></div>`;
        $("v-actions").innerHTML = `<button class="btn gold sm" onclick="window.open('${esc(data.url)}','_blank','noopener')">Open page ↗</button>`;
      } else if(data.content_mode==="pending"){
        $("v-body").innerHTML = `<div class="vpad"><div class="big">Document pending upload</div>
          <div>${esc(data.detail||"The authoritative file for this artefact has not yet been uploaded to the vault.")}</div></div>`;
      } else {
        $("v-body").innerHTML = `<div class="vpad"><div class="big">Unsupported</div><div>${esc(String(JSON.stringify(data)).slice(0,300))}</div></div>`;
      }
    }catch(err){
      $("v-title").textContent = "Unable to open";
      $("v-body").innerHTML = `<div class="vpad"><div class="big">Unexpected error</div><div>${esc(err.message||"Error")}</div></div>`;
    }
  }

  // Open a deal-room demonstration document via lovr-dealroom-observe.
  async function openDealDoc(docCode, name){
    openViewer();
    $("v-title").textContent = name || docCode || "Document";
    $("v-meta").innerHTML = docCode ? `<span style="color:var(--muted-2)">${esc(docCode)}</span>` : "";
    $("v-body").innerHTML = `<div class="vpad"><span class="spin"></span>Resolving document…</div>`;
    $("v-actions").innerHTML = "";
    try{
      const data = await observe({ action:"document", doc_code:docCode });
      try{ gtag('event','lovr_dealroom_document',{ doc_code:docCode }); }catch(_e){}
      if(data && data.content_mode==="pending"){
        $("v-body").innerHTML = `<div class="vpad"><div class="big">Document pending</div>
          <div>${esc(data.detail||"This document is not yet available in the deal room.")}</div></div>`;
      } else if(data && data.body_markdown!=null){
        if(data.name) $("v-title").textContent = data.name;
        $("v-body").innerHTML = mdFrame(data.body_markdown);
      } else {
        $("v-body").innerHTML = `<div class="vpad"><div class="big">Unavailable</div><div>This document has no displayable content.</div></div>`;
      }
    }catch(err){
      $("v-title").textContent = "Unable to open";
      $("v-body").innerHTML = `<div class="vpad"><div class="big">Unexpected error</div><div>${esc(err.message||"Error")}</div></div>`;
    }
  }

  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeViewer(); });

  window.LOVR = {
    sb, SUPABASE_URL, SUPABASE_ANON_KEY, RESOLVE_FN, DEALROOM_FN, HUB,
    SOURCE_CHIP, STATUS_LABEL, esc, $, gbp,
    guard, observe, openViewer, closeViewer, mdFrame, openArtefact, openDealDoc
  };
})();
