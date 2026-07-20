import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { getMonthRange, listAccountingData } from "@/lib/supabase-accounting";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: Array<string | number | null | undefined>) {
  return values.map(csvCell).join(",");
}

function sumMoney(values: Array<number | string | null | undefined>) {
  return Math.round(
    values.reduce<number>((sum, value) => {
      const amount = Number(value ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0) * 100,
  ) / 100;
}

function getPaymentTotalsByInvoice(payments: Awaited<ReturnType<typeof listAccountingData>>["payments"]) {
  const totals = new Map<string, number>();

  for (const payment of payments) {
    totals.set(payment.invoice_id, (totals.get(payment.invoice_id) ?? 0) + Number(payment.amount ?? 0));
  }

  return totals;
}

export async function GET(request: Request) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const monthRange = getMonthRange(url.searchParams.get("month"));
  const data = await listAccountingData({
    start: monthRange.start,
    end: monthRange.end,
  });
  const invoicesById = new Map(data.invoices.map((invoice) => [invoice.id, invoice]));
  const paymentTotalsByInvoice = getPaymentTotalsByInvoice(data.payments);
  const periodInvoices = data.invoices.filter(
    (invoice) => invoice.created_at.slice(0, 10) >= monthRange.start,
  );
  const lines = [
    csvRow([
      "type",
      "date",
      "invoice_number",
      "customer",
      "category",
      "description",
      "payment_method",
      "amount",
      "invoice_total",
      "paid_total",
      "amount_due",
      "linked_invoice_id",
    ]),
  ];

  for (const invoice of periodInvoices) {
    const paid = paymentTotalsByInvoice.get(invoice.id) ?? 0;
    const amountDue = Math.max(0, Number(invoice.total ?? 0) - paid);

    lines.push(
      csvRow([
        "invoice",
        invoice.created_at.slice(0, 10),
        invoice.invoice_number,
        invoice.customer_name,
        invoice.status,
        invoice.appliance ?? "",
        "",
        "",
        invoice.total,
        paid,
        amountDue,
        invoice.id,
      ]),
    );
  }

  for (const payment of data.payments) {
    const invoice = invoicesById.get(payment.invoice_id);

    lines.push(
      csvRow([
        "payment",
        payment.payment_date.slice(0, 10),
        invoice?.invoice_number ?? "",
        invoice?.customer_name ?? "",
        "",
        payment.note ?? "",
        payment.method,
        payment.amount,
        invoice?.total ?? "",
        "",
        "",
        payment.invoice_id,
      ]),
    );
  }

  for (const expense of data.expenses) {
    const invoice = expense.invoice_id ? invoicesById.get(expense.invoice_id) : null;

    lines.push(
      csvRow([
        "expense",
        expense.expense_date.slice(0, 10),
        invoice?.invoice_number ?? "",
        invoice?.customer_name ?? "",
        expense.category,
        expense.description,
        expense.payment_method ?? "",
        Number(expense.amount ?? 0) * -1,
        invoice?.total ?? "",
        "",
        "",
        expense.invoice_id ?? "",
      ]),
    );
  }

  lines.push(csvRow([]));
  lines.push(csvRow(["summary", "invoice_value", sumMoney(periodInvoices.map((invoice) => invoice.total))]));
  lines.push(csvRow(["summary", "payments", sumMoney(data.payments.map((payment) => payment.amount))]));
  lines.push(csvRow(["summary", "expenses", sumMoney(data.expenses.map((expense) => expense.amount))]));

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dapl-accounting-${monthRange.month}.csv"`,
    },
  });
}
