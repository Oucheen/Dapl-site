import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/supabase-activity";
import { upsertCall } from "@/lib/supabase-calls";
import { saveCallIntakeLead, type CallIntakeLeadInput } from "@/lib/supabase-leads";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseInput(value: unknown): { input: CallIntakeLeadInput; callSid: string } {
  if (!isRecord(value)) {
    throw new Error("Invalid intake payload.");
  }

  const rawItems = Array.isArray(value.items) ? value.items : [];
  const rawTags = Array.isArray(value.tags) ? value.tags : [];

  return {
    callSid: asString(value.callSid).trim(),
    input: {
      leadId: asString(value.leadId).trim() || null,
      name: asString(value.name),
      phone: asString(value.phone),
      email: asString(value.email),
      address: asString(value.address),
      appliance: asString(value.appliance),
      leadSource: asString(value.leadSource),
      preferredDate: asString(value.preferredDate),
      message: asString(value.message),
      adminNotes: asString(value.adminNotes),
      saveMode: value.saveMode === "schedule" ? "schedule" : "lead",
      serviceDate: asString(value.serviceDate),
      serviceTime: asString(value.serviceTime),
      serviceWindow: asString(value.serviceWindow),
      assignedTechnician: asString(value.assignedTechnician),
      businessUnit: asString(value.businessUnit),
      jobType: asString(value.jobType),
      propertyType: asString(value.propertyType),
      propertyAge: asString(value.propertyAge),
      ownership: asString(value.ownership),
      workType: asString(value.workType),
      priority: asString(value.priority),
      tags: rawTags.filter((tag): tag is string => typeof tag === "string").slice(0, 50),
      items: rawItems.filter(isRecord).slice(0, 100).map((item) => ({
        category: item.category === "material" ? "material" : "service",
        name: asString(item.name),
        description: asString(item.description),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    },
  };
}

export async function POST(request: Request) {
  if (!(await getCurrentAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = parseInput(await request.json());
    const saved = await saveCallIntakeLead(parsed.input);
    let callLinked = false;

    if (parsed.callSid) {
      try {
        await upsertCall({
          twilio_call_sid: parsed.callSid,
          lead_id: saved.leadId,
          intake_data: saved.intakeData,
        });
        callLinked = true;
      } catch (error) {
        console.error("Could not link intake to Twilio call:", error);
      }
    }

    await createLeadActivity({
      leadId: saved.leadId,
      eventType: saved.existing ? "call_intake_updated" : "call_intake_created",
      title: saved.existing ? "Call intake updated" : "New lead created from call",
      details: parsed.input.message || parsed.input.phone,
      metadata: {
        callSid: parsed.callSid || null,
        saveMode: parsed.input.saveMode,
        callLinked,
        total: saved.total,
      },
    });

    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${saved.leadId}`);
    revalidatePath("/admin/calls");

    return NextResponse.json({
      ok: true,
      leadId: saved.leadId,
      existing: saved.existing,
      callLinked,
      total: saved.total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save call intake.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
