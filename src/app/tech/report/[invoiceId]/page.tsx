import Link from "next/link";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import {
  getInvoiceById,
  type InvoiceJobStatus,
  type InvoiceRecord,
} from "@/lib/supabase-invoices";
import { getTelegramUserByTelegramId } from "@/lib/supabase-telegram-users";
import { verifyTechnicianReportToken } from "@/lib/technician-report-links";
import { submitTechnicianReport } from "./actions";

export const dynamic = "force-dynamic";

const JOB_STATUSES: { value: InvoiceJobStatus; label: string }[] = [
  { value: "in_progress", label: "Still working" },
  { value: "done", label: "Job completed" },
  { value: "need_parts", label: "Need parts" },
  { value: "reschedule", label: "Need reschedule" },
  { value: "canceled", label: "Customer canceled" },
];

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Technician access is not active.",
  invalid_link: "This report link is invalid. Open the latest link from Telegram.",
  invalid_status: "Please choose a valid job result.",
  part_name_required: "Add the part name or turn off the technician-owned part checkbox.",
  save_failed: "Report could not be saved. Please try again or send the details in Telegram.",
  work_note_required: "Work note is required before saving the report.",
};

const WARNING_MESSAGES: Record<string, string> = {
  photo_upload_failed: "Report was saved, but one or more photos could not upload. Please try smaller JPG/PNG photos or send them in Telegram.",
};

function ReportUnavailable({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center">
        <section className="rounded-2xl border border-red-500/20 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
            Report unavailable
          </p>
          <h1 className="mt-3 text-3xl font-black text-primary">This report link cannot be opened.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-muted">{message}</p>
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
            Ask the office to resend the job from Telegram, then open the latest Report page button.
          </p>
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
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

function getServiceScheduleLabel(invoice: Pick<InvoiceRecord, "service_time" | "service_window">) {
  const serviceTime = formatServiceTime(invoice.service_time);

  if (serviceTime && invoice.service_window) {
    return `${serviceTime} (${invoice.service_window})`;
  }

  return serviceTime || invoice.service_window || "Not set";
}

function getMapsSearchUrl(address: string | null | undefined) {
  const normalizedAddress = address?.trim();

  if (!normalizedAddress) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedAddress)}`;
}

export default async function TechnicianReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams?: Promise<{
    error?: string | string[];
    saved?: string | string[];
    t?: string | string[];
    warning?: string | string[];
  }>;
}) {
  const { invoiceId } = await params;
  const query = await searchParams;
  const error = Array.isArray(query?.error) ? query?.error[0] : query?.error;
  const token = Array.isArray(query?.t) ? query?.t[0] : query?.t;
  const saved = Array.isArray(query?.saved) ? query?.saved[0] : query?.saved;
  const warning = Array.isArray(query?.warning) ? query?.warning[0] : query?.warning;
  const telegramUserId = verifyTechnicianReportToken(invoiceId, token);

  if (!telegramUserId) {
    return <ReportUnavailable message="The link is invalid or expired." />;
  }

  let invoiceResult: Awaited<ReturnType<typeof getInvoiceById>> = null;
  let telegramUser: Awaited<ReturnType<typeof getTelegramUserByTelegramId>> = {
    error: "",
    ready: false,
    user: null,
  };

  try {
    [invoiceResult, telegramUser] = await Promise.all([
      getInvoiceById(invoiceId),
      getTelegramUserByTelegramId(telegramUserId),
    ]);
  } catch (reportError) {
    console.error("Technician report page failed to load", {
      invoiceId,
      telegramUserId,
      reportError,
    });

    return <ReportUnavailable message="The report data could not be loaded right now." />;
  }

  if (!invoiceResult || !telegramUser.user || !token) {
    return <ReportUnavailable message="The invoice or technician access is no longer available." />;
  }

  const invoice = invoiceResult.invoice;
  const leadId = invoice.lead_id;

  if (!leadId) {
    return <ReportUnavailable message="This invoice is not linked to a customer card." />;
  }

  const mapsUrl = getMapsSearchUrl(invoice.service_address);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto grid max-w-3xl gap-5">
        {saved === "1" ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            Report saved. Thank you.
          </div>
        ) : null}
        {warning ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            {WARNING_MESSAGES[warning] ?? "Report saved with a warning."}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.save_failed}
          </div>
        ) : null}

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
            DAPL technician report
          </p>
          <h1 className="mt-2 text-3xl font-black text-primary">{invoice.customer_name}</h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            {invoice.invoice_number} / {telegramUser.user.technician_name}
          </p>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Phone</p>
              <p className="mt-1 font-bold">{invoice.customer_phone || "Not set"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Appliance</p>
              <p className="mt-1 font-bold">{invoice.appliance || "Not selected"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Date</p>
              <p className="mt-1 font-bold">{formatDate(invoice.service_date)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Time</p>
              <p className="mt-1 font-bold">{getServiceScheduleLabel(invoice)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Address</p>
              <p className="mt-1 font-bold">{invoice.service_address || "Not set"}</p>
              {mapsUrl ? (
                <Link
                  href={mapsUrl}
                  className="mt-3 inline-flex rounded-lg border border-primary/20 bg-white px-3 py-2 text-xs font-black text-primary"
                >
                  Open maps
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <form
          action={submitTechnicianReport}
          encType="multipart/form-data"
          className="rounded-2xl border border-border bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="token" value={token} />

          <div className="grid gap-4">
            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
              Job result
              <select
                name="jobStatus"
                defaultValue={invoice.job_status ?? "in_progress"}
                className="rounded-xl border border-border bg-white px-3 py-3 text-base font-bold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
              >
                {JOB_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
              Work note
              <textarea
                name="workNote"
                rows={6}
                required
                placeholder="What was found, what was done, customer decision..."
                className="rounded-xl border border-border bg-white px-3 py-3 text-base font-semibold normal-case leading-6 tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
              />
            </label>

            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
              Model / serial
              <input
                type="text"
                name="unitModelSerial"
                placeholder="Optional"
                className="rounded-xl border border-border bg-white px-3 py-3 text-base font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
              />
            </label>

            <div className="grid gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">
                Photos
              </p>
              <label className="grid gap-2 text-sm font-bold text-foreground">
                Unit photo
                <input
                  type="file"
                  name="unitPhoto"
                  accept="image/*"
                  capture="environment"
                  className="rounded-xl border border-border bg-white px-3 py-3 text-sm font-semibold text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-black file:text-primary-foreground"
                />
                <span className="text-xs font-semibold text-muted">
                  Take a photo with the phone camera or choose an existing image.
                </span>
              </label>
              <label className="grid gap-2 text-sm font-bold text-foreground">
                Model / serial photo
                <input
                  type="file"
                  name="serialPhoto"
                  accept="image/*"
                  capture="environment"
                  className="rounded-xl border border-border bg-white px-3 py-3 text-sm font-semibold text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-black file:text-primary-foreground"
                />
                <span className="text-xs font-semibold text-muted">
                  Take a photo of the model sticker or choose an existing image.
                </span>
              </label>
              <label className="grid gap-2 text-sm font-bold text-foreground">
                Receipt / part invoice file
                <input
                  type="file"
                  name="receiptPhoto"
                  accept="image/*,application/pdf,.pdf"
                  className="rounded-xl border border-border bg-white px-3 py-3 text-sm font-semibold text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-black file:text-primary-foreground"
                />
                <span className="text-xs font-semibold text-muted">
                  Upload a receipt photo, screenshot, or PDF invoice.
                </span>
              </label>
            </div>
          </div>

          <details className="mt-5 rounded-xl border border-amber-500/20 bg-amber-50 p-4">
            <summary className="cursor-pointer text-sm font-black text-amber-900">
              Technician-owned part used
            </summary>
            <div className="mt-4 grid gap-4">
              <label className="flex items-center gap-3 text-sm font-bold text-amber-950">
                <input type="checkbox" name="partUsed" value="yes" className="h-5 w-5" />
                I used my own part
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
                  Part name
                  <input
                    type="text"
                    name="partName"
                    placeholder="Gas valve, board, igniter..."
                    className="rounded-xl border border-border bg-white px-3 py-3 text-base font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
                  Technician cost
                  <input
                    type="text"
                    inputMode="decimal"
                    name="partCost"
                    placeholder="0.00"
                    className="rounded-xl border border-border bg-white px-3 py-3 text-base font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted sm:col-span-2">
                  Suggested customer charge
                  <input
                    type="text"
                    inputMode="decimal"
                    name="customerCharge"
                    placeholder="Optional"
                    className="rounded-xl border border-border bg-white px-3 py-3 text-base font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted sm:col-span-2">
                  Part note
                  <textarea
                    name="partNote"
                    rows={3}
                    placeholder="Receipt, warranty, customer approval..."
                    className="rounded-xl border border-border bg-white px-3 py-3 text-base font-semibold normal-case leading-6 tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
              </div>
            </div>
          </details>

          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
            Report notes and photos are saved to the internal customer card. Customer invoice totals are not changed automatically.
          </p>

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-primary px-5 py-4 text-base font-black text-primary-foreground transition hover:bg-primary/90"
          >
            Save technician report
          </button>
        </form>
      </div>
    </main>
  );
}
