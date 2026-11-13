-- Run this once in the Supabase SQL editor for an existing database.
alter table public.leads
  add column if not exists housecall_pro_lead_id text,
  add column if not exists housecall_pro_job_id text,
  add column if not exists pipeline_stage text not null default 'new_lead',
  add column if not exists pipeline_telegram_enabled boolean not null default false;

update public.leads
set pipeline_stage = case status
  when 'confirmed' then 'scheduled'
  when 'invoiced' then 'estimate_sent_awaiting_approval'
  when 'completed' then 'completed'
  when 'cancelled' then 'closed_no_repair'
  when 'contacted' then 'follow_up_required'
  else 'new_lead'
end
where pipeline_stage = 'new_lead';

create index if not exists leads_pipeline_stage_idx on public.leads (pipeline_stage);

create unique index if not exists leads_housecall_pro_lead_id_unique_idx
  on public.leads (housecall_pro_lead_id)
  where housecall_pro_lead_id is not null;

create unique index if not exists leads_housecall_pro_job_id_unique_idx
  on public.leads (housecall_pro_job_id)
  where housecall_pro_job_id is not null;
