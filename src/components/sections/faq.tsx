"use client";

import { useState } from "react";
import { faqItems } from "@/components/sections/faq-data";
import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-surface py-20">
      <div className="container-shell">
        <FadeUp>
          <SectionHeading
            eyebrow="FAQ"
            title="Common questions before you book service"
            description="A few quick answers about scheduling, service coverage, pricing, and the kinds of repairs we handle."
          />
        </FadeUp>

        <div className="mx-auto mt-10 max-w-4xl space-y-4">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <FadeUp key={item.question} delay={index * 0.04}>
                <article className="overflow-hidden rounded-2xl border border-border bg-[#f8fbff] shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-semibold text-foreground">{item.question}</span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-white text-lg font-medium text-primary">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="border-t border-border px-5 pb-5 pt-4 sm:px-6">
                      <p className="text-sm leading-7 text-muted">{item.answer}</p>
                    </div>
                  ) : null}
                </article>
              </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
