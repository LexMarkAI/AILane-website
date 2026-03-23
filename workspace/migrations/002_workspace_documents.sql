-- Migration: Create kl_workspace_documents table
-- Spec: AILANE-SPEC-KLWS-001 v1.0 §3.3
-- Sprint: 2

CREATE TABLE IF NOT EXISTS public.kl_workspace_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.kl_workspace_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract_outline', 'policy_draft', 'procedure', 'handbook_section', 'notes_export')),
  title TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_plain TEXT,
  watermark_applied BOOLEAN NOT NULL DEFAULT true,
  disclaimer_version TEXT NOT NULL DEFAULT '1.0',
  export_count INTEGER NOT NULL DEFAULT 0,
  last_exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.kl_workspace_documents ENABLE ROW LEVEL SECURITY;

-- Users can read their own documents
CREATE POLICY "Users read own documents" ON public.kl_workspace_documents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "Users insert own documents" ON public.kl_workspace_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users update own documents" ON public.kl_workspace_documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "Users delete own documents" ON public.kl_workspace_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Index for user lookups
CREATE INDEX idx_kl_workspace_documents_user_id ON public.kl_workspace_documents(user_id);
CREATE INDEX idx_kl_workspace_documents_project_id ON public.kl_workspace_documents(project_id);

-- Updated_at trigger
CREATE TRIGGER set_updated_at_kl_workspace_documents
  BEFORE UPDATE ON public.kl_workspace_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.kl_workspace_documents IS 'KLWS-001 §3.3 — Workspace document storage with mandatory watermark and disclaimer tracking';
