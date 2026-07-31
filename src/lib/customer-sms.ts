export type SendCustomerSmsResult =
  | { ok: true; to: string; messageSid: string }
  | {
      ok: false;
      reason: "missing_phone" | "non_us_phone" | "config" | "send_error";
      details?: string;
    };

export function normalizeUsCustomerPhone(value: string | null | undefined): SendCustomerSmsResult | {
  ok: true;
  to: string;
} {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return { ok: false, reason: "missing_phone" };
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return { ok: true, to: `+1${digits}` };
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return { ok: true, to: `+${digits}` };
  }

  return {
    ok: false,
    reason: "non_us_phone",
    details: "Customer SMS is limited to US phone numbers.",
  };
}

export async function sendCustomerSms(
  phone: string | null | undefined,
  body: string,
): Promise<SendCustomerSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const normalizedPhone = normalizeUsCustomerPhone(phone);

  if (!normalizedPhone.ok) {
    return normalizedPhone;
  }

  const to = normalizedPhone.to;

  if (!accountSid || !authToken || !messagingServiceSid) {
    return { ok: false, reason: "config" };
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        MessagingServiceSid: messagingServiceSid,
        To: to,
        Body: body,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
  };

  if (!response.ok) {
    console.error("Twilio customer SMS error:", response.status, payload);
    return {
      ok: false,
      reason: "send_error",
      details: payload.message || `Twilio returned ${response.status}`,
    };
  }

  return { ok: true, to, messageSid: payload.sid || "" };
}

export function buildSmsOptInConfirmationText() {
  return "[DAPL Appliance Repair]: You are now opted-in to receive SMS messages. For help, reply HELP. To opt out, reply STOP. Message and data rates may apply. Message frequency varies.";
}

export async function sendSmsOptInConfirmation(phone: string) {
  return sendCustomerSms(phone, buildSmsOptInConfirmationText());
}
