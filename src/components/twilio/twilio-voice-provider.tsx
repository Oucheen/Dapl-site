"use client";

import { Call, Device } from "@twilio/voice-sdk";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type DeviceOption = { id: string; label: string };
export type CustomerInfo = {
  leadId?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  appliance?: string | null;
  leadSource?: string | null;
  preferredDate?: string | null;
  message?: string | null;
  status?: string | null;
  adminNotes?: string | null;
};

export type CallInfo = {
  call: Call;
  name: string;
  phone: string;
  direction: "incoming" | "outgoing";
  status: "Calling" | "Ringing" | "Connected" | "Ended";
  startedAt: number;
  muted: boolean;
  leadId?: string;
  customer?: CustomerInfo;
};

type VoiceContextValue = {
  enabled: boolean;
  deviceState: string;
  currentCall: CallInfo | null;
  incomingCall: CallInfo | null;
  elapsedSeconds: number;
  error: string;
  inputDevices: DeviceOption[];
  outputDevices: DeviceOption[];
  enablePhone: () => Promise<void>;
  callCustomer: (input: { phone: string; name?: string; leadId?: string }) => Promise<void>;
  acceptIncoming: () => void;
  declineIncoming: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  sendDigits: (digits: string) => void;
  setInputDevice: (id: string) => Promise<void>;
  setOutputDevice: (id: string) => Promise<void>;
  clearError: () => void;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

function formatPhone(value: string) {
  return value.trim();
}

export function TwilioVoiceProvider({ children }: { children: React.ReactNode }) {
  const deviceRef = useRef<Device | null>(null);
  const incomingRef = useRef<CallInfo | null>(null);
  const tokenIdentityRef = useRef("");
  const userNameRef = useRef("");
  const [enabled, setEnabled] = useState(false);
  const [deviceState, setDeviceState] = useState("unregistered");
  const [currentCall, setCurrentCall] = useState<CallInfo | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [inputDevices, setInputDevices] = useState<DeviceOption[]>([]);
  const [outputDevices, setOutputDevices] = useState<DeviceOption[]>([]);

  const refreshAudioDevices = useCallback((device: Device) => {
    const audio = device.audio;
    if (!audio) return;
    setInputDevices([...audio.availableInputDevices.values()].map((item) => ({ id: item.deviceId, label: item.label || "Microphone" })));
    setOutputDevices([...audio.availableOutputDevices.values()].map((item) => ({ id: item.deviceId, label: item.label || "Speaker" })));
  }, []);

  const showIncomingNotification = useCallback(async (info: CallInfo) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const title = "Incoming call";
    const body = `${info.name || "Unknown caller"} — ${info.phone || "Unknown number"}`;
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, { body, icon: "/icon.png", tag: `incoming-call-${info.phone}`, data: { url: `${window.location.origin}/phone` } });
    } catch {
      const notification = new Notification(title, { body, icon: "/icon.png" });
      notification.onclick = () => {
        const phoneWindow = window.open("/phone", "dapl-phone", "popup=yes,width=430,height=760,resizable=yes,scrollbars=yes");
        phoneWindow?.focus();
        notification.close();
      };
    }
  }, []);

  const bindCall = useCallback((call: Call, info: Omit<CallInfo, "call" | "status" | "startedAt" | "muted">) => {
    const base = { ...info, call, status: info.direction === "outgoing" ? "Calling" : "Ringing", startedAt: Date.now(), muted: false } as CallInfo;
    const update = (status: CallInfo["status"]) => {
      setCurrentCall((existing) => existing?.call === call ? { ...existing, status } : existing);
      setIncomingCall((existing) => existing?.call === call ? { ...existing, status } : existing);
    };

    call.on("ringing", () => update("Ringing"));
    call.on("accept", () => update("Connected"));
    call.on("disconnect", () => {
      update("Ended");
      window.setTimeout(() => {
        setCurrentCall((existing) => existing?.call === call ? null : existing);
        setIncomingCall((existing) => existing?.call === call ? null : existing);
      }, 120_000);
    });
    call.on("cancel", () => {
      update("Ended");
      setIncomingCall((existing) => existing?.call === call ? null : existing);
    });
    call.on("reject", () => setIncomingCall((existing) => existing?.call === call ? null : existing));
    call.on("error", (callError) => setError(callError.message || "Call failed."));
    return base;
  }, []);

  const createDevice = useCallback(async () => {
    const response = await fetch("/api/twilio/token", { cache: "no-store" });
    const data = (await response.json()) as { token?: string; identity?: string; userName?: string; error?: string };
    if (!response.ok || !data.token) throw new Error(data.error || "Could not initialize phone.");

    tokenIdentityRef.current = data.identity || "";
    userNameRef.current = data.userName || "";
    const device = new Device(data.token, { closeProtection: true, enableImprovedSignalingErrorPrecision: true, appName: "DAPL CRM", appVersion: "1.0" });
    device.on("registering", () => setDeviceState("registering"));
    device.on("registered", () => setDeviceState("registered"));
    device.on("unregistered", () => setDeviceState("unregistered"));
    device.on("error", (deviceError) => setError(deviceError.message || "Phone connection error."));
    device.on("tokenWillExpire", async () => {
      try {
        const refresh = await fetch("/api/twilio/token", { cache: "no-store" });
        const next = (await refresh.json()) as { token?: string };
        if (next.token) device.updateToken(next.token);
      } catch {
        setError("Phone session expired. Please re-enable the phone.");
      }
    });
    device.on("incoming", (call) => {
      const phone = formatPhone(call.parameters.From || "");
      const initial = bindCall(call, { name: "Unknown caller", phone, direction: "incoming" });
      incomingRef.current = initial;
      setIncomingCall(initial);
      void showIncomingNotification(initial);
      void fetch(`/api/twilio/customer?phone=${encodeURIComponent(phone)}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() as Promise<CustomerInfo> : null)
        .then((customer) => {
          if (!customer) return;
          const updated = { ...initial, name: customer.name || initial.name, leadId: customer.leadId || undefined, customer };
          incomingRef.current = updated;
          setIncomingCall((existing) => existing?.call === call ? updated : existing);
          void showIncomingNotification(updated);
        })
        .catch(() => undefined);
    });
    device.audio?.on("deviceChange", () => refreshAudioDevices(device));
    deviceRef.current = device;
    refreshAudioDevices(device);
    await device.register();
    setEnabled(true);
  }, [bindCall, refreshAudioDevices, showIncomingNotification]);

  const enablePhone = useCallback(async () => {
    setError("");
    try {
      if ("serviceWorker" in navigator) await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
      if (!deviceRef.current) await createDevice();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not enable phone.");
    }
  }, [createDevice]);

  const callCustomer = useCallback(async (input: { phone: string; name?: string; leadId?: string }) => {
    setError("");
    try {
      if (!deviceRef.current) await enablePhone();
      const device = deviceRef.current;
      if (!device) throw new Error("Phone is not ready. Click Enable phone first.");
      const call = await device.connect({ params: { To: input.phone, leadId: input.leadId || "", customerName: input.name || "", employeeName: userNameRef.current, employeeId: tokenIdentityRef.current } });
      const info = bindCall(call, { name: input.name || "Customer", phone: input.phone, direction: "outgoing", leadId: input.leadId });
      setElapsedSeconds(0);
      setCurrentCall(info);
      void fetch(`/api/twilio/customer?phone=${encodeURIComponent(input.phone)}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() as Promise<CustomerInfo> : null)
        .then((customer) => {
          if (!customer) return;
          setCurrentCall((existing) => existing?.call === call ? { ...existing, name: customer.name || existing.name, leadId: customer.leadId || existing.leadId, customer } : existing);
        })
        .catch(() => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not place call.");
    }
  }, [bindCall, enablePhone]);

  const acceptIncoming = useCallback(() => {
    const info = incomingRef.current;
    if (!info) return;
    info.call.accept();
    setElapsedSeconds(0);
    setCurrentCall(info);
    setIncomingCall(null);
    incomingRef.current = null;
    void fetch("/api/twilio/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callSid: info.call.parameters.CallSid }) });
  }, []);

  const declineIncoming = useCallback(() => {
    incomingRef.current?.call.reject();
    incomingRef.current = null;
    setIncomingCall(null);
  }, []);

  const hangUp = useCallback(() => {
    currentCall?.call.disconnect();
    incomingRef.current?.call.reject();
    setIncomingCall(null);
  }, [currentCall]);

  const toggleMute = useCallback(() => {
    if (!currentCall) return;
    const muted = !currentCall.muted;
    currentCall.call.mute(muted);
    setCurrentCall({ ...currentCall, muted });
  }, [currentCall]);

  const sendDigits = useCallback((digits: string) => currentCall?.call.sendDigits(digits), [currentCall]);
  const setInputDevice = useCallback(async (id: string) => deviceRef.current?.audio?.setInputDevice(id), []);
  const setOutputDevice = useCallback(async (id: string) => deviceRef.current?.audio?.speakerDevices.set(id), []);
  const clearError = useCallback(() => setError(""), []);

  useEffect(() => {
    if (!currentCall) return;
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - currentCall.startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [currentCall]);

  useEffect(() => () => deviceRef.current?.destroy(), []);

  const value = useMemo<VoiceContextValue>(() => ({ enabled, deviceState, currentCall, incomingCall, elapsedSeconds, error, inputDevices, outputDevices, enablePhone, callCustomer, acceptIncoming, declineIncoming, hangUp, toggleMute, sendDigits, setInputDevice, setOutputDevice, clearError }), [enabled, deviceState, currentCall, incomingCall, elapsedSeconds, error, inputDevices, outputDevices, enablePhone, callCustomer, acceptIncoming, declineIncoming, hangUp, toggleMute, sendDigits, setInputDevice, setOutputDevice, clearError]);

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useTwilioVoice() {
  const value = useContext(VoiceContext);
  if (!value) throw new Error("useTwilioVoice must be used inside TwilioVoiceProvider.");
  return value;
}
