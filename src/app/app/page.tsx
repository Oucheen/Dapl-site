import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAdmin } from "@/app/admin/leads/actions";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { CHARLOTTE_TIME_ZONE } from "@/lib/date-format";
import {
  listInvoices,
  type InvoiceJobStatus,
  type InvoiceRecord,
} from "@/lib/supabase-invoices";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DAPL Field App",
  description: "Field service workspace for technicians and dispatch.",
  manifest: "/dapl-field.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
};

const technicianActions = [
  { href: "/app", label: "Start", title: "Route" },
  { href: "/app/search", label: "Find", title: "Search" },
  { href: "/app/invoices", label: "Pay", title: "Invoices" },
];

const dispatchActions = [
  { href: "/app", label: "Board", title: "Schedule" },
  { href: "/app/search", label: "Queue", title: "Leads" },
  { href: "/app/more", label: "HQ", title: "More" },
];

const navItems = [
  { href: "/app", label: "Today", mark: "T" },
  { href: "/app/search", label: "Search", mark: "S" },
  { href: "/app/parts", label: "Parts", mark: "P" },
  { href: "/app/invoices", label: "Invoices", mark: "I" },
  { href: "/app/more", label: "More", mark: "M" },
];

const jobStatusClasses: Record<InvoiceJobStatus, string> = {
  scheduled: "border-primary/20 bg-primary/5 text-primary",
  on_the_way: "border-sky-500/25 bg-sky-50 text-sky-700",
  in_progress: "border-indigo-500/25 bg-indigo-50 text-indigo-700",
  need_parts: "border-amber-500/25 bg-amber-50 text-amber-800",
  done: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  reschedule: "border-orange-500/25 bg-orange-50 text-orange-700",
  canceled: "border-slate-300 bg-slate-100 text-slate-500",
};

function getTodayDateInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHARLOTTE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
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

function getScheduleLabel(invoice: InvoiceRecord) {
  const serviceTime = formatServiceTime(invoice.service_time);

  if (serviceTime && invoice.service_window) {
    return `${serviceTime} / ${invoice.service_window}`;
  }

  return serviceTime || invoice.service_window || "No time";
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
  return `${invoice.service_time ?? "99:99"} ${invoice.customer_name}`;
}

export default async function AppHomePage() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login?returnTo=/app");
  }

  const today = getTodayDateInput();
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
  const todayInvoices = visibleInvoices
    .filter((invoice) => invoice.service_date === today)
    .sort((left, right) => getInvoiceSortKey(left).localeCompare(getInvoiceSortKey(right)));
  const activeTodayInvoices = todayInvoices.filter((invoice) =>
    ["scheduled", "on_the_way", "in_progress"].includes(getJobStatus(invoice)),
  );
  const doneCount = todayInvoices.filter((invoice) => getJobStatus(invoice) === "done").length;
  const needsPartsCount = todayInvoices.filter((invoice) => getJobStatus(invoice) === "need_parts").length;
  const nextInvoice =
    activeTodayInvoices[0] ??
    todayInvoices.find((invoice) => !["done", "canceled"].includes(getJobStatus(invoice))) ??
    todayInvoices[0] ??
    null;
  const queueInvoices = todayInvoices.filter((invoice) => invoice.id !== nextInvoice?.id).slice(0, 4);
  const dayStats = [
    { label: "Jobs", value: String(todayInvoices.length) },
    { label: "Active", value: String(activeTodayInvoices.length) },
    { label: "Done", value: String(doneCount) },
    { label: "Parts", value: String(needsPartsCount) },
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

          <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
                Today
              </p>
              <h1 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">
                Today's route
              </h1>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {dayStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-white/12 bg-white/10 p-3">
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/55">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-4 py-4 sm:py-6 lg:grid-cols-[1.1fr_0.9fr]">
        {dataError ? (
          <div className="rounded-xl border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-800 lg:col-span-2">
            {dataError}
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Next job
              </p>
              <h2 className="mt-1 break-words text-2xl font-black text-primary">
                {nextInvoice?.customer_name ?? "No jobs today"}
              </h2>
              <p className="mt-1 text-sm font-bold text-muted">
                {nextInvoice ? getScheduleLabel(nextInvoice) : today}
              </p>
            </div>
            {nextInvoice ? (
              <span className={`rounded-lg border px-3 py-2 text-xs font-black uppercase ${jobStatusClasses[getJobStatus(nextInvoice)]}`}>
                {getJobStatus(nextInvoice).replaceAll("_", " ")}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-muted">
            <p className="truncate rounded-lg bg-slate-50 px-3 py-2">
              {nextInvoice?.appliance || "Appliance"}
            </p>
            <p className="truncate rounded-lg bg-slate-50 px-3 py-2">
              {nextInvoice?.service_address || "Address"}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link
              href="/app"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-3 text-sm font-black text-white transition hover:bg-primary/90"
            >
              Route
            </Link>
            <a
              href={nextInvoice?.customer_phone ? `tel:${nextInvoice.customer_phone}` : "tel:+17042660508"}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-3 text-sm font-black text-primary transition hover:bg-primary/5"
            >
              Call
            </a>
            <Link
              href="/app/search"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-3 text-sm font-black text-primary transition hover:bg-primary/5"
            >
              Search
            </Link>
            <Link
              href={nextInvoice ? `/app/invoices/${nextInvoice.id}` : "/app/invoices"}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-accent/20 bg-red-50 px-3 text-sm font-black text-accent transition hover:bg-red-100"
            >
              Invoice
            </Link>
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Route queue
              </p>
              <h2 className="mt-1 text-xl font-black text-primary">Up next</h2>
            </div>
            <Link href="/app" className="text-sm font-black text-primary">
              View all
            </Link>
          </div>

          <div className="mt-4 grid gap-2">
            {queueInvoices.length ? (
              queueInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/app/invoices/${invoice.id}`}
                  className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-lg border border-border bg-slate-50 p-3 transition hover:border-primary/30 hover:bg-white"
                >
                  <span className="text-sm font-black text-primary">{formatServiceTime(invoice.service_time) || "Time"}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-primary">{invoice.customer_name}</span>
                    <span className="mt-1 block truncate text-xs font-semibold text-muted">
                      {invoice.appliance || invoice.service_address || formatMoney(invoice.total)}
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
                Clear
              </p>
            )}
          </div>
        </aside>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Technician mode
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">Field</h2>
            </div>
            <Link
              href="/app"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
            >
              Open today
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {technicianActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="grid grid-cols-[3.25rem_1fr] items-center gap-3 rounded-lg border border-border bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">
                  {action.label}
                </span>
                <span className="block text-lg font-black text-primary">{action.title}</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
            Field shortcuts
          </p>
          <div className="mt-4 grid gap-2">
            <a
              href="tel:+17042660508"
              className="flex min-h-12 items-center justify-between rounded-lg bg-primary px-4 text-sm font-black text-white transition hover:bg-primary/90"
            >
              <span>Office</span>
              <span>Call</span>
            </a>
            <Link
              href="/app/invoices"
              className="flex min-h-12 items-center justify-between rounded-lg border border-primary/15 bg-white px-4 text-sm font-black text-primary transition hover:bg-primary/5"
            >
              <span>New invoice</span>
              <span>Queue</span>
            </Link>
            <Link
              href="/app/parts"
              className="flex min-h-12 items-center justify-between rounded-lg border border-amber-500/25 bg-amber-50 px-4 text-sm font-black text-amber-800 transition hover:bg-amber-100"
            >
              <span>Parts</span>
              <span>Check</span>
            </Link>
          </div>
        </aside>

        {!permissions.hasTechnicianAccess ? (
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                  Dispatch mode
                </p>
                <h2 className="mt-1 text-2xl font-black text-primary">Dispatch</h2>
              </div>
              <Link
                href="/app/more"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary/15 bg-white px-4 text-sm font-black text-primary transition hover:bg-primary/5"
              >
                Open schedule
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {dispatchActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-lg border border-border bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm"
                >
                  <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-accent px-2 text-xs font-black text-white">
                    {action.label}
                  </span>
                  <span className="mt-4 block text-lg font-black text-primary">{action.title}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5 px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-black transition hover:bg-primary/5 hover:text-primary ${
                item.href === "/app" ? "bg-primary/5 text-primary" : "text-muted"
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
