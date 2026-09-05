create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  twilio_call_sid text not null unique,
  parent_call_sid text,
  lead_id uuid references public.leads(id) on delete set null,
  customer_name text,
  customer_phone text,
  direction text not null default 'incoming' check (direction in ('incoming', 'outgoing')),
  status text not null default 'initiated' check (status in ('initiated', 'ringing', 'answered', 'completed', 'missed', 'failed', 'busy')),
  employee_id text,
  employee_name text,
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  recording_sid text,
  recording_url text,
  recording_status text,
  recording_duration_seconds integer,
  intake_data jsonb not null default '{}'::jsonb
);

alter table public.calls
  add column if not exists intake_data jsonb not null default '{}'::jsonb;

create index if not exists calls_created_at_idx on public.calls (created_at desc);
create index if not exists calls_lead_id_idx on public.calls (lead_id);
create index if not exists calls_status_idx on public.calls (status);
create index if not exists calls_recording_sid_idx on public.calls (recording_sid);

drop trigger if exists set_calls_updated_at on public.calls;
create trigger set_calls_updated_at
before update on public.calls
for each row execute function public.set_updated_at();

alter table public.calls enable row level security;
grant select, insert, update, delete on public.calls to service_role;
