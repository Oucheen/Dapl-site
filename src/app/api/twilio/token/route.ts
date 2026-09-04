import { getCurrentAdminUser } from "@/lib/admin-auth";
import { createVoiceAccessToken, identityForUser } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentAdminUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const identity = identityForUser(user.id);
    return Response.json({ token: createVoiceAccessToken(identity), identity, userName: user.name });
  } catch (error) {
    console.error("Twilio token error:", error);
    return Response.json({ error: "Twilio is not configured." }, { status: 503 });
  }
}
