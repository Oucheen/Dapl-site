import { NextResponse } from "next/server";

const MAX = {
  name: 120,
  phone: 40,
  email: 254,
  address: 300,
  message: 4000,
  appliance: 80,
  preferredDate: 10,
};

function validatePreferredDate(s: string): { ok: true; iso: string; label: string } | { ok: false } {
  if (!s) return { ok: true, iso: "", label: "" };
  if (s.length > MAX.preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: false };
  }
  const [y, mo, da] = s.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, mo - 1, da));
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== mo - 1 ||
    parsed.getUTCDate() !== da
  ) {
    return { ok: false };
  }
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const inputUtc = Date.UTC(y, mo - 1, da);
  if (inputUtc < todayUtc) {
    return { ok: false };
  }
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
  return { ok: true, iso: s, label };
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;

  // Honeypot: bots often fill hidden fields
  const trap = typeof data.company === "string" ? data.company.trim() : "";
  if (trap.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const address = typeof data.address === "string" ? data.address.trim() : "";
  const appliance = typeof data.appliance === "string" ? data.appliance.trim() : "";
  const preferredDateRaw =
    typeof data.preferredDate === "string" ? data.preferredDate.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";

  if (!name || name.length > MAX.name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!phone || phone.length > MAX.phone) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }
  if (!email || !isValidEmail(email) || email.length > MAX.email) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (!address || address.length > MAX.address) {
    return NextResponse.json({ error: "Please enter the service address." }, { status: 400 });
  }
  if (!message || message.length > MAX.message) {
    return NextResponse.json({ error: "Please describe the issue." }, { status: 400 });
  }
  if (appliance.length > MAX.appliance) {
    return NextResponse.json({ error: "Invalid appliance selection." }, { status: 400 });
  }

  const preferred = validatePreferredDate(preferredDateRaw);
  if (!preferred.ok) {
    return NextResponse.json(
      { error: "Please choose a valid preferred date (today or later), or leave it blank." },
      { status: 400 },
    );
  }

  const to = process.env.CONTACT_TO_EMAIL ?? "dapl.appliance.repair@gmail.com";
  const from =
    process.env.CONTACT_FROM_EMAIL ?? "Dapl Website <onboarding@resend.dev>";
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Email is not configured yet. Add RESEND_API_KEY to your server environment.",
      },
      { status: 503 },
    );
  }

  const html = `
    <h2>New website inquiry</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Address:</strong> ${escapeHtml(address)}</p>
    ${appliance ? `<p><strong>Appliance:</strong> ${escapeHtml(appliance)}</p>` : ""}
    ${
      preferred.iso
        ? `<p><strong>Preferred service date:</strong> ${escapeHtml(preferred.label)} (${escapeHtml(preferred.iso)})</p>`
        : ""
    }
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Dapl website: ${name}`,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Resend error:", res.status, errText);
    return NextResponse.json(
      { error: "Could not send message. Please call or email us directly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
