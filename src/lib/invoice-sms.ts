import { getShortPublicInvoiceUrl } from "@/lib/invoice-public-link";
import {
  calculateInvoiceAmountDue,
  type InvoiceWithItems,
} from "@/lib/supabase-invoices";

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

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function buildInvoiceSmsText(invoiceData: InvoiceWithItems) {
  const { invoice, payments } = invoiceData;
  const amountDue = calculateInvoiceAmountDue(invoice, payments);
  const invoiceUrl = getShortPublicInvoiceUrl(invoice.invoice_number);

  return `DAPL invoice ${formatMoney(amountDue)} due: ${invoiceUrl} Reply/call 704-266-0508`;
}

export async function sendInvoiceSms(
  invoiceData: InvoiceWithItems,
): Promise<SendInvoiceSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const to = normalizePhone(invoiceData.invoice.customer_phone);

  if (!accountSid || !authToken || !messagingServiceSid) {
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
        MessagingServiceSid: messagingServiceSid,
        To: to,
        Body: buildInvoiceSmsText(invoiceData),
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
