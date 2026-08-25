import Link from "next/link";
import { serviceAreaPagesDirectory } from "@/content/service-areas";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

export function ServiceAreasSection() {
  const primaryAreas = serviceAreaPagesDirectory.slice(0, 6);
  const nearbyAreas = serviceAreaPagesDirectory.slice(6);

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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {primaryAreas.map((area) => (
                <Link
                  key={area.slug}
                  href={`/${area.slug}`}
                  className="group flex min-h-20 items-center justify-between gap-4 rounded-lg border border-border bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
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

            <div className="mt-4 rounded-lg border border-border bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                More nearby coverage
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {nearbyAreas.map((area) => (
                  <Link
                    key={area.slug}
                    href={`/${area.slug}`}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    {area.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
