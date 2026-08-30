"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import { ArrowUp, CalendarCheck, ClipboardList, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { BookOnlineButton } from "@/components/ui/book-online-button";
import { TrackedAnchor } from "@/components/ui/tracked-anchor";

export function MobileStickyActions() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      const hero = document.getElementById("top");
      const heroBottom = hero
        ? hero.getBoundingClientRect().bottom + window.scrollY
        : window.innerHeight;

      setIsVisible(window.scrollY > heroBottom - 80);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
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
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_34px_rgba(15,42,86,0.14)] backdrop-blur transition duration-200 sm:hidden ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div className="grid grid-cols-[1fr_1fr_1fr_3rem] gap-2">
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
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="inline-flex h-12 items-center justify-center rounded-full border border-primary/15 bg-white text-primary shadow-sm shadow-primary/10"
        >
          <ArrowUp className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
