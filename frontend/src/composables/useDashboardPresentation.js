import { computed } from "vue";

const DASHBOARD_TABS = ["daily", "sales", "collections", "renewals"];

export function useDashboardPresentation({ t, isDailyTab, isSalesTab, isCollectionsTab, isRenewalsTab, authStore }) {
  const showNewLeadAction = computed(() => !isCollectionsTab.value && !isRenewalsTab.value);
  const showRenewalAlertsTopRow = computed(() => isDailyTab.value || isRenewalsTab.value);
  const showAnalyticsRow = computed(() => isSalesTab.value);
  const showPoliciesOffersRow = computed(() => isSalesTab.value);

  const dashboardTabs = computed(() => [
    { key: "daily", label: t("tabDaily"), tabId: "dashboard-tab-daily", panelId: "dashboard-panel-daily" },
    { key: "sales", label: t("tabSales"), tabId: "dashboard-tab-sales", panelId: "dashboard-panel-sales" },
    { key: "collections", label: t("tabCollections"), tabId: "dashboard-tab-collections", panelId: "dashboard-panel-collections" },
    { key: "renewals", label: t("tabRenewals"), tabId: "dashboard-tab-renewals", panelId: "dashboard-panel-renewals" },
  ]);

  const dashboardHeroTitle = computed(() => {
    const baseTitle = (() => {
      if (isDailyTab.value) return t("heroTitleDaily");
      if (isSalesTab.value) return t("heroTitleSales");
      if (isCollectionsTab.value) return t("heroTitleCollections");
      if (isRenewalsTab.value) return t("heroTitleRenewals");
      return t("heroTitleDaily");
    })();

    // For daily tab, append user's full name (if available)
    if (isDailyTab.value && authStore?.user?.value?.full_name) {
      return `${baseTitle}, ${authStore.user.value.full_name.split(" ")[0]}`;
    }
    return baseTitle;
  });

  const dashboardHeroSubtitle = computed(() => {
    if (isDailyTab.value) return t("heroSubtitleDaily");
    if (isSalesTab.value) return t("heroSubtitleSales");
    if (isCollectionsTab.value) return t("heroSubtitleCollections");
    if (isRenewalsTab.value) return t("heroSubtitleRenewals");
    return t("heroSubtitleDaily");
  });

  return {
    dashboardHeroSubtitle,
    dashboardHeroTitle,
    dashboardTabs,
    showAnalyticsRow,
    showNewLeadAction,
    showPoliciesOffersRow,
    showRenewalAlertsTopRow,
  };
}

export const DASHBOARD_TAB_KEYS = DASHBOARD_TABS;
