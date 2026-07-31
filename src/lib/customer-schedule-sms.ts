import { sendCustomerSms } from "@/lib/customer-sms";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  getInvoiceById,
  type InvoiceJobStatus,
  type InvoiceRecord,
} from "@/lib/supabase-invoices";

type ScheduleSmsIntent = {
  kind: "scheduled" | "rescheduled" | "canceled" | "on_the_way";
  title: string;
  body: string;
};

const CUSTOMER_VISIBLE_JOB_STATUSES = new Set<InvoiceJobStatus>([
  "scheduled",
  "on_the_way",
  "in_progress",
  "need_parts",
  "done",
]);

function getCurrentJobStatus(invoice: InvoiceRecord) {
  return invoice.job_status ?? (invoice.service_date ? "scheduled" : "reschedule");
}

function formatServiceDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatServiceTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const [hour, minute] = value.split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 0, 1, hour, minute)));
}

function getScheduleText(invoice: InvoiceRecord) {
  const date = formatServiceDate(invoice.service_date);
  const time = formatServiceTime(invoice.service_time);
  const window = invoice.service_window?.trim() ?? "";
  const timeText = time || window;

  return [date, timeText].filter(Boolean).join(", ");
}

function hasCustomerSchedule(invoice: InvoiceRecord) {
  const status = getCurrentJobStatus(invoice);

  return Boolean(
    invoice.service_date &&
      (invoice.service_time || invoice.service_window) &&
      invoice.assigned_technician?.trim() &&
      CUSTOMER_VISIBLE_JOB_STATUSES.has(status),
  );
}

function scheduleChanged(previous: InvoiceRecord, next: InvoiceRecord) {
  return (
    previous.service_date !== next.service_date ||
    previous.service_time !== next.service_time ||
    previous.service_window !== next.service_window
  );
}

function getScheduleSmsIntent(
  previousInvoice: InvoiceRecord | null,
  nextInvoice: InvoiceRecord,
): ScheduleSmsIntent | null {
  const previousStatus = previousInvoice ? getCurrentJobStatus(previousInvoice) : null;
  const nextStatus = getCurrentJobStatus(nextInvoice);

  if (nextInvoice.status === "void") {
    return null;
  }

  if (nextStatus === "canceled" && previousStatus !== "canceled") {
    return {
      kind: "canceled",
      title: "Customer cancellation SMS sent",
      body: "DAPL Appliance Repair canceled your service visit. Call 704-266-0508 if you need help. Reply STOP to opt out.",
    };
  }

  if (nextStatus === "on_the_way" && previousStatus !== "on_the_way") {
    return {
      kind: "on_the_way",
      title: "Customer technician arrival SMS sent",
      body: "DAPL Appliance Repair: your technician is on the way. Reply STOP to opt out.",
    };
  }

  if (!hasCustomerSchedule(nextInvoice)) {
    return null;
  }

  const scheduleText = getScheduleText(nextInvoice);

  if (!scheduleText) {
    return null;
  }

  if (!previousInvoice || !hasCustomerSchedule(previousInvoice)) {
    return {
      kind: "scheduled",
      title: "Customer scheduled SMS sent",
      body: `DAPL Appliance Repair scheduled your service visit for ${scheduleText}. Reply STOP to opt out.`,
    };
  }

  if (scheduleChanged(previousInvoice, nextInvoice)) {
    return {
      kind: "rescheduled",
      title: "Customer reschedule SMS sent",
      body: `DAPL Appliance Repair rescheduled your service visit to ${scheduleText}. Reply STOP to opt out.`,
    };
  }

  return null;
}

export async function notifyCustomerScheduleSms(
  previousInvoice: InvoiceRecord | null,
  invoiceId: string,
) {
  try {
    const nextInvoiceData = await getInvoiceById(invoiceId);
    const nextInvoice = nextInvoiceData?.invoice;

    if (!nextInvoice) {
      return;
    }

    const intent = getScheduleSmsIntent(previousInvoice, nextInvoice);

    if (!intent) {
      return;
    }

    const result = await sendCustomerSms(nextInvoice.customer_phone, intent.body);

    if (!result.ok) {
      if (result.reason === "config" || result.reason === "send_error") {
        await createLeadActivity({
          leadId: nextInvoice.lead_id,
          invoiceId: nextInvoice.id,
          eventType: "customer_schedule_sms_failed",
          title: "Customer schedule SMS failed",
          details: result.details || `SMS was not sent: ${result.reason}.`,
          metadata: {
            reason: result.reason,
            sms_kind: intent.kind,
          },
        });
      }

      return;
    }

    await createLeadActivity({
      leadId: nextInvoice.lead_id,
      invoiceId: nextInvoice.id,
      eventType: "customer_schedule_sms_sent",
      title: intent.title,
      details: `Sent to ${result.to}.`,
      metadata: {
        message_sid: result.messageSid,
        sms_kind: intent.kind,
      },
    });
  } catch (error) {
    console.error("Customer schedule SMS failed:", error);
  }
}
