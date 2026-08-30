import { FadeUp } from "@/components/ui/fade-up";
import { BookOnlineButton } from "@/components/ui/book-online-button";
import { TrackedAnchor } from "@/components/ui/tracked-anchor";
import { CheckCircle2, Phone } from "lucide-react";
import Image from "next/image";

const highlights = [
  "Same Day Service",
  "Certified Technicians",
  "Affordable Pricing",
  "Satisfaction Guaranteed",
];

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-white xl:min-h-[calc(100svh-5rem)]"
    >
      <Image
        src="/hero-placeholder.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[65%_center] opacity-100 sm:object-[70%_center]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.74)_43%,rgba(255,255,255,0.42)_72%,rgba(255,255,255,0.16)_100%)] lg:bg-[linear-gradient(90deg,#ffffff_0%,rgba(255,255,255,0.75)_38%,rgba(255,255,255,0.25)_62%,rgba(255,255,255,0)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/80 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_88%,rgba(207,36,49,0.06),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(15,42,86,0.12),transparent_36%)]" />

      <div className="container-shell relative flex min-h-[calc(100svh-5rem)] items-center py-12 sm:py-16 lg:py-20">
        <FadeUp className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/75 sm:text-sm">
            Charlotte Appliance Repair
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[0.98] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            We Fix It Right. The First Time.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Expert appliance repair services in Charlotte, NC and surrounding areas.
          </p>
          <ul className="mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedAnchor
              href="#contact"
              gtmEvent={{
                event: "schedule_click",
                location: "homepage_hero",
              }}
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 transition hover:brightness-95"
            >
              Schedule Your Repair
            </TrackedAnchor>
            <BookOnlineButton
              location="homepage_hero"
              className="inline-flex items-center justify-center rounded-full bg-[#177dcc] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#177dcc]/20 transition hover:brightness-95"
            />
            <TrackedAnchor
              href="tel:+17042660508"
              gtmEvent={{
                event: "phone_click",
                location: "homepage_hero",
                link_type: "primary_cta",
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call +1 (704) 266-0508
            </TrackedAnchor>
          </div>

          <div className="mt-7 flex max-w-2xl flex-wrap gap-2.5">
            {["Same-day options", "Clear diagnosis", "Local Charlotte team"].map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white/90 px-3 py-2 text-xs font-bold text-primary shadow-sm backdrop-blur"
              >
                <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>

        </FadeUp>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-14 hidden justify-center xl:flex">
        <a
          href="#offer"
          className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/15 bg-white text-[1.35rem] text-primary shadow-md shadow-primary/10 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg motion-safe:animate-bounce"
          aria-label="Scroll to next section"
        >
          {"\u2193"}
        </a>
      </div>
    </section>
  );
}
