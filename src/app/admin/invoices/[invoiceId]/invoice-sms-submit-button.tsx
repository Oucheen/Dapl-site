"use client";

import { useFormStatus } from "react-dom";
import { buildInvoiceSendConfirmMessage } from "./invoice-send-confirm";

type InvoiceSmsSubmitButtonProps = {
  disabled: boolean;
  invoiceStatus: string;
  invoiceTotal: number | string;
  label: string;
  recipient: string;
};

export function InvoiceSmsSubmitButton({
  disabled,
  invoiceStatus,
  invoiceTotal,
  label,
  recipient,
}: InvoiceSmsSubmitButtonProps) {
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
            channel: "SMS",
            invoiceStatus,
            invoiceTotal,
            recipient,
          }),
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="w-full rounded-lg bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
    >
      {pending ? "Sending SMS..." : label}
    </button>
  );
}
