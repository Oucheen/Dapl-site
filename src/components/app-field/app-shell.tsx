import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAdmin } from "@/app/admin/leads/actions";

const navItems = [
  { href: "/app", label: "Today", mark: "T" },
  { href: "/app/search", label: "Search", mark: "S" },
  { href: "/app/parts", label: "Parts", mark: "P" },
  { href: "/app/invoices", label: "Invoice", mark: "I" },
  { href: "/app/more", label: "More", mark: "M" },
];

export function AppFieldShell({
  activeHref,
  children,
  eyebrow,
  rightSlot,
  title,
  userName,
}: {
  activeHref: string;
  children: ReactNode;
  eyebrow: string;
  rightSlot?: ReactNode;
  title: string;
  userName: string;
}) {
  return (
    <main className="min-h-screen bg-[#edf2f7] pb-24 text-foreground">
      <section className="border-b border-primary/10 bg-white">
        <div className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/app" className="flex min-h-11 items-center gap-2 rounded-lg px-1">
              <span className="text-xl font-black tracking-tight text-primary">DAPL</span>
              <span className="hidden text-[0.65rem] font-black uppercase tracking-[0.16em] text-muted sm:inline">
                Field
              </span>
            </Link>

            <div className="flex min-w-0 items-center justify-end gap-2">
              <span className="hidden max-w-40 truncate text-xs font-black uppercase tracking-[0.12em] text-muted sm:block">
                {userName}
              </span>
              <form action={logoutAdmin}>
                <button
                  type="submit"
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-white px-3 text-xs font-black text-primary shadow-sm"
                >
                  Out
                </button>
              </form>
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-accent">
                {eyebrow}
              </p>
              <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-primary sm:text-4xl">
                {title}
              </h1>
            </div>
            {rightSlot}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-3 px-3 py-3 sm:px-5 sm:py-5">
        {children}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5 px-2 py-2">
          {navItems.map((item) => {
            const isActive = item.href === activeHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-black transition ${
                  isActive ? "bg-primary text-white" : "text-muted hover:bg-primary/5 hover:text-primary"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-md text-[0.65rem] ${
                    isActive ? "bg-white/15 text-white" : "bg-slate-100 text-primary"
                  }`}
                >
                  {item.mark}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

export function AppStatStrip({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-white p-3 shadow-sm">
          <p className="text-xl font-black text-primary">{item.value}</p>
          <p className="mt-0.5 text-[0.65rem] font-black uppercase tracking-[0.1em] text-muted">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "red" | "amber" | "slate";
}) {
  const tones = {
    amber: "border-amber-500/25 bg-amber-50 text-amber-800",
    blue: "border-primary/15 bg-primary/5 text-primary",
    green: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
    red: "border-accent/20 bg-red-50 text-accent",
    slate: "border-slate-300 bg-slate-100 text-slate-600",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
}
