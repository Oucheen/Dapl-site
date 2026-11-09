"use client";

import Script from "next/script";
import {
  housecallProChatColor,
  housecallProChatOrganization,
  housecallProChatScriptUrl,
} from "@/components/ui/housecall-pro-config";

export function HousecallProChatLoader() {
  return (
    <Script
      id="housecall-pro-chat"
      src={housecallProChatScriptUrl}
      strategy="afterInteractive"
      type="text/javascript"
      data-color={housecallProChatColor}
      data-organization={housecallProChatOrganization}
      onReady={() => {
        if (!document.getElementById("proChatIframeContainer")) {
          console.warn("Housecall Pro chat script loaded without creating its widget container.");
        }
      }}
      onError={() => {
        console.error("Housecall Pro chat script failed to load.");
      }}
    />
  );
}
