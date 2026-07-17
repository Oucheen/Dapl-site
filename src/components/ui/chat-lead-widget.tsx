"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatStatus = "idle" | "submitting" | "success" | "error";

type ChatStep =
  | "intro"
  | "appliance"
  | "issue"
  | "name"
  | "phone"
  | "email"
  | "address"
  | "date"
  | "confirm";

type LeadDraft = {
  appliance: string;
  issue: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  preferredDate: string;
};

const initialDraft: LeadDraft = {
  appliance: "",
  issue: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  preferredDate: "",
};

const applianceOptions = [
  "Refrigerator",
  "Washer",
  "Dryer",
  "Dishwasher",
  "Oven",
  "Cooktop",
  "Freezer",
  "Ice Machine",
  "Wine Cooler",
  "Commercial Refrigerator",
  "Not sure",
];

const defaultIssueOptions = [
  "Not cooling",
  "Not heating",
  "Leaking",
  "No power",
  "Making noise",
  "Won't start",
  "Other issue",
];

const issueOptionsByAppliance: Record<string, string[]> = {
  Refrigerator: [
    "Not cooling evenly",
    "Freezer icing over",
    "Water leaking",
    "Ice maker not working",
    "Buzzing or clicking noise",
    "Door seal or airflow issue",
    "Other issue",
  ],
  Washer: [
    "Not spinning",
    "Not draining",
    "Leaking water",
    "Not filling with water",
    "Loud vibration or banging",
    "Door lock or control issue",
    "Other issue",
  ],
  Dryer: [
    "Not heating",
    "Takes too long to dry",
    "Drum not spinning",
    "Loud noise",
    "Stops mid-cycle",
    "Burning smell or airflow issue",
    "Other issue",
  ],
  Dishwasher: [
    "Not draining",
    "Leaking water",
    "Dishes not clean",
    "Not starting",
    "Grinding or humming noise",
    "Door latch or spray arm issue",
    "Other issue",
  ],
  Oven: [
    "Not heating",
    "Uneven baking",
    "Slow preheat",
    "Won't turn on",
    "Door not closing",
    "Control panel or sensor issue",
    "Other issue",
  ],
  Cooktop: [
    "Burner not heating",
    "Ignition not lighting",
    "Uneven heat",
    "Not turning on",
    "Broken knobs or controls",
    "Gas or electric performance issue",
    "Other issue",
  ],
  Freezer: [
    "Not cold enough",
    "Heavy frost buildup",
    "Water leaking",
    "Loud noise",
    "Temperature fluctuations",
    "Door seal or airflow issue",
    "Other issue",
  ],
  "Ice Machine": [
    "Not making enough ice",
    "Not making ice",
    "Water leaking",
    "Bad ice quality or size",
    "Buzzing or cycling noise",
    "Startup or cooling issue",
    "Other issue",
  ],
  "Wine Cooler": [
    "Wrong temperature",
    "Not cooling",
    "Condensation or water inside",
    "Loud noise",
    "Light, display, or controls issue",
    "Door seal or circulation issue",
    "Other issue",
  ],
  "Commercial Refrigerator": [
    "Not cold enough",
    "Temperature swings",
    "Water leaking",
    "Compressor or fan noise",
    "Door seal or airflow issue",
    "Display, control, or startup issue",
    "Other issue",
  ],
};

function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  );
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ChatLeadWidget() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [step, setStep] = useState<ChatStep>("intro");
  const [draft, setDraft] = useState<LeadDraft>(initialDraft);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const minDate = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  useEffect(() => {
    if (isAdminRoute) {
      return;
    }

    setIsMounted(true);
    const dismissed = window.sessionStorage.getItem("dapl_chat_dismissed") === "1";

    if (dismissed) {
      return;
    }

    const inviteTimer = window.setTimeout(() => {
      setShowInvite(true);
    }, 4500);

    return () => {
      window.clearTimeout(inviteTimer);
    };
  }, [isAdminRoute]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, step]);

  if (isAdminRoute || !isMounted) {
    return null;
  }

  const openChat = () => {
    setIsOpen(true);
    setShowInvite(false);
    sendGTMEvent({
      event: "chat_open",
      location: "chat_widget",
    });
  };

  const closeChat = () => {
    setIsOpen(false);
    setShowInvite(false);
    window.sessionStorage.setItem("dapl_chat_dismissed", "1");
  };

  const resetChat = () => {
    setStep("intro");
    setDraft(initialDraft);
    setInputValue("");
    setStatus("idle");
    setErrorMessage("");
  };

  const setDraftValue = (key: keyof LeadDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value.trim() }));
  };

  const goToStep = (nextStep: ChatStep, nextInput = "") => {
    setStep(nextStep);
    setInputValue(nextInput);
    setErrorMessage("");
  };

  const handleIntroStart = () => {
    goToStep("appliance");
  };

  const handleOption = (key: keyof LeadDraft, value: string, nextStep: ChatStep) => {
    setDraftValue(key, value);
    goToStep(nextStep);
  };

  const handleTextSubmit = () => {
    const value = inputValue.trim();

    if (step === "issue") {
      if (value.length < 3) {
        setErrorMessage("Tell us a little more about what is happening.");
        return;
      }
      setDraftValue("issue", value);
      goToStep("name");
      return;
    }

    if (step === "name") {
      if (value.length < 2) {
        setErrorMessage("Please enter your name.");
        return;
      }
      setDraftValue("name", value);
      goToStep("phone");
      return;
    }

    if (step === "phone") {
      if (value.length < 7) {
        setErrorMessage("Please enter a phone number we can call.");
        return;
      }
      setDraftValue("phone", value);
      goToStep("email");
      return;
    }

    if (step === "email") {
      if (!isValidEmail(value)) {
        setErrorMessage("Please enter a valid email address.");
        return;
      }
      setDraftValue("email", value);
      goToStep("address");
      return;
    }

    if (step === "address") {
      if (value.length < 6) {
        setErrorMessage("Please enter the service address.");
        return;
      }
      setDraftValue("address", value);
      goToStep("date");
      return;
    }

    if (step === "date") {
      setDraftValue("preferredDate", value);
      goToStep("confirm");
    }
  };

  const submitLead = async () => {
    setStatus("submitting");
    setErrorMessage("");

    const message = [
      `Chat request for ${draft.appliance || "appliance service"}.`,
      `Issue: ${draft.issue}`,
      "Submitted through the website chat widget.",
    ].join("\n");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone,
          email: draft.email,
          address: draft.address,
          appliance: draft.appliance === "Not sure" ? "Other / not sure" : draft.appliance,
          promoCode: "",
          leadSource: "chat-widget",
          preferredDate: draft.preferredDate,
          message,
          company: "",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Could not send the request. Please call us instead.");
        return;
      }

      sendGTMEvent({
        event: "generate_lead",
        form_name: "chat-widget",
        appliance: draft.appliance || "unknown",
        promo_code: "",
        lead_source: "chat-widget",
      });

      setStatus("success");
      window.sessionStorage.setItem("dapl_chat_dismissed", "1");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please call us instead.");
    }
  };

  const currentQuestion = {
    intro: "Need appliance repair? I can help send a quick request.",
    appliance: "What appliance needs service?",
    issue: "What is going on with it?",
    name: "What is your name?",
    phone: "What phone number should we call?",
    email: "What email should we use?",
    address: "What is the service address?",
    date: "Preferred service date? You can skip this.",
    confirm: "Ready to send this request?",
  }[step];

  const currentIssueOptions =
    issueOptionsByAppliance[draft.appliance] ?? defaultIssueOptions;
  const showTextInput = ["issue", "name", "phone", "email", "address", "date"].includes(step);

  return (
    <div className="fixed bottom-24 right-5 z-50 flex w-[calc(100vw-2rem)] max-w-[22rem] flex-col items-end sm:bottom-24">
      {isOpen ? (
        <section
          className="mb-3 w-full overflow-hidden rounded-2xl border border-border bg-white shadow-[0_22px_60px_rgba(15,42,86,0.2)]"
          aria-label="Service request chat"
        >
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">DAPL assistant</p>
              <p className="text-xs text-white/75">Service request helper</p>
            </div>
            <button
              type="button"
              onClick={closeChat}
              aria-label="Close chat"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/18"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-4 py-4">
            <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm leading-6 text-foreground">
              {currentQuestion}
            </div>

            {step === "intro" ? (
              <button
                type="button"
                onClick={handleIntroStart}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
              >
                Start request
                <ArrowIcon className="h-4 w-4" />
              </button>
            ) : null}

            {step === "appliance" ? (
              <div className="grid grid-cols-2 gap-2">
                {applianceOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleOption("appliance", option, "issue")}
                    className="min-h-11 rounded-xl border border-border bg-white px-3 py-2 text-left text-xs font-semibold leading-snug text-primary transition hover:border-primary/30 hover:bg-primary/5 sm:text-sm"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}

            {step === "issue" ? (
              <div className="grid grid-cols-2 gap-2">
                {currentIssueOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleOption("issue", option, "name")}
                    className="min-h-11 rounded-xl border border-border bg-white px-3 py-2 text-left text-xs font-semibold leading-snug text-primary transition hover:border-primary/30 hover:bg-primary/5 sm:text-sm"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}

            {showTextInput ? (
              <div className="space-y-2">
                {step === "issue" ? (
                  <textarea
                    ref={(node) => {
                      inputRef.current = node;
                    }}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    rows={3}
                    placeholder="Add details if you want"
                    className="w-full resize-none rounded-xl border border-border px-3 py-2 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                  />
                ) : (
                  <input
                    ref={(node) => {
                      inputRef.current = node;
                    }}
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    type={step === "email" ? "email" : step === "phone" ? "tel" : step === "date" ? "date" : "text"}
                    min={step === "date" ? minDate : undefined}
                    placeholder={
                      step === "phone"
                        ? "(704) 555-0100"
                        : step === "address"
                          ? "Street, city, ZIP"
                          : ""
                    }
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleTextSubmit();
                      }
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={handleTextSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  {step === "date" ? "Continue" : "Next"}
                  <ArrowIcon className="h-4 w-4" />
                </button>
                {step === "date" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftValue("preferredDate", "");
                      goToStep("confirm");
                    }}
                    className="w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
                  >
                    Skip date
                  </button>
                ) : null}
              </div>
            ) : null}

            {step === "confirm" && status !== "success" ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-slate-50 px-3 py-3 text-xs leading-5 text-muted">
                  <p>
                    <strong className="text-foreground">Name:</strong> {draft.name}
                  </p>
                  <p>
                    <strong className="text-foreground">Phone:</strong> {draft.phone}
                  </p>
                  <p>
                    <strong className="text-foreground">Appliance:</strong> {draft.appliance}
                  </p>
                  <p>
                    <strong className="text-foreground">Issue:</strong> {draft.issue}
                  </p>
                  <p>
                    <strong className="text-foreground">Address:</strong> {draft.address}
                  </p>
                  {draft.preferredDate ? (
                    <p>
                      <strong className="text-foreground">Date:</strong> {draft.preferredDate}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={submitLead}
                  disabled={status === "submitting"}
                  className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "submitting" ? "Sending..." : "Send request"}
                </button>
                <button
                  type="button"
                  onClick={() => goToStep("appliance")}
                  className="w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
                >
                  Edit details
                </button>
              </div>
            ) : null}

            {status === "success" ? (
              <div className="space-y-3 rounded-2xl border border-green-500/25 bg-green-50 px-4 py-3 text-sm leading-6 text-foreground">
                <p className="font-semibold">Thanks. Your request was sent.</p>
                <p>We will contact you soon. For urgent service, call now.</p>
                <a
                  href="tel:+17042660508"
                  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Call +1 (704) 266-0508
                </a>
              </div>
            ) : null}

            {status === "error" && errorMessage ? (
              <p className="rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-sm leading-6 text-foreground">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <div className="border-t border-border px-4 py-3 text-xs leading-5 text-muted">
            By sending, you agree we may contact you about your request.
          </div>
        </section>
      ) : null}

      {showInvite && !isOpen ? (
        <div className="mb-3 mr-1 max-w-[17rem] rounded-2xl rounded-br-sm border border-border bg-white px-4 py-3 text-sm leading-6 text-foreground shadow-[0_14px_36px_rgba(15,42,86,0.16)]">
          Need help scheduling appliance repair?
        </div>
      ) : null}

      <button
        type="button"
        onClick={isOpen ? closeChat : openChat}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close service request chat" : "Open service request chat"}
        className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_16px_34px_rgba(207,36,49,0.26)] transition hover:-translate-y-0.5 hover:brightness-95"
      >
        {showInvite && !isOpen ? (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary" />
        ) : null}
        {isOpen ? <CloseIcon className="h-5 w-5" /> : <ChatIcon className="h-5 w-5" />}
      </button>

      {status === "success" ? (
        <button
          type="button"
          onClick={resetChat}
          className="mt-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm"
        >
          New chat
        </button>
      ) : null}
    </div>
  );
}
