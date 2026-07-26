import { NextResponse } from "next/server";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function getTelegramTechnicianBotToken() {
  return process.env.TELEGRAM_TECH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const botToken = getTelegramTechnicianBotToken();

  if (!botToken) {
    return new NextResponse("Telegram bot is not configured.", { status: 404 });
  }

  const { fileId } = await params;
  const fileResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
    {
      cache: "no-store",
    },
  );

  if (!fileResponse.ok) {
    return new NextResponse("Telegram file lookup failed.", { status: 502 });
  }

  const fileData = (await fileResponse.json()) as {
    ok?: boolean;
    result?: {
      file_path?: string;
    };
  };
  const filePath = fileData.result?.file_path;

  if (!fileData.ok || !filePath) {
    return new NextResponse("Telegram file not found.", { status: 404 });
  }

  const imageResponse = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`, {
    cache: "no-store",
  });

  if (!imageResponse.ok || !imageResponse.body) {
    return new NextResponse("Telegram image fetch failed.", { status: 502 });
  }

  return new NextResponse(imageResponse.body, {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Type": imageResponse.headers.get("content-type") || "image/jpeg",
    },
  });
}
