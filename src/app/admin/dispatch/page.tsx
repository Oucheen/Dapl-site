import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { DispatchMap } from "@/components/admin/dispatch-map";
import { ManualDispatchJobDialog } from "@/components/admin/manual-dispatch-job-dialog";
import { RefreshDispatchButton } from "@/components/admin/refresh-dispatch-button";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { getCrmTechnicianNames } from "@/lib/crm-technicians";
import { getDispatchTechnicianColor } from "@/lib/dispatch-technician-colors";
import { listSupabaseLeads, type LeadRecord } from "@/lib/supabase-leads";
import { listManualDispatchJobs, type ManualDispatchJobRecord } from "@/lib/supabase-dispatch-jobs";

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
  const today = getTodayDate();

  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today ? date : today;
}

function getTechParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function getTechName(lead: LeadRecord) {
  return lead.assigned_technician?.trim() || "Unassigned";
}

function getScheduleTimestamp(value: string | null | undefined) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
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
  let manualJobs: ManualDispatchJobRecord[] = [];
  let error = "";

  try {
    [leads, manualJobs] = await Promise.all([
      listSupabaseLeads(500),
      listManualDispatchJobs(500),
    ]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load dispatch data.";
  }

  const hcpLeads = leads
    .filter((lead) =>
      lead.housecall_pro_job_id ||
      lead.lead_source?.toLowerCase().includes("housecall pro") ||
      lead.pipeline_stage === "scheduled",
    )
    .filter((lead) => !selectedTech || getTechName(lead) === selectedTech);
  const scheduledLeads = hcpLeads
    .filter((lead) => (lead.scheduled_date || lead.scheduled_start?.slice(0, 10)) === selectedDate)
    .sort((left, right) => (left.scheduled_start || "9999").localeCompare(right.scheduled_start || "9999"));
  const unscheduledLeads = hcpLeads
    .filter((lead) => !lead.scheduled_date && !lead.scheduled_start)
    .sort((left, right) => left.name.localeCompare(right.name));
  const selectedManualJobs = manualJobs
    .filter((job) => job.service_date === selectedDate)
    .filter((job) => !selectedTech || job.assigned_technician === selectedTech)
    .sort((left, right) => left.scheduled_start.localeCompare(right.scheduled_start));
  const technicians = await getCrmTechnicianNames([
    ...leads.map((lead) => lead.assigned_technician),
    ...manualJobs.map((job) => job.assigned_technician),
  ]);
  const grouped = Array.from(
    scheduledLeads.reduce((groups, lead) => {
      const technician = getTechName(lead);
      groups.set(technician, [...(groups.get(technician) ?? []), lead]);
      return groups;
    }, new Map<string, LeadRecord[]>()),
  );
  const manualGrouped = Array.from(
    selectedManualJobs.reduce((groups, job) => {
      groups.set(job.assigned_technician, [...(groups.get(job.assigned_technician) ?? []), job]);
      return groups;
    }, new Map<string, ManualDispatchJobRecord[]>()),
  );
  const scheduledStops = [
    ...scheduledLeads.map((lead) => ({ id: lead.id, technician: getTechName(lead), start: lead.scheduled_start })),
    ...selectedManualJobs.map((job) => ({ id: job.id, technician: job.assigned_technician, start: job.scheduled_start })),
  ].sort((left, right) => getScheduleTimestamp(left.start) - getScheduleTimestamp(right.start));
  const stopNumbers = new Map<string, number>();
  const stopCounts = new Map<string, number>();

  for (const stop of scheduledStops) {
    const nextNumber = (stopCounts.get(stop.technician) || 0) + 1;
    stopCounts.set(stop.technician, nextNumber);
    stopNumbers.set(stop.id, nextNumber);
  }
  const mapJobs = [
    ...scheduledLeads.map((lead) => {
      const technician = getTechName(lead);
      const color = getDispatchTechnicianColor(technician, technicians);

      return {
        id: lead.id,
        name: lead.name,
        address: lead.service_address,
        technician,
        time: lead.scheduled_start ? formatTime(lead.scheduled_start) : "Time not set",
        source: "hcp" as const,
        sequence: stopNumbers.get(lead.id),
        sortKey: getScheduleTimestamp(lead.scheduled_start),
        markerIcon: color.markerIcon,
        markerColor: color.markerColor,
      };
    }),
    ...selectedManualJobs.map((job) => {
      const color = getDispatchTechnicianColor(job.assigned_technician, technicians);

      return {
        id: job.id,
        name: job.name,
        address: job.service_address,
        technician: job.assigned_technician,
        time: formatTime(job.scheduled_start),
        source: "manual" as const,
        sequence: stopNumbers.get(job.id),
        sortKey: getScheduleTimestamp(job.scheduled_start),
        markerIcon: color.markerIcon,
        markerColor: color.markerColor,
      };
    }),
    ...unscheduledLeads.map((lead) => {
      const technician = getTechName(lead);
      const color = getDispatchTechnicianColor(technician, technicians);

      return {
        id: lead.id,
        name: lead.name,
        address: lead.service_address,
        technician,
        time: "Time not set",
        source: "hcp" as const,
        sortKey: Number.MAX_SAFE_INTEGER,
        markerIcon: color.markerIcon,
        markerColor: color.markerColor,
      };
    }),
  ];

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
              HCP Scheduled jobs and Bozman Fix appointments grouped by technician. This shows planned work locations, not live GPS.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminGlobalSearch compact />
            <ManualDispatchJobDialog
              selectedDate={selectedDate}
              selectedTechnician={selectedTech}
              technicians={technicians}
            />
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
            <input type="date" name="date" min={getTodayDate()} defaultValue={selectedDate} className="rounded-xl border border-border px-3 py-2 text-sm font-bold text-primary" />
          </label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-muted">
            Technician
            <select name="tech" defaultValue={selectedTech} className="min-w-52 rounded-xl border border-border px-3 py-2 text-sm font-bold text-primary">
              <option value="">All technicians</option>
              {technicians.map((technician) => <option key={technician} value={technician}>{technician}</option>)}
            </select>
          </label>
          <button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground">Show schedule</button>
          <RefreshDispatchButton />
          <span className="text-sm font-bold text-muted">{formatDate(selectedDate)} · {scheduledLeads.length + selectedManualJobs.length} scheduled · {unscheduledLeads.length} without date</span>
        </form>

        {error ? <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/5 p-5 text-sm font-bold text-accent">{error}</div> : null}

        <div className="mt-6">
          <DispatchMap
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()}
            maxMarkers={selectedTech ? 10 : 2}
            jobs={mapJobs}
          />
        </div>

        {manualGrouped.length ? (
          <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-violet-950">Bozman Fix</h2>
                <p className="mt-1 text-sm font-semibold text-violet-800">Manual appointments kept separate from Housecall Pro Scheduled jobs.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-violet-900">{selectedManualJobs.length} Bozman Fix</span>
            </div>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              {manualGrouped.map(([technician, jobs]) => {
                const color = getDispatchTechnicianColor(technician, technicians);

                return (
                <section key={technician} className={`rounded-2xl border p-5 shadow-sm ${color.section}`}>
                  <h3 className={`text-lg font-black ${color.heading}`}>{technician}</h3>
                  <p className={`mt-1 text-xs font-bold ${color.muted}`}>{jobs.length} manual stop{jobs.length === 1 ? "" : "s"}</p>
                  <div className="mt-4 grid gap-3">
                    {jobs.map((job, index) => (
                      <article key={job.id} className={`rounded-xl border p-4 ${color.card}`}>
                        <div className="flex items-center gap-2">
                          <p className={`min-w-0 truncate text-sm font-black ${color.heading}`}>{stopNumbers.get(job.id) || index + 1}. {job.name}</p>
                          <span className="shrink-0 rounded-full bg-violet-200 px-1.5 py-0.5 text-[0.6rem] font-black uppercase text-violet-900">Bozman Fix</span>
                        </div>
                        <p className="mt-1 text-xs font-bold text-violet-800">{formatTime(job.scheduled_start)}{job.scheduled_end ? ` – ${formatTime(job.scheduled_end)}` : ""}</p>
                        <p className="mt-3 text-sm font-bold text-foreground">{job.service_address}</p>
                        <a href={getMapsSearchUrl(job.service_address)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-black text-violet-800 underline-offset-4 hover:underline">Open address in Google Maps</a>
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-violet-200 pt-3">
                          <ManualDispatchJobDialog
                            selectedDate={selectedDate}
                            selectedTechnician={technician}
                            technicians={technicians}
                            job={job}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {grouped.map(([technician, technicianLeads]) => {
            const routeUrl = getRouteUrl(technicianLeads);
            const color = getDispatchTechnicianColor(technician, technicians);

            return (
              <section key={technician} className={`rounded-2xl border p-5 shadow-sm ${color.section}`}>
                <div className={`flex items-center justify-between gap-3 border-b pb-3 ${color.section.split(" ")[0]}`}>
                  <div>
                    <h2 className={`text-xl font-black ${color.heading}`}>{technician}</h2>
                    <p className={`mt-1 text-xs font-bold ${color.muted}`}>{technicianLeads.length} planned stop{technicianLeads.length === 1 ? "" : "s"}</p>
                  </div>
                  {routeUrl ? <a href={routeUrl} target="_blank" rel="noreferrer" className="rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground">Open route</a> : null}
                </div>
                <div className="mt-4 grid gap-3">
                  {technicianLeads.map((lead, index) => (
                    <article key={lead.id} className={`rounded-xl border p-4 ${color.card}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-sm font-black ${color.heading}`}>{stopNumbers.get(lead.id) || index + 1}. {lead.name}</p>
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

        {unscheduledLeads.length ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-primary">HCP jobs without a date</h2>
                <p className="mt-1 text-sm font-semibold text-muted">These cards are already in Pipeline, but HCP has not provided a scheduled date yet.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-primary">{unscheduledLeads.length} jobs</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {unscheduledLeads.map((lead) => (
                <article key={lead.id} className="rounded-xl border border-amber-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-black text-primary">{lead.name}</p>
                    <Link href={`/admin/leads/${lead.id}`} className="shrink-0 text-xs font-black text-primary underline-offset-4 hover:underline">Open</Link>
                  </div>
                  <p className="mt-2 text-sm font-bold text-foreground">{lead.service_address}</p>
                  <p className="mt-2 text-xs font-bold text-muted">Technician: {getTechName(lead)}</p>
                  <a href={getMapsSearchUrl(lead.service_address)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-black text-primary underline-offset-4 hover:underline">Open address in Google Maps</a>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!grouped.length && !manualGrouped.length && !unscheduledLeads.length ? <div className="mt-6 rounded-2xl border border-dashed border-border bg-white p-10 text-center text-sm font-bold text-muted">No scheduled jobs found for this filter.</div> : null}
      </section>
    </main>
  );
}
