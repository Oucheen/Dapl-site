import { NextRequest, NextResponse } from "next/server";

import { createLeadActivity } from "@/lib/supabase-activity";
import { getFollowUpDecision } from "@/lib/pipeline-follow-up";
import { listSupabaseLeads, updateSupabaseLead } from "@/lib/supabase-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  const querySecret = request.nextUrl.searchParams.get("secret");

  return Boolean(
    cronSecret && authorization === `Bearer ${cronSecret}` ||
      cronSecret && querySecret === cronSecret,
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = await listSupabaseLeads(1000);
    const now = Date.now();
    let moved = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      const decision = getFollowUpDecision(lead, now);

      if (!decision) {
        continue;
      }

      try {
        await updateSupabaseLead(lead.id, {
          status: lead.status,
          adminNotes: lead.admin_notes ?? "",
          pipelineStage: "follow_up_required",
          followUpRequired: true,
          followUpReason: decision.reason,
          followUpDueAt: decision.dueAt,
          followUpPreviousStage: decision.previousStage,
        });

        await createLeadActivity({
          leadId: lead.id,
          eventType: "pipeline_follow_up_created",
          title: "Follow-Up required",
          details: decision.reason,
          metadata: {
            source: "scheduler",
            dueAt: decision.dueAt,
            previousStage: decision.previousStage,
          },
        });

        moved += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown lead update error";
        errors.push(`${lead.id}: ${message}`);
        console.error("[pipeline-follow-up] lead update failed", {
          leadId: lead.id,
          message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checked: leads.length,
      moved,
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown follow-up sync error";
    console.error("[pipeline-follow-up] failed", { message });

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
