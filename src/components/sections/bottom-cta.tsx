import { FadeUp } from "@/components/ui/fade-up";
import { BookOnlineButton } from "@/components/ui/book-online-button";

export function BottomCtaSection() {
  return (
    <section id="book" className="bg-primary py-20" aria-label="Book service call to action">
      <div className="container-shell py-2">
        <FadeUp>
          <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-primary to-[#12366f] px-6 py-10 text-center text-primary-foreground shadow-xl shadow-black/20 sm:px-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Need fast appliance repair in Charlotte?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">
              Call now to schedule your service appointment with DAPL Appliance Repair.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="tel:+19803936588"
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-95"
              >
                Call +1 (980) 393-6588
              </a>
              <BookOnlineButton
                location="bottom_cta"
                className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-white/20"
              />
              <a
                href="mailto:dapl.appliance.repair@gmail.com"
                className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-white/20"
              >
                Email Us
              </a>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
