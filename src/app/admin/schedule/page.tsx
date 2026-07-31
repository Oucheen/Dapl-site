import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { TechnicianSelect } from "@/components/admin/technician-select";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCrmTechnicianNames } from "@/lib/crm-technicians";
import { getCrmReminders, type CrmReminder } from "@/lib/crm-reminders";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import {
  type InvoiceJobStatus,
  type InvoiceRecord,
  type InvoiceStatus,
  listInvoices,
} from "@/lib/supabase-invoices";
import {
  moveDispatchScheduleAction,
  updateDispatchJobStatusAction,
  updateDispatchScheduleAction,
} from "./actions";
import { DraggableScheduleCard, ScheduleDropZone } from "./drag-drop";

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

function getReminderTone(reminder: CrmReminder) {
  if (reminder.severity === "high") {
    return "border-red-500/25 bg-red-50 text-red-800";
  }

  if (reminder.severity === "medium") {
    return "border-amber-500/25 bg-amber-50 text-amber-800";
  }

  return "border-sky-500/25 bg-sky-50 text-sky-800";
}

function getReminderAudienceLabel(audience: CrmReminder["audience"]) {
  if (audience === "technician") {
    return "Tech";
  }

  if (audience === "owner") {
    return "Owner";
  }

  return "Dispatch";
}

const technicianColorClasses = [
  "border-l-primary",
  "border-l-emerald-600",
  "border-l-sky-600",
  "border-l-amber-600",
  "border-l-rose-600",
  "border-l-indigo-600",
];
const MAX_JOBS_PER_TECH_WINDOW = 2;
const MAX_JOBS_PER_TECH_DAY = 6;
const MAX_ROUTE_STOPS = 10;
const DEFAULT_UNASSIGNED_TECHNICIAN = "Unassigned";

export const dynamic = "force-dynamic";

type ScheduleView = "day" | "week";

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

function getSelectedView(value: string | string[] | undefined): ScheduleView {
  const selectedView = Array.isArray(value) ? value[0] : value;
  return selectedView === "week" ? "week" : "day";
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

function getScheduleHref(date: string, technician: string, view: ScheduleView = "day") {
  const params = new URLSearchParams({ date });

  if (technician) {
    params.set("tech", technician);
  }

  if (view === "week") {
    params.set("view", "week");
  }

  return `/admin/schedule?${params.toString()}`;
}

function getMapsSearchUrl(address: string | null | undefined) {
  const normalizedAddress = address?.trim();

  if (!normalizedAddress) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedAddress)}`;
}

function getMapsRouteUrl(invoices: InvoiceRecord[]) {
  const routeInvoices = invoices
    .filter((invoice) => invoice.service_address?.trim())
    .slice(0, MAX_ROUTE_STOPS);

  if (!routeInvoices.length) {
    return "";
  }

  const destination = routeInvoices[routeInvoices.length - 1]?.service_address?.trim() ?? "";
  const waypoints = routeInvoices
    .slice(0, -1)
    .map((invoice) => invoice.service_address?.trim())
    .filter((address): address is string => Boolean(address));
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination,
  });

  if (waypoints.length) {
    params.set("waypoints", waypoints.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getWeekDates(startDate: string) {
  return Array.from({ length: 7 }, (_, index) => shiftDate(startDate, index));
}

function formatWeekDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(getDateForCharlotteDisplay(value));
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

function isClosedScheduleJob(invoice: InvoiceRecord) {
  const jobStatus = getJobStatus(invoice);
  return jobStatus === "done" || jobStatus === "canceled";
}

function getJobStatusLabel(jobStatus: InvoiceJobStatus) {
  return JOB_STATUSES.find((status) => status.value === jobStatus)?.label ?? jobStatus;
}

function getInvoiceWindowLabel(invoice: InvoiceRecord) {
  if (invoice.service_window) {
    return invoice.service_window;
  }

  const serviceHour = getTimeHour(invoice.service_time);
  const matchingWindow = SERVICE_WINDOWS.find(
    (window) => serviceHour !== null && serviceHour >= window.start && serviceHour < window.end,
  );

  return matchingWindow?.label ?? "No window";
}

function getScheduleConflictWarnings(invoices: InvoiceRecord[]) {
  const warnings: { key: string; title: string; body: string; invoiceIds: string[] }[] = [];
  const byExactTime = new Map<string, InvoiceRecord[]>();
  const byTechnicianWindow = new Map<string, InvoiceRecord[]>();

  for (const invoice of invoices) {
    const technician = invoice.assigned_technician?.trim() || "Unassigned";

    if (invoice.service_time) {
      const exactKey = `${invoice.service_date}|${technician}|${invoice.service_time}`;
      byExactTime.set(exactKey, [...(byExactTime.get(exactKey) ?? []), invoice]);
    }

    const windowLabel = getInvoiceWindowLabel(invoice);

    if (windowLabel !== "No window") {
      const windowKey = `${invoice.service_date}|${technician}|${windowLabel}`;
      byTechnicianWindow.set(windowKey, [...(byTechnicianWindow.get(windowKey) ?? []), invoice]);
    }
  }

  for (const [key, group] of byExactTime.entries()) {
    if (group.length > 1) {
      const [, technician, serviceTime] = key.split("|");
      warnings.push({
        key: `exact-${key}`,
        title: "Exact time conflict",
        body: `${technician} has ${group.length} jobs at ${formatServiceTime(serviceTime)}.`,
        invoiceIds: group.map((invoice) => invoice.id),
      });
    }
  }

  for (const [key, group] of byTechnicianWindow.entries()) {
    if (group.length > MAX_JOBS_PER_TECH_WINDOW) {
      const [, technician, windowLabel] = key.split("|");
      warnings.push({
        key: `window-${key}`,
        title: "Window overload",
        body: `${technician} has ${group.length} jobs in ${windowLabel}.`,
        invoiceIds: group.map((invoice) => invoice.id),
      });
    }
  }

  return warnings;
}

function getSlotInvoices(
  invoices: InvoiceRecord[],
  date: string,
  window: (typeof SERVICE_WINDOWS)[number],
  technician = "",
) {
  return invoices.filter(
    (invoice) =>
      invoice.service_date === date &&
      invoice.status !== "void" &&
      invoiceBelongsToWindow(invoice, window) &&
      (!technician || invoice.assigned_technician === technician),
  );
}

function getSlotTime(window: (typeof SERVICE_WINDOWS)[number]) {
  return `${String(window.start).padStart(2, "0")}:00`;
}

function getScheduleCandidateTechnicians(technicians: string[], selectedTechnician: string) {
  if (selectedTechnician) {
    return [selectedTechnician];
  }

  return technicians.length ? technicians : [DEFAULT_UNASSIGNED_TECHNICIAN];
}

function getRecommendedSlots(
  invoices: InvoiceRecord[],
  dates: string[],
  technicians: string[],
  selectedTechnician: string,
) {
  const candidateTechnicians = getScheduleCandidateTechnicians(technicians, selectedTechnician);

  return dates
    .flatMap((date, dateIndex) =>
      SERVICE_WINDOWS.flatMap((window, windowIndex) =>
        candidateTechnicians.map((technician) => {
          const assignedTechnician = technician === DEFAULT_UNASSIGNED_TECHNICIAN ? "" : technician;
          const jobsInSlot = getSlotInvoices(invoices, date, window, assignedTechnician).length;
          const score = jobsInSlot * 100 + dateIndex * 10 + windowIndex;

          return {
            key: `${date}-${window.label}-${technician}`,
            date,
            dateLabel: formatWeekDay(date),
            window,
            time: getSlotTime(window),
            technician,
            assignedTechnician,
            jobsInSlot,
            remainingCapacity: Math.max(0, MAX_JOBS_PER_TECH_WINDOW - jobsInSlot),
            score,
          };
        }),
      ),
    )
    .filter((slot) => slot.jobsInSlot < MAX_JOBS_PER_TECH_WINDOW)
    .sort((left, right) => left.score - right.score)
    .slice(0, 8);
}

function getTechnicianDayLoads(invoices: InvoiceRecord[], technicians: string[]) {
  const technicianNames = technicians.length ? technicians : [DEFAULT_UNASSIGNED_TECHNICIAN];

  return technicianNames.map((technician) => {
    const assignedTechnician = technician === DEFAULT_UNASSIGNED_TECHNICIAN ? "" : technician;
    const technicianInvoices = invoices.filter((invoice) =>
      assignedTechnician
        ? invoice.assigned_technician === assignedTechnician
        : !invoice.assigned_technician,
    );
    const activeJobs = technicianInvoices.filter((invoice) => {
      const jobStatus = getJobStatus(invoice);
      return jobStatus !== "done" && jobStatus !== "canceled";
    });
    const routeUrl = getMapsRouteUrl(technicianInvoices);

    return {
      technician,
      assignedTechnician,
      totalJobs: technicianInvoices.length,
      activeJobs: activeJobs.length,
      doneJobs: technicianInvoices.filter((invoice) => getJobStatus(invoice) === "done").length,
      needsPartsJobs: technicianInvoices.filter((invoice) => getJobStatus(invoice) === "need_parts").length,
      missingTimeJobs: technicianInvoices.filter(
        (invoice) => !invoice.service_window && !invoice.service_time,
      ).length,
      routeUrl,
    };
  });
}

export default async function ScheduleAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    date?: string | string[];
    tech?: string | string[];
    view?: string | string[];
  }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const params = await searchParams;
  const selectedDate = getSelectedDate(params?.date);
  const selectedTechnician = getSelectedTechnician(params?.tech);
  const selectedView = getSelectedView(params?.view);
  let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
  let error = "";

  try {
    invoices = await listInvoices(300);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load schedule.";
  }

  const technicians = await getCrmTechnicianNames(invoices.map((invoice) => invoice.assigned_technician));
  const weekDates = getWeekDates(selectedDate);
  const dayInvoices = invoices
    .filter((invoice) => invoice.service_date === selectedDate && invoice.status !== "void")
    .filter((invoice) => !selectedTechnician || invoice.assigned_technician === selectedTechnician)
    .sort((left, right) =>
      `${left.service_time ?? "99:99"} ${left.customer_name}`.localeCompare(
        `${right.service_time ?? "99:99"} ${right.customer_name}`,
      ),
    );
  const scheduledInvoices = dayInvoices.filter((invoice) => !isClosedScheduleJob(invoice));
  const closedTodayInvoices = dayInvoices.filter(isClosedScheduleJob);
  const needsTimeInvoices = scheduledInvoices.filter(
    (invoice) => !invoice.service_window && !invoice.service_time,
  );
  const conflictInvoices = scheduledInvoices.filter(invoiceHasScheduleConflict);
  const visibleWeekInvoices = invoices
    .filter(
      (invoice) =>
        invoice.service_date &&
        weekDates.includes(invoice.service_date) &&
        invoice.status !== "void" &&
        !isClosedScheduleJob(invoice) &&
        (!selectedTechnician || invoice.assigned_technician === selectedTechnician),
    )
    .sort((left, right) =>
      `${left.service_date ?? ""} ${left.service_time ?? "99:99"} ${left.customer_name}`.localeCompare(
        `${right.service_date ?? ""} ${right.service_time ?? "99:99"} ${right.customer_name}`,
      ),
    );
  const conflictWarnings = getScheduleConflictWarnings(
    selectedView === "week" ? visibleWeekInvoices : scheduledInvoices,
  );
  const routeDayUrl =
    selectedTechnician && selectedView === "day" ? getMapsRouteUrl(scheduledInvoices) : "";
  const needPartsInvoices = invoices
    .filter((invoice) => getJobStatus(invoice) === "need_parts" && invoice.status !== "void")
    .filter((invoice) => !selectedTechnician || invoice.assigned_technician === selectedTechnician)
    .slice(0, 20);
  const unscheduledInvoices = invoices
    .filter((invoice) => !invoice.service_date && invoice.status !== "paid" && invoice.status !== "void")
    .filter((invoice) => !selectedTechnician || invoice.assigned_technician === selectedTechnician)
    .slice(0, 20);
  const recommendedSlots = getRecommendedSlots(invoices, weekDates, technicians, selectedTechnician);
  const selectedDateRecommendedSlots = recommendedSlots.filter((slot) => slot.date === selectedDate);
  const selectedDayLoadTechnicians = selectedTechnician ? [selectedTechnician] : technicians;
  const technicianDayLoads = getTechnicianDayLoads(scheduledInvoices, selectedDayLoadTechnicians);
  const activeTodayCount = scheduledInvoices.filter((invoice) => {
    const jobStatus = getJobStatus(invoice);
    return jobStatus !== "done" && jobStatus !== "canceled";
  }).length;
  const doneTodayCount = dayInvoices.filter((invoice) => getJobStatus(invoice) === "done").length;
  const canceledTodayCount = dayInvoices.filter((invoice) => getJobStatus(invoice) === "canceled").length;
  const scheduleSummaryCards = [
    {
      label: "Jobs today",
      value: dayInvoices.length,
      note: `${activeTodayCount} active / ${doneTodayCount} done / ${canceledTodayCount} canceled`,
      href: getScheduleHref(selectedDate, selectedTechnician, "day"),
    },
    {
      label: "Need time",
      value: needsTimeInvoices.length,
      note: "Date is set, exact slot is missing",
      href: "#date-time-missing",
    },
    {
      label: "Unscheduled",
      value: unscheduledInvoices.length,
      note: "Open invoices without date",
      href: "#unscheduled-invoices",
    },
    {
      label: "Parts hold",
      value: needPartsInvoices.length,
      note: "Jobs waiting for parts",
      href: "#need-parts",
    },
    {
      label: "Conflicts",
      value: conflictWarnings.length + conflictInvoices.length,
      note: "Overlaps or time/window mismatch",
      href: "#schedule-conflicts",
    },
  ];
  const scheduleReminders = getCrmReminders({ invoices, today: selectedDate })
    .filter((reminder) => reminder.audience !== "owner")
    .slice(0, 6);

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
            <div className="w-full min-w-[18rem] sm:w-auto">
              <AdminGlobalSearch compact />
            </div>
            <Link
              href="/admin"
              className="inline-flex w-fit items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/invoices"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Invoices
            </Link>
            <Link
              href="/admin/technician"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Technician day
            </Link>
            <Link
              href="/admin/accounting"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Accounting
            </Link>
            <Link
              href="/admin/parts"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Parts
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
                {selectedView === "week"
                  ? `${formatWeekDay(weekDates[0])} - ${formatWeekDay(weekDates[6])}`
                  : formatScheduleDate(selectedDate)}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={getScheduleHref(
                  shiftDate(selectedDate, selectedView === "week" ? -7 : -1),
                  selectedTechnician,
                  selectedView,
                )}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
              >
                Previous {selectedView === "week" ? "week" : "day"}
              </Link>
              <form className="flex gap-2" action="/admin/schedule">
                {selectedTechnician ? (
                  <input type="hidden" name="tech" value={selectedTechnician} />
                ) : null}
                {selectedView === "week" ? <input type="hidden" name="view" value="week" /> : null}
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
                href={getScheduleHref(
                  shiftDate(selectedDate, selectedView === "week" ? 7 : 1),
                  selectedTechnician,
                  selectedView,
                )}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
              >
                Next {selectedView === "week" ? "week" : "day"}
              </Link>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            <Link
              href={getScheduleHref(selectedDate, selectedTechnician, "day")}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                selectedView === "day"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary/15 bg-white text-primary hover:bg-primary/5"
              }`}
            >
              Day view
            </Link>
            <Link
              href={getScheduleHref(selectedDate, selectedTechnician, "week")}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                selectedView === "week"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary/15 bg-white text-primary hover:bg-primary/5"
              }`}
            >
              Week view
            </Link>
            {routeDayUrl ? (
              <a
                href={routeDayUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Route day
              </a>
            ) : (
              <span className="rounded-full border border-border bg-slate-50 px-4 py-2 text-sm font-bold text-muted">
                Select technician for route
              </span>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            <Link
              href={getScheduleHref(selectedDate, "", selectedView)}
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
                href={getScheduleHref(selectedDate, technician, selectedView)}
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

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {scheduleSummaryCards.map((card) => (
            <a
              key={card.label}
              href={card.href}
              className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                card.value
                  ? "border-primary/15 bg-white hover:border-primary/30"
                  : "border-border bg-white"
              }`}
            >
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
                {card.label}
              </span>
              <span className="mt-2 block text-3xl font-black text-primary">{card.value}</span>
              <span className="mt-1 block text-xs leading-5 text-muted">{card.note}</span>
            </a>
          ))}
        </div>

        <section className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Reminders
              </p>
              <h2 className="mt-1 text-xl font-black text-primary">Needs attention</h2>
            </div>
            <p className="text-xs font-semibold text-muted">
              Internal dispatch and technician follow-ups for the selected day.
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {scheduleReminders.length ? (
              scheduleReminders.map((reminder) => (
                <Link
                  key={reminder.id}
                  href={reminder.href}
                  className={`rounded-xl border p-4 text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${getReminderTone(
                    reminder,
                  )}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-black">{reminder.title}</span>
                    <span className="shrink-0 rounded-full bg-white/80 px-2 py-1 text-[0.65rem] font-bold">
                      {getReminderAudienceLabel(reminder.audience)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5">{reminder.body}</span>
                </Link>
              ))
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                Nothing urgent is waiting for dispatch.
              </p>
            )}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Technician load
              </p>
              <h2 className="mt-1 text-xl font-black text-primary">Daily capacity</h2>
            </div>
            <p className="text-xs font-semibold text-muted">
              Soft limit: {MAX_JOBS_PER_TECH_DAY} jobs per technician / {MAX_JOBS_PER_TECH_WINDOW} per window.
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {technicianDayLoads.map((load) => {
              const isOverloaded = load.totalJobs > MAX_JOBS_PER_TECH_DAY;
              const loadPercent = Math.min(100, Math.round((load.totalJobs / MAX_JOBS_PER_TECH_DAY) * 100));

              return (
                <article
                  key={load.technician}
                  className={`rounded-xl border border-l-4 p-4 ${getTechnicianColorClass(
                    load.assignedTechnician,
                    technicians,
                  )} ${isOverloaded ? "border-red-500/25 bg-red-50" : "border-border bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-primary">{load.technician}</h3>
                      <p className="mt-1 text-xs font-semibold text-muted">
                        {load.activeJobs} active / {load.doneJobs} done
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[0.65rem] font-bold ${
                        isOverloaded ? "bg-red-100 text-red-700" : "bg-white text-muted"
                      }`}
                    >
                      {load.totalJobs} jobs
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${isOverloaded ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${loadPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                    <span>{load.missingTimeJobs} need time</span>
                    <span>{load.needsPartsJobs} need parts</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={getScheduleHref(selectedDate, load.assignedTechnician, "day")}
                      className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                    >
                      Open day
                    </Link>
                    {load.routeUrl ? (
                      <a
                        href={load.routeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                      >
                        Route
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {conflictInvoices.length ? (
          <div id="schedule-conflicts" className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm">
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

        {conflictWarnings.length ? (
          <div id={conflictInvoices.length ? undefined : "schedule-conflicts"} className="mt-4 rounded-2xl border border-red-500/25 bg-red-50 p-5 text-sm text-red-800 shadow-sm">
            <p className="font-black">Dispatch conflicts</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {conflictWarnings.map((warning) => (
                <div key={warning.key} className="rounded-xl bg-white p-4">
                  <p className="font-black">{warning.title}</p>
                  <p className="mt-1 leading-6">{warning.body}</p>
                  <p className="mt-2 text-xs font-bold text-red-700">
                    {warning.invoiceIds.length} linked invoices
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {selectedView === "week" ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-7">
            {weekDates.map((date) => {
              const dayInvoices = visibleWeekInvoices.filter((invoice) => invoice.service_date === date);

              return (
                <section key={date} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-primary">{formatWeekDay(date)}</h3>
                      <p className="mt-1 text-xs font-bold text-muted">{dayInvoices.length} jobs</p>
                    </div>
                    <Link
                      href={getScheduleHref(date, selectedTechnician, "day")}
                      className="rounded-lg border border-primary/15 bg-white px-2 py-1 text-[0.65rem] font-bold text-primary transition hover:bg-primary/5"
                    >
                      Day
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {SERVICE_WINDOWS.map((window) => {
                      const windowInvoices = dayInvoices.filter((invoice) =>
                        invoiceBelongsToWindow(invoice, window),
                      );
                      const openCapacity = selectedTechnician
                        ? Math.max(0, MAX_JOBS_PER_TECH_WINDOW - windowInvoices.length)
                        : null;

                      return (
                        <ScheduleDropZone
                          key={`${date}-${window.label}`}
                          action={moveDispatchScheduleAction}
                          serviceDate={date}
                          serviceWindow={window.label}
                          serviceTime={getSlotTime(window)}
                          selectedDate={selectedDate}
                          selectedView={selectedView}
                          technicianFilter={selectedTechnician}
                        >
                        <div
                          className={`rounded-xl border p-3 ${
                            selectedTechnician && windowInvoices.length > MAX_JOBS_PER_TECH_WINDOW
                              ? "border-red-500/25 bg-red-50"
                              : windowInvoices.length
                                ? "border-border bg-slate-50"
                                : "border-dashed border-border bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-black text-primary">{window.label}</p>
                              <p className="mt-0.5 text-[0.65rem] font-bold text-muted">
                                {openCapacity === null
                                  ? "All techs"
                                  : openCapacity
                                    ? `${openCapacity} open`
                                    : "Full"}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-2 py-1 text-[0.65rem] font-bold text-muted">
                              {windowInvoices.length}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {windowInvoices.length ? (
                              windowInvoices.map((invoice) => {
                                const jobStatus = getJobStatus(invoice);
                                const mapsUrl = getMapsSearchUrl(invoice.service_address);

                                return (
                                  <DraggableScheduleCard key={invoice.id} invoiceId={invoice.id}>
                                    <article
                                      className={`rounded-lg border border-l-4 bg-white p-2 text-xs transition hover:border-primary/30 ${getTechnicianColorClass(
                                        invoice.assigned_technician,
                                        technicians,
                                      )}`}
                                    >
                                      <p className="truncate font-black text-primary">
                                        {invoice.customer_name}
                                      </p>
                                      <p className="mt-1 font-bold text-muted">
                                        {getInvoiceScheduleLabel(invoice)}
                                      </p>
                                      <p className="mt-1 truncate leading-5 text-muted">
                                        {invoice.assigned_technician || "No technician"}
                                      </p>
                                      <span
                                        className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[0.65rem] font-bold uppercase ${jobStatusClasses[jobStatus]}`}
                                      >
                                        {getJobStatusLabel(jobStatus)}
                                      </span>
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        <Link
                                          href={`/admin/invoices/${invoice.id}`}
                                          className="rounded-md border border-primary/15 bg-white px-2 py-1 text-[0.65rem] font-bold text-primary transition hover:bg-primary/5"
                                        >
                                          Invoice
                                        </Link>
                                        {mapsUrl ? (
                                          <a
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-md border border-primary/15 bg-white px-2 py-1 text-[0.65rem] font-bold text-primary transition hover:bg-primary/5"
                                          >
                                            Maps
                                          </a>
                                        ) : null}
                                      </div>
                                    </article>
                                  </DraggableScheduleCard>
                                );
                              })
                            ) : (
                              <p className="rounded-lg bg-slate-50 p-2 text-[0.65rem] leading-5 text-muted">
                                Open slot.
                              </p>
                            )}
                          </div>
                        </div>
                        </ScheduleDropZone>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4">
            {SERVICE_WINDOWS.map((window) => {
              const windowInvoices = scheduledInvoices.filter((invoice) =>
                invoiceBelongsToWindow(invoice, window),
              );

              return (
                <ScheduleDropZone
                  key={window.label}
                  action={moveDispatchScheduleAction}
                  serviceDate={selectedDate}
                  serviceWindow={window.label}
                  serviceTime={getSlotTime(window)}
                  selectedDate={selectedDate}
                  selectedView={selectedView}
                  technicianFilter={selectedTechnician}
                >
                <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
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
                        const mapsUrl = getMapsSearchUrl(invoice.service_address);

                        return (
                          <DraggableScheduleCard key={invoice.id} invoiceId={invoice.id}>
                            <article
                              className={`rounded-xl border border-l-4 p-3 transition hover:border-primary/30 hover:bg-white hover:shadow-sm ${technicianColorClass} ${
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
                            <p className="mt-2 line-clamp-1 text-sm leading-5 text-muted">
                              {invoice.service_address || "Address not set"}
                            </p>
                            <div className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
                              <span>{invoice.customer_phone || "No phone"}</span>
                              <span>{invoice.assigned_technician || "No technician"}</span>
                              <span>{invoice.appliance || "Appliance not set"}</span>
                              <span className="font-bold text-primary">{formatMoney(invoice.total)}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
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
                              <form action={updateDispatchJobStatusAction}>
                                <input type="hidden" name="invoiceId" value={invoice.id} />
                                <input type="hidden" name="selectedDate" value={selectedDate} />
                                <input type="hidden" name="selectedView" value={selectedView} />
                                <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                                <input type="hidden" name="jobStatus" value="done" />
                                <button
                                  type="submit"
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                                >
                                  Done
                                </button>
                              </form>
                              <form action={updateDispatchJobStatusAction}>
                                <input type="hidden" name="invoiceId" value={invoice.id} />
                                <input type="hidden" name="selectedDate" value={selectedDate} />
                                <input type="hidden" name="selectedView" value={selectedView} />
                                <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                                <input type="hidden" name="jobStatus" value="reschedule" />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-orange-500/25 bg-white px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-50"
                                >
                                  Reschedule
                                </button>
                              </form>
                              <form action={updateDispatchJobStatusAction}>
                                <input type="hidden" name="invoiceId" value={invoice.id} />
                                <input type="hidden" name="selectedDate" value={selectedDate} />
                                <input type="hidden" name="selectedView" value={selectedView} />
                                <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                                <input type="hidden" name="jobStatus" value="canceled" />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-red-500/25 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                                >
                                  Cancel
                                </button>
                              </form>
                            </div>
                            <details className="mt-3 border-t border-border pt-3">
                              <summary className="cursor-pointer select-none text-xs font-black text-primary">
                                Edit schedule
                              </summary>
                              <form
                                action={updateDispatchScheduleAction}
                                className="mt-3 grid gap-2 sm:grid-cols-2"
                              >
                                <input type="hidden" name="invoiceId" value={invoice.id} />
                                <input type="hidden" name="selectedDate" value={selectedDate} />
                                <input type="hidden" name="selectedView" value={selectedView} />
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
                                  <TechnicianSelect
                                    name="assignedTechnician"
                                    technicians={technicians}
                                    defaultValue={invoice.assigned_technician ?? ""}
                                    placeholder="Tech"
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
                            </details>
                            </article>
                          </DraggableScheduleCard>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-muted">
                      No customers scheduled in this window.
                    </p>
                  )}
                </section>
                </ScheduleDropZone>
              );
            })}
          </div>

          {closedTodayInvoices.length ? (
            <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Closed today
                  </p>
                  <h3 className="mt-1 text-lg font-black text-primary">Done and canceled jobs</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-muted">
                  {closedTodayInvoices.length} jobs
                </span>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {closedTodayInvoices.map((invoice) => {
                  const jobStatus = getJobStatus(invoice);

                  return (
                    <Link
                      key={invoice.id}
                      href={`/admin/invoices/${invoice.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm transition hover:border-primary/25 hover:bg-white"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-black text-primary">{invoice.customer_name}</span>
                        <span className="mt-1 block truncate text-xs text-muted">
                          {getInvoiceScheduleLabel(invoice)} / {invoice.assigned_technician || "No technician"}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[0.65rem] font-bold uppercase ${jobStatusClasses[jobStatus]}`}
                      >
                        {getJobStatusLabel(jobStatus)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <aside className="self-start rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Needs scheduling
            </p>
            <h2 className="mt-1 text-xl font-black text-primary">Recommended open slots</h2>
            <div className="mt-4 grid gap-3">
              {recommendedSlots.length ? (
                recommendedSlots.slice(0, 4).map((slot, index) => (
                  <div
                    key={slot.key}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-primary">
                          {index === 0 ? "Best slot" : `Option ${index + 1}`}
                        </p>
                        <p className="mt-1 text-xs font-bold text-emerald-800">
                          {slot.dateLabel} / {slot.window.label}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[0.65rem] font-bold text-emerald-800">
                        {slot.remainingCapacity} open
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      {slot.technician} / suggested time {formatServiceTime(slot.time)}
                    </p>
                    <Link
                      href={getScheduleHref(slot.date, slot.assignedTechnician, "day")}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-emerald-100"
                    >
                      Open this day
                    </Link>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                  No open slots in the selected week.
                </p>
              )}
            </div>

            <div id="need-parts" className="mt-5 scroll-mt-6 border-t border-border pt-5">
            <h2 className="mt-1 text-xl font-black text-primary">Need parts</h2>
            <div className="mt-4 grid gap-3">
              {needPartsInvoices.length ? (
                needPartsInvoices.map((invoice) => (
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
                      {invoice.appliance || "Appliance not set"} / {invoice.assigned_technician || "No technician"}
                    </p>
                    {invoice.notes ? (
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-amber-900">
                        {invoice.notes}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs leading-5 text-muted">
                        Add part details in invoice notes.
                      </p>
                    )}
                    <form action={updateDispatchJobStatusAction} className="mt-3">
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="selectedDate" value={selectedDate} />
                      <input type="hidden" name="selectedView" value={selectedView} />
                      <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                      <input type="hidden" name="jobStatus" value="scheduled" />
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-amber-100"
                      >
                        Parts ready
                      </button>
                    </form>
                  </article>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                  No jobs are waiting for parts.
                </p>
              )}
            </div>
            </div>

            <div id="date-time-missing" className="mt-5 scroll-mt-6 border-t border-border pt-5">
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
                      <input type="hidden" name="selectedView" value={selectedView} />
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
                        <TechnicianSelect
                          name="assignedTechnician"
                          technicians={technicians}
                          defaultValue={invoice.assigned_technician ?? ""}
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
                    {selectedDateRecommendedSlots.length ? (
                      <div className="mt-3 grid gap-2 border-t border-amber-500/20 pt-3">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-amber-800">
                          Quick open slots
                        </p>
                        {selectedDateRecommendedSlots.slice(0, 2).map((slot) => (
                          <form key={`${invoice.id}-${slot.key}`} action={updateDispatchScheduleAction}>
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <input type="hidden" name="selectedDate" value={selectedDate} />
                            <input type="hidden" name="selectedView" value={selectedView} />
                            <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                            <input type="hidden" name="serviceDate" value={slot.date} />
                            <input type="hidden" name="serviceWindow" value={slot.window.label} />
                            <input type="hidden" name="serviceTime" value={slot.time} />
                            <input type="hidden" name="assignedTechnician" value={slot.assignedTechnician} />
                            <input type="hidden" name="jobStatus" value="scheduled" />
                            <button
                              type="submit"
                              className="w-full rounded-lg bg-white px-3 py-2 text-left text-xs font-bold text-primary transition hover:bg-amber-100"
                            >
                              {slot.window.label} / {slot.technician}
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                  Every job for this day has a time.
                </p>
              )}
            </div>
            </div>

            <div id="unscheduled-invoices" className="mt-5 scroll-mt-6 border-t border-border pt-5">
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
                      <input type="hidden" name="selectedView" value={selectedView} />
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
                        <TechnicianSelect
                          name="assignedTechnician"
                          technicians={technicians}
                          defaultValue={invoice.assigned_technician ?? ""}
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
                    {recommendedSlots.length ? (
                      <div className="mt-3 grid gap-2 border-t border-border pt-3">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted">
                          Suggested slots
                        </p>
                        {recommendedSlots.slice(0, 3).map((slot) => (
                          <form key={`${invoice.id}-${slot.key}`} action={updateDispatchScheduleAction}>
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <input type="hidden" name="selectedDate" value={selectedDate} />
                            <input type="hidden" name="selectedView" value={selectedView} />
                            <input type="hidden" name="technicianFilter" value={selectedTechnician} />
                            <input type="hidden" name="serviceDate" value={slot.date} />
                            <input type="hidden" name="serviceWindow" value={slot.window.label} />
                            <input type="hidden" name="serviceTime" value={slot.time} />
                            <input type="hidden" name="assignedTechnician" value={slot.assignedTechnician} />
                            <input type="hidden" name="jobStatus" value="scheduled" />
                            <button
                              type="submit"
                              className="w-full rounded-lg border border-primary/15 bg-white px-3 py-2 text-left text-xs font-bold text-primary transition hover:bg-primary/5"
                            >
                              {slot.dateLabel} / {slot.window.label} / {slot.technician}
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : null}
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
        )}
      </section>
    </main>
  );
}
