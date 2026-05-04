import { unref } from "vue";

import { translateText } from "./i18n";

function normalizeLocale(locale = "en") {
  return String(unref(locale) || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
}

export function localizeRouteMetaValue(value, locale = "en") {
  const normalizedLocale = normalizeLocale(locale);

  if (value && typeof value === "object") {
    const localized = normalizedLocale === "tr" ? value.tr || value.en : value.en || value.tr;
    return String(localized || "").trim();
  }

  return String(translateText(String(value || ""), normalizedLocale) || "").trim();
}

export function resolveRouteDocumentTitle(route, locale = "en", appTitle = "Acentem Takipte") {
  const localizedTitle = localizeRouteMetaValue(route?.meta?.title, locale);
  if (!localizedTitle) {
    return appTitle;
  }

  return `${localizedTitle} | ${appTitle}`;
}