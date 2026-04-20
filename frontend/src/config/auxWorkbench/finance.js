import { AUX_WORKBENCH_CONFIGS } from "./registry.js";
import { pickAuxWorkbenchEntries } from "./common.js";

export const financeWorkbenchConfigs = pickAuxWorkbenchEntries(AUX_WORKBENCH_CONFIGS, [
  "accounting-entries",
  "reconciliation-items",
  "files",
  "at-documents",
  "customer-segment-snapshots",
  "access-logs",
]);
