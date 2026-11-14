"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HousecallProSyncButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function syncJobs() {
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/integrations/housecall-pro/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 250 }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        fetched?: number;
        created?: number;
        updated?: number;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Housecall Pro sync failed.");
      }

      setMessage(`HCP: ${result.created ?? 0} new, ${result.updated ?? 0} updated.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Housecall Pro sync failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={syncJobs}
        disabled={pending}
        className="rounded-full border border-primary/15 bg-white px-3 py-2 text-xs font-black text-primary transition hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Syncing HCP…" : "Sync HCP jobs"}
      </button>
      {message ? <span className="max-w-[16rem] text-xs font-bold text-muted">{message}</span> : null}
    </div>
  );
}
