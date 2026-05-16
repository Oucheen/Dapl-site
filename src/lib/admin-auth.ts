import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "dapl_leads_admin";
const COOKIE_MAX_AGE = 60 * 60 * 8;

function getAdminPassword() {
  return process.env.LEADS_ADMIN_PASSWORD;
}

function getSessionSecret() {
  return (
    process.env.LEADS_ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.LEADS_ADMIN_PASSWORD
  );
}

function getSessionValue() {
  const secret = getSessionSecret();

  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret).update("dapl-leads-admin").digest("base64url");
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword() && getSessionSecret());
}

export function verifyAdminPassword(password: string) {
  const expected = getAdminPassword();

  if (!expected) {
    return false;
  }

  return safeCompare(password, expected);
}

export async function isAdminAuthenticated() {
  const sessionValue = getSessionValue();

  if (!sessionValue) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_COOKIE)?.value;

  return Boolean(cookieValue && safeCompare(cookieValue, sessionValue));
}

export async function setAdminSession() {
  const sessionValue = getSessionValue();

  if (!sessionValue) {
    throw new Error("Admin session secret is not configured.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, sessionValue, {
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
