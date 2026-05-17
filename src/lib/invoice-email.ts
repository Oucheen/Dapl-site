import { Resend } from "resend";
import type { InvoiceItemRecord, InvoiceWithItems } from "@/lib/supabase-invoices";

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
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function formatQuantity(value: number | string | null | undefined) {
  const amount = Number(value ?? 1);

  if (!Number.isFinite(amount)) {
    return "1";
  }

  return String(amount);
}

function getLineTotal(item: InvoiceItemRecord) {
  return formatMoney(Number(item.quantity ?? 0) * Number(item.unit_price ?? 0));
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

function buildInvoiceEmailHtml(invoiceData: InvoiceWithItems, replyToEmail: string) {
  const { invoice, items } = invoiceData;

  return `
    <div style="margin: 0; padding: 0; background: #f4f7fb; font-family: Arial, sans-serif; color: #0b1d3a;">
      <div style="max-width: 760px; margin: 0 auto; padding: 32px 18px;">
        <div style="background: #ffffff; border: 1px solid #dbe3ec; border-radius: 18px; overflow: hidden;">
          <div style="padding: 28px; background: #f8fafc; border-bottom: 1px solid #dbe3ec;">
            <p style="margin: 0; color: #d91f32; font-size: 12px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;">
              Dapl Appliance Repair
            </p>
            <h1 style="margin: 8px 0 0; color: #0b1d3a; font-size: 30px; line-height: 1.15;">
              Invoice ${escapeHtml(invoice.invoice_number)}
            </h1>
            <p style="margin: 12px 0 0; color: #475569; font-size: 14px; line-height: 1.7;">
              Thank you for choosing Dapl Appliance Repair. Your invoice details are below.
            </p>
          </div>

          <div style="padding: 28px;">
            <div>
              <div style="margin-bottom: 22px;">
                <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;">Bill to</p>
                <p style="margin: 8px 0 0; font-size: 18px; font-weight: 800;">${escapeHtml(invoice.customer_name)}</p>
                ${
                  invoice.customer_phone
                    ? `<p style="margin: 6px 0 0; color: #334155;">${escapeHtml(invoice.customer_phone)}</p>`
                    : ""
                }
                ${
                  invoice.customer_email
                    ? `<p style="margin: 6px 0 0; color: #334155;">${escapeHtml(invoice.customer_email)}</p>`
                    : ""
                }
              </div>

              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 4px;">
                <tr>
                  <td style="padding: 0 18px 18px 0; vertical-align: top; width: 50%;">
                    <p style="margin: 0 0 7px; color: #64748b; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Service address</p>
                    <p style="margin: 0; color: #334155; line-height: 1.6;">${escapeHtml(invoice.service_address || "Not set")}</p>
                  </td>
                  <td style="padding: 0 0 18px 18px; vertical-align: top; width: 50%;">
                    <p style="margin: 0 0 7px; color: #64748b; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Service date</p>
                    <p style="margin: 0; color: #334155; line-height: 1.6;">${escapeHtml(formatDate(invoice.service_date))}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 18px 0 0; vertical-align: top; width: 50%;">
                    <p style="margin: 0 0 7px; color: #64748b; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Appliance</p>
                    <p style="margin: 0; color: #334155; line-height: 1.6;">${escapeHtml(invoice.appliance || "Not selected")}</p>
                  </td>
                  <td style="padding: 0 0 0 18px; vertical-align: top; width: 50%;">
                    <p style="margin: 0 0 7px; color: #64748b; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">Technician</p>
                    <p style="margin: 0; color: #334155; line-height: 1.6;">${escapeHtml(invoice.assigned_technician || "Not assigned")}</p>
                  </td>
                </tr>
              </table>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 34px; font-size: 14px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th align="left" style="padding: 12px; border-bottom: 1px solid #dbe3ec; color: #64748b; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">Description</th>
                  <th align="right" style="padding: 12px; border-bottom: 1px solid #dbe3ec; color: #64748b; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">Qty</th>
                  <th align="right" style="padding: 12px; border-bottom: 1px solid #dbe3ec; color: #64748b; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">Unit</th>
                  <th align="right" style="padding: 12px; border-bottom: 1px solid #dbe3ec; color: #64748b; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${buildItemsRows(items)}
              </tbody>
            </table>

            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 28px;">
              <tr>
                <td style="width: 45%;"></td>
                <td style="padding: 8px 0; color: #475569; font-size: 15px;">Subtotal</td>
                <td style="padding: 8px 0 8px 18px; color: #0b1d3a; font-size: 15px; font-weight: 800; text-align: right; white-space: nowrap;">${escapeHtml(formatMoney(invoice.subtotal))}</td>
              </tr>
              <tr>
                <td style="width: 45%;"></td>
                <td style="padding: 8px 0; color: #475569; font-size: 15px;">Tax</td>
                <td style="padding: 8px 0 8px 18px; color: #0b1d3a; font-size: 15px; font-weight: 800; text-align: right; white-space: nowrap;">${escapeHtml(formatMoney(invoice.tax))}</td>
              </tr>
              <tr>
                <td style="width: 45%; border-top: 1px solid #dbe3ec;"></td>
                <td style="padding: 17px 0 0; border-top: 1px solid #dbe3ec; color: #0b1d3a; font-size: 22px; font-weight: 900;">Total</td>
                <td style="padding: 17px 0 0 18px; border-top: 1px solid #dbe3ec; color: #0b1d3a; font-size: 22px; font-weight: 900; text-align: right; white-space: nowrap;">${escapeHtml(formatMoney(invoice.total))}</td>
              </tr>
            </table>

            <div style="margin-top: 28px; padding: 18px; border-radius: 14px; background: #f8fafc; color: #475569; font-size: 13px; line-height: 1.7;">
              <p style="margin: 0;"><strong style="color: #0b1d3a;">Questions?</strong> Call +1 (704) 266-0508 or reply to this email. Replies go to ${escapeHtml(replyToEmail)}.</p>
              <p style="margin: 8px 0 0;">Dapl Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.</p>
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
  const to = invoiceData.invoice.customer_email?.trim();

  if (!apiKey) {
    return { ok: false, reason: "config" };
  }

  if (!to) {
    return { ok: false, reason: "missing_email" };
  }

  const resend = new Resend(apiKey);
  const replyToEmail = process.env.CONTACT_TO_EMAIL || "dapl.appliance.repair@gmail.com";
  const { error } = await resend.emails.send({
    from: process.env.CONTACT_FROM_EMAIL || "Dapl Website <onboarding@resend.dev>",
    to: [to],
    replyTo: replyToEmail,
    subject: `Dapl Appliance Repair invoice ${invoiceData.invoice.invoice_number}`,
    html: buildInvoiceEmailHtml(invoiceData, replyToEmail),
  });

  if (error) {
    console.error("Resend invoice email error:", error);
    return { ok: false, reason: "send_error" };
  }

  return { ok: true, to };
}
