"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function ContactWidget() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

  const scheduleHref = useMemo(() => {
    const isServicePage = pathname?.includes("-repair-charlotte-nc");
    const hasInlineContact = pathname === "/" || pathname === "/returning-customer-offer" || isServicePage;
    return hasInlineContact ? "#contact" : "/#contact";
  }, [pathname]);

  const scrollToTop = () => {
    setIsOpen(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5 transition-all duration-200 ${
        isVisible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <div
        className={`flex flex-col items-end gap-2 transition-all duration-200 ${
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <a
          href="tel:+17042660508"
          onClick={() => {
            setIsOpen(false);
            sendGTMEvent({
              event: "phone_click",
              location: "contact_widget",
              link_type: "widget",
            });
          }}
          className="inline-flex min-w-[7.25rem] items-center justify-between rounded-full border border-primary/12 bg-white px-3.5 py-2.5 text-[0.82rem] font-semibold text-primary shadow-md shadow-primary/8 transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span>Call</span>
          <span className="text-sm">{"\u260E"}</span>
        </a>
        {scheduleHref.startsWith("#") ? (
          <a
            href={scheduleHref}
            onClick={() => {
              setIsOpen(false);
              sendGTMEvent({
                event: "schedule_click",
                location: "contact_widget",
              });
            }}
            className="inline-flex min-w-[7.25rem] items-center justify-between rounded-full bg-accent px-3.5 py-2.5 text-[0.82rem] font-semibold text-accent-foreground shadow-md shadow-accent/15 transition hover:-translate-y-0.5 hover:brightness-95"
          >
            <span>Schedule</span>
            <span className="text-sm">{"\u2197"}</span>
          </a>
        ) : (
          <Link
            href={scheduleHref}
            onClick={() => {
              setIsOpen(false);
              sendGTMEvent({
                event: "schedule_click",
                location: "contact_widget",
              });
            }}
            className="inline-flex min-w-[7.25rem] items-center justify-between rounded-full bg-accent px-3.5 py-2.5 text-[0.82rem] font-semibold text-accent-foreground shadow-md shadow-accent/15 transition hover:-translate-y-0.5 hover:brightness-95"
          >
            <span>Schedule</span>
            <span className="text-sm">{"\u2197"}</span>
          </Link>
        )}
        <button
          type="button"
          onClick={scrollToTop}
          className="inline-flex min-w-[7.25rem] items-center justify-between rounded-full border border-primary/12 bg-white px-3.5 py-2.5 text-[0.82rem] font-semibold text-primary shadow-md shadow-primary/8 transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span>Top</span>
          <span className="text-sm">{"\u2191"}</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close contact actions" : "Open contact actions"}
        className="inline-flex h-12 items-center gap-2 rounded-full border border-primary/15 bg-white px-3.5 text-[0.82rem] font-semibold text-primary shadow-lg shadow-primary/10 transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-white">
          {"\u260E"}
        </span>
        <span>Contact</span>
      </button>
    </div>
  );
}
