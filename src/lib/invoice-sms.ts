import { sendCustomerSms, type SendCustomerSmsResult } from "@/lib/customer-sms";
import { getShortPublicInvoiceUrl } from "@/lib/invoice-public-link";
import { type InvoiceWithItems } from "@/lib/supabase-invoices";

export function buildInvoiceSmsText(invoiceData: InvoiceWithItems) {
  const { invoice } = invoiceData;
  const invoiceUrl = getShortPublicInvoiceUrl(invoice.invoice_number);

  return `Invoice due from DAPL Appliance Repair: ${invoiceUrl} Reply STOP to opt out.`;
}

export async function sendInvoiceSms(
  invoiceData: InvoiceWithItems,
): Promise<SendCustomerSmsResult> {
  return sendCustomerSms(invoiceData.invoice.customer_phone, buildInvoiceSmsText(invoiceData));
}
