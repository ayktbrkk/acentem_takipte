import { quickCreateRegistry } from "./registry.js";
import { pickQuickCreateEntries } from "./common.js";

export const financeQuickCreateRegistry = pickQuickCreateEntries(quickCreateRegistry, [
  "accounting-entries",
  "reconciliation-items",
]);
