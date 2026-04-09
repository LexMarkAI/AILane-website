-- Migration: Create kl_calendar_events table
-- Spec: KLUI-001 §3.8 (Organisation Events), KLWS-001 §7
-- Sprint: 4b

CREATE TABLE public.kl_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  event_type TEXT NOT NULL DEFAULT 'organisation' CHECK (event_type IN (
    'policy_renewal', 'training_deadline', 'board_reporting',
    'appraisal_cycle', 'probation_review', 'custom'
  )),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  recurrence TEXT CHECK (recurrence IS NULL OR recurrence IN (
    'none', 'monthly', 'quarterly', 'biannual', 'annual'
  )),
  linked_document_id UUID,
  reminder_days INTEGER[] DEFAULT '{30,7}',
  visibility TEXT NOT NULL DEFAULT 'personal' CHECK (visibility IN (
    'personal', 'org_shared'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'snoozed', 'completed', 'cancelled'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.kl_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own events" ON public.kl_calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read org-shared events" ON public.kl_calendar_events
  FOR SELECT USING (
    visibility = 'org_shared' AND org_id IN (
      SELECT org_id FROM public.app_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users insert own events" ON public.kl_calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own events" ON public.kl_calendar_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own events" ON public.kl_calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_kl_calendar_events_user_id ON public.kl_calendar_events(user_id);
CREATE INDEX idx_kl_calendar_events_org_id ON public.kl_calendar_events(org_id);
CREATE INDEX idx_kl_calendar_events_event_date ON public.kl_calendar_events(event_date);
CREATE INDEX idx_kl_calendar_events_status ON public.kl_calendar_events(status);

-- Updated_at trigger
CREATE TRIGGER trg_kl_calendar_events_updated
  BEFORE UPDATE ON public.kl_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.kl_workspace_update_timestamp();

COMMENT ON TABLE public.kl_calendar_events IS 'KLUI-001 §3.8 — Client-created compliance calendar events (organisation type). Regulatory events are sourced from regulatory_requirements, not this table.';
