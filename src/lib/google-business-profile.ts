type GoogleReview = {
  starRating?: string;
};

type GoogleReviewsResponse = {
  averageRating?: number | string;
  totalReviewCount?: number | string;
  reviews?: GoogleReview[];
};

const STAR_RATING_VALUES: Record<string, number> = {
  ONE: 1,
  ONE_STAR: 1,
  TWO: 2,
  TWO_STAR: 2,
  THREE: 3,
  THREE_STAR: 3,
  FOUR: 4,
  FOUR_STAR: 4,
  FIVE: 5,
  FIVE_STAR: 5,
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function normalizeResourceId(value: string, resourceName: "accounts" | "locations") {
  return value.replace(/^\/+/, "").replace(new RegExp(`^${resourceName}/`), "");
}

async function getGoogleAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: getRequiredEnv("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google token request failed: ${response.status} ${details}`);
  }

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("Google token response did not include an access token.");
  }

  return data.access_token;
}

function calculateAverageRating(reviews: GoogleReview[] = []) {
  const ratings = reviews
    .map((review) => review.starRating)
    .map((rating) => (rating ? STAR_RATING_VALUES[rating] : undefined))
    .filter((rating): rating is number => typeof rating === "number");

  if (!ratings.length) {
    return 5;
  }

  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

export async function fetchGoogleBusinessReviewSummary() {
  const accessToken = await getGoogleAccessToken();
  const accountId = normalizeResourceId(
    getRequiredEnv("GOOGLE_BUSINESS_ACCOUNT_ID"),
    "accounts",
  );
  const locationId = normalizeResourceId(
    getRequiredEnv("GOOGLE_BUSINESS_LOCATION_ID"),
    "locations",
  );

  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google Business Profile reviews request failed: ${response.status} ${details}`);
  }

  const data = (await response.json()) as GoogleReviewsResponse;
  const reviews = data.reviews || [];
  const reviewCount = Number(data.totalReviewCount ?? reviews.length);
  const rating = Number(data.averageRating ?? calculateAverageRating(reviews));

  if (!Number.isFinite(reviewCount) || !Number.isFinite(rating)) {
    throw new Error("Google Business Profile returned invalid review summary values.");
  }

  return {
    rating,
    reviewCount,
    reviewUrl: process.env.GOOGLE_REVIEWS_URL,
  };
}
