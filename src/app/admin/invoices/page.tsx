import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { type InvoiceStatus, listInvoices } from "@/lib/supabase-invoices";

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

function invoiceCountLabel(count: number) {
  return count === 1 ? "invoice" : "invoices";
}

export default async function InvoicesAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
  let error = "";

  try {
    invoices = await listInvoices(200);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load invoices.";
  }

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
              Website invoices
            </h1>
          </div>
          <Link
            href="/admin/leads"
            className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
          >
            View leads
          </Link>
        </div>
      </header>

      <section className="container-shell py-8">
        {error ? (
          <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5 text-sm leading-6 text-foreground">
            <p className="font-bold text-accent">Could not load Supabase invoices.</p>
            <p className="mt-2 font-mono text-xs">{error}</p>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-black text-primary">Latest invoices</h2>
            <p className="mt-1 text-sm text-muted">
              Showing the newest {invoices.length} {invoiceCountLabel(invoices.length)}.
            </p>
          </div>

          {invoices.length === 0 && !error ? (
            <div className="px-5 py-12 text-center">
              <p className="text-lg font-bold text-primary">No invoices yet</p>
              <p className="mt-2 text-sm text-muted">
                Create an invoice from a lead and it will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 md:grid-cols-[1fr_1fr_140px_120px]"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Invoice
                    </p>
                    <p className="mt-2 font-black text-primary">{invoice.invoice_number}</p>
                    <p className="mt-1 text-sm text-muted">{formatDate(invoice.created_at)} ET</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Customer
                    </p>
                    <p className="mt-2 font-bold text-foreground">{invoice.customer_name}</p>
                    <p className="mt-1 break-words text-sm text-muted">
                      {invoice.appliance || "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Status
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[invoice.status]}`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Total
                    </p>
                    <p className="mt-2 text-lg font-black text-primary">
                      {formatMoney(invoice.total)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
