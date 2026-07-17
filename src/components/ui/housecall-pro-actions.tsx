"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import { BookOnlineButton } from "@/components/ui/book-online-button";
import { housecallProPortalUrl } from "@/components/ui/housecall-pro-config";

export function HousecallProActions() {
  const trackPortalClick = () => {
    sendGTMEvent({
      event: "portal_click",
      location: "booking_page_hero",
      link_type: "housecall_pro_portal",
    });
  };

  return (
    <>
      <BookOnlineButton
        location="booking_page_hero"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 sm:w-auto"
      >
        Book Online
      </BookOnlineButton>
      <a
        href={housecallProPortalUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackPortalClick}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-primary/20 bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5 sm:w-auto"
      >
        Log in to portal
      </a>
    </>
  );
}
