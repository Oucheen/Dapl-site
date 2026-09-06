import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { listCalls } from "@/lib/supabase-calls";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getCurrentAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const calls = await listCalls();
    return NextResponse.json({ calls: calls.slice(0, 8) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load call history.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
