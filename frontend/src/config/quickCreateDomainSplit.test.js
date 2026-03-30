import { describe, expect, it } from "vitest";
import { commercialQuickCreateRegistry } from "./quickCreate/commercial";
import { communicationQuickCreateRegistry } from "./quickCreate/communication";
import { financeQuickCreateRegistry } from "./quickCreate/finance";
import { masterDataQuickCreateRegistry } from "./quickCreate/masterData";
import { operationsQuickCreateRegistry } from "./quickCreate/operations";
import { quickCreateRegistry } from "./quickCreate";

describe("quick create domain split", () => {
  it("exposes commercial domain entries", () => {
    expect(commercialQuickCreateRegistry.offer).toBe(quickCreateRegistry.offer);
    expect(commercialQuickCreateRegistry.policy).toBe(quickCreateRegistry.policy);
    expect(commercialQuickCreateRegistry.customer).toBe(quickCreateRegistry.customer);
  });

  it("exposes operations domain entries", () => {
    expect(operationsQuickCreateRegistry.task).toBe(quickCreateRegistry.task);
    expect(operationsQuickCreateRegistry.reminder).toBe(quickCreateRegistry.reminder);
    expect(operationsQuickCreateRegistry.ownership_assignment).toBe(quickCreateRegistry.ownership_assignment);
  });

  it("exposes communication, master data and finance domain entries", () => {
    expect(communicationQuickCreateRegistry.campaigns).toBe(quickCreateRegistry.campaigns);
    expect(masterDataQuickCreateRegistry.companies).toBe(quickCreateRegistry.companies);
    expect(financeQuickCreateRegistry["accounting-entries"]).toBe(quickCreateRegistry["accounting-entries"]);
  });
});
