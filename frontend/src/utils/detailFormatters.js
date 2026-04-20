import { translateText } from "./i18n";

export function formatDate(locale, value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat(locale).format(new Date(value));
  } catch {
    return String(value);
  }
}

export function formatDateTime(locale, value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return String(value);
  }
}

export function formatMoney(locale, value, currency = "TRY") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "TRY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatPercent(locale, value, digits = 2) {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(Number(value || 0))}%`;
}

export function stripHtml(value) {
  return value ? String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

export function policyStatusLabel(locale, status) {
  if (!String(locale || "").toLowerCase().startsWith("tr")) return status || "-";
  if (status === "Active") return translateText("Active", locale);
  if (status === "KYT") return "KYT";
  if (status === "IPT" || status === "Cancelled") return translateText("Cancelled", locale);
  if (status === "Expired") return translateText("Expired", locale);
  return status || "-";
}

export function paymentStatusLabel(locale, status) {
  if (!String(locale || "").toLowerCase().startsWith("tr")) return status || "-";
  if (status === "Submitted") return translateText("Submitted", locale);
  if (status === "Draft") return translateText("Draft", locale);
  if (status === "Cancelled") return translateText("Cancelled", locale);
  if (status === "Paid") return translateText("Paid", locale);
  return status || "-";
}

export function installmentStatusLabel(locale, status) {
  if (!String(locale || "").toLowerCase().startsWith("tr")) return status || "-";
  if (status === "Scheduled") return translateText("Scheduled", locale);
  if (status === "Overdue") return translateText("Overdue", locale);
  if (status === "Paid") return translateText("Paid", locale);
  if (status === "Cancelled") return translateText("Cancelled", locale);
  return status || "-";
}

export function endorsementStatusLabel(locale, status) {
  if (!String(locale || "").toLowerCase().startsWith("tr")) return status || "-";
  if (status === "Applied") return translateText("Applied", locale);
  if (status === "Pending") return translateText("Pending", locale);
  if (status === "Cancelled") return translateText("Cancelled", locale);
  return status || "-";
}

export function notificationStatusLabel(locale, status) {
  if (!String(locale || "").toLowerCase().startsWith("tr")) return status || "-";
  if (status === "Queued") return translateText("Queued", locale);
  if (status === "Processing") return translateText("Processing", locale);
  if (status === "Sent") return translateText("Sent", locale);
  if (status === "Failed") return translateText("Failed", locale);
  if (status === "Dead") return translateText("Dead", locale);
  if (status === "Draft") return translateText("Draft", locale);
  return status || "-";
}

export function offerStatusTone(status) {
  const normalized = String(status || "draft").trim().toLowerCase();
  if (["accepted", "converted", "active"].includes(normalized)) return "active";
  if (["sent", "waiting", "pending"].includes(normalized)) return "waiting";
  if (["cancelled", "rejected", "expired"].includes(normalized)) return "cancel";
  return "draft";
}
