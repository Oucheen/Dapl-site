import { twimlResponse, validateTwilioWebhook } from "@/lib/twilio";
import twilio from "twilio";

export async function POST(request: Request) {
  const form = await request.formData();
  const params = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  if (!validateTwilioWebhook(request, params)) return Response.json({ error: "Invalid Twilio signature." }, { status: 403 });
  const response = new twilio.twiml.VoiceResponse();
  response.say({ voice: "alice", language: "en-US" }, "This call may be recorded for quality and training purposes.");
  return twimlResponse(response);
}
