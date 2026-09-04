import { getCurrentAdminUser } from "@/lib/admin-auth";
import { upsertCall } from "@/lib/supabase-calls";

export async function POST(request: Request) {
  const user = await getCurrentAdminUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { callSid?: unknown } | null;
  const callSid = typeof body?.callSid === "string" ? body.callSid.trim() : "";
  if (!/^CA[a-zA-Z0-9]{20,40}$/.test(callSid)) return Response.json({ error: "Invalid call SID" }, { status: 400 });

  await upsertCall({ twilio_call_sid: callSid, employee_id: user.id, employee_name: user.name });
  return Response.json({ ok: true });
}
