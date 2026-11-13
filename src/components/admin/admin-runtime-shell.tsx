"use client";

import { usePathname } from "next/navigation";
import { CallWidget } from "@/components/twilio/call-widget";
import { TwilioVoiceProvider } from "@/components/twilio/twilio-voice-provider";

export function AdminRuntimeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPipeline = pathname === "/admin/pipeline" || pathname.startsWith("/admin/pipeline/");

  if (isPipeline) {
    return <>{children}</>;
  }

  return (
    <TwilioVoiceProvider>
      {children}
      <CallWidget />
    </TwilioVoiceProvider>
  );
}
