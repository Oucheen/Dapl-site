import Link from "next/link";
import { serviceAreaPagesDirectory } from "@/content/service-areas";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

export function ServiceAreasSection() {
  return (
    <section id="service-areas" className="bg-background py-14 sm:py-18">
      <div className="container-shell">
        <FadeUp>
          <SectionHeading
            eyebrow="Service Areas"
            title="Local appliance repair near Mint Hill and Charlotte"
            description="Choose your closest area for local service notes, coverage details, and scheduling information."
          />
        </FadeUp>

        <FadeUp delay={0.08}>
          <div className="mx-auto mt-8 max-w-6xl">
            <div className="overflow-hidden rounded-lg border border-border bg-white p-3 shadow-sm sm:p-4">
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
                {serviceAreaPagesDirectory.map((area) => (
                  <Link
                    key={area.slug}
                    href={`/${area.slug}`}
                    className="group flex min-h-24 w-[82%] shrink-0 snap-start items-center justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm sm:w-[45%] lg:w-[31.5%]"
                  >
                    <span>
                      <span className="block text-base font-black text-primary">{area.label}</span>
                      <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        View local service
                      </span>
                    </span>
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition group-hover:bg-accent"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Swipe or drag to see more areas
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
