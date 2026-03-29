import { computed, unref } from "vue";

function computeOfferRemainingDays(validUntil) {
  if (!validUntil) return null;
  const target = new Date(validUntil);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

export function useOfferBoardListState({
  localeCode,
  offerCompanies,
  offerListFilters,
  offerListPagination,
  offerListResource,
  offerListRows,
  offerStatusOptions,
  t,
}) {
  const offerListTotal = computed(() => Number(unref(offerListPagination)?.total || 0));
  const offerListTotalPages = computed(() =>
    Math.max(1, Math.ceil((offerListTotal.value || 0) / unref(offerListPagination).pageLength)),
  );
  const offerListHasNextPage = computed(() => unref(offerListPagination).page < offerListTotalPages.value);
  const offerListStartRow = computed(() => {
    if (!offerListTotal.value) return 0;
    return (unref(offerListPagination).page - 1) * unref(offerListPagination).pageLength + 1;
  });
  const offerListEndRow = computed(() => {
    if (!offerListTotal.value) return 0;
    return Math.min(offerListTotal.value, unref(offerListPagination).page * unref(offerListPagination).pageLength);
  });
  const pagedOfferRows = computed(() => unref(offerListRows));
  const isOfferListInitialLoading = computed(() => unref(offerListResource).loading && offerListRows.value.length === 0);
  const offerActiveFilterCount = computed(() =>
    [
      offerListFilters.query,
      offerListFilters.insurance_company,
      offerListFilters.status,
      offerListFilters.valid_until,
      offerListFilters.branch,
      offerListFilters.actionable_only ? "1" : "",
      offerListFilters.gross_min,
      offerListFilters.gross_max,
    ].filter((value) => String(value ?? "").trim() !== "").length,
  );

  const offerListSearchQuery = computed({
    get: () => String(offerListFilters.query || ""),
    set: (value) => {
      offerListFilters.query = String(value || "");
    },
  });

  const offerListColumns = [
    { key: "name", label: "Teklif No", width: "160px", type: "mono" },
    { key: "customer", label: "Müşteri", width: "220px" },
    { key: "insurance_company", label: "Sigorta Şirketi", width: "200px" },
    { key: "status", label: "Durum", width: "120px", type: "status" },
    { key: "gross_premium", label: "Brüt Prim", width: "120px", type: "amount", align: "right" },
    { key: "remaining_days", label: "Kalan Gün", width: "100px", type: "urgency", align: "right" },
    { key: "valid_until", label: "Geçerlilik", width: "120px", type: "date" },
  ];

  const offerListFilterConfig = computed(() => [
    {
      key: "insurance_company",
      label: "Sigorta Şirketi",
      options: offerCompanies.value.map((company) => ({ value: company, label: company })),
    },
    {
      key: "status",
      label: "Durum",
      options: offerStatusOptions.value.map((item) => ({ value: item.value, label: item.label })),
    },
  ]);

  const offerListRowsWithUrgency = computed(() =>
    pagedOfferRows.value.map((row) => {
      const remainingDays = computeOfferRemainingDays(row.valid_until);
      return {
        ...row,
        remaining_days: remainingDays,
        _urgency: remainingDays <= 7 ? "row-critical" : remainingDays <= 30 ? "row-warning" : "",
      };
    }),
  );

  const offerSummary = computed(() => {
    const rows = Array.isArray(offerListRows.value) ? offerListRows.value : [];
    let draft = 0;
    let sent = 0;
    let accepted = 0;
    let rejected = 0;
    let expired = 0;

    rows.forEach((row) => {
      const status = String(row?.status || "").toLocaleLowerCase(localeCode.value);
      if (status.includes("draft")) draft += 1;
      if (status.includes("sent")) sent += 1;
      if (status.includes("accepted")) accepted += 1;
      if (status.includes("rejected")) rejected += 1;
      if (status.includes("expired")) expired += 1;
    });

    return {
      total: offerListTotal.value,
      draft,
      sent,
      accepted,
      rejected,
      expired,
    };
  });

  const offerConversionRate = computed(() => {
    const total = Number(offerSummary.value.total || 0);
    if (!total) return "0.0";
    return ((Number(offerSummary.value.accepted || 0) / total) * 100).toFixed(1);
  });

  const offerListFilterBarActiveCount = computed(
    () =>
      (offerListSearchQuery.value.trim() ? 1 : 0) +
      (offerListFilters.insurance_company ? 1 : 0) +
      (offerListFilters.status ? 1 : 0),
  );

  return {
    isOfferListInitialLoading,
    offerActiveFilterCount,
    offerConversionRate,
    offerListColumns,
    offerListEndRow,
    offerListFilterBarActiveCount,
    offerListFilterConfig,
    offerListHasNextPage,
    offerListSearchQuery,
    offerListStartRow,
    offerListRowsWithUrgency,
    offerListTotal,
    offerListTotalPages,
    offerSummary,
    pagedOfferRows,
  };
}
