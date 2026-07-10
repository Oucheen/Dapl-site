"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import Script from "next/script";

const bookingScriptUrl =
  "https://online-booking.housecallpro.com/script.js?token=598955567c7f416c96e1275fc1cf1061&orgName=DAPL";

const portalUrl =
  "https://client.housecallpro.com/customer_portal/request-link?token=07ab35cf32c34c808a9a53c561bd280a";

declare global {
  interface Window {
    HCPWidget?: {
      openModal: () => void;
    };
  }
}

export function HousecallProActions() {
  const openBookingModal = () => {
    sendGTMEvent({
      event: "schedule_click",
      location: "booking_page_hero",
      link_type: "housecall_pro_modal",
    });

    window.HCPWidget?.openModal();
  };

  const trackPortalClick = () => {
    sendGTMEvent({
      event: "portal_click",
      location: "booking_page_hero",
      link_type: "housecall_pro_portal",
    });
  };

  return (
    <>
      <Script id="housecall-pro-online-booking" src={bookingScriptUrl} strategy="afterInteractive" />
      <button
        type="button"
        data-token="598955567c7f416c96e1275fc1cf1061"
        data-orgname="DAPL"
        onClick={openBookingModal}
        className="hcp-button inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 sm:w-auto"
      >
        Book online
      </button>
      <a
        href={portalUrl}
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
