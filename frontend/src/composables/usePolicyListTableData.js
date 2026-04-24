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

function mapCustomerTypeLabel(value, localeCode) {
  const normalized = String(value || "").trim().toLowerCase();
  const isTr = String(localeCode || "").toLowerCase().startsWith("tr");
  if (normalized === "corporate" || normalized === "kurumsal") {
    return isTr ? "Kurumsal" : "Corporate";
  }
  if (normalized === "individual" || normalized === "bireysel") {
    return isTr ? "Bireysel" : "Individual";
  }
  return "-";
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
      name: row.record_name || row.name,
      carrier_policy_no: row.carrier_policy_no || row.policy_no || "-",
      customer_label: row.customer_full_name || row.customer_name || row.customer || "-",
      customer_secondary: `${mapCustomerTypeLabel(row.customer_customer_type, unref(localeCode))} | ${row.customer_tax_id || "-"}`,
      policy_primary: row.record_name || row.name,
      policy_secondary: row.policy_no || "-",
      product_primary: row.branch || "-",
      product_secondary: row.insurance_company || "-",
      vade_primary: row.end_date || "-",
      vade_secondary: row.issue_date || "-",
      finance_primary: row.gross_premium || 0,
      finance_secondary: `${row.commission_amount || 0} (${row.currency || "TRY"})`,
      customer_type_label: mapCustomerTypeLabel(row.customer_customer_type, unref(localeCode)),
      customer_tax_id: row.customer_masked_tax_id || "-",
      customer_birth_date: row.customer_birth_date || null,
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
        [row.name, row.carrier_policy_no, row.customer_label, row.customer, row.branch, row.status]
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
