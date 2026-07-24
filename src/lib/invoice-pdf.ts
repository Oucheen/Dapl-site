import { existsSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import {
  calculateInvoiceAmountDue,
  calculateInvoicePaidAmount,
  type InvoiceItemRecord,
  type InvoiceRecord,
  type InvoiceWithItems,
} from "@/lib/supabase-invoices";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";

const BUSINESS_NAME = "DAPL Appliance Repair";
const BUSINESS_ADDRESS = "9401 Peckham Rye Rd, Charlotte, NC 28227";
const BUSINESS_LEGAL = "DAPL Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.";
const PRIMARY = "#0b1d3a";
const MUTED = "#475569";
const LIGHT = "#dbe3ec";
const INVOICE_TERMS = [
  "90-day labor and parts warranty.",
  "No warranty is provided for maintenance, cleaning of units, or defrosting of refrigerators and freezers.",
  "Our company and technicians are not responsible for other problems that arise with household appliances after the technician leaves your home.",
  "If a deposit is made for a spare part and the customer refuses repair, the company will retain an additional 25% of the order value as a restocking fee, with a minimum fee of $30.",
  "Thank you for choosing our company. Our main task is to leave a good memory and working household appliances. Take care of yourself.",
];
const INVOICE_TAX_NOTE =
  "Sales tax on parts was paid at the time of purchase. No sales tax is charged to the customer.";

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(getDateForCharlotteDisplay(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(new Date(value));
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

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
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

function formatServiceTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const [hourValue, minuteValue] = value.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return value;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function getServiceScheduleLabel(invoice: Pick<InvoiceRecord, "service_time" | "service_window">) {
  const serviceTime = formatServiceTime(invoice.service_time);

  if (serviceTime && invoice.service_window) {
    return `${serviceTime} (${invoice.service_window})`;
  }

  return serviceTime || invoice.service_window || "Not set";
}

function getLineTotalAmount(item: InvoiceItemRecord) {
  return Number(item.quantity ?? 0) * Number(item.unit_price ?? 0);
}

function drawRule(doc: PDFKit.PDFDocument, y: number) {
  doc.strokeColor(LIGHT).lineWidth(1).moveTo(48, y).lineTo(564, y).stroke();
}

function drawLabel(doc: PDFKit.PDFDocument, text: string, x: number, y: number) {
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(MUTED)
    .text(text.toUpperCase(), x, y, { characterSpacing: 1.2 });
}

function drawValue(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width = 120) {
  doc.font("Helvetica-Bold").fontSize(7).fillColor(PRIMARY).text(label, x, y, { width });
  doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(value, x, y + 12, { width, lineGap: 1 });
}

function createPdfBuffer(build: (doc: PDFKit.PDFDocument) => void) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    build(doc);
    doc.end();
  });
}

export async function renderInvoicePdf(invoiceData: InvoiceWithItems, businessEmail: string) {
  const { invoice, items, payments } = invoiceData;
  const paidAmount = calculateInvoicePaidAmount(payments);
  const amountDue = calculateInvoiceAmountDue(invoice, payments);
  const logoPath = path.join(process.cwd(), "public", "logo.jpg");

  return createPdfBuffer((doc) => {
    if (existsSync(logoPath)) {
      doc.image(logoPath, 48, 46, { fit: [38, 38] });
    }

    doc.font("Helvetica-Bold").fontSize(7).fillColor(PRIMARY).text(BUSINESS_NAME, 96, 46, {
      characterSpacing: 1.4,
    });
    doc.font("Helvetica").fontSize(7).fillColor(MUTED).text(BUSINESS_ADDRESS, 96, 59);
    doc.text(businessEmail, 96, 70);
    doc.fontSize(6.5).text(BUSINESS_LEGAL, 96, 84, { width: 210, lineGap: 1 });

    drawLabel(doc, "Invoice", 430, 46);
    doc.font("Helvetica-Bold").fontSize(16).fillColor(PRIMARY).text(invoice.invoice_number, 330, 62, {
      width: 234,
      align: "right",
    });
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(`Created ${formatDateTime(invoice.created_at)} ET`, 330, 84, {
      width: 234,
      align: "right",
    });
    doc.font("Helvetica-Bold").fontSize(8).text(`Status: ${invoice.status}`, 330, 98, {
      width: 234,
      align: "right",
    });

    drawRule(doc, 122);

    drawLabel(doc, "Bill to", 48, 138);
    doc.font("Helvetica-Bold").fontSize(15).fillColor(PRIMARY).text(invoice.customer_name, 48, 156, { width: 210 });
    if (invoice.customer_phone) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(PRIMARY).text(invoice.customer_phone, 48, 176, { width: 210 });
    }
    if (invoice.customer_email) {
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(invoice.customer_email, 48, 191, { width: 210 });
    }

    drawValue(doc, "Service address", invoice.service_address || "Not set", 300, 140, 128);
    drawValue(doc, "Service date", formatDate(invoice.service_date), 450, 140, 110);
    drawValue(doc, "Service time", getServiceScheduleLabel(invoice), 300, 180, 128);
    drawValue(doc, "Appliance", invoice.appliance || "Not selected", 450, 180, 110);
    drawValue(doc, "Technician", invoice.assigned_technician || "Not assigned", 300, 220, 128);

    drawRule(doc, 258);

    drawLabel(doc, "Line items", 48, 274);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(PRIMARY).text("Customer invoice charges", 48, 288);

    const tableTop = 322;
    drawLabel(doc, "Description", 48, tableTop);
    drawLabel(doc, "Qty", 360, tableTop);
    drawLabel(doc, "Unit", 440, tableTop);
    drawLabel(doc, "Total", 520, tableTop);
    drawRule(doc, tableTop + 16);

    let y = tableTop + 24;
    items.forEach((item) => {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(PRIMARY).text(item.description, 48, y, { width: 285 });
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(formatQuantity(item.quantity), 350, y, {
        width: 35,
        align: "right",
      });
      doc.text(formatMoney(item.unit_price), 420, y, { width: 60, align: "right" });
      doc.font("Helvetica-Bold").fillColor(PRIMARY).text(formatMoney(getLineTotalAmount(item)), 500, y, {
        width: 64,
        align: "right",
      });
      y += 18;
      drawRule(doc, y - 6);
    });

    const totalsX = 382;
    y += 6;
    const discountAmount = Number(invoice.discount_amount ?? 0);
    const hasDiscount = Number.isFinite(discountAmount) && discountAmount > 0;
    const discountLabel = invoice.promo_code ? `Discount (${invoice.promo_code})` : "Discount";
    const totalRows: Array<[string, string, boolean]> = [
      ["Subtotal", formatMoney(invoice.subtotal), false],
      ...(hasDiscount ? [[discountLabel, `-${formatMoney(discountAmount)}`, false] as [string, string, boolean]] : []),
      ["Tax", formatMoney(invoice.tax), false],
      ["Total", formatMoney(invoice.total), true],
      ...(paidAmount > 0 ? [["Payments received", formatMoney(paidAmount), false] as [string, string, boolean]] : []),
      ["Amount due", formatMoney(amountDue), true],
    ];

    totalRows.forEach(([label, value, strong]) => {
      doc.font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 9 : 8).fillColor(strong ? PRIMARY : MUTED);
      doc.text(label, totalsX, y, { width: 95 });
      doc.font("Helvetica-Bold").fillColor(PRIMARY).text(value, 500, y, { width: 64, align: "right" });
      y += strong ? 19 : 14;
    });

    if (payments.length > 0) {
      y += 8;
      drawRule(doc, y);
      y += 14;
      drawLabel(doc, "Payment history", 48, y);
      y += 18;
      payments.forEach((payment) => {
        doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(`${formatShortDateTime(payment.payment_date)} ET`, 48, y, {
          width: 150,
        });
        doc.font("Helvetica-Bold").fillColor(PRIMARY).text(formatPaymentMethod(payment.method), 230, y, { width: 140 });
        doc.text(formatMoney(payment.amount), 500, y, { width: 64, align: "right" });
        y += 16;
      });
    }

    y += 14;
    drawRule(doc, y);
    y += 14;
    drawLabel(doc, "Terms and warranty", 48, y);
    y += 18;

    const leftTerms = INVOICE_TERMS.slice(0, 3);
    const rightTerms = INVOICE_TERMS.slice(3);
    const drawTermColumn = (terms: string[], x: number, startY: number) => {
      let termY = startY;
      terms.forEach((term) => {
        doc.circle(x + 2, termY + 4, 1.4).fill(PRIMARY);
        doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(term, x + 10, termY, {
          width: 225,
          lineGap: 1.2,
        });
        termY += doc.heightOfString(term, { width: 225, lineGap: 1.2 }) + 7;
      });
      return termY;
    };

    const leftEnd = drawTermColumn(leftTerms, 48, y);
    const rightEnd = drawTermColumn(rightTerms, 310, y);
    y = Math.max(leftEnd, rightEnd) + 4;
    drawRule(doc, y);
    y += 8;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(PRIMARY).text("Note:", 48, y, { continued: true });
    doc.font("Helvetica").fillColor(MUTED).text(` ${INVOICE_TAX_NOTE}`, { width: 516 });
  });
}
