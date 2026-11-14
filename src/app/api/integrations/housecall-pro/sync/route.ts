import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import {
  findRecentLeadBySourcePhone,
  findSupabaseLeadByHousecallProJobId,
  findSupabaseLeadByHousecallProLeadId,
  saveLeadToSupabase,
  updateSupabaseLead,
} from "@/lib/supabase-leads";
import { listHousecallProJobs, type HousecallProJobSnapshot } from "@/lib/housecall-pro-api";
import type { PipelineStage } from "@/lib/pipeline-stages";

export const runtime = "nodejs";

const HCP_SOURCE = "Housecall Pro";

function getCharlotteDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getStage(job: HousecallProJobSnapshot, currentStage?: PipelineStage): PipelineStage | null {
  const status = job.status.toLowerCase();

  if (/(cancel|deleted|void|lost)/.test(status)) {
    return "closed_no_repair";
  }

  if (/(complete|paid|finished|done)/.test(status)) {
    return "completed";
  }

  if (job.scheduledStart || /(schedule|assigned|started|on.?my.?way|progress)/.test(status)) {
    return ["approved", "parts_ordered", "parts_received"].includes(currentStage ?? "")
      ? "repair_scheduled"
      : "scheduled";
  }

  return null;
}

function getJobMessage(job: HousecallProJobSnapshot) {
  return [
    `Source: ${HCP_SOURCE}`,
    `HCP Job ID: ${job.id}`,
    job.source ? `Lead source: ${job.source}` : null,
    job.notes ? `Notes: ${job.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function findExistingJob(job: HousecallProJobSnapshot) {
  const byJob = await findSupabaseLeadByHousecallProJobId(job.id);

  if (byJob) {
    return byJob;
  }

  if (job.leadId) {
    const byLead = await findSupabaseLeadByHousecallProLeadId(job.leadId);

    if (byLead) {
      return byLead;
    }
  }

  if (job.phone) {
    return findRecentLeadBySourcePhone({
      leadSource: HCP_SOURCE,
      phone: job.phone,
      windowMinutes: 365 * 24 * 60,
    });
  }

  return null;
}

export async function POST(request: Request) {
  if (!(await getCurrentAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let limit = 250;

  try {
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = Math.min(Math.max(Math.floor(body.limit), 1), 250);
    }
  } catch {
    // Use the default sync limit for an empty request body.
  }

  try {
    const jobs = await listHousecallProJobs(limit);
    const result = { fetched: jobs.length, created: 0, updated: 0, skipped: 0, errors: [] as string[] };

    for (const job of jobs) {
      try {
        const existing = await findExistingJob(job);
        const scheduledDate = getCharlotteDate(job.scheduledStart);
        const nextStage = getStage(job, existing?.pipeline_stage);

        if (existing) {
          await updateSupabaseLead(existing.id, {
            status: existing.status,
            adminNotes: existing.admin_notes ?? "",
            housecallProJobId: job.id,
            ...(job.leadId ? { housecallProLeadId: job.leadId } : {}),
            ...(job.appointmentId ? { housecallProAppointmentId: job.appointmentId } : {}),
            ...(job.assignedTechnician ? { assignedTechnician: job.assignedTechnician } : {}),
            ...(job.scheduledStart ? { scheduledStart: job.scheduledStart } : {}),
            ...(job.scheduledEnd ? { scheduledEnd: job.scheduledEnd } : {}),
            ...(scheduledDate ? { scheduledDate } : {}),
            ...(nextStage ? { pipelineStage: nextStage } : {}),
          });
          result.updated += 1;
          continue;
        }

        const saved = await saveLeadToSupabase({
          name: job.customerName,
          phone: job.phone,
          email: job.email,
          address: job.address || "Address pending - Housecall Pro job",
          appliance: job.appliance,
          promoCode: "",
          leadSource: HCP_SOURCE,
          preferredDate: scheduledDate,
          scheduledDate,
          message: getJobMessage(job),
          housecallProLeadId: job.leadId || undefined,
          housecallProJobId: job.id,
          housecallProAppointmentId: job.appointmentId || undefined,
          scheduledStart: job.scheduledStart || undefined,
          scheduledEnd: job.scheduledEnd || undefined,
          assignedTechnician: job.assignedTechnician || undefined,
          pipelineStage: nextStage || "new_lead",
        });

        if (saved.saved && (saved.id || !saved.duplicate)) {
          result.created += 1;
        } else {
          result.skipped += 1;
        }
      } catch (error) {
        result.errors.push(`${job.id}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Housecall Pro sync failed." },
      { status: 502 },
    );
  }
}
