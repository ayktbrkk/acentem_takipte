import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

function createAccountingInitialState() {
  return {
    workbench: {},
    loading: false,
    error: "",
    filters: {
      status: "Open",
      mismatchType: "",
      sourceQuery: "",
      sourceDoctype: "",
      limit: 50,
    },
  };
}

function normalizeText(value, localeCode) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase(localeCode || "en-US");
}

function filterWorkbenchRows(rows, filters, localeCode) {
  let list = Array.isArray(rows) ? rows.slice() : [];
  const sourceDoctype = String(filters?.sourceDoctype || "").trim();
  if (sourceDoctype) {
    list = list.filter((row) => String(row?.source_doctype || "").trim() === sourceDoctype);
  }
  const sourceQuery = normalizeText(filters?.sourceQuery, localeCode);
  if (sourceQuery) {
    list = list.filter((row) =>
      [row?.source_doctype, row?.source_name, row?.accounting?.external_ref, row?.accounting?.entry_no].some((value) =>
        normalizeText(value, localeCode).includes(sourceQuery)
      )
    );
  }
  return list;
}

export const useAccountingStore = defineStore("accounting", () => {
  const state = reactive(createAccountingInitialState());
  const lastLoadedAt = ref(null);
  const localeCode = ref("en-US");

  const hasError = computed(() => Boolean(state.error));
  const isReady = computed(() => !state.loading && !state.error);
  const metrics = computed(() => state.workbench?.metrics || {});
  const rows = computed(() => filterWorkbenchRows(state.workbench?.rows, state.filters, localeCode.value));
  const activeFilterCount = computed(() => {
    let count = 0;
    if (state.filters.status && state.filters.status !== "Open") count += 1;
    if (state.filters.mismatchType) count += 1;
    if (state.filters.sourceQuery) count += 1;
    if (state.filters.sourceDoctype) count += 1;
    if (Number(state.filters.limit) !== 50) count += 1;
    return count;
  });
  const sourceDoctypeOptions = computed(() => {
    const seen = new Set();
    const options = [];
    for (const row of state.workbench?.rows || []) {
      const value = String(row?.source_doctype || "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      options.push({ value, label: value });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  });

  function setLocaleCode(value) {
    localeCode.value = String(value || "en-US");
  }

  function setLoading(value) {
    state.loading = Boolean(value);
  }

  function setError(message) {
    state.error = String(message || "");
  }

  function clearError() {
    state.error = "";
  }

  function setWorkbench(payload) {
    state.workbench = payload && typeof payload === "object" ? payload : {};
    lastLoadedAt.value = Date.now();
  }

  function setFilters(nextFilters) {
    Object.assign(state.filters, nextFilters && typeof nextFilters === "object" ? nextFilters : {});
  }

  function resetFilters() {
    Object.assign(state.filters, createAccountingInitialState().filters);
  }

  function reset() {
    Object.assign(state, createAccountingInitialState());
    lastLoadedAt.value = null;
    localeCode.value = "en-US";
  }

  return {
    state,
    lastLoadedAt,
    localeCode,
    hasError,
    isReady,
    metrics,
    rows,
    activeFilterCount,
    sourceDoctypeOptions,
    setLocaleCode,
    setLoading,
    setError,
    clearError,
    setWorkbench,
    setFilters,
    resetFilters,
    reset,
  };
});
