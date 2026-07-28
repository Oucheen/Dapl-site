"use client";

import { usePathname } from "next/navigation";
import { ChatLeadWidget } from "@/components/ui/chat-lead-widget";
import { ContactWidget } from "@/components/ui/contact-widget";

const HIDDEN_WIDGET_PATHS = ["/tech/report"];

export function GlobalWidgets() {
  const pathname = usePathname();
  const shouldHideWidgets = HIDDEN_WIDGET_PATHS.some((path) => pathname.startsWith(path));

  if (shouldHideWidgets) {
    return null;
  }

  return (
    <>
      <ChatLeadWidget />
      <ContactWidget />
    </>
  );
}
