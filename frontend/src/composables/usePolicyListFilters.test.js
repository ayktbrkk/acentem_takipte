import { beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";

import { usePolicyListFilters } from "./usePolicyListFilters";
import { makeCustomFilterPresetValue } from "../utils/filterPresetState";

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

describe("usePolicyListFilters", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: createLocalStorageMock(),
      configurable: true,
    });
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("hydrates preset state from local storage and computes active filter count from local filters", () => {
    window.localStorage.setItem("at:policy-list:preset", "custom:vip");
    window.localStorage.setItem(
      "at:policy-list:preset-list",
      JSON.stringify([{ id: "vip", label: "VIP", payload: { query: "Alice", pageLength: 50 } }])
    );

    const filters = reactive({
      query: "",
      insurance_company: "",
      end_date: "",
      status: "",
      customer: "",
      gross_min: "",
      gross_max: "",
      sort: "modified desc",
    });
    const pagination = reactive({ page: 3, pageLength: 20 });

    const result = usePolicyListFilters({
      t: (key) => key,
      localeCode: "tr-TR",
      filters,
      pagination,
      refreshPolicyList: vi.fn(),
    });

    result.policyListSearchQuery.value = "ACME";
    result.onPolicyListFilterChange({ key: "status", value: "Active" });
    result.onPolicyListFilterChange({ key: "branch", value: "Yangin" });

    expect(result.policyPresetKey.value).toBe("custom:vip");
    expect(result.policyCustomPresets.value).toEqual([{ id: "vip", label: "VIP", payload: { query: "Alice", pageLength: 50 } }]);
    expect(result.policyPresetOptions.value).toEqual(
      expect.arrayContaining([{ value: "default", label: "presetDefault" }, { value: "custom:vip", label: "VIP" }])
    );
    expect(result.canDeletePolicyPreset.value).toBe(true);
    expect(result.policyListLocalFilters).toEqual({ status: "active", branch: "Yangin" });
    expect(result.policyListActiveCount.value).toBe(3);
    expect(pagination.page).toBe(1);
  });

  it("applies built-in and custom presets while persisting the selected preset key", () => {
    const filters = reactive({
      query: "before",
      insurance_company: "",
      end_date: "",
      status: "",
      customer: "",
      gross_min: "",
      gross_max: "",
      sort: "modified desc",
    });
    const pagination = reactive({ page: 4, pageLength: 20 });
    const refreshPolicyList = vi.fn();

    const result = usePolicyListFilters({
      t: (key) => key,
      localeCode: "en-US",
      filters,
      pagination,
      refreshPolicyList,
    });

    result.policyCustomPresets.value = [
      {
        id: "saved",
        label: "Saved",
        payload: {
          query: "Bob",
          insurance_company: "ACME",
          end_date: "2026-04-01",
          status: "KYT",
          customer: "Customer",
          gross_min: "100",
          gross_max: "200",
          sort: "gross_premium desc",
          pageLength: 50,
        },
      },
    ];

    result.applyPolicyPreset("expiring30", { refresh: false });
    expect(result.policyPresetKey.value).toBe("expiring30");
    expect(filters.status).toBe("Active");
    expect(filters.sort).toBe("end_date asc");
    expect(filters.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(window.localStorage.getItem("at:policy-list:preset")).toBe("expiring30");
    expect(pagination.page).toBe(1);

    result.applyPolicyPreset(makeCustomFilterPresetValue("saved"));
    expect(filters).toMatchObject({
      query: "Bob",
      insurance_company: "ACME",
      end_date: "2026-04-01",
      status: "KYT",
      customer: "Customer",
      gross_min: "100",
      gross_max: "200",
      sort: "gross_premium desc",
    });
    expect(pagination.pageLength).toBe(50);
    expect(refreshPolicyList).toHaveBeenCalledTimes(1);
  });

  it("saves and deletes custom presets while persisting list storage", () => {
    vi.spyOn(window, "prompt").mockReturnValue("Team View");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const filters = reactive({
      query: "ZX",
      insurance_company: "Carrier",
      end_date: "",
      status: "Active",
      customer: "",
      gross_min: "10",
      gross_max: "",
      sort: "modified desc",
    });
    const pagination = reactive({ page: 2, pageLength: 20 });
    const refreshPolicyList = vi.fn();

    const result = usePolicyListFilters({
      t: (key) => key,
      localeCode: "en-US",
      filters,
      pagination,
      refreshPolicyList,
      persistPolicyPresetStateToServer: vi.fn(),
    });

    result.savePolicyPreset();

    expect(result.policyCustomPresets.value).toHaveLength(1);
    expect(result.policyCustomPresets.value[0]).toMatchObject({
      label: "Team View",
      payload: {
        query: "ZX",
        insurance_company: "Carrier",
        status: "Active",
        gross_min: "10",
        pageLength: 20,
      },
    });
    expect(result.policyPresetKey.value).toBe(makeCustomFilterPresetValue(result.policyCustomPresets.value[0].id));
    expect(JSON.parse(window.localStorage.getItem("at:policy-list:preset-list"))).toEqual(result.policyCustomPresets.value);

    result.deletePolicyPreset();

    expect(result.policyCustomPresets.value).toEqual([]);
    expect(result.policyPresetKey.value).toBe("default");
    expect(refreshPolicyList).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("at:policy-list:preset")).toBe("default");
  });
});
