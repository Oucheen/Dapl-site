import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  type InvoiceStatus,
  getInvoiceById,
} from "@/lib/supabase-invoices";
import { updateInvoiceStatusAction } from "./actions";

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

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  const { invoiceId } = await params;
  const invoiceData = await getInvoiceById(invoiceId);

  if (!invoiceData) {
    notFound();
  }

  const { invoice, items } = invoiceData;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white">
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

      <section className="container-shell py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="border-b border-border px-5 py-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Customer
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xl font-black text-primary">{invoice.customer_name}</p>
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
                </div>
                <div className="text-sm leading-6 text-muted">
                  <p className="font-bold text-foreground">Service address</p>
                  <p className="mt-1 break-words">{invoice.service_address || "Not set"}</p>
                  <p className="mt-3 font-bold text-foreground">Service date</p>
                  <p className="mt-1">{formatDate(invoice.service_date)}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Appliance
                  </p>
                  <p className="mt-2 font-bold text-foreground">
                    {invoice.appliance || "Not selected"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Technician
                  </p>
                  <p className="mt-2 font-bold text-foreground">
                    {invoice.assigned_technician || "Not assigned"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Created
                  </p>
                  <p className="mt-2 font-bold text-foreground">
                    {formatDate(invoice.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-border">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Unit</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 font-semibold text-foreground">
                          {item.description}
                        </td>
                        <td className="px-4 py-4 text-right text-muted">{item.quantity}</td>
                        <td className="px-4 py-4 text-right text-muted">
                          {formatMoney(item.unit_price)}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-foreground">
                          {formatMoney(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invoice.notes ? (
                <div className="mt-6 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                    {invoice.notes}
                  </p>
                </div>
              ) : null}
            </div>
          </article>

          <aside className="self-start rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Invoice controls
            </p>
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
              PDF and email sending will be the next layer after invoice records are stable.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
