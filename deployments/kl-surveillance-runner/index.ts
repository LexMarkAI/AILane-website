// kl-surveillance-runner/index.ts — v1
// KLIA-001 §7: Automated Legislative Surveillance System
// Scheduled: 07:15 UTC daily via pg_cron
// Coverage: legislation.gov.uk amendment detection + GOV.UK guidance updates

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── TRACKED INSTRUMENTS (legislation.gov.uk paths) ──
// Only primary Acts and key SIs — these are the instruments where amendments
// have direct compliance impact. Guidance documents (acas-*, ehrc-*, hse-*, ico-*)
// are monitored via GOV.UK Content API in Check 2, not here.

const TRACKED_INSTRUMENTS: Array<{
  id: string;
  legGovPath: string;
  title: string;
}> = [
  { id: 'era1996', legGovPath: 'ukpga/1996/18', title: 'Employment Rights Act 1996' },
  { id: 'eqa2010', legGovPath: 'ukpga/2010/15', title: 'Equality Act 2010' },
  { id: 'nmwa1998', legGovPath: 'ukpga/1998/39', title: 'National Minimum Wage Act 1998' },
  { id: 'hswa1974', legGovPath: 'ukpga/1974/37', title: 'Health and Safety at Work etc. Act 1974' },
  { id: 'tulrca1992', legGovPath: 'ukpga/1992/52', title: 'Trade Union and Labour Relations (Consolidation) Act 1992' },
  { id: 'era1999', legGovPath: 'ukpga/1999/26', title: 'Employment Relations Act 1999' },
  { id: 'dpa2018', legGovPath: 'ukpga/2018/12', title: 'Data Protection Act 2018' },
  { id: 'pida1998', legGovPath: 'ukpga/1998/23', title: 'Public Interest Disclosure Act 1998' },
  { id: 'wtr1998', legGovPath: 'uksi/1998/1833', title: 'Working Time Regulations 1998' },
  { id: 'tupe2006', legGovPath: 'uksi/2006/246', title: 'Transfer of Undertakings Regulations 2006' },
  { id: 'nmwregs2015', legGovPath: 'uksi/2015/621', title: 'National Minimum Wage Regulations 2015' },
  { id: 'mpl1999', legGovPath: 'uksi/1999/3312', title: 'Maternity and Parental Leave etc. Regulations 1999' },
  { id: 'ptwr2000', legGovPath: 'uksi/2000/1551', title: 'Part-Time Workers Regulations 2000' },
  { id: 'fter2002', legGovPath: 'uksi/2002/2034', title: 'Fixed-Term Employees Regulations 2002' },
  { id: 'awa2010', legGovPath: 'uksi/2010/93', title: 'Agency Workers Regulations 2010' },
];

// ── ALERT CLASSIFICATION (KLIA-001 §7.3) ──
function classifyChange(changeType: string, instrumentId: string): number {
  // Class 1: Primary legislation amendment in force or commencement order
  if (changeType === 'commencement' || changeType === 'commencement order') return 1;
  if (instrumentId === 'nmwa1998' && changeType.includes('substitut')) return 1; // NMW rate changes
  if (changeType.includes('in force') || changeType === 'royal assent') return 1;

  // Class 2: SI amendment to tracked instrument, or significant text change
  if (changeType.includes('amend') || changeType.includes('substitut') || changeType.includes('insert')) return 2;
  if (changeType.includes('repeal')) return 2;

  // Class 3: Minor or editorial changes
  return 3;
}

// ── SLA DEADLINE CALCULATION (KLIA-001 §7.3) ──
function calculateSlaDeadline(alertClass: number): string {
  const now = new Date();
  switch (alertClass) {
    case 1: return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();    // 24 hours
    case 2: return new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();    // 72 hours
    case 3: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    default: return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  }
}

// ── CHECK 1: legislation.gov.uk AMENDMENT DETECTION ──
async function checkLegislationChanges(
  supabase: any,
  since: string // ISO date string e.g. '2026-04-01'
): Promise<number> {
  let totalNewAlerts = 0;

  for (const instrument of TRACKED_INSTRUMENTS) {
    try {
      // legislation.gov.uk changes feed
      // See: https://www.legislation.gov.uk/developer/formats
      const url = `https://www.legislation.gov.uk/changes/affected/${instrument.legGovPath}?results-count=20&sort=affecting-year-number-desc`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/atom+xml' }
      });

      if (!response.ok) {
        console.log(`[surveillance] legislation.gov.uk ${instrument.id}: HTTP ${response.status}`);
        continue;
      }

      const xmlText = await response.text();

      // Parse entries from Atom feed
      // Each <entry> contains a change affecting this instrument
      const entries = xmlText.match(/<entry>([\s\S]*?)<\/entry>/g) || [];

      for (const entry of entries) {
        // Extract key fields from XML
        const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
        const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
        const updatedMatch = entry.match(/<updated>([^<]+)<\/updated>/);
        const categoryMatch = entry.match(/<category[^>]*term="([^"]+)"/);

        if (!titleMatch || !linkMatch) continue;

        const changeTitle = titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        const changeUrl = linkMatch[1];
        const changeDate = updatedMatch ? updatedMatch[1] : '';
        const changeType = categoryMatch ? categoryMatch[1].toLowerCase() : '';

        // Skip if older than our since date
        if (changeDate && changeDate < since) continue;

        // Deduplicate: check if this source_url already exists
        const { data: existing } = await supabase
          .from('kl_legislative_alerts')
          .select('alert_id')
          .eq('source_url', changeUrl)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Classify and insert
        const alertClass = classifyChange(changeType, instrument.id);

        // Extract affected sections from title if possible
        const sectionMatch = changeTitle.match(/[Ss](?:ection|\.)\s*(\d+[A-Z]?(?:\(\d+\))?)/g);
        const affectedSections = sectionMatch
          ? sectionMatch.map((s: string) => s.replace(/[Ss]ection\s*/, 's.'))
          : [];

        const { error } = await supabase
          .from('kl_legislative_alerts')
          .insert({
            source: 'kl_surveillance_runner',
            source_url: changeUrl,
            alert_class: alertClass,
            alert_type: changeType || 'instrument_amendment',
            affected_instrument_id: instrument.id,
            affected_sections: affectedSections,
            title: `${instrument.title}: ${changeTitle}`,
            summary: `Amendment detected via legislation.gov.uk /changes feed. Type: ${changeType}. Affects: ${instrument.id}.`,
            raw_content: { feed_entry: changeTitle, url: changeUrl, date: changeDate, type: changeType },
            status: 'pending_assessment',
            sla_deadline: calculateSlaDeadline(alertClass),
          });

        if (!error) {
          totalNewAlerts++;
          console.log(`[surveillance] NEW: Class ${alertClass} — ${instrument.id}: ${changeTitle}`);
        } else {
          console.error(`[surveillance] Insert error for ${instrument.id}:`, error.message);
        }
      }

      // Rate-limit: 500ms pause between instruments to avoid hammering legislation.gov.uk
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.error(`[surveillance] Error checking ${instrument.id}:`, (err as Error).message);
    }
  }

  return totalNewAlerts;
}

// ── CHECK 2: GOV.UK CONTENT API (GUIDANCE UPDATES) ──
async function checkGovUkGuidance(
  supabase: any,
  since: string
): Promise<number> {
  let totalNewAlerts = 0;

  // GOV.UK Content API: search for employment-related content updated since last check
  const queries = [
    { query: 'employment rights', publisher: 'ACAS/HMRC/DWP' },
    { query: 'national minimum wage', publisher: 'HMRC' },
    { query: 'statutory sick pay maternity pay', publisher: 'DWP' },
    { query: 'ACAS code practice employment', publisher: 'ACAS' },
  ];

  for (const q of queries) {
    try {
      const url = `https://www.gov.uk/api/search.json?q=${encodeURIComponent(q.query)}&filter_format=guidance,detailed_guidance&order=-public_timestamp&count=10`;

      const response = await fetch(url);
      if (!response.ok) {
        console.log(`[surveillance] GOV.UK API error for "${q.query}": HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const results = data.results || [];

      for (const result of results) {
        const pubDate = result.public_timestamp || '';

        // Skip if older than since date
        if (pubDate && pubDate < since) continue;

        const resultUrl = `https://www.gov.uk${result.link}`;

        // Deduplicate
        const { data: existing } = await supabase
          .from('kl_legislative_alerts')
          .select('alert_id')
          .eq('source_url', resultUrl)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Classify: GOV.UK guidance is typically Class 3 (standard)
        // Unless it contains NMW rate announcement (Class 1) or new ACAS Code (Class 2)
        let alertClass = 3;
        const titleLower = (result.title || '').toLowerCase();
        if (titleLower.includes('national minimum wage') && titleLower.includes('rate')) alertClass = 1;
        if (titleLower.includes('code of practice')) alertClass = 2;
        if (titleLower.includes('commencement')) alertClass = 1;

        const alertType = titleLower.includes('code of practice')
          ? 'code_of_practice_update'
          : 'guidance_update';

        const { error } = await supabase
          .from('kl_legislative_alerts')
          .insert({
            source: 'kl_surveillance_runner',
            source_url: resultUrl,
            alert_class: alertClass,
            alert_type: alertType,
            affected_instrument_id: null,
            affected_sections: '{}',
            title: result.title || 'GOV.UK guidance update',
            summary: `GOV.UK guidance detected via Content API. Publisher context: ${q.publisher}. Description: ${(result.description || '').substring(0, 300)}`,
            raw_content: { govuk_result: result },
            status: 'pending_assessment',
            sla_deadline: calculateSlaDeadline(alertClass),
          });

        if (!error) {
          totalNewAlerts++;
          console.log(`[surveillance] NEW: Class ${alertClass} guidance — ${result.title}`);
        }
      }

      // Rate-limit: 300ms between queries
      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      console.error(`[surveillance] Error checking GOV.UK "${q.query}":`, (err as Error).message);
    }
  }

  return totalNewAlerts;
}

// ── MAIN HANDLER ──
Deno.serve(async (req: Request) => {
  // Secret validation (SEC-001 §4)
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[surveillance] Missing required secrets');
    return new Response(JSON.stringify({
      error: 'Configuration error',
      missing: [
        ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
        ...(!SUPABASE_SERVICE_ROLE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
      ]
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Determine the lookback window
    // Default: check the last 7 days to catch anything missed during gaps
    // This means duplicate detection via source_url is essential
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`[surveillance] Starting daily run. Checking changes since ${since}`);

    // Check 1: legislation.gov.uk amendments
    const legAlerts = await checkLegislationChanges(supabase, since);
    console.log(`[surveillance] legislation.gov.uk: ${legAlerts} new alerts`);

    // Check 2: GOV.UK guidance
    const govAlerts = await checkGovUkGuidance(supabase, since);
    console.log(`[surveillance] GOV.UK guidance: ${govAlerts} new alerts`);

    const totalAlerts = legAlerts + govAlerts;
    console.log(`[surveillance] Run complete. Total new alerts: ${totalAlerts}`);

    return new Response(JSON.stringify({
      success: true,
      since,
      legislation_alerts: legAlerts,
      guidance_alerts: govAlerts,
      total_new_alerts: totalAlerts,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[surveillance] Fatal error:', (err as Error).message);
    return new Response(JSON.stringify({
      error: 'Surveillance run failed',
      message: (err as Error).message,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
