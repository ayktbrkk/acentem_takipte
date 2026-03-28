import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useDashboardSummary } from "./useDashboardSummary";

describe("useDashboardSummary", () => {
  it("merges cards and derives trend values from tab series", () => {
    const summary = useDashboardSummary({
      branchStore: { requestBranch: "Ankara" },
      dashboardStore: {
        state: {
          kpiPayload: {
            cards: {
              total_commission: 100,
              total_policies: 5,
            },
            commission_trend: [{ total_commission: 7 }],
            policy_status: [{ status: "Active", total: 4 }],
            top_companies: [{ name: "StoreTop" }],
          },
        },
        previousCards: { total_commission: 80 },
        comparison: { mode: "previous_month" },
        meta: { access_scope: "office", scope_reason: "branch" },
      },
      dashboardTabMetrics: ref({
        accepted_offer_count: 4,
        converted_offer_count: 2,
      }),
      dashboardTabCards: ref({ total_commission: 120, total_gwp_try: 250 }),
      dashboardTabSeries: ref({
        commission_trend: [
          { month: "2026-01", total_commission: 11 },
          { month: "2026-02", total_commission: 23 },
        ],
        top_companies: [{ name: "TabTop" }],
      }),
      t: (key) => key,
    });

    expect(summary.dashboardCards.value.total_commission).toBe(120);
    expect(summary.dashboardCards.value.total_policies).toBe(5);
    expect(summary.acceptedOfferCount.value).toBe(4);
    expect(summary.convertedOfferCount.value).toBe(2);
    expect(summary.commissionTrend.value).toHaveLength(2);
    expect(summary.maxTrendValue.value).toBe(23);
    expect(summary.topCompanies.value).toEqual([{ name: "TabTop" }]);
    expect(summary.policyStatusRows.value).toEqual([{ status: "Active", total: 4 }]);
  });

  it("builds access labels and branch label fallbacks", () => {
    const summary = useDashboardSummary({
      branchStore: {},
      dashboardStore: {
        state: { kpiPayload: {} },
        previousCards: {},
        comparison: {},
        meta: { access_scope: "all", scope_reason: "scope" },
      },
      dashboardTabMetrics: ref({}),
      dashboardTabCards: ref({}),
      dashboardTabSeries: ref({}),
      t: (key) => key,
    });

    expect(summary.dashboardBranchLabel.value).toBe("Tum Subeler");
    expect(summary.dashboardAccessScope.value).toBe("all");
    expect(summary.dashboardAccessReason.value).toBe("scope");
    expect(summary.dashboardComparisonTrendHint.value).toBe("trendAgainstPrevious");
  });

  it("maps trend hints for known comparison modes", () => {
    const modes = [
      ["previous_period", "trendAgainstPreviousPeriod"],
      ["previous_month", "trendAgainstPreviousMonth"],
      ["previous_year", "trendAgainstPreviousYear"],
      ["custom", "trendAgainstCustomPeriod"],
    ];

    for (const [mode, expected] of modes) {
      const summary = useDashboardSummary({
        branchStore: {},
        dashboardStore: {
          state: { kpiPayload: {} },
          previousCards: {},
          comparison: { mode },
          meta: {},
        },
        dashboardTabMetrics: ref({}),
        dashboardTabCards: ref({}),
        dashboardTabSeries: ref({}),
        t: (key) => key,
      });
      expect(summary.dashboardComparisonTrendHint.value).toBe(expected);
    }
  });
});
