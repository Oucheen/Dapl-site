import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { PipelineBoard } from "@/components/admin/pipeline-board";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { listSupabaseLeads } from "@/lib/supabase-leads";
import { getPipelineConfigStatus } from "@/lib/telegram-pipeline";
import { logoutAdmin } from "../leads/actions";

export const dynamic = "force-dynamic";

function getSearchQuery(value: string | string[] | undefined) {
  const query = Array.isArray(value) ? value[0] : value;
  return query?.trim().toLowerCase() ?? "";
}

function getSourceFilter(value: string | string[] | undefined) {
  const source = Array.isArray(value) ? value[0] : value;
  return source?.trim() || "all";
}

function normalizeSource(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") || "";
}

function matchesSource(
  lead: Awaited<ReturnType<typeof listSupabaseLeads>>[number],
  sourceFilter: string,
) {
  if (sourceFilter === "all") {
    return true;
  }

  const source = normalizeSource(lead.lead_source);

  if (sourceFilter === "housecall-pro") {
    return source.includes("housecall pro");
  }

  if (sourceFilter === "google-local") {
    return source.includes("google local") || source.includes("google lsa");
  }

  return source === normalizeSource(sourceFilter);
}

function matchesSearch(lead: Awaited<ReturnType<typeof listSupabaseLeads>>[number], query: string) {
  if (!query) {
    return true;
  }

  return [
    lead.name,
    lead.phone,
    lead.email,
    lead.service_address,
    lead.appliance,
    lead.lead_source,
    lead.assigned_technician,
    lead.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export default async function PipelineAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[]; source?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login?returnTo=/admin/pipeline");
  }

  let leads: Awaited<ReturnType<typeof listSupabaseLeads>> = [];
  let error = "";

  try {
    leads = await listSupabaseLeads(500);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load pipeline leads.";
  }

  const params = await searchParams;
  const searchQuery = getSearchQuery(params?.q);
  const sourceFilter = getSourceFilter(params?.source);
  const discoveredSources = Array.from(
    new Set(leads.map((lead) => lead.lead_source?.trim()).filter(Boolean) as string[]),
  ).sort((left, right) => left.localeCompare(right));
  const visibleLeads = leads.filter(
    (lead) => matchesSearch(lead, searchQuery) && matchesSource(lead, sourceFilter),
  );
  const pipelineTelegram = getPipelineConfigStatus();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Link href="/" className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">
              DAPL Appliance Repair
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-primary">Pipeline</h1>
              <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-black text-primary">
                {visibleLeads.length} records
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">
              Dispatcher board for leads and jobs. Housecall Pro remains the operational source while this board becomes the DAPL workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full min-w-[18rem] sm:w-auto">
              <AdminGlobalSearch compact />
            </div>
            <Link href="/admin" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Dashboard
            </Link>
            <Link href="/admin/leads" className="rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/5">
              Leads list
            </Link>
            <form action={logoutAdmin}>
              <button type="submit" className="rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/5">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground">Leads</span>
            <span className="rounded-full border border-border px-4 py-2 text-sm font-bold text-muted">Estimates · next</span>
            <span className="rounded-full border border-border px-4 py-2 text-sm font-bold text-muted">Jobs · next</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-muted">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 ${pipelineTelegram.botToken && pipelineTelegram.chatId ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
              <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
              Pipeline Telegram {pipelineTelegram.botToken && pipelineTelegram.chatId ? "ready" : "not configured"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-2">Drag cards to change stage</span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-black text-primary">DAPL Repair Pipeline</h2>
            <p className="text-sm font-semibold text-muted">Move a request through the workflow as the dispatcher works it.</p>
          </div>
          <form action="/admin/pipeline" className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:flex-nowrap">
            <input
              type="search"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search customer, phone, address..."
              className="min-w-0 flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 lg:w-80"
            />
            <select
              name="source"
              defaultValue={sourceFilter}
              aria-label="Filter by lead source"
              className="rounded-full border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All sources</option>
              <option value="housecall-pro">Housecall Pro</option>
              <option value="google-local">Google Local</option>
              {discoveredSources
                .filter(
                  (source) =>
                    normalizeSource(source) !== "housecall pro" &&
                    !normalizeSource(source).includes("google local"),
                )
                .map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
            </select>
            <button type="submit" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Search
            </button>
          </form>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/5 p-5 text-sm leading-6 text-accent">
            <p className="font-black">Could not load Pipeline data.</p>
            <p className="mt-1 font-mono text-xs text-foreground">{error}</p>
          </div>
        ) : null}

        <div className="mt-5">
          <PipelineBoard leads={visibleLeads} canDeleteLeads={permissions.canDeleteLeads} />
        </div>
      </section>
    </main>
  );
}
