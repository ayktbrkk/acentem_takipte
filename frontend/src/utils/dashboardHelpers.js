export function normalizeResourcePayload(payload) {
  return payload?.message || payload || {};
}

export function cstr(value) {
  return String(value ?? "").trim();
}

export function toApiDate(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeDashboardTab(value) {
  const candidate = String(value || "").toLowerCase();
  if (!candidate || candidate === "overview" || candidate === "operations") return "daily";
  return ["daily", "sales", "collections", "renewals"].includes(candidate) ? candidate : "daily";
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getDateRange(days) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - days);
  return { from, to };
}

export function getPreviousDateRange(days) {
  const current = getDateRange(days);
  const to = new Date(current.from);
  to.setDate(to.getDate() - 1);
  const from = new Date(to);
  from.setDate(to.getDate() - days);
  return { from, to };
}

export function withDashboardOfficeBranchFilter(branchStore, params) {
  const officeBranch = branchStore?.requestBranch;
  if (!officeBranch) {
    return params;
  }
  const next = { ...(params || {}) };
  next.office_branch = officeBranch;
  const filters = { ...(next.filters || {}) };
  filters.office_branch = officeBranch;
  next.filters = filters;
  return next;
}

export function buildInitialKpiParams(branchStore, selectedRange) {
  const range = getDateRange(selectedRange.value);
  return withDashboardOfficeBranchFilter(branchStore, {
    filters: {
      from_date: toApiDate(range.from),
      to_date: toApiDate(range.to),
      period_comparison: "previous_period",
      months: 6,
    },
  });
}

export function buildInitialTabPayloadParams(branchStore, selectedRange, tabKey = "daily") {
  const normalizedTab = normalizeDashboardTab(tabKey);
  const currentRange = getDateRange(selectedRange.value);
  const previousRange = getPreviousDateRange(selectedRange.value);
  return withDashboardOfficeBranchFilter(branchStore, {
    tab: normalizedTab,
    filters: {
      from_date: toApiDate(currentRange.from),
      to_date: toApiDate(currentRange.to),
      compare_from_date: toApiDate(previousRange.from),
      compare_to_date: toApiDate(previousRange.to),
      months: 6,
    },
  });
}

export function buildInitialClaimListParams(branchStore) {
  return withDashboardOfficeBranchFilter(branchStore, {
    doctype: "AT Claim",
    fields: [
      "name",
      "claim_no",
      "customer",
      "customer.full_name as customer_full_name",
      "policy",
      "claim_status",
      "approved_amount",
      "paid_amount",
      "modified",
    ],
    order_by: "modified desc",
    limit_page_length: 12,
  });
}

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
