export const PIPELINE_STAGES = [
  "new_lead",
  "scheduled",
  "diagnosed_estimate_needed",
  "estimate_sent_awaiting_approval",
  "approved",
  "parts_ordered",
  "parts_received",
  "repair_scheduled",
  "completed",
  "closed_no_repair",
  "follow_up_required",
  "waiting_for_customer",
  "waiting_for_property_manager",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; description: string; tone: string }
> = {
  new_lead: {
    label: "New Lead",
    description: "Needs first contact",
    tone: "border-accent/25 bg-accent/5",
  },
  scheduled: {
    label: "Scheduled",
    description: "Visit or job confirmed",
    tone: "border-emerald-500/25 bg-emerald-50",
  },
  diagnosed_estimate_needed: {
    label: "Diagnosed – Estimate Needed",
    description: "Diagnosis is complete",
    tone: "border-sky-500/25 bg-sky-50",
  },
  estimate_sent_awaiting_approval: {
    label: "Estimate Sent / Awaiting Approval",
    description: "Waiting for customer approval",
    tone: "border-amber-500/25 bg-amber-50",
  },
  approved: {
    label: "Approved",
    description: "Customer approved repair",
    tone: "border-lime-500/25 bg-lime-50",
  },
  parts_ordered: {
    label: "Parts Ordered",
    description: "Waiting for ordered parts",
    tone: "border-violet-500/25 bg-violet-50",
  },
  parts_received: {
    label: "Parts Received",
    description: "Parts are ready",
    tone: "border-indigo-500/25 bg-indigo-50",
  },
  repair_scheduled: {
    label: "Repair Scheduled",
    description: "Return visit is booked",
    tone: "border-teal-500/25 bg-teal-50",
  },
  completed: {
    label: "Completed",
    description: "Repair finished",
    tone: "border-slate-300 bg-slate-50",
  },
  closed_no_repair: {
    label: "Closed – No Repair",
    description: "Closed without repair",
    tone: "border-slate-300 bg-slate-100",
  },
  follow_up_required: {
    label: "Follow-Up Required",
    description: "Dispatcher action needed",
    tone: "border-orange-500/25 bg-orange-50",
  },
  waiting_for_customer: {
    label: "Waiting for Customer",
    description: "Customer response needed",
    tone: "border-cyan-500/25 bg-cyan-50",
  },
  waiting_for_property_manager: {
    label: "Waiting for Property Manager",
    description: "Property manager response needed",
    tone: "border-fuchsia-500/25 bg-fuchsia-50",
  },
};
