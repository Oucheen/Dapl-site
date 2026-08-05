import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAdmin } from "@/app/admin/leads/actions";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "More | DAPL Field App",
  description: "More workspace links for DAPL field users.",
  manifest: "/dapl-field.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
};

const navItems = [
  { href: "/app", label: "Today", mark: "T" },
  { href: "/app/search", label: "Search", mark: "S" },
  { href: "/app/parts", label: "Parts", mark: "P" },
  { href: "/app/invoices", label: "Invoices", mark: "I" },
  { href: "/app/more", label: "More", mark: "M" },
];

export default async function AppMorePage() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login?returnTo=/app/more");
  }

  const links = permissions.hasTechnicianAccess
    ? [
        { label: "Today route", href: "/app" },
        { label: "Invoices", href: "/app/invoices" },
        { label: "Search", href: "/app/search" },
      ]
    : [
        { label: "Dashboard", href: "/app" },
        { label: "Invoices", href: "/app/invoices" },
        { label: "Search", href: "/app/search" },
        { label: "Parts", href: "/app/parts" },
      ];

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
          <h1 className="mt-7 text-3xl font-black tracking-tight text-white sm:text-5xl">
            More
          </h1>
        </div>
      </section>

      <section className="container-shell grid gap-4 py-4 sm:py-6">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
            Tools
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-14 items-center justify-between rounded-lg border border-border bg-slate-50 px-4 text-sm font-black text-primary"
              >
                <span>{item.label}</span>
                <span>Open</span>
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
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-black ${
                item.href === "/app/more" ? "bg-primary/5 text-primary" : "text-muted"
              }`}
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
