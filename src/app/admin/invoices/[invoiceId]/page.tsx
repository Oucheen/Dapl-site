import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listActivitiesForInvoice } from "@/lib/supabase-activity";
import { type InvoiceItemRecord, type InvoiceStatus, getInvoiceById } from "@/lib/supabase-invoices";
import {
  addInvoiceItemAction,
  deleteInvoiceItemAction,
  markInvoiceCompletedAction,
  sendInvoiceEmailAction,
  updateInvoiceItemsAction,
  updateInvoiceStatusAction,
} from "./actions";
import { PrintButton } from "./print-button";

const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

const statusClasses: Record<InvoiceStatus, string> = {
  draft: "border-primary/20 bg-primary/5 text-primary",
  sent: "border-amber-500/25 bg-amber-50 text-amber-700",
  paid: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  void: "border-slate-300 bg-slate-100 text-slate-500",
};

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatInputMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return amount.toFixed(2);
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

function getEmailStatus(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getEmailNotice(status: string | undefined, customerEmail: string | null) {
  if (status === "sent") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Invoice email sent",
      body: customerEmail
        ? `The invoice was sent to ${customerEmail}.`
        : "The invoice email was sent.",
    };
  }

  if (status === "missing_email") {
    return {
      className: "border-amber-500/20 bg-amber-50 text-amber-800",
      title: "Customer email is missing",
      body: "Add a customer email before sending this invoice.",
    };
  }

  if (status === "config") {
    return {
      className: "border-amber-500/20 bg-amber-50 text-amber-800",
      title: "Resend is not configured",
      body: "Add RESEND_API_KEY and CONTACT_FROM_EMAIL in Vercel before sending invoice emails.",
    };
  }

  if (status === "send_error") {
    return {
      className: "border-accent/20 bg-accent/5 text-accent",
      title: "Invoice email was not sent",
      body: "Resend returned an error. Check Vercel logs for the exact delivery issue.",
    };
  }

  return null;
}

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ email?: string | string[] | undefined }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const { invoiceId } = await params;
  const query = await searchParams;
  const invoiceData = await getInvoiceById(invoiceId);

  if (!invoiceData) {
    notFound();
  }

  const { invoice, items } = invoiceData;
  const activity = await listActivitiesForInvoice(invoice.id, 8);
  const emailNotice = getEmailNotice(getEmailStatus(query.email), invoice.customer_email);

  return (
    <main className="min-h-screen bg-background text-foreground print:bg-white print:text-slate-950">
      <header className="border-b border-border bg-white print:hidden">
        <div className="container-shell flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/leads"
              className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70"
            >
              Back to leads
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Invoice {invoice.invoice_number}
            </h1>
          </div>
          <span
            className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-bold ${statusClasses[invoice.status]}`}
          >
            {invoice.status}
          </span>
        </div>
      </header>

      <section className="container-shell py-8 print:max-w-none print:px-0 print:py-0">
        {emailNotice ? (
          <div
            className={`mb-5 rounded-2xl border px-5 py-4 text-sm shadow-sm print:hidden ${emailNotice.className}`}
          >
            <p className="font-black">{emailNotice.title}</p>
            <p className="mt-1 leading-6">{emailNotice.body}</p>
          </div>
        ) : null}

        <div className="grid gap-6 print:block xl:grid-cols-[minmax(0,1fr)_360px]">
          <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
            <div className="border-b border-border bg-slate-50/80 px-5 py-5 print:bg-white print:px-0 sm:px-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <Image
                    src="/logo.jpg"
                    alt="Dapl Appliance Repair logo"
                    width={76}
                    height={76}
                    className="h-16 w-16 object-contain"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/70">
                      Dapl Appliance Repair
                    </p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-muted">
                      9401 Peckham Rye Rd, Charlotte, NC 28227
                    </p>
                    <p className="mt-2 max-w-sm text-xs leading-5 text-muted">
                      Dapl Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Invoice
                  </p>
                  <p className="mt-1 text-xl font-black text-primary">
                    {invoice.invoice_number}
                  </p>
                  <p className="mt-2 text-sm text-muted">Created {formatDate(invoice.created_at)}</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-muted">
                    Status: {invoice.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 border-b border-border px-5 py-5 print:px-0 sm:grid-cols-2 sm:px-7">
              <section>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Bill to
                </p>
                <p className="mt-3 text-xl font-black text-primary">{invoice.customer_name}</p>
                {invoice.customer_phone ? (
                  <a
                    href={`tel:${invoice.customer_phone}`}
                    className="mt-2 block font-semibold text-foreground hover:text-primary"
                  >
                    {invoice.customer_phone}
                  </a>
                ) : null}
                {invoice.customer_email ? (
                  <a
                    href={`mailto:${invoice.customer_email}`}
                    className="mt-1 block break-words text-muted hover:text-primary"
                  >
                    {invoice.customer_email}
                  </a>
                ) : null}
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

            <form action={updateInvoiceItemsAction} className="px-5 py-5 print:hidden sm:px-7">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Line items
                  </p>
                  <h2 className="mt-1 text-xl font-black text-primary">Services and charges</h2>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  Save invoice items
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-border">
                <div className="hidden grid-cols-[minmax(0,1fr)_90px_130px_130px_90px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:grid">
                  <span>Description</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Unit</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_90px_130px_130px_90px] lg:items-center"
                    >
                      <input type="hidden" name="itemId" value={item.id} />
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:block">
                        <span className="lg:hidden">Description</span>
                        <input
                          type="text"
                          name="description"
                          defaultValue={item.description}
                          required
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:block">
                        <span className="lg:hidden">Qty</span>
                        <input
                          type="number"
                          name="quantity"
                          defaultValue={formatQuantity(item.quantity)}
                          min="0.01"
                          step="0.01"
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 lg:text-right"
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:block">
                        <span className="lg:hidden">Unit</span>
                        <input
                          type="number"
                          name="unitPrice"
                          defaultValue={formatInputMoney(item.unit_price)}
                          min="0"
                          step="0.01"
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 lg:text-right"
                        />
                      </label>
                      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-black text-primary lg:bg-transparent lg:px-0 lg:text-right">
                        {getLineTotal(item)}
                      </div>
                      <button
                        type="submit"
                        form={`delete-invoice-item-${item.id}`}
                        className="rounded-lg border border-accent/20 bg-white px-3 py-2 text-xs font-bold text-accent transition hover:bg-accent/5"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            {items.map((item) => (
              <form
                key={`delete-${item.id}`}
                id={`delete-invoice-item-${item.id}`}
                action={deleteInvoiceItemAction}
                className="hidden"
              >
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <input type="hidden" name="itemId" value={item.id} />
              </form>
            ))}

            <div className="hidden px-5 py-6 print:block print:px-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Line items
              </p>
              <h2 className="mt-1 text-xl font-black text-primary">Services and charges</h2>

              <table className="mt-5 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    <th className="py-3 pr-4">Description</th>
                    <th className="py-3 pr-4 text-right">Qty</th>
                    <th className="py-3 pr-4 text-right">Unit</th>
                    <th className="py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="py-3 pr-4 font-semibold text-foreground">
                        {item.description}
                      </td>
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

              <div className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-bold text-foreground">{formatMoney(invoice.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Tax</span>
                  <span className="font-bold text-foreground">{formatMoney(invoice.tax)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-lg">
                  <span className="font-black text-primary">Total</span>
                  <span className="font-black text-primary">{formatMoney(invoice.total)}</span>
                </div>
              </div>
            </div>

            <form action={addInvoiceItemAction} className="border-t border-border px-5 py-5 print:hidden sm:px-7">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <button
                type="submit"
                className="rounded-lg border border-primary/20 bg-white px-4 py-3 text-xs font-bold text-primary transition hover:bg-primary/5"
              >
                Add line item
              </button>
            </form>

            {invoice.notes ? (
              <div className="border-t border-border px-5 py-5 print:hidden sm:px-7">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Internal notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                  {invoice.notes}
                </p>
              </div>
            ) : null}
          </article>

          <aside className="self-start rounded-2xl border border-border bg-white p-5 shadow-sm print:hidden">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Invoice controls
            </p>
            <div className="mt-4">
              <PrintButton />
            </div>
            <form action={sendInvoiceEmailAction} className="mt-3">
              <input type="hidden" name="id" value={invoice.id} />
              <button
                type="submit"
                disabled={!invoice.customer_email}
                className="w-full rounded-lg bg-accent px-3 py-3 text-xs font-bold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {invoice.status === "sent" ? "Re-send invoice email" : "Send invoice email"}
              </button>
              {!invoice.customer_email ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  Customer email is missing, so this invoice cannot be sent yet.
                </p>
              ) : null}
            </form>
            {invoice.status !== "paid" && invoice.status !== "void" ? (
              <form action={markInvoiceCompletedAction} className="mt-3">
                <input type="hidden" name="id" value={invoice.id} />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 px-3 py-3 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  Mark job completed
                </button>
              </form>
            ) : null}
            <form action={updateInvoiceStatusAction} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={invoice.id} />
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Status
                <select
                  name="status"
                  defaultValue={invoice.status}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                >
                  {INVOICE_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                Save invoice status
              </button>
            </form>

            <div className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-bold text-foreground">{formatMoney(invoice.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Tax</span>
                <span className="font-bold text-foreground">{formatMoney(invoice.tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-lg">
                <span className="font-black text-primary">Total</span>
                <span className="font-black text-primary">{formatMoney(invoice.total)}</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-muted">
              Email sends the current invoice details to the customer through Resend.
              Draft invoices are automatically marked as sent after successful delivery.
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Activity
              </p>
              {activity.length > 0 ? (
                <ul className="mt-4 space-y-4">
                  {activity.map((item) => (
                    <li key={item.id} className="flex gap-3 text-sm leading-5">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      <span>
                        <span className="block font-bold text-foreground">{item.title}</span>
                        {item.details ? (
                          <span className="block text-muted">{item.details}</span>
                        ) : null}
                        <span className="mt-1 block text-xs font-semibold text-muted">
                          {formatDateTime(item.created_at)} ET
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted">
                  No invoice activity recorded yet.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
