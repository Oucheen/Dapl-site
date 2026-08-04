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
    label: "Start",
    title: "Route",
  },
  {
    href: "/admin/search",
    label: "Find",
    title: "Search",
  },
  {
    href: "/admin/invoices",
    label: "Pay",
    title: "Invoices",
  },
];

const dispatchActions = [
  {
    href: "/admin/schedule",
    label: "Board",
    title: "Schedule",
  },
  {
    href: "/admin/leads",
    label: "Queue",
    title: "Leads",
  },
  {
    href: "/admin",
    label: "HQ",
    title: "Admin",
  },
];

const dayStats = [
  { label: "Jobs", value: "6" },
  { label: "Active", value: "4" },
  { label: "Done", value: "2" },
  { label: "Parts", value: "1" },
];

const nextSteps = [
  { label: "09:30", title: "Refrigerator cooling issue", note: "South Charlotte" },
  { label: "11:00", title: "Washer leak diagnosis", note: "Matthews" },
  { label: "01:30", title: "Oven not heating", note: "Fort Mill" },
];

const navItems = [
  { href: "/admin/technician", label: "Today", mark: "T" },
  { href: "/admin/search", label: "Search", mark: "S" },
  { href: "/admin/parts", label: "Parts", mark: "P" },
  { href: "/admin/invoices", label: "Invoices", mark: "I" },
  { href: "/admin", label: "Admin", mark: "A" },
];

export default function AppHomePage() {
  return (
    <main className="min-h-screen bg-slate-100 pb-24 text-foreground">
      <section className="bg-primary text-white">
        <div className="container-shell py-5 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/" className="text-sm font-black tracking-[0.16em] text-white">
                DAPL
              </Link>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                Field app
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="tel:+17042660508"
                aria-label="Call office"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-sm font-black text-white transition hover:bg-white/15"
              >
                C
              </a>
              <Link
                href="/admin/leads/login"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-primary transition hover:bg-white/90"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
                Today
              </p>
              <h1 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">
                Today's route
              </h1>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {dayStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-white/12 bg-white/10 p-3">
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/55">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-4 py-4 sm:py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Next job
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">Refrigerator not cooling</h2>
              <p className="mt-1 text-sm font-bold text-muted">09:30 / South Charlotte</p>
            </div>
            <span className="rounded-lg border border-sky-500/25 bg-sky-50 px-3 py-2 text-xs font-black uppercase text-sky-700">
              Scheduled
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-muted">
            <p className="rounded-lg bg-slate-50 px-3 py-2">Refrigerator</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2">South Charlotte</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link
              href="/admin/technician"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-3 text-sm font-black text-white transition hover:bg-primary/90"
            >
              Open route
            </Link>
            <a
              href="tel:+17042660508"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-3 text-sm font-black text-primary transition hover:bg-primary/5"
            >
              Call
            </a>
            <Link
              href="/admin/search"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary/15 bg-white px-3 text-sm font-black text-primary transition hover:bg-primary/5"
            >
              Search
            </Link>
            <Link
              href="/admin/invoices/new"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-accent/20 bg-red-50 px-3 text-sm font-black text-accent transition hover:bg-red-100"
            >
              New invoice
            </Link>
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Route queue
              </p>
              <h2 className="mt-1 text-xl font-black text-primary">Up next</h2>
            </div>
            <Link href="/admin/technician" className="text-sm font-black text-primary">
              View all
            </Link>
          </div>

          <div className="mt-4 grid gap-2">
            {nextSteps.map((job) => (
              <Link
                key={`${job.label}-${job.title}`}
                href="/admin/technician"
                className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-lg border border-border bg-slate-50 p-3 transition hover:border-primary/30 hover:bg-white"
              >
                <span className="text-sm font-black text-primary">{job.label}</span>
                <span>
                  <span className="block text-sm font-black text-primary">{job.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-muted">{job.note}</span>
                </span>
              </Link>
            ))}
          </div>
        </aside>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Technician mode
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">Field</h2>
            </div>
            <Link
              href="/admin/technician"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
            >
              Open today
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {technicianActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="grid grid-cols-[3.25rem_1fr] items-center gap-3 rounded-lg border border-border bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">
                  {action.label}
                </span>
                <span className="block text-lg font-black text-primary">{action.title}</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
            Field shortcuts
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
              <h2 className="mt-1 text-2xl font-black text-primary">Dispatch</h2>
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
              </Link>
            ))}
          </div>
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5 px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-black text-muted transition hover:bg-primary/5 hover:text-primary"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[0.65rem] text-primary">
                {item.mark}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
