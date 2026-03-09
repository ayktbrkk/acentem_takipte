import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

function createCommunicationInitialState() {
  return {
    snapshot: {},
    loading: false,
    error: "",
    filters: {
      customer: "",
      status: "",
      channel: "",
      referenceDoctype: "",
      referenceName: "",
      limit: 50,
    },
  };
}

export const useCommunicationStore = defineStore("communication", () => {
  const state = reactive(createCommunicationInitialState());
  const lastLoadedAt = ref(null);

  const hasError = computed(() => Boolean(state.error));
  const isReady = computed(() => !state.loading && !state.error);
  const outboxItems = computed(() => state.snapshot?.outbox || []);
  const draftItems = computed(() => state.snapshot?.drafts || []);
  const breakdown = computed(() => state.snapshot?.status_breakdown || []);
  const activeFilterCount = computed(() => {
    let count = 0;
    if (state.filters.customer) count += 1;
    if (state.filters.status) count += 1;
    if (state.filters.channel) count += 1;
    if (state.filters.referenceDoctype) count += 1;
    if (state.filters.referenceName) count += 1;
    if (Number(state.filters.limit) !== 50) count += 1;
    return count;
  });

  function statusCount(status) {
    const row = breakdown.value.find((item) => item.status === status);
    return Number(row?.total || 0);
  }

  const statusCards = computed(() => [
    { key: "queued", status: "Queued", value: statusCount("Queued") },
    { key: "processing", status: "Processing", value: statusCount("Processing") },
    { key: "sent", status: "Sent", value: statusCount("Sent") },
    { key: "failed", status: "Failed", value: statusCount("Failed") },
    { key: "dead", status: "Dead", value: statusCount("Dead") },
  ]);

  function setLoading(value) {
    state.loading = Boolean(value);
  }

  function setError(message) {
    state.error = String(message || "");
  }

  function clearError() {
    state.error = "";
  }

  function setSnapshot(payload) {
    state.snapshot = payload && typeof payload === "object" ? payload : {};
    lastLoadedAt.value = Date.now();
  }

  function setFilters(nextFilters) {
    Object.assign(state.filters, nextFilters && typeof nextFilters === "object" ? nextFilters : {});
  }

  function resetFilters() {
    Object.assign(state.filters, createCommunicationInitialState().filters);
  }

  function reset() {
    Object.assign(state, createCommunicationInitialState());
    lastLoadedAt.value = null;
  }

  return {
    state,
    lastLoadedAt,
    hasError,
    isReady,
    outboxItems,
    draftItems,
    breakdown,
    activeFilterCount,
    statusCards,
    setLoading,
    setError,
    clearError,
    setSnapshot,
    setFilters,
    resetFilters,
    reset,
  };
});
