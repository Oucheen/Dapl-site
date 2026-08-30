"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import { ArrowUp, CalendarCheck, ClipboardList, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { BookOnlineButton } from "@/components/ui/book-online-button";
import { TrackedAnchor } from "@/components/ui/tracked-anchor";

export function MobileStickyActions() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const updateBackToTop = () => {
      const hero = document.getElementById("top");
      const heroBottom = hero
        ? hero.getBoundingClientRect().bottom + window.scrollY
        : window.innerHeight;

      setShowBackToTop(window.scrollY > heroBottom - 80);
    };

    updateBackToTop();
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    window.addEventListener("resize", updateBackToTop);

    return () => {
      window.removeEventListener("scroll", updateBackToTop);
      window.removeEventListener("resize", updateBackToTop);
    };
  }, []);

  const scrollToTop = () => {
    sendGTMEvent({
      event: "scroll_to_top_click",
      location: "mobile_sticky_bar",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_34px_rgba(15,42,86,0.14)] backdrop-blur sm:hidden"
    >
      <div
        className={`grid gap-2 transition-[grid-template-columns] duration-200 ${
          showBackToTop ? "grid-cols-[1fr_1fr_1fr_3rem]" : "grid-cols-3"
        }`}
      >
        <TrackedAnchor
          href="tel:+17042660508"
          gtmEvent={{
            event: "phone_click",
            location: "mobile_sticky_bar",
            link_type: "sticky_cta",
          }}
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-primary px-2 text-xs font-black text-white shadow-sm shadow-primary/20"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Call
        </TrackedAnchor>
        <BookOnlineButton
          location="mobile_sticky_bar"
          className="!inline-flex !h-12 !min-h-0 !items-center !justify-center !gap-1.5 !rounded-full !border-0 !bg-[#177dcc] !px-2 !py-0 !text-xs !font-black !uppercase !leading-none !text-white !shadow-sm !shadow-[#177dcc]/20"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Book
        </BookOnlineButton>
        <TrackedAnchor
          href="#contact"
          gtmEvent={{
            event: "schedule_click",
            location: "mobile_sticky_bar",
          }}
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-accent px-2 text-xs font-black text-white shadow-sm shadow-accent/20"
        >
          <CalendarCheck className="h-4 w-4" aria-hidden="true" />
          Schedule
        </TrackedAnchor>
        {showBackToTop ? (
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            className="inline-flex h-12 items-center justify-center rounded-full border border-primary/15 bg-white text-primary shadow-sm shadow-primary/10"
          >
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
