import { describe, expect, it } from "vitest";
import { AUX_WORKBENCH_CONFIGS } from "./auxWorkbenchConfigs";
import { getQuickCreateConfig } from "./quickCreateRegistry";

describe("quick create coverage", () => {
  it("resolves registry config for every aux workbench quick create action", () => {
    const entriesWithQuickCreate = Object.values(AUX_WORKBENCH_CONFIGS)
      .filter((config) => config?.quickCreate?.registryKey);

    expect(entriesWithQuickCreate.length).toBeGreaterThan(0);

    for (const config of entriesWithQuickCreate) {
      expect(getQuickCreateConfig(config.quickCreate.registryKey)).toBeTruthy();
    }
  });

  it("resolves registry config for every aux workbench quick edit action", () => {
    const entriesWithQuickEdit = Object.values(AUX_WORKBENCH_CONFIGS)
      .filter((config) => config?.quickEdit?.registryKey);

    expect(entriesWithQuickEdit.length).toBeGreaterThan(0);

    for (const config of entriesWithQuickEdit) {
      expect(getQuickCreateConfig(config.quickEdit.registryKey)).toBeTruthy();
    }
  });
});
