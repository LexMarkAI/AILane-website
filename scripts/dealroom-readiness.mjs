#!/usr/bin/env node
/* =============================================================================
 * AILANE — Deal-Room Serving Readiness (Layer B), per AILANE-SPEC-DRPS-001 §9.
 *
 * The workspace is served under an HTTP 404 status BY DESIGN (DRPS-001 §6.1),
 * so readiness MUST be asserted on rendered DOM and explicit application
 * signals — never on a naïve HTTP-200 check. This headless runner loads each
 * room as a counterparty would and asserts the rendered reality.
 *
 * Core assertions (no secrets required):
 *   - the SPA shell boots (data-dealroom-state is set; not a raw GitHub 404),
 *   - access is gated (the sign-in / terms gate is present and blocks content),
 *   - no uncaught errors / no shell console errors.
 *
 * Deep assertions (run only when CI secrets are configured):
 *   - mint a session for a test contact (service role), inject it, reload,
 *   - assert the document estate renders grouped by phase, Eileen mounts,
 *     and no console errors — the full §9 green-light.
 *
 * Env:
 *   BASE_URL                  default https://ailane.ai
 *   ROOM_SLUGS                comma-separated; default known generic rooms
 *   SUPABASE_URL              default https://cnbsxwtvazfvzmltkuvx.supabase.co
 *   SUPABASE_ANON_KEY         required only for the deep (authenticated) path
 *   SUPABASE_SERVICE_ROLE_KEY secret — enables the deep path
 *   DEALROOM_TEST_EMAIL       secret — an active partner_contacts email
 *   DEALROOM_TEST_SLUG        the room slug that test email is a member of
 * ============================================================================= */

import { chromium } from 'playwright';

const BASE_URL = (process.env.BASE_URL || 'https://ailane.ai').replace(/\/+$/, '');
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://cnbsxwtvazfvzmltkuvx.supabase.co').replace(/\/+$/, '');
const PROJECT_REF = (SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || '';
const SLUGS = (process.env.ROOM_SLUGS ||
  'ncino-global-2026,experian-ltd-2026,anthropic-li-2026,dsit-sov-2026,rnd-sim-2026')
  .split(',').map((s) => s.trim()).filter(Boolean);

// Console noise that is not a shell defect.
const IGNORE = [
  /favicon/i, /googletagmanager|google-analytics|gtag/i, /ResizeObserver loop/i,
  /fonts\.g(oogleapis|static)\.com/i, /the server responded with a status of 404/i,
  /Failed to load resource/i,
];
const ignorable = (t) => IGNORE.some((re) => re.test(t || ''));

const GATE_STATES = new Set(['signin', 'terms-gate', 'unauthorised', 'room-not-found']);
const failures = [];
function fail(slug, msg) { failures.push(`[${slug}] ${msg}`); console.log(`::error::[${slug}] ${msg}`); }
function ok(slug, msg) { console.log(`  ✓ [${slug}] ${msg}`); }

async function waitForState(page, timeout = 25000) {
  await page.waitForFunction(() => {
    const s = document.documentElement.getAttribute('data-dealroom-state');
    return s && s !== 'booting' && s !== 'resolving';
  }, { timeout });
  return page.evaluate(() => document.documentElement.getAttribute('data-dealroom-state'));
}

function attachConsole(page, sink) {
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) sink.push('console: ' + m.text()); });
  page.on('pageerror', (e) => { if (!ignorable(String(e))) sink.push('pageerror: ' + String(e)); });
}

async function checkGated(context, slug) {
  const page = await context.newPage();
  const errs = [];
  attachConsole(page, errs);
  try {
    const resp = await page.goto(`${BASE_URL}/partners/${slug}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // HTTP 404 is expected and correct (DRPS-001 §6.1). Only a missing response is a failure.
    if (!resp) { fail(slug, 'no HTTP response'); return; }
    const state = await waitForState(page);
    if (!state) { fail(slug, 'shell did not boot (no data-dealroom-state)'); return; }
    if (!GATE_STATES.has(state) && state !== 'ready') { fail(slug, `unexpected state "${state}"`); return; }
    // Content must be gated for an unauthenticated visitor.
    if (state === 'signin') {
      const hasForm = await page.locator('[data-dealroom-signin]').count();
      if (!hasForm) { fail(slug, 'sign-in state but no sign-in form present'); return; }
      ok(slug, 'shell booted; access gated by sign-in (no content served)');
    } else {
      ok(slug, `shell booted; state="${state}"`);
    }
    if (errs.length) { fail(slug, `console/page errors: ${errs.join(' | ')}`); return; }
    ok(slug, 'no console/page errors');
  } catch (e) {
    fail(slug, `navigation/assertion error: ${e.message}`);
  } finally {
    await page.close();
  }
}

async function mintSession(email) {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkErr) throw linkErr;
  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) throw new Error('no hashed_token from generateLink');
  const { data: verifyData, error: verifyErr } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  if (verifyErr) throw verifyErr;
  if (!verifyData?.session) throw new Error('verifyOtp returned no session');
  return verifyData.session;
}

async function checkDeep(context, slug, session) {
  const storageKey = `sb-${PROJECT_REF}-auth-token`;
  const value = JSON.stringify(session);
  const page = await context.newPage();
  const errs = [];
  attachConsole(page, errs);
  await page.addInitScript(([k, v]) => { try { window.localStorage.setItem(k, v); } catch (e) {} }, [storageKey, value]);
  try {
    const resp = await page.goto(`${BASE_URL}/partners/${slug}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp) { fail(slug, '[deep] no HTTP response'); return; }
    const state = await waitForState(page, 35000);
    if (state === 'terms-gate') {
      const hasGate = await page.locator('[data-dealroom-termsgate]').count();
      if (!hasGate) { fail(slug, '[deep] terms-gate state but gate not rendered'); return; }
      ok(slug, '[deep] authenticated; terms gate present and blocking');
    } else if (state === 'ready') {
      const ws = await page.locator('[data-dealroom-workspace]').count();
      const groups = await page.locator('[data-dealroom-doc-group]').count();
      const eileen = await page.locator('[data-dealroom-eileen]').count();
      if (!ws) { fail(slug, '[deep] ready but workspace not rendered'); return; }
      if (!groups) { fail(slug, '[deep] no document phase-groups rendered'); return; }
      if (!eileen) { fail(slug, '[deep] Eileen panel did not mount'); return; }
      ok(slug, `[deep] workspace ready; ${groups} phase-group(s); Eileen mounted`);
    } else {
      fail(slug, `[deep] unexpected authenticated state "${state}"`);
      return;
    }
    if (errs.length) { fail(slug, `[deep] console/page errors: ${errs.join(' | ')}`); return; }
    ok(slug, '[deep] no console/page errors');
  } catch (e) {
    fail(slug, `[deep] error: ${e.message}`);
  } finally {
    await page.close();
  }
}

(async () => {
  console.log(`Deal-room readiness (Layer B) — base=${BASE_URL} rooms=[${SLUGS.join(', ')}]`);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  try {
    for (const slug of SLUGS) await checkGated(context, slug);

    const deepReady = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_ANON_KEY
      && process.env.DEALROOM_TEST_EMAIL && process.env.DEALROOM_TEST_SLUG && PROJECT_REF;
    if (deepReady) {
      const slug = process.env.DEALROOM_TEST_SLUG.trim();
      try {
        const session = await mintSession(process.env.DEALROOM_TEST_EMAIL.trim());
        const deepCtx = await browser.newContext();
        await checkDeep(deepCtx, slug, session);
        await deepCtx.close();
      } catch (e) {
        fail(slug, `[deep] could not mint test session: ${e.message}`);
      }
    } else {
      console.log('::notice::Deep (authenticated) checks skipped — set SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, DEALROOM_TEST_EMAIL, DEALROOM_TEST_SLUG to enable.');
    }
  } finally {
    await context.close();
    await browser.close();
  }

  if (failures.length) {
    console.log(`\nReadiness FAILED with ${failures.length} issue(s).`);
    process.exit(1);
  }
  console.log('\nReadiness PASSED.');
})();
