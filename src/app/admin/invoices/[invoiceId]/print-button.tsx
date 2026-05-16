"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="w-full rounded-lg border border-primary/20 bg-white px-3 py-3 text-xs font-bold text-primary transition hover:bg-primary/5"
    >
      Print / save as PDF
    </button>
  );
}
