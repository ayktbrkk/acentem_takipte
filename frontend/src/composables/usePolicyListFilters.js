import { computed, reactive, ref, unref } from "vue";

import {
  extractCustomFilterPresetId,
  isCustomFilterPresetValue,
  makeCustomFilterPresetValue,
  readFilterPresetKey,
  readFilterPresetList,
  writeFilterPresetKey,
  writeFilterPresetList,
} from "../utils/filterPresetState";

const POLICY_PRESET_STORAGE_KEY = "at:policy-list:preset";
const POLICY_PRESET_LIST_STORAGE_KEY = "at:policy-list:preset-list";

function dateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeRandomPresetId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function usePolicyListFilters({
  t,
  localeCode,
  filters,
  pagination,
  refreshPolicyList,
  persistPolicyPresetStateToServer,
}) {
  const policyPresetKey = ref(readFilterPresetKey(POLICY_PRESET_STORAGE_KEY, "default"));
  const policyCustomPresets = ref(readFilterPresetList(POLICY_PRESET_LIST_STORAGE_KEY));
  const policyListSearchQuery = ref("");
  const policyListLocalFilters = reactive({ status: "", branch: "" });

  const policyPresetOptions = computed(() => [
    { value: "default", label: t("presetDefault") },
    { value: "active", label: t("presetActive") },
    { value: "expiring30", label: t("presetExpiring30") },
    { value: "highPremium", label: t("presetHighPremium") },
    ...policyCustomPresets.value.map((preset) => ({
      value: makeCustomFilterPresetValue(preset.id),
      label: preset.label,
    })),
  ]);
  const canDeletePolicyPreset = computed(() => isCustomFilterPresetValue(policyPresetKey.value));
  const policyListActiveCount = computed(
    () =>
      (policyListSearchQuery.value.trim() ? 1 : 0) +
      Object.values(policyListLocalFilters).filter((value) => String(value || "").trim() !== "").length
  );

  function currentPolicyPresetPayload() {
    return {
      query: filters.query,
      insurance_company: filters.insurance_company,
      end_date: filters.end_date,
      status: filters.status,
      customer: filters.customer,
      gross_min: filters.gross_min,
      gross_max: filters.gross_max,
      sort: filters.sort,
      pageLength: pagination.pageLength,
    };
  }

  function applyPolicyPreset(key, { refresh = true } = {}) {
    const requested = String(key || "default");

    if (isCustomFilterPresetValue(requested)) {
      const customId = extractCustomFilterPresetId(requested);
      const presetRow = policyCustomPresets.value.find((item) => item.id === customId);
      if (!presetRow) {
        applyPolicyPreset("default", { refresh });
        return;
      }
      const payload = presetRow.payload || {};
      policyPresetKey.value = requested;
      writeFilterPresetKey(POLICY_PRESET_STORAGE_KEY, requested);
      filters.query = String(payload.query || "");
      filters.insurance_company = String(payload.insurance_company || "");
      filters.end_date = String(payload.end_date || "");
      filters.status = String(payload.status || "");
      filters.customer = String(payload.customer || "");
      filters.gross_min = payload.gross_min != null ? String(payload.gross_min) : "";
      filters.gross_max = payload.gross_max != null ? String(payload.gross_max) : "";
      filters.sort = String(payload.sort || "modified desc");
      pagination.pageLength = Number(payload.pageLength || 20) || 20;
      pagination.page = 1;
      if (refresh) refreshPolicyList?.();
      return;
    }

    policyPresetKey.value = requested;
    writeFilterPresetKey(POLICY_PRESET_STORAGE_KEY, requested);
    filters.query = "";
    filters.insurance_company = "";
    filters.end_date = "";
    filters.status = "";
    filters.customer = "";
    filters.gross_min = "";
    filters.gross_max = "";
    filters.sort = "modified desc";
    pagination.pageLength = 20;

    if (requested === "active") {
      filters.status = "Active";
    } else if (requested === "expiring30") {
      filters.status = "Active";
      filters.end_date = dateAfterDays(30);
      filters.sort = "end_date asc";
    } else if (requested === "highPremium") {
      filters.sort = "gross_premium desc";
      filters.gross_min = "10000";
    }

    pagination.page = 1;
    if (refresh) refreshPolicyList?.();
  }

  function onPolicyPresetChange() {
    applyPolicyPreset(policyPresetKey.value, { refresh: true });
    void persistPolicyPresetStateToServer?.();
  }

  function onPolicyListFilterChange({ key, value }) {
    const nextValue = String(value || "");
    policyListLocalFilters[key] = key === "status" ? nextValue.toLocaleLowerCase(unref(localeCode)) : nextValue;
    pagination.page = 1;
  }

  function onPolicyListFilterReset() {
    policyListSearchQuery.value = "";
    policyListLocalFilters.status = "";
    policyListLocalFilters.branch = "";
    pagination.page = 1;
  }

  function savePolicyPreset() {
    const currentCustomId = extractCustomFilterPresetId(policyPresetKey.value);
    const currentCustom = currentCustomId ? policyCustomPresets.value.find((item) => item.id === currentCustomId) : null;
    const initialName = currentCustom?.label || "";
    const name = String(window.prompt(t("savePresetPrompt"), initialName) || "").trim();
    if (!name) return;

    const existing = policyCustomPresets.value.find((item) => item.label.toLowerCase() === name.toLowerCase());
    const targetId = currentCustomId || existing?.id || makeRandomPresetId();
    const nextList = policyCustomPresets.value.filter((item) => item.id !== targetId);
    nextList.push({
      id: targetId,
      label: name,
      payload: currentPolicyPresetPayload(),
    });
    policyCustomPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, unref(localeCode)));
    writeFilterPresetList(POLICY_PRESET_LIST_STORAGE_KEY, policyCustomPresets.value);
    policyPresetKey.value = makeCustomFilterPresetValue(targetId);
    writeFilterPresetKey(POLICY_PRESET_STORAGE_KEY, policyPresetKey.value);
    void persistPolicyPresetStateToServer?.();
  }

  function deletePolicyPreset() {
    if (!canDeletePolicyPreset.value) return;
    if (!window.confirm(t("deletePresetConfirm"))) return;
    const customId = extractCustomFilterPresetId(policyPresetKey.value);
    if (!customId) return;
    policyCustomPresets.value = policyCustomPresets.value.filter((item) => item.id !== customId);
    writeFilterPresetList(POLICY_PRESET_LIST_STORAGE_KEY, policyCustomPresets.value);
    applyPolicyPreset("default", { refresh: true });
    void persistPolicyPresetStateToServer?.();
  }

  return {
    POLICY_PRESET_STORAGE_KEY,
    POLICY_PRESET_LIST_STORAGE_KEY,
    policyPresetKey,
    policyCustomPresets,
    policyPresetOptions,
    canDeletePolicyPreset,
    policyListSearchQuery,
    policyListLocalFilters,
    policyListActiveCount,
    currentPolicyPresetPayload,
    applyPolicyPreset,
    onPolicyPresetChange,
    onPolicyListFilterChange,
    onPolicyListFilterReset,
    savePolicyPreset,
    deletePolicyPreset,
  };
}
