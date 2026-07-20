import { reactive, unref } from "vue";

const DASHBOARD_PREVIEW_PAGE_SIZE = 5;
const DASHBOARD_PREVIEW_FETCH_LIMIT = 20;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

export function useDashboardPreviewPager() {
  const previewPages = reactive({
    dailyFollowUp: 1,
    dailyActivities: 1,
    dailyTasks: 1,
    dailyClaims: 1,
    dailyPolicies: 1,
    dailyActionOffers: 1,
    dailyRenewalAlerts: 1,
    dailyTopCompanies: 1,
    collectionsDueToday: 1,
    collectionsOverdue: 1,
    collectionsPayments: 1,
    collectionsRisk: 1,
    collectionsReconciliation: 1,
    renewalsPolicies: 1,
    renewalsOfferWaiting: 1,
    renewalsQueue: 1,
    salesLeads: 1,
    salesOffers: 1,
    salesConvertedOffers: 1,
    salesPolicies: 1,
    salesActions: 1,
    salesTasks: 1,
    salesActivities: 1,
    salesReminders: 1,
  });

  function previewPageCount(items) {
    return Math.max(1, Math.ceil(asArray(unref(items)).length / DASHBOARD_PREVIEW_PAGE_SIZE));
  }

  function previewResolvedPage(key, items) {
    return Math.min(previewPages[key] || 1, previewPageCount(items));
  }

  function pagedPreviewItems(items, key) {
    const rows = asArray(unref(items));
    const page = previewResolvedPage(key, rows);
    const start = (page - 1) * DASHBOARD_PREVIEW_PAGE_SIZE;
    return rows.slice(start, start + DASHBOARD_PREVIEW_PAGE_SIZE);
  }

  function setPreviewPage(key, page, items) {
    const maxPage = previewPageCount(items);
    previewPages[key] = Math.min(Math.max(Number(page) || 1, 1), maxPage);
  }

  function shouldShowViewAll(items) {
    return asArray(unref(items)).length >= DASHBOARD_PREVIEW_FETCH_LIMIT;
  }

  return {
    pagedPreviewItems,
    previewPageCount,
    previewPages,
    previewResolvedPage,
    setPreviewPage,
    shouldShowViewAll,
  };
}
