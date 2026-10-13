"use client";

import Link from "next/link";
import { useRef } from "react";
import { serviceAreaPagesDirectory } from "@/content/service-areas";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

const triadAreaSlugs = [
  "appliance-repair-greensboro-nc",
  "appliance-repair-winston-salem-nc",
] as const;

export function ServiceAreasSection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const triadAreas = triadAreaSlugs
    .map((slug) => serviceAreaPagesDirectory.find((area) => area.slug === slug))
    .filter((area): area is (typeof serviceAreaPagesDirectory)[number] => Boolean(area));

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

        {triadAreas.length > 0 ? (
          <FadeUp delay={0.04}>
            <div className="mx-auto mt-8 max-w-6xl rounded-3xl border border-primary/10 bg-[linear-gradient(135deg,rgba(15,42,86,0.055),rgba(255,255,255,0.98)_48%,rgba(207,36,49,0.06))] p-5 shadow-sm sm:p-8">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                  New service areas
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-primary sm:text-3xl">
                  Now serving the Triad
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
                  Appliance repair coverage is expanding to Greensboro and Winston-Salem, with
                  appointment timing confirmed by service address and route availability.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {triadAreas.map((area) => (
                  <Link
                    key={area.slug}
                    href={`/${area.slug}`}
                    className="group rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:p-6"
                  >
                    <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">
                      Triad service area
                    </span>
                    <span className="mt-3 block text-xl font-black text-primary sm:text-2xl">
                      {area.label}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-muted">
                      Local appliance repair help for kitchen, laundry, cooling, and freezer
                      concerns.
                    </span>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary transition group-hover:gap-3">
                      View service area <span aria-hidden>→</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </FadeUp>
        ) : null}

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
                    {serviceAreaPagesDirectory.map((area) => (
                      <Link
                        key={area.slug}
                        href={`/${area.slug}`}
                        className="flex h-20 w-[62%] shrink-0 snap-start flex-col justify-center rounded-lg border border-border bg-[linear-gradient(135deg,rgba(191,10,48,0.055),rgba(255,255,255,0.92)_44%,rgba(0,40,104,0.06))] px-4 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm sm:w-[29%] lg:w-[21%]"
                      >
                        <span className="flex min-h-9 items-end text-sm font-black leading-tight text-primary sm:text-[15px]">
                          {area.label}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                          View local service
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
