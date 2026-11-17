"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshDispatchButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-black text-primary transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Updating…" : "Refresh data"}
    </button>
  );
}
