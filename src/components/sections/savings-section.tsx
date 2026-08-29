import { HeartHandshake, Medal, RotateCcw } from "lucide-react";

import { BookOnlineButton } from "@/components/ui/book-online-button";
import { FadeUp } from "@/components/ui/fade-up";

const savings = [
  {
    title: "Veterans and military",
    amount: "$30 off",
    text: "For veterans and active-duty military when eligible repair work is approved.",
    icon: Medal,
    iconClass: "border-[#d8e2ef] bg-[#f3f7fc] text-primary",
  },
  {
    title: "Senior customers",
    amount: "$30 off",
    text: "A straightforward discount on eligible approved repair work.",
    icon: HeartHandshake,
    iconClass: "border-[#f1c8d1] bg-[#fff5f7] text-[#b31942]",
  },
  {
    title: "Returning customers",
    amount: "$30 off",
    text: "A loyalty discount for repeat customers on eligible approved repairs.",
    icon: RotateCcw,
    iconClass: "border-[#c8d7e8] bg-[#f6f9fd] text-[#0a3161]",
  },
];

export function SavingsSection() {
  return (
    <section className="relative overflow-hidden bg-[#f7f9fc] py-8 sm:py-12" aria-label="Customer savings">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#b31942] via-white to-[#0a3161]" />
      <div className="container-shell">
        <FadeUp>
          <div className="relative overflow-hidden rounded-xl border border-[#d7e0ec] bg-white p-4 shadow-lg shadow-primary/10 sm:rounded-2xl sm:p-6 lg:p-8">
            <div className="savings-flag-wave" aria-hidden="true" />

            <div className="relative">
              <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b31942]">
                    Service savings
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-primary sm:text-[2.35rem]">
                    $30 repair discounts for local customers
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
                    Eligible veterans, military customers, seniors, and returning customers can
                    receive $30 off when repair work is approved.
                  </p>
                  <div className="mt-4 inline-flex rounded-full border border-[#d7e0ec] bg-white/90 px-3 py-2 text-xs font-bold text-primary shadow-sm backdrop-blur sm:px-4 sm:text-sm">
                    First repair promo code: WEB30
                  </div>
                  <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                    <BookOnlineButton
                      location="savings_section"
                      className="inline-flex items-center justify-center rounded-full bg-[#b31942] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#b31942]/20 transition hover:brightness-95 sm:px-6"
                    >
                      Book with savings
                    </BookOnlineButton>
                    <a
                      href="tel:+17042660508"
                      className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-[#12366f] sm:px-6"
                    >
                      Call +1 (704) 266-0508
                    </a>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
                  {savings.map((item, index) => (
                    <FadeUp key={item.title} delay={index * 0.08}>
                      <article className="relative h-full overflow-hidden rounded-lg border border-[#d8e2ef] bg-white/95 p-4 shadow-[0_10px_24px_rgba(15,42,86,0.09)] ring-1 ring-white/80 backdrop-blur transition hover:-translate-y-0.5 hover:border-[#b8c7dc] hover:shadow-[0_18px_34px_rgba(15,42,86,0.13)] sm:p-5 sm:shadow-[0_18px_38px_rgba(15,42,86,0.10)] sm:hover:shadow-[0_22px_44px_rgba(15,42,86,0.14)]">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#b31942] via-white to-[#0a3161]" />
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border sm:h-11 sm:w-11 ${item.iconClass}`}
                            aria-hidden="true"
                          >
                            <item.icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.2} />
                          </span>
                          <span className="rounded-full border border-[#d7e0ec] bg-[#f7f9fc] px-3 py-1 text-xs font-black text-primary shadow-sm sm:text-sm">
                            {item.amount}
                          </span>
                        </div>
                        <h3 className="mt-4 text-base font-extrabold text-primary sm:mt-5">{item.title}</h3>
                        <p className="mt-1.5 text-sm leading-5 text-muted sm:mt-2 sm:leading-6">{item.text}</p>
                      </article>
                    </FadeUp>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/70 bg-white/90 px-3 py-3 text-xs leading-5 text-muted shadow-sm backdrop-blur sm:mt-5 sm:rounded-xl sm:px-4 sm:leading-6">
                Valid when repair work is approved. Discount does not apply to diagnostic-only or
                service-call-only visits. Cannot be combined with other offers. Labor and parts billed
                separately. Restrictions may apply.
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
