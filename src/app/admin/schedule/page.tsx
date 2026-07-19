import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import { type InvoiceRecord, type InvoiceStatus, listInvoices } from "@/lib/supabase-invoices";

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
  if (invoice.service_window === window.label) {
    return true;
  }

  const serviceHour = getTimeHour(invoice.service_time);
  return serviceHour !== null && serviceHour >= window.start && serviceHour < window.end;
}

function getInvoiceScheduleLabel(invoice: InvoiceRecord) {
  const serviceTime = formatServiceTime(invoice.service_time);

  if (serviceTime && invoice.service_window) {
    return `${serviceTime} / ${invoice.service_window}`;
  }

  return serviceTime || invoice.service_window || "Time not set";
}

function getDateHref(date: string) {
  return `/admin/schedule?date=${date}`;
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function ScheduleAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    date?: string | string[];
  }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const params = await searchParams;
  const selectedDate = getSelectedDate(params?.date);
  let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
  let error = "";

  try {
    invoices = await listInvoices(300);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load schedule.";
  }

  const scheduledInvoices = invoices
    .filter((invoice) => invoice.service_date === selectedDate && invoice.status !== "void")
    .sort((left, right) =>
      `${left.service_time ?? "99:99"} ${left.customer_name}`.localeCompare(
        `${right.service_time ?? "99:99"} ${right.customer_name}`,
      ),
    );
  const unscheduledInvoices = invoices
    .filter((invoice) => !invoice.service_date && invoice.status !== "paid" && invoice.status !== "void")
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
                href={getDateHref(shiftDate(selectedDate, -1))}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
              >
                Previous day
              </Link>
              <form className="flex gap-2" action="/admin/schedule">
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
                href={getDateHref(shiftDate(selectedDate, 1))}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
              >
                Next day
              </Link>
            </div>
          </div>
        </div>

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
                      {windowInvoices.map((invoice) => (
                        <Link
                          key={invoice.id}
                          href={`/admin/invoices/${invoice.id}`}
                          className="block rounded-xl border border-border bg-slate-50 p-4 transition hover:border-primary/30 hover:bg-white hover:shadow-sm"
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
                            <span
                              className={`shrink-0 rounded-full border px-2 py-1 text-[0.65rem] font-bold uppercase ${statusClasses[invoice.status]}`}
                            >
                              {invoice.status}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-5 text-muted">
                            {invoice.service_address || "Address not set"}
                          </p>
                          <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
                            <span>{invoice.customer_phone || "No phone"}</span>
                            <span>{invoice.assigned_technician || "No technician"}</span>
                            <span>{invoice.appliance || "Appliance not set"}</span>
                            <span className="font-bold text-primary">{formatMoney(invoice.total)}</span>
                          </div>
                        </Link>
                      ))}
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
            <h2 className="mt-1 text-xl font-black text-primary">Open invoices without date</h2>
            <div className="mt-4 grid gap-3">
              {unscheduledInvoices.length ? (
                unscheduledInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/admin/invoices/${invoice.id}`}
                    className="rounded-xl border border-border bg-slate-50 p-4 text-sm transition hover:border-primary/30 hover:bg-white"
                  >
                    <p className="font-black text-primary">{invoice.customer_name}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {invoice.appliance || "Appliance not set"} / {invoice.service_address || "Address not set"}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                  Everything open has a date.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
