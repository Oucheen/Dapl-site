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
import { updateDispatchJobStatusAction } from "@/app/admin/schedule/actions";

const JOB_STATUSES: { value: InvoiceJobStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "on_the_way", label: "On the way" },
  { value: "in_progress", label: "In progress" },
  { value: "need_parts", label: "Need parts" },
  { value: "done", label: "Done" },
  { value: "reschedule", label: "Reschedule" },
  { value: "canceled", label: "Canceled" },
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

export const dynamic = "force-dynamic";

function getTodayDateInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHARLOTTE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function getSelectedDate(value: string | string[] | undefined) {
  const selectedDate = getQueryValue(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) ? selectedDate : getTodayDateInput();
}

function formatDate(value: string) {
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

function getScheduleLabel(invoice: InvoiceRecord) {
  const serviceTime = formatServiceTime(invoice.service_time);

  if (serviceTime && invoice.service_window) {
    return `${serviceTime} / ${invoice.service_window}`;
  }

  return serviceTime || invoice.service_window || "Time not set";
}

function getJobStatus(invoice: InvoiceRecord) {
  return invoice.job_status ?? (invoice.service_date ? "scheduled" : "reschedule");
}

function getJobStatusLabel(jobStatus: InvoiceJobStatus) {
  return JOB_STATUSES.find((status) => status.value === jobStatus)?.label ?? jobStatus;
}

function getMapsSearchUrl(address: string | null | undefined) {
  const normalizedAddress = address?.trim();

  if (!normalizedAddress) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedAddress)}`;
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

function getTechnicianHref(date: string, technician: string) {
  const params = new URLSearchParams({ date });

  if (technician) {
    params.set("tech", technician);
  }

  return `/admin/technician?${params.toString()}`;
}

export default async function TechnicianDayPage({
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
  const selectedTechnician = getQueryValue(params?.tech);
  let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
  let error = "";

  try {
    invoices = await listInvoices(300);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load technician jobs.";
  }

  const technicians = getTechnicians(invoices);
  const visibleInvoices = invoices
    .filter(
      (invoice) =>
        invoice.service_date === selectedDate &&
        invoice.status !== "void" &&
        (!selectedTechnician || invoice.assigned_technician === selectedTechnician),
    )
    .sort((left, right) =>
      `${left.service_time ?? "99:99"} ${left.customer_name}`.localeCompare(
        `${right.service_time ?? "99:99"} ${right.customer_name}`,
      ),
    );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin/schedule" className="text-sm font-bold text-muted hover:text-primary">
              Back to schedule
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Technician day
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Daily job view for quick field updates.
            </p>
          </div>
          <Link
            href="/admin/invoices"
            className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
          >
            Invoices
          </Link>
        </div>
      </header>

      <section className="container-shell py-8">
        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-black">Could not load technician jobs.</p>
            <p className="mt-2 break-words">{error}</p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Selected day
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">{formatDate(selectedDate)}</h2>
            </div>
            <form action="/admin/technician" className="flex flex-wrap gap-2">
              <input
                type="date"
                name="date"
                defaultValue={selectedDate}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
              />
              <select
                name="tech"
                defaultValue={selectedTechnician}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
              >
                <option value="">All technicians</option>
                {technicians.map((technician) => (
                  <option key={technician} value={technician}>
                    {technician}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                Open
              </button>
            </form>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            <Link
              href={getTechnicianHref(selectedDate, "")}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                selectedTechnician
                  ? "border-primary/15 bg-white text-primary hover:bg-primary/5"
                  : "border-primary bg-primary text-primary-foreground"
              }`}
            >
              All
            </Link>
            {technicians.map((technician) => (
              <Link
                key={technician}
                href={getTechnicianHref(selectedDate, technician)}
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

        <div className="mt-6 grid gap-4">
          {visibleInvoices.length ? (
            visibleInvoices.map((invoice) => {
              const jobStatus = getJobStatus(invoice);
              const mapsUrl = getMapsSearchUrl(invoice.service_address);

              return (
                <article key={invoice.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xl font-black text-primary">{invoice.customer_name}</p>
                      <p className="mt-1 text-sm font-bold text-muted">{getScheduleLabel(invoice)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${statusClasses[invoice.status]}`}
                      >
                        {invoice.status}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${jobStatusClasses[jobStatus]}`}
                      >
                        {getJobStatusLabel(jobStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm leading-6 text-muted md:grid-cols-2">
                    <p>{invoice.service_address || "Address not set"}</p>
                    <p>{invoice.appliance || "Appliance not set"}</p>
                    <p>{invoice.customer_phone || "No phone"}</p>
                    <p className="font-bold text-primary">{formatMoney(invoice.total)}</p>
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
                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                      >
                        Maps
                      </a>
                    ) : null}
                    <Link
                      href={`/admin/invoices/${invoice.id}`}
                      className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                    >
                      Invoice
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    {(["on_the_way", "in_progress", "need_parts", "done", "reschedule"] as InvoiceJobStatus[]).map(
                      (status) => (
                        <form key={status} action={updateDispatchJobStatusAction}>
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <input type="hidden" name="selectedDate" value={selectedDate} />
                          <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                          <input type="hidden" name="returnTo" value="technician" />
                          <input type="hidden" name="jobStatus" value={status} />
                          <button
                            type="submit"
                            className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${jobStatusClasses[status]}`}
                          >
                            {getJobStatusLabel(status)}
                          </button>
                        </form>
                      ),
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <p className="rounded-2xl border border-border bg-white p-5 text-sm leading-6 text-muted shadow-sm">
              No jobs found for this day.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
