type LeadStatus = "new";

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

export async function saveLeadToSupabase(input: LeadInsertInput): Promise<SaveLeadResult> {
  const config = getSupabaseConfig();

  if (!config) {
    return { saved: false, skipped: true };
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/${config.table}`, {
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
