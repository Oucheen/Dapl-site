import { NextResponse } from "next/server";
import { findLeadByPhone, upsertCall } from "@/lib/supabase-calls";
import { getPublicRequestUrl, getTwilioConfig, toE164, twimlResponse, validateTwilioWebhook } from "@/lib/twilio";
import twilio from "twilio";

export const dynamic = "force-dynamic";

function values(form: FormData) {
  return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
}

export async function POST(request: Request) {
  const form = await request.formData();
  const params = values(form);

  if (!validateTwilioWebhook(request, params)) {
    return NextResponse.json({ error: "Invalid Twilio signature." }, { status: 403 });
  }

  try {
    const config = getTwilioConfig();
    const to = toE164(params.To || "");
    const lead = params.leadId ? await findLeadByPhone(to).catch(() => null) : null;
    const response = new twilio.twiml.VoiceResponse();
    const dial = response.dial({
      callerId: config.phoneNumber,
      timeout: 30,
      record: "record-from-answer-dual",
      recordingStatusCallback: `${new URL(getPublicRequestUrl(request)).origin}/api/twilio/recording`,
      action: `${new URL(getPublicRequestUrl(request)).origin}/api/twilio/outgoing-action`,
      method: "POST",
    });
    dial.number({ url: `${new URL(getPublicRequestUrl(request)).origin}/api/twilio/recording-announcement`, method: "POST" }, to);

    await upsertCall({
      twilio_call_sid: params.CallSid,
      lead_id: lead?.id || null,
      customer_name: params.customerName || lead?.name || null,
      customer_phone: to,
      direction: "outgoing",
      status: "ringing",
      employee_id: params.employeeId || null,
      employee_name: params.employeeName || null,
      started_at: new Date().toISOString(),
    });

    return twimlResponse(response);
  } catch (error) {
    console.error("Twilio outgoing call error:", error);
    return NextResponse.json({ error: "Could not start the outgoing call." }, { status: 400 });
  }
}
