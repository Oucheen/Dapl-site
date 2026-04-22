"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

const brands = [
  { name: "Whirlpool", logo: "/brands/whirlpool.svg" },
  { name: "GE", logo: "/brands/general-electric.svg" },
  { name: "Samsung", logo: "/brands/samsung.svg" },
  { name: "LG", logo: "/brands/lg-electronics.svg" },
  { name: "KitchenAid", logo: "/brands/kitchen-aid.svg" },
  { name: "Maytag", logo: "/brands/maytag-3.svg" },
  { name: "Bosch", logo: "/brands/bosch-1.svg" },
  { name: "Frigidaire", logo: "/brands/frigidaire.svg" },
] as const;

export function BrandsSection() {
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
          <div className="relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-surface to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-surface to-transparent"
              aria-hidden
            />

            <div
              className="flex w-max animate-brands-marquee gap-4 pb-4 hover:[animation-play-state:paused]"
              aria-label="Supported appliance brands"
            >
              {[...brands, ...brands].map((brand, index) => (
                <motion.article
                  key={`${brand.name}-${index}`}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  whileHover={{ y: -4 }}
                  className="group grid h-32 min-w-[240px] snap-start place-items-center rounded-lg border border-border bg-[#f8fbff] p-6 shadow-sm transition-shadow hover:shadow-md sm:min-w-[280px]"
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
                </motion.article>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
