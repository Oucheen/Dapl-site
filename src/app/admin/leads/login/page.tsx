import Link from "next/link";
import { redirect } from "next/navigation";
import { PasswordField } from "@/components/admin/password-field";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { loginAdmin } from "../actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function LeadsLoginPage({ searchParams }: LoginPageProps) {
  if (await isAdminAuthenticated()) {
    redirect("/admin/leads");
  }

  const params = await searchParams;
  const hasError = params?.error === "1";
  const configured = isAdminConfigured();

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc,#eef4fb)] px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <section className="w-full rounded-2xl border border-border bg-white p-6 shadow-xl shadow-primary/10 sm:p-8">
          <Link href="/" className="text-sm font-semibold text-primary hover:underline">
            Back to site
          </Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-accent">
            Leads Admin
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-primary">
            Sign in to view requests
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Use your private admin password to view incoming website leads and update
            their status. Staff passwords can be tied to names for activity history.
          </p>

          {!configured ? (
            <div className="mt-6 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm leading-6 text-foreground">
              Add <span className="font-mono font-semibold">LEADS_ADMIN_PASSWORD</span> in
              Vercel Environment Variables before using this page, or configure
              <span className="font-mono font-semibold"> LEADS_ADMIN_USERS</span> for
              multiple staff passwords.
            </div>
          ) : (
            <form action={loginAdmin} className="mt-7 space-y-5">
              <div>
                <label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </label>
                <PasswordField />
              </div>

              {hasError ? (
                <p className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
                  Password is incorrect.
                </p>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 transition hover:bg-primary/90"
              >
                Open admin dashboard
              </button>
            </form>
          )}

          <div className="mt-7 border-t border-border pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Quick links after sign in
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Leads", "Schedule", "Technician day", "Invoices", "Accounting"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
