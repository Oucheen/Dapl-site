import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteCallButton } from "@/components/admin/delete-call-button";
import { CallButton } from "@/components/twilio/call-widget";
import { getCurrentAdminPermissions } from "@/lib/admin-auth";
import { listCalls, type CallRecord } from "@/lib/supabase-calls";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(value));
}

function formatDuration(value: number | null) {
  if (!value) return "—";
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function tone(status: CallRecord["status"]) {
  if (status === "answered" || status === "completed") return "text-emerald-700 bg-emerald-50 border-emerald-500/25";
  if (status === "missed" || status === "failed" || status === "busy") return "text-accent bg-red-50 border-accent/20";
  return "text-primary bg-primary/5 border-primary/15";
}

export default async function CallsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const permissions = await getCurrentAdminPermissions();
  if (!permissions.user) redirect("/admin/leads/login?returnTo=/admin/calls");

  const query = (await searchParams) || {};
  const value = (key: string) => typeof query[key] === "string" ? query[key] : "";
  const notice = value("notice");
  let calls: CallRecord[] = [];
  let error = "";
  try { calls = await listCalls({ from: value("from"), to: value("to"), direction: value("direction"), status: value("status"), employee: value("employee") }); } catch (caught) { error = caught instanceof Error ? caught.message : "Could not load calls."; }

  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-foreground sm:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">Telephony</p><h1 className="mt-1 text-3xl font-black text-primary">Calls</h1><p className="mt-2 text-sm text-muted">Incoming, outgoing, missed calls, and recordings.</p></div><Link href="/admin" className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-black text-primary">Back to dashboard</Link></div>
    <form className="mt-6 grid gap-3 rounded-xl border border-border bg-white p-4 shadow-sm md:grid-cols-5"><input type="date" name="from" defaultValue={value("from")} className="rounded-lg border border-border px-3 py-2 text-sm" /><input type="date" name="to" defaultValue={value("to")} className="rounded-lg border border-border px-3 py-2 text-sm" /><select name="direction" defaultValue={value("direction")} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="">All directions</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option></select><select name="status" defaultValue={value("status")} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="">All statuses</option><option value="answered">Answered</option><option value="completed">Completed</option><option value="missed">Missed</option><option value="failed">Failed</option><option value="busy">Busy</option></select><div className="flex gap-2"><input name="employee" defaultValue={value("employee")} placeholder="Employee" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm" /><button className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white">Filter</button></div></form>
    {error ? <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p> : null}
    {notice === "call_deleted" ? <p className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Call history entry deleted.</p> : null}
    {notice === "delete_permission_denied" ? <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-800">You do not have permission to delete call history.</p> : null}
    {notice === "delete_failed" ? <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-800">Could not delete the call history entry. Apply the latest calls SQL in Supabase and try again.</p> : null}
    <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white shadow-sm"><table className="min-w-[1080px] w-full text-left text-sm"><thead className="bg-slate-100 text-xs font-black uppercase tracking-[0.12em] text-muted"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Direction</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Recording</th>{permissions.canDeleteRecords ? <th className="px-4 py-3">Actions</th> : null}</tr></thead><tbody className="divide-y divide-border">{calls.map((call) => <tr key={call.id}><td className="px-4 py-4 whitespace-nowrap">{formatDate(call.created_at)}</td><td className="px-4 py-4 font-black text-primary">{call.lead_id ? <Link href={`/admin/leads/${call.lead_id}`} className="hover:underline">{call.customer_name || "Unknown caller"}</Link> : call.customer_name || "Unknown caller"}</td><td className="px-4 py-4 whitespace-nowrap">{call.customer_phone ? <div className="flex items-center gap-2"><span>{call.customer_phone}</span><CallButton phone={call.customer_phone} name={call.customer_name || undefined} leadId={call.lead_id || undefined} /></div> : "—"}</td><td className="px-4 py-4 capitalize">{call.direction}</td><td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-black uppercase ${tone(call.status)}`}>{call.status}</span></td><td className="px-4 py-4 font-mono">{formatDuration(call.duration_seconds)}</td><td className="px-4 py-4">{call.employee_name || "—"}</td><td className="px-4 py-4">{call.recording_sid ? <audio controls preload="none" className="h-8 w-52" src={`/api/twilio/recordings/${call.recording_sid}`} /> : <span className="text-muted">—</span>}</td>{permissions.canDeleteRecords ? <td className="px-4 py-4"><DeleteCallButton callId={call.id} /></td> : null}</tr>)}{!calls.length ? <tr><td colSpan={permissions.canDeleteRecords ? 9 : 8} className="px-4 py-12 text-center font-bold text-muted">No calls found.</td></tr> : null}</tbody></table></div>
  </div></main>;
}
