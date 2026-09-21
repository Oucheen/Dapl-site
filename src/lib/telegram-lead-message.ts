export type UnifiedTelegramLeadInput = {
  source: string;
  type: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  zipCode?: string;
  category?: string;
  sourceDetail?: string;
  externalId?: string;
  status?: string;
  callId?: string;
  callTime?: string;
  duration?: string;
  cost?: string;
  forwardNumber?: string;
  model?: string;
  contactMethod?: string;
  preferredDate?: string;
  promoCode?: string;
  message?: string;
  recordingUrl?: string;
};

function getHeaderIcon(source: string) {
  const normalizedSource = source.trim().toLowerCase();

  if (normalizedSource === "elocal") {
    return "🔴";
  }

  if (normalizedSource === "housecall pro") {
    return "🔵";
  }

  return "🟢";
}

function addLine(lines: string[], label: string, value?: string) {
  const trimmedValue = value?.trim();

  if (trimmedValue) {
    lines.push(`${label}: ${trimmedValue}`);
  }
}

export function buildUnifiedTelegramLeadMessage(input: UnifiedTelegramLeadInput) {
  const lines = [
    `${getHeaderIcon(input.source)} NEW LEAD`,
    "",
  ];

  addLine(lines, "Source", input.source);
  addLine(lines, "Type", input.type);
  addLine(lines, "Name", input.name);
  addLine(lines, "Phone", input.phone);
  addLine(lines, "Email", input.email);
  addLine(lines, "Address", input.address);
  addLine(lines, "ZIP code", input.zipCode);
  addLine(lines, "Service", input.category);
  addLine(lines, "Source detail", input.sourceDetail);
  addLine(lines, "Reference ID", input.externalId);
  addLine(lines, "Status", input.status);
  addLine(lines, "Call ID", input.callId);
  addLine(lines, "Call time", input.callTime);
  addLine(lines, "Duration", input.duration);
  addLine(lines, "Call cost", input.cost);
  addLine(lines, "Forwarded to", input.forwardNumber);
  addLine(lines, "Model / serial", input.model);
  addLine(lines, "Preferred contact", input.contactMethod);
  addLine(lines, "Preferred date", input.preferredDate);
  addLine(lines, "Promo code", input.promoCode);

  if (input.message?.trim()) {
    lines.push("", "Message:", input.message.trim());
  }

  if (input.recordingUrl?.trim()) {
    lines.push("", `🎧 Recording: ${input.recordingUrl.trim()}`);
  }

  return lines.join("\n");
}
