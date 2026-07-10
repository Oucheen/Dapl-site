import type { Metadata } from "next";
import Link from "next/link";
import { ContactSection } from "@/components/sections/contact-section";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { FadeUp } from "@/components/ui/fade-up";
import { HousecallProActions } from "@/components/ui/housecall-pro-actions";
import { serviceAreaPagesDirectory } from "@/content/service-areas";

export const metadata: Metadata = {
  title: "Book Appliance Repair in Charlotte, NC | DAPL Appliance Repair",
  description:
    "Book appliance repair service with DAPL Appliance Repair in Charlotte, NC. Request help for refrigerators, washers, dryers, dishwashers, ovens, and more.",
  alternates: {
    canonical: "/booking",
  },
  openGraph: {
    title: "Book Appliance Repair | DAPL Appliance Repair",
    description:
      "Book appliance repair service with DAPL Appliance Repair in Charlotte, NC and surrounding areas.",
    url: "/booking",
    type: "website",
  },
};

const bookingPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Book Appliance Repair",
  url: "https://www.daplappliance.com/booking",
  description:
    "Book appliance repair service with DAPL Appliance Repair in Charlotte, NC and surrounding areas.",
  mainEntity: {
    "@type": "LocalBusiness",
    name: "DAPL Appliance Repair",
    telephone: "+1-704-266-0508",
    email: "dapl.appliance.repair@gmail.com",
    url: "https://www.daplappliance.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "9401 Peckham Rye Rd",
      addressLocality: "Charlotte",
      addressRegion: "NC",
      postalCode: "28227",
      addressCountry: "US",
    },
    areaServed: serviceAreaPagesDirectory.map((area) => ({
      "@type": "City",
      name: area.city,
      addressRegion: area.state,
      addressCountry: "US",
    })),
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://www.daplappliance.com/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Booking",
      item: "https://www.daplappliance.com/booking",
    },
  ],
};

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header logoHref="/" />
      <main>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Booking" }]} />

        <section className="bg-gradient-to-br from-white via-surface to-white py-16 sm:py-20">
          <div className="container-shell">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <FadeUp>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">
                  Online Booking
                </p>
                <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                  Book appliance repair in Charlotte, NC
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
                  Tell us what is going on with your appliance and we will follow up with the
                  most practical next step. Same-day visits are available when scheduling allows.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <HousecallProActions />
                  <a
                    href="tel:+17042660508"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition hover:brightness-95 sm:w-auto"
                  >
                    Call +1 (704) 266-0508
                  </a>
                </div>
              </FadeUp>

              <FadeUp delay={0.08}>
                <div className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                        Phone
                      </p>
                      <a
                        href="tel:+17042660508"
                        className="mt-2 block text-lg font-bold text-primary hover:underline"
                      >
                        +1 (704) 266-0508
                      </a>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                        Hours
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        Mon-Sun, 8:00 AM - 8:00 PM
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                        Location
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        9401 Peckham Rye Rd, Charlotte, NC 28227
                      </p>
                      <a
                        href="https://www.google.com/maps/search/?api=1&query=9401%20Peckham%20Rye%20Rd%2C%20Charlotte%2C%20NC%2028227"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                        Service Areas
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
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
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        <ContactSection
          eyebrow="Service Request"
          title="Send us the repair details"
          description="Use this form for scheduling requests, appliance symptoms, and questions about availability. For urgent issues, calling is fastest."
          source="booking-page"
          successMessage="Thank you. Your request was sent and we will contact you soon."
        />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookingPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </div>
  );
}
