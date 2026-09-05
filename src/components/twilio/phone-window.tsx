"use client";

import { useEffect } from "react";
import { CallWidget } from "@/components/twilio/call-widget";
import { useTwilioVoice } from "@/components/twilio/twilio-voice-provider";

export function PhoneWindow() {
  const { enabled, enablePhone } = useTwilioVoice();

  useEffect(() => {
    if (!enabled) {
      void enablePhone();
    }
  }, [enabled, enablePhone]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-foreground">
      <header className="mx-auto max-w-sm rounded-2xl border border-border bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent">DAPL</p>
        <h1 className="mt-1 text-2xl font-black text-primary">Phone</h1>
        <p className="mt-2 text-xs leading-5 text-muted">Keep this window open to receive calls while you work in other tabs.</p>
      </header>
      <CallWidget />
    </main>
  );
}
