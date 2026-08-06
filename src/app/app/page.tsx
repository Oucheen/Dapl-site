import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppFieldShell, AppStatStrip, StatusPill } from "@/components/app-field/app-shell";
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

const jobStatusTone: Record<InvoiceJobStatus, "blue" | "green" | "red" | "amber" | "slate"> = {
  canceled: "slate",
  done: "green",
  in_progress: "blue",
  need_parts: "amber",
  on_the_way: "blue",
  reschedule: "red",
  scheduled: "blue",
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

function getRouteStep(index: number) {
  return String(index + 1).padStart(2, "0");
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
  const dayStats = [
    { label: "Jobs", value: String(todayInvoices.length) },
    { label: "Active", value: String(activeTodayInvoices.length) },
    { label: "Done", value: String(doneCount) },
    { label: "Parts", value: String(needsPartsCount) },
  ];

  return (
    <AppFieldShell
      activeHref="/app"
      eyebrow={permissions.hasTechnicianAccess ? "Technician" : "Dispatch"}
      rightSlot={
        <Link
          href="/app/search"
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg bg-primary px-3 text-sm font-black text-white shadow-sm"
        >
          Find
        </Link>
      }
      title="Today"
      userName={permissions.user.name}
    >
      {dataError ? (
        <div className="rounded-lg border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-800">
          {dataError}
        </div>
      ) : null}

      <AppStatStrip items={dayStats} />

      <section className="rounded-lg border border-primary/10 bg-primary p-4 text-white shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/55">
              Current
            </p>
            <h2 className="mt-1 truncate text-3xl font-black">
              {nextInvoice ? getScheduleLabel(nextInvoice) : "Clear"}
            </h2>
            <p className="mt-1 truncate text-sm font-bold text-white/70">
              {nextInvoice?.customer_name ?? "No jobs today"}
            </p>
          </div>
          {nextInvoice ? (
            <StatusPill tone={jobStatusTone[getJobStatus(nextInvoice)]}>
              {getJobStatus(nextInvoice).replaceAll("_", " ")}
            </StatusPill>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-black sm:grid-cols-4">
          <Link
            href={nextInvoice ? `/app/invoices/${nextInvoice.id}` : "/app/invoices"}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-3 text-primary"
          >
            Invoice
          </Link>
          <a
            href={nextInvoice?.customer_phone ? `tel:${nextInvoice.customer_phone}` : "tel:+17042660508"}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 text-white"
          >
            Call
          </a>
          <Link
            href="/app/parts"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 text-white"
          >
            Parts
          </Link>
          <Link
            href="/app/search"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 text-white"
          >
            Search
          </Link>
        </div>
      </section>

      <section className="grid gap-2">
        {todayInvoices.length ? (
          todayInvoices.map((invoice, index) => {
            const jobStatus = getJobStatus(invoice);

            return (
              <Link
                key={invoice.id}
                href={`/app/invoices/${invoice.id}`}
                className="grid grid-cols-[4.5rem_1fr_auto] items-stretch overflow-hidden rounded-lg border border-border bg-white shadow-sm transition hover:border-primary/25 hover:shadow-md"
              >
                <span
                  className={`grid place-items-center px-2 text-center text-white ${
                    invoice.id === nextInvoice?.id ? "bg-accent" : "bg-primary"
                  }`}
                >
                  <span>
                    <span className="block text-lg font-black">{getRouteStep(index)}</span>
                    <span className="mt-1 block text-xs font-black">{formatServiceTime(invoice.service_time) || "Time"}</span>
                  </span>
                </span>
                <span className="min-w-0 p-3">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-base font-black text-primary">
                        {invoice.appliance || invoice.customer_name}
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold text-muted">
                        {invoice.service_address || invoice.customer_name}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-black text-primary">
                      {formatMoney(invoice.total)}
                    </span>
                  </span>
                  <span className="mt-3 flex flex-wrap gap-2">
                    <StatusPill tone={jobStatusTone[jobStatus]}>{jobStatus.replaceAll("_", " ")}</StatusPill>
                    <StatusPill tone={invoice.status === "paid" ? "green" : invoice.status === "sent" ? "amber" : "blue"}>
                      {invoice.status}
                    </StatusPill>
                  </span>
                </span>
                <span className="grid w-10 place-items-center pr-2 text-xl font-black text-primary">›</span>
              </Link>
            );
          })
        ) : (
          <div className="rounded-lg border border-border bg-white p-5 text-sm font-bold text-muted shadow-sm">
            No jobs today.
          </div>
        )}
      </section>
    </AppFieldShell>
  );
}
