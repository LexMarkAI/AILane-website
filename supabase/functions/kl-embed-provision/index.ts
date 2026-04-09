// kl-embed-provision/index.ts
// AILANE-SPEC-KLIA-001-AM-001 — Voyage AI voyage-law-2 embedding pipeline
// DPIA clearance: AILANE-DPIA-KLIA-001 PA-1 (approved 29 March 2026)
// Triggered by Database Webhook on kl_provisions INSERT/UPDATE
// Also handles kl_cases INSERT/UPDATE via table identifier in payload

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req: Request) => {
  // ─── Secret validation (SEC-001 §4) ───
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const VOYAGE_API_KEY = Deno.env.get("VOYAGE_API_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(
      JSON.stringify({ error: "Server configuration error", missing: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!VOYAGE_API_KEY) {
    console.error("FATAL: Missing VOYAGE_API_KEY");
    return new Response(
      JSON.stringify({ error: "Server configuration error", missing: "VOYAGE_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // ─── Parse webhook payload ───
    const payload = await req.json();

    // Supabase Database Webhook payload structure:
    // { type: "INSERT" | "UPDATE", table: "kl_provisions" | "kl_cases", record: {...}, old_record: {...} }
    const { type, table, record } = payload;

    if (!record) {
      console.error("No record in webhook payload");
      return new Response(JSON.stringify({ error: "No record in payload" }), { status: 400 });
    }

    // ─── Determine text to embed and row ID based on table ───
    let textToEmbed: string;
    let rowId: string;
    let idColumn: string;

    if (table === "kl_provisions") {
      // For provisions: embed current_text (the statutory text)
      // Prepend title and section_num for richer semantic context
      const title = record.title || "";
      const sectionNum = record.section_num || "";
      const summary = record.summary || "";
      const currentText = record.current_text || "";
      const keyPrinciple = record.key_principle || "";

      // Compose embedding text: section reference + title + summary + full statutory text + key principle
      // This gives voyage-law-2 maximum legal context for accurate retrieval
      textToEmbed = [
        sectionNum && title ? `${sectionNum} — ${title}` : title || sectionNum,
        summary,
        currentText,
        keyPrinciple ? `Key principle: ${keyPrinciple}` : ""
      ].filter(Boolean).join("\n\n");

      rowId = record.provision_id;
      idColumn = "provision_id";
    } else if (table === "kl_cases") {
      // For cases: embed name + citation + principle + facts + held + significance
      const name = record.name || "";
      const citation = record.citation || "";
      const principle = record.principle || "";
      const facts = record.facts || "";
      const held = record.held || "";
      const significance = record.significance || "";

      textToEmbed = [
        `${name} ${citation}`,
        principle ? `Principle: ${principle}` : "",
        facts ? `Facts: ${facts}` : "",
        held ? `Held: ${held}` : "",
        significance ? `Significance: ${significance}` : ""
      ].filter(Boolean).join("\n\n");

      rowId = record.case_id;
      idColumn = "case_id";
    } else {
      console.log(`Ignoring webhook for unhandled table: ${table}`);
      return new Response(JSON.stringify({ status: "ignored", table }), { status: 200 });
    }

    if (!textToEmbed || textToEmbed.trim().length < 20) {
      console.error(`Insufficient text to embed for ${table} ${rowId}: ${textToEmbed?.length || 0} chars`);
      return new Response(
        JSON.stringify({ status: "skipped", reason: "insufficient_text", row_id: rowId }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─── Skip if embedding already exists and this is an UPDATE where text hasn't changed ───
    if (type === "UPDATE" && record.embedding && payload.old_record) {
      const oldText = table === "kl_provisions"
        ? payload.old_record.current_text
        : [payload.old_record.principle, payload.old_record.facts, payload.old_record.held].join("");
      const newText = table === "kl_provisions"
        ? record.current_text
        : [record.principle, record.facts, record.held].join("");

      if (oldText === newText) {
        console.log(`Text unchanged for ${table} ${rowId} — skipping re-embed`);
        return new Response(
          JSON.stringify({ status: "skipped", reason: "text_unchanged", row_id: rowId }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Embedding ${table} ${rowId}: ${textToEmbed.length} chars`);

    // ─── Call Voyage AI API ───
    const voyageResponse = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOYAGE_API_KEY}`
      },
      body: JSON.stringify({
        model: "voyage-law-2",
        input: [textToEmbed],
        input_type: "document"
      })
    });

    if (!voyageResponse.ok) {
      const errorBody = await voyageResponse.text();
      console.error(`Voyage API error ${voyageResponse.status}: ${errorBody}`);
      // Return 200 to prevent webhook retry — log the error for investigation
      return new Response(
        JSON.stringify({
          status: "error",
          stage: "voyage_api",
          http_status: voyageResponse.status,
          row_id: rowId,
          error: errorBody.substring(0, 500)
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const voyageData = await voyageResponse.json();

    if (!voyageData.data || !voyageData.data[0] || !voyageData.data[0].embedding) {
      console.error("Voyage API returned no embedding data:", JSON.stringify(voyageData).substring(0, 500));
      return new Response(
        JSON.stringify({ status: "error", stage: "voyage_parse", row_id: rowId }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const embedding = voyageData.data[0].embedding;

    // ─── Validate embedding dimension ───
    if (embedding.length !== 1024) {
      console.error(`Unexpected embedding dimension: ${embedding.length} (expected 1024)`);
      return new Response(
        JSON.stringify({ status: "error", stage: "dimension_mismatch", expected: 1024, got: embedding.length }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─── Write embedding back to Supabase ───
    // Use service_role client to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Format embedding as pgvector string: [0.123,0.456,...]
    const embeddingStr = `[${embedding.join(",")}]`;

    const { error: updateError } = await supabase
      .from(table)
      .update({ embedding: embeddingStr, updated_at: new Date().toISOString() })
      .eq(idColumn, rowId);

    if (updateError) {
      console.error(`Supabase update error for ${table} ${rowId}:`, updateError);
      return new Response(
        JSON.stringify({ status: "error", stage: "supabase_update", row_id: rowId, error: updateError.message }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully embedded ${table} ${rowId}: ${embedding.length} dimensions, ${voyageData.usage?.total_tokens || "?"} tokens`);

    return new Response(
      JSON.stringify({
        status: "success",
        table,
        row_id: rowId,
        dimensions: embedding.length,
        tokens_used: voyageData.usage?.total_tokens || null,
        text_length: textToEmbed.length
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unhandled error in kl-embed-provision:", err);
    return new Response(
      JSON.stringify({ status: "error", stage: "unhandled", error: String(err) }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});
