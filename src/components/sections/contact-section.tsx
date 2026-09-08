"use client";

import { FadeUp } from "@/components/ui/fade-up";
import { SectionHeading } from "@/components/ui/section-heading";
import { sendGTMEvent } from "@next/third-parties/google";
import { useMemo, useState } from "react";

const applianceOptions = [
  "",
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
  "Other / not sure",
];

const preferredTimeWindows = [
  "",
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
  "6:00 PM - 8:00 PM",
  "Any time",
];

type FormStatus = "idle" | "submitting" | "success" | "error";

type ContactSectionProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  source?: string;
  defaultAppliance?: string;
  defaultPromoCode?: string;
  promoCodeReadOnly?: boolean;
  promoCodeLabel?: string;
  successMessage?: string;
};

export function ContactSection({
  eyebrow = "Contact",
  title = "Request a callback or schedule service",
  description = "Tell us what is going on and we will get back to you shortly. For urgent issues, call us directly.",
  source = "main-contact-form",
  defaultAppliance = "",
  defaultPromoCode = "",
  successMessage = "Thank you — your message was sent. We will contact you soon.",
}: ContactSectionProps = {}) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState("");

  const minDate = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    if (step === 1) {
      const appliance = String(fd.get("appliance") ?? "").trim();
      const zipCode = String(fd.get("zipCode") ?? "").trim();
      const phone = String(fd.get("phone") ?? "").trim();
      const contactMethod = String(fd.get("contactMethod") ?? "").trim();
      const smsConsent = String(fd.get("smsConsent") ?? "") === "yes";

      if (!appliance || !zipCode || !phone || !contactMethod) {
        setStepError("Please add appliance, ZIP code, phone, and preferred contact.");
        return;
      }

      if ((contactMethod === "Text me" || contactMethod === "Call or text") && !smsConsent) {
        setStepError("Please check SMS consent if you prefer text messages.");
        return;
      }

      setStepError("");
      setStep(2);
      return;
    }

    const contactMethod = String(fd.get("contactMethod") ?? "").trim();
    const zipCode = String(fd.get("zipCode") ?? "").trim();
    const smsConsent = String(fd.get("smsConsent") ?? "") === "yes";
    const preferredWindow = String(fd.get("preferredWindow") ?? "").trim();
    const model = String(fd.get("model") ?? "").trim();
    const symptoms = String(fd.get("message") ?? "").trim();

    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim(),
      appliance: String(fd.get("appliance") ?? "").trim(),
      promoCode: String(fd.get("promoCode") ?? "").trim(),
      leadSource: String(fd.get("leadSource") ?? "").trim(),
      preferredDate: String(fd.get("preferredDate") ?? "").trim(),
      preferredWindow,
      zipCode,
      model,
      contactMethod,
      smsConsent,
      message: [
        zipCode ? `ZIP code: ${zipCode}` : "",
        contactMethod ? `Preferred contact: ${contactMethod}` : "",
        model ? `Model / serial: ${model}` : "",
        symptoms ? `Symptoms: ${symptoms}` : "",
        preferredWindow ? `Preferred time window: ${preferredWindow}` : "",
        smsConsent
          ? "SMS consent: Customer checked the service SMS consent box on the website form."
          : "SMS consent: Not checked on the website form.",
      ].filter(Boolean).join("\n\n"),
      company: String(fd.get("company") ?? "").trim(),
    };

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      sendGTMEvent({
        event: "generate_lead",
        form_name: source,
        appliance: payload.appliance || "unknown",
        promo_code: payload.promoCode || "",
        lead_source: payload.leadSource || source,
      });
      setStatus("success");
      form.reset();
      setStep(1);
    } catch {
      setErrorMessage("Network error. Please call us instead.");
      setStatus("error");
    }
  }

  function handleStepOneContinue(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (!form) return;

    const fd = new FormData(form);
    const appliance = String(fd.get("appliance") ?? "").trim();
    const zipCode = String(fd.get("zipCode") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const contactMethod = String(fd.get("contactMethod") ?? "").trim();
    const smsConsent = String(fd.get("smsConsent") ?? "") === "yes";

    if (!appliance || !zipCode || !phone || !contactMethod) {
      setStepError("Please add appliance, ZIP code, phone, and preferred contact.");
      return;
    }

    if ((contactMethod === "Text me" || contactMethod === "Call or text") && !smsConsent) {
      setStepError("Please check SMS consent if you prefer text messages.");
      return;
    }

    setStepError("");
    setStep(2);
  }

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2";

  return (
    <section id="contact" className="bg-surface py-20">
      <div className="container-shell">
        <FadeUp>
          <SectionHeading eyebrow={eyebrow} title={title} description={description} />
        </FadeUp>

        <FadeUp delay={0.08} className="mx-auto mt-10 max-w-2xl">
          <form
            onSubmit={handleSubmit}
            className="relative rounded-3xl border border-border bg-[#f8fbff] p-6 shadow-sm sm:p-8"
            noValidate
          >
            <div
              className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
              aria-hidden="true"
            >
              <label htmlFor="contact-company">Company</label>
              <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <input type="hidden" name="leadSource" value={source} />
            <input type="hidden" name="promoCode" value={defaultPromoCode} />

            <div className="mb-6 flex items-center gap-3">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className={`h-2 flex-1 rounded-full transition ${
                    step >= item ? "bg-primary" : "bg-border"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>

            <div className="mb-6 rounded-2xl border border-primary/10 bg-white px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
                Step {step} of 2
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {step === 1 ? "Quick repair request" : "Service details"}
              </p>
            </div>

            <div className={step === 1 ? "grid gap-5 sm:grid-cols-2" : "hidden"}>
              <div className="sm:col-span-2">
                <label htmlFor="contact-appliance" className="text-sm font-semibold text-foreground">
                  Appliance <span className="text-accent">*</span>
                </label>
                <select
                  id="contact-appliance"
                  name="appliance"
                  className={fieldClass}
                  defaultValue={defaultAppliance}
                >
                  {applianceOptions.map((opt) =>
                    opt === "" ? (
                      <option key="empty" value="">
                        Select type
                      </option>
                    ) : (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="contact-zip-code" className="text-sm font-semibold text-foreground">
                  ZIP code <span className="text-accent">*</span>
                </label>
                <input
                  id="contact-zip-code"
                  name="zipCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="28227"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="contact-phone" className="text-sm font-semibold text-foreground">
                  Phone <span className="text-accent">*</span>
                </label>
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="(704) 555-0100"
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-semibold text-foreground">
                  Preferred contact <span className="text-accent">*</span>
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {["Call me", "Text me", "Call or text"].map((method) => (
                    <label
                      key={method}
                      className="flex cursor-pointer items-center justify-center rounded-full border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                    >
                      <input
                        type="radio"
                        name="contactMethod"
                        value={method}
                        className="sr-only"
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </div>
              <label className="sm:col-span-2 flex gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-xs leading-5 text-muted">
                <input
                  type="checkbox"
                  name="smsConsent"
                  value="yes"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
                />
                <span>
                  I agree to receive service-related SMS messages from DAPL Appliance Repair about my
                  request, appointment updates, invoice links, payment reminders, and customer support.
                  Message frequency varies. Message and data rates may apply. Reply STOP to opt out or
                  HELP for help.
                </span>
              </label>
              {defaultPromoCode ? (
                <p className="sm:col-span-2 rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm font-semibold text-primary">
                  Promo code applied: {defaultPromoCode}
                </p>
              ) : null}
              {stepError ? (
                <p className="sm:col-span-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-foreground" role="alert">
                  {stepError}
                </p>
              ) : null}
            </div>

            <div className={step === 2 ? "grid gap-5 sm:grid-cols-2" : "hidden"}>
              <div className="sm:col-span-2">
                <label htmlFor="contact-address" className="text-sm font-semibold text-foreground">
                  Service address <span className="text-accent">*</span>
                </label>
                <input
                  id="contact-address"
                  name="address"
                  type="text"
                  autoComplete="street-address"
                  placeholder="Street address, city, ZIP"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="contact-name" className="text-sm font-semibold text-foreground">
                  Name <span className="text-muted">(optional)</span>
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="text-sm font-semibold text-foreground">
                  Email <span className="text-muted">(optional)</span>
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={fieldClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="contact-model" className="text-sm font-semibold text-foreground">
                  Model / serial <span className="text-muted">(optional)</span>
                </label>
                <input
                  id="contact-model"
                  name="model"
                  type="text"
                  autoComplete="off"
                  placeholder="If you have it"
                  className={fieldClass}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="contact-preferred-date" className="text-sm font-semibold text-foreground">
                  Preferred service date (optional)
                </label>
                <input
                  id="contact-preferred-date"
                  name="preferredDate"
                  type="date"
                  min={minDate}
                  className={fieldClass}
                />
                <p className="mt-1.5 text-xs text-muted">
                  We will confirm availability. Same-day and emergency visits when possible.
                </p>
              </div>
              <div className="min-w-0">
                <label htmlFor="contact-preferred-window" className="text-sm font-semibold text-foreground">
                  Preferred time window (optional)
                </label>
                <select
                  id="contact-preferred-window"
                  name="preferredWindow"
                  className={fieldClass}
                  defaultValue=""
                >
                  {preferredTimeWindows.map((window) =>
                    window === "" ? (
                      <option key="empty" value="">
                        Select window
                      </option>
                    ) : (
                      <option key={window} value={window}>
                        {window}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="contact-message" className="text-sm font-semibold text-foreground">
                  Symptoms <span className="text-accent">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  className={`${fieldClass} resize-y`}
                  placeholder="What is the appliance doing?"
                />
              </div>
            </div>

            {status === "success" ? (
              <p
                className="mt-5 rounded-xl border border-green-500/35 bg-green-50 px-4 py-3 text-sm font-semibold text-foreground shadow-sm"
                role="status"
              >
                {successMessage}
              </p>
            ) : null}

            {status === "error" && errorMessage ? (
              <p
                className="mt-5 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-foreground"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              {step === 1 ? (
                <button
                  type="button"
                  onClick={handleStepOneContinue}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-95 sm:flex-none"
                >
                  Continue
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setStepError("");
                      setStep(1);
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-primary/25 bg-white px-6 py-3 text-center text-sm font-semibold text-primary transition hover:bg-primary/5"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                  >
                    {status === "submitting" ? "Sending..." : "Send request"}
                  </button>
                </>
              )}
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              By submitting this form, you agree we may contact you about your request. We do not
              sell your information. See our{" "}
              <a href="/privacy-policy" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/terms-and-conditions" className="font-semibold text-primary hover:underline">
                Terms
              </a>
              .
            </p>
          </form>
        </FadeUp>
      </div>
    </section>
  );
}
