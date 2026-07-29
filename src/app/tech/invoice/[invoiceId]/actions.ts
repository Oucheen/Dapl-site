"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendInvoiceEmail } from "@/lib/invoice-email";
import { sendInvoiceSms } from "@/lib/invoice-sms";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  addInvoiceDiscountAdjustment,
  addInvoiceItem,
  addInvoiceItemFromTemplate,
  addInvoicePayment,
  deleteInvoiceItem,
  getInvoiceById,
  getInvoiceItemTemplate,
  getLeadIdForInvoice,
  INVOICE_DISCOUNT_ADJUSTMENTS,
  type InvoiceDiscountAdjustmentKey,
  type InvoiceItemInput,
  type InvoiceRecord,
  type InvoiceStatus,
  updateInvoiceItems,
  updateInvoiceStatus,
} from "@/lib/supabase-invoices";
import { getTelegramUserByTelegramId, type TelegramUserRecord } from "@/lib/supabase-telegram-users";
import { verifyTechnicianReportToken } from "@/lib/technician-report-links";

const ALLOWED_INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid"];
const ALLOWED_DISCOUNT_ADJUSTMENTS = new Set<InvoiceDiscountAdjustmentKey>([
  "service_call",
  "retirement",
  "military",
]);

function canTechnicianOpenInvoice(input: {
  assignedTechnician: string | null;
  technicianName: string;
  role: string;
}) {
  if (input.role === "owner" || input.role === "dispatcher") {
    return true;
  }

  const assignedTechnician = input.assignedTechnician?.trim().toLowerCase();

  if (!assignedTechnician) {
    return true;
  }

  return assignedTechnician === input.technicianName.trim().toLowerCase();
}

function redirectBack(invoiceId: string, token: string, notice: string, hash = ""): never {
  const params = new URLSearchParams({ t: token, notice });
  redirect(`/tech/invoice/${invoiceId}?${params.toString()}${hash}`);
}

function redirectDenied(invoiceId: string, token: string): never {
  redirectBack(invoiceId, token, "permission_denied");
}

async function requireTechnicianInvoiceAccess(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const token = String(formData.get("token") || "");
  const telegramUserId = verifyTechnicianReportToken(invoiceId, token);

  if (!telegramUserId) {
    redirectDenied(invoiceId, token);
  }

  const [invoiceData, telegramUser] = await Promise.all([
    getInvoiceById(invoiceId),
    getTelegramUserByTelegramId(telegramUserId),
  ]);

  if (!invoiceData || !telegramUser.user) {
    redirectDenied(invoiceId, token);
  }

  if (
    !canTechnicianOpenInvoice({
      assignedTechnician: invoiceData.invoice.assigned_technician,
      technicianName: telegramUser.user.technician_name,
      role: telegramUser.user.role,
    })
  ) {
    redirectDenied(invoiceId, token);
  }

  return {
    invoiceId,
    token,
    invoiceData,
    telegramUser: telegramUser.user,
  };
}

async function revalidateInvoiceViews(invoiceId: string) {
  const leadId = await getLeadIdForInvoice(invoiceId).catch(() => null);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath(`/tech/invoice/${invoiceId}`);

  if (leadId) {
    revalidatePath(`/admin/leads/${leadId}`);
  }
}

function getActor(telegramUser: TelegramUserRecord) {
  return {
    id: telegramUser.id,
    name: telegramUser.technician_name,
    role: telegramUser.role,
    source: "telegram-tech-invoice",
  };
}

export async function updateTechnicianInvoiceItemsAction(formData: FormData) {
  const { invoiceId, token, telegramUser } = await requireTechnicianInvoiceAccess(formData);
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
    title: "Technician updated invoice charges",
    details: `${items.length} line item${items.length === 1 ? "" : "s"} saved from the technician invoice page.`,
    metadata: { actor: getActor(telegramUser) },
  });
  await revalidateInvoiceViews(invoiceId);
  redirectBack(invoiceId, token, "items_saved", "#charges");
}

export async function addTechnicianInvoiceItemAction(formData: FormData) {
  const { invoiceId, token, telegramUser } = await requireTechnicianInvoiceAccess(formData);

  await addInvoiceItem(invoiceId);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_item_added",
    title: "Technician added invoice line",
    details: "A blank customer-facing invoice line was added from the technician invoice page.",
    metadata: { actor: getActor(telegramUser) },
  });
  await revalidateInvoiceViews(invoiceId);
  redirectBack(invoiceId, token, "item_added", "#charges");
}

export async function addTechnicianInvoiceTemplateItemAction(formData: FormData) {
  const { invoiceId, token, telegramUser } = await requireTechnicianInvoiceAccess(formData);
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
    title: "Technician added template charge",
    details: `${template.label} was added from the technician invoice page.`,
    metadata: { actor: getActor(telegramUser) },
  });
  await revalidateInvoiceViews(invoiceId);
  redirectBack(invoiceId, token, "template_added", "#charges");
}

export async function addTechnicianDiscountAdjustmentAction(formData: FormData) {
  const { invoiceId, token, telegramUser } = await requireTechnicianInvoiceAccess(formData);
  const adjustmentKey = String(formData.get("adjustmentKey") || "") as InvoiceDiscountAdjustmentKey;

  if (!ALLOWED_DISCOUNT_ADJUSTMENTS.has(adjustmentKey)) {
    throw new Error("Invalid discount adjustment.");
  }

  const adjustment = INVOICE_DISCOUNT_ADJUSTMENTS[adjustmentKey];
  await addInvoiceDiscountAdjustment(invoiceId, adjustmentKey);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_discount_added",
    title: `${adjustment.label} applied by technician`,
    details: `${adjustment.label} was added as a customer-facing invoice line.`,
    metadata: { actor: getActor(telegramUser) },
  });
  await revalidateInvoiceViews(invoiceId);
  redirectBack(invoiceId, token, "discount_adjustment_added", "#charges");
}

export async function deleteTechnicianInvoiceItemAction(formData: FormData) {
  const { invoiceId, token, telegramUser } = await requireTechnicianInvoiceAccess(formData);
  const itemId = String(formData.get("itemId") || "");

  await deleteInvoiceItem(invoiceId, itemId);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_item_deleted",
    title: "Technician removed invoice line",
    details: "A customer-facing invoice line was removed from the technician invoice page.",
    metadata: { actor: getActor(telegramUser) },
  });
  await revalidateInvoiceViews(invoiceId);
  redirectBack(invoiceId, token, "item_deleted", "#charges");
}

export async function sendTechnicianInvoiceEmailAction(formData: FormData) {
  const { invoiceId, token, invoiceData, telegramUser } = await requireTechnicianInvoiceAccess(formData);
  const result = await sendInvoiceEmail(invoiceData);

  if (!result.ok) {
    redirectBack(invoiceId, token, `email_${result.reason}`, "#send-invoice");
  }

  let leadId = invoiceData.invoice.lead_id;

  if (invoiceData.invoice.status === "draft") {
    const updated = await updateInvoiceStatus(invoiceId, "sent");
    leadId = updated.leadId;
  }

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "invoice_email_sent",
    title: "Technician sent invoice email",
    details: `Sent to ${result.to}.`,
    metadata: { actor: getActor(telegramUser) },
  });
  await revalidateInvoiceViews(invoiceId);
  redirectBack(invoiceId, token, "email_sent", "#send-invoice");
}

export async function sendTechnicianInvoiceSmsAction(formData: FormData) {
  const { invoiceId, token, invoiceData, telegramUser } = await requireTechnicianInvoiceAccess(formData);
  const result = await sendInvoiceSms(invoiceData);

  if (!result.ok) {
    redirectBack(invoiceId, token, `sms_${result.reason}`, "#send-invoice");
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
    title: "Technician sent invoice SMS",
    details: result.messageSid ? `Sent to ${result.to}. Twilio SID ${result.messageSid}.` : `Sent to ${result.to}.`,
    metadata: { actor: getActor(telegramUser) },
  });
  await revalidateInvoiceViews(invoiceId);
  redirectBack(invoiceId, token, "sms_sent", "#send-invoice");
}

export async function addTechnicianInvoicePaymentAction(formData: FormData) {
  const { invoiceId, token, telegramUser } = await requireTechnicianInvoiceAccess(formData);
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
    title: "Technician recorded payment",
    details: `${method || "Payment"} payment of $${Number(amount || 0).toFixed(2)} was added.`,
    metadata: { actor: getActor(telegramUser) },
  });
  await revalidateInvoiceViews(invoiceId);
  redirectBack(invoiceId, token, "payment_added", "#payment-close");
}

export async function updateTechnicianInvoiceStatusAction(formData: FormData) {
  const { invoiceId, token, telegramUser } = await requireTechnicianInvoiceAccess(formData);
  const status = String(formData.get("status") || "") as InvoiceStatus;

  if (!ALLOWED_INVOICE_STATUSES.includes(status)) {
    throw new Error("Invalid invoice status.");
  }

  const { leadId } = await updateInvoiceStatus(invoiceId, status);
  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "invoice_status_updated",
    title: "Technician updated invoice status",
    details: `Invoice marked ${status}.`,
    metadata: { actor: getActor(telegramUser) },
  });
  await revalidateInvoiceViews(invoiceId);
  redirectBack(invoiceId, token, "status_updated", "#payment-close");
}
