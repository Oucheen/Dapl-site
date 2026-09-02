"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { brandPagesDirectory } from "@/content/brand-pages";
import { serviceAreaPagesDirectory } from "@/content/service-areas";

const popularServiceAreas = [
  "Mint Hill, NC",
  "Charlotte, NC",
  "Matthews, NC",
  "Indian Trail, NC",
  "Concord, NC",
  "Waxhaw, NC",
];

const popularBrands = [
  "Whirlpool",
  "GE",
  "Samsung",
  "LG",
  "KitchenAid",
  "Bosch",
  "Frigidaire",
  "Maytag",
];

const featuredServiceAreas = popularServiceAreas
  .map((label) => serviceAreaPagesDirectory.find((area) => area.label === label))
  .filter((area): area is NonNullable<typeof area> => Boolean(area));

const featuredBrands = popularBrands
  .map((name) => brandPagesDirectory.find((brand) => brand.name === name))
  .filter((brand): brand is NonNullable<typeof brand> => Boolean(brand));

export function Footer() {
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const visibleServiceAreas = showAllAreas ? serviceAreaPagesDirectory : featuredServiceAreas;
  const visibleBrands = showAllBrands ? brandPagesDirectory : featuredBrands;

  return (
    <footer className="border-t border-primary/15 bg-surface">
      <div className="h-5 bg-primary" aria-hidden />
      <div className="container-shell">
        <div className="grid gap-8 py-9 lg:grid-cols-[1fr_1.55fr] lg:items-start">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <Image src="/logo.jpg" alt="DAPL Appliance Repair logo" width={64} height={64} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  DAPL
                </p>
                <p className="text-base font-bold text-primary">Appliance Repair</p>
              </div>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">
              Professional appliance repair for homes and businesses across Mint Hill, Charlotte,
              and nearby service areas.
            </p>
            <Link href="/blog" className="mt-4 inline-flex text-sm font-bold text-primary underline-offset-4 hover:underline">
              Appliance care &amp; repair blog
            </Link>
          </div>

          <div className="space-y-6">
            <div className="grid gap-5 text-sm leading-6 text-muted sm:grid-cols-3">
              <address className="not-italic">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
                  Contact
                </p>
                <p className="mt-3">
                  <a href="tel:+17042660508" className="font-semibold text-primary hover:underline">
                    +1 (704) 266-0508
                  </a>
                </p>
                <p className="mt-1">
                  <a
                    href="mailto:dapl.appliance.repair@gmail.com"
                    className="break-words hover:text-primary"
                  >
                    dapl.appliance.repair@gmail.com
                  </a>
                </p>
              </address>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
                  Location
                </p>
                <p className="mt-3">9401 Peckham Rye Rd</p>
                <p>Mint Hill, NC 28227</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
                  Working Hours
                </p>
                <p className="mt-3">Monday - Sunday</p>
                <p>7:00 AM - 8:00 PM ET</p>
              </div>
            </div>

            <div className="grid gap-5 border-t border-border pt-5 text-sm leading-6 text-muted md:grid-cols-2">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
                    Service Areas
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAllAreas((isShown) => !isShown)}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                    aria-expanded={showAllAreas}
                  >
                    {showAllAreas ? "Show less" : "View all areas"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {visibleServiceAreas.map((area) => (
                    <Link
                      key={area.slug}
                      href={`/${area.slug}`}
                      className="underline-offset-4 hover:text-primary hover:underline"
                    >
                      {area.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
                    Brand Repair
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAllBrands((isShown) => !isShown)}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                    aria-expanded={showAllBrands}
                  >
                    {showAllBrands ? "Show less" : "View all brands"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {visibleBrands.map((brand) => (
                    <Link
                      key={brand.slug}
                      href={`/brands/${brand.slug}`}
                      className="underline-offset-4 hover:text-primary hover:underline"
                    >
                      {brand.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border py-5 text-xs leading-6 text-muted">
          <p>
            &copy; {new Date().getFullYear()} DAPL Appliance Repair. All rights reserved.{" "}
            <Link href="/privacy-policy" className="font-semibold text-primary hover:underline">
              Privacy Policy
            </Link>
            {" | "}
            <Link href="/terms-and-conditions" className="font-semibold text-primary hover:underline">
              Terms and Conditions
            </Link>
          </p>
          <p className="mt-1">
            DAPL Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.
          </p>
        </div>
      </div>
    </footer>
  );
}
