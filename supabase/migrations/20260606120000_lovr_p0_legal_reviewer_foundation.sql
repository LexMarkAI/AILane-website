-- lovr_p0_legal_reviewer_foundation
-- Legal Oversight & Vault Room — P0 foundation
-- Governing spec: AILANE-SPEC-LOVR-001 v1.2 (§2.1, §5, §6, §15, §19 P0) | AILANE-AMD-REG-001
-- Security: SEC-001 (ratified 22 Mar 2026). All functions SECURITY DEFINER with pinned search_path.
--
-- Purpose: stand up a verified, gated `legal_reviewer` identity enforced by a least-privilege
-- Postgres role, so that hard separation from the counterparty/deal-room estate is provable at
-- the database privilege layer — not merely in application code.
--
-- Privilege note (verified against this project's default ACLs, 6 Jun 2026):
--   Functions created by `postgres` in schema public receive EXECUTE granted DIRECTLY to
--   `service_role` via default privileges ({postgres=X, service_role=X}), plus the implicit
--   PUBLIC grant. The REVOKE statements below strip PUBLIC / anon / authenticated /
--   legal_reviewer, leaving ONLY postgres and service_role able to execute — which is exactly
--   what the Edge Function (service-role key) needs and what makes the §3 separation proof pass.
--
-- The `legal_reviewer` role receives NO grants on ANY existing table in this migration — and
-- explicitly none on the credential table. P1 will grant it SELECT on the LOVR data tables only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Least-privilege runtime role. NOLOGIN; reachable only via PostgREST role-switch.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='legal_reviewer') THEN
    CREATE ROLE legal_reviewer NOLOGIN;
  END IF;
END $$;
GRANT legal_reviewer TO authenticator;

-- Credential table (app-level; NOT a Supabase auth.users account).
CREATE TABLE public.legal_reviewer_credential (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name          text NOT NULL,
  reviewer_name      text NOT NULL,
  reviewer_email     text NOT NULL,
  firm_email_domain  text NOT NULL,
  sra_id             text,            -- verification scaffold (populated later phases)
  firm_entity_id     text,            -- SRA-regulated entity id
  verification_status text NOT NULL DEFAULT 'pending'
                       CHECK (verification_status IN ('pending','verified','revoked')),
  credential_hash    text NOT NULL,   -- bcrypt via pgcrypto crypt()
  scope              jsonb NOT NULL DEFAULT '{"vault":"read","deal_room":"synthetic_observer"}'::jsonb,
  is_synthetic_observer boolean NOT NULL DEFAULT true,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  issued_at          timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- RLS on, default-deny: no anon/authenticated/legal_reviewer access to the credential table.
-- All reads happen inside SECURITY DEFINER RPCs below. (No policies added = locked to owner/service role.)
ALTER TABLE public.legal_reviewer_credential ENABLE ROW LEVEL SECURITY;
-- Explicitly ensure the runtime role has NO table privilege on credentials:
REVOKE ALL ON public.legal_reviewer_credential FROM legal_reviewer;

-- Issuance RPC: generates a one-time plaintext token, stores only its hash, returns the token ONCE.
CREATE OR REPLACE FUNCTION public.issue_legal_reviewer_credential(
  p_firm_name text, p_reviewer_name text, p_reviewer_email text,
  p_firm_email_domain text, p_expires_at timestamptz DEFAULT NULL
) RETURNS TABLE (credential_id uuid, one_time_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_token text; v_id uuid;
BEGIN
  v_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.legal_reviewer_credential
    (firm_name, reviewer_name, reviewer_email, firm_email_domain, credential_hash, expires_at)
  VALUES
    (p_firm_name, p_reviewer_name, p_reviewer_email, p_firm_email_domain,
     crypt(v_token, gen_salt('bf')), p_expires_at)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, v_token;
END $$;
REVOKE ALL ON FUNCTION public.issue_legal_reviewer_credential(text,text,text,text,timestamptz) FROM public, anon, authenticated, legal_reviewer;

-- Verification RPC: validates a token, returns reviewer identity if active/unexpired.
CREATE OR REPLACE FUNCTION public.verify_legal_reviewer_credential(p_token text)
RETURNS TABLE (reviewer_id uuid, firm_name text, reviewer_name text, scope jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.firm_name, c.reviewer_name, c.scope
  FROM public.legal_reviewer_credential c
  WHERE c.status='active'
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND c.credential_hash = crypt(p_token, c.credential_hash);
END $$;
REVOKE ALL ON FUNCTION public.verify_legal_reviewer_credential(text) FROM public, anon, authenticated, legal_reviewer;
