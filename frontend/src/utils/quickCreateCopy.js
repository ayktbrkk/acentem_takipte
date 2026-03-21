const QUICK_CREATE_EYEBROWS = {
  policy: { tr: "Hızlı Poliçe Kaydı", en: "Quick Policy Entry" },
  lead: { tr: "Hızlı Lead Oluştur", en: "Quick Lead" },
  offer: { tr: "Hızlı Teklif", en: "Quick Offer" },
  customer: { tr: "Hızlı Müşteri", en: "Quick Customer" },
  claim: { tr: "Hızlı Hasar", en: "Quick Claim" },
  managed: { tr: "Hızlı Kayıt", en: "Quick create" },
};

const QUICK_CREATE_LABELS = {
  create: {
    tr: { cancel: "İptal", save: "Oluştur", saveAndOpen: "Oluştur ve Aç" },
    en: { cancel: "Cancel", save: "Create", saveAndOpen: "Create & Open" },
  },
  manage: {
    tr: { cancel: "İptal", save: "Kaydet", saveAndOpen: "Kaydet ve Aç" },
    en: { cancel: "Cancel", save: "Save", saveAndOpen: "Save & Open" },
  },
  claim: {
    tr: { cancel: "İptal", save: "Oluştur" },
    en: { cancel: "Cancel", save: "Create" },
  },
};

export function getQuickCreateEyebrow(configKey, locale = "tr") {
  const group = QUICK_CREATE_EYEBROWS[configKey] || QUICK_CREATE_EYEBROWS.managed;
  return group[locale] || group.en;
}

export function getQuickCreateLabels(mode, locale = "tr") {
  const group = QUICK_CREATE_LABELS[mode] || QUICK_CREATE_LABELS.manage;
  return group[locale] || group.en;
}
