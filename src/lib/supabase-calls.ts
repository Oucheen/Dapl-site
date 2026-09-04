import { listSupabaseLeads, type LeadRecord } from "@/lib/supabase-leads";

export type CallDirection = "incoming" | "outgoing";
export type CallStatus = "initiated" | "ringing" | "answered" | "completed" | "missed" | "failed" | "busy";

export type CallRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  twilio_call_sid: string;
  parent_call_sid: string | null;
  lead_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  direction: CallDirection;
  status: CallStatus;
  employee_id: string | null;
  employee_name: string | null;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  recording_sid: string | null;
  recording_url: string | null;
  recording_status: string | null;
  recording_duration_seconds: number | null;
};

export type CallInput = Partial<Omit<CallRecord, "id" | "created_at" | "updated_at">> & {
  twilio_call_sid: string;
};

const DEFAULT_CALLS_TABLE = "calls";

function getConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  const table = (process.env.SUPABASE_CALLS_TABLE || DEFAULT_CALLS_TABLE).trim().replace(/^public\./, "");
  return { url, key, table };
}

function tableUrl(config: NonNullable<ReturnType<typeof getConfig>>) {
  return `${config.url}/rest/v1/${config.table}`;
}

function headers(config: NonNullable<ReturnType<typeof getConfig>>) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json",
  };
}

export async function upsertCall(input: CallInput) {
  const config = getConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${tableUrl(config)}?on_conflict=twilio_call_sid`, {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase call upsert failed: ${response.status} ${details}`);
  }

  const rows = (await response.json()) as CallRecord[];
  return rows[0] ?? null;
}

export async function getCallByRecordingSid(recordingSid: string) {
  const config = getConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({ select: "*", recording_sid: `eq.${recordingSid}`, limit: "1" });
  const response = await fetch(`${tableUrl(config)}?${params.toString()}`, { headers: headers(config), cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Supabase call lookup failed: ${response.status} ${await response.text()}`);
  }

  const rows = (await response.json()) as CallRecord[];
  return rows[0] ?? null;
}

export async function listCalls(filters: { from?: string; to?: string; direction?: string; status?: string; employee?: string; leadId?: string } = {}) {
  const config = getConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({ select: "*", order: "created_at.desc", limit: "500" });

  if (filters.from) params.append("created_at", `gte.${filters.from}T00:00:00.000Z`);
  if (filters.to) params.append("created_at", `lte.${filters.to}T23:59:59.999Z`);
  if (filters.direction && ["incoming", "outgoing"].includes(filters.direction)) params.set("direction", `eq.${filters.direction}`);
  if (filters.status && ["initiated", "ringing", "answered", "completed", "missed", "failed", "busy"].includes(filters.status)) params.set("status", `eq.${filters.status}`);
  if (filters.employee) params.set("employee_name", `ilike.*${filters.employee.replace(/[*(),]/g, "")}*`);
  if (filters.leadId) params.set("lead_id", `eq.${filters.leadId}`);

  const response = await fetch(`${tableUrl(config)}?${params.toString()}`, { headers: headers(config), cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Supabase calls fetch failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as CallRecord[];
}

export async function findLeadByPhone(phone: string): Promise<LeadRecord | null> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const leads = await listSupabaseLeads(500);
  return leads.find((lead) => lead.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "") === digits.replace(/^1(?=\d{10}$)/, "")) ?? null;
}
