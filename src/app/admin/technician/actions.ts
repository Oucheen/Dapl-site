"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/supabase-activity";
import { addInvoicePart } from "@/lib/supabase-parts";
import { getLeadIdForInvoice, updateInvoiceNotes } from "@/lib/supabase-invoices";

async function requireTechnicianAdmin() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  return permissions;
}

function getTechnicianRedirect(formData: FormData) {
  const selectedDate = String(formData.get("selectedDate") || "");
  const technicianFilter = String(formData.get("technicianFilter") || "");
  const params = new URLSearchParams();

  if (/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
    params.set("date", selectedDate);
  }

  if (technicianFilter) {
    params.set("tech", technicianFilter);
  }

  const query = params.toString();
  return query ? `/admin/technician?${query}` : "/admin/technician";
}

function withNotice(target: string, notice: string) {
  return `${target}${target.includes("?") ? "&" : "?"}notice=${notice}`;
}

export async function updateTechnicianInvoiceNotesAction(formData: FormData) {
  await requireTechnicianAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const notes = String(formData.get("notes") || "");
  const { leadId } = await updateInvoiceNotes(invoiceId, notes);

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "technician_note_updated",
    title: "Technician note updated",
    details: "Invoice internal notes were updated from technician view.",
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(withNotice(getTechnicianRedirect(formData), "note_saved"));
}

export async function addTechnicianPartAction(formData: FormData) {
  await requireTechnicianAdmin();

  const invoiceId = String(formData.get("invoiceId") || "");
  const partName = String(formData.get("partName") || "");
  const note = String(formData.get("partNote") || "");

  await addInvoicePart(invoiceId, {
    partName,
    status: "needed",
    quantity: "1",
    cost: "0",
    note,
  });
  await createLeadActivity({
    leadId: await getLeadIdForInvoice(invoiceId),
    invoiceId,
    eventType: "technician_part_added",
    title: "Technician part added",
    details: `${partName || "Part"} was added from technician view.`,
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/parts");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(withNotice(getTechnicianRedirect(formData), "part_added"));
}
