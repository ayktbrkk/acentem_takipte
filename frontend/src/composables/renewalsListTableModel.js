function fallbackLabel(localeCode) {
  return String(localeCode || "").toLowerCase().startsWith("tr") ? "Belirtilmedi" : "Not provided";
}

function getRenewalDaysUntilDue(value) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

function getRenewalPriorityLabel(task, daysUntilDue, t) {
  if (task.status === "Cancelled") return t("priorityCancelled");
  if (task.status === "Done") return t("priorityDone");
  if (daysUntilDue == null) return t("priorityUnknown");
  if (daysUntilDue <= 7) return t("priorityCritical");
  if (daysUntilDue <= 30) return t("prioritySoon");
  return t("priorityNormal");
}

export function buildRenewalsListTableColumns(t) {
  return [
    { key: "policy_label", label: t("colPolicy") },
    { key: "customer_label", label: t("colCustomer") },
    { key: "due_date_label", label: t("colDueDate") },
    { key: "status", label: t("colBoardStatus"), type: "status", domain: "renewal" },
    { key: "priority_label", label: t("colPriority") },
  ];
}

export function mapRenewalRecordToTableRow(row, { formatDate, localeCode, t }) {
  const locale = localeCode || "tr";
  const unspecified = fallbackLabel(locale);
  const dueDate = row.due_date || row.renewal_date;
  const daysUntilDue = getRenewalDaysUntilDue(dueDate);

  return {
    ...row,
    policy_label: row.policy_policy_no || row.policy || unspecified,
    customer_label: row.customer_full_name || row.customer || unspecified,
    due_date_label: formatDate(dueDate) || unspecified,
    status: row.status || "",
    priority_label: getRenewalPriorityLabel(row, daysUntilDue, t),
  };
}
