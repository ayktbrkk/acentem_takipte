import { computed, ref } from "vue";
import { createResource } from "frappe-ui";

import {
  extractCustomFilterPresetId,
  isCustomFilterPresetValue,
  makeCustomFilterPresetValue,
  readFilterPresetKey,
  readFilterPresetList,
  writeFilterPresetKey,
  writeFilterPresetList,
} from "../utils/filterPresetState";

function hasMeaningfulPresetState(selectedKey, presets) {
  return String(selectedKey || "default") !== "default" || (Array.isArray(presets) && presets.length > 0);
}

function makeRandomPresetId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function resolveLocale(getSortLocale) {
  try {
    const value = typeof getSortLocale === "function" ? getSortLocale() : getSortLocale;
    return String(value || "").trim() || undefined;
  } catch {
    return undefined;
  }
}

export function useCustomFilterPresets({
  screen,
  presetStorageKey,
  presetListStorageKey,
  t,
  getCurrentPayload,
  setFilterStateFromPayload,
  resetFilterState,
  refresh,
  getSortLocale,
}) {
  const presetKey = ref(readFilterPresetKey(presetStorageKey, "default"));
  const customPresets = ref(readFilterPresetList(presetListStorageKey));

  const presetServerReadResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
    auto: false,
  });
  const presetServerWriteResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
    auto: false,
  });

  const presetOptions = computed(() => [
    { value: "default", label: t("presetDefault") },
    ...customPresets.value.map((preset) => ({
      value: makeCustomFilterPresetValue(preset.id),
      label: preset.label,
    })),
  ]);
  const canDeletePreset = computed(() => isCustomFilterPresetValue(presetKey.value));

  function applyPreset(key, { refresh: shouldRefresh = true } = {}) {
    const requested = String(key || "default");
    if (isCustomFilterPresetValue(requested)) {
      const customId = extractCustomFilterPresetId(requested);
      const presetRow = customPresets.value.find((item) => item.id === customId);
      if (!presetRow) {
        return applyPreset("default", { refresh: shouldRefresh });
      }
      presetKey.value = requested;
      writeFilterPresetKey(presetStorageKey, requested);
      setFilterStateFromPayload(presetRow.payload || {});
      if (shouldRefresh) return refresh?.();
      return undefined;
    }

    presetKey.value = "default";
    writeFilterPresetKey(presetStorageKey, "default");
    resetFilterState();
    if (shouldRefresh) return refresh?.();
    return undefined;
  }

  function onPresetChange(nextKey) {
    presetKey.value = String(nextKey || "default");
    applyPreset(presetKey.value, { refresh: true });
    void persistPresetStateToServer();
  }

  function savePreset() {
    const currentCustomId = extractCustomFilterPresetId(presetKey.value);
    const currentCustom = currentCustomId ? customPresets.value.find((item) => item.id === currentCustomId) : null;
    const initialName = currentCustom?.label || "";
    const name = String(window.prompt(t("savePresetPrompt"), initialName) || "").trim();
    if (!name) return;

    const existing = customPresets.value.find((item) => item.label.toLowerCase() === name.toLowerCase());
    const targetId = currentCustomId || existing?.id || makeRandomPresetId();
    const nextList = customPresets.value.filter((item) => item.id !== targetId);
    nextList.push({ id: targetId, label: name, payload: getCurrentPayload() || {} });

    const locale = resolveLocale(getSortLocale);
    customPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, locale));
    writeFilterPresetList(presetListStorageKey, customPresets.value);
    presetKey.value = makeCustomFilterPresetValue(targetId);
    writeFilterPresetKey(presetStorageKey, presetKey.value);
    void persistPresetStateToServer();
  }

  function deletePreset() {
    if (!canDeletePreset.value) return;
    if (!window.confirm(t("deletePresetConfirm"))) return;
    const customId = extractCustomFilterPresetId(presetKey.value);
    if (!customId) return;
    customPresets.value = customPresets.value.filter((item) => item.id !== customId);
    writeFilterPresetList(presetListStorageKey, customPresets.value);
    applyPreset("default", { refresh: true });
    void persistPresetStateToServer();
  }

  async function persistPresetStateToServer() {
    try {
      await presetServerWriteResource.submit({
        screen,
        selected_key: presetKey.value,
        custom_presets: customPresets.value,
      });
    } catch {
      // localStorage fallback
    }
  }

  async function hydratePresetStateFromServer() {
    try {
      const remote = await presetServerReadResource.reload({ screen });
      const remoteSelectedKey = String(remote?.selected_key || "default");
      const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];

      const localHasState = hasMeaningfulPresetState(presetKey.value, customPresets.value);
      const remoteHasState = hasMeaningfulPresetState(remoteSelectedKey, remoteCustomPresets);
      if (!remoteHasState) {
        if (localHasState) void persistPresetStateToServer();
        return;
      }

      const localSnapshot = JSON.stringify({
        selected_key: presetKey.value,
        custom_presets: customPresets.value,
      });
      const remoteSnapshot = JSON.stringify({
        selected_key: remoteSelectedKey,
        custom_presets: remoteCustomPresets,
      });
      if (localSnapshot === remoteSnapshot) return;

      customPresets.value = remoteCustomPresets;
      writeFilterPresetList(presetListStorageKey, customPresets.value);
      applyPreset(remoteSelectedKey, { refresh: true });
    } catch {
      // localStorage fallback
    }
  }

  return {
    presetKey,
    customPresets,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
  };
}
