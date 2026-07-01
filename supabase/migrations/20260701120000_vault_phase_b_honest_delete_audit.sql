-- VAULT-PHASE-B-001 (Stage C · C2) — honest delete + delete-audit RLS support
-- Applied to ailane-core (cnbsxwtvazfvzmltkuvx) via MCP apply_migration on
-- 2026-07-01 as `vault_phase_b_honest_delete_and_delete_audit`. This file is
-- the repo record of that migration.
--
-- 1) kl_vault_documents_owner_select: drop the "deleted_at IS NULL" guard so an
--    owner can read their OWN rows including soft-deleted ones. This makes a
--    soft-delete PATCH with Prefer: return=representation return the updated
--    row (non-empty array = confirmed delete). Under the previous policy the
--    RETURNING read of the now-deleted row failed row-level security and
--    aborted the whole UPDATE (observed: 42501 in a rolled-back probe).
--    Every list surface in the website repo filters deleted_at=is.null
--    explicitly, and the org_read policy never had a deleted_at guard, so
--    owner visibility of their own deleted rows is consistent with existing
--    semantics. The RESTRICTIVE aal2_required_when_enrolled policy is
--    unchanged and still applies on top.
--
-- 2) omdl_member_insert: authenticated org members may insert deletion-audit
--    rows for their own org (vault document deletes log matter_id = the vault
--    document id, reason = 'vault_document_user_delete'). The table previously
--    had only omdl_org_select, so the client-side audit write was impossible.
--
-- Post-migration probe (rolled back), simulating the room's PATCH shape:
--   owner + RETURNING           → 1 row  (confirmed delete)
--   non-owner + RETURNING       → 0 rows, no error (honest "not deleted")
--
-- GDPR Art 17 erasure path — decision recorded for Phase B: the user-facing
-- delete stays a SOFT delete (deleted_at) plus one audit row here; full
-- erasure (storage object + row purge) remains a service-role back-office
-- process on a verified Art 17 request. No hard-delete Edge Function is
-- introduced, so no client-reachable destructive path exists.

drop policy if exists kl_vault_documents_owner_select on public.kl_vault_documents;
create policy kl_vault_documents_owner_select
  on public.kl_vault_documents
  for select
  using (auth.uid() = user_id);

drop policy if exists omdl_member_insert on public.operational_matter_deletion_log;
create policy omdl_member_insert
  on public.operational_matter_deletion_log
  for insert
  to authenticated
  with check (org_id = get_my_org_id());
