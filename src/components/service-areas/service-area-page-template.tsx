import type { Metadata } from "next";
import Link from "next/link";
import { ContactSection } from "@/components/sections/contact-section";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BookOnlineButton } from "@/components/ui/book-online-button";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";
import { TrackedAnchor } from "@/components/ui/tracked-anchor";
import {
  getServiceCategoryCardDescription,
  servicePagesDirectory,
} from "@/content/service-pages";
import {
  serviceAreaPagesDirectory,
  type ServiceAreaPageContent,
} from "@/content/service-areas";

type ServiceAreaPageTemplateProps = {
  page: ServiceAreaPageContent;
};

const expandedNearbyCities = [
  "Mint Hill",
  "Matthews",
  "Charlotte",
  "Indian Trail",
  "Harrisburg",
  "Concord",
  "Huntersville",
  "Cornelius",
  "Davidson",
  "Weddington",
  "Waxhaw",
  "Stallings",
  "Monroe",
  "Fort Mill",
  "Tega Cay",
  "Indian Land",
  "Steele Creek",
  "Rock Hill",
];

function jsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildServiceAreaMetadata(page: ServiceAreaPageContent): Metadata {
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

export function ServiceAreaPageTemplate({ page }: ServiceAreaPageTemplateProps) {
  const cityLabel = `${page.city}, ${page.state}`;
  const relatedAreaNames = [...page.nearbyCities, ...expandedNearbyCities].filter(
    (city, index, areas) => city !== page.city && areas.indexOf(city) === index,
  );
  const relatedAreas = relatedAreaNames
    .map((city) => serviceAreaPagesDirectory.find((area) => area.city === city))
    .filter((area): area is (typeof serviceAreaPagesDirectory)[number] => Boolean(area))
    .slice(0, 10);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Appliance Repair in ${cityLabel}`,
    serviceType: "Appliance Repair Service",
    provider: {
      "@type": "LocalBusiness",
      name: "DAPL Appliance Repair",
      telephone: "+1-704-266-0508",
      url: "https://www.daplappliance.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "9401 Peckham Rye Rd",
        addressLocality: "Mint Hill",
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
    areaServed: {
      "@type": "City",
      name: page.city,
      addressRegion: page.state,
      addressCountry: "US",
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
        name: `Appliance Repair in ${cityLabel}`,
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
            { label: "Service Areas" },
            { label: `Appliance Repair in ${cityLabel}` },
          ]}
        />

        <section className="relative overflow-hidden bg-surface py-16 sm:py-20 lg:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,42,86,0.11),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(207,36,49,0.08),_transparent_30%)]" />
          <div className="container-shell relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <FadeUp>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                Service Area
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
                  {page.countyOrArea}
                </div>
                <div className="inline-flex items-center rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                  <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-accent" />
                  Same-day service when available
                </div>
                <div className="inline-flex items-center rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                  <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-accent" />
                  Call to confirm route availability
                </div>
              </div>

              <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-[1fr_0.72fr_1.08fr]">
                <TrackedAnchor
                  href="#contact"
                  gtmEvent={{
                    event: "schedule_click",
                    location: page.slug,
                    service_area: cityLabel,
                  }}
                  aria-label={`Schedule service in ${cityLabel}`}
                  className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold leading-tight text-accent-foreground shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:brightness-95"
                >
                  Schedule service
                </TrackedAnchor>
                <BookOnlineButton
                  location={page.slug}
                  gtmEvent={{ service_area: cityLabel }}
                  className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-primary/20 bg-white px-5 py-3 text-center text-sm font-semibold leading-tight text-primary transition hover:-translate-y-0.5 hover:bg-primary/5"
                />
                <TrackedAnchor
                  href="tel:+17042660508"
                  gtmEvent={{
                    event: "phone_click",
                    location: page.slug,
                    link_type: "service_area_hero",
                    service_area: cityLabel,
                  }}
                  className="inline-flex min-h-[54px] items-center justify-center whitespace-nowrap rounded-full border border-primary/20 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Call +1 (704) 266-0508
                </TrackedAnchor>
              </div>
            </FadeUp>

            <FadeUp delay={0.08}>
              <div className="rounded-3xl border border-border bg-white p-5 shadow-lg shadow-primary/10">
                <div className="rounded-2xl bg-[linear-gradient(145deg,rgba(15,42,86,0.06),rgba(207,36,49,0.08))] p-6 sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                    Local Route
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-primary sm:text-4xl">
                    {page.introTitle}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
                    {page.introText}
                  </p>
                  <div className="mt-6 grid gap-3">
                    {page.localNotes.map((note) => (
                      <div
                        key={note}
                        className="rounded-2xl border border-border bg-white px-5 py-4 text-sm font-semibold leading-6 text-foreground shadow-sm"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        <section className="bg-background py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow={`${page.city} Appliance Repair`}
                title="Common appliance problems we help with"
                description={`These are the kinds of appliance issues homeowners in ${cityLabel} often need help sorting out before the problem gets worse.`}
              />
            </FadeUp>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {page.commonNeeds.map((need, index) => (
                <FadeUp key={need.title} delay={index * 0.04}>
                  <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-primary">{need.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted">{need.text}</p>
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
                eyebrow="Appliance Categories"
                title={`Repair help available around ${page.city}`}
                description="Browse the main appliance repair categories we support. If you are not sure what category fits your issue, send the symptoms and we will help route the request."
              />
            </FadeUp>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {servicePagesDirectory.map((service, index) => (
                <FadeUp key={service.slug} delay={index * 0.03}>
                  <Link
                    href={`/${service.slug}`}
                    className="flex h-full min-h-[150px] flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                  >
                    <span className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-accent">
                      Service
                    </span>
                    <span className="mt-3 text-base font-bold text-primary">
                      {service.applianceName} Repair
                    </span>
                    <span className="mt-3 text-sm leading-6 text-muted">
                      {getServiceCategoryCardDescription(service.applianceName)}
                    </span>
                  </Link>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-background py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow="Service Coverage"
                title={`Nearby service areas around ${page.city}`}
                description={`If you are comparing coverage across ${page.nearbyLabel}, these nearby pages can help you find the closest service-area match.`}
              />
            </FadeUp>

            <FadeUp className="mt-10">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {relatedAreas.map((area, index) => (
                    <Link
                      key={area.slug}
                      href={`/${area.slug}`}
                      className="group relative isolate flex min-h-[104px] w-[72%] shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-[linear-gradient(135deg,rgba(211,38,56,0.08),rgba(255,255,255,0.92)_42%,rgba(14,48,97,0.08))] p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:w-[38%] lg:w-[23%]"
                    >
                      <span className="relative flex flex-col">
                        <span className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-accent">
                          Nearby Area
                        </span>
                        <span className="mt-2 flex items-center gap-3">
                          <span className="shrink-0 text-lg font-black leading-tight text-primary">
                            {area.label}
                          </span>
                          <span
                            className="service-area-title-line pointer-events-none h-px min-w-8 flex-1 overflow-hidden bg-gradient-to-r from-accent/25 via-primary/20 to-accent/25"
                            style={{ animationDelay: `${index * 0.32}s` }}
                          />
                        </span>
                        <span className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-muted transition group-hover:text-accent group-focus-visible:text-accent">
                          View local service
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        <section id="faq" className="bg-[#f2f5f9] py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow={`${page.city} FAQ`}
                title="Questions before you book"
                description={`A few practical answers for customers looking for appliance repair in ${cityLabel}.`}
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

        <ContactSection
          eyebrow={`Book ${page.city} Service`}
          title={`Schedule appliance repair in ${cityLabel}`}
          description={`Tell us the appliance, symptoms, and service address in ${cityLabel}. We will confirm availability and the most practical next step.`}
          source={`${page.slug}-service-area`}
          successMessage={`Thank you. Your ${page.city} service request was sent, and we will contact you soon.`}
        />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }}
      />
    </div>
  );
}
