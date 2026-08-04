import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAdmin } from "@/app/admin/leads/actions";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import {
  listInvoices,
  type InvoiceJobStatus,
  type InvoiceRecord,
  type InvoiceStatus,
} from "@/lib/supabase-invoices";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoices | DAPL Field App",
  description: "Technician invoice workspace for DAPL Appliance Repair.",
  manifest: "/dapl-field.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
};

const navItems = [
  { href: "/app", label: "Today", mark: "T" },
  { href: "/admin/search", label: "Search", mark: "S" },
  { href: "/admin/parts", label: "Parts", mark: "P" },
  { href: "/app/invoices", label: "Invoices", mark: "I" },
  { href: "/admin", label: "Admin", mark: "A" },
];

const statusClasses: Record<InvoiceStatus, string> = {
  draft: "border-primary/20 bg-primary/5 text-primary",
  sent: "border-amber-500/25 bg-amber-50 text-amber-700",
  paid: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  void: "border-slate-300 bg-slate-100 text-slate-500",
};

const jobStatusClasses: Record<InvoiceJobStatus, string> = {
  scheduled: "border-primary/20 bg-primary/5 text-primary",
  on_the_way: "border-sky-500/25 bg-sky-50 text-sky-700",
  in_progress: "border-indigo-500/25 bg-indigo-50 text-indigo-700",
  need_parts: "border-amber-500/25 bg-amber-50 text-amber-800",
  done: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  reschedule: "border-orange-500/25 bg-orange-50 text-orange-700",
  canceled: "border-slate-300 bg-slate-100 text-slate-500",
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(getDateForCharlotteDisplay(value));
}

function formatServiceTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const [hourValue, minuteValue] = value.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return value;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function getJobStatus(invoice: InvoiceRecord): InvoiceJobStatus {
  return invoice.job_status ?? (invoice.service_date ? "scheduled" : "reschedule");
}

function getVisibleInvoices(invoices: InvoiceRecord[], userName: string, technicianOnly: boolean) {
  if (!technicianOnly) {
    return invoices;
  }

  const normalizedUserName = normalizeText(userName);

  return invoices.filter((invoice) => {
    const assignedTechnician = normalizeText(invoice.assigned_technician);
    return !assignedTechnician || assignedTechnician === normalizedUserName;
  });
}

function getInvoiceSortKey(invoice: InvoiceRecord) {
  return `${invoice.service_date ?? "9999-99-99"} ${invoice.service_time ?? "99:99"} ${invoice.customer_name}`;
}

function getWorkflowState(invoice: InvoiceRecord) {
  if (invoice.status === "paid") {
    return "Paid";
  }

  if (invoice.status === "draft") {
    return "Review";
  }

  if (Number(invoice.total ?? 0) > 0) {
    return "Collect";
  }

  return "Close";
}

export default async function AppInvoicesPage() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login?returnTo=/app/invoices");
  }

  let invoices: InvoiceRecord[] = [];
  let dataError = "";

  try {
    invoices = await listInvoices(500);
  } catch (caught) {
    dataError = caught instanceof Error ? caught.message : "Could not load invoices.";
  }

  const visibleInvoices = getVisibleInvoices(
    invoices.filter((invoice) => invoice.status !== "void"),
    permissions.user.name,
    permissions.hasTechnicianAccess,
  );
  const openInvoices = visibleInvoices
    .filter((invoice) => invoice.status !== "paid" || getJobStatus(invoice) !== "done")
    .sort((left, right) => getInvoiceSortKey(left).localeCompare(getInvoiceSortKey(right)))
    .slice(0, 12);
  const draftCount = visibleInvoices.filter((invoice) => invoice.status === "draft").length;
  const sentCount = visibleInvoices.filter((invoice) => invoice.status === "sent").length;
  const paidCount = visibleInvoices.filter((invoice) => invoice.status === "paid").length;
  const needPartsCount = visibleInvoices.filter((invoice) => getJobStatus(invoice) === "need_parts").length;
  const states = [
    { label: "Draft", value: String(draftCount) },
    { label: "Sent", value: String(sentCount) },
    { label: "Paid", value: String(paidCount) },
    { label: "Parts", value: String(needPartsCount) },
  ];

  return (
    <main className="min-h-screen bg-slate-100 pb-24 text-foreground">
      <section className="bg-primary text-white">
        <div className="container-shell py-5 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/app" className="text-sm font-black tracking-[0.16em] text-white">
                DAPL
              </Link>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                {permissions.user.name}
              </p>
            </div>
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-primary transition hover:bg-white/90"
              >
                Sign out
              </button>
            </form>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
                Technician
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Invoices
              </h1>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {states.map((state) => (
                <div key={state.label} className="rounded-lg border border-white/12 bg-white/10 p-3">
                  <p className="text-2xl font-black text-white">{state.value}</p>
                  <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/55">
                    {state.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-4 py-4 sm:py-6">
        {dataError ? (
          <div className="rounded-xl border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-800">
            {dataError}
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Open
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">Invoice queue</h2>
            </div>
            <Link href="/admin/invoices/new" className="text-sm font-black text-primary">
              New
            </Link>
          </div>

          <div className="mt-4 grid gap-2">
            {openInvoices.length ? (
              openInvoices.map((invoice) => {
                const jobStatus = getJobStatus(invoice);

                return (
                  <Link
                    key={invoice.id}
                    href={`/admin/invoices/${invoice.id}`}
                    className="rounded-lg border border-border bg-slate-50 p-3 transition hover:border-primary/30 hover:bg-white sm:p-4"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-base font-black text-primary">
                          {invoice.customer_name}
                        </span>
                        <span className="mt-1 block truncate text-xs font-bold text-muted">
                          {formatDate(invoice.service_date)} {formatServiceTime(invoice.service_time)}
                        </span>
                      </span>
                      <span className="text-right text-sm font-black text-primary">
                        {formatMoney(invoice.total)}
                      </span>
                    </span>
                    <span className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase ${statusClasses[invoice.status]}`}>
                        {invoice.status}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase ${jobStatusClasses[jobStatus]}`}>
                        {jobStatus.replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full border border-primary/15 bg-white px-2.5 py-1 text-[0.65rem] font-black uppercase text-primary">
                        {getWorkflowState(invoice)}
                      </span>
                    </span>
                  </Link>
                );
              })
            ) : (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
                No open invoices.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
              Flow
            </p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {["Charges", "Report", "Sign", "Send", "Pay"].map((item) => (
                <div
                  key={item}
                  className="inline-flex min-h-14 items-center justify-center rounded-lg border border-primary/15 bg-white px-2 text-center text-xs font-black text-primary"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
              Tools
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                href="/admin/invoices"
                className="flex min-h-14 items-center justify-between rounded-lg border border-border bg-slate-50 px-4 text-sm font-black text-primary"
              >
                <span>All invoices</span>
                <span>Open</span>
              </Link>
              <Link
                href="/admin/technician"
                className="flex min-h-14 items-center justify-between rounded-lg border border-border bg-slate-50 px-4 text-sm font-black text-primary"
              >
                <span>Today route</span>
                <span>Open</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5 px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-black transition hover:bg-primary/5 hover:text-primary ${
                item.href === "/app/invoices" ? "bg-primary/5 text-primary" : "text-muted"
              }`}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[0.65rem] text-primary">
                {item.mark}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
