import { getPublicInvoiceUrl } from "@/lib/invoice-public-link";
import type { InvoiceWithItems } from "@/lib/supabase-invoices";

type SendInvoiceSmsResult =
  | { ok: true; to: string; messageSid: string }
  | { ok: false; reason: "missing_phone" | "config" | "send_error"; details?: string };

function normalizePhone(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("+")) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return trimmed;
}

export function buildInvoiceSmsText(invoiceNumber: string) {
  return `DAPL Appliance Repair invoice: ${getPublicInvoiceUrl(invoiceNumber)} Questions? 704-266-0508`;
}

export async function sendInvoiceSms(
  invoiceData: InvoiceWithItems,
): Promise<SendInvoiceSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const to = normalizePhone(invoiceData.invoice.customer_phone);

  if (!accountSid || !authToken || !from) {
    return { ok: false, reason: "config" };
  }

  if (!to) {
    return { ok: false, reason: "missing_phone" };
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: buildInvoiceSmsText(invoiceData.invoice.invoice_number),
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
  };

  if (!response.ok) {
    console.error("Twilio invoice SMS error:", response.status, payload);
    return {
      ok: false,
      reason: "send_error",
      details: payload.message || `Twilio returned ${response.status}`,
    };
  }

  return { ok: true, to, messageSid: payload.sid || "" };
}
