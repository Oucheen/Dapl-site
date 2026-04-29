import type { Metadata } from "next";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";

export const metadata: Metadata = {
  title: "Privacy Policy | Dapl Appliance Repair",
  description:
    "Privacy policy for Dapl Appliance Repair, including how we handle contact form submissions, analytics, cookies, and communication data.",
  alternates: {
    canonical: "/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy | Dapl Appliance Repair",
    description:
      "Learn how Dapl Appliance Repair uses contact information, analytics, cookies, and communication data on this website.",
    url: "/privacy-policy",
  },
};

const sections = [
  {
    title: "Information we collect",
    body: [
      "When you contact us through this website, we may collect information you provide directly, including your name, phone number, email address, service address, appliance details, preferred service date, and message contents.",
      "We also collect limited website usage information through analytics and tag-management tools to understand how visitors use the site and how service requests are submitted.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use the information you submit to respond to service requests, schedule appointments, follow up about appliance repair inquiries, and provide customer support.",
      "We also use website analytics information to measure traffic, understand which pages are used most often, and improve the performance of our website and lead forms.",
    ],
  },
  {
    title: "Cookies and analytics",
    body: [
      "This website uses cookies and similar technologies for analytics, website measurement, and performance reporting. These tools may include Google Analytics and Google Tag Manager.",
      "We use analytics data to understand page visits, form activity, phone-click activity, and other interactions that help us improve the site and evaluate advertising performance. We do not use this website to knowingly collect sensitive personal information beyond what you choose to send to us in a service inquiry.",
    ],
  },
  {
    title: "How leads and communications are handled",
    body: [
      "When you submit a service request, the information may be sent to our business email and internal notification channels, including Telegram notifications used for lead response and scheduling workflow.",
      "We use this information only to review, respond to, and manage repair requests and customer communications.",
    ],
  },
  {
    title: "Sharing of information",
    body: [
      "We do not sell your personal information in the ordinary course of our business. We may share information with service providers that help us operate the website, send communications, measure analytics, or process customer inquiries.",
      "If we use advertising or analytics providers, those providers may receive technical information such as browser, device, and interaction data in connection with website measurement and performance reporting.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can choose not to submit a contact form and instead reach us directly by phone. You can also control cookies through your browser settings and available browser privacy controls.",
      "If you want us to update or delete information you previously submitted through this site, contact us using the email or phone number listed below.",
    ],
  },
  {
    title: "Data security",
    body: [
      "We use reasonable administrative and technical steps to protect the information submitted through this website. However, no online system can guarantee absolute security.",
    ],
  },
  {
    title: "Contact us",
    body: [
      "If you have privacy questions about this website or your submitted information, contact Dapl Appliance Repair at dapl.appliance.repair@gmail.com or call +1 (704) 266-0508.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header logoHref="/" />
      <main>
        <section className="relative overflow-hidden bg-surface pb-16 pt-16 sm:pb-20 sm:pt-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,42,86,0.11),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(207,36,49,0.08),_transparent_30%)]" />
          <div className="container-shell relative">
            <div className="mx-auto max-w-4xl rounded-[28px] border border-border bg-white/95 p-6 shadow-lg shadow-primary/5 sm:p-8 lg:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                Privacy Policy
              </p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                How we handle website and contact information
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-muted sm:text-lg">
                This policy explains what information Dapl Appliance Repair collects through this
                website, how we use it, and how website analytics and communication tools support
                our repair-request workflow.
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
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-10 rounded-2xl border border-primary/10 bg-primary/5 px-5 py-4 text-sm leading-7 text-foreground/85">
                <p className="font-semibold text-primary">Last updated: April 29, 2026</p>
                <p className="mt-1">
                  We may update this policy as the website, analytics setup, or communication
                  workflows change.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
