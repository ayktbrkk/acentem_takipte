import { translateText } from "./i18n";

const QUICK_CREATE_EYEBROWS = {
  policy: "Quick Policy Entry",
  lead: "Quick Lead",
  offer: "Quick Offer",
  customer: "Quick Customer",
  claim: "Quick Claim",
  managed: "Quick Create",
};

const QUICK_CREATE_LABELS = {
  create: { cancel: "Cancel", save: "Create", saveAndOpen: "Create & Open" },
  manage: { cancel: "Cancel", save: "Save", saveAndOpen: "Save & Open" },
  claim: { cancel: "Cancel", save: "Create" },
};

export function getQuickCreateEyebrow(configKey, locale = "tr") {
  const source = QUICK_CREATE_EYEBROWS[configKey] || QUICK_CREATE_EYEBROWS.managed;
  return translateText(source, locale);
}

export function getQuickCreateLabels(mode, locale = "tr") {
  const group = QUICK_CREATE_LABELS[mode] || QUICK_CREATE_LABELS.manage;
  return {
    cancel: translateText(group.cancel, locale),
    save: translateText(group.save, locale),
    saveAndOpen: translateText(group.saveAndOpen, locale),
  };
}
