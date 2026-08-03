import { unref } from "vue";
import { translateText as translateCatalogText } from "@/generated/translations";
import { COMMON_TRANSLATIONS } from "@/platform/i18n/common";
import { LEAD_TRANSLATIONS } from "@/domains/leads/i18n/translations";
import { CUSTOMER_TRANSLATIONS } from "@/domains/customers/i18n/translations";
import { POLICY_TRANSLATIONS } from "@/domains/policies/i18n/translations";
import { OFFER_TRANSLATIONS } from "@/domains/offers/i18n/translations";
import { CLAIM_TRANSLATIONS } from "@/domains/claims/i18n/translations";
import { PAYMENT_TRANSLATIONS } from "@/domains/payments/i18n/translations";
import { COMMUNICATION_TRANSLATIONS } from "@/domains/communication/i18n/translations";
import { REPORTS_TRANSLATIONS } from "@/domains/reports/i18n/translations";
import { IMPORT_TRANSLATIONS } from "@/config/import_translations";
import { RECONCILIATION_TRANSLATIONS } from "@/domains/reconciliation/i18n/translations";
import { RENEWAL_TRANSLATIONS } from "@/domains/renewals/i18n/translations";
import { CUSTOMER_SEARCH_TRANSLATIONS } from "@/config/customer_search_translations";
import { DASHBOARD_TRANSLATIONS } from "@/domains/dashboard/i18n/translations";
import { SIDEBAR_TRANSLATIONS } from "@/platform/i18n/sidebar";
import { BRANCH_SCOPE_TRANSLATIONS } from "@/platform/i18n/branchScope";
import { AUX_WORKBENCH_TRANSLATIONS } from "@/config/aux_workbench_translations";
import { AUX_DETAIL_TRANSLATIONS } from "@/config/aux_detail_translations";
import { ROUTER_TRANSLATIONS } from "@/platform/i18n/router";
import { DOCUMENT_TRANSLATIONS } from "@/platform/i18n/document";
import { WORKBENCH_FILE_UPLOAD_TRANSLATIONS } from "@/config/workbench_file_upload_translations";
import { ACCESS_REQUEST_TRANSLATIONS } from "@/platform/i18n/access_request";
import { QUICK_CREATE_TRANSLATIONS } from "@/config/quick_create_translations";

const ALL_TRANSLATIONS = {
  common: COMMON_TRANSLATIONS,
  quick_create: QUICK_CREATE_TRANSLATIONS,
  lead: LEAD_TRANSLATIONS,
  customer: CUSTOMER_TRANSLATIONS,
  policy: POLICY_TRANSLATIONS,
  offer: OFFER_TRANSLATIONS,
  claim: CLAIM_TRANSLATIONS,
  payment: PAYMENT_TRANSLATIONS,
  communication: COMMUNICATION_TRANSLATIONS,
  reports: REPORTS_TRANSLATIONS,
  import: IMPORT_TRANSLATIONS,
  reconciliation: RECONCILIATION_TRANSLATIONS,
  renewal: RENEWAL_TRANSLATIONS,
  customer_search: CUSTOMER_SEARCH_TRANSLATIONS,
  dashboard: DASHBOARD_TRANSLATIONS,
  sidebar: SIDEBAR_TRANSLATIONS,
  branch_scope: BRANCH_SCOPE_TRANSLATIONS,
  aux_workbench: AUX_WORKBENCH_TRANSLATIONS,
  aux_detail: AUX_DETAIL_TRANSLATIONS,
  router: ROUTER_TRANSLATIONS,
  document: DOCUMENT_TRANSLATIONS,
  workbench_file_upload: WORKBENCH_FILE_UPLOAD_TRANSLATIONS,
  access_request: ACCESS_REQUEST_TRANSLATIONS,
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


