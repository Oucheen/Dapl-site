import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { getCrmReminders, type CrmReminder } from "@/lib/crm-reminders";
import { listAccountingData, getMonthRange } from "@/lib/supabase-accounting";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import { listAllInvoiceParts, type InvoicePartRecord } from "@/lib/supabase-parts";
import {
  calculateInvoiceAmountDue,
  calculateInvoicePaidAmount,
  listInvoices,
  type InvoiceJobStatus,
  type InvoiceRecord,
  type InvoicePaymentRecord,
} from "@/lib/supabase-invoices";
import { logoutAdmin } from "./leads/actions";

const adminLinks = [
  {
    href: "/admin/search",
    title: "Global search",
    description: "Find customers, phones, addresses, invoices, appliances, technicians, and parts.",
    cta: "Search CRM",
  },
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
    href: "/admin/telegram",
    title: "Telegram access",
    description: "Manage technician bot users, Telegram IDs, CRM technician names, and roles.",
    cta: "Open bot access",
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

function getTodayDateInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHARLOTTE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(getDateForCharlotteDisplay(value));
}

function getJobStatus(invoice: InvoiceRecord): InvoiceJobStatus {
  return invoice.job_status ?? (invoice.service_date ? "scheduled" : "reschedule");
}

function getCharlotteDateFromTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHARLOTTE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getPaymentTotalsByInvoice(payments: InvoicePaymentRecord[]) {
  const totals = new Map<string, InvoicePaymentRecord[]>();

  for (const payment of payments) {
    totals.set(payment.invoice_id, [...(totals.get(payment.invoice_id) ?? []), payment]);
  }

  return totals;
}

function getReminderTone(reminder: CrmReminder) {
  if (reminder.severity === "high") {
    return "border-red-500/25 bg-red-50 text-red-800";
  }

  if (reminder.severity === "medium") {
    return "border-amber-500/25 bg-amber-50 text-amber-800";
  }

  return "border-sky-500/25 bg-sky-50 text-sky-800";
}

function getReminderAudienceLabel(audience: CrmReminder["audience"]) {
  if (audience === "owner") {
    return "Owner";
  }

  if (audience === "technician") {
    return "Technician";
  }

  return "Dispatch";
}

export default async function AdminPage() {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const today = getTodayDateInput();
  const monthRange = getMonthRange(today.slice(0, 7));
  let invoices: InvoiceRecord[] = [];
  let payments: InvoicePaymentRecord[] = [];
  let invoiceParts: InvoicePartRecord[] = [];
  let openPartsCount = 0;
  let dataError = "";

  try {
    const [invoiceRows, accountingData, partsData] = await Promise.all([
      listInvoices(500),
      listAccountingData({ start: monthRange.start, end: monthRange.end }),
      listAllInvoiceParts(500),
    ]);

    invoices = invoiceRows;
    payments = accountingData.payments;
    invoiceParts = partsData.parts;
    openPartsCount = partsData.parts.filter(
      (part) => part.status !== "installed" && part.status !== "returned" && part.status !== "canceled",
    ).length;
  } catch (caught) {
    dataError = caught instanceof Error ? caught.message : "Could not load dashboard data.";
  }

  const paymentsByInvoice = getPaymentTotalsByInvoice(payments);
  const todayInvoices = invoices
    .filter((invoice) => invoice.service_date === today && invoice.status !== "void")
    .sort((left, right) =>
      `${left.service_time ?? "99:99"} ${left.customer_name}`.localeCompare(
        `${right.service_time ?? "99:99"} ${right.customer_name}`,
      ),
    );
  const activeTodayInvoices = todayInvoices.filter((invoice) => {
    const jobStatus = getJobStatus(invoice);
    return jobStatus !== "done" && jobStatus !== "canceled";
  });
  const unscheduledInvoices = invoices.filter(
    (invoice) => !invoice.service_date && invoice.status !== "paid" && invoice.status !== "void",
  );
  const needPartsInvoices = invoices.filter(
    (invoice) => getJobStatus(invoice) === "need_parts" && invoice.status !== "void",
  );
  const unpaidInvoices = invoices
    .filter((invoice) => invoice.status !== "void")
    .map((invoice) => {
      const invoicePayments = paymentsByInvoice.get(invoice.id) ?? [];
      return {
        invoice,
        amountDue: calculateInvoiceAmountDue(invoice, invoicePayments),
      };
    })
    .filter((item) => item.amountDue > 0)
    .sort((left, right) => right.amountDue - left.amountDue);
  const collectedToday = payments
    .filter((payment) => getCharlotteDateFromTimestamp(payment.payment_date) === today)
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const reminders = getCrmReminders({ invoices, payments, parts: invoiceParts, today }).slice(0, 8);
  const todayDashboardCards = [
    {
      label: "Jobs today",
      value: todayInvoices.length,
      note: `${activeTodayInvoices.length} active`,
      href: `/admin/schedule?date=${today}`,
    },
    {
      label: "Need scheduling",
      value: unscheduledInvoices.length,
      note: "Open invoices without date",
      href: `/admin/schedule?date=${today}#unscheduled-invoices`,
    },
    {
      label: "Need parts",
      value: needPartsInvoices.length,
      note: `${openPartsCount} open part records`,
      href: "/admin/parts",
    },
    {
      label: "Unpaid",
      value: formatMoney(unpaidInvoices.reduce((sum, item) => sum + item.amountDue, 0)),
      note: `${unpaidInvoices.length} invoices`,
      href: "/admin/accounting",
    },
    {
      label: "Collected today",
      value: formatMoney(collectedToday),
      note: "Payments recorded today",
      href: "/admin/accounting",
    },
  ];

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
        {dataError ? (
          <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-black">Could not load today dashboard.</p>
            <p className="mt-2 break-words">{dataError}</p>
          </div>
        ) : null}

        <section className="mb-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-5 border-b border-border pb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Global search
            </p>
            <div className="mt-3">
              <AdminGlobalSearch />
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Today dashboard
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">{formatShortDate(today)}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/schedule?date=${today}`}
                className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                Open today
              </Link>
              <Link
                href="/admin/invoices/new"
                className="inline-flex rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
              >
                New invoice
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {todayDashboardCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="rounded-xl border border-border bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-sm"
              >
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
                  {card.label}
                </span>
                <span className="mt-2 block text-2xl font-black text-primary">{card.value}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{card.note}</span>
              </Link>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Reminders
                </p>
                <h3 className="mt-1 font-black text-primary">Needs attention</h3>
              </div>
              <Link href="/admin/schedule" className="text-xs font-bold text-primary">
                Dispatch
              </Link>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {reminders.length ? (
                reminders.map((reminder) => (
                  <Link
                    key={reminder.id}
                    href={reminder.href}
                    className={`rounded-lg border p-3 text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${getReminderTone(
                      reminder,
                    )}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-black">{reminder.title}</span>
                      <span className="shrink-0 rounded-full bg-white/80 px-2 py-1 text-[0.65rem] font-bold">
                        {getReminderAudienceLabel(reminder.audience)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5">{reminder.body}</span>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted">
                  Nothing urgent is waiting.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-primary">Next jobs</h3>
                <Link href={`/admin/schedule?date=${today}`} className="text-xs font-bold text-primary">
                  Schedule
                </Link>
              </div>
              <div className="mt-3 grid gap-2">
                {todayInvoices.length ? (
                  todayInvoices.slice(0, 5).map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/admin/invoices/${invoice.id}`}
                      className="rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-primary/5"
                    >
                      <span className="block font-black text-primary">{invoice.customer_name}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {invoice.service_time || invoice.service_window || "Time not set"} /{" "}
                        {invoice.assigned_technician || "No technician"}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted">No jobs on schedule today.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-primary">Needs action</h3>
                <Link href="/admin/schedule" className="text-xs font-bold text-primary">
                  Dispatch
                </Link>
              </div>
              <div className="mt-3 grid gap-2">
                {[...unscheduledInvoices.slice(0, 3), ...needPartsInvoices.slice(0, 2)].length ? (
                  [...unscheduledInvoices.slice(0, 3), ...needPartsInvoices.slice(0, 2)].map((invoice) => (
                    <Link
                      key={`${invoice.id}-${getJobStatus(invoice)}`}
                      href={`/admin/invoices/${invoice.id}`}
                      className="rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-primary/5"
                    >
                      <span className="block font-black text-primary">{invoice.customer_name}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {getJobStatus(invoice) === "need_parts" ? "Need parts" : "Need schedule"} /{" "}
                        {invoice.appliance || "Appliance not set"}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted">Nothing urgent is waiting.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-primary">Collect money</h3>
                <Link href="/admin/accounting" className="text-xs font-bold text-primary">
                  Accounting
                </Link>
              </div>
              <div className="mt-3 grid gap-2">
                {unpaidInvoices.length ? (
                  unpaidInvoices.slice(0, 5).map(({ invoice, amountDue }) => (
                    <Link
                      key={invoice.id}
                      href={`/admin/invoices/${invoice.id}`}
                      className="rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-primary/5"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-black text-primary">{invoice.customer_name}</span>
                        <span className="font-black text-primary">{formatMoney(amountDue)}</span>
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        Paid {formatMoney(calculateInvoicePaidAmount(paymentsByInvoice.get(invoice.id) ?? []))} /{" "}
                        total {formatMoney(invoice.total)}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted">No unpaid balances found.</p>
                )}
              </div>
            </div>
          </div>
        </section>

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
