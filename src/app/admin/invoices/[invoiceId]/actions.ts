"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  addInvoiceItem,
  deleteInvoiceItem,
  type InvoiceItemInput,
  type InvoiceStatus,
  updateInvoiceItems,
  updateInvoiceStatus,
} from "@/lib/supabase-invoices";

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

export async function updateInvoiceItemsAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const invoiceId = String(formData.get("invoiceId") || "");
  const ids = formData.getAll("itemId").map(String);
  const descriptions = formData.getAll("description").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitPrices = formData.getAll("unitPrice").map(String);

  const items: InvoiceItemInput[] = ids.map((id, index) => ({
    id,
    description: descriptions[index] || "",
    quantity: quantities[index] || "1",
    unitPrice: unitPrices[index] || "0",
  }));

  await updateInvoiceItems(invoiceId, items);
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function addInvoiceItemAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const invoiceId = String(formData.get("invoiceId") || "");

  await addInvoiceItem(invoiceId);
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function deleteInvoiceItemAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const invoiceId = String(formData.get("invoiceId") || "");
  const itemId = String(formData.get("deleteItemId") || "");

  await deleteInvoiceItem(invoiceId, itemId);
  revalidatePath(`/admin/invoices/${invoiceId}`);
}
