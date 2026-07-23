"use client";

import { useFormStatus } from "react-dom";

type InvoiceEmailSubmitButtonProps = {
  disabled: boolean;
  label: string;
};

export function InvoiceEmailSubmitButton({ disabled, label }: InvoiceEmailSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-lg bg-accent px-3 py-3 text-xs font-bold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
    >
      {pending ? "Sending invoice..." : label}
    </button>
  );
}
