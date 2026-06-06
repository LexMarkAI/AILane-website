-- lovr_p0_reviewer_login_arc
-- Legal Oversight & Vault Room — P0 reviewer login arc (reuse-first).
-- Derives from AILANE-SPEC-LOVR-001 v1.3 (draft) | AILANE-AMD-REG-001
-- Reuses the house magic-link + allowlist + /auth/callback/ + RLS arc (AUTH-001 v2.1 / AMD-107).
-- Supersedes the withdrawn bespoke P0 (no Postgres role, no credential table, no custom JWT).
--
-- Grant model (verified against this project, 6 Jun 2026): new public tables auto-grant full DML
-- to anon/authenticated/service_role (same ACL as partner_contacts/dealroom_notes); RLS is the gate.
-- So no explicit table GRANTs are needed here.

-- 1) Reviewer allowlist (mirrors partner_contacts shape + reviewer fields).
CREATE TABLE IF NOT EXISTS public.legal_reviewer_contacts (
  contact_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email                  text NOT NULL,
  full_name              text,
  firm_name              text,
  sra_id                 text,
  firm_entity_id         text,
  role_title             text,
  scope                  text NOT NULL DEFAULT 'vault_and_synthetic_observer',
  is_synthetic_observer  boolean NOT NULL DEFAULT true,
  verification_status    text NOT NULL DEFAULT 'unverified',
  status                 text NOT NULL DEFAULT 'invited',
  invited_at             timestamptz NOT NULL DEFAULT now(),
  last_seen_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lrc_status_chk  CHECK (status IN ('invited','active','revoked')),
  CONSTRAINT lrc_email_lc_chk CHECK (email = lower(email)),
  -- UNIQUE on the email COLUMN (not the lower(email) EXPRESSION the brief used): PostgREST
  -- upsert (?on_conflict=email) / supabase-js upsert({onConflict:'email'}) can only target a
  -- real column constraint, not an expression index. Equivalent to unique-on-lower given the
  -- lowercase CHECK above. Required for the invite EF upsert (AC-P0-2).
  CONSTRAINT lrc_email_uq UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS lrc_user_id_ix ON public.legal_reviewer_contacts (user_id);

ALTER TABLE public.legal_reviewer_contacts ENABLE ROW LEVEL SECURITY;

-- 2) Helper for FUTURE LOVR content tables (P1+).
--    CRITICAL: this helper SELECTs from legal_reviewer_contacts, so it must NEVER be used in a
--    policy ON legal_reviewer_contacts itself (infinite recursion).
CREATE OR REPLACE FUNCTION public.requester_is_active_reviewer()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.legal_reviewer_contacts
    WHERE user_id = auth.uid() AND status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.requester_is_active_reviewer() FROM public;
GRANT EXECUTE ON FUNCTION public.requester_is_active_reviewer() TO authenticated, service_role;

-- 3) RLS on the allowlist table.
--    Reviewer: SELECT own row only — direct auth.uid() check (NO helper, avoids recursion).
--    Director: full — reuse the existing house helper public.requester_is_director().
--    Writes: service_role only (the invite EF; service_role bypasses RLS). No authenticated write policy.
CREATE POLICY lrc_reviewer_select_own ON public.legal_reviewer_contacts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY lrc_director_all ON public.legal_reviewer_contacts
  FOR ALL TO authenticated
  USING (public.requester_is_director())
  WITH CHECK (public.requester_is_director());

-- 4) updated_at touch — reuse the shared house trigger fn public.set_updated_at()
--    (confirmed body: BEGIN NEW.updated_at = now(); RETURN NEW; END;). No bespoke trigger fn.
DROP TRIGGER IF EXISTS lrc_set_updated_at_trg ON public.legal_reviewer_contacts;
CREATE TRIGGER lrc_set_updated_at_trg
  BEFORE UPDATE ON public.legal_reviewer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
