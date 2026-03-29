import { reactive, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePolicyListTableData } from "./usePolicyListTableData";

describe("usePolicyListTableData", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("derives filtered rows, summary and urgency markers", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));

    const rows = ref([
      {
        name: "POL-001",
        policy_no: "TR-001",
        customer: "ACME",
        branch: "Fire",
        status: "Active",
        gross_premium: 12000,
        commission_amount: 1200,
        gwp_try: 12000,
        end_date: "2026-03-05",
      },
      {
        name: "POL-002",
        policy_no: "TR-002",
        customer: "Beta",
        branch: "Cargo",
        status: "Waiting",
        gross_premium: 8000,
        commission_amount: 800,
        gwp_try: 8000,
        end_date: "2026-04-20",
      },
    ]);
    const filters = reactive({ total: 0 });
    const pagination = reactive({ total: 2, pageLength: 20 });
    const policyListSearchQuery = ref("");
    const policyListLocalFilters = reactive({ status: "", branch: "" });
    const localeCode = ref("en-US");
    const t = (key) => key;

    const data = usePolicyListTableData({
      rows,
      filters,
      pagination,
      policyListSearchQuery,
      policyListLocalFilters,
      localeCode,
      t,
    });

    expect(data.policyListColumns).toHaveLength(7);
    expect(data.policyListFilterConfig.value[1].options).toEqual([
      { value: "Cargo", label: "Cargo" },
      { value: "Fire", label: "Fire" },
    ]);
    expect(data.policySummary.value).toEqual({
      total: 2,
      active: 1,
      pending: 1,
      totalPremium: 20000,
    });
    expect(data.policyListRowsWithUrgency.value[0]._urgency).toBe("row-critical");
    expect(data.policyListRowsWithUrgency.value[1]._urgency).toBe("");

    policyListSearchQuery.value = "beta";
    expect(data.policyListFilteredRows.value).toHaveLength(1);
    expect(data.policyListFilteredRows.value[0].name).toBe("TR-002");
    expect(data.policyListTotalCount.value).toBe(2);
    expect(data.policyListTotalPages.value).toBe(1);
    expect(data.formatCurrency(1234, "TRY")).toContain("1,234");
    expect(data.formatCount(1234)).toBe("1,234");
  });
});
