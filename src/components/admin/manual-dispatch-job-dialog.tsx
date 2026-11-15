"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { createManualDispatchJobAction } from "@/app/admin/dispatch/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add to schedule"}
    </button>
  );
}

export function ManualDispatchJobDialog({
  selectedDate,
  selectedTechnician,
  technicians,
}: {
  selectedDate: string;
  selectedTechnician: string;
  technicians: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-violet-300 bg-violet-50 px-5 py-2.5 text-sm font-black text-violet-800 transition hover:bg-violet-100"
      >
        + Manual appointment
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
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Manual schedule</p>
                <h2 id="manual-dispatch-title" className="mt-1 text-2xl font-black text-primary">Add technician appointment</h2>
                <p className="mt-1 text-sm font-semibold text-muted">This entry will be violet and marked Manual on the map and schedule.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-xl font-bold text-muted hover:bg-slate-100" aria-label="Close">×</button>
            </div>

            <form action={createManualDispatchJobAction} className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm font-bold text-primary">
                Customer / job name
                <input name="name" required placeholder="Manual job or customer name" className="rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-primary">
                Address
                <input name="serviceAddress" required placeholder="Street, city, state, ZIP" className="rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-bold text-primary">
                  Date
                  <input type="date" name="serviceDate" required defaultValue={selectedDate} className="rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-primary">
                  Start
                  <input type="time" name="scheduledStart" required defaultValue="08:00" className="rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-primary">
                  End
                  <input type="time" name="scheduledEnd" defaultValue="09:00" className="rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </label>
              </div>
              <label className="grid gap-1.5 text-sm font-bold text-primary">
                Technician
                <input name="assignedTechnician" required list="manual-technicians" defaultValue={selectedTechnician} placeholder="Technician name" className="rounded-xl border border-border px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                <datalist id="manual-technicians">
                  {technicians.map((technician) => <option key={technician} value={technician} />)}
                </datalist>
              </label>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-slate-50">Cancel</button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
