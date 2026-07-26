"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  getCurrentAdminPermissions,
  isAdminAuthenticated,
  setAdminSession,
  verifyAdminLogin,
} from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  createInvoiceFromLead,
  deleteInvoiceById,
  getInvoiceIdForLead,
} from "@/lib/supabase-invoices";
import {
  type LeadAdminStatus,
  deleteSupabaseLead,
  updateSupabaseLead,
  updateSupabaseLeadAfterInvoice,
  updateSupabaseLeadStatus,
} from "@/lib/supabase-leads";

const ALLOWED_STATUSES: LeadAdminStatus[] = [
  "new",
  "contacted",
  "confirmed",
  "invoiced",
  "completed",
  "cancelled",
];

const POST_INVOICE_STATUSES: Extract<
  LeadAdminStatus,
  "invoiced" | "completed" | "cancelled"
>[] = ["invoiced", "completed", "cancelled"];

function getLeadRedirectTarget(value: FormDataEntryValue | null, fallback = "/admin/leads") {
  const target = typeof value === "string" ? value : "";

  if (target.startsWith("/admin/leads")) {
    return target;
  }

  return fallback;
}

function getAdminRedirectTarget(value: FormDataEntryValue | string | null, fallback = "/admin") {
  const target = typeof value === "string" ? value.trim() : "";

  if (target.startsWith("/admin") && !target.startsWith("//")) {
    return target;
  }

  return fallback;
}

function withNotice(path: string, notice: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}notice=${encodeURIComponent(notice)}`;
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") || "");
  const returnTo = getAdminRedirectTarget(formData.get("returnTo"));
  const user = await verifyAdminLogin(password);

  if (!user) {
    const params = new URLSearchParams({ error: "1" });

    if (returnTo !== "/admin") {
      params.set("returnTo", returnTo);
    }

    redirect(`/admin/leads/login?${params.toString()}`);
  }

  await setAdminSession(user);
  redirect(returnTo);
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin/leads/login");
}

export async function updateLeadStatus(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as LeadAdminStatus;

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error("Invalid lead status.");
  }

  await updateSupabaseLeadStatus(id, status);
  await createLeadActivity({
    leadId: id,
    eventType: "lead_status_updated",
    title: "Lead status updated",
    details: `Status changed to ${status}.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
}

export async function updateLeadDetails(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as LeadAdminStatus;

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error("Invalid lead status.");
  }

  const existingInvoiceId = await getInvoiceIdForLead(id);

  if (existingInvoiceId) {
    if (!POST_INVOICE_STATUSES.includes(status as (typeof POST_INVOICE_STATUSES)[number])) {
      throw new Error("Lead with an invoice can only be invoiced, completed, or cancelled.");
    }

    await updateSupabaseLeadAfterInvoice(id, {
      status: status as (typeof POST_INVOICE_STATUSES)[number],
      adminNotes: String(formData.get("adminNotes") || ""),
    });
    await createLeadActivity({
      leadId: id,
      invoiceId: existingInvoiceId,
      eventType: "lead_updated",
      title: "Lead status / notes updated",
      details: `Status set to ${status}.`,
    });

    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${id}`);
    return;
  }

  await updateSupabaseLead(id, {
    status,
    adminNotes: String(formData.get("adminNotes") || ""),
    scheduledDate: String(formData.get("scheduledDate") || ""),
    estimatedPrice: String(formData.get("estimatedPrice") || ""),
    assignedTechnician: String(formData.get("assignedTechnician") || ""),
  });
  await createLeadActivity({
    leadId: id,
    eventType: "lead_updated",
    title: "Lead details updated",
    details: `Status set to ${status}.`,
  });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
}

export async function createInvoiceForLead(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const id = String(formData.get("id") || "");

  const status = String(formData.get("status") || "") as LeadAdminStatus;

  if (ALLOWED_STATUSES.includes(status)) {
    await updateSupabaseLead(id, {
      status,
      adminNotes: String(formData.get("adminNotes") || ""),
      scheduledDate: String(formData.get("scheduledDate") || ""),
      estimatedPrice: String(formData.get("estimatedPrice") || ""),
      assignedTechnician: String(formData.get("assignedTechnician") || ""),
    });
  }

  const existingInvoiceId = await getInvoiceIdForLead(id);
  const invoiceId = await createInvoiceFromLead(id);

  if (!existingInvoiceId) {
    await createLeadActivity({
      leadId: id,
      invoiceId,
      eventType: "invoice_created",
      title: "Invoice created",
      details: "Draft invoice created from this lead.",
    });
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  redirect(`/admin/invoices/${invoiceId}`);
}

export async function deleteLead(formData: FormData) {
  const permissions = await getCurrentAdminPermissions();
  const returnTo = getLeadRedirectTarget(formData.get("returnTo"));

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  if (!permissions.canDeleteLeads) {
    redirect(withNotice(returnTo, "delete_permission_denied"));
  }

  const id = String(formData.get("id") || "");
  const existingInvoiceId = await getInvoiceIdForLead(id);

  if (existingInvoiceId) {
    const confirmation = String(formData.get("deleteConfirmation") || "").trim();

    if (confirmation !== "DELETE INVOICE") {
      redirect(withNotice(returnTo, "delete_confirm_required"));
    }

    await deleteInvoiceById(existingInvoiceId);
  }

  await deleteSupabaseLead(id);

  revalidatePath("/admin/leads");
  redirect("/admin/leads?notice=lead_deleted");
}
