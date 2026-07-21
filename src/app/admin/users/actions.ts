"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import {
  addCrmUser,
  deleteCrmUser,
  updateCrmUser,
  type CrmUserRole,
} from "@/lib/supabase-admin-users";

const ALLOWED_ROLES: CrmUserRole[] = ["staff", "manager", "admin", "boss", "owner"];

async function requireUsersAdmin() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  if (permissions.user.role !== "owner") {
    redirect("/admin?notice=users_permission_denied");
  }
}

function redirectWithError(error: string) {
  redirect(`/admin/users?error=${encodeURIComponent(error)}`);
}

function getRole(value: FormDataEntryValue | null) {
  const role = String(value || "");

  if (!ALLOWED_ROLES.includes(role as CrmUserRole)) {
    redirectWithError("role_invalid");
  }

  return role as CrmUserRole;
}

function getIsActive(value: FormDataEntryValue | null) {
  return String(value || "") === "on";
}

function getUserInput(formData: FormData, isActive: boolean, passwordRequired: boolean) {
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");

  if (!name) {
    redirectWithError("name_required");
  }

  if (passwordRequired && !password.trim()) {
    redirectWithError("password_required");
  }

  return {
    name,
    role: getRole(formData.get("role")),
    password,
    isActive,
    note: String(formData.get("note") || ""),
  };
}

export async function addCrmUserAction(formData: FormData) {
  await requireUsersAdmin();

  await addCrmUser(getUserInput(formData, true, true));

  revalidatePath("/admin/users");
  redirect("/admin/users?notice=added");
}

export async function updateCrmUserAction(formData: FormData) {
  await requireUsersAdmin();

  const id = String(formData.get("id") || "");

  await updateCrmUser(id, getUserInput(formData, getIsActive(formData.get("isActive")), false));

  revalidatePath("/admin/users");
  redirect("/admin/users?notice=updated");
}

export async function deleteCrmUserAction(formData: FormData) {
  await requireUsersAdmin();

  await deleteCrmUser(String(formData.get("id") || ""));

  revalidatePath("/admin/users");
  redirect("/admin/users?notice=deleted");
}
