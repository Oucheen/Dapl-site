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

class ReportSubmitError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function buildReportRedirect(invoiceId: string, token: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams({
    t: token,
    ...params,
  });

  return `/tech/report/${invoiceId}?${searchParams.toString()}`;
}

function failReportSubmit(code: string): never {
  throw new ReportSubmitError(code);
}

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
  const invoiceId = getOptionalText(formData, "invoiceId");
  const token = getOptionalText(formData, "token");

  if (!invoiceId || !token) {
    throw new Error("Report form is missing required fields.");
  }

  let redirectTo = buildReportRedirect(invoiceId, token, {
    error: "save_failed",
  });

  try {
    const telegramUserId = verifyTechnicianReportToken(invoiceId, token);

    if (!telegramUserId) {
      failReportSubmit("invalid_link");
    }

    const telegramUser = await getTelegramUserByTelegramId(telegramUserId);

    if (!telegramUser.user) {
      failReportSubmit("access_denied");
    }

    const leadId = getRequiredText(formData, "leadId");
    const jobStatus = getRequiredText(formData, "jobStatus") as InvoiceJobStatus;
    const workNote = getOptionalText(formData, "workNote");
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
      failReportSubmit("invalid_status");
    }

    if (!workNote) {
      failReportSubmit("work_note_required");
    }

    if (partUsed && !partName) {
      failReportSubmit("part_name_required");
    }

    const uploadedPhotos = [];
    const failedPhotoLabels: string[] = [];

    for (const photoFile of photoFiles) {
      try {
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
      } catch (error) {
        failedPhotoLabels.push(photoFile.label);
        console.error("Technician report photo upload failed", {
          invoiceId,
          leadId,
          field: photoFile.field,
          error,
        });
      }
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
        failedPhotoLabels,
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
    redirectTo = buildReportRedirect(invoiceId, token, {
      saved: "1",
      ...(failedPhotoLabels.length ? { warning: "photo_upload_failed" } : {}),
    });
  } catch (error) {
    if (error instanceof ReportSubmitError) {
      redirectTo = buildReportRedirect(invoiceId, token, {
        error: error.code,
      });
    }

    console.error("Technician report submit failed", {
      invoiceId,
      error,
    });
  }

  redirect(redirectTo);
}
