import Image from "next/image";
import Link from "next/link";
import { getPublicInvoicePath, getShortPublicInvoicePath } from "@/lib/invoice-public-link";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import {
  calculateInvoiceAmountDue,
  calculateInvoicePaidAmount,
  getInvoiceById,
  type InvoiceRecord,
  type InvoiceStatus,
} from "@/lib/supabase-invoices";
import { getLatestInvoiceSignature } from "@/lib/supabase-invoice-signatures";
import { getTelegramUserByTelegramId } from "@/lib/supabase-telegram-users";
import {
  buildTechnicianReportUrl,
  verifyTechnicianReportToken,
} from "@/lib/technician-report-links";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Technician Invoice | DAPL Appliance Repair",
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

const noticeMessages: Record<string, string> = {
  signature_saved: "Customer signature saved. Review the invoice and continue.",
  tech_report_saved: "Technician report saved. Review charges and continue.",
  tech_report_saved_photo_warning: "Technician report saved, but one or more photos could not upload.",
};

function TechInvoiceUnavailable({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-foreground">
      <div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center">
        <section className="rounded-2xl border border-red-500/20 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
            Invoice unavailable
          </p>
          <h1 className="mt-3 text-3xl font-black text-primary">This invoice link cannot be opened.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-muted">{message}</p>
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
            Ask the office to resend the job from Telegram, then open the latest Invoice button.
          </p>
        </section>
      </div>
    </main>
  );
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(new Date(value));
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

function normalizePhoneForHref(phone: string | null | undefined) {
  const digits = phone?.replace(/[^\d+]/g, "") ?? "";

  if (!digits) {
    return "";
  }

  return digits.startsWith("+") ? digits : `+1${digits.replace(/^1/, "")}`;
}

function getMapsSearchUrl(address: string | null | undefined) {
  const normalizedAddress = address?.trim();

  if (!normalizedAddress) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedAddress)}`;
}

function canTechnicianOpenInvoice(input: {
  assignedTechnician: string | null;
  technicianName: string;
  role: string;
}) {
  if (input.role === "owner" || input.role === "dispatcher") {
    return true;
  }

  const assignedTechnician = input.assignedTechnician?.trim().toLowerCase();

  if (!assignedTechnician) {
    return true;
  }

  return assignedTechnician === input.technicianName.trim().toLowerCase();
}

export default async function TechnicianInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams?: Promise<{
    notice?: string | string[];
    t?: string | string[];
  }>;
}) {
  const { invoiceId } = await params;
  const query = await searchParams;
  const token = Array.isArray(query?.t) ? query?.t[0] : query?.t;
  const notice = Array.isArray(query?.notice) ? query?.notice[0] : query?.notice;
  const telegramUserId = verifyTechnicianReportToken(invoiceId, token);

  if (!telegramUserId) {
    return <TechInvoiceUnavailable message="The link is invalid. Open the invoice from the latest Telegram job message." />;
  }

  const [invoiceData, telegramUser] = await Promise.all([
    getInvoiceById(invoiceId),
    getTelegramUserByTelegramId(telegramUserId),
  ]);

  if (!invoiceData) {
    return <TechInvoiceUnavailable message="This invoice was not found." />;
  }

  if (!telegramUser.user) {
    return <TechInvoiceUnavailable message="Technician access is not active." />;
  }

  const { invoice, items, payments } = invoiceData;

  if (
    !canTechnicianOpenInvoice({
      assignedTechnician: invoice.assigned_technician,
      technicianName: telegramUser.user.technician_name,
      role: telegramUser.user.role,
    })
  ) {
    return <TechInvoiceUnavailable message="This job is assigned to another technician." />;
  }

  const [signature] = await Promise.all([getLatestInvoiceSignature(invoice.id)]);
  const paidAmount = calculateInvoicePaidAmount(payments);
  const amountDue = calculateInvoiceAmountDue(invoice, payments);
  const phoneHref = normalizePhoneForHref(invoice.customer_phone);
  const mapsUrl = getMapsSearchUrl(invoice.service_address);
  const reportUrl = buildTechnicianReportUrl(invoice.id, telegramUser.user.telegram_user_id, "");
  const publicInvoicePath = getPublicInvoicePath(invoice.invoice_number);
  const publicInvoiceShortPath = getShortPublicInvoicePath(invoice.invoice_number);
  const returnTo = `/tech/invoice/${invoice.id}?${new URLSearchParams({ t: token ?? "" }).toString()}`;
  const signatureParams = new URLSearchParams(publicInvoicePath.split("?")[1] ?? "");
  signatureParams.set("returnTo", returnTo);
  const signatureHref = `/i/${encodeURIComponent(invoice.invoice_number)}/sign?${signatureParams.toString()}`;

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 pb-28 text-foreground sm:px-6">
      <div className="mx-auto grid max-w-3xl gap-4">
        {notice && noticeMessages[notice] ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
            {noticeMessages[notice]}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border bg-slate-50 p-4">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.jpg"
                alt="DAPL Appliance Repair logo"
                width={96}
                height={96}
                className="h-16 w-16 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">
                  DAPL technician invoice
                </p>
                <h1 className="mt-1 break-words text-2xl font-black leading-tight text-primary">
                  {invoice.customer_name}
                </h1>
                <p className="mt-1 break-words text-xs font-semibold text-muted">
                  {invoice.invoice_number} / {telegramUser.user.technician_name}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${statusClasses[invoice.status]}`}>
                {invoice.status}
              </span>
              <span className="rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-black text-primary">
                Due {formatMoney(amountDue)}
              </span>
              {signature ? (
                <span className="rounded-full border border-emerald-500/25 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  Signed
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Phone</p>
              <p className="mt-1 break-words text-base font-black">{invoice.customer_phone || "Not set"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Appliance</p>
              <p className="mt-1 break-words text-base font-black">{invoice.appliance || "Not selected"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Date</p>
              <p className="mt-1 break-words text-base font-black">{formatDate(invoice.service_date)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Time</p>
              <p className="mt-1 break-words text-base font-black">{getServiceScheduleLabel(invoice)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Address</p>
              <p className="mt-1 break-words text-base font-black">{invoice.service_address || "Not set"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Quick actions</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {phoneHref ? (
              <Link href={`tel:${phoneHref}`} className="rounded-xl bg-primary px-3 py-3 text-center text-sm font-black text-primary-foreground">
                Call
              </Link>
            ) : null}
            {mapsUrl ? (
              <Link href={mapsUrl} className="rounded-xl border border-primary/15 bg-white px-3 py-3 text-center text-sm font-black text-primary">
                Maps
              </Link>
            ) : null}
            {reportUrl ? (
              <Link href={reportUrl} className="rounded-xl border border-primary/15 bg-white px-3 py-3 text-center text-sm font-black text-primary">
                Report
              </Link>
            ) : null}
            <Link href={signatureHref} className="rounded-xl border border-primary/15 bg-white px-3 py-3 text-center text-sm font-black text-primary">
              Signature
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Charges</p>
              <h2 className="mt-1 text-xl font-black text-primary">Services and charges</h2>
            </div>
            <Link
              href={publicInvoiceShortPath || publicInvoicePath}
              className="shrink-0 rounded-xl border border-primary/15 bg-white px-3 py-2 text-xs font-black text-primary"
            >
              View
            </Link>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {items.length ? (
              items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-border p-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black">{item.description}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">
                      Qty {Number(item.quantity ?? 0)} x {formatMoney(item.unit_price)}
                    </p>
                  </div>
                  <p className="text-sm font-black text-primary">{formatMoney(item.line_total)}</p>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm font-semibold text-muted">No customer-facing charges yet.</p>
            )}
          </div>

          <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted">Subtotal</span>
              <span className="font-black">{formatMoney(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Tax</span>
              <span className="font-black">{formatMoney(invoice.tax)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-2 text-base">
              <span className="font-black">Total</span>
              <span className="font-black text-primary">{formatMoney(invoice.total)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Paid</span>
              <span className="font-black text-emerald-700">{formatMoney(paidAmount)}</span>
            </div>
            <div className="flex justify-between gap-3 text-lg">
              <span className="font-black">Amount due</span>
              <span className="font-black text-primary">{formatMoney(amountDue)}</span>
            </div>
          </div>
        </section>

        {signature ? (
          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Customer signed</p>
            <p className="mt-2 text-sm font-bold text-emerald-950">
              Signed by {signature.signer_name} on {formatDateTime(signature.signed_at)} ET for {formatMoney(invoice.total)}.
            </p>
            <img
              src={signature.signature_data_url}
              alt="Customer signature"
              className="mt-3 max-h-28 rounded-xl border border-emerald-600/20 bg-white object-contain p-3"
            />
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
          {reportUrl ? (
            <Link href={reportUrl} className="rounded-xl border border-primary/15 bg-white px-3 py-3 text-center text-sm font-black text-primary">
              Report
            </Link>
          ) : null}
          <Link href={signatureHref} className="rounded-xl border border-primary/15 bg-white px-3 py-3 text-center text-sm font-black text-primary">
            Sign
          </Link>
          <Link href={publicInvoiceShortPath || publicInvoicePath} className="rounded-xl bg-primary px-3 py-3 text-center text-sm font-black text-primary-foreground">
            View invoice
          </Link>
        </div>
      </div>
    </main>
  );
}
