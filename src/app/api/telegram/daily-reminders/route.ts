import {
  isTelegramTechnicianBotConfigured,
  sendDailyTechnicianJobReminders,
} from "@/lib/telegram-technician-bot";

export const dynamic = "force-dynamic";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  return scheme?.toLowerCase() === "bearer" ? token?.trim() : "";
}

export async function GET(request: Request) {
  if (!isTelegramTechnicianBotConfigured()) {
    return Response.json({ ok: false, error: "Telegram technician bot is not configured." }, { status: 503 });
  }

  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (!expectedSecret) {
    return Response.json({ ok: false, error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  if (getBearerToken(request) !== expectedSecret) {
    return Response.json({ ok: false, error: "Invalid cron secret." }, { status: 401 });
  }

  try {
    const result = await sendDailyTechnicianJobReminders();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Telegram daily reminders failed:", error);
    return Response.json({ ok: false, error: "Daily reminders failed." }, { status: 500 });
  }
}
