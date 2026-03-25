import { describe, expect, it } from "vitest";
import { AUX_WORKBENCH_CONFIGS } from "./auxWorkbenchConfigs";
import { getQuickCreateConfig } from "./quickCreateRegistry";

describe("quick edit coverage", () => {
  it("resolves edit-mode config for every aux workbench quick edit action", () => {
    const entriesWithQuickEdit = Object.values(AUX_WORKBENCH_CONFIGS)
      .filter((config) => config?.quickEdit?.registryKey);

    expect(entriesWithQuickEdit.length).toBeGreaterThan(0);

    for (const config of entriesWithQuickEdit) {
      const editConfig = getQuickCreateConfig(config.quickEdit.registryKey);

      expect(editConfig).toBeTruthy();
      expect(editConfig.key).toBe(config.quickEdit.registryKey);
      expect(editConfig.submitUrl).toBe("acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record");
      expect(editConfig.openRouteName).toBe("");
      expect(editConfig.successRefreshTargets).toEqual(["aux_detail"]);
      expect(Array.isArray(editConfig.fields)).toBe(true);
      expect(editConfig.fields.length).toBeGreaterThan(0);
    }
  });
});

