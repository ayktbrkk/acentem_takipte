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
  if (locale !== "tr") return status || "-";
  if (status === "Active") return "Aktif";
  if (status === "KYT") return "KYT";
  if (status === "IPT" || status === "Cancelled") return "İptal";
  if (status === "Expired") return "Süresi Doldu";
  return status || "-";
}

export function paymentStatusLabel(locale, status) {
  if (locale !== "tr") return status || "-";
  if (status === "Submitted") return "Gönderildi";
  if (status === "Draft") return "Taslak";
  if (status === "Cancelled") return "İptal";
  if (status === "Paid") return "Ödendi";
  return status || "-";
}

export function installmentStatusLabel(locale, status) {
  if (locale !== "tr") return status || "-";
  if (status === "Scheduled") return "Planlandı";
  if (status === "Overdue") return "Gecikti";
  if (status === "Paid") return "Ödendi";
  if (status === "Cancelled") return "İptal";
  return status || "-";
}

export function endorsementStatusLabel(locale, status) {
  if (locale !== "tr") return status || "-";
  if (status === "Applied") return "Uygulandı";
  if (status === "Pending") return "Beklemede";
  if (status === "Cancelled") return "İptal";
  return status || "-";
}

export function notificationStatusLabel(locale, status) {
  if (locale !== "tr") return status || "-";
  if (status === "Queued") return "Kuyrukta";
  if (status === "Processing") return "İşleniyor";
  if (status === "Sent") return "Gönderildi";
  if (status === "Failed") return "Başarısız";
  if (status === "Dead") return "Kalıcı Hata";
  if (status === "Draft") return "Taslak";
  return status || "-";
}

export function offerStatusTone(status) {
  const normalized = String(status || "draft").trim().toLowerCase();
  if (["accepted", "converted", "active"].includes(normalized)) return "active";
  if (["sent", "waiting", "pending"].includes(normalized)) return "waiting";
  if (["cancelled", "rejected", "expired"].includes(normalized)) return "cancel";
  return "draft";
}

