import { NextResponse } from "next/server";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  findRecentLeadBySourceReference,
  saveLeadToSupabase,
} from "@/lib/supabase-leads";
import { buildUnifiedTelegramLeadMessage } from "@/lib/telegram-lead-message";

export const runtime = "nodejs";

const ELOCAL_FORWARD_NUMBER = "+19803936588";
const ELOCAL_LEAD_SOURCE = "eLocal";

type JsonRecord = Record<string, unknown>;

function getWebhookSecret() {
  return process.env.ELOCAL_WEBHOOK_SECRET?.trim() || "";
}

function isAuthorized(request: Request) {
  const expectedSecret = getWebhookSecret();

  if (!expectedSecret) {
    return false;
  }

  const directSecret =
    request.headers.get("x-webhook-secret")?.trim() ||
    request.headers.get("x-elocal-webhook-secret")?.trim() ||
    "";
  const authorization = request.headers.get("authorization")?.trim() || "";
  const bearerSecret = authorization.replace(/^Bearer\s+/i, "").trim();

  return directSecret === expectedSecret || bearerSecret === expectedSecret;
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
    asRecord(payload.call),
    asRecord(payload.event),
  ];

  for (const container of containers) {
    for (const name of names) {
      const exactValue = container[name];

      if (exactValue !== undefined && exactValue !== null) {
        const exactText = getText(exactValue);

        if (exactText) {
          return exactText;
        }
      }

      const matchingKey = Object.keys(container).find(
        (key) => key.toLowerCase() === name.toLowerCase(),
      );

      if (matchingKey) {
        const matchingText = getText(container[matchingKey]);

        if (matchingText) {
          return matchingText;
        }
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

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function buildLocation(city: string, state: string, postalCode: string) {
  return [city, state, postalCode].filter(Boolean).join(", ");
}

function buildLeadMessage(input: {
  status: string;
  callId: string;
  callDateTime: string;
  duration: string;
  cost: string;
  forwardNumber: string;
  location: string;
  category: string;
}) {
  return [
    `Source: ${ELOCAL_LEAD_SOURCE}`,
    `eLocal number: ${ELOCAL_FORWARD_NUMBER}`,
    input.status ? `Event status: ${input.status}` : null,
    input.callId ? `Call ID: ${input.callId}` : null,
    input.callDateTime ? `Call time: ${input.callDateTime}` : null,
    input.duration ? `Duration: ${input.duration}` : null,
    input.cost ? `Call cost: ${input.cost}` : null,
    input.forwardNumber ? `Forwarded to: ${input.forwardNumber}` : null,
    input.category ? `Category: ${input.category}` : null,
    input.location ? `Location: ${input.location}` : null,
  ]
    .filter(Boolean)
    .join("\n");
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
        ? {
            reply_markup: {
              inline_keyboard: [buttons],
            },
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${details}`);
  }

  return { sent: true, reason: "" };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "eLocal webhook",
    configured: {
      webhookSecret: Boolean(getWebhookSecret()),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    },
  });
}

export async function POST(request: Request) {
  if (!getWebhookSecret()) {
    return NextResponse.json({ error: "ELOCAL_WEBHOOK_SECRET is not configured." }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
  }

  const rawBody = await request.text();
  let payload: JsonRecord;

  try {
    payload = asRecord(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!Object.keys(payload).length) {
    return NextResponse.json({ error: "Webhook payload is empty." }, { status: 400 });
  }

  const callerName = firstText(
    getField(payload, "callerIdName", "callerName"),
    [getField(payload, "firstName"), getField(payload, "lastName")].filter(Boolean).join(" "),
    "eLocal caller",
  );
  const phone = normalizePhone(getField(payload, "callerId", "callerPhone", "phone"));
  const callId = getField(payload, "callRefNumber", "callId", "id");
  const callDateTime = getField(payload, "callDateTime", "createdAt", "created_at");
  const status = getField(payload, "supplyEventStatus", "status");
  const duration = getField(payload, "callDuration", "duration");
  const cost = getField(payload, "callCost", "cost", "price");
  const forwardNumber = getField(payload, "forwardNumber");
  const city = getField(payload, "city");
  const state = getField(payload, "stateOrProvince", "state");
  const postalCode = getField(payload, "postalCode", "zipCode", "zip_code");
  const category = getField(payload, "categoryName", "category", "service");
  const recordingUrl = safeUrl(getField(payload, "callRecording", "recordingUrl", "recording_url"));
  const location = buildLocation(city, state, postalCode);
  const reference = callId ? `Call ID: ${callId}` : phone ? `Phone: ${phone}` : "";
  const message = buildLeadMessage({
    status,
    callId,
    callDateTime,
    duration,
    cost,
    forwardNumber,
    location,
    category,
  });

  if (reference) {
    const duplicate = await findRecentLeadBySourceReference({
      leadSource: ELOCAL_LEAD_SOURCE,
      reference,
    });

    if (duplicate) {
      return NextResponse.json({ ok: true, duplicate: true, leadId: duplicate.id });
    }
  }

  let storedLeadId: string | null = null;

  if (phone) {
    const stored = await saveLeadToSupabase({
      name: callerName,
      phone,
      email: "",
      address: location || "Address pending - eLocal call",
      appliance: category,
      promoCode: "",
      leadSource: ELOCAL_LEAD_SOURCE,
      preferredDate: "",
      message,
    });

    if (stored.saved) {
      storedLeadId = stored.id || null;
    } else if (!stored.skipped) {
      console.error("eLocal lead storage error:", stored.error);
    }
  }

  if (storedLeadId) {
    await createLeadActivity({
      leadId: storedLeadId,
      eventType: "elocal_call_received",
      title: "eLocal call received",
      details: message,
      metadata: {
        source: ELOCAL_LEAD_SOURCE,
        forwardNumber: ELOCAL_FORWARD_NUMBER,
        callId: callId || null,
        recordingUrl: recordingUrl || null,
        rawFields: Object.keys(payload),
      },
    });
  }

  const telegram = await sendTelegram(
    buildUnifiedTelegramLeadMessage({
      source: ELOCAL_LEAD_SOURCE,
      type: "Phone call",
      name: callerName,
      phone,
      category,
      sourceDetail: `eLocal number ${ELOCAL_FORWARD_NUMBER}`,
      status,
      callId,
      callTime: callDateTime,
      duration,
      cost,
      forwardNumber,
      recordingUrl,
      message: location ? `Location: ${location}` : "",
    }),
    storedLeadId
      ? [{ text: "Open lead", url: `${getRequestOrigin(request)}/admin/leads/${storedLeadId}` }]
      : [],
  );

  return NextResponse.json({
    ok: true,
    leadId: storedLeadId,
    telegramSent: telegram.sent,
    ...(telegram.sent ? {} : { warning: telegram.reason }),
  });
}
