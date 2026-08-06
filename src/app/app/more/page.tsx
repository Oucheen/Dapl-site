import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAdmin } from "@/app/admin/leads/actions";
import { AppBottomNav } from "@/components/app-field/app-shell";
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

      <AppBottomNav activeHref="/app/more" />
    </main>
  );
}
