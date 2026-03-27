import { quickCreateRegistry } from "./registry.js";
import { pickQuickCreateEntries } from "./common.js";

export const masterDataQuickCreateRegistry = pickQuickCreateEntries(quickCreateRegistry, [
  "companies",
  "branches",
  "sales-entities",
  "templates",
]);
