import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logoutAdmin } from "@/app/admin/leads/actions";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import { getPublicInvoicePath, getShortPublicInvoicePath } from "@/lib/invoice-public-link";
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

const navItems = [
  { href: "/app", label: "Today", mark: "T" },
  { href: "/app/search", label: "Search", mark: "S" },
  { href: "/app/parts", label: "Parts", mark: "P" },
  { href: "/app/invoices", label: "Invoices", mark: "I" },
  { href: "/app/more", label: "More", mark: "M" },
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

  const signature = await getLatestInvoiceSignature(invoice.id);
  const paidAmount = calculateInvoicePaidAmount(payments);
  const amountDue = calculateInvoiceAmountDue(invoice, payments);
  const jobStatus = getJobStatus(invoice);
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
    <main className="min-h-screen bg-slate-100 pb-24 text-foreground">
      <section className="bg-primary text-white">
        <div className="container-shell py-5 sm:py-7">
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

      <section className="container-shell grid gap-4 py-4 sm:py-6 lg:grid-cols-[1fr_0.85fr]">
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

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Total</p>
              <p className="mt-1 text-lg font-black text-primary">{formatMoney(invoice.total)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Paid</p>
              <p className="mt-1 text-lg font-black text-emerald-700">{formatMoney(paidAmount)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Due</p>
              <p className="mt-1 text-lg font-black text-accent">{formatMoney(amountDue)}</p>
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
          <div className="mt-4 grid grid-cols-5 gap-2">
            <a href="#charges" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-2 text-center text-xs font-black text-primary">
              Charges
            </a>
            <Link href={`/app/invoices/${invoice.id}`} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-2 text-center text-xs font-black text-primary">
              Report
            </Link>
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
          </div>
        </aside>

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
                  <div className="mt-2 grid grid-cols-[0.75fr_1fr_1fr] gap-2">
                    <input
                      name="quantity"
                      inputMode="decimal"
                      defaultValue={String(item.quantity ?? 1)}
                      disabled={isLineItemsLocked}
                      className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary disabled:bg-slate-100"
                    />
                    <input
                      name="unitPrice"
                      inputMode="decimal"
                      defaultValue={Number(item.unit_price ?? 0).toFixed(2)}
                      disabled={isLineItemsLocked}
                      className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary disabled:bg-slate-100"
                    />
                    <div className="grid min-h-11 place-items-center rounded-lg border border-border bg-white px-2 text-sm font-black text-primary">
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
            <div className="grid grid-cols-[1fr_1fr] gap-2">
              <input
                name="amount"
                inputMode="decimal"
                defaultValue={amountDue > 0 ? amountDue.toFixed(2) : ""}
                placeholder="Amount"
                className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary"
              />
              <select
                name="method"
                defaultValue="cash"
                className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary"
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

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5 px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-black ${
                item.href === "/app/invoices" ? "bg-primary/5 text-primary" : "text-muted"
              }`}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[0.65rem] text-primary">
                {item.mark}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
