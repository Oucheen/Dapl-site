-- Run this once in the Supabase SQL editor for an existing database.
alter table public.leads
  add column if not exists pipeline_telegram_enabled boolean not null default false;
