import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { sendInvoiceSms } from "@/lib/invoice-sms";
import { createLeadActivity } from "@/lib/supabase-activity";
import { getInvoiceById, updateInvoiceStatus } from "@/lib/supabase-invoices";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const { invoiceId } = await params;
  const invoiceData = await getInvoiceById(invoiceId);

  if (!invoiceData) {
    redirect("/admin/invoices?sms=missing");
  }

  const result = await sendInvoiceSms(invoiceData);

  if (!result.ok) {
    redirect(`/admin/invoices/${invoiceId}?sms=${result.reason}`);
  }

  let leadId = invoiceData.invoice.lead_id;

  if (invoiceData.invoice.status === "draft") {
    const updated = await updateInvoiceStatus(invoiceId, "sent");
    leadId = updated.leadId;
  }

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "invoice_sms_sent",
    title: "Invoice SMS sent",
    details: result.messageSid ? `Sent to ${result.to}. Twilio SID ${result.messageSid}.` : `Sent to ${result.to}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?sms=sent`);
}
