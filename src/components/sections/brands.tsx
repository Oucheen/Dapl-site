"use client";

import { motion } from "framer-motion";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

const brands = ["Whirlpool", "GE", "Samsung", "LG", "KitchenAid", "Maytag", "Bosch", "Frigidaire"];

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
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {brands.map((brand, index) => (
            <motion.div
              key={brand}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border border-border bg-[#f8fbff] px-6 py-5 text-center text-base font-semibold text-primary"
            >
              {brand}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
