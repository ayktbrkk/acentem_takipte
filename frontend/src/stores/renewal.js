import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

function createRenewalInitialState() {
  return {
    items: [],
    selected: null,
    loading: false,
    error: "",
    filters: {
      query: "",
      status: "",
      policyQuery: "",
      dueScope: "",
      limit: 40,
    },
    summary: {
      total: 0,
      open: 0,
      inProgress: 0,
      done: 0,
      cancelled: 0,
    },
  };
}

function buildRenewalSummary(items) {
  const rows = Array.isArray(items) ? items : [];
  const countByStatus = rows.reduce((acc, row) => {
    const key = String(row?.status || "Open");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    total: rows.length,
    open: Number(countByStatus.Open || 0),
    inProgress: Number(countByStatus["In Progress"] || 0),
    done: Number(countByStatus.Done || 0) + Number(countByStatus.Completed || 0),
    cancelled: Number(countByStatus.Cancelled || 0),
  };
}

export const useRenewalStore = defineStore("renewal", () => {
  const state = reactive(createRenewalInitialState());
  const lastLoadedAt = ref(null);

  const hasError = computed(() => Boolean(state.error));
  const isReady = computed(() => !state.loading && !state.error);
  const openItems = computed(() => state.items.filter((item) => item?.status === "Open"));
  const terminalItems = computed(() =>
    state.items.filter((item) => item?.status === "Done" || item?.status === "Cancelled")
  );

  function setLoading(value) {
    state.loading = Boolean(value);
  }

  function setError(message) {
    state.error = String(message || "");
  }

  function clearError() {
    state.error = "";
  }

  function setItems(items) {
    state.items = Array.isArray(items) ? items : [];
    state.summary = buildRenewalSummary(state.items);
    lastLoadedAt.value = Date.now();
  }

  function setSelected(selected) {
    state.selected = selected || null;
  }

  function setFilters(nextFilters) {
    Object.assign(state.filters, nextFilters && typeof nextFilters === "object" ? nextFilters : {});
  }

  function setSummary(summary) {
    state.summary = {
      ...state.summary,
      ...(summary && typeof summary === "object" ? summary : {}),
    };
  }

  function reset() {
    Object.assign(state, createRenewalInitialState());
    lastLoadedAt.value = null;
  }

  function resetFilters() {
    reset();
  }

  return {
    state,
    lastLoadedAt,
    hasError,
    isReady,
    openItems,
    terminalItems,
    setLoading,
    setError,
    clearError,
    setItems,
    setSelected,
    setFilters,
    resetFilters,
    setSummary,
    reset,
    buildRenewalSummary,
  };
});
