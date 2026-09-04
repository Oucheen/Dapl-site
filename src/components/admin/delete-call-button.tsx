"use client";

import { deleteCall } from "@/app/admin/calls/actions";

export function DeleteCallButton({ callId }: { callId: string }) {
  return (
    <form
      action={deleteCall}
      onSubmit={(event) => {
        if (!window.confirm("Delete this call history entry?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={callId} />
      <button
        type="submit"
        className="rounded-lg border border-red-500/25 px-3 py-1.5 text-xs font-black text-red-700 transition hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
