import { NextRequest, NextResponse } from "next/server";

import { fetchGoogleBusinessReviewSummary } from "@/lib/google-business-profile";
import { upsertReviewSummary } from "@/lib/review-summary";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.GOOGLE_REVIEWS_SYNC_SECRET;

  if (!secret) {
    return false;
  }

  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get("secret") === secret
  );
}

async function syncReviews(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const googleSummary = await fetchGoogleBusinessReviewSummary();
    const summary = await upsertReviewSummary(googleSummary);

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
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
