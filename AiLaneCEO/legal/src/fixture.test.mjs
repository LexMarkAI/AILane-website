// Contract fixture test for the Legal & Compliance Control Tower (AMD-319 GCT-4 / AMD-322).
// Run: node --test AiLaneCEO/legal/src/fixture.test.mjs
// Imports nothing from the bundle. The block between the shape markers is a copy of the one
// in app.jsx; the last test fails if the two drift apart, so a change to the endpoint's shape
// has to be made in both places and re-proved against the fixture below.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

// ── Fixture: the exact shape ceo-control-tower-data v1 serves for section=all ──
const QUEUE_ROW = {
  signal_id: '7c0d6f0e-1a2b-4c3d-8e9f-0a1b2c3d4e5f', detected_at: '2026-10-14T09:12:00Z', triage_class: 'material',
  severity_proposed: 'high', jurisdiction: 'UK', event_kind: 'si_made', title: 'Example Regulations 2026', url: 'https://www.legislation.gov.uk/',
  instrument_ref: 'SI 2026/0000', instrument_keys: ['ERA-1996'], touches: [{ surface_kind: 'page', surface_ref: '/terms/', surface_class: 'legal' }],
  sla_due: '2026-10-16T09:12:00Z', sla_breached: true, age_days: 3.1, occurrence_count: 2, source_table: 'forward_feed', source_row_ref: 'ff:1',
};
const JURS = ['UK', 'EU', 'US'];
const TYPES = ['primary_law', 'secondary_law', 'parliament', 'regulator_guidance', 'case_publication', 'provider_terms', 'ailane_pages'];
function grid() {
  const g = {};
  for (const j of JURS) {
    g[j] = {};
    for (const t of TYPES) {
      const collectors = j === 'UK' ? [{ key: 'corpus-watch-daily', registered: true, health: 'ok', checked_at: '2026-10-17T06:00:00Z', last_signal_at: '2026-10-16T06:00:00Z' }] : [];
      g[j][t] = { collectors, last_signal_at: collectors.length ? '2026-10-16T06:00:00Z' : null };
    }
  }
  return g;
}
function fixture() {
  return {
    generated_at: '2026-10-17T10:00:00.000Z',
    section_requested: 'all',
    sections: {
      summary: {
        decisions_required: { open: 2, sla_breached: 1, oldest_age_days: 3.1, by_class: { material: 1, estate: 1, unclassified: 0 } },
        monitors_unhealthy: { late: 1, failed: 0, unknown: 2, of_active: 40, critical_unhealthy: 1, checked_at: '2026-10-17T06:00:00Z' },
        sources_quiet: { quiet: 1, of_collectors: 15, keys: ['bbc-parliament-daily'] },
      },
      queue: {
        open: [QUEUE_ROW, { ...QUEUE_ROW, signal_id: '8d1e7f1f-2b3c-4d4e-9f0a-1b2c3d4e5f60', triage_class: 'estate', touches: [], sla_breached: false, occurrence_count: 1 }],
        recently_decided: [{ signal_id: '9e2f8a2a-3c4d-4e5f-8a1b-2c3d4e5f6071', title: 'Decided item', triage_class: 'estate', decision: 'defer', decided_at: '2026-10-16T12:00:00Z', decision_note: 'n' }],
      },
      coverage: { jurisdictions: JURS, source_types: TYPES, grid: grid() },
      health: {
        monitors: [
          { monitor_key: 'eat-govuk-daily', display_name: 'EAT (GOV.UK)', state: 'failed', checked_at: '2026-10-17T06:00:00Z', last_proof_at: '2026-10-12T06:00:00Z', hours_overdue: 96, detail: null, kind: 'collector', cadence: 'daily', tolerance_hours: 26, critical: true, active: true, proof_kind: 'row', last_ok_at: null },
          { monitor_key: 'corpus-watch-daily', display_name: 'Corpus watch', state: 'ok', checked_at: '2026-10-17T06:00:00Z', last_proof_at: '2026-10-17T05:00:00Z', hours_overdue: null, detail: null, kind: 'collector', cadence: 'daily', tolerance_hours: 26, critical: false, active: true, proof_kind: 'row', last_ok_at: '2026-10-17T06:00:00Z' },
        ],
      },
    },
  };
}

test('the fixture passes shape()', () => {
  const r = shape(fixture());
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test('the queue contract is exactly the 17 v_director_queue columns', () => {
  assert.equal(CT_QUEUE_COLS.length, 17);
  assert.deepEqual(Object.keys(QUEUE_ROW).sort(), [...CT_QUEUE_COLS].sort());
});

test('the coverage contract is 3 jurisdictions × 7 source types = 21 cells', () => {
  assert.equal(CT_JURISDICTIONS.length * CT_SOURCE_TYPES.length, 21);
  assert.deepEqual(CT_JURISDICTIONS, JURS);
  assert.deepEqual(CT_SOURCE_TYPES, TYPES);
});

test('zero counts and a null oldest age still pass (zero is data, not absence)', () => {
  const f = fixture();
  f.sections.summary.decisions_required = { open: 0, sla_breached: 0, oldest_age_days: null, by_class: {} };
  f.sections.summary.monitors_unhealthy = { late: 0, failed: 0, unknown: 0, of_active: 40, critical_unhealthy: 0, checked_at: null };
  f.sections.summary.sources_quiet = { quiet: 0, of_collectors: 15, keys: [] };
  f.sections.queue.open = [];
  assert.equal(shape(f).ok, true);
});

test('a queue row missing a column fails', () => {
  const f = fixture();
  delete f.sections.queue.open[0].touches;
  const r = shape(f);
  assert.equal(r.ok, false);
  assert.match(r.errors.join('|'), /queue\.open\[0\] missing touches/);
});

test('a missing coverage cell fails', () => {
  const f = fixture();
  delete f.sections.coverage.grid.EU.parliament;
  assert.match(shape(f).errors.join('|'), /coverage\.grid\.EU\.parliament missing/);
});

test('a missing section or a non-numeric count fails', () => {
  for (const k of ['summary', 'queue', 'coverage', 'health']) {
    const f = fixture();
    delete f.sections[k];
    assert.equal(shape(f).ok, false, k);
  }
  const f = fixture();
  f.sections.summary.monitors_unhealthy.failed = '0';
  assert.equal(shape(f).ok, false);
  assert.equal(shape(null).ok, false);
  assert.equal(shape({ error: 'Internal server error', code: 500 }).ok, false);
});

test('this copy of shape() is identical to the one in app.jsx', () => {
  const block = (src) => src.slice(src.indexOf('// shape:begin\n'), src.indexOf('// shape:end\n'));
  const app = readFileSync(new URL('./app.jsx', import.meta.url), 'utf8');
  const self = readFileSync(new URL(import.meta.url), 'utf8');
  assert.ok(block(app).length > 100, 'shape block not found in app.jsx');
  assert.equal(block(self), block(app));
});
