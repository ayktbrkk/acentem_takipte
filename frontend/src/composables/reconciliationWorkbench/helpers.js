import { getSourcePanelConfig } from "../../utils/sourcePanel";
import { navigateToSameOriginPath } from "../../utils/safeNavigation";
import { subtleFact, mutedFact } from "../../utils/factItems";

export function isPermissionDeniedError(error) {
  const status = Number(
    error?.statusCode ?? error?.status ?? error?.httpStatus ?? error?.response?.status ?? 0
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

export function formatMoney(localeCode, value) {
  try {
    return new Intl.NumberFormat(localeCode, {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return String(value ?? 0);
  }
}

export function sourcePanelUrl(row) {
  return getSourcePanelConfig(row?.source_doctype, row?.source_name)?.url || "";
}

export function canOpenSourcePanel(row) {
  return Boolean(sourcePanelUrl(row));
}

export function openSourcePanel(row) {
  const url = sourcePanelUrl(row);
  if (!url) return;
  navigateToSameOriginPath(url);
}

export function sourcePanelLabel(t, row) {
  const labelKey = getSourcePanelConfig(row?.source_doctype, row?.source_name)?.labelKey;
  return labelKey ? t(labelKey) : t("openPanel");
}

export function mismatchTypeLabel(t, type) {
  if (type === "Amount") return t("mismatchAmount");
  if (type === "Currency") return t("mismatchCurrency");
  if (type === "Missing External") return t("mismatchMissingExternal");
  if (type === "Missing Local") return t("mismatchMissingLocal");
  if (type === "Status") return t("mismatchStatus");
  if (type === "Other") return t("mismatchOther");
  return type || "-";
}

export function sourceRowFacts(t, row) {
  return [subtleFact("externalRef", t("externalRef"), row?.accounting?.external_ref || "-")];
}

export function mismatchTypeFacts(t, row) {
  return [mutedFact("mismatchType", t("type"), mismatchTypeLabel(t, row?.mismatch_type))];
}

export function normalizeReconciliationStatus(status, difference) {
  const normalizedStatus = String(status || "");
  if (normalizedStatus === "Resolved") return "Matched";
  if (normalizedStatus === "Ignored") return "Cancelled";
  if (normalizedStatus === "Open" && Math.abs(Number(difference || 0)) > 0) return "Mismatch";
  if (normalizedStatus === "Open") return "Pending";
  return normalizedStatus || "Pending";
}

export function deriveReconciliationPeriod(localeCode, row) {
  const rawValue =
    row?.resolved_on ||
    row?.posting_date ||
    row?.modified ||
    row?.creation ||
    row?.accounting?.posting_date ||
    "";
  const trimmedValue = String(rawValue || "").trim();
  if (!trimmedValue) return "-";
  const parsedDate = new Date(trimmedValue);
  if (Number.isNaN(parsedDate.getTime())) return trimmedValue.slice(0, 7);
  return new Intl.DateTimeFormat(localeCode, { month: "short", year: "numeric" }).format(parsedDate);
}

export function buildReconciliationRowActions({ row, t, openReconciliationDetail, openReconciliationActionDialog }) {
  const actions = [];
  actions.push({
    key: `${row?.name}-detail`,
    label: "Kayıt Detayı",
    variant: "primary",
    onClick: () => openReconciliationDetail(row),
  });
  if (String(row?.status || "") === "Open") {
    actions.push({
      key: `${row?.name}-match`,
      label: t("resolve"),
      variant: "outline",
      onClick: () => openReconciliationActionDialog(row, "Matched"),
    });
    actions.push({
      key: `${row?.name}-ignore`,
      label: t("ignore"),
      variant: "outline",
      onClick: () => openReconciliationActionDialog(row, "Ignored"),
    });
  }
  actions.push({
    key: `${row?.name}-note`,
    label: t("addNote"),
    variant: "outline",
    onClick: () => openReconciliationActionDialog(row, "Note"),
  });
  return actions;
}
