"use client";

import { useEffect, useState } from "react";
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

const emptyCountdown = { hours: "--", minutes: "--", seconds: "--" };
const OFFER_START_HOUR = 2;
const OFFER_START_MINUTE = 0;
const OFFER_END_HOUR = 21;
const OFFER_END_MINUTE = 0;

type OfferTimerState = {
  isActive: boolean;
  countdown: typeof emptyCountdown;
};

function getSecondsSinceEasternMidnight() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = getPart("hour");
  const minute = getPart("minute");
  const second = getPart("second");

  return hour * 60 * 60 + minute * 60 + second;
}

function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
  };
}

function formatOfferEndLabel() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(Date.UTC(2000, 0, 1, OFFER_END_HOUR, OFFER_END_MINUTE)));
}

function getOfferTimerState(): OfferTimerState {
  const secondsSinceMidnight = getSecondsSinceEasternMidnight();
  const offerStartSeconds = OFFER_START_HOUR * 60 * 60 + OFFER_START_MINUTE * 60;
  const offerEndSeconds = OFFER_END_HOUR * 60 * 60 + OFFER_END_MINUTE * 60;

  if (secondsSinceMidnight < offerStartSeconds || secondsSinceMidnight >= offerEndSeconds) {
    return {
      isActive: false,
      countdown: emptyCountdown,
    };
  }

  const secondsLeft = offerEndSeconds - secondsSinceMidnight;

  return {
    isActive: true,
    countdown: formatCountdown(secondsLeft),
  };
}

export function OfferSection() {
  const { eyebrow, title, description, code, codeLabel, finePrint } = SITE_OFFER;
  const offerEndsLabel = formatOfferEndLabel();
  const [timer, setTimer] = useState<OfferTimerState>({
    isActive: true,
    countdown: emptyCountdown,
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTimer(getOfferTimerState());
    }, 0);

    const interval = window.setInterval(() => {
      setTimer(getOfferTimerState());
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

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
              <div className="flex flex-col justify-center gap-4 border-t border-border bg-[#f8fbff] p-6 sm:flex-row sm:items-center md:flex-col md:border-l md:border-t-0 md:px-8">
                <div className="w-full rounded-2xl border border-accent/20 bg-white p-4 text-center shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                    {timer.isActive ? "Offer ends in" : "Offer ended"}
                  </p>
                  {timer.isActive ? (
                    <>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {[
                          ["Hours", timer.countdown.hours],
                          ["Min", timer.countdown.minutes],
                          ["Sec", timer.countdown.seconds],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl bg-primary/5 px-2 py-2">
                            <p className="font-mono text-xl font-black text-primary">{value}</p>
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted">Today only, until {offerEndsLabel}</p>
                    </>
                  ) : (
                    <p className="mt-3 rounded-xl bg-primary/5 px-4 py-3 text-base font-bold text-primary">
                      Next offer soon
                    </p>
                  )}
                </div>
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
