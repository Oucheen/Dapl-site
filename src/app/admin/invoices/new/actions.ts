"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/supabase-activity";
import { createManualInvoice } from "@/lib/supabase-invoices";

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
    invoiceCreatedAt: canBackdateManualInvoices
      ? String(formData.get("invoiceCreatedAt") || "")
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

  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${invoiceId}`);
}
