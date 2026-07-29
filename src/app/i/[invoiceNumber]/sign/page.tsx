import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicInvoicePath, isValidInvoiceAccessCode } from "@/lib/invoice-public-link";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import {
  calculateInvoiceAmountDue,
  calculateInvoicePaidAmount,
  getInvoiceByNumber,
} from "@/lib/supabase-invoices";
import { getLatestInvoiceSignature } from "@/lib/supabase-invoice-signatures";
import { savePublicInvoiceSignatureAction } from "./actions";
import { SignaturePadFields } from "./signature-pad-fields";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign Invoice | DAPL Appliance Repair",
  robots: {
    index: false,
    follow: false,
  },
};

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

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
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

function getServiceScheduleLabel(invoice: { service_time?: string | null; service_window?: string | null }) {
  const serviceTime = formatServiceTime(invoice.service_time);

  if (serviceTime && invoice.service_window) {
    return `${serviceTime} (${invoice.service_window})`;
  }

  return serviceTime || invoice.service_window || "Not set";
}

export default async function PublicInvoiceSignaturePage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceNumber: string }>;
  searchParams: Promise<{
    c?: string | string[] | undefined;
    signature?: string | string[] | undefined;
  }>;
}) {
  const { invoiceNumber } = await params;
  const query = await searchParams;
  const accessCode = Array.isArray(query.c) ? query.c[0] : query.c;
  const signatureStatus = Array.isArray(query.signature) ? query.signature[0] : query.signature;
  const decodedInvoiceNumber = decodeURIComponent(invoiceNumber);

  if (!isValidInvoiceAccessCode(decodedInvoiceNumber, accessCode || "")) {
    notFound();
  }

  const invoiceData = await getInvoiceByNumber(decodedInvoiceNumber);

  if (!invoiceData) {
    notFound();
  }

  const { invoice, payments } = invoiceData;
  const signature = await getLatestInvoiceSignature(invoice.id);
  const paidAmount = calculateInvoicePaidAmount(payments);
  const amountDue = calculateInvoiceAmountDue(invoice, payments);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-5">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.jpg"
              alt="DAPL Appliance Repair logo"
              width={96}
              height={96}
              className="h-16 w-16 object-contain"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/70">
                DAPL Appliance Repair
              </p>
              <h1 className="mt-1 text-2xl font-black text-primary">Invoice signature</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">{invoice.invoice_number}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 px-5 py-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Customer</p>
            <p className="mt-2 text-xl font-black text-primary">{invoice.customer_name}</p>
            {invoice.customer_phone ? (
              <p className="mt-1 font-semibold text-slate-700">{invoice.customer_phone}</p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Balance</p>
            <p className="mt-2 text-xl font-black text-primary">{formatMoney(amountDue)}</p>
            <p className="mt-1 text-sm text-slate-500">
              Total {formatMoney(invoice.total)}
              {paidAmount > 0 ? ` / paid ${formatMoney(paidAmount)}` : ""}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Service</p>
            <p className="mt-2 font-bold text-primary">{invoice.appliance || "Appliance service"}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {formatDate(invoice.service_date)} / {getServiceScheduleLabel(invoice)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Address</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{invoice.service_address || "Not set"}</p>
          </div>
        </div>

        <section className="px-5 py-5">
          {signatureStatus === "saved" ? (
            <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              Signature saved. Thank you.
            </div>
          ) : null}
          {signatureStatus === "error" ? (
            <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-800">
              Signature could not be saved. Please try again or contact the office.
            </div>
          ) : null}

          {signature ? (
            <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                Current signature
              </p>
              <img
                src={signature.signature_data_url}
                alt="Customer signature"
                className="mt-3 max-h-28 rounded-xl border border-emerald-500/20 bg-white object-contain"
              />
              <p className="mt-3 text-sm font-semibold text-emerald-900">
                Signed by {signature.signer_name} on {formatDateTime(signature.signed_at)} ET.
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Saving again will replace the visible signature with the newest one.
              </p>
            </div>
          ) : null}

          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            By signing, the customer confirms that the invoice and service terms were reviewed. This
            signature does not mark the invoice paid or change the invoice status automatically.
          </div>

          <SignaturePadFields
            action={savePublicInvoiceSignatureAction}
            defaultSignerName={invoice.customer_name}
            invoiceNumber={decodedInvoiceNumber}
            accessCode={accessCode || ""}
          />

          <Link
            href={getPublicInvoicePath(decodedInvoiceNumber)}
            className="mt-4 inline-flex w-full justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-primary transition hover:bg-slate-50"
          >
            Back to invoice
          </Link>
        </section>
      </article>
    </main>
  );
}
