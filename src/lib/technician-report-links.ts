import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_SITE_URL = "https://www.daplappliance.com";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL
  ).replace(/\/+$/, "");
}

function getReportSecret() {
  return (
    process.env.TECH_REPORT_LINK_SECRET ||
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    process.env.LEADS_ADMIN_SESSION_SECRET ||
    ""
  );
}

function sign(invoiceId: string, telegramUserId: string) {
  const secret = getReportSecret();

  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret)
    .update(`${invoiceId}:${telegramUserId}`)
    .digest("base64url");
}

export function buildTechnicianReportUrl(invoiceId: string, telegramUserId: string, siteUrl = getSiteUrl()) {
  const signature = sign(invoiceId, telegramUserId);

  if (!signature) {
    return "";
  }

  const token = `${telegramUserId}.${signature}`;
  return `${siteUrl}/tech/report/${invoiceId}?t=${encodeURIComponent(token)}`;
}

export function buildTechnicianInvoiceUrl(invoiceId: string, telegramUserId: string, siteUrl = getSiteUrl()) {
  const signature = sign(invoiceId, telegramUserId);

  if (!signature) {
    return "";
  }

  const token = `${telegramUserId}.${signature}`;
  return `${siteUrl}/tech/invoice/${invoiceId}?t=${encodeURIComponent(token)}`;
}

export function verifyTechnicianReportToken(invoiceId: string, token: string | null | undefined) {
  const [telegramUserId, signature] = (token ?? "").split(".");

  if (!telegramUserId || !signature) {
    return null;
  }

  const expectedSignature = sign(invoiceId, telegramUserId);

  if (!expectedSignature) {
    return null;
  }

  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  return telegramUserId;
}
