import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

function createCustomerInitialState() {
  return {
    items: [],
    selected: null,
    loading: false,
    error: "",
    filters: {
      query: "",
      consent_status: "",
      gender: "",
      marital_status: "",
      assigned_agent: "",
      occupation: "",
      has_phone: false,
      has_email: false,
      has_active_policy: false,
      has_open_offer: false,
      sort: "modified desc",
    },
    pagination: {
      page: 1,
      pageLength: 20,
      total: 0,
    },
  };
}

export const useCustomerStore = defineStore("customer", () => {
  const state = reactive(createCustomerInitialState());
  const lastLoadedAt = ref(null);

  const hasError = computed(() => Boolean(state.error));
  const isReady = computed(() => !state.loading && !state.error);
  const activeFilterCount = computed(
    () =>
      [
        state.filters.query,
        state.filters.consent_status,
        state.filters.gender,
        state.filters.marital_status,
        state.filters.assigned_agent,
        state.filters.occupation,
        state.filters.has_phone ? "1" : "",
        state.filters.has_email ? "1" : "",
        state.filters.has_active_policy ? "1" : "",
        state.filters.has_open_offer ? "1" : "",
      ].filter((value) => String(value ?? "").trim() !== "").length
  );
  const totalPages = computed(() =>
    Math.max(1, Math.ceil((state.pagination.total || 0) / state.pagination.pageLength || 1))
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

  function applyListPayload(payload) {
    const next = payload && typeof payload === "object" ? payload : {};
    setItems(next.rows);
    setTotal(next.total);
  }

  function reset() {
    Object.assign(state, createCustomerInitialState());
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
