function fallbackLabel(localeCode) {
  return String(localeCode || "").toLowerCase().startsWith("tr") ? "Belirtilmedi" : "Not provided";
}

export function buildClaimsListTableColumns(t) {
  return [
    { key: "claim_primary", secondaryKey: "claim_secondary", label: t("colClaim"), type: "stacked" },
    { key: "customer_label", label: t("colCustomer") },
    { key: "type_primary", secondaryKey: "type_secondary", label: t("colDetail"), type: "stacked" },
    { key: "finance_primary", secondaryKey: "finance_secondary", label: t("colFinance"), type: "stacked" },
    { key: "incident_date_label", label: t("colIncidentDate") },
    { key: "claim_status", label: t("colBoardStatus"), type: "status", domain: "claim" },
  ];
}

export function mapClaimRecordToTableRow(row, { formatDate, formatCurrency, localeCode, translateValue }) {
  const locale = localeCode || "tr";
  const unspecified = fallbackLabel(locale);
  const format = (value) => (translateValue ? translateValue(value) : value) || unspecified;

  return {
    ...row,
    customer_label: row.customer_full_name || row.customer_name || row.customer || unspecified,
    incident_date_label: formatDate(row.incident_date) || unspecified,
    claim_primary: row.claim_no || row.name || unspecified,
    claim_secondary: row.policy_no || row.policy || unspecified,
    type_primary: format(row.claim_type),
    type_secondary: format(row.branch || row.office_branch),
    finance_primary: formatCurrency(row.estimated_amount || row.approved_amount || 0),
    finance_secondary: formatCurrency(row.paid_amount || 0),
    claim_status: row.claim_status || row.status || "",
  };
}
