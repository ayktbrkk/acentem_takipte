import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

function createClaimInitialState() {
  return {
    items: [],
    selected: null,
    loading: false,
    error: "",
    filters: {
      query: "",
      status: "",
      policyQuery: "",
      amountState: "",
      limit: 30,
    },
  };
}

function normalizeText(value, localeCode) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase(localeCode || "en-US");
}

function filterClaimItems(items, filters, localeCode) {
  let rows = Array.isArray(items) ? items.slice() : [];
  const query = normalizeText(filters?.query, localeCode);
  if (query) {
    rows = rows.filter((row) =>
      [row?.claim_no, row?.name, row?.policy].some((value) => normalizeText(value, localeCode).includes(query))
    );
  }
  const policyQuery = normalizeText(filters?.policyQuery, localeCode);
  if (policyQuery) {
    rows = rows.filter((row) => normalizeText(row?.policy, localeCode).includes(policyQuery));
  }
  if (filters?.amountState === "paid") {
    rows = rows.filter((row) => Number(row?.paid_amount || 0) > 0);
  } else if (filters?.amountState === "unpaid") {
    rows = rows.filter((row) => Number(row?.paid_amount || 0) <= 0);
  } else if (filters?.amountState === "approved_only") {
    rows = rows.filter((row) => Number(row?.approved_amount || 0) > 0);
  } else if (filters?.amountState === "pending_payment") {
    rows = rows.filter((row) => Number(row?.approved_amount || 0) > Number(row?.paid_amount || 0));
  }
  return rows;
}

export const useClaimStore = defineStore("claim", () => {
  const state = reactive(createClaimInitialState());
  const lastLoadedAt = ref(null);
  const localeCode = ref("en-US");

  const hasError = computed(() => Boolean(state.error));
  const isReady = computed(() => !state.loading && !state.error);
  const activeFilterCount = computed(() => {
    let count = 0;
    if (state.filters.query) count += 1;
    if (state.filters.status) count += 1;
    if (state.filters.policyQuery) count += 1;
    if (state.filters.amountState) count += 1;
    if (Number(state.filters.limit) !== 30) count += 1;
    return count;
  });
  const filteredItems = computed(() => filterClaimItems(state.items, state.filters, localeCode.value));

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

  function setItems(items) {
    state.items = Array.isArray(items) ? items : [];
    lastLoadedAt.value = Date.now();
  }

  function setSelected(selected) {
    state.selected = selected || null;
  }

  function setFilters(nextFilters) {
    Object.assign(state.filters, nextFilters && typeof nextFilters === "object" ? nextFilters : {});
  }

  function resetFilters() {
    Object.assign(state.filters, createClaimInitialState().filters);
  }

  function reset() {
    Object.assign(state, createClaimInitialState());
    lastLoadedAt.value = null;
    localeCode.value = "en-US";
  }

  return {
    state,
    lastLoadedAt,
    localeCode,
    hasError,
    isReady,
    activeFilterCount,
    filteredItems,
    setLocaleCode,
    setLoading,
    setError,
    clearError,
    setItems,
    setSelected,
    setFilters,
    resetFilters,
    reset,
  };
});
