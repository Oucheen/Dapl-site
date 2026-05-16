"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

type ApplianceCard = {
  name: string;
  slug: string;
  image: string;
  href?: string;
};

const appliances: ApplianceCard[] = [
  {
    name: "Refrigerator",
    slug: "refrigerator",
    image: "/appliances/refrigerator.png",
    href: "/refrigerator-repair-charlotte-nc",
  },
  {
    name: "Washer",
    slug: "washer",
    image: "/appliances/washer.png",
    href: "/washer-repair-charlotte-nc",
  },
  {
    name: "Dryer",
    slug: "dryer",
    image: "/appliances/dryer.png",
    href: "/dryer-repair-charlotte-nc",
  },
  {
    name: "Dishwasher",
    slug: "dishwasher",
    image: "/appliances/dishwasher.png",
    href: "/dishwasher-repair-charlotte-nc",
  },
  {
    name: "Oven",
    slug: "oven",
    image: "/appliances/oven.png",
    href: "/oven-repair-charlotte-nc",
  },
  {
    name: "Cooktop",
    slug: "cooktop",
    image: "/appliances/cooktop.png",
    href: "/cooktop-repair-charlotte-nc",
  },
  {
    name: "Freezer",
    slug: "freezer",
    image: "/appliances/freezer.png",
    href: "/freezer-repair-charlotte-nc",
  },
  {
    name: "Ice Machine",
    slug: "ice-machine",
    image: "/appliances/ice-machine.png",
    href: "/ice-machine-repair-charlotte-nc",
  },
  {
    name: "Wine Cooler",
    slug: "wine-cooler",
    image: "/appliances/wine-cooler.png",
    href: "/wine-cooler-repair-charlotte-nc",
  },
  {
    name: "Commercial Refrigerator",
    slug: "commercial-refrigerator",
    image: "/appliances/commercial-refrigerator.png",
    href: "/commercial-refrigerator-repair-charlotte-nc",
  },
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
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {appliances.map((item, index) => {
            const cardBody = (
              <>
                <div className="relative h-36 w-full overflow-hidden bg-[#ebebeb] sm:h-56">
                  <Image
                    src={item.image}
                    alt={`${item.name} appliance we repair`}
                    fill
                    className="object-contain object-center p-2 sm:p-3"
                    sizes="(max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 20vw"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 shadow-[inset_0_0_32px_rgba(0,0,0,0.06)] ring-1 ring-inset ring-black/[0.04] transition duration-300 group-hover:shadow-[inset_0_0_40px_rgba(0,0,0,0.08)]"
                    aria-hidden
                  />
                </div>
                <div className="px-2 py-3 sm:px-3 sm:py-4">
                  <h3 className="text-xs font-semibold leading-snug text-foreground sm:text-sm">
                    {item.name}
                  </h3>
                  {item.href ? (
                    <p className="mt-1 text-[11px] font-medium text-primary sm:text-xs">
                      Learn more
                    </p>
                  ) : null}
                </div>
              </>
            );

            return (
              <motion.article
                key={item.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{ y: -5 }}
                className="group overflow-hidden rounded-lg border border-border bg-surface text-center shadow-sm transition-shadow hover:shadow-md sm:rounded-2xl"
              >
                {item.href ? (
                  <Link href={item.href} className="block">
                    {cardBody}
                  </Link>
                ) : (
                  cardBody
                )}
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
