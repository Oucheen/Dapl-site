import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

export type CrmUserRole = "staff" | "manager" | "admin" | "boss" | "owner";

export type CrmUserRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  role: CrmUserRole;
  password_hash: string;
  password_salt: string;
  is_active: boolean;
  note: string | null;
};

export type CrmUserInput = {
  name: string;
  role: CrmUserRole | string;
  password?: string | null;
  isActive?: boolean;
  note?: string | null;
};

const DEFAULT_ADMIN_USERS_TABLE = "admin_users";
const ALLOWED_ROLES: CrmUserRole[] = ["staff", "manager", "admin", "boss", "owner"];
const PASSWORD_ITERATIONS = 120_000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";

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
      process.env.SUPABASE_ADMIN_USERS_TABLE || DEFAULT_ADMIN_USERS_TABLE,
      DEFAULT_ADMIN_USERS_TABLE,
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

function normalizeRequiredText(value: string, fieldName: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return trimmedValue;
}

export function normalizeCrmUserRole(value: string | null | undefined) {
  const role = value?.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "staff";

  if (!ALLOWED_ROLES.includes(role as CrmUserRole)) {
    throw new Error("Invalid CRM user role.");
  }

  return role as CrmUserRole;
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

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const normalizedPassword = normalizeRequiredText(password, "Password");
  const hash = pbkdf2Sync(
    normalizedPassword,
    salt,
    PASSWORD_ITERATIONS,
    PASSWORD_KEY_LENGTH,
    PASSWORD_DIGEST,
  ).toString("hex");

  return { hash, salt };
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyCrmUserPassword(user: Pick<CrmUserRecord, "password_hash" | "password_salt">, password: string) {
  const { hash } = hashPassword(password, user.password_salt);
  return safeCompare(hash, user.password_hash);
}

export const adminUsersTableSql = `create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  role text not null default 'staff' check (role in ('staff', 'manager', 'admin', 'boss', 'owner')),
  password_hash text not null,
  password_salt text not null,
  is_active boolean not null default true,
  note text
);

create index if not exists admin_users_active_idx on public.admin_users (is_active);
create index if not exists admin_users_role_idx on public.admin_users (role);

drop trigger if exists set_admin_users_updated_at on public.admin_users;

create trigger set_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.set_updated_at();

alter table public.admin_users enable row level security;

grant select, insert, update, delete on public.admin_users to service_role;`;

export async function listCrmUsers(limit = 200) {
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
      return { users: [] as CrmUserRecord[], ready: false, error: details };
    }

    throw new Error(`Supabase admin users fetch failed: ${response.status} ${details}`);
  }

  return { users: (await response.json()) as CrmUserRecord[], ready: true, error: "" };
}

export async function getActiveCrmUserById(id: string) {
  const config = getSupabaseConfig();

  if (!config || !/^[0-9a-f-]{36}$/i.test(id)) {
    return { user: null, ready: false, error: "" };
  }

  const params = new URLSearchParams({
    select: "*",
    id: `eq.${id}`,
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

    throw new Error(`Supabase admin user fetch failed: ${response.status} ${details}`);
  }

  const users = (await response.json()) as CrmUserRecord[];
  return { user: users[0] ?? null, ready: true, error: "" };
}

export async function findCrmUserByPassword(password: string) {
  if (!password.trim()) {
    return { user: null, ready: true, error: "" };
  }

  const usersData = await listCrmUsers();

  if (!usersData.ready) {
    return { user: null, ready: false, error: usersData.error };
  }

  const activeUsers = usersData.users.filter((user) => user.is_active);

  for (const user of activeUsers) {
    if (verifyCrmUserPassword(user, password)) {
      return { user, ready: true, error: "" };
    }
  }

  return { user: null, ready: true, error: "" };
}

export async function addCrmUser(input: CrmUserInput) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const { hash, salt } = hashPassword(input.password ?? "");
  const response = await fetch(getTableUrl(config), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      name: normalizeRequiredText(input.name, "Name"),
      role: normalizeCrmUserRole(input.role),
      password_hash: hash,
      password_salt: salt,
      is_active: input.isActive ?? true,
      note: normalizeNote(input.note),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase admin user insert failed: ${response.status} ${details}`);
  }
}

export async function updateCrmUser(id: string, input: CrmUserInput) {
  assertUuid(id);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const password = input.password?.trim();
  const passwordPatch = password ? hashPassword(password) : null;
  const response = await fetch(`${getTableUrl(config)}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      name: normalizeRequiredText(input.name, "Name"),
      role: normalizeCrmUserRole(input.role),
      is_active: input.isActive ?? false,
      note: normalizeNote(input.note),
      ...(passwordPatch
        ? {
            password_hash: passwordPatch.hash,
            password_salt: passwordPatch.salt,
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase admin user update failed: ${response.status} ${details}`);
  }
}

export async function deleteCrmUser(id: string) {
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
    throw new Error(`Supabase admin user delete failed: ${response.status} ${details}`);
  }
}
