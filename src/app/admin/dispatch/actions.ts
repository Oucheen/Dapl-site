"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import {
  createManualDispatchJob,
  deleteManualDispatchJob,
  updateManualDispatchJob,
} from "@/lib/supabase-dispatch-jobs";

function getDate(value: FormDataEntryValue | null) {
  const date = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Choose a valid service date.");
  }

  return date;
}

function getId(value: FormDataEntryValue | null) {
  const id = String(value || "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("Choose a valid manual dispatch appointment.");
  }

  return id;
}

function getRedirect(serviceDate: string, technician: string) {
  return `/admin/dispatch?date=${encodeURIComponent(serviceDate)}&tech=${encodeURIComponent(technician)}`;
}

export async function createManualDispatchJobAction(formData: FormData) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const serviceDate = getDate(formData.get("serviceDate"));
  const technician = String(formData.get("assignedTechnician") || "").trim();

  await createManualDispatchJob({
    name: "Bozman Fix",
    serviceAddress: String(formData.get("serviceAddress") || ""),
    serviceDate,
    scheduledStart: String(formData.get("scheduledStart") || ""),
    scheduledEnd: String(formData.get("scheduledEnd") || ""),
    assignedTechnician: technician,
  });

  revalidatePath("/admin/dispatch");
  redirect(getRedirect(serviceDate, technician));
}

export async function updateManualDispatchJobAction(formData: FormData) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const id = getId(formData.get("id"));
  const serviceDate = getDate(formData.get("serviceDate"));
  const technician = String(formData.get("assignedTechnician") || "").trim();

  await updateManualDispatchJob(id, {
    name: "Bozman Fix",
    serviceAddress: String(formData.get("serviceAddress") || ""),
    serviceDate,
    scheduledStart: String(formData.get("scheduledStart") || ""),
    scheduledEnd: String(formData.get("scheduledEnd") || ""),
    assignedTechnician: technician,
  });

  revalidatePath("/admin/dispatch");
  redirect(getRedirect(serviceDate, technician));
}

export async function deleteManualDispatchJobAction(formData: FormData) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const id = getId(formData.get("id"));
  const serviceDate = getDate(formData.get("serviceDate"));
  const technician = String(formData.get("assignedTechnician") || "").trim();

  await deleteManualDispatchJob(id);
  revalidatePath("/admin/dispatch");
  redirect(getRedirect(serviceDate, technician));
}
