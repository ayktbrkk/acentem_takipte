import { computed, reactive, ref, unref } from "vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../../config/quickCreate";
import { readFilterPresetKey, readFilterPresetList } from "../../utils/filterPresetState";
import { translateText } from "../../utils/i18n";

function countOfferFilters(filters) {
  return [
    filters.query,
    filters.insurance_company,
    filters.status,
    filters.valid_until,
    filters.branch,
    filters.actionable_only ? "1" : "",
    filters.gross_min,
    filters.gross_max,
  ].filter((value) => String(value ?? "").trim() !== "").length;
}

function normalizeLower(value, localeCode) {
  return String(value || "").toLocaleLowerCase(localeCode);
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useOfferBoardState({
  t,
  activeLocale,
  localeCode,
  branchStore,
  offersResource,
  branchResource,
  insuranceCompanyResource,
  salesEntityResource,
  customerSearchResource,
  offerListResource,
  offerListCountResource,
}) {
  const QUICK_OPTION_LIMIT = 2000;
  const offerQuickConfig = getQuickCreateConfig("offer");
  const offerViewMode = ref("list");
  const offerListFilters = reactive({
    query: "",
    insurance_company: "",
    status: "",
    valid_until: "",
    branch: "",
    actionable_only: false,
    gross_min: "",
    gross_max: "",
    sort: "modified_desc",
  });
  const offerPresetKey = ref(readFilterPresetKey("at:offer-list:preset", "default"));
  const offerCustomPresets = ref(readFilterPresetList("at:offer-list:preset-list"));
  const offerListPagination = reactive({
    page: 1,
    pageLength: 20,
    total: 0,
  });

  const showConvertDialog = ref(false);
  const showQuickOfferDialog = ref(false);
  const selectedOffer = ref(null);
  const convertLoading = ref(false);
  const convertError = ref("");
  const quickOfferLoading = ref(false);
  const quickOfferError = ref("");
  const quickOfferFieldErrors = reactive({});
  const draggedOfferName = ref("");
  const quickOfferReturnTo = ref("");
  const quickOfferOpenedFromIntent = ref(false);
  const quickOffer = reactive({
    queryText: "",
    customerOption: null,
    createCustomerMode: false,
    ...buildQuickCreateDraft(offerQuickConfig),
  });
  const convertForm = reactive({
    start_date: formatDate(new Date()),
    end_date: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 365);
      return formatDate(date);
    })(),
    net_premium: "",
    tax_amount: "0",
    commission_amount: "0",
    policy_no: "",
  });

  const offers = computed(() => offersResource.data || []);
  const offerListRows = computed(() => offerListResource.data || []);
  const branches = computed(() => branchResource.data || []);
  const insuranceCompaniesForQuickCreate = computed(() =>
    (insuranceCompanyResource.data || []).map((row) => ({
      value: row.name,
      label: row.company_name || row.name,
    }))
  );
  const salesEntitiesForQuickCreate = computed(() =>
    (salesEntityResource.data || []).map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
    }))
  );
  const customerSearchRows = computed(() => customerSearchResource.data || []);
  const customerOptions = computed(() =>
    customerSearchRows.value.map((row) => ({
      label: row.full_name || row.name,
      value: row.name,
      description: row.tax_id || "",
    }))
  );
  const customerSearchLoading = computed(() => Boolean(customerSearchResource.loading));
  const offerQuickFields = computed(() => offerQuickConfig?.fields || []);
  const offerQuickFormFields = computed(() =>
    offerQuickFields.value.filter((field) => !["customer_type", "tax_id", "phone", "email"].includes(field.name))
  );
  const offerQuickUi = computed(() => ({
    subtitle: getLocalizedText(offerQuickConfig?.subtitle, activeLocale.value),
  }));
  const offerQuickOptionsMap = computed(() => ({
    branches: branches.value.map((row) => ({ value: row.name, label: row.branch_name || row.name })),
    insuranceCompanies: insuranceCompaniesForQuickCreate.value,
    salesEntities: salesEntitiesForQuickCreate.value,
  }));
  const customerSearchErrorText = computed(() => {
    const err = customerSearchResource.error;
    if (!err) return "";
    return err?.messages?.join(" ") || err?.message || t("customerSearchFailed");
  });
  const offersLoadErrorText = computed(() => {
    const err = offersResource.error;
    if (!err) return "";
    return err?.messages?.join(" ") || err?.message || t("loadError");
  });
  const offerListLoadErrorText = computed(() => {
    const err = offerListResource.error;
    if (!err) return "";
    return err?.messages?.join(" ") || err?.message || t("loadError");
  });
  const showCustomerSuggestions = computed(() => {
    return quickOffer.queryText.trim().length >= 2 && !customerSearchLoading.value && customerOptions.value.length > 0;
  });
  const showCustomerNoResults = computed(() => {
    return (
      quickOffer.queryText.trim().length >= 2 &&
      !customerSearchLoading.value &&
      !customerSearchErrorText.value &&
      customerOptions.value.length === 0
    );
  });
  const isListView = computed(() => offerViewMode.value === "list");
  const offerCompanies = computed(() =>
    [...new Set(offers.value.map((row) => row.insurance_company).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
  );
  const offerStatusOptions = computed(() => [
    { value: "Draft", label: t("statusDraft") },
    { value: "Sent", label: t("statusSent") },
    { value: "Accepted", label: t("statusAccepted") },
    { value: "Converted", label: t("statusConverted") },
    { value: "Rejected", label: t("statusRejected") },
  ]);
  const offerSortOptions = computed(() => [
    { value: "modified_desc", label: t("sortModifiedDesc") },
    { value: "valid_until_asc", label: t("sortValidUntilAsc") },
    { value: "valid_until_desc", label: t("sortValidUntilDesc") },
    { value: "gross_premium_desc", label: t("sortGrossDesc") },
  ]);
  const offerPresetOptions = computed(() => [
    { value: "default", label: t("presetDefault") },
    { value: "actionable", label: t("presetActionable") },
    { value: "converted", label: t("presetConverted") },
    { value: "expiring7", label: t("presetExpiring7") },
    ...offerCustomPresets.value.map((preset) => ({
      value: `custom:${preset.id}`,
      label: preset.label,
    })),
  ]);
  const canDeleteOfferPreset = computed(() => String(offerPresetKey.value || "").startsWith("custom:"));
  const offerListTotal = computed(() => Number(offerListPagination.total || 0));
  const offerListTotalPages = computed(() => Math.max(1, Math.ceil((offerListTotal.value || 0) / offerListPagination.pageLength)));
  const offerListHasNextPage = computed(() => offerListPagination.page < offerListTotalPages.value);
  const offerListStartRow = computed(() => {
    if (!offerListTotal.value) return 0;
    return (offerListPagination.page - 1) * offerListPagination.pageLength + 1;
  });
  const offerListEndRow = computed(() => {
    if (!offerListTotal.value) return 0;
    return Math.min(offerListTotal.value, offerListPagination.page * offerListPagination.pageLength);
  });
  const pagedOfferRows = computed(() => offerListRows.value);
  const isOfferListInitialLoading = computed(() => offerListResource.loading && offerListRows.value.length === 0);
  const offerActiveFilterCount = computed(() => countOfferFilters(offerListFilters));
  const offerListSearchQuery = computed({
    get: () => String(offerListFilters.query || ""),
    set: (value) => {
      offerListFilters.query = String(value || "");
    },
  });
  const offerListFilterConfig = computed(() => [
    {
      key: "insurance_company",
      label: translateText("Insurance Company", activeLocale.value),
      options: offerCompanies.value.map((company) => ({ value: company, label: company })),
    },
    {
      key: "status",
      label: translateText("Status", activeLocale.value),
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
    })
  );
  const offerSummary = computed(() => {
    const rows = Array.isArray(offerListRows.value) ? offerListRows.value : [];
    let draft = 0;
    let sent = 0;
    let accepted = 0;
    let rejected = 0;
    let expired = 0;

    rows.forEach((row) => {
      const status = normalizeLower(row?.status, localeCode.value);
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
      (offerListFilters.status ? 1 : 0)
  );
  const lanes = computed(() => [
    { key: "Draft", label: t("draftLane"), borderClass: "border-t-amber-400" },
    { key: "Sent", label: t("sentLane"), borderClass: "border-t-sky-400" },
    { key: "Accepted", label: t("acceptedLane"), borderClass: "border-t-emerald-400" },
    { key: "Converted", label: t("convertedLane"), borderClass: "border-t-indigo-400" },
  ]);
  const convertDialogEyebrow = computed(() => translateText("Quick Conversion", activeLocale.value));
  const canCreateQuickOffer = computed(() => {
    const selectedName = getSelectedCustomerName();
    const typedName = quickOffer.queryText.trim();
    return Boolean(selectedName || (quickOffer.createCustomerMode && typedName));
  });

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

  function formatDisplayDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat(localeCode.value).format(new Date(value));
  }

  function today() {
    return formatDate(new Date());
  }

  function oneYearLater() {
    const date = new Date();
    date.setDate(date.getDate() + 365);
    return formatDate(date);
  }

  function computeOfferRemainingDays(validUntil) {
    if (!validUntil) return null;
    const target = new Date(validUntil);
    if (Number.isNaN(target.getTime())) return null;
    return Math.ceil((target.getTime() - Date.now()) / 86400000);
  }

  function offerCardFacts(offer) {
    return [
      {
        key: "customer",
        label: t("customerName"),
        value: offer?.customer || "-",
      },
      {
        key: "premium",
        label: t("premiumAmount"),
        value: formatCurrency(offer?.gross_premium, offer?.currency || "TRY"),
        valueClass: "font-semibold text-slate-900",
      },
      {
        key: "company",
        label: t("company"),
        value: offer?.insurance_company || "-",
        valueClass: "text-xs text-slate-500",
        wrapperClass: "pt-1",
      },
    ];
  }

  function offerIdentityFacts(offer) {
    return [
      { key: "record", label: t("recordId"), value: offer?.name || "-" },
      { key: "offerDate", label: t("offerDate"), value: formatDisplayDate(offer?.offer_date) },
    ];
  }

  function offerDetailsFacts(offer) {
    return [
      { key: "customer", label: t("customerName"), value: offer?.customer || "-" },
      { key: "company", label: t("company"), value: offer?.insurance_company || "-" },
      { key: "validUntil", label: t("validUntil"), value: formatDisplayDate(offer?.valid_until) },
    ];
  }

  function offerPremiumFacts(offer) {
    return [
      { key: "grossPremium", label: t("grossPremium"), value: formatCurrency(offer?.gross_premium, offer?.currency || "TRY") },
      { key: "netPremium", label: t("netPremiumShort"), value: formatCurrency(offer?.net_premium, offer?.currency || "TRY") },
      { key: "commission", label: t("commissionShort"), value: formatCurrency(offer?.commission_amount, offer?.currency || "TRY") },
    ];
  }

  return {
    activeLocale,
    localeCode,
    offers,
    offerListRows,
    branches,
    insuranceCompaniesForQuickCreate,
    salesEntitiesForQuickCreate,
    customerSearchRows,
    customerOptions,
    customerSearchLoading,
    offerQuickConfig,
    offerQuickFields,
    offerQuickFormFields,
    offerQuickUi,
    offerQuickOptionsMap,
    customerSearchErrorText,
    offersLoadErrorText,
    offerListLoadErrorText,
    showCustomerSuggestions,
    showCustomerNoResults,
    offerViewMode,
    offerListFilters,
    offerPresetKey,
    offerCustomPresets,
    offerListPagination,
    isListView,
    offerCompanies,
    offerStatusOptions,
    offerSortOptions,
    offerPresetOptions,
    canDeleteOfferPreset,
    offerListTotal,
    offerListTotalPages,
    offerListHasNextPage,
    offerListStartRow,
    offerListEndRow,
    pagedOfferRows,
    isOfferListInitialLoading,
    offerActiveFilterCount,
    offerListSearchQuery,
    offerListFilterConfig,
    offerListRowsWithUrgency,
    offerSummary,
    offerConversionRate,
    offerListFilterBarActiveCount,
    lanes,
    showConvertDialog,
    showQuickOfferDialog,
    selectedOffer,
    convertLoading,
    convertError,
    quickOfferLoading,
    quickOfferError,
    quickOfferFieldErrors,
    draggedOfferName,
    quickOfferReturnTo,
    quickOfferOpenedFromIntent,
    quickOffer,
    convertForm,
    convertDialogEyebrow,
    canCreateQuickOffer,
    formatCurrency,
    formatCount,
    formatDisplayDate,
    today,
    oneYearLater,
    computeOfferRemainingDays,
    offerCardFacts,
    offerIdentityFacts,
    offerDetailsFacts,
    offerPremiumFacts,
    setOfferViewMode: (mode) => {
      offerViewMode.value = mode === "board" ? "board" : "list";
    },
    previousOfferPage: () => {
      if (offerListPagination.page <= 1) return;
      offerListPagination.page -= 1;
    },
    nextOfferPage: () => {
      if (offerListPagination.page >= offerListTotalPages.value) return;
      offerListPagination.page += 1;
    },
  };
}
