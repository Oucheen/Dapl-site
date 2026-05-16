import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createManualInvoiceAction } from "./actions";

const APPLIANCE_OPTIONS = [
  "",
  "Refrigerator",
  "Washer",
  "Dryer",
  "Dishwasher",
  "Oven",
  "Cooktop",
  "Freezer",
  "Ice Machine",
  "Wine Cooler",
  "Commercial Refrigerator",
  "Other / not sure",
];

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/invoices"
              className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70"
            >
              Back to invoices
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Create manual invoice
            </h1>
          </div>
          <Link
            href="/admin/leads"
            className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
          >
            View leads
          </Link>
        </div>
      </header>

      <section className="container-shell py-8">
        <form
          action={createManualInvoiceAction}
          className="grid gap-6 rounded-2xl border border-border bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px] sm:p-7"
        >
          <div className="grid gap-5">
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Customer
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Name
                  <input
                    name="name"
                    required
                    placeholder="Customer name"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Phone
                  <input
                    name="phone"
                    required
                    placeholder="+1 (704) 000-0000"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Email optional
                  <input
                    type="email"
                    name="email"
                    placeholder="customer@email.com"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Service address
                  <input
                    name="address"
                    required
                    placeholder="Street address, city, ZIP"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
              </div>
            </section>

            <section>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Job details
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Appliance
                  <select
                    name="appliance"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                  >
                    {APPLIANCE_OPTIONS.map((option) => (
                      <option key={option || "empty"} value={option}>
                        {option || "Select type"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Service date optional
                  <input
                    type="date"
                    name="serviceDate"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Estimate
                  <input
                    type="number"
                    name="estimatedPrice"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Technician
                  <input
                    name="assignedTechnician"
                    placeholder="Name"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
              </div>
            </section>

            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Notes
              <textarea
                name="notes"
                rows={6}
                placeholder="Issue, call notes, parts, customer requests..."
                className="min-h-36 rounded-xl border border-border bg-white px-4 py-3 text-sm font-normal normal-case leading-6 tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
              />
            </label>
          </div>

          <aside className="self-start rounded-2xl border border-border bg-slate-50/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              What happens next
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li>A manual lead is created with source `manual-admin`.</li>
              <li>A draft invoice is created from these details.</li>
              <li>The lead is moved to `invoiced` automatically.</li>
              <li>You can edit line items on the next screen.</li>
            </ul>
            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Create invoice
            </button>
          </aside>
        </form>
      </section>
    </main>
  );
}
