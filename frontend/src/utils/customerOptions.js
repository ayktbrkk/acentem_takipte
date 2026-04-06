function cleanText(value) {
  return String(value || "").trim();
}

export function getCustomerOptionLabel(row) {
  const fullName = cleanText(row?.full_name);
  const customerName = cleanText(row?.customer_name);
  const name = cleanText(row?.name);
  const value = cleanText(row?.value);
  return fullName || customerName || name || value;
}
