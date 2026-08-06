import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logoutAdmin } from "@/app/admin/leads/actions";
import { AppBottomNav } from "@/components/app-field/app-shell";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import { getPublicInvoicePath, getShortPublicInvoicePath } from "@/lib/invoice-public-link";
import {
  listActivitiesForInvoice,
  type LeadActivityRecord,
} from "@/lib/supabase-activity";
import { getLatestInvoiceSignature } from "@/lib/supabase-invoice-signatures";
import {
  calculateInvoiceAmountDue,
  calculateInvoicePaidAmount,
  getInvoiceById,
  type InvoiceJobStatus,
  type InvoiceRecord,
  type InvoiceStatus,
} from "@/lib/supabase-invoices";
import {
  addAppInvoiceItemAction,
  addAppInvoicePaymentAction,
  markAppInvoiceDoneAction,
  sendAppInvoiceSmsAction,
  startAppInvoiceJobAction,
  submitAppTechnicianReportAction,
  updateAppInvoiceItemsAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoice | DAPL Field App",
  description: "Technician invoice detail for DAPL Appliance Repair.",
  manifest: "/dapl-field.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
};

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

const jobStatusOptions: { value: InvoiceJobStatus; label: string }[] = [
  { value: "in_progress", label: "Working" },
  { value: "done", label: "Completed" },
  { value: "need_parts", label: "Need parts" },
  { value: "reschedule", label: "Reschedule" },
  { value: "canceled", label: "Canceled" },
];

const reportPhotoFields = [
  { name: "unitPhoto", label: "Unit" },
  { name: "serialPhoto", label: "Serial" },
  { name: "partPhoto", label: "Part" },
  { name: "receiptPhoto", label: "Receipt" },
];

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

function canSeeInvoice(input: {
  invoice: InvoiceRecord;
  technicianOnly: boolean;
  userName: string;
}) {
  if (!input.technicianOnly) {
    return true;
  }

  const assignedTechnician = normalizeText(input.invoice.assigned_technician);
  return !assignedTechnician || assignedTechnician === normalizeText(input.userName);
}

function getLineTotal(quantity: number | string, unitPrice: number | string) {
  return formatMoney(Number(quantity ?? 0) * Number(unitPrice ?? 0));
}

function isTechnicianReportActivity(activity: LeadActivityRecord) {
  return activity.metadata?.source === "technician_report_page";
}

function getMetadataText(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === "string" ? value : "";
}

function getLatestReport(activities: LeadActivityRecord[]) {
  return activities.find(
    (activity) =>
      activity.event_type === "telegram_visit_report_completed" &&
      isTechnicianReportActivity(activity),
  );
}

function getLatestPartReport(activities: LeadActivityRecord[]) {
  return activities.find(
    (activity) =>
      activity.event_type === "telegram_report_own_part" &&
      isTechnicianReportActivity(activity),
  );
}

function hasReportPhoto(activities: LeadActivityRecord[]) {
  return activities.some(
    (activity) =>
      activity.event_type === "telegram_report_photo" &&
      isTechnicianReportActivity(activity),
  );
}

function getMoneyPrefill(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) {
    return "";
  }

  return value.toFixed(2);
}

export default async function AppInvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams?: Promise<{ notice?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    const { invoiceId } = await params;
    redirect(`/admin/leads/login?returnTo=/app/invoices/${invoiceId}`);
  }

  const { invoiceId } = await params;
  const query = await searchParams;
  const notice = Array.isArray(query?.notice) ? query.notice[0] : query?.notice;
  const invoiceData = await getInvoiceById(invoiceId).catch(() => null);

  if (!invoiceData) {
    notFound();
  }

  const { invoice, items, payments } = invoiceData;

  if (
    !canSeeInvoice({
      invoice,
      technicianOnly: permissions.hasTechnicianAccess,
      userName: permissions.user.name,
    })
  ) {
    notFound();
  }

  const [signature, invoiceActivities] = await Promise.all([
    getLatestInvoiceSignature(invoice.id),
    listActivitiesForInvoice(invoice.id, 120),
  ]);
  const paidAmount = calculateInvoicePaidAmount(payments);
  const amountDue = calculateInvoiceAmountDue(invoice, payments);
  const jobStatus = getJobStatus(invoice);
  const latestReport = getLatestReport(invoiceActivities);
  const latestPartReport = getLatestPartReport(invoiceActivities);
  const reportHasPhoto = hasReportPhoto(invoiceActivities);
  const hasReport = Boolean(latestReport);
  const defaultReportStatus =
    jobStatusOptions.some((status) => status.value === jobStatus) ? jobStatus : "in_progress";
  const defaultWorkNote = getMetadataText(latestReport?.metadata, "workNote");
  const defaultUnitModelSerial = getMetadataText(latestReport?.metadata, "unitModelSerial");
  const defaultPartName = getMetadataText(latestPartReport?.metadata, "partName");
  const defaultPartCost = getMoneyPrefill(latestPartReport?.metadata?.partCost);
  const defaultCustomerCharge = getMoneyPrefill(latestPartReport?.metadata?.suggestedCustomerCharge);
  const defaultPartNote = getMetadataText(latestPartReport?.metadata, "partNote");
  const publicInvoiceHref = getShortPublicInvoicePath(invoice.invoice_number) || getPublicInvoicePath(invoice.invoice_number);
  const mapsHref = invoice.service_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(invoice.service_address)}`
    : "";
  const returnTo = `/app/invoices/${invoice.id}`;
  const signatureParams = new URLSearchParams(getPublicInvoicePath(invoice.invoice_number).split("?")[1] ?? "");
  signatureParams.set("returnTo", returnTo);
  const signatureHref = `/i/${encodeURIComponent(invoice.invoice_number)}/sign?${signatureParams.toString()}#signature-form`;
  const paymentDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHARLOTTE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const isLineItemsLocked = invoice.status === "paid" || invoice.status === "void";

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 pb-24 text-foreground">
      <section className="bg-primary text-white">
        <div className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-5 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/app/invoices" className="text-sm font-black tracking-[0.16em] text-white">
                DAPL
              </Link>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                {permissions.user.name}
              </p>
            </div>
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-primary"
              >
                Sign out
              </button>
            </form>
          </div>

          <div className="mt-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
              Invoice
            </p>
            <h1 className="mt-2 break-words text-3xl font-black tracking-tight text-white sm:text-5xl">
              {invoice.customer_name}
            </h1>
            <p className="mt-2 text-sm font-bold text-white/60">{invoice.invoice_number}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-3 py-4 sm:px-5 sm:py-6 lg:grid-cols-[1fr_0.85fr]">
        {notice ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-50 p-4 text-sm font-black text-emerald-800 lg:col-span-2">
            {notice.replaceAll("_", " ")}
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses[invoice.status]}`}>
              {invoice.status}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${jobStatusClasses[jobStatus]}`}>
              {jobStatus.replaceAll("_", " ")}
            </span>
            <span className="rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-black text-primary">
              {signature ? "Signed" : "Need sign"}
            </span>
          </div>

          <div className="mt-5 grid min-w-0 grid-cols-3 gap-2">
            <div className="min-w-0 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Total</p>
              <p className="mt-1 truncate text-base font-black text-primary sm:text-lg">{formatMoney(invoice.total)}</p>
            </div>
            <div className="min-w-0 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Paid</p>
              <p className="mt-1 truncate text-base font-black text-emerald-700 sm:text-lg">{formatMoney(paidAmount)}</p>
            </div>
            <div className="min-w-0 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Due</p>
              <p className="mt-1 truncate text-base font-black text-accent sm:text-lg">{formatMoney(amountDue)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-muted">
            <p className="truncate rounded-lg bg-slate-50 px-3 py-2">{invoice.appliance || "Appliance"}</p>
            <p className="truncate rounded-lg bg-slate-50 px-3 py-2">
              {formatDate(invoice.service_date)} {formatServiceTime(invoice.service_time)}
            </p>
            <p className="col-span-2 truncate rounded-lg bg-slate-50 px-3 py-2">
              {invoice.service_address || "Address"}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {invoice.customer_phone ? (
              <a
                href={`tel:${invoice.customer_phone}`}
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-3 text-sm font-black text-white"
              >
                Call
              </a>
            ) : null}
            {mapsHref ? (
              <Link
                href={mapsHref}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-3 text-sm font-black text-primary"
              >
                Maps
              </Link>
            ) : null}
            <Link
              href={publicInvoiceHref}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-3 text-sm font-black text-primary"
            >
              Customer
            </Link>
            <Link
              href={signatureHref}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-accent/20 bg-red-50 px-3 text-sm font-black text-accent"
            >
              Sign
            </Link>
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
            Flow
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            <form action={startAppInvoiceJobAction}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <button
                disabled={jobStatus === "in_progress" || jobStatus === "done"}
                className={`min-h-12 w-full rounded-lg border px-2 text-center text-xs font-black ${
                  jobStatus === "in_progress" || jobStatus === "done"
                    ? "border-emerald-500/25 bg-emerald-50 text-emerald-700"
                    : "border-accent/20 bg-red-50 text-accent"
                }`}
              >
                Start
              </button>
            </form>
            <a
              href="#report"
              className={`inline-flex min-h-12 items-center justify-center rounded-lg border px-2 text-center text-xs font-black ${
                hasReport
                  ? "border-emerald-500/25 bg-emerald-50 text-emerald-700"
                  : "border-primary/15 bg-white text-primary"
              }`}
            >
              Report
            </a>
            <a href="#charges" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-2 text-center text-xs font-black text-primary">
              Charges
            </a>
            <Link href={signatureHref} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-2 text-center text-xs font-black text-primary">
              Sign
            </Link>
            <form action={sendAppInvoiceSmsAction}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <button className="min-h-12 w-full rounded-lg border border-primary/15 bg-white px-2 text-center text-xs font-black text-primary">
                Send
              </button>
            </form>
            <a href="#payment" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-accent/20 bg-red-50 px-2 text-center text-xs font-black text-accent">
              Pay
            </a>
            <form action={markAppInvoiceDoneAction}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <button className="min-h-12 w-full rounded-lg border border-primary/15 bg-white px-2 text-center text-xs font-black text-primary">
                Done
              </button>
            </form>
          </div>
        </aside>

        <div id="report" className="scroll-mt-4 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Report
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">
                {hasReport ? "Saved" : "Visit"}
              </h2>
            </div>
            <div className="flex gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
                hasReport ? "border-emerald-500/25 bg-emerald-50 text-emerald-700" : "border-red-500/25 bg-red-50 text-red-700"
              }`}>
                {hasReport ? "Report" : "Missing"}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${
                reportHasPhoto ? "border-emerald-500/25 bg-emerald-50 text-emerald-700" : "border-amber-500/25 bg-amber-50 text-amber-800"
              }`}>
                {reportHasPhoto ? "Photo" : "No photo"}
              </span>
            </div>
          </div>

          <form
            action={submitAppTechnicianReportAction}
            encType="multipart/form-data"
            className="mt-4 grid gap-3"
          >
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <label className="grid gap-1">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-muted">Result</span>
              <select
                name="jobStatus"
                defaultValue={defaultReportStatus}
                className="min-h-12 rounded-lg border border-border bg-white px-3 text-sm font-black text-primary outline-none focus:border-primary"
              >
                {jobStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-muted">Work note</span>
              <textarea
                name="workNote"
                rows={4}
                required
                defaultValue={defaultWorkNote}
                placeholder="Diagnosis, work done, customer decision"
                className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-bold leading-6 outline-none focus:border-primary"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-muted">Model / serial</span>
              <input
                name="unitModelSerial"
                defaultValue={defaultUnitModelSerial}
                placeholder="Optional"
                className="min-h-12 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary"
              />
            </label>

            <div className="grid gap-2 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Photos</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {reportPhotoFields.map((field) => (
                  <label key={field.name} className="grid gap-2 rounded-lg border border-border bg-white p-3 text-xs font-black text-primary">
                    {field.label}
                    <input
                      type="file"
                      name={field.name}
                      accept={field.name === "receiptPhoto" ? "image/*,application/pdf,.pdf" : "image/*"}
                      className="w-full text-[0.65rem] font-bold text-muted file:mr-1 file:rounded-md file:border-0 file:bg-primary file:px-2 file:py-1.5 file:text-[0.65rem] file:font-black file:text-white"
                    />
                  </label>
                ))}
              </div>
            </div>

            <details className="rounded-lg border border-amber-500/20 bg-amber-50 p-3">
              <summary className="cursor-pointer text-sm font-black text-amber-900">
                Own part
              </summary>
              <div className="mt-3 grid gap-2">
                <label className="flex items-center gap-3 text-sm font-bold text-amber-950">
                  <input
                    type="checkbox"
                    name="partUsed"
                    value="yes"
                    defaultChecked={Boolean(latestPartReport)}
                    className="h-5 w-5 accent-primary"
                  />
                  Used technician part
                </label>
                <input
                  name="partName"
                  defaultValue={defaultPartName}
                  placeholder="Part name"
                  className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="partCost"
                    inputMode="decimal"
                    defaultValue={defaultPartCost}
                    placeholder="Cost"
                    className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary"
                  />
                  <input
                    name="customerCharge"
                    inputMode="decimal"
                    defaultValue={defaultCustomerCharge}
                    placeholder="Charge"
                    className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary"
                  />
                </div>
                <textarea
                  name="partNote"
                  rows={2}
                  defaultValue={defaultPartNote}
                  placeholder="Part note"
                  className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-bold outline-none focus:border-primary"
                />
              </div>
            </details>

            <button className="min-h-12 rounded-lg bg-primary px-4 text-sm font-black text-white">
              Save report
            </button>
          </form>
        </div>

        <div id="charges" className="scroll-mt-4 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Charges
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">Lines</h2>
            </div>
            <form action={addAppInvoiceItemAction}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <button
                disabled={isLineItemsLocked}
                className="text-sm font-black text-primary disabled:text-muted"
              >
                Add
              </button>
            </form>
          </div>

          <form action={updateAppInvoiceItemsAction} className="mt-4 grid gap-2">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            {items.length ? (
              items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-slate-50 p-3">
                  <input type="hidden" name="itemId" value={item.id} />
                  <label className="grid gap-1">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-muted">Description</span>
                    <input
                      name="description"
                      defaultValue={item.description}
                      disabled={isLineItemsLocked}
                      className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-black text-primary outline-none focus:border-primary disabled:bg-slate-100"
                    />
                  </label>
                  <div className="mt-2 grid min-w-0 grid-cols-[0.7fr_1fr_1fr] gap-2">
                    <input
                      name="quantity"
                      inputMode="decimal"
                      defaultValue={String(item.quantity ?? 1)}
                      disabled={isLineItemsLocked}
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary disabled:bg-slate-100"
                    />
                    <input
                      name="unitPrice"
                      inputMode="decimal"
                      defaultValue={Number(item.unit_price ?? 0).toFixed(2)}
                      disabled={isLineItemsLocked}
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary disabled:bg-slate-100"
                    />
                    <div className="grid min-h-11 min-w-0 place-items-center truncate rounded-lg border border-border bg-white px-2 text-sm font-black text-primary">
                      {getLineTotal(item.quantity, item.unit_price)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
                No charges.
              </p>
            )}
            <button
              disabled={isLineItemsLocked || items.length === 0}
              className="mt-2 min-h-12 rounded-lg bg-primary px-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
            >
              Save charges
            </button>
          </form>
        </div>

        <div id="payment" className="scroll-mt-4 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Payments
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">History</h2>
            </div>
            <form action={markAppInvoiceDoneAction}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <button className="text-sm font-black text-primary">Done</button>
            </form>
          </div>

          <form action={addAppInvoicePaymentAction} className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-3">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={amountDue > 0 ? amountDue.toFixed(2) : ""}
                placeholder="Amount"
                className="min-h-11 min-w-0 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary"
              />
              <select
                name="method"
                defaultValue="cash"
                className="min-h-11 min-w-0 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="zelle">Zelle</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </div>
            <input type="hidden" name="paymentDate" value={paymentDate} />
            <input type="hidden" name="paymentTime" value="" />
            <input
              name="note"
              placeholder="Note"
              className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary"
            />
            <button className="min-h-12 rounded-lg bg-primary px-4 text-sm font-black text-white">
              Add payment
            </button>
          </form>

          <div className="mt-4 grid gap-2">
            {payments.length ? (
              payments.map((payment) => (
                <div key={payment.id} className="rounded-lg border border-border bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-black text-primary">{payment.method}</p>
                    <p className="text-sm font-black text-emerald-700">{formatMoney(payment.amount)}</p>
                  </div>
                  {payment.note ? (
                    <p className="mt-1 break-words text-xs font-bold text-muted">{payment.note}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
                No payments.
              </p>
            )}
          </div>
        </div>
      </section>

      <AppBottomNav activeHref="/app/invoices" />
    </main>
  );
}
