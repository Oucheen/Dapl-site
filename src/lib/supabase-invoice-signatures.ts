import { randomUUID } from "crypto";

export type InvoiceSignatureRecord = {
  id: string;
  invoice_id: string;
  created_at: string;
  signed_at: string;
  signer_name: string;
  signature_data_url: string;
  accepted_terms: boolean;
};

type SaveInvoiceSignatureInput = {
  invoiceId: string;
  signerName: string;
  signatureDataUrl: string;
  acceptedTerms: boolean;
};

const DEFAULT_SIGNATURES_TABLE = "invoice_signatures";
const MAX_SIGNATURE_DATA_URL_LENGTH = 500_000;

function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

function normalizeTableName(table: string) {
  const cleaned = table.trim().replace(/^\/+|\/+$/g, "");

  if (cleaned.startsWith("public.")) {
    return cleaned.slice("public.".length);
  }

  return cleaned || DEFAULT_SIGNATURES_TABLE;
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
      process.env.SUPABASE_INVOICE_SIGNATURES_TABLE || DEFAULT_SIGNATURES_TABLE,
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

function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function normalizeSignerName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");

  if (name.length < 2) {
    throw new Error("Customer name is required for the signature.");
  }

  return name.slice(0, 120);
}

function normalizeSignatureDataUrl(value: string) {
  const signature = value.trim();

  if (!signature.startsWith("data:image/png;base64,")) {
    throw new Error("Signature must be saved as a PNG image.");
  }

  if (signature.length > MAX_SIGNATURE_DATA_URL_LENGTH) {
    throw new Error("Signature image is too large.");
  }

  return signature;
}

export async function getLatestInvoiceSignature(invoiceId: string) {
  if (!isUuid(invoiceId)) {
    return null;
  }

  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const params = new URLSearchParams({
    select: "*",
    invoice_id: `eq.${invoiceId}`,
    order: "signed_at.desc,created_at.desc",
    limit: "1",
  });

  const response = await fetch(`${getTableUrl(config)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    console.error(`Supabase invoice signature fetch failed: ${response.status} ${details}`);
    return null;
  }

  const signatures = (await response.json()) as InvoiceSignatureRecord[];
  return signatures[0] ?? null;
}

export async function listLatestInvoiceSignatures(invoiceIds: string[]) {
  const uniqueInvoiceIds = [...new Set(invoiceIds.filter(isUuid))];
  const grouped = new Map<string, InvoiceSignatureRecord | null>(
    uniqueInvoiceIds.map((invoiceId) => [invoiceId, null]),
  );
  const config = getSupabaseConfig();

  if (!config || uniqueInvoiceIds.length === 0) {
    return grouped;
  }

  const params = new URLSearchParams({
    select: "*",
    invoice_id: `in.(${uniqueInvoiceIds.join(",")})`,
    order: "signed_at.desc,created_at.desc",
    limit: String(Math.min(500, uniqueInvoiceIds.length * 3)),
  });

  const response = await fetch(`${getTableUrl(config)}?${params.toString()}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    console.error(`Supabase invoice signatures fetch failed: ${response.status} ${details}`);
    return grouped;
  }

  const signatures = (await response.json()) as InvoiceSignatureRecord[];

  for (const signature of signatures) {
    if (grouped.get(signature.invoice_id)) {
      continue;
    }

    grouped.set(signature.invoice_id, signature);
  }

  return grouped;
}

export async function saveInvoiceSignature(input: SaveInvoiceSignatureInput) {
  if (!isUuid(input.invoiceId)) {
    throw new Error("Invalid invoice id.");
  }

  if (!input.acceptedTerms) {
    throw new Error("Terms must be accepted before signing.");
  }

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const signerName = normalizeSignerName(input.signerName);
  const signatureDataUrl = normalizeSignatureDataUrl(input.signatureDataUrl);
  const signedAt = new Date().toISOString();

  const response = await fetch(getTableUrl(config), {
    method: "POST",
    headers: {
      ...headers(config),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: randomUUID(),
      invoice_id: input.invoiceId,
      signed_at: signedAt,
      signer_name: signerName,
      signature_data_url: signatureDataUrl,
      accepted_terms: true,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase invoice signature insert failed: ${response.status} ${details}`);
  }

  const signatures = (await response.json()) as InvoiceSignatureRecord[];
  return signatures[0] ?? null;
}

export const invoiceSignaturesTableSql = `
create table if not exists public.invoice_signatures (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  created_at timestamptz not null default now(),
  signed_at timestamptz not null default now(),
  signer_name text not null,
  signature_data_url text not null,
  accepted_terms boolean not null default true
);

create index if not exists invoice_signatures_invoice_id_signed_at_idx
  on public.invoice_signatures (invoice_id, signed_at desc);

alter table public.invoice_signatures enable row level security;

grant select, insert, delete on public.invoice_signatures to service_role;
`;
