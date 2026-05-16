type LeadStatus = "new";
export type LeadAdminStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "invoiced"
  | "completed"
  | "cancelled";

export type LeadInsertInput = {
  name: string;
  phone: string;
  email: string;
  address: string;
  appliance: string;
  promoCode: string;
  leadSource: string;
  preferredDate: string;
  message: string;
};

type SupabaseLeadRow = {
  id?: string;
};

export type LeadRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  status: LeadAdminStatus;
  name: string;
  phone: string;
  email: string;
  service_address: string;
  appliance: string | null;
  promo_code: string | null;
  lead_source: string | null;
  preferred_date: string | null;
  message: string;
};

type SaveLeadResult =
  | { saved: true; id?: string }
  | { saved: false; skipped: true }
  | { saved: false; skipped: false; error: unknown };

const DEFAULT_LEADS_TABLE = "leads";

function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

function normalizeTableName(table: string) {
  const cleaned = table.trim().replace(/^\/+|\/+$/g, "");

  if (cleaned.startsWith("public.")) {
    return cleaned.slice("public.".length);
  }

  return cleaned || DEFAULT_LEADS_TABLE;
}

function getSupabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !serviceRoleKey) {
    return null;
  }

  const url = normalizeSupabaseUrl(rawUrl);
  const table = normalizeTableName(process.env.SUPABASE_LEADS_TABLE || DEFAULT_LEADS_TABLE);

  return { url, serviceRoleKey, table };
}

function getSupabaseUrl(config: NonNullable<ReturnType<typeof getSupabaseConfig>>) {
  return `${config.url}/rest/v1/${config.table}`;
}

export async function saveLeadToSupabase(input: LeadInsertInput): Promise<SaveLeadResult> {
  const config = getSupabaseConfig();

  if (!config) {
    return { saved: false, skipped: true };
  }

  try {
    const response = await fetch(getSupabaseUrl(config), {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "new" satisfies LeadStatus,
        name: input.name,
        phone: input.phone,
        email: input.email,
        service_address: input.address,
        appliance: input.appliance || null,
        promo_code: input.promoCode || null,
        lead_source: input.leadSource || null,
        preferred_date: input.preferredDate || null,
        message: input.message,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Supabase lead insert failed: ${response.status} ${details}`);
    }

    const rows = (await response.json().catch(() => [])) as SupabaseLeadRow[];
    return { saved: true, id: rows[0]?.id };
  } catch (error) {
    return { saved: false, skipped: false, error };
  }
}

export async function listSupabaseLeads(limit = 100): Promise<LeadRecord[]> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
    limit: String(limit),
  });

  const response = await fetch(`${getSupabaseUrl(config)}?${params.toString()}`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase leads fetch failed: ${response.status} ${details}`);
  }

  return (await response.json()) as LeadRecord[];
}

export async function updateSupabaseLeadStatus(id: string, status: LeadAdminStatus) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid lead id.");
  }

  const response = await fetch(`${getSupabaseUrl(config)}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase lead status update failed: ${response.status} ${details}`);
  }
}
