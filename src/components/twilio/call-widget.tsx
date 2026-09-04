"use client";

import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Grid3X3, Bell, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTwilioVoice } from "@/components/twilio/twilio-voice-provider";

function duration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function CallButton({ phone, name, leadId, className }: { phone: string; name?: string; leadId?: string; className?: string }) {
  const { callCustomer } = useTwilioVoice();
  return <button type="button" onClick={() => void callCustomer({ phone, name, leadId })} className={className || "inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-primary/90"}><Phone className="h-3.5 w-3.5" aria-hidden="true" /> Call</button>;
}

export function CallWidget() {
  const voice = useTwilioVoice();
  const [number, setNumber] = useState("");
  const [showKeypad, setShowKeypad] = useState(true);
  const handleKeypadDigit = (digit: string) => {
    if (voice.currentCall) {
      voice.sendDigits(digit);
      return;
    }

    setNumber((value) => `${value}${digit}`);
  };

  return (
    <>
      {voice.incomingCall ? (
        <div className="fixed inset-x-3 top-4 z-[80] mx-auto max-w-md rounded-2xl border border-accent/25 bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">Incoming call</p><h2 className="mt-1 text-xl font-black text-primary">{voice.incomingCall.name}</h2><p className="mt-1 text-sm font-bold text-muted">{voice.incomingCall.phone || "Unknown number"}</p></div><PhoneCall className="h-7 w-7 animate-pulse text-accent" aria-hidden="true" /></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={voice.acceptIncoming} className="min-h-12 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white">Answer</button><button type="button" onClick={voice.declineIncoming} className="min-h-12 rounded-xl bg-accent px-3 text-sm font-black text-white">Decline</button></div>
        </div>
      ) : null}

      {voice.currentCall ? (
        <div className="fixed bottom-20 right-3 z-[70] w-[min(23rem,calc(100vw-1.5rem))] rounded-2xl border border-primary/15 bg-white p-4 shadow-2xl sm:bottom-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.14em] text-accent">{voice.currentCall.status}</p><p className="mt-1 truncate text-lg font-black text-primary">{voice.currentCall.name}</p><p className="text-sm font-bold text-muted">{voice.currentCall.phone}</p></div><span className="font-mono text-sm font-black text-primary">{duration(voice.elapsedSeconds)}</span></div>
          <div className="mt-4 grid grid-cols-3 gap-2"><button type="button" onClick={voice.toggleMute} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border px-2 text-xs font-black text-primary">{voice.currentCall.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{voice.currentCall.muted ? "Unmute" : "Mute"}</button><button type="button" onClick={() => setShowKeypad((value) => !value)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border px-2 text-xs font-black text-primary"><Grid3X3 className="h-4 w-4" /> Keypad</button><button type="button" onClick={voice.hangUp} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-accent px-2 text-xs font-black text-white"><PhoneOff className="h-4 w-4" /> Hang up</button></div>
          {showKeypad ? <div className="mt-3 grid grid-cols-3 gap-2">{digits.map((digit) => <button key={digit} type="button" onClick={() => voice.sendDigits(digit)} className="min-h-10 rounded-lg bg-slate-50 text-sm font-black text-primary hover:bg-primary/10">{digit}</button>)}</div> : null}
          {voice.inputDevices.length || voice.outputDevices.length ? <div className="mt-3 grid gap-2"><select aria-label="Microphone" onChange={(event) => void voice.setInputDevice(event.target.value)} className="rounded-lg border border-border px-2 py-2 text-xs"><option>Microphone</option>{voice.inputDevices.map((device) => <option key={device.id} value={device.id}>{device.label}</option>)}</select><select aria-label="Speaker" onChange={(event) => void voice.setOutputDevice(event.target.value)} className="rounded-lg border border-border px-2 py-2 text-xs"><option>Speaker</option>{voice.outputDevices.map((device) => <option key={device.id} value={device.id}>{device.label}</option>)}</select></div> : null}
        </div>
      ) : null}

      <div className="fixed bottom-3 left-3 z-[60] w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-white p-3 shadow-xl sm:bottom-4 sm:left-auto sm:right-3">
        <div className="flex items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">DAPL Phone</p><div className="flex items-center gap-2"><Link href="/admin/calls" className="text-[0.65rem] font-black uppercase tracking-[0.08em] text-primary underline-offset-2 hover:underline">History</Link><span className={`text-[0.65rem] font-black uppercase ${voice.deviceState === "registered" ? "text-emerald-600" : "text-muted"}`}>{voice.deviceState}</span></div></div>
        <div className="mt-2 flex gap-2">
          {!voice.enabled ? <button type="button" onClick={() => void voice.enablePhone()} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-black text-white"><Bell className="h-4 w-4" /> Enable phone</button> : null}
          <div className="relative min-w-0 flex-1"><Phone className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" /><input type="tel" inputMode="tel" autoComplete="tel" aria-label="Phone number" value={number} onChange={(event) => setNumber(event.target.value)} placeholder="Enter phone number" className="h-10 w-full rounded-xl border border-border bg-slate-50 pl-8 pr-3 text-sm font-semibold text-primary outline-none transition placeholder:text-muted/70 focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10" /></div>
          <button type="button" disabled={!number.trim()} title={number.trim() ? "Call number" : "Enter a phone number first"} onClick={() => void voice.callCustomer({ phone: number })} className={`inline-flex h-10 w-11 shrink-0 items-center justify-center rounded-xl text-white transition ${number.trim() ? "bg-primary shadow-sm hover:bg-primary/90" : "cursor-not-allowed bg-slate-300"}`}><Phone className="h-4 w-4" /></button>
        </div>
        {voice.enabled && !voice.currentCall ? <div className="mt-3 rounded-lg border border-border bg-slate-50 p-2"><div className="mb-2 flex items-center justify-between"><span className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-muted">Dial pad</span><button type="button" onClick={() => setShowKeypad((value) => !value)} className="text-[0.65rem] font-black text-primary">{showKeypad ? "Hide" : "Show"}</button></div>{showKeypad ? <div className="grid grid-cols-3 gap-1.5">{digits.map((digit) => <button key={digit} type="button" onClick={() => handleKeypadDigit(digit)} className="min-h-9 rounded-md bg-white text-sm font-black text-primary shadow-sm hover:bg-primary/10">{digit}</button>)}<button type="button" onClick={() => setNumber((value) => value.slice(0, -1))} className="min-h-9 rounded-md bg-white text-xs font-black text-primary shadow-sm hover:bg-primary/10">⌫</button><button type="button" onClick={() => setNumber("")} className="min-h-9 rounded-md bg-white text-xs font-black text-primary shadow-sm hover:bg-primary/10">Clear</button></div> : null}</div> : null}
        {voice.error ? <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 p-2 text-xs font-bold text-red-800"><span className="min-w-0 flex-1">{voice.error}</span><button type="button" onClick={voice.clearError} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div> : null}
      </div>
    </>
  );
}
