import { randomUUID } from "crypto";

const DEFAULT_TECH_REPORT_BUCKET = "technician-report-photos";
const MAX_REPORT_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export type ReportPhotoUpload = {
  field: string;
  label: string;
  path: string;
  originalName: string;
  contentType: string;
  size: number;
};

function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

function getSupabaseStorageConfig() {
  const rawUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !serviceRoleKey) {
    return null;
  }

  return {
    url: normalizeSupabaseUrl(rawUrl),
    serviceRoleKey,
    bucket: process.env.SUPABASE_TECH_REPORT_BUCKET || DEFAULT_TECH_REPORT_BUCKET,
  };
}

function headers(config: NonNullable<ReturnType<typeof getSupabaseStorageConfig>>) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };
}

function getExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName && /^[a-z0-9]{2,6}$/.test(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/heic") {
    return "heic";
  }

  if (file.type === "image/heif") {
    return "heif";
  }

  return "jpg";
}

function getReportPhotoPath(input: {
  leadId: string;
  invoiceId: string;
  telegramUserId: string;
  field: string;
  file: File;
}) {
  const extension = getExtension(input.file);
  const safeField = input.field.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  return `${input.leadId}/${input.invoiceId}/${input.telegramUserId}/${Date.now()}-${safeField}-${randomUUID()}.${extension}`;
}

async function ensureBucket(config: NonNullable<ReturnType<typeof getSupabaseStorageConfig>>) {
  const response = await fetch(`${config.url}/storage/v1/bucket/${encodeURIComponent(config.bucket)}`, {
    headers: headers(config),
    cache: "no-store",
  });

  if (response.ok) {
    return;
  }

  if (response.status !== 404) {
    const details = await response.text();
    throw new Error(`Supabase storage bucket lookup failed: ${response.status} ${details}`);
  }

  const createResponse = await fetch(`${config.url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...headers(config),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: config.bucket,
      name: config.bucket,
      public: false,
    }),
  });

  if (!createResponse.ok && createResponse.status !== 409) {
    const details = await createResponse.text();
    throw new Error(`Supabase storage bucket create failed: ${createResponse.status} ${details}`);
  }
}

export function getReportPhotoFile(formData: FormData, field: string) {
  const value = formData.get(field);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

export async function uploadTechnicianReportPhoto(input: {
  leadId: string;
  invoiceId: string;
  telegramUserId: string;
  field: string;
  label: string;
  file: File;
}): Promise<ReportPhotoUpload> {
  const config = getSupabaseStorageConfig();

  if (!config) {
    throw new Error("Supabase storage is not configured.");
  }

  if (!ALLOWED_IMAGE_TYPES.has(input.file.type)) {
    throw new Error(`${input.label} must be a JPG, PNG, WebP, HEIC, or HEIF image.`);
  }

  if (input.file.size > MAX_REPORT_PHOTO_BYTES) {
    throw new Error(`${input.label} is too large. Maximum size is 8 MB.`);
  }

  await ensureBucket(config);

  const path = getReportPhotoPath(input);
  const response = await fetch(
    `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "POST",
      headers: {
        ...headers(config),
        "Content-Type": input.file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: Buffer.from(await input.file.arrayBuffer()),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase report photo upload failed: ${response.status} ${details}`);
  }

  return {
    field: input.field,
    label: input.label,
    path,
    originalName: input.file.name,
    contentType: input.file.type,
    size: input.file.size,
  };
}

export async function fetchTechnicianReportPhoto(path: string) {
  const config = getSupabaseStorageConfig();

  if (!config || !path || path.includes("..")) {
    return null;
  }

  const response = await fetch(
    `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      headers: headers(config),
      cache: "no-store",
    },
  );

  if (!response.ok || !response.body) {
    return null;
  }

  return response;
}
