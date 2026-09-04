import { Resend } from "resend";
import {
  calculateInvoiceAmountDue,
  calculateInvoicePaidAmount,
  type InvoiceItemRecord,
  type InvoicePaymentRecord,
  type InvoiceWithItems,
} from "@/lib/supabase-invoices";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { getLatestInvoiceSignature } from "@/lib/supabase-invoice-signatures";

type SendInvoiceEmailResult =
  | { ok: true; to: string }
  | { ok: false; reason: "missing_email" | "config" | "send_error" };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(getDateForCharlotteDisplay(value));
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(new Date(value));
}

function formatQuantity(value: number | string | null | undefined) {
  const amount = Number(value ?? 1);

  if (!Number.isFinite(amount)) {
    return "1";
  }

  return String(amount);
}

function formatPaymentMethod(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPlaceholderCustomerEmail(value: string | null | undefined) {
  return Boolean(value?.trim().toLowerCase().endsWith("@daplappliance.local"));
}

function getLineTotal(item: InvoiceItemRecord) {
  return formatMoney(Number(item.quantity ?? 0) * Number(item.unit_price ?? 0));
}

function getSafeFilename(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-");
}

function buildItemsRows(items: InvoiceItemRecord[]) {
  return items
    .map(
      (item) => `
        <tr>
          <td style="padding: 16px 12px; border-bottom: 1px solid #dbe3ec; color: #0b1d3a; font-weight: 700; line-height: 1.45; word-break: break-word;">
            ${escapeHtml(item.description)}
          </td>
          <td style="padding: 16px 10px; border-bottom: 1px solid #dbe3ec; color: #334155; text-align: right; white-space: nowrap;">
            ${escapeHtml(formatQuantity(item.quantity))}
          </td>
          <td style="padding: 16px 10px; border-bottom: 1px solid #dbe3ec; color: #334155; text-align: right; white-space: nowrap;">
            ${escapeHtml(formatMoney(item.unit_price))}
          </td>
          <td style="padding: 16px 12px 16px 10px; border-bottom: 1px solid #dbe3ec; color: #0b1d3a; font-weight: 800; text-align: right; white-space: nowrap;">
            ${escapeHtml(getLineTotal(item))}
          </td>
        </tr>
      `,
    )
    .join("");
}

function buildPaymentRows(payments: InvoicePaymentRecord[]) {
  return payments
    .map(
      (payment) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #dbe3ec; color: #475569;">
            ${escapeHtml(formatShortDateTime(payment.payment_date))} ET
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #dbe3ec; color: #0b1d3a; font-weight: 700;">
            ${escapeHtml(formatPaymentMethod(payment.method))}
            ${
              payment.note
                ? `<span style="display: block; margin-top: 4px; color: #64748b; font-size: 12px; font-weight: 400;">${escapeHtml(payment.note)}</span>`
                : ""
            }
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #dbe3ec; color: #0b1d3a; font-weight: 800; text-align: right; white-space: nowrap;">
            ${escapeHtml(formatMoney(payment.amount))}
          </td>
        </tr>
      `,
    )
    .join("");
}

function buildInvoiceTermsHtml() {
  return `
    <div style="margin-top: 28px; padding: 18px; border: 1px solid #dbe3ec; border-radius: 14px; background: #ffffff; color: #475569; font-size: 13px; line-height: 1.7;">
      <p style="margin: 0 0 10px; color: #0b1d3a; font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;">Terms and warranty</p>
      <p style="margin: 0;">90-day labor and parts warranty.</p>
      <p style="margin: 8px 0 0;">No warranty is provided for maintenance, cleaning of units, or defrosting of refrigerators and freezers.</p>
      <p style="margin: 8px 0 0;">Our company and technicians are not responsible for other problems that arise with household appliances after the technician leaves your home.</p>
      <p style="margin: 8px 0 0;">If a deposit is made for a spare part and the customer refuses repair, the company will retain an additional 25% of the order value as a restocking fee, with a minimum fee of $30.</p>
      <p style="margin: 8px 0 0;">Thank you for choosing our company. Our main task is to leave a good memory and working household appliances. Take care of yourself.</p>
      <p style="margin: 12px 0 0;"><strong style="color: #0b1d3a;">Note:</strong> Sales tax on parts was paid at the time of purchase. No sales tax is charged to the customer.</p>
    </div>
  `;
}

function buildInvoiceEmailHtml(invoiceData: InvoiceWithItems, replyToEmail: string) {
  const { invoice, payments } = invoiceData;
  const paidAmount = calculateInvoicePaidAmount(payments);
  const amountDue = calculateInvoiceAmountDue(invoice, payments);

  return `
    <div style="margin: 0; padding: 0; background: #f4f7fb; font-family: Arial, sans-serif; color: #0b1d3a;">
      <div style="max-width: 620px; margin: 0 auto; padding: 32px 18px;">
        <div style="background: #ffffff; border: 1px solid #dbe3ec; border-radius: 18px; overflow: hidden;">
          <div style="padding: 28px; background: #f8fafc; border-bottom: 1px solid #dbe3ec;">
            <p style="margin: 0; color: #d91f32; font-size: 12px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;">
              DAPL Appliance Repair
            </p>
            <h1 style="margin: 8px 0 0; color: #0b1d3a; font-size: 28px; line-height: 1.15;">
              Invoice ${escapeHtml(invoice.invoice_number)}
            </h1>
            <p style="margin: 12px 0 0; color: #475569; font-size: 15px; line-height: 1.7;">
              Thank you for choosing DAPL Appliance Repair. Your invoice is attached as a PDF.
            </p>
            <p style="margin: 8px 0 0; color: #475569; font-size: 13px; line-height: 1.6;">
              9401 Peckham Rye Rd, Mint Hill, NC 28227<br/>
              ${escapeHtml(replyToEmail)}
            </p>
          </div>

          <div style="padding: 28px;">
            <p style="margin: 0; color: #0b1d3a; font-size: 18px; font-weight: 800;">
              Hello ${escapeHtml(invoice.customer_name)},
            </p>
            <p style="margin: 12px 0 0; color: #475569; font-size: 15px; line-height: 1.7;">
              Please find your invoice attached as a PDF. You can open or download the attached
              file to view the full invoice details.
            </p>

            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 22px; border-top: 1px solid #dbe3ec; border-bottom: 1px solid #dbe3ec;">
              <tr>
                <td style="padding: 14px 0; color: #475569; font-size: 14px;">Invoice total</td>
                <td style="padding: 14px 0; color: #0b1d3a; font-size: 16px; font-weight: 800; text-align: right;">${escapeHtml(formatMoney(invoice.total))}</td>
              </tr>
              ${
                paidAmount > 0
                  ? `
                    <tr>
                      <td style="padding: 0 0 14px; color: #475569; font-size: 14px;">Payments received</td>
                      <td style="padding: 0 0 14px; color: #047857; font-size: 15px; font-weight: 800; text-align: right;">${escapeHtml(formatMoney(paidAmount))}</td>
                    </tr>
                  `
                  : ""
              }
              <tr>
                <td style="padding: 0 0 14px; color: #0b1d3a; font-size: 16px; font-weight: 800;">Amount due</td>
                <td style="padding: 0 0 14px; color: #0b1d3a; font-size: 18px; font-weight: 900; text-align: right;">${escapeHtml(formatMoney(amountDue))}</td>
              </tr>
            </table>

            <div style="margin-top: 22px; padding: 18px; border-radius: 14px; background: #f8fafc; color: #475569; font-size: 13px; line-height: 1.7;">
              <p style="margin: 0;"><strong style="color: #0b1d3a;">Questions?</strong> Call +1 (980) 393-6588 or reply to this email.</p>
              <p style="margin: 8px 0 0;">Replies go to ${escapeHtml(replyToEmail)}.</p>
              <p style="margin: 8px 0 0;">DAPL Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function sendInvoiceEmail(
  invoiceData: InvoiceWithItems,
): Promise<SendInvoiceEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = isPlaceholderCustomerEmail(invoiceData.invoice.customer_email)
    ? ""
    : invoiceData.invoice.customer_email?.trim();

  if (!apiKey) {
    return { ok: false, reason: "config" };
  }

  if (!to) {
    return { ok: false, reason: "missing_email" };
  }

  const resend = new Resend(apiKey);
  const replyToEmail = process.env.CONTACT_TO_EMAIL || "dapl.appliance.repair@gmail.com";
  let invoicePdf: Buffer;

  try {
    const signature = await getLatestInvoiceSignature(invoiceData.invoice.id);
    invoicePdf = await renderInvoicePdf(invoiceData, replyToEmail, signature);
  } catch (error) {
    console.error("Invoice email PDF attachment generation error:", error);
    return { ok: false, reason: "send_error" };
  }

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_FROM_EMAIL || "DAPL Website <onboarding@resend.dev>",
    to: [to],
    replyTo: replyToEmail,
    subject: `DAPL Appliance Repair invoice ${invoiceData.invoice.invoice_number}`,
    html: buildInvoiceEmailHtml(invoiceData, replyToEmail),
    attachments: [
      {
        filename: `${getSafeFilename(invoiceData.invoice.invoice_number)}.pdf`,
        content: invoicePdf,
        contentType: "application/pdf",
      },
    ],
  });

  if (error) {
    console.error("Resend invoice email error:", error);
    return { ok: false, reason: "send_error" };
  }

  return { ok: true, to };
}
