import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import { listSupabaseLeads, type LeadRecord } from "@/lib/supabase-leads";
import { listInvoices, type InvoiceRecord } from "@/lib/supabase-invoices";
import { listAllInvoiceParts, type InvoicePartRecord } from "@/lib/supabase-parts";

export const dynamic = "force-dynamic";

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function normalizeSearchText(value: string | number | null | undefined) {
  return String(value ?? "").toLowerCase().trim();
}

function includesQuery(values: Array<string | number | null | undefined>, query: string) {
  if (!query) {
    return false;
  }

  const normalizedQuery = normalizeSearchText(query);
  return values.map(normalizeSearchText).join(" ").includes(normalizedQuery);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(getDateForCharlotteDisplay(value));
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function leadMatchesQuery(lead: LeadRecord, query: string) {
  return includesQuery(
    [
      lead.name,
      lead.phone,
      lead.email,
      lead.service_address,
      lead.appliance,
      lead.promo_code,
      lead.lead_source,
      lead.preferred_date,
      lead.scheduled_date,
      lead.assigned_technician,
      lead.message,
      lead.admin_notes,
    ],
    query,
  );
}

function invoiceMatchesQuery(invoice: InvoiceRecord, query: string) {
  return includesQuery(
    [
      invoice.invoice_number,
      invoice.customer_name,
      invoice.customer_phone,
      invoice.customer_email,
      invoice.service_address,
      invoice.appliance,
      invoice.service_date,
      invoice.service_time,
      invoice.service_window,
      invoice.assigned_technician,
      invoice.status,
      invoice.job_status,
      invoice.notes,
      invoice.total,
    ],
    query,
  );
}

function partMatchesQuery(part: InvoicePartRecord, invoice: InvoiceRecord | undefined, query: string) {
  return includesQuery(
    [
      part.part_name,
      part.part_number,
      part.supplier,
      part.status,
      part.note,
      part.cost,
      invoice?.invoice_number,
      invoice?.customer_name,
      invoice?.customer_phone,
      invoice?.service_address,
      invoice?.appliance,
      invoice?.assigned_technician,
    ],
    query,
  );
}

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const params = await searchParams;
  const query = getQueryValue(params?.q).trim();
  let leads: LeadRecord[] = [];
  let invoices: InvoiceRecord[] = [];
  let allInvoices: InvoiceRecord[] = [];
  let parts: InvoicePartRecord[] = [];
  let error = "";

  if (query) {
    try {
      const [leadRows, invoiceRows, partsData] = await Promise.all([
        listSupabaseLeads(1000),
        listInvoices(1000),
        listAllInvoiceParts(1000),
      ]);
      allInvoices = invoiceRows;
      const invoicesById = new Map(allInvoices.map((invoice) => [invoice.id, invoice]));

      leads = leadRows.filter((lead) => leadMatchesQuery(lead, query)).slice(0, 25);
      invoices = invoiceRows.filter((invoice) => invoiceMatchesQuery(invoice, query)).slice(0, 25);
      parts = partsData.parts
        .filter((part) => partMatchesQuery(part, invoicesById.get(part.invoice_id), query))
        .slice(0, 25);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Could not load search results.";
    }
  }

  const totalResults = leads.length + invoices.length + parts.length;
  const invoicesById = new Map(allInvoices.map((invoice) => [invoice.id, invoice]));

  return (
    <main className="min-h-screen bg-slate-50 text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-bold text-muted hover:text-primary">
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Global search
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Search across leads, invoices, customers, addresses, appliances, technicians, and parts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="inline-flex w-fit items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/leads"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Leads
            </Link>
            <Link
              href="/admin/invoices"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Invoices
            </Link>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Find anything
          </p>
          <div className="mt-4">
            <AdminGlobalSearch defaultValue={query} />
          </div>
          {query ? (
            <p className="mt-3 text-sm text-muted">
              {totalResults} result{totalResults === 1 ? "" : "s"} for "{query}".
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Type at least a name, phone, invoice number, address, appliance, technician, or part number.
            </p>
          )}
        </section>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-black">Could not search CRM.</p>
            <p className="mt-2 break-words">{error}</p>
          </div>
        ) : null}

        {query && !error ? (
          <div className="mt-6 grid gap-6">
            <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-xl font-black text-primary">Invoices</h2>
              </div>
              {invoices.length ? (
                <div className="divide-y divide-border">
                  {invoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/admin/invoices/${invoice.id}`}
                      className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_150px_140px]"
                    >
                      <div className="min-w-0">
                        <p className="font-black text-primary">{invoice.customer_name}</p>
                        <p className="mt-1 break-words text-sm text-muted">
                          {invoice.invoice_number} / {invoice.service_address || "Address not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Visit</p>
                        <p className="mt-1 text-sm font-bold text-foreground">
                          {formatDate(invoice.service_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Total</p>
                        <p className="mt-1 text-sm font-black text-primary">{formatMoney(invoice.total)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-sm text-muted">No matching invoices.</p>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-xl font-black text-primary">Leads</h2>
              </div>
              {leads.length ? (
                <div className="divide-y divide-border">
                  {leads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/admin/leads/${lead.id}`}
                      className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_150px_140px]"
                    >
                      <div className="min-w-0">
                        <p className="font-black text-primary">{lead.name}</p>
                        <p className="mt-1 break-words text-sm text-muted">
                          {lead.phone} / {lead.service_address}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Status</p>
                        <p className="mt-1 text-sm font-bold text-foreground">{lead.status}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Date</p>
                        <p className="mt-1 text-sm font-bold text-foreground">
                          {formatDate(lead.scheduled_date || lead.preferred_date)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-sm text-muted">No matching leads.</p>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-xl font-black text-primary">Parts</h2>
              </div>
              {parts.length ? (
                <div className="divide-y divide-border">
                  {parts.map((part) => {
                    const invoice = invoicesById.get(part.invoice_id);

                    return (
                      <Link
                        key={part.id}
                        href={`/admin/invoices/${part.invoice_id}#internal-parts`}
                        className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_150px_140px]"
                      >
                        <div className="min-w-0">
                          <p className="font-black text-primary">{part.part_name}</p>
                          <p className="mt-1 break-words text-sm text-muted">
                            {part.part_number || "No part number"} / {part.supplier || "No supplier"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Job</p>
                          <p className="mt-1 text-sm font-bold text-foreground">
                            {invoice?.customer_name || "Open invoice"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Cost</p>
                          <p className="mt-1 text-sm font-black text-primary">{formatMoney(part.cost)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="px-5 py-8 text-sm text-muted">No matching parts.</p>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
