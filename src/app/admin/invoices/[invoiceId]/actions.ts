"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { sendInvoiceEmail } from "@/lib/invoice-email";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  addInvoiceItem,
  addInvoiceItemFromTemplate,
  deleteInvoiceItem,
  getInvoiceItemTemplate,
  getInvoiceById,
  getLeadIdForInvoice,
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

  const { leadId } = await updateInvoiceStatus(id, status);
  await createLeadActivity({
    leadId,
    invoiceId: id,
    eventType: "invoice_status_updated",
    title: "Invoice status updated",
    details: `Invoice marked ${status}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  redirect(`/admin/invoices/${id}?notice=status_updated`);
}

export async function markInvoiceCompletedAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const id = String(formData.get("id") || "");

  const { leadId } = await updateInvoiceStatus(id, "paid");
  await createLeadActivity({
    leadId,
    invoiceId: id,
    eventType: "job_completed",
    title: "Job marked completed",
    details: "Invoice marked paid and related lead moved to completed.",
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  redirect(`/admin/invoices/${id}?notice=job_completed`);
}

export async function sendInvoiceEmailAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const id = String(formData.get("id") || "");
  const invoiceData = await getInvoiceById(id);

  if (!invoiceData) {
    redirect("/admin/invoices?email=missing");
  }

  const result = await sendInvoiceEmail(invoiceData);

  if (!result.ok) {
    redirect(`/admin/invoices/${id}?email=${result.reason}`);
  }

  let leadId = invoiceData.invoice.lead_id;

  if (invoiceData.invoice.status === "draft") {
    const updated = await updateInvoiceStatus(id, "sent");
    leadId = updated.leadId;
  }

  await createLeadActivity({
    leadId,
    invoiceId: id,
    eventType: "invoice_email_sent",
    title: "Invoice email sent",
    details: `Sent to ${result.to}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  redirect(`/admin/invoices/${id}?email=sent`);
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
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_items_updated",
    title: "Invoice line items updated",
    details: `${items.length} line item${items.length === 1 ? "" : "s"} saved.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=items_saved`);
}

export async function addInvoiceItemAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const invoiceId = String(formData.get("invoiceId") || "");

  await addInvoiceItem(invoiceId);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_item_added",
    title: "Invoice line item added",
    details: "A new invoice line item was added.",
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=item_added`);
}

export async function addInvoiceTemplateItemAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const invoiceId = String(formData.get("invoiceId") || "");
  const templateKey = String(formData.get("templateKey") || "");
  const template = getInvoiceItemTemplate(templateKey);

  if (!template) {
    throw new Error("Invalid invoice item template.");
  }

  await addInvoiceItemFromTemplate(invoiceId, templateKey);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_item_added",
    title: "Invoice template item added",
    details: `${template.label} was added to the invoice.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=template_added`);
}

export async function deleteInvoiceItemAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const invoiceId = String(formData.get("invoiceId") || "");
  const itemId = String(formData.get("itemId") || formData.get("deleteItemId") || "");

  await deleteInvoiceItem(invoiceId, itemId);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_item_deleted",
    title: "Invoice line item deleted",
    details: "An invoice line item was removed.",
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=item_deleted`);
}
