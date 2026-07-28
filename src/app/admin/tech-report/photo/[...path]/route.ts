import { NextResponse } from "next/server";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { fetchTechnicianReportPhoto } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path } = await params;
  const storagePath = path.join("/");
  const photoResponse = await fetchTechnicianReportPhoto(storagePath);

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
