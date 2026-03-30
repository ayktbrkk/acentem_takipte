import { computed, unref } from "vue";

function normalizePolicyListStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (["active"].includes(raw)) return "active";
  if (["kyt", "ipt", "waiting"].includes(raw)) return "waiting";
  if (["cancel", "cancelled", "expired"].includes(raw)) return "cancel";
  return raw;
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
  policyListSearchQuery,
  policyListLocalFilters,
  localeCode,
  policyListPageSize,
}) {
  const policyListMappedRows = computed(() =>
    unref(rows).map((row) => ({
      ...row,
      name: row.policy_no || row.name,
      branch: row.branch || "-",
      remaining_days: computeRemainingDays(row.end_date),
    }))
  );

  const policyListFilteredRows = computed(() => {
    const q = String(unref(policyListSearchQuery) || "")
      .trim()
      .toLocaleLowerCase(unref(localeCode));
    return policyListMappedRows.value.filter((row) => {
      const matchesQuery =
        !q ||
        [row.name, row.customer, row.branch, row.status]
          .map((value) => String(value || "").toLocaleLowerCase(unref(localeCode)))
          .some((value) => value.includes(q));

      const matchesStatus =
        !unref(policyListLocalFilters).status ||
        normalizePolicyListStatus(row.status) === unref(policyListLocalFilters).status;

      const matchesBranch =
        !unref(policyListLocalFilters).branch || String(row.branch || "") === unref(policyListLocalFilters).branch;

      return matchesQuery && matchesStatus && matchesBranch;
    });
  });

  const policyListTotalCount = computed(() => Number(policyStore.state.pagination.total || policyListFilteredRows.value.length));
  const policyListTotalPages = computed(() => Math.max(1, Math.ceil(policyListTotalCount.value / unref(policyListPageSize))));
  const policyListPagedRows = computed(() => policyListFilteredRows.value);
  const policyListRowsWithUrgency = computed(() =>
    policyListPagedRows.value.map((row) => ({
      ...row,
      _urgency: row.remaining_days <= 7 ? "row-critical" : row.remaining_days <= 30 ? "row-warning" : "",
    }))
  );
  const policySummary = computed(() => {
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
