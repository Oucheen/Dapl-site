import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { fetchGoogleBusinessReviewSummary } from "@/lib/google-business-profile";
import { upsertReviewSummary } from "@/lib/review-summary";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  const syncSecret = process.env.GOOGLE_REVIEWS_SYNC_SECRET?.trim();
  const querySecret = request.nextUrl.searchParams.get("secret");

  return Boolean(
    (cronSecret && authorization === `Bearer ${cronSecret}`) ||
      (syncSecret && authorization === `Bearer ${syncSecret}`) ||
      (syncSecret && querySecret === syncSecret),
  );
}

async function syncReviews(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const googleSummary = await fetchGoogleBusinessReviewSummary();
    const summary = await upsertReviewSummary(googleSummary);
    revalidatePath("/");

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    console.error("[google-reviews-sync] failed", { message });

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return syncReviews(request);
}

export async function POST(request: NextRequest) {
  return syncReviews(request);
}
