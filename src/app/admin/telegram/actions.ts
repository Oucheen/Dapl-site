"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import {
  addTelegramUser,
  deleteTelegramUser,
  updateTelegramUser,
  type TelegramUserRole,
} from "@/lib/supabase-telegram-users";

const ALLOWED_ROLES: TelegramUserRole[] = ["technician", "dispatcher", "owner"];

async function requireTelegramAccessAdmin() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  if (permissions.user.role !== "owner") {
    redirect("/admin?notice=telegram_permission_denied");
  }

  return permissions;
}

function getRole(value: FormDataEntryValue | null) {
  const role = String(value || "");

  if (!ALLOWED_ROLES.includes(role as TelegramUserRole)) {
    throw new Error("Invalid Telegram role.");
  }

  return role as TelegramUserRole;
}

function getIsActive(value: FormDataEntryValue | null) {
  return String(value || "") === "on";
}

function getTelegramRedirect(error: string) {
  return `/admin/telegram?error=${encodeURIComponent(error)}`;
}

function getTelegramUserInput(formData: FormData, isActive: boolean) {
  const role = getRole(formData.get("role"));
  const telegramUserId = String(formData.get("telegramUserId") || "").trim();
  const technicianName = String(formData.get("technicianName") || "").trim();

  if (!telegramUserId) {
    redirect(getTelegramRedirect("telegram_id_required"));
  }

  if (!/^\d{4,20}$/.test(telegramUserId)) {
    redirect(getTelegramRedirect("telegram_id_invalid"));
  }

  if (!technicianName) {
    redirect(getTelegramRedirect("technician_name_required"));
  }

  return {
    telegramUserId,
    technicianName,
    role,
    isActive,
    note: String(formData.get("note") || ""),
  };
}

export async function addTelegramUserAction(formData: FormData) {
  await requireTelegramAccessAdmin();

  await addTelegramUser(getTelegramUserInput(formData, true));

  revalidatePath("/admin/telegram");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/leads");
  redirect("/admin/telegram?notice=added");
}

export async function updateTelegramUserAction(formData: FormData) {
  await requireTelegramAccessAdmin();

  const id = String(formData.get("id") || "");

  await updateTelegramUser(id, getTelegramUserInput(formData, getIsActive(formData.get("isActive"))));

  revalidatePath("/admin/telegram");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/leads");
  redirect("/admin/telegram?notice=updated");
}

export async function deleteTelegramUserAction(formData: FormData) {
  await requireTelegramAccessAdmin();

  await deleteTelegramUser(String(formData.get("id") || ""));

  revalidatePath("/admin/telegram");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/leads");
  redirect("/admin/telegram?notice=deleted");
}
