import { describe, expect, it } from "vitest";
import { reactive, ref } from "vue";

import { POLICY_TRANSLATIONS } from "../config/policy_translations";
import { usePolicyListTableData } from "./usePolicyListTableData";

function t(key) {
  return POLICY_TRANSLATIONS.en?.[key] || key;
}

describe("usePolicyListTableData", () => {
  it("derives filtered rows, counts, and summary metrics", () => {
    const rows = ref([
      {
        name: "POL-001",
        record_name: "AT-POL-2026-000001",
        policy_no: "TR-001",
        customer: "Aykut",
        branch: "Life",
        status: "Active",
        end_date: "2026-04-01",
        gross_premium: 1200,
        gwp_try: 1200,
      },
      {
        name: "POL-002",
        policy_no: "TR-002",
        customer: "Bora",
        branch: "Health",
        status: "KYT",
        end_date: "2099-01-02",
        gross_premium: 800,
        gwp_try: 800,
      },
    ]);
    const policyStore = {
      state: reactive({ pagination: { total: 2 } }),
    };
    const data = usePolicyListTableData({
      rows,
      policyStore,
      policyListSearchQuery: ref("TR-001"),
      policyListLocalFilters: reactive({ status: "active", branch: "Life" }),
      localeCode: ref("tr-TR"),
      policyListPageSize: ref(20),
      t: (key) => POLICY_TRANSLATIONS.tr?.[key] || POLICY_TRANSLATIONS.en?.[key] || key,
    });

    expect(data.policyListMappedRows.value).toHaveLength(2);
  expect(data.policyListMappedRows.value[0].name).toBe("AT-POL-2026-000001");
  expect(data.policyListMappedRows.value[0].carrier_policy_no).toBe("TR-001");
    expect(data.policyListFilteredRows.value).toHaveLength(1);
    expect(data.policyListPagedRows.value).toHaveLength(1);
    expect(data.policyListRowsWithUrgency.value[0]._urgency).toBeTruthy();
    expect(data.policySummary.value.total).toBe(2);
    expect(data.policySummary.value.active).toBe(1);
    expect(data.policySummary.value.pending).toBe(1);
    expect(data.policySummary.value.totalPremium).toBe(2000);
    expect(data.policyListTotalCount.value).toBe(2);
    expect(data.policyListTotalPages.value).toBe(1);
  });

  it("uses standardized missing-data copy for policy list fallbacks", () => {
    const rows = ref([
      {
        name: "POL-003",
        record_name: "AT-POL-2026-000003",
        status: "Draft",
        gross_premium: 0,
        gwp_try: 0,
      },
    ]);
    const policyStore = {
      state: reactive({ pagination: { total: 1 } }),
    };

    const data = usePolicyListTableData({
      rows,
      policyStore,
      policyListSearchQuery: ref(""),
      policyListLocalFilters: reactive({ status: "", branch: "" }),
      localeCode: ref("en-US"),
      policyListPageSize: ref(20),
      t,
    });

    expect(data.policyListMappedRows.value[0].carrier_policy_no).toBe("Not provided");
    expect(data.policyListMappedRows.value[0].customer_label).toBe("Not provided");
    expect(data.policyListMappedRows.value[0].customer_type_label).toBe("Not provided");
  });
});
