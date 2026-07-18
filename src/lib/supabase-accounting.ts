import type { InvoiceRecord, InvoicePaymentRecord } from "@/lib/supabase-invoices";

export type ExpenseRecord = {
  id: string;
  created_at: string;
  expense_date: string;
  category: string;
  vendor: string | null;
  description: string;
  amount: number | string;
  payment_method: string | null;
  note: string | null;
};

export type ExpenseInput = {
  expenseDate: string;
  category: string;
  vendor: string;
  description: string;
  amount: number | string;
  paymentMethod: string;
  note: string;
};

export type AccountingData = {
  invoices: InvoiceRecord[];
  payments: InvoicePaymentRecord[];
  expenses: ExpenseRecord[];
  expensesReady: boolean;
};

const DEFAULT_INVOICES_TABLE = "invoices";
const DEFAULT_INVOICE_PAYMENTS_TABLE = "invoice_payments";
const DEFAULT_EXPENSES_TABLE = "expenses";

function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

function normalizeTableName(table: string, fallback: string) {
  const cleaned = table.trim().replace(/^\/+|\/+$/g, "");

  if (cleaned.startsWith("public.")) {
    return cleaned.slice("public.".length);
  }

  return cleaned || fallback;
}

function getSupabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !serviceRoleKey) {
    return null;
  }

  return {
    url: normalizeSupabaseUrl(rawUrl),
    serviceRoleKey,
    invoicesTable: normalizeTableName(
      process.env.SUPABASE_INVOICES_TABLE || DEFAULT_INVOICES_TABLE,
      DEFAULT_INVOICES_TABLE,
    ),
    invoicePaymentsTable: normalizeTableName(
      process.env.SUPABASE_INVOICE_PAYMENTS_TABLE || DEFAULT_INVOICE_PAYMENTS_TABLE,
      DEFAULT_INVOICE_PAYMENTS_TABLE,
    ),
    expensesTable: normalizeTableName(
      process.env.SUPABASE_EXPENSES_TABLE || DEFAULT_EXPENSES_TABLE,
      DEFAULT_EXPENSES_TABLE,
    ),
  };
}

function getTableUrl(config: NonNullable<ReturnType<typeof getSupabaseConfig>>, table: string) {
  return `${config.url}/rest/v1/${table}`;
}

function headers(config: NonNullable<ReturnType<typeof getSupabaseConfig>>) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function toMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function assertUuid(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid id.");
  }
}

function validateDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  return value;
}

function isExpensesSetupError(status: number, details: string) {
  return (
    status === 404 ||
    details.includes("PGRST205") ||
    details.includes("Could not find the table") ||
    details.includes("permission denied for table")
  );
}

export function getMonthRange(month: string | null | undefined) {
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const normalized = month && /^\d{4}-\d{2}$/.test(month) ? month : fallback;
  const [year, monthIndex] = normalized.split("-").map(Number);
  const start = `${year}-${String(monthIndex).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, monthIndex, 1));
  const end = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}-01`;

  return { month: normalized, start, end };
}

export const expensesTableSql = `create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expense_date date not null default current_date,
  category text not null,
  vendor text,
  description text not null,
  amount numeric(10,2) not null check (amount >= 0),
  payment_method text,
  note text
);

create index if not exists expenses_expense_date_idx on public.expenses (expense_date desc);

grant select, insert, delete on public.expenses to service_role;`;

export async function listAccountingData(input: {
  start: string;
  end: string;
}): Promise<AccountingData> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const invoiceParams = new URLSearchParams({
    select: "*",
    created_at: `lt.${input.end}`,
    order: "created_at.desc",
    limit: "1000",
  });

  const paymentsParams = new URLSearchParams({
    select: "*",
    payment_date: `lt.${input.end}`,
    order: "payment_date.desc,created_at.desc",
    limit: "2000",
  });

  const expensesParams = new URLSearchParams({
    select: "*",
    expense_date: `gte.${input.start}`,
    order: "expense_date.desc,created_at.desc",
    limit: "1000",
  });
  expensesParams.append("expense_date", `lt.${input.end}`);

  const [invoiceResponse, paymentResponse, expenseResponse] = await Promise.all([
    fetch(`${getTableUrl(config, config.invoicesTable)}?${invoiceParams.toString()}`, {
      headers: headers(config),
      cache: "no-store",
    }),
    fetch(`${getTableUrl(config, config.invoicePaymentsTable)}?${paymentsParams.toString()}`, {
      headers: headers(config),
      cache: "no-store",
    }),
    fetch(`${getTableUrl(config, config.expensesTable)}?${expensesParams.toString()}`, {
      headers: headers(config),
      cache: "no-store",
    }),
  ]);

  if (!invoiceResponse.ok) {
    const details = await invoiceResponse.text();
    throw new Error(`Supabase invoices fetch failed: ${invoiceResponse.status} ${details}`);
  }

  if (!paymentResponse.ok) {
    const details = await paymentResponse.text();
    throw new Error(`Supabase invoice payments fetch failed: ${paymentResponse.status} ${details}`);
  }

  let expenses: ExpenseRecord[] = [];
  let expensesReady = true;

  if (expenseResponse.ok) {
    expenses = (await expenseResponse.json()) as ExpenseRecord[];
  } else {
    const details = await expenseResponse.text();

    if (isExpensesSetupError(expenseResponse.status, details)) {
      expensesReady = false;
    } else {
      throw new Error(`Supabase expenses fetch failed: ${expenseResponse.status} ${details}`);
    }
  }

  return {
    invoices: (await invoiceResponse.json()) as InvoiceRecord[],
    payments: (await paymentResponse.json()) as InvoicePaymentRecord[],
    expenses,
    expensesReady,
  };
}

export async function createExpense(input: ExpenseInput) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const expenseDate = validateDate(input.expenseDate);
  const category = input.category.trim();
  const description = input.description.trim();
  const amount = toMoney(input.amount);

  if (!category) {
    throw new Error("Category is required.");
  }

  if (!description) {
    throw new Error("Description is required.");
  }

  if (amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  const response = await fetch(getTableUrl(config, config.expensesTable), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      expense_date: expenseDate,
      category,
      vendor: input.vendor.trim() || null,
      description,
      amount,
      payment_method: input.paymentMethod.trim() || null,
      note: input.note.trim() || null,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase expense insert failed: ${response.status} ${details}`);
  }
}

export async function deleteExpenseById(id: string) {
  assertUuid(id);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${getTableUrl(config, config.expensesTable)}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase expense delete failed: ${response.status} ${details}`);
  }
}
