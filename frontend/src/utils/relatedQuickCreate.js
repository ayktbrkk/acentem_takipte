import { buildQuickCreateIntentQuery } from "./quickRouteIntent";
import { translateText } from "./i18n";

const RELATED_QUICK_CREATE_SOURCE_MAP = Object.freeze({
  customers: {
    routeName: "customer-list",
    quickIntent: true,
    prefillField: "full_name",
    actionLabel: "Add New Customer",
  },
  salesEntities: {
    routeName: "sales-entities-list",
    quickIntent: false,
    prefillField: "full_name",
    actionLabel: "Add New Sales Entity",
  },
  insuranceCompanies: {
    routeName: "companies-list",
    quickIntent: false,
    prefillField: "company_name",
    actionLabel: "Add New Insurance Company",
  },
  branches: {
    routeName: "branches-list",
    quickIntent: false,
    prefillField: "branch_name",
    actionLabel: "Add New Branch",
  },
});

function normalizeSource(value) {
  return String(value || "").trim();
}

function normalizeText(value) {
  return String(value || "").trim();
}

export function getRelatedQuickCreateMeta(optionsSource) {
  const source = normalizeSource(optionsSource);
  if (!source) return null;
  return RELATED_QUICK_CREATE_SOURCE_MAP[source] || null;
}

export function supportsRelatedQuickCreateSource(optionsSource) {
  return Boolean(getRelatedQuickCreateMeta(optionsSource));
}

export function getRelatedQuickCreateActionLabel(optionsSource, locale = "en", query = "") {
  const meta = getRelatedQuickCreateMeta(optionsSource);
  if (!meta) return "";
  const base = translateText(String(meta.actionLabel || ""), locale).trim();
  if (!base) return "";
  const queryText = normalizeText(query);
  if (!queryText) return base;
  return `${base}: "${queryText}"`;
}

export function buildRelatedQuickCreateNavigation({ optionsSource, query = "", returnTo = "" } = {}) {
  const meta = getRelatedQuickCreateMeta(optionsSource);
  if (!meta?.routeName) return null;

  const queryText = normalizeText(query);
  const returnTarget = normalizeText(returnTo);

  if (meta.quickIntent) {
    const prefills = {};
    if (queryText && meta.prefillField) {
      prefills[meta.prefillField] = queryText;
    }
    return {
      name: meta.routeName,
      query: buildQuickCreateIntentQuery({ prefills, returnTo: returnTarget }),
    };
  }

  return {
    name: meta.routeName,
    query: queryText ? { query: queryText } : {},
  };
}
