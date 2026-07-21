import { revalidatePath } from "next/cache";
import { createLeadActivity } from "@/lib/supabase-activity";
import { getTelegramUserByTelegramId } from "@/lib/supabase-telegram-users";
import {
  listInvoices,
  updateInvoiceJobStatus,
  type InvoiceJobStatus,
  type InvoiceRecord,
} from "@/lib/supabase-invoices";

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number;
  type: string;
};

type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type TelegramTechnician = {
  telegramUserId: string;
  technicianName: string;
  role: "technician" | "dispatcher" | "owner";
};

type InlineButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

const DEFAULT_SITE_URL = "https://www.daplappliance.com";
const OPEN_JOB_STATUSES = new Set<InvoiceJobStatus>([
  "scheduled",
  "on_the_way",
  "in_progress",
  "need_parts",
  "reschedule",
]);
const CALLBACK_STATUS_MAP: Record<string, InvoiceJobStatus> = {
  way: "on_the_way",
  progress: "in_progress",
  parts: "need_parts",
  done: "done",
};

function getTodayDateInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_SITE_URL)
  ).replace(/\/+$/, "");
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

function getJobStatus(invoice: InvoiceRecord) {
  return invoice.job_status ?? (invoice.service_date ? "scheduled" : "reschedule");
}

function getTechnicians() {
  return (process.env.TELEGRAM_TECHNICIANS || "")
    .split(";")
    .map((entry) => {
      const [telegramUserId, technicianName, role = "technician"] = entry.split("|").map((part) => part.trim());

      if (!telegramUserId || !technicianName) {
        return null;
      }

      return {
        telegramUserId,
        technicianName,
        role: role === "owner" || role === "dispatcher" ? role : "technician",
      } satisfies TelegramTechnician;
    })
    .filter(Boolean) as TelegramTechnician[];
}

function getTelegramUserDisplayName(user: TelegramUser | undefined) {
  if (!user) {
    return "Telegram";
  }

  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return fullName || user.username || `Telegram ${user.id}`;
}

async function getAuthorizedTechnician(user: TelegramUser | undefined) {
  const telegramUserId = user?.id ? String(user.id) : "";

  if (!telegramUserId) {
    return null;
  }

  const telegramUser = await getTelegramUserByTelegramId(telegramUserId);

  if (telegramUser.user) {
    return {
      telegramUserId: telegramUser.user.telegram_user_id,
      technicianName: telegramUser.user.technician_name,
      role: telegramUser.user.role,
    } satisfies TelegramTechnician;
  }

  if (telegramUser.ready) {
    return null;
  }

  const technician = getTechnicians().find((item) => item.telegramUserId === telegramUserId);

  if (technician) {
    return technician;
  }

  return null;
}

export function isTelegramTechnicianBotConfigured() {
  return Boolean(process.env.TELEGRAM_TECH_BOT_TOKEN);
}

function getTelegramTechnicianBotToken() {
  const botToken = process.env.TELEGRAM_TECH_BOT_TOKEN;

  if (!botToken) {
    throw new Error("TELEGRAM_TECH_BOT_TOKEN is not configured.");
  }

  return botToken;
}

async function sendTelegram(input: {
  chatId: number | string;
  text: string;
  replyMarkup?: { inline_keyboard: InlineButton[][] };
}) {
  const botToken = getTelegramTechnicianBotToken();

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
    const details = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${details}`);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const botToken = getTelegramTechnicianBotToken();

  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

function buildJobMessage(invoice: InvoiceRecord) {
  const jobStatus = getJobStatus(invoice).replaceAll("_", " ");
  const serviceLabel = [formatServiceTime(invoice.service_time), invoice.service_window].filter(Boolean).join(" / ");
  const phone = invoice.customer_phone || "";
  const phoneHref = normalizePhone(phone);

  return [
    `<b>${escapeHtml(invoice.customer_name)}</b>`,
    serviceLabel ? `Time: ${escapeHtml(serviceLabel)}` : "Time: not set",
    `Status: ${escapeHtml(jobStatus)}`,
    invoice.appliance ? `Appliance: ${escapeHtml(invoice.appliance)}` : null,
    invoice.service_address ? `Address: ${escapeHtml(invoice.service_address)}` : null,
    phone ? `Phone: ${phoneHref ? `<a href="tel:${escapeHtml(phoneHref)}">${escapeHtml(phone)}</a>` : escapeHtml(phone)}` : null,
    invoice.notes ? `Notes: ${escapeHtml(invoice.notes).slice(0, 800)}` : null,
    `Invoice: ${escapeHtml(invoice.invoice_number)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildJobButtons(invoice: InvoiceRecord) {
  const siteUrl = getSiteUrl();
  const mapsUrl = getMapsSearchUrl(invoice.service_address);
  const invoiceUrl = `${siteUrl}/admin/invoices/${invoice.id}`;
  const buttons: InlineButton[][] = [
    [
      { text: "On the way", callback_data: `job:way:${invoice.id}` },
      { text: "In progress", callback_data: `job:progress:${invoice.id}` },
    ],
    [
      { text: "Need parts", callback_data: `job:parts:${invoice.id}` },
      { text: "Done", callback_data: `job:done:${invoice.id}` },
    ],
    [
      ...(mapsUrl ? [{ text: "Maps", url: mapsUrl }] : []),
      { text: "Invoice", url: invoiceUrl },
    ],
  ];

  return { inline_keyboard: buttons.filter((row) => row.length) };
}

function technicianCanSeeInvoice(technician: TelegramTechnician, invoice: InvoiceRecord) {
  if (technician.role === "owner" || technician.role === "dispatcher") {
    return true;
  }

  return invoice.assigned_technician?.trim().toLowerCase() === technician.technicianName.toLowerCase();
}

async function sendTodayJobs(chatId: number, technician: TelegramTechnician) {
  const today = getTodayDateInput();
  const invoices = await listInvoices(500);
  const todayInvoices = invoices
    .filter((invoice) => invoice.status !== "void" && invoice.service_date === today)
    .filter((invoice) => technicianCanSeeInvoice(technician, invoice))
    .sort((left, right) =>
      `${left.service_time ?? "99:99"} ${left.customer_name}`.localeCompare(
        `${right.service_time ?? "99:99"} ${right.customer_name}`,
      ),
    );
  const activeInvoices = todayInvoices.filter((invoice) => OPEN_JOB_STATUSES.has(getJobStatus(invoice)));

  await sendTelegram({
    chatId,
    text:
      `<b>Today jobs</b>\n` +
      `Date: ${escapeHtml(today)}\n` +
      `Technician: ${escapeHtml(technician.role === "technician" ? technician.technicianName : "All technicians")}\n` +
      `Jobs: ${todayInvoices.length} / active: ${activeInvoices.length}`,
  });

  if (!todayInvoices.length) {
    await sendTelegram({
      chatId,
      text: "No jobs are scheduled for today.",
    });
    return;
  }

  for (const invoice of todayInvoices.slice(0, 15)) {
    await sendTelegram({
      chatId,
      text: buildJobMessage(invoice),
      replyMarkup: buildJobButtons(invoice),
    });
  }

  if (todayInvoices.length > 15) {
    await sendTelegram({
      chatId,
      text: `Showing first 15 jobs. Open CRM for the full day.`,
    });
  }
}

async function handleStatusCallback(callbackQuery: TelegramCallbackQuery, technician: TelegramTechnician) {
  const data = callbackQuery.data ?? "";
  const [, action, invoiceId] = data.split(":");
  const jobStatus = CALLBACK_STATUS_MAP[action];
  const chatId = callbackQuery.message?.chat.id;

  if (!jobStatus || !invoiceId || !chatId) {
    await answerCallbackQuery(callbackQuery.id, "Invalid action.");
    return;
  }

  const invoices = await listInvoices(500);
  const invoice = invoices.find((item) => item.id === invoiceId);

  if (!invoice || !technicianCanSeeInvoice(technician, invoice)) {
    await answerCallbackQuery(callbackQuery.id, "Access denied for this job.");
    return;
  }

  const { leadId } = await updateInvoiceJobStatus(invoiceId, jobStatus);

  await createLeadActivity({
    leadId,
    invoiceId,
    eventType: "telegram_job_status_updated",
    title: "Telegram job status updated",
    details: `Job status changed to ${jobStatus.replaceAll("_", " ")} from Telegram bot.`,
    metadata: {
      actor: {
        id: `telegram-${callbackQuery.from.id}`,
        name: technician.technicianName,
        role: technician.role,
      },
      telegram: {
        userId: callbackQuery.from.id,
        username: callbackQuery.from.username ?? null,
      },
    },
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${invoiceId}`);

  await answerCallbackQuery(callbackQuery.id, `Status: ${jobStatus.replaceAll("_", " ")}`);
  await sendTelegram({
    chatId,
    text: `<b>Status updated</b>\n${escapeHtml(invoice.customer_name)}: ${escapeHtml(jobStatus.replaceAll("_", " "))}`,
  });
}

async function sendHelp(chatId: number, user: TelegramUser | undefined, technician: TelegramTechnician | null) {
  const identity = user?.id ? `\nYour Telegram ID: <code>${user.id}</code>` : "";
  const access = technician
    ? `\nAccess: ${escapeHtml(technician.technicianName)} (${escapeHtml(technician.role)})`
    : "\nAccess: not configured";

  await sendTelegram({
    chatId,
    text:
      `<b>DAPL technician bot</b>\n` +
      `/today - show today's jobs\n` +
      `/start - show this help` +
      identity +
      access,
  });
}

export async function handleTelegramTechnicianUpdate(update: TelegramUpdate) {
  const message = update.message;
  const callbackQuery = update.callback_query;
  const user = message?.from ?? callbackQuery?.from;
  const chatId = message?.chat.id ?? callbackQuery?.message?.chat.id;
  const technician = await getAuthorizedTechnician(user);

  if (!chatId) {
    return;
  }

  if (!technician) {
    await sendTelegram({
      chatId,
      text:
        `<b>Access denied</b>\n` +
        `Send this Telegram ID to admin: <code>${escapeHtml(user?.id ?? "unknown")}</code>`,
    });
    return;
  }

  if (callbackQuery) {
    await handleStatusCallback(callbackQuery, technician);
    return;
  }

  const text = message?.text?.trim().toLowerCase() || "";

  if (text === "/today" || text === "today") {
    await sendTodayJobs(chatId, technician);
    return;
  }

  await sendHelp(chatId, user, technician);
}
