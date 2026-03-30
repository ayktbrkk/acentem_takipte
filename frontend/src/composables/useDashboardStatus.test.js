import { describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

import { useDashboardStatus } from "./useDashboardStatus";

function buildSubject(overrides = {}) {
  const route = overrides.route || { query: { tab: "daily" } };
  const selectedRange = ref(7);
  const dashboardTabMetrics = computed(() => overrides.dashboardTabMetrics || {});
  const dashboardAccessScope = computed(() => overrides.dashboardAccessScope || "empty");
  const dashboardAccessReason = computed(() => overrides.dashboardAccessReason || "");
  const recentOffers = computed(() => overrides.recentOffers || []);
  const dashboardTabKey = overrides.dashboardTabKey || ref("daily");
  const dashboardStore = overrides.dashboardStore || { state: { loading: false, activeTab: "daily" } };

  return useDashboardStatus({
    dashboardAccessReason,
    dashboardAccessScope,
    dashboardTabMetrics,
    dashboardTabKey,
    dashboardTabPayloadResource: overrides.dashboardTabPayloadResource || {
      error: ref(null),
      loading: ref(false),
    },
    dashboardStore,
    followUpResource: overrides.followUpResource || { loading: ref(false) },
    isPermissionDeniedError: overrides.isPermissionDeniedError || (() => false),
    kpiResource: overrides.kpiResource || { error: ref(null), loading: ref(false) },
    myActivitiesResource: overrides.myActivitiesResource || { loading: ref(false) },
    myRemindersResource: overrides.myRemindersResource || { loading: ref(false) },
    myTasksResource: overrides.myTasksResource || { loading: ref(false) },
    recentOffers,
    route,
    selectedRange,
    t: overrides.t || ((key) => key),
  });
}

describe("useDashboardStatus", () => {
  it("derives tabs and loading state", () => {
    const subject = buildSubject({
      dashboardTabKey: ref("sales"),
    });

    expect(subject.isSalesTab.value).toBe(true);
    expect(subject.isDailyTab.value).toBe(false);
    expect(subject.dashboardLoading.value).toBe(false);
  });

  it("falls back to recent offers and computes access messages", () => {
    const subject = buildSubject({
      dashboardTabMetrics: {},
      recentOffers: [
        { status: "Sent", converted_policy: null },
        { status: "Accepted", converted_policy: "POL-1" },
      ],
    });

    expect(subject.readyOfferCount.value).toBe(1);
    expect(subject.dashboardAccessMessage.value).toBe("dashboardScopeRestrictedEmpty");
    expect(subject.dashboardAccessMessageKind.value).toBe("scope");
  });

  it("detects permission errors", () => {
    const subject = buildSubject({
      isPermissionDeniedError: (error) => Number(error?.status) === 403,
      kpiResource: { error: ref({ status: 403 }), loading: ref(false) },
      dashboardTabPayloadResource: { error: ref(null), loading: ref(false) },
      dashboardAccessScope: "empty",
      dashboardAccessReason: "",
      t: (key) => key,
    });

    expect(subject.dashboardPermissionError.value).toEqual({ status: 403 });
    expect(subject.dashboardAccessMessage.value).toBe("dashboardPermissionDenied");
    expect(subject.dashboardAccessMessageKind.value).toBe("permission");
  });
});
