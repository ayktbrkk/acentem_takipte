import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("frappe-ui", () => ({
  createResource: vi.fn(() => ({
    reload: vi.fn(async () => ({})),
    submit: vi.fn(async () => ({})),
  })),
}));

import { usePolicyListPresetSync } from "./usePolicyListPresetSync";

function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
  };
}

describe("usePolicyListPresetSync", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: createLocalStorageMock(),
      configurable: true,
    });
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("persists preset state to the server using the current selected key and custom presets", async () => {
    const presetKey = ref("custom:saved");
    const customPresets = ref([{ id: "saved", label: "Saved", payload: { query: "abc" } }]);
    const submit = vi.fn(async () => ({}));

    const result = usePolicyListPresetSync({
      presetKey,
      customPresets,
      policyPresetServerWriteResource: { submit },
    });

    await result.persistPolicyPresetStateToServer();

    expect(submit).toHaveBeenCalledWith({
      screen: "policy_list",
      selected_key: "custom:saved",
      custom_presets: [{ id: "saved", label: "Saved", payload: { query: "abc" } }],
    });
  });

  it("pushes local state to the server when the remote state is empty", async () => {
    const presetKey = ref("custom:local");
    const customPresets = ref([{ id: "local", label: "Local", payload: { query: "local" } }]);
    const submit = vi.fn(async () => ({}));
    const reload = vi.fn(async () => ({ selected_key: "default", custom_presets: [] }));

    const result = usePolicyListPresetSync({
      presetKey,
      customPresets,
      policyPresetServerReadResource: { reload },
      policyPresetServerWriteResource: { submit },
      applyPolicyPreset: vi.fn(),
    });

    await result.hydratePolicyPresetStateFromServer();

    expect(reload).toHaveBeenCalledWith({ screen: "policy_list" });
    expect(submit).toHaveBeenCalledWith({
      screen: "policy_list",
      selected_key: "custom:local",
      custom_presets: [{ id: "local", label: "Local", payload: { query: "local" } }],
    });
  });

  it("hydrates differing remote state into local storage and reapplies the remote preset", async () => {
    const presetKey = ref("default");
    const customPresets = ref([]);
    const applyPolicyPreset = vi.fn();
    const reload = vi.fn(async () => ({
      selected_key: "custom:remote",
      custom_presets: [{ id: "remote", label: "Remote", payload: { status: "Active" } }],
    }));

    const result = usePolicyListPresetSync({
      presetKey,
      customPresets,
      policyPresetServerReadResource: { reload },
      applyPolicyPreset,
      presetListStorageKey: "at:policy-list:preset-list",
    });

    await result.hydratePolicyPresetStateFromServer();

    expect(customPresets.value).toEqual([{ id: "remote", label: "Remote", payload: { status: "Active" } }]);
    expect(JSON.parse(window.localStorage.getItem("at:policy-list:preset-list"))).toEqual(customPresets.value);
    expect(applyPolicyPreset).toHaveBeenCalledWith("custom:remote", { refresh: false });
  });
});
