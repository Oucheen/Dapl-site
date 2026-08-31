import {
  googleReviewCount,
  googleReviewCountValue,
  googleReviewRating,
  googleReviewsUrl,
} from "@/content/google-profile";

export type ReviewSummary = {
  rating: string;
  reviewCount: string;
  reviewCountValue: number;
  reviewUrl: string;
  updatedAt?: string;
  source: "stored" | "google" | "fallback";
};

export const FALLBACK_REVIEW_SUMMARY: ReviewSummary = {
  rating: googleReviewRating,
  reviewCount: googleReviewCount,
  reviewCountValue: googleReviewCountValue,
  reviewUrl: googleReviewsUrl,
  source: "fallback",
};

type SupabaseReviewSummaryRow = {
  updated_at?: string;
  rating: number | string;
  review_count: number;
  review_url?: string | null;
};

function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

function getSupabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !serviceRoleKey) {
    return null;
  }

  return {
    url: normalizeSupabaseUrl(rawUrl),
    serviceRoleKey,
  };
}

function getHeaders(config: NonNullable<ReturnType<typeof getSupabaseConfig>>) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function formatRating(value: number | string) {
  const rating = Number(value);

  if (!Number.isFinite(rating)) {
    return FALLBACK_REVIEW_SUMMARY.rating;
  }

  return rating.toFixed(1);
}

function mapReviewSummaryRow(
  row: SupabaseReviewSummaryRow,
  source: ReviewSummary["source"] = "stored",
): ReviewSummary {
  return {
    rating: formatRating(row.rating),
    reviewCount: String(row.review_count),
    reviewCountValue: row.review_count,
    reviewUrl: row.review_url || googleReviewsUrl,
    updatedAt: row.updated_at,
    source,
  };
}

export async function getReviewSummary(): Promise<ReviewSummary> {
  const config = getSupabaseConfig();

  if (!config) {
    return FALLBACK_REVIEW_SUMMARY;
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/review_summary?id=eq.google&select=updated_at,rating,review_count,review_url&limit=1`,
      {
        headers: getHeaders(config),
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return FALLBACK_REVIEW_SUMMARY;
    }

    const rows = (await response.json()) as SupabaseReviewSummaryRow[];
    const [summary] = rows;

    if (!summary) {
      return FALLBACK_REVIEW_SUMMARY;
    }

    return mapReviewSummaryRow(summary);
  } catch {
    return FALLBACK_REVIEW_SUMMARY;
  }
}

export async function upsertReviewSummary(input: {
  rating: number;
  reviewCount: number;
  reviewUrl?: string;
}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const rating = Math.min(Math.max(input.rating, 0), 5);
  const reviewCount = Math.max(Math.round(input.reviewCount), 0);

  const response = await fetch(`${config.url}/rest/v1/review_summary?on_conflict=id`, {
    method: "POST",
    headers: {
      ...getHeaders(config),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([
      {
        id: "google",
        rating,
        review_count: reviewCount,
        review_url: input.reviewUrl || googleReviewsUrl,
      },
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Review summary upsert failed: ${response.status} ${details}`);
  }

  const rows = (await response.json()) as SupabaseReviewSummaryRow[];
  const [summary] = rows;

  if (!summary) {
    throw new Error("Review summary upsert returned no rows.");
  }

  return mapReviewSummaryRow(summary, "google");
}
