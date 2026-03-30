import { createResource } from "frappe-ui";

import { writeFilterPresetList } from "../utils/filterPresetState";

function hasMeaningfulPolicyPresetState(selectedKey, presets) {
  return String(selectedKey || "default") !== "default" || (Array.isArray(presets) && presets.length > 0);
}

export function usePolicyListPresetSync({
  presetKey,
  customPresets,
  applyPolicyPreset,
  screen = "policy_list",
  presetListStorageKey = "at:policy-list:preset-list",
  policyPresetServerReadResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
    auto: false,
  }),
  policyPresetServerWriteResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
    auto: false,
  }),
}) {
  async function persistPolicyPresetStateToServer() {
    try {
      await policyPresetServerWriteResource.submit({
        screen,
        selected_key: presetKey.value,
        custom_presets: customPresets.value,
      });
    } catch {
      // Keep localStorage as fallback; server sync is best-effort.
    }
  }

  async function hydratePolicyPresetStateFromServer() {
    try {
      const remote = await policyPresetServerReadResource.reload({ screen });
      const remoteSelectedKey = String(remote?.selected_key || "default");
      const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];

      const localHasState = hasMeaningfulPolicyPresetState(presetKey.value, customPresets.value);
      const remoteHasState = hasMeaningfulPolicyPresetState(remoteSelectedKey, remoteCustomPresets);

      if (!remoteHasState) {
        if (localHasState) {
          void persistPolicyPresetStateToServer();
        }
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
      applyPolicyPreset?.(remoteSelectedKey, { refresh: true });
    } catch {
      // Keep local-only behavior on any API error.
    }
  }

  return {
    policyPresetServerReadResource,
    policyPresetServerWriteResource,
    hasMeaningfulPolicyPresetState,
    persistPolicyPresetStateToServer,
    hydratePolicyPresetStateFromServer,
  };
}
