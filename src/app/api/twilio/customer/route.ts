import { getCurrentAdminUser } from "@/lib/admin-auth";
import { findLeadByPhone } from "@/lib/supabase-calls";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await getCurrentAdminUser())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const phone = new URL(request.url).searchParams.get("phone") || "";
  const lead = await findLeadByPhone(phone).catch(() => null);
  return Response.json({
    name: lead?.name || "Unknown caller",
    leadId: lead?.id || null,
    phone: lead?.phone || phone,
    email: lead?.email || "",
    address: lead?.service_address || "",
    appliance: lead?.appliance || "",
    leadSource: lead?.lead_source || "",
    preferredDate: lead?.preferred_date || "",
    message: lead?.message || "",
    status: lead?.status || "",
    adminNotes: lead?.admin_notes || "",
  });
}
