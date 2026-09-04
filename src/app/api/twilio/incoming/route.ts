import { NextResponse } from "next/server";
import { findLeadByPhone, upsertCall } from "@/lib/supabase-calls";
import { listCrmUsers } from "@/lib/supabase-admin-users";
import { getPublicRequestUrl, getTwilioConfig, identityForUser, twimlResponse, validateTwilioWebhook } from "@/lib/twilio";
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
    getTwilioConfig();
    const lead = await findLeadByPhone(params.From || "").catch(() => null);
    const usersData = await listCrmUsers(100).catch(() => ({ users: [], ready: false }));
    const users = usersData.users.filter((user) => user.is_active);
    const response = new twilio.twiml.VoiceResponse();

    await upsertCall({
      twilio_call_sid: params.CallSid,
      customer_name: lead?.name || null,
      customer_phone: params.From || null,
      direction: "incoming",
      status: users.length ? "ringing" : "missed",
      lead_id: lead?.id || null,
      started_at: new Date().toISOString(),
    });

    if (!users.length) {
      response.say({ voice: "alice", language: "en-US" }, "No agents are available right now. Please leave a message or call back later.");
      response.hangup();
      return twimlResponse(response);
    }

    response.say({ voice: "alice", language: "en-US" }, "This call may be recorded for quality and training purposes.");
    const dial = response.dial({
      timeout: 25,
      record: "record-from-answer-dual",
      recordingStatusCallback: `${new URL(getPublicRequestUrl(request)).origin}/api/twilio/recording`,
      action: `${new URL(getPublicRequestUrl(request)).origin}/api/twilio/incoming-action`,
      method: "POST",
    });

    for (const user of users) {
      dial.client(identityForUser(user.id));
    }

    return twimlResponse(response);
  } catch (error) {
    console.error("Twilio incoming call error:", error);
    return NextResponse.json({ error: "Could not route incoming call." }, { status: 500 });
  }
}
