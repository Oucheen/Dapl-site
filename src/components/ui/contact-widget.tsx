"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.35 1.9.68 2.8a2 2 0 0 1-.45 2.11L8.09 9.88a16 16 0 0 0 6 6l1.25-1.25a2 2 0 0 1 2.11-.45c.9.33 1.84.55 2.8.68A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function ArrowUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

export function ContactWidget() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const visible = window.scrollY > 180;
      setIsVisible(visible);

      if (!visible) {
        setIsOpen(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!widgetRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const scheduleHref = useMemo(() => {
    const isServicePage = pathname?.includes("-repair-charlotte-nc");
    const hasInlineContact =
      pathname === "/" || pathname === "/booking" || pathname === "/returning-customer-offer" || isServicePage;
    return hasInlineContact ? "#contact" : "/booking";
  }, [pathname]);

  const scrollToTop = () => {
    setIsOpen(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const closeWidget = () => setIsOpen(false);

  return (
    <div
      ref={widgetRef}
      className={`fixed bottom-5 right-5 z-40 flex flex-col items-end transition-all duration-200 ${
        isVisible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <div
        className={`transition-all duration-200 ${
          isOpen
            ? "mb-1 translate-y-0 opacity-100"
            : "pointer-events-none mb-0 translate-y-2 opacity-0"
        }`}
      >
        <div className="w-[11rem] rounded-[1.15rem] border border-border/80 bg-white/95 p-2 shadow-[0_18px_42px_rgba(15,42,86,0.14)] backdrop-blur-sm">
          <div className="flex flex-col gap-1.5">
            <a
              href="tel:+17042660508"
              onClick={() => {
                closeWidget();
                sendGTMEvent({
                  event: "phone_click",
                  location: "contact_widget",
                  link_type: "widget",
                });
              }}
              className="flex items-center justify-between rounded-xl px-2.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              <span className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-sm shadow-primary/20">
                  <PhoneIcon className="h-4 w-4" />
                </span>
                <span>Call</span>
              </span>
            </a>

            {scheduleHref.startsWith("#") ? (
              <a
                href={scheduleHref}
                onClick={() => {
                  closeWidget();
                  sendGTMEvent({
                    event: "schedule_click",
                    location: "contact_widget",
                  });
                }}
                className="flex items-center justify-between rounded-xl px-2.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
              >
                <span className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-sm shadow-accent/20">
                    <CalendarIcon className="h-4 w-4" />
                  </span>
                  <span>Schedule</span>
                </span>
              </a>
            ) : (
              <Link
                href={scheduleHref}
                onClick={() => {
                  closeWidget();
                  sendGTMEvent({
                    event: "schedule_click",
                    location: "contact_widget",
                  });
                }}
                className="flex items-center justify-between rounded-xl px-2.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
              >
                <span className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-sm shadow-accent/20">
                    <CalendarIcon className="h-4 w-4" />
                  </span>
                  <span>Schedule</span>
                </span>
              </Link>
            )}

            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center justify-between rounded-xl px-2.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              <span className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/12 bg-primary/5 text-primary">
                  <ArrowUpIcon className="h-4 w-4" />
                </span>
                <span>Top</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close contact actions" : "Open contact actions"}
        className={`relative inline-flex h-14 w-14 items-center justify-center text-white transition duration-200 hover:-translate-y-0.5 ${
          isOpen
            ? "rounded-[1.15rem] bg-primary shadow-[0_18px_42px_rgba(15,42,86,0.18)]"
            : "rounded-full bg-primary shadow-[0_16px_34px_rgba(15,42,86,0.22)] hover:shadow-[0_20px_40px_rgba(15,42,86,0.28)]"
        }`}
      >
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-accent" aria-hidden="true" />
        <span
          className={`inline-flex h-9 w-9 items-center justify-center border border-white/12 bg-white/8 text-base text-white transition ${
            isOpen ? "rounded-xl" : "rounded-full"
          }`}
        >
          <PhoneIcon className="h-5 w-5" />
        </span>
      </button>
    </div>
  );
}
