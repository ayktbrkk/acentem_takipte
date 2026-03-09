import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

function createPolicyInitialState() {
  return {
    items: [],
    selected: null,
    loading: false,
    error: "",
    filters: {
      query: "",
      insurance_company: "",
      end_date: "",
      status: "",
      customer: "",
      gross_min: "",
      gross_max: "",
      sort: "modified desc",
    },
    pagination: {
      page: 1,
      pageLength: 20,
      total: 0,
    },
  };
}

export const usePolicyStore = defineStore("policy", () => {
  const state = reactive(createPolicyInitialState());
  const lastLoadedAt = ref(null);

  const hasError = computed(() => Boolean(state.error));
  const isReady = computed(() => !state.loading && !state.error);
  const activeFilterCount = computed(
    () =>
      [
        state.filters.query,
        state.filters.insurance_company,
        state.filters.end_date,
        state.filters.status,
        state.filters.customer,
        state.filters.gross_min,
        state.filters.gross_max,
      ].filter((value) => String(value ?? "").trim() !== "").length
  );
  const totalPages = computed(() =>
    state.pagination.total ? Math.max(1, Math.ceil(state.pagination.total / state.pagination.pageLength)) : 1
  );
  const hasNextPage = computed(() => state.pagination.page < totalPages.value);
  const startRow = computed(() =>
    state.pagination.total ? (state.pagination.page - 1) * state.pagination.pageLength + 1 : 0
  );
  const endRow = computed(() =>
    state.pagination.total ? Math.min(state.pagination.total, state.pagination.page * state.pagination.pageLength) : 0
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
    lastLoadedAt.value = Date.now();
  }

  function setSelected(selected) {
    state.selected = selected || null;
  }

  function setFilters(nextFilters) {
    Object.assign(state.filters, nextFilters && typeof nextFilters === "object" ? nextFilters : {});
  }

  function setPagination(nextPagination) {
    Object.assign(state.pagination, nextPagination && typeof nextPagination === "object" ? nextPagination : {});
  }

  function setTotal(value) {
    const total = Number(value || 0);
    state.pagination.total = Number.isFinite(total) ? total : 0;
  }

  function applyListPayload(items, total) {
    setItems(items);
    setTotal(total);
  }

  function reset() {
    Object.assign(state, createPolicyInitialState());
    lastLoadedAt.value = null;
  }

  return {
    state,
    lastLoadedAt,
    hasError,
    isReady,
    activeFilterCount,
    totalPages,
    hasNextPage,
    startRow,
    endRow,
    setLoading,
    setError,
    clearError,
    setItems,
    setSelected,
    setFilters,
    setPagination,
    setTotal,
    applyListPayload,
    reset,
  };
});
