import { NextResponse } from "next/server";
import { fetchTechnicianReportPhoto } from "@/lib/supabase-storage";
import { verifyTechnicianReportToken } from "@/lib/technician-report-links";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string; path: string[] }> },
) {
  const { invoiceId, path } = await params;
  const token = new URL(request.url).searchParams.get("t");
  const telegramUserId = verifyTechnicianReportToken(invoiceId, token);

  if (!telegramUserId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (path.length < 2 || path[1] !== invoiceId || path.some((part) => part.includes(".."))) {
    return new NextResponse("Photo not found.", { status: 404 });
  }

  const photoResponse = await fetchTechnicianReportPhoto(path.join("/"));

  if (!photoResponse) {
    return new NextResponse("Photo not found.", { status: 404 });
  }

  return new NextResponse(photoResponse.body, {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Type": photoResponse.headers.get("content-type") || "image/jpeg",
    },
  });
}
