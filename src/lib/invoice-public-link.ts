import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_SITE_URL = "https://www.daplappliance.com";

function getSigningSecret() {
  return (
    process.env.INVOICE_LINK_SECRET ||
    process.env.TWILIO_AUTH_TOKEN ||
    process.env.VOICE_AGENT_API_KEY ||
    ""
  );
}

function base64Url(value: Buffer) {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function getInvoiceAccessCode(invoiceNumber: string) {
  const secret = getSigningSecret();

  if (!secret) {
    return "";
  }

  return base64Url(createHmac("sha256", secret).update(invoiceNumber).digest()).slice(0, 10);
}

export function getShortInvoiceCode(invoiceNumber: string) {
  const secret = getSigningSecret();

  if (!secret) {
    return "";
  }

  return base64Url(createHmac("sha256", secret).update(`short:${invoiceNumber}`).digest())
    .slice(0, 6)
    .toUpperCase();
}

export function isValidInvoiceAccessCode(invoiceNumber: string, code: string) {
  const expected = getInvoiceAccessCode(invoiceNumber);

  if (!expected || !code || expected.length !== code.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(code));
}

export function getPublicInvoicePath(invoiceNumber: string) {
  const code = getInvoiceAccessCode(invoiceNumber);
  const params = new URLSearchParams({ c: code });

  return `/i/${encodeURIComponent(invoiceNumber)}?${params.toString()}`;
}

export function getShortPublicInvoicePath(invoiceNumber: string) {
  const code = getShortInvoiceCode(invoiceNumber);

  return `/v/${encodeURIComponent(code)}`;
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL
  ).replace(/\/+$/g, "");
}

export function getPublicInvoiceUrl(invoiceNumber: string) {
  return `${getBaseUrl()}${getPublicInvoicePath(invoiceNumber)}`;
}

export function getShortPublicInvoiceUrl(invoiceNumber: string) {
  return `${getBaseUrl()}${getShortPublicInvoicePath(invoiceNumber)}`;
}
