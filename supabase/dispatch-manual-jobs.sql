create table if not exists public.dispatch_manual_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  service_address text not null,
  service_date date not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  assigned_technician text not null
);

create index if not exists dispatch_manual_jobs_schedule_idx
  on public.dispatch_manual_jobs (service_date, scheduled_start);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_dispatch_manual_jobs_updated_at on public.dispatch_manual_jobs;
create trigger set_dispatch_manual_jobs_updated_at
before update on public.dispatch_manual_jobs
for each row execute function public.set_updated_at();
