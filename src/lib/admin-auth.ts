import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "dapl_leads_admin";
const COOKIE_MAX_AGE = 60 * 60 * 8;

export type AdminSessionUser = {
  id: string;
  name: string;
  role: string;
};

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

function normalizeUserId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRole(role: string) {
  return role.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "staff";
}

function getAdminUsers() {
  const configuredUsers = process.env.LEADS_ADMIN_USERS;

  if (configuredUsers) {
    return configuredUsers
      .split(";")
      .map((entry) => {
        const [name, password, role = "staff"] = entry.split("|").map((part) => part.trim());

        if (!name || !password) {
          return null;
        }

        return {
          id: normalizeUserId(name),
          name,
          password,
          role: normalizeRole(role),
        };
      })
      .filter(Boolean) as Array<AdminSessionUser & { password: string }>;
  }

  const password = getAdminPassword();

  if (!password) {
    return [];
  }

  const name = process.env.LEADS_ADMIN_NAME || "Admin";

  return [
    {
      id: normalizeUserId(name) || "admin",
      name,
      password,
      role: "owner",
    },
  ];
}

function signSessionPayload(payload: string) {
  const secret = getSessionSecret();

  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSessionValue(user: AdminSessionUser) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      name: user.name,
      role: user.role,
    }),
  ).toString("base64url");
  const signature = signSessionPayload(payload);

  if (!signature) {
    return null;
  }

  return `${payload}.${signature}`;
}

function readSessionValue(value: string | undefined): AdminSessionUser | null {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(payload);

  if (!expectedSignature || !safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AdminSessionUser>;
    const user = getAdminUsers().find((adminUser) => adminUser.id === parsed.id);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      role: user.role,
    };
  } catch {
    return null;
  }
}

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

export function isAdminConfigured() {
  return Boolean(getAdminUsers().length > 0 && getSessionSecret());
}

export function verifyAdminLogin(password: string): AdminSessionUser | null {
  const users = getAdminUsers();

  for (const user of users) {
    if (safeCompare(password, user.password)) {
      return {
        id: user.id,
        name: user.name,
        role: user.role,
      };
    }
  }

  return null;
}

export function verifyAdminPassword(password: string) {
  return Boolean(verifyAdminLogin(password));
}

export async function getCurrentAdminUser() {
  const cookieStore = await cookies();
  return readSessionValue(cookieStore.get(ADMIN_COOKIE)?.value);
}

export async function isAdminAuthenticated() {
  return Boolean(await getCurrentAdminUser());
}

export async function setAdminSession(user: AdminSessionUser) {
  const sessionValue = createSessionValue(user);

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
