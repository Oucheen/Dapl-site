import { getCurrentAdminUser } from "@/lib/admin-auth";

export type LeadActivityRecord = {
  id: string;
  created_at: string;
  lead_id: string | null;
  invoice_id: string | null;
  event_type: string;
  title: string;
  details: string | null;
  metadata: Record<string, unknown>;
};

type LeadActivityInput = {
  leadId: string | null;
  invoiceId?: string | null;
  eventType: string;
  title: string;
  details?: string;
  metadata?: Record<string, unknown>;
};

const DEFAULT_ACTIVITY_TABLE = "lead_activity";

function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

function normalizeTableName(table: string) {
  const cleaned = table.trim().replace(/^\/+|\/+$/g, "");

  if (cleaned.startsWith("public.")) {
    return cleaned.slice("public.".length);
  }

  return cleaned || DEFAULT_ACTIVITY_TABLE;
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
      process.env.SUPABASE_ACTIVITY_TABLE || DEFAULT_ACTIVITY_TABLE,
    ),
  };
}

function getSupabaseUrl(config: NonNullable<ReturnType<typeof getSupabaseConfig>>) {
  return `${config.url}/rest/v1/${config.table}`;
}

function headers(config: NonNullable<ReturnType<typeof getSupabaseConfig>>) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

export async function createLeadActivity(input: LeadActivityInput) {
  const config = getSupabaseConfig();

  if (!config || !isUuid(input.leadId)) {
    return;
  }

  try {
    const currentUser = await getCurrentAdminUser();
    const metadata = {
      ...(input.metadata ?? {}),
      ...(currentUser
        ? {
            actor: {
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
            },
          }
        : {}),
    };

    const response = await fetch(getSupabaseUrl(config), {
      method: "POST",
      headers: {
        ...headers(config),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        lead_id: input.leadId,
        invoice_id: isUuid(input.invoiceId) ? input.invoiceId : null,
        event_type: input.eventType,
        title: input.title,
        details: input.details?.trim() || null,
        metadata,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(
        `Supabase activity insert failed: ${response.status} ${details}`,
      );
    }
  } catch (error) {
    console.error("Supabase activity insert error:", error);
  }
}

export function getActivityActorName(activity: LeadActivityRecord) {
  const actor = activity.metadata?.actor;

  if (!actor || typeof actor !== "object") {
    return null;
  }

  const name = (actor as { name?: unknown }).name;

  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export async function listActivitiesForLeads(leadIds: string[], perLead = 4) {
  const uniqueLeadIds = [...new Set(leadIds.filter(isUuid))];
  const grouped = new Map<string, LeadActivityRecord[]>(
    uniqueLeadIds.map((leadId) => [leadId, []]),
  );
  const config = getSupabaseConfig();

  if (!config || uniqueLeadIds.length === 0) {
    return grouped;
  }

  const params = new URLSearchParams({
    select: "*",
    lead_id: `in.(${uniqueLeadIds.join(",")})`,
    order: "created_at.desc",
    limit: String(Math.min(500, uniqueLeadIds.length * Math.max(perLead, 1))),
  });

  try {
    const response = await fetch(`${getSupabaseUrl(config)}?${params.toString()}`, {
      headers: headers(config),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(
        `Supabase activity fetch failed: ${response.status} ${details}`,
      );
      return grouped;
    }

    const rows = (await response.json()) as LeadActivityRecord[];

    for (const row of rows) {
      if (!row.lead_id) {
        continue;
      }

      const leadActivities = grouped.get(row.lead_id);

      if (leadActivities && leadActivities.length < perLead) {
        leadActivities.push(row);
      }
    }
  } catch (error) {
    console.error("Supabase activity fetch error:", error);
  }

  return grouped;
}

export async function listActivitiesForLead(leadId: string, limit = 25) {
  const config = getSupabaseConfig();

  if (!config || !isUuid(leadId)) {
    return [];
  }

  const params = new URLSearchParams({
    select: "*",
    lead_id: `eq.${leadId}`,
    order: "created_at.desc",
    limit: String(limit),
  });

  try {
    const response = await fetch(`${getSupabaseUrl(config)}?${params.toString()}`, {
      headers: headers(config),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`Supabase lead activity fetch failed: ${response.status} ${details}`);
      return [];
    }

    return (await response.json()) as LeadActivityRecord[];
  } catch (error) {
    console.error("Supabase lead activity fetch error:", error);
    return [];
  }
}

export async function listActivitiesForInvoice(invoiceId: string, limit = 8) {
  const config = getSupabaseConfig();

  if (!config || !isUuid(invoiceId)) {
    return [];
  }

  const params = new URLSearchParams({
    select: "*",
    invoice_id: `eq.${invoiceId}`,
    order: "created_at.desc",
    limit: String(limit),
  });

  try {
    const response = await fetch(`${getSupabaseUrl(config)}?${params.toString()}`, {
      headers: headers(config),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(
        `Supabase invoice activity fetch failed: ${response.status} ${details}`,
      );
      return [];
    }

    return (await response.json()) as LeadActivityRecord[];
  } catch (error) {
    console.error("Supabase invoice activity fetch error:", error);
    return [];
  }
}
