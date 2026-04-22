"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

const appliances = [
  { name: "Refrigerator", slug: "refrigerator", image: "/appliances/refrigerator.png" },
  { name: "Washer", slug: "washer", image: "/appliances/washer.png" },
  { name: "Dryer", slug: "dryer", image: "/appliances/dryer.png" },
  { name: "Dishwasher", slug: "dishwasher", image: "/appliances/dishwasher.png" },
  { name: "Oven", slug: "oven", image: "/appliances/oven.png" },
  { name: "Cooktop", slug: "cooktop", image: "/appliances/cooktop.png" },
  { name: "Freezer", slug: "freezer", image: "/appliances/freezer.png" },
  { name: "Ice Machine", slug: "ice-machine", image: "/appliances/ice-machine.png" },
  { name: "Wine Cooler", slug: "wine-cooler", image: "/appliances/wine-cooler.png" },
  {
    name: "Commercial Refrigerator",
    slug: "commercial-refrigerator",
    image: "/appliances/commercial-refrigerator.png",
  },
] as const;

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
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {appliances.map((item, index) => (
            <motion.article
              key={item.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="group overflow-hidden rounded-lg border border-border bg-surface text-center shadow-sm transition-shadow hover:shadow-md sm:rounded-2xl"
            >
              {/* Нейтральний суцільний фон під PNG зі своїм сірим полем — без «рамки в рамці» від градієнта */}
              <div className="relative h-36 w-full overflow-hidden bg-[#ebebeb] sm:h-56">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  className="object-contain object-center p-2 sm:p-3"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                />
                <div
                  className="pointer-events-none absolute inset-0 shadow-[inset_0_0_32px_rgba(0,0,0,0.06)] ring-1 ring-inset ring-black/[0.04] transition duration-300 group-hover:shadow-[inset_0_0_40px_rgba(0,0,0,0.08)]"
                  aria-hidden
                />
              </div>
              <h3 className="px-2 py-3 text-xs font-semibold leading-snug text-foreground sm:px-3 sm:py-4 sm:text-sm">
                {item.name}
              </h3>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
