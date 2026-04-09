// kl-content-loader/index.ts
// AILANE-SPEC-KLIA-001 §13 — Content Loader Pipeline
// Parses enriched JSON files from GitHub Pages and populates kl_provisions + kl_cases
// Manual invocation: POST with body { "files": ["era1996", "eqa2010", ...] }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://ailane.ai",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json"
};

const CONTENT_BASE_URL = "https://ailane.ai/knowledge-library/content";

serve(async (req: Request) => {
  // ─── CORS preflight ───
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // ─── Secret validation (SEC-001 §4) ───
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  // ─── Auth check — extract user from JWT ───
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  let userId: string;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    userId = payload.sub;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    // ─── Parse request body ───
    const body = await req.json();
    const fileIds: string[] = body.files;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Request body must include 'files' array, e.g. { \"files\": [\"era1996\", \"eqa2010\"] }" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const report: Record<string, any> = {};

    for (const fileId of fileIds) {
      const fileReport: any = {
        file: fileId,
        provisions_inserted: 0,
        provisions_updated: 0,
        provisions_errors: 0,
        cases_inserted: 0,
        cases_errors: 0,
        errors: []
      };

      try {
        // ─── Fetch JSON file from GitHub Pages ───
        const url = `${CONTENT_BASE_URL}/${fileId}.json`;
        console.log(`Fetching: ${url}`);
        const fileResponse = await fetch(url);

        if (!fileResponse.ok) {
          fileReport.errors.push(`HTTP ${fileResponse.status} fetching ${url}`);
          report[fileId] = fileReport;
          continue;
        }

        const fileData = await fileResponse.json();

        // ─── Extract instrument-level metadata ───
        const instrumentId = fileData.id || fileId;

        // ─── Process parts[].sections[] → kl_provisions ───
        const parts = fileData.parts || [];
        for (const part of parts) {
          const sections = part.sections || [];
          for (const section of sections) {
            try {
              // Map JSON section to kl_provisions row
              const provisionRow: Record<string, any> = {
                instrument_id: instrumentId,
                section_num: section.num || section.id || `unknown-${Date.now()}`,
                title: section.title || "Untitled",
                current_text: section.text || section.content || "",
                summary: section.summary || null,
                source_url: section.sourceUrl || null,
                key_principle: section.keyPrinciple || null,
                in_force: section.notInForce ? false : true,
                is_era_2025: section.isEra2025 || false,
                acei_category: section.aceiCategory || null,
                acei_categories: section.aceiCategories || [],
                common_errors: Array.isArray(section.commonErrors)
                  ? section.commonErrors.map((e: any) => typeof e === "string" ? e : e.description || JSON.stringify(e))
                  : [],
                last_verified: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              // Validate minimum text length (KLIA-001 §12.3)
              if (!provisionRow.current_text || provisionRow.current_text.length < 50) {
                fileReport.errors.push(`Section ${provisionRow.section_num}: text too short (${provisionRow.current_text?.length || 0} chars, minimum 50)`);
                fileReport.provisions_errors++;
                continue;
              }

              // UPSERT: insert or update on conflict
              const { error: upsertError } = await supabase
                .from("kl_provisions")
                .upsert(provisionRow, { onConflict: "instrument_id,section_num" });

              if (upsertError) {
                fileReport.errors.push(`Section ${provisionRow.section_num}: ${upsertError.message}`);
                fileReport.provisions_errors++;
              } else {
                fileReport.provisions_inserted++;
              }

              // ─── Extract leadingCases from this section → kl_cases ───
              const leadingCases = section.leadingCases || [];
              for (const lc of leadingCases) {
                try {
                  if (!lc.citation) continue; // Citation is the natural key — required

                  const caseRow: Record<string, any> = {
                    name: lc.name || lc.caseName || "Unknown",
                    citation: lc.citation,
                    court: lc.court || extractCourt(lc.citation),
                    year: lc.year || extractYear(lc.citation),
                    provisions_affected: [provisionRow.section_num],
                    principle: lc.principle || lc.keyPrinciple || null,
                    facts: lc.facts || null,
                    held: lc.held || null,
                    significance: lc.significance || null,
                    bailii_url: lc.bailiiUrl || lc.url || null,
                    updated_at: new Date().toISOString()
                  };

                  // UPSERT case — on conflict, merge provisions_affected arrays
                  const { data: existingCase } = await supabase
                    .from("kl_cases")
                    .select("case_id, provisions_affected")
                    .eq("citation", caseRow.citation)
                    .maybeSingle();

                  if (existingCase) {
                    // Merge provisions_affected arrays (deduplicate)
                    const mergedProvisions = [
                      ...new Set([
                        ...(existingCase.provisions_affected || []),
                        ...caseRow.provisions_affected
                      ])
                    ];
                    const { error: caseUpdateError } = await supabase
                      .from("kl_cases")
                      .update({
                        ...caseRow,
                        provisions_affected: mergedProvisions,
                      })
                      .eq("case_id", existingCase.case_id);

                    if (caseUpdateError) {
                      fileReport.errors.push(`Case ${caseRow.citation}: ${caseUpdateError.message}`);
                      fileReport.cases_errors++;
                    } else {
                      fileReport.cases_inserted++;
                    }
                  } else {
                    const { error: caseInsertError } = await supabase
                      .from("kl_cases")
                      .insert(caseRow);

                    if (caseInsertError) {
                      fileReport.errors.push(`Case ${caseRow.citation}: ${caseInsertError.message}`);
                      fileReport.cases_errors++;
                    } else {
                      fileReport.cases_inserted++;
                    }
                  }
                } catch (caseErr) {
                  fileReport.errors.push(`Case extraction error: ${String(caseErr)}`);
                  fileReport.cases_errors++;
                }
              }

            } catch (sectionErr) {
              fileReport.errors.push(`Section error: ${String(sectionErr)}`);
              fileReport.provisions_errors++;
            }
          }
        }

        // ─── Process file-level cases (fileLevelCases or leadingCases at root) ───
        const fileCases = fileData.fileLevelCases || fileData.leadingCases || [];
        for (const fc of fileCases) {
          try {
            if (!fc.citation) continue;
            const caseRow: Record<string, any> = {
              name: fc.name || fc.caseName || "Unknown",
              citation: fc.citation,
              court: fc.court || extractCourt(fc.citation),
              year: fc.year || extractYear(fc.citation),
              provisions_affected: fc.provisionsAffected || [],
              principle: fc.principle || null,
              facts: fc.facts || null,
              held: fc.held || null,
              significance: fc.significance || null,
              bailii_url: fc.bailiiUrl || fc.url || null,
              updated_at: new Date().toISOString()
            };

            const { error: fcError } = await supabase
              .from("kl_cases")
              .upsert(caseRow, { onConflict: "citation" });

            if (fcError) {
              fileReport.errors.push(`File-level case ${caseRow.citation}: ${fcError.message}`);
              fileReport.cases_errors++;
            } else {
              fileReport.cases_inserted++;
            }
          } catch (fcErr) {
            fileReport.errors.push(`File-level case error: ${String(fcErr)}`);
            fileReport.cases_errors++;
          }
        }

      } catch (fileErr) {
        fileReport.errors.push(`File-level error: ${String(fileErr)}`);
      }

      report[fileId] = fileReport;
    }

    // ─── Summary ───
    const totalProvisions = Object.values(report).reduce((sum: number, r: any) => sum + (r.provisions_inserted || 0), 0);
    const totalCases = Object.values(report).reduce((sum: number, r: any) => sum + (r.cases_inserted || 0), 0);
    const totalErrors = Object.values(report).reduce((sum: number, r: any) => sum + (r.provisions_errors || 0) + (r.cases_errors || 0), 0);

    console.log(`Content load complete: ${totalProvisions} provisions, ${totalCases} cases, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({
        status: "complete",
        summary: {
          files_processed: fileIds.length,
          total_provisions: totalProvisions,
          total_cases: totalCases,
          total_errors: totalErrors
        },
        files: report
      }, null, 2),
      { status: 200, headers: CORS_HEADERS }
    );

  } catch (err) {
    console.error("Unhandled error in kl-content-loader:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});

// ─── Helper functions ───

function extractCourt(citation: string): string {
  // Extract court abbreviation from citation, e.g. [1987] UKHL 8 → UKHL
  const match = citation.match(/\]\s*([A-Z]+)\s/);
  return match ? match[1] : "Unknown";
}

function extractYear(citation: string): number {
  // Extract year from citation, e.g. [1987] UKHL 8 → 1987
  const match = citation.match(/\[(\d{4})\]/);
  return match ? parseInt(match[1], 10) : 0;
}
