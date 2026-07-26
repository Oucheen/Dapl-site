export function isPlaceholderCustomerEmail(value: string | null | undefined) {
  return Boolean(value?.trim().toLowerCase().endsWith("@daplappliance.local"));
}

export function getDisplayCustomerEmail(value: string | null | undefined) {
  const email = value?.trim() ?? "";

  return email && !isPlaceholderCustomerEmail(email) ? email : "";
}
