"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { deleteCallById } from "@/lib/supabase-calls";

export async function deleteCall(formData: FormData) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login?returnTo=/admin/calls");
  }

  if (!permissions.canDeleteRecords) {
    redirect("/admin/calls?notice=delete_permission_denied");
  }

  const id = String(formData.get("id") || "");
  await deleteCallById(id);
  revalidatePath("/admin/calls");
  redirect("/admin/calls?notice=call_deleted");
}
