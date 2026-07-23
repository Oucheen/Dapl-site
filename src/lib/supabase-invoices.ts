import { randomUUID } from "crypto";
import {
  createManualSupabaseLead,
  type LeadRecord,
  type ManualLeadInput,
  toManualRecordTimestamp,
  updateSupabaseLeadStatus,
} from "@/lib/supabase-leads";

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type InvoiceJobStatus =
  | "scheduled"
  | "on_the_way"
  | "in_progress"
  | "need_parts"
  | "done"
  | "reschedule"
  | "canceled";

export type InvoiceRecord = {
  id: string;
  lead_id: string | null;
  invoice_number: string;
  created_at: string;
  updated_at: string;
  status: InvoiceStatus;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  service_address: string | null;
  appliance: string | null;
  service_date: string | null;
  service_time?: string | null;
  service_window?: string | null;
  assigned_technician: string | null;
  job_status?: InvoiceJobStatus | null;
  notes: string | null;
  promo_code: string | null;
  discount_amount: number | string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  payment_method: string | null;
  paid_date: string | null;
};

export type InvoiceItemRecord = {
  id: string;
  invoice_id: string;
  created_at: string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
};

export type InvoicePaymentRecord = {
  id: string;
  invoice_id: string;
  created_at: string;
  payment_date: string;
  amount: number | string;
  method: string;
  note: string | null;
};

export type InvoiceWithItems = {
  invoice: InvoiceRecord;
  items: InvoiceItemRecord[];
  payments: InvoicePaymentRecord[];
};

export type InvoiceItemInput = {
  id?: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
};

export type InvoicePaymentInput = {
  amount: number | string;
  method: string;
  paymentDate?: string | null;
  paymentTime?: string | null;
  note?: string | null;
};

export type InvoiceScheduleInput = {
  serviceDate?: string | null;
  serviceTime?: string | null;
  serviceWindow?: string | null;
  assignedTechnician?: string | null;
  jobStatus?: InvoiceJobStatus | null;
};

export const INVOICE_ITEM_TEMPLATES = [
  {
    key: "diagnostic",
    label: "Diagnostic",
    description: "Diagnostic / service call",
    quantity: 1,
    unitPrice: 89,
  },
  {
    key: "labor",
    label: "Labor",
    description: "Labor",
    quantity: 1,
    unitPrice: 125,
  },
  {
    key: "parts",
    label: "Customer parts charge",
    description: "Parts charge billed to customer",
    quantity: 1,
    unitPrice: 0,
  },
  {
    key: "repair-service",
    label: "Repair service",
    description: "Appliance repair service",
    quantity: 1,
    unitPrice: 150,
  },
  {
    key: "maintenance",
    label: "Maintenance",
    description: "Preventive maintenance service",
    quantity: 1,
    unitPrice: 120,
  },
  {
    key: "installation",
    label: "Installation",
    description: "Installation / setup service",
    quantity: 1,
    unitPrice: 150,
  },
] as const;

export type InvoiceItemTemplateKey = (typeof INVOICE_ITEM_TEMPLATES)[number]["key"];

export const INVOICE_PROMO_DISCOUNTS = {
  WEB25: 25,
  RETURN15: 15,
} as const;

export const SERVICE_CALL_DISCOUNT_CODE = "SERVICECALL";
export const SERVICE_CALL_DISCOUNT_AMOUNT = 89;

const DEFAULT_LEADS_TABLE = "leads";
const DEFAULT_INVOICES_TABLE = "invoices";
const DEFAULT_INVOICE_ITEMS_TABLE = "invoice_items";
const DEFAULT_INVOICE_PAYMENTS_TABLE = "invoice_payments";

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

  const url = normalizeSupabaseUrl(rawUrl);
  const leadsTable = normalizeTableName(
    process.env.SUPABASE_LEADS_TABLE || DEFAULT_LEADS_TABLE,
    DEFAULT_LEADS_TABLE,
  );
  const invoicesTable = normalizeTableName(
    process.env.SUPABASE_INVOICES_TABLE || DEFAULT_INVOICES_TABLE,
    DEFAULT_INVOICES_TABLE,
  );
  const invoiceItemsTable = normalizeTableName(
    process.env.SUPABASE_INVOICE_ITEMS_TABLE || DEFAULT_INVOICE_ITEMS_TABLE,
    DEFAULT_INVOICE_ITEMS_TABLE,
  );
  const invoicePaymentsTable = normalizeTableName(
    process.env.SUPABASE_INVOICE_PAYMENTS_TABLE || DEFAULT_INVOICE_PAYMENTS_TABLE,
    DEFAULT_INVOICE_PAYMENTS_TABLE,
  );

  return { url, serviceRoleKey, leadsTable, invoicesTable, invoiceItemsTable, invoicePaymentsTable };
}

function getTableUrl(config: NonNullable<ReturnType<typeof getSupabaseConfig>>, table: string) {
  return `${config.url}/rest/v1/${table}`;
}

function assertUuid(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid id.");
  }
}

function headers(config: NonNullable<ReturnType<typeof getSupabaseConfig>>) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function toMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function normalizePromoCode(value: string | null | undefined) {
  const code = value?.trim().toUpperCase();

  return code || null;
}

export function getPromoDiscountAmount(value: string | null | undefined) {
  const code = normalizePromoCode(value);

  if (!code) {
    return 0;
  }

  return INVOICE_PROMO_DISCOUNTS[code as keyof typeof INVOICE_PROMO_DISCOUNTS] ?? 0;
}

function addDiscountCode(value: string | null | undefined, code: string) {
  const normalizedCode = normalizePromoCode(code);
  const existingCodes = (value ?? "")
    .split("+")
    .map((item) => normalizePromoCode(item))
    .filter((item): item is string => Boolean(item));

  if (!normalizedCode || existingCodes.includes(normalizedCode)) {
    return existingCodes.join("+") || null;
  }

  return [...existingCodes, normalizedCode].join("+");
}

function toQuantity(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 1;
  }

  return Math.round(amount * 100) / 100;
}

const CHARLOTTE_TIME_ZONE = "America/New_York";

function getTimeZoneOffsetMinutes(timeZone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const timeZoneName = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";

  if (timeZoneName === "GMT") {
    return 0;
  }

  const match = timeZoneName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);

  return sign * (hours * 60 + minutes);
}

function toCharlottePaymentTimestamp(dateValue?: string | null, timeValue?: string | null) {
  const date = dateValue?.trim();

  if (!date) {
    return new Date().toISOString();
  }

  const time = timeValue?.trim() || "12:00";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Payment date must use YYYY-MM-DD format.");
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Payment time must use HH:mm format.");
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (hour > 23 || minute > 59) {
    throw new Error("Payment time is invalid.");
  }

  const localAsUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offset = getTimeZoneOffsetMinutes(CHARLOTTE_TIME_ZONE, localAsUtc);
  let utcTime = localAsUtc.getTime() - offset * 60 * 1000;
  const adjustedOffset = getTimeZoneOffsetMinutes(CHARLOTTE_TIME_ZONE, new Date(utcTime));

  if (adjustedOffset !== offset) {
    utcTime = localAsUtc.getTime() - adjustedOffset * 60 * 1000;
  }

  return new Date(utcTime).toISOString();
}

function createInvoiceNumber(dateValue?: string | null) {
  const date = dateValue ? new Date(dateValue) : new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");

  return `DAPL-${stamp}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function getServiceDescription(lead: LeadRecord) {
  const appliance = lead.appliance || "Appliance";
  return `${appliance} repair service`;
}

export function getInvoiceItemTemplate(templateKey: string) {
  return INVOICE_ITEM_TEMPLATES.find((template) => template.key === templateKey) ?? null;
}

function calculateInvoiceTotal(subtotal: number, discountAmount: number, tax: number) {
  return toMoney(Math.max(0, subtotal - discountAmount) + tax);
}

export function calculateInvoicePaidAmount(payments: InvoicePaymentRecord[]) {
  return toMoney(payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0));
}

export function calculateInvoiceAmountDue(
  invoice: Pick<InvoiceRecord, "total">,
  payments: InvoicePaymentRecord[],
) {
  return toMoney(Math.max(0, Number(invoice.total ?? 0) - calculateInvoicePaidAmount(payments)));
}

export async function getInvoiceById(id: string): Promise<InvoiceWithItems | null> {
  assertUuid(id);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const invoiceParams = new URLSearchParams({
    select: "*",
    id: `eq.${id}`,
    limit: "1",
  });

  const invoiceResponse = await fetch(
    `${getTableUrl(config, config.invoicesTable)}?${invoiceParams.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!invoiceResponse.ok) {
    const details = await invoiceResponse.text();
    throw new Error(`Supabase invoice fetch failed: ${invoiceResponse.status} ${details}`);
  }

  const invoices = (await invoiceResponse.json()) as InvoiceRecord[];
  const invoice = invoices[0];

  if (!invoice) {
    return null;
  }

  const itemParams = new URLSearchParams({
    select: "*",
    invoice_id: `eq.${id}`,
    order: "created_at.asc",
  });

  const itemResponse = await fetch(
    `${getTableUrl(config, config.invoiceItemsTable)}?${itemParams.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!itemResponse.ok) {
    const details = await itemResponse.text();
    throw new Error(`Supabase invoice items fetch failed: ${itemResponse.status} ${details}`);
  }

  const paymentParams = new URLSearchParams({
    select: "*",
    invoice_id: `eq.${id}`,
    order: "payment_date.asc,created_at.asc",
  });

  const paymentResponse = await fetch(
    `${getTableUrl(config, config.invoicePaymentsTable)}?${paymentParams.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!paymentResponse.ok) {
    const details = await paymentResponse.text();
    throw new Error(`Supabase invoice payments fetch failed: ${paymentResponse.status} ${details}`);
  }

  return {
    invoice,
    items: (await itemResponse.json()) as InvoiceItemRecord[],
    payments: (await paymentResponse.json()) as InvoicePaymentRecord[],
  };
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceWithItems | null> {
  const config = getSupabaseConfig();
  const normalizedInvoiceNumber = invoiceNumber.trim();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  if (!normalizedInvoiceNumber) {
    return null;
  }

  const invoiceParams = new URLSearchParams({
    select: "*",
    invoice_number: `eq.${normalizedInvoiceNumber}`,
    limit: "1",
  });

  const invoiceResponse = await fetch(
    `${getTableUrl(config, config.invoicesTable)}?${invoiceParams.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!invoiceResponse.ok) {
    const details = await invoiceResponse.text();
    throw new Error(`Supabase invoice fetch failed: ${invoiceResponse.status} ${details}`);
  }

  const invoices = (await invoiceResponse.json()) as InvoiceRecord[];
  const invoice = invoices[0];

  if (!invoice) {
    return null;
  }

  return getInvoiceById(invoice.id);
}

export async function listInvoices(limit = 100): Promise<InvoiceRecord[]> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
    limit: String(limit),
  });

  const response = await fetch(
    `${getTableUrl(config, config.invoicesTable)}?${params.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoices fetch failed: ${response.status} ${details}`);
  }

  return (await response.json()) as InvoiceRecord[];
}

async function getLeadById(config: NonNullable<ReturnType<typeof getSupabaseConfig>>, id: string) {
  const params = new URLSearchParams({
    select: "*",
    id: `eq.${id}`,
    limit: "1",
  });

  const response = await fetch(`${getTableUrl(config, config.leadsTable)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase lead fetch failed: ${response.status} ${details}`);
  }

  const leads = (await response.json()) as LeadRecord[];
  return leads[0] ?? null;
}

async function getExistingInvoiceForLead(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  leadId: string,
) {
  const params = new URLSearchParams({
    select: "id",
    lead_id: `eq.${leadId}`,
    limit: "1",
  });

  const response = await fetch(`${getTableUrl(config, config.invoicesTable)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase existing invoice fetch failed: ${response.status} ${details}`);
  }

  const invoices = (await response.json()) as Pick<InvoiceRecord, "id">[];
  return invoices[0]?.id ?? null;
}

export async function getInvoiceIdForLead(leadId: string) {
  assertUuid(leadId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  return getExistingInvoiceForLead(config, leadId);
}

type CreateInvoiceFromLeadOptions = {
  invoiceCreatedAt?: string;
  invoiceCreatedTime?: string;
};

export async function createInvoiceFromLead(
  leadId: string,
  options: CreateInvoiceFromLeadOptions = {},
) {
  assertUuid(leadId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const existingInvoiceId = await getExistingInvoiceForLead(config, leadId);

  if (existingInvoiceId) {
    return existingInvoiceId;
  }

  const lead = await getLeadById(config, leadId);

  if (!lead) {
    throw new Error("Lead not found.");
  }

  const promoCode = normalizePromoCode(lead.promo_code);
  const manualInvoiceCreatedAt = toManualRecordTimestamp(
    options.invoiceCreatedAt,
    options.invoiceCreatedTime,
  );
  const discountAmount = getPromoDiscountAmount(promoCode);
  const subtotal = toMoney(lead.estimated_price);
  const tax = 0;
  const total = calculateInvoiceTotal(subtotal, discountAmount, tax);

  const invoiceResponse = await fetch(getTableUrl(config, config.invoicesTable), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      ...(manualInvoiceCreatedAt ? { created_at: manualInvoiceCreatedAt } : {}),
      lead_id: lead.id,
      invoice_number: createInvoiceNumber(manualInvoiceCreatedAt),
      status: "draft" satisfies InvoiceStatus,
      customer_name: lead.name,
      customer_phone: lead.phone,
      customer_email: lead.email,
      service_address: lead.service_address,
      appliance: lead.appliance,
      service_date: lead.scheduled_date ?? lead.preferred_date,
      assigned_technician: lead.assigned_technician ?? null,
      notes: lead.admin_notes ?? null,
      promo_code: promoCode,
      discount_amount: discountAmount,
      subtotal,
      tax,
      total,
    }),
  });

  if (!invoiceResponse.ok) {
    const details = await invoiceResponse.text();
    throw new Error(`Supabase invoice insert failed: ${invoiceResponse.status} ${details}`);
  }

  const invoices = (await invoiceResponse.json()) as InvoiceRecord[];
  const invoice = invoices[0];

  if (!invoice) {
    throw new Error("Supabase invoice insert returned no invoice.");
  }

  const itemResponse = await fetch(getTableUrl(config, config.invoiceItemsTable), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      invoice_id: invoice.id,
      description: getServiceDescription(lead),
      quantity: 1,
      unit_price: subtotal,
      line_total: subtotal,
    }),
  });

  if (!itemResponse.ok) {
    const details = await itemResponse.text();
    throw new Error(`Supabase invoice item insert failed: ${itemResponse.status} ${details}`);
  }

  await updateSupabaseLeadStatus(lead.id, "invoiced");

  return invoice.id;
}

export async function createManualInvoice(input: ManualLeadInput) {
  const leadId = await createManualSupabaseLead(input);
  const invoiceId = await createInvoiceFromLead(leadId, {
    invoiceCreatedAt: input.invoiceCreatedAt,
    invoiceCreatedTime: input.invoiceCreatedTime,
  });

  return { leadId, invoiceId };
}

async function getInvoiceLeadId(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  invoiceId: string,
) {
  const params = new URLSearchParams({
    select: "lead_id",
    id: `eq.${invoiceId}`,
    limit: "1",
  });

  const response = await fetch(
    `${getTableUrl(config, config.invoicesTable)}?${params.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice lead fetch failed: ${response.status} ${details}`);
  }

  const invoices = (await response.json()) as Pick<InvoiceRecord, "lead_id">[];
  return invoices[0]?.lead_id ?? null;
}

async function assertInvoiceLineItemsEditable(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  invoiceId: string,
) {
  const params = new URLSearchParams({
    select: "status",
    id: `eq.${invoiceId}`,
    limit: "1",
  });

  const response = await fetch(
    `${getTableUrl(config, config.invoicesTable)}?${params.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice status fetch failed: ${response.status} ${details}`);
  }

  const invoices = (await response.json()) as Pick<InvoiceRecord, "status">[];
  const status = invoices[0]?.status;

  if (!status) {
    throw new Error("Invoice not found.");
  }

  if (status === "paid" || status === "void") {
    throw new Error("Closed invoices cannot have line items changed.");
  }
}

export async function getLeadIdForInvoice(invoiceId: string) {
  assertUuid(invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  return getInvoiceLeadId(config, invoiceId);
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  assertUuid(id);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const leadId = await getInvoiceLeadId(config, id);

  const response = await fetch(`${getTableUrl(config, config.invoicesTable)}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status,
      paid_date: status === "paid" ? new Date().toISOString().slice(0, 10) : null,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice status update failed: ${response.status} ${details}`);
  }

  if (leadId) {
    const leadStatus = status === "paid" ? "completed" : status === "void" ? "cancelled" : "invoiced";
    await updateSupabaseLeadStatus(leadId, leadStatus);
  }

  return { leadId };
}

function normalizeScheduleDate(value?: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    throw new Error("Service date must be a valid date.");
  }

  return trimmedValue;
}

function normalizeScheduleTime(value?: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (!/^\d{2}:\d{2}$/.test(trimmedValue)) {
    throw new Error("Service time must be a valid time.");
  }

  return trimmedValue;
}

function normalizeScheduleText(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue || null;
}

const ALLOWED_JOB_STATUSES: InvoiceJobStatus[] = [
  "scheduled",
  "on_the_way",
  "in_progress",
  "need_parts",
  "done",
  "reschedule",
  "canceled",
];

function normalizeJobStatus(value?: InvoiceJobStatus | string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (!ALLOWED_JOB_STATUSES.includes(trimmedValue as InvoiceJobStatus)) {
    throw new Error("Invalid job status.");
  }

  return trimmedValue as InvoiceJobStatus;
}

export async function updateInvoiceSchedule(id: string, input: InvoiceScheduleInput) {
  assertUuid(id);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const leadId = await getInvoiceLeadId(config, id);
  const serviceDate = normalizeScheduleDate(input.serviceDate);
  const serviceTime = normalizeScheduleTime(input.serviceTime);
  const updatePayload: {
    service_date: string | null;
    service_time: string | null;
    service_window: string | null;
    assigned_technician: string | null;
    job_status?: InvoiceJobStatus | null;
  } = {
    service_date: serviceDate,
    service_time: serviceTime,
    service_window: normalizeScheduleText(input.serviceWindow),
    assigned_technician: normalizeScheduleText(input.assignedTechnician),
  };

  if (input.jobStatus !== undefined) {
    updatePayload.job_status = normalizeJobStatus(input.jobStatus);
  }

  const response = await fetch(`${getTableUrl(config, config.invoicesTable)}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(updatePayload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice schedule update failed: ${response.status} ${details}`);
  }

  return { leadId };
}

export async function updateInvoiceJobStatus(id: string, jobStatus: InvoiceJobStatus) {
  assertUuid(id);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const normalizedJobStatus = normalizeJobStatus(jobStatus);

  if (!normalizedJobStatus) {
    throw new Error("Job status is required.");
  }

  const leadId = await getInvoiceLeadId(config, id);
  const response = await fetch(`${getTableUrl(config, config.invoicesTable)}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      job_status: normalizedJobStatus,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice job status update failed: ${response.status} ${details}`);
  }

  return { leadId };
}

export async function updateInvoiceNotes(id: string, notes: string) {
  assertUuid(id);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const leadId = await getInvoiceLeadId(config, id);
  const response = await fetch(`${getTableUrl(config, config.invoicesTable)}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      notes: notes.trim() || null,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice notes update failed: ${response.status} ${details}`);
  }

  return { leadId };
}

async function getInvoicePaymentState(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  invoiceId: string,
) {
  const invoiceParams = new URLSearchParams({
    select: "id,lead_id,status,total",
    id: `eq.${invoiceId}`,
    limit: "1",
  });

  const invoiceResponse = await fetch(
    `${getTableUrl(config, config.invoicesTable)}?${invoiceParams.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!invoiceResponse.ok) {
    const details = await invoiceResponse.text();
    throw new Error(`Supabase invoice payment state fetch failed: ${invoiceResponse.status} ${details}`);
  }

  const invoices = (await invoiceResponse.json()) as Pick<
    InvoiceRecord,
    "id" | "lead_id" | "status" | "total"
  >[];
  const invoice = invoices[0];

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const paymentParams = new URLSearchParams({
    select: "amount",
    invoice_id: `eq.${invoiceId}`,
  });

  const paymentResponse = await fetch(
    `${getTableUrl(config, config.invoicePaymentsTable)}?${paymentParams.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!paymentResponse.ok) {
    const details = await paymentResponse.text();
    throw new Error(`Supabase invoice payment total fetch failed: ${paymentResponse.status} ${details}`);
  }

  const payments = (await paymentResponse.json()) as Pick<InvoicePaymentRecord, "amount">[];
  const paidAmount = toMoney(payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0));
  const amountDue = toMoney(Math.max(0, Number(invoice.total ?? 0) - paidAmount));

  return { invoice, paidAmount, amountDue };
}

async function reconcileInvoicePaymentStatus(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  invoiceId: string,
) {
  const { invoice, amountDue } = await getInvoicePaymentState(config, invoiceId);

  if (invoice.status === "void") {
    return { leadId: invoice.lead_id, paidAmount: Number(invoice.total ?? 0) - amountDue, amountDue };
  }

  if (amountDue <= 0 && invoice.status !== "paid") {
    return updateInvoiceStatus(invoiceId, "paid");
  }

  if (amountDue > 0 && invoice.status === "paid") {
    return updateInvoiceStatus(invoiceId, "sent");
  }

  return { leadId: invoice.lead_id, paidAmount: Number(invoice.total ?? 0) - amountDue, amountDue };
}

export async function addInvoicePayment(invoiceId: string, input: InvoicePaymentInput) {
  assertUuid(invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const amount = toMoney(input.amount);
  const method = input.method.trim().toLowerCase();
  const note = input.note?.trim() || null;
  const paymentDate = toCharlottePaymentTimestamp(input.paymentDate, input.paymentTime);

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than 0.");
  }

  if (!method) {
    throw new Error("Payment method is required.");
  }

  const response = await fetch(getTableUrl(config, config.invoicePaymentsTable), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      invoice_id: invoiceId,
      payment_date: paymentDate,
      amount,
      method,
      note,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice payment insert failed: ${response.status} ${details}`);
  }

  const payments = (await response.json()) as Pick<InvoicePaymentRecord, "id">[];
  const paymentId = payments[0]?.id ?? null;
  const paymentState = await reconcileInvoicePaymentStatus(config, invoiceId);

  return { ...paymentState, paymentId };
}

export async function deleteInvoicePayment(invoiceId: string, paymentId: string) {
  assertUuid(invoiceId);
  assertUuid(paymentId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(
    `${getTableUrl(config, config.invoicePaymentsTable)}?id=eq.${paymentId}&invoice_id=eq.${invoiceId}`,
    {
      method: "DELETE",
      headers: {
        ...headers(config),
        Prefer: "return=minimal",
      },
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice payment delete failed: ${response.status} ${details}`);
  }

  return reconcileInvoicePaymentStatus(config, invoiceId);
}

async function updateInvoiceTotals(
  config: NonNullable<ReturnType<typeof getSupabaseConfig>>,
  invoiceId: string,
) {
  const params = new URLSearchParams({
    select: "line_total",
    invoice_id: `eq.${invoiceId}`,
  });

  const response = await fetch(`${getTableUrl(config, config.invoiceItemsTable)}?${params}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice total fetch failed: ${response.status} ${details}`);
  }

  const items = (await response.json()) as Pick<InvoiceItemRecord, "line_total">[];
  const subtotal = toMoney(items.reduce((sum, item) => sum + Number(item.line_total ?? 0), 0));
  const tax = 0;
  const invoiceParams = new URLSearchParams({
    select: "discount_amount",
    id: `eq.${invoiceId}`,
    limit: "1",
  });

  const invoiceResponse = await fetch(
    `${getTableUrl(config, config.invoicesTable)}?${invoiceParams.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!invoiceResponse.ok) {
    const details = await invoiceResponse.text();
    throw new Error(`Supabase invoice discount fetch failed: ${invoiceResponse.status} ${details}`);
  }

  const invoices = (await invoiceResponse.json()) as Pick<InvoiceRecord, "discount_amount">[];
  const discountAmount = toMoney(invoices[0]?.discount_amount);
  const total = calculateInvoiceTotal(subtotal, discountAmount, tax);

  const updateResponse = await fetch(`${getTableUrl(config, config.invoicesTable)}?id=eq.${invoiceId}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ subtotal, tax, total }),
  });

  if (!updateResponse.ok) {
    const details = await updateResponse.text();
    throw new Error(`Supabase invoice total update failed: ${updateResponse.status} ${details}`);
  }

  await reconcileInvoicePaymentStatus(config, invoiceId);
}

export async function updateInvoiceItems(invoiceId: string, items: InvoiceItemInput[]) {
  assertUuid(invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  await assertInvoiceLineItemsEditable(config, invoiceId);

  for (const item of items) {
    if (!item.id) {
      continue;
    }

    assertUuid(item.id);

    const description = item.description.trim();
    const quantity = toQuantity(item.quantity);
    const unitPrice = toMoney(item.unitPrice);
    const lineTotal = toMoney(quantity * unitPrice);

    if (!description) {
      throw new Error("Invoice item description is required.");
    }

    const response = await fetch(
      `${getTableUrl(config, config.invoiceItemsTable)}?id=eq.${item.id}&invoice_id=eq.${invoiceId}`,
      {
        method: "PATCH",
        headers: {
          ...headers(config),
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          description,
          quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        }),
      },
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Supabase invoice item update failed: ${response.status} ${details}`);
    }
  }

  await updateInvoiceTotals(config, invoiceId);
}

export async function addInvoiceItem(invoiceId: string) {
  assertUuid(invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  await assertInvoiceLineItemsEditable(config, invoiceId);

  const response = await fetch(getTableUrl(config, config.invoiceItemsTable), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      invoice_id: invoiceId,
      description: "Additional service",
      quantity: 1,
      unit_price: 0,
      line_total: 0,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice item insert failed: ${response.status} ${details}`);
  }

  await updateInvoiceTotals(config, invoiceId);
}

export async function addInvoiceItemFromTemplate(
  invoiceId: string,
  templateKey: InvoiceItemTemplateKey | string,
) {
  assertUuid(invoiceId);

  const template = getInvoiceItemTemplate(templateKey);

  if (!template) {
    throw new Error("Invalid invoice item template.");
  }

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  await assertInvoiceLineItemsEditable(config, invoiceId);

  const quantity = toQuantity(template.quantity);
  const unitPrice = toMoney(template.unitPrice);
  const lineTotal = toMoney(quantity * unitPrice);

  const response = await fetch(getTableUrl(config, config.invoiceItemsTable), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      invoice_id: invoiceId,
      description: template.description,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice template item insert failed: ${response.status} ${details}`);
  }

  await updateInvoiceTotals(config, invoiceId);
}

export async function applyServiceCallDiscount(invoiceId: string) {
  assertUuid(invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  await assertInvoiceLineItemsEditable(config, invoiceId);

  const invoiceParams = new URLSearchParams({
    select: "discount_amount,promo_code",
    id: `eq.${invoiceId}`,
    limit: "1",
  });

  const invoiceResponse = await fetch(
    `${getTableUrl(config, config.invoicesTable)}?${invoiceParams.toString()}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!invoiceResponse.ok) {
    const details = await invoiceResponse.text();
    throw new Error(`Supabase invoice discount fetch failed: ${invoiceResponse.status} ${details}`);
  }

  const invoices = (await invoiceResponse.json()) as Pick<
    InvoiceRecord,
    "discount_amount" | "promo_code"
  >[];
  const invoice = invoices[0];

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const promoCode = addDiscountCode(invoice.promo_code, SERVICE_CALL_DISCOUNT_CODE);
  const hasServiceCallDiscount = promoCode
    ?.split("+")
    .map((item) => normalizePromoCode(item))
    .includes(SERVICE_CALL_DISCOUNT_CODE);
  const previousHadServiceCallDiscount = (invoice.promo_code ?? "")
    .split("+")
    .map((item) => normalizePromoCode(item))
    .includes(SERVICE_CALL_DISCOUNT_CODE);
  const discountAmount = previousHadServiceCallDiscount
    ? toMoney(invoice.discount_amount)
    : toMoney(Number(invoice.discount_amount ?? 0) + SERVICE_CALL_DISCOUNT_AMOUNT);

  if (!hasServiceCallDiscount) {
    throw new Error("Could not apply service call discount.");
  }

  const updateResponse = await fetch(`${getTableUrl(config, config.invoicesTable)}?id=eq.${invoiceId}`, {
    method: "PATCH",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      promo_code: promoCode,
      discount_amount: discountAmount,
    }),
  });

  if (!updateResponse.ok) {
    const details = await updateResponse.text();
    throw new Error(`Supabase invoice discount update failed: ${updateResponse.status} ${details}`);
  }

  await updateInvoiceTotals(config, invoiceId);
}

export async function deleteInvoiceItem(invoiceId: string, itemId: string) {
  assertUuid(invoiceId);
  assertUuid(itemId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  await assertInvoiceLineItemsEditable(config, invoiceId);

  const response = await fetch(
    `${getTableUrl(config, config.invoiceItemsTable)}?id=eq.${itemId}&invoice_id=eq.${invoiceId}`,
    {
      method: "DELETE",
      headers: {
        ...headers(config),
        Prefer: "return=minimal",
      },
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice item delete failed: ${response.status} ${details}`);
  }

  await updateInvoiceTotals(config, invoiceId);
}

export async function deleteInvoiceById(invoiceId: string) {
  assertUuid(invoiceId);

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${getTableUrl(config, config.invoicesTable)}?id=eq.${invoiceId}`, {
    method: "DELETE",
    headers: {
      ...headers(config),
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice delete failed: ${response.status} ${details}`);
  }
}
