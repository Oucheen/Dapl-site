"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { sendCustomerSms } from "@/lib/customer-sms";
import { sendInvoiceSms } from "@/lib/invoice-sms";
import { getShortPublicInvoiceUrl } from "@/lib/invoice-public-link";
import { getSiteUrl, getStripe, toStripeCents } from "@/lib/stripe-payments";
import {
  createLeadActivity,
  deleteTechnicianReportPageActivities,
  listActivitiesForInvoice,
  type LeadActivityRecord,
} from "@/lib/supabase-activity";
import {
  addInvoiceDiscountAdjustment,
  addInvoiceItem,
  addInvoiceItemFromTemplate,
  addInvoicePayment,
  calculateInvoiceAmountDue,
  getInvoiceById,
  getInvoiceItemTemplate,
  getLeadIdForInvoice,
  INVOICE_DISCOUNT_ADJUSTMENTS,
  type InvoiceDiscountAdjustmentKey,
  type InvoiceJobStatus,
  type InvoiceItemInput,
  updateInvoiceItems,
  updateInvoiceJobStatus,
  updateInvoiceStatus,
} from "@/lib/supabase-invoices";
import { getReportPhotoFile, uploadTechnicianReportPhoto } from "@/lib/supabase-storage";

const REPORT_PHOTO_FIELDS = [
  { field: "unitPhoto", label: "Unit photo", title: "Unit photo added" },
  { field: "serialPhoto", label: "Model/serial photo", title: "Model/serial photo added" },
  { field: "partPhoto", label: "Part photo", title: "Part photo added" },
  { field: "receiptPhoto", label: "Receipt / part invoice file", title: "Receipt file added" },
];

const APP_REPORT_JOB_STATUSES = new Set<InvoiceJobStatus>([
  "in_progress",
  "need_parts",
  "done",
  "reschedule",
  "canceled",
]);

const APP_DISCOUNT_ADJUSTMENTS = new Set<InvoiceDiscountAdjustmentKey>([
  "service_call",
  "retirement",
  "military",
]);

type ReportPhotoWithFile = (typeof REPORT_PHOTO_FIELDS)[number] & { file: File };

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

function getOptionalText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeMoney(value: string) {
  const amount = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));

  return Number.isFinite(amount) ? amount : 0;
}

function hasPhotoFile(input: (typeof REPORT_PHOTO_FIELDS)[number] & { file: File | null }): input is ReportPhotoWithFile {
  return Boolean(input.file);
}

function getStoredPhotoField(activity: LeadActivityRecord) {
  if (
    activity.event_type !== "telegram_report_photo" ||
    activity.metadata?.source !== "technician_report_page"
  ) {
    return null;
  }

  const storagePhoto = activity.metadata.storagePhoto;

  if (!storagePhoto || typeof storagePhoto !== "object") {
    return null;
  }

  const field = (storagePhoto as { field?: unknown }).field;

  return typeof field === "string" && field.trim() ? field.trim() : null;
}

function getRetainedPhotoActivities(
  activities: LeadActivityRecord[],
  replacedPhotoFields: Set<string>,
) {
  const retainedByField = new Map<string, LeadActivityRecord>();

  for (const activity of activities) {
    const field = getStoredPhotoField(activity);

    if (!field || replacedPhotoFields.has(field) || retainedByField.has(field)) {
      continue;
    }

    retainedByField.set(field, activity);
  }

  return [...retainedByField.values()];
}

async function createStripeCheckoutSession(input: {
  cancelUrl: string;
  invoiceData: Awaited<ReturnType<typeof getInvoiceById>>;
  invoiceId: string;
  successUrl: string;
}) {
  if (!input.invoiceData) {
    throw new Error("Invoice data is required.");
  }

  const amountDue = calculateInvoiceAmountDue(input.invoiceData.invoice, input.invoiceData.payments);
  const amountCents = toStripeCents(amountDue);

  if (amountCents <= 0) {
    throw new Error("nothing_due");
  }

  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.invoiceData.invoice.customer_email || undefined,
    client_reference_id: input.invoiceId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      invoiceId: input.invoiceId,
      leadId: input.invoiceData.invoice.lead_id ?? "",
      source: "dapl_pwa_invoice",
    },
    payment_intent_data: {
      description: `DAPL invoice ${input.invoiceData.invoice.invoice_number}`,
      metadata: {
        invoiceId: input.invoiceId,
        leadId: input.invoiceData.invoice.lead_id ?? "",
        source: "dapl_pwa_invoice",
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `DAPL invoice ${input.invoiceData.invoice.invoice_number}`,
            description: input.invoiceData.invoice.appliance || "Appliance repair service",
            metadata: {
              invoiceId: input.invoiceId,
            },
          },
        },
      },
    ],
  });
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

export async function addAppInvoiceTemplateItemAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const templateKey = String(formData.get("templateKey") || "");
  const { permissions, invoiceData } = await requireAppInvoiceAccess(invoiceId);
  const template = getInvoiceItemTemplate(templateKey);

  if (!permissions.canManageInvoiceCharges || ["paid", "void"].includes(invoiceData.invoice.status)) {
    redirectBack(invoiceId, "permission_denied");
  }

  if (!template) {
    redirectBack(invoiceId, "invalid_template");
  }

  await addInvoiceItemFromTemplate(invoiceId, templateKey);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_item_added",
    title: "PWA invoice template added",
    details: `${template.label} was added to the invoice.`,
    metadata: { actor: getActor(permissions), templateKey },
  });
  await revalidateInvoice(invoiceId);
  redirectBack(invoiceId, "template_added");
}

export async function addAppInvoiceDiscountAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const adjustmentKey = String(formData.get("adjustmentKey") || "") as InvoiceDiscountAdjustmentKey;
  const { permissions, invoiceData } = await requireAppInvoiceAccess(invoiceId);
  const adjustment = INVOICE_DISCOUNT_ADJUSTMENTS[adjustmentKey];

  if (!permissions.canManageInvoiceCharges || ["paid", "void"].includes(invoiceData.invoice.status)) {
    redirectBack(invoiceId, "permission_denied");
  }

  if (!APP_DISCOUNT_ADJUSTMENTS.has(adjustmentKey) || !adjustment) {
    redirectBack(invoiceId, "invalid_discount");
  }

  await addInvoiceDiscountAdjustment(invoiceId, adjustmentKey);
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "invoice_discount_added",
    title: "PWA invoice discount added",
    details: `${adjustment.label} was added to the invoice.`,
    metadata: { actor: getActor(permissions), adjustmentKey },
  });
  await revalidateInvoice(invoiceId);
  redirectBack(invoiceId, "discount_added");
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

export async function createAppStripeCheckoutAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const { permissions, invoiceData } = await requireAppInvoiceAccess(invoiceId);
  const amountDue = calculateInvoiceAmountDue(invoiceData.invoice, invoiceData.payments);
  const amountCents = toStripeCents(amountDue);
  const siteUrl = getSiteUrl();

  if (amountCents <= 0) {
    redirectBack(invoiceId, "nothing_due");
  }

  if (!siteUrl) {
    redirectBack(invoiceId, "stripe_site_url_missing");
  }

  let session;

  try {
    session = await createStripeCheckoutSession({
      invoiceData,
      invoiceId,
      successUrl: `${siteUrl}/app/invoices/${invoiceId}?notice=stripe_checkout_returned`,
      cancelUrl: `${siteUrl}/app/invoices/${invoiceId}?notice=stripe_checkout_canceled`,
    });
  } catch (error) {
    console.error("Stripe checkout creation failed", { invoiceId, error });
    redirectBack(invoiceId, "stripe_checkout_failed");
  }

  await createLeadActivity({
    leadId: invoiceData.invoice.lead_id,
    invoiceId,
    eventType: "stripe_checkout_created",
    title: "Stripe checkout opened",
    details: `Checkout created for $${amountDue.toFixed(2)}.`,
    metadata: {
      actor: getActor(permissions),
      source: "stripe_checkout",
      stripeCheckoutSessionId: session.id,
    },
  });

  if (!session.url) {
    redirectBack(invoiceId, "stripe_checkout_failed");
  }

  redirect(session.url);
}

export async function sendAppStripePaymentLinkAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const { permissions, invoiceData } = await requireAppInvoiceAccess(invoiceId);
  const amountDue = calculateInvoiceAmountDue(invoiceData.invoice, invoiceData.payments);
  const amountCents = toStripeCents(amountDue);
  const publicInvoiceUrl = getShortPublicInvoiceUrl(invoiceData.invoice.invoice_number);

  if (amountCents <= 0) {
    redirectBack(invoiceId, "nothing_due");
  }

  let session;

  try {
    session = await createStripeCheckoutSession({
      invoiceData,
      invoiceId,
      successUrl: `${publicInvoiceUrl}?paid=1`,
      cancelUrl: publicInvoiceUrl,
    });
  } catch (error) {
    console.error("Stripe payment link creation failed", { invoiceId, error });
    redirectBack(invoiceId, "stripe_checkout_failed");
  }

  if (!session.url) {
    redirectBack(invoiceId, "stripe_checkout_failed");
  }

  const result = await sendCustomerSms(
    invoiceData.invoice.customer_phone,
    `DAPL Appliance Repair payment link for invoice ${invoiceData.invoice.invoice_number}: ${session.url} Reply STOP to opt out.`,
  );

  if (!result.ok) {
    redirectBack(invoiceId, `pay_link_${result.reason}`);
  }

  await createLeadActivity({
    leadId: invoiceData.invoice.lead_id,
    invoiceId,
    eventType: "stripe_payment_link_sent",
    title: "Stripe payment link sent",
    details: `Payment link for $${amountDue.toFixed(2)} sent to ${result.to}.`,
    metadata: {
      actor: getActor(permissions),
      source: "stripe_checkout_sms",
      stripeCheckoutSessionId: session.id,
      messageSid: result.messageSid,
    },
  });

  await revalidateInvoice(invoiceId);
  redirectBack(invoiceId, "pay_link_sent");
}

export async function startAppInvoiceJobAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const { permissions, invoiceData } = await requireAppInvoiceAccess(invoiceId);

  await updateInvoiceJobStatus(invoiceId, "in_progress");
  await createLeadActivity({
    leadId: invoiceData.invoice.lead_id,
    invoiceId,
    eventType: "job_started",
    title: "PWA job started",
    details: "Technician marked the job in progress from the PWA invoice page.",
    metadata: { actor: getActor(permissions), source: "pwa-invoice" },
  });
  await revalidateInvoice(invoiceId);
  redirectBack(invoiceId, "job_started");
}

export async function submitAppTechnicianReportAction(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") || "");
  const { permissions, invoiceData } = await requireAppInvoiceAccess(invoiceId);
  const user = permissions.user;
  const leadId = invoiceData.invoice.lead_id;

  if (!user) {
    redirect(`/admin/leads/login?returnTo=/app/invoices/${invoiceId}`);
  }

  if (!leadId) {
    redirectBack(invoiceId, "report_needs_lead");
  }

  const jobStatus = getOptionalText(formData, "jobStatus") as InvoiceJobStatus;
  const workNote = getOptionalText(formData, "workNote");
  const unitModelSerial = getOptionalText(formData, "unitModelSerial");
  const partUsed = formData.get("partUsed") === "yes";
  const partName = getOptionalText(formData, "partName");
  const partCost = normalizeMoney(getOptionalText(formData, "partCost"));
  const customerCharge = normalizeMoney(getOptionalText(formData, "customerCharge"));
  const partNote = getOptionalText(formData, "partNote");

  if (!APP_REPORT_JOB_STATUSES.has(jobStatus)) {
    redirectBack(invoiceId, "invalid_report_status");
  }

  if (!workNote) {
    redirectBack(invoiceId, "work_note_required");
  }

  if (partUsed && !partName) {
    redirectBack(invoiceId, "part_name_required");
  }

  const photoFiles = REPORT_PHOTO_FIELDS.map((photoField) => ({
    ...photoField,
    file: getReportPhotoFile(formData, photoField.field),
  })).filter(hasPhotoFile);
  const previousReportActivities = await listActivitiesForInvoice(invoiceId, 120);
  const uploadedPhotos = [];
  const failedPhotoLabels: string[] = [];
  const failedPhotoReasons: string[] = [];

  for (const photoFile of photoFiles) {
    try {
      uploadedPhotos.push(
        await uploadTechnicianReportPhoto({
          leadId,
          invoiceId,
          telegramUserId: user.id,
          field: photoFile.field,
          label: photoFile.label,
          file: photoFile.file,
        }),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      failedPhotoLabels.push(photoFile.label);
      failedPhotoReasons.push(`${photoFile.label}: ${reason}`);
      console.error("PWA technician report photo upload failed", {
        invoiceId,
        leadId,
        field: photoFile.field,
        error,
      });
    }
  }

  await updateInvoiceJobStatus(invoiceId, jobStatus);
  const replacedPhotoFields = new Set(uploadedPhotos.map((photo) => photo.field));
  const retainedPhotoActivities = getRetainedPhotoActivities(
    previousReportActivities,
    replacedPhotoFields,
  );
  const replacementStartedAt = new Date().toISOString();
  const actor = getActor(permissions);

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "telegram_visit_report_completed",
    title: "Technician PWA report submitted",
    details: [
      `Status: ${jobStatus.replaceAll("_", " ")}`,
      `Technician: ${user.name}`,
      `Work note: ${workNote}`,
      unitModelSerial ? `Model/serial: ${unitModelSerial}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    metadata: {
      actor,
      source: "technician_report_page",
      jobStatus,
      technician: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      workNote,
      unitModelSerial: unitModelSerial || null,
      photoCount: uploadedPhotos.length + retainedPhotoActivities.length,
      failedPhotoLabels,
      failedPhotoReasons,
    },
  });

  if (failedPhotoReasons.length) {
    await createLeadActivity({
      leadId,
      invoiceId,
      eventType: "telegram_report_photo_upload_failed",
      title: "Technician report photo upload failed",
      details: failedPhotoReasons.join("\n"),
      metadata: {
        actor,
        source: "technician_report_page",
        technician: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        failedPhotoLabels,
        failedPhotoReasons,
      },
    });
  }

  for (const photo of uploadedPhotos) {
    await createLeadActivity({
      leadId,
      invoiceId,
      eventType: "telegram_report_photo",
      title: photo.label,
      details: `${photo.label} uploaded from the PWA report page.`,
      metadata: {
        actor,
        source: "technician_report_page",
        technician: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        storagePhoto: {
          path: photo.path,
          label: photo.label,
          field: photo.field,
          originalName: photo.originalName,
          contentType: photo.contentType,
          size: photo.size,
        },
      },
    });
  }

  for (const activity of retainedPhotoActivities) {
    await createLeadActivity({
      leadId,
      invoiceId,
      eventType: activity.event_type,
      title: activity.title,
      details: activity.details ?? undefined,
      metadata: activity.metadata,
    });
  }

  if (partUsed) {
    await createLeadActivity({
      leadId,
      invoiceId,
      eventType: "telegram_report_own_part",
      title: "Technician-owned part used",
      details: [
        `Part: ${partName}`,
        partCost ? `Technician cost: $${partCost.toFixed(2)}` : null,
        customerCharge ? `Suggested customer charge: $${customerCharge.toFixed(2)}` : null,
        partNote ? `Note: ${partNote}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      metadata: {
        actor,
        source: "technician_report_page",
        technician: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        partName,
        partCost,
        suggestedCustomerCharge: customerCharge,
        partNote: partNote || null,
      },
    });
  }

  await deleteTechnicianReportPageActivities({
    leadId,
    invoiceId,
    createdBefore: replacementStartedAt,
  });

  await revalidateInvoice(invoiceId);
  revalidatePath(`/admin/leads/${leadId}`);
  redirectBack(invoiceId, failedPhotoLabels.length ? "report_saved_photo_warning" : "report_saved");
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
