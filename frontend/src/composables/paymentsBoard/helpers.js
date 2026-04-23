import { mutedFact, pushMutedFactIf, subtleFact } from "../../utils/factItems";

function normalizePaymentOrderBy(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^modified\s+(asc|desc)$/i);
  if (match) return `\`tabAT Payment\`.modified ${match[1].toLowerCase()}`;
  return raw || "`tabAT Payment`.modified desc";
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function resourceValue(resource, fallback = null) {
  const value = resource?.data?.value ?? resource?.data;
  return value == null ? fallback : value;
}

export function formatCurrency(localeCode, value) {
  return new Intl.NumberFormat(localeCode, {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatCount(localeCode, value) {
  return new Intl.NumberFormat(localeCode).format(Number(value || 0));
}

export function formatDate(localeCode, value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isPastDate(value) {
  const date = parseDateOnly(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

export function isDueSoon(value) {
  const date = parseDateOnly(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((date.getTime() - today.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 7;
}

export function buildPaymentStatus(payment, collectedAmount, remainingAmount, isOverdue) {
  const rawStatus = String(payment?.status || "").trim();
  if (rawStatus === "Cancelled") return rawStatus;
  if (remainingAmount <= 0 && Number(payment?.amount_try || payment?.amount || 0) > 0) return "Paid";
  if (isOverdue) return "Overdue";
  if (collectedAmount > 0 && remainingAmount > 0) return "Partially Paid";
  if (rawStatus) return rawStatus;
  return "Outstanding";
}

export function buildPaymentSnapshot(payment, installmentSummary, localeCode) {
  const totalAmount = Number(payment?.amount_try || payment?.amount || 0);
  const collectedAmount = Number(installmentSummary?.paidAmount || 0);
  const remainingAmount = Math.max(totalAmount - collectedAmount, 0);
  const dueDate = String(payment?.due_date || payment?.payment_date || "").trim();
  const isOverdue = Boolean(installmentSummary?.overdue > 0) || (isPastDate(dueDate) && remainingAmount > 0);
  const status = buildPaymentStatus(payment, collectedAmount, remainingAmount, isOverdue);
  const isCollected = status === "Paid" || collectedAmount >= totalAmount;
  const isPending = !isCollected && !isOverdue && status !== "Cancelled";

  return {
    ...payment,
    status,
    totalAmount,
    collectedAmount,
    remainingAmount,
    due_date_label: formatDate(localeCode, dueDate),
    amount_label: formatCurrency(localeCode, totalAmount),
    collected_amount_label: formatCurrency(localeCode, collectedAmount),
    remaining_amount_label: formatCurrency(localeCode, remainingAmount),
    isOverdue,
    isCollected,
    isPending,
    _urgency: isOverdue ? "row-critical" : remainingAmount > 0 && isDueSoon(dueDate) ? "row-warning" : "",
  };
}

export function buildPaymentListParams({ filters, officeBranch }) {
  const params = {
    doctype: "AT Payment",
    fields: [
      "name",
      "payment_no",
      "status",
      "payment_direction",
      "payment_purpose",
      "amount",
      "amount_try",
      "payment_date",
      "due_date",
      "customer",
      "customer.full_name as customer_full_name",
      "customer.customer_type as customer_customer_type",
      "customer.masked_tax_id as customer_masked_tax_id",
      "customer.birth_date as customer_birth_date",
      "policy",
      "policy.policy_no as policy_no",
      "policy.policy_no as carrier_policy_no",
      "policy.insurance_company as insurance_company",
      "policy.branch as branch",
      "reference_no",
      "installment_count",
      "office_branch",
      "sales_entity",
    ],
    order_by: normalizePaymentOrderBy(filters.sort),
    limit_page_length: Number(filters.limit) || 24,
  };
  if (filters.direction) {
    params.filters = { payment_direction: filters.direction };
  }
  return withOfficeBranchFilter(params, officeBranch);
}

export function buildPaymentInstallmentListParams(officeBranch) {
  return withOfficeBranchFilter(
    {
      doctype: "AT Payment Installment",
      fields: ["payment", "installment_no", "installment_count", "status", "due_date", "amount_try"],
      order_by: "due_date asc",
      limit_page_length: 1000,
    },
    officeBranch
  );
}

export function currentPaymentPresetPayload(filters) {
  return {
    query: String(filters?.query || ""),
    direction: String(filters?.direction || ""),
    customerQuery: String(filters?.customerQuery || ""),
    policyQuery: String(filters?.policyQuery || ""),
    purposeQuery: String(filters?.purposeQuery || ""),
    sort: String(filters?.sort || "modified desc"),
    limit: Number(filters?.limit || 24) || 24,
  };
}

export function setPaymentFilterStateFromPayload(filters, payload) {
  filters.query = String(payload?.query || "");
  filters.direction = String(payload?.direction || "");
  filters.customerQuery = String(payload?.customerQuery || "");
  filters.policyQuery = String(payload?.policyQuery || "");
  filters.purposeQuery = String(payload?.purposeQuery || "");
  filters.sort = String(payload?.sort || "modified desc");
  filters.limit = Number(payload?.limit || 24) || 24;
}

export function resetPaymentFilterState(paymentStore) {
  paymentStore?.resetFilters?.();
}

export function withOfficeBranchFilter(params, officeBranch) {
  if (!officeBranch) return params;
  return {
    ...params,
    filters: {
      ...(params.filters || {}),
      office_branch: officeBranch,
    },
  };
}

export function paymentIdentityFacts(t, payment) {
  return [mutedFact("purpose", t("purpose"), payment?.payment_purpose || "-", "at-clamp-2"), subtleFact("record", t("recordId"), payment?.name || "-")];
}

export function paymentDetailFacts(t, payment, installmentSummary) {
  const items = [
    mutedFact("date", t("date"), payment?.payment_date || "-"),
    mutedFact("customer", t("customer"), payment?.customer_label || payment?.customer_full_name || payment?.customer_name || payment?.customer || "-"),
  ];
  pushMutedFactIf(items, Boolean(payment?.policy), "policy", t("policy"), payment?.policy);
  const installmentCount = Number(installmentSummary?.total || payment?.installment_count || 0);
  pushMutedFactIf(items, installmentCount > 1, "installments", t("installments"), `${installmentCount}`);
  pushMutedFactIf(items, Number(installmentSummary?.paid || 0) > 0, "paid_installments", t("paidInstallments"), `${installmentSummary?.paid}/${installmentCount || installmentSummary?.paid}`);
  pushMutedFactIf(items, Number(installmentSummary?.overdue || 0) > 0, "overdue_installments", t("overdueInstallments"), `${installmentSummary?.overdue}`);
  pushMutedFactIf(items, Boolean(installmentSummary?.nextDue), "next_due", t("nextInstallmentDue"), installmentSummary?.nextDue);
  return items;
}
