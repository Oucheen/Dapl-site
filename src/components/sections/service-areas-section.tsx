import Link from "next/link";
import { serviceAreaPagesDirectory } from "@/content/service-areas";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

export function ServiceAreasSection() {
  return (
    <section id="service-areas" className="bg-background py-16 sm:py-20">
      <div className="container-shell">
        <FadeUp>
          <SectionHeading
            eyebrow="Service Areas"
            title="Appliance repair service areas around Charlotte"
            description="DAPL Appliance Repair serves Charlotte, NC and nearby communities. Choose your city to see local appliance repair details, service notes, and scheduling information."
          />
        </FadeUp>

        <FadeUp delay={0.08}>
          <div className="mx-auto mt-9 max-w-5xl rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {serviceAreaPagesDirectory.map((area) => (
                <Link
                  key={area.slug}
                  href={`/${area.slug}`}
                  className="group flex min-h-16 items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/5 hover:shadow-sm"
                >
                  <span>{area.label}</span>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-accent transition group-hover:bg-accent group-hover:text-white"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
