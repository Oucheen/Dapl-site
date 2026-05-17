import { AppliancesSection } from "@/components/sections/appliances";
import { BottomCtaSection } from "@/components/sections/bottom-cta";
import { ContactSection } from "@/components/sections/contact-section";
import { BrandsSection } from "@/components/sections/brands";
import { faqItems } from "@/components/sections/faq-data";
import { FAQSection } from "@/components/sections/faq";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { Hero } from "@/components/sections/hero";
import { OfferSection } from "@/components/sections/offer";
import { ReviewsSection } from "@/components/sections/reviews-section";
import { WhyChooseUsSection } from "@/components/sections/why-choose-us";
import { serviceAreaPagesDirectory } from "@/content/service-areas";

const REVIEWS_SECTION_ENABLED = false;

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "DAPL Appliance Repair",
  description:
    "Expert appliance repair services in Charlotte, NC and surrounding areas.",
  telephone: "+1-704-266-0508",
  email: "dapl.appliance.repair@gmail.com",
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
  url: "https://www.daplappliance.com",
  serviceType: "Appliance Repair Service",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "08:00",
      closes: "20:00",
    },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <OfferSection />
        <AppliancesSection />
        <BrandsSection />
        <WhyChooseUsSection />
        {REVIEWS_SECTION_ENABLED ? <ReviewsSection /> : null}
        <FAQSection />
        <ContactSection />
        <BottomCtaSection />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </div>
  );
}
