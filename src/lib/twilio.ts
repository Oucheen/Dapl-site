import twilio from "twilio";

const { AccessToken } = twilio.jwt;
const VoiceGrant = AccessToken.VoiceGrant;

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
  phoneNumber: string;
};

export function getTwilioConfig(): TwilioConfig {
  const values = {
    accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() || "",
    authToken: process.env.TWILIO_AUTH_TOKEN?.trim() || "",
    apiKeySid: process.env.TWILIO_API_KEY_SID?.trim() || "",
    apiKeySecret: process.env.TWILIO_API_KEY_SECRET?.trim() || "",
    twimlAppSid: process.env.TWILIO_TWIML_APP_SID?.trim() || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER?.trim() || "",
  };

  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Twilio is not configured. Missing: ${missing.join(", ")}`);
  }

  return values;
}

export function createVoiceAccessToken(identity: string) {
  const config = getTwilioConfig();
  const token = new AccessToken(
    config.accountSid,
    config.apiKeySid,
    config.apiKeySecret,
    { identity, ttl: 3600 },
  );

  token.addGrant(
    new VoiceGrant({
      incomingAllow: true,
      outgoingApplicationSid: config.twimlAppSid,
    }),
  );

  return token.toJwt();
}

export function toE164(value: string) {
  const raw = value.trim().replace(/[().\s-]/g, "");
  const normalized = raw.startsWith("+") ? `+${raw.slice(1).replace(/\D/g, "")}` : raw.replace(/\D/g, "");
  const withCountry = normalized.length === 10 ? `+1${normalized}` : normalized;

  if (!/^\+[1-9]\d{9,14}$/.test(withCountry)) {
    throw new Error("Phone number must be a valid E.164 number.");
  }

  return withCountry;
}

export function twimlResponse(response: twilio.twiml.VoiceResponse) {
  return new Response(response.toString(), {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export function getPublicRequestUrl(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}${new URL(request.url).pathname}${new URL(request.url).search}`;
  }

  return request.url;
}

export function validateTwilioWebhook(request: Request, params: Record<string, string>) {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const signature = request.headers.get("x-twilio-signature") || "";

  if (!authToken || !signature) {
    return false;
  }

  return twilio.validateRequest(authToken, signature, getPublicRequestUrl(request), params);
}

export function identityForUser(userId: string) {
  const identity = `crm_${userId.replace(/[^a-zA-Z0-9_]/g, "")}`;

  if (identity.length > 121) {
    throw new Error("CRM user identity is too long for Twilio.");
  }

  return identity;
}

export function userIdFromIdentity(identity: string) {
  const value = identity.replace(/^client:/, "");
  return value.startsWith("crm_") ? value.slice(4) : "";
}

export function xmlSafe(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
