import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import {
  listTelegramUsers,
  telegramUsersTableSql,
  type TelegramUserRecord,
  type TelegramUserRole,
} from "@/lib/supabase-telegram-users";
import {
  addTelegramUserAction,
  deleteTelegramUserAction,
  updateTelegramUserAction,
} from "./actions";

export const dynamic = "force-dynamic";

const ROLES: { value: TelegramUserRole; label: string; description: string }[] = [
  { value: "technician", label: "Technician", description: "Sees only assigned jobs" },
  { value: "dispatcher", label: "Dispatcher", description: "Sees all jobs" },
  { value: "owner", label: "Owner", description: "Sees all jobs" },
];

const roleClasses: Record<TelegramUserRole, string> = {
  technician: "border-sky-500/25 bg-sky-50 text-sky-800",
  dispatcher: "border-amber-500/25 bg-amber-50 text-amber-800",
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
    return "Telegram access was added.";
  }

  if (notice === "updated") {
    return "Telegram access was updated.";
  }

  if (notice === "deleted") {
    return "Telegram access was deleted.";
  }

  return "";
}

function getFormError(value: string | string[] | undefined) {
  const error = Array.isArray(value) ? value[0] : value;

  if (error === "telegram_id_required") {
    return "Telegram ID is required.";
  }

  if (error === "telegram_id_invalid") {
    return "Telegram ID must contain digits only.";
  }

  if (error === "technician_name_required") {
    return "CRM technician name is required for technician role. For owner or dispatcher it can be blank.";
  }

  return "";
}

function RoleSelect({ defaultValue }: { defaultValue?: TelegramUserRole }) {
  return (
    <select
      name="role"
      defaultValue={defaultValue ?? "technician"}
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

function AccessRow({ user }: { user: TelegramUserRecord }) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-primary">{user.technician_name}</h2>
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
          <p className="mt-2 text-sm text-muted">
            Telegram ID: <span className="font-bold text-foreground">{user.telegram_user_id}</span>
          </p>
          <p className="mt-1 text-xs text-muted">Updated {formatDate(user.updated_at)}</p>
          {user.note ? <p className="mt-3 text-sm leading-6 text-muted">{user.note}</p> : null}
        </div>
      </div>

      <form action={updateTelegramUserAction} className="mt-5 grid gap-3 border-t border-border pt-5 lg:grid-cols-[1fr_1fr_160px_110px]">
        <input type="hidden" name="id" value={user.id} />
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Telegram ID
          <input
            name="telegramUserId"
            defaultValue={user.telegram_user_id}
            className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
          />
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          CRM technician name
          <input
            name="technicianName"
            defaultValue={user.technician_name}
            className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 focus:border-primary focus:ring-2"
          />
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Role
          <RoleSelect defaultValue={user.role} />
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
        <div className="grid gap-2 lg:self-end">
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </form>

      <form action={deleteTelegramUserAction} className="mt-3">
        <input type="hidden" name="id" value={user.id} />
        <button
          type="submit"
          className="rounded-lg border border-red-500/25 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
        >
          Delete access
        </button>
      </form>
    </article>
  );
}

export default async function TelegramAccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string | string[]; error?: string | string[] }>;
}) {
  const permissions = await getCurrentAdminPermissions();

  if (!permissions.user) {
    redirect("/admin/leads/login");
  }

  if (!permissions.hasElevatedAccess) {
    redirect("/admin");
  }

  const params = await searchParams;
  const notice = getNotice(params?.notice);
  const formError = getFormError(params?.error);
  let usersData: Awaited<ReturnType<typeof listTelegramUsers>> = {
    users: [],
    ready: true,
    error: "",
  };
  let error = "";

  try {
    usersData = await listTelegramUsers();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load Telegram access.";
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
              Telegram access
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Manage technician bot users without editing Vercel environment variables.
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
              href="/admin/schedule"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Schedule
            </Link>
            <Link
              href="/admin/technician"
              className="inline-flex w-fit items-center justify-center rounded-full border border-primary/15 bg-white px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
            >
              Technician day
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
            <p className="font-black">Could not load Telegram access.</p>
            <p className="mt-2 break-words">{error}</p>
          </div>
        ) : null}

        {!usersData.ready ? (
          <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <p className="font-black">Telegram users table is not ready.</p>
            <p className="mt-2">Run this SQL in Supabase once, then refresh this page.</p>
            <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-white p-4 text-xs leading-6 text-foreground">
              {telegramUsersTableSql}
            </pre>
          </div>
        ) : null}

        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Add access
              </p>
              <h2 className="mt-1 text-2xl font-black text-primary">Add technician bot user</h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-muted">
              Ask the person to send <span className="font-bold text-foreground">/start</span> to the bot. The bot will show their Telegram ID.
            </p>
          </div>

          <form action={addTelegramUserAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_170px_1fr_140px]">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Telegram ID
              <input
                name="telegramUserId"
                placeholder="123456789"
                className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              CRM technician name
              <input
                name="technicianName"
                placeholder="Dmytro Honcharenko"
                className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 placeholder:text-muted focus:border-primary focus:ring-2"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Role
              <RoleSelect />
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
              Add access
            </button>
          </form>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
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
            usersData.users.map((user) => <AccessRow key={user.id} user={user} />)
          ) : (
            <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm leading-6 text-muted shadow-sm">
              No Telegram users added yet.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
