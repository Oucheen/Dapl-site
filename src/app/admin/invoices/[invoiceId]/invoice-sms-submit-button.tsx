"use client";

import { useFormStatus } from "react-dom";

type InvoiceSmsSubmitButtonProps = {
  disabled: boolean;
  label: string;
};

export function InvoiceSmsSubmitButton({ disabled, label }: InvoiceSmsSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
    >
      {pending ? "Sending SMS..." : label}
    </button>
  );
}
