"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/supabase-activity";
import { createManualInvoice, getInvoiceById } from "@/lib/supabase-invoices";
import { notifyTechnicianJobAssigned } from "@/lib/telegram-job-notifications";

export async function createManualInvoiceAction(formData: FormData) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const canBackdateManualInvoices = permissions.canBackdateManualInvoices;
  const { leadId, invoiceId } = await createManualInvoice({
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    address: String(formData.get("address") || ""),
    appliance: String(formData.get("appliance") || ""),
    promoCode: String(formData.get("promoCode") || ""),
    serviceDate: String(formData.get("serviceDate") || ""),
    estimatedPrice: String(formData.get("estimatedPrice") || ""),
    assignedTechnician: String(formData.get("assignedTechnician") || ""),
    notes: String(formData.get("notes") || ""),
    leadCreatedAt: canBackdateManualInvoices
      ? String(formData.get("leadCreatedAt") || "")
      : "",
    leadCreatedTime: canBackdateManualInvoices
      ? String(formData.get("leadCreatedTime") || "")
      : "",
    invoiceCreatedAt: canBackdateManualInvoices
      ? String(formData.get("invoiceCreatedAt") || "")
      : "",
    invoiceCreatedTime: canBackdateManualInvoices
      ? String(formData.get("invoiceCreatedTime") || "")
      : "",
  });

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "manual_invoice_created",
    title: "Manual invoice created",
    details: canBackdateManualInvoices
      ? `Created from the admin dashboard for a non-website lead by ${permissions.user.name}. Historical dates may have been applied.`
      : `Created from the admin dashboard for a non-website lead by ${permissions.user.name}.`,
  });

  try {
    const invoiceData = await getInvoiceById(invoiceId);

    if (invoiceData?.invoice.assigned_technician) {
      await notifyTechnicianJobAssigned(invoiceData.invoice);
    }
  } catch {
    // Telegram notifications should not block manual invoice creation.
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  redirect(`/admin/invoices/${invoiceId}`);
}
