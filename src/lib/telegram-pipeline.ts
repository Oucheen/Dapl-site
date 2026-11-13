import type { LeadRecord, LeadAdminStatus } from "@/lib/supabase-leads";

const DEFAULT_SITE_URL = "https://www.daplappliance.com";

export type PipelineTelegramEvent = {
  source: "Housecall Pro" | "DAPL" | string;
  type: "new_lead" | "status_change" | "assignment" | "estimate" | "payment" | "sync" | "update";
  eventName?: string;
  lead?: Partial<LeadRecord> | null;
  leadId?: string | null;
  externalId?: string;
  previousStatus?: string;
  nextStatus?: string;
  status?: string;
  technician?: string;
  amount?: string | number;
  details?: string;
  url?: string;
};

function getConfig() {
  const botToken = process.env.TELEGRAM_PIPELINE_BOT_TOKEN?.trim() || "";
  const chatId = process.env.TELEGRAM_PIPELINE_CHAT_ID?.trim() || "";
  const threadId = process.env.TELEGRAM_PIPELINE_MESSAGE_THREAD_ID?.trim() || "";

  return { botToken, chatId, threadId };
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    DEFAULT_SITE_URL
  ).replace(/\/$/, "");
}

function text(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function addLine(lines: string[], label: string, value: unknown) {
  const normalized = text(value);

  if (normalized) {
    lines.push(`${label}: ${normalized}`);
  }
}

function statusLabel(value: unknown) {
  const normalized = text(value);

  if (!normalized) {
    return "";
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function eventHeading(input: PipelineTelegramEvent) {
  switch (input.type) {
    case "new_lead":
      return "🆕 NEW PIPELINE LEAD";
    case "status_change":
      return "🔄 PIPELINE STATUS CHANGED";
    case "assignment":
      return "👤 PIPELINE ASSIGNMENT UPDATED";
    case "estimate":
      return "🧾 PIPELINE ESTIMATE UPDATED";
    case "payment":
      return "💰 PIPELINE PAYMENT UPDATED";
    case "sync":
      return "🔁 PIPELINE SYNC EVENT";
    default:
      return "📌 PIPELINE UPDATED";
  }
}

export function buildPipelineTelegramMessage(input: PipelineTelegramEvent) {
  const lead = input.lead ?? {};
  const lines = [eventHeading(input), ""];

  addLine(lines, "Source", input.source);
  addLine(lines, "Customer", lead.name);
  addLine(lines, "Phone", lead.phone);
  addLine(lines, "Address", lead.service_address);
  addLine(lines, "Service", lead.appliance);
  addLine(lines, "Technician", input.technician || lead.assigned_technician);
  addLine(lines, "Amount", input.amount ?? lead.estimated_price);
  addLine(lines, "Previous status", statusLabel(input.previousStatus));
  addLine(lines, "New status", statusLabel(input.nextStatus || input.status));
  addLine(lines, "HCP event", input.eventName);
  addLine(lines, "HCP ID", input.externalId);

  if (input.details?.trim()) {
    lines.push("", input.details.trim());
  }

  return lines.join("\n").slice(0, 4090);
}

export async function sendPipelineTelegramMessage(
  input: PipelineTelegramEvent,
  buttons: { text: string; url: string }[] = [],
) {
  const { botToken, chatId, threadId } = getConfig();

  if (!botToken || !chatId) {
    return { sent: false, configured: false, reason: "Pipeline Telegram is not configured." };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildPipelineTelegramMessage(input),
      disable_web_page_preview: true,
      ...(threadId && /^\d+$/.test(threadId)
        ? { message_thread_id: Number(threadId) }
        : {}),
      ...(buttons.length
        ? { reply_markup: { inline_keyboard: [buttons] } }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Pipeline Telegram sendMessage failed: ${response.status} ${await response.text()}`,
    );
  }

  return { sent: true, configured: true, reason: "" };
}

export function getPipelineLeadUrl(leadId: string) {
  return `${getSiteUrl()}/admin/leads/${encodeURIComponent(leadId)}`;
}

export function getPipelineConfigStatus() {
  const { botToken, chatId } = getConfig();

  return {
    botToken: Boolean(botToken),
    chatId: Boolean(chatId),
  };
}

export function isLeadStatus(value: string): value is LeadAdminStatus {
  return ["new", "contacted", "confirmed", "invoiced", "completed", "cancelled"].includes(value);
}
