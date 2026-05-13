import Image from "next/image";
import Link from "next/link";
import { brandPagesDirectory } from "@/content/brand-pages";
import { serviceAreaPagesDirectory } from "@/content/service-areas";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-8">
      <div className="container-shell">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr] lg:items-start">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/logo.jpg" alt="Dapl Appliance Repair logo" width={64} height={64} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Dapl
                </p>
                <p className="text-base font-bold text-primary">Appliance Repair</p>
              </div>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">
              Professional appliance repair services for homeowners and businesses in Charlotte, NC and surrounding areas.
            </p>
          </div>

          <div className="space-y-5">
            <div className="grid gap-5 text-sm leading-6 text-muted sm:grid-cols-3">
              <address className="not-italic">
                <p className="font-semibold text-foreground">Contact</p>
                <p className="mt-2">
                  <a href="tel:+17042660508" className="hover:text-primary">
                    +1 (704) 266-0508
                  </a>
                </p>
                <p>
                  <a href="mailto:dapl.appliance.repair@gmail.com" className="break-words hover:text-primary">
                    dapl.appliance.repair@gmail.com
                  </a>
                </p>
              </address>

              <div>
                <p className="font-semibold text-foreground">Location</p>
                <p className="mt-2">9401 Peckham Rye Rd</p>
                <p>Charlotte, NC 28227</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=9401%20Peckham%20Rye%20Rd%2C%20Charlotte%2C%20NC%2028227"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
                >
                  <span className="text-[#4285f4]">Open</span>
                  <span className="text-[#ea4335]">in</span>
                  <span className="text-[#fbbc05]">Google</span>
                  <span className="text-[#34a853]">Maps</span>
                </a>
              </div>

              <div>
                <p className="font-semibold text-foreground">Working Hours</p>
                <p className="mt-2">Monday - Sunday</p>
                <p>8:00 AM - 8:00 PM ET</p>
              </div>
            </div>

            <div className="border-t border-border pt-4 text-sm leading-6 text-muted">
              <p className="font-semibold text-foreground">Service Areas</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {serviceAreaPagesDirectory.map((area) => (
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

            <div className="border-t border-border pt-4 text-sm leading-6 text-muted">
              <p className="font-semibold text-foreground">Brand Repair</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {brandPagesDirectory.map((brand) => (
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

        <p className="mt-6 border-t border-border pt-5 text-xs text-muted">
          © {new Date().getFullYear()} Dapl Appliance Repair. All rights reserved.{" "}
          <Link href="/privacy-policy" className="font-semibold text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </footer>
  );
}
