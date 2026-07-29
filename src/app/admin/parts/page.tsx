import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { listInvoices, type InvoiceRecord } from "@/lib/supabase-invoices";
import {
  invoicePartsTableSql,
  listAllInvoiceParts,
  type InvoicePartRecord,
  type InvoicePartStatus,
} from "@/lib/supabase-parts";
import {
  listWarehouseParts,
  warehousePartsTableSql,
  type WarehousePartRecord,
  type WarehousePartStatus,
} from "@/lib/supabase-warehouse-parts";
import {
  addWarehousePartAction,
  deleteWarehousePartAction,
  updateWarehousePartAction,
} from "./actions";

export const dynamic = "force-dynamic";

const PART_STATUSES: { value: InvoicePartStatus; label: string }[] = [
  { value: "needed", label: "Needed" },
  { value: "ordered", label: "Ordered" },
  { value: "received", label: "Received" },
  { value: "installed", label: "Installed" },
  { value: "returned", label: "Returned" },
  { value: "canceled", label: "Canceled" },
];
const WAREHOUSE_STATUSES: { value: WarehousePartStatus; label: string }[] = [
  { value: "in_stock", label: "In stock" },
  { value: "reserved", label: "Reserved" },
  { value: "used", label: "Used" },
  { value: "returned", label: "Returned" },
  { value: "archived", label: "Archived" },
];

const statusClasses: Record<InvoicePartStatus, string> = {
  needed: "border-amber-500/25 bg-amber-50 text-amber-800",
  ordered: "border-sky-500/25 bg-sky-50 text-sky-700",
  received: "border-indigo-500/25 bg-indigo-50 text-indigo-700",
  installed: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  returned: "border-slate-300 bg-slate-100 text-slate-600",
  canceled: "border-red-500/25 bg-red-50 text-red-700",
};
const warehouseStatusClasses: Record<WarehousePartStatus, string> = {
  in_stock: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  reserved: "border-sky-500/25 bg-sky-50 text-sky-700",
  used: "border-primary/20 bg-primary/5 text-primary",
  returned: "border-slate-300 bg-slate-100 text-slate-600",
  archived: "border-red-500/25 bg-red-50 text-red-700",
};

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function getStatusCount(parts: InvoicePartRecord[], status: InvoicePartStatus) {
  return parts.filter((part) => part.status === status).length;
}

function sumPartCost(parts: InvoicePartRecord[]) {
  return Math.round(
    parts.reduce((sum, part) => {
      const amount = Number(part.cost ?? 0);
      const quantity = Number(part.quantity ?? 1);
      return sum + (Number.isFinite(amount) && Number.isFinite(quantity) ? amount * quantity : 0);
    }, 0) * 100,
  ) / 100;
}

function sumWarehouseValue(parts: WarehousePartRecord[]) {
  return Math.round(
    parts.reduce((sum, part) => {
      const amount = Number(part.unit_cost ?? 0);
      const quantity = Number(part.quantity_on_hand ?? 0);
      return sum + (Number.isFinite(amount) && Number.isFinite(quantity) ? amount * quantity : 0);
    }, 0) * 100,
  ) / 100;
}

function formatInputMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function formatQuantity(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return String(amount);
}

function getWarehouseStatusCount(parts: WarehousePartRecord[], status: WarehousePartStatus) {
  return parts.filter((part) => part.status === status).length;
}

function getInvoiceMeta(invoice: InvoiceRecord | undefined) {
  if (!invoice) {
    return {
      customer: "Invoice not found",
      appliance: "Appliance not set",
      invoiceNumber: "",
    };
  }

  return {
    customer: invoice.customer_name,
    appliance: invoice.appliance || "Appliance not set",
    invoiceNumber: invoice.invoice_number,
  };
}

function getNotice(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PartsInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  if (permissions.hasTechnicianAccess) {
    redirect("/admin?notice=permission_denied");
  }

  const params = await searchParams;
  const notice = getNotice(params?.notice);
  let partsData: Awaited<ReturnType<typeof listAllInvoiceParts>> = {
    parts: [],
    ready: true,
    error: "",
  };
  let warehouseData: Awaited<ReturnType<typeof listWarehouseParts>> = {
    parts: [],
    ready: true,
    error: "",
  };
  let invoices: InvoiceRecord[] = [];
  let error = "";

  try {
    [partsData, warehouseData, invoices] = await Promise.all([
      listAllInvoiceParts(500),
      listWarehouseParts(500),
      listInvoices(1000),
    ]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load parts inventory.";
  }

  const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const openParts = partsData.parts.filter(
    (part) => part.status === "needed" || part.status === "ordered" || part.status === "received",
  );
  const totalOpenCost = sumPartCost(openParts);
  const activeWarehouseParts = warehouseData.parts.filter((part) => part.status !== "archived");
  const warehouseValue = sumWarehouseValue(
    warehouseData.parts.filter((part) => part.status === "in_stock" || part.status === "reserved"),
  );
  const canManageWarehouse = permissions.hasElevatedAccess && warehouseData.ready && !error;

  return (
    <main className="min-h-screen bg-slate-50 text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-bold text-muted hover:text-primary">
              Back to admin
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Parts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Warehouse stock for parts you keep on hand, plus job parts tied to customer invoices.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="inline-flex w-fit items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/search"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Search
            </Link>
            <Link
              href="/admin/schedule"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Schedule
            </Link>
            <Link
              href="/admin/accounting"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Accounting
            </Link>
            <Link
              href="/admin/invoices"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Invoices
            </Link>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        {error ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-black">Could not load parts inventory.</p>
            <p className="mt-2 break-words">{error}</p>
          </div>
        ) : null}

        {notice === "warehouse_added" ? (
          <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
            Warehouse part added.
          </div>
        ) : null}

        {notice === "warehouse_saved" ? (
          <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
            Warehouse part saved.
          </div>
        ) : null}

        {notice === "warehouse_deleted" ? (
          <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
            Warehouse part deleted.
          </div>
        ) : null}

        {notice === "permission_denied" ? (
          <div className="mb-5 rounded-2xl border border-accent/25 bg-accent/5 p-5 text-sm font-bold text-accent">
            Only owner, boss, admin, or manager roles can manage warehouse inventory.
          </div>
        ) : null}

        {!warehouseData.ready ? (
          <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <p className="font-black">Warehouse parts table is not ready.</p>
            <p className="mt-2">Run this SQL in Supabase once, then refresh this page.</p>
            <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-white p-4 text-xs leading-6 text-foreground">
              {warehousePartsTableSql}
            </pre>
          </div>
        ) : null}

        {!partsData.ready ? (
          <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <p className="font-black">Job parts table is not ready.</p>
            <p className="mt-2">Run this SQL in Supabase once, then refresh this page.</p>
            <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-white p-4 text-xs leading-6 text-foreground">
              {invoicePartsTableSql}
            </pre>
          </div>
        ) : null}

        <section id="warehouse-inventory" className="scroll-mt-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Warehouse parts</p>
              <p className="mt-3 text-3xl font-black text-primary">{activeWarehouseParts.length}</p>
              <p className="mt-2 text-xs leading-5 text-muted">Active stock records.</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Stock value</p>
              <p className="mt-3 text-3xl font-black text-primary">{formatMoney(warehouseValue)}</p>
              <p className="mt-2 text-xs leading-5 text-muted">In stock and reserved only.</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">In stock</p>
              <p className="mt-3 text-3xl font-black text-primary">
                {getWarehouseStatusCount(warehouseData.parts, "in_stock")}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">Available to use on jobs.</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Reserved</p>
              <p className="mt-3 text-3xl font-black text-primary">
                {getWarehouseStatusCount(warehouseData.parts, "reserved")}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">Held for a future job.</p>
            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Warehouse inventory
                </p>
                <h2 className="mt-1 text-xl font-black text-primary">Parts bought for stock</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                  Use this for parts you already bought and keep on hand. Job-specific parts stay in the invoice below.
                </p>
              </div>
              <span className="rounded-full border border-primary/15 bg-slate-50 px-3 py-1 text-xs font-bold text-primary">
                {warehouseData.parts.length} records
              </span>
            </div>

            <details className="mt-5 rounded-xl border border-border bg-slate-50 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg bg-white px-3 py-3 text-sm font-black text-primary transition hover:bg-primary/5">
                <span>Add warehouse part</span>
                <span className="rounded-full border border-primary/15 px-3 py-1 text-xs">Open form</span>
              </summary>
              <form action={addWarehousePartAction} className="mt-4 grid gap-3">
                <div className="grid gap-3 lg:grid-cols-3">
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Part name
                    <input
                      type="text"
                      name="partName"
                      required
                      disabled={!canManageWarehouse}
                      placeholder="Compressor, igniter, control board..."
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Part number
                    <input
                      type="text"
                      name="partNumber"
                      disabled={!canManageWarehouse}
                      placeholder="Optional"
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Supplier
                    <input
                      type="text"
                      name="supplier"
                      disabled={!canManageWarehouse}
                      placeholder="Vendor or store"
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 disabled:bg-slate-100"
                    />
                  </label>
                </div>
                <div className="grid gap-3 lg:grid-cols-4">
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Status
                    <select
                      name="status"
                      defaultValue="in_stock"
                      disabled={!canManageWarehouse}
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100"
                    >
                      {WAREHOUSE_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Qty on hand
                    <input
                      type="number"
                      name="quantityOnHand"
                      min="0"
                      step="0.01"
                      defaultValue="1"
                      disabled={!canManageWarehouse}
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Unit cost
                    <input
                      type="number"
                      name="unitCost"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={!canManageWarehouse}
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Location
                    <input
                      type="text"
                      name="location"
                      disabled={!canManageWarehouse}
                      placeholder="Shelf, bin, van..."
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 disabled:bg-slate-100"
                    />
                  </label>
                </div>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Note
                  <input
                    type="text"
                    name="note"
                    disabled={!canManageWarehouse}
                    placeholder="Compatibility, purchase note, warranty..."
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 disabled:bg-slate-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!canManageWarehouse}
                  className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add to warehouse
                </button>
              </form>
            </details>

            {warehouseData.parts.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm leading-6 text-muted">
                No warehouse stock yet.
              </p>
            ) : (
              <div className="mt-5 grid gap-4">
                {warehouseData.parts.map((part) => (
                  <div
                    id={`warehouse-${part.id}`}
                    key={part.id}
                    className="scroll-mt-6 rounded-xl border border-border bg-slate-50 p-4"
                  >
                    <form action={updateWarehousePartAction} className="grid gap-3">
                      <input type="hidden" name="partId" value={part.id} />
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-lg font-black text-primary">{part.part_name}</p>
                          <p className="mt-1 break-words text-sm text-muted">
                            {part.part_number || "No part number"} / {part.supplier || "No supplier"}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${warehouseStatusClasses[part.status]}`}
                        >
                          {WAREHOUSE_STATUSES.find((status) => status.value === part.status)?.label ?? part.status}
                        </span>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-3">
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Part name
                          <input
                            type="text"
                            name="partName"
                            required
                            defaultValue={part.part_name}
                            disabled={!canManageWarehouse}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Part number
                          <input
                            type="text"
                            name="partNumber"
                            defaultValue={part.part_number ?? ""}
                            disabled={!canManageWarehouse}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Supplier
                          <input
                            type="text"
                            name="supplier"
                            defaultValue={part.supplier ?? ""}
                            disabled={!canManageWarehouse}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100"
                          />
                        </label>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-4">
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Status
                          <select
                            name="status"
                            defaultValue={part.status}
                            disabled={!canManageWarehouse}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100"
                          >
                            {WAREHOUSE_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Qty on hand
                          <input
                            type="number"
                            name="quantityOnHand"
                            min="0"
                            step="0.01"
                            defaultValue={formatQuantity(part.quantity_on_hand)}
                            disabled={!canManageWarehouse}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Unit cost
                          <input
                            type="number"
                            name="unitCost"
                            min="0"
                            step="0.01"
                            defaultValue={formatInputMoney(part.unit_cost)}
                            disabled={!canManageWarehouse}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Location
                          <input
                            type="text"
                            name="location"
                            defaultValue={part.location ?? ""}
                            disabled={!canManageWarehouse}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100"
                          />
                        </label>
                      </div>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        Note
                        <input
                          type="text"
                          name="note"
                          defaultValue={part.note ?? ""}
                          disabled={!canManageWarehouse}
                          className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={!canManageWarehouse}
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Save stock part
                        </button>
                        <button
                          type="submit"
                          form={`delete-warehouse-${part.id}`}
                          disabled={!canManageWarehouse}
                          className="rounded-lg border border-accent/25 bg-white px-4 py-2 text-xs font-bold text-accent transition hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </form>
                    <form id={`delete-warehouse-${part.id}`} action={deleteWarehousePartAction}>
                      <input type="hidden" name="partId" value={part.id} />
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <div className="mt-8 border-t border-border pt-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Job parts
            </p>
            <h2 className="mt-1 text-2xl font-black text-primary">Parts tied to invoices</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              These parts belong to customer jobs and can be expensed from the related invoice.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Open parts</p>
            <p className="mt-3 text-3xl font-black text-primary">{openParts.length}</p>
            <p className="mt-2 text-xs leading-5 text-muted">Needed, ordered, or received.</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Open cost</p>
            <p className="mt-3 text-3xl font-black text-primary">{formatMoney(totalOpenCost)}</p>
            <p className="mt-2 text-xs leading-5 text-muted">Quantity multiplied by part cost.</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Installed</p>
            <p className="mt-3 text-3xl font-black text-primary">
              {getStatusCount(partsData.parts, "installed")}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">Completed part records.</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Expensed</p>
            <p className="mt-3 text-3xl font-black text-primary">
              {partsData.parts.filter((part) => part.expense_id).length}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">Linked to accounting expenses.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {PART_STATUSES.map((status) => (
            <div key={status.value} className={`rounded-2xl border p-4 ${statusClasses[status.value]}`}>
              <p className="text-xs font-bold uppercase tracking-[0.14em]">{status.label}</p>
              <p className="mt-2 text-2xl font-black">{getStatusCount(partsData.parts, status.value)}</p>
            </div>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-xl font-black text-primary">All job parts</h2>
            <p className="mt-1 text-sm text-muted">
              Edit part status, cost, and expense linking from the related invoice.
            </p>
          </div>

          {partsData.parts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm leading-6 text-muted">
              No part records yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {partsData.parts.map((part) => {
                const invoice = invoicesById.get(part.invoice_id);
                const invoiceMeta = getInvoiceMeta(invoice);

                return (
                  <Link
                    key={part.id}
                    href={`/admin/invoices/${part.invoice_id}`}
                    className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_160px_130px_130px]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                        Part
                      </p>
                      <p className="mt-2 break-words font-black text-primary">{part.part_name}</p>
                      <p className="mt-1 break-words text-sm text-muted">
                        {part.part_number || "No part number"} / {part.supplier || "No supplier"}
                      </p>
                      <p className="mt-1 break-words text-sm text-muted">
                        {invoiceMeta.customer} / {invoiceMeta.appliance}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                        Status
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${statusClasses[part.status]}`}
                      >
                        {part.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                        Cost
                      </p>
                      <p className="mt-2 font-black text-foreground">{formatMoney(part.cost)}</p>
                      <p className="mt-1 text-xs text-muted">Qty {part.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                        Accounting
                      </p>
                      <p className="mt-2 font-black text-foreground">
                        {part.expense_id ? "Expensed" : "Not expensed"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {part.expensed_at ? formatDate(part.expensed_at) : invoiceMeta.invoiceNumber}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
