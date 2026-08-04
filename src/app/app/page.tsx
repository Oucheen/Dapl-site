import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DAPL Field App",
  description: "Field service workspace for technicians and dispatch.",
  manifest: "/dapl-field.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
};

const technicianActions = [
  {
    href: "/admin/technician",
    label: "Today",
    title: "Technician day",
    body: "Jobs, calls, maps, field notes, parts, and quick status updates.",
  },
  {
    href: "/admin/search",
    label: "Find",
    title: "Customer search",
    body: "Look up customers, addresses, phones, invoices, appliances, and previous work.",
  },
  {
    href: "/admin/invoices",
    label: "Money",
    title: "Invoices",
    body: "Open job invoices, customer balances, payments, and job history.",
  },
];

const dispatchActions = [
  {
    href: "/admin/schedule",
    label: "Board",
    title: "Dispatch schedule",
    body: "Assign jobs, review the day, handle route timing, and spot conflicts.",
  },
  {
    href: "/admin/leads",
    label: "Queue",
    title: "Leads",
    body: "New requests, customer details, statuses, and invoice creation.",
  },
  {
    href: "/admin",
    label: "HQ",
    title: "Admin dashboard",
    body: "Operations, reminders, accounting snapshots, parts, and CRM navigation.",
  },
];

export default function AppHomePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-foreground">
      <section className="border-b border-slate-800 bg-primary text-white">
        <div className="container-shell flex min-h-[34vh] flex-col justify-between gap-8 py-6 sm:py-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="text-sm font-black tracking-[0.14em] text-white">
              DAPL
            </Link>
            <Link
              href="/admin/leads/login"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/20 px-4 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>

          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/65">
              Field service workspace
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Start the workday from the mode that fits the job.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Technician routes stay quick on the phone, while dispatch and admin tools stay one tap away.
            </p>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-5 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-8">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Technician mode
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">Field work</h2>
            </div>
            <Link
              href="/admin/technician"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
            >
              Open today
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {technicianActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-lg border border-border bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm"
              >
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-2 text-xs font-black text-white">
                  {action.label}
                </span>
                <span className="mt-4 block text-lg font-black text-primary">{action.title}</span>
                <span className="mt-2 block text-sm leading-6 text-muted">{action.body}</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
            Quick actions
          </p>
          <div className="mt-4 grid gap-2">
            <a
              href="tel:+17042660508"
              className="flex min-h-12 items-center justify-between rounded-lg bg-primary px-4 text-sm font-black text-white transition hover:bg-primary/90"
            >
              <span>Call office</span>
              <span>+1 704 266 0508</span>
            </a>
            <Link
              href="/admin/invoices/new"
              className="flex min-h-12 items-center justify-between rounded-lg border border-primary/15 bg-white px-4 text-sm font-black text-primary transition hover:bg-primary/5"
            >
              <span>New invoice</span>
              <span>Open</span>
            </Link>
            <Link
              href="/admin/parts"
              className="flex min-h-12 items-center justify-between rounded-lg border border-amber-500/25 bg-amber-50 px-4 text-sm font-black text-amber-800 transition hover:bg-amber-100"
            >
              <span>Parts</span>
              <span>Check</span>
            </Link>
          </div>
        </aside>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Dispatch mode
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">Office control</h2>
            </div>
            <Link
              href="/admin/schedule"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary/15 bg-white px-4 text-sm font-black text-primary transition hover:bg-primary/5"
            >
              Open schedule
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {dispatchActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-lg border border-border bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm"
              >
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-accent px-2 text-xs font-black text-white">
                  {action.label}
                </span>
                <span className="mt-4 block text-lg font-black text-primary">{action.title}</span>
                <span className="mt-2 block text-sm leading-6 text-muted">{action.body}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
