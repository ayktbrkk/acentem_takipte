export function normalizeIdentityNumber(value) {
  return String(value || "").replace(/\D+/g, "");
}

export function normalizeCustomerType(value, identityNumber = "") {
  const normalized = String(value || "").trim();
  if (normalized === "Individual" || normalized === "Corporate") return normalized;
  return normalizeIdentityNumber(identityNumber).length === 10 ? "Corporate" : "Individual";
}

export function isValidTckn(value) {
  const digits = normalizeIdentityNumber(value);
  if (digits.length !== 11 || digits.startsWith("0")) return false;
  const list = digits.split("").map((item) => Number(item));
  const tenth = ((list[0] + list[2] + list[4] + list[6] + list[8]) * 7 - (list[1] + list[3] + list[5] + list[7])) % 10;
  const eleventh = list.slice(0, 10).reduce((sum, item) => sum + item, 0) % 10;
  return list[9] === tenth && list[10] === eleventh;
}

export function hasSelectedQuickCustomer(value) {
  return String(value || "").trim().length > 0;
}
