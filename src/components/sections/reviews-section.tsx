"use client";

import { useRef } from "react";

const googleRating = {
  rating: "5.0",
  reviewCount: "Add review count",
  url: "#",
};

const reviews = [
  {
    name: "Sarah M.",
    service: "Washer repair",
    text: "Sample review layout: quick response, clear explanation, and the washer was working again the same day.",
  },
  {
    name: "James R.",
    service: "Refrigerator repair",
    text: "Sample review layout: professional visit, honest diagnosis, and practical options before moving forward.",
  },
  {
    name: "Linda K.",
    service: "Dryer repair",
    text: "Sample review layout: easy scheduling, friendly communication, and the dryer issue was handled cleanly.",
  },
  {
    name: "Michael T.",
    service: "Dishwasher repair",
    text: "Sample review layout: the technician explained the issue clearly and helped avoid replacing the appliance too soon.",
  },
  {
    name: "Amanda P.",
    service: "Oven repair",
    text: "Sample review layout: appointment was simple to set up, arrival was on time, and the repair felt straightforward.",
  },
  {
    name: "Robert C.",
    service: "Freezer repair",
    text: "Sample review layout: responsive communication, practical advice, and a clean service visit from start to finish.",
  },
];

function Stars() {
  return (
    <div className="flex gap-1 text-accent" aria-label="Five star rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className="h-4 w-4 fill-current"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="m10 1.8 2.5 5.1 5.6.8-4 4 1 5.5-5.1-2.7-5 2.7.9-5.5-4-4 5.6-.8L10 1.8Z" />
        </svg>
      ))}
    </div>
  );
}

function GoogleWordmark() {
  return (
    <span className="font-black" aria-label="Google">
      <span className="text-[#4285f4]">G</span>
      <span className="text-[#ea4335]">o</span>
      <span className="text-[#fbbc05]">o</span>
      <span className="text-[#4285f4]">g</span>
      <span className="text-[#34a853]">l</span>
      <span className="text-[#ea4335]">e</span>
    </span>
  );
}

function ArrowIcon({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={direction === "previous" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ReviewsSection() {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollReviews(direction: "previous" | "next") {
    const track = trackRef.current;

    if (!track) return;

    const firstCard = track.querySelector<HTMLElement>("[data-review-card]");
    const cardWidth = firstCard?.offsetWidth ?? 340;
    const gap = 16;

    track.scrollBy({
      left: direction === "next" ? cardWidth + gap : -(cardWidth + gap),
      behavior: "smooth",
    });
  }

  return (
    <section id="reviews" className="bg-[#f2f5f9] py-20">
      <div className="container-shell">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
            Customer feedback
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-primary sm:text-4xl">
            What Charlotte customers say
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
            Real local reviews will be added here before this section is published.
          </p>
          <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-border bg-white px-5 py-3 shadow-sm">
            <Stars />
            <span className="text-sm font-black text-primary">
              {googleRating.rating} rating on <GoogleWordmark />
            </span>
            <span className="text-sm font-medium text-muted">
              Based on {googleRating.reviewCount}
            </span>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Google reviews
          </p>
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              aria-label="Previous reviews"
              onClick={() => scrollReviews("previous")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/5"
            >
              <ArrowIcon direction="previous" />
            </button>
            <button
              type="button"
              aria-label="Next reviews"
              onClick={() => scrollReviews("next")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/5"
            >
              <ArrowIcon direction="next" />
            </button>
          </div>
        </div>

        <div className="relative mt-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-16 bg-gradient-to-r from-[#f2f5f9] to-transparent md:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#f2f5f9] to-transparent" />

          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {reviews.map((review) => (
              <article
                key={`${review.name}-${review.service}`}
                data-review-card
                className="flex min-h-[280px] w-[82%] max-w-[360px] shrink-0 snap-center flex-col rounded-2xl border border-border bg-white p-6 shadow-sm sm:w-[48%] lg:w-[31%] lg:snap-start"
              >
                <Stars />
                <p className="mt-5 flex-1 text-sm leading-7 text-muted">
                  {review.text}
                </p>
                <div className="mt-6 border-t border-border pt-4">
                  <p className="font-bold text-primary">{review.name}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {review.service}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted sm:hidden">
            Swipe for more
          </p>
          <a
            href={googleRating.url}
            className="inline-flex items-center justify-center rounded-full border border-border bg-white px-6 py-3 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/25 hover:bg-primary/5"
          >
            See more reviews on&nbsp;<GoogleWordmark />
          </a>
        </div>
      </div>
    </section>
  );
}
