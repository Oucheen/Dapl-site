import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { type InvoiceRecord, type InvoiceStatus, listInvoices } from "@/lib/supabase-invoices";

const statusClasses: Record<InvoiceStatus, string> = {
  draft: "border-primary/20 bg-primary/5 text-primary",
  sent: "border-amber-500/25 bg-amber-50 text-amber-700",
  paid: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  void: "border-slate-300 bg-slate-100 text-slate-500",
};

const STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

const OPEN_STATUSES = new Set<InvoiceStatus>(["draft", "sent"]);
const ARCHIVE_STATUSES = new Set<InvoiceStatus>(["paid", "void"]);

const INVOICE_VIEWS = [
  {
    value: "open",
    label: "Open",
    description: "Draft and sent invoices that still need attention.",
  },
  {
    value: "archive",
    label: "Archive",
    description: "Paid and void invoices kept out of the daily queue.",
  },
  {
    value: "all",
    label: "All",
    description: "Every invoice, including active and closed work.",
  },
] as const;

export const dynamic = "force-dynamic";

type InvoiceStatusFilter = InvoiceStatus | "all";
type InvoiceViewFilter = (typeof INVOICE_VIEWS)[number]["value"];

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function invoiceCountLabel(count: number) {
  return count === 1 ? "invoice" : "invoices";
}

function getInvoiceStatusFilter(value: string | string[] | undefined): InvoiceStatusFilter {
  const status = Array.isArray(value) ? value[0] : value;

  if (!status || status === "all") {
    return "all";
  }

  return STATUSES.find((item) => item.value === status)?.value ?? "all";
}

function getInvoiceViewFilter(value: string | string[] | undefined): InvoiceViewFilter {
  const view = Array.isArray(value) ? value[0] : value;

  return INVOICE_VIEWS.find((item) => item.value === view)?.value ?? "open";
}

function getSearchQuery(value: string | string[] | undefined) {
  const query = Array.isArray(value) ? value[0] : value;
  return query?.trim() ?? "";
}

function getViewHref(view: InvoiceViewFilter, query: string) {
  const params = new URLSearchParams();

  if (view !== "open") {
    params.set("view", view);
  }

  if (query) {
    params.set("q", query);
  }

  const queryString = params.toString();
  return queryString ? `/admin/invoices?${queryString}` : "/admin/invoices";
}

function getFilterHref(status: InvoiceStatusFilter, query: string, view: InvoiceViewFilter) {
  const params = new URLSearchParams();
  const statusView =
    status === "all"
      ? view
      : ARCHIVE_STATUSES.has(status)
        ? "archive"
        : OPEN_STATUSES.has(status)
          ? "open"
          : view;

  if (statusView !== "open") {
    params.set("view", statusView);
  }

  if (status !== "all") {
    params.set("status", status);
  }

  if (query) {
    params.set("q", query);
  }

  const queryString = params.toString();
  return queryString ? `/admin/invoices?${queryString}` : "/admin/invoices";
}

function normalizeSearchText(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? "";
}

function invoiceMatchesQuery(invoice: InvoiceRecord, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    invoice.invoice_number,
    invoice.customer_name,
    invoice.customer_phone,
    invoice.customer_email,
    invoice.service_address,
    invoice.appliance,
    invoice.service_date,
    invoice.assigned_technician,
    invoice.notes,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return haystack.includes(query.toLowerCase());
}

function countByStatus(invoices: InvoiceRecord[]) {
  return invoices.reduce(
    (acc, invoice) => {
      acc[invoice.status] += 1;
      return acc;
    },
    {
      draft: 0,
      sent: 0,
      paid: 0,
      void: 0,
    } satisfies Record<InvoiceStatus, number>,
  );
}

function invoiceMatchesView(invoice: InvoiceRecord, view: InvoiceViewFilter) {
  if (view === "all") {
    return true;
  }

  return view === "archive"
    ? ARCHIVE_STATUSES.has(invoice.status)
    : OPEN_STATUSES.has(invoice.status);
}

function getEmptyStateCopy({
  selectedStatus,
  selectedView,
  searchQuery,
}: {
  selectedStatus: InvoiceStatusFilter;
  selectedView: InvoiceViewFilter;
  searchQuery: string;
}) {
  if (searchQuery || selectedStatus !== "all") {
    return "No invoices match this filter yet.";
  }

  if (selectedView === "archive") {
    return "Paid and void invoices will move here automatically.";
  }

  return "Create an invoice from a lead or add one manually and it will appear here.";
}

export default async function InvoicesAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string | string[];
    q?: string | string[];
    view?: string | string[];
  }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/leads/login");
  }

  let invoices: Awaited<ReturnType<typeof listInvoices>> = [];
  let error = "";

  try {
    invoices = await listInvoices(200);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load invoices.";
  }

  const params = await searchParams;
  const selectedStatus = getInvoiceStatusFilter(params?.status);
  const selectedView = getInvoiceViewFilter(params?.view);
  const searchQuery = getSearchQuery(params?.q);
  const searchedInvoices = invoices.filter((invoice) => invoiceMatchesQuery(invoice, searchQuery));
  const viewInvoices = searchedInvoices.filter((invoice) => invoiceMatchesView(invoice, selectedView));
  const counts = countByStatus(viewInvoices);
  const visibleInvoices =
    selectedStatus === "all"
      ? viewInvoices
      : searchedInvoices.filter((invoice) => invoice.status === selectedStatus);
  const viewCounts = {
    open: searchedInvoices.filter((invoice) => OPEN_STATUSES.has(invoice.status)).length,
    archive: searchedInvoices.filter((invoice) => ARCHIVE_STATUSES.has(invoice.status)).length,
    all: searchedInvoices.length,
  } satisfies Record<InvoiceViewFilter, number>;
  const filterItems: { value: InvoiceStatusFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: viewInvoices.length },
    ...STATUSES.map((status) => ({
      value: status.value as InvoiceStatusFilter,
      label: status.label,
      count: counts[status.value],
    })),
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/leads"
              className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70"
            >
              Back to leads
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Website invoices
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/invoices/new"
              className="inline-flex w-fit items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Create manual invoice
            </Link>
            <Link
              href="/admin/leads"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              View leads
            </Link>
            <Link
              href="/admin/schedule"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Schedule
            </Link>
            <Link
              href="/admin/technician"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Technician day
            </Link>
            <Link
              href="/admin/accounting"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Accounting
            </Link>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        <div className="grid gap-3 md:grid-cols-3">
          {INVOICE_VIEWS.map((view) => {
            const isActive = selectedView === view.value;

            return (
              <Link
                key={view.value}
                href={getViewHref(view.value, searchQuery)}
                className={`rounded-2xl border px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md ${
                  isActive
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border bg-white text-primary"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.18em] ${
                        isActive ? "text-primary-foreground/75" : "text-muted"
                      }`}
                    >
                      {view.label}
                    </p>
                    <p
                      className={`mt-2 text-sm leading-6 ${
                        isActive ? "text-primary-foreground/80" : "text-muted"
                      }`}
                    >
                      {view.description}
                    </p>
                  </div>
                  <p className="text-3xl font-black">{viewCounts[view.value]}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filterItems.map((status) => {
            const isActive = selectedStatus === status.value;

            return (
              <Link
                key={status.value}
                href={getFilterHref(status.value, searchQuery, selectedView)}
                className={`rounded-2xl border px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md ${
                  isActive
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border bg-white text-primary"
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-[0.16em] ${
                    isActive ? "text-primary-foreground/75" : "text-muted"
                  }`}
                >
                  {status.label}
                </p>
                <p className="mt-2 text-3xl font-black">{status.count}</p>
              </Link>
            );
          })}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-accent/25 bg-accent/5 p-5 text-sm leading-6 text-foreground">
            <p className="font-bold text-accent">Could not load Supabase invoices.</p>
            <p className="mt-2 font-mono text-xs">{error}</p>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-black text-primary">Latest invoices</h2>
              <p className="mt-1 text-sm text-muted">
                Showing {visibleInvoices.length} {invoiceCountLabel(visibleInvoices.length)}
                {` in ${selectedView} invoices`}
                {selectedStatus === "all" ? "" : ` with ${selectedStatus} status`}
                {searchQuery ? ` matching "${searchQuery}"` : ""}.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form action="/admin/invoices" className="flex min-w-0 gap-2">
                {selectedView !== "open" ? (
                  <input type="hidden" name="view" value={selectedView} />
                ) : null}
                {selectedStatus !== "all" ? (
                  <input type="hidden" name="status" value={selectedStatus} />
                ) : null}
                <input
                  type="search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Search invoice, customer, address..."
                  className="min-w-0 flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2 sm:w-80"
                />
                <button
                  type="submit"
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  Search
                </button>
              </form>
              {searchQuery || selectedStatus !== "all" || selectedView !== "open" ? (
                <Link
                  href="/admin/invoices"
                  className="text-sm font-bold text-muted underline-offset-4 hover:text-primary hover:underline"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </div>

          {visibleInvoices.length === 0 && !error ? (
            <div className="px-5 py-12 text-center">
              <p className="text-lg font-bold text-primary">No invoices yet</p>
              <p className="mt-2 text-sm text-muted">
                {getEmptyStateCopy({ selectedStatus, selectedView, searchQuery })}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 md:grid-cols-[1fr_1fr_140px_120px]"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Invoice
                    </p>
                    <p className="mt-2 font-black text-primary">{invoice.invoice_number}</p>
                    <p className="mt-1 text-sm text-muted">{formatDate(invoice.created_at)} ET</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Customer
                    </p>
                    <p className="mt-2 font-bold text-foreground">{invoice.customer_name}</p>
                    <p className="mt-1 break-words text-sm text-muted">
                      {invoice.appliance || "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Status
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[invoice.status]}`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Total
                    </p>
                    <p className="mt-2 text-lg font-black text-primary">
                      {formatMoney(invoice.total)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
