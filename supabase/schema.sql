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
  promo_code text,
  discount_amount numeric(10,2) not null default 0,
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

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  created_at timestamptz not null default now(),
  payment_date timestamptz not null default now(),
  amount numeric(10,2) not null check (amount > 0),
  method text not null default 'cash',
  note text
);

create table if not exists public.invoice_checks (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_id uuid references public.invoice_payments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  received_at date not null default current_date,
  amount numeric(10,2) not null check (amount > 0),
  check_number text,
  payer_name text,
  payer_bank text,
  front_image_url text,
  back_image_url text,
  increase_check_deposit_id text,
  increase_status text,
  status text not null default 'received' check (
    status in ('received', 'ready_to_submit', 'submitted', 'accepted', 'cleared', 'rejected', 'void')
  ),
  note text
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

create table if not exists public.review_summary (
  id text primary key,
  updated_at timestamptz not null default now(),
  rating numeric(2,1) not null,
  review_count integer not null check (review_count >= 0),
  review_url text
);

create table if not exists public.telegram_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  telegram_user_id text not null unique,
  technician_name text not null,
  role text not null default 'technician' check (role in ('technician', 'dispatcher', 'owner')),
  is_active boolean not null default true,
  note text
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  role text not null default 'staff' check (role in ('staff', 'manager', 'admin', 'boss', 'owner')),
  password_hash text not null,
  password_salt text not null,
  is_active boolean not null default true,
  note text
);

alter table public.leads
  add column if not exists admin_notes text,
  add column if not exists scheduled_date date,
  add column if not exists estimated_price numeric(10,2),
  add column if not exists assigned_technician text;

alter table public.invoices
  add column if not exists promo_code text,
  add column if not exists discount_amount numeric(10,2) not null default 0;

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
create index if not exists invoice_payments_invoice_id_payment_date_idx
  on public.invoice_payments (invoice_id, payment_date asc);
create index if not exists invoice_checks_invoice_id_idx on public.invoice_checks (invoice_id);
create index if not exists invoice_checks_status_received_at_idx
  on public.invoice_checks (status, received_at desc);
create index if not exists invoice_checks_payment_id_idx on public.invoice_checks (payment_id);
create index if not exists lead_activity_lead_id_created_at_idx
  on public.lead_activity (lead_id, created_at desc);
create index if not exists lead_activity_invoice_id_created_at_idx
  on public.lead_activity (invoice_id, created_at desc);
create index if not exists telegram_users_active_idx on public.telegram_users (is_active);
create index if not exists telegram_users_role_idx on public.telegram_users (role);
create index if not exists admin_users_active_idx on public.admin_users (is_active);
create index if not exists admin_users_role_idx on public.admin_users (role);

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

drop trigger if exists set_review_summary_updated_at on public.review_summary;

create trigger set_review_summary_updated_at
before update on public.review_summary
for each row
execute function public.set_updated_at();

drop trigger if exists set_invoice_checks_updated_at on public.invoice_checks;

create trigger set_invoice_checks_updated_at
before update on public.invoice_checks
for each row
execute function public.set_updated_at();

drop trigger if exists set_telegram_users_updated_at on public.telegram_users;

create trigger set_telegram_users_updated_at
before update on public.telegram_users
for each row
execute function public.set_updated_at();

drop trigger if exists set_admin_users_updated_at on public.admin_users;

create trigger set_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.invoice_checks enable row level security;
alter table public.lead_activity enable row level security;
alter table public.review_summary enable row level security;
alter table public.telegram_users enable row level security;
alter table public.admin_users enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.leads to service_role;
grant select, insert, update, delete on public.invoices to service_role;
grant select, insert, update, delete on public.invoice_items to service_role;
grant select, insert, delete on public.invoice_payments to service_role;
grant select, insert, update, delete on public.invoice_checks to service_role;
grant select, insert on public.lead_activity to service_role;
grant select, insert, update, delete on public.review_summary to service_role;
grant select, insert, update, delete on public.telegram_users to service_role;
grant select, insert, update, delete on public.admin_users to service_role;
