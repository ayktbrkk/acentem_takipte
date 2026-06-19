export function buildPolicyListTableColumns(t) {
  return [
    { key: "policy_primary", secondaryKey: "policy_secondary", label: t("colPolicy"), type: "stacked" },
    { key: "customer_label", secondaryKey: "customer_secondary", label: t("colCustomer"), type: "stacked" },
    { key: "product_primary", secondaryKey: "product_secondary", label: t("colProduct"), type: "stacked" },
    { key: "vade_primary", secondaryKey: "vade_secondary", label: t("colVade"), type: "stacked" },
    { key: "finance_primary", secondaryKey: "finance_secondary", label: t("colPremium"), type: "stacked", align: "right" },
    { key: "status", label: t("colStatus"), type: "status", domain: "policy" },
  ];
}

function mapCustomerTypeLabel(value, localeCode) {
  const normalized = String(value || "").trim().toLowerCase();
  const isTr = String(localeCode || "").toLowerCase().startsWith("tr");
  if (normalized === "corporate" || normalized === "kurumsal") {
    return isTr ? "Kurumsal" : "Corporate";
  }
  if (normalized === "individual" || normalized === "bireysel") {
    return isTr ? "Bireysel" : "Individual";
  }
  return isTr ? "Belirtilmedi" : "Not provided";
}

function fallbackLabel(localeCode) {
  return String(localeCode || "").toLowerCase().startsWith("tr") ? "Belirtilmedi" : "Not provided";
}

export function mapPolicyRecordToTableRow(row, { formatDate, formatCurrency, localeCode }) {
  const locale = localeCode || "en";
  return {
    ...row,
    name: row.record_name || row.name,
    policy_primary: row.record_name || row.name || row.policy_no || fallbackLabel(locale),
    policy_secondary: row.policy_no || fallbackLabel(locale),
    customer_label: row.customer_full_name || row.customer_name || row.customer || fallbackLabel(locale),
    customer_secondary: `${mapCustomerTypeLabel(row.customer_customer_type, locale)} | ${row.customer_masked_tax_id || fallbackLabel(locale)}`,
    product_primary: row.branch || fallbackLabel(locale),
    product_secondary: row.insurance_company || fallbackLabel(locale),
    vade_primary: formatDate(row.end_date),
    vade_secondary: formatDate(row.issue_date),
    finance_primary: formatCurrency(row.gross_premium, row.currency || "TRY"),
    finance_secondary: formatCurrency(row.commission_amount || 0, row.currency || "TRY"),
    status: row.status || "",
  };
}

export function mapPolicyImportPreviewToTableRow(row, { formatDate, formatCurrency, localeCode }) {
  const values = row.normalized_values || {};
  const locale = localeCode || "en";
  const customerRef = values.customer || row.customer || fallbackLabel(locale);
  return {
    id: `${row.row_number || ""}-${values.policy_no || ""}`,
    row_status: row.row_status,
    error_message: row.error_message,
    policy_primary: values.policy_no || fallbackLabel(locale),
    policy_secondary: customerRef,
    customer_label: customerRef,
    customer_secondary: fallbackLabel(locale),
    product_primary: values.branch || fallbackLabel(locale),
    product_secondary: values.insurance_company || fallbackLabel(locale),
    vade_primary: formatDate(values.end_date),
    vade_secondary: formatDate(values.issue_date),
    finance_primary: formatCurrency(values.gross_premium, values.currency || "TRY"),
    finance_secondary: formatCurrency(values.commission_amount || 0, values.currency || "TRY"),
    status: values.status || "Active",
  };
}

export function buildPolicyListPreviewColumns(t) {
  return [
    {
      key: "row_status",
      label: t("rowStatusLabel"),
      format: (value, row) => {
        if (value === "ready") return t("readyLabel");
        if (value === "skipped") return t("skippedLabel");
        if (value === "error") return row.error_message || t("errorLabel");
        return value || "-";
      },
    },
    ...buildPolicyListTableColumns(t),
  ];
}
