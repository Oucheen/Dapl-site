export type InvoicePartStatus =
  | "needed"
  | "ordered"
  | "received"
  | "installed"
  | "returned"
  | "canceled";

export type InvoicePartRecord = {
  id: string;
  invoice_id: string;
  created_at: string;
  part_name: string;
  part_number: string | null;
  supplier: string | null;
  status: InvoicePartStatus;
  quantity: number | string;
  cost: number | string;
  expense_id: string | null;
  expensed_at: string | null;
  note: string | null;
};

export type InvoicePartInput = {
  partName: string;
  partNumber?: string | null;
  supplier?: string | null;
  status?: InvoicePartStatus | null;
  quantity?: number | string | null;
  cost?: number | string | null;
  note?: string | null;
};

const DEFAULT_INVOICE_PARTS_TABLE = "invoice_parts";

const ALLOWED_PART_STATUSES: InvoicePartStatus[] = [
  "needed",
  "ordered",
  "received",
  "installed",
  "returned",
  "canceled",
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
    invoicePartsTable: normalizeTableName(
      process.env.SUPABASE_INVOICE_PARTS_TABLE || DEFAULT_INVOICE_PARTS_TABLE,
      DEFAULT_INVOICE_PARTS_TABLE,
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

function toMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function toQuantity(value: number | string | null | undefined) {
  const quantity = Number(value ?? 1);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1;
  }

  return Math.round(quantity * 100) / 100;
}

function normalizeText(value: string | null | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue || null;
}

function normalizeRequiredText(value: string | null | undefined, fieldName: string) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return trimmedValue;
}

function normalizePartStatus(value: InvoicePartStatus | string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "needed";
  }

  if (!ALLOWED_PART_STATUSES.includes(trimmedValue as InvoicePartStatus)) {
    throw new Error("Invalid part status.");
  }

  return trimmedValue as InvoicePartStatus;
}

function isPartsSetupError(status: number, details: string) {
  return (
    status === 404 ||
    details.includes("PGRST205") ||
    details.includes("Could not find the table") ||
    details.includes("permission denied for table")
  );
}

export const invoicePartsTableSql = `create table if not exists public.invoice_parts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  created_at timestamptz not null default now(),
  part_name text not null,
  part_number text,
  supplier text,
  status text not null default 'needed',
  quantity numeric(10,2) not null default 1,
  cost numeric(10,2) not null default 0 check (cost >= 0),
  expense_id uuid,
  expensed_at timestamptz,
  note text
);

alter table public.invoice_parts
  add column if not exists expense_id uuid,
  add column if not exists expensed_at timestamptz;

create index if not exists invoice_parts_invoice_id_idx on public.invoice_parts (invoice_id);
create index if not exists invoice_parts_status_idx on public.invoice_parts (status);

grant select, insert, update, delete on public.invoice_parts to service_role;`;

export async function listInvoiceParts(invoiceId: string) {
  assertUuid(invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*",
    invoice_id: `eq.${invoiceId}`,
    order: "created_at.desc",
    limit: "100",
  });
  const response = await fetch(`${getTableUrl(config, config.invoicePartsTable)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    if (isPartsSetupError(response.status, details)) {
      return { parts: [] as InvoicePartRecord[], ready: false, error: details };
    }

    throw new Error(`Supabase invoice parts fetch failed: ${response.status} ${details}`);
  }

  return { parts: (await response.json()) as InvoicePartRecord[], ready: true, error: "" };
}

export async function listAllInvoiceParts(limit = 500) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
    limit: String(limit),
  });
  const response = await fetch(`${getTableUrl(config, config.invoicePartsTable)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    if (isPartsSetupError(response.status, details)) {
      return { parts: [] as InvoicePartRecord[], ready: false, error: details };
    }

    throw new Error(`Supabase invoice parts fetch failed: ${response.status} ${details}`);
  }

  return { parts: (await response.json()) as InvoicePartRecord[], ready: true, error: "" };
}

export async function getInvoicePartById(partId: string) {
  assertUuid(partId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*",
    id: `eq.${partId}`,
    limit: "1",
  });
  const response = await fetch(`${getTableUrl(config, config.invoicePartsTable)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice part fetch failed: ${response.status} ${details}`);
  }

  const parts = (await response.json()) as InvoicePartRecord[];
  return parts[0] ?? null;
}

export async function addInvoicePart(invoiceId: string, input: InvoicePartInput) {
  assertUuid(invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(getTableUrl(config, config.invoicePartsTable), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      invoice_id: invoiceId,
      part_name: normalizeRequiredText(input.partName, "Part name"),
      part_number: normalizeText(input.partNumber ?? ""),
      supplier: normalizeText(input.supplier ?? ""),
      status: normalizePartStatus(input.status),
      quantity: toQuantity(input.quantity),
      cost: toMoney(input.cost),
      note: normalizeText(input.note ?? ""),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice part insert failed: ${response.status} ${details}`);
  }
}

export async function updateInvoicePart(partId: string, input: InvoicePartInput) {
  assertUuid(partId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${getTableUrl(config, config.invoicePartsTable)}?id=eq.${partId}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      part_name: normalizeRequiredText(input.partName, "Part name"),
      part_number: normalizeText(input.partNumber ?? ""),
      supplier: normalizeText(input.supplier ?? ""),
      status: normalizePartStatus(input.status),
      quantity: toQuantity(input.quantity),
      cost: toMoney(input.cost),
      note: normalizeText(input.note ?? ""),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice part update failed: ${response.status} ${details}`);
  }
}

export async function deleteInvoicePart(partId: string) {
  assertUuid(partId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${getTableUrl(config, config.invoicePartsTable)}?id=eq.${partId}`, {
    method: "DELETE",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice part delete failed: ${response.status} ${details}`);
  }
}

export async function markInvoicePartExpensed(partId: string, expenseId: string) {
  assertUuid(partId);
  assertUuid(expenseId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${getTableUrl(config, config.invoicePartsTable)}?id=eq.${partId}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      expense_id: expenseId,
      expensed_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice part expense link failed: ${response.status} ${details}`);
  }
}
