import { AUX_WORKBENCH_CONFIGS } from "./registry.js";
import { pickAuxWorkbenchEntries } from "./common.js";

export const masterDataWorkbenchConfigs = pickAuxWorkbenchEntries(AUX_WORKBENCH_CONFIGS, [
  "companies",
  "branches",
  "sales-entities",
  "templates",
]);
