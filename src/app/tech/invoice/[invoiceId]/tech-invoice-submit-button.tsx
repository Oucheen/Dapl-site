"use client";

import { useFormStatus } from "react-dom";
import { buildInvoiceSendConfirmMessage, type InvoiceSendChannel } from "@/app/admin/invoices/[invoiceId]/invoice-send-confirm";

type TechInvoiceSubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  className: string;
  disabled?: boolean;
  confirmMessage?: string;
  sendConfirm?: {
    channel: InvoiceSendChannel;
    invoiceStatus: string;
    invoiceTotal: number | string;
    recipient: string;
  };
};

export function TechInvoiceSubmitButton({
  className,
  confirmMessage,
  disabled = false,
  label,
  pendingLabel,
  sendConfirm,
}: TechInvoiceSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      onClick={(event) => {
        if (disabled || pending) {
          return;
        }

        const message = sendConfirm
          ? buildInvoiceSendConfirmMessage(sendConfirm)
          : confirmMessage;

        if (message && !window.confirm(message)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {pending ? pendingLabel || "Saving..." : label}
    </button>
  );
}
