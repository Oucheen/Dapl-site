import Link from "next/link";
import { notFound } from "next/navigation";
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
  searchParams?: Promise<{ t?: string | string[]; saved?: string | string[] }>;
}) {
  const { invoiceId } = await params;
  const query = await searchParams;
  const token = Array.isArray(query?.t) ? query?.t[0] : query?.t;
  const saved = Array.isArray(query?.saved) ? query?.saved[0] : query?.saved;
  const telegramUserId = verifyTechnicianReportToken(invoiceId, token);

  if (!telegramUserId) {
    notFound();
  }

  const [invoiceResult, telegramUser] = await Promise.all([
    getInvoiceById(invoiceId),
    getTelegramUserByTelegramId(telegramUserId),
  ]);

  if (!invoiceResult || !telegramUser.user || !token) {
    notFound();
  }

  const invoice = invoiceResult.invoice;
  const leadId = invoice.lead_id;

  if (!leadId) {
    notFound();
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

        <form action={submitTechnicianReport} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
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
            Photos still stay in the Telegram report flow. This page saves the visit result and part notes to the customer card.
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
