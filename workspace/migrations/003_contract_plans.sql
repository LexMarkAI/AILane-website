-- Migration: Create kl_contract_plans table
-- Spec: AILANE-SPEC-KLWS-001 v1.0 §4.4
-- Sprint: 3
-- Trigger: kl_workspace_update_timestamp (verified from kl_workspace_notes, kl_workspace_projects)

CREATE TABLE IF NOT EXISTS public.kl_contract_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.kl_workspace_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  plan_name TEXT NOT NULL,
  employer_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  contract_type TEXT NOT NULL CHECK (contract_type IN (
    'permanent_ft', 'permanent_pt', 'fixed_term', 'zero_hours', 'casual', 'agency'
  )),
  jurisdiction TEXT NOT NULL DEFAULT 'gb-eng' CHECK (jurisdiction IN (
    'gb-eng', 'gb-sct', 'gb-wls', 'gb-nir'
  )),
  requirement_snapshot JSONB,
  structure_selections JSONB,
  gap_analysis_upload_id UUID,
  watermark_text TEXT NOT NULL DEFAULT 'AILANE — REGULATORY INTELLIGENCE — NOT LEGAL ADVICE',
  disclaimer_version TEXT NOT NULL DEFAULT '1.0',
  disclaimer_acknowledged_at TIMESTAMPTZ,
  export_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'in_progress', 'complete', 'exported'
  )),
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.kl_contract_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own plans" ON public.kl_contract_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own plans" ON public.kl_contract_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own plans" ON public.kl_contract_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own plans" ON public.kl_contract_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_kl_contract_plans_user_id ON public.kl_contract_plans(user_id);
CREATE INDEX idx_kl_contract_plans_project_id ON public.kl_contract_plans(project_id);
CREATE INDEX idx_kl_contract_plans_status ON public.kl_contract_plans(status);

-- Updated_at trigger
CREATE TRIGGER trg_kl_contract_plans_updated
  BEFORE UPDATE ON public.kl_contract_plans
  FOR EACH ROW EXECUTE FUNCTION public.kl_workspace_update_timestamp();

COMMENT ON TABLE public.kl_contract_plans IS 'KLWS-001 §4.4 — Contract Planner plans with mandatory disclaimer tracking and requirement snapshots';
