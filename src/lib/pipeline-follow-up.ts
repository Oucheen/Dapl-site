import type { LeadRecord } from "@/lib/supabase-leads";
import type { PipelineStage } from "@/lib/pipeline-stages";

const NEW_LEAD_GRACE_MS = 30 * 60_000;
const ESTIMATE_GRACE_MS = 24 * 60 * 60_000;
const TECHNICIAN_WARNING_MS = 24 * 60 * 60_000;

export type FollowUpDecision = {
  reason: string;
  dueAt: string;
  previousStage: PipelineStage;
};

function isHousecallProLead(lead: LeadRecord) {
  return Boolean(
    lead.housecall_pro_lead_id ||
      lead.housecall_pro_job_id ||
      lead.lead_source?.toLowerCase().includes("housecall pro"),
  );
}

function getDateMs(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getFollowUpDecision(lead: LeadRecord, now = Date.now()): FollowUpDecision | null {
  const currentStage = lead.pipeline_stage || "new_lead";

  if (!isHousecallProLead(lead) || currentStage === "follow_up_required") {
    return null;
  }

  const createdAt = getDateMs(lead.created_at);

  if (currentStage === "new_lead" && createdAt && now - createdAt >= NEW_LEAD_GRACE_MS) {
    return {
      reason: "New HCP lead has not been processed for 30 minutes.",
      dueAt: new Date(createdAt + NEW_LEAD_GRACE_MS).toISOString(),
      previousStage: currentStage,
    };
  }

  const updatedAt = getDateMs(lead.updated_at);

  if (
    currentStage === "estimate_sent_awaiting_approval" &&
    updatedAt &&
    now - updatedAt >= ESTIMATE_GRACE_MS
  ) {
    return {
      reason: "Estimate has been awaiting customer approval for 24 hours.",
      dueAt: new Date(updatedAt + ESTIMATE_GRACE_MS).toISOString(),
      previousStage: currentStage,
    };
  }

  if (
    (currentStage === "scheduled" || currentStage === "repair_scheduled") &&
    !lead.assigned_technician
  ) {
    const scheduledStart = getDateMs(lead.scheduled_start);
    const scheduledDate = lead.scheduled_date ? getDateMs(`${lead.scheduled_date}T12:00:00`) : 0;
    const scheduledAt = scheduledStart || scheduledDate;

    if (scheduledAt && scheduledAt - now <= TECHNICIAN_WARNING_MS) {
      return {
        reason: "Scheduled HCP job has no assigned technician.",
        dueAt: new Date(Math.max(now, scheduledAt - TECHNICIAN_WARNING_MS)).toISOString(),
        previousStage: currentStage,
      };
    }
  }

  return null;
}
