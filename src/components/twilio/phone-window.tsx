"use client";

import { useEffect, useRef } from "react";
import { CallIntakePanel } from "@/components/twilio/call-intake-panel";
import { CallWidget } from "@/components/twilio/call-widget";
import { RecentCallHistory } from "@/components/twilio/recent-call-history";
import { useTwilioVoice } from "@/components/twilio/twilio-voice-provider";

export function PhoneWindow() {
  const voice = useTwilioVoice();
  const { enabled, enablePhone, callCustomer } = voice;
  const autoCallStarted = useRef(false);

  useEffect(() => {
    if (!enabled) {
      void enablePhone();
    }
  }, [enabled, enablePhone]);

  useEffect(() => {
    if (!enabled || autoCallStarted.current) return;
    const params = new URLSearchParams(window.location.search);
    const phone = params.get("to")?.trim();
    if (!phone) return;

    autoCallStarted.current = true;
    void callCustomer({
      phone,
      name: params.get("name") || undefined,
      leadId: params.get("leadId") || undefined,
    });
  }, [enabled, callCustomer]);

  const activeCall = voice.currentCall ?? voice.incomingCall;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-foreground">
      <header className="mx-auto max-w-sm rounded-2xl border border-border bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent">DAPL</p>
        <h1 className="mt-1 text-2xl font-black text-primary">Phone</h1>
        <p className="mt-2 text-xs leading-5 text-muted">Keep this window open to receive calls while you work in other tabs.</p>
      </header>
      <RecentCallHistory refreshKey={activeCall ? `${activeCall.call.parameters.CallSid || activeCall.phone}:${activeCall.status}` : "idle"} />
      {activeCall ? <CallIntakePanel key={`${activeCall.call.parameters.CallSid || activeCall.phone}-${activeCall.customer ? "loaded" : "pending"}-${activeCall.customer?.leadId || activeCall.leadId || "unknown"}`} call={activeCall} /> : null}
      <CallWidget />
    </main>
  );
}
