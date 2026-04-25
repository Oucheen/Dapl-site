import type { Metadata } from "next";
import Image from "next/image";
import { ContactSection } from "@/components/sections/contact-section";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { FadeUp } from "@/components/ui/fade-up";

export const metadata: Metadata = {
  title: "Returning Customer Offer | $15 Off Your Next Repair",
  description:
    "Exclusive returning customer offer from Dapl Appliance Repair. Save $15 on your next service appointment in Charlotte, NC and surrounding areas.",
  alternates: {
    canonical: "/returning-customer-offer",
  },
  openGraph: {
    title: "Returning Customer Offer | $15 Off Your Next Repair",
    description:
      "Exclusive returning customer offer from Dapl Appliance Repair for repeat service calls.",
    url: "/returning-customer-offer",
  },
};

export default function ReturningCustomerOfferPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header logoHref="/" />
      <main>
        <section className="relative overflow-hidden bg-surface pb-16 pt-16 sm:pb-20 sm:pt-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,42,86,0.11),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(207,36,49,0.08),_transparent_30%)]" />
          <div className="container-shell relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <FadeUp>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                Returning Customer Offer
              </p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Save $15 on your next repair
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
                Thank you for choosing Dapl Appliance Repair. Returning residential customers can
                receive $15 off their next service appointment in Charlotte, NC and surrounding
                areas.
              </p>

              <div className="mt-8 max-w-xl rounded-3xl border border-border bg-white/90 p-6 shadow-lg shadow-primary/5 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                  Promo Code
                </p>
                <p className="mt-3 inline-flex rounded-xl bg-primary/10 px-4 py-2 font-mono text-2xl font-black text-primary">
                  RETURN15
                </p>
                <p className="mt-4 text-sm leading-7 text-muted">
                  Mention this code when you call or add it in your message when scheduling online.
                  One discount per completed service appointment. Labor and parts billed separately.
                </p>
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:brightness-95"
                >
                  <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_0_6px_rgba(255,255,255,0.12)]" />
                  Claim Your Offer
                </a>
                <a
                  href="tel:+17042660508"
                  className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Call +1 (704) 266-0508
                </a>
              </div>
            </FadeUp>

            <FadeUp delay={0.08}>
              <div className="rounded-3xl border border-border bg-white p-5 shadow-lg shadow-primary/10">
                <div className="rounded-2xl bg-[linear-gradient(145deg,rgba(15,42,86,0.06),rgba(207,36,49,0.08))] p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                        Repeat Customer Savings
                      </p>
                      <h2 className="mt-3 text-3xl font-black tracking-tight text-primary sm:text-4xl">
                        $15 OFF
                      </h2>
                      <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
                        Use this special offer on your next appliance repair service.
                      </p>
                    </div>
                    <Image
                      src="/logo.jpg"
                      alt="Dapl Appliance Repair"
                      width={88}
                      height={88}
                      className="rounded-2xl border border-border bg-white object-cover shadow-sm"
                    />
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {[
                      "For returning residential customers",
                      "Applies to next completed repair visit",
                      "Valid in Charlotte and nearby areas",
                    ].map((item) => (
                      <div key={item} className="rounded-2xl border border-border bg-white px-4 py-4 text-sm font-medium text-foreground shadow-sm">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>
        <ContactSection
          eyebrow="Claim Offer"
          title="Claim your returning customer offer"
          description="Use this form for your repeat-customer discount. We will tag this request separately so your RETURN15 offer is easy to identify."
          source="returning-customer-offer"
          defaultPromoCode="RETURN15"
          promoCodeReadOnly
          promoCodeLabel="Promo code"
          successMessage="Thank you — your returning customer offer request was sent. We will contact you soon."
        />
      </main>
      <Footer />
    </div>
  );
}
