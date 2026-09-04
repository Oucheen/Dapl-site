import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getTwilioConfig } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ recordingSid: string }> }) {
  const user = await getCurrentAdminUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { recordingSid } = await context.params;
  if (!/^RE[a-zA-Z0-9]{20,40}$/.test(recordingSid)) {
    return Response.json({ error: "Invalid recording SID" }, { status: 400 });
  }

  const config = getTwilioConfig();
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Recordings/${recordingSid}.mp3`;
  const upstream = await fetch(url, {
    headers: { Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}` },
  });

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "Recording is unavailable." }, { status: upstream.status || 404 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
