"use client";

import Link from "next/link";
import { useRef } from "react";
import { serviceAreaPagesDirectory } from "@/content/service-areas";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

export function ServiceAreasSection() {
  const carouselRef = useRef<HTMLDivElement>(null);

  function scrollAreas(direction: -1 | 1) {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    carousel.scrollBy({
      left: direction * carousel.clientWidth * 0.85,
      behavior: "smooth",
    });
  }

  return (
    <section id="service-areas" className="bg-background py-14 sm:py-18">
      <div className="container-shell">
        <FadeUp>
          <SectionHeading
            eyebrow="Service Areas"
            title="Local appliance repair near Mint Hill and Charlotte"
            description="Choose your closest area for local service notes, coverage details, and scheduling information."
          />
        </FadeUp>

        <FadeUp delay={0.08}>
          <div className="mx-auto mt-8 max-w-6xl">
            <div className="overflow-hidden rounded-lg border border-border bg-white p-3 shadow-sm sm:p-4">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white to-transparent" />

                <button
                  type="button"
                  aria-label="Show previous service areas"
                  onClick={() => scrollAreas(-1)}
                  className="absolute left-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-xl font-black text-primary shadow-sm transition hover:bg-primary hover:text-white sm:flex"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Show next service areas"
                  onClick={() => scrollAreas(1)}
                  className="absolute right-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-xl font-black text-primary shadow-sm transition hover:bg-primary hover:text-white sm:flex"
                >
                  →
                </button>

                <div
                  ref={carouselRef}
                  className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-11 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-12"
                >
                  {serviceAreaPagesDirectory.map((area) => (
                    <Link
                      key={area.slug}
                      href={`/${area.slug}`}
                      className="flex min-h-16 w-[62%] shrink-0 snap-start flex-col justify-center rounded-lg border border-border bg-[linear-gradient(135deg,rgba(191,10,48,0.055),rgba(255,255,255,0.92)_44%,rgba(0,40,104,0.06))] px-4 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm sm:w-[29%] lg:w-[21%]"
                    >
                      <span className="block text-sm font-black text-primary sm:text-[15px]">{area.label}</span>
                      <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                        View local service
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
