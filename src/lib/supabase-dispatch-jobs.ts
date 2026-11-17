import { toManualRecordTimestamp } from "@/lib/supabase-leads";

export type ManualDispatchJobRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  service_address: string;
  service_date: string;
  scheduled_start: string;
  scheduled_end: string | null;
  assigned_technician: string;
};

export type ManualDispatchJobInput = {
  name: string;
  serviceAddress: string;
  serviceDate: string;
  scheduledStart: string;
  scheduledEnd?: string;
  assignedTechnician: string;
};

function assertManualDispatchJobId(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id.trim())) {
    throw new Error("Invalid manual dispatch job ID.");
  }
}

function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

function getConfig() {
  const rawUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !serviceRoleKey) {
    return null;
  }

  return {
    url: normalizeSupabaseUrl(rawUrl),
    serviceRoleKey,
  };
}

function getTableUrl(config: NonNullable<ReturnType<typeof getConfig>>) {
  return `${config.url}/rest/v1/dispatch_manual_jobs`;
}

function getHeaders(config: NonNullable<ReturnType<typeof getConfig>>) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

export async function listManualDispatchJobs(limit = 500): Promise<ManualDispatchJobRecord[]> {
  const config = getConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*",
    order: "scheduled_start.asc",
    limit: String(limit),
  });
  const response = await fetch(`${getTableUrl(config)}?${params.toString()}`, {
    headers: getHeaders(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase manual dispatch jobs fetch failed: ${response.status} ${details}`);
  }

  return (await response.json()) as ManualDispatchJobRecord[];
}

export async function createManualDispatchJob(input: ManualDispatchJobInput) {
  const config = getConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const name = input.name.trim();
  const serviceAddress = input.serviceAddress.trim();
  const serviceDate = input.serviceDate.trim();
  const assignedTechnician = input.assignedTechnician.trim();

  if (!name || !serviceAddress || !serviceDate || !input.scheduledStart.trim() || !assignedTechnician) {
    throw new Error("Name, address, date, start time, and technician are required.");
  }

  const scheduledStart = toManualRecordTimestamp(serviceDate, input.scheduledStart.trim());
  const scheduledEnd = input.scheduledEnd?.trim()
    ? toManualRecordTimestamp(serviceDate, input.scheduledEnd.trim())
    : null;

  const response = await fetch(getTableUrl(config), {
    method: "POST",
    headers: {
      ...getHeaders(config),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name,
      service_address: serviceAddress,
      service_date: serviceDate,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      assigned_technician: assignedTechnician,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase manual dispatch job insert failed: ${response.status} ${details}`);
  }

  const rows = (await response.json()) as ManualDispatchJobRecord[];
  return rows[0] ?? null;
}

export async function updateManualDispatchJob(id: string, input: ManualDispatchJobInput) {
  const config = getConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  assertManualDispatchJobId(id);

  const name = input.name.trim();
  const serviceAddress = input.serviceAddress.trim();
  const serviceDate = input.serviceDate.trim();
  const assignedTechnician = input.assignedTechnician.trim();

  if (!name || !serviceAddress || !serviceDate || !input.scheduledStart.trim() || !assignedTechnician) {
    throw new Error("Address, date, start time, and technician are required.");
  }

  const scheduledStart = toManualRecordTimestamp(serviceDate, input.scheduledStart.trim());
  const scheduledEnd = input.scheduledEnd?.trim()
    ? toManualRecordTimestamp(serviceDate, input.scheduledEnd.trim())
    : null;

  const response = await fetch(`${getTableUrl(config)}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      ...getHeaders(config),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name,
      service_address: serviceAddress,
      service_date: serviceDate,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      assigned_technician: assignedTechnician,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase manual dispatch job update failed: ${response.status} ${details}`);
  }

  const rows = (await response.json()) as ManualDispatchJobRecord[];
  return rows[0] ?? null;
}

export async function deleteManualDispatchJob(id: string) {
  const config = getConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  assertManualDispatchJobId(id);

  const response = await fetch(`${getTableUrl(config)}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...getHeaders(config),
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase manual dispatch job delete failed: ${response.status} ${details}`);
  }
}
