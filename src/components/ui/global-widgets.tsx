"use client";

import { usePathname } from "next/navigation";
import { ChatLeadWidget } from "@/components/ui/chat-lead-widget";
import { ContactWidget } from "@/components/ui/contact-widget";

const HIDDEN_WIDGET_PATHS = ["/admin", "/app", "/phone", "/i", "/tech/report", "/tech/invoice", "/v"];

export function GlobalWidgets() {
  const pathname = usePathname();
  const shouldHideWidgets = HIDDEN_WIDGET_PATHS.some((path) => pathname.startsWith(path));

  if (shouldHideWidgets) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-[6.75rem] right-[4.75rem] z-[1290] whitespace-nowrap rounded-full border border-[#0e6fbe]/15 bg-white/95 px-2.5 py-1 text-[0.65rem] font-bold text-[#0e6fbe] shadow-[0_8px_20px_rgba(15,42,86,0.12)] sm:bottom-8 sm:right-20 sm:text-xs"
      >
        Live support
      </div>
      <ChatLeadWidget />
      <ContactWidget />
    </>
  );
}
