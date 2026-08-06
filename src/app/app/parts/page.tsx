import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAdmin } from "@/app/admin/leads/actions";
import { AppBottomNav } from "@/components/app-field/app-shell";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Parts | DAPL Field App",
  description: "Parts workspace for DAPL field users.",
  manifest: "/dapl-field.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AppPartsPage() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login?returnTo=/app/parts");
  }

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
            Parts
          </h1>
        </div>
      </section>

      <section className="container-shell grid gap-4 py-4 sm:py-6">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
            Parts
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link
              href="/app/parts"
              className="flex min-h-14 items-center justify-between rounded-lg bg-primary px-4 text-sm font-black text-white"
            >
              <span>Parts board</span>
              <span>Open</span>
            </Link>
            <Link
              href="/app"
              className="flex min-h-14 items-center justify-between rounded-lg border border-amber-500/25 bg-amber-50 px-4 text-sm font-black text-amber-800"
            >
              <span>Add job part</span>
              <span>Route</span>
            </Link>
          </div>
        </div>
      </section>

      <AppBottomNav activeHref="/app/parts" />
    </main>
  );
}
