"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { sendInvoiceSms } from "@/lib/invoice-sms";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  addInvoiceItem,
  addInvoicePayment,
  getInvoiceById,
  getLeadIdForInvoice,
  type InvoiceItemInput,
  updateInvoiceItems,
  updateInvoiceJobStatus,
  updateInvoiceStatus,
} from "@/lib/supabase-invoices";

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function redirectBack(invoiceId: string, notice: string): never {
  redirect(`/app/invoices/${invoiceId}?notice=${encodeURIComponent(notice)}`);
}

async function requireAppInvoiceAccess(invoiceId: string) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect(`/admin/leads/login?returnTo=/app/invoices/${invoiceId}`);
  }

  const invoiceData = await getInvoiceById(invoiceId);

  if (!invoiceData) {
    redirect("/app/invoices");
  }

  if (permissions.hasTechnicianAccess) {
    const assignedTechnician = normalizeText(invoiceData.invoice.assigned_technician);

    if (assignedTechnician && assignedTechnician !== normalizeText(permissions.user.name)) {
      redirect("/app/invoices");
    }
  }

  return { permissions, invoiceData };
}

async function revalidateInvoice(invoiceId: string) {
  revalidatePath("/app");
  revalidatePath("/app/invoices");
  revalidatePath(`/app/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

function getActor(permissions: Awaited<ReturnType<typeof getCurrentAdminPermissions>>) {
  return permissions.user
    ? {
        id: permissions.user.id,
        name: permissions.user.name,
        role: permissions.user.role,
        source: "pwa-invoice",
      }
    : null;
}

export async function updateAppInvoiceItemsAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const { permissions, invoiceData } = await requireAppInvoiceAccess(invoiceId);

  if (!permissions.canManageInvoiceCharges || ["paid", "void"].includes(invoiceData.invoice.status)) {
    redirectBack(invoiceId, "permission_denied");
  }

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
    title: "PWA invoice charges updated",
    details: `${items.length} line item${items.length === 1 ? "" : "s"} saved.`,
    metadata: { actor: getActor(permissions) },
  });
  await revalidateInvoice(invoiceId);
  redirectBack(invoiceId, "charges_saved");
}

export async function addAppInvoiceItemAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const { permissions, invoiceData } = await requireAppInvoiceAccess(invoiceId);

  if (!permissions.canManageInvoiceCharges || ["paid", "void"].includes(invoiceData.invoice.status)) {
    redirectBack(invoiceId, "permission_denied");
  }

  await addInvoiceItem(invoiceId);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_item_added",
    title: "PWA invoice line added",
    details: "A blank invoice line was added from the PWA invoice page.",
    metadata: { actor: getActor(permissions) },
  });
  await revalidateInvoice(invoiceId);
  redirectBack(invoiceId, "line_added");
}

export async function sendAppInvoiceSmsAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const { permissions, invoiceData } = await requireAppInvoiceAccess(invoiceId);

  if (!permissions.canSendInvoices) {
    redirectBack(invoiceId, "permission_denied");
  }

  const result = await sendInvoiceSms(invoiceData);

  if (!result.ok) {
    redirectBack(invoiceId, `sms_${result.reason}`);
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
    title: "PWA invoice SMS sent",
    details: result.messageSid ? `Sent to ${result.to}. Twilio SID ${result.messageSid}.` : `Sent to ${result.to}.`,
    metadata: { actor: getActor(permissions) },
  });
  await revalidateInvoice(invoiceId);
  redirectBack(invoiceId, "sms_sent");
}

export async function addAppInvoicePaymentAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const { permissions } = await requireAppInvoiceAccess(invoiceId);
  const amount = String(formData.get("amount") || "");
  const method = String(formData.get("method") || "");
  const paymentDate = String(formData.get("paymentDate") || "");
  const paymentTime = String(formData.get("paymentTime") || "");
  const note = String(formData.get("note") || "");
  const { leadId } = await addInvoicePayment(invoiceId, {
    amount,
    method,
    paymentDate,
    paymentTime,
    note,
  });

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "invoice_payment_added",
    title: "PWA payment recorded",
    details: `${method || "Payment"} payment of $${Number(amount || 0).toFixed(2)} was added.`,
    metadata: { actor: getActor(permissions) },
  });
  await revalidateInvoice(invoiceId);
  redirectBack(invoiceId, "payment_added");
}

export async function markAppInvoiceDoneAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const { permissions } = await requireAppInvoiceAccess(invoiceId);
  const { leadId } = await updateInvoiceStatus(invoiceId, "paid");

  await updateInvoiceJobStatus(invoiceId, "done");
  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "job_completed",
    title: "PWA job closed",
    details: "Invoice marked paid and job marked done from the PWA invoice page.",
    metadata: { actor: getActor(permissions) },
  });
  await revalidateInvoice(invoiceId);
  redirectBack(invoiceId, "job_done");
}
