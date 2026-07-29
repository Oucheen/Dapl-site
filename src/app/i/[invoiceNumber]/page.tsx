import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidInvoiceAccessCode } from "@/lib/invoice-public-link";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import {
  calculateInvoiceAmountDue,
  calculateInvoicePaidAmount,
  getInvoiceByNumber,
  type InvoiceItemRecord,
} from "@/lib/supabase-invoices";
import { getLatestInvoiceSignature } from "@/lib/supabase-invoice-signatures";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoice | DAPL Appliance Repair",
  robots: {
    index: false,
    follow: false,
  },
};

const BUSINESS_EMAIL = process.env.CONTACT_TO_EMAIL || "dapl.appliance.repair@gmail.com";
const INVOICE_TERMS = [
  "90-day labor and parts warranty.",
  "No warranty is provided for maintenance, cleaning of units, or defrosting of refrigerators and freezers.",
  "Our company and technicians are not responsible for other problems that arise with household appliances after the technician leaves your home.",
  "If a deposit is made for a spare part and the customer refuses repair, the company will retain an additional 25% of the order value as a restocking fee, with a minimum fee of $30.",
  "Thank you for choosing our company. Our main task is to leave a good memory and working household appliances. Take care of yourself.",
];
const INVOICE_TAX_NOTE =
  "Sales tax on parts was paid at the time of purchase. No sales tax is charged to the customer.";

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

function formatQuantity(value: number | string | null | undefined) {
  const amount = Number(value ?? 1);

  if (!Number.isFinite(amount)) {
    return "1";
  }

  return String(amount);
}

function getLineTotal(item: InvoiceItemRecord) {
  return formatMoney(Number(item.quantity ?? 0) * Number(item.unit_price ?? 0));
}

function isPlaceholderCustomerEmail(value: string | null | undefined) {
  return Boolean(value?.trim().toLowerCase().endsWith("@daplappliance.local"));
}

export default async function PublicInvoicePage({
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

  const { invoice, items, payments } = invoiceData;
  const signature = await getLatestInvoiceSignature(invoice.id);
  const paidAmount = calculateInvoicePaidAmount(payments);
  const amountDue = calculateInvoiceAmountDue(invoice, payments);
  const discountAmount = Number(invoice.discount_amount ?? 0);
  const hasDiscount = Number.isFinite(discountAmount) && discountAmount > 0;
  const discountLabel = invoice.promo_code ? `Discount (${invoice.promo_code})` : "Discount";
  const customerEmail = isPlaceholderCustomerEmail(invoice.customer_email)
    ? null
    : invoice.customer_email;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.jpg"
                alt="DAPL Appliance Repair logo"
                width={96}
                height={96}
                className="h-20 w-20 object-contain"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/70">
                  DAPL Appliance Repair
                </p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  9401 Peckham Rye Rd, Charlotte, NC 28227
                </p>
                <p className="text-sm leading-6 text-muted">{BUSINESS_EMAIL}</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Invoice</p>
              <h1 className="mt-1 text-2xl font-black text-primary">{invoice.invoice_number}</h1>
              <p className="mt-2 text-sm font-semibold capitalize text-muted">
                Status: {invoice.status}
              </p>
            </div>
          </div>
        </div>

        {signatureStatus === "saved" ? (
          <div className="border-b border-emerald-500/20 bg-emerald-50 px-6 py-4 text-sm font-bold text-emerald-800 sm:px-8">
            Signature saved. Thank you.
          </div>
        ) : null}

        <div className="grid gap-6 border-b border-slate-200 px-6 py-6 sm:grid-cols-2 sm:px-8">
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Bill to</p>
            <p className="mt-3 text-xl font-black text-primary">{invoice.customer_name}</p>
            {invoice.customer_phone ? (
              <p className="mt-2 font-semibold text-foreground">{invoice.customer_phone}</p>
            ) : null}
            {customerEmail ? <p className="mt-1 break-words text-muted">{customerEmail}</p> : null}
          </section>

          <section className="grid gap-4 text-sm leading-6 text-muted sm:grid-cols-2">
            <div>
              <p className="font-bold text-foreground">Service address</p>
              <p className="mt-1 break-words">{invoice.service_address || "Not set"}</p>
            </div>
            <div>
              <p className="font-bold text-foreground">Service date</p>
              <p className="mt-1">{formatDate(invoice.service_date)}</p>
            </div>
            <div>
              <p className="font-bold text-foreground">Appliance</p>
              <p className="mt-1">{invoice.appliance || "Not selected"}</p>
            </div>
            <div>
              <p className="font-bold text-foreground">Technician</p>
              <p className="mt-1">{invoice.assigned_technician || "Not assigned"}</p>
            </div>
          </section>
        </div>

        <section className="px-6 py-6 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Line items</p>
          <h2 className="mt-1 text-xl font-black text-primary">Services and charges</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  <th className="py-3 pr-4">Description</th>
                  <th className="py-3 pr-4 text-right">Qty</th>
                  <th className="py-3 pr-4 text-right">Unit</th>
                  <th className="py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="py-3 pr-4 font-semibold text-foreground">{item.description}</td>
                    <td className="py-3 pr-4 text-right text-muted">
                      {formatQuantity(item.quantity)}
                    </td>
                    <td className="py-3 pr-4 text-right text-muted">
                      {formatMoney(item.unit_price)}
                    </td>
                    <td className="py-3 text-right font-bold text-foreground">
                      {getLineTotal(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="font-bold text-foreground">{formatMoney(invoice.subtotal)}</span>
            </div>
            {hasDiscount ? (
              <div className="flex items-center justify-between">
                <span className="text-muted">{discountLabel}</span>
                <span className="font-bold text-accent">-{formatMoney(discountAmount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-muted">Tax</span>
              <span className="font-bold text-foreground">{formatMoney(invoice.tax)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Total</span>
              <span className="font-black text-primary">{formatMoney(invoice.total)}</span>
            </div>
            {paidAmount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-muted">Payments received</span>
                <span className="font-bold text-emerald-700">{formatMoney(paidAmount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg">
              <span className="font-black text-primary">Amount due</span>
              <span className="font-black text-primary">{formatMoney(amountDue)}</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {signature ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                  Customer signed
                </p>
                <img
                  src={signature.signature_data_url}
                  alt="Customer signature"
                  className="mt-3 max-h-24 rounded-xl border border-slate-200 bg-white object-contain p-2"
                />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Signed by {signature.signer_name} on {formatDateTime(signature.signed_at)} ET for{" "}
                  {formatMoney(invoice.total)}.
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Invoice {invoice.invoice_number} was accepted electronically.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Customer signature
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Review the invoice and sign after service is complete.
                  </p>
                </div>
                <Link
                  href={`/i/${encodeURIComponent(decodedInvoiceNumber)}/sign?c=${encodeURIComponent(accessCode || "")}`}
                  className="inline-flex justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  Review and sign
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-slate-200 px-6 py-6 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Terms and warranty
          </p>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-muted sm:grid-cols-2">
            {INVOICE_TERMS.map((term) => (
              <p key={term}>{term}</p>
            ))}
            <p className="sm:col-span-2">
              <span className="font-bold text-foreground">Note:</span> {INVOICE_TAX_NOTE}
            </p>
          </div>
        </section>
      </article>
    </main>
  );
}
