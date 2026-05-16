"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  isAdminAuthenticated,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { createInvoiceFromLead } from "@/lib/supabase-invoices";
import {
  type LeadAdminStatus,
  updateSupabaseLead,
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

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") || "");

  if (!verifyAdminPassword(password)) {
    redirect("/admin/leads/login?error=1");
  }

  await setAdminSession();
  redirect("/admin/leads");
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
  revalidatePath("/admin/leads");
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

  await updateSupabaseLead(id, {
    status,
    adminNotes: String(formData.get("adminNotes") || ""),
    scheduledDate: String(formData.get("scheduledDate") || ""),
    estimatedPrice: String(formData.get("estimatedPrice") || ""),
    assignedTechnician: String(formData.get("assignedTechnician") || ""),
  });

  revalidatePath("/admin/leads");
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

  const invoiceId = await createInvoiceFromLead(id);

  revalidatePath("/admin/leads");
  redirect(`/admin/invoices/${invoiceId}`);
}
