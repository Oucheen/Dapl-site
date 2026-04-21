import { FadeUp } from "@/components/ui/fade-up";

/** Edit this block to change the promo for your client. */
export const SITE_OFFER = {
  eyebrow: "Limited-time offer",
  title: "$25 off your first repair",
  description:
    "New residential customers in Charlotte and surrounding areas. Professional diagnosis and repair—fair pricing, no surprises.",
  code: "WEB25",
  codeLabel: "Mention this code when you call or email",
  finePrint: "Cannot be combined with other offers. Labor and parts billed separately. Restrictions may apply.",
} as const;

export function OfferSection() {
  const { eyebrow, title, description, code, codeLabel, finePrint } = SITE_OFFER;

  return (
    <section
      id="offer"
      aria-labelledby="offer-heading"
      className="border-y border-accent/20 bg-gradient-to-r from-primary/[0.06] via-surface to-accent/[0.06] py-12 sm:py-14"
    >
      <div className="container-shell">
        <FadeUp>
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface shadow-lg shadow-primary/5">
            <div className="grid gap-0 md:grid-cols-[1fr_auto] md:items-stretch">
              <div className="p-6 sm:p-8 md:p-10">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                  {eyebrow}
                </p>
                <h2 id="offer-heading" className="mt-3 text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">
                  {title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-muted sm:text-base">{description}</p>
                <p className="mt-5 text-sm font-medium text-foreground">
                  {codeLabel}:{" "}
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-base font-bold text-primary">
                    {code}
                  </span>
                </p>
                <p className="mt-4 text-xs leading-5 text-muted">{finePrint}</p>
              </div>
              <div className="flex flex-col justify-center gap-3 border-t border-border bg-[#f8fbff] p-6 sm:flex-row sm:items-center md:flex-col md:border-l md:border-t-0 md:px-8">
                <a
                  href="tel:+17042660508"
                  className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-accent-foreground transition hover:brightness-95"
                >
                  Call to redeem
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-full border border-primary/25 bg-surface px-6 py-3 text-center text-sm font-semibold text-primary transition hover:bg-primary/5"
                >
                  Schedule online
                </a>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
