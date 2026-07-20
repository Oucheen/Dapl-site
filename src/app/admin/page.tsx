import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { logoutAdmin } from "./leads/actions";

const adminLinks = [
  {
    href: "/admin/leads",
    title: "Leads",
    description: "Website requests, customer details, statuses, and invoice creation.",
    cta: "Open leads",
  },
  {
    href: "/admin/schedule",
    title: "Dispatch schedule",
    description: "Day and week schedule, technician filters, maps, routes, and conflicts.",
    cta: "Open schedule",
  },
  {
    href: "/admin/technician",
    title: "Technician day",
    description: "Simple daily view for field updates: call, maps, job status, and invoice.",
    cta: "Open technician view",
  },
  {
    href: "/admin/invoices",
    title: "Invoices",
    description: "Invoice list, payments, line items, parts, and customer timeline.",
    cta: "Open invoices",
  },
  {
    href: "/admin/accounting",
    title: "Accounting",
    description: "Monthly revenue, collected payments, expenses, profit, and receivables.",
    cta: "Open accounting",
  },
  {
    href: "/admin/parts",
    title: "Parts inventory",
    description: "Track needed, ordered, received, installed, returned, and expensed job parts.",
    cta: "Open parts",
  },
];

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="text-sm font-bold text-muted hover:text-primary">
              Back to site
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Admin dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Quick links for dispatch, technicians, invoices, and accounting.
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Signed in as {permissions.user.name}
            </p>
          </div>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="container-shell py-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {adminLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                CRM
              </span>
              <span className="mt-2 block text-2xl font-black text-primary">{item.title}</span>
              <span className="mt-3 block text-sm leading-6 text-muted">{item.description}</span>
              <span className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition group-hover:bg-primary/90">
                {item.cta}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
