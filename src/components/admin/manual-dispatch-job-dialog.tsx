"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createManualDispatchJobAction,
  deleteManualDispatchJobAction,
  updateManualDispatchJobAction,
} from "@/app/admin/dispatch/actions";
import { TechnicianSelect } from "@/components/admin/technician-select";
import type { ManualDispatchJobRecord } from "@/lib/supabase-dispatch-jobs";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : editing ? "Save changes" : "Add to schedule"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Cancelling…" : "Cancel"}
    </button>
  );
}

function formatTimeInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";

  return `${hour === "24" ? "00" : hour}:${minute}`;
}

export function ManualDispatchJobDialog({
  selectedDate,
  selectedTechnician,
  technicians,
  job,
}: {
  selectedDate: string;
  selectedTechnician: string;
  technicians: string[];
  job?: ManualDispatchJobRecord;
}) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(job);
  const formAction = editing ? updateManualDispatchJobAction : createManualDispatchJobAction;
  const formDate = job?.service_date || selectedDate;
  const formTechnician = job?.assigned_technician || selectedTechnician;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-violet-300 bg-violet-50 px-5 py-2.5 text-sm font-black text-violet-800 transition hover:bg-violet-100"
      >
        {editing ? "Edit" : "+ Manual appointment"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-dispatch-title"
            className="w-full max-w-xl rounded-2xl border border-border bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Bozman Fix</p>
                <h2 id="manual-dispatch-title" className="mt-1 text-2xl font-black text-primary">{editing ? "Edit Bozman Fix appointment" : "Add Bozman Fix appointment"}</h2>
                <p className="mt-1 text-sm font-semibold text-muted">This entry is separate from Housecall Pro Scheduled jobs.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-xl font-bold text-muted hover:bg-slate-100" aria-label="Close">×</button>
            </div>

            <form action={formAction} className="mt-5 grid gap-4">
              {job ? <input type="hidden" name="id" value={job.id} /> : null}
              <label className="grid gap-1.5 text-sm font-bold text-primary">
                Address
                <input name="serviceAddress" required defaultValue={job?.service_address} placeholder="Street, city, state, ZIP" className="rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-bold text-primary">
                  Date
                  <input type="date" name="serviceDate" required min={selectedDate} defaultValue={formDate} className="rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-primary">
                  Start
                  <input type="time" name="scheduledStart" required defaultValue={formatTimeInput(job?.scheduled_start) || "08:00"} className="rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-primary">
                  End
                  <input type="time" name="scheduledEnd" defaultValue={formatTimeInput(job?.scheduled_end) || "09:00"} className="rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </label>
              </div>
              <label className="grid gap-1.5 text-sm font-bold text-primary">
                Technician
                <TechnicianSelect
                  technicians={technicians.filter((technician) => technician !== "Unassigned")}
                  defaultValue={formTechnician}
                  required
                  placeholder="Choose technician"
                  className="rounded-xl border border-border bg-white px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-slate-50">Cancel</button>
                <SubmitButton editing={editing} />
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {job ? (
        <form
          action={deleteManualDispatchJobAction}
          onSubmit={(event) => {
            if (!window.confirm("Cancel this Bozman Fix appointment?")) {
              event.preventDefault();
            }
          }}
          className="inline-flex"
        >
          <input type="hidden" name="id" value={job.id} />
          <input type="hidden" name="serviceDate" value={job.service_date} />
          <input type="hidden" name="assignedTechnician" value={job.assigned_technician} />
          <DeleteButton />
        </form>
      ) : null}
    </>
  );
}
