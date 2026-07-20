import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerHistoryCard } from "@/components/admin/customer-history-card";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { listCustomerHistory } from "@/lib/customer-history";
import { CHARLOTTE_TIME_ZONE, getDateForCharlotteDisplay } from "@/lib/date-format";
import { getActivityActorName, listActivitiesForInvoice } from "@/lib/supabase-activity";
import { getSupabaseLeadById } from "@/lib/supabase-leads";
import {
  INVOICE_ITEM_TEMPLATES,
  type InvoiceItemRecord,
  type InvoiceRecord,
  type InvoiceStatus,
  calculateInvoiceAmountDue,
  calculateInvoicePaidAmount,
  getInvoiceById,
} from "@/lib/supabase-invoices";
import {
  addInvoiceItemAction,
  addInvoicePartExpenseAction,
  addInvoicePartAction,
  addInvoicePaymentAction,
  addInvoiceTemplateItemAction,
  applyServiceCallDiscountAction,
  deleteInvoiceItemAction,
  deleteInvoicePartAction,
  deleteInvoicePaymentAction,
  markInvoiceCompletedAction,
  sendInvoiceEmailAction,
  sendInvoiceSmsAction,
  updateInvoiceItemsAction,
  updateInvoicePartAction,
  updateInvoiceScheduleAction,
  updateInvoiceStatusAction,
} from "./actions";
import { PrintButton } from "./print-button";
import {
  invoicePartsTableSql,
  listInvoiceParts,
  type InvoicePartStatus,
} from "@/lib/supabase-parts";

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

function getLineTotal(item: InvoiceItemRecord) {
  return formatMoney(Number(item.quantity ?? 0) * Number(item.unit_price ?? 0));
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

function isPlaceholderCustomerEmail(value: string | null | undefined) {
  return Boolean(value?.trim().toLowerCase().endsWith("@daplappliance.local"));
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
      body: "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in Vercel before sending invoice SMS.",
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

  if (status === "service_call_discount_added") {
    return {
      className: "border-emerald-500/20 bg-emerald-50 text-emerald-800",
      title: "Service call discount applied",
      body: "The service call amount was added as an invoice discount.",
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

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  const { invoiceId } = await params;
  const query = await searchParams;
  const invoiceData = await getInvoiceById(invoiceId);

  if (!invoiceData) {
    notFound();
  }

  const { invoice, items, payments } = invoiceData;
  const customerEmail = isPlaceholderCustomerEmail(invoice.customer_email)
    ? null
    : invoice.customer_email;
  const [activity, customerHistory, invoiceLead, partsData] = await Promise.all([
    listActivitiesForInvoice(invoice.id, 8),
    listCustomerHistory({
      phone: invoice.customer_phone,
      email: customerEmail,
      excludeInvoiceId: invoice.id,
    }),
    invoice.lead_id ? getSupabaseLeadById(invoice.lead_id) : Promise.resolve(null),
    listInvoiceParts(invoice.id),
  ]);
  const invoiceParts = partsData.parts;
  const partsReady = partsData.ready;
  const openPartsCount = invoiceParts.filter(
    (part) => part.status !== "installed" && part.status !== "returned" && part.status !== "canceled",
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
  const hasPayments = payments.length > 0;
  const isInvoiceClosed = CLOSED_INVOICE_STATUSES.has(invoice.status);
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
  const availableInvoiceStatuses = INVOICE_STATUSES.filter(
    (status) =>
      (status.value !== "paid" || invoice.status === "paid" || amountDue <= 0) &&
      (permissions.canVoidInvoices || status.value !== "void" || invoice.status === "void"),
  );

  return (
    <main className="min-h-screen bg-background text-foreground print:bg-white print:text-slate-950">
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

        <div className="grid gap-6 print:block xl:grid-cols-[minmax(0,1fr)_360px]">
          <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
            <div className="border-b border-border bg-slate-50/80 px-5 py-5 print:bg-white print:px-0 sm:px-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <Image
                    src="/logo.jpg"
                    alt="DAPL Appliance Repair logo"
                    width={76}
                    height={76}
                    className="h-16 w-16 object-contain print:h-16 print:w-16"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/70 print:text-[11px]">
                      DAPL Appliance Repair
                    </p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-muted print:text-xs print:leading-5">
                      9401 Peckham Rye Rd, Charlotte, NC 28227
                    </p>
                    <a
                      href={`mailto:${BUSINESS_EMAIL}`}
                      className="mt-1 block max-w-sm break-words text-sm leading-6 text-muted hover:text-primary print:text-xs print:leading-5 print:text-slate-700"
                    >
                      {BUSINESS_EMAIL}
                    </a>
                    <p className="mt-2 max-w-sm text-xs leading-5 text-muted print:mt-1.5 print:text-[11px] print:leading-5">
                      DAPL Appliance Repair is operated by DAPL Honcharos Appliance Service Corp.
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Invoice
                  </p>
                  <p className="mt-1 text-xl font-black text-primary print:whitespace-nowrap print:text-xl">
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

            <div className="grid gap-5 border-b border-border px-5 py-5 print:px-0 sm:grid-cols-2 sm:px-7">
              <section>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Bill to
                </p>
                <p className="mt-3 text-xl font-black text-primary">{invoice.customer_name}</p>
                {invoice.customer_phone ? (
                  <a
                    href={`tel:${invoice.customer_phone}`}
                    className="mt-2 block font-semibold text-foreground hover:text-primary"
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

              <section className="grid gap-4 text-sm leading-6 text-muted sm:grid-cols-2">
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
              <section className="px-5 py-5 print:hidden sm:px-7">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      Line items
                    </p>
                    <h2 className="mt-1 text-xl font-black text-primary">
                      Services and charges
                    </h2>
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
              <form action={updateInvoiceItemsAction} className="px-5 py-5 print:hidden sm:px-7">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      Line items
                    </p>
                    <h2 className="mt-1 text-xl font-black text-primary">
                      Services and charges
                    </h2>
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

            <div className="hidden px-5 py-6 print:block print:px-0 print:py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted print:text-[10px]">
                Line items
              </p>
              <h2 className="mt-1 text-xl font-black text-primary print:text-base">
                Services and charges
              </h2>

              <table className="mt-5 w-full border-collapse text-sm print:mt-3 print:text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    <th className="py-3 pr-4 print:py-1.5">Description</th>
                    <th className="py-3 pr-4 text-right print:py-1.5">Qty</th>
                    <th className="py-3 pr-4 text-right print:py-1.5">Unit</th>
                    <th className="py-3 text-right print:py-1.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="py-3 pr-4 font-semibold text-foreground print:py-1.5">
                        {item.description}
                      </td>
                      <td className="py-3 pr-4 text-right text-muted print:py-1.5">
                        {formatQuantity(item.quantity)}
                      </td>
                      <td className="py-3 pr-4 text-right text-muted print:py-1.5">
                        {formatMoney(item.unit_price)}
                      </td>
                      <td className="py-3 text-right font-bold text-foreground print:py-1.5">
                        {getLineTotal(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm print:mt-4 print:max-w-[16rem] print:space-y-1.5 print:text-xs">
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
                <div className="flex items-center justify-between border-t border-border pt-3 text-lg print:pt-2 print:text-sm">
                  <span className="font-black text-primary">Total</span>
                  <span className="font-black text-primary">{formatMoney(invoice.total)}</span>
                </div>
                {paidAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Payments received</span>
                    <span className="font-bold text-emerald-700">{formatMoney(paidAmount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-border pt-3 text-lg print:pt-2 print:text-sm">
                  <span className="font-black text-primary">Amount due</span>
                  <span className="font-black text-primary">{formatMoney(amountDue)}</span>
                </div>
              </div>

              {hasPayments ? (
                <div className="mt-8 print:mt-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted print:text-[9px]">
                    Payment History
                  </p>
                  <table className="mt-3 w-full border-collapse text-sm print:mt-1 print:text-[10px]">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        <th className="py-3 pr-4 print:py-1.5">Date</th>
                        <th className="py-3 pr-4 print:py-1.5">Method</th>
                        <th className="py-3 text-right print:py-1.5">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-border">
                          <td className="py-3 pr-4 text-muted print:py-1.5">
                            {formatShortDateTime(payment.payment_date)} ET
                          </td>
                          <td className="py-3 pr-4 text-foreground print:py-1.5">
                            {formatPaymentMethod(payment.method)}
                            {payment.note ? (
                              <span className="mt-1 block text-xs text-muted">{payment.note}</span>
                            ) : null}
                          </td>
                          <td className="py-3 text-right font-bold text-foreground print:py-1.5">
                            {formatMoney(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            <section className="border-t border-border px-5 py-5 print:px-0 print:py-4 sm:px-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted print:text-[11px]">
                Terms and warranty
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-muted print:mt-2.5 print:grid print:grid-cols-2 print:gap-x-7 print:gap-y-2 print:space-y-0 print:text-[11px] print:leading-5">
                {INVOICE_TERMS.map((term) => (
                  <p key={term}>{term}</p>
                ))}
                <p className="print:col-span-2">
                  <span className="font-bold text-foreground">Note:</span> {INVOICE_TAX_NOTE}
                </p>
              </div>
            </section>

            {canManageInvoiceCharges ? (
              <section className="border-t border-border px-5 py-5 print:hidden sm:px-7">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      Quick templates
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Add a common charge, then edit the description or price above if needed.
                    </p>
                  </div>
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

                <form action={applyServiceCallDiscountAction} className="mt-4">
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-left text-sm transition hover:bg-accent/10"
                  >
                    <span className="block font-black text-accent">
                      Apply service call discount
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted">
                      Waives the $89 service call when the repair is approved.
                    </span>
                  </button>
                </form>

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
              </section>
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

            <section className="border-t border-border px-5 py-5 print:hidden sm:px-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Parts
                  </p>
                  <h2 className="mt-1 text-xl font-black text-primary">Parts needed for this job</h2>
                </div>
                <span className="w-fit rounded-full border border-amber-500/25 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  {openPartsCount} open
                </span>
              </div>

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
                              <span className="rounded-lg border border-emerald-500/25 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                                Expensed
                              </span>
                            ) : canAddPartExpense ? (
                              <button
                                form={`expense-part-${part.id}`}
                                type="submit"
                                className="rounded-lg border border-emerald-500/25 bg-white px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
                              >
                                Add to expenses
                              </button>
                            ) : (
                              <span className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-bold text-muted">
                                Add cost first
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
            </section>
          </article>

          <aside className="self-start rounded-2xl border border-border bg-white p-5 shadow-sm print:hidden">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Invoice controls
            </p>
            <div className="mt-4">
              <PrintButton />
              <p className="mt-2 text-xs leading-5 text-muted">
                For a clean invoice PDF, turn off browser headers and footers in the print
                dialog. Browser headers use your computer date format and cannot be changed by
                the site.
              </p>
            </div>
            <form action={sendInvoiceEmailAction} className="mt-3">
              <input type="hidden" name="id" value={invoice.id} />
              <button
                type="submit"
                disabled={!customerEmail}
                className="w-full rounded-lg bg-accent px-3 py-3 text-xs font-bold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {invoice.status === "sent" ? "Re-send invoice email" : "Send invoice email"}
              </button>
              {!customerEmail ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  Customer email is missing, so this invoice cannot be sent yet.
                </p>
              ) : null}
            </form>
            <form action={sendInvoiceSmsAction} className="mt-3">
              <input type="hidden" name="id" value={invoice.id} />
              <button
                type="submit"
                disabled={!invoice.customer_phone}
                className="w-full rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {invoice.status === "sent" ? "Re-send invoice SMS" : "Send invoice by SMS"}
              </button>
              {!invoice.customer_phone ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  Customer phone is missing, so this invoice cannot be sent by SMS yet.
                </p>
              ) : null}
            </form>
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
                <input
                  type="text"
                  name="assignedTechnician"
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
            </div>

            <div className="mt-6 border-t border-border pt-5">
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

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Activity
              </p>
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
            </div>
          </aside>
        </div>

        <div className="mt-6 print:hidden">
          <CustomerHistoryCard items={customerHistory} />
        </div>
      </section>
    </main>
  );
}
