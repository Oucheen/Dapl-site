import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import {
  expensesTableSql,
  getMonthRange,
  listAccountingData,
  type ExpenseRecord,
} from "@/lib/supabase-accounting";
import { addExpense, deleteExpense } from "./actions";

export const dynamic = "force-dynamic";

const expenseCategories = [
  "Parts",
  "Gas",
  "Tools",
  "Ads",
  "Software",
  "Subcontractor",
  "Refund",
  "Office",
  "Other",
];

const paymentMethods = ["Cash", "Card", "Zelle", "Check", "Bank transfer", "Other"];

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/New_York",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00-05:00`));
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getNotice(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sumMoney<T>(items: T[], getValue: (item: T) => number | string | null | undefined) {
  return Math.round(
    items.reduce((sum, item) => {
      const amount = Number(getValue(item) ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0) * 100,
  ) / 100;
}

function isDateInRange(value: string | null | undefined, start: string, end: string) {
  if (!value) {
    return false;
  }

  const date = value.slice(0, 10);
  return date >= start && date < end;
}

function expenseCategoryTotals(expenses: ExpenseRecord[]) {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + Number(expense.amount ?? 0));
  }

  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

function getMonthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
}

function getPreviousMonth(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getNextMonth(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function returnTo(month: string) {
  return `/admin/accounting?month=${encodeURIComponent(month)}`;
}

function getPaymentTotalsByInvoice(payments: Awaited<ReturnType<typeof listAccountingData>>["payments"]) {
  const totals = new Map<string, number>();

  for (const payment of payments) {
    totals.set(payment.invoice_id, (totals.get(payment.invoice_id) ?? 0) + Number(payment.amount ?? 0));
  }

  return totals;
}

function getExpenseTotalsByInvoice(expenses: ExpenseRecord[]) {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    if (!expense.invoice_id) {
      continue;
    }

    totals.set(expense.invoice_id, (totals.get(expense.invoice_id) ?? 0) + Number(expense.amount ?? 0));
  }

  return totals;
}

export default async function AccountingAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string | string[];
    notice?: string | string[];
    expenseId?: string | string[];
  }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const params = await searchParams;
  const monthRange = getMonthRange(getQueryValue(params?.month));
  const notice = getNotice(params?.notice);
  const selectedExpenseId = getQueryValue(params?.expenseId);
  let data: Awaited<ReturnType<typeof listAccountingData>> = {
    invoices: [],
    payments: [],
    expenses: [],
    expensesReady: true,
  };
  let error = "";

  try {
    data = await listAccountingData({
      start: monthRange.start,
      end: monthRange.end,
    });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load accounting data.";
  }

  const periodInvoices = data.invoices.filter((invoice) =>
    isDateInRange(invoice.created_at, monthRange.start, monthRange.end),
  );
  const periodPayments = data.payments.filter((payment) =>
    isDateInRange(payment.payment_date, monthRange.start, monthRange.end),
  );
  const nonVoidPeriodInvoices = periodInvoices.filter((invoice) => invoice.status !== "void");
  const paymentTotalsByInvoice = getPaymentTotalsByInvoice(data.payments);
  const expenseTotalsByInvoice = getExpenseTotalsByInvoice(data.expenses);
  const openReceivables = data.invoices
    .filter((invoice) => invoice.status !== "void")
    .map((invoice) => {
      const paid = paymentTotalsByInvoice.get(invoice.id) ?? 0;
      const amountDue = Math.max(0, Number(invoice.total ?? 0) - paid);

      return { invoice, paid, amountDue };
    })
    .filter((item) => item.amountDue > 0.009)
    .sort((a, b) => b.amountDue - a.amountDue);
  const revenue = sumMoney(nonVoidPeriodInvoices, (invoice) => invoice.total);
  const collected = sumMoney(periodPayments, (payment) => payment.amount);
  const expenses = sumMoney(data.expenses, (expense) => expense.amount);
  const unpaid = sumMoney(openReceivables, (item) => item.amountDue);
  const profit = collected - expenses;
  const categoryTotals = expenseCategoryTotals(data.expenses);
  const jobProfitRows = nonVoidPeriodInvoices
    .map((invoice) => {
      const paid = paymentTotalsByInvoice.get(invoice.id) ?? 0;
      const linkedExpenses = expenseTotalsByInvoice.get(invoice.id) ?? 0;
      const estimatedProfit = paid - linkedExpenses;

      return { invoice, paid, linkedExpenses, estimatedProfit };
    })
    .filter((item) => item.paid > 0 || item.linkedExpenses > 0)
    .sort((a, b) => b.estimatedProfit - a.estimatedProfit)
    .slice(0, 12);
  const canManageExpenses = permissions.hasElevatedAccess && data.expensesReady && !error;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin/leads"
              className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70"
            >
              Back to leads
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Accounting
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Lightweight monthly view for collected payments, open invoice value, expenses, and
              estimated profit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/search"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Search
            </Link>
            <Link
              href="/admin/invoices"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              View invoices
            </Link>
            <Link
              href="/admin/checks"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Checks
            </Link>
            <Link
              href="/admin/schedule"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Schedule
            </Link>
            <Link
              href="/admin/parts"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Parts inventory
            </Link>
            <Link
              href="/admin/technician"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Technician day
            </Link>
            <Link
              href="/admin/leads"
              className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              View leads
            </Link>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Reporting month
            </p>
            <h2 className="mt-2 text-2xl font-black text-primary">
              {getMonthLabel(monthRange.month)}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/accounting?month=${getPreviousMonth(monthRange.month)}`}
              className="rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Previous
            </Link>
            <form action="/admin/accounting" className="flex gap-2">
              <input
                type="month"
                name="month"
                defaultValue={monthRange.month}
                className="rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-primary outline-none ring-primary/30 focus:border-primary focus:ring-2"
              />
              <button
                type="submit"
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                Apply
              </button>
            </form>
            <Link
              href={`/admin/accounting?month=${getNextMonth(monthRange.month)}`}
              className="rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Next
            </Link>
            <a
              href={`/admin/accounting/export?month=${encodeURIComponent(monthRange.month)}`}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Export CSV
            </a>
          </div>
        </div>

        {notice === "expense_added" ? (
          <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
            Expense added.
          </div>
        ) : null}

        {notice === "expense_deleted" ? (
          <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
            Expense deleted.
          </div>
        ) : null}

        {notice === "permission_denied" ? (
          <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/5 p-5 text-sm font-bold text-accent">
            Only owner, boss, admin, or manager roles can manage expenses.
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/5 p-5 text-sm leading-6 text-foreground">
            <p className="font-bold text-accent">Could not load accounting data.</p>
            <p className="mt-2 font-mono text-xs">{error}</p>
          </div>
        ) : null}

        {!data.expensesReady ? (
          <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <p className="font-black">Expenses table is not ready yet</p>
            <p className="mt-2">
              Run this SQL in Supabase SQL Editor to enable manual expense tracking.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-white p-4 text-xs leading-6 text-foreground">
              {expensesTableSql}
            </pre>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Invoice value", value: revenue, note: "Non-void invoices created this month" },
            { label: "Collected", value: collected, note: "Payments recorded this month" },
            { label: "Open receivables", value: unpaid, note: "Unpaid balance from current and past invoices" },
            { label: "Expenses", value: expenses, note: "Manual expenses this month" },
            { label: "Estimated profit", value: profit, note: "Collected minus expenses" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-black text-primary">{formatMoney(card.value)}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{card.note}</p>
            </div>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-xl font-black text-primary">Open receivables</h2>
            <p className="mt-1 text-sm text-muted">
              Current and past invoices with remaining balance before the end of{" "}
              {getMonthLabel(monthRange.month)}.
            </p>
          </div>

          {openReceivables.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm leading-6 text-muted">
              No unpaid invoice balances found for this period.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {openReceivables.slice(0, 12).map(({ invoice, paid, amountDue }) => (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_130px_130px_130px]"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Invoice
                    </p>
                    <p className="mt-2 break-words font-black text-primary">
                      {invoice.invoice_number}
                    </p>
                    <p className="mt-1 break-words text-sm text-muted">
                      {invoice.customer_name} - {formatDate(invoice.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Total
                    </p>
                    <p className="mt-2 font-black text-foreground">
                      {formatMoney(invoice.total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Paid
                    </p>
                    <p className="mt-2 font-black text-foreground">{formatMoney(paid)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Due
                    </p>
                    <p className="mt-2 font-black text-accent">{formatMoney(amountDue)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-xl font-black text-primary">Profit by job</h2>
            <p className="mt-1 text-sm text-muted">
              Uses collected payments minus expenses linked to each invoice.
            </p>
          </div>

          {jobProfitRows.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm leading-6 text-muted">
              Job profit appears after payments and invoice-linked expenses are recorded.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {jobProfitRows.map(({ invoice, paid, linkedExpenses, estimatedProfit }) => (
                <Link
                  key={invoice.id}
                  href={`/admin/invoices/${invoice.id}`}
                  className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_120px_120px_130px]"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Job
                    </p>
                    <p className="mt-2 break-words font-black text-primary">
                      {invoice.customer_name}
                    </p>
                    <p className="mt-1 break-words text-sm text-muted">
                      {invoice.invoice_number} / {invoice.appliance || "Appliance not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Collected
                    </p>
                    <p className="mt-2 font-black text-foreground">{formatMoney(paid)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Expenses
                    </p>
                    <p className="mt-2 font-black text-accent">{formatMoney(linkedExpenses)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Profit
                    </p>
                    <p className="mt-2 font-black text-primary">{formatMoney(estimatedProfit)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-primary">Add expense</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Track parts, gas, tools, ads, software, refunds, and other business costs.
                </p>
              </div>
            </div>

            <form action={addExpense} className="mt-5 grid gap-4">
              <input type="hidden" name="returnTo" value={returnTo(monthRange.month)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Date
                  <input
                    type="date"
                    name="expenseDate"
                    defaultValue={`${monthRange.month}-01`}
                    required
                    disabled={!canManageExpenses}
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100 disabled:text-muted"
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Category
                  <select
                    name="category"
                    required
                    disabled={!canManageExpenses}
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100 disabled:text-muted"
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Amount
                  <input
                    type="number"
                    name="amount"
                    min="0.01"
                    step="0.01"
                    required
                    disabled={!canManageExpenses}
                    placeholder="0.00"
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 disabled:bg-slate-100 disabled:text-muted"
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Payment method
                  <select
                    name="paymentMethod"
                    disabled={!canManageExpenses}
                    className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 disabled:bg-slate-100 disabled:text-muted"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Vendor
                <input
                  type="text"
                  name="vendor"
                  disabled={!canManageExpenses}
                  placeholder="Vendor or store"
                  className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 disabled:bg-slate-100 disabled:text-muted"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Description
                <input
                  type="text"
                  name="description"
                  required
                  disabled={!canManageExpenses}
                  placeholder="Compressor, gas, Google Ads, tool..."
                  className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 disabled:bg-slate-100 disabled:text-muted"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Note
                <textarea
                  name="note"
                  rows={3}
                  disabled={!canManageExpenses}
                  placeholder="Optional internal note"
                  className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-normal normal-case leading-6 tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 disabled:bg-slate-100 disabled:text-muted"
                />
              </label>
              <button
                type="submit"
                disabled={!canManageExpenses}
                className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add expense
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-primary">Expense breakdown</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Quick category view for the selected month.
            </p>

            <div className="mt-5 space-y-3">
              {categoryTotals.length > 0 ? (
                categoryTotals.map((item) => (
                  <div key={item.category} className="rounded-xl border border-border bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-black text-primary">{item.category}</p>
                      <p className="font-black text-foreground">{formatMoney(item.total)}</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${expenses ? Math.min(100, (item.total / expenses) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                  No expenses recorded for this month yet.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-xl font-black text-primary">Monthly expenses</h2>
            <p className="mt-1 text-sm text-muted">
              {data.expenses.length} expense records for {getMonthLabel(monthRange.month)}.
            </p>
          </div>

          {data.expenses.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm leading-6 text-muted">
              Manual expenses will appear here after you add them.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.expenses.map((expense) => {
                const isSelectedExpense = expense.id === selectedExpenseId;

                return (
                <div
                  id={`expense-${expense.id}`}
                  key={expense.id}
                  className={`scroll-mt-6 grid gap-4 px-5 py-5 md:grid-cols-[130px_minmax(0,1fr)_130px_90px] ${
                    isSelectedExpense ? "bg-emerald-50 ring-2 ring-inset ring-emerald-500/30" : ""
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Date
                    </p>
                    <p className="mt-2 font-bold text-foreground">{formatDate(expense.expense_date)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Expense
                    </p>
                    <p className="mt-2 break-words font-black text-primary">
                      {expense.description}
                    </p>
                    <p className="mt-1 break-words text-sm text-muted">
                      {expense.category}
                      {expense.vendor ? ` / ${expense.vendor}` : ""}
                      {expense.payment_method ? ` / ${expense.payment_method}` : ""}
                    </p>
                    {expense.invoice_id ? (
                      <Link
                        href={`/admin/invoices/${expense.invoice_id}`}
                        className="mt-2 inline-flex rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary/5"
                      >
                        Open linked invoice
                      </Link>
                    ) : null}
                    {expense.note ? (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                        {expense.note}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Amount
                    </p>
                    <p className="mt-2 text-lg font-black text-primary">
                      {formatMoney(expense.amount)}
                    </p>
                  </div>
                  <div>
                    {permissions.hasElevatedAccess ? (
                      <form action={deleteExpense}>
                        <input type="hidden" name="returnTo" value={returnTo(monthRange.month)} />
                        <input type="hidden" name="expenseId" value={expense.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-accent/20 bg-white px-3 py-2 text-xs font-bold text-accent transition hover:bg-accent/5"
                        >
                          Delete
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
