import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactSection } from "@/components/sections/contact-section";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { RelatedServicesCarousel } from "@/components/service-pages/related-services-carousel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";
import { TrackedAnchor } from "@/components/ui/tracked-anchor";
import { getBrandPageByName } from "@/content/brand-pages";
import { servicePagesDirectory, type ServicePageContent } from "@/content/service-pages";

const brandLogoMap: Record<string, string> = {
  Whirlpool: "/brands/whirlpool.svg",
  GE: "/brands/general-electric.svg",
  Samsung: "/brands/samsung.svg",
  LG: "/brands/lg-electronics.svg",
  KitchenAid: "/brands/kitchen-aid.svg",
  Maytag: "/brands/maytag-3.svg",
  Bosch: "/brands/bosch-1.svg",
  Frigidaire: "/brands/frigidaire.svg",
};

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
  const serviceBreadcrumbItems = servicePagesDirectory.map((service) => ({
    label: `${service.applianceName} Repair`,
    href: `/${service.slug}`,
  }));
  const applianceLower = page.applianceName.toLowerCase();
  const serviceAudience =
    page.applianceName === "Commercial Refrigerator"
      ? "Charlotte-area businesses and property owners"
      : "Charlotte homeowners";
  const brandSectionDescription =
    page.applianceName === "Commercial Refrigerator"
      ? "We work on many common commercial refrigeration and cooling brands found across Charlotte businesses."
      : `We work on many common household ${applianceLower} brands found across Charlotte homes.`;
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
      telephone: "+1-704-266-0508",
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header logoHref="/" />
      <main>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            {
              label: "Services",
              href: "/#appliances",
              dropdownItems: serviceBreadcrumbItems,
            },
            { label: serviceLabel },
          ]}
        />

        <section className="relative flex min-h-[calc(100svh-5rem)] items-center overflow-hidden bg-surface py-16 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,42,86,0.11),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(207,36,49,0.08),_transparent_30%)]" />
          <div className="container-shell relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <FadeUp>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                {serviceLabel}
              </p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {page.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
                {page.heroDescription}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <div className="inline-flex items-center rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                  <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-accent" />
                  Same-day appointments when available
                </div>
                <div className="inline-flex items-center rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                  <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-accent" />
                  Charlotte, NC and surrounding areas
                </div>
                <div className="inline-flex items-center rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                  <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-accent" />
                  Honest recommendations before major repairs
                </div>
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <TrackedAnchor
                  href="#contact"
                  gtmEvent={{
                    event: "schedule_click",
                    location: page.slug,
                    appliance: page.applianceName,
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:brightness-95"
                >
                  Schedule {serviceLabel}
                </TrackedAnchor>
                <TrackedAnchor
                  href="tel:+17042660508"
                  gtmEvent={{
                    event: "phone_click",
                    location: page.slug,
                    link_type: "primary_cta",
                    appliance: page.applianceName,
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Call +1 (704) 266-0508
                </TrackedAnchor>
              </div>

              <div className="mt-10 hidden justify-center sm:mt-12 md:flex lg:justify-start">
                <a
                  href="#details"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/15 bg-white text-[1.35rem] text-primary shadow-md shadow-primary/10 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg motion-safe:animate-bounce"
                  aria-label="Scroll to details"
                >
                  {"\u2193"}
                </a>
              </div>
            </FadeUp>

            <FadeUp delay={0.08}>
              <div className="rounded-3xl border border-border bg-white p-5 shadow-lg shadow-primary/10">
                <div className="rounded-2xl bg-[linear-gradient(145deg,rgba(15,42,86,0.06),rgba(207,36,49,0.08))] p-6 sm:p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                      <div className="max-w-none sm:max-w-sm sm:pr-0">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                          Local Service
                        </p>
                        <h2 className="mt-3 text-[2.35rem] leading-[1] font-black tracking-tight text-primary sm:text-4xl sm:leading-tight">
                          {page.localServiceTitle}
                        </h2>
                        <Image
                          src={page.image}
                          alt={`${page.applianceName} appliance we repair`}
                          width={152}
                          height={152}
                          className="mx-auto mt-4 object-contain drop-shadow-[0_12px_20px_rgba(15,42,86,0.12)] sm:hidden"
                        />
                        <p className="mx-auto mt-4 max-w-[18rem] text-center text-[0.98rem] leading-7 text-muted sm:mx-0 sm:mt-3 sm:max-w-sm sm:text-left sm:text-sm sm:leading-7">
                          {page.localServiceDescription}
                        </p>
                      </div>
                    <Image
                      src={page.image}
                      alt={`${page.applianceName} appliance we repair`}
                      width={148}
                      height={148}
                      className="hidden h-auto max-w-[148px] object-contain drop-shadow-[0_14px_24px_rgba(15,42,86,0.14)] sm:block sm:w-full"
                    />
                  </div>

                  <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2">
                    {page.serviceHighlights.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-border bg-white px-5 py-4 text-[0.95rem] leading-6 font-medium text-foreground shadow-sm sm:px-4 sm:text-sm sm:leading-normal"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        <section id="details" className="bg-background py-20">
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

        <section className="bg-[#f2f5f9] py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow="Brands We Service"
                title="Major brands we work on"
                description={brandSectionDescription}
              />
            </FadeUp>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4">
              {page.brands.map((brand, index) => {
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
          </div>
        </section>

        <section className="bg-background py-20">
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

        <section id="faq" className="bg-[#f2f5f9] py-20">
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

        <section className="bg-background py-20">
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
