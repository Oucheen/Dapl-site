import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sendSmsOptInConfirmation } from "@/lib/customer-sms";
import { createLeadActivity } from "@/lib/supabase-activity";
import { saveLeadToSupabase } from "@/lib/supabase-leads";

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
  preferredWindow: 40,
};

function validatePreferredDate(s: string): { ok: true; iso: string; label: string } | { ok: false } {
  if (!s) return { ok: true, iso: "", label: "" };
  if (s.length > MAX.preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: false };
  }
  const [y, mo, da] = s.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, mo - 1, da));
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== mo - 1 ||
    parsed.getUTCDate() !== da
  ) {
    return { ok: false };
  }
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const inputUtc = Date.UTC(y, mo - 1, da);
  if (inputUtc < todayUtc) {
    return { ok: false };
  }
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
  return { ok: true, iso: s, label };
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildInquiryHtml(input: {
  name: string;
  phone: string;
  email: string;
  address: string;
  appliance: string;
  promoCode: string;
  leadSource: string;
  preferredIso: string;
  preferredLabel: string;
  message: string;
}) {
  const {
    name,
    phone,
    email,
    address,
    appliance,
    promoCode,
    leadSource,
    preferredIso,
    preferredLabel,
    message,
  } = input;

  return `
    <h2>New website inquiry</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Address:</strong> ${escapeHtml(address)}</p>
    ${leadSource ? `<p><strong>Lead source:</strong> ${escapeHtml(leadSource)}</p>` : ""}
    ${appliance ? `<p><strong>Appliance:</strong> ${escapeHtml(appliance)}</p>` : ""}
    ${promoCode ? `<p><strong>Promo code:</strong> ${escapeHtml(promoCode)}</p>` : ""}
    ${
      preferredIso
        ? `<p><strong>Preferred service date:</strong> ${escapeHtml(preferredLabel)} (${escapeHtml(preferredIso)})</p>`
        : ""
    }
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
  `;
}

function buildTelegramMessage(input: {
  name: string;
  phone: string;
  email: string;
  address: string;
  appliance: string;
  promoCode: string;
  leadSource: string;
  preferredIso: string;
  preferredLabel: string;
  message: string;
}) {
  const lines = [
    "New website inquiry",
    `Name: ${input.name}`,
    `Phone: ${input.phone}`,
    `Email: ${input.email}`,
    `Address: ${input.address}`,
    input.leadSource ? `Lead source: ${input.leadSource}` : "",
    input.appliance ? `Appliance: ${input.appliance}` : "",
    input.promoCode ? `Promo code: ${input.promoCode}` : "",
    input.preferredIso
      ? `Preferred date: ${input.preferredLabel} (${input.preferredIso})`
      : "",
    "",
    "Message:",
    input.message,
  ];

  return lines.filter(Boolean).join("\n");
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

function getAdminLeadsSearchUrl(request: Request, query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return `${getRequestOrigin(request)}/admin/leads`;
  }

  const params = new URLSearchParams({ q: trimmedQuery, view: "all" });
  return `${getRequestOrigin(request)}/admin/leads?${params.toString()}`;
}

async function sendEmailNotification(input: {
  apiKey: string;
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  html: string;
}) {
  const resend = new Resend(input.apiKey);
  const { error } = await resend.emails.send({
    from: input.from,
    to: [input.to],
    replyTo: input.replyTo,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    throw error;
  }
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;

  // Honeypot: bots often fill hidden fields
  const trap = typeof data.company === "string" ? data.company.trim() : "";
  if (trap.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const address = typeof data.address === "string" ? data.address.trim() : "";
  const appliance = typeof data.appliance === "string" ? data.appliance.trim() : "";
  const promoCode = typeof data.promoCode === "string" ? data.promoCode.trim() : "";
  const leadSource = typeof data.leadSource === "string" ? data.leadSource.trim() : "";
  const preferredDateRaw =
    typeof data.preferredDate === "string" ? data.preferredDate.trim() : "";
  const preferredWindow =
    typeof data.preferredWindow === "string" ? data.preferredWindow.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  const smsConsent = data.smsConsent === true;

  if (!name || name.length > MAX.name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!phone || phone.length > MAX.phone) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }
  if (!email || !isValidEmail(email) || email.length > MAX.email) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (!address || address.length > MAX.address) {
    return NextResponse.json({ error: "Please enter the service address." }, { status: 400 });
  }
  if (!message || message.length > MAX.message) {
    return NextResponse.json({ error: "Please describe the issue." }, { status: 400 });
  }
  if (appliance.length > MAX.appliance) {
    return NextResponse.json({ error: "Invalid appliance selection." }, { status: 400 });
  }
  if (promoCode.length > MAX.promoCode) {
    return NextResponse.json({ error: "Promo code is too long." }, { status: 400 });
  }
  if (leadSource.length > MAX.leadSource) {
    return NextResponse.json({ error: "Lead source is too long." }, { status: 400 });
  }
  if (preferredWindow.length > MAX.preferredWindow) {
    return NextResponse.json({ error: "Preferred time window is too long." }, { status: 400 });
  }

  const preferred = validatePreferredDate(preferredDateRaw);
  if (!preferred.ok) {
    return NextResponse.json(
      { error: "Please choose a valid preferred date (today or later), or leave it blank." },
      { status: 400 },
    );
  }

  const to = process.env.CONTACT_TO_EMAIL ?? "dapl.appliance.repair@gmail.com";
  const from =
    process.env.CONTACT_FROM_EMAIL ?? "DAPL Website <onboarding@resend.dev>";
  const apiKey = process.env.RESEND_API_KEY;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  const hasEmailChannel = Boolean(apiKey);
  const hasTelegramChannel = Boolean(telegramBotToken && telegramChatId);

  if (!hasEmailChannel && !hasTelegramChannel) {
    return NextResponse.json(
      {
        error:
          "Notifications are not configured yet. Add email or Telegram settings to your server environment.",
      },
      { status: 503 },
    );
  }

  const subject = `DAPL Website: ${name}`;
  const leadStorageResult = await saveLeadToSupabase({
    name,
    phone,
    email,
    address,
    appliance,
    promoCode,
    leadSource,
    preferredDate: preferred.iso,
    message,
  });

  if (!leadStorageResult.saved && !leadStorageResult.skipped) {
    console.error("Supabase lead storage error:", leadStorageResult.error);
  }

  if (!leadStorageResult.saved && leadStorageResult.skipped) {
    console.warn(
      "Supabase lead storage skipped: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
  }

  if (leadStorageResult.saved && leadStorageResult.id) {
    await createLeadActivity({
      leadId: leadStorageResult.id,
      eventType: "lead_received",
      title: "New lead received",
      details: leadSource ? `Submitted from ${leadSource}.` : "Submitted from the website.",
    });

    if (smsConsent) {
      const optInSmsResult = await sendSmsOptInConfirmation(phone);

      if (optInSmsResult.ok) {
        await createLeadActivity({
          leadId: leadStorageResult.id,
          eventType: "sms_opt_in_confirmation_sent",
          title: "SMS opt-in confirmation sent",
          details: `Sent to ${optInSmsResult.to}.`,
          metadata: { messageSid: optInSmsResult.messageSid },
        });
      } else {
        console.error("SMS opt-in confirmation failed:", optInSmsResult);
        await createLeadActivity({
          leadId: leadStorageResult.id,
          eventType: "sms_opt_in_confirmation_failed",
          title: "SMS opt-in confirmation failed",
          details:
            optInSmsResult.details ||
            `Could not send opt-in confirmation (${optInSmsResult.reason}).`,
          metadata: { reason: optInSmsResult.reason },
        });
      }
    }
  }

  const html = buildInquiryHtml({
    name,
    phone,
    email,
    address,
    appliance,
    promoCode,
    leadSource,
    preferredIso: preferred.iso,
    preferredLabel: preferred.label,
    message,
  });
  const adminLeadUrl = getAdminLeadUrl(
    request,
    leadStorageResult.saved ? leadStorageResult.id : undefined,
  );
  const adminLeadsFallbackUrl = getAdminLeadsSearchUrl(request, phone);
  const telegramText = buildTelegramMessage({
    name,
    phone,
    email,
    address,
    appliance,
    promoCode,
    leadSource,
    preferredIso: preferred.iso,
    preferredLabel: preferred.label,
    message,
  });

  let delivered = false;

  if (hasEmailChannel && apiKey) {
    try {
      await sendEmailNotification({
        apiKey,
        to,
        from,
        replyTo: email,
        subject,
        html,
      });
      delivered = true;
    } catch (error) {
      console.error("Resend error:", error);
    }
  }

  if (hasTelegramChannel && telegramBotToken && telegramChatId) {
    try {
      await sendTelegramNotification({
        botToken: telegramBotToken,
        chatId: telegramChatId,
        text: telegramText,
        buttons: [
          { text: "Open lead", url: adminLeadUrl || adminLeadsFallbackUrl },
        ],
      });
      delivered = true;
    } catch (error) {
      console.error("Telegram error:", error);
    }
  }

  if (!delivered) {
    return NextResponse.json(
      { error: "Could not send message. Please call or email us directly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
