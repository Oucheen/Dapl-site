import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createLeadActivity } from "@/lib/supabase-activity";
import { findRecentVoiceLeadDuplicate, saveLeadToSupabase } from "@/lib/supabase-leads";

const MAX = {
  name: 120,
  phone: 40,
  email: 254,
  address: 300,
  message: 4000,
  appliance: 80,
  promoCode: 40,
  leadSource: 120,
  preferredDate: 10,
  provider: 80,
  callId: 160,
  transcript: 8000,
};

type VoiceLeadPayload = Record<string, unknown>;

function objectValue(data: VoiceLeadPayload, key: string) {
  const value = data[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as VoiceLeadPayload)
    : null;
}

function getPayloadData(body: VoiceLeadPayload) {
  return objectValue(body, "args") || objectValue(body, "arguments") || body;
}

function text(data: VoiceLeadPayload, key: string, max = 1000) {
  const value = data[key];

  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, max);
}

function flexibleText(value: unknown, max = 1000) {
  if (typeof value === "string") {
    return value.trim().slice(0, max);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim().slice(0, max);
  }

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value).slice(0, max);
    } catch {
      return "";
    }
  }

  return "";
}

function firstText(max: number, ...values: unknown[]) {
  for (const value of values) {
    const result = flexibleText(value, max);

    if (result) {
      return result;
    }
  }

  return "";
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() === "bearer" && token) {
    return token.trim();
  }

  return "";
}

function isAuthorized(request: Request) {
  const secret = process.env.VOICE_AGENT_API_KEY;

  if (!secret) {
    return false;
  }

  const token = getBearerToken(request) || request.headers.get("x-api-key")?.trim();
  return token === secret;
}

function verifyRetellSignature(rawBody: string, signature: string | null) {
  const apiKey = process.env.RETELL_API_KEY;

  if (!apiKey || !signature) {
    return false;
  }

  const match = signature.match(/v=(\d+),d=([a-f0-9]+)/i);

  if (!match) {
    return false;
  }

  const [, timestamp, digest] = match;
  const timestampMs = Number(timestamp);

  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", apiKey)
    .update(rawBody + timestamp)
    .digest();
  const provided = Buffer.from(digest, "hex");

  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

function isNativeRetellPayload(body: VoiceLeadPayload) {
  return typeof body.event === "string" && Boolean(objectValue(body, "call"));
}

function isRetellStylePayload(body: VoiceLeadPayload) {
  return typeof body.event === "string";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePreferredDate(value: string) {
  if (!value) {
    return true;
  }

  if (value.length > MAX.preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return false;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Date.UTC(year, month - 1, day) >= todayUtc;
}

function cleanOptionalEmail(value: string) {
  return value && isValidEmail(value) ? value : "";
}

function cleanOptionalPreferredDate(value: string) {
  return validatePreferredDate(value) ? value : "";
}

function fallbackEmail(phone: string) {
  const normalizedPhone = phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
  return `voice-${normalizedPhone || "caller"}@daplappliance.local`;
}

function buildVoiceMessage(input: {
  issue: string;
  callSummary: string;
  transcript: string;
  provider: string;
  callId: string;
}) {
  const sections = [
    input.issue,
    input.callSummary ? `Call summary:\n${input.callSummary}` : "",
    input.provider ? `Voice provider: ${input.provider}` : "",
    input.callId ? `Call ID: ${input.callId}` : "",
    input.transcript ? `Transcript:\n${input.transcript}` : "",
  ];

  return sections.filter(Boolean).join("\n\n").slice(0, MAX.message);
}

function getRequestOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function getAdminLeadUrl(request: Request, leadId: string | undefined) {
  if (!leadId) {
    return "";
  }

  return `${getRequestOrigin(request)}/admin/leads/${leadId}`;
}

function buildVoiceTelegramMessage(input: {
  name: string;
  phone: string;
  address: string;
  appliance: string;
  issue: string;
  callSummary: string;
  promoCode: string;
  preferredDate: string;
  provider: string;
  callId: string;
}) {
  const lines = [
    "New voice agent lead",
    `Name: ${input.name}`,
    `Phone: ${input.phone}`,
    `Address: ${input.address}`,
    input.appliance ? `Appliance: ${input.appliance}` : "",
    input.issue ? `Issue: ${input.issue}` : "",
    input.callSummary ? `Summary: ${input.callSummary}` : "",
    input.promoCode ? `Promo code: ${input.promoCode}` : "",
    input.preferredDate ? `Preferred date: ${input.preferredDate}` : "",
    input.provider ? `Provider: ${input.provider}` : "",
    input.callId ? `Call ID: ${input.callId}` : "",
  ];

  return lines.filter(Boolean).join("\n");
}

function normalizeRetellPayload(body: VoiceLeadPayload) {
  const call = objectValue(body, "call") || {};
  const analysis = objectValue(call, "call_analysis") || {};
  const custom =
    objectValue(analysis, "custom_analysis_data") ||
    objectValue(analysis, "custom") ||
    objectValue(call, "custom_analysis_data") ||
    {};
  const dynamicVariables = objectValue(call, "retell_llm_dynamic_variables") || {};
  const metadata = objectValue(call, "metadata") || {};
  const phone = firstText(
    MAX.phone,
    call.from_number,
    call.from,
    call.caller_number,
    custom.phone,
    custom.customer_phone,
    dynamicVariables.phone,
    metadata.phone,
  ) || "Unknown caller";
  const callSummary = firstText(
    MAX.message,
    analysis.call_summary,
    analysis.summary,
    custom.callSummary,
    custom.call_summary,
    custom.summary,
  );
  const transcript = firstText(
    MAX.transcript,
    call.transcript,
    call.transcript_with_tool_calls,
    call.transcript_object,
  );
  const issue = firstText(
    MAX.message,
    custom.issue,
    custom.problem,
    custom.service_issue,
    custom.repair_issue,
    callSummary,
    transcript,
    "Retell AI phone call received.",
  );

  return {
    name:
      firstText(
        MAX.name,
        custom.name,
        custom.customer_name,
        dynamicVariables.name,
        dynamicVariables.customer_name,
        metadata.name,
        metadata.customer_name,
      ) || `Voice caller ${phone || "unknown"}`.slice(0, MAX.name),
    phone,
    emailRaw: cleanOptionalEmail(
      firstText(MAX.email, custom.email, custom.customer_email, dynamicVariables.email),
    ),
    address:
      firstText(
        MAX.address,
        custom.address,
        custom.service_address,
        dynamicVariables.address,
        dynamicVariables.service_address,
        metadata.address,
      ) || "Address needed - Retell call",
    appliance: firstText(
      MAX.appliance,
      custom.appliance,
      custom.appliance_type,
      dynamicVariables.appliance,
      metadata.appliance,
    ),
    promoCode: firstText(MAX.promoCode, custom.promoCode, custom.promo_code),
    preferredDate: cleanOptionalPreferredDate(
      firstText(
        MAX.preferredDate,
        custom.preferredDate,
        custom.preferred_date,
        dynamicVariables.preferredDate,
      ),
    ),
    issue,
    callSummary,
    transcript,
    provider: "retell",
    callId: firstText(MAX.callId, call.call_id, call.id),
  };
}

async function sendTelegramNotification(input: {
  botToken: string;
  chatId: string;
  text: string;
  buttons?: { text: string; url: string }[];
}) {
  const buttons = input.buttons?.filter((button) => button.url.trim()) ?? [];
  const response = await fetch(
    `https://api.telegram.org/bot${input.botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: input.chatId,
        text: input.text,
        ...(buttons.length
          ? {
              reply_markup: {
                inline_keyboard: [buttons],
              },
            }
          : {}),
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Telegram error: ${response.status} ${details}`);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const payload = body as VoiceLeadPayload;
  const isRetellWebhook = isNativeRetellPayload(payload);
  const isRetellStyleWebhook = isRetellStylePayload(payload);
  const isLegacyAuthorized = isAuthorized(request);

  if (isRetellStyleWebhook) {
    const isRetellAuthorized = verifyRetellSignature(
      rawBody,
      request.headers.get("x-retell-signature"),
    );

    if (!isRetellAuthorized && !isLegacyAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRetellWebhook) {
      return NextResponse.json({ ok: true, ignored: payload.event });
    }

    if (payload.event !== "call_analyzed") {
      return NextResponse.json({ ok: true, ignored: payload.event });
    }
  } else if (!isLegacyAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = isRetellWebhook ? null : getPayloadData(payload);
  const normalized = isRetellWebhook ? normalizeRetellPayload(payload) : null;
  const name = normalized?.name ?? text(data || {}, "name", MAX.name);
  const phone = normalized?.phone ?? text(data || {}, "phone", MAX.phone);
  const emailRaw = normalized?.emailRaw ?? text(data || {}, "email", MAX.email);
  const address = normalized?.address ?? text(data || {}, "address", MAX.address);
  const appliance = normalized?.appliance ?? text(data || {}, "appliance", MAX.appliance);
  const promoCode = normalized?.promoCode ?? text(data || {}, "promoCode", MAX.promoCode);
  const preferredDate =
    normalized?.preferredDate ?? text(data || {}, "preferredDate", MAX.preferredDate);
  const issue = normalized?.issue ?? text(data || {}, "issue", MAX.message);
  const callSummary = normalized?.callSummary ?? text(data || {}, "callSummary", MAX.message);
  const transcript = normalized?.transcript ?? text(data || {}, "transcript", MAX.transcript);
  const provider = normalized?.provider ?? text(data || {}, "provider", MAX.provider);
  const callId = normalized?.callId ?? text(data || {}, "callId", MAX.callId);

  if (!name) {
    return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ error: "Customer phone is required." }, { status: 400 });
  }

  if (!address) {
    return NextResponse.json({ error: "Service address is required." }, { status: 400 });
  }

  if (!issue && !callSummary) {
    return NextResponse.json(
      { error: "Issue or callSummary is required." },
      { status: 400 },
    );
  }

  if (emailRaw && !isValidEmail(emailRaw)) {
    return NextResponse.json({ error: "Email is invalid." }, { status: 400 });
  }

  if (!validatePreferredDate(preferredDate)) {
    return NextResponse.json(
      { error: "preferredDate must use YYYY-MM-DD and cannot be in the past." },
      { status: 400 },
    );
  }

  const message = buildVoiceMessage({
    issue,
    callSummary,
    transcript,
    provider,
    callId,
  });

  const duplicateLead = await findRecentVoiceLeadDuplicate({
    phone,
    callId,
    windowMinutes: 15,
  });

  if (duplicateLead) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      leadId: duplicateLead.id,
    });
  }

  const leadStorageResult = await saveLeadToSupabase({
    name,
    phone,
    email: emailRaw || fallbackEmail(phone),
    address,
    appliance,
    promoCode,
    leadSource: "voice-agent",
    preferredDate,
    message,
  });

  if (!leadStorageResult.saved) {
    const error = leadStorageResult.skipped
      ? "Supabase is not configured."
      : "Could not save voice lead.";

    if (!leadStorageResult.skipped) {
      console.error("Voice lead storage error:", leadStorageResult.error);
    }

    return NextResponse.json({ error }, { status: 503 });
  }

  if (leadStorageResult.id) {
    await createLeadActivity({
      leadId: leadStorageResult.id,
      eventType: "voice_lead_received",
      title: "Voice agent lead received",
      details: provider
        ? `Created from a ${provider} phone call.`
        : "Created from a phone call handled by the voice agent.",
      metadata: {
        provider: provider || null,
        callId: callId || null,
        hasTranscript: Boolean(transcript),
      },
    });
  }

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (telegramBotToken && telegramChatId) {
    try {
      await sendTelegramNotification({
        botToken: telegramBotToken,
        chatId: telegramChatId,
        text: buildVoiceTelegramMessage({
          name,
          phone,
          address,
          appliance,
          issue,
          callSummary,
          promoCode,
          preferredDate,
          provider: provider || "retell",
          callId,
        }),
        buttons: [
          { text: "Open lead", url: getAdminLeadUrl(request, leadStorageResult.id) },
        ],
      });
    } catch (error) {
      console.error("Voice lead Telegram error:", error);
    }
  }

  return NextResponse.json({
    ok: true,
    leadId: leadStorageResult.id,
  });
}
