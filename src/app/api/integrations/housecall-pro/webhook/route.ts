import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  findRecentLeadBySourceReference,
  saveLeadToSupabase,
} from "@/lib/supabase-leads";
import { buildUnifiedTelegramLeadMessage } from "@/lib/telegram-lead-message";

export const runtime = "nodejs";

const HCP_LEAD_SOURCE = "Housecall Pro";
const HCP_LEAD_EVENTS = new Set([
  "lead.created",
  "lead.updated",
  "lead.converted",
  "lead.deleted",
  "lead.lost",
]);

type JsonRecord = Record<string, unknown>;

function getWebhookSecret() {
  return process.env.HOUSECALL_PRO_WEBHOOK_SECRET?.trim() || "";
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function getText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = getText(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function getField(payload: JsonRecord, ...names: string[]) {
  const containers = [
    payload,
    asRecord(payload.data),
    asRecord(payload.lead),
    asRecord(asRecord(payload.data).lead),
    asRecord(payload.customer),
    asRecord(asRecord(payload.data).customer),
  ];

  for (const container of containers) {
    for (const name of names) {
      const matchingKey = Object.keys(container).find(
        (key) => key.toLowerCase() === name.toLowerCase(),
      );

      if (matchingKey) {
        const value = getText(container[matchingKey]);

        if (value) {
          return value;
        }
      }
    }
  }

  return "";
}

function getNestedField(container: JsonRecord, ...names: string[]) {
  for (const name of names) {
    const matchingKey = Object.keys(container).find(
      (key) => key.toLowerCase() === name.toLowerCase(),
    );

    if (matchingKey) {
      const value = getText(container[matchingKey]);

      if (value) {
        return value;
      }
    }
  }

  return "";
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("+")) {
    return digits;
  }

  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function getAddress(payload: JsonRecord) {
  const data = asRecord(payload.data);
  const lead = asRecord(data.lead ?? payload.lead);
  const customer = asRecord(lead.customer ?? data.customer ?? payload.customer);
  const address = asRecord(lead.address ?? data.address ?? customer.address ?? payload.address);
  const street = getNestedField(address, "street", "address", "line1", "addressLine1");
  const city = getNestedField(address, "city");
  const state = getNestedField(address, "state", "stateCode", "province");
  const postalCode = getNestedField(address, "zip", "zipCode", "postalCode", "postal_code");

  return [street, city, state, postalCode].filter(Boolean).join(", ");
}

function normalizeSignature(value: string) {
  return value.trim().replace(/^sha256=/i, "").replace(/^v1=/i, "");
}

function signaturesMatch(expected: string, actual: string) {
  const normalizedExpected = normalizeSignature(expected);
  const normalizedActual = normalizeSignature(actual);

  if (!normalizedExpected || !normalizedActual) {
    return false;
  }

  const expectedBuffer = Buffer.from(normalizedExpected, "utf8");
  const actualBuffer = Buffer.from(normalizedActual, "utf8");

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function isAuthorized(request: Request, rawBody: string) {
  const secret = getWebhookSecret();

  if (!secret) {
    return false;
  }

  const directSecret = request.headers.get("x-webhook-secret")?.trim() || "";
  const timestamp = request.headers.get("api-timestamp")?.trim() || "";
  const signature =
    request.headers.get("api-signature")?.trim() ||
    request.headers.get("x-housecall-pro-signature")?.trim() ||
    "";

  if (directSecret === secret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const signedValues = [
    rawBody,
    timestamp ? `${timestamp}.${rawBody}` : "",
    timestamp ? `${timestamp}${rawBody}` : "",
  ].filter(Boolean);

  return signedValues.some((value) => {
    const hexDigest = createHmac("sha256", secret).update(value).digest("hex");
    const base64Digest = createHmac("sha256", secret).update(value).digest("base64");
    return signaturesMatch(hexDigest, signature) || signaturesMatch(base64Digest, signature);
  });
}

function getRequestOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

async function sendTelegram(text: string, buttons: { text: string; url: string }[] = []) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || "";

  if (!botToken || !chatId) {
    return { sent: false, reason: "Telegram is not configured." };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...(buttons.length
        ? { reply_markup: { inline_keyboard: [buttons] } }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status} ${await response.text()}`);
  }

  return { sent: true, reason: "" };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Housecall Pro webhook",
    configured: {
      webhookSecret: Boolean(getWebhookSecret()),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    },
  });
}

export async function POST(request: Request) {
  if (!getWebhookSecret()) {
    return NextResponse.json(
      { error: "HOUSECALL_PRO_WEBHOOK_SECRET is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();

  if (!isAuthorized(request, rawBody)) {
    return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
  }

  let payload: JsonRecord;

  try {
    payload = asRecord(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!Object.keys(payload).length) {
    return NextResponse.json({ error: "Webhook payload is empty." }, { status: 400 });
  }

  const event = getField(payload, "event", "eventType", "event_type", "type") || "lead.created";
  const eventName = event.toLowerCase();

  if (!HCP_LEAD_EVENTS.has(eventName)) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const data = asRecord(payload.data);
  const lead = asRecord(data.lead ?? payload.lead);
  const customer = asRecord(lead.customer ?? data.customer ?? payload.customer);
  const customerName = firstText(
    getNestedField(customer, "name", "fullName", "full_name"),
    [
      getNestedField(customer, "firstName", "first_name"),
      getNestedField(customer, "lastName", "last_name"),
    ]
      .filter(Boolean)
      .join(" "),
    getField(payload, "customerName", "customer_name", "name"),
    "Housecall Pro customer",
  );
  const phone = normalizePhone(
    firstText(
      getNestedField(customer, "phone", "mobileNumber", "mobile_number", "homeNumber", "workNumber"),
      getField(payload, "phone", "phoneNumber", "phone_number"),
    ),
  );
  const email = firstText(
    getNestedField(customer, "email", "emailAddress", "email_address"),
    getField(payload, "email", "emailAddress", "email_address"),
  );
  const category = firstText(
    getNestedField(lead, "jobType", "job_type", "serviceType", "service_type", "leadType", "lead_type", "category", "appliance", "service"),
    getField(payload, "jobType", "job_type", "serviceType", "service_type", "leadType", "lead_type", "category", "appliance", "service"),
  );
  const sourceDetail = getField(payload, "leadSource", "lead_source", "marketingSource", "marketing_source", "source");
  const externalId = firstText(
    getField(payload, "id", "leadId", "lead_id", "resourceId", "resource_id"),
    getNestedField(data, "id", "leadId", "lead_id"),
    getNestedField(lead, "id", "leadId", "lead_id", "resourceId", "resource_id"),
  );
  const createdAt = getField(payload, "createdAt", "created_at", "timestamp", "date");
  const status = firstText(getField(payload, "status"), eventName);
  const address = getAddress(payload);
  const notes = getField(payload, "notes", "description", "message", "customerMessage", "customer_message");
  const reference = externalId ? `HCP ID: ${externalId}` : phone ? `Phone: ${phone}` : "";
  const message = [
    `Source: ${HCP_LEAD_SOURCE}`,
    `Event: ${eventName}`,
    externalId ? `HCP ID: ${externalId}` : null,
    sourceDetail ? `Lead source: ${sourceDetail}` : null,
    notes ? `Notes: ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (reference) {
    const duplicate = await findRecentLeadBySourceReference({
      leadSource: HCP_LEAD_SOURCE,
      reference,
    });

    if (duplicate) {
      return NextResponse.json({ ok: true, duplicate: true, leadId: duplicate.id });
    }
  }

  let storedLeadId: string | null = null;

  if (phone) {
    const stored = await saveLeadToSupabase({
      name: customerName,
      phone,
      email,
      address: address || "Address pending - Housecall Pro lead",
      appliance: category,
      promoCode: "",
      leadSource: HCP_LEAD_SOURCE,
      preferredDate: "",
      message,
    });

    if (stored.saved) {
      storedLeadId = stored.id || null;
    } else if (!stored.skipped) {
      console.error("Housecall Pro lead storage error:", stored.error);
    }
  }

  if (storedLeadId) {
    await createLeadActivity({
      leadId: storedLeadId,
      eventType: `housecall_pro_${eventName.replace(/[^a-z0-9]+/g, "_")}`,
      title: "Housecall Pro lead received",
      details: message,
      metadata: {
        source: HCP_LEAD_SOURCE,
        event: eventName,
        externalId: externalId || null,
        rawFields: Object.keys(payload),
      },
    });
  }

  const telegram = await sendTelegram(
    buildUnifiedTelegramLeadMessage({
      source: HCP_LEAD_SOURCE,
      type: "Lead notification",
      name: customerName,
      phone,
      email,
      address,
      category,
      sourceDetail: sourceDetail || "Housecall Pro",
      externalId,
      status,
      callTime: createdAt,
      message: notes || "",
    }),
    storedLeadId
      ? [{ text: "Open lead", url: `${getRequestOrigin(request)}/admin/leads/${storedLeadId}` }]
      : [],
  );

  return NextResponse.json({
    ok: true,
    event: eventName,
    leadId: storedLeadId,
    telegramSent: telegram.sent,
    ...(telegram.sent ? {} : { warning: telegram.reason }),
  });
}
