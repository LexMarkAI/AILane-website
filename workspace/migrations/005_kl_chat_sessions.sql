-- KLWS-001 §3.3 / KLUI-001 §3.4 — Eileen chat session grouping
-- Sprint 5: kl_chat_sessions table
-- Individual messages stored in kl_eileen_conversations (session_id links).
-- Sessions support resumption, search, and sidebar listing.

CREATE TABLE public.kl_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  message_count INTEGER NOT NULL DEFAULT 0,
  topic_tags TEXT[] DEFAULT '{}',
  statutory_refs TEXT[] DEFAULT '{}',
  resumed_from UUID REFERENCES public.kl_chat_sessions(id),
  page_context TEXT DEFAULT 'workspace',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kl_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sessions" ON public.kl_chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own sessions" ON public.kl_chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sessions" ON public.kl_chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own sessions" ON public.kl_chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_kl_chat_sessions_user_id ON public.kl_chat_sessions(user_id);
CREATE INDEX idx_kl_chat_sessions_updated ON public.kl_chat_sessions(updated_at DESC);
CREATE INDEX idx_kl_chat_sessions_project ON public.kl_chat_sessions(project_id);

CREATE TRIGGER trg_kl_chat_sessions_updated
  BEFORE UPDATE ON public.kl_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.kl_workspace_update_timestamp();

COMMENT ON TABLE public.kl_chat_sessions IS 'KLWS-001 §3.3 / KLUI-001 §3.4 — Eileen chat session grouping. Individual messages stored in kl_eileen_conversations (session_id links). Sessions support resumption, search, and sidebar listing.';
