import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

function createPaymentInitialState() {
  return {
    items: [],
    selected: null,
    loading: false,
    error: "",
    filters: {
      query: "",
      direction: "",
      customerQuery: "",
      policyQuery: "",
      purposeQuery: "",
      sort: "modified desc",
      limit: 24,
    },
  };
}

function normalizeText(value, localeCode) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase(localeCode || "en-US");
}

function filterPaymentItems(items, filters, localeCode) {
  let rows = Array.isArray(items) ? items.slice() : [];
  const query = normalizeText(filters?.query, localeCode);
  if (query) {
    rows = rows.filter((row) =>
      [row?.payment_no, row?.name, row?.customer, row?.policy].some((value) =>
        normalizeText(value, localeCode).includes(query)
      )
    );
  }
  const customerQuery = normalizeText(filters?.customerQuery, localeCode);
  if (customerQuery) {
    rows = rows.filter((row) => normalizeText(row?.customer, localeCode).includes(customerQuery));
  }
  const policyQuery = normalizeText(filters?.policyQuery, localeCode);
  if (policyQuery) {
    rows = rows.filter((row) => normalizeText(row?.policy, localeCode).includes(policyQuery));
  }
  const purposeQuery = normalizeText(filters?.purposeQuery, localeCode);
  if (purposeQuery) {
    rows = rows.filter((row) => normalizeText(row?.payment_purpose, localeCode).includes(purposeQuery));
  }
  return rows;
}

export const usePaymentStore = defineStore("payment", () => {
  const state = reactive(createPaymentInitialState());
  const lastLoadedAt = ref(null);
  const localeCode = ref("en-US");

  const hasError = computed(() => Boolean(state.error));
  const isReady = computed(() => !state.loading && !state.error);
  const activeFilterCount = computed(() => {
    let count = 0;
    if (state.filters.query) count += 1;
    if (state.filters.direction) count += 1;
    if (state.filters.customerQuery) count += 1;
    if (state.filters.policyQuery) count += 1;
    if (state.filters.purposeQuery) count += 1;
    if (state.filters.sort !== "modified desc") count += 1;
    if (Number(state.filters.limit) !== 24) count += 1;
    return count;
  });
  const filteredItems = computed(() => filterPaymentItems(state.items, state.filters, localeCode.value));
  const inboundTotal = computed(() =>
    filteredItems.value
      .filter((row) => row.payment_direction === "Inbound")
      .reduce((sum, row) => sum + Number(row.amount_try || 0), 0)
  );
  const outboundTotal = computed(() =>
    filteredItems.value
      .filter((row) => row.payment_direction === "Outbound")
      .reduce((sum, row) => sum + Number(row.amount_try || 0), 0)
  );

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
    Object.assign(state.filters, createPaymentInitialState().filters);
  }

  function reset() {
    Object.assign(state, createPaymentInitialState());
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
    inboundTotal,
    outboundTotal,
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
