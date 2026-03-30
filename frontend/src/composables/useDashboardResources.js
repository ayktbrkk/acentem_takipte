import { computed, onBeforeUnmount, unref, watch } from "vue";
import { createResource } from "frappe-ui";

import { useBranchStore } from "../stores/branch";
import { useDashboardStore } from "../stores/dashboard";

const DASHBOARD_TABS = ["daily", "sales", "collections", "renewals"];
const DASHBOARD_RELOAD_DEBOUNCE_MS = 300;

export function useDashboardResources({ route, selectedRange, normalizeDashboardTab }) {
  const branchStore = useBranchStore();
  const dashboardStore = useDashboardStore();
  let dashboardReloadTimer = null;

  function normalizeResourcePayload(payload) {
    return payload?.message || payload || {};
  }

  function cstr(value) {
    return String(value ?? "").trim();
  }

  function withOfficeBranchFilter(params) {
    const officeBranch = branchStore.requestBranch;
    if (!officeBranch) {
      return params;
    }
    const next = { ...(params || {}) };
    next.office_branch = officeBranch;
    const filters = { ...(next.filters || {}) };
    filters.office_branch = officeBranch;
    next.filters = filters;
    return next;
  }

  function formatDate(dateValue) {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getDateRange(days) {
    const to = new Date();
    const from = new Date(to);
    from.setDate(to.getDate() - Number(days || 30));
    return { from, to };
  }

  function getPreviousDateRange(days) {
    const current = getDateRange(days);
    const to = new Date(current.from);
    to.setDate(to.getDate() - 1);
    const from = new Date(to);
    from.setDate(to.getDate() - Number(days || 30));
    return { from, to };
  }

  function isPermissionDeniedError(error) {
    const status = Number(
      error?.statusCode ?? error?.status ?? error?.httpStatus ?? error?.response?.status ?? 0
    );
    const text = String(error?.message || error?.messages?.join(" ") || error?.exc_type || "").toLowerCase();
    return (
      status === 401 ||
      status === 403 ||
      text.includes("permission") ||
      text.includes("not permitted") ||
      text.includes("not authorized")
    );
  }

  function buildKpiParams() {
    const range = getDateRange(unref(selectedRange));
    return withOfficeBranchFilter({
      filters: {
        from_date: formatDate(range.from),
        to_date: formatDate(range.to),
        period_comparison: "previous_period",
        months: 6,
      },
    });
  }

  function buildTabPayloadParams(tabKey = activeDashboardTab.value) {
    const normalizedTab = normalizeDashboardTab(tabKey);
    const currentRange = getDateRange(unref(selectedRange));
    const previousRange = getPreviousDateRange(unref(selectedRange));
    return withOfficeBranchFilter({
      tab: normalizedTab,
      filters: {
        from_date: formatDate(currentRange.from),
        to_date: formatDate(currentRange.to),
        compare_from_date: formatDate(previousRange.from),
        compare_to_date: formatDate(previousRange.to),
        months: 6,
      },
    });
  }

  function buildClaimListParams() {
    return withOfficeBranchFilter({
      doctype: "AT Claim",
      fields: ["name", "claim_no", "customer", "policy", "claim_status", "approved_amount", "paid_amount", "modified"],
      order_by: "modified desc",
      limit_page_length: 12,
    });
  }

  const kpiResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_kpis",
    params: buildKpiParams(),
    auto: false,
  });

  const followUpResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_follow_up_sla_payload",
    params: withOfficeBranchFilter({ filters: {} }),
    auto: true,
  });

  const myTasksResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_tasks_payload",
    params: withOfficeBranchFilter({ filters: {} }),
    auto: true,
  });

  const myActivitiesResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_activities_payload",
    params: withOfficeBranchFilter({ filters: {} }),
    auto: true,
  });

  const myRemindersResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_reminders_payload",
    params: withOfficeBranchFilter({ filters: {} }),
    auto: true,
  });

  const myTaskMutationResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
    auto: false,
  });

  const leadListResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Lead",
      fields: ["name", "first_name", "last_name", "email", "status", "estimated_gross_premium", "notes"],
      order_by: "modified desc",
      limit_page_length: 8,
    },
    auto: false,
  });

  const renewalTaskResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Renewal Task",
      fields: ["name", "policy", "status", "due_date", "renewal_date"],
      order_by: "due_date asc",
      limit_page_length: 40,
    },
    auto: false,
  });

  const policyListResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer", "status", "currency", "issue_date", "gross_premium", "commission_amount", "commission"],
      order_by: "modified desc",
      limit_page_length: 6,
    },
    auto: false,
  });

  const offerListResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Offer",
      fields: ["name", "customer", "status", "currency", "valid_until", "gross_premium", "converted_policy"],
      order_by: "modified desc",
      limit_page_length: 8,
    },
    auto: false,
  });

  const claimListResource = createResource({
    url: "frappe.client.get_list",
    params: buildClaimListParams(),
    auto: true,
  });

  const reconciliationPreviewResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.accounting.get_reconciliation_workbench",
    params: {
      status: "Open",
      mismatch_type: null,
      limit: 8,
    },
    auto: true,
  });

  const dashboardTabPayloadResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_tab_payload",
    params: buildTabPayloadParams("daily"),
    auto: true,
  });

  const createLeadResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_lead",
  });

  const dashboardTabPayload = computed(() => dashboardStore.state.tabPayload || {});
  const dashboardTabCards = computed(() => dashboardTabPayload.value.cards || {});
  const dashboardTabCompareCards = computed(() => dashboardTabPayload.value.compare_cards || {});
  const dashboardTabMetrics = computed(() => dashboardTabPayload.value.metrics || {});
  const dashboardTabSeries = computed(() => dashboardTabPayload.value.series || {});
  const dashboardTabPreviews = computed(() => dashboardTabPayload.value.previews || {});
  const followUpPayload = computed(() => unref(followUpResource.data) || {});
  const followUpSummary = computed(() => followUpPayload.value.summary || { total: 0, overdue: 0, due_today: 0, due_soon: 0 });
  const followUpItems = computed(() => (Array.isArray(followUpPayload.value.items) ? followUpPayload.value.items : []));
  const myTasksPayload = computed(() => unref(myTasksResource.data) || {});
  const myTaskSummary = computed(() => myTasksPayload.value.summary || { total: 0, overdue: 0, due_today: 0, due_soon: 0 });
  const myTaskItems = computed(() => (Array.isArray(myTasksPayload.value.items) ? myTasksPayload.value.items : []));
  const myActivitiesPayload = computed(() => unref(myActivitiesResource.data) || {});
  const myActivitySummary = computed(() => myActivitiesPayload.value.summary || { total: 0, logged: 0, shared: 0, archived: 0 });
  const myActivityItems = computed(() => (Array.isArray(myActivitiesPayload.value.items) ? myActivitiesPayload.value.items : []));
  const myRemindersPayload = computed(() => unref(myRemindersResource.data) || {});
  const myReminderSummary = computed(() => myRemindersPayload.value.summary || { total: 0, overdue: 0, due_today: 0, due_soon: 0 });
  const myReminderItems = computed(() => (Array.isArray(myRemindersPayload.value.items) ? myRemindersPayload.value.items : []));
  const leads = computed(() => (Array.isArray(dashboardTabPreviews.value.leads) && dashboardTabPreviews.value.leads.length ? dashboardTabPreviews.value.leads : Array.isArray(leadListResource.data) ? leadListResource.data : []));
  const renewalTasks = computed(() => (Array.isArray(dashboardTabPreviews.value.renewal_tasks) && dashboardTabPreviews.value.renewal_tasks.length ? dashboardTabPreviews.value.renewal_tasks : Array.isArray(renewalTaskResource.data) ? renewalTaskResource.data : []));
  const activeRenewalTasks = computed(() => renewalTasks.value.filter((task) => ["Open", "In Progress"].includes(String(task?.status || ""))));
  const recentPolicies = computed(() => (Array.isArray(dashboardTabPreviews.value.policies) && dashboardTabPreviews.value.policies.length ? dashboardTabPreviews.value.policies : Array.isArray(policyListResource.data) ? policyListResource.data : []));
  const recentOffers = computed(() => (Array.isArray(dashboardTabPreviews.value.offers) && dashboardTabPreviews.value.offers.length ? dashboardTabPreviews.value.offers : Array.isArray(offerListResource.data) ? offerListResource.data : []));
  const openClaimsPreviewRows = computed(() =>
    (Array.isArray(claimListResource.data) ? claimListResource.data : [])
      .filter((claim) => ["Open", "Under Review", "Approved"].includes(String(claim?.claim_status || "")))
      .slice(0, 12)
  );
  const dueTodayCollectionPayments = computed(() => (Array.isArray(dashboardTabPreviews.value.due_today_payments) ? dashboardTabPreviews.value.due_today_payments : []));
  const overdueCollectionPayments = computed(() => (Array.isArray(dashboardTabPreviews.value.overdue_payments) ? dashboardTabPreviews.value.overdue_payments : []));
  const offerWaitingRenewals = computed(() => (Array.isArray(dashboardTabPreviews.value.offer_waiting_renewals) ? dashboardTabPreviews.value.offer_waiting_renewals : []));
  const reconciliationPreviewData = computed(() => reconciliationPreviewResource.data || {});
  const reconciliationPreviewRows = computed(() =>
    Array.isArray(dashboardTabPreviews.value.reconciliation_rows) && dashboardTabPreviews.value.reconciliation_rows.length
      ? dashboardTabPreviews.value.reconciliation_rows
      : Array.isArray(reconciliationPreviewData.value.rows)
        ? reconciliationPreviewData.value.rows
        : []
  );
  const dueTodayCollectionCount = computed(() => Number(dashboardTabMetrics.value?.due_today_collection_count || 0));
  const dueTodayCollectionAmount = computed(() => Number(dashboardTabMetrics.value?.due_today_collection_amount_try || 0));
  const overdueCollectionCount = computed(() => Number(dashboardTabMetrics.value?.overdue_collection_count || 0));
  const overdueCollectionAmount = computed(() => Number(dashboardTabMetrics.value?.overdue_collection_amount_try || 0));
  const offerWaitingRenewalCount = computed(() => Number(dashboardTabMetrics.value?.offer_waiting_count || 0));
  const reconciliationPreviewMetrics = computed(() => ({
    ...(reconciliationPreviewData.value.metrics || {}),
    ...(dashboardTabMetrics.value?.reconciliation_open_count != null ? { open: Number(dashboardTabMetrics.value.reconciliation_open_count || 0) } : {}),
  }));
  const dashboardData = computed(() => dashboardStore.state.kpiPayload || {});
  const dashboardComparison = computed(() => dashboardStore.comparison || {});
  const dashboardMeta = computed(() => dashboardStore.meta || {});
  const dashboardAccessScope = computed(() => String(dashboardMeta.value?.access_scope || ""));
  const dashboardAccessReason = computed(() => String(dashboardMeta.value?.scope_reason || ""));
  const dashboardCards = computed(() => ({
    ...(dashboardData.value.cards || {}),
    ...(dashboardTabCards.value || {}),
  }));
  const dashboardBranchLabel = computed(() => branchStore.requestBranch || "Tum Subeler");
  const previousDashboardCards = computed(() => dashboardStore.previousCards || {});
  const commissionTrend = computed(() =>
    Array.isArray(dashboardTabSeries.value.commission_trend) && dashboardTabSeries.value.commission_trend.length
      ? dashboardTabSeries.value.commission_trend
      : Array.isArray(dashboardData.value.commission_trend)
        ? dashboardData.value.commission_trend
        : []
  );
  const policyStatusRows = computed(() => (Array.isArray(dashboardData.value.policy_status) ? dashboardData.value.policy_status : []));
  const topCompanies = computed(() =>
    Array.isArray(dashboardTabSeries.value.top_companies) && dashboardTabSeries.value.top_companies.length
      ? dashboardTabSeries.value.top_companies
      : Array.isArray(dashboardData.value.top_companies)
        ? dashboardData.value.top_companies
        : []
  );
  const activeDashboardTab = computed(() => normalizeDashboardTab(route.query?.tab));
  const isDailyTab = computed(() => activeDashboardTab.value === "daily");
  const isSalesTab = computed(() => activeDashboardTab.value === "sales");
  const isCollectionsTab = computed(() => activeDashboardTab.value === "collections");
  const isRenewalsTab = computed(() => activeDashboardTab.value === "renewals");
  const showNewLeadAction = computed(() => !isCollectionsTab.value && !isRenewalsTab.value);
  const showRenewalAlertsTopRow = computed(() => isDailyTab.value || isRenewalsTab.value);
  const showAnalyticsRow = computed(() => isSalesTab.value);
  const showPoliciesOffersRow = computed(() => isSalesTab.value);
  const readyOfferCount = computed(() => {
    if (dashboardTabMetrics.value?.ready_offer_count != null) {
      return Number(dashboardTabMetrics.value.ready_offer_count || 0);
    }
    return recentOffers.value.filter((offer) => ["Sent", "Accepted"].includes(offer.status) && !offer.converted_policy).length;
  });
  const dashboardLoadingRaw = computed(() => {
    const kpiLoading = isDailyTab.value ? Boolean(unref(kpiResource.loading)) : false;
    const tabLoading = Boolean(unref(dashboardTabPayloadResource.loading));
    return Boolean(kpiLoading || tabLoading);
  });
  const followUpLoading = computed(() => Boolean(unref(followUpResource.loading)));
  const myTasksLoading = computed(() => Boolean(unref(myTasksResource.loading)));
  const myActivitiesLoading = computed(() => Boolean(unref(myActivitiesResource.loading)));
  const myRemindersLoading = computed(() => Boolean(unref(myRemindersResource.loading)));
  const dashboardLoading = computed(() => dashboardStore.state.loading);
  const dashboardPermissionError = computed(() => {
    const candidates = [unref(dashboardTabPayloadResource.error), isDailyTab.value ? unref(kpiResource.error) : null];
    return candidates.find((error) => Boolean(error) && isPermissionDeniedError(error)) || null;
  });
  function triggerDashboardReload({ includeKpis = true, immediate = false } = {}) {
    const runReload = () => {
      dashboardReloadTimer = null;
      dashboardTabPayloadResource.params = buildTabPayloadParams();
      dashboardTabPayloadResource.reload();
      followUpResource.params = withOfficeBranchFilter({ filters: {} });
      followUpResource.reload();
      myActivitiesResource.params = withOfficeBranchFilter({ filters: {} });
      myActivitiesResource.reload();
      claimListResource.params = buildClaimListParams();
      claimListResource.reload();
      myRemindersResource.params = withOfficeBranchFilter({ filters: {} });
      myRemindersResource.reload();
      myTasksResource.params = withOfficeBranchFilter({ filters: {} });
      myTasksResource.reload();
      if (includeKpis) {
        kpiResource.params = buildKpiParams();
        kpiResource.reload();
      }
    };

    if (immediate) {
      if (dashboardReloadTimer) {
        window.clearTimeout(dashboardReloadTimer);
        dashboardReloadTimer = null;
      }
      runReload();
      return;
    }

    if (dashboardReloadTimer) {
      window.clearTimeout(dashboardReloadTimer);
    }
    dashboardReloadTimer = window.setTimeout(runReload, DASHBOARD_RELOAD_DEBOUNCE_MS);
  }

  function reloadData() {
    triggerDashboardReload({ immediate: true });
  }

  watch(
    () => unref(kpiResource.data),
    (payload) => {
      dashboardStore.setKpiPayload(normalizeResourcePayload(payload));
    },
    { immediate: true }
  );

  watch(
    () => unref(dashboardTabPayloadResource.data),
    (payload) => {
      dashboardStore.setTabPayload(normalizeResourcePayload(payload));
    },
    { immediate: true }
  );

  watch(
    dashboardLoadingRaw,
    (value) => {
      dashboardStore.setLoading(value);
    },
    { immediate: true }
  );

  watch(
    activeDashboardTab,
    (value) => {
      dashboardStore.setActiveTab(value);
      triggerDashboardReload({ includeKpis: false });
    },
    { immediate: true }
  );

  watch(
    () => branchStore.selected,
    () => {
      triggerDashboardReload();
    }
  );

  onBeforeUnmount(() => {
    if (dashboardReloadTimer) {
      window.clearTimeout(dashboardReloadTimer);
      dashboardReloadTimer = null;
    }
  });

  return {
    kpiResource,
    followUpResource,
    myTasksResource,
    myActivitiesResource,
    myRemindersResource,
    myTaskMutationResource,
    leadListResource,
    renewalTaskResource,
    policyListResource,
    offerListResource,
    claimListResource,
    reconciliationPreviewResource,
    dashboardTabPayloadResource,
    createLeadResource,
    dashboardTabPayload,
    dashboardTabCards,
    dashboardTabCompareCards,
    dashboardTabMetrics,
    dashboardTabSeries,
    dashboardTabPreviews,
    followUpPayload,
    followUpSummary,
    followUpItems,
    myTasksPayload,
    myTaskSummary,
    myTaskItems,
    myActivitiesPayload,
    myActivitySummary,
    myActivityItems,
    myRemindersPayload,
    myReminderSummary,
    myReminderItems,
    leads,
    renewalTasks,
    activeRenewalTasks,
    recentPolicies,
    recentOffers,
    openClaimsPreviewRows,
    dueTodayCollectionPayments,
    overdueCollectionPayments,
    offerWaitingRenewals,
    reconciliationPreviewData,
    reconciliationPreviewRows,
    dueTodayCollectionCount,
    dueTodayCollectionAmount,
    overdueCollectionCount,
    overdueCollectionAmount,
    offerWaitingRenewalCount,
    reconciliationPreviewMetrics,
    dashboardData,
    dashboardComparison,
    dashboardMeta,
    dashboardAccessScope,
    dashboardAccessReason,
    dashboardCards,
    dashboardBranchLabel,
    previousDashboardCards,
    commissionTrend,
    policyStatusRows,
    topCompanies,
    dashboardLoadingRaw,
    followUpLoading,
    myTasksLoading,
    myActivitiesLoading,
    myRemindersLoading,
    dashboardLoading,
    dashboardPermissionError,
    readyOfferCount,
    activeDashboardTab,
    isDailyTab,
    isSalesTab,
    isCollectionsTab,
    isRenewalsTab,
    showNewLeadAction,
    showRenewalAlertsTopRow,
    showAnalyticsRow,
    showPoliciesOffersRow,
    triggerDashboardReload,
    reloadData,
  };
}
