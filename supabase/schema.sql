create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new' check (
    status in ('new', 'contacted', 'confirmed', 'invoiced', 'completed', 'cancelled')
  ),
  name text not null,
  phone text not null,
  email text not null,
  service_address text not null,
  appliance text,
  promo_code text,
  lead_source text,
  preferred_date date,
  message text not null,
  admin_notes text,
  scheduled_date date,
  estimated_price numeric(10,2),
  assigned_technician text
);

alter table public.leads
  add column if not exists admin_notes text,
  add column if not exists scheduled_date date,
  add column if not exists estimated_price numeric(10,2),
  add column if not exists assigned_technician text;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_email_idx on public.leads (email);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_leads_updated_at on public.leads;

create trigger set_leads_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

alter table public.leads enable row level security;

grant usage on schema public to service_role;
grant select, insert, update on public.leads to service_role;
