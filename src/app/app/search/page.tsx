import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAdmin } from "@/app/admin/leads/actions";
import { AppBottomNav } from "@/components/app-field/app-shell";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { listInvoices, type InvoiceRecord } from "@/lib/supabase-invoices";
import { listSupabaseLeads, type LeadRecord } from "@/lib/supabase-leads";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search | DAPL Field App",
  description: "Search workspace for DAPL field users.",
  manifest: "/dapl-field.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
};

function normalizeText(value: string | number | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesQuery(fields: Array<string | number | null | undefined>, query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return false;
  }

  return fields.some((field) => normalizeText(field).includes(normalizedQuery));
}

function canSeeTechnicianItem(assignedTechnician: string | null | undefined, userName: string, technicianOnly: boolean) {
  if (!technicianOnly) {
    return true;
  }

  const normalizedAssigned = normalizeText(assignedTechnician);
  return !normalizedAssigned || normalizedAssigned === normalizeText(userName);
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default async function AppSearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login?returnTo=/app/search");
  }

  const user = permissions.user;
  const params = await searchParams;
  const query = getQueryValue(params?.q).trim();
  let invoices: InvoiceRecord[] = [];
  let leads: LeadRecord[] = [];
  let dataError = "";

  if (query) {
    try {
      [invoices, leads] = await Promise.all([listInvoices(500), listSupabaseLeads(300)]);
    } catch (caught) {
      dataError = caught instanceof Error ? caught.message : "Could not load search.";
    }
  }

  const visibleInvoices = invoices.filter((invoice) =>
    canSeeTechnicianItem(invoice.assigned_technician, user.name, permissions.hasTechnicianAccess),
  );
  const visibleLeads = leads.filter((lead) =>
    canSeeTechnicianItem(lead.assigned_technician, user.name, permissions.hasTechnicianAccess),
  );
  const invoiceResults = visibleInvoices
    .filter((invoice) =>
      matchesQuery(
        [
          invoice.invoice_number,
          invoice.customer_name,
          invoice.customer_phone,
          invoice.customer_email,
          invoice.service_address,
          invoice.appliance,
          invoice.assigned_technician,
          invoice.notes,
        ],
        query,
      ),
    )
    .slice(0, 8);
  const leadResults = visibleLeads
    .filter((lead) =>
      matchesQuery(
        [
          lead.name,
          lead.phone,
          lead.email,
          lead.service_address,
          lead.appliance,
          lead.message,
          lead.admin_notes,
          lead.assigned_technician,
        ],
        query,
      ),
    )
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-slate-100 pb-24 text-foreground">
      <section className="bg-primary text-white">
        <div className="container-shell py-5 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/app" className="text-sm font-black tracking-[0.16em] text-white">
                DAPL
              </Link>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                {user.name}
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
          <h1 className="mt-7 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Search
          </h1>
        </div>
      </section>

      <section className="container-shell grid gap-4 py-4 sm:py-6">
        <form action="/app/search" className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-muted">
              Find
            </span>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Phone, name, address, invoice"
                className="min-h-12 min-w-0 rounded-lg border border-border bg-white px-3 text-sm font-black outline-none focus:border-primary"
              />
              <button className="min-h-12 rounded-lg bg-primary px-4 text-sm font-black text-white">
                Go
              </button>
            </div>
          </label>
        </form>

        {dataError ? (
          <div className="rounded-xl border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-800">
            {dataError}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
              Invoices
            </p>
            <div className="mt-4 grid gap-2">
              {invoiceResults.length ? (
                invoiceResults.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/app/invoices/${invoice.id}`}
                    className="rounded-lg border border-border bg-slate-50 p-3 transition hover:border-primary/30 hover:bg-white"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-primary">{invoice.customer_name}</span>
                        <span className="mt-1 block truncate text-xs font-bold text-muted">
                          {invoice.invoice_number}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-black uppercase text-primary">{invoice.status}</span>
                    </span>
                    <span className="mt-2 block truncate text-xs font-bold text-muted">
                      {invoice.customer_phone || invoice.service_address || invoice.appliance || "Invoice"}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
                  {query ? "No invoices." : "Search invoices."}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
              Leads
            </p>
            <div className="mt-4 grid gap-2">
              {leadResults.length ? (
                leadResults.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/app/leads/${lead.id}`}
                    className="rounded-lg border border-border bg-slate-50 p-3 transition hover:border-primary/30 hover:bg-white"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-primary">{lead.name}</span>
                        <span className="mt-1 block truncate text-xs font-bold text-muted">
                          {lead.phone}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-black uppercase text-primary">{lead.status}</span>
                    </span>
                    <span className="mt-2 block truncate text-xs font-bold text-muted">
                      {lead.service_address || lead.appliance || "Lead"}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
                  {query ? "No leads." : "Search leads."}
                </p>
              )}
            </div>
          </section>
        </div>
      </section>

      <AppBottomNav activeHref="/app/search" />
    </main>
  );
}
