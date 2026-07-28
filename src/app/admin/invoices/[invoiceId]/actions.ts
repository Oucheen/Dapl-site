"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { sendInvoiceEmail } from "@/lib/invoice-email";
import { sendInvoiceSms } from "@/lib/invoice-sms";
import { createLeadActivity } from "@/lib/supabase-activity";
import { createExpense } from "@/lib/supabase-accounting";
import { createInvoiceCheck, updateInvoiceCheckStatus } from "@/lib/supabase-checks";
import { getSupabaseLeadById } from "@/lib/supabase-leads";
import {
  addInvoiceItem,
  addInvoiceItemFromTemplate,
  addInvoicePayment,
  addInvoiceDiscountAdjustment,
  deleteInvoiceItem,
  deleteInvoicePayment,
  getInvoiceItemTemplate,
  getInvoiceById,
  getLeadIdForInvoice,
  INVOICE_DISCOUNT_ADJUSTMENTS,
  type InvoiceDiscountAdjustmentKey,
  type InvoiceItemInput,
  type InvoiceRecord,
  type InvoiceStatus,
  updateInvoiceItems,
  updateInvoiceSchedule,
  updateInvoiceStatus,
} from "@/lib/supabase-invoices";
import {
  addInvoicePart,
  deleteInvoicePart,
  getInvoicePartById,
  markInvoicePartExpensed,
  type InvoicePartStatus,
  updateInvoicePart,
} from "@/lib/supabase-parts";
import {
  notifyTechnicianJobAssigned,
  shouldNotifyTechnicianJobAssigned,
} from "@/lib/telegram-job-notifications";

const ALLOWED_INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "void"];
const CLOSED_INVOICE_STATUSES = new Set<InvoiceStatus>(["paid", "void"]);
const ALLOWED_DISCOUNT_ADJUSTMENTS = new Set<InvoiceDiscountAdjustmentKey>([
  "service_call",
  "retirement",
  "military",
]);
const ALLOWED_PART_STATUSES: InvoicePartStatus[] = [
  "needed",
  "ordered",
  "received",
  "installed",
  "returned",
  "canceled",
];

async function requireInvoiceAdmin() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  return permissions;
}

function redirectPermissionDenied(invoiceId: string) {
  redirect(`/admin/invoices/${invoiceId}?notice=permission_denied`);
}

function getPartStatus(value: FormDataEntryValue | null) {
  const status = String(value || "");

  if (!ALLOWED_PART_STATUSES.includes(status as InvoicePartStatus)) {
    throw new Error("Invalid part status.");
  }

  return status as InvoicePartStatus;
}

async function canEditInvoiceLineItems(
  invoiceId: string,
  permissions: Awaited<ReturnType<typeof getCurrentAdminPermissions>>,
) {
  if (permissions.canManageInvoiceCharges) {
    return true;
  }

  const invoiceData = await getInvoiceById(invoiceId);

  if (!invoiceData || CLOSED_INVOICE_STATUSES.has(invoiceData.invoice.status)) {
    return false;
  }

  if (!invoiceData.invoice.lead_id) {
    return false;
  }

  const lead = await getSupabaseLeadById(invoiceData.invoice.lead_id);
  return lead?.lead_source === "manual-admin";
}

async function notifyTechnicianScheduleChange(previousInvoice: InvoiceRecord | null, invoiceId: string) {
  try {
    const nextInvoiceData = await getInvoiceById(invoiceId);
    const nextInvoice = nextInvoiceData?.invoice;

    if (nextInvoice && shouldNotifyTechnicianJobAssigned(previousInvoice, nextInvoice)) {
      await notifyTechnicianJobAssigned(nextInvoice);
    }
  } catch {
    // Telegram notifications should not block invoice schedule updates.
  }
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const permissions = await requireInvoiceAdmin();

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as InvoiceStatus;

  if (!ALLOWED_INVOICE_STATUSES.includes(status)) {
    throw new Error("Invalid invoice status.");
  }

  if (status === "void" && !permissions.canVoidInvoices) {
    redirectPermissionDenied(id);
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
  await requireInvoiceAdmin();

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

export async function updateInvoiceScheduleAction(formData: FormData) {
  await requireInvoiceAdmin();

  const id = String(formData.get("id") || "");
  const serviceDate = String(formData.get("serviceDate") || "");
  const serviceTime = String(formData.get("serviceTime") || "");
  const serviceWindow = String(formData.get("serviceWindow") || "");
  const assignedTechnician = String(formData.get("assignedTechnician") || "");
  const previousInvoiceData = await getInvoiceById(id);

  const { leadId } = await updateInvoiceSchedule(id, {
    serviceDate,
    serviceTime,
    serviceWindow,
    assignedTechnician,
  });
  await notifyTechnicianScheduleChange(previousInvoiceData?.invoice ?? null, id);
  await createLeadActivity({
    leadId,
    invoiceId: id,
    eventType: "invoice_schedule_updated",
    title: "Visit schedule updated",
    details: "Service date, time window, and technician were updated.",
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${id}`);
  redirect(`/admin/invoices/${id}?notice=schedule_updated`);
}

export async function sendInvoiceEmailAction(formData: FormData) {
  const permissions = await requireInvoiceAdmin();

  const id = String(formData.get("id") || "");

  if (!permissions.canSendInvoices) {
    redirectPermissionDenied(id);
  }

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

export async function sendInvoiceSmsAction(formData: FormData) {
  const permissions = await requireInvoiceAdmin();

  const id = String(formData.get("id") || "");

  if (!permissions.canSendInvoices) {
    redirectPermissionDenied(id);
  }

  const invoiceData = await getInvoiceById(id);

  if (!invoiceData) {
    redirect("/admin/invoices?sms=missing");
  }

  const result = await sendInvoiceSms(invoiceData);

  if (!result.ok) {
    redirect(`/admin/invoices/${id}?sms=${result.reason}`);
  }

  let leadId = invoiceData.invoice.lead_id;

  if (invoiceData.invoice.status === "draft") {
    const updated = await updateInvoiceStatus(id, "sent");
    leadId = updated.leadId;
  }

  await createLeadActivity({
    leadId,
    invoiceId: id,
    eventType: "invoice_sms_sent",
    title: "Invoice SMS sent",
    details: result.messageSid ? `Sent to ${result.to}. Twilio SID ${result.messageSid}.` : `Sent to ${result.to}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  redirect(`/admin/invoices/${id}?sms=sent`);
}

export async function requestInvoiceSendAction(formData: FormData) {
  const permissions = await requireInvoiceAdmin();
  const id = String(formData.get("id") || "");
  const invoiceData = await getInvoiceById(id);

  if (!invoiceData) {
    redirect("/admin/invoices?notice=missing");
  }

  await createLeadActivity({
    leadId: invoiceData.invoice.lead_id,
    invoiceId: id,
    eventType: "invoice_send_requested",
    title: "Invoice ready to send",
    details: `${permissions.user?.name || "Staff"} marked this invoice ready for office review and customer send.`,
    metadata: {
      requestedBy: permissions.user
        ? {
            id: permissions.user.id,
            name: permissions.user.name,
            role: permissions.user.role,
          }
        : null,
    },
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  redirect(`/admin/invoices/${id}?notice=invoice_send_requested`);
}

export async function updateInvoiceItemsAction(formData: FormData) {
  const permissions = await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");

  if (!(await canEditInvoiceLineItems(invoiceId, permissions))) {
    redirectPermissionDenied(invoiceId);
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
    title: "Invoice line items updated",
    details: `${items.length} line item${items.length === 1 ? "" : "s"} saved.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=items_saved`);
}

export async function addInvoiceItemAction(formData: FormData) {
  const permissions = await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");

  if (!(await canEditInvoiceLineItems(invoiceId, permissions))) {
    redirectPermissionDenied(invoiceId);
  }

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
  const permissions = await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const templateKey = String(formData.get("templateKey") || "");
  const template = getInvoiceItemTemplate(templateKey);

  if (!(await canEditInvoiceLineItems(invoiceId, permissions))) {
    redirectPermissionDenied(invoiceId);
  }

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

export async function addInvoiceDiscountAdjustmentAction(formData: FormData) {
  const permissions = await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const adjustmentKey = String(formData.get("adjustmentKey") || "") as InvoiceDiscountAdjustmentKey;

  if (!(await canEditInvoiceLineItems(invoiceId, permissions))) {
    redirectPermissionDenied(invoiceId);
  }

  if (!ALLOWED_DISCOUNT_ADJUSTMENTS.has(adjustmentKey)) {
    throw new Error("Invalid discount adjustment.");
  }

  const adjustment = INVOICE_DISCOUNT_ADJUSTMENTS[adjustmentKey];

  await addInvoiceDiscountAdjustment(invoiceId, adjustmentKey);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_discount_added",
    title: `${adjustment.label} applied`,
    details: `${adjustment.label} was added as a customer-facing invoice line.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=discount_adjustment_added`);
}

export async function deleteInvoiceItemAction(formData: FormData) {
  const permissions = await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const itemId = String(formData.get("itemId") || formData.get("deleteItemId") || "");

  if (!(await canEditInvoiceLineItems(invoiceId, permissions))) {
    redirectPermissionDenied(invoiceId);
  }

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

export async function addInvoicePartAction(formData: FormData) {
  await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const partName = String(formData.get("partName") || "");
  const partNumber = String(formData.get("partNumber") || "");
  const supplier = String(formData.get("supplier") || "");
  const status = getPartStatus(formData.get("status"));
  const quantity = String(formData.get("quantity") || "1");
  const cost = String(formData.get("cost") || "0");
  const note = String(formData.get("note") || "");

  await addInvoicePart(invoiceId, {
    partName,
    partNumber,
    supplier,
    status,
    quantity,
    cost,
    note,
  });
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_part_added",
    title: "Part added",
    details: `${partName || "Part"} was added with status ${status}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=part_added`);
}

export async function updateInvoicePartAction(formData: FormData) {
  await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const partId = String(formData.get("partId") || "");
  const partName = String(formData.get("partName") || "");
  const partNumber = String(formData.get("partNumber") || "");
  const supplier = String(formData.get("supplier") || "");
  const status = getPartStatus(formData.get("status"));
  const quantity = String(formData.get("quantity") || "1");
  const cost = String(formData.get("cost") || "0");
  const note = String(formData.get("note") || "");

  await updateInvoicePart(partId, {
    partName,
    partNumber,
    supplier,
    status,
    quantity,
    cost,
    note,
  });
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_part_updated",
    title: "Part updated",
    details: `${partName || "Part"} was updated to ${status}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=part_saved`);
}

export async function deleteInvoicePartAction(formData: FormData) {
  await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const partId = String(formData.get("partId") || "");

  await deleteInvoicePart(partId);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_part_deleted",
    title: "Part removed",
    details: "A part record was removed.",
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=part_deleted`);
}

export async function addInvoicePartExpenseAction(formData: FormData) {
  const permissions = await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const partId = String(formData.get("partId") || "");
  const paymentMethod = String(formData.get("paymentMethod") || "Cash");

  if (!permissions.hasElevatedAccess) {
    redirectPermissionDenied(invoiceId);
  }

  const [invoiceData, part] = await Promise.all([getInvoiceById(invoiceId), getInvoicePartById(partId)]);

  if (!invoiceData || !part || part.invoice_id !== invoiceId) {
    throw new Error("Part not found for this invoice.");
  }

  if (part.expense_id) {
    redirect(`/admin/invoices/${invoiceId}?notice=part_already_expensed`);
  }

  const cost = Number(part.cost ?? 0);

  if (!Number.isFinite(cost) || cost <= 0) {
    throw new Error("Part cost must be greater than 0 before adding it to expenses.");
  }

  const expenseId = await createExpense({
    invoiceId,
    expenseDate: new Date().toISOString().slice(0, 10),
    category: "Parts",
    vendor: part.supplier ?? "",
    description: `${part.part_name} / invoice ${invoiceData.invoice.invoice_number}`,
    amount: cost,
    paymentMethod,
    note: [
      invoiceData.invoice.customer_name,
      part.part_number ? `Part #${part.part_number}` : "",
      part.note ?? "",
    ]
      .filter(Boolean)
      .join(" / "),
  });
  await markInvoicePartExpensed(part.id, expenseId);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_part_expensed",
    title: "Part added to expenses",
    details: `${part.part_name} was added to accounting expenses for $${cost.toFixed(2)}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/accounting");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=part_expensed`);
}

export async function addInvoicePaymentAction(formData: FormData) {
  await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
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
    title: "Payment recorded",
    details: `${method || "Payment"} payment of $${Number(amount || 0).toFixed(2)} was added.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=payment_added`);
}

export async function deleteInvoicePaymentAction(formData: FormData) {
  const permissions = await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const paymentId = String(formData.get("paymentId") || "");

  if (!permissions.canDeleteInvoicePayments) {
    redirectPermissionDenied(invoiceId);
  }

  const { leadId } = await deleteInvoicePayment(invoiceId, paymentId);

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "invoice_payment_deleted",
    title: "Payment removed",
    details: "An invoice payment was removed.",
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=payment_deleted`);
}

export async function addInvoiceCheckAction(formData: FormData) {
  await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const amount = String(formData.get("amount") || "");
  const checkNumber = String(formData.get("checkNumber") || "");
  const payerName = String(formData.get("payerName") || "");
  const payerBank = String(formData.get("payerBank") || "");
  const receivedAt = String(formData.get("receivedAt") || "");
  const frontImageUrl = String(formData.get("frontImageUrl") || "");
  const backImageUrl = String(formData.get("backImageUrl") || "");
  const note = String(formData.get("note") || "");

  const checkId = await createInvoiceCheck(invoiceId, {
    amount,
    checkNumber,
    payerName,
    payerBank,
    receivedAt,
    frontImageUrl,
    backImageUrl,
    note,
  });

  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_check_received",
    title: "Check received",
    details: `${payerName || "Customer"} check ${checkNumber ? `#${checkNumber} ` : ""}was recorded for $${Number(
      String(amount || 0).replace(",", "."),
    ).toFixed(2)}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/checks");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?notice=check_added#check-${checkId}`);
}

export async function updateInvoiceCheckStatusAction(formData: FormData) {
  await requireInvoiceAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const checkId = String(formData.get("checkId") || "");
  const status = String(formData.get("status") || "");
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
  redirect(`/admin/invoices/${invoiceId}?notice=${result.paymentCreated ? "check_cleared" : "check_status_updated"}#check-${checkId}`);
}
