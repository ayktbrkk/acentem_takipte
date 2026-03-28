import { onBeforeUnmount } from "vue";

const DASHBOARD_RELOAD_DEBOUNCE_MS = 300;

function normalizeDashboardTab(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "collections" || normalized === "renewals" || normalized === "sales") {
    return normalized;
  }
  return "daily";
}

function getDateRange(days) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - days);
  return { from, to };
}

function getPreviousDateRange(days) {
  const current = getDateRange(days);
  const to = new Date(current.from);
  to.setDate(to.getDate() - 1);
  const from = new Date(to);
  from.setDate(to.getDate() - days);
  return { from, to };
}

function toApiDate(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useDashboardOrchestration({
  activeDashboardTab,
  branchStore,
  buildClaimListParams,
  claimListResource,
  dashboardTabPayloadResource,
  followUpResource,
  kpiResource,
  myActivitiesResource,
  myRemindersResource,
  myTasksResource,
  route,
  router,
  selectedRange,
}) {
  let dashboardReloadTimer = null;

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

  function buildKpiParams() {
    const range = getDateRange(selectedRange.value);
    return withOfficeBranchFilter({
      filters: {
        from_date: toApiDate(range.from),
        to_date: toApiDate(range.to),
        period_comparison: "previous_period",
        months: 6,
      },
    });
  }

  function buildTabPayloadParams(tabKey = activeDashboardTab.value) {
    const normalizedTab = normalizeDashboardTab(tabKey);
    const currentRange = getDateRange(selectedRange.value);
    const previousRange = getPreviousDateRange(selectedRange.value);
    return withOfficeBranchFilter({
      tab: normalizedTab,
      filters: {
        from_date: toApiDate(currentRange.from),
        to_date: toApiDate(currentRange.to),
        compare_from_date: toApiDate(previousRange.from),
        compare_to_date: toApiDate(previousRange.to),
        months: 6,
      },
    });
  }

  function setDashboardTab(tabKey) {
    const nextTab = normalizeDashboardTab(tabKey);
    const nextQuery = { ...route.query };
    if (nextTab === "daily") {
      delete nextQuery.tab;
    } else {
      nextQuery.tab = nextTab;
    }
    router.replace({ name: "dashboard", query: nextQuery });
  }

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

  function applyRange(days) {
    selectedRange.value = days;
    triggerDashboardReload();
  }

  function openPage(path) {
    if (path === "/communication") {
      router.push({
        path,
        query: {
          return_to: route.fullPath || route.path || "",
        },
      });
      return;
    }
    router.push(path);
  }

  function openPreviewList(target) {
    switch (target) {
      case "policies":
        openPage("/policies");
        return;
      case "offers":
        openPage("/offers");
        return;
      case "renewals":
        openPage("/renewals");
        return;
      case "companies":
        openPage("/insurance-companies");
        return;
      case "payments":
        openPage("/payments");
        return;
      case "claims":
        openPage("/claims");
        return;
      case "reconciliation":
        openPage("/reconciliation-items");
        return;
      case "leads":
        openPage("/leads");
        return;
      case "tasks":
        router.push({ name: "tasks-list" });
        return;
      case "activities":
        router.push({ name: "activities-list" });
        return;
      case "reminders":
        router.push({ name: "reminders-list" });
        return;
      default:
        return;
    }
  }

  function reloadData() {
    triggerDashboardReload({ immediate: true });
  }

  onBeforeUnmount(() => {
    if (dashboardReloadTimer) {
      window.clearTimeout(dashboardReloadTimer);
      dashboardReloadTimer = null;
    }
  });

  return {
    applyRange,
    buildKpiParams,
    buildTabPayloadParams,
    openPage,
    openPreviewList,
    reloadData,
    setDashboardTab,
    triggerDashboardReload,
  };
}
