import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { ContactSection } from "@/components/sections/contact-section";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { RelatedServicesCarousel } from "@/components/service-pages/related-services-carousel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BookOnlineButton } from "@/components/ui/book-online-button";
import { FadeUp } from "@/components/ui/fade-up";
import { GoogleReviewsBadge } from "@/components/ui/google-reviews-badge";
import { MobileStickyActions } from "@/components/ui/mobile-sticky-actions";
import { SectionHeading } from "@/components/ui/section-heading";
import { TrackedAnchor } from "@/components/ui/tracked-anchor";
import { brandPagesDirectory, getBrandPageByName } from "@/content/brand-pages";
import { serviceAreaPagesDirectory } from "@/content/service-areas";
import { servicePagesDirectory, type ServicePageContent } from "@/content/service-pages";

const brandLogoMap = Object.fromEntries(
  brandPagesDirectory.map((brand) => [brand.name, brand.logo]),
);

const relatedServicePriorityMap: Record<string, string[]> = {
  "refrigerator-repair-charlotte-nc": [
    "freezer-repair-charlotte-nc",
    "wine-cooler-repair-charlotte-nc",
    "commercial-refrigerator-repair-charlotte-nc",
    "ice-machine-repair-charlotte-nc",
  ],
  "washer-repair-charlotte-nc": [
    "dryer-repair-charlotte-nc",
    "dishwasher-repair-charlotte-nc",
    "oven-repair-charlotte-nc",
  ],
  "dryer-repair-charlotte-nc": [
    "washer-repair-charlotte-nc",
    "dishwasher-repair-charlotte-nc",
    "oven-repair-charlotte-nc",
  ],
  "dishwasher-repair-charlotte-nc": [
    "washer-repair-charlotte-nc",
    "dryer-repair-charlotte-nc",
    "cooktop-repair-charlotte-nc",
    "oven-repair-charlotte-nc",
  ],
  "oven-repair-charlotte-nc": [
    "cooktop-repair-charlotte-nc",
    "dishwasher-repair-charlotte-nc",
    "washer-repair-charlotte-nc",
  ],
  "cooktop-repair-charlotte-nc": [
    "oven-repair-charlotte-nc",
    "dishwasher-repair-charlotte-nc",
    "refrigerator-repair-charlotte-nc",
  ],
  "freezer-repair-charlotte-nc": [
    "refrigerator-repair-charlotte-nc",
    "wine-cooler-repair-charlotte-nc",
    "commercial-refrigerator-repair-charlotte-nc",
    "ice-machine-repair-charlotte-nc",
  ],
  "ice-machine-repair-charlotte-nc": [
    "refrigerator-repair-charlotte-nc",
    "freezer-repair-charlotte-nc",
    "commercial-refrigerator-repair-charlotte-nc",
    "wine-cooler-repair-charlotte-nc",
  ],
  "wine-cooler-repair-charlotte-nc": [
    "refrigerator-repair-charlotte-nc",
    "freezer-repair-charlotte-nc",
    "commercial-refrigerator-repair-charlotte-nc",
    "ice-machine-repair-charlotte-nc",
  ],
  "commercial-refrigerator-repair-charlotte-nc": [
    "refrigerator-repair-charlotte-nc",
    "freezer-repair-charlotte-nc",
    "ice-machine-repair-charlotte-nc",
    "wine-cooler-repair-charlotte-nc",
  ],
};

const heroBackgroundByAppliance: Record<string, string> = {
  Refrigerator: "/images/refrigerator-flag-hero.png",
  Washer: "/images/washer-flag-hero.png",
  Dryer: "/images/dryer-flag-hero.png",
  Dishwasher: "/images/dishwasher-flag-hero.png",
  Oven: "/images/oven-flag-hero.png",
  Cooktop: "/images/cooktop-flag-hero.png",
  Freezer: "/images/freezer-flag-hero.png",
  "Ice Machine": "/images/ice-machine-flag-hero.png",
  "Wine Cooler": "/images/wine-cooler-flag-hero.png",
  "Commercial Refrigerator": "/images/commercial-refrigerator-flag-hero.png",
};

const featuredServiceAreaNames = [
  "Charlotte",
  "Mint Hill",
  "Matthews",
  "Huntersville",
  "Fort Mill",
  "Waxhaw",
];

type ServicePageTemplateProps = {
  page: ServicePageContent;
  bookingEyebrow: string;
  bookingTitle: string;
  bookingDescription: string;
  bookingSource: string;
  bookingSuccessMessage: string;
};

export function buildServicePageMetadata(page: ServicePageContent): Metadata {
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical: `/${page.slug}`,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `/${page.slug}`,
      type: "article",
    },
  };
}

export function ServicePageTemplate({
  page,
  bookingEyebrow,
  bookingTitle,
  bookingDescription,
  bookingSource,
  bookingSuccessMessage,
}: ServicePageTemplateProps) {
  const serviceLabel = `${page.applianceName} Repair`;
  const applianceLower = page.applianceName.toLowerCase();
  const serviceAudience =
    page.applianceName === "Commercial Refrigerator"
      ? "Charlotte-area businesses and property owners"
      : "Charlotte homeowners";
  const brandSectionDescription =
    page.applianceName === "Commercial Refrigerator"
      ? "We work on many common commercial refrigeration and cooling brands found across Charlotte businesses."
      : `We work on many common household ${applianceLower} brands found across Charlotte homes.`;
  const heroBackground =
    heroBackgroundByAppliance[page.applianceName] ?? "/images/appliance-hero-flag-base.png";
  const featuredServiceAreas = featuredServiceAreaNames
    .map((city) => serviceAreaPagesDirectory.find((area) => area.city === city))
    .filter((area): area is (typeof serviceAreaPagesDirectory)[number] => Boolean(area));
  const featuredBrands = page.brands.slice(0, 12);
  const additionalBrandCount = Math.max(page.brands.length - featuredBrands.length, 0);
  const preferredRelatedSlugs = relatedServicePriorityMap[page.slug] ?? [];
  const relatedServices = servicePagesDirectory
    .filter((item) => item.slug !== page.slug)
    .sort((left, right) => {
      const leftIndex = preferredRelatedSlugs.indexOf(left.slug);
      const rightIndex = preferredRelatedSlugs.indexOf(right.slug);

      if (leftIndex !== -1 && rightIndex !== -1) {
        return leftIndex - rightIndex;
      }

      if (leftIndex !== -1) {
        return -1;
      }

      if (rightIndex !== -1) {
        return 1;
      }

      return left.applianceName.localeCompare(right.applianceName);
    });

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: serviceLabel,
    serviceType: serviceLabel,
    provider: {
      "@type": "LocalBusiness",
      name: "DAPL Appliance Repair",
      telephone: "+1-980-393-6588",
      url: "https://www.daplappliance.com",
      areaServed: "Charlotte, NC and surrounding areas",
    },
    areaServed: {
      "@type": "City",
      name: "Charlotte",
    },
    description: page.metaDescription,
    url: `https://www.daplappliance.com/${page.slug}`,
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
        name: "Appliance Repair Charlotte, NC",
        item: "https://www.daplappliance.com/appliance-repair-charlotte-nc",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: serviceLabel,
        item: `https://www.daplappliance.com/${page.slug}`,
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const featuredAreaLabel = featuredServiceAreas
    .slice(0, 4)
    .map((area) => `${area.city}, ${area.state}`)
    .join(" · ");

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground sm:pb-0">
      <Header logoHref="/" />
      <main>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Appliance Repair Charlotte, NC", href: "/appliance-repair-charlotte-nc" },
            { label: serviceLabel },
          ]}
        />

        <section
          id="top"
          className="relative flex min-h-[calc(100svh-8.25rem)] items-start overflow-hidden bg-surface py-3 sm:py-7 lg:py-8"
        >
          <Image
            src={heroBackground}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[68%_center] sm:object-[72%_center] lg:object-contain lg:object-right"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.93)_38%,rgba(255,255,255,0.58)_62%,rgba(255,255,255,0.12)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,42,86,0.03),rgba(255,255,255,0.16)_72%,rgba(255,255,255,0.82)_100%)]" />
          <div className="container-shell relative grid items-center gap-6">
            <FadeUp>
              <GoogleReviewsBadge location={page.slug} className="mb-1 inline-flex sm:mb-2" />
              <p className="mt-3 whitespace-nowrap text-[0.68rem] font-black uppercase tracking-[0.13em] text-primary/75 sm:mt-5 sm:text-sm sm:tracking-[0.24em]">
                DAPL Appliance Repair · Charlotte, NC
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:mt-4 sm:text-5xl lg:text-6xl">
                {page.heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl overflow-hidden text-base leading-6 text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] sm:mt-4 sm:block sm:text-lg sm:leading-8">
                {page.heroDescription}
              </p>

              <div className="mt-5 hidden flex-wrap gap-2.5 sm:flex">
                <span className="inline-flex items-center rounded-full border border-primary/10 bg-white/95 px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm">
                  <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-accent" />
                  Same-day options when available
                </span>
                <span className="inline-flex items-center rounded-full border border-primary/10 bg-white/95 px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm">
                  <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-accent" />
                  Clear diagnosis before major repairs
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
                <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
                <span>Serving</span>
                <span className="min-w-0">{featuredAreaLabel}</span>
                <span className="text-muted">and nearby areas</span>
              </div>

              <div className="mt-6 hidden max-w-2xl gap-3 sm:grid sm:grid-cols-[1fr_0.72fr_1.08fr]">
                <TrackedAnchor
                  href="#contact"
                  gtmEvent={{
                    event: "schedule_click",
                    location: page.slug,
                    appliance: page.applianceName,
                  }}
                  aria-label={`Schedule ${serviceLabel}`}
                  className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-accent px-5 py-2.5 text-center text-sm font-semibold leading-tight text-accent-foreground shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:brightness-95"
                >
                  Schedule repair
                </TrackedAnchor>
                <BookOnlineButton
                  location={page.slug}
                  gtmEvent={{ appliance: page.applianceName }}
                  className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-primary/20 bg-white px-4 py-2.5 text-center text-sm font-semibold leading-tight text-primary transition hover:-translate-y-0.5 hover:bg-primary/5"
                />
                <TrackedAnchor
                  href="tel:+19803936588"
                  gtmEvent={{
                    event: "phone_click",
                    location: page.slug,
                    link_type: "primary_cta",
                    appliance: page.applianceName,
                  }}
                  className="inline-flex min-h-[50px] items-center justify-center whitespace-nowrap rounded-full border border-primary/20 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Call +1 (980) 393-6588
                </TrackedAnchor>
              </div>

              <div className="mt-5 hidden max-w-2xl rounded-2xl border border-primary/10 bg-white/90 p-3.5 shadow-sm backdrop-blur sm:block sm:p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">
                  What happens next
                </p>
                <ol className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {["Call / book", "Diagnosis", "Approve plan", "Repair & test"].map(
                    (step, index) => (
                      <li key={step} className="flex items-center gap-1.5 text-xs font-bold text-primary sm:text-sm">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[0.7rem] text-white">
                          {index + 1}
                        </span>
                        <span className="whitespace-nowrap">{step}</span>
                        {index < 3 ? (
                          <ArrowRight className="ml-auto hidden h-4 w-4 text-accent sm:block" aria-hidden="true" />
                        ) : null}
                      </li>
                    ),
                  )}
                </ol>
              </div>

            </FadeUp>

          </div>
          <a
            href="#details"
            className="service-hero-arrow absolute bottom-3 left-1/2 hidden h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-primary/15 bg-white text-[1.35rem] text-primary shadow-md shadow-primary/10 transition hover:border-primary/25 hover:shadow-lg md:inline-flex"
            aria-label="Scroll to details"
          >
            {"\u2193"}
          </a>
        </section>

        <MobileStickyActions />

        <section id="details" className="bg-background py-16 sm:py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow={`Common ${page.applianceName} Problems`}
                title="What we help fix"
                description={`We focus on the ${applianceLower} issues ${serviceAudience} deal with most often, with practical guidance before major repair decisions.`}
              />
            </FadeUp>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {page.commonIssues.map((issue, index) => (
                <FadeUp key={issue.title} delay={index * 0.05}>
                  <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-primary">{issue.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted">
                      {issue.text}
                    </p>
                  </article>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f2f5f9] py-16 sm:py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow="Brands We Service"
                title="Major brands we work on"
                description={brandSectionDescription}
              />
            </FadeUp>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4">
              {featuredBrands.map((brand, index) => {
                const brandPage = getBrandPageByName(brand);

                return (
                  <FadeUp key={brand} delay={index * 0.05}>
                    <Link
                      href={brandPage ? `/brands/${brandPage.slug}` : "/#brands"}
                      className="flex h-full min-h-[88px] items-center justify-center rounded-xl border border-border bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:min-h-[128px] sm:rounded-2xl sm:px-5 sm:py-5"
                      aria-label={`${brand} appliance repair in Charlotte, NC`}
                    >
                      {brandLogoMap[brand] ? (
                        <Image
                          src={brandLogoMap[brand]}
                          alt={`${brand} logo`}
                          width={180}
                          height={64}
                          className="max-h-18 w-full object-contain sm:max-h-14"
                          unoptimized
                        />
                      ) : (
                        <span className="text-center text-sm font-semibold text-foreground">
                          {brand}
                        </span>
                      )}
                    </Link>
                  </FadeUp>
                );
              })}
            </div>
            {additionalBrandCount > 0 ? (
              <FadeUp delay={0.2} className="mt-8 text-center">
                <Link
                  href="/#brands"
                  className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-3 text-sm font-black text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/5 hover:shadow-md"
                >
                  See {additionalBrandCount}+ more brands we service
                </Link>
              </FadeUp>
            ) : null}
          </div>
        </section>

        <section className="bg-background py-16 sm:py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow="How Service Works"
                title={`What to expect when you book ${applianceLower} repair`}
                description={`We keep the process simple, responsive, and focused on helping you understand the condition of your ${applianceLower}.`}
              />
            </FadeUp>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {page.process.map((step, index) => (
                <FadeUp key={step.title} delay={index * 0.08}>
                  <article className="flex h-full min-h-[220px] flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-3 text-lg font-bold text-primary">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted">{step.text}</p>
                  </article>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="bg-[#f2f5f9] py-16 sm:py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow={`${page.applianceName} Repair FAQ`}
                title="Questions Charlotte customers often ask"
                description="A few quick answers before you book your service call."
              />
            </FadeUp>
            <div className="mx-auto mt-10 max-w-4xl space-y-4">
              {page.faqs.map((item, index) => (
                <FadeUp key={item.question} delay={index * 0.05}>
                  <details className="group rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <summary className="cursor-pointer list-none text-left text-base font-semibold text-foreground marker:hidden">
                      <span className="flex items-center justify-between gap-4">
                        {item.question}
                        <span className="text-primary transition group-open:rotate-45">+</span>
                      </span>
                    </summary>
                    <p className="mt-4 text-sm leading-7 text-muted">{item.answer}</p>
                  </details>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-background py-16 sm:py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow="Related Repair Services"
                title="Explore more appliance repair pages"
                description="If you are comparing problems across appliances or browsing another service need, you can keep going through the full set of service pages here."
              />
            </FadeUp>
            <RelatedServicesCarousel items={relatedServices} />
          </div>
        </section>

        <ContactSection
          eyebrow={bookingEyebrow}
          title={bookingTitle}
          description={bookingDescription}
          source={bookingSource}
          defaultAppliance={page.applianceName}
          successMessage={bookingSuccessMessage}
        />

        <section className="bg-primary py-16 text-primary-foreground">
          <div className="container-shell flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/75">
                Continue Browsing
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                Need a different appliance service?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
                You can return to the main page to see all appliance categories, brand coverage,
                current offers, and additional service information.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#appliances"
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-95"
              >
                View All Appliances
              </Link>
              <Link
                href="/#brands"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-white/15"
              >
                See Brand Coverage
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </div>
  );
}
