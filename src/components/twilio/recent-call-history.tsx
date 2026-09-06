"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Phone, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { CallRecord } from "@/lib/supabase-calls";
import { CallButton } from "@/components/twilio/call-widget";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatDuration(value: number | null) {
  if (!value) return "—";
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function statusTone(status: CallRecord["status"]) {
  if (status === "answered" || status === "completed") return "text-emerald-700 bg-emerald-50";
  if (status === "missed" || status === "failed" || status === "busy") return "text-red-700 bg-red-50";
  return "text-primary bg-primary/5";
}

export function RecentCallHistory({ refreshKey = "" }: { refreshKey?: string }) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/twilio/recent-calls", { cache: "no-store" });
        const data = (await response.json()) as { calls?: CallRecord[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load call history.");
        if (active) {
          setCalls(data.calls || []);
          setError("");
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load call history.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshKey]);

  return (
    <section className="mx-auto mt-4 max-w-sm rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-accent">History</p><h2 className="mt-1 text-lg font-black text-primary">Recent calls</h2></div>
        <Link href="/admin/calls" className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /> All calls</Link>
      </div>
      {loading && !calls.length ? <p className="mt-3 text-xs font-bold text-muted">Loading call history…</p> : null}
      {error ? <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs font-bold text-red-700">{error}</p> : null}
      {!loading && !error && !calls.length ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-bold text-muted">No calls yet.</p> : null}
      {calls.length ? <div className="mt-3 grid gap-2" aria-live="polite">{calls.map((call) => <article key={call.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-start gap-2"><span className={`mt-0.5 rounded-full p-1.5 ${call.direction === "incoming" ? "text-emerald-700 bg-emerald-50" : "text-primary bg-primary/5"}`}>{call.direction === "incoming" ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-black text-primary">{call.customer_name || call.customer_phone || "Unknown caller"}</p><time className="shrink-0 text-[0.65rem] font-bold text-muted">{formatTime(call.created_at)}</time></div><p className="mt-0.5 truncate text-xs font-semibold text-muted">{call.customer_phone || "Unknown number"}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-black uppercase ${statusTone(call.status)}`}>{call.status}</span><span className="text-[0.65rem] font-bold text-muted">{formatDuration(call.duration_seconds)}</span>{call.recording_sid ? <a href={`/api/twilio/recordings/${call.recording_sid}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[0.65rem] font-black text-primary hover:underline"><PlayCircle className="h-3.5 w-3.5" /> Recording</a> : null}{call.lead_id ? <Link href={`/admin/leads/${call.lead_id}`} className="inline-flex items-center gap-1 text-[0.65rem] font-black text-primary hover:underline">Lead</Link> : null}</div></div></div>{call.customer_phone ? <div className="mt-2 border-t border-slate-200 pt-2"><CallButton phone={call.customer_phone} name={call.customer_name || undefined} leadId={call.lead_id || undefined} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-primary/20 bg-white px-2.5 py-1 text-[0.65rem] font-black text-primary shadow-sm hover:bg-primary/5"><Phone className="h-3.5 w-3.5" aria-hidden="true" /> Call again</CallButton></div> : null}</article>)}</div> : null}
    </section>
  );
}
