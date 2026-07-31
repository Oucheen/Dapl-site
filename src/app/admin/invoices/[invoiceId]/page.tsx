import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminGlobalSearch } from "@/components/admin/admin-global-search";
import { CustomerHistoryCard } from "@/components/admin/customer-history-card";
import { TechnicianSelect } from "@/components/admin/technician-select";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { getCrmTechnicianNames } from "@/lib/crm-technicians";
import { isPlaceholderCustomerEmail } from "@/lib/customer-email";
import { listCustomerHistory } from "@/lib/customer-history";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import { getPublicInvoicePath } from "@/lib/invoice-public-link";
import { getActivityActorName, listActivitiesForInvoice } from "@/lib/supabase-activity";
import { getSupabaseLeadById } from "@/lib/supabase-leads";
import { InvoiceEmailSubmitButton } from "./invoice-email-submit-button";
import { InvoiceSmsSubmitButton } from "./invoice-sms-submit-button";
import {
  INVOICE_DISCOUNT_ADJUSTMENTS,
  INVOICE_ITEM_TEMPLATES,
  type InvoiceItemRecord,
  type InvoiceJobStatus,
  type InvoiceRecord,
  type InvoiceStatus,
  calculateInvoiceAmountDue,
  calculateInvoicePaidAmount,
  getInvoiceById,
} from "@/lib/supabase-invoices";
import { getLatestInvoiceSignature } from "@/lib/supabase-invoice-signatures";
import { getTelegramUserByTechnicianName } from "@/lib/supabase-telegram-users";
import { buildTechnicianReportUrl } from "@/lib/technician-report-links";
import {
  addInvoiceItemAction,
  addInvoiceCheckAction,
  addInvoicePartExpenseAction,
  addInvoicePartAction,
  addInvoicePaymentAction,
  addInvoiceTemplateItemAction,
  addInvoiceDiscountAdjustmentAction,
  deleteInvoiceItemAction,
  deleteInvoicePartAction,
  deleteInvoicePaymentAction,
  markInvoiceCompletedAction,
  requestInvoiceSendAction,
  sendInvoiceEmailAction,
  updateInvoiceItemsAction,
  updateInvoiceCheckStatusAction,
  updateInvoicePartAction,
  updateInvoiceScheduleAction,
  updateInvoiceStatusAction,
} from "./actions";
import {
  invoicePartsTableSql,
  listInvoiceParts,
  type InvoicePartStatus,
} from "@/lib/supabase-parts";
import {
  invoiceChecksTableSql,
  listInvoiceChecks,
  type InvoiceCheckStatus,
} from "@/lib/supabase-checks";

const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

const CLOSED_INVOICE_STATUSES = new Set<InvoiceStatus>(["paid", "void"]);
const BUSINESS_EMAIL = process.env.CONTACT_TO_EMAIL || "dapl.appliance.repair@gmail.com";
const INVOICE_TERMS = [
  "90-day labor and parts warranty.",
  "No warranty is provided for maintenance, cleaning of units, or defrosting of refrigerators and freezers.",
  "Our company and technicians are not responsible for other problems that arise with household appliances after the technician leaves your home.",
  "If a deposit is made for a spare part and the customer refuses repair, the company will retain an additional 25% of the order value as a restocking fee, with a minimum fee of $30.",
  "Thank you for choosing our company. Our main task is to leave a good memory and working household appliances. Take care of yourself.",
];
const INVOICE_TAX_NOTE =
  "Sales tax on parts was paid at the time of purchase. No sales tax is charged to the customer.";
const SERVICE_WINDOWS = ["8:00 AM - 10:00 AM", "10:00 AM - 12:00 PM", "12:00 PM - 2:00 PM", "2:00 PM - 4:00 PM", "4:00 PM - 6:00 PM", "6:00 PM - 8:00 PM"];
const PART_STATUSES: { value: InvoicePartStatus; label: string }[] = [
  { value: "needed", label: "Needed" },
  { value: "ordered", label: "Ordered" },
  { value: "received", label: "Received" },
  { value: "installed", label: "Installed" },
  { value: "returned", label: "Returned" },
  { value: "canceled", label: "Canceled" },
];
const PART_EXPENSE_PAYMENT_METHODS = ["Cash", "Card", "Zelle", "Check", "Bank transfer", "Other"];
const CLOSED_PART_STATUSES = new Set<InvoicePartStatus>(["installed", "returned", "canceled"]);
const CHECK_STATUSES: { value: InvoiceCheckStatus; label: string }[] = [
  { value: "received", label: "Received" },
  { value: "ready_to_submit", label: "Ready to submit" },
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "cleared", label: "Cleared" },
  { value: "rejected", label: "Rejected" },
  { value: "void", label: "Void" },
];

const statusClasses: Record<InvoiceStatus, string> = {
  draft: "border-primary/20 bg-primary/5 text-primary",
  sent: "border-amber-500/25 bg-amber-50 text-amber-700",
  paid: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  void: "border-slate-300 bg-slate-100 text-slate-500",
};
const partStatusClasses: Record<InvoicePartStatus, string> = {
  needed: "border-amber-500/25 bg-amber-50 text-amber-800",
  ordered: "border-sky-500/25 bg-sky-50 text-sky-700",
  received: "border-indigo-500/25 bg-indigo-50 text-indigo-700",
  installed: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  returned: "border-slate-300 bg-slate-100 text-slate-600",
  canceled: "border-red-500/25 bg-red-50 text-red-700",
};
const checkStatusClasses: Record<InvoiceCheckStatus, string> = {
  received: "border-amber-500/25 bg-amber-50 text-amber-800",
  ready_to_submit: "border-sky-500/25 bg-sky-50 text-sky-700",
  submitted: "border-indigo-500/25 bg-indigo-50 text-indigo-700",
  accepted: "border-primary/20 bg-primary/5 text-primary",
  cleared: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  rejected: "border-red-500/25 bg-red-50 text-red-700",
  void: "border-slate-300 bg-slate-100 text-slate-600",
};

export const dynamic = "force-dynamic";

type PageNotice = {
  className: string;
  title: string;
  body: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: CHARLOTTE_TIME_ZONE,
  }).format(getDateForCharlotteDisplay(value));
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

function getMapsSearchUrl(address: string | null | undefined) {
  const normalizedAddress = address?.trim();

  if (!normalizedAddress) {
    return "";
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizedAddress)}`;
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

function formatInputMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return amount.toFixed(2);
}

function formatQuantity(value: number | string | null | undefined) {
  const amount = Number(value ?? 1);

  if (!Number.isFinite(amount)) {
    return "1";
  }

  return String(amount);
}

function getExpenseMonth(value: string | null | undefined) {
  return value?.slice(0, 7) || new Date().toISOString().slice(0, 7);
}

function getAccountingExpenseHref(expenseId: string, expensedAt: string | null | undefined) {
  const month = getExpenseMonth(expensedAt);
  return `/admin/accounting?month=${encodeURIComponent(month)}&expenseId=${encodeURIComponent(
    expenseId,
  )}#expense-${expenseId}`;
}

function getLineTotal(item: InvoiceItemRecord) {
  return formatMoney(Number(item.quantity ?? 0) * Number(item.unit_price ?? 0));
}

function getLineTotalAmount(item: InvoiceItemRecord) {
  return Number(item.quantity ?? 0) * Number(item.unit_price ?? 0);
}

function formatPaymentMethod(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCharlotteDateTimeInputValues() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHARLOTTE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getJobStatus(invoice: InvoiceRecord): InvoiceJobStatus {
  return invoice.job_status ?? (invoice.service_date ? "scheduled" : "reschedule");
}

function getNextAction(input: {
  invoice: InvoiceRecord;
  amountDue: number;
  openPartsCount: number;
  unexpensedPartsCount: number;
  customerEmail: string | null;
  scheduleHref: string;
  signatureHref: string;
  technicianReportHref: string;
  hasSignature: boolean;
  hasTechnicianReportPhoto: boolean;
}) {
  const jobStatus = getJobStatus(input.invoice);

  if (input.invoice.status === "void") {
    return {
      title: "Invoice is void",
      body: "No next action is required unless this invoice needs to be reopened.",
      href: "/admin/invoices",
      cta: "Open invoices",
      className: "border-slate-300 bg-slate-50 text-slate-700",
    };
  }

  if (input.invoice.status === "paid" && jobStatus !== "done") {
    return {
      title: "Close job",
      body: "Payment is recorded. Mark the job completed so it leaves the open workflow.",
      href: "#invoice-controls",
      cta: "Close job",
      className: "border-emerald-500/25 bg-emerald-50 text-emerald-900",
    };
  }

  if (input.invoice.status === "paid") {
    return {
      title: "Job is complete",
      body: "Payment is recorded and the invoice is closed.",
      href: "/admin",
      cta: "Admin dashboard",
      className: "border-emerald-500/25 bg-emerald-50 text-emerald-900",
    };
  }

  if (!input.invoice.service_date) {
    return {
      title: "Schedule this job",
      body: "Add the customer to the dispatch calendar before assigning the route.",
      href: input.scheduleHref,
      cta: "Open schedule",
      className: "border-amber-500/25 bg-amber-50 text-amber-900",
    };
  }

  if (!input.invoice.service_time && !input.invoice.service_window) {
    return {
      title: "Add visit time",
      body: "The date is set, but the technician still needs a time window or exact time.",
      href: input.scheduleHref,
      cta: "Set time",
      className: "border-amber-500/25 bg-amber-50 text-amber-900",
    };
  }

  if (!input.invoice.assigned_technician) {
    return {
      title: "Assign technician",
      body: "This job is on the calendar but does not have a technician yet.",
      href: input.scheduleHref,
      cta: "Assign tech",
      className: "border-sky-500/25 bg-sky-50 text-sky-900",
    };
  }

  if (jobStatus === "need_parts" || input.openPartsCount > 0) {
    return {
      title: "Follow up on parts",
      body: input.unexpensedPartsCount
        ? "Parts are still open, and at least one part cost has not been added to expenses."
        : "Parts are still open for this job. Update status when ordered, received, or installed.",
      href: "#internal-parts",
      cta: "Review parts",
      className: "border-orange-500/25 bg-orange-50 text-orange-900",
    };
  }

  if (!input.hasTechnicianReportPhoto) {
    return {
      title: "Get technician report",
      body: "Ask the technician to add field notes and at least one job photo before final approval.",
      href: input.technicianReportHref,
      cta: "Open report",
      className: "border-amber-500/25 bg-amber-50 text-amber-900",
    };
  }

  if (Number(input.invoice.total ?? 0) > 0 && !input.hasSignature) {
    return {
      title: "Get signature",
      body: "Customer approval is missing. Have the customer sign the invoice terms before sending or closing.",
      href: input.signatureHref,
      cta: "Open signature",
      className: "border-amber-500/25 bg-amber-50 text-amber-900",
    };
  }

  if (input.invoice.status === "draft" && input.customerEmail) {
    return {
      title: "Send invoice",
      body: "The invoice is still draft. Send it once the customer-facing charges look correct.",
      href: "#invoice-controls",
      cta: "Review controls",
      className: "border-primary/20 bg-primary/5 text-primary",
    };
  }

  if (input.amountDue > 0) {
    return {
      title: "Collect balance",
      body: `The customer still owes ${formatMoney(input.amountDue)}.`,
      href: "#payment-history",
      cta: "Add payment",
      className: "border-red-500/25 bg-red-50 text-red-900",
    };
  }

  return {
    title: "Mark completed",
    body: "The invoice balance is zero. Mark the job completed to close it cleanly.",
    href: "#invoice-controls",
    cta: "Close job",
    className: "border-emerald-500/25 bg-emerald-50 text-emerald-900",
  };
}

function getWorkflowStatusClass(isComplete: boolean) {
  return isComplete
    ? "border-emerald-500/25 bg-emerald-50 text-emerald-700"
    : "border-amber-500/25 bg-amber-50 text-amber-800";
}

function getEmailNotice(status: string | undefined, customerEmail: string | null): PageNotice | null {
  if (status === "sent") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Invoice email sent",
      body: customerEmail
        ? `The invoice was sent to ${customerEmail}.`
        : "The invoice email was sent.",
    };
  }

  if (status === "missing_email") {
    return {
      className: "border-amber-500/20 bg-amber-50 text-amber-800",
      title: "Customer email is missing",
      body: "Add a customer email before sending this invoice.",
    };
  }

  if (status === "config") {
    return {
      className: "border-amber-500/20 bg-amber-50 text-amber-800",
      title: "Resend is not configured",
      body: "Add RESEND_API_KEY and CONTACT_FROM_EMAIL in Vercel before sending invoice emails.",
    };
  }

  if (status === "send_error") {
    return {
      className: "border-accent/20 bg-accent/5 text-accent",
      title: "Invoice email was not sent",
      body: "Resend returned an error. Check Vercel logs for the exact delivery issue.",
    };
  }

  return null;
}

function getSmsNotice(status: string | undefined, customerPhone: string | null): PageNotice | null {
  if (status === "sent") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Invoice SMS sent",
      body: customerPhone
        ? `The invoice link was sent to ${customerPhone}.`
        : "The invoice SMS was sent.",
    };
  }

  if (status === "missing_phone") {
    return {
      className: "border-amber-500/20 bg-amber-50 text-amber-800",
      title: "Customer phone is missing",
      body: "Add a customer phone number before sending this invoice by SMS.",
    };
  }

  if (status === "config") {
    return {
      className: "border-amber-500/20 bg-amber-50 text-amber-800",
      title: "Twilio is not configured",
      body: "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID in Vercel before sending invoice SMS.",
    };
  }

  if (status === "send_error") {
    return {
      className: "border-accent/20 bg-accent/5 text-accent",
      title: "Invoice SMS was not sent",
      body: "Twilio returned an error. Check Vercel logs for the exact delivery issue.",
    };
  }

  return null;
}

function getActionNotice(status: string | undefined): PageNotice | null {
  if (status === "status_updated") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Invoice status saved",
      body: "The invoice and related job status were updated.",
    };
  }

  if (status === "job_completed") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Job marked completed",
      body: "The invoice is paid and the related lead was moved to completed.",
    };
  }

  if (status === "schedule_updated") {
    return {
      className: "border-emerald-500/25 bg-emerald-50 text-emerald-800",
      title: "Visit schedule saved",
      body: "Service date, time window, and technician were updated.",
    };
  }

  if (status === "signature_saved") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Customer signature saved",
      body: "The customer signed the invoice and service terms.",
    };
  }

  if (status === "items_saved") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Invoice line items saved",
      body: "Services, quantities, prices, discount, and totals were recalculated.",
    };
  }

  if (status === "item_added") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Blank line added",
      body: "A new editable invoice line was added.",
    };
  }

  if (status === "template_added") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Template item added",
      body: "The selected invoice template was added to the line items.",
    };
  }

  if (status === "discount_adjustment_added") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Discount added",
      body: "The discount was added as a customer-facing invoice line.",
    };
  }

  if (status === "item_deleted") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Invoice line removed",
      body: "The line item was deleted and invoice totals were recalculated.",
    };
  }

  if (status === "payment_added") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Payment recorded",
      body: "Payment history and amount due were updated.",
    };
  }

  if (status === "payment_deleted") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Payment removed",
      body: "Payment history and amount due were recalculated.",
    };
  }

  if (status === "check_added") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Check received",
      body: "The check was added to the Increase-style check queue.",
    };
  }

  if (status === "check_status_updated") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Check status saved",
      body: "The check queue was updated.",
    };
  }

  if (status === "check_cleared") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Check cleared",
      body: "The check was marked cleared and added to invoice payments.",
    };
  }

  if (status === "part_added") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Part added",
      body: "The part was added to this job.",
    };
  }

  if (status === "part_saved") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Part saved",
      body: "Part status, supplier, cost, or notes were updated.",
    };
  }

  if (status === "part_deleted") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Part removed",
      body: "The part was removed from this job.",
    };
  }

  if (status === "part_expensed") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Part added to expenses",
      body: "The part cost was added to accounting and linked to this part record.",
    };
  }

  if (status === "part_already_expensed") {
    return {
      className: "border-amber-500/20 bg-amber-50 text-amber-800",
      title: "Part already expensed",
      body: "This part is already linked to an accounting expense.",
    };
  }

  if (status === "tech_report_saved") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Technician report saved",
      body: "Field notes, photos, and technician updates were saved to this customer record.",
    };
  }

  if (status === "tech_report_saved_photo_warning") {
    return {
      className: "border-amber-500/20 bg-amber-50 text-amber-800",
      title: "Technician report saved",
      body: "The report was saved, but one or more photos could not upload. Try smaller JPG/PNG photos if anything is missing.",
    };
  }

  if (status === "invoice_send_requested") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Invoice marked ready",
      body: "The office can review this invoice and send it to the customer.",
    };
  }

  if (status === "permission_denied") {
    return {
      className: "border-amber-500/20 bg-amber-50 text-amber-800",
      title: "Action limited by role",
      body: "Only an owner, boss, admin, or manager can edit charges, delete payments, or void invoices.",
    };
  }

  return null;
}

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{
    email?: string | string[] | undefined;
    sms?: string | string[] | undefined;
    notice?: string | string[] | undefined;
  }>;
}) {
  const permissions = await getCurrentAdminPermissions();
  const { invoiceId } = await params;

  if (!permissions.user) {
    redirect(`/admin/leads/login?returnTo=${encodeURIComponent(`/admin/invoices/${invoiceId}`)}`);
  }

  const query = await searchParams;
  const invoiceData = await getInvoiceById(invoiceId);

  if (!invoiceData) {
    notFound();
  }

  const { invoice, items, payments } = invoiceData;
  const customerEmail = isPlaceholderCustomerEmail(invoice.customer_email)
    ? null
    : invoice.customer_email;
  const [activity, customerHistory, invoiceLead, partsData, checksData, signature] = await Promise.all([
    listActivitiesForInvoice(invoice.id, 30),
    listCustomerHistory({
      phone: invoice.customer_phone,
      email: customerEmail,
      excludeInvoiceId: invoice.id,
    }),
    invoice.lead_id ? getSupabaseLeadById(invoice.lead_id) : Promise.resolve(null),
    listInvoiceParts(invoice.id),
    listInvoiceChecks(invoice.id),
    getLatestInvoiceSignature(invoice.id),
  ]);
  const technicians = await getCrmTechnicianNames([invoice.assigned_technician]);
  const invoiceParts = partsData.parts;
  const partsReady = partsData.ready;
  const invoiceChecks = checksData.checks;
  const checksReady = checksData.ready;
  const openChecks = invoiceChecks.filter((check) => !["cleared", "rejected", "void"].includes(check.status));
  const pendingCheckAmount = openChecks.reduce((sum, check) => sum + Number(check.amount ?? 0), 0);
  const openPartsCount = invoiceParts.filter(
    (part) => !CLOSED_PART_STATUSES.has(part.status),
  ).length;
  const notices: PageNotice[] = [
    getEmailNotice(getQueryValue(query.email), customerEmail),
    getSmsNotice(getQueryValue(query.sms), invoice.customer_phone),
    getActionNotice(getQueryValue(query.notice)),
  ].filter((notice): notice is PageNotice => notice !== null);
  const discountAmount = Number(invoice.discount_amount ?? 0);
  const hasDiscount = Number.isFinite(discountAmount) && discountAmount > 0;
  const discountLabel = invoice.promo_code ? `Discount (${invoice.promo_code})` : "Discount";
  const paidAmount = calculateInvoicePaidAmount(payments);
  const amountDue = calculateInvoiceAmountDue(invoice, payments);
  const knownPartsCost = invoiceParts.reduce((sum, part) => sum + Number(part.cost ?? 0), 0);
  const expensedPartsCost = invoiceParts
    .filter((part) => part.expense_id)
    .reduce((sum, part) => sum + Number(part.cost ?? 0), 0);
  const unexpensedParts = invoiceParts.filter((part) => !part.expense_id && Number(part.cost ?? 0) > 0);
  const unexpensedPartsCost = unexpensedParts.reduce((sum, part) => sum + Number(part.cost ?? 0), 0);
  const customerPartsCharge = items
    .filter((item) => /part/i.test(item.description))
    .reduce((sum, item) => sum + getLineTotalAmount(item), 0);
  const estimatedJobProfit = paidAmount - knownPartsCost;
  const hasPayments = payments.length > 0;
  const isInvoiceClosed = CLOSED_INVOICE_STATUSES.has(invoice.status);
  const jobStatus = getJobStatus(invoice);
  const hasCustomerChargeAmount = items.some((item) => getLineTotalAmount(item) > 0);
  const hasTechnicianReport = activity.some(
    (item) =>
      item.event_type === "telegram_visit_report_completed" ||
      item.event_type === "telegram_report_own_part" ||
      item.event_type === "telegram_report_photo" ||
      item.metadata?.source === "technician_report_page",
  );
  const hasTechnicianReportPhoto = activity.some(
    (item) =>
      item.event_type === "telegram_report_photo" &&
      item.metadata?.source === "technician_report_page",
  );
  const hasInvoiceBeenSent =
    invoice.status === "sent" ||
    invoice.status === "paid" ||
    activity.some(
      (item) => item.event_type === "invoice_email_sent" || item.event_type === "invoice_sms_sent",
    );
  const isJobDone = jobStatus === "done" || invoice.status === "paid";
  const isBalanceCollected = amountDue <= 0;
  const isManualInvoice = invoiceLead?.lead_source === "manual-admin";
  const canEditOpenManualInvoice = isManualInvoice && !isInvoiceClosed;
  const canManageInvoiceCharges =
    (permissions.canManageInvoiceCharges || canEditOpenManualInvoice) && !isInvoiceClosed;
  const lineItemsLockedByRole = !canManageInvoiceCharges && !isInvoiceClosed;
  const paymentInputDefaults = getCharlotteDateTimeInputValues();
  const mapsUrl = getMapsSearchUrl(invoice.service_address);
  const scheduleHref = invoice.service_date
    ? `/admin/schedule?date=${encodeURIComponent(invoice.service_date)}`
    : "/admin/schedule";
  const technicianDayHref = invoice.service_date
    ? `/admin/technician?date=${encodeURIComponent(invoice.service_date)}${invoice.assigned_technician ? `&tech=${encodeURIComponent(invoice.assigned_technician)}` : ""}`
    : "/admin/technician";
  const telegramTechnician = invoice.assigned_technician
    ? await getTelegramUserByTechnicianName(invoice.assigned_technician)
    : null;
  const directTechnicianReportHref = telegramTechnician?.user
    ? (() => {
        const reportHref = buildTechnicianReportUrl(
          invoice.id,
          telegramTechnician.user.telegram_user_id,
          "",
        );

        return reportHref
          ? `${reportHref}&${new URLSearchParams({ returnTo: `/admin/invoices/${invoice.id}` }).toString()}`
          : "";
      })()
    : "";
  const technicianReportHref = directTechnicianReportHref || technicianDayHref;
  const publicInvoicePath = getPublicInvoicePath(invoice.invoice_number);
  const signatureParams = new URLSearchParams(publicInvoicePath.split("?")[1] ?? "");
  signatureParams.set("returnTo", `/admin/invoices/${invoice.id}`);
  const signatureHref = `/i/${encodeURIComponent(invoice.invoice_number)}/sign?${signatureParams.toString()}`;
  const nextAction = getNextAction({
    invoice,
    amountDue,
    openPartsCount,
    unexpensedPartsCount: unexpensedParts.length,
    customerEmail,
    scheduleHref,
    signatureHref,
    technicianReportHref,
    hasSignature: Boolean(signature),
    hasTechnicianReportPhoto,
  });
  const availableInvoiceStatuses = INVOICE_STATUSES.filter(
    (status) =>
      (status.value !== "paid" || invoice.status === "paid" || amountDue <= 0) &&
      (permissions.canVoidInvoices || status.value !== "void" || invoice.status === "void"),
  );

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground print:bg-white print:pb-0 print:text-slate-950">
      <header className="border-b border-border bg-white print:hidden">
        <div className="container-shell flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/leads"
              className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70"
            >
              Back to leads
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              Invoice {invoice.invoice_number}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full min-w-[18rem] sm:w-auto">
              <AdminGlobalSearch compact />
            </div>
            <Link
              href="/admin"
              className="inline-flex w-fit rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Dashboard
            </Link>
            <Link
              href={scheduleHref}
              className="inline-flex w-fit rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Schedule
            </Link>
            <Link
              href={technicianDayHref}
              className="inline-flex w-fit rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Technician day
            </Link>
            <span
              className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-bold ${statusClasses[invoice.status]}`}
            >
              {invoice.status}
            </span>
          </div>
        </div>
      </header>

      <section className="container-shell py-8 print:max-w-none print:px-0 print:py-0">
        {notices.map((notice) => (
          <div
            key={notice.title}
            className={`mb-5 rounded-2xl border px-5 py-4 text-sm shadow-sm print:hidden ${notice.className}`}
          >
            <p className="font-black">{notice.title}</p>
            <p className="mt-1 leading-6">{notice.body}</p>
          </div>
        ))}

        <div className="grid items-start gap-6 print:block xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
          <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:text-[11px] print:shadow-none">
            <div className="border-b border-border bg-slate-50/80 px-5 py-5 print:bg-white print:px-0 print:py-3 sm:px-7">
              <div className="flex flex-col gap-5 print:gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <Image
                    src="/logo.jpg"
                    alt="DAPL Appliance Repair logo"
                    width={96}
                    height={96}
                    className="h-20 w-20 object-contain print:h-16 print:w-16"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/70 print:text-[9px]">
                      DAPL Appliance Repair
                    </p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-muted print:text-[10px] print:leading-4">
                      9401 Peckham Rye Rd, Charlotte, NC 28227
                    </p>
                    <a
                      href={`mailto:${BUSINESS_EMAIL}`}
                      className="mt-1 block max-w-sm break-words text-sm leading-6 text-muted hover:text-primary print:text-[10px] print:leading-4 print:text-slate-700"
                    >
                      {BUSINESS_EMAIL}
                    </a>
                    <p className="mt-2 max-w-sm text-xs leading-5 text-muted print:mt-1 print:text-[9px] print:leading-4">
                      DAPL Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Invoice
                  </p>
                  <p className="mt-1 text-xl font-black text-primary print:whitespace-nowrap print:text-lg">
                    {invoice.invoice_number}
                  </p>
                  <p className="mt-2 text-sm text-muted print:text-xs">
                    Created {formatDateTime(invoice.created_at)} ET
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize text-muted print:text-xs">
                    Status: {invoice.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 border-b border-border px-5 py-5 print:gap-3 print:px-0 print:py-3 sm:grid-cols-2 sm:px-7">
              <section>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Bill to
                </p>
                <p className="mt-3 text-xl font-black text-primary print:mt-2 print:text-base">{invoice.customer_name}</p>
                {invoice.customer_phone ? (
                  <a
                    href={`tel:${invoice.customer_phone}`}
                    className="mt-2 block font-semibold text-foreground hover:text-primary print:mt-1"
                  >
                    {invoice.customer_phone}
                  </a>
                ) : null}
                {customerEmail ? (
                  <a
                    href={`mailto:${customerEmail}`}
                    className="mt-1 block break-words text-muted hover:text-primary"
                  >
                    {customerEmail}
                  </a>
                ) : null}
              </section>

              <section className="grid gap-4 text-sm leading-6 text-muted print:gap-2 print:text-[10px] print:leading-4 sm:grid-cols-2">
                <div>
                  <p className="font-bold text-foreground">Service address</p>
                  <p className="mt-1 break-words">{invoice.service_address || "Not set"}</p>
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex rounded-lg border border-primary/15 bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/5 print:hidden"
                    >
                      Open in Google Maps
                    </a>
                  ) : null}
                </div>
                <div>
                  <p className="font-bold text-foreground">Service date</p>
                  <p className="mt-1">{formatDate(invoice.service_date)}</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">Service time</p>
                  <p className="mt-1">{getServiceScheduleLabel(invoice)}</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">Appliance</p>
                  <p className="mt-1">{invoice.appliance || "Not selected"}</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">Technician</p>
                  <p className="mt-1">{invoice.assigned_technician || "Not assigned"}</p>
                </div>
                {invoice.promo_code ? (
                  <div>
                    <p className="font-bold text-foreground">Promo code</p>
                    <p className="mt-1">{invoice.promo_code}</p>
                  </div>
                ) : null}
              </section>
            </div>

            {!canManageInvoiceCharges ? (
              <section id="invoice-line-items" className="px-5 py-5 print:hidden sm:px-7">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      Line items
                    </p>
                    <h2 className="mt-1 text-xl font-black text-primary">
                      Customer invoice charges
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      These rows are what the customer sees and pays. Job parts and supplier cost
                      are tracked separately below.
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-emerald-500/25 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {lineItemsLockedByRole ? "Owner only" : "Locked"}
                  </span>
                </div>
                <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                  {lineItemsLockedByRole
                    ? "This role can record payments and update job progress. Website-lead invoice charges are editable only by an owner, boss, admin, or manager; manual open invoices stay editable for staff."
                    : "This invoice is closed, so service lines are locked to protect payment history. Reopen the invoice before changing charges."}
                </p>

                <div className="mt-5 overflow-hidden rounded-xl border border-border">
                  <div className="hidden grid-cols-[minmax(0,1fr)_90px_130px_130px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:grid">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit</span>
                    <span className="text-right">Total</span>
                  </div>

                  <div className="divide-y divide-border">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[minmax(0,1fr)_90px_130px_130px] lg:items-center"
                      >
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-[0.12em] text-muted lg:hidden">
                            Description
                          </span>
                          <span className="font-semibold text-foreground">{item.description}</span>
                        </div>
                        <div className="text-muted lg:text-right">
                          <span className="mr-2 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:hidden">
                            Qty
                          </span>
                          {formatQuantity(item.quantity)}
                        </div>
                        <div className="text-muted lg:text-right">
                          <span className="mr-2 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:hidden">
                            Unit
                          </span>
                          {formatMoney(item.unit_price)}
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2 font-black text-primary lg:bg-transparent lg:px-0 lg:text-right">
                          {getLineTotal(item)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              <form
                id="invoice-line-items"
                action={updateInvoiceItemsAction}
                className="px-5 py-5 print:hidden sm:px-7"
              >
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      Line items
                    </p>
                    <h2 className="mt-1 text-xl font-black text-primary">
                      Customer invoice charges
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      These rows are what the customer sees and pays. Job parts and supplier cost
                      are tracked separately below.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Save invoice items
                  </button>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-border">
                  <div className="hidden grid-cols-[minmax(0,1fr)_90px_130px_130px_90px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:grid">
                    <span>Description</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Action</span>
                  </div>

                  <div className="divide-y divide-border">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_90px_130px_130px_90px] lg:items-center"
                      >
                        <input type="hidden" name="itemId" value={item.id} />
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:block">
                          <span className="lg:hidden">Description</span>
                          <input
                            type="text"
                            name="description"
                            defaultValue={item.description}
                            required
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:block">
                          <span className="lg:hidden">Qty</span>
                          <input
                            type="number"
                            name="quantity"
                            defaultValue={formatQuantity(item.quantity)}
                            min="0.01"
                            step="0.01"
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 lg:text-right"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted lg:block">
                          <span className="lg:hidden">Unit</span>
                          <input
                            type="number"
                            name="unitPrice"
                            defaultValue={formatInputMoney(item.unit_price)}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2 lg:text-right"
                          />
                        </label>
                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-black text-primary lg:bg-transparent lg:px-0 lg:text-right">
                          {getLineTotal(item)}
                        </div>
                        <button
                          type="submit"
                          form={`delete-invoice-item-${item.id}`}
                          className="rounded-lg border border-accent/20 bg-white px-3 py-2 text-xs font-bold text-accent transition hover:bg-accent/5"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {canManageInvoiceCharges
              ? items.map((item) => (
                  <form
                    key={`delete-${item.id}`}
                    id={`delete-invoice-item-${item.id}`}
                    action={deleteInvoiceItemAction}
                    className="hidden"
                  >
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <input type="hidden" name="itemId" value={item.id} />
                  </form>
                ))
              : null}

            <div className="hidden px-5 py-6 print:block print:px-0 print:py-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted print:text-[10px]">
                Line items
              </p>
              <h2 className="mt-1 text-xl font-black text-primary print:text-base">
                Customer invoice charges
              </h2>

              <table className="mt-5 w-full border-collapse text-sm print:mt-2 print:text-[10px]">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    <th className="py-3 pr-4 print:py-1">Description</th>
                    <th className="py-3 pr-4 text-right print:py-1">Qty</th>
                    <th className="py-3 pr-4 text-right print:py-1">Unit</th>
                    <th className="py-3 text-right print:py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="py-3 pr-4 font-semibold text-foreground print:py-1">
                        {item.description}
                      </td>
                      <td className="py-3 pr-4 text-right text-muted print:py-1">
                        {formatQuantity(item.quantity)}
                      </td>
                      <td className="py-3 pr-4 text-right text-muted print:py-1">
                        {formatMoney(item.unit_price)}
                      </td>
                      <td className="py-3 text-right font-bold text-foreground print:py-1">
                        {getLineTotal(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm print:mt-2 print:max-w-[15rem] print:space-y-1 print:text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-bold text-foreground">{formatMoney(invoice.subtotal)}</span>
                </div>
                {hasDiscount ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">{discountLabel}</span>
                    <span className="font-bold text-accent">-{formatMoney(discountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-muted">Tax</span>
                  <span className="font-bold text-foreground">{formatMoney(invoice.tax)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-lg print:pt-1.5 print:text-xs">
                  <span className="font-black text-primary">Total</span>
                  <span className="font-black text-primary">{formatMoney(invoice.total)}</span>
                </div>
                {paidAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Payments received</span>
                    <span className="font-bold text-emerald-700">{formatMoney(paidAmount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-border pt-3 text-lg print:pt-1.5 print:text-xs">
                  <span className="font-black text-primary">Amount due</span>
                  <span className="font-black text-primary">{formatMoney(amountDue)}</span>
                </div>
              </div>

              {hasPayments ? (
                <div className="mt-8 print:mt-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted print:text-[9px]">
                    Payment History
                  </p>
                  <table className="mt-3 w-full border-collapse text-sm print:mt-1 print:text-[9px]">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        <th className="py-3 pr-4 print:py-1">Date</th>
                        <th className="py-3 pr-4 print:py-1">Method</th>
                        <th className="py-3 text-right print:py-1">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-border">
                          <td className="py-3 pr-4 text-muted print:py-1">
                            {formatShortDateTime(payment.payment_date)} ET
                          </td>
                          <td className="py-3 pr-4 text-foreground print:py-1">
                            {formatPaymentMethod(payment.method)}
                            {payment.note ? (
                              <span className="mt-1 block text-xs text-muted">{payment.note}</span>
                            ) : null}
                          </td>
                          <td className="py-3 text-right font-bold text-foreground print:py-1">
                            {formatMoney(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            <section className="border-t border-border px-5 py-4 print:px-0 print:py-3 sm:px-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted print:text-[9px]">
                Terms and warranty
              </p>
              <div className="mt-3 text-xs leading-5 text-muted print:mt-2 print:text-[10px] print:leading-[1.45]">
                <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 print:gap-y-1.5">
                  {INVOICE_TERMS.map((term) => (
                    <li key={term} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/50 print:mt-1.5 print:h-1 print:w-1" />
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t border-border pt-2 print:mt-1.5 print:pt-1.5">
                  <span className="font-bold text-foreground">Note:</span> {INVOICE_TAX_NOTE}
                </p>
              </div>
            </section>

            {signature ? (
              <section className="border-t border-border px-5 py-4 print:px-0 print:py-3 sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted print:text-[9px]">
                      Customer acceptance
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground print:text-[10px]">
                      Signed by {signature.signer_name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted print:text-[9px]">
                      Signed on {formatDateTime(signature.signed_at)} ET for {formatMoney(invoice.total)}.
                      Invoice {invoice.invoice_number} was accepted electronically.
                    </p>
                  </div>
                  <img
                    src={signature.signature_data_url}
                    alt="Customer signature"
                    className="max-h-24 w-full max-w-xs rounded-xl border border-border bg-white object-contain p-2 print:max-h-16 print:max-w-[220px] print:p-1"
                  />
                </div>
              </section>
            ) : (
              <section className="border-t border-border px-5 py-4 print:hidden sm:px-7">
                <div className="rounded-xl border border-amber-500/25 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
                    Customer signature
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    No customer signature is saved yet.
                  </p>
                  <Link
                    href={signatureHref}
                    className="mt-3 inline-flex rounded-lg bg-white px-4 py-2 text-xs font-bold text-primary transition hover:bg-slate-50"
                  >
                    Open signing page
                  </Link>
                </div>
              </section>
            )}

            {canManageInvoiceCharges ? (
              <details className="border-t border-border px-5 py-4 print:hidden sm:px-7">
                <summary className="flex cursor-pointer list-none flex-col gap-2 rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      Quick templates
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Add a customer-facing charge, then edit the description or price above if needed.
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-border bg-white px-3 py-1 text-xs font-bold text-muted">
                    Open
                  </span>
                </summary>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <p className="text-sm leading-6 text-muted">
                    Use these only when you need to add a new customer-facing charge or discount.
                  </p>
                  <form action={addInvoiceItemAction}>
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-primary/20 bg-white px-4 py-3 text-xs font-bold text-primary transition hover:bg-primary/5 sm:w-auto"
                    >
                      Add blank line
                    </button>
                  </form>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {(Object.entries(INVOICE_DISCOUNT_ADJUSTMENTS) as Array<
                    [keyof typeof INVOICE_DISCOUNT_ADJUSTMENTS, (typeof INVOICE_DISCOUNT_ADJUSTMENTS)[keyof typeof INVOICE_DISCOUNT_ADJUSTMENTS]]
                  >).map(([key, adjustment]) => (
                    <form key={key} action={addInvoiceDiscountAdjustmentAction}>
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="adjustmentKey" value={key} />
                      <button
                        type="submit"
                        className="flex h-full w-full items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-left text-sm transition hover:bg-accent/10"
                      >
                        <span>
                          <span className="block font-black text-accent">{adjustment.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-muted">
                            Adds a visible invoice discount line.
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-black text-accent">
                          -{formatMoney(adjustment.amount)}
                        </span>
                      </button>
                    </form>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {INVOICE_ITEM_TEMPLATES.map((template) => (
                    <form key={template.key} action={addInvoiceTemplateItemAction}>
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="templateKey" value={template.key} />
                      <button
                        type="submit"
                        className="flex h-full w-full items-center justify-between gap-3 rounded-xl border border-border bg-slate-50 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                      >
                        <span>
                          <span className="block text-sm font-black text-primary">
                            {template.label}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted">
                            {template.description}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-black text-foreground">
                          {formatMoney(template.unitPrice)}
                        </span>
                      </button>
                    </form>
                  ))}
                </div>
              </details>
            ) : null}

            {invoice.notes ? (
              <div className="border-t border-border px-5 py-5 print:hidden sm:px-7">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Internal notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                  {invoice.notes}
                </p>
              </div>
            ) : null}

            <details
              id="internal-parts"
              open={invoiceParts.length > 0 || openPartsCount > 0}
              className="scroll-mt-6 border-t border-border px-5 py-5 print:hidden sm:px-7"
            >
              <summary className="flex cursor-pointer list-none flex-col gap-2 rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-primary/5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Internal parts
                  </p>
                  <h2 className="mt-1 text-xl font-black text-primary">Parts needed for this job</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Track ordered parts, supplier cost, and expenses here. This does not change the
                    customer invoice total unless you also add a customer charge above.
                  </p>
                </div>
                <span className="w-fit rounded-full border border-amber-500/25 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  {openPartsCount} open
                </span>
              </summary>

              {!partsReady ? (
                <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <p className="font-black">Parts table is not ready.</p>
                  <p className="mt-1">
                    Run this SQL in Supabase once, then refresh this invoice.
                  </p>
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-white p-3 text-xs text-foreground">
                    {invoicePartsTableSql}
                  </pre>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-border bg-slate-50 p-4">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
                        Known parts cost
                      </p>
                      <p className="mt-2 text-2xl font-black text-primary">{formatMoney(knownPartsCost)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-slate-50 p-4">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
                        Added to expenses
                      </p>
                      <p className="mt-2 text-2xl font-black text-primary">{formatMoney(expensedPartsCost)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-slate-50 p-4">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
                        Not expensed
                      </p>
                      <p className="mt-2 text-2xl font-black text-primary">{formatMoney(unexpensedPartsCost)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-slate-50 p-4">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
                        Customer parts charge
                      </p>
                      <p className="mt-2 text-2xl font-black text-primary">{formatMoney(customerPartsCharge)}</p>
                    </div>
                  </div>

                  {invoiceParts.length ? (
                    <div className="mt-5 grid gap-3">
                      {invoiceParts.map((part) => {
                        const partCost = Number(part.cost ?? 0);
                        const canAddPartExpense =
                          Number.isFinite(partCost) && partCost > 0 && !part.expense_id;

                        return (
                        <form
                          key={part.id}
                          action={updateInvoicePartAction}
                          className="rounded-xl border border-border bg-slate-50 p-4"
                        >
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <input type="hidden" name="partId" value={part.id} />
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                                Part name
                                <input
                                  type="text"
                                  name="partName"
                                  defaultValue={part.part_name}
                                  required
                                  className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                                Status
                                <select
                                  name="status"
                                  defaultValue={part.status}
                                  className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                >
                                  {PART_STATUSES.map((status) => (
                                    <option key={status.value} value={status.value}>
                                      {status.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                                Part number
                                <input
                                  type="text"
                                  name="partNumber"
                                  defaultValue={part.part_number ?? ""}
                                  className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                                Supplier
                                <input
                                  type="text"
                                  name="supplier"
                                  defaultValue={part.supplier ?? ""}
                                  className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                                Qty
                                <input
                                  type="number"
                                  name="quantity"
                                  min="0.01"
                                  step="0.01"
                                  defaultValue={formatQuantity(part.quantity)}
                                  className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                                Cost
                                <input
                                  type="number"
                                  name="cost"
                                  min="0"
                                  step="0.01"
                                  defaultValue={formatInputMoney(part.cost)}
                                  className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted sm:col-span-2">
                                Note
                                <input
                                  type="text"
                                  name="note"
                                  defaultValue={part.note ?? ""}
                                  placeholder="Order note, ETA, return reason..."
                                  className="min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                                />
                              </label>
                            </div>
                            <span
                              className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-bold capitalize ${partStatusClasses[part.status]}`}
                            >
                              {part.status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="submit"
                              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                            >
                              Save part
                            </button>
                            <button
                              form={`delete-part-${part.id}`}
                              type="submit"
                              className="rounded-lg border border-red-500/25 bg-white px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                            {part.expense_id ? (
                              <>
                                <span className="rounded-lg border border-emerald-500/25 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                                  Expensed{part.expensed_at ? ` ${formatDate(part.expensed_at)}` : ""}
                                </span>
                                <Link
                                  href={getAccountingExpenseHref(part.expense_id, part.expensed_at)}
                                  className="rounded-lg border border-primary/15 bg-white px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                                >
                                  Open expense
                                </Link>
                              </>
                            ) : canAddPartExpense ? (
                              <>
                                <span className="rounded-lg border border-amber-500/25 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
                                  Not expensed
                                </span>
                                <select
                                  name="paymentMethod"
                                  form={`expense-part-${part.id}`}
                                  defaultValue="Cash"
                                  className="rounded-lg border border-emerald-500/25 bg-white px-3 py-2 text-xs font-bold text-emerald-700 outline-none ring-emerald-500/20 focus:border-emerald-500 focus:ring-2"
                                >
                                  {PART_EXPENSE_PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>
                                      {method}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  form={`expense-part-${part.id}`}
                                  type="submit"
                                  className="rounded-lg border border-emerald-500/25 bg-white px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
                                >
                                  Add to expenses
                                </button>
                              </>
                            ) : (
                              <span className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-bold text-muted">
                                Not expensed / add cost first
                              </span>
                            )}
                          </div>
                        </form>
                        );
                      })}
                      {invoiceParts.map((part) => (
                        <div key={`part-actions-${part.id}`} className="hidden">
                          <form id={`delete-part-${part.id}`} action={deleteInvoicePartAction}>
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <input type="hidden" name="partId" value={part.id} />
                          </form>
                          <form id={`expense-part-${part.id}`} action={addInvoicePartExpenseAction}>
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <input type="hidden" name="partId" value={part.id} />
                          </form>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                      No parts are attached to this job yet.
                    </p>
                  )}

                  <form action={addInvoicePartAction} className="mt-5 rounded-xl border border-border bg-white p-4">
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      Add part
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <input
                        type="text"
                        name="partName"
                        placeholder="Part name"
                        required
                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                      />
                      <input
                        type="text"
                        name="partNumber"
                        placeholder="Part number"
                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                      />
                      <input
                        type="text"
                        name="supplier"
                        placeholder="Supplier"
                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                      />
                      <select
                        name="status"
                        defaultValue="needed"
                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                      >
                        {PART_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        name="quantity"
                        min="0.01"
                        step="0.01"
                        defaultValue="1"
                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                      />
                      <input
                        type="number"
                        name="cost"
                        min="0"
                        step="0.01"
                        placeholder="Cost"
                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                      />
                      <input
                        type="text"
                        name="note"
                        placeholder="Note"
                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2 lg:col-span-2"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                      >
                        Add part
                      </button>
                    </div>
                  </form>
                </>
              )}
            </details>
          </article>

          <div className="print:hidden">
            <CustomerHistoryCard items={customerHistory} />
          </div>
          </div>

          <aside className="self-start rounded-2xl border border-border bg-white p-5 shadow-sm print:hidden xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Invoice controls
            </p>
            <div className={`mt-4 rounded-xl border p-4 ${nextAction.className}`}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">
                Next action
              </p>
              <h2 className="mt-1 text-xl font-black">{nextAction.title}</h2>
              <p className="mt-2 text-sm leading-6">{nextAction.body}</p>
              <a
                href={nextAction.href}
                className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-slate-50"
              >
                {nextAction.cta}
              </a>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Technician workflow
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Field checklist before closing this job.
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                    isJobDone
                      ? "border-emerald-500/25 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 bg-slate-50 text-slate-600"
                  }`}
                >
                  {isJobDone ? "Done" : "Open"}
                </span>
              </div>

              <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
                <div className="grid gap-3 bg-slate-50 px-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="whitespace-nowrap font-bold text-foreground">Charges</p>
                    <p className="text-xs leading-5 text-muted">
                      Customer-facing service lines and prices.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getWorkflowStatusClass(
                        hasCustomerChargeAmount,
                      )}`}
                    >
                      {hasCustomerChargeAmount ? "Ready" : "Needs price"}
                    </span>
                    <a
                      href="#invoice-line-items"
                      className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                    >
                      Edit
                    </a>
                  </div>
                </div>

                <div className="grid gap-3 px-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">Tech report</p>
                    <p className="text-xs leading-5 text-muted">
                      Field notes, unit photos, model, and parts proof.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getWorkflowStatusClass(
                        hasTechnicianReport && hasTechnicianReportPhoto,
                      )}`}
                    >
                      {hasTechnicianReportPhoto ? "With photo" : hasTechnicianReport ? "Need photo" : "Missing"}
                    </span>
                    <Link
                      href={technicianReportHref}
                      className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                    >
                      Report
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 bg-slate-50 px-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="whitespace-nowrap font-bold text-foreground">Signature</p>
                    <p className="text-xs leading-5 text-muted">
                      Customer accepts the invoice and service terms.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getWorkflowStatusClass(
                        Boolean(signature),
                      )}`}
                    >
                      {signature ? "Signed" : "Missing"}
                    </span>
                    <Link
                      href={signatureHref}
                      className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                    >
                      {signature ? "Open" : "Get signature"}
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 px-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="whitespace-nowrap font-bold text-foreground">Send invoice</p>
                    <p className="text-xs leading-5 text-muted">
                      Email or SMS was sent from this invoice.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getWorkflowStatusClass(
                        hasInvoiceBeenSent,
                      )}`}
                    >
                      {hasInvoiceBeenSent ? "Sent" : "Not sent"}
                    </span>
                    <a
                      href="#invoice-controls"
                      className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                    >
                      Send
                    </a>
                  </div>
                </div>

                <div className="grid gap-3 bg-slate-50 px-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="whitespace-nowrap font-bold text-foreground">Payment / close</p>
                    <p className="text-xs leading-5 text-muted">
                      Balance collected, then job can be completed.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getWorkflowStatusClass(
                        isBalanceCollected,
                      )}`}
                    >
                      {isBalanceCollected ? "Paid" : "Due"}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getWorkflowStatusClass(
                        isJobDone,
                      )}`}
                    >
                      {isJobDone ? "Closed" : "Open"}
                    </span>
                    {isBalanceCollected && !isJobDone ? (
                      <a
                        href="#invoice-controls"
                        className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                      >
                        Close
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Job profit
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Customer total</span>
                  <span className="font-bold text-foreground">{formatMoney(invoice.total)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Collected</span>
                  <span className="font-bold text-emerald-700">{formatMoney(paidAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Known parts cost</span>
                  <span className="font-bold text-red-700">-{formatMoney(knownPartsCost)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Not expensed yet</span>
                  <span className="font-bold text-amber-700">{formatMoney(unexpensedPartsCost)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-lg">
                  <span className="font-black text-primary">Estimated profit</span>
                  <span className={`font-black ${estimatedJobProfit >= 0 ? "text-primary" : "text-red-700"}`}>
                    {formatMoney(estimatedJobProfit)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                Estimate uses collected payments minus known parts cost. Labor, gas, ads, and other expenses
                still live in accounting.
              </p>
            </div>

            <div className="mt-4">
              <Link
                href={`/admin/invoices/${invoice.id}/pdf`}
                className="inline-flex w-full justify-center rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                Download PDF
              </Link>
              <p className="mt-2 text-xs leading-5 text-muted">
                Generates a clean invoice PDF directly from CRM data.
              </p>
            </div>
            <div className="mt-3">
              <Link
                href={signatureHref}
                className={`inline-flex w-full justify-center rounded-lg px-3 py-3 text-xs font-bold transition ${
                  signature
                    ? "border border-emerald-500/25 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : "border border-primary/15 bg-white text-primary hover:bg-primary/5"
                }`}
              >
                {signature ? "Update customer signature" : "Get customer signature"}
              </Link>
              <p className="mt-2 text-xs leading-5 text-muted">
                Opens a customer-friendly signing page. Signature does not change payment or invoice
                status.
              </p>
            </div>
            <div id="invoice-controls" className="scroll-mt-24">
              {permissions.canSendInvoices ? (
                <>
                  <form action={sendInvoiceEmailAction} className="mt-3">
                    <input type="hidden" name="id" value={invoice.id} />
                    <InvoiceEmailSubmitButton
                      disabled={!customerEmail}
                      invoiceStatus={invoice.status}
                      invoiceTotal={invoice.total}
                      label={invoice.status === "sent" ? "Re-send invoice email" : "Send invoice email"}
                      recipient={customerEmail || ""}
                    />
                    {!customerEmail ? (
                      <p className="mt-2 text-xs leading-5 text-muted">
                        Customer email is missing, so this invoice cannot be sent yet.
                      </p>
                    ) : null}
                  </form>
                  <form action={`/admin/invoices/${invoice.id}/sms`} method="post" className="mt-3">
                    <InvoiceSmsSubmitButton
                      disabled={!invoice.customer_phone}
                      invoiceStatus={invoice.status}
                      invoiceTotal={invoice.total}
                      label={invoice.status === "sent" ? "Re-send invoice SMS" : "Send invoice by SMS"}
                      recipient={invoice.customer_phone || ""}
                    />
                    {!invoice.customer_phone ? (
                      <p className="mt-2 text-xs leading-5 text-muted">
                        Customer phone is missing, so this invoice cannot be sent by SMS yet.
                      </p>
                    ) : null}
                  </form>
                </>
              ) : (
                <form
                  action={requestInvoiceSendAction}
                  className="mt-3 rounded-xl border border-amber-500/25 bg-amber-50 p-3"
                >
                  <input type="hidden" name="id" value={invoice.id} />
                  <p className="text-xs font-bold leading-5 text-amber-900">
                    Customer sending is handled by the office after review.
                  </p>
                  <button
                    type="submit"
                    className="mt-3 w-full rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Ready to send
                  </button>
                </form>
              )}
            </div>
            {amountDue <= 0 && invoice.status !== "paid" && invoice.status !== "void" ? (
              <form action={markInvoiceCompletedAction} className="mt-3">
                <input type="hidden" name="id" value={invoice.id} />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 px-3 py-3 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  Mark job completed
                </button>
              </form>
            ) : null}
            <form action={updateInvoiceStatusAction} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={invoice.id} />
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Status
                <select
                  name="status"
                  defaultValue={invoice.status}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                >
                  {availableInvoiceStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                {amountDue > 0 ? (
                  <span className="text-[0.7rem] font-semibold normal-case tracking-normal text-muted">
                    Record enough payments to make the invoice paid automatically.
                  </span>
                ) : null}
              </label>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                Save invoice status
              </button>
            </form>

            <form action={updateInvoiceScheduleAction} className="mt-5 grid gap-3 border-t border-border pt-5">
              <input type="hidden" name="id" value={invoice.id} />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Visit schedule
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Use this to place the customer on the dispatch calendar.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={scheduleHref}
                    className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                  >
                    Open schedule
                  </Link>
                  <Link
                    href={technicianDayHref}
                    className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                  >
                    Technician day
                  </Link>
                </div>
              </div>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Visit date
                <input
                  type="date"
                  name="serviceDate"
                  defaultValue={invoice.service_date ?? ""}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Exact time
                <input
                  type="time"
                  name="serviceTime"
                  defaultValue={invoice.service_time ?? ""}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Time window
                <select
                  name="serviceWindow"
                  defaultValue={invoice.service_window ?? ""}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                >
                  <option value="">Not selected</option>
                  {SERVICE_WINDOWS.map((window) => (
                    <option key={window} value={window}>
                      {window}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Technician
                <TechnicianSelect
                  name="assignedTechnician"
                  technicians={technicians}
                  defaultValue={invoice.assigned_technician ?? ""}
                  placeholder="Name"
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                Save visit schedule
              </button>
            </form>

            <div className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-bold text-foreground">{formatMoney(invoice.subtotal)}</span>
              </div>
              {hasDiscount ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted">{discountLabel}</span>
                  <span className="font-bold text-accent">-{formatMoney(discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-muted">Tax</span>
                <span className="font-bold text-foreground">{formatMoney(invoice.tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-lg">
                <span className="font-black text-primary">Total</span>
                <span className="font-black text-primary">{formatMoney(invoice.total)}</span>
              </div>
              {paidAmount > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted">Payments received</span>
                  <span className="font-bold text-emerald-700">{formatMoney(paidAmount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-border pt-3 text-lg">
                <span className="font-black text-primary">Amount due</span>
                <span className="font-black text-primary">{formatMoney(amountDue)}</span>
              </div>
              {pendingCheckAmount > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted">Checks pending</span>
                  <span className="font-bold text-amber-700">{formatMoney(pendingCheckAmount)}</span>
                </div>
              ) : null}
            </div>

            <details
              id="check-deposits"
              open={openChecks.length > 0}
              className="mt-6 scroll-mt-6 border-t border-border pt-5"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 transition hover:bg-primary/5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Check deposits
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Increase-ready tracking for paper checks before they become invoice payments.
                  </p>
                </div>
                {openChecks.length ? (
                  <span className="rounded-full border border-amber-500/25 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {openChecks.length} pending
                  </span>
                ) : null}
              </summary>

              {!checksReady ? (
                <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                  <p className="font-black">Checks table is not ready yet</p>
                  <p className="mt-1">
                    Run this SQL in Supabase SQL Editor to enable check tracking.
                  </p>
                  <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-white p-3 text-[0.7rem] text-foreground">
                    {invoiceChecksTableSql}
                  </pre>
                </div>
              ) : (
                <>
                  <details className="mt-4 rounded-xl border border-border bg-slate-50 p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg bg-white px-3 py-3 text-sm font-black text-primary transition hover:bg-primary/5">
                      <span>Add / receive check</span>
                      <span className="rounded-full border border-primary/15 px-3 py-1 text-xs">
                        {pendingCheckAmount > 0 ? `${formatMoney(pendingCheckAmount)} pending` : "Open form"}
                      </span>
                    </summary>
                    <form action={addInvoiceCheckAction} className="mt-4 grid gap-3">
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Amount
                          <input
                            type="number"
                            name="amount"
                            min="0.01"
                            step="0.01"
                            defaultValue={amountDue > 0 ? formatInputMoney(amountDue) : ""}
                            required
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Received date
                          <input
                            type="date"
                            name="receivedAt"
                            defaultValue={paymentInputDefaults.date}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                          />
                        </label>
                      </div>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        Check number
                        <input
                          type="text"
                          name="checkNumber"
                          placeholder="Optional"
                          className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Payer name
                          <input
                            type="text"
                            name="payerName"
                            defaultValue={invoice.customer_name}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Payer bank
                          <input
                            type="text"
                            name="payerBank"
                            placeholder="Optional"
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                          />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Front image URL
                          <input
                            type="url"
                            name="frontImageUrl"
                            placeholder="Increase/Supabase image URL"
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                          Back image URL
                          <input
                            type="url"
                            name="backImageUrl"
                            placeholder="Increase/Supabase image URL"
                            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                          />
                        </label>
                      </div>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        Note
                        <input
                          type="text"
                          name="note"
                          placeholder="Memo, approval, or deposit note"
                          className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                      >
                        Receive check
                      </button>
                    </form>
                  </details>

                  {invoiceChecks.length ? (
                    <ul className="mt-5 space-y-3">
                      {invoiceChecks.map((check) => (
                        <li
                          id={`check-${check.id}`}
                          key={check.id}
                          className="scroll-mt-6 rounded-xl border border-border bg-slate-50 p-3 text-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-black text-primary">{formatMoney(check.amount)}</p>
                              <p className="mt-1 text-xs font-semibold text-muted">
                                {check.check_number ? `Check #${check.check_number} / ` : ""}
                                {formatDate(check.received_at)}
                              </p>
                              <p className="mt-1 break-words text-xs leading-5 text-muted">
                                {[check.payer_name, check.payer_bank, check.increase_status]
                                  .filter(Boolean)
                                  .join(" / ") || "No payer details"}
                              </p>
                              {check.note ? (
                                <p className="mt-2 break-words text-xs leading-5 text-muted">{check.note}</p>
                              ) : null}
                              {check.payment_id ? (
                                <span className="mt-2 inline-flex rounded-full border border-emerald-500/25 bg-white px-2 py-1 text-[0.65rem] font-bold text-emerald-700">
                                  Payment linked
                                </span>
                              ) : null}
                            </div>
                            <div className="grid min-w-[150px] gap-2">
                              <span
                                className={`rounded-full border px-3 py-1 text-center text-xs font-bold ${
                                  checkStatusClasses[check.status]
                                }`}
                              >
                                {CHECK_STATUSES.find((status) => status.value === check.status)?.label ?? check.status}
                              </span>
                              <form action={updateInvoiceCheckStatusAction} className="grid gap-2">
                                <input type="hidden" name="invoiceId" value={invoice.id} />
                                <input type="hidden" name="checkId" value={check.id} />
                                <select
                                  name="status"
                                  defaultValue={check.status}
                                  className="rounded-lg border border-border bg-white px-2 py-2 text-xs font-bold text-primary outline-none ring-primary/30 focus:border-primary focus:ring-2"
                                >
                                  {CHECK_STATUSES.map((status) => (
                                    <option key={status.value} value={status.value}>
                                      {status.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="submit"
                                  className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/5"
                                >
                                  Save status
                                </button>
                              </form>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                      No checks recorded for this invoice yet.
                    </p>
                  )}
                </>
              )}
            </details>

            <div id="payment-history" className="mt-6 scroll-mt-6 border-t border-border pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Payment History
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Record manual cash, card, check, or transfer payments.
                  </p>
                </div>
                {amountDue <= 0 && paidAmount > 0 ? (
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Paid
                  </span>
                ) : null}
              </div>

              <form action={addInvoicePaymentAction} className="mt-4 grid gap-3">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Amount
                    <input
                      type="number"
                      name="amount"
                      min="0.01"
                      step="0.01"
                      defaultValue={amountDue > 0 ? formatInputMoney(amountDue) : ""}
                      placeholder="0.00"
                      required
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Method
                    <select
                      name="method"
                      defaultValue="cash"
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                    >
                      <option value="cash">Cash</option>
                      <option value="zelle">Zelle</option>
                      <option value="card">Card</option>
                      <option value="check">Check</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Payment date
                    <input
                      type="date"
                      name="paymentDate"
                      defaultValue={paymentInputDefaults.date}
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Payment time
                    <input
                      type="time"
                      name="paymentTime"
                      defaultValue={paymentInputDefaults.time}
                      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                    />
                  </label>
                </div>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Note
                  <input
                    type="text"
                    name="note"
                    placeholder="Optional note"
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  Add payment
                </button>
              </form>

              {hasPayments ? (
                <ul className="mt-5 space-y-3">
                  {payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="rounded-xl border border-border bg-slate-50 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-primary">{formatMoney(payment.amount)}</p>
                          <p className="mt-1 text-xs font-semibold text-muted">
                            {formatPaymentMethod(payment.method)} ·{" "}
                            {formatShortDateTime(payment.payment_date)} ET
                          </p>
                          {payment.note ? (
                            <p className="mt-2 text-xs leading-5 text-muted">{payment.note}</p>
                          ) : null}
                        </div>
                        {permissions.canDeleteInvoicePayments ? (
                          <form action={deleteInvoicePaymentAction}>
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <input type="hidden" name="paymentId" value={payment.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-accent/20 bg-white px-3 py-2 text-xs font-bold text-accent transition hover:bg-accent/5"
                            >
                              Delete
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted">
                  No payments recorded yet.
                </p>
              )}
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-muted">
              Email sends the current invoice details to the customer through Resend.
              Draft invoices are automatically marked as sent after successful delivery. Paid status is
              handled by the payment history once the amount due reaches zero.
            </div>

            <details className="mt-6 border-t border-border pt-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 transition hover:bg-primary/5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Activity
                </span>
                <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-bold text-muted">
                  {activity.length} records
                </span>
              </summary>
              {activity.length > 0 ? (
                <ul className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-2">
                  {activity.map((item) => {
                    const actorName = getActivityActorName(item);

                    return (
                      <li key={item.id} className="flex gap-3 text-sm leading-5">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                        <span>
                          <span className="block font-bold text-foreground">{item.title}</span>
                          {item.details ? (
                            <span className="block text-muted">{item.details}</span>
                          ) : null}
                          <span className="mt-1 block text-xs font-semibold text-muted">
                            {formatDateTime(item.created_at)} ET
                            {actorName ? ` by ${actorName}` : ""}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted">
                  No invoice activity recorded yet.
                </p>
              )}
            </details>
          </aside>
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 p-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur print:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-6 gap-1.5 sm:gap-2">
          <a
            href="#invoice-line-items"
            className="rounded-xl border border-primary/15 bg-white px-2 py-3 text-center text-[0.7rem] font-black text-primary transition hover:bg-primary/5 sm:text-xs"
          >
            Charges
          </a>
          <a
            href="#internal-parts"
            className="rounded-xl border border-primary/15 bg-white px-2 py-3 text-center text-[0.7rem] font-black text-primary transition hover:bg-primary/5 sm:text-xs"
          >
            Parts
          </a>
          <Link
            href={technicianReportHref}
            className="rounded-xl border border-primary/15 bg-white px-2 py-3 text-center text-[0.7rem] font-black text-primary transition hover:bg-primary/5 sm:text-xs"
          >
            Report
          </Link>
          <Link
            href={signatureHref}
            className="rounded-xl border border-primary/15 bg-white px-2 py-3 text-center text-[0.7rem] font-black text-primary transition hover:bg-primary/5 sm:text-xs"
          >
            Sign
          </Link>
          <a
            href="#invoice-controls"
            className="rounded-xl bg-primary px-2 py-3 text-center text-[0.7rem] font-black text-primary-foreground transition hover:bg-primary/90 sm:text-xs"
          >
            Send
          </a>
          <a
            href="#payment-history"
            className="rounded-xl border border-primary/15 bg-white px-2 py-3 text-center text-[0.7rem] font-black text-primary transition hover:bg-primary/5 sm:text-xs"
          >
            Pay
          </a>
        </div>
      </nav>
    </main>
  );
}
