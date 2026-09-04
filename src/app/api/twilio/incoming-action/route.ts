import { NextResponse } from "next/server";
import { createLeadActivity } from "@/lib/supabase-activity";
import { upsertCall } from "@/lib/supabase-calls";
import { twimlResponse, validateTwilioWebhook } from "@/lib/twilio";
import twilio from "twilio";

function values(form: FormData) {
  return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params = values(form);

  if (!validateTwilioWebhook(request, params)) {
    return NextResponse.json({ error: "Invalid Twilio signature." }, { status: 403 });
  }

  const status = params.DialCallStatus === "completed" ? "completed" : params.DialCallStatus === "busy" ? "busy" : params.DialCallStatus === "no-answer" ? "missed" : params.DialCallStatus === "failed" ? "failed" : "answered";
  const call = await upsertCall({
    twilio_call_sid: params.CallSid,
    status,
    answered_at: status === "answered" ? new Date().toISOString() : null,
    ended_at: new Date().toISOString(),
    duration_seconds: params.DialCallDuration ? Number(params.DialCallDuration) : null,
  });

  if (call?.lead_id) {
    await createLeadActivity({
      leadId: call.lead_id,
      eventType: status === "missed" ? "missed_call" : "call_completed",
      title: status === "missed" ? "Missed incoming call" : "Incoming call completed",
      details: call.customer_phone || "Twilio incoming call",
      metadata: { callSid: call.twilio_call_sid, direction: "incoming", status },
    });
  }

  return twimlResponse(new twilio.twiml.VoiceResponse());
}
