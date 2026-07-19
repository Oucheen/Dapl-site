import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import {
  type InvoiceJobStatus,
  type InvoiceRecord,
  type InvoiceStatus,
  listInvoices,
} from "@/lib/supabase-invoices";
import { updateDispatchJobStatusAction, updateDispatchScheduleAction } from "./actions";

const SERVICE_WINDOWS = [
  { label: "8:00 AM - 10:00 AM", start: 8, end: 10 },
  { label: "10:00 AM - 12:00 PM", start: 10, end: 12 },
  { label: "12:00 PM - 2:00 PM", start: 12, end: 14 },
  { label: "2:00 PM - 4:00 PM", start: 14, end: 16 },
  { label: "4:00 PM - 6:00 PM", start: 16, end: 18 },
  { label: "6:00 PM - 8:00 PM", start: 18, end: 20 },
];

const statusClasses: Record<InvoiceStatus, string> = {
  draft: "border-primary/20 bg-primary/5 text-primary",
  sent: "border-amber-500/25 bg-amber-50 text-amber-700",
  paid: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  void: "border-slate-300 bg-slate-100 text-slate-500",
};

const JOB_STATUSES: { value: InvoiceJobStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "on_the_way", label: "On the way" },
  { value: "in_progress", label: "In progress" },
  { value: "need_parts", label: "Need parts" },
  { value: "done", label: "Done" },
  { value: "reschedule", label: "Reschedule" },
  { value: "canceled", label: "Canceled" },
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

const technicianColorClasses = [
  "border-l-primary",
  "border-l-emerald-600",
  "border-l-sky-600",
  "border-l-amber-600",
  "border-l-rose-600",
  "border-l-indigo-600",
];

export const dynamic = "force-dynamic";

function getTodayDateInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHARLOTTE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getSelectedDate(value: string | string[] | undefined) {
  const selectedDate = Array.isArray(value) ? value[0] : value;

  if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
    return selectedDate;
  }

  return getTodayDateInput();
}

function getSelectedTechnician(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function formatScheduleDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(getDateForCharlotteDisplay(value));
}

function formatMoney(value: number | string) {
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

function getTimeHour(value?: string | null) {
  if (!value) {
    return null;
  }

  const hour = Number(value.split(":")[0]);
  return Number.isFinite(hour) ? hour : null;
}

function invoiceBelongsToWindow(invoice: InvoiceRecord, window: (typeof SERVICE_WINDOWS)[number]) {
  if (invoice.service_window) {
    return invoice.service_window === window.label;
  }

  const serviceHour = getTimeHour(invoice.service_time);
  return serviceHour !== null && serviceHour >= window.start && serviceHour < window.end;
}

function invoiceHasScheduleConflict(invoice: InvoiceRecord) {
  if (!invoice.service_window || !invoice.service_time) {
    return false;
  }

  const selectedWindow = SERVICE_WINDOWS.find((window) => window.label === invoice.service_window);
  const serviceHour = getTimeHour(invoice.service_time);

  if (!selectedWindow || serviceHour === null) {
    return false;
  }

  return serviceHour < selectedWindow.start || serviceHour >= selectedWindow.end;
}

function getInvoiceScheduleLabel(invoice: InvoiceRecord) {
  const serviceTime = formatServiceTime(invoice.service_time);

  if (serviceTime && invoice.service_window) {
    return `${serviceTime} / ${invoice.service_window}`;
  }

  return serviceTime || invoice.service_window || "Time not set";
}

function getScheduleHref(date: string, technician: string) {
  const params = new URLSearchParams({ date });

  if (technician) {
    params.set("tech", technician);
  }

  return `/admin/schedule?${params.toString()}`;
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getTechnicians(invoices: InvoiceRecord[]) {
  return Array.from(
    new Set(
      invoices
        .map((invoice) => invoice.assigned_technician?.trim())
        .filter((technician): technician is string => Boolean(technician)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function getTechnicianColorClass(technician: string | null | undefined, technicians: string[]) {
  if (!technician) {
    return "border-l-slate-300";
  }

  const technicianIndex = technicians.indexOf(technician);
  return technicianColorClasses[Math.max(technicianIndex, 0) % technicianColorClasses.length];
}

function getJobStatus(invoice: InvoiceRecord) {
  return invoice.job_status ?? (invoice.service_date ? "scheduled" : "reschedule");
}

function getJobStatusLabel(jobStatus: InvoiceJobStatus) {
  return JOB_STATUSES.find((status) => status.value === jobStatus)?.label ?? jobStatus;
}

export default async function ScheduleAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    date?: string | string[];
    tech?: string | string[];
  }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const params = await searchParams;
  const selectedDate = getSelectedDate(params?.date);
  const selectedTechnician = getSelectedTechnician(params?.tech);
  let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
  let error = "";

  try {
    invoices = await listInvoices(300);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load schedule.";
  }

  const technicians = getTechnicians(invoices);
  const scheduledInvoices = invoices
    .filter((invoice) => invoice.service_date === selectedDate && invoice.status !== "void")
    .filter((invoice) => !selectedTechnician || invoice.assigned_technician === selectedTechnician)
    .sort((left, right) =>
      `${left.service_time ?? "99:99"} ${left.customer_name}`.localeCompare(
        `${right.service_time ?? "99:99"} ${right.customer_name}`,
      ),
    );
  const needsTimeInvoices = scheduledInvoices.filter(
    (invoice) => !invoice.service_window && !invoice.service_time,
  );
  const conflictInvoices = scheduledInvoices.filter(invoiceHasScheduleConflict);
  const unscheduledInvoices = invoices
    .filter((invoice) => !invoice.service_date && invoice.status !== "paid" && invoice.status !== "void")
    .filter((invoice) => !selectedTechnician || invoice.assigned_technician === selectedTechnician)
    .slice(0, 20);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin/leads" className="text-sm font-bold text-muted hover:text-primary">
              Back to leads
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Dispatch schedule
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Place customers into a visit date, time window, and technician from each invoice.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/invoices"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Invoices
            </Link>
            <Link
              href="/admin/accounting"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Accounting
            </Link>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-black">Could not load schedule.</p>
            <p className="mt-2 break-words">{error}</p>
          </div>
        ) : null}
        <datalist id="schedule-technicians">
          {technicians.map((technician) => (
            <option key={technician} value={technician} />
          ))}
        </datalist>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Selected day
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">
                {formatScheduleDate(selectedDate)}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={getScheduleHref(shiftDate(selectedDate, -1), selectedTechnician)}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
              >
                Previous day
              </Link>
              <form className="flex gap-2" action="/admin/schedule">
                {selectedTechnician ? (
                  <input type="hidden" name="tech" value={selectedTechnician} />
                ) : null}
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDate}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  Open
                </button>
              </form>
              <Link
                href={getScheduleHref(shiftDate(selectedDate, 1), selectedTechnician)}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
              >
                Next day
              </Link>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            <Link
              href={getScheduleHref(selectedDate, "")}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                selectedTechnician
                  ? "border-primary/15 bg-white text-primary hover:bg-primary/5"
                  : "border-primary bg-primary text-primary-foreground"
              }`}
            >
              All technicians
            </Link>
            {technicians.map((technician) => (
              <Link
                key={technician}
                href={getScheduleHref(selectedDate, technician)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                  selectedTechnician === technician
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/15 bg-white text-primary hover:bg-primary/5"
                }`}
              >
                {technician}
              </Link>
            ))}
          </div>
        </div>

        {conflictInvoices.length ? (
          <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm">
            <p className="font-black">Time needs attention</p>
            <p className="mt-1 leading-6">
              Some jobs have an exact time outside the selected time window. They stay in the
              selected window, but the invoice should be corrected.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {conflictInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="rounded-full border border-amber-500/25 bg-white px-3 py-1 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                >
                  {invoice.customer_name}: {getInvoiceScheduleLabel(invoice)}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4">
            {SERVICE_WINDOWS.map((window) => {
              const windowInvoices = scheduledInvoices.filter((invoice) =>
                invoiceBelongsToWindow(invoice, window),
              );

              return (
                <section key={window.label} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-black text-primary">{window.label}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-muted">
                      {windowInvoices.length} jobs
                    </span>
                  </div>

                  {windowInvoices.length ? (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {windowInvoices.map((invoice) => {
                        const hasConflict = invoiceHasScheduleConflict(invoice);
                        const jobStatus = getJobStatus(invoice);
                        const technicianColorClass = getTechnicianColorClass(
                          invoice.assigned_technician,
                          technicians,
                        );

                        return (
                          <article
                            key={invoice.id}
                            className={`rounded-xl border border-l-4 p-4 transition hover:border-primary/30 hover:bg-white hover:shadow-sm ${technicianColorClass} ${
                              hasConflict
                                ? "border-amber-500/35 bg-amber-50"
                                : "border-border bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-black text-primary">
                                  {invoice.customer_name}
                                </p>
                                <p className="mt-1 text-xs font-bold text-muted">
                                  {getInvoiceScheduleLabel(invoice)}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <span
                                  className={`rounded-full border px-2 py-1 text-[0.65rem] font-bold uppercase ${statusClasses[invoice.status]}`}
                                >
                                  {invoice.status}
                                </span>
                                <span
                                  className={`rounded-full border px-2 py-1 text-[0.65rem] font-bold uppercase ${jobStatusClasses[jobStatus]}`}
                                >
                                  {getJobStatusLabel(jobStatus)}
                                </span>
                              </div>
                            </div>
                            {hasConflict ? (
                              <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs font-bold text-amber-800">
                                Exact time is outside this window.
                              </p>
                            ) : null}
                            <p className="mt-3 text-sm leading-5 text-muted">
                              {invoice.service_address || "Address not set"}
                            </p>
                            <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
                              <span>{invoice.customer_phone || "No phone"}</span>
                              <span>{invoice.assigned_technician || "No technician"}</span>
                              <span>{invoice.appliance || "Appliance not set"}</span>
                              <span className="font-bold text-primary">{formatMoney(invoice.total)}</span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {invoice.customer_phone ? (
                                <>
                                  <a
                                    href={`tel:${invoice.customer_phone}`}
                                    className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                                  >
                                    Call
                                  </a>
                                  <a
                                    href={`sms:${invoice.customer_phone}`}
                                    className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                                  >
                                    SMS
                                  </a>
                                </>
                              ) : null}
                              <Link
                                href={`/admin/invoices/${invoice.id}`}
                                className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                              >
                                Invoice
                              </Link>
                              <form action={updateDispatchJobStatusAction}>
                                <input type="hidden" name="invoiceId" value={invoice.id} />
                                <input type="hidden" name="selectedDate" value={selectedDate} />
                                <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                                <input type="hidden" name="jobStatus" value="done" />
                                <button
                                  type="submit"
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                                >
                                  Done
                                </button>
                              </form>
                            </div>
                            <form
                              action={updateDispatchScheduleAction}
                              className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2"
                            >
                              <input type="hidden" name="invoiceId" value={invoice.id} />
                              <input type="hidden" name="selectedDate" value={selectedDate} />
                              <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                              <label className="grid gap-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted">
                                Date
                                <input
                                  type="date"
                                  name="serviceDate"
                                  defaultValue={invoice.service_date ?? selectedDate}
                                  className="min-w-0 rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                />
                              </label>
                              <label className="grid gap-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted">
                                Window
                                <select
                                  name="serviceWindow"
                                  defaultValue={invoice.service_window ?? window.label}
                                  className="min-w-0 rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                >
                                  <option value="">Not selected</option>
                                  {SERVICE_WINDOWS.map((serviceWindow) => (
                                    <option key={serviceWindow.label} value={serviceWindow.label}>
                                      {serviceWindow.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="grid gap-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted">
                                Time
                                <input
                                  type="time"
                                  name="serviceTime"
                                  defaultValue={invoice.service_time ?? ""}
                                  className="min-w-0 rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                />
                              </label>
                              <label className="grid gap-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted">
                                Technician
                                <input
                                  type="text"
                                  name="assignedTechnician"
                                  defaultValue={invoice.assigned_technician ?? ""}
                                  list="schedule-technicians"
                                  className="min-w-0 rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                />
                              </label>
                              <label className="grid gap-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted sm:col-span-2">
                                Job status
                                <select
                                  name="jobStatus"
                                  defaultValue={jobStatus}
                                  className="min-w-0 rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                >
                                  {JOB_STATUSES.map((status) => (
                                    <option key={status.value} value={status.value}>
                                      {status.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="submit"
                                className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 sm:col-span-2"
                              >
                                Save schedule
                              </button>
                            </form>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-muted">
                      No customers scheduled in this window.
                    </p>
                  )}
                </section>
              );
            })}
          </div>

          <aside className="self-start rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Needs scheduling
            </p>
            <h2 className="mt-1 text-xl font-black text-primary">Date set, time missing</h2>
            <div className="mt-4 grid gap-3">
              {needsTimeInvoices.length ? (
                needsTimeInvoices.map((invoice) => (
                  <article
                    key={invoice.id}
                    className={`rounded-xl border border-l-4 border-amber-500/25 bg-amber-50 p-4 text-sm ${getTechnicianColorClass(
                      invoice.assigned_technician,
                      technicians,
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-black text-primary">{invoice.customer_name}</p>
                      <Link
                        href={`/admin/invoices/${invoice.id}`}
                        className="rounded-lg bg-white px-2 py-1 text-[0.65rem] font-bold text-primary"
                      >
                        Invoice
                      </Link>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {invoice.appliance || "Appliance not set"} / {invoice.service_address || "Address not set"}
                    </p>
                    <form action={updateDispatchScheduleAction} className="mt-3 grid gap-2">
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="selectedDate" value={selectedDate} />
                      <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                      <input type="hidden" name="serviceDate" value={selectedDate} />
                      <select
                        name="serviceWindow"
                        defaultValue={invoice.service_window ?? ""}
                        className="rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                      >
                        <option value="">Select window</option>
                        {SERVICE_WINDOWS.map((serviceWindow) => (
                          <option key={serviceWindow.label} value={serviceWindow.label}>
                            {serviceWindow.label}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          name="serviceTime"
                          defaultValue={invoice.service_time ?? ""}
                          className="min-w-0 rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                        />
                        <input
                          type="text"
                          name="assignedTechnician"
                          defaultValue={invoice.assigned_technician ?? ""}
                          list="schedule-technicians"
                          placeholder="Tech"
                          className="min-w-0 rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                        />
                      </div>
                      <select
                        name="jobStatus"
                        defaultValue={getJobStatus(invoice)}
                        className="rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                      >
                        {JOB_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                      >
                        Save slot
                      </button>
                    </form>
                  </article>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                  Every job for this day has a time.
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-5">
            <h2 className="mt-1 text-xl font-black text-primary">Open invoices without date</h2>
            <div className="mt-4 grid gap-3">
              {unscheduledInvoices.length ? (
                unscheduledInvoices.map((invoice) => (
                  <article
                    key={invoice.id}
                    className={`rounded-xl border border-l-4 border-border bg-slate-50 p-4 text-sm ${getTechnicianColorClass(
                      invoice.assigned_technician,
                      technicians,
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-black text-primary">{invoice.customer_name}</p>
                      <Link
                        href={`/admin/invoices/${invoice.id}`}
                        className="rounded-lg bg-white px-2 py-1 text-[0.65rem] font-bold text-primary"
                      >
                        Invoice
                      </Link>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {invoice.appliance || "Appliance not set"} / {invoice.service_address || "Address not set"}
                    </p>
                    <form action={updateDispatchScheduleAction} className="mt-3 grid gap-2">
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="selectedDate" value={selectedDate} />
                      <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                      <input
                        type="date"
                        name="serviceDate"
                        defaultValue={selectedDate}
                        className="rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                      />
                      <select
                        name="serviceWindow"
                        defaultValue={invoice.service_window ?? ""}
                        className="rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                      >
                        <option value="">Select window</option>
                        {SERVICE_WINDOWS.map((serviceWindow) => (
                          <option key={serviceWindow.label} value={serviceWindow.label}>
                            {serviceWindow.label}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          name="serviceTime"
                          defaultValue={invoice.service_time ?? ""}
                          className="min-w-0 rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                        />
                        <input
                          type="text"
                          name="assignedTechnician"
                          defaultValue={invoice.assigned_technician ?? ""}
                          list="schedule-technicians"
                          placeholder="Tech"
                          className="min-w-0 rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                        />
                      </div>
                      <input type="hidden" name="jobStatus" value="scheduled" />
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                      >
                        Put on schedule
                      </button>
                    </form>
                  </article>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                  Everything open has a date.
                </p>
              )}
            </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
