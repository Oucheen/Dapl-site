import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import {
  invoiceChecksTableSql,
  listInvoiceChecksWithInvoices,
  type InvoiceCheckStatus,
} from "@/lib/supabase-checks";
import { updateCheckStatusFromList } from "./actions";

export const dynamic = "force-dynamic";

const CHECK_STATUSES: { value: InvoiceCheckStatus; label: string }[] = [
  { value: "received", label: "Received" },
  { value: "ready_to_submit", label: "Ready to submit" },
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "cleared", label: "Cleared" },
  { value: "rejected", label: "Rejected" },
  { value: "void", label: "Void" },
];

const OPEN_CHECK_STATUSES = new Set<InvoiceCheckStatus>([
  "received",
  "ready_to_submit",
  "submitted",
  "accepted",
]);

const statusClasses: Record<InvoiceCheckStatus, string> = {
  received: "border-amber-500/25 bg-amber-50 text-amber-800",
  ready_to_submit: "border-sky-500/25 bg-sky-50 text-sky-700",
  submitted: "border-indigo-500/25 bg-indigo-50 text-indigo-700",
  accepted: "border-primary/20 bg-primary/5 text-primary",
  cleared: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  rejected: "border-red-500/25 bg-red-50 text-red-700",
  void: "border-slate-300 bg-slate-100 text-slate-600",
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
  }).format(new Date(`${value.slice(0, 10)}T12:00:00-05:00`));
}

function getStatusLabel(status: InvoiceCheckStatus) {
  return CHECK_STATUSES.find((item) => item.value === status)?.label ?? status;
}

function getReturnTo(status: string) {
  return `/admin/checks?status=${encodeURIComponent(status)}`;
}

function getStatusFilter(value: string | string[] | undefined) {
  const status = (Array.isArray(value) ? value[0] : value) ?? "open";

  if (status === "all" || status === "open" || CHECK_STATUSES.some((item) => item.value === status)) {
    return status;
  }

  return "open";
}

export default async function ChecksPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const params = await searchParams;
  const selectedStatus = getStatusFilter(params?.status);
  let checksData: Awaited<ReturnType<typeof listInvoiceChecksWithInvoices>> = {
    checks: [],
    ready: true,
    error: "",
  };
  let error = "";

  try {
    checksData = await listInvoiceChecksWithInvoices(500);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load checks.";
  }

  const checks = checksData.checks;
  const visibleChecks = checks.filter((check) => {
    if (selectedStatus === "all") {
      return true;
    }

    if (selectedStatus === "open") {
      return OPEN_CHECK_STATUSES.has(check.status);
    }

    return check.status === selectedStatus;
  });
  const totalOpen = checks
    .filter((check) => OPEN_CHECK_STATUSES.has(check.status))
    .reduce((sum, check) => sum + Number(check.amount ?? 0), 0);
  const totalCleared = checks
    .filter((check) => check.status === "cleared")
    .reduce((sum, check) => sum + Number(check.amount ?? 0), 0);
  const filters = [
    { value: "open", label: "Open", count: checks.filter((check) => OPEN_CHECK_STATUSES.has(check.status)).length },
    { value: "all", label: "All", count: checks.length },
    ...CHECK_STATUSES.map((status) => ({
      value: status.value,
      label: status.label,
      count: checks.filter((check) => check.status === status.value).length,
    })),
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/admin" className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">
              Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Check deposits
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Increase-style check queue for received, submitted, accepted, cleared, and rejected checks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/invoices"
              className="inline-flex rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Invoices
            </Link>
            <Link
              href="/admin/accounting"
              className="inline-flex rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Accounting
            </Link>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-black">Could not load checks.</p>
            <p className="mt-2 break-words">{error}</p>
          </div>
        ) : null}

        {!checksData.ready ? (
          <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <p className="font-black">Checks table is not ready yet</p>
            <p className="mt-2">Run this SQL in Supabase SQL Editor to enable check tracking.</p>
            <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-white p-4 text-xs leading-6 text-foreground">
              {invoiceChecksTableSql}
            </pre>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Open checks", value: formatMoney(totalOpen), note: "Not cleared yet" },
            { label: "Cleared checks", value: formatMoney(totalCleared), note: "Already added to payments" },
            { label: "Records", value: String(checks.length), note: "Latest 500 checks" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{card.label}</p>
              <p className="mt-3 text-3xl font-black text-primary">{card.value}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{card.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Link
              key={filter.value}
              href={`/admin/checks?status=${encodeURIComponent(filter.value)}`}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                selectedStatus === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary/15 bg-white text-primary hover:bg-primary/5"
              }`}
            >
              {filter.label} ({filter.count})
            </Link>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-xl font-black text-primary">Checks queue</h2>
            <p className="mt-1 text-sm text-muted">
              {visibleChecks.length} check{visibleChecks.length === 1 ? "" : "s"} in this view.
            </p>
          </div>

          {visibleChecks.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm leading-6 text-muted">
              No checks found for this filter.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleChecks.map((check) => (
                <div
                  key={check.id}
                  className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_140px_170px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[check.status]}`}>
                        {getStatusLabel(check.status)}
                      </span>
                      {check.payment_id ? (
                        <span className="rounded-full border border-emerald-500/25 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          Payment linked
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 break-words text-lg font-black text-primary">
                      {check.invoice?.customer_name ?? check.payer_name ?? "Customer"}
                    </p>
                    <p className="mt-1 break-words text-sm text-muted">
                      {check.invoice?.invoice_number ?? "Invoice missing"} / {formatDate(check.received_at)}
                      {check.check_number ? ` / Check #${check.check_number}` : ""}
                    </p>
                    <p className="mt-1 break-words text-sm text-muted">
                      {[check.payer_name, check.payer_bank, check.increase_status].filter(Boolean).join(" / ") ||
                        "No payer details"}
                    </p>
                    {check.note ? (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                        {check.note}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/invoices/${check.invoice_id}#check-${check.id}`}
                        className="rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/5"
                      >
                        Open invoice
                      </Link>
                      {check.front_image_url ? (
                        <a
                          href={check.front_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/5"
                        >
                          Front image
                        </a>
                      ) : null}
                      {check.back_image_url ? (
                        <a
                          href={check.back_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/5"
                        >
                          Back image
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Amount</p>
                    <p className="mt-2 text-xl font-black text-primary">{formatMoney(check.amount)}</p>
                  </div>
                  <form action={updateCheckStatusFromList} className="grid h-fit gap-2">
                    <input type="hidden" name="checkId" value={check.id} />
                    <input type="hidden" name="invoiceId" value={check.invoice_id} />
                    <input type="hidden" name="returnTo" value={getReturnTo(selectedStatus)} />
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                      Status
                      <select
                        name="status"
                        defaultValue={check.status}
                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-primary outline-none ring-primary/30 focus:border-primary focus:ring-2"
                      >
                        {CHECK_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                    >
                      Save status
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
