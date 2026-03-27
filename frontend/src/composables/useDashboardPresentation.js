import { computed } from "vue";

const DASHBOARD_TABS = ["daily", "sales", "collections", "renewals"];

export function useDashboardPresentation({ t, isDailyTab, isSalesTab, isCollectionsTab, isRenewalsTab }) {
  const showNewLeadAction = computed(() => !isCollectionsTab.value && !isRenewalsTab.value);
  const showRenewalAlertsTopRow = computed(() => isDailyTab.value || isRenewalsTab.value);
  const showAnalyticsRow = computed(() => isSalesTab.value);
  const showPoliciesOffersRow = computed(() => isSalesTab.value);

  const dashboardTabs = computed(() => [
    { key: "daily", label: t("tabDaily") },
    { key: "sales", label: t("tabSales") },
    { key: "collections", label: t("tabCollections") },
    { key: "renewals", label: t("tabRenewals") },
  ]);

  const dashboardHeroTitle = computed(() => {
    if (isDailyTab.value) return t("heroTitleDaily");
    if (isSalesTab.value) return t("heroTitleSales");
    if (isCollectionsTab.value) return t("heroTitleCollections");
    if (isRenewalsTab.value) return t("heroTitleRenewals");
    return t("heroTitleDaily");
  });

  const dashboardHeroSubtitle = computed(() => {
    if (isDailyTab.value) return t("heroSubtitleDaily");
    if (isSalesTab.value) return t("heroSubtitleSales");
    if (isCollectionsTab.value) return t("heroSubtitleCollections");
    if (isRenewalsTab.value) return t("heroSubtitleRenewals");
    return t("heroSubtitleDaily");
  });

  const quickActions = computed(() => [
    {
      key: "offers",
      label: t("quickOffer"),
      description: t("quickOfferDesc"),
      to: "/offers",
    },
    {
      key: "policies",
      label: t("quickPolicy"),
      description: t("quickPolicyDesc"),
      to: "/policies",
    },
    {
      key: "claims",
      label: t("quickClaim"),
      description: t("quickClaimDesc"),
      to: "/claims",
    },
    {
      key: "payments",
      label: t("quickPayment"),
      description: t("quickPaymentDesc"),
      to: "/payments",
    },
    {
      key: "renewals",
      label: t("quickRenewal"),
      description: t("quickRenewalDesc"),
      to: "/renewals",
    },
    {
      key: "communication",
      label: t("quickCommunication"),
      description: t("quickCommunicationDesc"),
      to: "/communication",
    },
    {
      key: "reconciliation",
      label: t("quickReconciliation"),
      description: t("quickReconciliationDesc"),
      to: "/reconciliation",
    },
  ]);

  const visibleQuickActions = computed(() => {
    const actionMap = new Map(quickActions.value.map((action) => [action.key, action]));
    const pick = (keys) => keys.map((key) => actionMap.get(key)).filter(Boolean);
    if (isSalesTab.value) return pick(["offers", "policies", "communication"]);
    if (isCollectionsTab.value) return pick(["payments", "reconciliation", "communication"]);
    if (isRenewalsTab.value) return pick(["renewals", "offers", "policies", "communication"]);
    if (isDailyTab.value) return pick(["offers", "renewals", "claims", "payments", "communication"]);
    return pick(["offers", "renewals", "claims", "payments", "communication"]);
  });

  return {
    dashboardHeroSubtitle,
    dashboardHeroTitle,
    dashboardTabs,
    quickActions,
    showAnalyticsRow,
    showNewLeadAction,
    showPoliciesOffersRow,
    showRenewalAlertsTopRow,
    visibleQuickActions,
  };
}

export const DASHBOARD_TAB_KEYS = DASHBOARD_TABS;
