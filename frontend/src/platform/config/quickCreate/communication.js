import { quickCreateRegistry } from "./registry.js";
import { pickQuickCreateEntries } from "./common.js";

export const communicationQuickCreateRegistry = pickQuickCreateEntries(quickCreateRegistry, [
  "segments",
  "campaigns",
  "notification_drafts",
  "notification_outbox",
]);
