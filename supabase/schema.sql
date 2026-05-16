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

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  invoice_number text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'paid', 'void')
  ),
  customer_name text not null,
  customer_phone text,
  customer_email text,
  service_address text,
  appliance text,
  service_date date,
  assigned_technician text,
  notes text,
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text,
  paid_date date
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  created_at timestamptz not null default now(),
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null default 0,
  line_total numeric(10,2) not null default 0
);

create table if not exists public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid references public.leads(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  event_type text not null,
  title text not null,
  details text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.leads
  add column if not exists admin_notes text,
  add column if not exists scheduled_date date,
  add column if not exists estimated_price numeric(10,2),
  add column if not exists assigned_technician text;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_email_idx on public.leads (email);
create index if not exists invoices_created_at_idx on public.invoices (created_at desc);
create index if not exists invoices_lead_id_idx on public.invoices (lead_id);
create unique index if not exists invoices_lead_id_unique_idx
  on public.invoices (lead_id)
  where lead_id is not null;
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index if not exists lead_activity_lead_id_created_at_idx
  on public.lead_activity (lead_id, created_at desc);
create index if not exists lead_activity_invoice_id_created_at_idx
  on public.lead_activity (invoice_id, created_at desc);

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

drop trigger if exists set_invoices_updated_at on public.invoices;

create trigger set_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.lead_activity enable row level security;

grant usage on schema public to service_role;
grant select, insert, update on public.leads to service_role;
grant select, insert, update on public.invoices to service_role;
grant select, insert, update, delete on public.invoice_items to service_role;
grant select, insert on public.lead_activity to service_role;
