import { buildPaymentSnapshot } from "./paymentsBoard/helpers";

function fallbackLabel(localeCode) {
  return String(localeCode || "").toLowerCase().startsWith("tr") ? "Belirtilmedi" : "Not provided";
}

export function buildPaymentsListTableColumns(t) {
  return [
    { key: "payment_primary", secondaryKey: "payment_secondary", label: t("colPayment"), type: "stacked" },
    { key: "customer_label", secondaryKey: "customer_secondary", label: t("colCustomer"), type: "stacked" },
    { key: "due_primary", secondaryKey: "due_secondary", label: t("colDueDate"), type: "stacked" },
    { key: "finance_primary", secondaryKey: "finance_secondary", label: t("colFinance"), type: "stacked" },
  ];
}

export function mapPaymentRecordToTableRow(row, { localeCode, t }) {
  const locale = localeCode || "tr-TR";
  const snapshot = buildPaymentSnapshot(row, null, locale);
  const unspecified = fallbackLabel(locale);
  const custType = snapshot.customer_customer_type
    ? t(snapshot.customer_customer_type) || snapshot.customer_customer_type
    : unspecified;

  return {
    ...snapshot,
    payment_primary: snapshot.payment_no || snapshot.name || unspecified,
    payment_secondary: snapshot.policy_no || snapshot.policy || unspecified,
    customer_label: snapshot.customer_full_name || snapshot.customer_name || snapshot.customer || unspecified,
    customer_secondary: `${custType} | ${snapshot.customer_masked_tax_id || unspecified}`,
    due_primary: snapshot.due_date_label || unspecified,
    due_secondary: t(snapshot.status) || snapshot.status || unspecified,
    finance_primary: snapshot.amount_label || unspecified,
    finance_secondary: `${snapshot.collected_amount_label || "0"} | ${snapshot.remaining_amount_label || "0"}`,
  };
}
