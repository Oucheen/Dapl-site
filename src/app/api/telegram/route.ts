import {
  handleTelegramTechnicianUpdate,
  isTelegramTechnicianBotConfigured,
  type TelegramUpdate,
} from "@/lib/telegram-technician-bot";

export const dynamic = "force-dynamic";

function isValidTelegramSecret(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!expectedSecret) {
    return true;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === expectedSecret;
}

export async function GET() {
  return Response.json({
    ok: true,
    configured: isTelegramTechnicianBotConfigured(),
    techniciansConfigured: Boolean(process.env.TELEGRAM_TECHNICIANS?.trim()),
  });
}

export async function POST(request: Request) {
  if (!isTelegramTechnicianBotConfigured()) {
    return Response.json({ ok: false, error: "Telegram technician bot is not configured." }, { status: 503 });
  }

  if (!isValidTelegramSecret(request)) {
    return Response.json({ ok: false, error: "Invalid Telegram webhook secret." }, { status: 401 });
  }

  let update: TelegramUpdate;

  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    await handleTelegramTechnicianUpdate(update);
  } catch (error) {
    console.error("Telegram technician bot error:", error);
    return Response.json({ ok: false, error: "Telegram update failed." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
