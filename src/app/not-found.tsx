import Link from "next/link";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { FadeUp } from "@/components/ui/fade-up";

const quickLinks = [
  { href: "/#offer", label: "View current offer" },
  { href: "/#appliances", label: "See appliances we repair" },
  { href: "/#faq", label: "Read FAQs" },
  { href: "/#contact", label: "Contact us" },
];

const trustItems = [
  "Same-day service when available",
  "Charlotte, NC and surrounding areas",
  "Open daily from 8:00 AM to 8:00 PM",
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header logoHref="/" />
      <main>
        <section className="relative overflow-hidden bg-surface pb-16 pt-16 sm:pb-20 sm:pt-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,42,86,0.11),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(207,36,49,0.08),_transparent_30%)]" />
          <div className="container-shell relative">
            <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <FadeUp>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Error 404
                </p>
                <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  We could not find that page.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
                  The link may be outdated, or the page may have moved. If you were looking for
                  appliance repair in Charlotte, NC, we can still get you where you need to go.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  {trustItems.map((item) => (
                    <div
                      key={item}
                      className="inline-flex items-center rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm"
                    >
                      <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-accent" />
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/#contact"
                    className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition hover:-translate-y-0.5 hover:brightness-95"
                  >
                    Schedule Service
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-full border border-primary/15 bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
                  >
                    Back to Home
                  </Link>
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
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                      Quick Links
                    </p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-primary sm:text-4xl">
                      Let&apos;s get you back on track
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-7 text-muted">
                      Here are the most useful places to continue from.
                    </p>

                    <div className="mt-8 grid gap-4">
                      {quickLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="rounded-2xl border border-border bg-white px-5 py-4 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:text-primary"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-8 rounded-2xl border border-primary/10 bg-white px-5 py-5 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/75">
                        Need help right away?
                      </p>
                      <div className="mt-4 space-y-3 text-sm text-muted">
                        <p>
                          <span className="font-semibold text-foreground">Call:</span>{" "}
                          <a href="tel:+17042660508" className="font-medium text-primary hover:underline">
                            +1 (704) 266-0508
                          </a>
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">Email:</span>{" "}
                          <a
                            href="mailto:dapl.appliance.repair@gmail.com"
                            className="break-words font-medium text-primary hover:underline"
                          >
                            dapl.appliance.repair@gmail.com
                          </a>
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">Hours:</span> Monday -
                          Sunday, 8:00 AM - 8:00 PM
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
