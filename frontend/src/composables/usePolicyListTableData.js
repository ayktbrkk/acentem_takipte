import { computed } from "vue";

import { mutedFact, subtleFact } from "../utils/factItems";

function normalizePolicyListStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (["active"].includes(raw)) return "active";
  if (["kyt", "ipt", "waiting"].includes(raw)) return "waiting";
  if (["cancel", "cancelled", "expired"].includes(raw)) return "cancel";
  return raw;
}

export function usePolicyListTableData({
  rows,
  filters,
  pagination,
  policyListSearchQuery,
  policyListLocalFilters,
  localeCode,
  t,
}) {
  const policyListColumns = [
    { key: "name", label: "Poliçe No", width: "160px", type: "mono" },
    { key: "customer", label: "Müşteri", width: "220px" },
    { key: "branch", label: "Branş", width: "160px" },
    { key: "gross_premium", label: "Brüt Prim", width: "120px", type: "amount", align: "right" },
    { key: "status", label: "Durum", width: "100px", type: "status" },
    { key: "remaining_days", label: "Kalan Gün", width: "100px", type: "urgency", align: "right" },
    { key: "end_date", label: "Bitiş Tarihi", width: "120px", type: "date" },
  ];

  const policyListFilterConfig = computed(() => {
    const branchOptions = [...new Set(rows.value.map((row) => String(row.branch || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, localeCode.value))
      .map((value) => ({ value, label: value }));
    return [
      {
        key: "status",
        label: "Durum",
        options: [
          { value: "active", label: "Aktif" },
          { value: "draft", label: "Taslak" },
          { value: "cancel", label: "İptal" },
          { value: "waiting", label: "Bekliyor" },
        ],
      },
      {
        key: "branch",
        label: "Branş",
        options: branchOptions,
      },
    ];
  });

  const policyListMappedRows = computed(() =>
    rows.value.map((row) => ({
      ...row,
      name: row.policy_no || row.name,
      branch: row.branch || "-",
      remaining_days: computeRemainingDays(row.end_date),
    }))
  );

  const policyListFilteredRows = computed(() => {
    const q = policyListSearchQuery.value.trim().toLocaleLowerCase(localeCode.value);
    return policyListMappedRows.value.filter((row) => {
      const matchesQuery =
        !q ||
        [row.name, row.customer, row.branch, row.status]
          .map((value) => String(value || "").toLocaleLowerCase(localeCode.value))
          .some((value) => value.includes(q));

      const matchesStatus =
        !policyListLocalFilters.status ||
        normalizePolicyListStatus(row.status) === policyListLocalFilters.status;

      const matchesBranch = !policyListLocalFilters.branch || String(row.branch || "") === policyListLocalFilters.branch;

      return matchesQuery && matchesStatus && matchesBranch;
    });
  });

  const policyListTotalCount = computed(() => Number(pagination.total || policyListFilteredRows.value.length));
  const policyListTotalPages = computed(() => Math.max(1, Math.ceil(policyListTotalCount.value / policyListPageSize())));
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
      if (status === "waiting" || status === "draft") pending += 1;
      totalPremium += Number(row.gwp_try || row.gross_premium || 0);
    });

    return {
      total: rowsAll.length,
      active,
      pending,
      totalPremium,
    };
  });

  function policyListPageSize() {
    return Math.max(1, Number(pagination.pageLength || 20));
  }

  function policyIdentityFacts(row) {
    return [
      subtleFact("record", t("recordNo"), row?.name || "-"),
      subtleFact("policyNo", t("carrierPolicyNo"), row?.policy_no || "-"),
    ];
  }

  function policyDetailsFacts(row) {
    return [
      mutedFact("customer", t("colCustomer"), row?.customer || "-"),
      mutedFact("company", t("colCompany"), row?.insurance_company || "-"),
      mutedFact("endDate", t("colEndDate"), formatDate(row?.end_date)),
    ];
  }

  function policyPremiumFacts(row) {
    return [
      mutedFact("gross", t("colGross"), formatCurrency(row?.gross_premium, row?.currency || "TRY")),
      mutedFact(
        "commission",
        t("colCommission"),
        formatCurrency(row?.commission_amount || row?.commission, row?.currency || "TRY")
      ),
      mutedFact("gwpTry", t("colGwpTry"), formatCurrency(row?.gwp_try, "TRY")),
    ];
  }

  function computeRemainingDays(endDate) {
    if (!endDate) return null;
    const target = new Date(endDate);
    if (Number.isNaN(target.getTime())) return null;
    return Math.ceil((target.getTime() - Date.now()) / 86400000);
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat(localeCode.value).format(new Date(value));
  }

  function formatCurrency(value, currency) {
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency: currency || "TRY",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function formatCount(value) {
    return Number(value || 0).toLocaleString(localeCode.value);
  }

  return {
    policyListColumns,
    policyListFilterConfig,
    policyListMappedRows,
    policyListFilteredRows,
    policyListTotalCount,
    policyListTotalPages,
    policyListPagedRows,
    policyListRowsWithUrgency,
    policySummary,
    policyIdentityFacts,
    policyDetailsFacts,
    policyPremiumFacts,
    computeRemainingDays,
    formatDate,
    formatCurrency,
    formatCount,
  };
}
