import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listInvoices } from "@/lib/supabase-invoices";
import { type LeadAdminStatus, listSupabaseLeads } from "@/lib/supabase-leads";
import { createInvoiceForLead, logoutAdmin, updateLeadDetails } from "./actions";

const STATUSES: { value: LeadAdminStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "invoiced", label: "Invoiced" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusClasses: Record<LeadAdminStatus, string> = {
  new: "border-accent/25 bg-accent/5 text-accent",
  contacted: "border-primary/20 bg-primary/5 text-primary",
  confirmed: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  invoiced: "border-amber-500/25 bg-amber-50 text-amber-700",
  completed: "border-slate-300 bg-slate-50 text-slate-700",
  cancelled: "border-slate-300 bg-slate-100 text-slate-500",
};

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function countByStatus(leads: Awaited<ReturnType<typeof listSupabaseLeads>>) {
  return leads.reduce(
    (acc, lead) => {
      acc[lead.status] += 1;
      return acc;
    },
    {
      new: 0,
      contacted: 0,
      confirmed: 0,
      invoiced: 0,
      completed: 0,
      cancelled: 0,
    } satisfies Record<LeadAdminStatus, number>,
  );
}

function formatPrice(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const price = Number(value);

  if (!Number.isFinite(price)) {
    return "";
  }

  return price.toFixed(2);
}

function leadCountLabel(count: number) {
  return count === 1 ? "lead" : "leads";
}

export default async function LeadsAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  let leads: Awaited<ReturnType<typeof listSupabaseLeads>> = [];
  let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
  let error = "";

  try {
    [leads, invoices] = await Promise.all([listSupabaseLeads(), listInvoices()]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load leads.";
  }

  const counts = countByStatus(leads);
  const invoiceByLeadId = new Map(
    invoices
      .filter((invoice) => invoice.lead_id)
      .map((invoice) => [invoice.lead_id as string, invoice]),
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">
              Dapl Appliance Repair
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Website leads
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/invoices"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              View invoices
            </Link>
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATUSES.map((status) => (
            <div
              key={status.value}
              className="rounded-2xl border border-border bg-white px-4 py-4 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                {status.label}
              </p>
              <p className="mt-2 text-3xl font-black text-primary">{counts[status.value]}</p>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-accent/25 bg-accent/5 p-5 text-sm leading-6 text-foreground">
            <p className="font-bold text-accent">Could not load Supabase leads.</p>
            <p className="mt-2 font-mono text-xs">{error}</p>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-primary">Latest requests</h2>
              <p className="mt-1 text-sm text-muted">
                Showing the newest {leads.length} {leadCountLabel(leads.length)}.
              </p>
            </div>
            <Link
              href="/booking"
              className="text-sm font-bold text-primary underline-offset-4 hover:underline"
            >
              Open booking page
            </Link>
          </div>

          {leads.length === 0 && !error ? (
            <div className="px-5 py-12 text-center">
              <p className="text-lg font-bold text-primary">No leads yet</p>
              <p className="mt-2 text-sm text-muted">
                New website requests will appear here after form submission.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {leads.map((lead) => (
                <form
                  key={lead.id}
                  action={updateLeadDetails}
                  className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)_minmax(380px,0.9fr)]"
                >
                  <input type="hidden" name="id" value={lead.id} />

                  <section className="min-w-0 rounded-xl border border-border/80 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
                          Customer
                        </p>
                        <p className="mt-2 break-words text-base font-black text-primary">
                          {lead.name}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[lead.status]}`}
                      >
                        {lead.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm leading-6 text-foreground">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Received
                        </p>
                        <p className="mt-1 font-semibold">{formatDate(lead.created_at)} ET</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Contact
                        </p>
                        <a
                          href={`tel:${lead.phone}`}
                          className="mt-1 block font-semibold hover:text-primary"
                        >
                          {lead.phone}
                        </a>
                        <a
                          href={`mailto:${lead.email}`}
                          className="block break-words text-muted hover:text-primary"
                        >
                          {lead.email}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Address
                        </p>
                        <p className="mt-1 break-words">{lead.service_address}</p>
                      </div>
                    </div>
                  </section>

                  <section className="min-w-0 rounded-xl border border-border/80 bg-white p-4">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
                      Job
                    </p>
                    <p className="mt-2 text-base font-bold text-foreground">
                      {lead.appliance || "Not selected"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {lead.preferred_date ? (
                        <span className="rounded-full bg-primary/5 px-2.5 py-1 text-xs font-bold text-primary">
                          Preferred: {lead.preferred_date}
                        </span>
                      ) : null}
                      {lead.promo_code ? (
                        <span className="rounded-full bg-accent/5 px-2.5 py-1 text-xs font-bold text-accent">
                          {lead.promo_code}
                        </span>
                      ) : null}
                      {lead.lead_source ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-muted">
                          Source: {lead.lead_source}
                        </span>
                      ) : null}
                    </div>

                    {lead.message ? (
                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Customer message
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                          {lead.message}
                        </p>
                      </div>
                    ) : null}

                    <label className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                      Admin notes
                      <textarea
                        name="adminNotes"
                        defaultValue={lead.admin_notes ?? ""}
                        rows={5}
                        placeholder="Internal notes, call result, parts needed..."
                        className="mt-2 min-h-28 w-full resize-y rounded-xl border border-border bg-white px-3 py-2 text-sm font-normal normal-case leading-6 tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
                      />
                    </label>
                  </section>

                  <section className="min-w-0 self-start rounded-xl border border-border/80 bg-slate-50/70 p-4 lg:col-span-2 xl:col-span-1">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
                      Manage
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 min-[1320px]:grid-cols-2">
                      <label className="grid gap-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted">
                        Status
                        <select
                          name="status"
                          defaultValue={lead.status}
                          className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                        >
                          {STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted">
                        Visit date
                        <input
                          type="date"
                          name="scheduledDate"
                          defaultValue={lead.scheduled_date ?? ""}
                          className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                        />
                      </label>
                      <label className="grid gap-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted">
                        Estimate
                        <input
                          type="number"
                          name="estimatedPrice"
                          defaultValue={formatPrice(lead.estimated_price)}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                        />
                      </label>
                      <label className="grid gap-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted">
                        Technician
                        <input
                          type="text"
                          name="assignedTechnician"
                          defaultValue={lead.assigned_technician ?? ""}
                          placeholder="Name"
                          className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="mt-4 w-full rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                    >
                      Save lead details
                    </button>
                    {invoiceByLeadId.has(lead.id) ? (
                      <Link
                        href={`/admin/invoices/${invoiceByLeadId.get(lead.id)?.id}`}
                        className="mt-2 flex w-full items-center justify-center rounded-lg border border-primary/20 bg-white px-3 py-3 text-xs font-bold text-primary transition hover:bg-primary/5"
                      >
                        Open / edit invoice
                      </Link>
                    ) : (
                      <button
                        type="submit"
                        formAction={createInvoiceForLead}
                        className="mt-2 w-full rounded-lg border border-primary/20 bg-white px-3 py-3 text-xs font-bold text-primary transition hover:bg-primary/5"
                      >
                        Create invoice
                      </button>
                    )}
                  </section>
                </form>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
