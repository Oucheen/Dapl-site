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
  admin_notes?: string | null;
  scheduled_date?: string | null;
  estimated_price?: number | string | null;
  assigned_technician?: string | null;
  call_intake?: Record<string, unknown> | null;
};

type RecentVoiceLeadRecord = Pick<LeadRecord, "id" | "created_at" | "phone" | "message">;

export type LeadAdminUpdateInput = {
  status: LeadAdminStatus;
  adminNotes: string;
  scheduledDate?: string;
  estimatedPrice?: string;
  assignedTechnician?: string;
};

export type LeadPostInvoiceUpdateInput = {
  status: Extract<LeadAdminStatus, "invoiced" | "completed" | "cancelled">;
  adminNotes: string;
};

export type ManualLeadInput = {
  name: string;
  phone: string;
  email: string;
  address: string;
  appliance: string;
  promoCode: string;
  serviceDate: string;
  serviceTime?: string;
  serviceWindow?: string;
  estimatedPrice: string;
  invoiceItemDescription?: string;
  invoiceItemQuantity?: string;
  invoiceItemUnitPrice?: string;
  discountAdjustments?: string[];
  assignedTechnician: string;
  notes: string;
  leadCreatedAt?: string;
  leadCreatedTime?: string;
  invoiceCreatedAt?: string;
  invoiceCreatedTime?: string;
};

export type CallIntakeItem = {
  category: "service" | "material";
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
};

export type CallIntakeLeadInput = {
  leadId?: string | null;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  appliance?: string;
  leadSource?: string;
  preferredDate?: string;
  message?: string;
  adminNotes?: string;
  saveMode: "lead" | "schedule";
  serviceDate?: string;
  serviceTime?: string;
  serviceWindow?: string;
  assignedTechnician?: string;
  businessUnit?: string;
  jobType?: string;
  propertyType?: string;
  propertyAge?: string;
  ownership?: string;
  workType?: string;
  priority?: string;
  tags?: string[];
  items?: CallIntakeItem[];
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

function assertUuid(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid lead id.");
  }
}

function headers(config: NonNullable<ReturnType<typeof getSupabaseConfig>>) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function toOptionalText(value: string) {
  return value.trim() || null;
}

function normalizePhoneForDedupe(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits;
}

function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

function toEstimatedPrice(value: string) {
  const priceText = value.trim();

  if (!priceText) {
    return null;
  }

  const estimatedPrice = Number(priceText);

  if (!Number.isFinite(estimatedPrice) || estimatedPrice < 0) {
    throw new Error("Invalid estimated price.");
  }

  return estimatedPrice;
}

function getManualEstimatedPrice(input: ManualLeadInput) {
  const explicitEstimate = input.estimatedPrice.trim();

  if (explicitEstimate) {
    return toEstimatedPrice(explicitEstimate);
  }

  const unitPriceText = input.invoiceItemUnitPrice?.trim() ?? "";

  if (!unitPriceText) {
    return null;
  }

  const quantity = Number(input.invoiceItemQuantity?.trim() || "1");
  const unitPrice = Number(unitPriceText);

  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("Invalid manual invoice charge.");
  }

  return Math.round(quantity * unitPrice * 100) / 100;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return (
    Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    ) - date.getTime()
  );
}

function getCharlotteDateTimeIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const localAsUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const firstOffset = getTimeZoneOffsetMs(localAsUtc, "America/New_York");
  const firstUtc = new Date(localAsUtc.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(firstUtc, "America/New_York");

  if (secondOffset !== firstOffset) {
    return new Date(localAsUtc.getTime() - secondOffset).toISOString();
  }

  return firstUtc.toISOString();
}

export function toManualRecordTimestamp(value: string | undefined, timeValue?: string) {
  const date = value?.trim();

  if (!date) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Manual record date must use YYYY-MM-DD format.");
  }

  const time = timeValue?.trim();

  if (!time) {
    return `${date}T12:00:00.000Z`;
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Manual record time must use HH:MM format.");
  }

  return getCharlotteDateTimeIso(date, time);
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
        ...headers(config),
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

export async function findRecentVoiceLeadDuplicate(input: {
  phone: string;
  callId?: string;
  windowMinutes?: number;
}) {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const normalizedPhone = normalizePhoneForDedupe(input.phone);
  const callId = input.callId?.trim() ?? "";
  const since = new Date(Date.now() - (input.windowMinutes ?? 15) * 60_000).toISOString();
  const params = new URLSearchParams({
    select: "id,created_at,phone,message",
    lead_source: "eq.voice-agent",
    created_at: `gte.${since}`,
    order: "created_at.desc",
    limit: "50",
  });

  try {
    const response = await fetch(`${getSupabaseUrl(config)}?${params.toString()}`, {
      headers: headers(config),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`Supabase recent voice lead fetch failed: ${response.status} ${details}`);
      return null;
    }

    const rows = (await response.json()) as RecentVoiceLeadRecord[];

    if (callId) {
      const byCallId = rows.find((row) => row.message?.includes(`Call ID: ${callId}`));

      if (byCallId) {
        return byCallId;
      }
    }

    if (!normalizedPhone) {
      return null;
    }

    return rows.find((row) => normalizePhoneForDedupe(row.phone) === normalizedPhone) ?? null;
  } catch (error) {
    console.error("Supabase recent voice lead fetch error:", error);
    return null;
  }
}

export async function createManualSupabaseLead(input: ManualLeadInput) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const name = input.name.trim();
  const phone = input.phone.trim();
  const address = input.address.trim();
  const manualCreatedAt = toManualRecordTimestamp(input.leadCreatedAt, input.leadCreatedTime);

  if (!name) {
    throw new Error("Customer name is required.");
  }

  if (!phone) {
    throw new Error("Customer phone is required.");
  }

  if (!address) {
    throw new Error("Service address is required.");
  }

  const response = await fetch(getSupabaseUrl(config), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      ...(manualCreatedAt ? { created_at: manualCreatedAt } : {}),
      status: "confirmed" satisfies LeadAdminStatus,
      name,
      phone,
      email: input.email.trim(),
      service_address: address,
      appliance: toOptionalText(input.appliance),
      promo_code: toOptionalText(input.promoCode),
      lead_source: "manual-admin",
      preferred_date: null,
      message: input.notes.trim() || "Manual invoice created from the admin dashboard.",
      admin_notes: toOptionalText(input.notes),
      scheduled_date: input.serviceDate || null,
      estimated_price: getManualEstimatedPrice(input),
      assigned_technician: toOptionalText(input.assignedTechnician),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase manual lead insert failed: ${response.status} ${details}`);
  }

  const rows = (await response.json()) as SupabaseLeadRow[];
  const leadId = rows[0]?.id;

  if (!leadId) {
    throw new Error("Supabase manual lead insert returned no lead.");
  }

  return leadId;
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
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase leads fetch failed: ${response.status} ${details}`);
  }

  return (await response.json()) as LeadRecord[];
}

export async function getSupabaseLeadById(id: string): Promise<LeadRecord | null> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  assertUuid(id);

  const params = new URLSearchParams({
    select: "*",
    id: `eq.${id}`,
    limit: "1",
  });

  const response = await fetch(`${getSupabaseUrl(config)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase lead fetch failed: ${response.status} ${details}`);
  }

  const rows = (await response.json()) as LeadRecord[];
  return rows[0] ?? null;
}

export async function updateSupabaseLeadStatus(id: string, status: LeadAdminStatus) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  assertUuid(id);

  const response = await fetch(`${getSupabaseUrl(config)}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase lead status update failed: ${response.status} ${details}`);
  }
}

export async function updateSupabaseLead(id: string, input: LeadAdminUpdateInput) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  assertUuid(id);

  const payload: Record<string, string | number | null> = {
    status: input.status,
    admin_notes: input.adminNotes.trim() || null,
  };

  if (input.scheduledDate !== undefined) {
    payload.scheduled_date = input.scheduledDate || null;
  }

  if (input.estimatedPrice !== undefined) {
    payload.estimated_price = toEstimatedPrice(input.estimatedPrice);
  }

  if (input.assignedTechnician !== undefined) {
    payload.assigned_technician = input.assignedTechnician.trim() || null;
  }

  const response = await fetch(`${getSupabaseUrl(config)}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase lead update failed: ${response.status} ${details}`);
  }
}

export async function updateSupabaseLeadAfterInvoice(
  id: string,
  input: LeadPostInvoiceUpdateInput,
) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  assertUuid(id);

  const response = await fetch(`${getSupabaseUrl(config)}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status: input.status,
      admin_notes: input.adminNotes.trim() || null,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase post-invoice lead update failed: ${response.status} ${details}`);
  }
}

export async function deleteSupabaseLead(id: string) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  assertUuid(id);

  const response = await fetch(`${getSupabaseUrl(config)}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase lead delete failed: ${response.status} ${details}`);
  }
}

export async function findSupabaseLeadByPhone(phone: string) {
  const config = getSupabaseConfig();
  const normalizedPhone = normalizePhoneForDedupe(phone);

  if (!config || !normalizedPhone) {
    return null;
  }

  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
    limit: "1000",
  });

  const response = await fetch(`${getSupabaseUrl(config)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase phone lookup failed: ${response.status} ${await response.text()}`);
  }

  const rows = (await response.json()) as LeadRecord[];
  return rows.find((row) => normalizePhoneForDedupe(row.phone) === normalizedPhone) ?? null;
}

export async function saveCallIntakeLead(input: CallIntakeLeadInput) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const name = input.name.trim();
  const phone = input.phone.trim();

  if (!name) {
    throw new Error("Customer name is required.");
  }

  if (!phone) {
    throw new Error("Customer phone is required.");
  }

  let existingLead = isUuid(input.leadId) ? await getSupabaseLeadById(input.leadId as string) : null;

  if (!existingLead) {
    existingLead = await findSupabaseLeadByPhone(phone);
  }

  const items = (input.items ?? []).map((item) => ({
    category: item.category === "material" ? "material" : "service",
    name: item.name.trim(),
    description: item.description?.trim() || "",
    quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
    unitPrice: Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0,
  })).filter((item) => item.name);
  const total = Math.round(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100) / 100;
  const intakeData = {
    businessUnit: input.businessUnit?.trim() || "",
    jobType: input.jobType?.trim() || "",
    propertyType: input.propertyType?.trim() || "",
    propertyAge: input.propertyAge?.trim() || "",
    ownership: input.ownership?.trim() || "",
    workType: input.workType?.trim() || "",
    priority: input.priority?.trim() || "",
    serviceTime: input.serviceTime?.trim() || "",
    serviceWindow: input.serviceWindow?.trim() || "",
    tags: (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    items,
    total,
    savedAt: new Date().toISOString(),
  };

  const nextStatus: LeadAdminStatus = input.saveMode === "schedule" ? "confirmed" : "new";
  const payload = {
    name,
    phone,
    email: input.email?.trim() || existingLead?.email || "",
    service_address: input.address?.trim() || existingLead?.service_address || "Address pending",
    appliance: input.appliance?.trim() || existingLead?.appliance || null,
    lead_source: input.leadSource?.trim() || existingLead?.lead_source || "phone",
    preferred_date: input.preferredDate?.trim() || existingLead?.preferred_date || null,
    message: input.message?.trim() || existingLead?.message || "Call intake",
    admin_notes: input.adminNotes?.trim() || existingLead?.admin_notes || null,
    status: existingLead?.status === "completed" || existingLead?.status === "invoiced" ? existingLead.status : nextStatus,
    scheduled_date: input.saveMode === "schedule" ? input.serviceDate?.trim() || existingLead?.scheduled_date || null : existingLead?.scheduled_date || null,
    assigned_technician: input.assignedTechnician?.trim() || existingLead?.assigned_technician || null,
    estimated_price: total > 0 ? total : existingLead?.estimated_price || null,
    call_intake: intakeData,
  };

  let leadId = existingLead?.id;

  if (leadId) {
    const response = await fetch(`${getSupabaseUrl(config)}?id=eq.${encodeURIComponent(leadId)}`, {
      method: "PATCH",
      headers: { ...headers(config), Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Supabase intake lead update failed: ${response.status} ${await response.text()}`);
    }
  } else {
    const response = await fetch(getSupabaseUrl(config), {
      method: "POST",
      headers: { ...headers(config), Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Supabase intake lead insert failed: ${response.status} ${await response.text()}`);
    }

    const rows = (await response.json()) as SupabaseLeadRow[];
    leadId = rows[0]?.id;
  }

  if (!leadId) {
    throw new Error("Supabase intake save returned no lead.");
  }

  return { leadId, existing: Boolean(existingLead), total, intakeData };
}
