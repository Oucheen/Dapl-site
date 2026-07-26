export type InvoiceSendChannel = "email" | "SMS";

export function buildInvoiceSendConfirmMessage({
  channel,
  invoiceStatus,
  invoiceTotal,
  recipient,
}: {
  channel: InvoiceSendChannel;
  invoiceStatus: string;
  invoiceTotal: number | string;
  recipient: string;
}) {
  const numericTotal = Number(invoiceTotal);
  const warnings = [];

  if (invoiceStatus.toLowerCase() === "draft") {
    warnings.push("Invoice is draft");
  }

  if (Number.isFinite(numericTotal) && Math.abs(numericTotal) < 0.005) {
    warnings.push("total is $0.00");
  }

  const target = recipient ? ` to ${recipient}` : "";

  if (warnings.length > 0) {
    return `WARNING: ${warnings.join(" / ")}. Send anyway?\n\nThis will send the invoice ${channel}${target}.`;
  }

  return `Send invoice ${channel}${target}?`;
}
