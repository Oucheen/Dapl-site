import Link from "next/link";
import { redirect } from "next/navigation";
import { PricebookSearch } from "@/components/admin/pricebook-search";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { pricebookEntries } from "@/lib/pricebook";

export const dynamic = "force-dynamic";

export default async function PricebookPage() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-bold text-muted hover:text-primary">
              Back to admin
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">Price book</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Fast price lookup for calls. Search any service or part and read the customer price immediately.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Signed in as</p>
            <p className="mt-1 font-black text-primary">{permissions.user.name}</p>
          </div>
        </div>
      </header>
      <section className="container-shell py-6 sm:py-8">
        <div className="mb-5 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 sm:px-5">
          <p className="font-black">Brand groups are included in the price book.</p>
          <p className="mt-1">
            Brand groups are read from subcategory 2. Use the brand filter to narrow the list before quoting a customer. Some source rows combine multiple brands in one group.
          </p>
        </div>
        <PricebookSearch entries={pricebookEntries} />
      </section>
    </main>
  );
}
