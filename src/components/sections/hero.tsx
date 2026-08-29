import { FadeUp } from "@/components/ui/fade-up";
import { BookOnlineButton } from "@/components/ui/book-online-button";
import { TrackedAnchor } from "@/components/ui/tracked-anchor";
import { CheckCircle2, Clock3, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";

const highlights = [
  "Same Day Service",
  "Certified Technicians",
  "Affordable Pricing",
  "Satisfaction Guaranteed",
];

const serviceNotes = [
  {
    icon: Clock3,
    label: "Fast scheduling",
    text: "Same-day options when available",
  },
  {
    icon: MapPin,
    label: "Local coverage",
    text: "Charlotte and nearby areas",
  },
  {
    icon: ShieldCheck,
    label: "Clear repair path",
    text: "Diagnosis before approved work",
  },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-surface py-10 sm:py-16 xl:flex xl:min-h-[calc(100svh-5rem)] xl:items-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,42,86,0.13),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(207,36,49,0.1),_transparent_30%),linear-gradient(180deg,_rgba(248,250,252,0)_0%,_rgba(248,250,252,0.78)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(90deg,_rgba(179,25,66,0.08)_0%,_rgba(255,255,255,0)_38%,_rgba(10,49,97,0.08)_100%)]" />
      <div className="container-shell relative grid items-center gap-8 lg:grid-cols-[0.96fr_1.04fr] xl:gap-12">
        <FadeUp>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
            Charlotte Appliance Repair
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl xl:text-6xl">
            We Fix It Right. The First Time.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Expert appliance repair services in Charlotte, NC and surrounding areas.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedAnchor
              href="#contact"
              gtmEvent={{
                event: "schedule_click",
                location: "homepage_hero",
              }}
              className="inline-flex min-w-[164px] items-center justify-center whitespace-nowrap rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-95"
            >
              Schedule Your Repair
            </TrackedAnchor>
            <BookOnlineButton
              location="homepage_hero"
              className="inline-flex min-w-[140px] items-center justify-center whitespace-nowrap rounded-full border border-primary/20 bg-white px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5"
            />
            <TrackedAnchor
              href="tel:+17042660508"
              gtmEvent={{
                event: "phone_click",
                location: "homepage_hero",
                link_type: "primary_cta",
              }}
              className="inline-flex min-w-[190px] items-center justify-center whitespace-nowrap rounded-full border border-primary/20 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Call +1 (704) 266-0508
            </TrackedAnchor>
          </div>

          <div className="mt-8 grid max-w-2xl gap-3 border-y border-border/80 py-4 sm:grid-cols-3">
            {serviceNotes.map((item) => (
              <div key={item.label} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                  <item.icon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-extrabold text-foreground">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted">{item.text}</span>
                </span>
              </div>
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={0.1} className="relative">
          <div className="absolute -left-4 -top-4 h-28 w-28 rounded-full border-[18px] border-accent/10" aria-hidden="true" />
          <div className="absolute -bottom-5 -right-5 h-36 w-36 rounded-full border-[22px] border-primary/10" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-white p-4 shadow-2xl shadow-primary/15 sm:p-5">
            <Image
              src="/hero-placeholder.webp"
              alt="Technician repairing a kitchen appliance"
              width={1000}
              height={760}
              priority
              sizes="(max-width: 1023px) calc(100vw - 2rem), 48vw"
              className="aspect-[1.34/1] w-full rounded-2xl object-cover"
            />
            <div className="mt-4 flex flex-col gap-3 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-primary">Local appliance repair team</p>
                <p className="mt-1 text-sm leading-6 text-muted">Book online or call for Charlotte-area service.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f7f9fc] px-4 py-2 text-sm font-bold text-primary">
                <CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={2.4} aria-hidden="true" />
                WEB30 available
              </div>
            </div>
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
