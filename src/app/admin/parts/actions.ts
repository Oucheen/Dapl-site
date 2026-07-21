"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import {
  addWarehousePart,
  deleteWarehousePart,
  updateWarehousePart,
  type WarehousePartStatus,
} from "@/lib/supabase-warehouse-parts";

const WAREHOUSE_STATUSES: WarehousePartStatus[] = [
  "in_stock",
  "reserved",
  "used",
  "returned",
  "archived",
];

async function requirePartsAdmin() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  if (!permissions.hasElevatedAccess) {
    redirect("/admin/parts?notice=permission_denied");
  }
}

function getWarehouseStatus(value: FormDataEntryValue | null) {
  const status = String(value || "");

  if (!WAREHOUSE_STATUSES.includes(status as WarehousePartStatus)) {
    throw new Error("Invalid warehouse part status.");
  }

  return status as WarehousePartStatus;
}

export async function addWarehousePartAction(formData: FormData) {
  await requirePartsAdmin();

  await addWarehousePart({
    partName: String(formData.get("partName") || ""),
    partNumber: String(formData.get("partNumber") || ""),
    supplier: String(formData.get("supplier") || ""),
    status: getWarehouseStatus(formData.get("status")),
    quantityOnHand: String(formData.get("quantityOnHand") || "0"),
    unitCost: String(formData.get("unitCost") || "0"),
    location: String(formData.get("location") || ""),
    note: String(formData.get("note") || ""),
  });

  revalidatePath("/admin/parts");
  redirect("/admin/parts?notice=warehouse_added#warehouse-inventory");
}

export async function updateWarehousePartAction(formData: FormData) {
  await requirePartsAdmin();

  const partId = String(formData.get("partId") || "");

  await updateWarehousePart(partId, {
    partName: String(formData.get("partName") || ""),
    partNumber: String(formData.get("partNumber") || ""),
    supplier: String(formData.get("supplier") || ""),
    status: getWarehouseStatus(formData.get("status")),
    quantityOnHand: String(formData.get("quantityOnHand") || "0"),
    unitCost: String(formData.get("unitCost") || "0"),
    location: String(formData.get("location") || ""),
    note: String(formData.get("note") || ""),
  });

  revalidatePath("/admin/parts");
  redirect(`/admin/parts?notice=warehouse_saved#warehouse-${partId}`);
}

export async function deleteWarehousePartAction(formData: FormData) {
  await requirePartsAdmin();

  const partId = String(formData.get("partId") || "");

  await deleteWarehousePart(partId);

  revalidatePath("/admin/parts");
  redirect("/admin/parts?notice=warehouse_deleted#warehouse-inventory");
}
