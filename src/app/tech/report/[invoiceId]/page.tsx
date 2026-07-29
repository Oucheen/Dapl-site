import Link from "next/link";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import {
  listActivitiesForInvoice,
  type LeadActivityRecord,
} from "@/lib/supabase-activity";
import {
  getInvoiceById,
  type InvoiceJobStatus,
  type InvoiceRecord,
} from "@/lib/supabase-invoices";
import { getTelegramUserByTelegramId } from "@/lib/supabase-telegram-users";
import { buildTechnicianInvoiceUrl, verifyTechnicianReportToken } from "@/lib/technician-report-links";
import { submitTechnicianReport } from "./actions";
import { ReportSavedActions } from "./report-saved-actions";
import { SaveReportButton } from "./save-report-button";

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
const PHOTO_UPLOAD_FIELDS = [
  { name: "unitPhoto", label: "Unit photo", accept: "image/*" },
  { name: "serialPhoto", label: "Model / serial photo", accept: "image/*" },
  { name: "partPhoto", label: "Part photo", accept: "image/*" },
  {
    name: "receiptPhoto",
    label: "Receipt / invoice",
    accept: "image/*,application/pdf,.pdf",
  },
];

type StoredReportPhoto = {
  contentType: string;
  field: string;
  label: string;
  originalName: string;
  path: string;
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

function isTechnicianReportPageActivity(activity: LeadActivityRecord) {
  return activity.metadata?.source === "technician_report_page";
}

function getMetadataText(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === "string" ? value : "";
}

function getDetailsValue(details: string | null | undefined, label: string) {
  if (!details) {
    return "";
  }

  const prefix = `${label}:`;
  const line = details.split("\n").find((detailLine) => detailLine.startsWith(prefix));

  return line ? line.slice(prefix.length).trim() : "";
}

function getReportJobStatus(
  invoiceStatus: InvoiceRecord["job_status"],
  reportActivity: LeadActivityRecord | undefined,
) {
  const reportStatus = getMetadataText(reportActivity?.metadata, "jobStatus");

  if (JOB_STATUSES.some((status) => status.value === reportStatus)) {
    return reportStatus as InvoiceJobStatus;
  }

  if (invoiceStatus && JOB_STATUSES.some((status) => status.value === invoiceStatus)) {
    return invoiceStatus;
  }

  return "in_progress";
}

function getStorageReportPhoto(activity: LeadActivityRecord) {
  if (
    activity.event_type !== "telegram_report_photo" ||
    activity.metadata?.source !== "technician_report_page"
  ) {
    return null;
  }

  const photo = activity.metadata.storagePhoto;

  if (!photo || typeof photo !== "object") {
    return null;
  }

  const path = (photo as { path?: unknown }).path;
  const field = (photo as { field?: unknown }).field;
  const label = (photo as { label?: unknown }).label;
  const contentType = (photo as { contentType?: unknown }).contentType;
  const originalName = (photo as { originalName?: unknown }).originalName;

  if (
    typeof path !== "string" ||
    !path.trim() ||
    typeof field !== "string" ||
    !field.trim()
  ) {
    return null;
  }

  return {
    path,
    field,
    label: typeof label === "string" ? label : field,
    contentType: typeof contentType === "string" ? contentType : "",
    originalName: typeof originalName === "string" ? originalName : "",
  };
}

function getStoredPhotosByField(activities: LeadActivityRecord[]) {
  const photosByField = new Map<string, StoredReportPhoto>();

  for (const activity of activities) {
    const photo = getStorageReportPhoto(activity);

    if (!photo || photosByField.has(photo.field)) {
      continue;
    }

    photosByField.set(photo.field, photo);
  }

  return photosByField;
}

function getTechnicianPhotoHref(invoiceId: string, token: string, path: string) {
  return `/tech/report/${invoiceId}/photo/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}?t=${encodeURIComponent(token)}`;
}

function ReportPhotoInput({
  accept,
  currentPhoto,
  invoiceId,
  label,
  name,
  token,
}: {
  accept: string;
  currentPhoto?: StoredReportPhoto;
  invoiceId: string;
  label: string;
  name: string;
  token: string;
}) {
  const photoHref = currentPhoto
    ? getTechnicianPhotoHref(invoiceId, token, currentPhoto.path)
    : "";
  const isPdf = currentPhoto?.contentType === "application/pdf";

  return (
    <label className="grid gap-2 rounded-xl bg-white p-3 text-sm font-bold text-foreground">
      {label}
      {currentPhoto ? (
        <div className="overflow-hidden rounded-lg border border-emerald-600/20 bg-emerald-50">
          {photoHref && !isPdf ? (
            <img
              src={photoHref}
              alt={currentPhoto.label}
              className="aspect-[4/3] w-full bg-white object-cover"
              loading="lazy"
            />
          ) : null}
          <div className="p-3 text-xs leading-5">
            <p className="font-black text-emerald-900">Current file saved</p>
            <p className="mt-1 break-words font-semibold text-emerald-800">
              {currentPhoto.originalName || currentPhoto.label}
            </p>
            {photoHref ? (
              <Link
                href={photoHref}
                target="_blank"
                className="mt-2 inline-flex rounded-lg border border-emerald-700/20 bg-white px-3 py-2 font-black text-emerald-900 transition hover:bg-emerald-100"
              >
                Open current file
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
      <input
        type="file"
        name={name}
        accept={accept}
        className="w-full rounded-lg border border-border bg-white px-2 py-2 text-xs font-semibold text-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-2 file:py-2 file:text-xs file:font-black file:text-primary-foreground"
      />
    </label>
  );
}

function getMoneyPrefill(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) {
    return "";
  }

  return value.toFixed(2);
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
  let invoiceActivities: LeadActivityRecord[] = [];

  try {
    [invoiceResult, telegramUser, invoiceActivities] = await Promise.all([
      getInvoiceById(invoiceId),
      getTelegramUserByTelegramId(telegramUserId),
      listActivitiesForInvoice(invoiceId, 80),
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
  const latestReportActivity = invoiceActivities.find(
    (activity) =>
      activity.event_type === "telegram_visit_report_completed" &&
      isTechnicianReportPageActivity(activity),
  );
  const latestPartActivity = invoiceActivities.find(
    (activity) =>
      activity.event_type === "telegram_report_own_part" &&
      isTechnicianReportPageActivity(activity),
  );
  const defaultJobStatus = getReportJobStatus(invoice.job_status, latestReportActivity);
  const defaultWorkNote =
    getMetadataText(latestReportActivity?.metadata, "workNote") ||
    getDetailsValue(latestReportActivity?.details, "Work note");
  const defaultUnitModelSerial =
    getMetadataText(latestReportActivity?.metadata, "unitModelSerial") ||
    getDetailsValue(latestReportActivity?.details, "Model/serial");
  const defaultPartName = getMetadataText(latestPartActivity?.metadata, "partName");
  const defaultPartCost = getMoneyPrefill(latestPartActivity?.metadata?.partCost);
  const defaultCustomerCharge = getMoneyPrefill(
    latestPartActivity?.metadata?.suggestedCustomerCharge,
  );
  const defaultPartNote = getMetadataText(latestPartActivity?.metadata, "partNote");
  const hasPreviousReport = Boolean(latestReportActivity);
  const storedPhotosByField = getStoredPhotosByField(invoiceActivities);
  const storedPhotoCount = storedPhotosByField.size;
  const invoiceHref =
    buildTechnicianInvoiceUrl(invoice.id, telegramUserId, "") ||
    `/tech/invoice/${invoice.id}?${new URLSearchParams({ t: token ?? "" }).toString()}`;
  const editReportHref = `/tech/report/${invoice.id}?${new URLSearchParams({
    t: token,
  }).toString()}`;

  if (!leadId) {
    return <ReportUnavailable message="This invoice is not linked to a customer card." />;
  }

  const mapsUrl = getMapsSearchUrl(invoice.service_address);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-foreground sm:px-6">
      <div className="mx-auto grid max-w-2xl gap-4">
        {saved === "1" ? (
          <ReportSavedActions
            editHref={editReportHref}
            hasWarning={Boolean(warning)}
            invoiceHref={invoiceHref}
          />
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

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
            DAPL technician report
          </p>
          <h1 className="mt-1 text-2xl font-black leading-tight text-primary sm:text-3xl">
            {invoice.customer_name}
          </h1>
          <p className="mt-1 break-words text-xs font-semibold text-muted sm:text-sm">
            {invoice.invoice_number} / {telegramUser.user.technician_name}
          </p>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 sm:gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Phone</p>
              <p className="mt-1 font-bold">{invoice.customer_phone || "Not set"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Appliance</p>
              <p className="mt-1 font-bold">{invoice.appliance || "Not selected"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Date</p>
              <p className="mt-1 font-bold">{formatDate(invoice.service_date)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Time</p>
              <p className="mt-1 font-bold">{getServiceScheduleLabel(invoice)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
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
          className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5"
        >
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="token" value={token} />

          <div className="grid gap-4">
            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
              Job result
              <select
                name="jobStatus"
                defaultValue={defaultJobStatus}
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
                rows={4}
                required
                defaultValue={defaultWorkNote}
                placeholder="What was found, what was done, customer decision..."
                className="rounded-xl border border-border bg-white px-3 py-3 text-base font-semibold normal-case leading-6 tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
              />
            </label>

            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
              Model / serial
              <input
                type="text"
                name="unitModelSerial"
                defaultValue={defaultUnitModelSerial}
                placeholder="Optional"
                className="rounded-xl border border-border bg-white px-3 py-3 text-base font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
              />
            </label>

            <div className="grid gap-3 rounded-xl border border-primary/10 bg-primary/5 p-3 sm:p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">
                  Photos
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-muted">
                  Take a new photo or choose one from the phone library.
                </p>
              </div>
              {hasPreviousReport ? (
                <p className="rounded-lg bg-white px-3 py-2 text-xs font-bold leading-5 text-muted">
                  Existing photos stay attached. Upload a new file only if you want to replace that photo.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {PHOTO_UPLOAD_FIELDS.map((photoField) => (
                  <ReportPhotoInput
                    key={photoField.name}
                    accept={photoField.accept}
                    currentPhoto={storedPhotosByField.get(photoField.name)}
                    invoiceId={invoice.id}
                    label={photoField.label}
                    name={photoField.name}
                    token={token}
                  />
                ))}
              </div>
            </div>
          </div>

          <details className="mt-4 rounded-xl border border-amber-500/20 bg-amber-50 p-3 sm:p-4">
            <summary className="cursor-pointer text-sm font-black text-amber-900">
              Technician-owned part used
            </summary>
            <div className="mt-4 grid gap-4">
              <label className="flex items-center gap-3 text-sm font-bold text-amber-950">
                <input
                  type="checkbox"
                  name="partUsed"
                  value="yes"
                  defaultChecked={Boolean(latestPartActivity)}
                  className="h-5 w-5"
                />
                I used my own part
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
                  Part name
                  <input
                    type="text"
                    name="partName"
                    defaultValue={defaultPartName}
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
                    defaultValue={defaultPartCost}
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
                    defaultValue={defaultCustomerCharge}
                    placeholder="Optional"
                    className="rounded-xl border border-border bg-white px-3 py-3 text-base font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted sm:col-span-2">
                  Part note
                  <textarea
                    name="partNote"
                    rows={3}
                    defaultValue={defaultPartNote}
                    placeholder="Receipt, warranty, customer approval..."
                    className="rounded-xl border border-border bg-white px-3 py-3 text-base font-semibold normal-case leading-6 tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
              </div>
            </div>
          </details>

          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-muted sm:text-sm sm:leading-6">
            Report notes and photos are saved to the internal customer card. Customer invoice totals are not changed automatically.
          </p>

          <SaveReportButton
            hasPreviousReport={hasPreviousReport}
            storedPhotoCount={storedPhotoCount}
          />
        </form>
      </div>
    </main>
  );
}
