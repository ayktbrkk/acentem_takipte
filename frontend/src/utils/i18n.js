import { unref } from "vue";
import { translateText as translateCatalogText } from "@/generated/translations";
import { COMMON_TRANSLATIONS } from "@/config/common_translations";
import { LEAD_TRANSLATIONS } from "@/config/lead_translations";
import { CUSTOMER_TRANSLATIONS } from "@/config/customer_translations";
import { POLICY_TRANSLATIONS } from "@/config/policy_translations";
import { OFFER_TRANSLATIONS } from "@/config/offer_translations";
import { CLAIM_TRANSLATIONS } from "@/config/claim_translations";
import { PAYMENT_TRANSLATIONS } from "@/config/payment_translations";
import { REPORTS_TRANSLATIONS } from "@/config/reports_translations";
import { IMPORT_TRANSLATIONS } from "@/config/import_translations";
import { RECONCILIATION_TRANSLATIONS } from "@/config/reconciliation_translations";
import { RENEWAL_TRANSLATIONS } from "@/config/renewal_translations";
import { BREAK_GLASS_TRANSLATIONS } from "@/config/break_glass_translations";
import { CUSTOMER_SEARCH_TRANSLATIONS } from "@/config/customer_search_translations";
import { DASHBOARD_TRANSLATIONS } from "@/config/dashboard_translations";
import { SIDEBAR_TRANSLATIONS } from "@/config/sidebar_translations";

const ALL_TRANSLATIONS = {
  common: COMMON_TRANSLATIONS,
  lead: LEAD_TRANSLATIONS,
  customer: CUSTOMER_TRANSLATIONS,
  policy: POLICY_TRANSLATIONS,
  offer: OFFER_TRANSLATIONS,
  claim: CLAIM_TRANSLATIONS,
  payment: PAYMENT_TRANSLATIONS,
  reports: REPORTS_TRANSLATIONS,
  import: IMPORT_TRANSLATIONS,
  reconciliation: RECONCILIATION_TRANSLATIONS,
  renewal: RENEWAL_TRANSLATIONS,
  break_glass: BREAK_GLASS_TRANSLATIONS,
  customer_search: CUSTOMER_SEARCH_TRANSLATIONS,
  dashboard: DASHBOARD_TRANSLATIONS,
  sidebar: SIDEBAR_TRANSLATIONS,
};


export function translateText(source, locale = "en") {
  const locVal = unref(locale);
  const loc = String(locVal || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
  
  // Try custom translations first
  for (const module of Object.values(ALL_TRANSLATIONS)) {
    if (module[loc]?.[source]) {
      return module[loc][source];
    }
  }

  // Fallback to generated catalog
  return translateCatalogText(source, loc);
}

/**
 * Standardized locale-aware uppercase conversion.
 * Ensures Turkish "i" becomes "İ" correctly in JavaScript-driven text.
 */
export function uppercaseText(text, locale = "en") {
  if (text == null) return "";
  const locVal = unref(locale);
  if (String(locVal || "").startsWith("tr")) {
    return String(text).toLocaleUpperCase("tr-TR");
  }
  return String(text).toUpperCase();
}

/**
 * Standardized locale-aware lowercase conversion.
 */
export function lowercaseText(text, locale = "en") {
  if (text == null) return "";
  const locVal = unref(locale);
  if (String(locVal || "").startsWith("tr")) {
    return String(text).toLocaleLowerCase("tr-TR");
  }
  return String(text).toLowerCase();
}


