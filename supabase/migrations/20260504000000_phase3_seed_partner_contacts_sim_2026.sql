-- AILANE-CC-BRIEF-WORKSPACE-DOCS-PHASE-3-001 §11
-- Phase 3 onboarding — seeds Director identity into partner_contacts for the
-- sim-2026-001 sandbox so Director (mark@ailane.ai) can authenticate via
-- magic-link and immediately access the workspace.
--
-- The eileen-dealroom EF additionally hard-codes mark@ailane.ai as a Director
-- override (auto-authorized regardless of partner_contacts state). dealroom-
-- document-fetch grants Director the same override on phase-locked documents.
-- Other consumers (dealroom-document-upload, the new direct-REST queries
-- under brief §4.4 amended) authorize via dealroom_user_has_clid_access /
-- the partner_contacts_select_by_email RLS policy — both of which read
-- partner_contacts. This seed unblocks those paths for the sandbox.
--
-- Verified facts (Supabase MCP, 4 May 2026):
--   - auth.users id for mark@ailane.ai = eb2ef2cd-10e5-41eb-904a-bb280b0cb149
--   - partner_clids row 'sim-2026-001' exists with is_simulation=true,
--     is_launch_partner=true, gate_state='phase_0'
--   - partner_contacts has zero rows for sim-2026-001 currently
--
-- Idempotent via ON CONFLICT DO NOTHING — safe to re-apply.
-- Authority: AMD-094 (privacy notice covers counter-party data) + AMD-114
-- successor — Phase 3 (1/2).

INSERT INTO public.partner_contacts (
  contact_id,
  clid,
  user_id,
  email,
  full_name,
  role_title,
  status,
  invited_at
)
VALUES (
  gen_random_uuid(),
  'sim-2026-001',
  'eb2ef2cd-10e5-41eb-904a-bb280b0cb149',  -- Director auth.users.id
  'mark@ailane.ai',
  NULL,                                      -- Director anonymity: full_name omitted
  'Director (sandbox)',
  'active',
  now()
)
ON CONFLICT DO NOTHING;
