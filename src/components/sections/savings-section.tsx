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
    <section className="relative overflow-hidden bg-[#f7f9fc] py-16" aria-label="Customer savings">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#b31942] via-white to-[#0a3161]" />
      <div className="container-shell">
        <FadeUp>
          <div className="relative overflow-hidden rounded-3xl border border-[#d7e0ec] bg-[#0a3161] p-1 shadow-xl shadow-primary/10">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:18px_18px]" />
            <div className="relative rounded-[1.35rem] bg-gradient-to-br from-white via-white to-[#f3f6fb] p-6 sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b31942]">
                    Service savings
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-primary sm:text-4xl">
                    $30 thank-you discounts for our local neighbors
                  </h2>
                  <p className="mt-4 text-base leading-7 text-muted">
                    Mention your discount before the invoice is finalized. Savings are added as visible
                    invoice lines when the repair qualifies.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
                      <article className="h-full rounded-2xl border border-[#d7e0ec] bg-white p-5 shadow-sm">
                        <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-[#b31942] to-[#0a3161]" />
                        <p className="mt-5 text-3xl font-black text-primary">{item.amount}</p>
                        <h3 className="mt-3 text-base font-extrabold text-primary">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
                      </article>
                    </FadeUp>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#d7e0ec] bg-[#f8fafc] px-4 py-3 text-xs leading-6 text-muted">
                Valid when repair service is completed. One discount per invoice. Discounts may not be
                combined with promo codes or other offers. Parts, taxes, and diagnostic-only visits may not
                qualify.
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
