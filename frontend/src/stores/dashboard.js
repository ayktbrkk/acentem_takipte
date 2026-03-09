import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

function createDashboardInitialState() {
  return {
    items: [],
    selected: null,
    loading: false,
    error: "",
    range: 30,
    activeTab: "daily",
    comparisonMode: "previous_period",
    kpiPayload: {},
    tabPayload: {},
    cards: {},
    metrics: {},
    series: {},
    previews: {},
  };
}

export const useDashboardStore = defineStore("dashboard", () => {
  const state = reactive(createDashboardInitialState());
  const lastLoadedAt = ref(null);

  const hasError = computed(() => Boolean(state.error));
  const isReady = computed(() => !state.loading && !state.error);
  const visibleCards = computed(() => state.tabPayload?.cards || state.kpiPayload?.cards || state.cards || {});
  const visibleSeries = computed(() => state.tabPayload?.series || state.kpiPayload?.series || state.series || {});
  const visibleMetrics = computed(() => state.tabPayload?.metrics || state.kpiPayload?.metrics || state.metrics || {});
  const visiblePreviews = computed(() => state.tabPayload?.previews || state.previews || {});
  const comparison = computed(() => state.kpiPayload?.comparison || {});
  const meta = computed(() => state.tabPayload?.meta || state.kpiPayload?.meta || {});
  const previousCards = computed(() => {
    const tabCards = state.tabPayload?.compare_cards;
    if (tabCards && typeof tabCards === "object" && Object.keys(tabCards).length) return tabCards;
    const comparisonCards = state.kpiPayload?.comparison?.cards;
    return comparisonCards && typeof comparisonCards === "object" ? comparisonCards : {};
  });
  const renewalBucketCounts = computed(() => {
    const serverBuckets = visibleSeries.value?.renewal_buckets;
    if (serverBuckets && typeof serverBuckets === "object") {
      return {
        overdue: Number(serverBuckets.overdue || 0),
        due7: Number(serverBuckets.due7 || 0),
        due30: Number(serverBuckets.due30 || 0),
      };
    }
    return {
      overdue: 0,
      due7: 0,
      due30: 0,
    };
  });
  const renewalRetentionSummary = computed(() => {
    const serverRetention = visibleSeries.value?.renewal_retention;
    if (serverRetention && typeof serverRetention === "object") {
      return {
        renewed: Number(serverRetention.renewed || 0),
        lost: Number(serverRetention.lost || 0),
        cancelled: Number(serverRetention.cancelled || 0),
        rate: Number(serverRetention.rate || 0),
      };
    }
    return {
      renewed: 0,
      lost: 0,
      cancelled: 0,
      rate: 0,
    };
  });

  function setLoading(value) {
    state.loading = Boolean(value);
  }

  function setError(message) {
    state.error = String(message || "");
  }

  function clearError() {
    state.error = "";
  }

  function setRange(value) {
    state.range = Number(value || 30) || 30;
  }

  function setActiveTab(value) {
    state.activeTab = String(value || "daily");
  }

  function setComparisonMode(value) {
    state.comparisonMode = String(value || "previous_period");
  }

  function setKpiPayload(payload) {
    state.kpiPayload = payload && typeof payload === "object" ? payload : {};
    state.cards = state.kpiPayload.cards || state.cards;
    state.metrics = state.kpiPayload.metrics || state.metrics;
    state.series = state.kpiPayload.series || state.series;
    state.previews = state.kpiPayload.previews || state.previews;
    lastLoadedAt.value = Date.now();
  }

  function setTabPayload(payload) {
    state.tabPayload = payload && typeof payload === "object" ? payload : {};
    state.cards = state.tabPayload.cards || state.cards;
    state.metrics = state.tabPayload.metrics || state.metrics;
    state.series = state.tabPayload.series || state.series;
    state.previews = state.tabPayload.previews || state.previews;
    lastLoadedAt.value = Date.now();
  }

  function setItems(items) {
    state.items = Array.isArray(items) ? items : [];
  }

  function setSelected(selected) {
    state.selected = selected || null;
  }

  function applyPayload(payload) {
    const next = payload && typeof payload === "object" ? payload : {};
    state.cards = next.cards || {};
    state.metrics = next.metrics || {};
    state.series = next.series || {};
    state.previews = next.previews || {};
    state.items = Array.isArray(next.items) ? next.items : state.items;
    lastLoadedAt.value = Date.now();
  }

  function reset() {
    Object.assign(state, createDashboardInitialState());
    lastLoadedAt.value = null;
  }

  return {
    state,
    lastLoadedAt,
    hasError,
    isReady,
    visibleCards,
    visibleSeries,
    visibleMetrics,
    visiblePreviews,
    comparison,
    meta,
    previousCards,
    renewalBucketCounts,
    renewalRetentionSummary,
    setLoading,
    setError,
    clearError,
    setRange,
    setActiveTab,
    setComparisonMode,
    setKpiPayload,
    setTabPayload,
    setItems,
    setSelected,
    applyPayload,
    reset,
  };
});
