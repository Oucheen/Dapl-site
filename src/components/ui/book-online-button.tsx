"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { housecallProBookingToken, housecallProOrgName } from "@/components/ui/housecall-pro-config";
import { measureOpenAICustomEvent } from "@/lib/openai-pixel";

declare global {
  interface Window {
    HCPWidget?: {
      openModal: () => void;
    };
  }
}

type BookOnlineButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  location: string;
  gtmEvent?: Record<string, unknown>;
};

export function BookOnlineButton({
  children = "Book Online",
  className = "",
  gtmEvent,
  location,
  onClick,
  ...props
}: BookOnlineButtonProps) {
  return (
    <button
      {...props}
      type="button"
      data-token={housecallProBookingToken}
      data-orgname={housecallProOrgName}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        sendGTMEvent({
          event: "schedule_click",
          location,
          link_type: "housecall_pro_modal",
          ...gtmEvent,
        });
        sendGTMEvent({
          event: "book_online_click",
          location,
          link_type: "housecall_pro_modal",
          booking_provider: "housecall_pro",
          ...gtmEvent,
        });
        measureOpenAICustomEvent("booking_started");

        window.HCPWidget?.openModal();
      }}
      className={`hcp-button ${className}`}
    >
      {children}
    </button>
  );
}
