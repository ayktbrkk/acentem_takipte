function normalizeValue(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || ["unknown", "none", "null", "undefined"].includes(normalized.toLowerCase())) {
    return "";
  }
  return normalized;
}

export function buildCustomerListTableColumns(t) {
  return [
    { key: "identity_primary", secondaryKey: "identity_secondary", label: t("colIdentity"), type: "stacked" },
    { key: "contact_primary", secondaryKey: "contact_secondary", label: t("colContact"), type: "stacked" },
    { key: "personal_primary", secondaryKey: "personal_secondary", label: t("colPersonal"), type: "stacked" },
    { key: "mgmt_primary", secondaryKey: "mgmt_secondary", label: t("colManagement"), type: "stacked" },
  ];
}

function normalizeGender(value, t, unspecified) {
  if (value === "Male") return t("genderMale");
  if (value === "Female") return t("genderFemale");
  if (value === "Other") return t("genderOther");
  return unspecified;
}

function normalizeMaritalStatus(value, t, unspecified) {
  if (value === "Single") return t("maritalSingle");
  if (value === "Married") return t("maritalMarried");
  if (value === "Divorced") return t("maritalDivorced");
  if (value === "Widowed") return t("maritalWidowed");
  return unspecified;
}

export function mapCustomerRecordToTableRow(row, { t, localeCode }) {
  const unspecified = t("unspecified");
  const customerType = row.customer_type === "Corporate" ? t("corporate") : t("individual");
  const maritalStatus = normalizeValue(row.marital_status);
  const gender = normalizeValue(row.gender);
  const birthDate = normalizeValue(row.birth_date);
  const occupation = normalizeValue(row.occupation) || normalizeValue(row.job_title);
  const consentKey = `status_${String(row.consent_status || "Unknown").toLowerCase()}`;

  return {
    ...row,
    identity_primary: row.full_name || unspecified,
    identity_secondary: `${row.name || unspecified} | ${customerType} | ${row.tax_id || unspecified}`,
    contact_primary: row.phone || unspecified,
    contact_secondary: row.email || unspecified,
    personal_primary: maritalStatus
      ? normalizeMaritalStatus(maritalStatus, t, unspecified)
      : occupation || unspecified,
    personal_secondary: `${gender ? normalizeGender(gender, t, unspecified) : unspecified} | ${birthDate || unspecified}`,
    mgmt_primary:
      normalizeValue(row.assigned_agent) ||
      normalizeValue(row.sales_entity) ||
      normalizeValue(row.segment) ||
      normalizeValue(row.owner) ||
      unspecified,
    mgmt_secondary: t(consentKey) || row.consent_status || unspecified,
    customer_type_label: customerType,
    consent_status_label: t(consentKey) || row.consent_status || unspecified,
  };
}

export function mapCustomerImportPreviewToTableRow(row, { t }) {
  const values = row.normalized_values || {};
  const unspecified = t("unspecified");
  const customerType = values.customer_type === "Corporate" ? t("corporate") : t("individual");

  return {
    id: `${row.row_number || ""}-${values.tax_id || ""}`,
    row_status: row.row_status,
    error_message: row.error_message,
    identity_primary: values.full_name || unspecified,
    identity_secondary: `${values.tax_id || unspecified} | ${customerType}`,
    contact_primary: values.phone || unspecified,
    contact_secondary: values.email || unspecified,
    personal_primary: customerType,
    personal_secondary: unspecified,
    mgmt_primary: unspecified,
    mgmt_secondary: unspecified,
  };
}

export function buildCustomerListPreviewColumns(t) {
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
    ...buildCustomerListTableColumns(t),
  ];
}
