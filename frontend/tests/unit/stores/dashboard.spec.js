import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useDashboardStore } from "../../../src/stores/dashboard";

describe("useDashboardStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("tracks range and active tab state", () => {
    const store = useDashboardStore();

    store.setRange(90);
    store.setActiveTab("renewals");
    store.setComparisonMode("previous_month");

    expect(store.state.range).toBe(90);
    expect(store.state.activeTab).toBe("renewals");
    expect(store.state.comparisonMode).toBe("previous_month");
  });

  it("keeps KPI payload and comparison metadata in store", () => {
    const store = useDashboardStore();

    store.setKpiPayload({
      cards: { total_policies: 12 },
      comparison: { mode: "previous_period", cards: { total_policies: 8 } },
      meta: { access_scope: "full" },
    });

    expect(store.state.kpiPayload.cards.total_policies).toBe(12);
    expect(store.comparison.mode).toBe("previous_period");
    expect(store.meta.access_scope).toBe("full");
    expect(store.visibleCards.total_policies).toBe(12);
  });

  it("prefers tab payload over KPI payload for visible dashboard sections", () => {
    const store = useDashboardStore();

    store.setKpiPayload({
      cards: { total_policies: 12 },
      metrics: { ready_offer_count: 4 },
      series: { commission_trend: [{ month_key: "2026-03", total_commission: 100 }] },
      previews: { leads: [{ name: "LEAD-001" }] },
    });

    store.setTabPayload({
      cards: { total_policies: 24 },
      metrics: { ready_offer_count: 9 },
      series: { commission_trend: [{ month_key: "2026-04", total_commission: 220 }] },
      previews: { leads: [{ name: "LEAD-002" }] },
      meta: { access_scope: "restricted" },
    });

    expect(store.visibleCards.total_policies).toBe(24);
    expect(store.visibleMetrics.ready_offer_count).toBe(9);
    expect(store.visibleSeries.commission_trend[0].month_key).toBe("2026-04");
    expect(store.visiblePreviews.leads[0].name).toBe("LEAD-002");
    expect(store.meta.access_scope).toBe("restricted");
  });

  it("derives previous cards and renewal summaries from dashboard payloads", () => {
    const store = useDashboardStore();

    store.setKpiPayload({
      comparison: {
        cards: { total_commission: 120 },
      },
    });

    store.setTabPayload({
      compare_cards: { total_commission: 180 },
      series: {
        renewal_buckets: { overdue: 2, due7: 4, due30: 9 },
        renewal_retention: { renewed: 7, lost: 3, cancelled: 3, rate: 70 },
      },
    });

    expect(store.previousCards.total_commission).toBe(180);
    expect(store.renewalBucketCounts).toEqual({
      overdue: 2,
      due7: 4,
      due30: 9,
    });
    expect(store.renewalRetentionSummary).toEqual({
      renewed: 7,
      lost: 3,
      cancelled: 3,
      rate: 70,
    });
  });
});
