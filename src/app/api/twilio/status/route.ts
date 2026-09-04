import { NextResponse } from "next/server";
import { upsertCall } from "@/lib/supabase-calls";
import { validateTwilioWebhook } from "@/lib/twilio";

function values(form: FormData) {
  return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params = values(form);

  if (!validateTwilioWebhook(request, params)) {
    return NextResponse.json({ error: "Invalid Twilio signature." }, { status: 403 });
  }

  const rawStatus = params.CallStatus || params.DialCallStatus || "initiated";
  const status = rawStatus === "in-progress" ? "answered" : rawStatus === "no-answer" ? "missed" : rawStatus === "busy" ? "busy" : rawStatus === "failed" ? "failed" : rawStatus === "completed" ? "completed" : rawStatus === "ringing" ? "ringing" : "initiated";
  const sid = params.CallSid || params.DialCallSid;

  if (!sid) {
    return NextResponse.json({ ok: true });
  }

  await upsertCall({
    twilio_call_sid: sid,
    parent_call_sid: params.ParentCallSid || null,
    status,
    answered_at: status === "answered" ? new Date().toISOString() : null,
    started_at: params.Timestamp || null,
    ended_at: status === "completed" || status === "missed" || status === "failed" || status === "busy" ? new Date().toISOString() : null,
    duration_seconds: params.CallDuration ? Number(params.CallDuration) : null,
  });

  return NextResponse.json({ ok: true });
}
