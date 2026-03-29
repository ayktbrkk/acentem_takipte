import { computed, unref } from "vue";

import { offerBoardCopy } from "./offerBoardCopy";

export function useOfferBoardLocale(authLocale) {
  const activeLocale = computed(() => unref(authLocale) || "en");
  const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
  const convertDialogEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Dönüştürme" : "Quick Conversion"));

  function formatCount(value) {
    return Number(value || 0).toLocaleString(localeCode.value);
  }

  function t(key) {
    return offerBoardCopy[activeLocale.value]?.[key] || offerBoardCopy.en[key] || key;
  }

  return {
    activeLocale,
    convertDialogEyebrow,
    formatCount,
    localeCode,
    t,
  };
}
