import { getTelegramUserByTechnicianName } from "@/lib/supabase-telegram-users";
import type { InvoiceRecord } from "@/lib/supabase-invoices";

const DEFAULT_SITE_URL = "https://www.daplappliance.com";

type InlineButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

function getTelegramTechnicianBotToken() {
  return process.env.TELEGRAM_TECH_BOT_TOKEN || "";
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_SITE_URL)
  ).replace(/\/+$/, "");
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/[^\d+]/g, "") ?? "";
}

function getMapsSearchUrl(address: string | null | undefined) {
  const normalizedAddress = address?.trim();
  return normalizedAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedAddress)}`
    : "";
}

function formatServiceTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const [hourValue, minuteValue] = value.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return value;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function shouldNotifyTechnicianJobAssigned(previousInvoice: InvoiceRecord | null | undefined, nextInvoice: InvoiceRecord) {
  const assignedTechnician = normalizeText(nextInvoice.assigned_technician);

  if (!assignedTechnician || nextInvoice.status === "void") {
    return false;
  }

  if (!previousInvoice) {
    return true;
  }

  return (
    normalizeText(previousInvoice.assigned_technician) !== assignedTechnician ||
    (previousInvoice.service_date ?? "") !== (nextInvoice.service_date ?? "") ||
    (previousInvoice.service_time ?? "") !== (nextInvoice.service_time ?? "") ||
    (previousInvoice.service_window ?? "") !== (nextInvoice.service_window ?? "")
  );
}

function buildJobNotificationMessage(invoice: InvoiceRecord) {
  const serviceLabel = [formatServiceTime(invoice.service_time), invoice.service_window].filter(Boolean).join(" / ");
  const phone = invoice.customer_phone || "";
  const phoneHref = normalizePhone(phone);

  return [
    `<b>New job assigned</b>`,
    `<b>${escapeHtml(invoice.customer_name)}</b>`,
    invoice.service_date ? `Date: ${escapeHtml(invoice.service_date)}` : "Date: not set",
    serviceLabel ? `Time: ${escapeHtml(serviceLabel)}` : "Time: not set",
    invoice.appliance ? `Appliance: ${escapeHtml(invoice.appliance)}` : null,
    invoice.service_address ? `Address: ${escapeHtml(invoice.service_address)}` : null,
    phone ? `Phone: ${phoneHref ? `<a href="tel:${escapeHtml(phoneHref)}">${escapeHtml(phone)}</a>` : escapeHtml(phone)}` : null,
    `Invoice: ${escapeHtml(invoice.invoice_number)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildJobNotificationButtons(invoice: InvoiceRecord) {
  const siteUrl = getSiteUrl();
  const mapsUrl = getMapsSearchUrl(invoice.service_address);
  const invoiceUrl = `${siteUrl}/admin/invoices/${invoice.id}`;
  const buttons: InlineButton[][] = [
    [
      ...(mapsUrl ? [{ text: "Maps", url: mapsUrl }] : []),
      { text: "Invoice", url: invoiceUrl },
    ],
    [
      { text: "On the way", callback_data: `job:way:${invoice.id}` },
      { text: "In progress", callback_data: `job:progress:${invoice.id}` },
    ],
  ];

  return { inline_keyboard: buttons.filter((row) => row.length) };
}

async function sendTelegram(input: {
  chatId: number | string;
  text: string;
  replyMarkup?: { inline_keyboard: InlineButton[][] };
}) {
  const botToken = getTelegramTechnicianBotToken();

  if (!botToken) {
    return { ok: false, reason: "bot_not_configured" as const };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: input.text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {}),
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: `telegram_${response.status}` as const };
  }

  return { ok: true, reason: "" as const };
}

export async function notifyTechnicianJobAssigned(invoice: InvoiceRecord) {
  const technicianName = invoice.assigned_technician?.trim();

  if (!technicianName || invoice.status === "void") {
    return { ok: false, reason: "missing_technician" as const };
  }

  const telegramUser = await getTelegramUserByTechnicianName(technicianName);

  if (!telegramUser.user) {
    return { ok: false, reason: telegramUser.ready ? "technician_not_found" : "telegram_users_not_ready" };
  }

  return sendTelegram({
    chatId: telegramUser.user.telegram_user_id,
    text: buildJobNotificationMessage(invoice),
    replyMarkup: buildJobNotificationButtons(invoice),
  });
}
