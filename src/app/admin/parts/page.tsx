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

export const dynamic = "force-dynamic";

const PART_STATUSES: { value: InvoicePartStatus; label: string }[] = [
  { value: "needed", label: "Needed" },
  { value: "ordered", label: "Ordered" },
  { value: "received", label: "Received" },
  { value: "installed", label: "Installed" },
  { value: "returned", label: "Returned" },
  { value: "canceled", label: "Canceled" },
];

const statusClasses: Record<InvoicePartStatus, string> = {
  needed: "border-amber-500/25 bg-amber-50 text-amber-800",
  ordered: "border-sky-500/25 bg-sky-50 text-sky-700",
  received: "border-indigo-500/25 bg-indigo-50 text-indigo-700",
  installed: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  returned: "border-slate-300 bg-slate-100 text-slate-600",
  canceled: "border-red-500/25 bg-red-50 text-red-700",
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

export default async function PartsInventoryPage() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  let partsData: Awaited<ReturnType<typeof listAllInvoiceParts>> = {
    parts: [],
    ready: true,
    error: "",
  };
  let invoices: InvoiceRecord[] = [];
  let error = "";

  try {
    [partsData, invoices] = await Promise.all([listAllInvoiceParts(500), listInvoices(1000)]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load parts inventory.";
  }

  const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const openParts = partsData.parts.filter(
    (part) => part.status === "needed" || part.status === "ordered" || part.status === "received",
  );
  const totalOpenCost = sumPartCost(openParts);

  return (
    <main className="min-h-screen bg-slate-50 text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-bold text-muted hover:text-primary">
              Back to admin
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Parts inventory
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Operational view of job parts: needed, ordered, received, installed, returned, and
              expensed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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

        {!partsData.ready ? (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <p className="font-black">Parts table is not ready.</p>
            <p className="mt-2">Run this SQL in Supabase once, then refresh this page.</p>
            <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-white p-4 text-xs leading-6 text-foreground">
              {invoicePartsTableSql}
            </pre>
          </div>
        ) : null}

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
