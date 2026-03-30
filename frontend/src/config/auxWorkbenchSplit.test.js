import { describe, expect, it } from "vitest";
import {
  AUX_WORKBENCH_CONFIGS,
  AUX_WORKBENCH_ROUTE_DEFS,
  customerWorkbenchConfigs,
  financeWorkbenchConfigs,
  getAuxWorkbenchConfig,
  masterDataWorkbenchConfigs,
  operationsWorkbenchConfigs,
} from "./auxWorkbench";

function keySet(configs) {
  return new Set(Object.keys(configs || {}));
}

describe("aux workbench split", () => {
  it("keeps domain slices disjoint and complete", () => {
    const slices = [
      operationsWorkbenchConfigs,
      masterDataWorkbenchConfigs,
      financeWorkbenchConfigs,
      customerWorkbenchConfigs,
    ];

    const allKeys = Object.keys(AUX_WORKBENCH_CONFIGS);
    const coveredKeys = new Set();

    for (const slice of slices) {
      expect(Object.keys(slice).length).toBeGreaterThan(0);
      for (const key of Object.keys(slice)) {
        expect(coveredKeys.has(key)).toBe(false);
        coveredKeys.add(key);
      }
    }

    expect([...coveredKeys].sort()).toEqual([...allKeys].sort());
  });

  it("exposes config lookup and route defs through the barrel", () => {
    expect(typeof getAuxWorkbenchConfig).toBe("function");
    expect(Array.isArray(AUX_WORKBENCH_ROUTE_DEFS)).toBe(true);
    expect(AUX_WORKBENCH_ROUTE_DEFS.length).toBeGreaterThan(0);
    expect(getAuxWorkbenchConfig("tasks")).toBeTruthy();
    expect(keySet(AUX_WORKBENCH_CONFIGS).has("tasks")).toBe(true);
    expect(AUX_WORKBENCH_CONFIGS.tasks.labels.list.en).toBe("Tasks");
    expect(AUX_WORKBENCH_CONFIGS.tasks.labels.list.tr).toBe("Görevler");
    expect(AUX_WORKBENCH_CONFIGS.campaigns.subtitle.en).toBe("Manage segment-based campaign flow");
  });
});
