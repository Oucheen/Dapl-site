export type WarehousePartStatus = "in_stock" | "reserved" | "used" | "returned" | "archived";

export type WarehousePartRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  part_name: string;
  part_number: string | null;
  supplier: string | null;
  status: WarehousePartStatus;
  quantity_on_hand: number | string;
  unit_cost: number | string;
  location: string | null;
  note: string | null;
};

export type WarehousePartInput = {
  partName: string;
  partNumber?: string | null;
  supplier?: string | null;
  status?: WarehousePartStatus | string | null;
  quantityOnHand?: number | string | null;
  unitCost?: number | string | null;
  location?: string | null;
  note?: string | null;
};

const DEFAULT_WAREHOUSE_PARTS_TABLE = "warehouse_parts";
const ALLOWED_STATUSES: WarehousePartStatus[] = [
  "in_stock",
  "reserved",
  "used",
  "returned",
  "archived",
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
    table: normalizeTableName(
      process.env.SUPABASE_WAREHOUSE_PARTS_TABLE || DEFAULT_WAREHOUSE_PARTS_TABLE,
      DEFAULT_WAREHOUSE_PARTS_TABLE,
    ),
  };
}

function getTableUrl(config: NonNullable<ReturnType<typeof getSupabaseConfig>>) {
  return `${config.url}/rest/v1/${config.table}`;
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
  const amount = Number(String(value ?? 0).replace(",", "."));

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function toQuantity(value: number | string | null | undefined) {
  const quantity = Number(String(value ?? 0).replace(",", "."));

  if (!Number.isFinite(quantity) || quantity < 0) {
    return 0;
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

function normalizeStatus(value: WarehousePartStatus | string | null | undefined) {
  const status = value?.trim();

  if (!status) {
    return "in_stock";
  }

  if (!ALLOWED_STATUSES.includes(status as WarehousePartStatus)) {
    throw new Error("Invalid warehouse part status.");
  }

  return status as WarehousePartStatus;
}

function isSetupError(status: number, details: string) {
  return (
    status === 404 ||
    details.includes("PGRST205") ||
    details.includes("Could not find the table") ||
    details.includes("permission denied for table")
  );
}

export const warehousePartsTableSql = `create table if not exists public.warehouse_parts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  part_name text not null,
  part_number text,
  supplier text,
  status text not null default 'in_stock' check (
    status in ('in_stock', 'reserved', 'used', 'returned', 'archived')
  ),
  quantity_on_hand numeric(10,2) not null default 0 check (quantity_on_hand >= 0),
  unit_cost numeric(10,2) not null default 0 check (unit_cost >= 0),
  location text,
  note text
);

create index if not exists warehouse_parts_status_idx on public.warehouse_parts (status);
create index if not exists warehouse_parts_part_number_idx on public.warehouse_parts (part_number);

drop trigger if exists set_warehouse_parts_updated_at on public.warehouse_parts;

create trigger set_warehouse_parts_updated_at
before update on public.warehouse_parts
for each row
execute function public.set_updated_at();

alter table public.warehouse_parts enable row level security;

grant select, insert, update, delete on public.warehouse_parts to service_role;`;

export async function listWarehouseParts(limit = 500) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*",
    order: "updated_at.desc,created_at.desc",
    limit: String(limit),
  });
  const response = await fetch(`${getTableUrl(config)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    if (isSetupError(response.status, details)) {
      return { parts: [] as WarehousePartRecord[], ready: false, error: details };
    }

    throw new Error(`Supabase warehouse parts fetch failed: ${response.status} ${details}`);
  }

  return { parts: (await response.json()) as WarehousePartRecord[], ready: true, error: "" };
}

export async function addWarehousePart(input: WarehousePartInput) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(getTableUrl(config), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      part_name: normalizeRequiredText(input.partName, "Part name"),
      part_number: normalizeText(input.partNumber ?? ""),
      supplier: normalizeText(input.supplier ?? ""),
      status: normalizeStatus(input.status),
      quantity_on_hand: toQuantity(input.quantityOnHand),
      unit_cost: toMoney(input.unitCost),
      location: normalizeText(input.location ?? ""),
      note: normalizeText(input.note ?? ""),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase warehouse part insert failed: ${response.status} ${details}`);
  }
}

export async function updateWarehousePart(id: string, input: WarehousePartInput) {
  assertUuid(id);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${getTableUrl(config)}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      part_name: normalizeRequiredText(input.partName, "Part name"),
      part_number: normalizeText(input.partNumber ?? ""),
      supplier: normalizeText(input.supplier ?? ""),
      status: normalizeStatus(input.status),
      quantity_on_hand: toQuantity(input.quantityOnHand),
      unit_cost: toMoney(input.unitCost),
      location: normalizeText(input.location ?? ""),
      note: normalizeText(input.note ?? ""),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase warehouse part update failed: ${response.status} ${details}`);
  }
}

export async function deleteWarehousePart(id: string) {
  assertUuid(id);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${getTableUrl(config)}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase warehouse part delete failed: ${response.status} ${details}`);
  }
}
