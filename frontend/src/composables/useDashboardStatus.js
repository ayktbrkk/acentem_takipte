import { computed, unref } from "vue";

import { normalizeDashboardTab } from "../utils/dashboardHelpers";

export function useDashboardStatus({
  dashboardAccessReason,
  dashboardAccessScope,
  dashboardTabMetrics,
  dashboardTabKey,
  dashboardTabPayloadResource,
  isPermissionDeniedError,
  kpiResource,
  dashboardStore,
  followUpResource,
  myActivitiesResource,
  myRemindersResource,
  myTasksResource,
  recentOffers,
  route,
  selectedRange,
  t,
}) {
  const activeDashboardTab = computed(() => normalizeDashboardTab(unref(dashboardTabKey) || dashboardStore.state.activeTab));
  const isDailyTab = computed(() => activeDashboardTab.value === "daily");
  const isSalesTab = computed(() => activeDashboardTab.value === "sales");
  const isCollectionsTab = computed(() => activeDashboardTab.value === "collections");
  const isRenewalsTab = computed(() => activeDashboardTab.value === "renewals");

  const dashboardPermissionError = computed(() => {
    const candidates = [
      unref(dashboardTabPayloadResource.error),
      isDailyTab.value ? unref(kpiResource.error) : null,
    ];
    return candidates.find((error) => Boolean(error) && isPermissionDeniedError(error)) || null;
  });

  const dashboardScopeMessage = computed(() => {
    if (dashboardLoadingRawComputed.value || dashboardPermissionError.value) return "";
    if (dashboardAccessScope.value !== "empty") return "";
    if (dashboardAccessReason.value === "agent_unassigned") return t("dashboardScopeNoAssignments");
    return t("dashboardScopeRestrictedEmpty");
  });

  const dashboardAccessMessage = computed(() => {
    if (dashboardPermissionError.value) return t("dashboardPermissionDenied");
    return dashboardScopeMessage.value;
  });

  const dashboardAccessMessageKind = computed(() => (dashboardPermissionError.value ? "permission" : "scope"));
  const dashboardLoadingRawComputed = computed(() => {
    const kpiLoading = Boolean(unref(kpiResource.loading));
    const tabLoading = Boolean(unref(dashboardTabPayloadResource.loading));
    return Boolean(kpiLoading || tabLoading);
  });

  const readyOfferCount = computed(() => {
    if (dashboardTabMetrics.value?.ready_offer_count != null) {
      return Number(dashboardTabMetrics.value.ready_offer_count || 0);
    }
    return recentOffers.value.filter((offer) => ["Sent", "Accepted"].includes(offer.status) && !offer.converted_policy).length;
  });

  const dashboardLoading = computed(() => dashboardStore.state.loading);
  const followUpLoading = computed(() => Boolean(unref(followUpResource.loading)));
  const myTasksLoading = computed(() => Boolean(unref(myTasksResource.loading)));
  const myActivitiesLoading = computed(() => Boolean(unref(myActivitiesResource.loading)));
  const myRemindersLoading = computed(() => Boolean(unref(myRemindersResource.loading)));

  return {
    activeDashboardTab,
    dashboardAccessMessage,
    dashboardAccessMessageKind,
    dashboardLoading,
    dashboardLoadingRaw: dashboardLoadingRawComputed,
    dashboardPermissionError,
    dashboardScopeMessage,
    followUpLoading,
    isCollectionsTab,
    isDailyTab,
    isRenewalsTab,
    isSalesTab,
    myActivitiesLoading,
    myRemindersLoading,
    myTasksLoading,
    readyOfferCount,
  };
}
