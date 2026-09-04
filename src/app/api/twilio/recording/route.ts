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

  const sid = params.CallSid || params.DialCallSid;
  if (!sid) return NextResponse.json({ ok: true });

  await upsertCall({
    twilio_call_sid: sid,
    recording_sid: params.RecordingSid || null,
    recording_url: params.RecordingUrl || null,
    recording_status: params.RecordingStatus || "completed",
    recording_duration_seconds: params.RecordingDuration ? Number(params.RecordingDuration) : null,
  });

  return NextResponse.json({ ok: true });
}
