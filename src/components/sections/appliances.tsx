"use client";

import { motion } from "framer-motion";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

const appliances = [
  "Refrigerator",
  "Washer",
  "Dryer",
  "Dishwasher",
  "Oven",
  "Cooktop",
  "Freezer",
  "Ice Machine",
  "Wine Cooler",
  "Commercial Refrigerator",
];

export function AppliancesSection() {
  return (
    <section id="appliances" className="bg-[#f2f5f9] py-20">
      <div className="container-shell">
        <FadeUp>
          <SectionHeading
            eyebrow="Appliances We Repair"
            title="Reliable service for all major home and commercial appliances"
            description="Our technicians diagnose and repair a wide range of appliance issues quickly, with quality parts and workmanship."
          />
        </FadeUp>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {appliances.map((item, index) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="rounded-2xl border border-border bg-surface p-5 text-center text-sm font-semibold text-foreground shadow-sm transition-shadow hover:shadow-md"
            >
              {item}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
