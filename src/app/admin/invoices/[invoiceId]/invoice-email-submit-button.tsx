"use client";

import { useFormStatus } from "react-dom";
import { buildInvoiceSendConfirmMessage } from "./invoice-send-confirm";

type InvoiceEmailSubmitButtonProps = {
  disabled: boolean;
  invoiceStatus: string;
  invoiceTotal: number | string;
  recipient: string;
  label: string;
};

export function InvoiceEmailSubmitButton({
  disabled,
  invoiceStatus,
  invoiceTotal,
  label,
  recipient,
}: InvoiceEmailSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      onClick={(event) => {
        if (disabled || pending) {
          return;
        }

        const confirmed = window.confirm(
          buildInvoiceSendConfirmMessage({
            channel: "email",
            invoiceStatus,
            invoiceTotal,
            recipient,
          }),
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="w-full rounded-lg bg-accent px-3 py-3 text-xs font-bold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
    >
      {pending ? "Sending invoice..." : label}
    </button>
  );
}
