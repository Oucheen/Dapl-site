"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const CONSENT_STORAGE_KEY = "dapl_cookie_consent";

type ConsentChoice = "accepted" | "declined";

type ConsentState = {
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  analytics_storage: "granted" | "denied";
};

type WindowWithGtag = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function ensureGtag(win: WindowWithGtag) {
  win.dataLayer = win.dataLayer || [];
  win.gtag =
    win.gtag ||
    ((...args: unknown[]) => {
      win.dataLayer?.push(args);
    });

  return win.gtag;
}

function getConsentState(choice: ConsentChoice): ConsentState {
  const value = choice === "accepted" ? "granted" : "denied";

  return {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  };
}

function updateGoogleConsent(choice: ConsentChoice) {
  const win = window as WindowWithGtag;
  const gtag = ensureGtag(win);

  gtag("consent", "update", getConsentState(choice));
  win.dataLayer?.push({
    event: "cookie_consent_update",
    cookie_consent: choice,
  });
}

export function CookieConsent() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    if (isAdminRoute) {
      return;
    }

    try {
      const savedChoice = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      setIsVisible(savedChoice !== "accepted" && savedChoice !== "declined");
    } catch {
      setIsVisible(true);
    }
  }, [isAdminRoute]);

  if (!isMounted || !isVisible || isAdminRoute) {
    return null;
  }

  const saveChoice = (choice: ConsentChoice) => {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch {
      // If storage is unavailable, still apply the choice for this session.
    }

    updateGoogleConsent(choice);
    setIsVisible(false);
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl">
      <div className="rounded-2xl border border-border/80 bg-white/95 p-4 shadow-[0_22px_60px_rgba(15,42,86,0.16)] backdrop-blur-md sm:flex sm:items-center sm:gap-5 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-primary">
            We use cookies to improve this website.
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground/75">
            DAPL Appliance Repair uses analytics and advertising cookies to
            understand visits and measure booking requests. You can accept or
            decline non-essential cookies.
          </p>
          <Link
            href="/privacy-policy"
            className="mt-2 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:w-44">
          <button
            type="button"
            onClick={() => saveChoice("accepted")}
            className="rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(204,31,45,0.2)] transition hover:-translate-y-0.5 hover:bg-accent/90"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => saveChoice("declined")}
            className="rounded-full border border-border bg-white px-5 py-3 text-sm font-bold text-primary transition hover:border-primary/30 hover:bg-primary/5"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
