export function applyTCMask(value) {
  if (!value) return "";
  // TC ID is 11 digits
  return value.replace(/\D/g, "").slice(0, 11);
}

export function applyPhoneMask(value) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  
  if (digits.length === 0) return "";
  
  let formatted = "";
  if (digits.length > 0) {
    formatted = "(" + digits.slice(0, 3);
  }
  if (digits.length >= 4) {
    formatted += ") " + digits.slice(3, 6);
  }
  if (digits.length >= 7) {
    formatted += " " + digits.slice(6, 8);
  }
  if (digits.length >= 9) {
    formatted += " " + digits.slice(8, 10);
  }
  
  return formatted;
}

export function stripMask(value) {
  return value ? value.replace(/\D/g, "") : "";
}
