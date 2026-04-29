import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { frappeRequest } from "frappe-ui";

const REPORT_LOAD_DEBOUNCE_MS = 300;

const COLUMN_MIGRATIONS = {
  policy_list: {
    customer_name: "customer_full_name",
    customer_title: "customer_full_name",
    company: "insurance_company",
    policy_number: "policy_no",
  },
  payment_status: {
    customer_name: "customer_full_name",
    customer_title: "customer_full_name",
    company: "insurance_company",
    policy_number: "policy_no",
  },
  renewal_performance: {
    customer_name: "customer_full_name",
    customer_title: "customer_full_name",
    company: "insurance_company",
  },
  claim_loss_ratio: {
    customer_name: "customer_full_name",
    customer_title: "customer_full_name",
    company: "insurance_company",
  },
  agent_performance: {
    agent_name: "sales_entity_full_name",
    customer_name: "customer_full_name",
    company: "insurance_company",
  },
  customer_segmentation: {
    customer_name: "customer_full_name",
    customer_title: "customer_full_name",
    company: "insurance_company",
  },
  communication_operations: {
    customer_name: "customer_full_name",
    customer_title: "customer_full_name",
    company: "insurance_company",
  },
  reconciliation_operations: {
    customer_name: "customer_full_name",
    customer_title: "customer_full_name",
    company: "insurance_company",
  },
  claims_operations: {
    customer_name: "customer_full_name",
    customer_title: "customer_full_name",
    company: "insurance_company",
  },
};

function formatDateForInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRangeForPreset(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === "today") {
    return {
      fromDate: formatDateForInput(today),
      toDate: formatDateForInput(today),
    };
  }

  if (preset === "this_month") {
    const year = today.getFullYear();
    const month = today.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return {
      fromDate: formatDateForInput(monthStart),
      toDate: formatDateForInput(monthEnd),
    };
  }

  if (preset === "this_year") {
    const year = today.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    return {
      fromDate: formatDateForInput(yearStart),
      toDate: formatDateForInput(yearEnd),
    };
  }

  if (preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      fromDate: formatDateForInput(yesterday),
      toDate: formatDateForInput(yesterday),
    };
  }

  if (preset === "last_month") {
    const year = today.getFullYear();
    const month = today.getMonth() - 1;
    const lastMonthStart = new Date(year, month, 1);
    const lastMonthEnd = new Date(year, month + 1, 0);
    return {
      fromDate: formatDateForInput(lastMonthStart),
      toDate: formatDateForInput(lastMonthEnd),
    };
  }

  if (preset === "last_year") {
    const lastYear = today.getFullYear() - 1;
    const yearStart = new Date(lastYear, 0, 1);
    const yearEnd = new Date(lastYear, 11, 31);
    return {
      fromDate: formatDateForInput(yearStart),
      toDate: formatDateForInput(yearEnd),
    };
  }

  return { fromDate: "", toDate: "" };
}

function isDateLikeValue(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getSafeLocalStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function useReportsRuntime({
  t,
  activeLocale,
  localeCode,
  reportCatalog,
  columnLabels,
  filters,
  visibleFilters,
  comparisonEnabled,
  branchStore,
  route,
  router,
  filtersSectionRef,
  numberFormatter,
  dateFormatter,
  percentFormatter,
  onLoadScheduledReports = () => Promise.resolve(),
}) {
  const loading = ref(false);
  const exportLoading = ref(false);
  const error = ref("");
  const columns = ref([]);
  const rows = ref([]);
  const comparisonRows = ref([]);
  const visibleColumnKeys = ref([]);
  const pendingVisibleColumnKeys = ref([]);
  const activePreset = ref("");
  const sortState = reactive({
    column: "",
    direction: "",
  });
  const visibleColumns = computed(() => {
    if (!visibleColumnKeys.value.length) {
      return columns.value;
    }
    return columns.value.filter((column) => visibleColumnKeys.value.includes(column));
  });

  let reportLoadTimer = null;

  function clearHiddenFilters() {
    if (!visibleFilters.value.has("branch")) {
      filters.branch = "";
    }
    if (!visibleFilters.value.has("insuranceCompany")) {
      filters.insuranceCompany = "";
    }
    if (!visibleFilters.value.has("policyNo")) {
      filters.policyNo = "";
    }
    if (!visibleFilters.value.has("customerTaxId")) {
      filters.customerTaxId = "";
    }
    if (!visibleFilters.value.has("salesEntity")) {
      filters.salesEntity = "";
    }
    if (!visibleFilters.value.has("status")) {
      filters.status = "";
    }
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
    };
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

  function formatComparisonDelta(delta, previous) {
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${numberFormatter.value.format(delta)} / ${numberFormatter.value.format(previous)}`;
  }

  function isFilterVisible(key) {
    return visibleFilters.value.has(key);
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

    for (const row of rows.value || []) {
      for (const sourceKey of sourceKeys) {
        const raw = row?.[sourceKey];
        const value = typeof raw === "string" ? raw.trim() : String(raw || "").trim();
        if (value) {
          options.add(value);
        }
      }
    }

    return [...options]
      .sort((a, b) => a.localeCompare(b, localeCode.value))
      .slice(0, 80);
  }

  function getColumnLabel(column) {
    const entry = columnLabels[column];
    if (entry) {
      return entry[activeLocale.value] || entry.en || column;
    }
    return String(column)
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getReportRowRoute(row) {
    if (!row || typeof row !== "object") {
      return null;
    }

    if (filters.reportKey === "policy_list" && row.name) {
      return { name: "policy-detail", params: { name: row.name } };
    }

    if (filters.reportKey === "payment_status" && row.name) {
      return { name: "payment-detail", params: { name: row.name } };
    }

    if (filters.reportKey === "renewal_performance" && row.name) {
      return { name: "renewal-task-detail", params: { name: row.name } };
    }

    if (filters.reportKey === "claims_operations" && row.name) {
      return { name: "claim-detail", params: { name: row.name } };
    }

    if (filters.reportKey === "agent_performance" && row.sales_entity) {
      return { name: "policy-list", query: { sales_entity: row.sales_entity } };
    }

    return null;
  }

  function isRowClickable(row) {
    return Boolean(getReportRowRoute(row));
  }

  function onRowClick(row) {
    const targetRoute = getReportRowRoute(row);
    if (!targetRoute) {
      return;
    }
    void router.push(targetRoute);
  }

  function formatCellValue(column, value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    if (["loss_ratio_percent", "offer_conversion_rate", "renewal_success_rate"].includes(column)) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? `%${percentFormatter.value.format(numeric)}` : String(value);
    }

    if (typeof value === "number") {
      return numberFormatter.value.format(value);
    }

    if (typeof value === "string") {
      const numeric = Number(value);
      const numericColumns = new Set([
        "gross_premium",
        "total_gross_premium",
        "total_premium",
        "commission_amount",
        "total_commission",
        "paid_amount",
        "approved_amount",
        "estimated_amount",
        "policy_count",
        "offer_count",
        "accepted_offer_count",
        "renewal_task_count",
        "claim_count",
      ]);

      if (numericColumns.has(column) && Number.isFinite(numeric)) {
        return numberFormatter.value.format(numeric);
      }

      if (isDateLikeValue(value)) {
        const parsed = new Date(`${value}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
          return dateFormatter.value.format(parsed);
        }
      }
    }

    return String(value);
  }

  function normalizeSortableValue(value) {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      if (isDateLikeValue(value)) {
        return value;
      }
      const numeric = Number(value);
      if (Number.isFinite(numeric) && value.trim() !== "") {
        return numeric;
      }
      return value.toLocaleLowerCase(localeCode.value);
    }
    return String(value);
  }

  function syncReportKeyFromRoute() {
    const requestedReport = String(route.query?.report || "");
    if (requestedReport && reportCatalog[requestedReport]) {
      filters.reportKey = requestedReport;
    }
  }

  function persistReportKeyToRoute() {
    const nextQuery = {
      ...route.query,
      report: filters.reportKey,
    };
    if (JSON.stringify(nextQuery) === JSON.stringify(route.query || {})) {
      return;
    }
    void router.replace({ query: nextQuery });
  }

  function getViewStorageKey() {
    return `at:reports:view-state:${filters.reportKey}`;
  }

  function migrateColumnKeys(reportKey, keys) {
    const renames = COLUMN_MIGRATIONS[reportKey];
    if (!renames || !keys.length) return keys;
    const migrated = keys.map((k) => renames[k] ?? k);
    if (keys.includes("customer") && !migrated.includes("customer_tax_id")) {
      const insertAt = migrated.indexOf("customer_full_name");
      if (insertAt !== -1) migrated.splice(insertAt + 1, 0, "customer_tax_id");
      else migrated.push("customer_tax_id");
    }
    return migrated;
  }

  function applyViewState(payload = {}) {
    const rawKeys = Array.isArray(payload?.visibleColumnKeys)
      ? payload.visibleColumnKeys.filter((item) => typeof item === "string" && item)
      : [];
    const columnKeys = migrateColumnKeys(filters.reportKey, rawKeys);

    pendingVisibleColumnKeys.value = [...columnKeys];
    visibleColumnKeys.value = columnKeys.length
      ? columns.value.filter((column) => columnKeys.includes(column))
      : [...columns.value];

    sortState.column = typeof payload?.sortColumn === "string" && payload.sortColumn ? payload.sortColumn : "";
    sortState.direction = payload?.sortDirection === "asc" || payload?.sortDirection === "desc" ? payload.sortDirection : "";
  }

  function buildViewStatePayload() {
    return {
      visibleColumnKeys: [...visibleColumnKeys.value],
      sortColumn: sortState.column || "",
      sortDirection: sortState.direction || "",
    };
  }

  function persistViewStateToStorage() {
    try {
      const storage = getSafeLocalStorage();
      if (!storage) return;
      storage.setItem(getViewStorageKey(), JSON.stringify(buildViewStatePayload()));
    } catch (err) {
      error.value = String(err?.message || err || t("viewStateError"));
    }
  }

  function syncViewStateFromStorage() {
    try {
      const storage = getSafeLocalStorage();
      if (!storage) {
        applyViewState({});
        return;
      }
      const raw = storage.getItem(getViewStorageKey());
      if (!raw) {
        applyViewState({});
        return;
      }
      applyViewState(JSON.parse(raw));
    } catch {
      applyViewState({});
    }
  }

  function syncViewStateFromRoute() {
    const visibleColumnsFromRoute = String(route.query?.report_cols || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    applyViewState({
      visibleColumnKeys: visibleColumnsFromRoute,
      sortColumn: String(route.query?.report_sort || ""),
      sortDirection: String(route.query?.report_dir || ""),
    });
  }

  function persistViewStateToRoute() {
    const nextQuery = {
      ...route.query,
      report: filters.reportKey,
      report_cols: visibleColumnKeys.value.length ? visibleColumnKeys.value.join(",") : undefined,
      report_sort: sortState.column || undefined,
      report_dir: sortState.direction || undefined,
    };

    if (JSON.stringify(nextQuery) === JSON.stringify(route.query || {})) {
      return;
    }

    void router.replace({ query: nextQuery });
  }

  async function loadReport() {
    loading.value = true;
    error.value = "";
    try {
      const payload = await frappeRequest({
        url: `/api/method/${reportCatalog[filters.reportKey].readMethod}`,
        method: "GET",
        params: {
          filters: JSON.stringify(buildFiltersPayload()),
          limit: 500,
        },
      });
      const message = payload?.message || payload || {};
      columns.value = message.columns || [];
      rows.value = message.rows || [];
      comparisonRows.value = [];

      const previousFilters = buildPreviousPeriodFiltersPayload();
      if (previousFilters) {
        const comparisonPayload = await frappeRequest({
          url: `/api/method/${reportCatalog[filters.reportKey].readMethod}`,
          method: "GET",
          params: {
            filters: JSON.stringify(previousFilters),
            limit: 500,
          },
        });
        const comparisonMessage = comparisonPayload?.message || comparisonPayload || {};
        comparisonRows.value = Array.isArray(comparisonMessage.rows) ? comparisonMessage.rows : [];
      }
    } catch (err) {
      const errorMessage =
        err?.response?.message
        || (Array.isArray(err?.messages) && err.messages[0])
        || err?.message
        || t("loadErrorTitle");
      error.value = String(errorMessage);
      columns.value = [];
      rows.value = [];
      comparisonRows.value = [];
    } finally {
      loading.value = false;
    }
  }

  function scheduleReportLoad({ immediate = false } = {}) {
    const runLoad = () => {
      reportLoadTimer = null;
      void loadReport();
    };

    if (immediate) {
      if (reportLoadTimer) {
        window.clearTimeout(reportLoadTimer);
        reportLoadTimer = null;
      }
      runLoad();
      return;
    }

    if (reportLoadTimer) {
      window.clearTimeout(reportLoadTimer);
    }
    reportLoadTimer = window.setTimeout(runLoad, REPORT_LOAD_DEBOUNCE_MS);
  }

  async function downloadReport(format) {
    exportLoading.value = true;
    try {
      const method = reportCatalog[filters.reportKey].exportMethod;
      const params = new URLSearchParams({
        filters: JSON.stringify(buildFiltersPayload()),
        export_format: format,
        limit: "1000",
      });
      const popup = window.open(`/api/method/${method}?${params.toString()}`, "_blank", "noopener");
      if (!popup) {
        throw new Error("Popup blocked");
      }
    } catch (err) {
      error.value = String(err?.message || err || t("exportError"));
    } finally {
      exportLoading.value = false;
    }
  }

  function isColumnVisible(column) {
    return visibleColumns.value.includes(column);
  }

  function toggleColumn(column) {
    if (visibleColumnKeys.value.includes(column)) {
      if (visibleColumnKeys.value.length === 1) {
        return;
      }
      visibleColumnKeys.value = visibleColumnKeys.value.filter((item) => item !== column);
      if (!visibleColumnKeys.value.includes(sortState.column)) {
        sortState.column = "";
        sortState.direction = "";
      }
      return;
    }
    visibleColumnKeys.value = [...visibleColumnKeys.value, column];
  }

  function showAllColumns() {
    visibleColumnKeys.value = [...columns.value];
  }

  function focusFilters() {
    const root = filtersSectionRef.value?.$el || filtersSectionRef.value;
    if (root && typeof root.scrollIntoView === "function") {
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function toggleSort(column) {
    if (sortState.column !== column) {
      sortState.column = column;
      sortState.direction = "asc";
      return;
    }
    if (sortState.direction === "asc") {
      sortState.direction = "desc";
      return;
    }
    if (sortState.direction === "desc") {
      sortState.column = "";
      sortState.direction = "";
      return;
    }
    sortState.direction = "asc";
  }

  function getSortIndicator(column) {
    if (sortState.column !== column) {
      return "|";
    }
    return sortState.direction === "desc" ? "v" : "^";
  }

  function applyDatePreset(preset) {
    activePreset.value = String(preset || "");
    if (!activePreset.value) {
      return;
    }
    const dateRange = getDateRangeForPreset(preset);
    filters.fromDate = dateRange.fromDate;
    filters.toDate = dateRange.toDate;
    scheduleReportLoad();
  }

  function isActivePresetRange() {
    if (!activePreset.value) {
      return false;
    }
    const range = getDateRangeForPreset(activePreset.value);
    return filters.fromDate === range.fromDate && filters.toDate === range.toDate;
  }

  watch(
    () => branchStore.selected,
    () => {
      scheduleReportLoad();
    },
  );

  watch(
    () => filters.reportKey,
    () => {
      clearHiddenFilters();
      persistReportKeyToRoute();
      syncViewStateFromStorage();
      persistViewStateToRoute();
      scheduleReportLoad();
    },
  );

  watch(
    [() => filters.fromDate, () => filters.toDate],
    () => {
      if (!isActivePresetRange()) {
        activePreset.value = "";
      }
      scheduleReportLoad();
    },
  );

  watch(
    columns,
    (nextColumns) => {
      if (!Array.isArray(nextColumns) || nextColumns.length === 0) {
        visibleColumnKeys.value = [];
        pendingVisibleColumnKeys.value = [];
        sortState.column = "";
        sortState.direction = "";
        return;
      }

      if (pendingVisibleColumnKeys.value.length) {
        visibleColumnKeys.value = nextColumns.filter((column) => pendingVisibleColumnKeys.value.includes(column));
        if (!visibleColumnKeys.value.length) {
          visibleColumnKeys.value = [...nextColumns];
        }
        pendingVisibleColumnKeys.value = [];
      } else if (!visibleColumnKeys.value.length) {
        visibleColumnKeys.value = [...nextColumns];
      } else {
        visibleColumnKeys.value = visibleColumnKeys.value.filter((column) => nextColumns.includes(column));
        if (!visibleColumnKeys.value.length) {
          visibleColumnKeys.value = [...nextColumns];
        }
      }

      if (sortState.column && !nextColumns.includes(sortState.column)) {
        sortState.column = "";
        sortState.direction = "";
      }
    },
    { immediate: true },
  );

  watch(
    [visibleColumnKeys, () => sortState.column, () => sortState.direction],
    () => {
      persistViewStateToStorage();
      persistViewStateToRoute();
    },
    { deep: true },
  );

  onMounted(() => {
    syncReportKeyFromRoute();
    persistReportKeyToRoute();
    syncViewStateFromRoute();
    if (!String(route.query?.report_cols || "") && !String(route.query?.report_sort || "")) {
      syncViewStateFromStorage();
    }
    void loadReport();
    void onLoadScheduledReports();
  });

  onBeforeUnmount(() => {
    if (reportLoadTimer) {
      window.clearTimeout(reportLoadTimer);
      reportLoadTimer = null;
    }
  });

  return {
    loading,
    exportLoading,
    error,
    columns,
    rows,
    comparisonRows,
    activePreset,
    visibleColumnKeys,
    pendingVisibleColumnKeys,
    sortState,
    clearHiddenFilters,
    buildFiltersPayload,
    buildPreviousPeriodFiltersPayload,
    formatComparisonDelta,
    isFilterVisible,
    getAdvancedFilterOptions,
    getColumnLabel,
    getReportRowRoute,
    isRowClickable,
    onRowClick,
    formatCellValue,
    normalizeSortableValue,
    syncReportKeyFromRoute,
    persistReportKeyToRoute,
    getViewStorageKey,
    getSafeLocalStorage,
    migrateColumnKeys,
    applyViewState,
    buildViewStatePayload,
    persistViewStateToStorage,
    syncViewStateFromStorage,
    syncViewStateFromRoute,
    persistViewStateToRoute,
    loadReport,
    scheduleReportLoad,
    downloadReport,
    isColumnVisible,
    toggleColumn,
    showAllColumns,
    focusFilters,
    toggleSort,
    getSortIndicator,
    applyDatePreset,
    isActivePresetRange,
  };
}
