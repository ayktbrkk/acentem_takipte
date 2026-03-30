import { quickCreateRegistry } from "./registry.js";
import { pickQuickCreateEntries } from "./common.js";

export const commercialQuickCreateRegistry = pickQuickCreateEntries(quickCreateRegistry, [
  "offer",
  "policy",
  "lead",
  "customer",
  "claim",
  "payment",
]);
