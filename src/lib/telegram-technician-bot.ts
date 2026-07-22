import { revalidatePath } from "next/cache";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  clearTelegramBotSession,
  getTelegramBotSession,
  upsertTelegramBotSession,
} from "@/lib/supabase-telegram-bot-sessions";
import { getTelegramUserByTelegramId, listTelegramUsers } from "@/lib/supabase-telegram-users";
import {
  addInvoicePart,
} from "@/lib/supabase-parts";
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
  caption?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
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
const CALLBACK_DAY_MAP: Record<string, "today" | "tomorrow"> = {
  today: "today",
  tomorrow: "tomorrow",
};
const CALLBACK_HELP_MAP: Record<string, "part" | "photo"> = {
  addpart: "part",
  photo: "photo",
};

function getDateInput(dayOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTodayDateInput() {
  return getDateInput();
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

async function getActiveReminderTechnicians() {
  const technicians = new Map<string, TelegramTechnician>();

  try {
    const telegramUsers = await listTelegramUsers();

    if (telegramUsers.ready) {
      for (const user of telegramUsers.users) {
        if (user.is_active && user.role === "technician") {
          technicians.set(user.telegram_user_id, {
            telegramUserId: user.telegram_user_id,
            technicianName: user.technician_name,
            role: user.role,
          });
        }
      }
    }
  } catch {
    // Fall back to env technicians when the database-backed list is unavailable.
  }

  for (const technician of getTechnicians()) {
    if (technician.role === "technician" && !technicians.has(technician.telegramUserId)) {
      technicians.set(technician.telegramUserId, technician);
    }
  }

  return Array.from(technicians.values());
}

function getTelegramUserDisplayName(user: TelegramUser | undefined) {
  if (!user) {
    return "Telegram";
  }

  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return fullName || user.username || `Telegram ${user.id}`;
}

function getActivityActor(user: TelegramUser | undefined, technician: TelegramTechnician) {
  return {
    actor: {
      id: user?.id ? `telegram-${user.id}` : `telegram-${technician.telegramUserId}`,
      name: technician.technicianName,
      role: technician.role,
    },
    telegram: {
      userId: user?.id ?? technician.telegramUserId,
      username: user?.username ?? null,
      displayName: getTelegramUserDisplayName(user),
    },
  };
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
    [
      { text: "Add part", callback_data: `help:addpart:${invoice.id}` },
      { text: "Photo", callback_data: `help:photo:${invoice.id}` },
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

function findInvoiceReference(text: string) {
  const invoiceNumber = text.match(/DAPL-\d{8}-[A-Z0-9]+/i)?.[0]?.toUpperCase();

  if (invoiceNumber) {
    return invoiceNumber;
  }

  return text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0] ?? "";
}

function getInvoiceByReference(invoices: InvoiceRecord[], reference: string | null | undefined) {
  const normalizedReference = reference?.trim().toLowerCase() ?? "";

  if (!normalizedReference) {
    return null;
  }

  return (
    invoices.find(
      (invoice) =>
        invoice.id.toLowerCase() === normalizedReference ||
        invoice.invoice_number.toLowerCase() === normalizedReference,
    ) ?? null
  );
}

async function sendJobsForDate(
  chatId: number,
  technician: TelegramTechnician,
  date: string,
  label: string,
  options: { compactNoJobs?: boolean } = {},
) {
  const invoices = await listInvoices(500);
  const dayInvoices = invoices
    .filter((invoice) => invoice.status !== "void" && invoice.service_date === date)
    .filter((invoice) => technicianCanSeeInvoice(technician, invoice))
    .sort((left, right) =>
      `${left.service_time ?? "99:99"} ${left.customer_name}`.localeCompare(
        `${right.service_time ?? "99:99"} ${right.customer_name}`,
      ),
    );
  const activeInvoices = dayInvoices.filter((invoice) => OPEN_JOB_STATUSES.has(getJobStatus(invoice)));

  if (!dayInvoices.length && options.compactNoJobs) {
    await sendTelegram({
      chatId,
      text:
        `<b>Good morning, ${escapeHtml(technician.technicianName)}</b>\n` +
        `Today jobs: 0\n` +
        `No jobs are scheduled for today.`,
    });
    return;
  }

  await sendTelegram({
    chatId,
    text:
      `<b>${escapeHtml(label)} jobs</b>\n` +
      `Date: ${escapeHtml(date)}\n` +
      `Technician: ${escapeHtml(technician.role === "technician" ? technician.technicianName : "All technicians")}\n` +
      `Jobs: ${dayInvoices.length} / active: ${activeInvoices.length}`,
  });

  if (!dayInvoices.length) {
    await sendTelegram({
      chatId,
      text: `No jobs are scheduled for ${label.toLowerCase()}.`,
    });
    return;
  }

  for (const invoice of dayInvoices.slice(0, 15)) {
    await sendTelegram({
      chatId,
      text: buildJobMessage(invoice),
      replyMarkup: buildJobButtons(invoice),
    });
  }

  if (dayInvoices.length > 15) {
    await sendTelegram({
      chatId,
      text: `Showing first 15 jobs. Open CRM for the full day.`,
    });
  }
}

async function sendTodayJobs(chatId: number, technician: TelegramTechnician) {
  await sendJobsForDate(chatId, technician, getTodayDateInput(), "Today");
}

async function sendTomorrowJobs(chatId: number, technician: TelegramTechnician) {
  await sendJobsForDate(chatId, technician, getDateInput(1), "Tomorrow");
}

export async function sendDailyTechnicianJobReminders(date = getTodayDateInput()) {
  const technicians = await getActiveReminderTechnicians();
  const results: Array<{ technician: string; telegramUserId: string; ok: boolean; error: string }> = [];

  for (const technician of technicians) {
    try {
      await sendJobsForDate(Number(technician.telegramUserId), technician, date, "Today", {
        compactNoJobs: true,
      });
      results.push({
        technician: technician.technicianName,
        telegramUserId: technician.telegramUserId,
        ok: true,
        error: "",
      });
    } catch (error) {
      results.push({
        technician: technician.technicianName,
        telegramUserId: technician.telegramUserId,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Telegram reminder error.",
      });
    }
  }

  return {
    date,
    technicians: technicians.length,
    sent: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}

async function sendCommandHelp(chatId: number, invoice: InvoiceRecord, type: "part" | "photo") {
  const invoiceNumber = invoice.invoice_number;
  const textByType = {
    part:
      `<b>Add part</b>\n` +
      `For ${escapeHtml(invoice.customer_name)} / ${escapeHtml(invoiceNumber)}\n` +
      `Send:\n<code>gas valve | 12345 | customer needs quote</code>\n\n` +
      `Part number and note are optional.`,
    photo:
      `<b>Add photo</b>\n` +
      `For ${escapeHtml(invoice.customer_name)} / ${escapeHtml(invoiceNumber)}\n` +
      `Send the next photo here. Caption is optional.`,
  } satisfies Record<typeof type, string>;

  await sendTelegram({
    chatId,
    text: textByType[type],
  });
}

async function setBotSession(
  chatId: number,
  technician: TelegramTechnician,
  invoice: InvoiceRecord,
  mode: "add_part" | "add_photo",
) {
  const result = await upsertTelegramBotSession({
    telegramUserId: technician.telegramUserId,
    mode,
    invoiceId: invoice.id,
    ttlMinutes: 15,
  });

  if (result.ready) {
    return true;
  }

  await sendTelegram({
    chatId,
    text:
      "Session storage is not ready yet. Run the telegram_bot_sessions SQL in Supabase. For now, use the full command with invoice number.",
  });
  return false;
}

async function handleStatusCallback(callbackQuery: TelegramCallbackQuery, technician: TelegramTechnician) {
  const data = callbackQuery.data ?? "";
  const [, action, invoiceId] = data.split(":");
  const jobStatus = CALLBACK_STATUS_MAP[action];
  const chatId = callbackQuery.message?.chat.id;

  if (CALLBACK_DAY_MAP[action] && chatId) {
    await answerCallbackQuery(callbackQuery.id, CALLBACK_DAY_MAP[action] === "today" ? "Today jobs" : "Tomorrow jobs");

    if (CALLBACK_DAY_MAP[action] === "today") {
      await sendTodayJobs(chatId, technician);
    } else {
      await sendTomorrowJobs(chatId, technician);
    }

    return;
  }

  if (!invoiceId || !chatId) {
    await answerCallbackQuery(callbackQuery.id, "Invalid action.");
    return;
  }

  if (CALLBACK_HELP_MAP[action]) {
    const invoices = await listInvoices(500);
    const invoice = invoices.find((item) => item.id === invoiceId);

    if (!invoice || !technicianCanSeeInvoice(technician, invoice)) {
      await answerCallbackQuery(callbackQuery.id, "Access denied for this job.");
      return;
    }

    const mode = CALLBACK_HELP_MAP[action] === "part" ? "add_part" : "add_photo";
    const sessionReady = await setBotSession(chatId, technician, invoice, mode);

    await answerCallbackQuery(callbackQuery.id, sessionReady ? "Ready." : "Session storage missing.");
    await sendCommandHelp(chatId, invoice, CALLBACK_HELP_MAP[action]);
    return;
  }

  if (!jobStatus) {
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
    metadata: getActivityActor(callbackQuery.from, technician),
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

async function addPartFromText(input: {
  chatId: number;
  user: TelegramUser | undefined;
  technician: TelegramTechnician;
  invoice: InvoiceRecord;
  text: string;
}) {
  const segments = input.text.split("|").map((item) => item.trim());
  const partName = segments[0] ?? "";
  const partNumber = segments[1] ?? "";
  const note = segments.slice(2).join(" | ");

  if (!partName) {
    await sendTelegram({
      chatId: input.chatId,
      text: "Send part like: <code>gas valve | 12345 | customer needs quote</code>",
    });
    return;
  }

  await addInvoicePart(input.invoice.id, {
    partName,
    partNumber,
    status: "needed",
    quantity: 1,
    cost: 0,
    note: note || `Added from Telegram by ${input.technician.technicianName}`,
  });

  await createLeadActivity({
    leadId: input.invoice.lead_id,
    invoiceId: input.invoice.id,
    eventType: "telegram_part_added",
    title: "Part added from Telegram",
    details: `${partName}${partNumber ? ` / ${partNumber}` : ""}${note ? ` / ${note}` : ""}`,
    metadata: getActivityActor(input.user, input.technician),
  });

  await clearTelegramBotSession(input.technician.telegramUserId);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/parts");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/technician");
  revalidatePath(`/admin/invoices/${input.invoice.id}`);

  await sendTelegram({
    chatId: input.chatId,
    text: `<b>Part added</b>\n${escapeHtml(partName)}\n${escapeHtml(input.invoice.customer_name)} / ${escapeHtml(input.invoice.invoice_number)}`,
  });
}

async function handlePartCommand(chatId: number, user: TelegramUser | undefined, technician: TelegramTechnician, rawText: string) {
  const [, rest = ""] = rawText.match(/^\/?part\s+([\s\S]+)$/i) ?? [];
  const reference = findInvoiceReference(rest);
  const textWithoutReference = reference
    ? rest.replace(reference, "").trim().replace(/^[-|:]+/, "").trim()
    : rest.trim();

  if (!reference) {
    await sendTelegram({
      chatId,
      text: "Use: <code>/part DAPL-YYYYMMDD-XXXX | gas valve | 12345 | note</code>, or press Add part under a job first.",
    });
    return;
  }

  const invoices = await listInvoices(500);
  const invoice = getInvoiceByReference(invoices, reference);

  if (!invoice || !technicianCanSeeInvoice(technician, invoice)) {
    await sendTelegram({ chatId, text: "Invoice not found or access denied." });
    return;
  }

  await addPartFromText({ chatId, user, technician, invoice, text: textWithoutReference });
}

async function logPhotoForInvoice(input: {
  chatId: number;
  user: TelegramUser | undefined;
  technician: TelegramTechnician;
  invoice: InvoiceRecord;
  message: TelegramMessage;
  caption: string;
}) {
  const photo = input.message.photo?.at(-1);

  if (!photo) {
    return;
  }

  await createLeadActivity({
    leadId: input.invoice.lead_id,
    invoiceId: input.invoice.id,
    eventType: "telegram_job_photo",
    title: "Job photo received",
    details: input.caption || "Photo was sent from Telegram.",
    metadata: {
      ...getActivityActor(input.user, input.technician),
      telegramPhoto: {
        fileId: photo.file_id,
        fileUniqueId: photo.file_unique_id,
        width: photo.width,
        height: photo.height,
        fileSize: photo.file_size ?? null,
        caption: input.caption,
      },
    },
  });

  await clearTelegramBotSession(input.technician.telegramUserId);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${input.invoice.id}`);

  await sendTelegram({
    chatId: input.chatId,
    text: `<b>Photo logged</b>\n${escapeHtml(input.invoice.customer_name)} / ${escapeHtml(input.invoice.invoice_number)}`,
  });
}

async function handlePhotoMessage(chatId: number, user: TelegramUser | undefined, technician: TelegramTechnician, message: TelegramMessage) {
  const caption = message.caption?.trim() ?? "";
  const reference = findInvoiceReference(caption);
  const photo = message.photo?.at(-1);

  if (!photo) {
    return;
  }

  const sessionData = await getTelegramBotSession(technician.telegramUserId);
  const invoices = await listInvoices(500);

  if (!reference && sessionData.session?.mode === "add_photo") {
    const sessionInvoice = getInvoiceByReference(invoices, sessionData.session.invoice_id);

    if (!sessionInvoice || !technicianCanSeeInvoice(technician, sessionInvoice)) {
      await clearTelegramBotSession(technician.telegramUserId);
      await sendTelegram({ chatId, text: "Saved photo session expired or access was denied. Press Photo under the job again." });
      return;
    }

    await logPhotoForInvoice({ chatId, user, technician, invoice: sessionInvoice, message, caption });
    return;
  }

  if (!reference) {
    await sendTelegram({
      chatId,
      text: "Photo received, but job is not selected. Press Photo under the job first.",
    });
    return;
  }

  const invoice = getInvoiceByReference(invoices, reference);

  if (!invoice || !technicianCanSeeInvoice(technician, invoice)) {
    await sendTelegram({ chatId, text: "Invoice not found or access denied for this photo." });
    return;
  }

  const photoNote = caption.replace(reference, "").trim().replace(/^[-|:]+/, "").trim();

  await logPhotoForInvoice({ chatId, user, technician, invoice, message, caption: photoNote });
}

async function sendHelp(chatId: number) {
  await sendTelegram({
    chatId,
    text:
      `<b>DAPL technician bot</b>\n` +
      `/today - show today's jobs\n` +
      `/tomorrow - show tomorrow's jobs\n` +
      `Use Add part or Photo under a job for field updates.\n` +
      `/start - show this help`,
    replyMarkup: {
      inline_keyboard: [
        [
          { text: "Today", callback_data: "menu:today" },
          { text: "Tomorrow", callback_data: "menu:tomorrow" },
        ],
      ],
    },
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
  const rawText = message?.text?.trim() || "";

  if (text === "/today" || text === "today") {
    await sendTodayJobs(chatId, technician);
    return;
  }

  if (text === "/tomorrow" || text === "tomorrow") {
    await sendTomorrowJobs(chatId, technician);
    return;
  }

  if (/^\/?part\s+/i.test(rawText)) {
    await handlePartCommand(chatId, user, technician, rawText);
    return;
  }

  if (message?.photo?.length) {
    await handlePhotoMessage(chatId, user, technician, message);
    return;
  }

  if (rawText) {
    const sessionData = await getTelegramBotSession(technician.telegramUserId);

    if (sessionData.session?.mode === "add_part") {
      const invoices = await listInvoices(500);
      const invoice = getInvoiceByReference(invoices, sessionData.session.invoice_id);

      if (!invoice || !technicianCanSeeInvoice(technician, invoice)) {
        await clearTelegramBotSession(technician.telegramUserId);
        await sendTelegram({ chatId, text: "Saved part session expired or access was denied. Press Add part under the job again." });
        return;
      }

      await addPartFromText({ chatId, user, technician, invoice, text: rawText });
      return;
    }

    if (sessionData.session?.mode === "add_photo") {
      await sendTelegram({
        chatId,
        text: "Send a photo now, or press Today/Tomorrow to choose another job.",
      });
      return;
    }
  }

  await sendHelp(chatId);
}
