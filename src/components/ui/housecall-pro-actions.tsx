"use client";

import { Phone } from "lucide-react";
import { BookOnlineButton } from "@/components/ui/book-online-button";
import { TrackedAnchor } from "@/components/ui/tracked-anchor";

export function HousecallProActions() {
  return (
    <>
      <TrackedAnchor
        href="#contact"
        gtmEvent={{
          event: "schedule_click",
          location: "booking_page_hero",
          link_type: "primary_cta",
        }}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition hover:brightness-95 sm:w-auto"
      >
        Schedule Your Repair
      </TrackedAnchor>
      <BookOnlineButton
        location="booking_page_hero"
        className="!inline-flex !min-h-12 !w-full !items-center !justify-center !rounded-full !border-0 !bg-[#177dcc] !px-6 !py-3 !text-sm !font-semibold !text-white !shadow-lg !shadow-[#177dcc]/20 transition hover:!bg-[#126cad] sm:!w-auto"
      >
        Book Online
      </BookOnlineButton>
      <TrackedAnchor
        href="tel:+19803936588"
        gtmEvent={{
          event: "phone_click",
          location: "booking_page_hero",
          link_type: "primary_cta",
        }}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 sm:w-auto"
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        Call +1 (980) 393-6588
      </TrackedAnchor>
    </>
  );
}
