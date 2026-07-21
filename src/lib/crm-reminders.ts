import {
  calculateInvoiceAmountDue,
  type InvoicePaymentRecord,
  type InvoiceRecord,
} from "@/lib/supabase-invoices";
import type { InvoicePartRecord } from "@/lib/supabase-parts";

export type CrmReminderAudience = "owner" | "dispatcher" | "technician";
export type CrmReminderSeverity = "high" | "medium" | "low";

export type CrmReminder = {
  id: string;
  title: string;
  body: string;
  href: string;
  audience: CrmReminderAudience;
  severity: CrmReminderSeverity;
  date: string | null;
};

type GetCrmRemindersInput = {
  invoices: InvoiceRecord[];
  payments?: InvoicePaymentRecord[];
  parts?: InvoicePartRecord[];
  today: string;
};

const CLOSED_JOB_STATUSES = new Set(["done", "canceled"]);
const CLOSED_PART_STATUSES = new Set(["installed", "returned", "canceled"]);

function getJobStatus(invoice: InvoiceRecord) {
  return invoice.job_status ?? (invoice.service_date ? "scheduled" : "reschedule");
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00.000Z`);
  const end = new Date(`${endDate}T12:00:00.000Z`);
  const diff = end.getTime() - start.getTime();

  if (!Number.isFinite(diff)) {
    return 0;
  }

  return Math.floor(diff / 86_400_000);
}

function getRecordDate(value: string | null | undefined) {
  return value?.slice(0, 10) ?? null;
}

function getPaymentTotalsByInvoice(payments: InvoicePaymentRecord[]) {
  const totals = new Map<string, InvoicePaymentRecord[]>();

  for (const payment of payments) {
    totals.set(payment.invoice_id, [...(totals.get(payment.invoice_id) ?? []), payment]);
  }

  return totals;
}

function getOpenPartsByInvoice(parts: InvoicePartRecord[]) {
  const openParts = new Map<string, InvoicePartRecord[]>();

  for (const part of parts) {
    if (CLOSED_PART_STATUSES.has(part.status)) {
      continue;
    }

    openParts.set(part.invoice_id, [...(openParts.get(part.invoice_id) ?? []), part]);
  }

  return openParts;
}

export function getCrmReminders(input: GetCrmRemindersInput) {
  const { invoices, payments = [], parts = [], today } = input;
  const reminders: CrmReminder[] = [];
  const paymentsByInvoice = getPaymentTotalsByInvoice(payments);
  const openPartsByInvoice = getOpenPartsByInvoice(parts);
  const hasPaymentData = Boolean(input.payments);

  for (const invoice of invoices) {
    if (invoice.status === "void") {
      continue;
    }

    const jobStatus = getJobStatus(invoice);
    const isClosedJob = CLOSED_JOB_STATUSES.has(jobStatus);
    const invoiceHref = `/admin/invoices/${invoice.id}`;
    const customer = invoice.customer_name || "Customer";
    const appliance = invoice.appliance || "appliance";
    const serviceDate = invoice.service_date;

    if (!serviceDate && invoice.status !== "paid") {
      reminders.push({
        id: `schedule-${invoice.id}`,
        title: "Needs scheduling",
        body: `${customer} has an open ${appliance} invoice without a visit date.`,
        href: `/admin/schedule#unscheduled-invoices`,
        audience: "dispatcher",
        severity: "high",
        date: null,
      });
    }

    if (serviceDate && !invoice.service_time && !invoice.service_window && !isClosedJob) {
      reminders.push({
        id: `time-${invoice.id}`,
        title: "Time is missing",
        body: `${customer} is on ${serviceDate}, but no time window is set.`,
        href: `/admin/schedule?date=${serviceDate}#date-time-missing`,
        audience: "dispatcher",
        severity: "medium",
        date: serviceDate,
      });
    }

    if (serviceDate && !invoice.assigned_technician && !isClosedJob) {
      reminders.push({
        id: `tech-${invoice.id}`,
        title: "Technician needed",
        body: `${customer} has a scheduled job without an assigned technician.`,
        href: `/admin/schedule?date=${serviceDate}`,
        audience: "dispatcher",
        severity: "medium",
        date: serviceDate,
      });
    }

    if (serviceDate && serviceDate < today && !isClosedJob) {
      reminders.push({
        id: `past-${invoice.id}`,
        title: "Past job still open",
        body: `${customer} was scheduled for ${serviceDate}, but the job is not closed.`,
        href: invoiceHref,
        audience: "technician",
        severity: "high",
        date: serviceDate,
      });
    }

    if (serviceDate === today && !isClosedJob) {
      reminders.push({
        id: `today-${invoice.id}`,
        title: "Today job open",
        body: `${customer} is still active today. Current status: ${jobStatus.replace(/_/g, " ")}.`,
        href: invoiceHref,
        audience: "technician",
        severity: "low",
        date: serviceDate,
      });
    }

    const openParts = openPartsByInvoice.get(invoice.id) ?? [];

    if (jobStatus === "need_parts" || openParts.length) {
      reminders.push({
        id: `parts-${invoice.id}`,
        title: "Parts follow-up",
        body: `${customer} has ${openParts.length || 1} open part item${openParts.length === 1 ? "" : "s"}.`,
        href: invoiceHref,
        audience: "dispatcher",
        severity: jobStatus === "need_parts" ? "high" : "medium",
        date: serviceDate,
      });
    }

    if (hasPaymentData && invoice.status !== "paid") {
      const amountDue = calculateInvoiceAmountDue(invoice, paymentsByInvoice.get(invoice.id) ?? []);
      const invoiceAgeDays = daysBetween(getRecordDate(invoice.created_at) ?? today, today);

      if (amountDue > 0 && (invoiceAgeDays >= 3 || serviceDate === today || (serviceDate && serviceDate < today))) {
        reminders.push({
          id: `unpaid-${invoice.id}`,
          title: "Payment follow-up",
          body: `${customer} still has $${amountDue.toFixed(2)} due.`,
          href: invoiceHref,
          audience: "owner",
          severity: invoiceAgeDays >= 7 || (serviceDate && serviceDate < today) ? "high" : "medium",
          date: serviceDate,
        });
      }
    }
  }

  for (const part of parts) {
    const partCreatedDate = getRecordDate(part.created_at);

    if (part.status !== "ordered" || !partCreatedDate || daysBetween(partCreatedDate, today) < 5) {
      continue;
    }

    reminders.push({
      id: `ordered-part-${part.id}`,
      title: "Ordered part aging",
      body: `${part.part_name} has been ordered for ${daysBetween(partCreatedDate, today)} days.`,
      href: `/admin/parts`,
      audience: "dispatcher",
      severity: "medium",
      date: partCreatedDate,
    });
  }

  return reminders.sort((left, right) => {
    const severityScore = { high: 0, medium: 1, low: 2 };
    const severityDiff = severityScore[left.severity] - severityScore[right.severity];

    if (severityDiff) {
      return severityDiff;
    }

    return (left.date ?? "9999-99-99").localeCompare(right.date ?? "9999-99-99");
  });
}
