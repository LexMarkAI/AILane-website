const{useState,useEffect}=React;
const SUPABASE_URL='https://cnbsxwtvazfvzmltkuvx.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g';
const CEO_EMAIL='mark@ailane.ai';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
window.eileenSupabase = sb;   // reused by the Eileen cross-platform panel
function shortDate(d){if(!d)return'';return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
function friendlyCat(c){if(!c)return'';return c.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase());}

// ── CONTROL TOWER CONTRACT (AMD-319 GCT-4 / AMD-322) ──
// shape() checks a ceo-control-tower-data payload before anything renders; a
// failure renders an error card, never zeros. src/fixture.test.mjs holds a
// copy of everything between the shape:begin / shape:end markers and fails if
// the two drift apart.
// shape:begin
const CT_QUEUE_COLS=['signal_id','detected_at','triage_class','severity_proposed','jurisdiction','event_kind','title','url','instrument_ref','instrument_keys','touches','sla_due','sla_breached','age_days','occurrence_count','source_table','source_row_ref'];
const CT_JURISDICTIONS=['UK','EU','US'];
const CT_SOURCE_TYPES=['primary_law','secondary_law','parliament','regulator_guidance','case_publication','provider_terms','ailane_pages'];
function shape(t){
  const errors=[];
  const isObj=o=>o!=null&&typeof o==='object'&&!Array.isArray(o);
  const isNum=n=>typeof n==='number'&&isFinite(n);
  if(!isObj(t)||!isObj(t.sections))return{ok:false,errors:['payload has no sections object']};
  const s=t.sections;
  const sm=s.summary;
  if(!isObj(sm))errors.push('summary missing');
  else{
    const d=sm.decisions_required,m=sm.monitors_unhealthy,q=sm.sources_quiet;
    if(!isObj(d)||!isNum(d.open)||!isNum(d.sla_breached)||!(d.oldest_age_days===null||isNum(d.oldest_age_days))||!isObj(d.by_class))errors.push('summary.decisions_required malformed');
    if(!isObj(m)||!['late','failed','unknown','of_active','critical_unhealthy'].every(k=>isNum(m[k]))||!('checked_at' in m))errors.push('summary.monitors_unhealthy malformed');
    if(!isObj(q)||!isNum(q.quiet)||!isNum(q.of_collectors)||!Array.isArray(q.keys))errors.push('summary.sources_quiet malformed');
  }
  const qu=s.queue;
  if(!isObj(qu)||!Array.isArray(qu.open)||!Array.isArray(qu.recently_decided))errors.push('queue missing');
  else qu.open.forEach((row,i)=>{
    if(!isObj(row)){errors.push('queue.open['+i+'] is not an object');return;}
    const miss=CT_QUEUE_COLS.filter(k=>!(k in row));
    if(miss.length)errors.push('queue.open['+i+'] missing '+miss.join(', '));
  });
  const cv=s.coverage;
  if(!isObj(cv)||!Array.isArray(cv.jurisdictions)||!Array.isArray(cv.source_types)||!isObj(cv.grid))errors.push('coverage missing');
  else CT_JURISDICTIONS.forEach(j=>CT_SOURCE_TYPES.forEach(st=>{
    const cell=isObj(cv.grid[j])?cv.grid[j][st]:null;
    if(!isObj(cell)||!Array.isArray(cell.collectors))errors.push('coverage.grid.'+j+'.'+st+' missing');
  }));
  const hl=s.health;
  if(!isObj(hl)||!Array.isArray(hl.monitors))errors.push('health missing');
  else hl.monitors.forEach((m,i)=>{if(!isObj(m)||typeof m.monitor_key!=='string'||!('state' in m))errors.push('health.monitors['+i+'] malformed');});
  return{ok:errors.length===0,errors};
}
// shape:end

// ── CONTROL TOWER BLOCKS (AMD-319 §1 / review §5 "The rebuilt page") ──
// Fed by ceo-control-tower-data (read) and ceo-control-tower-action (decide).
// Raw fetch with an explicit bearer; no sb.from(). Decisions are never retried
// automatically.
const CT_FN=`${SUPABASE_URL}/functions/v1`;
const CT_UNHEALTHY=['late','failed','unknown'];
function ctAge(n){const v=Number(n);if(n==null||!isFinite(v))return'—';return Number.isInteger(v)?String(v):v.toFixed(1);}
function ctPillClass(c){return c==='material'||c==='estate'?c:'other';}
function ctDotClass(h){if(h==null)return'none';if(h==='ok'||h==='late'||h==='failed')return h;return'unknown';}
function ctHttpUrl(u){return typeof u==='string'&&/^https?:\/\//i.test(u)?u:null;}

function ThreeNumbers({summary,onJump}){
  const d=summary.decisions_required,m=summary.monitors_unhealthy,q=summary.sources_quiet;
  const unhealthy=m.late+m.failed+m.unknown;
  if(d.open===0&&unhealthy===0&&q.quiet===0){
    return <div className="card"><div className="card-body tn-clear">Nothing requires a decision; every monitor has reported; every collector is live.</div></div>;
  }
  const bc=d.by_class||{};
  const classLine=Object.keys(bc).filter(k=>Number(bc[k])>0).map(k=>bc[k]+' '+k).join(' · ')||'none by class';
  const tone=n=>n>0?'var(--accent-red)':'var(--accent-green)';
  return(
    <div className="tn-grid">
      <button type="button" className="tn-card" onClick={()=>onJump('ct-queue')}>
        <div className="label">Decisions required</div>
        <div className="value" style={{color:tone(d.open)}}>{d.open}</div>
        <div className="sub">{d.sla_breached} breached · oldest {ctAge(d.oldest_age_days)} d · {classLine}</div>
      </button>
      <button type="button" className="tn-card" onClick={()=>onJump('ct-health')}>
        <div className="label">Monitors unhealthy</div>
        <div className="value" style={{color:tone(unhealthy)}}>{unhealthy}<span className="of"> of {m.of_active}</span></div>
        <div className="sub">{m.critical_unhealthy} critical · checked {m.checked_at?acgeDateTime(m.checked_at):'— no check today'}</div>
      </button>
      <button type="button" className="tn-card" onClick={()=>onJump('ct-coverage')}>
        <div className="label">Sources quiet</div>
        <div className="value" style={{color:tone(q.quiet)}}>{q.quiet}<span className="of"> of {q.of_collectors}</span></div>
        <div className="sub">{q.keys.length?q.keys.join(' · '):'every collector live'}</div>
      </button>
    </div>
  );
}

function DirectorQueue({queue,token,onDecided}){
  const[cls,setCls]=useState('all');const[jur,setJur]=useState('all');
  const[panel,setPanel]=useState(null);      // {signal_id, action}
  const[note,setNote]=useState('');const[deferUntil,setDeferUntil]=useState('');
  const[busy,setBusy]=useState(false);const[err,setErr]=useState(null);
  const[notice,setNotice]=useState(null);
  const open=queue.open||[];const decided=queue.recently_decided||[];
  const rows=open.filter(r=>(cls==='all'||r.triage_class===cls)&&(jur==='all'||r.jurisdiction===jur));
  function openPanel(signal_id,action){if(busy)return;setPanel({signal_id,action});setNote('');setDeferUntil('');setErr(null);}
  function closePanel(){setPanel(null);setNote('');setDeferUntil('');setErr(null);}
  const deferValid=/^\d{4}-\d{2}-\d{2}$/.test(deferUntil);
  async function confirm(row){
    if(busy||!panel)return;
    if(panel.action==='defer'&&!deferValid){setErr('Choose a defer-until date.');return;}
    setBusy(true);setErr(null);setNotice(null);
    const body={action:panel.action,signal_id:row.signal_id,note:note};
    if(panel.action==='defer')body.defer_until=deferUntil;
    try{
      const r=await fetch(`${CT_FN}/ceo-control-tower-action`,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({}));
      if(r.status===200&&j&&j.ok===true){closePanel();onDecided({type:'decided',row,result:j,note:note.trim()||null});}
      else if(r.status===409){closePanel();setNotice('Already decided elsewhere — refreshing');onDecided({type:'stale'});}
      else if(r.status===400)setErr((j&&j.error)||'Rejected by the server (HTTP 400)');
      else if(r.status===429)setErr('Rate limit — wait a minute');
      else setErr(`Decision not recorded (HTTP ${r.status})`);
    }catch(e){setErr('Decision not recorded (network error)');}
    setBusy(false);
  }
  const sel={padding:'5px 8px',background:'var(--bg-base)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',fontSize:'0.64rem',fontFamily:'var(--font-body)',cursor:'pointer'};
  return(
    <div className="card ct-anchor" id="ct-queue">
      <div className="card-head">
        <div className="card-head-title">Director queue</div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <select style={sel} value={cls} onChange={e=>setCls(e.target.value)} aria-label="Filter by class">
            <option value="all">all classes</option><option value="material">material</option><option value="estate">estate</option>
          </select>
          <select style={sel} value={jur} onChange={e=>setJur(e.target.value)} aria-label="Filter by jurisdiction">
            <option value="all">all jurisdictions</option><option value="UK">UK</option><option value="EU">EU</option><option value="US">US</option>
          </select>
          <span className="card-head-badge">{rows.length} of {open.length} open</span>
        </div>
      </div>
      <div className="card-body">
        {notice&&<div className="q-notice">{notice}</div>}
        {open.length===0&&<div className="ts">No open decisions.</div>}
        {open.length>0&&rows.length===0&&<div className="ts">No open decisions match the filters.</div>}
        {rows.map(row=>{
          const touches=Array.isArray(row.touches)?row.touches:[];
          const href=ctHttpUrl(row.url);
          const isOpen=panel&&panel.signal_id===row.signal_id;
          return(
            <div className="q-row" key={row.signal_id}>
              <div className="q-top">
                <span className={'pill '+ctPillClass(row.triage_class)}>{row.triage_class||'unclassified'}</span>
                {row.jurisdiction&&<span className="q-mono">{row.jurisdiction}</span>}
                {row.instrument_ref&&<span className="q-mono q-ref">{row.instrument_ref}</span>}
                {href?<a className="q-title" href={href} target="_blank" rel="noopener">{row.title||'(untitled signal)'}</a>:<span className="q-title">{row.title||'(untitled signal)'}</span>}
              </div>
              <div className="q-meta">
                {touches.length===0?<span className="ts">no estate surface</span>:touches.map((t,i)=><span className="vchip" key={i}>{(t&&t.surface_kind)||'?'}: {(t&&t.surface_ref)||'?'}</span>)}
                <span className="ts">{ctAge(row.age_days)} d old</span>
                {row.sla_breached===true?<span className="q-breach">SLA breached</span>:row.sla_due?<span className="ts">SLA {shortDate(row.sla_due)}</span>:null}
                {Number(row.occurrence_count)>1&&<span className="ts">×{row.occurrence_count} occurrences</span>}
              </div>
              <div className="q-actions">
                {[['ratify','Ratify'],['defer','Defer'],['reject','Reject']].map(([a,label])=>(
                  <button type="button" key={a} className={isOpen&&panel.action===a?'on':''} disabled={busy} onClick={()=>isOpen&&panel.action===a?closePanel():openPanel(row.signal_id,a)}>{label}</button>
                ))}
              </div>
              {isOpen&&(
                <div className="q-panel">
                  <textarea maxLength={2000} rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optional, max 2000 characters)"/>
                  <div className="q-panel-row">
                    {panel.action==='defer'&&<label className="ts">Defer until <input type="date" required value={deferUntil} onChange={e=>setDeferUntil(e.target.value)}/></label>}
                    <button type="button" className="q-confirm" disabled={busy||(panel.action==='defer'&&!deferValid)} onClick={()=>confirm(row)}>{busy?'Recording…':'Confirm '+panel.action}</button>
                    <button type="button" className="q-cancel" disabled={busy} onClick={closePanel}>Cancel</button>
                    <span className="ts">{note.length}/2000</span>
                  </div>
                  {err&&<div className="q-err">{err}</div>}
                </div>
              )}
            </div>
          );
        })}
        <details className="collapse q-decided">
          <summary><span>Recently decided ({decided.length})</span><span className="chev">▾ expand</span></summary>
          <div className="collapse-body">
            {decided.length===0&&<div className="ts">No decisions recorded yet.</div>}
            {decided.length>0&&(
              <div className="ct-table-wrap"><table className="ct-table">
                <thead><tr><th>Decided</th><th>Decision</th><th>Class</th><th>Title</th><th>Note</th></tr></thead>
                <tbody>{decided.map((d,i)=>(
                  <tr key={(d.signal_id||'')+':'+i}><td className="mono">{acgeDateTime(d.decided_at)}</td><td className="mono">{d.decision}</td><td><span className={'pill '+ctPillClass(d.triage_class)}>{d.triage_class||'—'}</span></td><td>{d.title}</td><td className="muted">{d.decision_note||''}</td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

function CoverageMap({coverage}){
  const js=coverage.jurisdictions||[];const ts=coverage.source_types||[];const grid=coverage.grid||{};
  const cellOf=(j,t)=>(grid[j]&&grid[j][t])||{collectors:[],last_signal_at:null};
  let covered=0;js.forEach(j=>ts.forEach(t=>{if((cellOf(j,t).collectors||[]).length>0)covered++;}));
  return(
    <details className="collapse ct-anchor" id="ct-coverage">
      <summary><span>Coverage map · {covered} of {js.length*ts.length} cells covered</span><span className="chev">▾ expand</span></summary>
      <div className="collapse-body">
        <div className="cov-grid">
          <div className="cov-table" style={{gridTemplateColumns:`64px repeat(${ts.length},minmax(130px,1fr))`}}>
            <div className="cov-head"/>
            {ts.map(t=><div className="cov-head" key={t}>{friendlyCat(t)}</div>)}
            {js.map(j=>[
              <div className="cov-jur" key={j}>{j}</div>,
              ...ts.map(t=>{
                const cell=cellOf(j,t);const cols=cell.collectors||[];
                return(
                  <div className={'cov-cell'+(cols.length===0?' empty':'')} key={j+':'+t}>
                    {cols.length===0&&<span className="muted">no collector</span>}
                    {cols.map(c=>(
                      <div className="cov-key" key={c.key} title={(c.registered?'registered':'not registered')+' · health: '+(c.health==null?'never checked':c.health)}>
                        <span className={'dot '+ctDotClass(c.health)}/><span>{c.key}</span>
                      </div>
                    ))}
                    {cols.length>0&&<div className="cov-last">{cell.last_signal_at?'last signal '+shortDate(cell.last_signal_at):'no signal yet'}</div>}
                  </div>
                );
              }),
            ])}
          </div>
        </div>
        <div className="muted-note">Dot: green ok · red late or failed · grey unknown · hollow unregistered or never checked.</div>
      </div>
    </details>
  );
}

function MonitorHealth({health}){
  const mons=health.monitors||[];
  const active=mons.filter(m=>m.active!==false);
  const unhealthy=active.filter(m=>m.state==null||CT_UNHEALTHY.includes(m.state)).length;
  return(
    <details className="collapse ct-anchor" id="ct-health">
      <summary><span>Monitor health · {unhealthy} unhealthy of {active.length}</span><span className="chev">▾ expand</span></summary>
      <div className="collapse-body">
        {mons.length===0&&<div className="ts">No monitors registered.</div>}
        {mons.length>0&&(
          <div className="ct-table-wrap"><table className="ct-table">
            <thead><tr><th>Monitor</th><th>Key</th><th>Kind</th><th>Cadence</th><th>State</th><th>Last proof</th><th>Hours overdue</th><th>Critical</th></tr></thead>
            <tbody>{mons.map(m=>(
              <tr key={m.monitor_key}>
                <td>{m.display_name}</td><td className="mono">{m.monitor_key}</td><td>{m.kind}</td><td>{m.cadence}</td>
                <td><span className={'hstate '+(m.state||'none')}>{m.state||'no check'}</span></td>
                <td className="mono">{m.last_proof_at?acgeDateTime(m.last_proof_at):'—'}</td>
                <td className="mono">{m.hours_overdue==null?'':m.hours_overdue}</td>
                <td>{m.critical?<span className="crit">critical</span>:''}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </details>
  );
}

function TowerError({what,status}){
  return <div className="card ct-error"><div className="card-body">{what} unavailable — {status==='shape'?'response failed the contract check':status==='network'?'network error':'HTTP '+status}. No figures are shown rather than zeros.</div></div>;
}

function Collapse({title,children}){
  return(
    <details className="collapse">
      <summary><span>{title}</span><span className="chev">▾ expand</span></summary>
      <div className="collapse-body">{children}</div>
    </details>
  );
}

// Legal & Compliance Control Tower (AMD-319 §1, GCT-4; AMD-322). Order:
//  1. Three numbers  2. Director queue (+ decision dialog)  3. Coverage map
//  4. Registers (collapsed, carried over unchanged)  5. Legacy queues (collapsed, retiring in Phase 4)
//  6. Monitor health (collapsed)  7. Legal Oversight Room
// Register reads are authenticated REST; eileen_presales_compliance_log is service-role-only
// (not browser-readable) and is shown as a note, not fabricated.

function App(){
  const[auth,setAuth]=useState('checking');const[token,setToken]=useState(null);
  const[tower,setTower]=useState(null);           // ceo-control-tower-data {generated_at, sections}
  const[towerError,setTowerError]=useState(null); // null | {status}
  const[refreshError,setRefreshError]=useState(null);
  const[legal,setLegal]=useState(null);      // ceo-dashboard-data legal_detail (demoted watch)
  const[certs,setCerts]=useState(null);
  const[vendors,setVendors]=useState(null);
  const[isms,setIsms]=useState(null);         // { audits, reviews, accessReviews, evidence, counts }
  const[findings,setFindings]=useState(null);
  const[reviewers,setReviewers]=useState(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{const{data:{session}}=await sb.auth.getSession();if(session){const p=JSON.parse(atob(session.access_token.split('.')[1]));if(p.email===CEO_EMAIL){setToken(session.access_token);setAuth('ok');return;}}const t=setTimeout(()=>{window.location.href='/AiLaneCEO/';},3000);sb.auth.onAuthStateChange((ev,sess)=>{if(sess){clearTimeout(t);const p=JSON.parse(atob(sess.access_token.split('.')[1]));if(p.email===CEO_EMAIL){setToken(sess.access_token);setAuth('ok');}else window.location.href='/AiLaneCEO/';}});})();},[]);

  useEffect(()=>{if(auth!=='ok'||!token)return;
    const H={'Authorization':`Bearer ${token}`,'apikey':SUPABASE_ANON_KEY};
    const rest=(p,extra)=>fetch(`${SUPABASE_URL}/rest/v1/${p}`,{headers:{...H,...(extra||{})}});
    async function restCount(table){try{const r=await rest(`${table}?select=*&limit=1`,{Prefer:'count=exact'});if(!r.ok)return null;const cr=r.headers.get('content-range');if(cr&&cr.includes('/')){const n=cr.split('/')[1];return n==='*'?null:parseInt(n,10);}return null;}catch(e){return null;}}
    (async()=>{setLoading(true);
      // 1. demoted watch (legislation + competitor/sector cases)
      try{const r=await fetch(`${SUPABASE_URL}/functions/v1/ceo-dashboard-data?section=legal_detail`,{headers:H});if(r.ok){const j=await r.json();setLegal(j.sections?.legal_detail||{});}else setLegal({});}catch(e){setLegal({});}
      // 2. certification tracker
      try{const r=await rest('compliance_certification_tracker?select=*&order=track.asc');setCerts(r.ok?await r.json():[]);}catch(e){setCerts([]);}
      // 3. subprocessors
      try{const r=await rest('vendor_assurance_register?select=vendor_name,processor_role,jurisdiction,data_location,assurance_status,certifications,source_url&order=vendor_name.asc');setVendors(r.ok?await r.json():[]);}catch(e){setVendors([]);}
      // 4. ISMS registers (counts + recent)
      try{
        const[ac,mc,xc,ec,evidence,access]=await Promise.all([
          restCount('internal_audit_log'),restCount('management_review_log'),restCount('access_review_log'),restCount('isms_evidence_log'),
          rest('isms_evidence_log?select=evidence_type,control_ref,collected_at,automated&order=collected_at.desc&limit=6').then(r=>r.ok?r.json():[]).catch(()=>[]),
          rest('access_review_log?select=review_ref,review_date,system,status&order=review_date.desc&limit=4').then(r=>r.ok?r.json():[]).catch(()=>[]),
        ]);
        setIsms({counts:{audits:ac,reviews:mc,accessReviews:xc,evidence:ec},recentEvidence:evidence,recentAccess:access});
      }catch(e){setIsms({counts:{},recentEvidence:[],recentAccess:[]});}
      // 5. findings (own-org; may be empty)
      try{const c=await restCount('compliance_findings');setFindings({count:c});}catch(e){setFindings({count:null});}
      // 6. external counsel contacts
      try{const r=await rest('legal_reviewer_contacts?select=full_name,firm_name,status,created_at&order=created_at.desc&limit=20');setReviewers(r.ok?await r.json():[]);}catch(e){setReviewers([]);}
      setLoading(false);
    })();
  },[auth,token]);

  // Control Tower read (AMD-319 GCT-4): section=all on load; section=summary / section=queue
  // after a decision. A partial refetch merges into the sections already held.
  async function loadTower(section){
    const H={'Authorization':`Bearer ${token}`,'apikey':SUPABASE_ANON_KEY};
    try{
      const r=await fetch(`${CT_FN}/ceo-control-tower-data?section=${section}`,{headers:H});
      if(!r.ok){if(section==='all')setTowerError({status:r.status});else setRefreshError(`Refresh of ${section} failed (HTTP ${r.status}) — reload the page.`);return;}
      const j=await r.json();
      if(section==='all'){
        const check=shape(j);
        if(!check.ok){console.error('ceo-control-tower-data shape',check.errors);setTowerError({status:'shape'});return;}
        setTowerError(null);setTower({generated_at:j.generated_at,sections:j.sections});
      }else{
        setRefreshError(null);
        setTower(t=>t?{generated_at:j.generated_at,sections:{...t.sections,...(j.sections||{})}}:t);
      }
    }catch(e){if(section==='all')setTowerError({status:'network'});else setRefreshError(`Refresh of ${section} failed (network error) — reload the page.`);}
  }
  useEffect(()=>{if(auth!=='ok'||!token)return;loadTower('all');},[auth,token]);

  function onDecided(ev){
    if(ev.type==='decided'){
      const row=ev.row,res=ev.result||{};
      setTower(t=>{
        if(!t)return t;const q=t.sections.queue;
        const entry={signal_id:row.signal_id,title:row.title,triage_class:row.triage_class,decision:res.decision,decided_at:res.decided_at,decision_note:ev.note};
        return{...t,sections:{...t.sections,queue:{...q,open:q.open.filter(r=>r.signal_id!==row.signal_id),recently_decided:[entry,...q.recently_decided].slice(0,20)}}};
      });
      loadTower('summary');
    }else if(ev.type==='stale'){loadTower('queue');}
  }
  function jump(id){
    const el=document.getElementById(id);if(!el)return;
    if(el.tagName==='DETAILS')el.open=true;
    el.scrollIntoView({behavior:'smooth',block:'start'});
  }

  if(auth==='checking')return<div className="auth-gate"><div className="logo-mark">AILANE</div><div className="pulse-ring"/><div className="ts">Loading legal &amp; compliance...</div></div>;

  const check=tower?shape(tower):null;
  const towerFail=towerError?towerError.status:(check&&!check.ok?'shape':null);
  const S=(tower&&!towerFail)?tower.sections:null;
  const pill=towerFail!=null
    ?<div className="status-pill error"><div className="dot"/>ERROR · {towerFail==='shape'?'contract':towerFail==='network'?'network':'HTTP '+towerFail}</div>
    :S?<div className="status-pill live"><div className="dot"/>LIVE</div>
    :<div className="status-pill loading"><div className="dot"/>LOADING</div>;

  return(
    <div>
      <div className="top-bar"><div className="top-bar-left"><a href="/AiLaneCEO/" className="back-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>Hub</a><div className="page-title">Legal &amp; Compliance <span>Control Tower</span></div></div><div className="top-bar-right">{pill}<div className="ts">{S&&tower.generated_at?'generated '+acgeDateTime(tower.generated_at):'Legal & Compliance Control Tower'}</div></div></div>
      <div className="main">

        {/* 1–3 — Three numbers, Director queue, coverage map (ceo-control-tower-data) */}
        {towerFail!=null&&<TowerError what="Control Tower data" status={towerFail}/>}
        {towerFail==null&&!S&&<div className="card"><div className="card-body"><div className="ts">Loading Control Tower…</div></div></div>}
        {S&&<ThreeNumbers summary={S.summary} onJump={jump}/>}
        {S&&refreshError&&<div className="q-notice err">{refreshError}</div>}
        {S&&<DirectorQueue queue={S.queue} token={token} onDecided={onDecided}/>}
        {S&&<CoverageMap coverage={S.coverage}/>}

        {/* 4 — Registers (collapsed; components carried over unchanged) */}
        <div className="sec-head"><div className="t">Registers</div><div className="rule"/></div>
        <Collapse title="Legal Pages — Governance"><LegalPagesGovernance token={token}/></Collapse>
        <Collapse title="ACGE — Compliance Gating"><AcgePanel token={token}/></Collapse>
        <Collapse title="ISMS Action Center"><IsmsActionCenter token={token}/></Collapse>
        <Collapse title="Live Compliance Oversight"><ComplianceOversight vendors={vendors} isms={isms} findings={findings}/></Collapse>
        <Collapse title="Compliance & Certification Tracker"><CertificationTracker certs={certs}/></Collapse>
        <Collapse title="Data Protection Complaints — s.164A Register"><ComplaintsRegister legal={legal}/></Collapse>
        <Collapse title="Legal Responsibilities & Oversight"><LegalResponsibilities reviewers={reviewers} token={token}/></Collapse>

        {/* 5 — Legacy queues, retiring in Phase 4 (carried over unchanged; nothing deleted) */}
        <div className="sec-head"><div className="t" style={{color:'var(--text-secondary)'}}>Legacy queues — retiring (Phase 4)</div><div className="rule"/></div>
        <details className="collapse">
          <summary><span>Legacy queues — read-only reference until Phase 4 retires them</span><span className="chev">▾ expand</span></summary>
          <div className="collapse-body">
            <ChangeReviewSummaryPanel token={token}/>
            <GovernanceAlertsPanel token={token}/>
            <CompetitorWatch legal={legal} loading={loading}/>
          </div>
        </details>

        {/* 6 — Monitor health */}
        <div className="sec-head"><div className="t">Monitor health</div><div className="rule"/></div>
        {towerFail!=null&&<TowerError what="Monitor health" status={towerFail}/>}
        {S&&<MonitorHealth health={S.health}/>}

        {/* 7 — Legal Oversight Room (unchanged, last) */}
        <LegalOversightRoomCard token={token}/>

        <div className="ct-footer">Regulatory intelligence, not legal advice · AI Lane Limited · Governed by AILANE-AMD-REG-001</div>
      </div>
      {/* Eileen mounted globally via /assets/eileen-panel.js */}
    </div>
  );
}

// ── SECTION 1 ──
function CertificationTracker({certs}){
  if(certs==null)return<div className="card"><div className="card-body"><div className="ts">Loading certification tracker…</div></div></div>;
  return(
    <div className="card">
      <div className="card-head"><div className="card-head-title">Certification Roadmap</div><div className="card-head-badge">compliance_certification_tracker</div></div>
      <div className="card-body">
        {certs.length===0&&<div className="ts">No certification tracks recorded.</div>}
        {certs.map((c,i)=>{
          const pct=c.progress_pct==null?null:Math.max(0,Math.min(100,Number(c.progress_pct)));
          return(
            <div className="track-row" key={i}>
              <div className="track-top">
                <div><div className="track-name">{c.track}</div><div className="track-std">{c.standard}</div></div>
                <span className={'cstat '+String(c.status||'planned')}>{String(c.status||'planned').replace(/_/g,' ')}{pct!=null?' · '+pct+'%':''}</span>
              </div>
              <div className="pbar"><div className="pfill" style={{width:(pct!=null?pct:0)+'%'}}/></div>
              <div className="track-meta">
                {c.next_milestone&&<span>Next: {c.next_milestone}{c.next_milestone_date?' ('+shortDate(c.next_milestone_date)+')':''}</span>}
                {c.owner&&<span>Owner: {c.owner}</span>}
                {c.evidence_uri&&(/^https?:\/\//.test(c.evidence_uri)?<a href={c.evidence_uri} target="_blank" rel="noopener">Evidence ↗</a>:<span title="Estate document reference — held in the governance estate (not web-published)" style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--text-muted)'}}>{c.evidence_uri}</span>)}
              </div>
              {c.notes&&<div className="muted-note">{c.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SECTION 2 ──
function ComplianceOversight({vendors,isms,findings}){
  const v=vendors||[];const counts=(isms&&isms.counts)||{};const evidence=(isms&&isms.recentEvidence)||[];
  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* ISMS registers + findings */}
      <div className="card">
        <div className="card-head"><div className="card-head-title">ISMS Registers</div><div className="card-head-badge">ISO 27001 evidence layer</div></div>
        <div className="card-body">
          <div className="ov-grid">
            <div className="ov-cell"><div className="n">{counts.audits!=null?counts.audits:'—'}</div><div className="l">Internal Audits</div><div className="s">clause 9.2</div></div>
            <div className="ov-cell"><div className="n">{counts.reviews!=null?counts.reviews:'—'}</div><div className="l">Mgmt Reviews</div><div className="s">clause 9.3</div></div>
            <div className="ov-cell"><div className="n">{counts.accessReviews!=null?counts.accessReviews:'—'}</div><div className="l">Access Reviews</div><div className="s">A.5.18 / A.8.2</div></div>
            <div className="ov-cell"><div className="n">{counts.evidence!=null?counts.evidence:'—'}</div><div className="l">Evidence Items</div><div className="s">clause 9.1</div></div>
          </div>
          {evidence.length>0&&(
            <div style={{marginTop:12}}>
              <div className="section-label">Recent automated evidence</div>
              {evidence.map((e,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<evidence.length-1?'1px solid var(--border-subtle)':'none'}}>
                  <div style={{fontSize:'0.7rem',color:'var(--text-primary)'}}>{e.evidence_type}{e.control_ref?' · '+e.control_ref:''}</div>
                  <div className="ts">{e.automated?'auto · ':''}{shortDate(e.collected_at)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="muted-note">Populated by the <span style={{fontFamily:'var(--font-mono)'}}>isms-evidence-collector</span> daily run plus manual entries. Findings in the compliance checker index: <strong>{findings&&findings.count!=null?findings.count:'—'}</strong>. The Eileen pre-sales compliance log is service-role-only and is not surfaced here (Path A / Edge Function to expose).</div>
        </div>
      </div>

      {/* Subprocessors / vendor assurance */}
      <div className="card">
        <div className="card-head"><div className="card-head-title">Subprocessor Assurance</div><div className="card-head-badge">{v.length} in register</div></div>
        <div className="card-body">
          {vendors==null&&<div className="ts">Loading subprocessors…</div>}
          {vendors!=null&&v.length===0&&<div className="ts">No subprocessors recorded.</div>}
          {v.map((row,i)=>{
            const certs=Array.isArray(row.certifications)?row.certifications:[];
            return(
              <div className="vendor-row" key={i}>
                <div style={{minWidth:0}}>
                  <div className="vendor-name">{row.vendor_name}</div>
                  <div className="vendor-meta">{[row.processor_role,row.jurisdiction,row.data_location].filter(Boolean).join(' · ')}</div>
                  {certs.length>0&&<div className="vchips">{certs.slice(0,4).map((c,j)=><span className="vchip" key={j}>{c.standard||c.note||'cert'}</span>)}</div>}
                </div>
                <span className={'astat '+String(row.assurance_status||'pending')}>{row.assurance_status||'pending'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── LEGAL PAGES — GOVERNANCE (AILANE-CC-BRIEF-LEGAL-GOV-CEO-TILE-001) ──
// Surfaces ceo-dashboard-data?section=legal_compliance: per-page displayed
// version, open governed dues (badge, highlighted when > 0) and an unresolved-
// drift marker, plus a summary line with total dues and a status pill
// (current → green / dues_open → amber / drift → red). Non-200 or malformed
// JSON renders "Governance feed unavailable" with the HTTP status — never
// blank, never throws into the sibling tiles. Uses the page's existing
// Bearer-token + apikey fetch convention (legal_detail precedent above).
const LEGAL_GOV_STATUS={
  current:{c:'var(--accent-green)',bg:'var(--accent-green-dim)',bd:'rgba(16,185,129,0.25)',label:'current'},
  dues_open:{c:'var(--accent-amber)',bg:'var(--accent-amber-dim)',bd:'rgba(245,158,11,0.25)',label:'dues open'},
  drift:{c:'var(--accent-red)',bg:'var(--accent-red-dim)',bd:'rgba(239,68,68,0.25)',label:'drift'},
};
function LegalPagesGovernance({token}){
  const[state,setState]=useState({phase:'loading'});   // loading | ok | error
  useEffect(()=>{
    if(!token)return;let active=true;
    (async()=>{
      try{
        const r=await fetch(`${SUPABASE_URL}/functions/v1/ceo-dashboard-data?section=legal_compliance`,{headers:{'Authorization':`Bearer ${token}`,'apikey':SUPABASE_ANON_KEY}});
        if(!r.ok){if(active)setState({phase:'error',status:r.status});return;}
        let j;try{j=await r.json();}catch(e){if(active)setState({phase:'error',status:'malformed JSON'});return;}
        const sec=j&&j.sections&&j.sections.legal_compliance;
        if(!sec){if(active)setState({phase:'error',status:'malformed JSON'});return;}
        if(active)setState({phase:'ok',pages:Array.isArray(sec.pages)?sec.pages:[],summary:sec.summary||{}});
      }catch(e){if(active)setState({phase:'error',status:'network error'});}
    })();
    return()=>{active=false;};
  },[token]);

  if(state.phase==='error'){
    return(
      <div className="card">
        <div className="card-head"><div className="card-head-title">Legal Pages — Governance</div><div className="card-head-badge">legal_compliance</div></div>
        <div className="card-body"><div className="ts">Governance feed unavailable — {String(state.status)}</div></div>
      </div>
    );
  }
  const pages=(state.phase==='ok'&&state.pages)||[];
  const summary=(state.phase==='ok'&&state.summary)||{};
  const st=LEGAL_GOV_STATUS[String(summary.status||'').toLowerCase()]||{c:'var(--text-muted)',bg:'var(--bg-hover)',bd:'var(--border-subtle)',label:String(summary.status||'—').replace(/_/g,' ')};
  const totalDues=summary.open_governed_dues!=null?summary.open_governed_dues:pages.reduce((a,p)=>a+(Number(p.open_governed_dues)||0),0);
  return(
    <div className="card">
      <div className="card-head"><div className="card-head-title">Legal Pages — Governance</div><div className="card-head-badge">{summary.pages!=null?summary.pages+' pages':'legal_compliance'}</div></div>
      <div className="card-body">
        {state.phase==='loading'&&<div className="ts">Loading legal page governance…</div>}
        {state.phase==='ok'&&pages.length===0&&<div className="ts">No governed legal pages recorded.</div>}
        {pages.map((p,i)=>{
          const dues=Number(p.open_governed_dues)||0;
          return(
            <div className="leg-row" key={p.page_slug||i}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                <div style={{minWidth:0}}>
                  {p.page_url
                    ?<a className="leg-title" href={p.page_url} target="_blank" rel="noopener" style={{color:'var(--text-accent)',textDecoration:'none'}}>{p.page_title||p.page_slug}</a>
                    :<span className="leg-title">{p.page_title||p.page_slug||'(untitled page)'}</span>}
                  <div className="leg-meta">
                    {p.displayed_version&&<span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--text-muted)'}}>{p.displayed_version}</span>}
                    {p.unresolved_drift&&<span className="leg-tag" style={{color:'var(--accent-red)',background:'var(--accent-red-dim)',borderColor:'rgba(239,68,68,0.25)'}}>drift</span>}
                  </div>
                </div>
                <span className="cstat" style={dues>0
                  ?{color:'var(--accent-amber)',background:'var(--accent-amber-dim)',borderColor:'rgba(245,158,11,0.25)'}
                  :{color:'var(--text-muted)',background:'var(--bg-hover)',borderColor:'var(--border-subtle)'}}>{dues} due{dues===1?'':'s'}</span>
              </div>
            </div>
          );
        })}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:10,flexWrap:'wrap'}}>
          <div className="muted-note" style={{marginTop:0}}>Total open governed dues: <strong style={{color:totalDues>0?'var(--accent-amber)':'var(--text-secondary)'}}>{totalDues}</strong></div>
          <span className="cstat" style={{color:st.c,background:st.bg,borderColor:st.bd}}>{st.label}</span>
        </div>
      </div>
    </div>
  );
}

// ── CHANGE-REVIEW SUMMARY PANEL (LEGAL-CHANGE-REVIEW-CEO-SITE-001 §2) ──
// Top "click into" sub-window: live pending counts (legal-page review feed +
// RSG forward-law feed) with a RAG dot, opening the nested Change-Review page
// at /AiLaneCEO/legal/change-review/. Reuses the page's Bearer-token + apikey
// fetch convention. On any fetch failure or non-2xx it renders a neutral,
// still-clickable panel with no counts — never a broken panel, never a
// redirect (the page's own auth guard owns auth; mirrors GovernanceAlertsPanel).
function ChangeReviewSummaryPanel({token}){
  const[s,setS]=useState({phase:'loading'});   // loading | ok | neutral
  useEffect(()=>{
    if(!token)return;let active=true;
    const H={'Authorization':`Bearer ${token}`,'apikey':SUPABASE_ANON_KEY};
    (async()=>{
      try{
        const[lr,fr]=await Promise.all([
          fetch(`${SUPABASE_URL}/functions/v1/legal-page-review-feed`,{headers:H}),
          fetch(`${SUPABASE_URL}/functions/v1/rsg-director-feed`,{headers:H}),
        ]);
        if(!lr.ok||!fr.ok){if(active)setS({phase:'neutral'});return;}
        const lj=await lr.json();const fj=await fr.json();
        const legal=Array.isArray(lj.items)?lj.items.length:0;
        const forward=Array.isArray(fj.items)?fj.items.length:0;
        if(active)setS({phase:'ok',legal,forward});
      }catch(e){if(active)setS({phase:'neutral'});}
    })();
    return()=>{active=false;};
  },[token]);

  const go=()=>{window.location.href='/AiLaneCEO/legal/change-review/';};
  let dot='var(--text-muted)',line='Open the change-review queue.';
  if(s.phase==='ok'){
    if(s.legal>0)dot='var(--accent-red)';
    else if(s.forward>0)dot='var(--accent-amber)';
    else dot='var(--accent-green)';
    line=(s.legal===0&&s.forward===0)?'All clear — nothing awaiting review.'
      :`${s.legal} legal-page review${s.legal===1?'':'s'} · ${s.forward} forward-law item${s.forward===1?'':'s'} awaiting your ratification`;
  }
  return(
    <div className="card" style={{cursor:'pointer'}} onClick={go}>
      <div className="card-head"><div className="card-head-title">Legal &amp; Compliance — Change Review</div><div className="card-head-badge">human gate</div></div>
      <div className="card-body">
        <div style={{fontSize:'0.66rem',color:'var(--text-muted)',marginBottom:10}}>Law-change review &amp; ratification — the human gate.</div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
            <span style={{width:10,height:10,borderRadius:'50%',background:dot,flexShrink:0}}/>
            <span style={{fontSize:'0.74rem',color:'var(--text-secondary)'}}>{line}</span>
          </div>
          <button onClick={(e)=>{e.stopPropagation();go();}} style={{padding:'7px 14px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-accent)',background:'var(--bg-elevated)',color:'var(--text-accent)',fontFamily:'var(--font-body)',fontSize:'0.68rem',fontWeight:600,cursor:'pointer',flexShrink:0}}>Open Change Review →</button>
        </div>
      </div>
    </div>
  );
}

// ── SECTION 2a — GOVERNANCE ALERTS (GOV-ALERTS-WEBSITE-001 §W-3) ──
// Fed by ceo-legal-data?section=governance_alerts — all sources, including
// parliamentary horizon signals. Degrades to an inline empty state while the
// backend section is not yet deployed (HTTP 400/error): never a broken panel.
const GOV_MATERIALITY_COLOR={material:'var(--accent-red)',uncertain:'var(--accent-amber)',non_material:'var(--text-muted)'};
const GOV_ACTIONS=[['ratify','Ratify'],['reject','Reject'],['defer','Defer'],['reassess','Re-assess']];
function govAge(a){if(a.age_hours!=null)return Math.round(Number(a.age_hours));const t=a.detected_at||a.created_at;if(!t)return null;const h=(Date.now()-new Date(t).getTime())/3600000;return isNaN(h)?null:Math.round(h);}
function GovernanceAlertsPanel({token}){
  const[gov,setGov]=useState(null);const[busy,setBusy]=useState(null);
  const H={'Authorization':`Bearer ${token}`,'apikey':SUPABASE_ANON_KEY};
  async function load(){
    try{
      const r=await fetch(`${SUPABASE_URL}/functions/v1/ceo-legal-data?section=governance_alerts`,{headers:H});
      if(!r.ok){setGov({live:false});return;}
      const j=await r.json();
      setGov({live:true,alerts:Array.isArray(j.alerts)?j.alerts:[],recentlyClosed:Array.isArray(j.recently_closed)?j.recently_closed:[],summary:j.summary||{}});
    }catch(e){setGov({live:false});}
  }
  useEffect(()=>{if(token)load();},[token]);
  async function act(action,alertId){
    if(busy)return;setBusy(String(alertId)+':'+action);
    try{
      const r=await fetch(`${SUPABASE_URL}/functions/v1/ceo-governance-action`,{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({action,alert_id:alertId})});
      if(r.ok)await load();
    }catch(e){console.error('ceo-governance-action',e);}
    setBusy(null);
  }
  const open=(gov&&gov.live&&gov.alerts)||[];
  const closed=(gov&&gov.live&&gov.recentlyClosed)||[];
  const sum=(gov&&gov.live&&gov.summary)||{};
  const btn={padding:'4px 12px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-default)',background:'var(--bg-elevated)',color:'var(--text-secondary)',fontFamily:'var(--font-mono)',fontSize:'0.58rem',fontWeight:600,cursor:busy?'default':'pointer',opacity:busy?0.5:1};
  return(
    <div className="card">
      <div className="card-head"><div className="card-head-title">Assessment Feed</div><div className="card-head-badge">{gov&&gov.live?(sum.awaiting_director!=null?sum.awaiting_director:open.length)+' awaiting director':'ceo-legal-data'}</div></div>
      <div className="card-body">
        {gov==null&&<div className="ts">Loading assessment feed…</div>}
        {gov!=null&&!gov.live&&<div className="ts">Assessment feed not yet live.</div>}
        {gov!=null&&gov.live&&open.length===0&&<div className="ts">No open governance alerts.</div>}
        {open.map((a,i)=>{
          const m=a.acei_impact&&a.acei_impact.materiality;
          const age=govAge(a);
          return(
            <div className="leg-row" key={a.alert_id||i}>
              <div className="leg-title">{a.title}</div>
              {a.eileen_summary&&<div className="leg-summary" style={{WebkitLineClamp:3}}>{a.eileen_summary}</div>}
              <div className="leg-meta">
                {m&&<span className="leg-tag" style={{color:GOV_MATERIALITY_COLOR[String(m).toLowerCase()]||'var(--accent-cyan)'}}>{String(m).replace(/_/g,' ')}</span>}
                {a.source&&<span className="leg-tag">{a.source}</span>}
                {a.alert_type&&<span className="leg-tag">{a.alert_type}</span>}
                {a.status&&<span style={{fontSize:'0.58rem',fontFamily:'var(--font-mono)',color:'var(--text-secondary)'}}>{String(a.status).replace(/_/g,' ')}</span>}
                {age!=null&&<span className="ts">{age}h old{a.sla_hours!=null?' · SLA '+a.sla_hours+'h':''}</span>}
                {a.sla_breached&&<span className="leg-tag" style={{color:'var(--accent-red)',background:'var(--accent-red-dim)'}}>SLA breached</span>}
              </div>
              {a.status==='assessment_complete'&&(
                <div style={{display:'flex',gap:8,marginTop:7,flexWrap:'wrap'}}>
                  {GOV_ACTIONS.map(([action,label])=>(
                    <button key={action} style={btn} disabled={!!busy} onClick={()=>act(action,a.alert_id)}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {closed.length>0&&(
          <div style={{marginTop:12}}>
            <div className="section-label">Recently closed</div>
            {closed.map((c,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'6px 0',borderBottom:i<closed.length-1?'1px solid var(--border-subtle)':'none'}}>
                <div style={{fontSize:'0.7rem',color:'var(--text-secondary)',minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</div>
                <div className="ts" style={{flexShrink:0}}>{String(c.status||'').replace(/_/g,' ')}{c.closed_at?' · '+shortDate(c.closed_at):''}</div>
              </div>
            ))}
          </div>
        )}
        {gov!=null&&gov.live&&<div className="muted-note">Auto-closed (non-material) last 7 days: {sum.auto_ratified_7d!=null?sum.auto_ratified_7d:0}</div>}
      </div>
    </div>
  );
}

// ── SECTION 2b — ACGE COMPLIANCE GATING (AILANE-CC-BRIEF-CEO-ACGE-TILE-001) ──
// Oversight of the Autonomous Compliance Gating Engine, fed by the CEO-only
// acge-ceo-oversight Edge Function (verify_jwt + mark@ailane.ai gate).
// Refreshes every 5 minutes; on fetch failure renders a single fallback line.
// Permission gates can only render "open" with a non-null ratified_ref — an
// open gate without one (DB-forbidden) renders INVARIANT BREACH + alarm.
const ACGE_STATE_STYLE={closed:['var(--accent-amber)','🔒'],armed:['var(--accent-cyan)','👁'],open:['var(--accent-green)','✓']};
async function fetchAcgeOversight(token){
  try{
    var r=await fetch('https://cnbsxwtvazfvzmltkuvx.supabase.co/functions/v1/acge-ceo-oversight',{
      headers:{'Authorization':'Bearer '+token}
    });
    if(!r.ok)return null;
    return await r.json();
  }catch(e){return null;}
}
function acgeHours(ts){if(!ts)return null;const h=(Date.now()-new Date(ts).getTime())/3600000;return isNaN(h)?null:h;}
function acgeHbColor(h){return h==null?'var(--text-muted)':h>48?'var(--accent-red)':h>24?'var(--accent-amber)':'var(--accent-green)';}
function acgeDateTime(s){if(!s)return'—';try{return new Date(s).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return String(s);}}
function AcgePanel({token}){
  const[acge,setAcge]=useState(undefined);   // undefined=loading · null=unavailable · object=payload
  const warned=React.useRef(false);
  useEffect(()=>{
    if(!token)return;
    let active=true;
    async function load(){
      const d=await fetchAcgeOversight(token);
      if(!active)return;
      if(d==null&&!warned.current){warned.current=true;console.warn('acge-ceo-oversight unavailable');}
      setAcge(d);
    }
    load();
    const id=setInterval(load,300000);
    return()=>{active=false;clearInterval(id);};
  },[token]);

  if(acge===undefined)return(<div className="card"><div className="card-body"><div className="ts">Loading ACGE oversight…</div></div></div>);
  if(acge===null)return(<div className="card"><div className="card-body"><div className="ts">ACGE oversight unavailable — check acge-ceo-oversight EF</div></div></div>);

  const gates=Array.isArray(acge.gates)?acge.gates:[];
  const watch=Array.isArray(acge.watch_items)?acge.watch_items:[];
  const txs=(Array.isArray(acge.recent_transitions)?acge.recent_transitions.slice():[])
    .sort((a,b)=>String(b.transitioned_at||b.created_at||b.at||'').localeCompare(String(a.transitioned_at||a.created_at||a.at||'')));
  const hb=acge.sensor_heartbeats||{};
  const ver=acge.last_verification;
  const verified=!!(ver&&ver.all_passed===true);
  const breach=gates.some(g=>String(g.state)==='open'&&g.ratified_ref==null);
  const alarm=!verified||breach;
  const notif=Number(acge.unacknowledged_acge_notifications)||0;
  const hHor=acgeHours(hb.horizon_last),hCor=acgeHours(hb.corpus_watch_last);

  return(
    <div className="card" style={alarm?{borderColor:'var(--accent-red)'}:null}>
      <div className="card-head" style={alarm?{background:'var(--accent-red-dim)'}:null}>
        <div className="card-head-title" style={alarm?{color:'var(--accent-red)'}:null}>ACGE — Compliance Gating</div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          {notif>0&&<span className="card-head-badge" style={{color:'var(--accent-amber)',borderColor:'rgba(245,158,11,0.25)',background:'var(--accent-amber-dim)'}}>{notif} unacknowledged</span>}
          <span className="card-head-badge" style={verified?{color:'var(--accent-green)',borderColor:'rgba(16,185,129,0.25)',background:'var(--accent-green-dim)'}:{color:'var(--accent-red)',borderColor:'rgba(239,68,68,0.25)',background:'var(--accent-red-dim)'}}>{verified?'✓ VERIFIED '+shortDate(ver.run_at):'VERIFICATION FAILURE'}</span>
          <span className="ts">as at {acgeDateTime(acge.as_at)}</span>
        </div>
      </div>
      <div className="card-body">

        {/* Gate register */}
        <div className="section-label">Gate register</div>
        {gates.length===0&&<div className="ts">No gates in register.</div>}
        {gates.map((g,i)=>{
          const state=String(g.state||'').toLowerCase();
          const gBreach=state==='open'&&g.ratified_ref==null;
          const style=gBreach?['var(--accent-red)','✕']:(ACGE_STATE_STYLE[state]||['var(--text-muted)','·']);
          return(
            <div className="leg-row" key={g.gate_id||i}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                <div style={{display:'flex',gap:8,alignItems:'center',minWidth:0}}>
                  <span style={{color:style[0],flexShrink:0}}>{style[1]}</span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'0.66rem',color:'var(--text-accent)'}}>{g.gate_id}</span>
                  <span className="leg-title">{g.name}</span>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                  <span className="leg-tag">{g.type}</span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'0.62rem',fontWeight:600,color:style[0]}}>{gBreach?'INVARIANT BREACH':state.toUpperCase()}</span>
                  {state==='open'&&g.ratified_ref!=null&&<span className="ts">{g.ratified_ref}</span>}
                </div>
              </div>
              {g.opening_authority&&<div className="ts" style={{marginTop:3}} title={g.opening_authority}>Opening authority: {g.opening_authority}</div>}
            </div>
          );
        })}

        {/* Watch items */}
        <div className="section-label" style={{marginTop:12}}>Watch items</div>
        {watch.length===0&&<div className="ts">No watch items.</div>}
        {watch.map((w,i)=>(
          <div key={i} style={{display:'flex',gap:10,alignItems:'baseline',padding:'5px 0',borderBottom:i<watch.length-1?'1px solid var(--border-subtle)':'none'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.64rem',color:'var(--text-primary)',flexShrink:0}}>{w.key}</span>
            <span style={{fontSize:'0.66rem',color:'var(--text-secondary)',flexShrink:0}}>{String(w.value)}</span>
            <span className="ts" style={{minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={w.note||''}>{w.note||''}</span>
          </div>
        ))}

        {/* Sensor heartbeats */}
        <div className="section-label" style={{marginTop:12}}>Sensor heartbeats</div>
        <div style={{display:'flex',gap:16,flexWrap:'wrap',padding:'4px 0'}}>
          <span style={{fontSize:'0.66rem',color:'var(--text-secondary)'}}>Horizon: <span style={{fontFamily:'var(--font-mono)',color:acgeHbColor(hHor)}}>{hHor==null?'no signal':Math.round(hHor)+' hours ago'}</span></span>
          <span style={{fontSize:'0.66rem',color:'var(--text-secondary)'}}>Corpus watch: <span style={{fontFamily:'var(--font-mono)',color:acgeHbColor(hCor)}}>{hCor==null?'no signal':Math.round(hCor)+' hours ago'}</span></span>
          <span style={{fontSize:'0.66rem',color:'var(--text-secondary)'}}>Pipeline runs (48h): <span style={{fontFamily:'var(--font-mono)',color:'var(--text-primary)'}}>{hb.pipeline_runs_48h!=null?hb.pipeline_runs_48h:'—'}</span></span>
        </div>

        {/* Recent transitions */}
        <div className="section-label" style={{marginTop:12}}>Recent transitions</div>
        {txs.length===0&&<div className="ts">No transitions — all gates in seeded state</div>}
        {txs.map((t,i)=>(
          <div key={i} style={{display:'flex',gap:10,alignItems:'center',padding:'5px 0',borderBottom:i<txs.length-1?'1px solid var(--border-subtle)':'none',flexWrap:'wrap'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.64rem',color:'var(--text-accent)'}}>{t.gate_id}</span>
            <span style={{fontSize:'0.66rem',color:'var(--text-primary)'}}>{(t.old_state||'—')+' → '+(t.new_state||'—')}</span>
            <span className="ts">{acgeDateTime(t.transitioned_at||t.created_at||t.at)}</span>
            <span className="ts">{t.actor||''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SECTION 2c — ISMS ACTION CENTER (AILANE-CC-BRIEF-ISMS-ACTION-CENTER-SITE-001) ──
// Live ISO 27001 ISMS state from the CEO-gated ceo-isms-data Edge Function, with
// an in-place write path (ceo-isms-action) so the Director can action items.
// Reuses the page's existing Bearer-token + apikey fetch convention (App auth
// guard / GovernanceAlertsPanel). 401/403 renders "CEO session required"; the
// page's own auth guard owns redirects — this panel never redirects.
const ISMS_STATUS_STYLE={
  open:{c:'var(--accent-amber)',bg:'var(--accent-amber-dim)',bd:'rgba(245,158,11,0.25)'},
  in_progress:{c:'var(--accent-cyan)',bg:'var(--accent-cyan-dim)',bd:'rgba(14,165,233,0.25)'},
  blocked:{c:'var(--text-muted)',bg:'var(--bg-hover)',bd:'var(--border-subtle)'},
  done:{c:'var(--accent-green)',bg:'var(--accent-green-dim)',bd:'rgba(16,185,129,0.25)'},
  accepted:{c:'var(--accent-green)',bg:'var(--accent-green-dim)',bd:'rgba(16,185,129,0.25)'},
};
const ISMS_STATUS_OPTIONS=['open','in_progress','done','accepted','blocked'];
const RISK_BAND_COLOR={Low:'var(--accent-green)',Medium:'var(--accent-amber)',High:'var(--accent-red)',Critical:'var(--accent-red)'};
function ismsStatusStyle(s){return ISMS_STATUS_STYLE[String(s||'').toLowerCase()]||{c:'var(--text-muted)',bg:'var(--bg-hover)',bd:'var(--border-subtle)'};}
function ismsField(o,keys){if(o==null)return null;if(typeof o!=='object')return o;for(const k of keys){if(o[k]!=null&&o[k]!=='')return o[k];}return null;}
// Local EF helper — the page has no shared helper; mirror the existing
// Bearer-token + apikey convention used by every other panel on this page.
async function callIsms(method,path,body,token){
  const headers={'Authorization':`Bearer ${token}`,'apikey':SUPABASE_ANON_KEY};
  if(body)headers['Content-Type']='application/json';
  return fetch(`${SUPABASE_URL}/functions/v1/${path}`,{method,headers,body:body?JSON.stringify(body):undefined});
}

function IsmsActionRow({action,token,onRecorded}){
  const a=action;
  const[status,setStatus]=useState(a.status||'open');
  const[evRef,setEvRef]=useState('');
  const[evNote,setEvNote]=useState('');
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState(null);   // {k:'ok'|'err', t}
  const st=ismsStatusStyle(a.status);
  const inp={padding:'5px 8px',background:'var(--bg-base)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',fontSize:'0.64rem',fontFamily:'var(--font-body)',outline:'none'};
  async function record(){
    if(busy)return;setBusy(true);setMsg(null);
    try{
      const body={action_ref:a.action_ref,status};
      if(evRef.trim())body.evidence_ref=evRef.trim();
      if(evNote.trim())body.evidence_note=evNote.trim();
      const r=await callIsms('POST','ceo-isms-action',body,token);
      const d=await r.json().catch(()=>({}));
      if(r.ok&&d.ok){setMsg({k:'ok',t:'✓ recorded'});setEvRef('');setEvNote('');if(onRecorded)onRecorded();}
      else setMsg({k:'err',t:(d.error||`Record failed (${r.status}).`)});
    }catch(e){setMsg({k:'err',t:'Network error. Please try again.'});}
    setBusy(false);
  }
  return(
    <div className="leg-row">
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
        <div style={{minWidth:0,flex:1}}>
          <div className="leg-title">{a.title||a.action_ref}</div>
          <div className="leg-meta">
            {a.action_ref&&<span style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'var(--text-muted)'}}>{a.action_ref}</span>}
            {a.category&&<span className="leg-tag">{friendlyCat(a.category)}</span>}
            {a.control_ref&&<span className="leg-tag primary">{a.control_ref}</span>}
            {a.linked_risk&&<span className="leg-tag" style={{color:'var(--accent-red)',background:'var(--accent-red-dim)',borderColor:'rgba(239,68,68,0.25)'}}>risk {a.linked_risk}</span>}
            {a.target_phase&&<span className="leg-tag si">{a.target_phase}</span>}
          </div>
          {a.description&&<div className="leg-summary" style={{WebkitLineClamp:3}}>{a.description}</div>}
          {a.owner&&<div className="ts" style={{marginTop:3}}>Owner: {a.owner}</div>}
        </div>
        <span className="cstat" style={{color:st.c,background:st.bg,borderColor:st.bd}}>{String(a.status||'open').replace(/_/g,' ')}</span>
      </div>
      <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{...inp,cursor:'pointer'}}>
          {ISMS_STATUS_OPTIONS.map(o=><option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
        </select>
        <input style={{...inp,width:150}} type="text" value={evRef} onChange={e=>setEvRef(e.target.value)} placeholder="evidence ref (optional)"/>
        <input style={{...inp,flex:1,minWidth:160}} type="text" value={evNote} onChange={e=>setEvNote(e.target.value)} placeholder="evidence note (optional)"/>
        <button onClick={record} disabled={busy} style={{padding:'6px 14px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-accent)',background:'var(--accent-cyan-dim)',color:'var(--accent-cyan)',fontSize:'0.64rem',fontWeight:600,fontFamily:'var(--font-body)',cursor:busy?'default':'pointer',opacity:busy?0.6:1}}>{busy?'Recording…':'Record'}</button>
        {msg&&<span style={{fontSize:'0.64rem',color:msg.k==='ok'?'var(--accent-green)':'var(--accent-red)'}}>{msg.t}</span>}
      </div>
    </div>
  );
}

function IsmsActionCenter({token}){
  const[state,setState]=useState({phase:'loading'});   // loading | ok | denied | error
  async function load(){
    if(!token)return;
    try{
      const r=await callIsms('GET','ceo-isms-data',null,token);
      if(r.status===401||r.status===403){setState({phase:'denied'});return;}
      if(!r.ok){setState({phase:'error',status:r.status});return;}
      let j;try{j=await r.json();}catch(e){setState({phase:'error',status:'malformed JSON'});return;}
      setState({phase:'ok',data:j});
    }catch(e){setState({phase:'error',status:'network error'});}
  }
  useEffect(()=>{if(token){setState({phase:'loading'});load();}},[token]);

  const d=(state.phase==='ok'&&state.data)||{};
  const actions=Array.isArray(d.actions)?d.actions:[];
  const risks=d.risks||{};const bands=risks.bands||{};const ohc=Array.isArray(risks.open_high_or_critical)?risks.open_high_or_critical:[];
  const ev=d.evidence||{};const covered=Array.isArray(ev.controls_covered)?ev.controls_covered:[];
  const gov=d.governance||{};const ia=gov.latest_internal_audit;const mr=gov.latest_management_review;
  const dleft=gov.days_until_next_review;
  const dColor=dleft==null?'var(--text-muted)':(dleft<0?'var(--accent-red)':(dleft<=14?'var(--accent-amber)':'var(--accent-green)'));
  const certs=Array.isArray(d.certs)?d.certs:[];
  const mt={marginTop:14};
  const iaDate=ismsField(ia,['date','audit_date','conducted_at','completed_at']);
  const mrDate=ismsField(mr,['date','review_date','conducted_at','held_at']);

  return(
    <div className="card">
      <div className="card-head">
        <div className="card-head-title">ISMS Action Center</div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <span className="card-head-badge">ISO 27001 · ceo-isms-data</span>
          {state.phase==='ok'&&d.generated_at&&<span className="ts">as at {acgeDateTime(d.generated_at)}</span>}
          <button onClick={load} disabled={state.phase==='loading'} style={{padding:'4px 12px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-default)',background:'var(--bg-elevated)',color:'var(--text-secondary)',fontFamily:'var(--font-mono)',fontSize:'0.58rem',fontWeight:600,cursor:state.phase==='loading'?'default':'pointer'}}>↻ Refresh</button>
        </div>
      </div>
      <div className="card-body">
        {state.phase==='loading'&&<div className="ts">Loading ISMS state…</div>}
        {state.phase==='denied'&&<div className="ts">CEO session required.</div>}
        {state.phase==='error'&&<div className="ts">ISMS feed unavailable — {String(state.status)}</div>}
        {state.phase==='ok'&&(
          <div>
            {/* Action items */}
            <div className="section-label">Action items</div>
            {actions.length===0&&<div className="ts">No ISMS actions recorded.</div>}
            {actions.map((a,i)=><IsmsActionRow key={a.action_ref||i} action={a} token={token} onRecorded={load}/>)}

            {/* Risk summary */}
            <div className="section-label" style={mt}>Risk summary{risks.total!=null?' · '+risks.total+' total':''}</div>
            <div className="ov-grid">
              {['Low','Medium','High','Critical'].map(b=>(
                <div className="ov-cell" key={b}>
                  <div className="n" style={{color:RISK_BAND_COLOR[b]}}>{bands[b]!=null?bands[b]:0}</div>
                  <div className="l">{b}</div>
                </div>
              ))}
            </div>
            {ohc.length>0&&(
              <div style={{marginTop:10}}>
                <div className="muted-note" style={{marginTop:0,marginBottom:4}}>Open high or critical risks:</div>
                {ohc.map((rk,i)=>{
                  const title=ismsField(rk,['title','risk_title','name','description'])||ismsField(rk,['risk_ref','ref'])||'(risk)';
                  const band=ismsField(rk,['band','severity','level']);
                  const rref=ismsField(rk,['risk_ref','ref']);
                  return(
                    <div key={i} style={{display:'flex',gap:10,alignItems:'center',padding:'5px 0',borderBottom:i<ohc.length-1?'1px solid var(--border-subtle)':'none',flexWrap:'wrap'}}>
                      {band&&<span className="leg-tag" style={{color:RISK_BAND_COLOR[band]||'var(--accent-red)',background:'var(--accent-red-dim)',borderColor:'rgba(239,68,68,0.25)'}}>{band}</span>}
                      <span style={{fontSize:'0.7rem',color:'var(--text-primary)',minWidth:0,flex:1}}>{title}</span>
                      {rref&&<span className="ts">{rref}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Evidence coverage */}
            <div className="section-label" style={mt}>Evidence coverage</div>
            <div className="ov-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
              <div className="ov-cell"><div className="n">{ev.controls_count!=null?ev.controls_count:'—'}</div><div className="l">Controls covered</div></div>
              <div className="ov-cell"><div className="n">{ev.last_7_days!=null?ev.last_7_days:'—'}</div><div className="l">Items · last 7 days</div></div>
              <div className="ov-cell"><div className="n">{ev.total!=null?ev.total:'—'}</div><div className="l">Total evidence</div></div>
            </div>
            {covered.length>0&&(
              <div className="vchips" style={{marginTop:8}}>
                {covered.map((c,i)=><span className="vchip" key={i}>{ismsField(c,['control_ref','control','ref'])||String(c)}</span>)}
              </div>
            )}

            {/* Governance */}
            <div className="section-label" style={mt}>Governance</div>
            <div className="two-col">
              <div className="ov-cell">
                <div className="l">Latest internal audit</div>
                <div style={{fontSize:'0.72rem',color:'var(--text-primary)',marginTop:4,fontFamily:'var(--font-mono)'}}>{ismsField(ia,['ref','audit_ref','reference'])||'—'}</div>
                <div className="ts" style={{marginTop:2}}>
                  {iaDate?shortDate(iaDate):'no date'}
                  {ismsField(ia,['nonconformities','nc','noncomformities'])!=null?' · NC '+ismsField(ia,['nonconformities','nc','noncomformities']):''}
                  {ismsField(ia,['observations','obs'])!=null?' · Obs '+ismsField(ia,['observations','obs']):''}
                </div>
              </div>
              <div className="ov-cell">
                <div className="l">Latest management review</div>
                <div style={{fontSize:'0.72rem',color:'var(--text-primary)',marginTop:4,fontFamily:'var(--font-mono)'}}>{ismsField(mr,['ref','review_ref','reference'])||'—'}</div>
                <div className="ts" style={{marginTop:2}}>{mrDate?shortDate(mrDate):'no date'}</div>
              </div>
            </div>
            <div className="muted-note">Next review: <strong>{gov.next_review?shortDate(gov.next_review):'—'}</strong> · <span style={{color:dColor,fontWeight:600}}>{dleft==null?'—':(dleft<0?Math.abs(dleft)+' days overdue':dleft+' days until next review')}</span></div>

            {/* Certifications */}
            <div className="section-label" style={mt}>Certifications</div>
            {certs.length===0&&<div className="ts">No certification tracks reported.</div>}
            {certs.map((c,i)=>{
              const pct=c.progress_pct==null?null:Math.max(0,Math.min(100,Number(c.progress_pct)));
              return(
                <div className="track-row" key={i}>
                  <div className="track-top">
                    <div><div className="track-name">{c.track}</div>{c.next_milestone&&<div className="track-std">Next: {c.next_milestone}</div>}</div>
                    <span className={'cstat '+String(c.status||'planned')}>{String(c.status||'planned').replace(/_/g,' ')}{pct!=null?' · '+pct+'%':''}</span>
                  </div>
                  <div className="pbar"><div className="pfill" style={{width:(pct!=null?pct:0)+'%'}}/></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECTION 3 ──
function LegalResponsibilities({reviewers,token}){
  const rv=reviewers||[];
  // Observation pill colour from the live trademark watch (TMW-SITE-001-AM-001) — independent of the green registration status; defaults green until loaded
  const[obsColor,setObsColor]=useState('var(--accent-green)');
  useEffect(()=>{if(!token)return;let active=true;(async()=>{try{const r=await fetch(`${SUPABASE_URL}/functions/v1/tmw-observation`,{headers:{'Authorization':`Bearer ${token}`,'apikey':SUPABASE_ANON_KEY}});if(!r.ok)return;const j=await r.json();const s=j&&j.state&&j.state.status;const map={green:'#34d399',amber:'#f59e0b',red:'#f87171'};if(active&&map[s])setObsColor(map[s]);}catch(e){}})();return()=>{active=false;};},[token]);
  const posture=[
    {area:'Company Formation',status:'Complete',detail:'17035654, incorporated 16 Feb 2026',color:'var(--accent-green)'},
    {area:'ICO Registration',status:'Active',detail:'00013389720, renewal Feb 2027',color:'var(--accent-green)'},
    {area:'UK Trademark',status:'Registered',detail:'UK00004347220 (Ai Lane), entered in register 22 May 2026 — renewal due 28 Feb 2036',color:'var(--accent-green)',observation:true},
    {area:'Terms of Service',status:'Live',detail:'ailane.ai/terms/ — ToS checkbox consent',color:'var(--accent-green)'},
    {area:'Privacy Policy',status:'Live',detail:'ailane.ai/privacy/ — UK GDPR',color:'var(--accent-green)'},
    {area:'Professional Indemnity',status:'Required',detail:'PI insurance needed before Governance tier goes live',color:'var(--accent-red)'},
  ];
  return(
    <div className="two-col">
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div className="card">
          <div className="card-head"><div className="card-head-title">Current Legal Posture</div></div>
          <div className="card-body">
            {posture.map((l,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:i<posture.length-1?'1px solid var(--border-subtle)':'none'}}>
                <div><div style={{fontSize:'0.74rem',color:'var(--text-primary)',fontWeight:500}}>{l.area}</div><div style={{fontSize:'0.58rem',color:'var(--text-muted)'}}>{l.detail}</div></div>
                <span style={{display:'inline-flex',alignItems:'center'}}><span style={{fontFamily:'var(--font-mono)',fontSize:'0.62rem',color:l.color}}>{l.status}</span>{l.observation && <a href="/AiLaneCEO/legal/trademark-observation/" style={{marginLeft:8,fontSize:'0.58rem',fontFamily:'var(--font-mono)',padding:'1px 7px',borderRadius:'12px',border:'1px solid var(--border-subtle)',color:obsColor,textDecoration:'none'}}>● Observation</a>}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-head-title">Constitutional Governance</div></div>
          <div className="card-body">
            {[
              {name:'ACEI v1.0',desc:'Ailane Compliance & Exposure Index'},
              {name:'RRI v1.0',desc:'Regulatory Readiness Index'},
              {name:'CCI v1.0',desc:'Constitutional Compliance Index'},
            ].map((c,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:i<2?'1px solid var(--border-subtle)':'none'}}>
                <div><div style={{fontSize:'0.78rem',fontWeight:600,color:'var(--text-primary)'}}>{c.name}</div><div style={{fontSize:'0.6rem',color:'var(--text-muted)'}}>{c.desc}</div></div>
                <div style={{fontSize:'0.65rem',fontFamily:'var(--font-mono)',color:'var(--accent-green)'}}>Ratified</div>
              </div>
            ))}
            <div style={{marginTop:8,fontSize:'0.66rem',color:'var(--text-secondary)',lineHeight:1.5}}>Master Amendment Register: <span style={{fontFamily:'var(--font-mono)',color:'var(--text-accent)'}}>AILANE-AMD-REG-001</span>. All document references governed by the register.</div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div className="card">
          <div className="card-head"><div className="card-head-title">External Counsel</div><div className="card-head-badge">{rv.length} on record</div></div>
          <div className="card-body">
            {reviewers==null&&<div className="ts">Loading…</div>}
            {reviewers!=null&&rv.length===0&&<div className="ts">No external reviewers invited yet. Use the Legal Oversight Room below.</div>}
            {rv.map((r,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:i<rv.length-1?'1px solid var(--border-subtle)':'none'}}>
                <div><div style={{fontSize:'0.74rem',color:'var(--text-primary)',fontWeight:500}}>{r.full_name||'(name pending)'}</div><div style={{fontSize:'0.58rem',color:'var(--text-muted)'}}>{r.firm_name}</div></div>
                <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--text-secondary)'}}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-head-title">Intelligence, not advice</div><div className="card-head-badge">PLUGIN-001 Art XIV</div></div>
          <div className="card-body">
            <div className="boundary-note">Ailane identifies, quantifies and contextualises regulatory and litigation exposure. It does <strong>not</strong> advise, recommend, or render legal opinion (PLUGIN-001 Art XIV §14.2 / Rule 5A). All surfaces carry the disclaimer tier per Rule 17. External counsel sign-off is routed through the Legal Oversight Room.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SECTION 4 (DEMOTED, collapsed) ──
function CompetitorWatch({legal,loading}){
  const d=legal||{};const legs=d.legislation||[];const legTypes=d.legislation_by_type||[];const regCats=d.regulatory_by_category||[];
  const compCases=d.competitor_cases||[];const sectorCases=d.sector_cases||[];
  return(
    <details className="collapse">
      <summary><span>Competitor litigation, sector exposure &amp; legislation library</span><span className="chev">▾ expand</span></summary>
      <div className="collapse-body">
        {loading&&<div className="ts">Loading watch data…</div>}

        {/* Competitor litigation */}
        <div className="card" style={{borderColor:'rgba(239,68,68,0.15)'}}>
          <div className="card-head"><div className="card-head-title" style={{color:'var(--accent-red)'}}>Competitor Litigation Tracker</div><div className="card-head-badge">{compCases.length} cases</div></div>
          <div className="card-body">
            {compCases.slice(0,10).map((c,i)=>(
              <div className="case-row" key={i}>
                <div className="case-date">{shortDate(c.decision_date)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="case-resp">{c.respondent_name}</div>
                  <div className="case-title">{c.title}</div>
                  <div style={{display:'flex',gap:6,marginTop:3,alignItems:'center'}}>
                    <span className="case-cat">{friendlyCat(c.acei_category)}</span>
                    {c.case_number&&<span style={{fontSize:'0.55rem',color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>{c.case_number}</span>}
                  </div>
                </div>
              </div>
            ))}
            {compCases.length===0&&!loading&&<div className="ts">No competitor cases found in index</div>}
          </div>
        </div>

        {/* Sector exposure + legislation library */}
        <div className="two-col">
          <div className="card">
            <div className="card-head"><div className="card-head-title">Tech/SaaS Sector Tribunal Exposure</div><div className="card-head-badge">Peer sector</div></div>
            <div className="card-body">
              {sectorCases.slice(0,10).map((c,i)=>(
                <div className="case-row" key={i}>
                  <div className="case-date">{shortDate(c.decision_date)}</div>
                  <div style={{flex:1,minWidth:0}}><div className="case-resp">{c.respondent_name}</div><div style={{display:'flex',gap:6,marginTop:3}}><span className="case-cat">{friendlyCat(c.acei_category)}</span></div></div>
                </div>
              ))}
              {sectorCases.length===0&&!loading&&<div className="ts">No sector cases found</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-head-title">Legislation Library</div><div className="card-head-badge">{legs.length>0?'53 instruments':'—'}</div></div>
            <div className="card-body">
              <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                {legTypes.map((t,i)=>(<span key={i} className={`leg-tag ${t.type==='primary'?'primary':t.type==='statutory_instrument'?'si':'code'}`}>{(t.type||'').replace(/_/g,' ')} ({t.count})</span>))}
              </div>
              {legs.slice(0,8).map((l,i)=>(
                <div className="leg-row" key={i}>
                  <div className="leg-title">{l.short_title}</div>
                  <div className="leg-meta">
                    <span className={`leg-tag ${l.legislation_type==='primary'?'primary':'si'}`}>{(l.legislation_type||'').replace(/_/g,' ')}</span>
                    <span className={`leg-tag ${l.lifecycle_stage==='in_force'?'force':'partial'}`}>{(l.lifecycle_stage||'').replace(/_/g,' ')}</span>
                    {l.royal_assent_date&&<span className="ts">{shortDate(l.royal_assent_date)}</span>}
                  </div>
                </div>
              ))}
              <div style={{marginTop:8,fontSize:'0.65rem',color:'var(--text-muted)'}}>Full library at <a href="/knowledge-library-preview/" style={{color:'var(--text-accent)'}}>Knowledge Library</a>.</div>
            </div>
          </div>
        </div>

        {/* Regulatory requirements */}
        <div className="card">
          <div className="card-head"><div className="card-head-title">Regulatory Requirements</div><div className="card-head-badge">{regCats.reduce((a,c)=>a+(c.total||0),0)} rules</div></div>
          <div className="card-body">
            {regCats.map((c,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<regCats.length-1?'1px solid var(--border-subtle)':'none'}}>
                <div><div style={{fontSize:'0.76rem',color:'var(--text-primary)',fontWeight:500,textTransform:'capitalize'}}>{(c.category||'').replace(/_/g,' ')}</div><div style={{fontSize:'0.58rem',color:'var(--text-muted)'}}>{c.mandatory} mandatory / {c.total} total</div></div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'1rem',fontWeight:600,color:'var(--accent-cyan)'}}>{c.total}</div>
              </div>
            ))}
            {regCats.length===0&&!loading&&<div className="ts">No regulatory requirements loaded</div>}
          </div>
        </div>
      </div>
    </details>
  );
}

// ── s.164A DATA PROTECTION COMPLAINTS REGISTER (BRIEF VOC-DRILLDOWN-002) ──
const COMPLAINT_STATUS_COLOR={received:'var(--accent-amber)',acknowledged:'var(--accent-cyan)',investigating:'var(--accent-cyan)',resolved:'var(--accent-green)',rejected:'var(--text-muted)',escalated_ico:'var(--accent-red)'};
function ComplaintsRegister({legal}){
  const[openRef,setOpenRef]=useState(null);
  const rows=(legal&&legal.dp_complaints)||[];
  const sum=legal&&legal.dp_summary;
  const today=new Date().toISOString().slice(0,10);
  const truncate=s=>{const t=String(s||'');return t.length>60?t.slice(0,60)+'…':t;};
  return(
    <div className="card" id="complaints">
      <div className="card-head"><div className="card-head-title">Data Protection Complaints — s.164A Register</div><div className="card-head-badge">{sum?sum.total+' total · '+sum.open+' open':'—'}</div></div>
      <div className="card-body">
        {sum&&sum.ack_due_within_7d>0&&<div style={{marginBottom:10}}><span className="leg-tag partial" style={{fontSize:'0.62rem',padding:'3px 9px'}}>{sum.ack_due_within_7d} acknowledgment due ≤7 days</span></div>}
        {legal==null&&<div className="ts">Loading register…</div>}
        {legal!=null&&rows.length===0&&<div className="ts">No complaints on the register.</div>}
        {rows.map((c,i)=>{
          const key=c.reference||i;
          const open=openRef===key;
          const ackOverdue=c.ack_due_date&&!c.acknowledged_at&&String(c.ack_due_date).slice(0,10)<today;
          return(
            <div key={key} style={{borderBottom:i<rows.length-1?'1px solid var(--border-subtle)':'none'}}>
              <div onClick={()=>setOpenRef(open?null:key)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'9px 0',cursor:'pointer',flexWrap:'wrap'}}>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--text-accent)'}}>{c.reference}</span>
                    <span className="case-cat">{friendlyCat(c.complaint_category)}</span>
                  </div>
                  <div style={{fontSize:'0.68rem',color:'var(--text-secondary)',marginTop:3}} title={c.subject||''}>{truncate(c.subject)}</div>
                </div>
                <div style={{display:'flex',gap:12,alignItems:'center',flexShrink:0}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'0.62rem',color:COMPLAINT_STATUS_COLOR[c.status]||'var(--text-muted)'}}>{String(c.status||'').replace(/_/g,' ')}</span>
                  <span className="ts">rec {shortDate(c.received_at)}</span>
                  <span className="ts" style={ackOverdue?{color:'var(--accent-red)'}:null}>ack due {shortDate(c.ack_due_date)}</span>
                </div>
              </div>
              {open&&(
                <div style={{background:'var(--bg-base)',border:'1px solid var(--border-subtle)',borderRadius:'var(--radius-sm)',padding:'10px 12px',margin:'0 0 10px',fontSize:'0.68rem',color:'var(--text-secondary)',lineHeight:1.55}}>
                  <div><strong style={{color:'var(--text-primary)'}}>{c.complainant_name||'(name not given)'}</strong>{c.complainant_email?' · '+c.complainant_email:''}{c.received_via?' · via '+String(c.received_via).replace(/_/g,' '):''}</div>
                  {c.details&&<div style={{marginTop:6,whiteSpace:'pre-wrap'}}>{c.details}</div>}
                  {c.outcome&&<div style={{marginTop:6}}><span style={{color:'var(--text-muted)',textTransform:'uppercase',fontSize:'0.56rem',letterSpacing:'0.06em'}}>Outcome</span><div>{c.outcome}</div></div>}
                </div>
              )}
            </div>
          );
        })}
        <div className="muted-note">s.164A DPA 2018 — acknowledge within 30 days; respond without undue delay. Intake: ailane.ai/complaints/#data-protection-form</div>
      </div>
    </div>
  );
}

// ═══════ LEGAL OVERSIGHT ROOM — reviewer invite + enter (LOVR P0 §7) ═══════
function LegalOversightRoomCard({token}){
  const[f,setF]=useState({email:'',full_name:'',firm_name:'',sra_id:'',firm_entity_id:''});
  const[busy,setBusy]=useState(false);const[msg,setMsg]=useState(null);
  function upd(k,v){setF(s=>({...s,[k]:v}));}
  async function invite(e){
    e.preventDefault();
    if(!f.email.trim()||!f.firm_name.trim()){setMsg({k:'err',t:'Reviewer email and firm name are required.'});return;}
    setBusy(true);setMsg(null);
    try{
      const r=await fetch(`${SUPABASE_URL}/functions/v1/legal-reviewer-invite`,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(f)});
      const d=await r.json().catch(()=>({}));
      if(r.ok&&d.ok){setMsg({k:'ok',t:`Invitation sent to ${f.email.trim().toLowerCase()}.`});setF({email:'',full_name:'',firm_name:'',sra_id:'',firm_entity_id:''});}
      else{setMsg({k:'err',t:(d.error||`Invite failed (${r.status}).`)});}
    }catch(err){setMsg({k:'err',t:'Network error. Please try again.'});}
    setBusy(false);
  }
  const inp={width:'100%',padding:'8px 10px',marginTop:3,background:'var(--bg-base)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-sm)',color:'var(--text-primary)',fontSize:'0.72rem',fontFamily:'var(--font-body)',outline:'none'};
  const lbl={fontSize:'0.58rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'};
  const field=(label,key,type,ph)=>React.createElement('div',{key},React.createElement('div',{style:lbl},label),React.createElement('input',{style:inp,type:type||'text',value:f[key],onChange:e=>upd(key,e.target.value),placeholder:ph||''}));
  return(
    <div className="card" style={{borderColor:'var(--border-accent)'}}>
      <div className="card-head"><div className="card-head-title" style={{color:'var(--accent-cyan)'}}>Legal Oversight Room</div><div className="card-head-badge">Reviewer access</div></div>
      <div className="card-body">
        <div style={{fontSize:'0.68rem',color:'var(--text-secondary)',marginBottom:12,lineHeight:1.5}}>
          Invite an external legal reviewer by email. They receive a magic-link invitation, sign in, and reach their workspace at <span style={{fontFamily:'var(--font-mono)',color:'var(--text-accent)'}}>/legal-oversight/</span>. Reviewers see only their own workspace — never counterparty or deal-room data.
        </div>
        <form onSubmit={invite}>
          <div className="two-col" style={{gap:10}}>
            {field('Reviewer email *','email','email','reviewer@firm.example')}
            {field('Full name','full_name','text','Jane Smith')}
            {field('Firm name *','firm_name','text','Firm LLP')}
            {field('SRA ID','sra_id','text','optional')}
            {field('Firm entity ID','firm_entity_id','text','optional')}
          </div>
          <div style={{display:'flex',gap:10,marginTop:14,alignItems:'center',flexWrap:'wrap'}}>
            <button type="submit" disabled={busy} style={{padding:'9px 16px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-accent)',background:'var(--accent-cyan-dim)',color:'var(--accent-cyan)',fontSize:'0.72rem',fontWeight:600,cursor:busy?'default':'pointer',fontFamily:'var(--font-body)',opacity:busy?0.6:1}}>{busy?'Sending…':'Send invitation'}</button>
            <a href="/legal-oversight/" style={{padding:'9px 16px',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-default)',background:'var(--bg-elevated)',color:'var(--text-primary)',fontSize:'0.72rem',fontWeight:600,textDecoration:'none'}}>Enter the Room →</a>
            {msg&&<span style={{fontSize:'0.66rem',color:msg.k==='ok'?'var(--accent-green)':'var(--accent-red)'}}>{msg.t}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
