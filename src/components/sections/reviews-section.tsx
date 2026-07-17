"use client";

import { useRef } from "react";

type ReviewSummaryView = {
  rating: string;
  reviewCount: string;
  reviewUrl: string;
};

const fallbackGoogleRating: ReviewSummaryView = {
  rating: "5.0",
  reviewCount: "123+",
  reviewUrl: "https://www.google.com/search?q=DAPL+Appliance+Repair+reviews",
};

const reviews = [
  {
    name: "Linda Nardelli",
    service: "Appliance repair",
    text: "I have used DAPL appliance repair and I will not hesitate to use them in the future. They are knowledgeable, reasonably priced, and very honest in their work ethic.",
  },
  {
    name: "Yuliia Mikhachova",
    service: "Appliance repair",
    text: "The technician was professional, knowledgeable, and arrived on time. He quickly diagnosed the issue, explained the repair process clearly, and completed the work efficiently at a fair price.",
  },
  {
    name: "Velvelle",
    service: "Refrigerator repair",
    text: "Thanks to your employee Dmitry for repairing the refrigerator; the work was done to a high standard. Thank you.",
  },
  {
    name: "Amy Glenn",
    service: "Appliance repair",
    text: "Very nice people and good prices on their appliances.",
  },
];

function Stars({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <div className="flex gap-1 text-accent" aria-label="Five star rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={size === "md" ? "h-5 w-5 fill-current" : "h-4 w-4 fill-current"}
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

export function ReviewsSection({ summary }: { summary?: ReviewSummaryView }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const googleRating = summary ?? fallbackGoogleRating;

  function scrollReviews(direction: "previous" | "next") {
    const track = trackRef.current;

    if (!track) return;

    const firstCard = track.querySelector<HTMLElement>("[data-review-card]");
    const cardWidth = firstCard?.offsetWidth ?? 360;
    const gap = 18;

    track.scrollBy({
      left: direction === "next" ? cardWidth + gap : -(cardWidth + gap),
      behavior: "smooth",
    });
  }

  return (
    <section id="reviews" className="bg-[#f4f7fb] py-20">
      <div className="container-shell">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-6 rounded-[1.5rem] border border-border bg-white px-5 py-6 shadow-sm sm:px-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">
                Google reviews
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-primary sm:text-4xl">
                Trusted by Charlotte homeowners
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                Real feedback from customers who called DAPL Appliance Repair
                for local appliance service.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-border bg-[#f8fafc] px-5 py-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-black tracking-tight text-primary">
                  {googleRating.rating}
                </span>
                <div>
                  <Stars size="md" />
                  <p className="mt-1 text-sm font-black text-primary">
                    {googleRating.reviewCount} reviews on <GoogleWordmark />
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">
              Recent customer stories
            </p>
            <div className="flex items-center gap-3">
              <a
                href={googleRating.reviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-border bg-white px-5 py-3 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/25 hover:bg-primary/5"
              >
                Read all on&nbsp;<GoogleWordmark />
              </a>
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
          </div>

          <div className="relative mt-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-16 bg-gradient-to-r from-[#f4f7fb] to-transparent md:block" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#f4f7fb] to-transparent" />

            <div
              ref={trackRef}
              className="flex snap-x snap-mandatory gap-[18px] overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {reviews.map((review) => (
                <article
                  key={`${review.name}-${review.service}`}
                  data-review-card
                  className="flex h-[300px] w-[82%] max-w-[390px] shrink-0 snap-center flex-col rounded-[1.1rem] border border-border bg-white p-6 shadow-sm sm:w-[48%] lg:w-[32%] lg:snap-start"
                >
                  <Stars />
                  <p className="mt-5 flex-1 overflow-hidden text-sm leading-7 text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5]">
                    {review.text}
                  </p>
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="font-black text-primary">{review.name}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      {review.service}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted sm:hidden">
            Swipe for more reviews
          </p>
        </div>
      </div>
    </section>
  );
}
