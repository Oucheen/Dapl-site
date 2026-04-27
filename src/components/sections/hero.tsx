import { FadeUp } from "@/components/ui/fade-up";
import { TrackedAnchor } from "@/components/ui/tracked-anchor";
import Image from "next/image";

const highlights = [
  "Same Day Service",
  "Certified Technicians",
  "Affordable Pricing",
  "Satisfaction Guaranteed",
];

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-5rem)] items-center overflow-hidden bg-surface py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,42,86,0.11),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(207,36,49,0.08),_transparent_30%)]" />
      <div className="container-shell relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <FadeUp>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
            Charlotte Appliance Repair
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
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
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <TrackedAnchor
              href="#contact"
              gtmEvent={{
                event: "schedule_click",
                location: "homepage_hero",
              }}
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-95"
            >
              Schedule Your Repair
            </TrackedAnchor>
            <TrackedAnchor
              href="tel:+17042660508"
              gtmEvent={{
                event: "phone_click",
                location: "homepage_hero",
                link_type: "primary_cta",
              }}
              className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Call +1 (704) 266-0508
            </TrackedAnchor>
          </div>

          <div className="mt-10 hidden justify-center sm:mt-12 md:flex lg:justify-start">
            <a
              href="#offer"
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/15 bg-white text-[1.35rem] text-primary shadow-md shadow-primary/10 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg motion-safe:animate-bounce"
              aria-label="Scroll to next section"
            >
              {"\u2193"}
            </a>
          </div>
        </FadeUp>

        <FadeUp delay={0.1} className="relative">
          <div className="rounded-3xl border border-border bg-white p-5 shadow-lg shadow-primary/10">
            <Image
              src="/hero-placeholder.png"
              alt="Technician repairing a kitchen appliance"
              width={1000}
              height={760}
              className="h-auto w-full rounded-2xl"
            />
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
