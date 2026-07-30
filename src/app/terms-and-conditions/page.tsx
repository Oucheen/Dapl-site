import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Terms and Conditions | DAPL Appliance Repair",
  description:
    "Terms and conditions for DAPL Appliance Repair website use, service communications, and SMS notifications.",
  alternates: {
    canonical: "/terms-and-conditions",
  },
  openGraph: {
    title: "Terms and Conditions | DAPL Appliance Repair",
    description:
      "Review DAPL Appliance Repair terms for service requests, customer communications, SMS updates, and support.",
    url: "/terms-and-conditions",
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
      name: "Terms and Conditions",
      item: "https://www.daplappliance.com/terms-and-conditions",
    },
  ],
};

const sections = [
  {
    title: "Business identity",
    body: [
      "DAPL Appliance Repair is the public-facing service name used for appliance repair services and customer communications. DAPL Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.",
    ],
  },
  {
    title: "Service requests and communications",
    body: [
      "When you request service through our website, chat widget, phone call, or scheduling workflow, we may contact you about your appliance repair request, appointment availability, invoices, payment reminders, technician updates, and customer support.",
      "Submitting a service request does not guarantee appointment availability. Service timing, estimates, and repair recommendations may depend on technician availability, appliance condition, parts availability, and customer approval.",
    ],
  },
  {
    title: "SMS service messages",
    body: [
      "When you opt in to service-related SMS messages by checking the SMS consent box on our website form or chat widget, or by otherwise requesting service-related text communication from DAPL Appliance Repair, you agree that DAPL Appliance Repair may send service-related text messages to that mobile phone number. These messages may include invoice links, appointment updates, payment reminders, technician updates, and repair visit notifications.",
      "Message frequency varies based on your service activity. Message and data rates may apply. Message delivery is not guaranteed and carriers are not liable for delayed or undelivered messages.",
    ],
  },
  {
    title: "SMS help and opt-out",
    body: [
      "For help, reply HELP or contact DAPL Appliance Repair at dapl.appliance.repair@gmail.com or +1 (704) 266-0508.",
      "To stop receiving SMS messages from DAPL Appliance Repair, reply STOP. After you send STOP, we may send one confirmation message and then no further SMS messages will be sent unless you opt in again or otherwise request service-related communication.",
    ],
  },
  {
    title: "Payments, invoices, and estimates",
    body: [
      "Invoices, estimates, and service totals may be sent by email, SMS link, or other direct customer communication. Payment terms, warranty notes, and invoice details are provided on the invoice or service record.",
      "Parts, taxes, fees, service call charges, discounts, and labor charges may vary by repair and will be reflected on the applicable invoice or estimate.",
    ],
  },
  {
    title: "Privacy",
    body: [
      "Our handling of personal information, mobile phone numbers, SMS consent, analytics, and customer communication data is described in our Privacy Policy.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions about these terms can be sent to dapl.appliance.repair@gmail.com or +1 (704) 266-0508.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header logoHref="/" />
      <main>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Terms and Conditions" }]} />

        <section className="relative overflow-hidden bg-surface pb-16 pt-16 sm:pb-20 sm:pt-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,42,86,0.11),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(207,36,49,0.08),_transparent_30%)]" />
          <div className="container-shell relative">
            <div className="mx-auto max-w-4xl rounded-[28px] border border-border bg-white/95 p-6 shadow-lg shadow-primary/5 sm:p-8 lg:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                Terms and Conditions
              </p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Service communication and website terms
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-muted sm:text-lg">
                These terms describe how DAPL Appliance Repair communicates with customers about
                appliance repair requests, appointments, invoices, SMS notifications, and support.
              </p>

              <div className="mt-10 space-y-8">
                {sections.map((section) => (
                  <section key={section.title}>
                    <h2 className="text-2xl font-bold tracking-tight text-primary">
                      {section.title}
                    </h2>
                    <div className="mt-3 space-y-4 text-sm leading-7 text-muted sm:text-base">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {section.title === "Privacy" ? (
                        <p>
                          Read the{" "}
                          <Link href="/privacy-policy" className="font-semibold text-primary hover:underline">
                            DAPL Appliance Repair Privacy Policy
                          </Link>
                          .
                        </p>
                      ) : null}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-10 rounded-2xl border border-primary/10 bg-primary/5 px-5 py-4 text-sm leading-7 text-foreground/85">
                <p className="font-semibold text-primary">Last updated: July 25, 2026</p>
                <p className="mt-1">
                  We may update these terms as our website, service workflow, payment process, or
                  communication tools change.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </div>
  );
}
