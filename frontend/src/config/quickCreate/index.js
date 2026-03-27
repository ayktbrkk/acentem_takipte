import { buildQuickCreateDraft, getLocalizedText, getQuickCreateConfig, quickCreateRegistry } from "./registry.js";
import { communicationQuickCreateRegistry } from "./communication.js";
import { commercialQuickCreateRegistry } from "./commercial.js";
import { financeQuickCreateRegistry } from "./finance.js";
import { masterDataQuickCreateRegistry } from "./masterData.js";
import { operationsQuickCreateRegistry } from "./operations.js";

export {
  commercialQuickCreateRegistry,
  operationsQuickCreateRegistry,
  communicationQuickCreateRegistry,
  masterDataQuickCreateRegistry,
  financeQuickCreateRegistry,
  quickCreateRegistry,
  getQuickCreateConfig,
  buildQuickCreateDraft,
  getLocalizedText,
};
