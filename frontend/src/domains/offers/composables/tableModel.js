function fallbackLabel(t) {
  return t("unspecified");
}

function customerDisplayLabel(row, t) {
  return row.customer_full_name || row.customer_name || row.customer || fallbackLabel(t);
}

function computeRemainingDays(validUntil) {
  if (!validUntil) return null;
  const target = new Date(validUntil);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

function mapCustomerTypeLabel(value, t) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "-") return "-";
  if (normalized === "Corporate") return t("corporate");
  if (normalized === "Individual") return t("individual");
  return normalized;
}

export function buildOfferListTableColumns(t) {
  return [
    { key: "offer_primary", secondaryKey: "offer_secondary", label: t("colOffer"), type: "stacked" },
    { key: "customer_label", secondaryKey: "customer_secondary", label: t("colCustomer"), type: "stacked" },
    { key: "validity_primary", secondaryKey: "validity_secondary", label: t("colValidity"), type: "stacked" },
    { key: "finance_primary", secondaryKey: "finance_secondary", label: t("colPremium"), type: "stacked", align: "right" },
    { key: "status", label: t("colStatus"), type: "status", domain: "offer" },
  ];
}

export function mapOfferRecordToTableRow(row, { formatDate, formatCurrency, localeCode, t }) {
  const remainingDays = computeRemainingDays(row.valid_until);
  const daysLabel = t("daysRemaining");

  return {
    ...row,
    offer_primary: row.name || fallbackLabel(t),
    offer_secondary: row.insurance_company || "-",
    customer_label: customerDisplayLabel(row, t),
    customer_secondary: `${mapCustomerTypeLabel(row.customer_customer_type, t)} | ${row.customer_masked_tax_id || "-"}`,
    validity_primary: formatDate(row.valid_until),
    validity_secondary: remainingDays != null ? `${remainingDays} ${daysLabel}` : "-",
    finance_primary: formatCurrency(row.gross_premium || 0, row.currency || "TRY"),
    finance_secondary: formatCurrency(row.commission_amount || 0, row.currency || "TRY"),
    status: row.status || "",
    remaining_days: remainingDays,
  };
}

export function mapOfferImportPreviewToTableRow(row, { formatDate, formatCurrency, localeCode }) {
  const values = row.normalized_values || {};
  const locale = localeCode || "tr";
  const customerRef = values.customer || row.customer || fallbackLabel(locale);

  return {
    id: `${row.row_number || ""}-${values.offer_date || ""}`,
    row_status: row.row_status,
    error_message: row.error_message,
    offer_primary: values.insurance_company || customerRef,
    offer_secondary: values.branch || values.sales_entity || "-",
    customer_label: customerRef,
    customer_secondary: "-",
    validity_primary: formatDate(values.valid_until || values.offer_date),
    validity_secondary: formatDate(values.offer_date),
    finance_primary: formatCurrency(values.gross_premium, values.currency || "TRY"),
    finance_secondary: formatCurrency(values.commission_amount || 0, values.currency || "TRY"),
    status: values.status || "Draft",
  };
}

export function buildOfferListPreviewColumns(t) {
  return [
    {
      key: "row_status",
      label: t("rowStatusLabel"),
      format: (value, previewRow) => {
        if (value === "ready") return t("readyLabel");
        if (value === "skipped") return t("skippedLabel");
        if (value === "error") return previewRow.error_message || t("errorLabel");
        return value || "-";
      },
    },
    ...buildOfferListTableColumns(t),
  ];
}
