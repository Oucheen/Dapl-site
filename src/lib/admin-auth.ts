import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  findCrmUserByPassword,
  getActiveCrmUserById,
  listCrmUsers,
  normalizeCrmUserRole,
} from "@/lib/supabase-admin-users";

const ADMIN_COOKIE = "dapl_leads_admin";
const COOKIE_MAX_AGE = 60 * 60 * 8;
const REMEMBERED_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_COOKIE_PATH = "/";

export type AdminSessionUser = {
  id: string;
  name: string;
  role: string;
};

const ELEVATED_ADMIN_ROLES = new Set(["admin", "boss", "manager", "owner"]);

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
  const legacyPassword = getAdminPassword();
  const legacyName = process.env.LEADS_ADMIN_NAME || "Admin";
  const legacyUser = legacyPassword
    ? {
        id: normalizeUserId(legacyName) || "admin",
        name: legacyName,
        password: legacyPassword,
        role: "owner",
      }
    : null;

  if (configuredUsers) {
    const users = configuredUsers
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

    if (legacyUser && !users.some((user) => user.password === legacyUser.password)) {
      return [...users, legacyUser];
    }

    return users;
  }

  if (!legacyUser) {
    return [];
  }

  return [legacyUser];
}

export function getConfiguredAdminUsers(): Array<Pick<AdminSessionUser, "id" | "name" | "role">> {
  return getAdminUsers().map(({ id, name, role }) => ({ id, name, role }));
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

    if (!parsed.id || !parsed.name || !parsed.role) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      role: normalizeRole(parsed.role),
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

export async function isAdminConfigured() {
  if (!getSessionSecret()) {
    return false;
  }

  try {
    const crmUsers = await listCrmUsers(1);

    if (crmUsers.ready) {
      return crmUsers.users.some((user) => user.is_active) || getAdminUsers().length > 0;
    }
  } catch {
    // Fall back to env-based admin configuration.
  }

  return getAdminUsers().length > 0;
}

export async function verifyAdminLogin(password: string): Promise<AdminSessionUser | null> {
  try {
    const crmUser = await findCrmUserByPassword(password);

    if (crmUser.user) {
      return {
        id: crmUser.user.id,
        name: crmUser.user.name,
        role: crmUser.user.role,
      };
    }

  } catch {
    // Fall back to env-based users when Supabase auth storage is unavailable.
  }

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

export async function verifyAdminPassword(password: string) {
  return Boolean(await verifyAdminLogin(password));
}

export async function getCurrentAdminUser() {
  const cookieStore = await cookies();
  const sessionUser = readSessionValue(cookieStore.get(ADMIN_COOKIE)?.value);

  if (!sessionUser) {
    return null;
  }

  try {
    const crmUser = await getActiveCrmUserById(sessionUser.id);

    if (crmUser.user) {
      return {
        id: crmUser.user.id,
        name: crmUser.user.name,
        role: crmUser.user.role,
      };
    }

  } catch {
    // Fall back to signed cookie/env behavior when Supabase auth storage is unavailable.
  }

  const envUser = getAdminUsers().find((adminUser) => adminUser.id === sessionUser.id);

  if (envUser) {
    return {
      id: envUser.id,
      name: envUser.name,
      role: envUser.role,
    };
  }

  return /^[0-9a-f-]{36}$/i.test(sessionUser.id)
    ? null
    : {
        ...sessionUser,
        role: normalizeCrmUserRole(sessionUser.role),
      };
}

export function isElevatedAdminRole(role: string | null | undefined) {
  return Boolean(role && ELEVATED_ADMIN_ROLES.has(normalizeRole(role)));
}

export async function getCurrentAdminPermissions() {
  const user = await getCurrentAdminUser();
  const normalizedRole = user ? normalizeRole(user.role) : null;
  const hasElevatedAccess = isElevatedAdminRole(normalizedRole);
  const hasTechnicianAccess = normalizedRole === "technician";
  const hasFieldInvoiceAccess = hasElevatedAccess || hasTechnicianAccess;
  const canDeleteRecords = normalizedRole === "owner" || normalizedRole === "admin";

  return {
    user,
    hasElevatedAccess,
    hasTechnicianAccess,
    canManageInvoiceCharges: hasFieldInvoiceAccess,
    canDeleteInvoicePayments: hasElevatedAccess,
    canVoidInvoices: hasElevatedAccess,
    canBackdateManualInvoices: hasElevatedAccess,
    canSendInvoices: hasFieldInvoiceAccess,
    canDeleteLeads: canDeleteRecords,
    canDeleteRecords,
  };
}

export async function isAdminAuthenticated() {
  return Boolean(await getCurrentAdminUser());
}

export async function setAdminSession(user: AdminSessionUser, options?: { rememberDevice?: boolean }) {
  const sessionValue = createSessionValue(user);

  if (!sessionValue) {
    throw new Error("Admin session secret is not configured.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, sessionValue, {
    httpOnly: true,
    maxAge: options?.rememberDevice ? REMEMBERED_COOKIE_MAX_AGE : COOKIE_MAX_AGE,
    path: SESSION_COOKIE_PATH,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: SESSION_COOKIE_PATH,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
