-- ============================================================================
-- Migration: isms_evidence_layer_v1
-- Brief:    AILANE-CC-BRIEF-ISMS-EVIDENCE-001 v1.0 §2
-- Parents:  AILANE-SPEC-ISMS-001 §9.6; AILANE-ISMS-SCOPE-001; AILANE-ISMS-SOA-001
-- Governed: AILANE-AMD-REG-001
--
-- Stands up the in-house ISMS evidence/governance registers (ISMS-001 decision
-- D-3, "lean in-house now"). Six new public tables: UUID PK gen_random_uuid(),
-- created_at default now(), RLS enabled, service-role write / authenticated
-- read, no anonymous access. CHECK constraints inline. No existing object is
-- altered; no PL/pgSQL function or trigger is introduced (no search_path
-- surface — the RLS block is an anonymous DO, not a persisted function).
--
-- §0 pre-flight confirmed against ailane-core (cnbsxwtvazfvzmltkuvx) 8 Jun 2026:
--   collision gate = 0 rows; pg_cron 1.6.4 + pg_net 0.19.5 present.
--
-- Apply route: apply_migration (Director/Chairman per brief §6). NOT applied by CC.
-- ============================================================================

-- 1. Risk register (clause 6 risk assessment & treatment)
create table public.risk_register (
  id uuid primary key default gen_random_uuid(),
  risk_ref text not null unique,
  title text not null,
  description text,
  asset_ref text,                              -- links AILANE-ISMS-SCOPE-001 §4 asset
  threat text,
  vulnerability text,
  likelihood int check (likelihood between 1 and 5),
  impact int check (impact between 1 and 5),
  inherent_score int,                          -- likelihood*impact (maintained by app)
  treatment_option text check (treatment_option in ('avoid','reduce','transfer','accept')),
  treatment_plan text,
  annex_a_controls text[],                     -- e.g. {'A.8.15','A.8.24'}
  residual_likelihood int check (residual_likelihood between 1 and 5),
  residual_impact int check (residual_impact between 1 and 5),
  residual_score int,
  owner text default 'Director',
  status text not null default 'open' check (status in ('open','treated','accepted','closed')),
  review_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.risk_register is 'ISO 27001 clause 6 risk register. Seed from mitigation_register + estate DPIA. AILANE-SPEC-ISMS-001 §9.2.';

-- 2. Internal audit log (clause 9.2)
create table public.internal_audit_log (
  id uuid primary key default gen_random_uuid(),
  audit_ref text not null unique,
  audit_date date not null,
  standard text check (standard in ('ISO_27001','SOC_2','Cyber_Essentials','combined')),
  scope text,
  auditor text,                                -- external internal-auditor (ISMS-001 §10)
  controls_covered text[],
  findings_summary text,
  nonconformities int default 0,
  observations int default 0,
  report_uri text,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
comment on table public.internal_audit_log is 'ISO 27001 clause 9.2 internal audit programme + results.';

-- 3. Management review log (clause 9.3)
create table public.management_review_log (
  id uuid primary key default gen_random_uuid(),
  review_ref text not null unique,
  review_date date not null,
  attendees text,
  agenda_items text[],
  decisions text,
  actions text,
  objectives_status text,
  next_review date,
  minutes_uri text,
  created_at timestamptz not null default now()
);
comment on table public.management_review_log is 'ISO 27001 clause 9.3 management review minutes.';

-- 4. Access review log (A.5.18 / A.8.2)
create table public.access_review_log (
  id uuid primary key default gen_random_uuid(),
  review_ref text not null unique,
  review_date date not null,
  system text not null,                        -- supabase|github|google|stripe|monzo|host|other
  accounts_reviewed int,
  mfa_confirmed boolean,
  changes_made text,
  reviewer text default 'Director',
  status text not null default 'complete' check (status in ('complete','exception')),
  created_at timestamptz not null default now()
);
comment on table public.access_review_log is 'Periodic least-privilege / MFA access reviews (A.5.18, A.8.2, A.8.5).';

-- 5. Awareness & training log (A.6.3)
create table public.awareness_training_log (
  id uuid primary key default gen_random_uuid(),
  person text not null,
  topic text not null,
  completed_at date not null,
  evidence_uri text,
  created_at timestamptz not null default now()
);
comment on table public.awareness_training_log is 'A.6.3 awareness, education and training records.';

-- 6. Evidence log (auto-collected control evidence; A.8.15/16, clause 9.1)
create table public.isms_evidence_log (
  id uuid primary key default gen_random_uuid(),
  evidence_ref text,
  control_ref text,                            -- Annex A reference, e.g. 'A.8.13'
  evidence_type text not null,                 -- backup_test|mfa_status|access_review|cert_expiry|vuln_scan|heartbeat|other
  collected_at timestamptz not null default now(),
  source text,                                 -- 'isms-evidence-collector' | 'manual'
  result jsonb,
  automated boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.isms_evidence_log is 'Monitoring/measurement evidence store (clause 9.1; A.8.15/A.8.16). Populated by isms-evidence-collector.';

-- Indexes
create index idx_risk_register_status on public.risk_register(status);
create index idx_internal_audit_date on public.internal_audit_log(audit_date);
create index idx_mgmt_review_date on public.management_review_log(review_date);
create index idx_access_review_system on public.access_review_log(system, review_date);
create index idx_evidence_type_time on public.isms_evidence_log(evidence_type, collected_at);
create index idx_evidence_control on public.isms_evidence_log(control_ref);

-- RLS: enable on all six; service-role write, authenticated read, no anon.
do $$
declare t text;
begin
  foreach t in array array['risk_register','internal_audit_log','management_review_log',
                           'access_review_log','awareness_training_log','isms_evidence_log']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$create policy %1$s_svc_all on public.%1$s
                      for all to service_role using (true) with check (true);$p$, t);
    execute format($p$create policy %1$s_auth_read on public.%1$s
                      for select to authenticated using (true);$p$, t);
  end loop;
end $$;
