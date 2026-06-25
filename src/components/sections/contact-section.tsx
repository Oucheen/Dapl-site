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

type GtagFn = (
  command: "event" | "config" | "js",
  target: string | Date,
  params?: Record<string, unknown>,
) => void;

function sendDirectGAEvent(eventName: string, params: Record<string, unknown>) {
  const gtag = (window as Window & { gtag?: GtagFn }).gtag;

  if (typeof gtag === "function") {
    gtag("event", eventName, params);
  }
}

export function ContactSection({
  eyebrow = "Contact",
  title = "Request a callback or schedule service",
  description = "Tell us what is going on and we will get back to you shortly. For urgent issues, call us directly.",
  source = "main-contact-form",
  defaultAppliance = "",
  defaultPromoCode = "",
  promoCodeReadOnly = false,
  promoCodeLabel = "Promo code (optional)",
  successMessage = "Thank you — your message was sent. We will contact you soon.",
}: ContactSectionProps = {}) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

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

    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim(),
      appliance: String(fd.get("appliance") ?? "").trim(),
      promoCode: String(fd.get("promoCode") ?? "").trim(),
      leadSource: String(fd.get("leadSource") ?? "").trim(),
      preferredDate: String(fd.get("preferredDate") ?? "").trim(),
      message: String(fd.get("message") ?? "").trim(),
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
      sendDirectGAEvent("generate_lead", {
        form_name: source,
        appliance: payload.appliance || "unknown",
        promo_code: payload.promoCode || "",
        lead_source: payload.leadSource || source,
      });

      setStatus("success");
      form.reset();
    } catch {
      setErrorMessage("Network error. Please call us instead.");
      setStatus("error");
    }
  }

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

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="contact-name" className="text-sm font-semibold text-foreground">
                  Name <span className="text-accent">*</span>
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
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
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="text-sm font-semibold text-foreground">
                  Email <span className="text-accent">*</span>
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="contact-address" className="text-sm font-semibold text-foreground">
                  Address <span className="text-accent">*</span>
                </label>
                <input
                  id="contact-address"
                  name="address"
                  type="text"
                  required
                  autoComplete="street-address"
                  placeholder="Street address, city, ZIP"
                  className="mt-1.5 w-full min-w-0 rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="contact-appliance" className="text-sm font-semibold text-foreground">
                  Appliance (optional)
                </label>
                <select
                  id="contact-appliance"
                  name="appliance"
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
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
              <div className="sm:max-w-xs">
                <label htmlFor="contact-promo-code" className="text-sm font-semibold text-foreground">
                  {promoCodeLabel}
                </label>
                <input
                  id="contact-promo-code"
                  name="promoCode"
                  type="text"
                  autoComplete="off"
                  placeholder="Enter your promo code"
                  defaultValue={defaultPromoCode}
                  readOnly={promoCodeReadOnly}
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm uppercase text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2 read-only:bg-slate-50 read-only:text-primary"
                />
              </div>
              <div className="min-w-0 sm:max-w-xs">
                <label htmlFor="contact-preferred-date" className="text-sm font-semibold text-foreground">
                  Preferred service date (optional)
                </label>
                <input
                  id="contact-preferred-date"
                  name="preferredDate"
                  type="date"
                  min={minDate}
                  className="mt-1.5 block w-full min-w-0 max-w-full appearance-none rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                />
                <p className="mt-1.5 text-xs text-muted">
                  We will confirm availability. Same-day and emergency visits when possible.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="contact-message" className="text-sm font-semibold text-foreground">
                  How can we help? <span className="text-accent">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  className="mt-1.5 w-full resize-y rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
                  placeholder="Brand, model if known, and what the appliance is doing..."
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
              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              >
                {status === "submitting" ? "Sending..." : "Send message"}
              </button>
              <a
                href="tel:+17042660508"
                onClick={() =>
                  sendGTMEvent({
                    event: "phone_click",
                    location: source,
                    link_type: "contact_form",
                  })
                }
                className="inline-flex items-center justify-center rounded-full border border-primary/25 bg-white px-6 py-3 text-center text-sm font-semibold text-primary transition hover:bg-primary/5"
              >
                Call +1 (704) 266-0508
              </a>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              By submitting this form, you agree we may contact you about your request. We do not
              sell your information.
            </p>
          </form>
        </FadeUp>
      </div>
    </section>
  );
}
