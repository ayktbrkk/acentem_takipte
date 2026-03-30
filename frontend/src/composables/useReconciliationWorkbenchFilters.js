import { computed, onMounted, watch } from "vue";

import { useCustomFilterPresets } from "./useCustomFilterPresets";

export function useReconciliationWorkbenchFilters({
  t,
  route,
  branchStore,
  accountingStore,
  reloadWorkbench,
  localeCode,
}) {
  const filters = accountingStore.state.filters;

  const activeFilterCount = computed(() => accountingStore.activeFilterCount);
  const sourceDoctypeOptions = computed(() => accountingStore.sourceDoctypeOptions);
  const mismatchOptions = computed(() => [
    { value: "Amount", label: t("mismatchAmount") },
    { value: "Currency", label: t("mismatchCurrency") },
    { value: "Missing External", label: t("mismatchMissingExternal") },
    { value: "Missing Local", label: t("mismatchMissingLocal") },
    { value: "Status", label: t("mismatchStatus") },
    { value: "Other", label: t("mismatchOther") },
  ]);

  const { presetKey, presetOptions, canDeletePreset, applyPreset, onPresetChange, savePreset, deletePreset, persistPresetStateToServer, hydratePresetStateFromServer } =
    useCustomFilterPresets({
      screen: "reconciliation_workbench",
      presetStorageKey: "at:reconciliation-workbench:preset",
      presetListStorageKey: "at:reconciliation-workbench:preset-list",
      t,
      getCurrentPayload: currentWorkbenchPresetPayload,
      setFilterStateFromPayload: setWorkbenchFilterStateFromPayload,
      resetFilterState: resetWorkbenchFilterState,
      refresh: reloadWorkbench,
      getSortLocale: () => localeCode.value,
    });

  function currentWorkbenchPresetPayload() {
    return {
      status: filters.status,
      mismatchType: filters.mismatchType,
      sourceQuery: filters.sourceQuery,
      sourceDoctype: filters.sourceDoctype,
      limit: Number(filters.limit) || 50,
    };
  }

  function setWorkbenchFilterStateFromPayload(payload) {
    filters.status = String(payload?.status || "Open");
    filters.mismatchType = String(payload?.mismatchType || "");
    filters.sourceQuery = String(payload?.sourceQuery || "");
    filters.sourceDoctype = String(payload?.sourceDoctype || "");
    filters.limit = Number(payload?.limit || 50) || 50;
  }

  function applyRouteFilters() {
    const status = String(route.query?.status || "").trim();
    const sourceQuery = String(route.query?.sourceQuery || "").trim();
    const sourceDoctype = String(route.query?.sourceDoctype || "").trim();
    const hasRouteFilters = Boolean(status || sourceQuery || sourceDoctype);
    if (!hasRouteFilters) return false;

    filters.status = status || "Open";
    filters.sourceQuery = sourceQuery;
    filters.sourceDoctype = sourceDoctype;
    return true;
  }

  function resetWorkbenchFilters() {
    applyPreset("default", { refresh: false });
    void persistPresetStateToServer();
    return reloadWorkbench();
  }

  function applyWorkbenchFilters() {
    return reloadWorkbench();
  }

  function resetWorkbenchFilterState() {
    accountingStore.resetFilters();
  }

  onMounted(() => {
    applyPreset(presetKey.value, { refresh: false });
    applyRouteFilters();
    void reloadWorkbench();
    void hydratePresetStateFromServer();
  });

  watch(
    () => [route.query?.status, route.query?.sourceQuery, route.query?.sourceDoctype],
    () => {
      if (!applyRouteFilters()) return;
      void reloadWorkbench();
    }
  );

  watch(
    () => branchStore.selected,
    () => {
      void reloadWorkbench();
    }
  );

  return {
    filters,
    presetKey,
    presetOptions,
    canDeletePreset,
    activeFilterCount,
    sourceDoctypeOptions,
    mismatchOptions,
    applyWorkbenchFilters,
    resetWorkbenchFilters,
    onPresetChange,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
    applyPreset,
    currentWorkbenchPresetPayload,
    setWorkbenchFilterStateFromPayload,
    resetWorkbenchFilterState,
    applyRouteFilters,
  };
}
