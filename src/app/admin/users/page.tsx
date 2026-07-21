import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import {
  adminUsersTableSql,
  listCrmUsers,
  type CrmUserRecord,
  type CrmUserRole,
} from "@/lib/supabase-admin-users";
import { addCrmUserAction, deleteCrmUserAction, updateCrmUserAction } from "./actions";

export const dynamic = "force-dynamic";

const ROLES: { value: CrmUserRole; label: string; description: string }[] = [
  { value: "staff", label: "Staff", description: "Operational access with protected billing limits" },
  { value: "manager", label: "Manager", description: "Elevated invoice and accounting access" },
  { value: "admin", label: "Admin", description: "Elevated invoice and accounting access" },
  { value: "boss", label: "Boss", description: "Elevated invoice and accounting access" },
  { value: "owner", label: "Owner", description: "Full access, including CRM user management" },
];

const roleClasses: Record<CrmUserRole, string> = {
  staff: "border-slate-300 bg-slate-100 text-slate-700",
  manager: "border-sky-500/25 bg-sky-50 text-sky-800",
  admin: "border-indigo-500/25 bg-indigo-50 text-indigo-800",
  boss: "border-amber-500/25 bg-amber-50 text-amber-800",
  owner: "border-emerald-500/25 bg-emerald-50 text-emerald-800",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function getNotice(value: string | string[] | undefined) {
  const notice = Array.isArray(value) ? value[0] : value;

  if (notice === "added") {
    return "CRM user was added.";
  }

  if (notice === "updated") {
    return "CRM user was updated.";
  }

  if (notice === "deleted") {
    return "CRM user was deleted.";
  }

  return "";
}

function getFormError(value: string | string[] | undefined) {
  const error = Array.isArray(value) ? value[0] : value;

  if (error === "name_required") {
    return "Name is required.";
  }

  if (error === "password_required") {
    return "Password is required when adding a new CRM user.";
  }

  if (error === "role_invalid") {
    return "Role is invalid.";
  }

  return "";
}

function RoleSelect({ defaultValue }: { defaultValue?: CrmUserRole }) {
  return (
    <select
      name="role"
      defaultValue={defaultValue ?? "staff"}
      className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
    >
      {ROLES.map((role) => (
        <option key={role.value} value={role.value}>
          {role.label}
        </option>
      ))}
    </select>
  );
}

function UserRow({ user }: { user: CrmUserRecord }) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-primary">{user.name}</h2>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${roleClasses[user.role]}`}>
              {user.role}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                user.is_active
                  ? "border-emerald-500/25 bg-emerald-50 text-emerald-800"
                  : "border-slate-300 bg-slate-100 text-slate-600"
              }`}
            >
              {user.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">Updated {formatDate(user.updated_at)}</p>
          {user.note ? <p className="mt-3 text-sm leading-6 text-muted">{user.note}</p> : null}
        </div>
      </div>

      <form action={updateCrmUserAction} className="mt-5 grid gap-3 border-t border-border pt-5 lg:grid-cols-[1fr_160px_1fr_110px]">
        <input type="hidden" name="id" value={user.id} />
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Name
          <input
            name="name"
            defaultValue={user.name}
            className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
          />
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Role
          <RoleSelect defaultValue={user.role} />
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          New password
          <input
            type="password"
            name="password"
            placeholder="Leave blank to keep"
            className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
          />
        </label>
        <label className="flex items-end gap-2 pb-3 text-sm font-bold text-primary">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={user.is_active}
            className="h-4 w-4 rounded border-border text-primary"
          />
          Active
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted lg:col-span-3">
          Note
          <input
            name="note"
            defaultValue={user.note ?? ""}
            placeholder="Optional note"
            className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
        >
          Save
        </button>
      </form>

      <form action={deleteCrmUserAction} className="mt-3">
        <input type="hidden" name="id" value={user.id} />
        <button
          type="submit"
          className="rounded-lg border border-red-500/25 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
        >
          Delete user
        </button>
      </form>
    </article>
  );
}

export default async function CrmUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string | string[]; error?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  if (permissions.user.role !== "owner") {
    redirect("/admin");
  }

  const params = await searchParams;
  const notice = getNotice(params?.notice);
  const formError = getFormError(params?.error);
  let usersData: Awaited<ReturnType<typeof listCrmUsers>> = {
    users: [],
    ready: true,
    error: "",
  };
  let error = "";

  try {
    usersData = await listCrmUsers();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load CRM users.";
  }

  return (
    <main className="min-h-screen bg-slate-50 text-foreground">
      <header className="border-b border-border bg-white">
        <div className="container-shell flex flex-col gap-4 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-bold text-muted hover:text-primary">
              Back to admin
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary">
              CRM users
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Manage admin passwords and roles without editing Vercel environment variables.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="inline-flex w-fit items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/telegram"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Telegram access
            </Link>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        {notice ? (
          <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
            {notice}
          </div>
        ) : null}

        {formError ? (
          <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-50 p-5 text-sm font-bold text-red-700">
            {formError}
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-black">Could not load CRM users.</p>
            <p className="mt-2 break-words">{error}</p>
          </div>
        ) : null}

        {!usersData.ready ? (
          <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <p className="font-black">CRM users table is not ready.</p>
            <p className="mt-2">Run this SQL in Supabase once, then refresh this page.</p>
            <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-white p-4 text-xs leading-6 text-foreground">
              {adminUsersTableSql}
            </pre>
          </div>
        ) : null}

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Add access
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">Add CRM user</h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-muted">
              Passwords are stored as salted hashes. Existing env passwords stay as fallback access.
            </p>
          </div>

          <form action={addCrmUserAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_170px_1fr_1fr_140px]">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Name
              <input
                name="name"
                placeholder="Dmytro"
                className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Role
              <RoleSelect />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Password
              <input
                type="password"
                name="password"
                placeholder="Private password"
                className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Note
              <input
                name="note"
                placeholder="Optional"
                className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
              />
            </label>
            <button
              type="submit"
              className="self-end rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Add user
            </button>
          </form>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {ROLES.map((role) => (
              <div key={role.value} className={`rounded-xl border p-4 ${roleClasses[role.value]}`}>
                <p className="font-black">{role.label}</p>
                <p className="mt-1 text-xs leading-5">{role.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4">
          {usersData.users.length ? (
            usersData.users.map((user) => <UserRow key={user.id} user={user} />)
          ) : (
            <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm leading-6 text-muted shadow-sm">
              No CRM users added yet.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
