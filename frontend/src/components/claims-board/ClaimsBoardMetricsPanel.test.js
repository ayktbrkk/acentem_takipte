import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import ClaimsBoardMetricsPanel from "./ClaimsBoardMetricsPanel.vue";

function formatCount(v) {
  return String(v ?? 0);
}
function formatCurrency(v, c = "TRY") {
  return `${c}${v}`;
}
function t(key) {
  return key;
}

describe("ClaimsBoardMetricsPanel", () => {
  it("renders TRY reserve/paid and the full status breakdown", () => {
    const wrapper = mount(ClaimsBoardMetricsPanel, {
      props: {
        claimSummary: {
          total: 5,
          open: 1,
          under_review: 1,
          approved: 1,
          paid: 1,
          rejected: 1,
          closed: 0,
          other: 0,
          reserveVsPaid: "TRY1000 / TRY200",
          non_try_breakdown: {},
          missing_fx_count: 0,
          missing_fx_claims: [],
        },
        formatCount,
        formatCurrency,
        t,
      },
    });

    const labels = wrapper.findAll(".at-metric-label").map((n) => n.text());
    expect(labels).toContain("summaryReservePaid");
    expect(wrapper.find("[role='status']").exists()).toBe(false);
  });

  it("renders the currency breakdown and the missing-fx warning", () => {
    const wrapper = mount(ClaimsBoardMetricsPanel, {
      props: {
        claimSummary: {
          total: 3,
          open: 0,
          under_review: 0,
          approved: 1,
          paid: 0,
          rejected: 0,
          closed: 0,
          other: 0,
          reserveVsPaid: "USD0 / TRY0",
          non_try_breakdown: {
            USD: { reserve_native: 200, reserve_try: 8400, paid_try: 0 },
          },
          missing_fx_count: 1,
          missing_fx_claims: [{ name: "AT-CLM-0001", currency: "USD", reserve_native: 200 }],
        },
        formatCount,
        formatCurrency,
        t,
      },
    });

    expect(wrapper.text()).toContain("nonTryBreakdownTitle");
    expect(wrapper.text()).toContain("USD");
    expect(wrapper.text()).toContain("missingFxWarning");
    expect(wrapper.text()).toContain("AT-CLM-0001");
  });

  it("does not render currency breakdown or warning when absent", () => {
    const wrapper = mount(ClaimsBoardMetricsPanel, {
      props: {
        claimSummary: {
          total: 1,
          open: 0,
          under_review: 0,
          approved: 1,
          paid: 0,
          rejected: 0,
          closed: 0,
          other: 0,
          reserveVsPaid: "TRY0 / TRY0",
          non_try_breakdown: {},
          missing_fx_count: 0,
          missing_fx_claims: [],
        },
        formatCount,
        formatCurrency,
        t,
      },
    });

    expect(wrapper.text()).not.toContain("nonTryBreakdownTitle");
    expect(wrapper.text()).not.toContain("missingFxWarning");
  });
});
