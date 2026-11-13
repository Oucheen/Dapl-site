-- Run this once in the Supabase SQL editor for an existing database.
alter table public.leads
  add column if not exists pipeline_stage text not null default 'new_lead';

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
