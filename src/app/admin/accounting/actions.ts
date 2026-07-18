"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { createExpense, deleteExpenseById } from "@/lib/supabase-accounting";

function getAccountingRedirectTarget(value: FormDataEntryValue | null) {
  const target = String(value || "/admin/accounting");

  if (target.startsWith("/admin/accounting")) {
    return target;
  }

  return "/admin/accounting";
}

async function requireAccountingAdmin() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  if (!permissions.hasElevatedAccess) {
    redirect("/admin/accounting?notice=permission_denied");
  }
}

export async function addExpense(formData: FormData) {
  await requireAccountingAdmin();

  const returnTo = getAccountingRedirectTarget(formData.get("returnTo"));

  await createExpense({
    expenseDate: String(formData.get("expenseDate") || ""),
    category: String(formData.get("category") || ""),
    vendor: String(formData.get("vendor") || ""),
    description: String(formData.get("description") || ""),
    amount: String(formData.get("amount") || ""),
    paymentMethod: String(formData.get("paymentMethod") || ""),
    note: String(formData.get("note") || ""),
  });

  revalidatePath("/admin/accounting");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}notice=expense_added`);
}

export async function deleteExpense(formData: FormData) {
  await requireAccountingAdmin();

  const returnTo = getAccountingRedirectTarget(formData.get("returnTo"));
  const expenseId = String(formData.get("expenseId") || "");

  await deleteExpenseById(expenseId);

  revalidatePath("/admin/accounting");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}notice=expense_deleted`);
}
