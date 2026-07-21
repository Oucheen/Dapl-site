import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerHistoryCard } from "@/components/admin/customer-history-card";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { getCrmTechnicianNames } from "@/lib/crm-technicians";
import { listCustomerHistory } from "@/lib/customer-history";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import { getActivityActorName, listActivitiesForLead } from "@/lib/supabase-activity";
import { getInvoiceById, getInvoiceIdForLead } from "@/lib/supabase-invoices";
import {
  type LeadAdminStatus,
  type LeadRecord,
  getSupabaseLeadById,
} from "@/lib/supabase-leads";
import { createInvoiceForLead, deleteLead, updateLeadDetails } from "../actions";

const STATUSES: { value: LeadAdminStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "invoiced", label: "Invoiced" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const POST_INVOICE_STATUSES: { value: LeadAdminStatus; label: string }[] = [
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(new Date(value));
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

function formatInputMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "";
}

function getNeedsAttention(lead: LeadRecord, hasInvoice: boolean) {
  if (lead.status === "new") {
    return "New request needs first contact.";
  }

  if (lead.status === "contacted" && !lead.scheduled_date && !hasInvoice) {
    return "Contacted lead has no visit date yet.";
  }

  if (lead.status === "confirmed" && !hasInvoice) {
    return "Confirmed job is ready for invoice creation after service details are final.";
  }

  return null;
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  searchParams?: Promise<{ notice?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const { leadId } = await params;
  const query = await searchParams;
  const notice = Array.isArray(query?.notice) ? query?.notice[0] : query?.notice;
  const [lead, invoiceId, activity] = await Promise.all([
    getSupabaseLeadById(leadId),
    getInvoiceIdForLead(leadId),
    listActivitiesForLead(leadId, 30),
  ]);

  if (!lead) {
    notFound();
  }

  const invoiceData = invoiceId ? await getInvoiceById(invoiceId) : null;
  const invoice = invoiceData?.invoice ?? null;
  const technicians = await getCrmTechnicianNames([
    lead.assigned_technician,
    invoice?.assigned_technician,
  ]);
  const customerHistory = await listCustomerHistory({
    phone: lead.phone,
    email: lead.email,
    excludeLeadId: lead.id,
    excludeInvoiceId: invoice?.id,
  });
  const hasInvoice = Boolean(invoice);
  const statusOptions = hasInvoice ? POST_INVOICE_STATUSES : STATUSES;
  const attention = getNeedsAttention(lead, hasInvoice);
  const lockedFieldClass =
    "min-w-0 rounded-lg border border-border bg-slate-100 px-3 py-2 text-sm font-semibold text-muted outline-none";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <datalist id="crm-technicians">
        {technicians.map((technician) => (
          <option key={technician} value={technician} />
        ))}
      </datalist>

      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin/leads"
              className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70"
            >
              Back to leads
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-primary">
                {lead.name}
              </h1>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[lead.status]}`}
              >
                {lead.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">
              Received {formatDateTime(lead.created_at)} ET
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/search"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Search
            </Link>
            {invoice ? (
              <Link
                href={`/admin/invoices/${invoice.id}`}
                className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
              >
                Open invoice {invoice.invoice_number}
              </Link>
            ) : null}
            <Link
              href="/admin/invoices/new"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Create manual invoice
            </Link>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        {notice === "delete_confirm_required" ? (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
            <p className="font-black">Confirmation required</p>
            <p className="mt-1">
              Type DELETE INVOICE before deleting a lead that already has an invoice.
            </p>
          </div>
        ) : null}

        {notice === "delete_permission_denied" ? (
          <div className="mb-6 rounded-2xl border border-accent/25 bg-accent/5 px-5 py-4 text-sm leading-6 text-accent">
            <p className="font-black">Owner only</p>
            <p className="mt-1 text-foreground">Only the owner can delete leads.</p>
          </div>
        ) : null}

        {attention ? (
          <div className="mb-6 rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4 text-sm leading-6 text-accent">
            <p className="font-black">Needs attention</p>
            <p className="mt-1 text-foreground">{attention}</p>
          </div>
        ) : null}

        {hasInvoice ? (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
            <p className="font-black">Invoice controls this job now</p>
            <p className="mt-1">
              Visit date, estimate, technician, line items, and email sending live inside the
              invoice. This lead page only keeps status and admin notes editable.
            </p>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-6">
            <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Customer
              </p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-sm font-bold text-foreground">Name</p>
                  <p className="mt-1 break-words text-lg font-black text-primary">
                    {lead.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Contact</p>
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
                <div className="md:col-span-2">
                  <p className="text-sm font-bold text-foreground">Service address</p>
                  <p className="mt-1 break-words text-muted">{lead.service_address}</p>
                </div>
              </div>
            </section>

            <CustomerHistoryCard items={customerHistory} />

            <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Request
              </p>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-sm font-bold text-foreground">Appliance</p>
                  <p className="mt-1 text-muted">{lead.appliance || "Not selected"}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Preferred date</p>
                  <p className="mt-1 text-muted">{lead.preferred_date || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Promo code</p>
                  <p className="mt-1 text-muted">{lead.promo_code || "None"}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Source</p>
                  <p className="mt-1 text-muted">{lead.lead_source || "Unknown"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-bold text-foreground">Customer message</p>
                  <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                    {lead.message || "No message provided."}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Timeline
              </p>
              {activity.length > 0 ? (
                <ul className="mt-5 space-y-5">
                  {activity.map((item) => {
                    const actorName = getActivityActorName(item);

                    return (
                      <li key={item.id} className="flex gap-4 text-sm leading-6">
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                        <span>
                          <span className="block font-black text-foreground">{item.title}</span>
                          {item.details ? (
                            <span className="block text-muted">{item.details}</span>
                          ) : null}
                          <span className="mt-1 block text-xs font-semibold text-muted">
                            {formatDateTime(item.created_at)} ET
                            {actorName ? ` by ${actorName}` : ""}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                  No activity recorded yet.
                </p>
              )}
            </section>
          </div>

          <aside className="self-start rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Manage lead
            </p>
            <form action={updateLeadDetails} className="mt-5 grid gap-4">
              <input type="hidden" name="id" value={lead.id} />
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Status
                <select
                  name="status"
                  defaultValue={lead.status}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Visit date
                <input
                  type="date"
                  name="scheduledDate"
                  defaultValue={lead.scheduled_date ?? ""}
                  disabled={hasInvoice}
                  className={
                    hasInvoice
                      ? lockedFieldClass
                      : "rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                  }
                />
              </label>

              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Estimate
                <input
                  type="number"
                  name="estimatedPrice"
                  defaultValue={formatInputMoney(lead.estimated_price)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={hasInvoice}
                  className={
                    hasInvoice
                      ? lockedFieldClass
                      : "rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                  }
                />
              </label>

              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Technician
                <input
                  type="text"
                  name="assignedTechnician"
                  list="crm-technicians"
                  defaultValue={lead.assigned_technician ?? ""}
                  placeholder="Name"
                  disabled={hasInvoice}
                  className={
                    hasInvoice
                      ? lockedFieldClass
                      : "rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                  }
                />
              </label>

              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Admin notes
                <textarea
                  name="adminNotes"
                  defaultValue={lead.admin_notes ?? ""}
                  rows={7}
                  placeholder="Internal notes, call result, parts needed..."
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-normal normal-case leading-6 tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
                />
              </label>

              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                {hasInvoice ? "Save status / notes" : "Save lead details"}
              </button>

              {invoice ? (
                <Link
                  href={`/admin/invoices/${invoice.id}`}
                  className="flex items-center justify-center rounded-lg border border-primary/20 bg-white px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary/5"
                >
                  Open / edit invoice
                </Link>
              ) : (
                <button
                  type="submit"
                  formAction={createInvoiceForLead}
                  className="rounded-lg border border-primary/20 bg-white px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary/5"
                >
                  Create invoice
                </button>
              )}
            </form>

            {permissions.canDeleteLeads ? (
              hasInvoice ? (
                <form
                  action={deleteLead}
                  className="mt-4 rounded-xl border border-accent/20 bg-white p-4"
                >
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="returnTo" value={`/admin/leads/${lead.id}`} />
                  <p className="text-sm font-black text-accent">Delete lead and invoice</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Type DELETE INVOICE to remove this lead, invoice, line items, and payments.
                  </p>
                  <input
                    type="text"
                    name="deleteConfirmation"
                    placeholder="DELETE INVOICE"
                    required
                    pattern="DELETE INVOICE"
                    title='Type "DELETE INVOICE" to delete this lead and invoice.'
                    className="mt-3 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-accent/20 placeholder:text-muted focus:border-accent focus:ring-2"
                  />
                  <button
                    type="submit"
                    className="mt-3 w-full rounded-lg border border-accent/20 bg-white px-4 py-3 text-sm font-bold text-accent transition hover:bg-accent/5"
                  >
                    Delete lead + invoice
                  </button>
                </form>
              ) : (
                <form action={deleteLead} className="mt-4">
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="returnTo" value={`/admin/leads/${lead.id}`} />
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-accent/20 bg-white px-4 py-3 text-sm font-bold text-accent transition hover:bg-accent/5"
                  >
                    Delete lead
                  </button>
                </form>
              )
            ) : null}

            {invoice ? (
              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6">
                <p className="font-black text-primary">Invoice summary</p>
                <p className="mt-2 text-muted">Status: {invoice.status}</p>
                <p className="text-muted">Service date: {formatDate(invoice.service_date)}</p>
                <p className="text-muted">Total: {formatMoney(invoice.total)}</p>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
