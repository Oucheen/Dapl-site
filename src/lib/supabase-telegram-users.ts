export type TelegramUserRole = "technician" | "dispatcher" | "owner";

export type TelegramUserRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  telegram_user_id: string;
  technician_name: string;
  role: TelegramUserRole;
  is_active: boolean;
  note: string | null;
};

export type TelegramUserInput = {
  telegramUserId: string;
  technicianName: string;
  role: TelegramUserRole | string;
  isActive?: boolean;
  note?: string | null;
};

const DEFAULT_TELEGRAM_USERS_TABLE = "telegram_users";
const ALLOWED_ROLES: TelegramUserRole[] = ["technician", "dispatcher", "owner"];

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
      process.env.SUPABASE_TELEGRAM_USERS_TABLE || DEFAULT_TELEGRAM_USERS_TABLE,
      DEFAULT_TELEGRAM_USERS_TABLE,
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

function normalizeTelegramUserId(value: string) {
  const trimmedValue = value.trim();

  if (!/^\d{4,20}$/.test(trimmedValue)) {
    throw new Error("Telegram ID must be digits only.");
  }

  return trimmedValue;
}

function normalizeRequiredText(value: string, fieldName: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return trimmedValue;
}

function normalizeRole(value: string) {
  const role = value.trim().toLowerCase();

  if (!ALLOWED_ROLES.includes(role as TelegramUserRole)) {
    throw new Error("Invalid Telegram role.");
  }

  return role as TelegramUserRole;
}

function normalizeNote(value: string | null | undefined) {
  return value?.trim() || null;
}

function isSetupError(status: number, details: string) {
  return (
    status === 404 ||
    details.includes("PGRST205") ||
    details.includes("Could not find the table") ||
    details.includes("permission denied for table")
  );
}

export const telegramUsersTableSql = `create table if not exists public.telegram_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  telegram_user_id text not null unique,
  technician_name text not null,
  role text not null default 'technician' check (role in ('technician', 'dispatcher', 'owner')),
  is_active boolean not null default true,
  note text
);

create index if not exists telegram_users_active_idx on public.telegram_users (is_active);
create index if not exists telegram_users_role_idx on public.telegram_users (role);

drop trigger if exists set_telegram_users_updated_at on public.telegram_users;

create trigger set_telegram_users_updated_at
before update on public.telegram_users
for each row
execute function public.set_updated_at();

alter table public.telegram_users enable row level security;

grant select, insert, update, delete on public.telegram_users to service_role;`;

export async function listTelegramUsers(limit = 200) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
    limit: String(limit),
  });
  const response = await fetch(`${getTableUrl(config)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    if (isSetupError(response.status, details)) {
      return { users: [] as TelegramUserRecord[], ready: false, error: details };
    }

    throw new Error(`Supabase telegram users fetch failed: ${response.status} ${details}`);
  }

  return { users: (await response.json()) as TelegramUserRecord[], ready: true, error: "" };
}

export async function getTelegramUserByTelegramId(telegramUserId: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return { user: null, ready: false, error: "Supabase is not configured." };
  }

  const params = new URLSearchParams({
    select: "*",
    telegram_user_id: `eq.${normalizeTelegramUserId(telegramUserId)}`,
    is_active: "eq.true",
    limit: "1",
  });
  const response = await fetch(`${getTableUrl(config)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    if (isSetupError(response.status, details)) {
      return { user: null, ready: false, error: details };
    }

    throw new Error(`Supabase telegram user fetch failed: ${response.status} ${details}`);
  }

  const users = (await response.json()) as TelegramUserRecord[];
  return { user: users[0] ?? null, ready: true, error: "" };
}

export async function getTelegramUserByTechnicianName(technicianName: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return { user: null, ready: false, error: "Supabase is not configured." };
  }

  const name = technicianName.trim();

  if (!name) {
    return { user: null, ready: true, error: "" };
  }

  const params = new URLSearchParams({
    select: "*",
    technician_name: `eq.${name}`,
    is_active: "eq.true",
    limit: "1",
  });
  const response = await fetch(`${getTableUrl(config)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    if (isSetupError(response.status, details)) {
      return { user: null, ready: false, error: details };
    }

    throw new Error(`Supabase telegram user by technician fetch failed: ${response.status} ${details}`);
  }

  const users = (await response.json()) as TelegramUserRecord[];
  return { user: users[0] ?? null, ready: true, error: "" };
}

export async function addTelegramUser(input: TelegramUserInput) {
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
      telegram_user_id: normalizeTelegramUserId(input.telegramUserId),
      technician_name: normalizeRequiredText(input.technicianName, "Technician name"),
      role: normalizeRole(input.role),
      is_active: input.isActive ?? true,
      note: normalizeNote(input.note),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase telegram user insert failed: ${response.status} ${details}`);
  }
}

export async function updateTelegramUser(id: string, input: TelegramUserInput) {
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
      telegram_user_id: normalizeTelegramUserId(input.telegramUserId),
      technician_name: normalizeRequiredText(input.technicianName, "Technician name"),
      role: normalizeRole(input.role),
      is_active: input.isActive ?? false,
      note: normalizeNote(input.note),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase telegram user update failed: ${response.status} ${details}`);
  }
}

export async function deleteTelegramUser(id: string) {
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
    throw new Error(`Supabase telegram user delete failed: ${response.status} ${details}`);
  }
}
