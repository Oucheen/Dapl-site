import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createLeadActivity } from "@/lib/supabase-activity";
import {
  findSupabaseLeadByHousecallProLeadId,
  findSupabaseLeadByHousecallProJobId,
  findRecentLeadBySourcePhone,
  findRecentLeadBySourceReference,
  getSupabaseLeadById,
  saveLeadToSupabase,
  updateSupabaseLead,
} from "@/lib/supabase-leads";
import { buildUnifiedTelegramLeadMessage } from "@/lib/telegram-lead-message";
import {
  getPipelineConfigStatus,
  getPipelineLeadUrl,
  sendPipelineTelegramMessage,
} from "@/lib/telegram-pipeline";

export const runtime = "nodejs";

const HCP_LEAD_SOURCE = "Housecall Pro";
const HCP_EVENTS = new Set([
  "lead.created",
  "lead.updated",
  "lead.converted",
  "lead.deleted",
  "lead.lost",
  "estimate.canceled",
  "estimate.completed",
  "estimate.copy_to_job",
  "estimate.created",
  "estimate.deleted",
  "estimate.on_my_way",
  "estimate.option.approval_status_changed",
  "estimate.option.canceled",
  "estimate.option.created",
  "estimate.option.deleted",
  "estimate.scheduled",
  "estimate.sent",
  "estimate.updated",
  "invoice.amount_updated",
  "invoice.canceled",
  "invoice.created",
  "invoice.paid",
  "invoice.payment.failed",
  "invoice.payment.succeeded",
  "invoice.refund.succeeded",
  "invoice.sent",
  "invoice.voided",
  "job.created",
  "job.updated",
  "job.deleted",
  "job.canceled",
  "job.scheduled",
  "job.completed",
  "job.started",
  "job.on_my_way",
  "job.paid",
  "job.appointment.appointment_discarded",
  "job.appointment.appointment_pros_assigned",
  "job.appointment.appointment_pros_unassigned",
  "job.appointment.scheduled",
  "job.appointment.rescheduled",
]);

type JsonRecord = Record<string, unknown>;

function getWebhookSecret() {
  return process.env.HOUSECALL_PRO_WEBHOOK_SECRET?.trim() || "";
}

function isHousecallProTelegramEnabled() {
  return process.env.HOUSECALL_PRO_TELEGRAM_NOTIFICATIONS_ENABLED?.trim().toLowerCase() === "true";
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function getText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = getText(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function getField(payload: JsonRecord, ...names: string[]) {
  const containers = [
    payload,
    asRecord(payload.data),
    asRecord(payload.lead),
    asRecord(asRecord(payload.data).lead),
    asRecord(payload.job),
    asRecord(asRecord(payload.data).job),
    asRecord(payload.estimate),
    asRecord(asRecord(payload.data).estimate),
    asRecord(payload.invoice),
    asRecord(asRecord(payload.data).invoice),
    asRecord(payload.resource),
    asRecord(asRecord(payload.data).resource),
    asRecord(payload.customer),
    asRecord(asRecord(payload.data).customer),
  ];

  for (const container of containers) {
    for (const name of names) {
      const matchingKey = Object.keys(container).find(
        (key) => key.toLowerCase() === name.toLowerCase(),
      );

      if (matchingKey) {
        const value = getText(container[matchingKey]);

        if (value) {
          return value;
        }
      }
    }
  }

  return "";
}

function getNestedField(container: JsonRecord, ...names: string[]) {
  for (const name of names) {
    const matchingKey = Object.keys(container).find(
      (key) => key.toLowerCase() === name.toLowerCase(),
    );

    if (matchingKey) {
      const value = getText(container[matchingKey]);

      if (value) {
        return value;
      }
    }
  }

  return "";
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("+")) {
    return digits;
  }

  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function getAddress(payload: JsonRecord, primaryRecord?: JsonRecord) {
  const data = asRecord(payload.data);
  const record = primaryRecord ?? asRecord(data.lead ?? payload.lead ?? data.job ?? payload.job);
  const customer = asRecord(record.customer ?? data.customer ?? payload.customer);
  const address = asRecord(record.address ?? data.address ?? customer.address ?? payload.address);
  const street = getNestedField(address, "street", "address", "line1", "addressLine1");
  const city = getNestedField(address, "city");
  const state = getNestedField(address, "state", "stateCode", "province");
  const postalCode = getNestedField(address, "zip", "zipCode", "postalCode", "postal_code");

  return [street, city, state, postalCode].filter(Boolean).join(", ");
}

function hasScheduleInfo(payload: JsonRecord, primaryRecord: JsonRecord) {
  const data = asRecord(payload.data);
  const appointment = asRecord(
    primaryRecord.appointment ?? data.appointment ?? payload.appointment,
  );

  return Boolean(
    firstText(
      getField(
        payload,
        "scheduledDate",
        "scheduled_date",
        "appointmentDate",
        "appointment_date",
        "startTime",
        "start_time",
        "startsAt",
        "starts_at",
      ),
      getNestedField(
        primaryRecord,
        "scheduledDate",
        "scheduled_date",
        "appointmentDate",
        "appointment_date",
        "startTime",
        "start_time",
        "startsAt",
        "starts_at",
      ),
      getNestedField(
        appointment,
        "date",
        "scheduledDate",
        "scheduled_date",
        "startTime",
        "start_time",
        "startsAt",
        "starts_at",
      ),
    ),
  );
}

function normalizeSignature(value: string) {
  return value.trim().replace(/^sha256=/i, "").replace(/^v1=/i, "");
}

function signaturesMatch(expected: string, actual: string) {
  const normalizedExpected = normalizeSignature(expected);
  const normalizedActual = normalizeSignature(actual);

  if (!normalizedExpected || !normalizedActual) {
    return false;
  }

  const expectedBuffer = Buffer.from(normalizedExpected, "utf8");
  const actualBuffer = Buffer.from(normalizedActual, "utf8");

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function isAuthorized(request: Request, rawBody: string) {
  const secret = getWebhookSecret();

  if (!secret) {
    return false;
  }

  const directSecret = request.headers.get("x-webhook-secret")?.trim() || "";
  const timestamp = request.headers.get("api-timestamp")?.trim() || "";
  const signature =
    request.headers.get("api-signature")?.trim() ||
    request.headers.get("x-housecall-pro-signature")?.trim() ||
    "";

  if (directSecret === secret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const signedValues = [
    rawBody,
    timestamp ? `${timestamp}.${rawBody}` : "",
    timestamp ? `${timestamp}${rawBody}` : "",
  ].filter(Boolean);

  return signedValues.some((value) => {
    const hexDigest = createHmac("sha256", secret).update(value).digest("hex");
    const base64Digest = createHmac("sha256", secret).update(value).digest("base64");
    return signaturesMatch(hexDigest, signature) || signaturesMatch(base64Digest, signature);
  });
}

function getRequestOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function getPipelineStageForHcpEvent(
  eventName: string,
  status: string,
  currentStage: string = "new_lead",
  scheduledAtCreation = false,
) {
  const value = `${eventName} ${status}`.toLowerCase();

  if (
    (eventName.startsWith("lead.") || eventName.startsWith("job.")) &&
    (value.includes("lost") || value.includes("deleted") || value.includes("cancel"))
  ) {
    return "closed_no_repair" as const;
  }

  if (
    eventName === "job.completed" ||
    eventName === "job.paid" ||
    eventName === "invoice.paid"
  ) {
    return "completed" as const;
  }

  if (eventName === "estimate.option.approval_status_changed") {
    if (/(approved|accepted|confirmed)/i.test(status)) {
      return "approved" as const;
    }

    if (/(declined|rejected|denied|canceled|cancelled)/i.test(status)) {
      return "closed_no_repair" as const;
    }

    return "estimate_sent_awaiting_approval" as const;
  }

  if (eventName === "estimate.created" || eventName === "estimate.copy_to_job") {
    return "diagnosed_estimate_needed" as const;
  }

  if (eventName === "estimate.sent") {
    return "estimate_sent_awaiting_approval" as const;
  }

  if (eventName === "estimate.scheduled" || eventName === "estimate.on_my_way") {
    return "scheduled" as const;
  }

  if (
    eventName === "job.scheduled" ||
    eventName === "job.appointment.scheduled" ||
    eventName === "job.appointment.rescheduled"
  ) {
    return ["approved", "parts_ordered", "parts_received"].includes(currentStage)
      ? ("repair_scheduled" as const)
      : ("scheduled" as const);
  }

  if (eventName === "job.started" || eventName === "job.on_my_way") {
    return ["approved", "parts_ordered", "parts_received", "repair_scheduled"].includes(currentStage)
      ? ("repair_scheduled" as const)
      : ("scheduled" as const);
  }

  if (
    (eventName === "job.created" || eventName === "job.updated") &&
    (value.includes("scheduled") || scheduledAtCreation)
  ) {
    return "scheduled" as const;
  }

  if (eventName === "job.created") {
    return "scheduled" as const;
  }

  return null;
}

async function sendTelegram(text: string, buttons: { text: string; url: string }[] = []) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || "";

  if (!botToken || !chatId) {
    return { sent: false, reason: "Telegram is not configured." };
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...(buttons.length
        ? { reply_markup: { inline_keyboard: [buttons] } }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status} ${await response.text()}`);
  }

  return { sent: true, reason: "" };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Housecall Pro webhook",
    configured: {
      webhookSecret: Boolean(getWebhookSecret()),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      housecallProTelegram: isHousecallProTelegramEnabled(),
      pipelineTelegram: getPipelineConfigStatus(),
    },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!getWebhookSecret()) {
    try {
      const testPayload = asRecord(JSON.parse(rawBody));

      if (Object.keys(testPayload).length === 1 && getText(testPayload.foo) === "bar") {
        return NextResponse.json({ ok: true, test: true });
      }
    } catch {
      // Return the normal configuration error below for non-test payloads.
    }

    return NextResponse.json(
      { error: "HOUSECALL_PRO_WEBHOOK_SECRET is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request, rawBody)) {
    return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
  }

  let payload: JsonRecord;

  try {
    payload = asRecord(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!Object.keys(payload).length) {
    return NextResponse.json({ error: "Webhook payload is empty." }, { status: 400 });
  }

  const event = getField(payload, "event", "eventType", "event_type", "type") || "lead.created";
  const eventName = event.toLowerCase();

  if (!HCP_EVENTS.has(eventName)) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const data = asRecord(payload.data);
  const lead = asRecord(data.lead ?? payload.lead);
  const job = asRecord(data.job ?? payload.job);
  const estimate = asRecord(data.estimate ?? payload.estimate);
  const invoice = asRecord(data.invoice ?? payload.invoice);
  const isLeadEvent = eventName.startsWith("lead.");
  const isJobEvent = eventName.startsWith("job.");
  const isEstimateEvent = eventName.startsWith("estimate.");
  const isInvoiceEvent = eventName.startsWith("invoice.");
  const primaryRecord = isJobEvent
    ? job
    : isEstimateEvent
      ? estimate
      : isInvoiceEvent
        ? invoice
        : lead;
  const customer = asRecord(
    primaryRecord.customer ??
      job.customer ??
      lead.customer ??
      data.customer ??
      payload.customer,
  );
  const customerName = firstText(
    getNestedField(customer, "name", "fullName", "full_name"),
    [
      getNestedField(customer, "firstName", "first_name"),
      getNestedField(customer, "lastName", "last_name"),
    ]
      .filter(Boolean)
      .join(" "),
    getField(payload, "customerName", "customer_name", "name"),
    "Housecall Pro customer",
  );
  const phone = normalizePhone(
    firstText(
      getNestedField(customer, "phone", "mobileNumber", "mobile_number", "homeNumber", "workNumber"),
      getField(payload, "phone", "phoneNumber", "phone_number"),
    ),
  );
  const email = firstText(
    getNestedField(customer, "email", "emailAddress", "email_address"),
    getField(payload, "email", "emailAddress", "email_address"),
  );
  const category = firstText(
    getNestedField(primaryRecord, "jobType", "job_type", "serviceType", "service_type", "leadType", "lead_type", "category", "appliance", "service"),
    getField(payload, "jobType", "job_type", "serviceType", "service_type", "leadType", "lead_type", "category", "appliance", "service"),
  );
  const sourceDetail = getField(payload, "leadSource", "lead_source", "marketingSource", "marketing_source", "source");
  const externalId = firstText(
    getField(payload, "id", "leadId", "lead_id", "resourceId", "resource_id"),
    getNestedField(data, "id", "leadId", "lead_id"),
    getNestedField(primaryRecord, "id", "leadId", "lead_id", "resourceId", "resource_id"),
  );
  const relatedJobId = firstText(
    getField(payload, "jobId", "job_id", "jobID"),
    getNestedField(data, "jobId", "job_id", "jobID"),
    getNestedField(primaryRecord, "jobId", "job_id", "jobID"),
    getNestedField(job, "id", "jobId", "job_id"),
  );
  const createdAt = getField(payload, "createdAt", "created_at", "timestamp", "date");
  const status = firstText(getField(payload, "status"), eventName);
  const address = getAddress(payload, primaryRecord);
  const scheduledAtCreation = isJobEvent && hasScheduleInfo(payload, primaryRecord);
  const notes = getField(payload, "notes", "description", "message", "customerMessage", "customer_message");
  const entityLabel = isJobEvent ? "HCP Job ID" : isLeadEvent ? "HCP ID" : "HCP Event ID";
  const referenceJobId = isJobEvent ? externalId : relatedJobId;
  const reference = referenceJobId
    ? `HCP Job ID: ${referenceJobId}`
    : isLeadEvent && externalId
      ? `HCP ID: ${externalId}`
      : phone
        ? `Phone: ${phone}`
        : "";
  const message = [
    `Source: ${HCP_LEAD_SOURCE}`,
    `Event: ${eventName}`,
    externalId ? `${entityLabel}: ${externalId}` : null,
    !isLeadEvent && !isJobEvent && relatedJobId ? `HCP Job ID: ${relatedJobId}` : null,
    sourceDetail ? `Lead source: ${sourceDetail}` : null,
    notes ? `Notes: ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const pipelineLead = {
    name: customerName,
    phone,
    email,
    service_address: address,
    appliance: category,
    assigned_technician: null,
    estimated_price: null,
  };

  async function processDuplicateLead(duplicateId: string) {
    let pipelineTelegramSent = false;
    const duplicateLead = await getSupabaseLeadById(duplicateId).catch(() => null);
    const nextPipelineStage = getPipelineStageForHcpEvent(
      eventName,
      status,
      duplicateLead?.pipeline_stage || "new_lead",
      scheduledAtCreation,
    );

    if (
      duplicateLead &&
      externalId &&
      (isJobEvent || isLeadEvent) &&
      (isJobEvent ? !duplicateLead.housecall_pro_job_id : !duplicateLead.housecall_pro_lead_id)
    ) {
      try {
        await updateSupabaseLead(duplicateId, {
          status: duplicateLead.status,
          adminNotes: duplicateLead.admin_notes ?? "",
          ...(isJobEvent
            ? { housecallProJobId: externalId }
            : { housecallProLeadId: externalId }),
        });
      } catch (error) {
        console.error("Housecall Pro external ID backfill error:", error);
      }
    }

    if (
      duplicateLead &&
      nextPipelineStage &&
      (duplicateLead.pipeline_stage || "new_lead") !== nextPipelineStage
    ) {
      try {
        await updateSupabaseLead(duplicateId, {
          status: duplicateLead.status,
          adminNotes: duplicateLead.admin_notes ?? "",
          pipelineStage: nextPipelineStage,
        });
        await createLeadActivity({
          leadId: duplicateId,
          eventType: `housecall_pro_pipeline_stage_${nextPipelineStage}`,
          title: "Housecall Pro updated Pipeline stage",
          details: `${duplicateLead.pipeline_stage || "new_lead"} → ${nextPipelineStage}.`,
          metadata: {
            source: HCP_LEAD_SOURCE,
            event: eventName,
            externalId: externalId || null,
            entity: isJobEvent ? "job" : isLeadEvent ? "lead" : isEstimateEvent ? "estimate" : "invoice",
          },
        });
      } catch (error) {
        console.error("Housecall Pro pipeline stage update error:", error);
      }
    }

    if (
      isHousecallProTelegramEnabled() &&
      !eventName.endsWith(".created") &&
      duplicateLead?.pipeline_telegram_enabled === true
    ) {
      try {
        const pipelineTelegram = await sendPipelineTelegramMessage(
          {
            source: HCP_LEAD_SOURCE,
            type:
              eventName === "lead.converted" || eventName === "estimate.option.approval_status_changed"
                ? "status_change"
                : "update",
            eventName,
            lead: duplicateLead,
            leadId: duplicateId,
            externalId,
            previousStatus: duplicateLead.pipeline_stage || "new_lead",
            nextStatus: nextPipelineStage || undefined,
            status,
            details: notes,
          },
          [{ text: "Open lead", url: getPipelineLeadUrl(duplicateId) }],
        );
        pipelineTelegramSent = pipelineTelegram.sent;
      } catch (error) {
        console.error("Housecall Pro pipeline Telegram error:", error);
      }
    }

    return NextResponse.json({
      ok: true,
      duplicate: true,
      leadId: duplicateId,
      pipelineTelegramSent,
      pipelineStage: nextPipelineStage,
    });
  }

  const exactLookupId = isJobEvent || isLeadEvent ? externalId : relatedJobId;
  let duplicate: { id: string } | null = exactLookupId
    ? isJobEvent || !isLeadEvent
      ? await findSupabaseLeadByHousecallProJobId(exactLookupId)
      : await findSupabaseLeadByHousecallProLeadId(exactLookupId)
    : null;

  if (!duplicate && reference && (isLeadEvent || isJobEvent || relatedJobId)) {
    duplicate = await findRecentLeadBySourceReference({
      leadSource: HCP_LEAD_SOURCE,
      reference,
      windowMinutes: 10 * 365 * 24 * 60,
    });

  }

  if (!isLeadEvent && !isJobEvent) {
    return NextResponse.json({
      ok: true,
      ignored: eventName,
      reason: "No matching HCP lead or job was found for this event.",
    });
  }

  if (!duplicate && (isLeadEvent || isJobEvent) && phone) {
    duplicate = await findRecentLeadBySourcePhone({
      leadSource: HCP_LEAD_SOURCE,
      phone,
      windowMinutes: 30,
    });
  }

  if (duplicate) {
    return processDuplicateLead(duplicate.id);
  }

  let storedLeadId: string | null = null;

  if (phone) {
    const stored = await saveLeadToSupabase({
      name: customerName,
      phone,
      email,
      address: address || "Address pending - Housecall Pro lead",
      appliance: category,
      promoCode: "",
      leadSource: HCP_LEAD_SOURCE,
      preferredDate: "",
      message,
      ...(isJobEvent
        ? { housecallProJobId: externalId || undefined }
        : { housecallProLeadId: externalId || undefined }),
      pipelineStage:
        getPipelineStageForHcpEvent(eventName, status, "new_lead", scheduledAtCreation) ||
        undefined,
    });

    if (stored.saved) {
      storedLeadId = stored.id || null;

      if (!storedLeadId && stored.duplicate && externalId) {
        const concurrentLead = isJobEvent
          ? await findSupabaseLeadByHousecallProJobId(externalId)
          : await findSupabaseLeadByHousecallProLeadId(externalId);

        if (concurrentLead) {
          const nextPipelineStage = getPipelineStageForHcpEvent(
            eventName,
            status,
            concurrentLead.pipeline_stage || "new_lead",
            scheduledAtCreation,
          );

          if (
            nextPipelineStage &&
            (concurrentLead.pipeline_stage || "new_lead") !== nextPipelineStage
          ) {
            try {
              await updateSupabaseLead(concurrentLead.id, {
                status: concurrentLead.status,
                adminNotes: concurrentLead.admin_notes ?? "",
                pipelineStage: nextPipelineStage,
              });
              await createLeadActivity({
                leadId: concurrentLead.id,
                eventType: `housecall_pro_pipeline_stage_${nextPipelineStage}`,
                title: "Housecall Pro updated Pipeline stage",
                details: `${concurrentLead.pipeline_stage || "new_lead"} → ${nextPipelineStage}.`,
                metadata: {
                  source: HCP_LEAD_SOURCE,
                  event: eventName,
                  entity: isJobEvent ? "job" : "lead",
                  externalId,
                },
              });
            } catch (error) {
              console.error("Housecall Pro concurrent Pipeline stage update error:", error);
            }
          }
        }

        return NextResponse.json({
          ok: true,
          duplicate: true,
          leadId: concurrentLead?.id || null,
          pipelineStage: getPipelineStageForHcpEvent(
            eventName,
            status,
            concurrentLead?.pipeline_stage || "new_lead",
            scheduledAtCreation,
          ),
          pipelineTelegramSent: false,
        });
      }
    } else if (!stored.skipped) {
      console.error("Housecall Pro lead storage error:", stored.error);
    }
  }

  if (storedLeadId) {
    await createLeadActivity({
      leadId: storedLeadId,
      eventType: `housecall_pro_${eventName.replace(/[^a-z0-9]+/g, "_")}`,
      title: isJobEvent ? "Housecall Pro job received" : "Housecall Pro lead received",
      details: message,
      metadata: {
        source: HCP_LEAD_SOURCE,
        event: eventName,
        externalId: externalId || null,
        entity: isJobEvent ? "job" : "lead",
        rawFields: Object.keys(payload),
      },
    });
  }

  const telegram = isHousecallProTelegramEnabled()
    ? await sendTelegram(
        buildUnifiedTelegramLeadMessage({
          source: HCP_LEAD_SOURCE,
          type: "Lead notification",
          name: customerName,
          phone,
          email,
          address,
          category,
          sourceDetail: sourceDetail || "Housecall Pro",
          externalId,
          status,
          callTime: createdAt,
          message: notes || "",
        }),
        storedLeadId
          ? [{ text: "Open lead", url: `${getRequestOrigin(request)}/admin/leads/${storedLeadId}` }]
          : [],
      )
    : { sent: false, reason: "Housecall Pro Telegram notifications are disabled." };

  let pipelineTelegramSent = false;

  try {
    if (isHousecallProTelegramEnabled()) {
      const pipelineTelegram = await sendPipelineTelegramMessage(
        {
          source: HCP_LEAD_SOURCE,
          type: eventName.endsWith(".created") ? "new_lead" : "update",
          eventName,
          lead: {
            ...pipelineLead,
            id: storedLeadId || undefined,
          },
          leadId: storedLeadId,
          externalId,
          status,
          details: notes,
        },
        storedLeadId
          ? [{ text: "Open lead", url: getPipelineLeadUrl(storedLeadId) }]
          : [],
      );
      pipelineTelegramSent = pipelineTelegram.sent;
    }
  } catch (error) {
    console.error("Housecall Pro pipeline Telegram error:", error);
  }

  return NextResponse.json({
    ok: true,
    event: eventName,
    leadId: storedLeadId,
    telegramSent: telegram.sent,
    pipelineTelegramSent,
    ...(telegram.sent ? {} : { warning: telegram.reason }),
  });
}
