import { computed, unref } from "vue";
import { useAtFormatting } from "./useAtFormatting";
import { mapPolicyRecordToTableRow } from "./policyListTableModel";

function normalizePolicyListStatus(value) {
  const raw = String(value || "").trim();
  if (raw === "Record") return "waiting";
  if (raw === "Pending") return "waiting";
  if (raw === "Active") return "active";
  if (raw === "Cancelled") return "cancel";
  if (raw === "Archived") return "cancel";
  return "waiting";
}

function computeRemainingDays(endDate) {
  if (!endDate) return null;
  const target = new Date(endDate);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

export function usePolicyListTableData({
  rows,
  policyStore,
  policyListLocalFilters,
  localeCode,
  policyListPageSize,
  t,
}) {
  const { formatDate, formatCurrency } = useAtFormatting(computed(() => (unref(localeCode) === "tr-TR" ? "tr" : "en")));

  const policyListMappedRows = computed(() =>
    unref(rows).map((row) => {
      const mapped = mapPolicyRecordToTableRow(row, {
        formatDate,
        formatCurrency,
        t,
      });
      const unspecified = t("unspecified");
      return {
        ...mapped,
        carrier_policy_no: row.carrier_policy_no || row.policy_no || unspecified,
        finance_secondary: `${formatCurrency(row.commission_amount || 0, row.currency || "TRY")} (${row.currency || "TRY"})`,
        customer_type_label: mapped.customer_secondary.split(" | ")[0],
        customer_tax_id: row.customer_masked_tax_id || unspecified,
        customer_birth_date: row.customer_birth_date || null,
        branch: row.branch || unspecified,
        remaining_days: computeRemainingDays(row.end_date),
      };
    }),
  );

  const policyListFilteredRows = computed(() => {
    return policyListMappedRows.value.filter((row) => {
      const matchesStatus =
        !unref(policyListLocalFilters).status ||
        normalizePolicyListStatus(row.status) === unref(policyListLocalFilters).status;

      const matchesBranch =
        !unref(policyListLocalFilters).branch || String(row.branch || "") === unref(policyListLocalFilters).branch;

      return matchesStatus && matchesBranch;
    });
  });

  const policyListTotalCount = computed(() => Number(policyStore.state.pagination.total || policyListFilteredRows.value.length));
  const policyListTotalPages = computed(() => Math.max(1, Math.ceil(policyListTotalCount.value / unref(policyListPageSize))));
  const policyListPagedRows = computed(() => policyListFilteredRows.value);
  const policyListRowsWithUrgency = computed(() =>
    policyListPagedRows.value.map((row) => ({
      ...row,
      _urgency: row.remaining_days <= 7 ? "row-critical" : row.remaining_days <= 30 ? "row-warning" : "",
    })),
  );
  const policySummary = computed(() => {
    // Prefer the full-dataset summary from the server (independent of the
    // paginated list). Fall back to the current page rows for test mocks and
    // legacy states where the summary resource did not return data.
    const serverSummary = policyStore.state.summary;
    if (serverSummary && Number.isFinite(Number(serverSummary.total))) {
      return {
        total: Number(serverSummary.total) || 0,
        active: Number(serverSummary.active) || 0,
        pending: Number(serverSummary.pending) || 0,
        cancelled: Number(serverSummary.cancelled) || 0,
        totalPremium: Number(serverSummary.total_premium_try) || 0,
      };
    }

    const rowsAll = policyListMappedRows.value;
    let active = 0;
    let pending = 0;
    let totalPremium = 0;

    rowsAll.forEach((row) => {
      const status = normalizePolicyListStatus(row.status);
      if (status === "active") active += 1;
      if (status === "waiting") pending += 1;
      totalPremium += Number(row.gwp_try || row.gross_premium || 0);
    });

    return {
      total: rowsAll.length,
      active,
      pending,
      totalPremium,
    };
  });

  return {
    policyListMappedRows,
    policyListFilteredRows,
    policyListTotalCount,
    policyListTotalPages,
    policyListPagedRows,
    policyListRowsWithUrgency,
    policySummary,
  };
}
