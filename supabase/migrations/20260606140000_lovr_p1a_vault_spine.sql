-- LOVR P1a — vault spine. Reuses P0 helpers requester_is_active_reviewer() + requester_is_director().
-- Reviewer is read-only; writes are Director + service_role. lovr_w9_evidence is append-only.

-- 1) Obligations checklist (the W9 spine: W9(a/b/c) + conditions + folded Tier-1)
CREATE TABLE IF NOT EXISTS public.lovr_obligation_checklist (
  obligation_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                   text NOT NULL,
  title                  text NOT NULL,
  description            text,
  category               text NOT NULL,
  status                 text NOT NULL DEFAULT 'open',
  owner                  text,
  compliance_register_id uuid REFERENCES public.compliance_estate_register(id) ON DELETE SET NULL,
  linked_artefact_ids    uuid[] NOT NULL DEFAULT '{}',   -- forward-link to the P1b registry; empty for now
  display_order          integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loc_category_chk CHECK (category IN ('w9-question','build','live-activation','licence-compliance','tier-1-folded')),
  CONSTRAINT loc_status_chk   CHECK (status   IN ('open','in-progress','satisfied','blocked','not-applicable')),
  CONSTRAINT loc_code_uq UNIQUE (code)
);
ALTER TABLE public.lovr_obligation_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY loc_reviewer_director_select ON public.lovr_obligation_checklist
  FOR SELECT TO authenticated
  USING (requester_is_active_reviewer() OR requester_is_director());
CREATE POLICY loc_director_all ON public.lovr_obligation_checklist
  FOR ALL TO authenticated
  USING (requester_is_director()) WITH CHECK (requester_is_director());
CREATE TRIGGER loc_set_updated_at BEFORE UPDATE ON public.lovr_obligation_checklist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) W9 evidence ledger — APPEND-ONLY, hash-chained. Populated at signing (P2).
CREATE TABLE IF NOT EXISTS public.lovr_w9_evidence (
  evidence_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id     uuid REFERENCES public.lovr_obligation_checklist(obligation_id) ON DELETE RESTRICT,
  w9_question       text,
  signed_opinion_ref text,
  signing_method    text,
  classification    text NOT NULL,
  effective_date    date,
  expiry_date       date,
  retrigger_conditions text,
  verification_snapshot jsonb,
  document_hash     text,
  document_version  text,
  trusted_timestamp timestamptz,
  prior_entry_hash  text,
  entry_hash        text,
  reviewer_user_id  uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lwe_classification_chk  CHECK (classification IN ('clean-approval','approval-with-conditions','blocked')),
  CONSTRAINT lwe_signing_method_chk  CHECK (signing_method IS NULL OR signing_method IN ('in-house','verified-upload'))
);
ALTER TABLE public.lovr_w9_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY lwe_reviewer_director_select ON public.lovr_w9_evidence
  FOR SELECT TO authenticated
  USING (requester_is_active_reviewer() OR requester_is_director());
-- INSERT is service_role only (the signing EF at P2). No authenticated INSERT/UPDATE/DELETE policy.
-- Hard append-only guard — blocks UPDATE/DELETE for ALL roles (incl. service_role): corrections append a superseding row.
CREATE OR REPLACE FUNCTION public.lovr_w9_evidence_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'lovr_w9_evidence is append-only; % is not permitted', TG_OP;
END; $$;
CREATE TRIGGER lwe_append_only BEFORE UPDATE OR DELETE ON public.lovr_w9_evidence
  FOR EACH ROW EXECUTE FUNCTION public.lovr_w9_evidence_append_only();

-- 3) Rectification-obligations register — living (status updates as commitments complete).
CREATE TABLE IF NOT EXISTS public.lovr_rectification_obligation (
  rectification_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment             text NOT NULL,
  anticipated_change     text,
  tracked_instrument_ref text,
  owner                  text,
  due_date               date,
  completion_status      text NOT NULL DEFAULT 'open',
  completion_evidence_ref text,
  linked_obligation_id   uuid REFERENCES public.lovr_obligation_checklist(obligation_id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lro_status_chk CHECK (completion_status IN ('open','in-progress','complete','overdue'))
);
ALTER TABLE public.lovr_rectification_obligation ENABLE ROW LEVEL SECURITY;
CREATE POLICY lro_reviewer_director_select ON public.lovr_rectification_obligation
  FOR SELECT TO authenticated
  USING (requester_is_active_reviewer() OR requester_is_director());
CREATE POLICY lro_director_all ON public.lovr_rectification_obligation
  FOR ALL TO authenticated
  USING (requester_is_director()) WITH CHECK (requester_is_director());
CREATE TRIGGER lro_set_updated_at BEFORE UPDATE ON public.lovr_rectification_obligation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
