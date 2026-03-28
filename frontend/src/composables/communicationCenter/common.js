export function isPermissionDeniedError(error) {
  const status = Number(
    error?.statusCode ??
      error?.status ??
      error?.httpStatus ??
      error?.response?.status ??
      0
  );
  const text = String(error?.message || error?.messages?.join(" ") || error?.exc_type || "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    text.includes("permission") ||
    text.includes("not permitted") ||
    text.includes("not authorized")
  );
}

export function statusLabel(t, status) {
  if (status === "Queued") return t("queued");
  if (status === "Processing") return t("processing");
  if (status === "Sent") return t("sent");
  if (status === "Failed") return t("failed");
  if (status === "Dead") return t("dead");
  return status || "-";
}

export function channelLabel(t, channel) {
  if (channel === "SMS") return t("sms");
  if (channel === "Email") return t("email");
  if (channel === "WHATSAPP") return t("whatsapp");
  return channel || "-";
}

export function referenceTypeLabel(t, doctype) {
  const value = String(doctype || "").trim();
  if (value === "AT Lead") return t("referenceLead");
  if (value === "AT Offer") return t("referenceOffer");
  if (value === "AT Policy") return t("referencePolicy");
  if (value === "AT Customer") return t("referenceCustomer");
  if (value === "AT Claim") return t("referenceClaim");
  if (value === "AT Payment") return t("referencePayment");
  if (value === "AT Renewal Task") return t("referenceRenewalTask");
  if (value === "AT Accounting Entry") return t("referenceAccountingEntry");
  if (value === "AT Reconciliation Item") return t("referenceReconciliationItem");
  return value || "-";
}

export function statusClass(status) {
  if (status === "Sent") return "bg-emerald-100 text-emerald-700";
  if (status === "Queued") return "bg-sky-100 text-sky-700";
  if (status === "Processing") return "bg-sky-100 text-sky-700";
  if (status === "Failed") return "bg-amber-100 text-amber-700";
  if (status === "Dead") return "bg-slate-100 text-slate-700";
  return "bg-slate-200 text-slate-700";
}
