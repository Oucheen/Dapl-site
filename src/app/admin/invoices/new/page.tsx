import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { getCrmTechnicianNames } from "@/lib/crm-technicians";
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
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const canBackdateManualInvoices = permissions.canBackdateManualInvoices;
  const technicians = await getCrmTechnicianNames();

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
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="inline-flex w-fit items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/search"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Search
            </Link>
            <Link
              href="/admin/leads"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              View leads
            </Link>
          </div>
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
                  Promo code optional
                  <select
                    name="promoCode"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                  >
                    <option value="">No promo code</option>
                    <option value="WEB25">WEB25 - $25 off first repair</option>
                    <option value="RETURN15">RETURN15 - $15 off returning customer</option>
                  </select>
                </label>
                <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Technician
                  <input
                    name="assignedTechnician"
                    list="crm-technicians"
                    placeholder="Name"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
                  />
                </label>
              </div>
            </section>

            <datalist id="crm-technicians">
              {technicians.map((technician) => (
                <option key={technician} value={technician} />
              ))}
            </datalist>

            {canBackdateManualInvoices ? (
              <section className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    Historical import
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Optional leadership-only dates for adding older customers and matching old
                    invoice records. Service date controls the job date shown on the invoice;
                    invoice created date and time control the invoice number prefix and Created
                    timestamp. Use this for phone calls, business-card calls, and older records.
                  </p>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Lead created date optional
                    <input
                      type="date"
                      name="leadCreatedAt"
                      className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Lead created time optional
                    <input
                      type="time"
                      name="leadCreatedTime"
                      className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Invoice created date optional
                    <input
                      type="date"
                      name="invoiceCreatedAt"
                      className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                    />
                  </label>
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Invoice created time optional
                    <input
                      type="time"
                      name="invoiceCreatedTime"
                      className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                    />
                  </label>
                </div>
              </section>
            ) : null}

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
              {canBackdateManualInvoices ? (
                <li>Leadership can set historical lead and invoice dates for old records.</li>
              ) : null}
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
