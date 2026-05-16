"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/supabase-activity";
import { createManualInvoice } from "@/lib/supabase-invoices";

export async function createManualInvoiceAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const { leadId, invoiceId } = await createManualInvoice({
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    address: String(formData.get("address") || ""),
    appliance: String(formData.get("appliance") || ""),
    serviceDate: String(formData.get("serviceDate") || ""),
    estimatedPrice: String(formData.get("estimatedPrice") || ""),
    assignedTechnician: String(formData.get("assignedTechnician") || ""),
    notes: String(formData.get("notes") || ""),
  });

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "manual_invoice_created",
    title: "Manual invoice created",
    details: "Created from the admin dashboard for a non-website lead.",
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${invoiceId}`);
}
