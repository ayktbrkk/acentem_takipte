import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

function firstNonEmptyObject(...values) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) {
      return value;
    }
  }
  return {};
}

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
  const visibleCards = computed(() => firstNonEmptyObject(state.tabPayload?.cards, state.kpiPayload?.cards, state.cards));
  const visibleSeries = computed(() => firstNonEmptyObject(state.tabPayload?.series, state.kpiPayload?.series, state.series));
  const visibleMetrics = computed(() => firstNonEmptyObject(state.tabPayload?.metrics, state.kpiPayload?.metrics, state.metrics));
  const visiblePreviews = computed(() => firstNonEmptyObject(state.tabPayload?.previews, state.kpiPayload?.previews, state.previews));
  const comparison = computed(() => firstNonEmptyObject(state.kpiPayload?.comparison));
  const meta = computed(() => firstNonEmptyObject(state.tabPayload?.meta, state.kpiPayload?.meta));
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
    if (Object.keys(state.kpiPayload.cards || {}).length) state.cards = state.kpiPayload.cards;
    if (Object.keys(state.kpiPayload.metrics || {}).length) state.metrics = state.kpiPayload.metrics;
    if (Object.keys(state.kpiPayload.series || {}).length) state.series = state.kpiPayload.series;
    if (Object.keys(state.kpiPayload.previews || {}).length) state.previews = state.kpiPayload.previews;
    lastLoadedAt.value = Date.now();
  }

  function setTabPayload(payload) {
    state.tabPayload = payload && typeof payload === "object" ? payload : {};
    if (Object.keys(state.tabPayload.cards || {}).length) state.cards = state.tabPayload.cards;
    if (Object.keys(state.tabPayload.metrics || {}).length) state.metrics = state.tabPayload.metrics;
    if (Object.keys(state.tabPayload.series || {}).length) state.series = state.tabPayload.series;
    if (Object.keys(state.tabPayload.previews || {}).length) state.previews = state.tabPayload.previews;
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
