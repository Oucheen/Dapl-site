"use client";

import Link from "next/link";
import { type CSSProperties, useRef } from "react";
import { serviceAreaPagesDirectory } from "@/content/service-areas";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

const AREA_LINE_STEP_SECONDS = 1.45;
const AREA_VISIBLE_LINE_SLOTS = 5;
const AREA_LINE_CYCLE_SECONDS = AREA_LINE_STEP_SECONDS * AREA_VISIBLE_LINE_SLOTS;

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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Show previous service areas"
                  onClick={() => scrollAreas(-1)}
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-xl font-black text-primary shadow-sm transition hover:bg-primary hover:text-white sm:flex"
                >
                  ←
                </button>

                <div className="relative min-w-0 flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white to-transparent" />

                  <div
                    ref={carouselRef}
                    className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {serviceAreaPagesDirectory.map((area, index) => (
                      <Link
                        key={area.slug}
                        href={`/${area.slug}`}
                        className="flex h-16 w-[58%] shrink-0 snap-start items-center rounded-lg border border-border bg-[linear-gradient(135deg,rgba(191,10,48,0.055),rgba(255,255,255,0.92)_44%,rgba(0,40,104,0.06))] px-4 text-left transition hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm sm:w-[26%] lg:w-[19%]"
                        style={
                          {
                            "--service-area-line-delay": `${(index % AREA_VISIBLE_LINE_SLOTS) * AREA_LINE_STEP_SECONDS}s`,
                            "--service-area-line-duration": `${AREA_LINE_CYCLE_SECONDS}s`,
                          } as CSSProperties
                        }
                      >
                        <span className="flex w-full min-w-0 items-center gap-3">
                          <span className="truncate text-sm font-black leading-tight text-primary sm:text-[15px]">
                            {area.label}
                          </span>
                          <span className="service-area-title-line pointer-events-none h-px w-10 flex-none sm:w-12" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Show next service areas"
                  onClick={() => scrollAreas(1)}
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-xl font-black text-primary shadow-sm transition hover:bg-primary hover:text-white sm:flex"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
