"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  updateInvoiceJobStatus,
  type InvoiceJobStatus,
} from "@/lib/supabase-invoices";
import { getTelegramUserByTelegramId } from "@/lib/supabase-telegram-users";
import { getReportPhotoFile, uploadTechnicianReportPhoto } from "@/lib/supabase-storage";
import { verifyTechnicianReportToken } from "@/lib/technician-report-links";

const ALLOWED_JOB_STATUSES = new Set<InvoiceJobStatus>([
  "in_progress",
  "need_parts",
  "done",
  "reschedule",
  "canceled",
]);
const PHOTO_FIELDS = [
  { field: "unitPhoto", label: "Unit photo", title: "Unit photo added" },
  { field: "serialPhoto", label: "Model/serial photo", title: "Model/serial photo added" },
  { field: "receiptPhoto", label: "Receipt / part invoice photo", title: "Receipt photo added" },
];

type PhotoFieldWithFile = (typeof PHOTO_FIELDS)[number] & { file: File };

function getRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function getOptionalText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeMoney(value: string) {
  const amount = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));

  return Number.isFinite(amount) ? amount : 0;
}

function hasPhotoFile(input: (typeof PHOTO_FIELDS)[number] & { file: File | null }): input is PhotoFieldWithFile {
  return Boolean(input.file);
}

export async function submitTechnicianReport(formData: FormData) {
  const invoiceId = getRequiredText(formData, "invoiceId");
  const token = getRequiredText(formData, "token");
  const telegramUserId = verifyTechnicianReportToken(invoiceId, token);

  if (!telegramUserId) {
    throw new Error("Report link is invalid.");
  }

  const telegramUser = await getTelegramUserByTelegramId(telegramUserId);

  if (!telegramUser.user) {
    throw new Error("Technician access is not active.");
  }

  const leadId = getRequiredText(formData, "leadId");
  const jobStatus = getRequiredText(formData, "jobStatus") as InvoiceJobStatus;
  const workNote = getRequiredText(formData, "workNote");
  const unitModelSerial = getOptionalText(formData, "unitModelSerial");
  const partUsed = formData.get("partUsed") === "yes";
  const partName = getOptionalText(formData, "partName");
  const partCost = normalizeMoney(getOptionalText(formData, "partCost"));
  const customerCharge = normalizeMoney(getOptionalText(formData, "customerCharge"));
  const partNote = getOptionalText(formData, "partNote");
  const photoFiles = PHOTO_FIELDS.map((photoField) => ({
    ...photoField,
    file: getReportPhotoFile(formData, photoField.field),
  })).filter(hasPhotoFile);

  if (!ALLOWED_JOB_STATUSES.has(jobStatus)) {
    throw new Error("Invalid job status.");
  }

  if (partUsed && !partName) {
    throw new Error("Part name is required when a technician-owned part was used.");
  }

  const uploadedPhotos = [];

  for (const photoFile of photoFiles) {
    uploadedPhotos.push(
      await uploadTechnicianReportPhoto({
        leadId,
        invoiceId,
        telegramUserId,
        field: photoFile.field,
        label: photoFile.label,
        file: photoFile.file,
      }),
    );
  }

  await updateInvoiceJobStatus(invoiceId, jobStatus);

  const reportDetails = [
    `Status: ${jobStatus.replaceAll("_", " ")}`,
    `Technician: ${telegramUser.user.technician_name}`,
    `Work note: ${workNote}`,
    unitModelSerial ? `Model/serial: ${unitModelSerial}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "telegram_visit_report_completed",
    title: "Technician web report submitted",
    details: reportDetails,
    metadata: {
      source: "technician_report_page",
      jobStatus,
      technician: {
        telegramUserId,
        name: telegramUser.user.technician_name,
        role: telegramUser.user.role,
      },
      unitModelSerial: unitModelSerial || null,
      photoCount: uploadedPhotos.length,
    },
  });

  for (const photo of uploadedPhotos) {
    await createLeadActivity({
      leadId,
      invoiceId,
      eventType: "telegram_report_photo",
      title: photo.label,
      details: `${photo.label} uploaded from the technician report page.`,
      metadata: {
        source: "technician_report_page",
        technician: {
          telegramUserId,
          name: telegramUser.user.technician_name,
          role: telegramUser.user.role,
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
        source: "technician_report_page",
        technician: {
          telegramUserId,
          name: telegramUser.user.technician_name,
          role: telegramUser.user.role,
        },
        partName,
        partCost,
        suggestedCustomerCharge: customerCharge,
        partNote: partNote || null,
      },
    });
  }

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/tech/report/${invoiceId}?t=${encodeURIComponent(token)}&saved=1`);
}
