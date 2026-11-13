"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import {
  housecallProChatColor,
  housecallProChatOrganization,
  housecallProChatScriptUrl,
} from "@/components/ui/housecall-pro-config";

export function HousecallProChatScript() {
  const pathname = usePathname();
  const isPipeline = pathname === "/admin/pipeline" || pathname.startsWith("/admin/pipeline/");

  if (isPipeline) {
    return null;
  }

  return (
    <Script
      id="housecall-pro-chat-bubble"
      src={housecallProChatScriptUrl}
      strategy="afterInteractive"
      type="text/javascript"
      data-color={housecallProChatColor}
      data-organization={housecallProChatOrganization}
      defer
    />
  );
}
