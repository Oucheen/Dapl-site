"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { type InvoiceStatus, updateInvoiceStatus } from "@/lib/supabase-invoices";

const ALLOWED_INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "void"];

export async function updateInvoiceStatusAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as InvoiceStatus;

  if (!ALLOWED_INVOICE_STATUSES.includes(status)) {
    throw new Error("Invalid invoice status.");
  }

  await updateInvoiceStatus(id, status);
  revalidatePath(`/admin/invoices/${id}`);
}
