import { AppliancesSection } from "@/components/sections/appliances";
import { BottomCtaSection } from "@/components/sections/bottom-cta";
import { ContactSection } from "@/components/sections/contact-section";
import { BrandsSection } from "@/components/sections/brands";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { Hero } from "@/components/sections/hero";
import { OfferSection } from "@/components/sections/offer";
import { WhyChooseUsSection } from "@/components/sections/why-choose-us";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Dapl Appliance Repair",
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
  areaServed: "Charlotte, NC and surrounding areas",
  url: "https://www.daplrepair.com",
  serviceType: "Appliance Repair Service",
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
        <ContactSection />
        <BottomCtaSection />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
    </div>
  );
}
