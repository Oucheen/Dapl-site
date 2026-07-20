"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  type InvoiceJobStatus,
  updateInvoiceJobStatus,
  updateInvoiceSchedule,
} from "@/lib/supabase-invoices";

const ALLOWED_JOB_STATUSES: InvoiceJobStatus[] = [
  "scheduled",
  "on_the_way",
  "in_progress",
  "need_parts",
  "done",
  "reschedule",
  "canceled",
];

async function requireScheduleAdmin() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  return permissions;
}

function getScheduleRedirectDate(formData: FormData) {
  const selectedDate = String(formData.get("selectedDate") || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) ? selectedDate : "";
}

function getScheduleRedirectView(formData: FormData) {
  const selectedView = String(formData.get("selectedView") || "");
  return selectedView === "week" ? "week" : "day";
}

function getScheduleRedirect(selectedDate: string, technician = "", view = "day") {
  const params = getScheduleRedirectParams(selectedDate, technician, view);
  const query = params.toString();
  return query ? `/admin/schedule?${query}` : "/admin/schedule";
}

function getTechnicianRedirect(selectedDate: string, technician = "") {
  const params = new URLSearchParams();

  if (selectedDate) {
    params.set("date", selectedDate);
  }

  if (technician) {
    params.set("tech", technician);
  }

  const query = params.toString();
  return query ? `/admin/technician?${query}` : "/admin/technician";
}

function getScheduleRedirectParams(selectedDate: string, technician = "", view = "day") {
  const params = new URLSearchParams();

  if (selectedDate) {
    params.set("date", selectedDate);
  }

  if (technician) {
    params.set("tech", technician);
  }

  if (view === "week") {
    params.set("view", "week");
  }

  return params;
}

function getDispatchRedirect(formData: FormData, selectedDate: string, technician: string, view: string) {
  return String(formData.get("returnTo") || "") === "technician"
    ? getTechnicianRedirect(selectedDate, technician)
    : getScheduleRedirect(selectedDate, technician, view);
}

function getJobStatus(value: FormDataEntryValue | null) {
  const jobStatus = String(value || "");

  if (!jobStatus) {
    return null;
  }

  if (!ALLOWED_JOB_STATUSES.includes(jobStatus as InvoiceJobStatus)) {
    throw new Error("Invalid job status.");
  }

  return jobStatus as InvoiceJobStatus;
}

export async function updateDispatchScheduleAction(formData: FormData) {
  await requireScheduleAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const selectedDate = getScheduleRedirectDate(formData);
  const selectedView = getScheduleRedirectView(formData);
  const technicianFilter = String(formData.get("technicianFilter") || "");
  const serviceDate = String(formData.get("serviceDate") || selectedDate || "");
  const serviceTime = String(formData.get("serviceTime") || "");
  const serviceWindow = String(formData.get("serviceWindow") || "");
  const assignedTechnician = String(formData.get("assignedTechnician") || "");
  const jobStatus = getJobStatus(formData.get("jobStatus"));

  const { leadId } = await updateInvoiceSchedule(invoiceId, {
    serviceDate,
    serviceTime,
    serviceWindow,
    assignedTechnician,
    jobStatus,
  });
  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "dispatch_schedule_updated",
    title: "Dispatch schedule updated",
    details: "Visit date, time window, technician, or job status was updated from schedule.",
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(getDispatchRedirect(formData, selectedDate, technicianFilter, selectedView));
}

export async function updateDispatchJobStatusAction(formData: FormData) {
  await requireScheduleAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const selectedDate = getScheduleRedirectDate(formData);
  const selectedView = getScheduleRedirectView(formData);
  const technicianFilter = String(formData.get("technicianFilter") || "");
  const jobStatus = getJobStatus(formData.get("jobStatus"));

  if (!jobStatus) {
    throw new Error("Job status is required.");
  }

  const { leadId } = await updateInvoiceJobStatus(invoiceId, jobStatus);
  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "dispatch_job_status_updated",
    title: "Job status updated",
    details: `Job status changed to ${jobStatus.replaceAll("_", " ")}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(getDispatchRedirect(formData, selectedDate, technicianFilter, selectedView));
}
