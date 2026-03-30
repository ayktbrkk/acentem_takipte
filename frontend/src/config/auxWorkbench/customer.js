import { AUX_WORKBENCH_CONFIGS } from "./registry.js";
import { pickAuxWorkbenchEntries } from "./common.js";

export const customerWorkbenchConfigs = pickAuxWorkbenchEntries(AUX_WORKBENCH_CONFIGS, [
  "customer-relations",
  "insured-assets",
]);
