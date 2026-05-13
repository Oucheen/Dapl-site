"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";
import { brandPagesDirectory as brands } from "@/content/brand-pages";

export function BrandsSection() {
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel || !window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    const centeredCard = carousel.querySelector<HTMLElement>(`[data-brand-index="${brands.length}"]`);

    if (!centeredCard) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const centeredLeft = centeredCard.offsetLeft - (carousel.clientWidth - centeredCard.offsetWidth) / 2;
      carousel.scrollTo({ left: centeredLeft, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <section id="brands" className="bg-surface py-20">
      <div className="container-shell">
        <FadeUp>
          <SectionHeading
            eyebrow="Brands"
            title="Experienced with the brands you trust"
            description="From kitchen to laundry appliances, we service top brands with brand-specific diagnostic expertise."
          />
        </FadeUp>

        <FadeUp delay={0.1} className="mt-10">
          <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden md:left-auto md:w-auto md:translate-x-0">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-surface to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-surface to-transparent"
              aria-hidden
            />

            <div
              ref={carouselRef}
              className="brands-carousel-track flex w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[calc((100vw-240px)/2)] pb-4 touch-pan-x [scrollbar-width:none] sm:px-[calc((100vw-280px)/2)] md:w-max md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
              aria-label="Supported appliance brands"
            >
              {[...brands, ...brands].map((brand, index) => (
                <motion.article
                  data-brand-index={index}
                  key={`${brand.name}-${index}`}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  whileHover={{ y: -4 }}
                  className="group h-32 w-[240px] flex-none snap-center rounded-lg border border-border bg-[#f8fbff] shadow-sm transition-shadow hover:shadow-md sm:w-[280px] md:snap-start"
                >
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="grid h-full place-items-center p-6"
                    aria-label={`${brand.name} appliance repair in Charlotte, NC`}
                  >
                    <Image
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      width={220}
                      height={90}
                      className="max-h-20 w-full object-contain"
                      loading="lazy"
                      unoptimized
                    />
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
