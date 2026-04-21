import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

const features = [
  {
    title: "Local Charlotte Team",
    text: "We know the area, arrive on time, and provide friendly neighborhood service.",
  },
  {
    title: "Transparent Pricing",
    text: "No surprise charges. You get clear quotes and affordable repair options.",
  },
  {
    title: "Certified Technicians",
    text: "Skilled professionals with practical experience across major appliance types.",
  },
  {
    title: "Fast Turnaround",
    text: "Same-day and priority scheduling options whenever availability allows.",
  },
];

export function WhyChooseUsSection() {
  return (
    <section id="why-us" className="bg-[#f2f5f9] py-20">
      <div className="container-shell">
        <FadeUp>
          <SectionHeading
            eyebrow="Why Choose Us"
            title="Trusted appliance repair in Charlotte, NC"
            description="Our mission is simple: dependable repairs, honest communication, and customer-first service from start to finish."
          />
        </FadeUp>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {features.map((feature, index) => (
            <FadeUp key={feature.title} delay={index * 0.08}>
              <article className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <h3 className="text-lg font-bold text-primary">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{feature.text}</p>
              </article>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
