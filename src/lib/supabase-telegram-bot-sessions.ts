export type TelegramBotSessionMode = "add_part" | "add_photo";

export type TelegramBotSessionRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  telegram_user_id: string;
  mode: TelegramBotSessionMode;
  invoice_id: string;
  expires_at: string;
  payload: Record<string, unknown>;
};

const DEFAULT_TELEGRAM_BOT_SESSIONS_TABLE = "telegram_bot_sessions";
const ALLOWED_MODES: TelegramBotSessionMode[] = ["add_part", "add_photo"];

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
      process.env.SUPABASE_TELEGRAM_BOT_SESSIONS_TABLE || DEFAULT_TELEGRAM_BOT_SESSIONS_TABLE,
      DEFAULT_TELEGRAM_BOT_SESSIONS_TABLE,
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

function normalizeMode(value: string) {
  if (!ALLOWED_MODES.includes(value as TelegramBotSessionMode)) {
    throw new Error("Invalid Telegram bot session mode.");
  }

  return value as TelegramBotSessionMode;
}

function isSetupError(status: number, details: string) {
  return (
    status === 404 ||
    details.includes("PGRST205") ||
    details.includes("Could not find the table") ||
    details.includes("permission denied for table")
  );
}

export const telegramBotSessionsTableSql = `create table if not exists public.telegram_bot_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  telegram_user_id text not null,
  mode text not null check (mode in ('add_part', 'add_photo')),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  expires_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb
);

create unique index if not exists telegram_bot_sessions_user_id_idx
  on public.telegram_bot_sessions (telegram_user_id);
create index if not exists telegram_bot_sessions_expires_at_idx
  on public.telegram_bot_sessions (expires_at);

drop trigger if exists set_telegram_bot_sessions_updated_at on public.telegram_bot_sessions;

create trigger set_telegram_bot_sessions_updated_at
before update on public.telegram_bot_sessions
for each row
execute function public.set_updated_at();

alter table public.telegram_bot_sessions enable row level security;

grant select, insert, update, delete on public.telegram_bot_sessions to service_role;`;

export async function upsertTelegramBotSession(input: {
  telegramUserId: string;
  mode: TelegramBotSessionMode;
  invoiceId: string;
  ttlMinutes?: number;
  payload?: Record<string, unknown>;
}) {
  assertUuid(input.invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    return { ready: false, error: "Supabase is not configured." };
  }

  const telegramUserId = input.telegramUserId.trim();

  if (!telegramUserId) {
    throw new Error("Telegram user id is required.");
  }

  const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 15) * 60_000).toISOString();
  const response = await fetch(`${getTableUrl(config)}?on_conflict=telegram_user_id`, {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      telegram_user_id: telegramUserId,
      mode: normalizeMode(input.mode),
      invoice_id: input.invoiceId,
      expires_at: expiresAt,
      payload: input.payload ?? {},
    }),
  });

  if (!response.ok) {
    const details = await response.text();

    if (isSetupError(response.status, details)) {
      return { ready: false, error: details };
    }

    throw new Error(`Supabase Telegram bot session upsert failed: ${response.status} ${details}`);
  }

  return { ready: true, error: "" };
}

export async function getTelegramBotSession(telegramUserId: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return { session: null, ready: false, error: "Supabase is not configured." };
  }

  const params = new URLSearchParams({
    select: "*",
    telegram_user_id: `eq.${telegramUserId.trim()}`,
    expires_at: `gt.${new Date().toISOString()}`,
    limit: "1",
  });
  const response = await fetch(`${getTableUrl(config)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    if (isSetupError(response.status, details)) {
      return { session: null, ready: false, error: details };
    }

    throw new Error(`Supabase Telegram bot session fetch failed: ${response.status} ${details}`);
  }

  const sessions = (await response.json()) as TelegramBotSessionRecord[];
  return { session: sessions[0] ?? null, ready: true, error: "" };
}

export async function clearTelegramBotSession(telegramUserId: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return { ready: false, error: "Supabase is not configured." };
  }

  const response = await fetch(`${getTableUrl(config)}?telegram_user_id=eq.${telegramUserId.trim()}`, {
    method: "DELETE",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const details = await response.text();

    if (isSetupError(response.status, details)) {
      return { ready: false, error: details };
    }

    throw new Error(`Supabase Telegram bot session delete failed: ${response.status} ${details}`);
  }

  return { ready: true, error: "" };
}
