"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  createManualInvoice,
  getInvoiceById,
  INVOICE_DISCOUNT_ADJUSTMENTS,
  type InvoiceDiscountAdjustmentKey,
} from "@/lib/supabase-invoices";
import { notifyTechnicianJobAssigned } from "@/lib/telegram-job-notifications";

const ALLOWED_DISCOUNT_ADJUSTMENTS = new Set<InvoiceDiscountAdjustmentKey>([
  "service_call",
  "retirement",
  "military",
]);

export async function createManualInvoiceAction(formData: FormData) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  if (permissions.hasTechnicianAccess) {
    redirect("/admin?notice=permission_denied");
  }

  const canBackdateManualInvoices = permissions.canBackdateManualInvoices;
  const discountAdjustments = formData
    .getAll("discountAdjustment")
    .map(String)
    .filter((value): value is InvoiceDiscountAdjustmentKey =>
      ALLOWED_DISCOUNT_ADJUSTMENTS.has(value as InvoiceDiscountAdjustmentKey),
    );
  const { leadId, invoiceId } = await createManualInvoice({
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    address: String(formData.get("address") || ""),
    appliance: String(formData.get("appliance") || ""),
    promoCode: String(formData.get("promoCode") || ""),
    serviceDate: String(formData.get("serviceDate") || ""),
    serviceTime: String(formData.get("serviceTime") || ""),
    serviceWindow: String(formData.get("serviceWindow") || ""),
    estimatedPrice: String(formData.get("estimatedPrice") || ""),
    invoiceItemDescription: String(formData.get("invoiceItemDescription") || ""),
    invoiceItemQuantity: String(formData.get("invoiceItemQuantity") || ""),
    invoiceItemUnitPrice: String(formData.get("invoiceItemUnitPrice") || ""),
    discountAdjustments,
    assignedTechnician: String(formData.get("assignedTechnician") || ""),
    notes: String(formData.get("notes") || ""),
    leadCreatedAt: canBackdateManualInvoices
      ? String(formData.get("leadCreatedAt") || "")
      : "",
    leadCreatedTime: canBackdateManualInvoices
      ? String(formData.get("leadCreatedTime") || "")
      : "",
    invoiceCreatedAt: canBackdateManualInvoices
      ? String(formData.get("invoiceCreatedAt") || "")
      : "",
    invoiceCreatedTime: canBackdateManualInvoices
      ? String(formData.get("invoiceCreatedTime") || "")
      : "",
  });

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "manual_invoice_created",
    title: "Manual invoice created",
    details: [
      canBackdateManualInvoices
        ? `Created from the admin dashboard for a non-website lead by ${permissions.user.name}. Historical dates may have been applied.`
        : `Created from the admin dashboard for a non-website lead by ${permissions.user.name}.`,
      discountAdjustments.length
        ? `Starting discounts: ${discountAdjustments
            .map((key) => INVOICE_DISCOUNT_ADJUSTMENTS[key].label)
            .join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  });

  try {
    const invoiceData = await getInvoiceById(invoiceId);

    if (invoiceData?.invoice.assigned_technician) {
      await notifyTechnicianJobAssigned(invoiceData.invoice);
    }
  } catch {
    // Telegram notifications should not block manual invoice creation.
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  redirect(`/admin/invoices/${invoiceId}`);
}
