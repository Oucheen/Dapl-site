import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logoutAdmin } from "@/app/admin/leads/actions";
import { AppBottomNav } from "@/components/app-field/app-shell";
import { CallButton } from "@/components/twilio/call-widget";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { getSupabaseLeadById } from "@/lib/supabase-leads";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lead | DAPL Field App",
  description: "Lead detail for DAPL field users.",
  manifest: "/dapl-field.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function canSeeLead(input: {
  assignedTechnician: string | null | undefined;
  technicianOnly: boolean;
  userName: string;
}) {
  if (!input.technicianOnly) {
    return true;
  }

  const assignedTechnician = normalizeText(input.assignedTechnician);
  return !assignedTechnician || assignedTechnician === normalizeText(input.userName);
}

export default async function AppLeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    const { leadId } = await params;
    redirect(`/admin/leads/login?returnTo=/app/leads/${leadId}`);
  }

  const { leadId } = await params;
  const lead = await getSupabaseLeadById(leadId).catch(() => null);

  if (!lead) {
    notFound();
  }

  if (
    !canSeeLead({
      assignedTechnician: lead.assigned_technician,
      technicianOnly: permissions.hasTechnicianAccess,
      userName: permissions.user.name,
    })
  ) {
    notFound();
  }

  const mapsHref = lead.service_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.service_address)}`
    : "";

  return (
    <main className="min-h-screen bg-slate-100 pb-24 text-foreground">
      <section className="bg-primary text-white">
        <div className="container-shell py-5 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/app/search" className="text-sm font-black tracking-[0.16em] text-white">
                DAPL
              </Link>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                {permissions.user.name}
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

          <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-white/60">
            Lead
          </p>
          <h1 className="mt-2 break-words text-3xl font-black tracking-tight text-white sm:text-5xl">
            {lead.name}
          </h1>
        </div>
      </section>

      <section className="container-shell grid gap-4 py-4 sm:py-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-black uppercase text-primary">
              {lead.status}
            </span>
            {lead.assigned_technician ? (
              <span className="rounded-full border border-sky-500/25 bg-sky-50 px-3 py-1 text-xs font-black uppercase text-sky-700">
                {lead.assigned_technician}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-muted">
            <p className="truncate rounded-lg bg-slate-50 px-3 py-2">{lead.phone || "Phone"}</p>
            <p className="truncate rounded-lg bg-slate-50 px-3 py-2">{lead.appliance || "Appliance"}</p>
            <p className="col-span-2 truncate rounded-lg bg-slate-50 px-3 py-2">
              {lead.service_address || "Address"}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {lead.phone ? (
              <CallButton phone={lead.phone} name={lead.name} leadId={lead.id} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-black text-white" />
            ) : null}
            {mapsHref ? (
              <Link
                href={mapsHref}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-3 text-sm font-black text-primary"
              >
                Maps
              </Link>
            ) : null}
            <Link
              href="/app/search"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-3 text-sm font-black text-primary"
            >
              Search
            </Link>
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
            Notes
          </p>
          <div className="mt-4 grid gap-2">
            <p className="rounded-lg bg-slate-50 p-3 text-sm font-bold leading-6 text-muted">
              {lead.message || "No customer message."}
            </p>
            {lead.admin_notes ? (
              <p className="rounded-lg bg-slate-50 p-3 text-sm font-bold leading-6 text-muted">
                {lead.admin_notes}
              </p>
            ) : null}
          </div>
        </aside>
      </section>

      <AppBottomNav activeHref="/app/search" />
    </main>
  );
}
