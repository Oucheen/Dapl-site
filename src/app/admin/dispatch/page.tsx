import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { listSupabaseLeads, type LeadRecord } from "@/lib/supabase-leads";

export const dynamic = "force-dynamic";

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getMapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function getRouteUrl(leads: LeadRecord[]) {
  const addresses = leads.map((lead) => lead.service_address.trim()).filter(Boolean).slice(0, 10);

  if (!addresses.length) {
    return "";
  }

  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination: addresses[addresses.length - 1],
  });

  if (addresses.length > 1) {
    params.set("waypoints", addresses.slice(0, -1).join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "Time not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "America/New_York",
  }).format(new Date(`${value}T12:00:00-05:00`));
}

function getDateParam(value: string | string[] | undefined) {
  const date = Array.isArray(value) ? value[0] : value;
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getTodayDate();
}

function getTechParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function getTechName(lead: LeadRecord) {
  return lead.assigned_technician?.trim() || "Unassigned";
}

export default async function DispatchPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string | string[]; tech?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login?returnTo=/admin/dispatch");
  }

  const params = await searchParams;
  const selectedDate = getDateParam(params?.date);
  const selectedTech = getTechParam(params?.tech);
  let leads: LeadRecord[] = [];
  let error = "";

  try {
    leads = await listSupabaseLeads(500);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load dispatch data.";
  }

  const scheduledLeads = leads
    .filter((lead) => lead.housecall_pro_job_id && (lead.scheduled_date || lead.scheduled_start))
    .filter((lead) => (lead.scheduled_date || lead.scheduled_start?.slice(0, 10)) === selectedDate)
    .filter((lead) => !selectedTech || getTechName(lead) === selectedTech)
    .sort((left, right) => (left.scheduled_start || "9999").localeCompare(right.scheduled_start || "9999"));
  const technicians = Array.from(
    new Set(
      leads
        .filter((lead) => lead.housecall_pro_job_id)
        .map(getTechName),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const grouped = Array.from(
    scheduledLeads.reduce((groups, lead) => {
      const technician = getTechName(lead);
      groups.set(technician, [...(groups.get(technician) ?? []), lead]);
      return groups;
    }, new Map<string, LeadRecord[]>()),
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <Link href="/admin/pipeline" className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">
              DAPL Pipeline
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">Dispatch map</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">
              Scheduled HCP jobs grouped by technician. This shows planned work locations, not live GPS.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminGlobalSearch compact />
            <Link href="/admin/pipeline" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Pipeline
            </Link>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-muted">
            Date
            <input type="date" name="date" defaultValue={selectedDate} className="rounded-xl border border-border px-3 py-2 text-sm font-bold text-primary" />
          </label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-muted">
            Technician
            <select name="tech" defaultValue={selectedTech} className="min-w-52 rounded-xl border border-border px-3 py-2 text-sm font-bold text-primary">
              <option value="">All technicians</option>
              {technicians.map((technician) => <option key={technician} value={technician}>{technician}</option>)}
            </select>
          </label>
          <button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground">Show schedule</button>
          <span className="text-sm font-bold text-muted">{formatDate(selectedDate)} · {scheduledLeads.length} jobs</span>
        </form>

        {error ? <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/5 p-5 text-sm font-bold text-accent">{error}</div> : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {grouped.map(([technician, technicianLeads]) => {
            const routeUrl = getRouteUrl(technicianLeads);

            return (
              <section key={technician} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <h2 className="text-xl font-black text-primary">{technician}</h2>
                    <p className="mt-1 text-xs font-bold text-muted">{technicianLeads.length} planned stop{technicianLeads.length === 1 ? "" : "s"}</p>
                  </div>
                  {routeUrl ? <a href={routeUrl} target="_blank" rel="noreferrer" className="rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground">Open route</a> : null}
                </div>
                <div className="mt-4 grid gap-3">
                  {technicianLeads.map((lead, index) => (
                    <article key={lead.id} className="rounded-xl border border-border bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-primary">{index + 1}. {lead.name}</p>
                          <p className="mt-1 text-xs font-bold text-muted">{formatTime(lead.scheduled_start,)}{lead.scheduled_end ? ` – ${formatTime(lead.scheduled_end)}` : ""}</p>
                        </div>
                        <Link href={`/admin/leads/${lead.id}`} className="text-xs font-black text-primary underline-offset-4 hover:underline">Open</Link>
                      </div>
                      <p className="mt-3 text-sm font-bold text-foreground">{lead.service_address}</p>
                      <a href={getMapsSearchUrl(lead.service_address)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-black text-primary underline-offset-4 hover:underline">Open address in Google Maps</a>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {!grouped.length ? <div className="mt-6 rounded-2xl border border-dashed border-border bg-white p-10 text-center text-sm font-bold text-muted">No scheduled HCP jobs for this filter. Run “Sync HCP jobs” on the Pipeline page after adding the API key.</div> : null}
      </section>
    </main>
  );
}
