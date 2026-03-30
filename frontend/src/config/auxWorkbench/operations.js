import { AUX_WORKBENCH_CONFIGS } from "./registry.js";
import { pickAuxWorkbenchEntries } from "./common.js";

export const operationsWorkbenchConfigs = pickAuxWorkbenchEntries(AUX_WORKBENCH_CONFIGS, [
  "tasks",
  "activities",
  "reminders",
  "call-notes",
  "segments",
  "campaigns",
  "notification-drafts",
  "notification-outbox",
  "ownership-assignments",
]);
