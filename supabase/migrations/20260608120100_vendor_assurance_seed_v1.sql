-- ============================================================================
-- Migration: vendor_assurance_seed_v1
-- Brief:    AILANE-CC-BRIEF-ISMS-EVIDENCE-001 v1.0 §3
-- Governed: AILANE-AMD-REG-001 | A.5.19–A.5.23 supplier & cloud security
--
-- Idempotent INSERTs (skip if the vendor row already exists) completing the
-- vendor_assurance_register for the unregistered subprocessors. Brings the
-- register from 3 rows (Anthropic, Supabase, Resend) to 8.
--
-- Every certification claim is sourced (URLs in comments) and was verified
-- 8 Jun 2026. Fields that cannot yet be verified precisely (exact contracting
-- entity, signed-DPA reference) carry an explicit 'confirm:' placeholder for the
-- Director to verify against each signed agreement before the row is fully
-- marked verified.
--
-- CORRECTION vs brief §3 (CLAUDE.md "introspect information_schema before
-- writing queries"): the LIVE `subprocessors` column is TEXT, not jsonb
-- (verified 8 Jun 2026). The empty JSON array is therefore written as the text
-- literal '[]' — the brief's '[]'::jsonb would error with "column is of type
-- text but expression is of type jsonb" (no assignment cast). `certifications`
-- IS jsonb, so its '[...]'::jsonb casts are retained unchanged.
--
-- Apply route: apply_migration (Director/Chairman per brief §6). NOT applied by CC.
-- ============================================================================

-- Stripe — payments processor (Engine 1 / Knowledge Library subscriptions)
-- Sources: https://docs.stripe.com/security ; https://stripe.com/legal/dpa (updated 2025-11-18) ; https://trust.stripe.com
insert into public.vendor_assurance_register
(vendor_name, legal_entity, jurisdiction, processor_role, relationship_to_ailane, service_description,
 transfer_mechanism, data_location, retention_summary, breach_notification, training_use, subprocessors,
 special_categories, certifications, dpa_reference, source_url, assurance_status, verified_at, verified_by, notes)
select 'Stripe',
 'confirm: Stripe Payments UK Ltd (UK merchants) / Stripe, Inc. (US)', 'United States / United Kingdom', 'processor',
 'Payment processing for Engine 1 and Knowledge Library transactions',
 'Card payment processing, payment intents, subscriptions, webhooks',
 'UK IDTA / EU SCCs per Stripe DPA', 'United States; global card-network processing',
 'Per Stripe DPA and PCI requirements', 'Per Stripe DPA (Security Incident clause)', 'N/A — payments processor',
 '[]', 'card data (PCI), not GDPR special category',
 '[{"standard":"PCI DSS","level":"Level 1 Service Provider","source":"trust.stripe.com AoC"},
   {"standard":"SOC 1 / SOC 2 Type II","note":"produced annually; available on request"},
   {"standard":"ISO/IEC 27001","status":"held"}]'::jsonb,
 'confirm: Stripe DPA (stripe.com/legal/dpa, 2025-11-18) — execution reference',
 'https://docs.stripe.com/security', 'verified', now(), 'Chairman (Cowork, Director-instructed)',
 'PCI DSS Level 1 removes card-data scope from AI Lane. Confirm contracting entity + signed DPA reference.'
where not exists (select 1 from public.vendor_assurance_register where vendor_name='Stripe');

-- GitHub (Microsoft) — source-code repository hosting
-- Sources: https://ghec.github.trust.page ; GitHub Trust Center
insert into public.vendor_assurance_register
(vendor_name, legal_entity, jurisdiction, processor_role, relationship_to_ailane, service_description,
 transfer_mechanism, data_location, retention_summary, breach_notification, training_use, subprocessors,
 special_categories, certifications, dpa_reference, source_url, assurance_status, verified_at, verified_by, notes)
select 'GitHub',
 'GitHub, Inc. (Microsoft Corporation)', 'United States', 'processor',
 'Source-code repository hosting (LexMarkAI/AILane-website; Edge Function source)',
 'Git repository hosting, CI, issues',
 'UK IDTA / EU SCCs per Microsoft Products & Services DPA', 'United States (Enterprise data-residency optional)',
 'Repository retained until deletion by owner', 'Per Microsoft/GitHub DPA', 'Source not used to train models (per GitHub terms)',
 '[]', 'none expected (source code, not personal data)',
 '[{"standard":"ISO/IEC 27001:2013","status":"held"},
   {"standard":"ISO/IEC 42001:2023","status":"held"},
   {"standard":"SOC 1 / SOC 2 / SOC 3","status":"held"},
   {"standard":"CSA STAR Level 2","status":"held"},
   {"standard":"TISAX","status":"held"}]'::jsonb,
 'confirm: Microsoft Products and Services DPA',
 'https://ghec.github.trust.page/', 'verified', now(), 'Chairman (Cowork, Director-instructed)',
 'Enable branch protection + 2FA on the org (A.8.4). Data-residency is an Enterprise-tier option.'
where not exists (select 1 from public.vendor_assurance_register where vendor_name='GitHub');

-- Google Workspace — email + identity
-- Sources: https://cloud.google.com/security/compliance/iso-27001 ; https://workspace.google.com (DPA)
insert into public.vendor_assurance_register
(vendor_name, legal_entity, jurisdiction, processor_role, relationship_to_ailane, service_description,
 transfer_mechanism, data_location, retention_summary, breach_notification, training_use, subprocessors,
 special_categories, certifications, dpa_reference, source_url, assurance_status, verified_at, verified_by, notes)
select 'Google Workspace',
 'confirm: Google Ireland Limited (EEA/UK) / Google LLC', 'Ireland / United States', 'processor',
 'Business email and identity (mark@ailane.ai), documents',
 'Email, identity, document storage',
 'UK IDTA / EU SCCs per Google Cloud Data Processing Addendum', 'Region-electable (US / EU data regions)',
 'Per Workspace DPA', 'Per Workspace DPA (data incident clause)', 'Workspace content not used for advertising/model training',
 '[]', 'mailbox may contain personal data',
 '[{"standard":"ISO/IEC 27001","status":"held"},
   {"standard":"ISO/IEC 27017","status":"held"},
   {"standard":"ISO/IEC 27018","status":"held"},
   {"standard":"SOC 2 / SOC 3","status":"held"}]'::jsonb,
 'confirm: Google Cloud Data Processing Addendum (Workspace)',
 'https://cloud.google.com/security/compliance/iso-27001', 'verified', now(), 'Chairman (Cowork, Director-instructed)',
 'Set EU data region if UK/EEA residency is preferred. Enforce MFA on the tenant (A.8.5).'
where not exists (select 1 from public.vendor_assurance_register where vendor_name='Google Workspace');

-- Monzo — business banking (independent controller, not a data processor for Ailane)
-- Sources: FCA Register (firm authorisation) ; Monzo Business security pages
insert into public.vendor_assurance_register
(vendor_name, legal_entity, jurisdiction, processor_role, relationship_to_ailane, service_description,
 transfer_mechanism, data_location, retention_summary, breach_notification, training_use, subprocessors,
 special_categories, certifications, dpa_reference, source_url, assurance_status, verified_at, verified_by, notes)
select 'Monzo',
 'Monzo Bank Ltd', 'United Kingdom', 'controller',
 'Business banking; inbound pilot-fee payment-confirmation webhook (monzo-webhook)',
 'Business current account + transaction webhook',
 'N/A — UK processing', 'United Kingdom',
 'Per banking regulation', 'Per UK banking / data-protection obligations', 'N/A',
 '[]', 'banking transaction data',
 '[{"standard":"UK banking authorisation","note":"PRA/FCA-authorised bank; confirm Firm Reference Number on the FCA Register"},
   {"standard":"ISO 27001 / SOC 2","status":"none published"}]'::jsonb,
 'N/A — bank acts as independent controller (no DPA as processor)',
 'https://register.fca.org.uk/', 'partial', now(), 'Chairman (Cowork, Director-instructed)',
 'Monzo is Ailane''s bank (independent controller), not a subprocessor of Ailane data. No commercial ISO/SOC 2 certificate published; assurance rests on its regulated-bank status. Treat the webhook ingress as an external interface (A.5.14).'
where not exists (select 1 from public.vendor_assurance_register where vendor_name='Monzo');

-- Website host / DNS — DIRECTOR TO CONFIRM PROVIDER
insert into public.vendor_assurance_register
(vendor_name, legal_entity, jurisdiction, processor_role, relationship_to_ailane, service_description,
 transfer_mechanism, data_location, retention_summary, breach_notification, training_use, subprocessors,
 special_categories, certifications, dpa_reference, source_url, assurance_status, verified_at, verified_by, notes)
select 'Website host / DNS (to confirm)',
 'confirm', 'confirm', 'processor',
 'Public website (ailane.ai) hosting and DNS',
 'Static/edge hosting + DNS', 'confirm', 'confirm', 'confirm', 'confirm', 'confirm',
 '[]', 'none expected (public marketing site)',
 '[]'::jsonb, 'confirm',
 'confirm', 'pending', now(), 'Chairman (Cowork, Director-instructed)',
 'OPEN ITEM O-1: Director to confirm the hosting + DNS provider (Git-connected host implied by branch-deploy workflow). Update entity, certifications, data location, DPA on confirmation.'
where not exists (select 1 from public.vendor_assurance_register where vendor_name='Website host / DNS (to confirm)');
