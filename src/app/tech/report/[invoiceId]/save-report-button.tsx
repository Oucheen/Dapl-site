"use client";

import { useRef, useState } from "react";

type SaveReportButtonProps = {
  hasPreviousReport: boolean;
  storedPhotoCount: number;
};

export function SaveReportButton({
  hasPreviousReport,
  storedPhotoCount,
}: SaveReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function confirmSave() {
    setIsOpen(false);
    buttonRef.current?.closest("form")?.requestSubmit();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-4 w-full rounded-xl bg-primary px-5 py-4 text-base font-black text-primary-foreground transition hover:bg-primary/90"
      >
        Save technician report
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-3 sm:place-items-center sm:p-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-4 shadow-xl sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
              Confirm report
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-primary">
              Save this technician report?
            </h2>
            <div className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-muted">
              <p>
                {hasPreviousReport
                  ? "This will update the current report on the customer card."
                  : "This will create the technician report on the customer card."}
              </p>
              {storedPhotoCount > 0 ? (
                <p>
                  Current photos stay attached. New uploaded files replace only their matching
                  photo slot.
                </p>
              ) : null}
              <p>Customer invoice totals will not change automatically.</p>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-primary/15 bg-white px-4 py-3 text-sm font-black text-primary transition hover:bg-primary/5"
              >
                Review again
              </button>
              <button
                type="button"
                onClick={confirmSave}
                className="rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
              >
                Save report
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
