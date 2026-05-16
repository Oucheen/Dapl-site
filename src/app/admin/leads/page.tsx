import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { type LeadAdminStatus, listSupabaseLeads } from "@/lib/supabase-leads";
import { logoutAdmin, updateLeadStatus } from "./actions";

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

export default async function LeadsAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  let leads: Awaited<ReturnType<typeof listSupabaseLeads>> = [];
  let error = "";

  try {
    leads = await listSupabaseLeads();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load leads.";
  }

  const counts = countByStatus(leads);

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
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Sign out
            </button>
          </form>
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
              <p className="mt-1 text-sm text-muted">Showing the newest {leads.length} leads.</p>
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
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-5 py-4">Received</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Appliance</th>
                    <th className="px-5 py-4">Address</th>
                    <th className="px-5 py-4">Message</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="align-top">
                      <td className="px-5 py-5">
                        <p className="font-semibold text-foreground">{formatDate(lead.created_at)}</p>
                        <p className="mt-1 text-xs text-muted">ET</p>
                      </td>
                      <td className="px-5 py-5">
                        <p className="font-bold text-primary">{lead.name}</p>
                        <a
                          href={`tel:${lead.phone}`}
                          className="mt-1 block font-semibold text-foreground hover:text-primary"
                        >
                          {lead.phone}
                        </a>
                        <a
                          href={`mailto:${lead.email}`}
                          className="mt-1 block break-all text-muted hover:text-primary"
                        >
                          {lead.email}
                        </a>
                      </td>
                      <td className="px-5 py-5">
                        <p className="font-semibold text-foreground">
                          {lead.appliance || "Not selected"}
                        </p>
                        {lead.preferred_date ? (
                          <p className="mt-2 text-xs text-muted">
                            Preferred: {lead.preferred_date}
                          </p>
                        ) : null}
                        {lead.promo_code ? (
                          <p className="mt-2 inline-flex rounded-full bg-primary/5 px-2.5 py-1 text-xs font-bold text-primary">
                            {lead.promo_code}
                          </p>
                        ) : null}
                        {lead.lead_source ? (
                          <p className="mt-2 text-xs text-muted">Source: {lead.lead_source}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-5">
                        <p className="max-w-[220px] leading-6 text-foreground">
                          {lead.service_address}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <p className="max-w-[260px] whitespace-pre-wrap leading-6 text-muted">
                          {lead.message}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[lead.status]}`}
                        >
                          {lead.status}
                        </span>
                        <form action={updateLeadStatus} className="mt-3 flex gap-2">
                          <input type="hidden" name="id" value={lead.id} />
                          <select
                            name="status"
                            defaultValue={lead.status}
                            className="min-w-32 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                          >
                            {STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                          >
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
