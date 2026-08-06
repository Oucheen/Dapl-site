import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppFieldShell, AppStatStrip, StatusPill } from "@/components/app-field/app-shell";
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

const jobStatusTone: Record<InvoiceJobStatus, "blue" | "green" | "red" | "amber" | "slate"> = {
  canceled: "slate",
  done: "green",
  in_progress: "blue",
  need_parts: "amber",
  on_the_way: "blue",
  reschedule: "red",
  scheduled: "blue",
};

const invoiceStatusTone: Record<InvoiceStatus, "blue" | "green" | "amber" | "slate"> = {
  draft: "blue",
  paid: "green",
  sent: "amber",
  void: "slate",
};

type InvoiceFilter = "open" | "draft" | "sent" | "paid" | "parts";

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

function getFilterValue(value: string | string[] | undefined): InvoiceFilter {
  const filter = Array.isArray(value) ? value[0] : value;

  if (filter === "draft" || filter === "sent" || filter === "paid" || filter === "parts") {
    return filter;
  }

  return "open";
}

function getFilteredInvoices(invoices: InvoiceRecord[], filter: InvoiceFilter) {
  if (filter === "draft" || filter === "sent" || filter === "paid") {
    return invoices.filter((invoice) => invoice.status === filter);
  }

  if (filter === "parts") {
    return invoices.filter((invoice) => getJobStatus(invoice) === "need_parts");
  }

  return invoices.filter((invoice) => invoice.status !== "paid" || getJobStatus(invoice) !== "done");
}

export default async function AppInvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login?returnTo=/app/invoices");
  }

  const params = await searchParams;
  const activeFilter = getFilterValue(params?.filter);
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
  const filteredInvoices = getFilteredInvoices(visibleInvoices, activeFilter)
    .sort((left, right) => getInvoiceSortKey(left).localeCompare(getInvoiceSortKey(right)))
    .slice(0, 14);
  const openCount = getFilteredInvoices(visibleInvoices, "open").length;
  const draftCount = visibleInvoices.filter((invoice) => invoice.status === "draft").length;
  const sentCount = visibleInvoices.filter((invoice) => invoice.status === "sent").length;
  const paidCount = visibleInvoices.filter((invoice) => invoice.status === "paid").length;
  const needPartsCount = visibleInvoices.filter((invoice) => getJobStatus(invoice) === "need_parts").length;
  const states = [
    { active: activeFilter === "open", href: "/app/invoices", label: "Open", value: String(openCount) },
    { active: activeFilter === "draft", href: "/app/invoices?filter=draft", label: "Draft", value: String(draftCount) },
    { active: activeFilter === "sent", href: "/app/invoices?filter=sent", label: "Sent", value: String(sentCount) },
    { active: activeFilter === "paid", href: "/app/invoices?filter=paid", label: "Paid", value: String(paidCount) },
    { active: activeFilter === "parts", href: "/app/invoices?filter=parts", label: "Parts", value: String(needPartsCount) },
  ];
  const filterLabel = states.find((state) => state.active)?.label ?? "Open";

  return (
    <AppFieldShell
      activeHref="/app/invoices"
      eyebrow="Technician"
      rightSlot={
        <Link
          href="/app/search"
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg bg-primary px-3 text-sm font-black text-white shadow-sm"
        >
          Find
        </Link>
      }
      title="Invoices"
      userName={permissions.user.name}
    >
      {dataError ? (
        <div className="rounded-lg border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-800">
          {dataError}
        </div>
      ) : null}

      <AppStatStrip items={states} />

      <section className="rounded-lg border border-border bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-accent">
              Open
            </p>
            <h2 className="text-xl font-black text-primary">{filterLabel}</h2>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-muted">
            {filteredInvoices.length}
          </span>
        </div>

        <div className="grid gap-2">
          {filteredInvoices.length ? (
            filteredInvoices.map((invoice) => {
              const jobStatus = getJobStatus(invoice);

              return (
                <Link
                  key={invoice.id}
                  href={`/app/invoices/${invoice.id}`}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-border bg-slate-50 p-3 transition hover:border-primary/25 hover:bg-white"
                >
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-start gap-3">
                      <span className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-white text-center text-xs font-black text-primary shadow-sm">
                        <span>
                          <span className="block text-[0.65rem] uppercase text-muted">
                            {formatDate(invoice.service_date)}
                          </span>
                          <span className="block">{formatServiceTime(invoice.service_time) || "--"}</span>
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-base font-black text-primary">
                          {invoice.appliance || invoice.customer_name}
                        </span>
                        <span className="mt-1 block truncate text-xs font-bold text-muted">
                          {invoice.service_address || invoice.customer_phone || invoice.invoice_number}
                        </span>
                      </span>
                    </span>
                    <span className="mt-3 flex flex-wrap gap-2">
                      <StatusPill tone={invoiceStatusTone[invoice.status]}>{invoice.status}</StatusPill>
                      <StatusPill tone={jobStatusTone[jobStatus]}>{jobStatus.replaceAll("_", " ")}</StatusPill>
                      <StatusPill tone={getWorkflowState(invoice) === "Collect" ? "red" : "blue"}>
                        {getWorkflowState(invoice)}
                      </StatusPill>
                    </span>
                  </span>

                  <span className="grid min-w-16 content-between justify-items-end">
                    <span className="text-sm font-black text-primary">{formatMoney(invoice.total)}</span>
                    <span className="text-xl font-black text-primary">&gt;</span>
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
              No invoices.
            </p>
          )}
        </div>
      </section>
    </AppFieldShell>
  );
}
