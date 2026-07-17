import type { Metadata } from "next";
import Image from "next/image";
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
  brandPagesDirectory,
  brandServiceCategories,
  type BrandPageContent,
} from "@/content/brand-pages";
import { getServiceCategoryCardDescription } from "@/content/service-pages";

type BrandPageTemplateProps = {
  page: BrandPageContent;
};

function jsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildBrandMetadata(page: BrandPageContent): Metadata {
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical: `/brands/${page.slug}`,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `/brands/${page.slug}`,
      type: "article",
    },
  };
}

export function BrandPageTemplate({ page }: BrandPageTemplateProps) {
  const brandUrl = `https://www.daplappliance.com/brands/${page.slug}`;
  const relatedBrands = brandPagesDirectory.filter((brand) => brand.slug !== page.slug);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.heroTitle,
    serviceType: `${page.name} Appliance Repair`,
    provider: {
      "@type": "LocalBusiness",
      name: "DAPL Appliance Repair",
      telephone: "+1-704-266-0508",
      url: "https://www.daplappliance.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "9401 Peckham Rye Rd",
        addressLocality: "Charlotte",
        addressRegion: "NC",
        postalCode: "28227",
        addressCountry: "US",
      },
    },
    areaServed: {
      "@type": "City",
      name: "Charlotte",
      addressRegion: "NC",
      addressCountry: "US",
    },
    brand: {
      "@type": "Brand",
      name: page.name,
    },
    description: page.metaDescription,
    url: brandUrl,
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
        name: `${page.name} Appliance Repair`,
        item: brandUrl,
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
            { label: "Brands" },
            { label: `${page.name} Appliance Repair` },
          ]}
        />

        <section className="relative overflow-hidden bg-surface py-16 sm:py-20 lg:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,42,86,0.11),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(207,36,49,0.08),_transparent_30%)]" />
          <div className="container-shell relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <FadeUp>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                Brand Repair
              </p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {page.heroTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
                {page.heroDescription}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {page.serviceNotes.map((note) => (
                  <div
                    key={note}
                    className="inline-flex items-center rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm"
                  >
                    <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-accent" />
                    {note}
                  </div>
                ))}
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <TrackedAnchor
                  href="#contact"
                  gtmEvent={{
                    event: "schedule_click",
                    location: page.slug,
                    brand: page.name,
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:brightness-95"
                >
                  Schedule {page.name} Repair
                </TrackedAnchor>
                <BookOnlineButton
                  location={page.slug}
                  gtmEvent={{ brand: page.name }}
                  className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:-translate-y-0.5 hover:bg-primary/5"
                />
                <TrackedAnchor
                  href="tel:+17042660508"
                  gtmEvent={{
                    event: "phone_click",
                    location: page.slug,
                    link_type: "brand_hero",
                    brand: page.name,
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Call +1 (704) 266-0508
                </TrackedAnchor>
              </div>
            </FadeUp>

            <FadeUp delay={0.08}>
              <div className="rounded-3xl border border-border bg-white p-5 shadow-lg shadow-primary/10">
                <div className="rounded-2xl bg-[linear-gradient(145deg,rgba(15,42,86,0.06),rgba(207,36,49,0.08))] p-6 sm:p-8">
                  <div className="grid min-h-44 place-items-center rounded-2xl border border-border bg-white p-7 shadow-sm sm:min-h-52 sm:p-9">
                    <Image
                      src={page.logo}
                      alt={`${page.name} logo`}
                      width={360}
                      height={150}
                      className="max-h-32 w-full object-contain sm:max-h-40"
                      unoptimized
                      priority
                    />
                  </div>
                  <h2 className="mt-6 text-3xl font-black tracking-tight text-primary sm:text-4xl">
                    {page.introTitle}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
                    {page.introText}
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        <section className="bg-background py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow={`${page.name} Repair Services`}
                title={`Common ${page.name} problems we help with`}
                description={`These are the kinds of ${page.name} appliance issues Charlotte homeowners often need help sorting out before the problem gets worse.`}
              />
            </FadeUp>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {page.commonIssues.map((issue, index) => (
                <FadeUp key={issue.title} delay={index * 0.04}>
                  <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-primary">{issue.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted">{issue.text}</p>
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
                title={`${page.name} appliance categories we can review`}
                description={`Browse the main appliance repair categories that commonly overlap with ${page.name} repair requests.`}
              />
            </FadeUp>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {brandServiceCategories.map((service, index) => (
                <FadeUp key={service.slug} delay={index * 0.03}>
                  <Link
                    href={`/${service.slug}`}
                    className="flex h-full min-h-[150px] flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                  >
                    <span className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-accent">
                      {page.name}
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
                eyebrow="Related Brands"
                title="Explore more brand repair pages"
                description="Compare common appliance issues across other major brands we work with in Charlotte homes."
              />
            </FadeUp>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedBrands.slice(0, 4).map((brand, index) => (
                <FadeUp key={brand.slug} delay={index * 0.04}>
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="grid h-full min-h-32 place-items-center rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                  >
                    <Image
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      width={190}
                      height={76}
                      className="max-h-16 w-full object-contain"
                      unoptimized
                    />
                    <span className="sr-only">{brand.name} appliance repair</span>
                  </Link>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f2f5f9] py-20">
          <div className="container-shell">
            <FadeUp>
              <SectionHeading
                eyebrow={`${page.name} Repair FAQ`}
                title="Questions Charlotte customers often ask"
                description={`A few quick answers before scheduling ${page.name} appliance service.`}
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
          eyebrow={`Book ${page.name} Service`}
          title={`Schedule ${page.name} appliance repair`}
          description={`Tell us which ${page.name} appliance needs help, what symptoms you are seeing, and your Charlotte-area service address.`}
          source={`${page.slug}-page`}
          successMessage="Thank you. Your request was sent and we will contact you soon."
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
