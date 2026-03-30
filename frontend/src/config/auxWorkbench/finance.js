import { AUX_WORKBENCH_CONFIGS } from "./registry.js";
import { pickAuxWorkbenchEntries } from "./common.js";

export const financeWorkbenchConfigs = pickAuxWorkbenchEntries(AUX_WORKBENCH_CONFIGS, [
  "accounting-entries",
  "reconciliation-items",
  "files",
  "customer-segment-snapshots",
  "access-logs",
]);
