import { addInvoicePayment, type InvoiceRecord } from "@/lib/supabase-invoices";

export type InvoiceCheckStatus =
  | "received"
  | "ready_to_submit"
  | "submitted"
  | "accepted"
  | "cleared"
  | "rejected"
  | "void";

export type InvoiceCheckRecord = {
  id: string;
  invoice_id: string;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  received_at: string;
  amount: number | string;
  check_number: string | null;
  payer_name: string | null;
  payer_bank: string | null;
  front_image_url: string | null;
  back_image_url: string | null;
  increase_check_deposit_id: string | null;
  increase_status: string | null;
  status: InvoiceCheckStatus;
  note: string | null;
};

export type InvoiceCheckWithInvoice = InvoiceCheckRecord & {
  invoice?: Pick<
    InvoiceRecord,
    "id" | "invoice_number" | "customer_name" | "customer_phone" | "total" | "status"
  > | null;
};

export type InvoiceCheckInput = {
  amount: number | string;
  checkNumber?: string | null;
  payerName?: string | null;
  payerBank?: string | null;
  receivedAt?: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  note?: string | null;
};

const DEFAULT_INVOICE_CHECKS_TABLE = "invoice_checks";

const CHECK_STATUSES: InvoiceCheckStatus[] = [
  "received",
  "ready_to_submit",
  "submitted",
  "accepted",
  "cleared",
  "rejected",
  "void",
];

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
    invoiceChecksTable: normalizeTableName(
      process.env.SUPABASE_INVOICE_CHECKS_TABLE || DEFAULT_INVOICE_CHECKS_TABLE,
      DEFAULT_INVOICE_CHECKS_TABLE,
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

function assertUuid(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid id.");
  }
}

function normalizeMoney(value: number | string | null | undefined) {
  const amount = Number(String(value ?? 0).replace(",", "."));

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function normalizeText(value: string | null | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue || null;
}

function normalizeStatus(value: string | null | undefined) {
  const status = value?.trim();

  if (!status || !CHECK_STATUSES.includes(status as InvoiceCheckStatus)) {
    throw new Error("Invalid check status.");
  }

  return status as InvoiceCheckStatus;
}

function normalizeDate(value: string | null | undefined) {
  const date = value?.trim();

  if (!date) {
    return new Date().toISOString().slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Check date must use YYYY-MM-DD format.");
  }

  return date;
}

function isChecksSetupError(status: number, details: string) {
  return (
    status === 404 ||
    details.includes("PGRST205") ||
    details.includes("Could not find the table") ||
    details.includes("permission denied for table")
  );
}

export const invoiceChecksTableSql = `create table if not exists public.invoice_checks (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_id uuid references public.invoice_payments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  received_at date not null default current_date,
  amount numeric(10,2) not null check (amount > 0),
  check_number text,
  payer_name text,
  payer_bank text,
  front_image_url text,
  back_image_url text,
  increase_check_deposit_id text,
  increase_status text,
  status text not null default 'received' check (
    status in ('received', 'ready_to_submit', 'submitted', 'accepted', 'cleared', 'rejected', 'void')
  ),
  note text
);

create index if not exists invoice_checks_invoice_id_idx on public.invoice_checks (invoice_id);
create index if not exists invoice_checks_status_received_at_idx on public.invoice_checks (status, received_at desc);
create index if not exists invoice_checks_payment_id_idx on public.invoice_checks (payment_id);

drop trigger if exists set_invoice_checks_updated_at on public.invoice_checks;

create trigger set_invoice_checks_updated_at
before update on public.invoice_checks
for each row
execute function public.set_updated_at();

alter table public.invoice_checks enable row level security;

grant select, insert, update, delete on public.invoice_checks to service_role;`;

export async function listInvoiceChecks(invoiceId: string) {
  assertUuid(invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*",
    invoice_id: `eq.${invoiceId}`,
    order: "received_at.desc,created_at.desc",
  });
  const response = await fetch(`${getTableUrl(config, config.invoiceChecksTable)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    if (isChecksSetupError(response.status, details)) {
      return { checks: [] as InvoiceCheckRecord[], ready: false, error: details };
    }

    throw new Error(`Supabase invoice checks fetch failed: ${response.status} ${details}`);
  }

  return { checks: (await response.json()) as InvoiceCheckRecord[], ready: true, error: "" };
}

export async function listInvoiceChecksWithInvoices(limit = 500) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*,invoice:invoices(id,invoice_number,customer_name,customer_phone,total,status)",
    order: "received_at.desc,created_at.desc",
    limit: String(limit),
  });
  const response = await fetch(`${getTableUrl(config, config.invoiceChecksTable)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    if (isChecksSetupError(response.status, details)) {
      return { checks: [] as InvoiceCheckWithInvoice[], ready: false, error: details };
    }

    throw new Error(`Supabase checks fetch failed: ${response.status} ${details}`);
  }

  return { checks: (await response.json()) as InvoiceCheckWithInvoice[], ready: true, error: "" };
}

export async function createInvoiceCheck(invoiceId: string, input: InvoiceCheckInput) {
  assertUuid(invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const amount = normalizeMoney(input.amount);

  if (amount <= 0) {
    throw new Error("Check amount must be greater than 0.");
  }

  const response = await fetch(getTableUrl(config, config.invoiceChecksTable), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      invoice_id: invoiceId,
      received_at: normalizeDate(input.receivedAt),
      amount,
      check_number: normalizeText(input.checkNumber ?? ""),
      payer_name: normalizeText(input.payerName ?? ""),
      payer_bank: normalizeText(input.payerBank ?? ""),
      front_image_url: normalizeText(input.frontImageUrl ?? ""),
      back_image_url: normalizeText(input.backImageUrl ?? ""),
      note: normalizeText(input.note ?? ""),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase check insert failed: ${response.status} ${details}`);
  }

  const checks = (await response.json()) as Pick<InvoiceCheckRecord, "id">[];
  const checkId = checks[0]?.id;

  if (!checkId) {
    throw new Error("Supabase check insert returned no check id.");
  }

  return checkId;
}

async function getInvoiceCheckById(checkId: string) {
  assertUuid(checkId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*",
    id: `eq.${checkId}`,
    limit: "1",
  });
  const response = await fetch(`${getTableUrl(config, config.invoiceChecksTable)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase check fetch failed: ${response.status} ${details}`);
  }

  const checks = (await response.json()) as InvoiceCheckRecord[];
  return checks[0] ?? null;
}

async function patchInvoiceCheck(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  checkId: string,
  payload: Partial<InvoiceCheckRecord>,
) {
  const response = await fetch(`${getTableUrl(config, config.invoiceChecksTable)}?id=eq.${checkId}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase check update failed: ${response.status} ${details}`);
  }
}

export async function updateInvoiceCheckStatus(checkId: string, statusValue: string) {
  assertUuid(checkId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const status = normalizeStatus(statusValue);
  const check = await getInvoiceCheckById(checkId);

  if (!check) {
    throw new Error("Check not found.");
  }

  if (status !== "cleared" || check.payment_id) {
    await patchInvoiceCheck(config, checkId, { status });
    return { invoiceId: check.invoice_id, paymentCreated: false };
  }

  const { paymentId } = await addInvoicePayment(check.invoice_id, {
    amount: check.amount,
    method: "check",
    paymentDate: check.received_at,
    note: [
      check.check_number ? `Check #${check.check_number}` : "Check payment",
      check.payer_name ?? "",
      check.payer_bank ?? "",
      check.increase_check_deposit_id ? `Increase ${check.increase_check_deposit_id}` : "",
    ]
      .filter(Boolean)
      .join(" / "),
  });

  await patchInvoiceCheck(config, checkId, {
    status,
    payment_id: paymentId ?? null,
  });

  return { invoiceId: check.invoice_id, paymentCreated: true };
}
