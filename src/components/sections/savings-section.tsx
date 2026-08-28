import { BookOnlineButton } from "@/components/ui/book-online-button";
import { FadeUp } from "@/components/ui/fade-up";

const savings = [
  {
    title: "Veterans and military",
    amount: "$30 off",
    text: "Thank-you savings for veterans and active-duty military customers.",
  },
  {
    title: "Senior customers",
    amount: "$30 off",
    text: "A simple senior discount on eligible completed repair work.",
  },
  {
    title: "Returning customers",
    amount: "$30 off",
    text: "For repeat customers when the appliance repair is completed.",
  },
];

export function SavingsSection() {
  return (
    <section className="relative overflow-hidden bg-[#f7f9fc] py-12" aria-label="Customer savings">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#b31942] via-white to-[#0a3161]" />
      <div className="container-shell">
        <FadeUp>
          <div
            className="relative overflow-hidden rounded-2xl border border-[#d7e0ec] bg-white bg-no-repeat p-5 shadow-lg shadow-primary/10 sm:p-6 lg:p-8"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.82) 36%, rgba(255,255,255,0.18) 72%, rgba(255,255,255,0.02) 100%)",
            }}
          >
            <div className="savings-flag-wave" aria-hidden="true" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.5)_38%,rgba(255,255,255,0.08)_72%,rgba(255,255,255,0)_100%)]" />

            <div className="relative">
              <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b31942]">
                    Service savings
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-[2.35rem]">
                    $30 repair discounts for local customers
                  </h2>
                  <p className="mt-3 max-w-xl text-base leading-7 text-muted">
                    Veterans, military customers, seniors, and returning customers can receive a
                    customer-facing discount when eligible repair work is completed.
                  </p>
                  <div className="mt-4 inline-flex rounded-full border border-[#d7e0ec] bg-white/85 px-4 py-2 text-sm font-bold text-primary shadow-sm backdrop-blur">
                    First repair promo code: WEB30
                  </div>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <BookOnlineButton
                      location="savings_section"
                      className="inline-flex items-center justify-center rounded-full bg-[#b31942] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#b31942]/20 transition hover:brightness-95"
                    >
                      Book with savings
                    </BookOnlineButton>
                    <a
                      href="tel:+17042660508"
                      className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-[#12366f]"
                    >
                      Call +1 (704) 266-0508
                    </a>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {savings.map((item, index) => (
                    <FadeUp key={item.title} delay={index * 0.08}>
                      <article className="h-full rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg">
                        <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-[#b31942] via-white to-[#0a3161]" />
                        <p className="mt-4 text-2xl font-black text-primary">{item.amount}</p>
                        <h3 className="mt-2 text-base font-extrabold text-primary">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
                      </article>
                    </FadeUp>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/70 bg-white/85 px-4 py-3 text-xs leading-6 text-muted shadow-sm backdrop-blur">
                Valid when repair service is completed. One discount per invoice. Discounts may not
                be combined with promo codes or other offers. Parts, taxes, and diagnostic-only visits
                may not qualify.
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
