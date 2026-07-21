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

  if (!permissions.hasElevatedAccess) {
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

export async function addTelegramUserAction(formData: FormData) {
  await requireTelegramAccessAdmin();

  await addTelegramUser({
    telegramUserId: String(formData.get("telegramUserId") || ""),
    technicianName: String(formData.get("technicianName") || ""),
    role: getRole(formData.get("role")),
    isActive: true,
    note: String(formData.get("note") || ""),
  });

  revalidatePath("/admin/telegram");
  redirect("/admin/telegram?notice=added");
}

export async function updateTelegramUserAction(formData: FormData) {
  await requireTelegramAccessAdmin();

  const id = String(formData.get("id") || "");

  await updateTelegramUser(id, {
    telegramUserId: String(formData.get("telegramUserId") || ""),
    technicianName: String(formData.get("technicianName") || ""),
    role: getRole(formData.get("role")),
    isActive: getIsActive(formData.get("isActive")),
    note: String(formData.get("note") || ""),
  });

  revalidatePath("/admin/telegram");
  redirect("/admin/telegram?notice=updated");
}

export async function deleteTelegramUserAction(formData: FormData) {
  await requireTelegramAccessAdmin();

  await deleteTelegramUser(String(formData.get("id") || ""));

  revalidatePath("/admin/telegram");
  redirect("/admin/telegram?notice=deleted");
}
