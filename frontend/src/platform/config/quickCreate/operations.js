import { quickCreateRegistry } from "./registry.js";
import { pickQuickCreateEntries } from "./common.js";

export const operationsQuickCreateRegistry = pickQuickCreateEntries(quickCreateRegistry, [
  "customer_relation",
  "insured_asset",
  "call_note",
  "task",
  "activity",
  "reminder",
  "ownership_assignment",
]);
