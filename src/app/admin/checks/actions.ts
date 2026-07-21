"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/supabase-activity";
import { updateInvoiceCheckStatus } from "@/lib/supabase-checks";
import { getLeadIdForInvoice } from "@/lib/supabase-invoices";

async function requireAdmin() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }
}

export async function updateCheckStatusFromList(formData: FormData) {
  await requireAdmin();

  const checkId = String(formData.get("checkId") || "");
  const invoiceId = String(formData.get("invoiceId") || "");
  const status = String(formData.get("status") || "");
  const returnTo = String(formData.get("returnTo") || "/admin/checks");
  const result = await updateInvoiceCheckStatus(checkId, status);

  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_check_status_updated",
    title: "Check status updated",
    details: result.paymentCreated
      ? `Check was marked ${status} and added to invoice payments.`
      : `Check was marked ${status}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/checks");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(returnTo);
}
