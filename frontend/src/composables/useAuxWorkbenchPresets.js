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

function presetCopy(localeCode) {
  const locale = String(localeCode || "").toLowerCase();
  const isTurkish = locale.startsWith("tr");
  return {
    presetDefault: isTurkish ? "Standart" : "Default",
    savePresetPrompt: isTurkish ? "Şablon adı" : "Preset name",
    deletePresetConfirm: isTurkish ? "Bu özel şablon silinsin mi?" : "Delete this custom preset?",
  };
}

export function useAuxWorkbenchPresets({
  screenKey,
  localeCode,
  presetDefs,
  currentPresetPayload,
  setFilterStateFromPayload,
  refreshList,
}) {
  const presetStorageKey = `at:aux:${screenKey}:preset`;
  const presetListStorageKey = `at:aux:${screenKey}:preset-list`;

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
    { value: "default", label: presetCopy(localeCode.value).presetDefault },
    ...(presetDefs || []).map((preset) => ({
      value: preset.key,
      label:
        typeof preset.label === "string"
          ? preset.label
          : preset.label?.[localeCode.value === "tr-TR" ? "tr" : "en"] || preset.label?.en || preset.label?.tr || preset.key,
    })),
    ...customPresets.value.map((preset) => ({
      value: makeCustomFilterPresetValue(preset.id),
      label: preset.label,
    })),
  ]);
  const canDeletePreset = computed(() => isCustomFilterPresetValue(presetKey.value));

  function applyPreset(key, { refresh = true } = {}) {
    const requested = String(key || "default");
    if (isCustomFilterPresetValue(requested)) {
      const customId = extractCustomFilterPresetId(requested);
      const presetRow = customPresets.value.find((item) => item.id === customId);
      if (!presetRow) {
        return applyPreset("default", { refresh });
      }
      presetKey.value = requested;
      writeFilterPresetKey(presetStorageKey, requested);
      setFilterStateFromPayload(presetRow.payload || {});
      if (refresh) return refreshList?.();
      return undefined;
    }

    presetKey.value = "default";
    writeFilterPresetKey(presetStorageKey, "default");
    const builtInPreset = (presetDefs || []).find((item) => item.key === requested);
    presetKey.value = requested;
    setFilterStateFromPayload(builtInPreset?.payload || {});
    if (refresh) return refreshList?.();
    return undefined;
  }

  function onPresetChange() {
    applyPreset(presetKey.value, { refresh: true });
    void persistPresetStateToServer();
  }

  function onPresetModelValue(value) {
    presetKey.value = String(value || "default");
  }

  function savePreset() {
    const currentCustomId = extractCustomFilterPresetId(presetKey.value);
    const currentCustom = currentCustomId ? customPresets.value.find((item) => item.id === currentCustomId) : null;
    const initialName = currentCustom?.label || "";
    const name = String(window.prompt(presetCopy(localeCode.value).savePresetPrompt, initialName) || "").trim();
    if (!name) return;

    const existing = customPresets.value.find((item) => item.label.toLowerCase() === name.toLowerCase());
    const targetId = currentCustomId || existing?.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const nextList = customPresets.value.filter((item) => item.id !== targetId);
    nextList.push({ id: targetId, label: name, payload: currentPresetPayload() });
    customPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, localeCode.value));
    writeFilterPresetList(presetListStorageKey, customPresets.value);
    presetKey.value = makeCustomFilterPresetValue(targetId);
    writeFilterPresetKey(presetStorageKey, presetKey.value);
    void persistPresetStateToServer();
  }

  function deletePreset() {
    if (!canDeletePreset.value) return;
    if (!window.confirm(presetCopy(localeCode.value).deletePresetConfirm)) return;
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
        screen: screenKey,
        selected_key: presetKey.value,
        custom_presets: customPresets.value,
      });
    } catch {
      // localStorage fallback
    }
  }

  async function hydratePresetStateFromServer() {
    try {
      const remote = await presetServerReadResource.reload({ screen: screenKey });
      const remoteSelectedKey = String(remote?.selected_key || "default");
      const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];

      const localHasState = hasMeaningfulPresetState(presetKey.value, customPresets.value);
      const remoteHasState = hasMeaningfulPresetState(remoteSelectedKey, remoteCustomPresets);
      if (!remoteHasState) {
        if (localHasState) void persistPresetStateToServer();
        return;
      }

      const localSnapshot = JSON.stringify({ selected_key: presetKey.value, custom_presets: customPresets.value });
      const remoteSnapshot = JSON.stringify({ selected_key: remoteSelectedKey, custom_presets: remoteCustomPresets });
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
    onPresetModelValue,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
  };
}
