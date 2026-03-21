import { describe, expect, it } from "vitest";
import { AUX_WORKBENCH_CONFIGS } from "./auxWorkbenchConfigs";
import { getQuickCreateConfig, quickCreateRegistry } from "./quickCreateRegistry";

function isLocalizedText(value) {
  return typeof value === "function" || (value !== null && typeof value === "object");
}

function collectCopyIssues(config, scope) {
  const issues = [];
  for (const key of ["title", "subtitle"]) {
    if (typeof config?.[key] === "string") {
      issues.push(`${scope}.${key}`);
    }
  }

  for (const field of config?.fields || []) {
    for (const key of ["label", "help", "placeholder", "searchPlaceholder", "checkboxLabel"]) {
      const value = field?.[key];
      if (typeof value === "string") {
        issues.push(`${scope}.fields.${field.name}.${key}`);
      } else if (value != null && !isLocalizedText(value) && typeof value !== "boolean" && typeof value !== "number") {
        issues.push(`${scope}.fields.${field.name}.${key}`);
      }
    }
  }

  return issues;
}

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

  it("keeps policy statuses aligned with the backend enum", () => {
    const policyConfig = getQuickCreateConfig("policy");
    const statusField = policyConfig?.fields?.find((field) => field.name === "status");

    expect(statusField).toBeTruthy();
    expect(statusField.options.map((option) => option.value)).toEqual(["Active", "KYT", "IPT"]);
    expect(policyConfig?.defaults?.status).toBe("Active");
  });

  it("keeps quick create copy localized", () => {
    const issues = [
      ...Object.entries(quickCreateRegistry).flatMap(([key, config]) => collectCopyIssues(config, `quickCreateRegistry.${key}`)),
      ...Object.entries(AUX_WORKBENCH_CONFIGS).flatMap(([key, config]) => {
        const issuesForConfig = [];
        for (const [labelKey, value] of Object.entries(config?.labels || {})) {
          if (typeof value === "string") {
            issuesForConfig.push(`auxWorkbench.${key}.labels.${labelKey}`);
          }
        }
        for (const blockKey of ["quickCreate", "quickEdit"]) {
          const labelValue = config?.[blockKey]?.label;
          if (typeof labelValue === "string") {
            issuesForConfig.push(`auxWorkbench.${key}.${blockKey}.label`);
          }
        }
        return issuesForConfig;
      }),
    ];

    expect(issues).toEqual([]);
  });
});
