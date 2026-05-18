import { listInvoices, type InvoiceRecord } from "@/lib/supabase-invoices";
import { listSupabaseLeads, type LeadRecord } from "@/lib/supabase-leads";

export type CustomerHistoryItem = {
  id: string;
  type: "lead" | "invoice";
  href: string;
  title: string;
  status: string;
  date: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  appliance: string | null;
  amount?: number | string | null;
};

type CustomerHistoryInput = {
  phone?: string | null;
  email?: string | null;
  excludeLeadId?: string | null;
  excludeInvoiceId?: string | null;
  limit?: number;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") || "";

  return digits.length >= 7 ? digits.slice(-10) : "";
}

function hasCustomerMatch(
  record: { phone?: string | null; email?: string | null },
  phoneKey: string,
  emailKey: string,
) {
  const recordPhone = normalizePhone(record.phone);
  const recordEmail = normalizeEmail(record.email);

  return Boolean(
    (phoneKey && recordPhone && recordPhone === phoneKey) ||
      (emailKey && recordEmail && recordEmail === emailKey),
  );
}

function leadToHistoryItem(lead: LeadRecord): CustomerHistoryItem {
  return {
    id: lead.id,
    type: "lead",
    href: `/admin/leads/${lead.id}`,
    title: "Website lead",
    status: lead.status,
    date: lead.created_at,
    customerName: lead.name,
    phone: lead.phone,
    email: lead.email,
    address: lead.service_address,
    appliance: lead.appliance,
    amount: lead.estimated_price,
  };
}

function invoiceToHistoryItem(invoice: InvoiceRecord): CustomerHistoryItem {
  return {
    id: invoice.id,
    type: "invoice",
    href: `/admin/invoices/${invoice.id}`,
    title: `Invoice ${invoice.invoice_number}`,
    status: invoice.status,
    date: invoice.service_date || invoice.created_at,
    customerName: invoice.customer_name,
    phone: invoice.customer_phone,
    email: invoice.customer_email,
    address: invoice.service_address,
    appliance: invoice.appliance,
    amount: invoice.total,
  };
}

export async function listCustomerHistory({
  phone,
  email,
  excludeLeadId,
  excludeInvoiceId,
  limit = 6,
}: CustomerHistoryInput): Promise<CustomerHistoryItem[]> {
  const phoneKey = normalizePhone(phone);
  const emailKey = normalizeEmail(email);

  if (!phoneKey && !emailKey) {
    return [];
  }

  const [leads, invoices] = await Promise.all([listSupabaseLeads(200), listInvoices(200)]);
  const matchedLeads = leads
    .filter((lead) => lead.id !== excludeLeadId)
    .filter((lead) => hasCustomerMatch({ phone: lead.phone, email: lead.email }, phoneKey, emailKey))
    .map(leadToHistoryItem);
  const matchedInvoices = invoices
    .filter((invoice) => invoice.id !== excludeInvoiceId)
    .filter((invoice) =>
      hasCustomerMatch(
        {
          phone: invoice.customer_phone,
          email: invoice.customer_email,
        },
        phoneKey,
        emailKey,
      ),
    )
    .map(invoiceToHistoryItem);

  return [...matchedLeads, ...matchedInvoices]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, limit);
}
