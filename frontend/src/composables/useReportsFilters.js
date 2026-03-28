import { computed, reactive, ref, unref } from "vue";

import { useCustomFilterPresets } from "./useCustomFilterPresets";
import { reportCatalog, reportFilterConfig } from "./reportsConfig";

const COMPARED_REPORT_KEYS = new Set([
  "communication_operations",
  "reconciliation_operations",
  "claims_operations",
]);

function formatDateForInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateString(dateString, deltaDays) {
  const base = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return "";
  }

  base.setDate(base.getDate() + deltaDays);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useReportsFilters({
  props,
  t,
  activeLocale,
  localeCode,
  route,
  router,
  authStore,
  branchStore,
  rows,
  refresh,
}) {
  const filters = reactive({
    reportKey: props.initialReportKey || "policy_list",
    fromDate: "",
    toDate: "",
    branch: "",
    insuranceCompany: "",
    policyNo: "",
    customerTaxId: "",
    salesEntity: "",
    status: "",
    granularity: "",
  });

  const reportsAdvancedOpen = ref(false);
  const activePreset = ref("");

  const reportOptions = computed(() =>
    Object.entries(reportCatalog).map(([value, config]) => ({
      value,
      label: config.label[activeLocale.value] || config.label.en,
    })),
  );

  const activeReportLabel = computed(
    () => reportCatalog[filters.reportKey]?.label[activeLocale.value] || reportCatalog[filters.reportKey]?.label.en || filters.reportKey,
  );

  const branchScopeLabel = computed(() => {
    if (!branchStore.requestBranch) {
      return `${t("scopePrefix")}: ${t("scopeAll")}`;
    }
    return `${t("scopePrefix")}: ${branchStore.activeBranch?.label || branchStore.requestBranch}`;
  });

  const visibleFilters = computed(() => new Set(reportFilterConfig[filters.reportKey] || []));

  const canManageScheduledReports = computed(() => {
    const roles = Array.isArray(unref(authStore.roles)) ? unref(authStore.roles) : [];
    return Boolean(unref(authStore.isDeskUser)) || roles.includes("Manager");
  });

  const activeFilterCount = computed(() => {
    let count = 0;
    if (filters.fromDate) count += 1;
    if (filters.toDate) count += 1;
    if (filters.granularity && filters.reportKey === "policy_list") count += 1;
    if (visibleFilters.value.has("branch") && filters.branch) count += 1;
    if (visibleFilters.value.has("insuranceCompany") && filters.insuranceCompany) count += 1;
    if (visibleFilters.value.has("policyNo") && filters.policyNo) count += 1;
    if (visibleFilters.value.has("customerTaxId") && filters.customerTaxId) count += 1;
    if (visibleFilters.value.has("salesEntity") && filters.salesEntity) count += 1;
    if (visibleFilters.value.has("status") && filters.status) count += 1;
    return count;
  });

  const datePresets = computed(() => [
    { value: "today", label: t("datePresetToday") },
    { value: "this_month", label: t("datePresetThisMonth") },
    { value: "this_year", label: t("datePresetThisYear") },
    { value: "yesterday", label: t("datePresetYesterday") },
    { value: "last_month", label: t("datePresetLastMonth") },
    { value: "last_year", label: t("datePresetLastYear") },
  ]);

  const advancedFilterDefinitions = computed(() => [
    { key: "branch", modelKey: "branch", label: t("branchFilter") },
    { key: "insuranceCompany", modelKey: "insuranceCompany", label: t("companyFilter") },
    { key: "policyNo", modelKey: "policyNo", label: t("policyNoFilter") },
    { key: "customerTaxId", modelKey: "customerTaxId", label: t("customerTaxIdFilter") },
    { key: "salesEntity", modelKey: "salesEntity", label: t("salesEntityFilter") },
    { key: "status", modelKey: "status", label: t("statusFilter") },
  ]);

  const visibleAdvancedFilters = computed(() =>
    advancedFilterDefinitions.value.filter((item) => visibleFilters.value.has(item.key)),
  );

  const comparisonEnabled = computed(
    () =>
      COMPARED_REPORT_KEYS.has(filters.reportKey)
      && Boolean(filters.fromDate)
      && Boolean(filters.toDate),
  );

  function isFilterVisible(key) {
    return visibleFilters.value.has(key);
  }

  function buildFiltersPayload() {
    return {
      from_date: filters.fromDate || null,
      to_date: filters.toDate || null,
      branch: visibleFilters.value.has("branch") ? filters.branch || null : null,
      insurance_company: visibleFilters.value.has("insuranceCompany") ? filters.insuranceCompany || null : null,
      policy_no: visibleFilters.value.has("policyNo") ? filters.policyNo || null : null,
      customer_tax_id: visibleFilters.value.has("customerTaxId") ? filters.customerTaxId || null : null,
      sales_entity: visibleFilters.value.has("salesEntity") ? filters.salesEntity || null : null,
      status: visibleFilters.value.has("status") ? filters.status || null : null,
      office_branch: branchStore.requestBranch || null,
      granularity: filters.reportKey === "policy_list" ? filters.granularity || null : null,
    };
  }

  function buildPreviousPeriodFiltersPayload() {
    if (!comparisonEnabled.value) {
      return null;
    }

    const fromDate = new Date(`${filters.fromDate}T00:00:00`);
    const toDate = new Date(`${filters.toDate}T00:00:00`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || toDate < fromDate) {
      return null;
    }

    const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
    return {
      ...buildFiltersPayload(),
      from_date: shiftDateString(filters.fromDate, -diffDays),
      to_date: shiftDateString(filters.toDate, -diffDays),
    };
  }

  function getDateRangeForPreset(preset) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === "today") {
      return { fromDate: formatDateForInput(today), toDate: formatDateForInput(today) };
    }
    if (preset === "this_month") {
      const year = today.getFullYear();
      const month = today.getMonth();
      return {
        fromDate: formatDateForInput(new Date(year, month, 1)),
        toDate: formatDateForInput(new Date(year, month + 1, 0)),
      };
    }
    if (preset === "this_year") {
      const year = today.getFullYear();
      return {
        fromDate: formatDateForInput(new Date(year, 0, 1)),
        toDate: formatDateForInput(new Date(year, 11, 31)),
      };
    }
    if (preset === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { fromDate: formatDateForInput(yesterday), toDate: formatDateForInput(yesterday) };
    }
    if (preset === "last_month") {
      const year = today.getFullYear();
      const month = today.getMonth() - 1;
      return {
        fromDate: formatDateForInput(new Date(year, month, 1)),
        toDate: formatDateForInput(new Date(year, month + 1, 0)),
      };
    }
    if (preset === "last_year") {
      const lastYear = today.getFullYear() - 1;
      return {
        fromDate: formatDateForInput(new Date(lastYear, 0, 1)),
        toDate: formatDateForInput(new Date(lastYear, 11, 31)),
      };
    }
    return { fromDate: "", toDate: "" };
  }

  function applyDatePreset(preset) {
    activePreset.value = String(preset || "");
    if (!activePreset.value) {
      return;
    }
    const dateRange = getDateRangeForPreset(preset);
    filters.fromDate = dateRange.fromDate;
    filters.toDate = dateRange.toDate;
    void refresh?.();
  }

  function isActivePresetRange() {
    if (!activePreset.value) {
      return false;
    }
    const range = getDateRangeForPreset(activePreset.value);
    return filters.fromDate === range.fromDate && filters.toDate === range.toDate;
  }

  function clearHiddenFilters() {
    if (!visibleFilters.value.has("branch")) filters.branch = "";
    if (!visibleFilters.value.has("insuranceCompany")) filters.insuranceCompany = "";
    if (!visibleFilters.value.has("policyNo")) filters.policyNo = "";
    if (!visibleFilters.value.has("customerTaxId")) filters.customerTaxId = "";
    if (!visibleFilters.value.has("salesEntity")) filters.salesEntity = "";
    if (!visibleFilters.value.has("status")) filters.status = "";
  }

  function syncReportKeyFromRoute() {
    const requestedReport = String(route.query?.report || "");
    if (requestedReport && reportCatalog[requestedReport]) {
      filters.reportKey = requestedReport;
    }
  }

  function persistReportKeyToRoute() {
    const nextQuery = { ...route.query, report: filters.reportKey };
    if (JSON.stringify(nextQuery) === JSON.stringify(route.query || {})) {
      return;
    }
    void router.replace({ query: nextQuery });
  }

  function resetFilters() {
    filters.reportKey = "policy_list";
    filters.fromDate = "";
    filters.toDate = "";
    filters.branch = "";
    filters.insuranceCompany = "";
    filters.policyNo = "";
    filters.customerTaxId = "";
    filters.salesEntity = "";
    filters.status = "";
    filters.granularity = "";
    activePreset.value = "";
    clearHiddenFilters();
    void refresh?.();
  }

  function getAdvancedFilterOptions(key) {
    const keyMap = {
      branch: ["branch"],
      insuranceCompany: ["insurance_company", "insuranceCompany"],
      policyNo: ["policy_no"],
      customerTaxId: ["customer_tax_id", "tax_id"],
      salesEntity: ["sales_entity", "salesEntity"],
      status: ["status", "claim_status"],
    };

    const sourceKeys = keyMap[key] || [key];
    const options = new Set();

    for (const row of rows?.value || []) {
      for (const sourceKey of sourceKeys) {
        const raw = row?.[sourceKey];
        const value = typeof raw === "string" ? raw.trim() : String(raw || "").trim();
        if (value) {
          options.add(value);
        }
      }
    }

    return [...options]
      .sort((left, right) => left.localeCompare(right, localeCode.value))
      .slice(0, 80);
  }

  const { presetKey, presetOptions, canDeletePreset, applyPreset, onPresetChange, savePreset, deletePreset } =
    useCustomFilterPresets({
      screen: "reports",
      presetStorageKey: "at:reports:preset",
      presetListStorageKey: "at:reports:preset-list",
      t,
      getCurrentPayload: buildFiltersPayload,
      setFilterStateFromPayload: (payload) => {
        filters.reportKey = String(payload?.reportKey || "policy_list");
        filters.fromDate = String(payload?.fromDate || "");
        filters.toDate = String(payload?.toDate || "");
        filters.branch = String(payload?.branch || "");
        filters.insuranceCompany = String(payload?.insuranceCompany || "");
        filters.salesEntity = String(payload?.salesEntity || "");
        filters.status = String(payload?.status || "");
        filters.granularity = String(payload?.granularity || "");
      },
      resetFilterState: () => {
        filters.reportKey = "policy_list";
        filters.fromDate = "";
        filters.toDate = "";
        filters.branch = "";
        filters.insuranceCompany = "";
        filters.salesEntity = "";
        filters.status = "";
        filters.granularity = "";
      },
      refresh,
      getSortLocale: () => localeCode.value,
    });

  const presetModelValue = computed(() => String(unref(presetKey) || "default"));
  const presetOptionsList = computed(() => {
    const value = unref(presetOptions);
    return Array.isArray(value) ? value : [];
  });
  const canDeletePresetFlag = computed(() => Boolean(unref(canDeletePreset)));

  return {
    reportCatalog,
    filters,
    reportsAdvancedOpen,
    activePreset,
    reportOptions,
    activeReportLabel,
    branchScopeLabel,
    visibleFilters,
    canManageScheduledReports,
    activeFilterCount,
    datePresets,
    advancedFilterDefinitions,
    visibleAdvancedFilters,
    comparisonEnabled,
    buildFiltersPayload,
    buildPreviousPeriodFiltersPayload,
    clearHiddenFilters,
    syncReportKeyFromRoute,
    persistReportKeyToRoute,
    resetFilters,
    applyDatePreset,
    isActivePresetRange,
    isFilterVisible,
    getAdvancedFilterOptions,
    presetKey,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    savePreset,
    deletePreset,
    presetModelValue,
    presetOptionsList,
    canDeletePresetFlag,
  };
}
